"use client";

import { useRef, useEffect, useCallback } from "react";
import { IconButton } from "@/components/ui/Button";

/**
 * The full-bleed media viewer.
 *
 * ── Its dialog shell is a declared exception, and stays one ──────────────────
 *
 * `41-UI-SPEC.md` §8.3 and §13's G2 row name this file before the gate that
 * would judge it: a media viewer is full-bleed at every tier and carries a
 * heavier scrim than a sheet, so a G2 demanding the sheet form would go red on
 * a correct file. Plan 41-08 changed **nothing** about the shell, the platform
 * behaviours it leans on, or the light-dismiss handler.
 *
 * ── What plan 41-08 did change, and why it had to ────────────────────────────
 *
 * The close control. It was a 40 px circle — below the 44 px floor §6.1 fixes —
 * drawn with a translucent achromatic fill and an achromatic ink, which is the
 * raw-palette shape §5's token layer exists to remove. It is now the shared
 * icon rung at 44 × 44, which is where §6.4 already sent the other three close
 * controls in this tree.
 *
 * **It keeps a scrim of its own, and that is the decision this file owed.**
 * `verify-conversion.mjs` records, beside its palette list, that the one
 * legitimate future case is *the ink over a full-bleed media scrim, where the
 * ground is the scrim rather than a token* — and that the plan converting a
 * media surface either adds a token or adds a line to that list, with its
 * reason. Neither was needed: the control sits above the image, so its ground
 * cannot be a token, and a **translucent black** behind it is the tolerated
 * scrim shape §13 already names for the modal grounds. A dark scrim under a
 * light ink is the readable direction; the incumbent was the other one.
 *
 * The accessible name stays `Close`, which is the string §11 fixes for this
 * control, and the icon rung types it as required rather than trusting it.
 */

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
          <IconButton
            aria-label="Close"
            variant="secondary"
            className="absolute top-4 right-4 z-20 bg-black/60"
            onClick={onClose}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </IconButton>

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
