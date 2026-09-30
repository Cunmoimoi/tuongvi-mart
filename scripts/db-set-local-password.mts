/**
 * Đặt mật khẩu cho role `app_runtime` trên Postgres local.
 *
 * Migration cố ý không chứa mật khẩu, nên sau khi migrate role `app_runtime` chưa đăng
 * nhập được. Script này lấy mật khẩu từ phần password của DATABASE_URL trong .env.local
 * (không thêm biến môi trường mới, không có mật khẩu nào trong file được commit) rồi
 * đặt cho role. Ở staging/production, mật khẩu do người vận hành đặt tay.
 */
import postgres from "postgres";
import {
  LocalDbGuardError,
  loadLocalEnvFile,
  requireLocalDatabase,
} from "./lib/local-db-guard.mts";

// Mật khẩu local chỉ cho phép ký tự unreserved của URL: đủ dùng, và không cần lo
// escape khi nó nằm trong chuỗi kết nối.
const ALLOWED_PASSWORD = /^[A-Za-z0-9_.~-]{12,}$/;
const EXPECTED_ROLE = "app_runtime";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

loadLocalEnvFile();

function readLocalConfig() {
  try {
    return requireLocalDatabase({
      appEnv: process.env.APP_ENV,
      // Chỉ `local`, không nhận cả `test`: script này sửa role của database dùng để phát triển.
      allowedAppEnvs: ["local"],
      connectionUrls: {
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_MIGRATION_URL: process.env.DATABASE_MIGRATION_URL,
      },
    });
  } catch (error) {
    if (error instanceof LocalDbGuardError) {
      fail(error.message);
    }
    throw error;
  }
}

const { connectionUrls } = readLocalConfig();
const databaseUrl = connectionUrls.DATABASE_URL ?? "";
const migrationUrl = connectionUrls.DATABASE_MIGRATION_URL ?? "";

const parsedDatabaseUrl = new URL(databaseUrl);
const password = decodeURIComponent(parsedDatabaseUrl.password);

if (parsedDatabaseUrl.username !== EXPECTED_ROLE) {
  fail(
    `DATABASE_URL phải đăng nhập bằng role "${EXPECTED_ROLE}", đang là ` +
      `"${parsedDatabaseUrl.username}". Ứng dụng không được chạy bằng role có quyền DDL.`,
  );
}

if (!ALLOWED_PASSWORD.test(password)) {
  fail(
    `Mật khẩu trong DATABASE_URL không hợp lệ: cần ít nhất 12 ký tự và chỉ dùng ` +
      `chữ, số, "_", ".", "~", "-". Sửa DATABASE_URL trong .env.local rồi chạy lại.`,
  );
}

const sql = postgres(migrationUrl, { max: 1 });

try {
  // ALTER ROLE không nhận tham số truy vấn, nên nhờ chính Postgres tạo câu lệnh với
  // format('%L') để mật khẩu được escape đúng chuẩn thay vì nối chuỗi bằng tay.
  const statements = await sql<{ statement: string }[]>`
    select format('alter role %I with login password %L', ${EXPECTED_ROLE}::text, ${password}::text)
      as statement
  `;
  const statement = statements[0]?.statement;
  if (!statement) {
    fail("Không tạo được câu lệnh ALTER ROLE.");
  }
  await sql.unsafe(statement);
} finally {
  await sql.end();
}

// Kiểm tra thật: kết nối bằng đúng DATABASE_URL mà ứng dụng sẽ dùng.
const appSql = postgres(databaseUrl, { prepare: false, max: 1 });
try {
  const rows = await appSql<{ currentUser: string }[]>`select current_user as "currentUser"`;
  if (rows[0]?.currentUser !== EXPECTED_ROLE) {
    fail(
      `Kết nối bằng DATABASE_URL lại vào role "${rows[0]?.currentUser}", không phải ${EXPECTED_ROLE}.`,
    );
  }
  console.log(`Đã đặt mật khẩu cho role ${EXPECTED_ROLE} và kết nối thử thành công.`);
} finally {
  await appSql.end();
}
