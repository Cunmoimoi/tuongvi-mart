import { randomBytes, randomUUID } from "node:crypto";
import { eq, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuditAction } from "@/server/audit/actions";
import { AUDIT_PAYLOAD_MAX_BYTES } from "@/server/audit/payload";
import { getRequestContext } from "@/server/audit/request-context";
import { AuditRecordError, record } from "@/server/audit/service";
import * as schema from "@/server/db/schema";
import { auditLogs } from "@/server/db/schema";
import type { Tx } from "@/server/db/tx";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const appUrl = process.env.DATABASE_URL;
if (migrationUrl === undefined || appUrl === undefined) {
  throw new Error(
    "Thiếu DATABASE_MIGRATION_URL hoặc DATABASE_URL. Chạy test tích hợp bằng `pnpm test:int`.",
  );
}

// Role có quyền DDL: dựng bảng nghiệp vụ tạm, đọc catalog, SET ROLE, khóa bảng.
const migrationSql = postgres(migrationUrl, { max: 1, onnotice: () => undefined });

// Đúng như ứng dụng khi chạy: role app_runtime qua DATABASE_URL.
const appClient = postgres(appUrl, { max: 4, prepare: false, onnotice: () => undefined });
const db = drizzle(appClient, { schema });

// audit_logs không cho DELETE, nên test không bao giờ COMMIT một dòng audit: mọi lần ghi nằm
// trong transaction bị rollback. Ngoài ra mỗi dòng mang request_id riêng của lần chạy này, để
// truy vấn chỉ thấy dữ liệu test tự tạo, không lẫn với dòng có sẵn trong database local.
const runId = randomBytes(6).toString("hex");
const MARK = `test-audit-${runId}`;
const markOf = (name: string) => `${MARK}-${name}`;

// Bảng nghiệp vụ giả để chứng minh audit và thay đổi nghiệp vụ cùng sống, cùng chết.
const BUSINESS_TABLE = `tmp_test_audit_business_${runId}`;

const DATA_API_ROLES = ["anon", "authenticated", "service_role"];
const ALL_PRIVILEGES = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
];

class RollbackSignal extends Error {}

/** Chạy `fn` trong transaction của app_runtime rồi luôn rollback, kể cả khi `fn` thành công. */
async function inRolledBackTx(fn: (tx: Tx) => Promise<void>): Promise<void> {
  const signal = new RollbackSignal();
  try {
    await db.transaction(async (tx) => {
      await fn(tx);
      throw signal;
    });
  } catch (error) {
    if (error === signal) {
      return;
    }
    throw error;
  }
  throw new Error("Transaction của test lẽ ra phải bị rollback");
}

/** Drizzle bọc lỗi của driver trong DrizzleQueryError; mã SQLSTATE nằm ở `cause.code`. */
function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const { code, cause } = error as { code?: unknown; cause?: unknown };
  return typeof code === "string" ? code : sqlState(cause);
}

/** Chạy câu lệnh trong savepoint; trả SQLSTATE nếu lỗi. Savepoint giữ transaction ngoài dùng tiếp được. */
async function stateOf(tx: Tx, run: (sp: Tx) => Promise<unknown>): Promise<string | undefined> {
  try {
    await tx.transaction(async (sp) => {
      await run(sp);
    });
    return undefined;
  } catch (error) {
    return sqlState(error);
  }
}

async function committedAuditCount(pattern: string): Promise<number> {
  const rows = await migrationSql<{ count: number }[]>`
    select count(*)::int as count from app.audit_logs where request_id like ${pattern}
  `;
  return rows[0]?.count ?? -1;
}

async function committedBusinessCount(label: string): Promise<number> {
  const rows = await migrationSql<{ count: number }[]>`
    select count(*)::int as count from app.${migrationSql(BUSINESS_TABLE)} where label = ${label}
  `;
  return rows[0]?.count ?? -1;
}

