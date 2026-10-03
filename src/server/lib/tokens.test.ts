import { afterEach, describe, expect, it, vi } from "vitest";

// Đếm lời gọi crypto.randomInt/randomBytes nhưng vẫn chạy hàm thật.
const cryptoSpies = vi.hoisted(() => ({ randomInt: vi.fn(), randomBytes: vi.fn() }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  cryptoSpies.randomInt.mockImplementation(actual.randomInt);
  cryptoSpies.randomBytes.mockImplementation(actual.randomBytes);
  return {
    ...actual,
    default: actual,
    randomInt: cryptoSpies.randomInt,
    randomBytes: cryptoSpies.randomBytes,
  };
});

import {
  ORDER_CODE_ALPHABET,
  ORDER_CODE_LENGTH,
  ORDER_CODE_PREFIX,
  generateOrderCode,
  randomToken,
} from "@/server/lib/tokens";

afterEach(() => {
  vi.restoreAllMocks();
  cryptoSpies.randomInt.mockClear();
  cryptoSpies.randomBytes.mockClear();
});

// BUSINESS_RULES mục 5.1: bỏ 0, 1, I, L, O, U để khỏi nhầm.
const EXPECTED_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const ORDER_CODE_PATTERN = /^TVM[23456789ABCDEFGHJKMNPQRSTVWXYZ]{8}$/;

describe("(a) generateOrderCode", () => {
  it("bảng chữ đúng 30 ký tự như BUSINESS_RULES mục 5.1 và không có ký tự dễ nhầm", () => {
    expect(ORDER_CODE_ALPHABET).toBe(EXPECTED_ALPHABET);
    expect(ORDER_CODE_ALPHABET).toHaveLength(30);
    expect(new Set(ORDER_CODE_ALPHABET).size).toBe(30);
    for (const confusing of ["0", "1", "I", "L", "O", "U"]) {
      expect(ORDER_CODE_ALPHABET).not.toContain(confusing);
    }
  });

  it("đúng định dạng TVM + 8 ký tự", () => {
    expect(ORDER_CODE_PREFIX).toBe("TVM");
    expect(ORDER_CODE_LENGTH).toBe(8);
    for (let i = 0; i < 5_000; i += 1) {
      const code = generateOrderCode();
      expect(code, code).toMatch(ORDER_CODE_PATTERN);
      expect(code).toHaveLength(11);
    }
  });

  it("chỉ dùng ký tự trong bảng chữ cho phép, và dùng đủ mọi ký tự của bảng", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2_000; i += 1) {
      for (const char of generateOrderCode().slice(ORDER_CODE_PREFIX.length)) {
        expect(ORDER_CODE_ALPHABET, char).toContain(char);
        seen.add(char);
      }
    }
    // 16.000 lần rút ngẫu nhiên: xác suất thiếu một ký tự nào đó nhỏ hơn 1e-200.
    expect([...seen].sort().join("")).toBe([...ORDER_CODE_ALPHABET].sort().join(""));
  });

  it("sinh bằng crypto.randomInt: đúng 8 lần mỗi mã, khoảng [0, 30)", () => {
    generateOrderCode();
    expect(cryptoSpies.randomInt).toHaveBeenCalledTimes(8);
    for (const call of cryptoSpies.randomInt.mock.calls) {
      expect(call).toStrictEqual([0, 30]);
    }
  });

  it("không bao giờ gọi Math.random", () => {
    const mathRandom = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random bị cấm trong code sinh mã");
    });
    expect(() => generateOrderCode()).not.toThrow();
    expect(() => randomToken(32)).not.toThrow();
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it("hai mã liên tiếp khác nhau (không bị cố định hạt giống)", () => {
    const codes = new Set(Array.from({ length: 1_000 }, () => generateOrderCode()));
    expect(codes.size).toBe(1_000);
  });
});

describe("randomToken", () => {
  it("trả base64url, độ dài đúng theo số byte, chỉ gồm ký tự an toàn cho URL", () => {
    const token = randomToken(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(token).toHaveLength(43); // 32 byte = 256 bit, không có dấu '='
  });

  it("dùng crypto.randomBytes với đúng số byte yêu cầu", () => {
    randomToken(24);
    expect(cryptoSpies.randomBytes).toHaveBeenCalledWith(24);
  });

  it("mỗi lần gọi ra một giá trị khác", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => randomToken(32)));
    expect(tokens.size).toBe(500);
  });

  it("từ chối token yếu hơn 128 bit và số byte không hợp lệ", () => {
    expect(() => randomToken(15)).toThrow(RangeError);
    expect(() => randomToken(0)).toThrow(RangeError);
    expect(() => randomToken(-1)).toThrow(RangeError);
    expect(() => randomToken(32.5)).toThrow(RangeError);
    expect(() => randomToken(Number.NaN)).toThrow(RangeError);
    expect(() => randomToken(1_000_000)).toThrow(RangeError);
    expect(() => randomToken(16)).not.toThrow();
  });
});
