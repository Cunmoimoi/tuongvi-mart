import { describe, expect, it } from "vitest";
import { canDecrement, canIncrement, clampQuantity, stepQuantity } from "@/lib/quantity";

describe("clampQuantity", () => {
  it("giữ nguyên số nguyên trong giới hạn", () => {
    expect(clampQuantity(3, { min: 1, max: 5 })).toBe(3);
  });

  it("ép về biên khi vượt", () => {
    expect(clampQuantity(0, { min: 1, max: 5 })).toBe(1);
    expect(clampQuantity(99, { min: 1, max: 5 })).toBe(5);
    expect(clampQuantity(-4, { min: 0 })).toBe(0);
  });

  it("giá trị không hợp lệ rơi về min", () => {
    expect(clampQuantity(Number.NaN, { min: 1, max: 5 })).toBe(1);
    expect(clampQuantity(Number.POSITIVE_INFINITY, { min: 1, max: 5 })).toBe(1);
  });

  it("bỏ phần thập phân", () => {
    expect(clampQuantity(2.9, { min: 1, max: 5 })).toBe(2);
  });

  it("max nhỏ hơn min thì lấy min (không bao giờ ra số lượng nhỏ hơn min)", () => {
    expect(clampQuantity(3, { min: 2, max: 1 })).toBe(2);
  });

  it("không có max thì không giới hạn trên", () => {
    expect(clampQuantity(1_000, { min: 1 })).toBe(1_000);
  });
});

describe("stepQuantity", () => {
  it("tăng và giảm một nấc", () => {
    expect(stepQuantity(2, "increment", { min: 1, max: 5 })).toBe(3);
    expect(stepQuantity(2, "decrement", { min: 1, max: 5 })).toBe(1);
  });

  it("đứng yên ở biên", () => {
    expect(stepQuantity(5, "increment", { min: 1, max: 5 })).toBe(5);
    expect(stepQuantity(1, "decrement", { min: 1, max: 5 })).toBe(1);
  });

  it("min = 0 cho phép về 0 (thẻ sản phẩm quay lại nút Mua)", () => {
    expect(stepQuantity(1, "decrement", { min: 0, max: 5 })).toBe(0);
    expect(stepQuantity(0, "decrement", { min: 0, max: 5 })).toBe(0);
  });

  it("giá trị hiện tại ngoài giới hạn được ép trước khi bước", () => {
    expect(stepQuantity(9, "decrement", { min: 1, max: 5 })).toBe(4);
  });
});

describe("canIncrement / canDecrement", () => {
  it("khóa nút ở biên", () => {
    expect(canIncrement(5, { min: 1, max: 5 })).toBe(false);
    expect(canIncrement(4, { min: 1, max: 5 })).toBe(true);
    expect(canDecrement(1, { min: 1, max: 5 })).toBe(false);
    expect(canDecrement(2, { min: 1, max: 5 })).toBe(true);
    expect(canDecrement(1, { min: 0, max: 5 })).toBe(true);
  });

  it("không có max thì luôn tăng được", () => {
    expect(canIncrement(1_000_000, { min: 1 })).toBe(true);
  });

  it("hết hàng (max = 0) thì khóa cả hai nút", () => {
    expect(canIncrement(0, { min: 0, max: 0 })).toBe(false);
    expect(canDecrement(0, { min: 0, max: 0 })).toBe(false);
  });
});
