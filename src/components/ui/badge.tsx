import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "discount" // -23% trên thẻ sản phẩm (nền vàng)
  | "danger" // giảm giá lớn ở trang chi tiết, "Chỉ còn N", số giỏ hàng
  | "sale"
  | "success" // "Còn hàng", "Tiết kiệm"
  | "primary"
  | "neutral";

export type BadgeSize = "sm" | "md" | "lg";

const TONES: Record<BadgeTone, string> = {
  discount: "bg-badge-discount-bg text-badge-discount-fg",
  danger: "bg-danger text-white",
  sale: "bg-sale-soft text-sale",
  success: "bg-success-soft text-success",
  primary: "bg-primary-softer text-primary",
  neutral: "bg-page-bg text-muted",
};

// sm: nhãn 12/600; md: badge giảm giá trên thẻ 13/700; lg: badge giảm giá lớn 20/700 (UI_SPEC 4.4, 4.5).
const SIZES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs font-semibold",
  md: "px-1.5 py-0.5 text-[13px] leading-5 font-bold",
  lg: "px-4 py-1.5 text-xl leading-7 font-bold",
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Dạng số đếm tròn 16px (badge số món ở icon giỏ hàng). */
  count?: boolean;
  className?: string;
}

export function Badge({
  children,
  tone = "neutral",
  size = "sm",
  count = false,
  className,
}: BadgeProps) {
  if (count) {
    return (
      <span
        className={cn(
          "inline-flex h-4 min-w-4 items-center justify-center rounded-pill px-1 text-[11px] leading-none font-bold",
          TONES[tone],
          className,
        )}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-badge whitespace-nowrap",
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
