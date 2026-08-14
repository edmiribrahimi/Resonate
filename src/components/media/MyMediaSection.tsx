"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { deleteMedia } from "@/app/(public)/events/[slug]/actions";
import Lightbox from "@/components/media/Lightbox";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { IconButton, FOCUS_RING } from "@/components/ui/Button";

/**
 * A member's own uploads, grouped by the event they belong to.
 *
 * ── The overlay is gone, and it was not replaced by a dialog ─────────────────
 *
 * This file carried the tree's only hand-written dialog role attribute — one
 * hit, measured — and `verify-dialogs.mjs:468-472` names it separately from the
 * exemption above it: *NOT exempt, and on REMAINING*. That is also why the
 * gate's signature is keyed on the shell instead: an attribute this rare finds
 * one file and misses every other copy in the tree.
 *
 * Read at its render site, though, what it declared was not a dialog
 * — it was a **full-bleed image at a heavy scrim with a close cross and a
 * `stopPropagation` on the image**, which is the definition
 * `verify-dialogs.mjs:474-478` gives for `src/components/media/Lightbox.tsx`,
 * the **declared permanent exemption**: *"a full-bleed media viewer at every
 * tier, carrying a heavier scrim than a sheet … a file that will never convert
 * is not a debt."*
 *
 * Putting the sheet-and-window primitive around a full-bleed photo is the
 * *correct file goes red* shape `41-UI-SPEC.md` §0 rule 3 forbids. So the shell
 * is **delegated** to the file already declared exempt rather than converted —
 * the road `(public)/gallery/GalleryClient.tsx` and, inside this same phase's
 * perimeter, `(public)/events/[slug]/MediaGallerySection.tsx:73-80` already
 * walk. **No exemption was widened and no gate was edited**: this file simply
 * stops declaring a shell, which is what takes it off `REMAINING`.
 *
 * ── What the delegation changed, stated rather than discovered ───────────────
 *
 * The viewer is a native `<dialog>` opened with `showModal()`, so **Escape, the
 * focus trap, background inertness and the top layer arrive from the platform**.
 * The overlay this replaces was a `<div>` and had none of the four — the two
 * modal attributes it carried asserted a contract nothing implemented. Its
 * close control was a text glyph with no declared minimum; the viewer's is the
 * shared icon rung at 44 x 44.
 *
 * **Only photos open, exactly as before.** The viewer can play a video; this
 * call site still hands it nothing but photos, because that is what the
 * incumbent did and widening it is not a rendering change.
 *
 * ── The shapes, and why nothing had to be bridged ────────────────────────────
 *
 * `LightboxItem` (`Lightbox.tsx:39-42`) is `{ url: string; type: "photo" |
 * "video" }`. The `MediaItem` below is a **structural superset** of it — same
 * two names, same literal union — so it is assignable as-is. It is still shaped
 * explicitly at the hand-over, the way the perimeter sibling shapes it, so the
 * four fields the viewer has no use for (`id`, `status`, `file_size`,
 * `created_at`) do not travel into it.
 *
 * ── What did NOT change ──────────────────────────────────────────────────────
 *
 * Which media a member can see. The set arrives as `groups`, resolved on the
 * server; no query, no filter and no ownership expression lives here, and none
 * was added. This component renders a decision it does not own.
 */

interface MediaItem {
  id: string;
  url: string;
  type: "photo" | "video";
  status: "pending" | "approved" | "rejected";
  file_size: number | null;
  created_at: string;
}

interface EventGroup {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventSlug: string;
  items: MediaItem[];
}

interface MyMediaSectionProps {
  groups: EventGroup[];
}

