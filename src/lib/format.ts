/**
 * Định dạng số hiển thị (docs/UI_SPEC.md mục 2.4). Đây là HIỂN THỊ: mọi giá, tổng tiền, số tiết
 * kiệm do server tính (CLAUDE.md bất biến 1); các hàm ở đây chỉ biến số nguyên VND đã tính xong
 * thành chuỗi. Đây là hàm định dạng tiền duy nhất của giao diện: không viết `toLocaleString`
 * hay nối chuỗi `đ` ở chỗ khác.
 *
 * Tiền là số nguyên VND không âm (CLAUDE.md bất biến 4). Số thực, số âm, NaN hay số vượt giới
 * hạn an toàn là lỗi lập trình hoặc dữ liệu bị can thiệp: hàm ném `RangeError` thay vì hiển thị
 * một con số sai. Dùng cùng ngữ nghĩa với `isVnd` của `server/lib/money.ts` (file đó là
 * `server-only` nên giao diện không import được).
 */

function assertAmount(value: unknown, label: string): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    Object.is(value, -0)
  ) {
    throw new RangeError(
      `${label} phải là số nguyên VND không âm trong giới hạn an toàn, nhận được: ${String(value)}`,
    );
  }
}

/** `22900` → `"22.900"` (dấu chấm ngăn cách hàng nghìn, cố định, không phụ thuộc locale). */
export function formatVndNumber(amount: number): string {
  assertAmount(amount, "amount");
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** `22900` → `"22.900đ"`. Dạng viết liền dùng ở mọi nơi trừ giá trên thẻ và giá lớn. */
export function formatVnd(amount: number): string {
  return `${formatVndNumber(amount)}đ`;
}

/**
 * Số tiết kiệm dạng ngắn trên thẻ sản phẩm: `7000` → `"7K"`, `13500` → `"13,5K"`.
 * Làm tròn XUỐNG tới 0,1K (100đ) để không bao giờ khoe tiết kiệm nhiều hơn thực tế; dưới 1.000đ
 * thì ghi đầy đủ (`"500đ"`). Giỏ hàng và checkout dùng `formatVnd` (`7.000đ`), không dùng hàm này.
 */
export function formatSavingsShort(savings: number): string {
  assertAmount(savings, "savings");
  if (savings < 1000) {
    return formatVnd(savings);
  }
  const hundreds = Math.floor(savings / 100); // đơn vị 100đ
  const thousands = Math.floor(hundreds / 10);
  const tenth = hundreds % 10;
  return tenth === 0 ? `${thousands}K` : `${formatVndNumber(thousands)},${tenth}K`;
}

/**
 * Phần trăm giảm làm tròn xuống (`-23%` ở UI_SPEC 2.4), tính bằng số nguyên. Trả 0 khi không
 * giảm hoặc giá gốc 0 / thấp hơn giá bán (không hiện badge).
 */
export function discountPercent(originalPrice: number, price: number): number {
  assertAmount(originalPrice, "originalPrice");
  assertAmount(price, "price");
  if (originalPrice === 0 || price >= originalPrice) {
    return 0;
  }
  const scaled = (originalPrice - price) * 100;
  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError("Giá vượt giới hạn tính phần trăm giảm");
  }
  return (scaled - (scaled % originalPrice)) / originalPrice;
}

/** Số tiền tiết kiệm; 0 khi không giảm giá. */
export function savingsAmount(originalPrice: number, price: number): number {
  assertAmount(originalPrice, "originalPrice");
  assertAmount(price, "price");
  return originalPrice > price ? originalPrice - price : 0;
}

/** Đơn giá quy đổi: `(13.500đ / gói)`. */
export function formatUnitPrice(unitPrice: number, unitLabel: string): string {
  return `(${formatVnd(unitPrice)} / ${unitLabel})`;
}
