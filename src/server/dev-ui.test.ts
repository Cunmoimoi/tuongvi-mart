import { beforeEach, describe, expect, it, vi } from "vitest";

// notFound() thật của Next.js cần React client runtime nên không nạp được trong project `server`
// của vitest; thay bằng hàm giả để kiểm tra logic "khi nào gọi notFound". Việc trang thật trả HTTP
// 404 ở mọi APP_ENV khác local được chứng minh bằng tests/http/dev-ui.test.ts (server `next start`).
const notFound = vi.hoisted(() =>
  vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
vi.mock("next/navigation", () => ({ notFound }));

import { assertDevUiEnabled, isDevUiEnabled } from "@/server/dev-ui";

beforeEach(() => {
  notFound.mockClear();
});

describe("isDevUiEnabled", () => {
  it("chỉ bật khi APP_ENV=local", () => {
    expect(isDevUiEnabled("local")).toBe(true);
  });

  it("tắt ở test, staging và production", () => {
    expect(isDevUiEnabled("test")).toBe(false);
    expect(isDevUiEnabled("staging")).toBe(false);
    expect(isDevUiEnabled("production")).toBe(false);
  });
});

describe("assertDevUiEnabled", () => {
  it("không gọi notFound ở local", () => {
    expect(() => assertDevUiEnabled("local")).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });

  it.each(["test", "staging", "production"] as const)("gọi notFound (404) ở %s", (appEnv) => {
    expect(() => assertDevUiEnabled(appEnv)).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
