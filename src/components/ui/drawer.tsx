"use client";

import type { ReactNode } from "react";
import { ModalShell } from "@/components/ui/dialog-base";

export type DrawerSide = "right" | "left";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** `right`: ngăn giỏ hàng (rộng 420, UI_SPEC 4.6). `left`: ngăn danh mục ở desktop gọn. */
  side?: DrawerSide;
  dismissible?: boolean;
  closeLabel?: string;
}

const SIDES: Record<DrawerSide, string> = {
  right: "right-0 left-auto animate-[drawer-slide-from-right_200ms_var(--ease-standard)]",
  left: "left-0 right-auto animate-[drawer-slide-from-left_200ms_var(--ease-standard)]",
};

/** Ngăn trượt từ mép màn hình, cao hết màn hình, rộng tối đa 420 (toàn màn hình ở điện thoại nhỏ). */
export function Drawer({ side = "right", ...props }: DrawerProps) {
  const dialogClassName = `fixed inset-y-0 h-dvh max-h-none w-full max-w-[420px] ${SIDES[side]}`;
  return <ModalShell {...props} dialogClassName={dialogClassName} />;
}