function insertBusinessRow(tx: Tx, label: string) {
  return tx.execute(
    sql`insert into app.${sql.identifier(BUSINESS_TABLE)} (label) values (${label})`,
  );
}

function selectMarked(tx: Tx, requestId: string) {
  return tx.select().from(auditLogs).where(eq(auditLogs.requestId, requestId));
}

beforeAll(async () => {
  await migrationSql`
    create table app.${migrationSql(BUSINESS_TABLE)} (
      id uuid primary key default gen_random_uuid(),
      label text not null
    )
  `;
  await migrationSql`select app.enable_app_rls(${BUSINESS_TABLE})`;
});

afterAll(async () => {
  await migrationSql`drop table if exists app.${migrationSql(BUSINESS_TABLE)}`;
  await Promise.all([migrationSql.end(), appClient.end()]);
});

describe("bảng app.audit_logs đúng DATA_MODEL mục 9", () => {
  it("có đủ cột với đúng kiểu dữ liệu", async () => {
    const rows = await migrationSql<{ column: string; type: string; nullable: string }[]>`
      select column_name as column, data_type as type, is_nullable as nullable
      from information_schema.columns
      where table_schema = 'app' and table_name = 'audit_logs'
      order by ordinal_position
    `;
    expect([...rows]).toStrictEqual([
      { column: "id", type: "uuid", nullable: "NO" },
      { column: "actor_type", type: "text", nullable: "NO" },
      { column: "actor_id", type: "uuid", nullable: "YES" },
      { column: "action", type: "text", nullable: "NO" },
      { column: "entity_type", type: "text", nullable: "YES" },
      { column: "entity_id", type: "text", nullable: "YES" },
      { column: "before", type: "jsonb", nullable: "YES" },
      { column: "after", type: "jsonb", nullable: "YES" },
      { column: "ip", type: "inet", nullable: "YES" },
      { column: "user_agent", type: "text", nullable: "YES" },
      { column: "request_id", type: "text", nullable: "YES" },
      { column: "created_at", type: "timestamp with time zone", nullable: "NO" },
    ]);
  });

  it("có 3 index (entity_type, entity_id), (actor_id, created_at), (action, created_at)", async () => {
    const rows = await migrationSql<{ indexdef: string }[]>`
      select indexdef from pg_indexes
      where schemaname = 'app' and tablename = 'audit_logs'
    `;
    const defs = rows.map((row) => row.indexdef.replace(/^.* USING btree /, ""));
    expect(defs).toEqual(
      expect.arrayContaining([
        "(entity_type, entity_id)",
        "(actor_id, created_at)",
        "(action, created_at)",
      ]),
    );
  });

  it("database cũng chặn actor_type lạ, action sai định dạng, user_agent quá dài", async () => {
    await inRolledBackTx(async (tx) => {
      const insertRaw = (actorType: string, action: string, userAgent: string | null) =>
        stateOf(tx, (sp) =>
          sp.execute(sql`
            insert into app.audit_logs (actor_type, action, user_agent, request_id)
            values (${actorType}, ${action}, ${userAgent}, ${markOf("check")})
          `),
        );
      expect(await insertRaw("ROOT", "product.update", null)).toBe("23514");
      expect(await insertRaw("STAFF", "Xoa Het", null)).toBe("23514");
      expect(await insertRaw("STAFF", "product.update", "u".repeat(256))).toBe("23514");
      expect(await insertRaw("STAFF", "product.update", "u".repeat(255))).toBeUndefined();
    });
  });
});

