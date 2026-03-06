"use client";

import Link from "next/link";

interface GuestLoginBannerProps {
  slug: string;
}

export default function GuestLoginBanner({ slug }: GuestLoginBannerProps) {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
      <div className="flex items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-blue-400"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-blue-300">
            Log in to keep your drink tokens safe across devices.{" "}
            <Link
              href={`/login?redirect=/events/${slug}/menu`}
              className="font-medium underline hover:text-blue-200 transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function GuestWarningModal({
  onContinue,
  onClose,
  slug,
}: {
  onContinue: () => void;
  onClose: () => void;
  slug: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Guest Checkout
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-card-border transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Warning content */}
        <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-300/90">
            Your drink tokens will be saved in this browser only. If you clear
            your browser data or switch devices, you may lose access to your
            tokens.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Link
            href={`/login?redirect=/events/${slug}/menu`}
            className="block w-full rounded-full bg-accent py-3 text-center font-medium text-white transition-all hover:bg-accent-hover active:scale-95 active:opacity-80"
          >
            Log in first
          </Link>
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-full border border-card-border bg-card py-3 font-medium text-foreground transition-all hover:bg-card-border active:scale-95 active:opacity-80"
          >
            Continue as guest
          </button>
        </div>
      </div>
    </div>
  );
}
