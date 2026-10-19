import { describe, expect, it } from "vitest";
import {
  discountPercent,
  formatSavingsShort,
  formatUnitPrice,
  formatVnd,
  formatVndNumber,
  savingsAmount,
} from "@/lib/format";

const INVALID_AMOUNTS: unknown[] = [
  -1,
  0.5,
  22_900.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.MAX_SAFE_INTEGER + 1,
  "22900",
  null,
  undefined,
  -0,
];

describe("formatVnd", () => {
  it("ngăn cách hàng nghìn bằng dấu chấm và thêm đ liền sau", () => {
    expect(formatVnd(0)).toBe("0đ");
    expect(formatVnd(500)).toBe("500đ");
    expect(formatVnd(1_000)).toBe("1.000đ");
    expect(formatVnd(22_900)).toBe("22.900đ");
    expect(formatVnd(7_000)).toBe("7.000đ");
    expect(formatVnd(1_250_000)).toBe("1.250.000đ");
    expect(formatVnd(1_000_000_000)).toBe("1.000.000.000đ");
  });

  it("formatVndNumber không kèm ký hiệu đ (để giao diện tự đặt kiểu cho đ)", () => {
    expect(formatVndNumber(22_900)).toBe("22.900");
  });

  it("từ chối số thực, số âm, NaN, vô cực, số vượt giới hạn và kiểu khác số", () => {
    for (const value of INVALID_AMOUNTS) {
      expect(() => formatVnd(value as number), String(value)).toThrow(RangeError);
    }
  });
});

describe("formatSavingsShort", () => {
  it("ghi gọn theo nghìn đồng", () => {
    expect(formatSavingsShort(7_000)).toBe("7K");
    expect(formatSavingsShort(13_500)).toBe("13,5K");
    expect(formatSavingsShort(10_000)).toBe("10K");
    expect(formatSavingsShort(1_000)).toBe("1K");
    expect(formatSavingsShort(47_000)).toBe("47K");
  });

  it("làm tròn xuống tới 100đ, không bao giờ khoe nhiều hơn thực tế", () => {
    expect(formatSavingsShort(13_599)).toBe("13,5K");
    expect(formatSavingsShort(7_099)).toBe("7K");
    expect(formatSavingsShort(7_100)).toBe("7,1K");
  });

  it("dưới 1.000đ thì ghi đầy đủ", () => {
    expect(formatSavingsShort(500)).toBe("500đ");
    expect(formatSavingsShort(999)).toBe("999đ");
  });

  it("số lớn có dấu chấm ngăn cách", () => {
    expect(formatSavingsShort(1_234_500)).toBe("1.234,5K");
  });

  it("từ chối giá trị không hợp lệ", () => {
    for (const value of INVALID_AMOUNTS) {
      expect(() => formatSavingsShort(value as number), String(value)).toThrow(RangeError);
    }
  });
});

describe("discountPercent", () => {
  it("làm tròn xuống", () => {
    // (29.900 - 22.900) / 29.900 = 23,41% → 23
    expect(discountPercent(29_900, 22_900)).toBe(23);
    // 99,9% vẫn là 99
    expect(discountPercent(10_000, 10)).toBe(99);
    expect(discountPercent(100, 50)).toBe(50);
  });

  it("không giảm giá thì trả 0 (không hiện badge)", () => {
    expect(discountPercent(22_900, 22_900)).toBe(0);
    expect(discountPercent(20_000, 22_900)).toBe(0);
    expect(discountPercent(0, 0)).toBe(0);
  });

  it("giảm dưới 1% cũng trả 0", () => {
    expect(discountPercent(100_000, 99_500)).toBe(0);
  });

  it("từ chối giá trị không hợp lệ", () => {
    expect(() => discountPercent(-1, 0)).toThrow(RangeError);
    expect(() => discountPercent(100.5, 50)).toThrow(RangeError);
    expect(() => discountPercent(Number.MAX_SAFE_INTEGER, 1)).toThrow(RangeError);
  });
});

describe("savingsAmount", () => {
  it("là chênh lệch giá gốc và giá bán, 0 khi không giảm", () => {
    expect(savingsAmount(29_900, 22_900)).toBe(7_000);
    expect(savingsAmount(22_900, 22_900)).toBe(0);
    expect(savingsAmount(20_000, 22_900)).toBe(0);
  });
});

describe("formatUnitPrice", () => {
  it("đơn giá quy đổi trong ngoặc", () => {
    expect(formatUnitPrice(13_500, "gói")).toBe("(13.500đ / gói)");
  });
});
