"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  /** Tên nhóm cho trình đọc màn hình, ví dụ "Hình thức nhận hàng". */
  label: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Nhóm lựa chọn một trong vài ("Giao tận nơi | Nhận tại cửa hàng"). Dùng `<input type="radio">`
 * gốc ẩn bằng `sr-only` nên bàn phím (mũi tên, Tab) và trình đọc màn hình hoạt động sẵn.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  disabled = false,
  fullWidth = false,
  className,
}: SegmentedControlProps) {
  const name = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex rounded-pill bg-page-bg p-1",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((option) => {
        const inputId = `${name}-${option.value}`;
        const optionDisabled = disabled || option.disabled;
        return (
          <div key={option.value} className={cn("relative", fullWidth && "flex-1")}>
            <input
              id={inputId}
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              disabled={optionDisabled}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <label
              htmlFor={inputId}
              className={cn(
                "flex min-h-10 cursor-pointer items-center justify-center rounded-pill px-4 text-center text-[15px] font-semibold",
                "text-muted transition-colors select-none hover:text-text",
                "peer-checked:bg-surface peer-checked:text-primary peer-checked:shadow-account",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
                "peer-disabled:cursor-not-allowed peer-disabled:text-faint peer-disabled:hover:text-faint",
              )}
            >
              {option.label}
            </label>
          </div>
        );
      })}
    </div>
  );
}