describe("(a) record ghi đủ trường", () => {
  it("ghi đúng actor, action, entity, before, after, ip, user_agent, request_id, created_at", async () => {
    const actorId = randomUUID();
    const requestId = markOf("a");
    const context = getRequestContext(
      new Headers({
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        "user-agent": "Mozilla/5.0 (TuongVi test)",
      }),
    );

    await inRolledBackTx(async (tx) => {
      const startedAt = Date.now();
      const { id } = await record(
        {
          actor: { type: "STAFF", id: actorId },
          action: "product.update",
          entity: { type: "product", id: "product-123" },
          before: { name: "Gạo ST25 5kg", price: 180000, active: true },
          after: { name: "Gạo ST25 5kg", price: 175000, active: true },
          request: { ...context, requestId },
        },
        { tx },
      );

      const rows = await selectMarked(tx, requestId);
      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(row).toMatchObject({
        id,
        actorType: "STAFF",
        actorId,
        action: "product.update",
        entityType: "product",
        entityId: "product-123",
        before: { name: "Gạo ST25 5kg", price: 180000, active: true },
        after: { name: "Gạo ST25 5kg", price: 175000, active: true },
        ip: "203.0.113.7",
        userAgent: "Mozilla/5.0 (TuongVi test)",
        requestId,
      });
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      expect(row?.createdAt).toBeInstanceOf(Date);
      expect(Math.abs((row?.createdAt.getTime() ?? 0) - startedAt)).toBeLessThan(60_000);
    });
  });

  it("sự kiện không có actor_id, entity hay request (ví dụ webhook sai chữ ký) vẫn ghi được", async () => {
    const requestId = markOf("a-minimal");
    await inRolledBackTx(async (tx) => {
      await record(
        {
          actor: { type: "PAYMENT" },
          action: "payment.webhook_bad_signature",
          after: { reason: "signature_mismatch" },
          request: { ip: "không-phải-ip", userAgent: null, requestId },
        },
        { tx },
      );
      const rows = await selectMarked(tx, requestId);
      expect(rows[0]).toMatchObject({
        actorType: "PAYMENT",
        actorId: null,
        entityType: null,
        entityId: null,
        before: null,
        after: { reason: "signature_mismatch" },
        ip: null,
        userAgent: null,
      });
    });
  });
});

describe("(b) dữ liệu nhạy cảm bị che ở mọi tầng trước khi vào database", () => {
  it("không còn mật khẩu, token, OTP, secret, cookie, PIN, chữ ký, API key; SĐT bị che", async () => {
    const requestId = markOf("b");
    const secrets = {
      password: "mk-goc-111",
      newPassword: "mk-moi-222",
      otp: "135790",
      accessToken: "tk-333",
      clientSecret: "sc-444",
      authorization: "Bearer abc.def.ghi",
      cookie: "sb-access=555",
      handoverPin: "8642",
      signature: "sha256=666",
      apiKey: "key-777",
    };

    await inRolledBackTx(async (tx) => {
      await record(
        {
          actor: { type: "ADMIN", id: randomUUID() },
          action: "staff.create",
          entity: { type: "staff", id: "staff-1" },
          before: { ...secrets, phone: "0901234567" },
          after: {
            username: "thu.ngan",
            phone: "0901234567",
            level1: {
              password: secrets.password,
              level2: {
                otp: secrets.otp,
                note: "liên hệ 0912345678",
                level3: [{ signature: secrets.signature, apiKey: secrets.apiKey, ok: "giữ" }],
              },
            },
            headers: { Authorization: secrets.authorization, Cookie: secrets.cookie },
          },
          request: { requestId },
        },
        { tx },
      );

      // Đọc bằng ::text để kiểm tra đúng những byte database đang lưu.
      const raw = await tx.execute<{ before: string; after: string }>(sql`
        select before::text as before, after::text as after
        from app.audit_logs where request_id = ${requestId}
      `);
      const stored = `${raw[0]?.before ?? ""}\n${raw[0]?.after ?? ""}`;
      expect(raw).toHaveLength(1);
      for (const value of [...Object.values(secrets), "0901234567", "0912345678", "abc.def.ghi"]) {
        expect(stored, value).not.toContain(value);
      }

      const rows = await selectMarked(tx, requestId);
      expect(rows[0]?.before).toStrictEqual({ phone: "090****567" });
      expect(rows[0]?.after).toStrictEqual({
        username: "thu.ngan",
        phone: "090****567",
        level1: { level2: { note: "liên hệ 091****678", level3: [{ ok: "giữ" }] } },
        headers: {},
      });
    });
  });

  it("Date, BigInt, tham chiếu vòng, ký tự NUL đều lưu được, không làm hỏng câu INSERT", async () => {
    const requestId = markOf("b-types");
    const loop: Record<string, unknown> = { name: "vòng" };
    loop.self = loop;

    await inRolledBackTx(async (tx) => {
      await record(
        {
          actor: { type: "SYSTEM" },
          action: "order.status_change",
          entity: { type: "order", id: "o-1" },
          after: {
            at: new Date("2026-10-12T01:00:00.000Z"),
            total: BigInt("9007199254740993"),
            loop,
            note: "a\u0000b",
          },
          request: { requestId },
        },
        { tx },
      );
      const rows = await selectMarked(tx, requestId);
      expect(rows[0]?.after).toStrictEqual({
        at: "2026-10-12T01:00:00.000Z",
        total: "9007199254740993",
        loop: { name: "vòng", self: "[Circular]" },
        note: "a\uFFFDb",
      });
    });
  });
});

