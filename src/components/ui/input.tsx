import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { CONTROL_BASE, Field, controlBorder, describedBy } from "@/components/ui/field";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Nhãn hiển thị phía trên. Luôn bắt buộc (a11y); dùng `hideLabel` nếu thiết kế không có nhãn. */
  label: ReactNode;
  hideLabel?: boolean;
  hint?: ReactNode;
  /** Thông báo lỗi (tiếng Việt). Có lỗi thì viền đỏ, `aria-invalid`, đọc ra bằng `role="alert"`. */
  error?: string | undefined;
  /** Đang kiểm tra (ví dụ kiểm tra SĐT trên server): hiện spinner, `aria-busy`. */
  loading?: boolean;
  /** Phần tử đặt bên trái/phải trong ô (icon, nút hiện/ẩn mật khẩu...). */
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  wrapperClassName?: string;
}

export function Input({
  label,
  hideLabel,
  hint,
  error,
  loading = false,
  startAdornment,
  endAdornment,
  required,
  disabled,
  id,
  className,
  wrapperClassName,
  type = "text",
  ...rest
}: InputProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;

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
        {startAdornment && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
            {startAdornment}
          </span>
        )}
        <input
          id={baseId}
          type={type}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-busy={loading || undefined}
          aria-describedby={describedBy(baseId, { hint, ...(error ? { error } : {}) })}
          className={cn(
            CONTROL_BASE,
            controlBorder(Boolean(error)),
            "h-11 md:h-10",
            Boolean(startAdornment) && "pl-10",
            (Boolean(endAdornment) || loading) && "pr-10",
            className,
          )}
          {...rest}
        />
        {(loading || Boolean(endAdornment)) && (
          <span className="absolute inset-y-0 right-3 flex items-center text-muted">
            {loading ? <Icon name="spinner" className="animate-spin" /> : endAdornment}
          </span>
        )}
      </div>
    </Field>
  );
}
