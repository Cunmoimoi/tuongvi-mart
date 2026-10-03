import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { systemClock, type Clock } from "@/server/lib/clock";

describe("systemClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("trả về thời điểm hiện tại mỗi lần gọi, không lưu cache", () => {
    vi.setSystemTime(new Date("2026-10-03T00:00:00.000Z"));
    expect(systemClock.now().toISOString()).toBe("2026-10-03T00:00:00.000Z");

    vi.setSystemTime(new Date("2026-10-03T00:15:00.000Z"));
    expect(systemClock.now().toISOString()).toBe("2026-10-03T00:15:00.000Z");
  });

  it("mỗi lần trả về một đối tượng Date mới để chỗ gọi không sửa nhầm giá trị dùng chung", () => {
    const first = systemClock.now();
    first.setUTCFullYear(1999);
    expect(systemClock.now().getUTCFullYear()).not.toBe(1999);
  });

  it("một đồng hồ giả chỉ cần thỏa interface Clock", () => {
    const fixed: Clock = { now: () => new Date("2030-01-01T00:00:00.000Z") };
    expect(fixed.now().getUTCFullYear()).toBe(2030);
  });
});
