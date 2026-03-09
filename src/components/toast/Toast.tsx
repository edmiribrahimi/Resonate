"use client";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onDismiss: (id: string) => void;
}

const typeStyles: Record<ToastType, string> = {
  success: "border-green-500/30 text-green-400",
  error: "border-red-500/30 text-red-400",
  info: "border-blue-500/30 text-blue-400",
};

function SuccessIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm3.354 5.354-4 4a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7 9.293l3.646-3.647a.5.5 0 0 1 .708.708z"
        fill="currentColor"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm2.354 8.646a.5.5 0 0 1-.708.708L8 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L7.293 8 5.646 6.354a.5.5 0 1 1 .708-.708L8 7.293l1.646-1.647a.5.5 0 0 1 .708.708L8.707 8l1.647 1.646z"
        fill="currentColor"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm.5 10.5a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 1 0v4zM8 5.5A.75.75 0 1 1 8 4a.75.75 0 0 1 0 1.5z"
        fill="currentColor"
      />
    </svg>
  );
}

const icons: Record<ToastType, () => React.ReactElement> = {
  success: SuccessIcon,
  error: ErrorIcon,
  info: InfoIcon,
};

export default function Toast({ id, message, type, onDismiss }: ToastProps) {
  const Icon = icons[type];

  return (
    <div
      className={`bg-card border rounded-xl px-4 py-3 shadow-lg max-w-sm w-full flex items-center gap-3 ${typeStyles[type]}`}
    >
      <Icon />
      <span className="flex-1 text-sm text-foreground">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 text-muted hover:text-foreground transition-colors"
        aria-label="Chiudi notifica"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M10.5 3.5 3.5 10.5M3.5 3.5l7 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
