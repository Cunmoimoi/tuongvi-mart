import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** Minh họa hoặc icon (trang trí). Mặc định để trống. */
  illustration?: ReactNode;
  /** Nút hành động, ví dụ `<Button>Tiếp tục mua sắm</Button>`. */
  action?: ReactNode;
  /** Bậc tiêu đề phù hợp ngữ cảnh trang (mặc định `h2`). */
  headingAs?: Extract<ElementType, "h2" | "h3" | "h4">;
  className?: string;
}

/** Trạng thái trống: giỏ hàng trống, không có kết quả tìm kiếm, chưa có đơn hàng... */
export function EmptyState({
  title,
  description,
  illustration,
  action,
  headingAs: Heading = "h2",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      {illustration && (
        <div
          aria-hidden="true"
          className="mb-4 flex size-20 items-center justify-center rounded-pill bg-primary-softer text-primary"
        >
          {illustration}
        </div>
      )}
      <Heading className="text-block-title text-text">{title}</Heading>
      {description && <p className="mt-2 max-w-sm text-[15px] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
