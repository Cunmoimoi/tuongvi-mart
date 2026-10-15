import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/cn";

export interface BreadcrumbItem {
  label: string;
  /** Thiếu `href` ⇒ mục hiện tại (không phải link). */
  href?: string;
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  className?: string;
}

/** Đường dẫn phân cấp (UI_SPEC 4.2): link màu `primary`, trang hiện tại màu `muted`, phân cách " / ". */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Đường dẫn" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className={cn("min-w-0", isLast && "text-muted")}>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="focus-ring rounded-badge text-primary hover:underline"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="text-faint">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
