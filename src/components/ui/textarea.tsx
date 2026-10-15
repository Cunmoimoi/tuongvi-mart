import { useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { CONTROL_BASE, Field, controlBorder, describedBy } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string | undefined;
  /** Số ký tự hiện tại, để hiện bộ đếm `n/maxLength` (cần truyền cả `maxLength`). */
  currentLength?: number;
  wrapperClassName?: string;
}

export function Textarea({
  label,
  hideLabel,
  hint,
  error,
  currentLength,
  maxLength,
  required,
  disabled,
  id,
  rows = 3,
  className,
  wrapperClassName,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const showCounter = currentLength !== undefined && maxLength !== undefined;

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
      <textarea
        id={baseId}
        rows={rows}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(baseId, { hint, ...(error ? { error } : {}) })}
        className={cn(
          CONTROL_BASE,
          controlBorder(Boolean(error)),
          "min-h-20 resize-y py-2",
          className,
        )}
        {...rest}
      />
      {showCounter && (
        <p aria-hidden="true" className="-mt-1 text-right text-xs text-muted tabular-nums">
          {currentLength}/{maxLength}
        </p>
      )}
    </Field>
  );
}
