/**
 * Điều hướng bàn phím cho `Tabs` (mẫu WAI-ARIA "Tabs", kích hoạt tự động): mũi tên trái/phải di
 * chuyển (vòng tròn, bỏ qua tab bị khóa), Home/End về đầu/cuối. Trả `null` nếu phím không liên
 * quan hoặc không có tab nào chọn được.
 */
export function getNextTabIndex(
  currentIndex: number,
  key: string,
  disabled: readonly boolean[],
): number | null {
  const count = disabled.length;
  if (count === 0) {
    return null;
  }
  const enabled = (index: number) => disabled[index] === false;

  if (key === "Home") {
    return firstMatching(count, 0, 1, enabled);
  }
  if (key === "End") {
    return firstMatching(count, count - 1, -1, enabled);
  }
  if (key === "ArrowRight" || key === "ArrowLeft") {
    const step = key === "ArrowRight" ? 1 : -1;
    return firstMatching(count, (currentIndex + step + count) % count, step, enabled);
  }
  return null;
}

function firstMatching(
  count: number,
  start: number,
  step: 1 | -1,
  predicate: (index: number) => boolean,
): number | null {
  for (let offset = 0; offset < count; offset += 1) {
    const index = (((start + step * offset) % count) + count) % count;
    if (predicate(index)) {
      return index;
    }
  }
  return null;
}
