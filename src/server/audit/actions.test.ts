import { describe, expect, it } from "vitest";
import { AUDIT_ACTION_PATTERN, AUDIT_ACTIONS, isAuditAction } from "@/server/audit/actions";

describe("danh sách action audit", () => {
  it("có đủ các action khởi đầu", () => {
    expect(AUDIT_ACTIONS).toEqual(
      expect.arrayContaining([
        "product.update",
        "refund.complete",
        "staff.create",
        "staff.deactivate",
        "auth.login_failed",
        "payment.webhook_bad_signature",
        "order.status_change",
        "settings.shipping_policy.update",
      ]),
    );
  });

  it("mọi action có dạng thực_thể.hành_động và không trùng nhau", () => {
    for (const action of AUDIT_ACTIONS) {
      expect(action, action).toMatch(AUDIT_ACTION_PATTERN);
      expect(action.length, action).toBeLessThanOrEqual(100);
    }
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
  });

  it("isAuditAction chỉ nhận action có trong danh sách", () => {
    expect(isAuditAction("product.update")).toBe(true);
    // Đúng định dạng nhưng chưa khai báo: vẫn bị từ chối.
    expect(isAuditAction("product.delete_all")).toBe(false);
    expect(isAuditAction("PRODUCT.UPDATE")).toBe(false);
    expect(isAuditAction("product.update ")).toBe(false);
    expect(isAuditAction("")).toBe(false);
    expect(isAuditAction("toString")).toBe(false);
    expect(isAuditAction("constructor")).toBe(false);
    expect(isAuditAction(undefined)).toBe(false);
    expect(isAuditAction(42)).toBe(false);
  });

  it("định dạng từ chối tên không có dấu chấm, chữ hoa, khoảng trắng", () => {
    for (const bad of [
      "login_failed",
      "Auth.login",
      "auth.",
      ".login",
      "auth..login",
      "auth.log in",
    ]) {
      expect(bad, bad).not.toMatch(AUDIT_ACTION_PATTERN);
    }
  });
});
