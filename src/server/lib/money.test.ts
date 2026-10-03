import { describe, expect, it } from "vitest";
import { addVnd, assertVnd, isVnd, mulDiv, multiplyVnd, subtractVnd } from "@/server/lib/money";

describe("isVnd và assertVnd", () => {
  it("chấp nhận số nguyên không âm", () => {
    for (const value of [0, 1, 20_000, 300_000, Number.MAX_SAFE_INTEGER]) {
      expect(isVnd(value), String(value)).toBe(true);
      expect(() => assertVnd(value)).not.toThrow();
    }
  });

  it("từ chối số thực, số âm, NaN, vô cực, số vượt giới hạn an toàn và kiểu khác số", () => {
    const invalid: unknown[] = [
      -1,
      0.5,
      19_999.99,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      "20000",
      null,
      undefined,
      BigInt(20_000),
    ];
    for (const value of invalid) {
      expect(isVnd(value), String(value)).toBe(false);
      expect(() => assertVnd(value), String(value)).toThrow(RangeError);
    }
  });

  it("thông báo lỗi nêu tên trường để dễ tìm lỗi", () => {
    expect(() => assertVnd(1.5, "shippingFee")).toThrow(/shippingFee/);
  });
});

describe("addVnd", () => {
  it("cộng các khoản tiền", () => {
    expect(addVnd(100_000, 20_000, 5_000)).toBe(125_000);
    expect(addVnd(7)).toBe(7);
    expect(addVnd()).toBe(0);
  });

  it("không bị lỗi số thực: tổng luôn là số nguyên", () => {
    expect(Number.isInteger(addVnd(10_000, 20_000, 30_000))).toBe(true);
  });

  it("từ chối khoản tiền không hợp lệ và tràn số", () => {
    expect(() => addVnd(100, 0.1)).toThrow(RangeError);
    expect(() => addVnd(100, -1)).toThrow(RangeError);
    expect(() => addVnd(Number.MAX_SAFE_INTEGER, 1)).toThrow(RangeError);
  });
});

describe("subtractVnd", () => {
  it("trừ hai khoản tiền", () => {
    expect(subtractVnd(300_000, 20_000)).toBe(280_000);
    expect(subtractVnd(50, 50)).toBe(0);
  });

  it("không cho kết quả âm (DATA_MODEL: tiền luôn >= 0)", () => {
    expect(() => subtractVnd(10, 11)).toThrow(RangeError);
  });

  it("từ chối khoản tiền không hợp lệ", () => {
    expect(() => subtractVnd(10.5, 1)).toThrow(RangeError);
    expect(() => subtractVnd(10, -1)).toThrow(RangeError);
  });
});

describe("multiplyVnd", () => {
  it("nhân đơn giá với số lượng nguyên", () => {
    expect(multiplyVnd(12_500, 3)).toBe(37_500);
    expect(multiplyVnd(12_500, 0)).toBe(0);
  });

  it("từ chối số lượng không phải số nguyên không âm", () => {
    expect(() => multiplyVnd(12_500, 1.5)).toThrow(RangeError);
    expect(() => multiplyVnd(12_500, -1)).toThrow(RangeError);
    expect(() => multiplyVnd(12_500, Number.NaN)).toThrow(RangeError);
  });

  it("từ chối đơn giá không hợp lệ và kết quả tràn số", () => {
    expect(() => multiplyVnd(0.5, 2)).toThrow(RangeError);
    expect(() => multiplyVnd(Number.MAX_SAFE_INTEGER, 2)).toThrow(RangeError);
  });
});

describe("mulDiv: a * b / c bằng số nguyên, bắt buộc chọn cách làm tròn", () => {
  it("làm tròn xuống theo công thức điểm tối đa dùng được (BUSINESS_RULES mục 8)", () => {
    // floor(subtotal * max_redeem_bps / (10000 * point_value_vnd))
    expect(mulDiv(250_000, 5_000, 10_000 * 1_000, "floor")).toBe(125);
    expect(mulDiv(99_999, 5_000, 10_000 * 1_000, "floor")).toBe(49); // 49,9995 -> 49
  });

  it("làm tròn lên theo công thức EARN_REVERSAL (BUSINESS_RULES mục 8)", () => {
    // ceil(points_earned * refunded / eligibleAmount)
    expect(mulDiv(7, 30_000, 100_000, "ceil")).toBe(3); // 2,1 -> 3
    expect(mulDiv(7, 50_000, 100_000, "ceil")).toBe(4); // 3,5 -> 4
    expect(mulDiv(10, 50_000, 100_000, "ceil")).toBe(5); // chia hết thì giữ nguyên
  });

  it("kết quả chia hết thì floor và ceil bằng nhau", () => {
    expect(mulDiv(6, 5, 10, "floor")).toBe(3);
    expect(mulDiv(6, 5, 10, "ceil")).toBe(3);
  });

  it("chính xác ngay cả khi tích a * b vượt 2^53 (không dùng số thực trung gian)", () => {
    expect(mulDiv(Number.MAX_SAFE_INTEGER, 10_000, 10_000, "floor")).toBe(Number.MAX_SAFE_INTEGER);
    // 9_007_199_254_740_991 * 3 / 2 = 13_510_798_882_111_486,5 vượt giới hạn an toàn
    expect(() => mulDiv(Number.MAX_SAFE_INTEGER, 3, 2, "floor")).toThrow(RangeError);
    expect(mulDiv(4_000_000_000_000, 4_000_000_000, 16_000_000_000, "floor")).toBe(
      1_000_000_000_000,
    );
  });

  it("từ chối chia cho 0, đầu vào không hợp lệ và cách làm tròn lạ", () => {
    expect(() => mulDiv(1, 1, 0, "floor")).toThrow(RangeError);
    expect(() => mulDiv(-1, 1, 1, "floor")).toThrow(RangeError);
    expect(() => mulDiv(1, 1.5, 1, "floor")).toThrow(RangeError);
    expect(() => mulDiv(1, 1, 1, "round" as never)).toThrow(RangeError);
  });
});
