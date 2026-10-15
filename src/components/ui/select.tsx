import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { CONTROL_BASE, Field, controlBorder, describedBy } from "@/components/ui/field";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label: ReactNode;
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string | undefined;
  /** Dòng đầu không chọn được ("Chọn tỉnh/thành"). Có thì ô hiện chữ mờ khi chưa chọn. */
  placeholder?: string;
  /** Đang nạp danh sách lựa chọn: hiện spinner thay mũi tên. */
  loading?: boolean;
  wrapperClassName?: string;
  /** Các `<option>`. */
  children: ReactNode;
}

/** Ô chọn dùng `<select>` gốc (bàn phím, trình đọc màn hình và bộ chọn của điện thoại hoạt động sẵn). */
export function Select({
  label,
  hideLabel,
  hint,
  error,
  placeholder,
  loading = false,
  required,
  disabled,
  id,
  className,
  wrapperClassName,
  children,
  ...rest
}: SelectProps) {
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
        <select
          id={baseId}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-busy={loading || undefined}
          aria-describedby={describedBy(baseId, { hint, ...(error ? { error } : {}) })}
          className={cn(
            CONTROL_BASE,
            controlBorder(Boolean(error)),
            "h-11 cursor-pointer appearance-none pr-10 md:h-10",
            "invalid:text-faint",
            className,
          )}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
          {loading ? (
            <Icon name="spinner" className="animate-spin" />
          ) : (
            <Icon name="chevron-down" />
          )}
        </span>
      </div>
    </Field>
  );
}
