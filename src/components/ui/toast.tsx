"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** Mili giây tới khi tự đóng. 0 = không tự đóng. Mặc định 4000 (lỗi: 6000). */
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}

export interface ToastItemData extends ToastInput {
  id: string;
  tone: ToastTone;
}

/** Số thông báo hiện cùng lúc tối đa; cái cũ nhất bị đẩy ra khi vượt. */
export const MAX_VISIBLE_TOASTS = 3;

type ToastAction = { type: "add"; toast: ToastItemData } | { type: "dismiss"; id: string };

/** Reducer thuần của danh sách thông báo (có test). */
export function toastReducer(
  state: readonly ToastItemData[],
  action: ToastAction,
): ToastItemData[] {
  if (action.type === "dismiss") {
    return state.filter((toast) => toast.id !== action.id);
  }
  return [...state, action.toast].slice(-MAX_VISIBLE_TOASTS);
}

export function defaultToastDuration(tone: ToastTone): number {
  return tone === "error" ? 6000 : 4000;
}

interface ToastApi {
  show: (input: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast phải được dùng bên trong <ToastProvider>");
  }
  return api;
}

const TONE_STYLES: Record<ToastTone, { icon: IconName; iconClass: string }> = {
  success: { icon: "check-circle", iconClass: "text-success" },
  error: { icon: "alert-circle", iconClass: "text-danger" },
  info: { icon: "info", iconClass: "text-primary" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const counter = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback((id: string) => dispatch({ type: "dismiss", id }), []);

  const show = useCallback((input: ToastInput) => {
    counter.current += 1;
    const id = `toast-${counter.current}`;
    dispatch({ type: "add", toast: { ...input, id, tone: input.tone ?? "info" } });
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  // Vùng thông báo là popover ở "top layer": hiện trên cả hộp thoại <dialog> đang mở. Gọi lại
  // hide/show mỗi khi có thông báo mới để nó luôn nằm trên cùng.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof viewport.showPopover !== "function") {
      return;
    }
    if (viewport.matches(":popover-open")) {
      viewport.hidePopover();
    }
    if (toasts.length > 0) {
      viewport.showPopover();
    }
  }, [toasts]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        ref={viewportRef}
        popover="manual"
        className="fixed inset-auto bottom-20 left-1/2 m-0 w-[min(calc(100vw-2rem),420px)] -translate-x-1/2 overflow-visible border-0 bg-transparent p-0 md:bottom-6"
      >
        <ol className="flex flex-col gap-2">
          {toasts.map((toast) => (
            <li key={toast.id}>
              <ToastCard toast={toast} onDismiss={dismiss} />
            </li>
          ))}
        </ol>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItemData;
  onDismiss: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const duration = toast.durationMs ?? defaultToastDuration(toast.tone);
  const style = TONE_STYLES[toast.tone];

  // Tạm dừng đếm giờ khi rê chuột hoặc focus vào thông báo để người dùng kịp đọc và bấm.
  useEffect(() => {
    if (duration <= 0 || paused) {
      return;
    }
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [duration, paused, onDismiss, toast.id]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "flex items-start gap-3 rounded-card border border-border bg-surface p-3 shadow-dropdown",
        "animate-[toast-in_200ms_var(--ease-standard)]",
      )}
    >
      <Icon name={style.icon} size={22} className={cn("mt-0.5 shrink-0", style.iconClass)} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-5 font-semibold text-text">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-muted">{toast.description}</p>}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="focus-ring mt-1 cursor-pointer rounded-badge text-sm font-semibold text-primary hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <IconButton
        label="Đóng thông báo"
        icon={<Icon name="x" size={18} />}
        size="sm"
        variant="ghost"
        onClick={() => onDismiss(toast.id)}
        className="-mt-1 -mr-1"
      />
    </div>
  );
}
