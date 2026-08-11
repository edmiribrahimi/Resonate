"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import ToastContainer from "./ToastContainer";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * The provider that owns every notification raised by a surface.
 *
 * ── A DIALOG NEVER RAISES A TOAST (41-UI-SPEC §8.3, threat T-41-11) ──────────
 *
 * A native `<dialog>` opened with `showModal()` paints in the **top layer**,
 * which sits above every `z-index` — including the toast container's, the
 * highest rung on §10's ladder and still far below the top layer, because the
 * top layer is not on the ladder at all.
 * So a dialog that reported success by calling `useToast` would report it
 * **invisibly**: the operator confirms a refund, a retirement or a venue
 * reveal, sees nothing happen, and does it again. That is precisely the silent
 * failure `meta-gates.md` forbids, and this project has **no error tracking**
 * to contradict it — nobody would be told, because there is nobody to tell.
 *
 * > **A dialog reports its own outcome inside its own panel** — a status region
 * > at the foot of the body: `role="status"` for success, `role="alert"` for
 * > failure, ink `--sem-done` / `--sem-crit` on `--surface` (5.69 : 1 and
 * > 6.99 : 1, both clear of 4.5 : 1 for body text).
 *
 * **The toast is for a notification raised by a surface, where no dialog is
 * open.** Nothing else.
 *
 * This rule is written **before the first dialog is converted**, not after
 * somebody loses a message. It is latent today — `useToast` has exactly one
 * consumer, `GuestListClient`, and it is not a dialog — and it goes live the
 * moment the eleven hand-rolled overlays become dialogs. Plan 41-09 hands this
 * sentence to gate G2 as a mechanical check: no file rendering `Dialog`
 * imports `useToast`. The sentence exists first; the gate holds it after.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 4000) => {
      const id = crypto.randomUUID();
      const newToast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        dismiss(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
