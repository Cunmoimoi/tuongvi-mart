/**
 * Áp dụng migration Drizzle bằng role có quyền DDL (DATABASE_MIGRATION_URL).
 * Chạy được ở mọi môi trường: local, CI, staging, production.
 *
 * Không dùng DATABASE_URL: role `app_runtime` cố ý không có quyền DDL.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadLocalEnvFile } from "./lib/local-db-guard.mts";

loadLocalEnvFile();

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
if (!migrationUrl) {
  console.error(
    "Thiếu DATABASE_MIGRATION_URL. Đây là chuỗi kết nối của role có quyền DDL;\n" +
      "ở local là postgresql://postgres:postgres@127.0.0.1:54322/postgres (xem pnpm db:start).",
  );
  process.exit(1);
}

const sql = postgres(migrationUrl, {
  max: 1,
  // Migration cố ý thu hồi cả những quyền chưa từng được cấp (phòng thủ nhiều lớp),
  // nên Postgres sẽ cảnh báo "no privileges could be revoked". Bỏ qua đúng loại đó.
  onnotice: (notice) => {
    if (!notice.message?.includes("no privileges could be revoked")) {
      console.warn(`[postgres] ${notice.severity ?? "NOTICE"}: ${notice.message ?? ""}`);
    }
  },
});

try {
  // ALTER DEFAULT PRIVILEGES chỉ áp dụng cho đối tượng do chính role đã đặt nó tạo ra.
  // Nếu migration sau này chạy bằng role khác, bảng mới sẽ không có quyền cho app_runtime
  // mà không báo lỗi gì. Dừng ngay thay vì để lỗ hổng phân quyền đó xảy ra âm thầm.
  const owners = await sql<{ owner: string; currentUser: string }[]>`
    select pg_get_userbyid(nspowner) as owner, current_user as "currentUser"
    from pg_namespace
    where nspname = 'app'
  `;
  const row = owners[0];
  if (row && row.owner !== row.currentUser) {
    console.error(
      `Schema "app" thuộc role "${row.owner}" nhưng migration đang chạy bằng "${row.currentUser}".\n` +
        "Migration phải luôn chạy bằng cùng một role, nếu không default privileges sẽ không áp dụng\n" +
        "cho bảng tạo mới. Dùng lại DATABASE_MIGRATION_URL cũ hoặc chuyển quyền sở hữu schema.",
    );
    process.exit(1);
  }

  await migrate(drizzle(sql), {
    migrationsFolder: "drizzle",
    migrationsSchema: "drizzle",
    migrationsTable: "__drizzle_migrations",
  });
  console.log("Migration đã áp dụng xong.");
} finally {
  await sql.end();
}
