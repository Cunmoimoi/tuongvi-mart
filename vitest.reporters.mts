import type { ViteUserConfig } from "vitest/config";

type Reporters = NonNullable<NonNullable<ViteUserConfig["test"]>["reporters"]>;

/**
 * Reporter dùng chung cho mọi config vitest.
 *
 * CI đặt VITEST_JSON_REPORT: in tên từng test (verbose) để log CI cho thấy test nào đã chạy, và
 * ghi báo cáo JSON để `scripts/ci/check-vitest-report.mts` làm đỏ CI nếu có test bị bỏ qua
 * (skip/todo) hoặc không có test nào chạy. Đặt qua biến môi trường vì pnpm 12 không chuyển
 * `--reporter` cho script mà coi là tùy chọn của chính pnpm.
 */
export function reporters(): Reporters {
  const jsonReport = process.env.VITEST_JSON_REPORT;
  if (!jsonReport) {
    return ["default"];
  }
  return ["verbose", ["json", { outputFile: jsonReport }]];
}
