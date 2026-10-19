"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type IconButtonVariant = "ghost" | "soft" | "outline" | "dark";
export type IconButtonSize = "sm" | "md" | "lg";

const BASE =
  "focus-ring hit-area relative inline-flex shrink-0 items-center justify-center rounded-pill " +
  "transition-colors";

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost:
    "text-text-2 hover:bg-page-bg active:bg-border disabled:text-faint aria-disabled:text-faint",
  soft:
    "bg-primary-soft text-primary hover:bg-primary-soft-hover active:bg-primary-soft-hover " +
    "disabled:bg-border disabled:text-faint aria-disabled:bg-border aria-disabled:text-faint",
  outline:
    "border border-border bg-surface text-text-2 hover:bg-page-bg active:bg-border " +
    "disabled:text-faint aria-disabled:text-faint",
  // Nút tròn mũi tên của banner/carousel (UI_SPEC 4.1): nền tối mờ, chữ trắng.
  dark:
    "bg-[rgb(17_24_39_/_0.6)] text-white hover:bg-[rgb(17_24_39_/_0.8)] " +
    "disabled:opacity-40 aria-disabled:opacity-40",
};

const SIZES: Record<IconButtonSize, string> = {
  sm: "size-8",
  md: "size-11 md:size-10", // 44 mobile, 40 desktop (UI_SPEC 2.3)
  lg: "size-11",
};

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** BẮT BUỘC: nút chỉ có icon phải có tên cho trình đọc màn hình (đồng thời là tooltip). */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
}

/** Nút chỉ có icon. Truyền `<Icon name="..." />` vào `icon`. */
export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className,
  onClick,
  ...rest
}: IconButtonProps) {
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
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      className={cn(
        BASE,
        VARIANTS[variant],
        SIZES[size],
        disabled || loading ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
      onClick={handleClick}
      {...rest}
    >
      {loading ? <Icon name="spinner" className="animate-spin" /> : icon}
    </button>
  );
}
