import { describe, expect, it } from "vitest";
import { getNextTabIndex } from "@/lib/tabs";

const ALL_ENABLED = [false, false, false, false];

describe("getNextTabIndex", () => {
  it("mũi tên phải/trái di chuyển một tab và quay vòng", () => {
    expect(getNextTabIndex(0, "ArrowRight", ALL_ENABLED)).toBe(1);
    expect(getNextTabIndex(3, "ArrowRight", ALL_ENABLED)).toBe(0);
    expect(getNextTabIndex(2, "ArrowLeft", ALL_ENABLED)).toBe(1);
    expect(getNextTabIndex(0, "ArrowLeft", ALL_ENABLED)).toBe(3);
  });

  it("Home và End về tab đầu/cuối", () => {
    expect(getNextTabIndex(2, "Home", ALL_ENABLED)).toBe(0);
    expect(getNextTabIndex(1, "End", ALL_ENABLED)).toBe(3);
  });

  it("bỏ qua tab bị khóa", () => {
    const disabled = [false, true, true, false];
    expect(getNextTabIndex(0, "ArrowRight", disabled)).toBe(3);
    expect(getNextTabIndex(3, "ArrowLeft", disabled)).toBe(0);
    expect(getNextTabIndex(2, "Home", [true, false, false, false])).toBe(1);
    expect(getNextTabIndex(0, "End", [false, false, false, true])).toBe(2);
  });

  it("phím khác không làm gì", () => {
    expect(getNextTabIndex(0, "Enter", ALL_ENABLED)).toBeNull();
    expect(getNextTabIndex(0, "a", ALL_ENABLED)).toBeNull();
  });

  it("không có tab nào chọn được hoặc không có tab thì trả null", () => {
    expect(getNextTabIndex(0, "ArrowRight", [true, true])).toBeNull();
    expect(getNextTabIndex(0, "ArrowRight", [])).toBeNull();
    expect(getNextTabIndex(0, "Home", [])).toBeNull();
  });
});
