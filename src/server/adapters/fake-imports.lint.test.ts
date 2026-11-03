import path from "node:path";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

// Adapter giả chỉ được import từ index.ts của chính port đó (nơi duy nhất chọn adapter) và từ test.
// Chạy ESLint thật với eslint.config.mjs của dự án trên đoạn mã mẫu (không ghi file nào).
const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../..");
const eslint = new ESLint({ cwd: PROJECT_ROOT });
const RULE = "local/no-fake-adapter-import";

async function ruleMessages(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath: path.join(PROJECT_ROOT, filePath) });
  return (result?.messages ?? []).filter((message) => message.ruleId === RULE);
}

// Lần lint đầu tiên nạp cấu hình và plugin (typescript-eslint, next) mất vài giây, lâu hơn khi chạy
// cùng cả bộ test. Nạp trước ở đây với thời hạn riêng để từng test không vượt mức 5 giây mặc định.
beforeAll(async () => {
  await eslint.lintText("export {};\n", {
    filePath: path.join(PROJECT_ROOT, "src/server/modules/warmup.ts"),
  });
}, 60_000);

describe("ESLint cấm import adapter giả ngoài index.ts của port và test", () => {
  it.each([
    [
      "src/server/modules/auth/service.ts",
      'import { createConsoleSms } from "@/server/adapters/sms/fakes/console";\n',
    ],
    [
      "src/server/modules/auth/service.ts",
      'import { createConsoleSms } from "../../adapters/sms/fakes/console";\n',
    ],
    // index.ts của port KHÁC cũng không được.
    [
      "src/server/adapters/payment/index.ts",
      'import { createConsoleSms } from "../sms/fakes/console";\n',
    ],
    // File thường nằm ngay trong thư mục port (không phải index.ts) cũng không được.
    ["src/server/adapters/sms/esms.ts", 'import { createConsoleSms } from "./fakes/console";\n'],
    [
      "src/app/api/dev/route.ts",
      'export async function GET() {\n  await import("@/server/adapters/payment/fakes/fake");\n}\n',
    ],
    [
      "src/server/modules/orders/service.ts",
      'export { createMemoryStorage } from "@/server/adapters/storage/fakes/memory";\n',
    ],
    [
      "src/server/modules/orders/service.ts",
      'export * from "@/server/adapters/captcha/fakes/always-pass";\n',
    ],
    ["src/server/modules/orders/service.ts", 'import "@/server/adapters/notifier/fakes";\n'],
    [
      "scripts/seed-local.ts",
      'import { createFakePayment } from "../src/server/adapters/payment/fakes/fake";\n',
    ],
    // require() kiểu CommonJS.
    [
      "src/server/modules/auth/service.ts",
      'const sms = require("@/server/adapters/sms/fakes/console");\nexport { sms };\n',
    ],
    // import() với chuỗi template: phần cố định đã đủ cho biết là thư mục fakes/.
    [
      "src/app/api/dev/route.ts",
      "export async function GET(name: string) {\n  await import(`@/server/adapters/sms/fakes/${name}`);\n}\n",
    ],
    [
      "src/app/api/dev/route.ts",
      "export async function GET(port: string) {\n  await import(`@/server/adapters/${port}/fakes/console`);\n}\n",
    ],
    [
      "src/server/modules/auth/service.ts",
      "const name = 'console';\nconst sms = require(`../../adapters/sms/fakes/${name}`);\nexport { sms };\n",
    ],
  ])("%s: báo lỗi với %j", async (filePath, code) => {
    const messages = await ruleMessages(filePath, code);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.severity).toBe(2);
  });

  it.each([
    ["src/server/adapters/sms/index.ts", 'import { createConsoleSms } from "./fakes/console";\n'],
    [
      "src/server/adapters/sms/index.ts",
      'import { createConsoleSms } from "@/server/adapters/sms/fakes/console";\n',
    ],
    [
      "src/server/adapters/sms/fakes/console.test.ts",
      'import { createConsoleSms } from "./console";\n',
    ],
    [
      "src/server/adapters/selection.test.ts",
      'import { createConsoleSms } from "@/server/adapters/sms/fakes/console";\n',
    ],
    [
      "tests/integration/checkout.test.ts",
      'import { createFakePayment } from "@/server/adapters/payment/fakes/fake";\n',
    ],
    // Import thường (không phải adapter giả) không bị ảnh hưởng.
    ["src/server/modules/auth/service.ts", 'import { getSms } from "@/server/adapters/sms";\n'],
    [
      "src/server/modules/auth/service.ts",
      'import type { SmsPort } from "@/server/adapters/sms/port";\n',
    ],
    ["src/server/modules/auth/service.ts", 'import { fakesOf } from "@/lib/fakes-helper";\n'],
    // index.ts của chính port được nạp adapter giả bằng chuỗi template.
    [
      "src/server/adapters/sms/index.ts",
      "export async function load(name: string) {\n  return import(`./fakes/${name}`);\n}\n",
    ],
    // Hàm tên `require` khác (phương thức của object) không phải require CommonJS.
    [
      "src/server/modules/auth/service.ts",
      'const loader = { require: (p: string) => p };\nexport const x = loader.require("@/server/adapters/sms/fakes/console");\n',
    ],
  ])("%s: không báo với %j", async (filePath, code) => {
    expect(await ruleMessages(filePath, code)).toStrictEqual([]);
  });
});
