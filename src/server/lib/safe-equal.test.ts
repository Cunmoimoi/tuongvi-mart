import { beforeEach, describe, expect, it, vi } from "vitest";

// Bọc crypto.timingSafeEqual bằng spy nhưng vẫn chạy hàm thật, để kiểm chứng helper
// thực sự đi qua nó (CLAUDE.md bất biến 17) chứ không tự so sánh bằng `===`.
const timingSafeEqualSpy = vi.hoisted(() => vi.fn());
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  timingSafeEqualSpy.mockImplementation(actual.timingSafeEqual);
  return { ...actual, default: actual, timingSafeEqual: timingSafeEqualSpy };
});

import { safeEqual } from "@/server/lib/safe-equal";

beforeEach(() => {
  timingSafeEqualSpy.mockClear();
});

describe("safeEqual", () => {
  it("hai chuỗi giống nhau thì true", () => {
    expect(safeEqual("sha256=abc123", "sha256=abc123")).toBe(true);
  });

  it("hai chuỗi cùng độ dài nhưng khác nội dung thì false", () => {
    expect(safeEqual("sha256=abc123", "sha256=abc124")).toBe(false);
  });

  describe("(d) hai chuỗi khác độ dài", () => {
    it("trả false và không ném lỗi, kể cả khi chuỗi này là tiền tố của chuỗi kia", () => {
      expect(() => safeEqual("abc", "abcd")).not.toThrow();
      expect(safeEqual("abc", "abcd")).toBe(false);
      expect(safeEqual("abcd", "abc")).toBe(false);
      expect(safeEqual("", "abc")).toBe(false);
      expect(safeEqual("abc", "")).toBe(false);
    });

    it("vẫn đi qua crypto.timingSafeEqual với hai buffer cùng độ dài, không so sánh sớm theo độ dài", () => {
      safeEqual("ngan", "mot-chuoi-dai-hon-rat-nhieu");

      expect(timingSafeEqualSpy).toHaveBeenCalledTimes(1);
      const [left, right] = timingSafeEqualSpy.mock.calls[0] as [Buffer, Buffer];
      expect(left.byteLength).toBe(right.byteLength);
    });
  });

  it("dùng crypto.timingSafeEqual cho cả trường hợp giống nhau", () => {
    safeEqual("giong-nhau", "giong-nhau");
    expect(timingSafeEqualSpy).toHaveBeenCalledTimes(1);
  });

  it("so sánh theo byte UTF-8, không bị đánh lừa bởi ký tự khác nhau cùng số ký tự", () => {
    expect(safeEqual("đơn-hàng", "đơn-hàng")).toBe(true);
    expect(safeEqual("đơn-hàng", "đơn-hang")).toBe(false);
  });

  it("nhận Buffer/Uint8Array lẫn chuỗi", () => {
    const bytes = Buffer.from("secret");
    expect(safeEqual(bytes, Buffer.from("secret"))).toBe(true);
    expect(safeEqual(new Uint8Array(bytes), "secret")).toBe(true);
    expect(safeEqual(bytes, "secreT")).toBe(false);
  });

  it("đóng cửa khi lỗi: null hoặc undefined (ví dụ thiếu header) luôn là false", () => {
    expect(safeEqual(null, "abc")).toBe(false);
    expect(safeEqual("abc", undefined)).toBe(false);
    expect(safeEqual(null, null)).toBe(false);
    expect(safeEqual(undefined, undefined)).toBe(false);
  });
});
