type ClassValue = string | false | null | undefined;

/** Nối các class, bỏ giá trị rỗng/false: `cn("a", cond && "b")`. Không gộp class xung đột. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
