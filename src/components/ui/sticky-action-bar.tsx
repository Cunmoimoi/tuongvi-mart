import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface StickyActionBarProps {
  children: ReactNode;
  /** Nhãn vùng cho trình đọc màn hình, ví dụ "Thao tác mua hàng". */
  label: string;
  /** Hiện cả ở desktop (mặc định chỉ mobile < md, UI_SPEC 3.7, 4.5, 4.6). */
  showOnDesktop?: boolean;
  /** Đặt bên trong khung cha `relative` thay vì dính đáy màn hình (dùng cho trang /dev/ui). */
  contained?: boolean;
  className?: string;
}

/**
 * Thanh hành động dính đáy màn hình (tổng tiền + nút, bộ tăng giảm + "Thêm vào giỏ"...), có chừa
 * vùng an toàn của iPhone. Kèm một khối đệm cùng chiều cao để nội dung cuối trang không bị che.
 */
export function StickyActionBar({
  children,
  label,
  showOnDesktop = false,
  contained = false,
  className,
}: StickyActionBarProps) {
  const visibility = showOnDesktop ? "" : "md:hidden";
  return (
    <>
      {!contained && (
        <div
          aria-hidden="true"
          className={cn("h-[calc(4rem+env(safe-area-inset-bottom))]", visibility)}
        />
      )}
      <div
        role="region"
        aria-label={label}
        className={cn(
          contained ? "absolute" : "fixed",
          "inset-x-0 bottom-0 z-30 flex min-h-16 items-center gap-3 border-t border-border bg-surface px-3 pt-2",
          "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
          visibility,
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