describe("(c) quyền trên audit_logs: chỉ đọc và ghi thêm", () => {
  it("app_runtime có SELECT, INSERT; không có UPDATE (kể cả theo cột), DELETE, TRUNCATE", async () => {
    const rows = await migrationSql<Record<string, boolean>[]>`
      select has_table_privilege('app_runtime', 'app.audit_logs', 'SELECT') as "select",
             has_table_privilege('app_runtime', 'app.audit_logs', 'INSERT') as "insert",
             has_table_privilege('app_runtime', 'app.audit_logs', 'UPDATE') as "update",
             has_any_column_privilege('app_runtime', 'app.audit_logs', 'UPDATE') as "updateAnyColumn",
             has_table_privilege('app_runtime', 'app.audit_logs', 'DELETE') as "delete",
             has_table_privilege('app_runtime', 'app.audit_logs', 'TRUNCATE') as "truncate"
    `;
    expect(rows[0]).toStrictEqual({
      select: true,
      insert: true,
      update: false,
      updateAnyColumn: false,
      delete: false,
      truncate: false,
    });
  });

  it("app_runtime UPDATE, DELETE, TRUNCATE đều bị từ chối (42501) và dòng cũ vẫn còn nguyên", async () => {
    const requestId = markOf("c");
    await inRolledBackTx(async (tx) => {
      const { id } = await record(
        {
          actor: { type: "ADMIN", id: randomUUID() },
          action: "refund.complete",
          entity: { type: "refund", id: "r-1" },
          after: { amount: 50000 },
          request: { requestId },
        },
        { tx },
      );

      const current = await tx.execute<{ user: string }>(sql`select current_user as "user"`);
      expect(current[0]?.user).toBe("app_runtime");

      expect(
        await stateOf(tx, (sp) =>
          sp.execute(sql`update app.audit_logs set action = 'refund.cancel' where id = ${id}`),
        ),
      ).toBe("42501");
      expect(
        await stateOf(tx, (sp) =>
          sp.execute(sql`update app.audit_logs set after = '{}'::jsonb where id = ${id}`),
        ),
      ).toBe("42501");
      expect(
        await stateOf(tx, (sp) => sp.execute(sql`delete from app.audit_logs where id = ${id}`)),
      ).toBe("42501");
      expect(await stateOf(tx, (sp) => sp.execute(sql`truncate app.audit_logs`))).toBe("42501");

      const rows = await selectMarked(tx, requestId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id, action: "refund.complete", after: { amount: 50000 } });
    });
  });

  it("app_runtime không có quyền DDL trên bảng", async () => {
    await inRolledBackTx(async (tx) => {
      expect(
        await stateOf(tx, (sp) => sp.execute(sql`alter table app.audit_logs add column x int`)),
      ).toBe("42501");
      expect(await stateOf(tx, (sp) => sp.execute(sql`drop table app.audit_logs`))).toBe("42501");
      expect(
        await stateOf(tx, (sp) =>
          sp.execute(sql`alter table app.audit_logs disable row level security`),
        ),
      ).toBe("42501");
    });
  });

  it("anon, authenticated, service_role không có quyền nào", async () => {
    for (const role of DATA_API_ROLES) {
      for (const privilege of ALL_PRIVILEGES) {
        const rows = await migrationSql<{ granted: boolean }[]>`
          select has_table_privilege(${role}, 'app.audit_logs', ${privilege}) as granted
        `;
        expect(rows[0]?.granted, `${role} ${privilege}`).toBe(false);
      }
    }
  });

  it("SET ROLE anon hoặc authenticated rồi đọc, ghi thì bị từ chối (42501)", async () => {
    for (const role of ["anon", "authenticated"]) {
      await migrationSql`set role ${migrationSql(role)}`;
      try {
        await expect(migrationSql`select * from app.audit_logs`).rejects.toMatchObject({
          code: "42501",
        });
        await expect(
          migrationSql`
            insert into app.audit_logs (actor_type, action, request_id)
            values ('SYSTEM', 'product.update', ${markOf("anon")})
          `,
        ).rejects.toMatchObject({ code: "42501" });
      } finally {
        await migrationSql`reset role`;
      }
    }
  });

  it("bật RLS và chỉ có policy dành cho app_runtime", async () => {
    const rows = await migrationSql<{ rlsEnabled: boolean; policyRoles: string[] }[]>`
      select c.relrowsecurity as "rlsEnabled",
             coalesce(
               (select array_agg(distinct role_name order by role_name)
                from pg_policies p, unnest(p.roles) as role_name
                where p.schemaname = 'app' and p.tablename = c.relname),
               '{}'
             ) as "policyRoles"
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'app' and c.relname = 'audit_logs'
    `;
    expect(rows[0]).toStrictEqual({ rlsEnabled: true, policyRoles: ["app_runtime"] });
  });
});

