import "server-only";
import { sql } from "drizzle-orm";
import { check, index, inet, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appSchema } from "./app-schema";

export const AUDIT_ACTOR_TYPES = ["SYSTEM", "CUSTOMER", "STAFF", "ADMIN", "PAYMENT"] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

/**
 * Nhật ký audit (DATA_MODEL mục 9). Bảng ledger: `app_runtime` chỉ có SELECT và INSERT
 * (`app.make_append_only` trong migration), không sửa, không xóa được. Chỉ ghi qua
 * `server/audit/service.ts`, nơi che dữ liệu nhạy cảm trong `before`/`after` và kiểm tra tên
 * action thuộc danh sách khai báo sẵn. Các `CHECK` ở đây là lớp phòng thủ thứ hai.
 */
export const auditLogs = appSchema.table(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: text("actor_type", { enum: AUDIT_ACTOR_TYPES }).notNull(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_actor_id_created_at_idx").on(table.actorId, table.createdAt),
    index("audit_logs_action_created_at_idx").on(table.action, table.createdAt),
    check(
      "audit_logs_actor_type_valid",
      sql`${table.actorType} in ('SYSTEM', 'CUSTOMER', 'STAFF', 'ADMIN', 'PAYMENT')`,
    ),
    check(
      "audit_logs_action_format",
      sql`char_length(${table.action}) <= 100 and ${table.action} ~ '^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$'`,
    ),
    check("audit_logs_entity_type_format", sql`${table.entityType} ~ '^[a-z][a-z0-9_]{0,63}$'`),
    check("audit_logs_entity_id_length", sql`char_length(${table.entityId}) between 1 and 128`),
    check(
      "audit_logs_entity_id_requires_type",
      sql`${table.entityId} is null or ${table.entityType} is not null`,
    ),
    check("audit_logs_user_agent_length", sql`char_length(${table.userAgent}) <= 255`),
    check("audit_logs_request_id_length", sql`char_length(${table.requestId}) between 1 and 128`),
  ],
);

export type NewAuditLog = typeof auditLogs.$inferInsert;
