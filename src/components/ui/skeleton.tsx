import { cn } from "@/lib/cn";

export type SkeletonShape = "rect" | "text" | "circle";

export interface SkeletonProps {
  shape?: SkeletonShape;
  /** Kích thước bằng class Tailwind (`h-10 w-full`, `size-16`...), cùng kích thước nội dung thật để không giật bố cục. */
  className?: string;
}

const SHAPES: Record<SkeletonShape, string> = {
  rect: "rounded-card",
  text: "h-4 rounded-badge",
  circle: "rounded-pill",
};

/**
 * Khối giữ chỗ khi đang tải. Chỉ để trang trí (`aria-hidden`): phần tử bao ngoài nên đặt
 * `aria-busy="true"` và/hoặc có một dòng `sr-only` "Đang tải".
 */
export function Skeleton({ shape = "rect", className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-pulse bg-border", SHAPES[shape], className)}
    />
  );
}
