/**
 * Đọc báo cáo JSON của vitest (ghi khi đặt VITEST_JSON_REPORT, xem vitest.reporters.mts) và
 * dừng CI nếu bộ test "xanh" mà thực ra không kiểm tra gì:
 *   - không có test nào chạy (ví dụ `include` sai, hoặc `--passWithNoTests` che mất);
 *   - có test hoặc nhóm test bị bỏ qua (`skip`, `todo`, `skipIf`...);
 *   - có file test lỗi khi nạp hoặc test thất bại.
 *
 * Cách dùng: node scripts/ci/check-vitest-report.mts <báo-cáo.json> <tên bộ test>
 */
import { readFileSync } from "node:fs";

type AssertionResult = { fullName: string; status: string };
type FileResult = {
  name: string;
  status: string;
  message: string;
  assertionResults: AssertionResult[];
};
type VitestJsonReport = {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  numPendingTestSuites: number;
  testResults: FileResult[];
};

const [reportPath, suiteName = "vitest"] = process.argv.slice(2);
if (!reportPath) {
  console.error("Thiếu đường dẫn báo cáo JSON của vitest.");
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, "utf8")) as VitestJsonReport;
const problems: string[] = [];

if (!report.success) {
  problems.push("vitest báo không thành công");
}
if (report.numTotalTests === 0) {
  problems.push("không có test nào chạy");
}
if (report.numPendingTests > 0 || report.numTodoTests > 0 || report.numPendingTestSuites > 0) {
  problems.push(
    `có test bị bỏ qua: ${report.numPendingTests} test skip, ${report.numTodoTests} test todo, ` +
      `${report.numPendingTestSuites} nhóm test skip`,
  );
}
for (const file of report.testResults) {
  if (file.status !== "passed") {
    problems.push(`${file.name}: trạng thái file là "${file.status}" ${file.message}`.trim());
  }
  for (const test of file.assertionResults) {
    if (test.status !== "passed") {
      problems.push(`${file.name} › ${test.fullName}: "${test.status}"`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Bộ test ${suiteName} không đạt:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}

console.log(
  `Bộ test ${suiteName}: ${report.numPassedTests}/${report.numTotalTests} test chạy và đạt ` +
    `trong ${report.testResults.length} file, không test nào bị bỏ qua.`,
);
