"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "soft" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "focus-ring inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-pill " +
  "text-button font-semibold whitespace-nowrap transition-colors";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover active:bg-primary-hover " +
    "disabled:bg-border disabled:text-faint aria-disabled:bg-border aria-disabled:text-faint",
  soft:
    "bg-primary-soft text-primary hover:bg-primary-soft-hover active:bg-primary-soft-hover " +
    "disabled:bg-border disabled:text-faint aria-disabled:bg-border aria-disabled:text-faint",
  outline:
    "border border-primary bg-surface text-primary hover:bg-primary-softer active:bg-primary-softer " +
    "disabled:border-border disabled:text-faint aria-disabled:border-border aria-disabled:text-faint",
  ghost:
    "bg-transparent text-primary hover:bg-primary-softer active:bg-primary-softer " +
    "disabled:text-faint aria-disabled:text-faint",
  danger:
    "bg-danger text-white hover:bg-danger-hover active:bg-danger-hover " +
    "disabled:bg-border disabled:text-faint aria-disabled:bg-border aria-disabled:text-faint",
};

// Vùng bấm tối thiểu 44 (mobile) / 40 (desktop) (UI_SPEC 2.3); `sm` thấp hơn về hình thức nhưng
// vẫn được mở rộng vùng bấm bằng `hit-area`.
const SIZES: Record<ButtonSize, string> = {
  sm: "hit-area h-8 px-3 text-sm",
  md: "min-h-11 px-5 md:min-h-10",
  lg: "min-h-12 px-6 text-[17px] md:min-h-11",
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Thêm cursor/hiệu ứng cho trạng thái bị khóa hoặc đang tải. */
  inactive?: boolean;
  className?: string | undefined;
}

/** Class của nút, để dùng cho `<Link>` trông như nút mà không phải bọc `<button>` trong `<a>`. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  inactive = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    inactive ? "cursor-not-allowed" : "cursor-pointer",
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Đang xử lý: hiện spinner, khóa bấm nhưng GIỮ focus (không dùng `disabled`). */
  loading?: boolean;
  /** Chữ đọc cho trình đọc màn hình khi đang tải. */
  loadingLabel?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Đang xử lý",
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  type = "button",
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const inactive = Boolean(disabled) || loading;

  // Đang tải dùng aria-disabled thay vì `disabled` để nút không mất focus giữa chừng; chặn bấm
  // (kể cả Enter trong form, vì Enter kích hoạt `click` của nút submit) bằng cách hủy sự kiện.
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, inactive, className })}
      onClick={handleClick}
      {...rest}
    >
      {loading ? <Icon name="spinner" size={20} className="animate-spin" /> : leftIcon}
      {children}
      {loading && <span className="sr-only">{loadingLabel}</span>}
      {!loading && rightIcon}
    </button>
  );
}
