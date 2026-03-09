"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Toast from "./Toast";

interface ToastData {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({
  toasts,
  onDismiss,
}: ToastContainerProps) {
  return (
    <div
      className="fixed left-0 right-0 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom) + 1rem)" }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <m.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto w-full max-w-sm"
          >
            <Toast
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onDismiss={onDismiss}
            />
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
