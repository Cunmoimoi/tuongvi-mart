import {
  formatSavingsShort,
  formatUnitPrice,
  formatVnd,
  formatVndNumber,
  savingsAmount,
} from "@/lib/format";
import { cn } from "@/lib/cn";

export type PriceTagVariant = "card" | "large" | "inline";
export type SavingsFormat = "short" | "full" | "none";

export interface PriceTagProps {
  /** Giá bán (số nguyên VND, do server tính). */
  price: number;
  /** Giá gốc; chỉ hiện (gạch ngang) khi lớn hơn `price`. */
  originalPrice?: number | null | undefined;
  /**
   * `card`: thẻ sản phẩm (16/700, `đ` nhỏ gạch chân). `large`: trang chi tiết (28/700).
   * `inline`: giỏ hàng, checkout, danh sách (viết liền `22.900đ`).
   */
  variant?: PriceTagVariant;
  /** Mặc định: `short` ("Tiết kiệm 7K") ở card/large, `full` ("Tiết kiệm 7.000đ") ở inline. */
  savings?: SavingsFormat;
  /** Đơn giá quy đổi, ví dụ `{ amount: 13500, unit: "gói" }` → `(13.500đ / gói)`. */
  unitPrice?: { amount: number; unit: string } | undefined;
  className?: string;
}

const PRICE_CLASS: Record<PriceTagVariant, string> = {
  card: "text-price-card text-sale",
  large: "text-price-xl text-sale",
  inline: "text-price-card text-sale",
};

const ORIGINAL_CLASS: Record<PriceTagVariant, string> = {
  card: "text-price-sub text-faint line-through",
  large: "text-base text-faint line-through",
  inline: "text-[13px] leading-5 text-faint line-through",
};

const SAVINGS_CLASS: Record<PriceTagVariant, string> = {
  card: "text-[11px] leading-4 font-bold text-success",
  large: "text-base leading-6 font-bold text-success",
  inline: "text-[13px] leading-5 font-semibold text-success",
};

// Ký hiệu `đ` nhỏ hơn và gạch chân ở thẻ và giá lớn (UI_SPEC 2.4); nơi khác viết liền.
const CURRENCY_MARK_CLASS: Partial<Record<PriceTagVariant, string>> = {
  card: "text-[11px] underline",
  large: "text-lg underline",
};

export function PriceTag({
  price,
  originalPrice,
  variant = "card",
  savings,
  unitPrice,
  className,
}: PriceTagProps) {
  const saved = originalPrice == null ? 0 : savingsAmount(originalPrice, price);
  // Giá gốc chỉ hiện khi thật sự cao hơn giá bán.
  const originalToShow = originalPrice != null && saved > 0 ? originalPrice : null;
  const savingsFormat: SavingsFormat = savings ?? (variant === "inline" ? "full" : "short");
  const markClass = CURRENCY_MARK_CLASS[variant];

  const savingsText =
    saved > 0 && savingsFormat !== "none"
      ? `Tiết kiệm ${savingsFormat === "short" ? formatSavingsShort(saved) : formatVnd(saved)}`
      : null;

  const priceLine = (
    <span className={PRICE_CLASS[variant]}>
      <span className="sr-only">Giá bán </span>
      {markClass ? (
        <>
          {formatVndNumber(price)}
          <span className={markClass}>đ</span>
        </>
      ) : (
        formatVnd(price)
      )}
    </span>
  );

  const originalLine = originalToShow !== null && (
    <del className={ORIGINAL_CLASS[variant]}>
      <span className="sr-only">Giá gốc </span>
      {formatVnd(originalToShow)}
    </del>
  );

  const savingsLine = savingsText && <span className={SAVINGS_CLASS[variant]}>{savingsText}</span>;

  const unitLine = unitPrice && (
    <span className="text-xs text-muted">{formatUnitPrice(unitPrice.amount, unitPrice.unit)}</span>
  );

  // Trang chi tiết: giá, giá gốc, tiết kiệm trên cùng một hàng (UI_SPEC 4.5); thẻ và inline: giá
  // một dòng, giá gốc + tiết kiệm dòng dưới (UI_SPEC 4.4).
  if (variant === "large") {
    return (
      <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
        {priceLine}
        {originalLine}
        {savingsLine}
        {unitLine}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {priceLine}
      {(originalLine || savingsLine) && (
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          {originalLine}
          {savingsLine}
        </div>
      )}
      {unitLine}
    </div>
  );
}
