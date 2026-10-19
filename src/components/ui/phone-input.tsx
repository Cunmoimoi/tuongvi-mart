"use client";

import { useId, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { CONTROL_BASE, Field, controlBorder, describedBy } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/** Số chữ số tối đa giữ lại (cho phép dán `+84901234567`); chuẩn hóa/kiểm tra SĐT làm ở server. */
export const PHONE_MAX_DIGITS = 12;

/**
 * Chỉ giữ chữ số (bỏ khoảng trắng, dấu chấm, dấu gạch, `+`...) và cắt ở `PHONE_MAX_DIGITS`.
 * Đây chỉ là làm sạch lúc gõ; đầu số di động Việt Nam hợp lệ do Zod phía server quyết định.
 */
export function sanitizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, PHONE_MAX_DIGITS);
}

export interface PhoneInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "size" | "inputMode"
> {
  label: ReactNode;
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string | undefined;
  /** Chuỗi chữ số đã làm sạch. */
  value: string;
  onValueChange: (digits: string) => void;
  wrapperClassName?: string;
}

/** Ô SĐT: tiền tố `+84` cố định, bàn phím số (`inputMode="tel"`), chữ ≥ 16px (UI_SPEC 4.9). */
export function PhoneInput({
  label,
  hideLabel,
  hint,
  error,
  value,
  onValueChange,
  required,
  disabled,
  id,
  className,
  wrapperClassName,
  ...rest
}: PhoneInputProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange(sanitizePhoneDigits(event.target.value));
  }

  return (
    <Field
      baseId={baseId}
      label={label}
      hideLabel={hideLabel}
      required={required}
      hint={hint}
      error={error}
      className={wrapperClassName}
    >
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-border pr-3 pl-3 text-base font-medium text-text-2"
        >
          +84
        </span>
        <input
          id={baseId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(baseId, { hint, ...(error ? { error } : {}) })}
          className={cn(
            CONTROL_BASE,
            controlBorder(Boolean(error)),
            "h-11 pl-16 md:h-10",
            className,
          )}
          {...rest}
        />
      </div>
    </Field>
  );
}
