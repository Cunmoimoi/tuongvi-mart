import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// CLAUDE.md bất biến 6: mọi file trong src/server/ bắt đầu bằng `import "server-only"`,
// để bundler báo lỗi ngay nếu code client lỡ import vào.
const SERVER_DIR = import.meta.dirname;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(full);
    }
    const isSource =
      /\.(ts|tsx|mts)$/.test(entry.name) && !/\.test\.(ts|tsx|mts)$/.test(entry.name);
    return isSource ? [full] : [];
  });
}

describe("src/server", () => {
  it('mọi file nguồn bắt đầu bằng import "server-only"', () => {
    const files = listSourceFiles(SERVER_DIR);
    expect(files.length).toBeGreaterThan(0);

    const missing = files
      .filter((file) => {
        const firstStatement = readFileSync(file, "utf8")
          .split("\n")
          .find((line) => line.trim() !== "" && !line.trim().startsWith("//"));
        return firstStatement?.trim() !== 'import "server-only";';
      })
      .map((file) => path.relative(SERVER_DIR, file));

    expect(missing).toStrictEqual([]);
  });
});
