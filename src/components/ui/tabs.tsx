"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { getNextTabIndex } from "@/lib/tabs";

export interface TabItem {
  id: string;
  label: ReactNode;
  /** Nội dung tab. Bỏ trống nếu tab chỉ dùng để điều hướng/lọc (tự hiển thị nội dung bên ngoài). */
  panel?: ReactNode;
  disabled?: boolean;
}

export type TabsVariant = "underline" | "block";

export interface TabsProps {
  items: readonly TabItem[];
  /** Tên của cụm tab cho trình đọc màn hình, ví dụ "Trạng thái đơn hàng". */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /**
   * `underline`: gạch chân (tab trạng thái đơn hàng, UI_SPEC 4.10).
   * `block`: ô lớn nền xám/cam nhạt (tab bộ sưu tập trang chủ, UI_SPEC 4.1).
   */
  variant?: TabsVariant;
  className?: string;
}

const LIST: Record<TabsVariant, string> = {
  underline: "gap-6 border-b border-border md:gap-10",
  block: "gap-1",
};

const TAB: Record<TabsVariant, string> = {
  underline:
    "relative pb-3 text-base font-medium text-muted hover:text-text " +
    "aria-selected:text-primary aria-selected:after:absolute aria-selected:after:inset-x-0 " +
    "aria-selected:after:-bottom-px aria-selected:after:h-0.5 aria-selected:after:bg-primary",
  block:
    "h-16 min-w-30 flex-1 rounded-card bg-page-bg px-3 text-center text-[15px] leading-5 font-medium " +
    "text-muted hover:bg-border aria-selected:bg-sale-soft aria-selected:font-semibold aria-selected:text-sale",
};

export function Tabs({
  items,
  label,
  value,
  defaultValue,
  onValueChange,
  variant = "underline",
  className,
}: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const firstEnabled = items.find((item) => !item.disabled)?.id;
  const [innerValue, setInnerValue] = useState(defaultValue ?? firstEnabled);
  const selectedId = value ?? innerValue;
  const disabledFlags = items.map((item) => Boolean(item.disabled));

  function select(id: string) {
    if (value === undefined) {
      setInnerValue(id);
    }
    onValueChange?.(id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = getNextTabIndex(index, event.key, disabledFlags);
    if (next === null) {
      return;
    }
    const target = items[next];
    if (target) {
      event.preventDefault();
      tabRefs.current[next]?.focus();
      select(target.id);
    }
  }

  const activeItem = items.find((item) => item.id === selectedId);

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className={cn("flex overflow-x-auto [scrollbar-width:none]", LIST[variant])}
      >
        {items.map((item, index) => {
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={item.panel !== undefined ? `${baseId}-panel-${item.id}` : undefined}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "focus-ring shrink-0 cursor-pointer whitespace-nowrap transition-colors",
                "disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-page-bg",
                TAB[variant],
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem?.panel !== undefined && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.id}`}
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          tabIndex={0}
          className="focus-ring mt-4 rounded-card"
        >
          {activeItem.panel}
        </div>
      )}
    </div>
  );
}
