"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: readonly AccordionItem[];
  /** `single`: mở một mục thì đóng mục khác. `multiple`: mở độc lập. */
  type?: "single" | "multiple";
  defaultOpenIds?: readonly string[];
  /** Bậc tiêu đề phù hợp ngữ cảnh trang. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/** Danh sách thu gọn/mở rộng (FAQ, thông tin sản phẩm trên mobile). Nút + vùng nội dung có `aria-controls`. */
export function Accordion({
  items,
  type = "single",
  defaultOpenIds = [],
  headingLevel = 3,
  className,
}: AccordionProps) {
  const baseId = useId();
  const [openIds, setOpenIds] = useState<readonly string[]>(defaultOpenIds);
  const Heading = `h${headingLevel}` as const;

  function toggle(id: string) {
    setOpenIds((current) => {
      if (current.includes(id)) {
        return current.filter((openId) => openId !== id);
      }
      return type === "single" ? [id] : [...current, id];
    });
  }

  return (
    <div
      className={cn(
        "divide-y divide-border rounded-card border border-border bg-surface",
        className,
      )}
    >
      {items.map((item) => {
        const open = openIds.includes(item.id);
        const buttonId = `${baseId}-button-${item.id}`;
        const regionId = `${baseId}-region-${item.id}`;
        return (
          <div key={item.id}>
            <Heading>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={regionId}
                disabled={item.disabled}
                onClick={() => toggle(item.id)}
                className="focus-ring flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-base font-semibold text-text hover:bg-page-bg disabled:cursor-not-allowed disabled:text-faint"
              >
                <span>{item.title}</span>
                <Icon
                  name="chevron-down"
                  className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")}
                />
              </button>
            </Heading>
            {/* Vùng nội dung: thu về 0 bằng grid-rows; `inert` khi đóng để không focus/đọc được. */}
            <div
              id={regionId}
              role="region"
              aria-labelledby={buttonId}
              inert={!open}
              className={cn(
                "grid transition-[grid-template-rows] duration-200",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="px-4 pt-1 pb-4 text-[15px] leading-6 text-text-2">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
