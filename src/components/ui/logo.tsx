import Link from "next/link";
import { cn } from "@/lib/cn";

export type LogoTone = "on-dark" | "on-light";

export interface LogoProps {
  /** `on-dark`: chữ trắng trên nền `brand` (header). `on-light`: chữ `brand` trên nền trắng (footer). */
  tone?: LogoTone;
  /** Cao 32 (header) hoặc 36 (footer) theo UI_SPEC 3.1, 3.6. */
  size?: "md" | "lg";
  /** `null` thì chỉ hiện chữ, không phải link (ví dụ trong ngữ cảnh đã có link bao ngoài). */
  href?: string | null;
  className?: string;
}

/**
 * Logo tạm: chữ "Tường Vi Mart" (chưa có file logo thật). Đây là component logo DUY NHẤT của
 * dự án: khi có logo thật chỉ phải sửa file này (UI_SPEC mục 0: không dùng logo thương hiệu khác).
 */
export function Logo({ tone = "on-light", size = "md", href = "/", className }: LogoProps) {
  const classes = cn(
    "inline-flex items-center font-bold tracking-tight whitespace-nowrap",
    size === "md" ? "h-8 text-[22px] leading-8" : "h-9 text-2xl leading-9",
    tone === "on-dark" ? "text-white" : "text-brand",
    className,
  );

  if (href === null) {
    return <span className={classes}>Tường Vi Mart</span>;
  }
  return (
    <Link
      href={href}
      className={cn(
        classes,
        "rounded-badge",
        tone === "on-dark" ? "focus-ring-on-dark" : "focus-ring",
      )}
    >
      Tường Vi Mart
    </Link>
  );
}
