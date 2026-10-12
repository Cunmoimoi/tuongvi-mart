import "server-only";

/**
 * Danh sách action audit hợp lệ, dạng `thực_thể.hành_động` (có thể nhiều tầng như
 * `settings.shipping_policy.update`). `record()` từ chối mọi action không có ở đây, để tên action
 * không bị gõ sai hay đặt tùy tiện, và trang xem audit (T6.4) lọc được theo danh sách cố định.
 *
 * Thêm action mới: thêm một dòng vào mảng này (giữ thứ tự chữ cái). Không cần migration:
 * database chỉ kiểm định dạng.
 */
export const AUDIT_ACTIONS = [
  "auth.login_failed",
  "order.status_change",
  "payment.webhook_bad_signature",
  "product.update",
  "refund.complete",
  "settings.shipping_policy.update",
  "staff.create",
  "staff.deactivate",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Cùng định dạng với CHECK `audit_logs_action_format` trong drizzle/0002_audit_logs.sql. */
export const AUDIT_ACTION_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

const KNOWN_ACTIONS: ReadonlySet<string> = new Set(AUDIT_ACTIONS);

export function isAuditAction(value: unknown): value is AuditAction {
  return typeof value === "string" && KNOWN_ACTIONS.has(value);
}
