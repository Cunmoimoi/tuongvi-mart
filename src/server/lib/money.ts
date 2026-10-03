import "server-only";

/**
 * Số học tiền VND bằng số nguyên (CLAUDE.md bất biến 4). Mọi hàm ném `RangeError` thay vì trả
 * kết quả sai: số thực, số âm, NaN hay tràn số đều là lỗi lập trình hoặc dữ liệu bị can thiệp,
 * không bao giờ được âm thầm đi tiếp vào đơn hàng. Input từ người dùng phải qua Zod trước khi
 * tới đây.
 *
 * File này cố ý KHÔNG tự chọn cách làm tròn cho phép chia: quy tắc làm tròn là quy tắc nghiệp vụ,
 * nên `mulDiv` bắt buộc người gọi ghi rõ "floor" hay "ceil" theo BUSINESS_RULES.
 */

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

export function isVnd(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)
  );
}

export function assertVnd(value: unknown, label = "amount"): asserts value is number {
  if (!isVnd(value)) {
    throw new RangeError(
      `${label} phải là số nguyên VND không âm trong giới hạn an toàn, nhận được: ${String(value)}`,
    );
  }
}

function assertSafeResult(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} vượt giới hạn số nguyên an toàn`);
  }
  return value;
}

export function addVnd(...amounts: number[]): number {
  let total = 0;
  for (const amount of amounts) {
    assertVnd(amount);
    total = assertSafeResult(total + amount, "Tổng tiền");
  }
  return total;
}

/** Trừ hai khoản tiền. Kết quả âm là lỗi vì tiền luôn >= 0 (DATA_MODEL mục 1). */
export function subtractVnd(minuend: number, subtrahend: number): number {
  assertVnd(minuend, "minuend");
  assertVnd(subtrahend, "subtrahend");
  if (subtrahend > minuend) {
    throw new RangeError(`Kết quả phép trừ tiền bị âm: ${minuend} - ${subtrahend}`);
  }
  return minuend - subtrahend;
}

/** Đơn giá nhân số lượng nguyên (ví dụ thành tiền của một dòng đơn). */
export function multiplyVnd(unitPrice: number, quantity: number): number {
  assertVnd(unitPrice, "unitPrice");
  assertVnd(quantity, "quantity");
  return assertSafeResult(unitPrice * quantity, "Thành tiền");
}

export type Rounding = "floor" | "ceil";

/**
 * `a * b / c` bằng số nguyên, làm tròn theo `rounding`. Phép nhân chạy bằng BigInt nên chính
 * xác kể cả khi `a * b` vượt 2^53 (số thực sẽ mất độ chính xác ở đó). Dùng cho các công thức
 * điểm trong BUSINESS_RULES mục 8, ví dụ:
 *   floor(subtotal * max_redeem_bps / (10000 * point_value_vnd))
 *   ceil(points_earned * refunded / eligibleAmount)
 */
export function mulDiv(a: number, b: number, c: number, rounding: Rounding): number {
  assertVnd(a, "a");
  assertVnd(b, "b");
  assertVnd(c, "c");
  if (c === 0) {
    throw new RangeError("mulDiv: không chia cho 0");
  }
  if (rounding !== "floor" && rounding !== "ceil") {
    throw new RangeError(`mulDiv: cách làm tròn không hợp lệ: ${String(rounding)}`);
  }

  const product = BigInt(a) * BigInt(b);
  const divisor = BigInt(c);
  let quotient = product / divisor;
  if (rounding === "ceil" && product % divisor !== BigInt(0)) {
    quotient += BigInt(1);
  }
  if (quotient > MAX_SAFE) {
    throw new RangeError("Kết quả mulDiv vượt giới hạn số nguyên an toàn");
  }
  return Number(quotient);
}
