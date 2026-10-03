import { describe, expect, it, vi } from "vitest";
import type { Clock } from "@/server/lib/clock";
import { consumeRateLimit, getWindowStart, type RateLimitDb } from "@/server/lib/rate-limit";

// Phần chạy với Postgres thật (đúng ngưỡng khi gọi song song, quyền của app_runtime)
// nằm ở tests/integration/rate-limit.test.ts. File này chỉ kiểm tra phần tính toán thuần.

function clockAt(iso: string): Clock {
  return { now: () => new Date(iso) };
}

/** Database giả: trả lần lượt các giá trị `count`, ghi lại tham số được đưa xuống. */
function fakeDb(counts: number[]) {
  const inserted: { key: string; windowStart: Date; count: number }[] = [];
  const queue = [...counts];
  const db = {
    insert: vi.fn(() => ({
      values: (row: { key: string; windowStart: Date; count: number }) => {
        inserted.push(row);
        return {
          onConflictDoUpdate: () => ({
            returning: async () => {
              const count = queue.shift();
              return count === undefined ? [] : [{ count }];
            },
          }),
        };
      },
    })),
  };
  return { db: db as unknown as RateLimitDb, insert: db.insert, inserted };
}

describe("getWindowStart", () => {
  const now = new Date("2026-10-03T07:30:45.123Z");

  it("làm tròn xuống đầu cửa sổ", () => {
    expect(getWindowStart(now, 60).toISOString()).toBe("2026-10-03T07:30:00.000Z");
    expect(getWindowStart(now, 600).toISOString()).toBe("2026-10-03T07:30:00.000Z");
    expect(getWindowStart(now, 3_600).toISOString()).toBe("2026-10-03T07:00:00.000Z");
    expect(getWindowStart(now, 86_400).toISOString()).toBe("2026-10-03T00:00:00.000Z");
  });

  it("đúng ranh giới thì thuộc cửa sổ mới", () => {
    const boundary = new Date("2026-10-03T07:31:00.000Z");
    expect(getWindowStart(boundary, 60).toISOString()).toBe("2026-10-03T07:31:00.000Z");
    const justBefore = new Date("2026-10-03T07:30:59.999Z");
    expect(getWindowStart(justBefore, 60).toISOString()).toBe("2026-10-03T07:30:00.000Z");
  });
});

describe("consumeRateLimit: tính kết quả", () => {
  const clock = clockAt("2026-10-03T07:30:45.000Z");
  const rule = { key: "login:ip:203.0.113.7", limit: 3, windowSeconds: 60 };

  it("cho phép khi số lần chưa vượt ngưỡng, kể cả lần chạm đúng ngưỡng", async () => {
    const { db } = fakeDb([1, 2, 3]);
    const results = [
      await consumeRateLimit(db, rule, clock),
      await consumeRateLimit(db, rule, clock),
      await consumeRateLimit(db, rule, clock),
    ];

    expect(results.map((r) => r.allowed)).toStrictEqual([true, true, true]);
    expect(results.map((r) => r.count)).toStrictEqual([1, 2, 3]);
    expect(results.map((r) => r.remaining)).toStrictEqual([2, 1, 0]);
  });

  it("từ chối ngay từ lần vượt ngưỡng, remaining không âm", async () => {
    const { db } = fakeDb([4, 5]);
    const fourth = await consumeRateLimit(db, rule, clock);
    const fifth = await consumeRateLimit(db, rule, clock);

    expect(fourth).toMatchObject({ allowed: false, count: 4, remaining: 0, limit: 3 });
    expect(fifth).toMatchObject({ allowed: false, count: 5, remaining: 0 });
  });

  it("báo thời điểm cửa sổ kết thúc và số giây phải chờ", async () => {
    const { db } = fakeDb([4]);
    const result = await consumeRateLimit(db, rule, clock);

    expect(result.resetAt.toISOString()).toBe("2026-10-03T07:31:00.000Z");
    expect(result.retryAfterSeconds).toBe(15);
  });

  it("retryAfterSeconds làm tròn lên và tối thiểu 1 giây", async () => {
    const { db } = fakeDb([4, 4]);
    const early = await consumeRateLimit(db, rule, clockAt("2026-10-03T07:30:00.000Z"));
    const late = await consumeRateLimit(db, rule, clockAt("2026-10-03T07:30:59.999Z"));

    expect(early.retryAfterSeconds).toBe(60);
    expect(late.retryAfterSeconds).toBe(1);
  });

  it("ghi đúng khóa, đầu cửa sổ theo đồng hồ được truyền vào, và số đếm khởi điểm là 1", async () => {
    const { db, inserted } = fakeDb([1]);
    await consumeRateLimit(db, rule, clock);

    expect(inserted).toStrictEqual([
      { key: rule.key, windowStart: new Date("2026-10-03T07:30:00.000Z"), count: 1 },
    ]);
  });

  it("đóng cửa khi lỗi: database không trả dòng nào thì ném lỗi chứ không cho qua", async () => {
    const { db } = fakeDb([]);
    await expect(consumeRateLimit(db, rule, clock)).rejects.toThrow();
  });
});

describe("consumeRateLimit: kiểm tra cấu hình", () => {
  const clock = clockAt("2026-10-03T07:30:45.000Z");

  it.each([
    ["limit = 0", { key: "k", limit: 0, windowSeconds: 60 }],
    ["limit âm", { key: "k", limit: -1, windowSeconds: 60 }],
    ["limit không nguyên", { key: "k", limit: 2.5, windowSeconds: 60 }],
    ["windowSeconds = 0", { key: "k", limit: 5, windowSeconds: 0 }],
    ["windowSeconds không nguyên", { key: "k", limit: 5, windowSeconds: 1.5 }],
    ["khóa rỗng", { key: "", limit: 5, windowSeconds: 60 }],
    ["khóa quá dài", { key: "x".repeat(257), limit: 5, windowSeconds: 60 }],
  ])("từ chối %s và không chạm database", async (_name, rule) => {
    const { db, insert } = fakeDb([1]);
    await expect(consumeRateLimit(db, rule, clock)).rejects.toThrow(RangeError);
    expect(insert).not.toHaveBeenCalled();
  });
});
