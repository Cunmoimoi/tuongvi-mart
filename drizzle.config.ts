import { defineConfig } from "drizzle-kit";

// Chỉ dùng cho drizzle-kit (sinh migration ở máy dev / CI), không nằm trong bundle ứng dụng.
// Migration luôn chạy bằng DATABASE_MIGRATION_URL (role có quyền DDL), không dùng DATABASE_URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  schemaFilter: ["app"],
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL ?? "",
  },
  strict: true,
  verbose: true,
});