describe("(d) audit và thay đổi nghiệp vụ cùng một transaction", () => {
  it("transaction rollback thì dòng audit cũng mất (cùng thay đổi nghiệp vụ)", async () => {
    const requestId = markOf("d-rollback");
    await inRolledBackTx(async (tx) => {
      await insertBusinessRow(tx, requestId);
      await record(
        {
          actor: { type: "STAFF", id: randomUUID() },
          action: "product.update",
          entity: { type: "product", id: "p-d1" },
          after: { price: 1000 },
          request: { requestId },
        },
        { tx },
      );
      // Trước khi rollback: dòng audit đã thật sự được ghi trong transaction.
      expect(await selectMarked(tx, requestId)).toHaveLength(1);
    });

    expect(await committedAuditCount(requestId)).toBe(0);
    expect(await committedBusinessCount(requestId)).toBe(0);
  });

  it("đối chứng: transaction commit thì thay đổi nghiệp vụ còn lại (bảng tạm, không phải audit)", async () => {
    const label = markOf("d-control");
    await db.transaction(async (tx) => {
      await insertBusinessRow(tx, label);
    });
    expect(await committedBusinessCount(label)).toBe(1);
  });

  it("ghi audit lỗi vì action lạ thì thao tác nghiệp vụ cũng rollback", async () => {
    const requestId = markOf("d-unknown-action");
    await expect(
      db.transaction(async (tx) => {
        await insertBusinessRow(tx, requestId);
        await record(
          {
            actor: { type: "STAFF", id: randomUUID() },
            action: "product.delete_everything" as unknown as AuditAction,
            request: { requestId },
          },
          { tx },
        );
      }),
    ).rejects.toBeInstanceOf(AuditRecordError);

    expect(await committedBusinessCount(requestId)).toBe(0);
    expect(await committedAuditCount(requestId)).toBe(0);
  });

  it("ghi audit lỗi ở database (bảng bị khóa, hết lock_timeout) thì thao tác nghiệp vụ cũng rollback", async () => {
    const requestId = markOf("d-db-error");

    // Một phiên khác giữ khóa ACCESS EXCLUSIVE trên audit_logs: INSERT của app_runtime phải chờ
    // rồi hết lock_timeout. Đây là lỗi thật từ Postgres, không phải lỗi giả lập trong code.
    let release = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    let signalLocked = () => {};
    const locked = new Promise<void>((resolve) => {
      signalLocked = resolve;
    });
    const holder = migrationSql.begin(async (lockSql) => {
      await lockSql`lock table app.audit_logs in access exclusive mode`;
      signalLocked();
      await released;
    });

    let failure: unknown;
    try {
      await locked;
      failure = await db
        .transaction(async (tx) => {
          await insertBusinessRow(tx, requestId);
          await tx.execute(sql`set local lock_timeout = '300ms'`);
          await record(
            {
              actor: { type: "ADMIN", id: randomUUID() },
              action: "staff.deactivate",
              entity: { type: "staff", id: "s-1" },
              request: { requestId },
            },
            { tx },
          );
        })
        .then(
          () => undefined,
          (error: unknown) => error,
        );
    } finally {
      release();
      await holder;
    }

    expect(sqlState(failure)).toBe("55P03"); // lock_not_available
    expect(await committedBusinessCount(requestId)).toBe(0);
    expect(await committedAuditCount(requestId)).toBe(0);
  });
});

