import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditDb } from "@/server/audit/repo";
import { AuditRecordError, record, type AuditRecordInput } from "@/server/audit/service";
import { getDb, type Database } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";

// Không mở kết nối thật: thay getDb bằng hàm giả để kiểm tra nhánh "không có tx".
vi.mock("@/server/db/client", () => ({ getDb: vi.fn() }));

interface FakeDb {
  db: AuditDb;
  inserted: Record<string, unknown>[];
  tables: unknown[];
}

function createFakeDb(options: { fail?: Error } = {}): FakeDb {
  const inserted: Record<string, unknown>[] = [];
  const tables: unknown[] = [];
  const fake = {
    insert(table: unknown) {
      tables.push(table);
      return {
        values(row: Record<string, unknown>) {
          inserted.push(row);
          return {
            returning: () =>
              options.fail ? Promise.reject(options.fail) : Promise.resolve([{ id: "row-1" }]),
          };
        },
      };
    },
  };
  return { db: fake as unknown as AuditDb, inserted, tables };
}

const STAFF_ID = randomUUID();

function validInput(overrides: Partial<AuditRecordInput> = {}): AuditRecordInput {
  return {
    actor: { type: "STAFF", id: STAFF_ID },
    action: "product.update",
    entity: { type: "product", id: "p-1" },
    before: { name: "Gạo cũ" },
    after: { name: "Gạo mới" },
    request: { ip: "203.0.113.7", userAgent: "Mozilla/5.0", requestId: "req-1" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("record: ghi đúng dữ liệu", () => {
  it("ghi đủ các trường vào bảng audit_logs qua tx được truyền vào", async () => {
    const { db, inserted, tables } = createFakeDb();
    const result = await record(validInput(), { tx: db });

    expect(result).toStrictEqual({ id: "row-1" });
    expect(tables).toStrictEqual([auditLogs]);
    expect(inserted).toStrictEqual([
      {
        actorType: "STAFF",
        actorId: STAFF_ID,
        action: "product.update",
        entityType: "product",
        entityId: "p-1",
        before: { name: "Gạo cũ" },
        after: { name: "Gạo mới" },
        ip: "203.0.113.7",
        userAgent: "Mozilla/5.0",
        requestId: "req-1",
      },
    ]);
  });

  it("có tx thì không gọi getDb()", async () => {
    const { db } = createFakeDb();
    await record(validInput(), { tx: db });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("không có tx thì dùng getDb() (sự kiện không kèm thao tác nghiệp vụ)", async () => {
    const { db, inserted } = createFakeDb();
    vi.mocked(getDb).mockReturnValue(db as unknown as Database);

    await record({
      actor: { type: "CUSTOMER" },
      action: "auth.login_failed",
      after: { phone: "0901234567", password: "doan-thu" },
      request: { ip: "203.0.113.9", userAgent: null, requestId: "req-2" },
    });

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(inserted[0]).toMatchObject({
      actorType: "CUSTOMER",
      actorId: null,
      action: "auth.login_failed",
      entityType: null,
      entityId: null,
      before: null,
      after: { phone: "090****567" },
    });
  });

  it("che dữ liệu nhạy cảm trong before và after ở mọi tầng", async () => {
    const { db, inserted } = createFakeDb();
    await record(
      validInput({
        action: "staff.create",
        before: null,
        after: { username: "an", password: "mk", profile: { phone: "0901234567", pin: "1234" } },
      }),
      { tx: db },
    );
    expect(inserted[0]?.after).toStrictEqual({ username: "an", profile: { phone: "090****567" } });
  });

  it("chuẩn hóa lại ngữ cảnh request: IP sai thành null, user agent cắt 255 ký tự", async () => {
    const { db, inserted } = createFakeDb();
    await record(
      validInput({ request: { ip: "1.2.3.4:80", userAgent: "u".repeat(400), requestId: "r" } }),
      { tx: db },
    );
    expect(inserted[0]).toMatchObject({ ip: null, userAgent: "u".repeat(255), requestId: "r" });
  });

  it("không có request (job hệ thống) thì ip, user_agent, request_id là null", async () => {
    const { db, inserted } = createFakeDb();
    await record(
      {
        actor: { type: "SYSTEM" },
        action: "order.status_change",
        entity: { type: "order", id: "o-1" },
      },
      { tx: db },
    );
    expect(inserted[0]).toMatchObject({ ip: null, userAgent: null, requestId: null });
  });

  it("payload quá 16 KB bị cắt và gắn dấu hiệu, không ném lỗi", async () => {
    const { db, inserted } = createFakeDb();
    await record(validInput({ after: { blob: "x".repeat(50_000) } }), { tx: db });
    expect(inserted[0]?.after).toMatchObject({ _truncated: true });
  });
});

describe("record: từ chối dữ liệu sai (không ghi gì)", () => {
  it.each([
    ["action đúng định dạng nhưng chưa khai báo", "product.delete_all"],
    ["action sai định dạng", "xoa het"],
    ["action rỗng", ""],
  ])("%s", async (_label, action) => {
    const { db, inserted } = createFakeDb();
    await expect(
      record(validInput({ action: action as AuditRecordInput["action"] }), { tx: db }),
    ).rejects.toBeInstanceOf(AuditRecordError);
    expect(inserted).toHaveLength(0);
  });

  it("action không phải chuỗi bị từ chối", async () => {
    const { db, inserted } = createFakeDb();
    await expect(
      record(validInput({ action: 123 as unknown as AuditRecordInput["action"] }), { tx: db }),
    ).rejects.toBeInstanceOf(AuditRecordError);
    expect(inserted).toHaveLength(0);
  });

  it("actor_type ngoài danh sách bị từ chối", async () => {
    const { db, inserted } = createFakeDb();
    const actor = { type: "ROOT", id: STAFF_ID } as unknown as AuditRecordInput["actor"];
    await expect(record(validInput({ actor }), { tx: db })).rejects.toBeInstanceOf(
      AuditRecordError,
    );
    expect(inserted).toHaveLength(0);
  });

  it("actor_id không phải uuid bị từ chối", async () => {
    const { db } = createFakeDb();
    await expect(
      record(validInput({ actor: { type: "STAFF", id: "khong-phai-uuid" } }), { tx: db }),
    ).rejects.toBeInstanceOf(AuditRecordError);
  });

  it("entity_type sai định dạng hoặc entity_id quá dài bị từ chối", async () => {
    const { db } = createFakeDb();
    await expect(
      record(validInput({ entity: { type: "Product Table", id: "p-1" } }), { tx: db }),
    ).rejects.toBeInstanceOf(AuditRecordError);
    await expect(
      record(validInput({ entity: { type: "product", id: "x".repeat(129) } }), { tx: db }),
    ).rejects.toBeInstanceOf(AuditRecordError);
  });

  it("thông điệp lỗi nêu tên action lạ nhưng không chứa dữ liệu before/after", async () => {
    const { db } = createFakeDb();
    const error = await record(
      validInput({
        action: "product.nuke" as unknown as AuditRecordInput["action"],
        after: { secretNote: "bi-mat-123" },
      }),
      { tx: db },
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuditRecordError);
    expect(String((error as Error).message)).toContain("product.nuke");
    expect(String((error as Error).message)).not.toContain("bi-mat-123");
  });
});

describe("record: đóng cửa khi lỗi", () => {
  it("lỗi database được ném ra cho người gọi, không bị nuốt", async () => {
    const dbError = new Error("connection reset");
    const { db } = createFakeDb({ fail: dbError });
    await expect(record(validInput(), { tx: db })).rejects.toBe(dbError);
  });
});
