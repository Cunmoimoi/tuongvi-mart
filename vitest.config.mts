import path from "node:path";
import { defineConfig } from "vitest/config";
import { reporters } from "./vitest.reporters.mts";

const alias = { "@": path.resolve(import.meta.dirname, "./src") };

// Test chỉ gồm unit test. Test tích hợp cần Postgres local nên chạy riêng bằng `pnpm test:int`
// (vitest.integration.config.mts), để `pnpm check` không phụ thuộc vào Docker.
//
// Hai project vì hai môi trường React khác nhau:
// - `server`: code trong src/server. "server-only" chỉ export module rỗng dưới điều kiện
//   "react-server"; thêm điều kiện này để import "server-only" không ném lỗi khi chạy test. Dưới
//   điều kiện đó `react` không có hook/createContext và `react-dom/server` bị chặn.
// - `ui`: component và hàm thuần của giao diện; dùng bản React thường để render được component
//   (`renderToStaticMarkup`) và test hook/context.
export default defineConfig({
  test: {
    reporters: reporters(),
    projects: [
      {
        resolve: { alias, conditions: ["react-server"] },
        ssr: { resolve: { conditions: ["react-server"] } },
        test: {
          name: "server",
          environment: "node",
          include: ["src/server/**/*.test.{ts,tsx}", "src/proxy.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "ui",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/server/**", "src/proxy.test.ts"],
        },
      },
    ],
  },
});
