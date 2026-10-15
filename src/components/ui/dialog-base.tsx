"use client";

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Icon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

/**
 * Nền chung của ResponsiveDialog và Drawer, dựng trên phần tử `<dialog>` gốc + `showModal()`:
 * trình duyệt lo sẵn khóa focus trong hộp thoại, phần còn lại của trang bị vô hiệu (inert),
 * phím Esc, lớp `::backdrop` và trả focus về nút đã mở hộp thoại. Không cần thư viện ngoài.
 */

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  footer?: ReactNode;
  /** Bấm nền mờ hoặc Esc thì đóng. Đặt `false` cho hộp thoại bắt buộc phải chọn. */
  dismissible?: boolean;
  closeLabel?: string;
  /** Class của chính phần tử `<dialog>`: vị trí, kích thước, hoạt ảnh. */
  dialogClassName: string;
  /** Hiện thanh kéo nhỏ ở đầu (bottom sheet trên mobile). */
  sheetHandle?: boolean;
}

export function ModalShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  closeLabel = "Đóng",
  dialogClassName,
  sheetHandle = false,
}: ModalShellProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  // Đồng bộ prop `open` với trạng thái của <dialog>.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Esc: trình duyệt phát `cancel` rồi tự đóng. Hủy hành vi mặc định để prop `open` là nguồn sự
  // thật duy nhất (cha quyết định có đóng hay không).
  function handleCancel(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (dismissible) {
      onClose();
    }
  }

  // Chỉ đóng khi cả lúc nhấn lẫn lúc thả đều ở nền mờ: kéo chọn chữ từ trong hộp thoại ra ngoài
  // không được làm đóng hộp thoại.
  function handlePointerDown(event: PointerEvent<HTMLDialogElement>) {
    pressStartedOnBackdrop.current = event.target === event.currentTarget;
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const startedOnBackdrop = pressStartedOnBackdrop.current;
    pressStartedOnBackdrop.current = false;
    if (dismissible && startedOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClose={() => {
        // Đóng bằng đường khác (ví dụ form method="dialog"): báo cho cha để đồng bộ.
        if (open) {
          onClose();
        }
      }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={cn(
        "m-0 border-0 bg-surface p-0 text-text backdrop:bg-overlay",
        "open:flex open:flex-col",
        dialogClassName,
      )}
    >
      {open && (
        <>
          {sheetHandle && (
            <div aria-hidden="true" className="flex shrink-0 justify-center pt-2 md:hidden">
              <span className="h-1 w-10 rounded-pill bg-border" />
            </div>
          )}
          <header className="flex shrink-0 items-start gap-3 px-5 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-block-title text-text">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            {dismissible && (
              <IconButton
                label={closeLabel}
                icon={<Icon name="x" />}
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="-mt-1 -mr-2"
              />
            )}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer && (
            <footer className="shrink-0 border-t border-border bg-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          )}
        </>
      )}
    </dialog>
  );
}
