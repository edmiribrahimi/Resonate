"use client";

import { useRef, useEffect, useCallback } from "react";

interface LightboxItem {
  url: string;
  type: "photo" | "video";
}

interface LightboxProps {
  item: LightboxItem | null;
  onClose: () => void;
}

export default function Lightbox({ item, onClose }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (item) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [item]);

  const handleDialogClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      // Close only when clicking the dialog backdrop (not the content)
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none bg-black/90 backdrop:bg-transparent p-0"
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
    >
      {item && (
        <div className="flex h-full w-full items-center justify-center p-4">
          {/* Close button */}
          <button
            type="button"
            className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {item.type === "photo" ? (
            <img
              src={item.url}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <video
              src={item.url}
              controls
              autoPlay
              className="max-h-full max-w-full"
            />
          )}
        </div>
      )}
    </dialog>
  );
}
