import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Chạy ESLint thật với eslint.config.mjs của dự án trên đoạn mã mẫu (không ghi file nào).
const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../..");
const eslint = new ESLint({ cwd: PROJECT_ROOT });

async function lint(code: string, filePath = "src/components/shop/sample.tsx") {
  const [result] = await eslint.lintText(code, { filePath: path.join(PROJECT_ROOT, filePath) });
  return result?.messages ?? [];
}

describe("ESLint cấm <img> trần cho ảnh nội dung", () => {
  it("file chứa <img> trần bị báo lỗi (mức error)", async () => {
    const messages = await lint(
      'export function Sample() {\n  return <img src="/a.png" alt="Sản phẩm" width={10} height={10} />;\n}\n',
    );
    const imgMessages = messages.filter(
      (message) => message.ruleId === "@next/next/no-img-element",
    );
    expect(imgMessages).toHaveLength(1);
    expect(imgMessages[0]?.severity).toBe(2);
  });

  it("dùng AppImage thì không bị báo", async () => {
    const messages = await lint(
      'import { AppImage } from "@/components/ui/app-image";\n' +
        'export function Sample() {\n  return <AppImage preset="product-card" alt="Sản phẩm" />;\n}\n',
    );
    expect(
      messages.filter((message) => message.ruleId === "@next/next/no-img-element"),
    ).toHaveLength(0);
  });
});
