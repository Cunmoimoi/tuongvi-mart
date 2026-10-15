import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Id gắn nhãn, gợi ý và lỗi vào ô nhập qua `aria-describedby`. */
export function fieldIds(baseId: string) {
  return { input: baseId, hint: `${baseId}-hint`, error: `${baseId}-error` };
}

/** Giá trị `aria-describedby` cho ô nhập: lỗi và gợi ý nếu có. */
export function describedBy(baseId: string, { hint, error }: { hint?: ReactNode; error?: string }) {
  const ids = fieldIds(baseId);
  const parts = [error ? ids.error : null, hint ? ids.hint : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

interface FieldProps {
  baseId: string;
  label: ReactNode;
  required?: boolean | undefined;
  hint?: ReactNode;
  error?: string | undefined;
  /** Ẩn nhãn nhưng vẫn giữ cho trình đọc màn hình (ô tìm kiếm...). */
  hideLabel?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/** Khung chung: nhãn (luôn có), ô nhập, gợi ý, lỗi. Mọi ô nhập đều qua đây. */
export function Field({
  baseId,
  label,
  required,
  hint,
  error,
  hideLabel,
  className,
  children,
}: FieldProps) {
  const ids = fieldIds(baseId);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={ids.input}
        className={cn("text-sm font-medium text-text-2", hideLabel && "sr-only")}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={ids.hint} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={ids.error} role="alert" className="text-[13px] leading-5 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Class chung của ô nhập một dòng/nhiều dòng: cao 44 (mobile) / 40 (desktop), chữ ≥ 16px. */
export const CONTROL_BASE =
  "w-full rounded-card border bg-surface px-3 text-base text-text placeholder:text-faint " +
  "transition-colors outline-hidden focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus " +
  "disabled:cursor-not-allowed disabled:bg-page-bg disabled:text-faint";

export function controlBorder(error: boolean): string {
  return error
    ? "border-danger focus-visible:border-danger focus-visible:ring-danger"
    : "border-border hover:border-faint";
}
