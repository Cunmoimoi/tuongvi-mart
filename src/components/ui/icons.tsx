import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Info,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Bộ icon dùng chung (`lucide-react`, UI_SPEC 2.3): nét 1,75, `currentColor`. Mọi component chỉ
 * dùng icon qua `<Icon name="..." />` ở file này, không import `lucide-react` trực tiếp ở nơi khác:
 * muốn thêm icon thì thêm vào bảng `ICONS`, nên bộ icon dùng trong dự án luôn nằm ở một chỗ.
 */
const ICONS = {
  x: X,
  check: Check,
  minus: Minus,
  plus: Plus,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  spinner: LoaderCircle,
  "alert-circle": CircleAlert,
  "check-circle": CircleCheck,
  info: Info,
  trash: Trash2,
  cart: ShoppingCart,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps extends Omit<LucideProps, "ref" | "children" | "size" | "strokeWidth"> {
  name: IconName;
  /** Cạnh (px). 20 trong nút, 22 ở menu (UI_SPEC 2.3). */
  size?: number;
}

/** Icon trang trí: luôn `aria-hidden`. Nút chỉ có icon phải tự có `aria-label`. */
export function Icon({ name, size = 20, ...rest }: IconProps) {
  const Component = ICONS[name];
  return (
    <Component size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" {...rest} />
  );
}
