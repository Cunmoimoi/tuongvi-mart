import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  /** Nhãn bên phải ô (bấm vào nhãn cũng đánh dấu). */
  label: ReactNode;
  error?: string | undefined;
  hint?: ReactNode;
  wrapperClassName?: string;
}

/** Ô đánh dấu dùng `<input type="checkbox">` gốc; màu theo `accent-color` nên giữ nguyên bàn phím và a11y. */
export function Checkbox({
  label,
  error,
  hint,
  disabled,
  id,
  className,
  wrapperClassName,
  ...rest
}: CheckboxProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      <div className="flex items-start gap-3">
        <input
          id={baseId}
          type="checkbox"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "focus-ring mt-0.5 size-5 shrink-0 cursor-pointer rounded-badge accent-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "outline outline-2 outline-danger",
            className,
          )}
          {...rest}
        />
        <label
          htmlFor={baseId}
          className={cn(
            "cursor-pointer text-base leading-6 text-text-2 select-none",
            disabled && "cursor-not-allowed text-faint",
          )}
        >
          {label}
        </label>
      </div>
      {hint && !error && (
        <p id={hintId} className="pl-8 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="pl-8 text-[13px] leading-5 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
