import "server-only";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PostgresJsTransaction } from "drizzle-orm/postgres-js";
import { getDb } from "./client";
import * as schema from "./schema";

type Schema = typeof schema;

export type Tx = PostgresJsTransaction<Schema, ExtractTablesWithRelations<Schema>>;

/**
 * Mọi thay đổi liên quan tới tiền, kho, điểm và trạng thái đơn phải nằm trong một
 * transaction (ARCHITECTURE mục 1). Service nhận `Tx` để nhiều bước ghi dùng chung
 * một transaction thay vì mỗi repo tự mở một transaction riêng.
 */
export function withTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(fn);
}
