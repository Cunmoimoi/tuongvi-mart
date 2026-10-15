"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const BASE =
  "inline-flex h-8 shrink-0 items-center rounded-pill px-4 text-sm font-medium " +
  "whitespace-nowrap transition-colors";

export interface ChipProps {
  children: ReactNode;
  /** Đang chọn (chip sắp xếp/lọc). Chỉ có nghĩa khi chip bấm được. */
  selected?: boolean;
  /** Có `onClick` thì chip là nút bật/tắt (`aria-pressed`); không có thì chỉ là nhãn. */
  onClick?: () => void;
  /** Có `onRemove` thì hiện nút xóa (ví dụ "Tìm kiếm gần đây"). */
  onRemove?: () => void;
  /** Tên cho nút xóa, bắt buộc khi có `onRemove`. Ví dụ: `Xóa "mì gói"`. */
  removeLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function Chip({
  children,
  selected = false,
  onClick,
  onRemove,
  removeLabel,
  disabled = false,
  className,
}: ChipProps) {
  const interactive = Boolean(onClick) && !disabled;
  const tone = selected ? "bg-primary-soft text-primary" : "bg-page-bg text-muted";
  const hover = interactive && (selected ? "hover:bg-primary-soft-hover" : "hover:bg-border");

  // Toàn bộ chip là vùng bấm: nút chính kéo giãn ra mép chip bằng margin âm. Nút xóa là nút riêng,
  // đứng cạnh (không lồng nút trong nút).
  const content = onClick ? (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring hit-area -ml-4 inline-flex h-8 cursor-pointer items-center rounded-pill pl-4",
        onRemove ? "pr-1" : "-mr-4 pr-4",
        "disabled:cursor-not-allowed",
      )}
    >
      {children}
    </button>
  ) : (
    children
  );

  return (
    <span
      className={cn(BASE, tone, hover, disabled && "opacity-50", onRemove && "pr-2", className)}
    >
      {content}
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel ?? "Xóa"}
          disabled={disabled}
          onClick={onRemove}
          className="focus-ring hit-area inline-flex size-6 cursor-pointer items-center justify-center rounded-pill hover:bg-black/10 disabled:cursor-not-allowed"
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </span>
  );
}
