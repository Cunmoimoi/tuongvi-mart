import { defineConfig } from "vitest/config";
import { reporters } from "./vitest.reporters.mts";

// Test HTTP gọi vào server `next start` thật, nên cần chạy `pnpm build` trước. Vì vậy tách khỏi
// `pnpm test` (nằm trong `pnpm check`) để `pnpm check` không phụ thuộc vào bản build.
export default defineConfig({
  test: {
    environment: "node",
    reporters: reporters(),
    include: ["tests/http/**/*.test.ts"],
    // Mỗi file khởi động vài server Next.js; đợi đủ lâu cho máy chậm.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
