import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Bell, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type ToastType = "success" | "error";

interface ToastOptions {
  onUndo?: () => void;
  durationMs?: number;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  isVisible: boolean;
  onUndo?: () => void;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((previous) =>
      previous.map((toast) =>
        toast.id === id ? { ...toast, isVisible: false } : toast,
      ),
    );

    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 220);
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "success",
      options?: ToastOptions,
    ) => {
      idRef.current += 1;
      const nextId = idRef.current;

      setToasts((previous) => [
        ...previous,
        {
          id: nextId,
          message,
          type,
          isVisible: false,
          onUndo: options?.onUndo,
          durationMs: options?.durationMs ?? 4200,
        },
      ]);

      window.requestAnimationFrame(() => {
        setToasts((previous) =>
          previous.map((toast) =>
            toast.id === nextId ? { ...toast, isVisible: true } : toast,
          ),
        );
      });

      window.setTimeout(() => {
        dismissToast(nextId);
      }, options?.durationMs ?? 4200);
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      setToasts([]);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(760px,calc(100vw-1.5rem))] flex-col items-end gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              `pointer-events-auto w-full rounded-2xl border px-5 pb-5 pt-4 shadow-xl transition-all duration-200 ease-out ` +
              `${toast.isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} ` +
              (toast.type === "success"
                ? "border-border/70 bg-card text-foreground"
                : "border-red-300/60 bg-card text-foreground")
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface text-muted">
                  <Bell className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-3xl font-semibold leading-8 text-foreground">
                    Notification
                  </p>
                  <p className="mt-1 text-xl leading-7 text-muted">{toast.message}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface/70 hover:text-foreground"
                aria-label="Close notification"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-11 rounded-xl px-6 text-2xl font-medium"
                onClick={() => {
                  toast.onUndo?.();
                  dismissToast(toast.id);
                }}
              >
                Undo
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-11 rounded-xl border-border/70 bg-surface/70 px-5 text-2xl font-medium text-foreground hover:bg-surface"
                onClick={() => dismissToast(toast.id)}
              >
                Close notification
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
