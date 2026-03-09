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
  showToast: (
    message: string,
    type?: ToastType,
    options?: ToastOptions,
  ) => void;
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
    (message: string, type: ToastType = "success", options?: ToastOptions) => {
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
      <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(383px,calc(100vw-1rem))] flex-col items-end gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              "pointer-events-auto w-full border border-[#373948] bg-[#1E1F2A] p-3 shadow-[0px_3px_8px_rgba(0,0,0,0.16),0px_2px_5px_rgba(0,0,0,0.16),0px_1px_1px_rgba(0,0,0,0.16)] transition-all duration-200 ease-out " +
              `${toast.isVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"} ` +
              (toast.type === "success"
                ? "text-foreground"
                : "text-[#F6B8B8]")
            }
            style={{ borderRadius: 6, minHeight: 102 }}
          >
            <div className="flex items-start gap-2">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                <span className="inline-flex h-4 w-4 items-center justify-center text-[#9C9DA6]">
                  <Bell className="h-4 w-4" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[13px] font-medium leading-4 text-white">
                    Open in desktop app?
                  </p>

                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="focus-ring inline-flex h-3 w-3 shrink-0 items-center justify-center text-[#9C9DA6] transition-colors hover:text-white"
                    aria-label="Close notification"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <p className="mt-4 text-[13px] leading-4 text-[#9C9DA6]">
                  {toast.message}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    className="focus-ring inline-flex h-[23px] items-center justify-center rounded-[5px] border border-[#6466D8] bg-[#575AC6] px-2 text-xs font-medium leading-[15px] text-[#FFFEFF] shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.05),0px_1px_1px_rgba(0,0,0,0.1)]"
                    onClick={() => {
                      toast.onUndo?.();
                      dismissToast(toast.id);
                    }}
                  >
                    Undo
                  </button>

                  <button
                    type="button"
                    className="focus-ring inline-flex h-[23px] items-center justify-center rounded-[5px] border border-[#373948] bg-[#2B2D3C] px-2 text-xs font-medium leading-[15px] text-[#E4E5EE] shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.05),0px_1px_1px_rgba(0,0,0,0.1)]"
                    onClick={() => dismissToast(toast.id)}
                  >
                    Close notification
                  </button>
                </div>
              </div>
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
