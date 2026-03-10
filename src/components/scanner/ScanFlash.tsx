"use client";

import { useEffect } from "react";

interface ScanFlashProps {
  type: "success" | "error";
  title: string;
  subtitle?: string;
  onDismiss: () => void;
}

export default function ScanFlash({
  type,
  title,
  subtitle,
  onDismiss,
}: ScanFlashProps) {
  useEffect(() => {
    const delay = type === "success" ? 1500 : 2000;
    const timer = setTimeout(onDismiss, delay);
    return () => clearTimeout(timer);
  }, [type, onDismiss]);

  const isSuccess = type === "success";

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center ${
        isSuccess ? "bg-green-500/90" : "bg-red-500/90"
      } animate-[flash-in_150ms_ease-out]`}
      onClick={onDismiss}
      role="status"
      aria-live="assertive"
    >
      {/* Icon */}
      <div className="mb-4">
        {isSuccess ? (
          <svg
            className="h-20 w-20 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
        ) : (
          <svg
            className="h-20 w-20 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <p className="text-2xl font-bold text-white text-center px-8">
        {title}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-white/80 text-center mt-2 px-8">
          {subtitle}
        </p>
      )}

      {/* Tap hint */}
      <p className="absolute bottom-12 text-xs text-white/50">
        Tap to dismiss
      </p>
    </div>
  );
}