describe("action lạ và payload lớn", () => {
  it("action lạ bị từ chối, không có dòng nào được ghi", async () => {
    const requestId = markOf("unknown");
    await inRolledBackTx(async (tx) => {
      await expect(
        record(
          {
            actor: { type: "SYSTEM" },
            action: "system.self_destruct" as unknown as AuditAction,
            request: { requestId },
          },
          { tx },
        ),
      ).rejects.toBeInstanceOf(AuditRecordError);
      expect(await selectMarked(tx, requestId)).toHaveLength(0);
    });
  });

  it("payload lớn bị cắt, gắn dấu hiệu bị cắt và vẫn ghi được", async () => {
    const requestId = markOf("big");
    const big = {
      items: Array.from({ length: 3000 }, (_, i) => ({
        sku: `SKU-${i}`,
        name: `Sản phẩm số ${i}`,
      })),
    };
    const originalBytes = Buffer.byteLength(JSON.stringify(big), "utf8");
    expect(originalBytes).toBeGreaterThan(AUDIT_PAYLOAD_MAX_BYTES);

    await inRolledBackTx(async (tx) => {
      await record(
        {
          actor: { type: "ADMIN", id: randomUUID() },
          action: "product.update",
          entity: { type: "product", id: "bulk" },
          before: { small: true },
          after: big,
          request: { requestId },
        },
        { tx },
      );
      const rows = await selectMarked(tx, requestId);
      expect(rows[0]?.before).toStrictEqual({ small: true });
      expect(rows[0]?.after).toMatchObject({ _truncated: true, originalBytes });
      expect(Buffer.byteLength(JSON.stringify(rows[0]?.after), "utf8")).toBeLessThanOrEqual(
        AUDIT_PAYLOAD_MAX_BYTES,
      );
    });
  });
});

describe("dọn dẹp", () => {
  it("không còn dòng audit nào của lần chạy này trong database", async () => {
    expect(await committedAuditCount(`${MARK}%`)).toBe(0);
    const viaApp = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(like(auditLogs.requestId, `${MARK}%`));
    expect(viaApp).toHaveLength(0);
  });
});
