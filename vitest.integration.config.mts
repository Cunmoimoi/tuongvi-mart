import path from "node:path";
import { defineConfig } from "vitest/config";
import {
  LocalDbGuardError,
  loadLocalEnvFile,
  requireLocalDatabase,
} from "./scripts/lib/local-db-guard.mts";

// Test tích hợp tạo rồi xóa bảng thật trong schema `app`. Guard chạy ngay khi nạp config,
// nên `pnpm test:int` dừng trước khi mở bất kỳ kết nối nào nếu không chắc đang ở local.
loadLocalEnvFile();

function readLocalConfig() {
  try {
    return requireLocalDatabase({
      appEnv: process.env.APP_ENV,
      allowedAppEnvs: ["local", "test"],
      connectionUrls: {
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_MIGRATION_URL: process.env.DATABASE_MIGRATION_URL,
      },
    });
  } catch (error) {
    if (error instanceof LocalDbGuardError) {
      console.error(`\npnpm test:int bị chặn.\n${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

const { appEnv, connectionUrls } = readLocalConfig();

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // Các test dùng chung một database và đều tạo/xóa bảng trong schema app.
    fileParallelism: false,
    testTimeout: 30_000,
    // Truyền tường minh vào worker thay vì dựa vào việc process.env được kế thừa.
    env: { APP_ENV: appEnv, ...connectionUrls },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    conditions: ["react-server"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
});
