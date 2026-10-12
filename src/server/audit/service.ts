import "server-only";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { AUDIT_ACTOR_TYPES, type AuditActorType } from "@/server/db/schema";
import { isAuditAction, type AuditAction } from "./actions";
import { prepareAuditPayload } from "./payload";
import { insertAuditLog, type AuditDb } from "./repo";
import { normalizeRequestContext, type RequestContext } from "./request-context";

export interface AuditActor {
  readonly type: AuditActorType;
  /** uuid của khách, nhân viên hoặc admin; để trống với SYSTEM, PAYMENT hay người chưa đăng nhập. */
  readonly id?: string | null;
}

export interface AuditEntity {
  /** Tên thực thể dạng snake_case, ví dụ `product`, `order`, `store_settings`. */
  readonly type: string;
  readonly id?: string | null;
}

export interface AuditRecordInput {
  readonly actor: AuditActor;
  readonly action: AuditAction;
  readonly entity?: AuditEntity | null;
  /** Trạng thái trước và sau thay đổi. Được che dữ liệu nhạy cảm và cắt nếu quá 16 KB. */
  readonly before?: unknown;
  readonly after?: unknown;
  /** Từ `getRequestContext(headers)`; để trống với job hệ thống. */
  readonly request?: Partial<RequestContext> | null;
}

export interface AuditRecordOptions {
  /**
   * Transaction của thao tác nghiệp vụ. Truyền vào để dòng audit và thay đổi nghiệp vụ cùng
   * commit hoặc cùng rollback. Bỏ trống chỉ khi không có thao tác nghiệp vụ nào đi kèm (ví dụ
   * `auth.login_failed`), khi đó ghi bằng `getDb()`.
   */
  readonly tx?: AuditDb;
}

/** Lỗi lập trình: action chưa khai báo, actor hay entity sai định dạng. */
export class AuditRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditRecordError";
  }
}

const inputSchema = z.object({
  actor: z.object({
    type: z.enum(AUDIT_ACTOR_TYPES),
    id: z.uuid().nullish(),
  }),
  entity: z
    .object({
      type: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
      id: z.string().min(1).max(128).nullish(),
    })
    .nullish(),
});

/**
 * Ghi một dòng audit (CLAUDE.md bất biến 11). Đóng cửa khi lỗi: dữ liệu sai hay lỗi database
 * đều ném ra cho người gọi, không bao giờ bị nuốt. Khi ghi trong `tx`, lỗi đó làm cả transaction
 * nghiệp vụ rollback; người gọi KHÔNG được bắt lỗi này rồi đi tiếp để commit thay đổi không audit.
 */
export async function record(
  input: AuditRecordInput,
  options: AuditRecordOptions = {},
): Promise<{ id: string }> {
  const action: unknown = input.action;
  if (!isAuditAction(action)) {
    // Tên action không phải dữ liệu nhạy cảm; nêu ra để dễ sửa. Không đưa before/after vào lỗi.
    const shown = typeof action === "string" ? JSON.stringify(action.slice(0, 100)) : typeof action;
    throw new AuditRecordError(
      `Action audit ${shown} không có trong danh sách (src/server/audit/actions.ts)`,
    );
  }

  const parsed = inputSchema.safeParse({ actor: input.actor, entity: input.entity });
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new AuditRecordError(`Dữ liệu audit không hợp lệ ở: ${fields}`);
  }
  const { actor, entity } = parsed.data;
  const request = normalizeRequestContext(input.request);

  return insertAuditLog(options.tx ?? getDb(), {
    actorType: actor.type,
    actorId: actor.id ?? null,
    action,
    entityType: entity?.type ?? null,
    entityId: entity?.id ?? null,
    before: prepareAuditPayload(input.before),
    after: prepareAuditPayload(input.after),
    ip: request.ip,
    userAgent: request.userAgent,
    requestId: request.requestId,
  });
}
