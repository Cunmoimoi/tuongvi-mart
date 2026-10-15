/**
 * Logic thuần của bộ tăng giảm số lượng (`QuantityStepper`). Giao diện chỉ gợi ý giới hạn để
 * khách khỏi bấm quá tồn; tồn kho và số lượng thật do server kiểm tra lại (CLAUDE.md bất biến 1).
 */

export interface QuantityLimits {
  /** Nhỏ nhất cho phép (mặc định 1). Thẻ sản phẩm dùng 0: về 0 thì quay lại nút "Mua". */
  min: number;
  /** Lớn nhất cho phép (thường là tồn kho khả dụng). `undefined` = không giới hạn. */
  max?: number | undefined;
}

/** Ép về số nguyên trong [min, max]. Giá trị không hợp lệ (NaN, số thực...) rơi về `min`. */
export function clampQuantity(value: number, { min, max }: QuantityLimits): number {
  const lowest = Math.max(0, Math.trunc(min));
  const highest = max === undefined ? Number.MAX_SAFE_INTEGER : Math.max(lowest, Math.trunc(max));
  if (!Number.isFinite(value)) {
    return lowest;
  }
  return Math.min(highest, Math.max(lowest, Math.trunc(value)));
}

export function canDecrement(value: number, limits: QuantityLimits): boolean {
  return clampQuantity(value, limits) > clampQuantity(limits.min, limits);
}

export function canIncrement(value: number, limits: QuantityLimits): boolean {
  const current = clampQuantity(value, limits);
  return limits.max === undefined || current < clampQuantity(limits.max, limits);
}

/** Số lượng sau khi bấm `−` hoặc `+` một nấc; đứng yên ở biên. */
export function stepQuantity(
  value: number,
  direction: "decrement" | "increment",
  limits: QuantityLimits,
): number {
  const current = clampQuantity(value, limits);
  return clampQuantity(current + (direction === "increment" ? 1 : -1), limits);
}
