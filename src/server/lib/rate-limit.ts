import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { rateLimits } from "@/server/db/schema";
import { systemClock, type Clock } from "@/server/lib/clock";

/** Chỉ cần `insert`: nhận được cả `Database` lẫn `Tx`, và dễ thay bằng bản giả khi unit test. */
export type RateLimitDb = Pick<Database, "insert">;

export interface RateLimitRule {
  /** Ví dụ `login:ip:203.0.113.7`. Từ 1 đến 256 ký tự (database cũng chặn bằng CHECK). */
  readonly key: string;
  /** Số lần tối đa trong một cửa sổ. */
  readonly limit: number;
  readonly windowSeconds: number;
}

export interface RateLimitResult {
  /** `true` nếu lần gọi này còn nằm trong ngưỡng. */
  readonly allowed: boolean;
  /** Số lần đã gọi trong cửa sổ hiện tại, tính cả lần này. Có thể lớn hơn `limit`. */
  readonly count: number;
  readonly limit: number;
  readonly remaining: number;
  /** Lúc cửa sổ hiện tại kết thúc và bộ đếm bắt đầu lại từ 0. */
  readonly resetAt: Date;
  /** Số giây tới `resetAt` (làm tròn lên, tối thiểu 1), dùng cho header `Retry-After`. */
  readonly retryAfterSeconds: number;
}

const MAX_KEY_LENGTH = 256;

function assertValidRule(rule: RateLimitRule): void {
  if (rule.key.length < 1 || rule.key.length > MAX_KEY_LENGTH) {
    throw new RangeError(`Khóa rate limit phải dài từ 1 đến ${MAX_KEY_LENGTH} ký tự`);
  }
  if (!Number.isSafeInteger(rule.limit) || rule.limit < 1) {
    throw new RangeError(`limit phải là số nguyên >= 1, nhận được ${rule.limit}`);
  }
  if (!Number.isSafeInteger(rule.windowSeconds) || rule.windowSeconds < 1) {
    throw new RangeError(`windowSeconds phải là số nguyên >= 1, nhận được ${rule.windowSeconds}`);
  }
}

/**
 * Đầu cửa sổ cố định chứa `now`, căn theo mốc Unix epoch (UTC). Cửa sổ 86.400 giây vì thế
 * kết thúc lúc 00:00 UTC, tức 07:00 giờ Việt Nam, không phải nửa đêm giờ Việt Nam.
 */
export function getWindowStart(now: Date, windowSeconds: number): Date {
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

/**
 * Tính một lần gọi vào bộ đếm của `rule.key` rồi cho biết có còn trong ngưỡng không.
 *
 * Một câu `INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count` (DATA_MODEL
 * mục 9): Postgres khóa dòng nên các lần gọi song song, kể cả từ nhiều instance, nhận số đếm
 * khác nhau liên tiếp, không có hai lần nào cùng "thấy" một số. Lần gọi bị từ chối vẫn được
 * đếm, để kẻ tấn công không được thêm lượt khi bị chặn.
 *
 * Quy ước dùng:
 * - Truyền `getDb()` chứ KHÔNG truyền transaction nghiệp vụ. Nếu giao dịch đó rollback thì
 *   lượt đếm cũng bị hủy, và kẻ tấn công có thể cố tình gây rollback để né giới hạn.
 * - Lỗi database làm hàm ném lỗi (không trả `allowed: true`): luồng nhạy cảm đóng cửa khi lỗi.
 * - Cửa sổ cố định nên ngay ranh giới có thể nhận tối đa 2 x limit trong thời gian ngắn.
 */
export async function consumeRateLimit(
  db: RateLimitDb,
  rule: RateLimitRule,
  clock: Clock = systemClock,
): Promise<RateLimitResult> {
  assertValidRule(rule);

  const now = clock.now();
  const windowStart = getWindowStart(now, rule.windowSeconds);

  const rows = await db
    .insert(rateLimits)
    .values({ key: rule.key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  const count = rows[0]?.count;
  if (count === undefined) {
    throw new Error("Bảng rate_limits không trả về số đếm sau khi ghi");
  }

  const resetAt = new Date(windowStart.getTime() + rule.windowSeconds * 1000);
  return {
    allowed: count <= rule.limit,
    count,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000)),
  };
}
