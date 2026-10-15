"use client";

import type { ReactNode } from "react";
import { ModalShell } from "@/components/ui/dialog-base";

export type ResponsiveDialogSize = "sm" | "md";
export type ResponsiveDialogPlacement = "center" | "right";

export interface ResponsiveDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** `sm`: 380px, `md`: 520px (chỉ áp dụng từ desktop; mobile luôn rộng toàn màn hình). */
  size?: ResponsiveDialogSize;
  /** Desktop: hộp thoại giữa màn hình (`center`) hay ngăn bên phải (`right`, panel lọc). */
  placement?: ResponsiveDialogPlacement;
  dismissible?: boolean;
  closeLabel?: string;
}

// Mobile (< md): bottom sheet bám đáy, bo góc trên. Desktop (≥ md): modal giữa hoặc ngăn bên phải.
const MOBILE_SHEET =
  "fixed inset-x-0 top-auto bottom-0 max-h-[85dvh] w-full max-w-none rounded-t-banner " +
  "animate-[sheet-slide-up_200ms_var(--ease-standard)]";

const DESKTOP_CENTER =
  "md:inset-0 md:m-auto md:h-fit md:max-h-[85vh] md:max-w-[calc(100vw-2rem)] md:rounded-card " +
  "md:animate-[dialog-fade-in_150ms_ease-out]";

const DESKTOP_RIGHT =
  "md:inset-y-0 md:right-0 md:left-auto md:bottom-0 md:top-0 md:h-dvh md:max-h-none md:rounded-none " +
  "md:rounded-l-banner md:animate-[drawer-slide-from-right_200ms_var(--ease-standard)]";

const WIDTHS: Record<ResponsiveDialogSize, string> = {
  sm: "md:w-[380px]",
  md: "md:w-[520px]",
};

/** Modal ở desktop, bottom sheet ở mobile (UI_SPEC mục 4.1.1, 4.2). */
export function ResponsiveDialog({
  size = "md",
  placement = "center",
  ...props
}: ResponsiveDialogProps) {
  const dialogClassName = [
    MOBILE_SHEET,
    placement === "right" ? DESKTOP_RIGHT : DESKTOP_CENTER,
    WIDTHS[size],
  ].join(" ");

  return <ModalShell {...props} dialogClassName={dialogClassName} sheetHandle />;
}
