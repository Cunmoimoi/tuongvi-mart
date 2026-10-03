import "server-only";
import { sql } from "drizzle-orm";
import { check, integer, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { appSchema } from "./app-schema";

/**
 * Bộ đếm rate limit theo cửa sổ cố định (DATA_MODEL mục 9). Mỗi dòng là số lần gọi của một
 * `key` trong một cửa sổ bắt đầu ở `window_start`. Cron `cleanup` xóa các dòng cũ (ARCHITECTURE
 * mục 8), nên bảng này KHÔNG phải ledger: `app_runtime` được UPDATE và DELETE.
 */
export const rateLimits = appSchema.table(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true, mode: "date" }).notNull(),
    count: integer("count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.windowStart] }),
    check("rate_limits_count_positive", sql`${table.count} > 0`),
    check("rate_limits_key_length", sql`char_length(${table.key}) between 1 and 256`),
  ],
);