export default function MyMediaSection({ groups }: MyMediaSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);

  function handleDelete(mediaId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this upload?"
    );
    if (!confirmed) return;

    setPendingDelete(mediaId);
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteMedia(mediaId);
        if (!result.success) {
          setError("Failed to delete media.");
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete media."
        );
      } finally {
        setPendingDelete(null);
      }
    });
  }

  /**
   * The moderation state of one upload.
   *
   * It was three raw palette pairs — a yellow, a green and a red. It is now the
   * badge rung at its only non-interactive tone, and **deliberately the same
   * tone for all three**: `Chip.tsx:246-254` states that the fill means *look
   * here first* and that there is **no tone per outcome**, so assigning one
   * colour per moderation state would settle in CSS a grading the primitive
   * refuses to carry. The word itself is the channel, which is the direction
   * §10 asks for anyway — colour is never the only one.
   */
  function statusBadge(status: string) {
    return <Badge>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  }

  function formatEventDate(dateStr: string): string {
    try {
      const d = new Date(dateStr + "T00:00:00");
      const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  if (groups.length === 0) {
    return (
      <div>
        <p className="mb-3 text-sm text-muted">My Media</p>
        <Card>
          <p className="text-sm text-muted/60">
            You haven&apos;t uploaded any media yet. Attend an event and share
            your photos!
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">My Media</p>

      {/* The refusal is announced rather than merely coloured, in the critical
          semantic — the shape `(auth)/login/page.tsx:170-174` fixes for a
          refusal that is not inside a dialog. The bordered red box it replaces
          carried three raw palette values and no role at all. */}
      {error && (
        <p role="alert" className="mb-3 text-sm text-sem-crit">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.eventId}>
            {/* Event heading */}
            <a
              href={`/events/${group.eventSlug}`}
              className={`block mb-3 hover:opacity-80 transition-opacity ${FOCUS_RING}`}
            >
              <p className="text-sm font-semibold text-ink">
                {group.eventTitle}
              </p>
              <p className="text-xs text-muted">
                {formatEventDate(group.eventDate)}
              </p>
            </a>

            {/* Media grid */}
            <div className="grid grid-cols-3 gap-2">
              {group.items.map((item) => (
                <div key={item.id} className="relative group">
                  {/* Thumbnail */}
                  <button
                    type="button"
                    onClick={() =>
                      item.type === "photo" && setLightboxItem(item)
                    }
                    className={`block min-h-11 w-full aspect-square rounded-lg overflow-hidden bg-ground active:scale-95 active:opacity-80 transition-transform ${FOCUS_RING}`}
                  >
                    {item.type === "photo" ? (
                      <Image
                        src={item.url}
                        alt="Your upload"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 33vw, 120px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-2xl">&#9654;</span>
                      </div>
                    )}
                  </button>

                  {/* Status badge */}
                  <div className="absolute top-1 left-1">
                    {statusBadge(item.status)}
                  </div>

                  {/*
                    Delete — at the floor, and visible.

                    It was a ~20px control revealed on hover, which on a phone
                    is a control that does not exist: there is no hover, and
                    this section is a member surface read on a phone. A target
                    at 44px that is invisible would be a floor declared and not
                    kept, so the reveal goes with the size. The guard is
                    unchanged and is where it always was — `window.confirm`
                    above, then the action.

                    It keeps the incumbent's grammar: the critical semantic as
                    INK over a translucent black scrim. The scrim is the one
                    tolerated palette exception, and it is here for the reason
                    `Lightbox.tsx:25-33` gives for its own — the ground under
                    this ink is a photograph, so it cannot be a token, and a
                    dark scrim under a light ink is the readable direction.
                  */}
                  <IconButton
                    aria-label="Delete"
                    variant="ghost"
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending && pendingDelete === item.id}
                    className="absolute top-1 right-1 bg-black/60 text-sem-crit"
                  >
                    {pendingDelete === item.id ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    )}
                  </IconButton>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/*
        The viewer. Shaped at the hand-over exactly as the perimeter sibling
        shapes it (`MediaGallerySection.tsx:73-80`), so the fields it has no use
        for stay out of it.
      */}
      <Lightbox
        item={
          lightboxItem
            ? { url: lightboxItem.url, type: lightboxItem.type }
            : null
        }
        onClose={() => setLightboxItem(null)}
      />
    </div>
  );
}
