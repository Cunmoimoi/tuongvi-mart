"use client";

import { useId } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { canDecrement, canIncrement, clampQuantity, stepQuantity } from "@/lib/quantity";

export type QuantityStepperVariant = "card" | "cart";

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Nhỏ nhất (mặc định 1). Thẻ sản phẩm dùng 0: về 0 thì quay lại nút "Mua". */
  min?: number;
  /** Lớn nhất, thường là tồn khả dụng. Server vẫn kiểm tra lại. */
  max?: number | undefined;
  /**
   * `card`: thanh tăng giảm cùng kích thước nút "Mua" trên thẻ (cao 40, nút tròn 32 nền trắng).
   * `cart`: nút tròn 40 nền `primary-soft`, số rộng 40 (giỏ hàng, UI_SPEC 4.6).
   */
  variant?: QuantityStepperVariant;
  /** Tên sản phẩm, để trình đọc màn hình đọc "Tăng số lượng Cà chua bi". */
  label: string;
  disabled?: boolean;
  /** Đang gửi thay đổi lên server: khóa nút, hiện spinner. */
  loading?: boolean;
  /** Lỗi của dòng này, ví dụ "Chỉ còn 2 sản phẩm". */
  error?: string | undefined;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  variant = "cart",
  label,
  disabled = false,
  loading = false,
  error,
  className,
}: QuantityStepperProps) {
  const errorId = useId();
  const limits = { min, max };
  const current = clampQuantity(value, limits);
  const locked = disabled || loading;
  const decrementOff = locked || !canDecrement(current, limits);
  const incrementOff = locked || !canIncrement(current, limits);

  const buttonClass = cn(
    "focus-ring hit-area inline-flex shrink-0 items-center justify-center rounded-pill transition-colors",
    "cursor-pointer disabled:cursor-not-allowed disabled:text-faint",
    variant === "card"
      ? "size-8 bg-surface text-primary hover:bg-primary-softer"
      : "size-10 bg-primary-soft text-primary hover:bg-primary-soft-hover disabled:bg-border",
  );

  return (
    <div className={cn(variant === "card" && "w-full", className)}>
      <div
        role="group"
        aria-label={`Số lượng ${label}`}
        aria-describedby={error ? errorId : undefined}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center",
          variant === "card"
            ? "h-10 w-full justify-between rounded-pill bg-primary-soft px-1"
            : "gap-0",
          error && "rounded-pill outline outline-2 outline-danger",
          locked && "opacity-70",
        )}
      >
        <button
          type="button"
          aria-label={`Giảm số lượng ${label}`}
          disabled={decrementOff}
          onClick={() => onChange(stepQuantity(current, "decrement", limits))}
          className={buttonClass}
        >
          <Icon name="minus" size={variant === "card" ? 16 : 20} />
        </button>
        <span
          aria-live="polite"
          className={cn(
            "inline-flex items-center justify-center text-center tabular-nums",
            variant === "card" ? "min-w-8 text-[15px] font-bold" : "w-10 text-base font-semibold",
          )}
        >
          {loading ? <Icon name="spinner" size={16} className="animate-spin" /> : current}
        </span>
        <button
          type="button"
          aria-label={`Tăng số lượng ${label}`}
          disabled={incrementOff}
          onClick={() => onChange(stepQuantity(current, "increment", limits))}
          className={buttonClass}
        >
          <Icon name="plus" size={variant === "card" ? 16 : 20} />
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[15px] leading-5 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
