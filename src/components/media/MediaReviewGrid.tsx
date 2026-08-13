"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { updateMediaStatus } from "@/app/(public)/events/[slug]/actions";
import { Button } from "@/components/ui/Button";

/**
 * The moderation grid — converted by plan 41.1-09.
 *
 * ── The middle step this grid was missing ────────────────────────────────────
 *
 * §2.2 records that the multi-column media grid is the **only genuinely
 * three-tier axis in this product**, and §2.3's map is read per class rather
 * than as a rename: the two-column rule moves off the small prefix onto the
 * tablet tier, and the three-column desktop rule stays exactly where it is —
 * §2.3's last row names this file and says so. The result is one column on a
 * phone, two on a tablet, three on a desktop, and the tier between 640px and
 * 768px stops showing a tablet layout on a phone held sideways.
 *
 * The image's own size hint moved with it. It described the old boundary, so
 * leaving it would have made every browser between those two widths fetch a
 * half-width file for a full-width slot — a layout decision expressed in
 * bytes, and the one part of a grid conversion that is invisible on screen.
 *
 * ── The two controls, and why the primitives rather than a chosen colour ─────
 *
 * They were a 28px pill in a palette green and a 28px pill in a palette red.
 * Both are now the button ladder: 44px unconditionally (§6.1), the accent fill
 * carrying `--ground` as its ink at **6.85 : 1** (§5.3), the secondary carrying
 * `--control` at **7.14 : 1** (§5.2), and the one shared focus expression with
 * its load-bearing offset (§5.4) imported rather than re-spelled.
 *
 * That is not a preference on a review surface. The controls sit inside a card
 * whose upper half is **somebody's photograph**, so a boundary chosen by eye is
 * chosen against an image nobody has seen yet; a boundary that measures against
 * the specified minimum is chosen against the card's own ground, which is known.
 *
 * **Approve is the primary and reject is the secondary**, which is a decision
 * and not an aesthetic: the destructive variant is §11's confirming control for
 * a confirmation dialog, and this reject is a single unconfirmed press on an
 * ordinary moderation outcome. Filling it with the critical semantic would
 * spend the one colour that means *something has gone wrong* on something that
 * has not.
 *
 * ── What this component still does NOT do ───────────────────────────────────
 *
 * `media-and-storage.md`, gate *moderazione = rimozione*: rejecting flips the
 * **row**, and the **object** stays in a public bucket at a derivable path. That
 * was true before this conversion and is true after it — no visual change closes
 * it, and pretending otherwise by dressing the reject control as a deletion
 * would be the worse outcome. The action, its payload and its capability check
 * are untouched.
 */

interface MediaItem {
  id: string;
  url: string;
  type: "photo" | "video";
  file_size: number | null;
  created_at: string;
  uploader_name: string | null;
}

interface MediaReviewGridProps {
  items: MediaItem[];
}

export default function MediaReviewGrid({ items }: MediaReviewGridProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  function handleAction(mediaId: string, status: "approved" | "rejected") {
    setPendingAction(`${status}-${mediaId}`);
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateMediaStatus(mediaId, status);
        if (!result.success) {
          setError(`Failed to ${status} media.`);
        } else {
          setDismissed((prev) => new Set(prev).add(mediaId));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `Failed to ${status} media.`
        );
      } finally {
        setPendingAction(null);
      }
    });
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()} ${M[d.getMonth()]}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    } catch {
      return dateStr;
    }
  }

  const visibleItems = items.filter((item) => !dismissed.has(item.id));

  if (visibleItems.length === 0) {
    return (
      /*
        §8.11's empty-state contract. This is the *browser's* empty state — the
        last pending item was just decided here — so it says that rather than
        repeating the server's sentence, which would leave a person unsure
        whether their last press had landed.
      */
      <div className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">
          Nothing left to review
        </p>
        <p className="mt-1 text-sm text-muted">
          Every pending item has been decided. Reload to see the counts above
          catch up.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/*
        One cause, one region, and it is announced. §11 bans the shape this
        project already paid for once — a single sentence standing in for every
        failure — so the message the action produced is carried through rather
        than replaced, and the region names itself as the failure it is.
      */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4"
        >
          <p className="text-sm font-semibold text-sem-crit">
            That decision was not recorded
          </p>
          <p className="mt-1 text-xs text-muted">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          /*
            Not the `Card` primitive, and the reason is the one property §8.4
            fixed: the card's 24px padding would inset a thumbnail that is meant
            to reach its own edges. The card's edge and ground tokens are written
            out instead of appending a second padding utility to override it.
          */
          <div
            key={item.id}
            className="overflow-hidden rounded-2xl border border-line bg-surface"
          >
            {/* Thumbnail */}
            <div className="relative aspect-square bg-sunk">
              {item.type === "photo" ? (
                <Image
                  src={item.url}
                  alt="Pending media"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    {/*
                      The glyph is decoration and the word below is the name.
                      Hidden from assistive technology so the item is announced
                      once, as "Video", rather than twice with a character a
                      screen reader has to guess at.
                    */}
                    <span aria-hidden="true" className="text-4xl">
                      &#9654;
                    </span>
                    <p className="mt-1 text-xs text-muted">Video</p>
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs text-muted mb-3">
                <span>{item.uploader_name ?? "Unknown"}</span>
                <span>&#183;</span>
                <span>{formatDate(item.created_at)}</span>
                {item.file_size && (
                  <>
                    <span>&#183;</span>
                    <span>{formatFileSize(item.file_size)}</span>
                  </>
                )}
              </div>

              {/*
                Actions. Both are the `sm` rung — 44px tall, dense horizontal
                padding — because two labelled controls share one card's width
                on a phone. The disabled predicate is the one that was already
                here: only the control that was pressed goes quiet, so the other
                stays available while a transition is in flight.
              */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  onClick={() => handleAction(item.id, "approved")}
                  disabled={isPending && pendingAction === `approved-${item.id}`}
                >
                  {pendingAction === `approved-${item.id}` ? "..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => handleAction(item.id, "rejected")}
                  disabled={isPending && pendingAction === `rejected-${item.id}`}
                >
                  {pendingAction === `rejected-${item.id}` ? "..." : "Reject"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
