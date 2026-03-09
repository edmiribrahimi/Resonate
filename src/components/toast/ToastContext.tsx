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
