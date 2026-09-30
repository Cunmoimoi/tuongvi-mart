import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/server/env";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

function createDatabase() {
  // prepare: false là bắt buộc vì DATABASE_URL đi qua pooler của Supabase ở chế độ
  // transaction mode, nơi prepared statement không tồn tại qua nhiều transaction.
  const client = postgres(env.DATABASE_URL, { prepare: false });
  return drizzle(client, { schema });
}

let cached: Database | undefined;

// Lazy để việc import module này (ví dụ khi typecheck hay unit test) không tự mở kết nối
// và không bắt buộc phải có biến môi trường hợp lệ.
export function getDb(): Database {
  cached ??= createDatabase();
  return cached;
}
