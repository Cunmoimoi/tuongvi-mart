import "server-only";
import type { Database } from "@/server/db/client";
import { auditLogs, type NewAuditLog } from "@/server/db/schema";

/** Chỉ cần `insert`: nhận được cả `Database` lẫn `Tx`, và dễ thay bằng bản giả khi unit test. */
export type AuditDb = Pick<Database, "insert">;

export async function insertAuditLog(db: AuditDb, row: NewAuditLog): Promise<{ id: string }> {
  const rows = await db.insert(auditLogs).values(row).returning({ id: auditLogs.id });
  const inserted = rows[0];
  if (inserted === undefined) {
    throw new Error("Bảng audit_logs không trả về id sau khi ghi");
  }
  return inserted;
}
