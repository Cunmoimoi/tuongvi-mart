import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Chỉ unit test. Test tích hợp cần Postgres local nên chạy riêng bằng `pnpm test:int`
    // (vitest.integration.config.mts), để `pnpm check` không phụ thuộc vào Docker.
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    // "server-only" chỉ export module rỗng dưới điều kiện "react-server";
    // thêm điều kiện này để import "server-only" không ném lỗi khi chạy test.
    conditions: ["react-server"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
});
