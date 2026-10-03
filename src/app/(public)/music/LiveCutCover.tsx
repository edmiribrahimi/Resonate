"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * The 1:1 cover of a LiveCut card — a thin client only because `onError`
 * needs one.
 *
 * `alt=""` on purpose: the cover is decorative next to the text that follows
 * it, which already says artist, format and date (UI-SPEC §A.4, row 0). Nothing
 * is drawn over it — it is a designed piece and covering it soils it.
 *
 * A cover that fails to load is not a silent grey box (zero silent failures):
 * the same cell turns `bg-sunk` with a visible «Cover unavailable», and the
 * failure is logged with its own category and the LiveCut id, nothing else.
 * A MISSING cover cannot exist on a published LiveCut — the database refuses it
 * (`livecuts_published_has_cover`).
 */
export default function LiveCutCover({
  id,
  coverUrl,
  className,
}: {
  id: string;
  coverUrl: string;
  /** Grid placement and size, owned by the card. */
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-sunk`}>
        <span className="px-2 text-center text-xs text-muted">Cover unavailable</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-sunk`}>
      <Image
        src={coverUrl}
        alt=""
        fill
        sizes="(min-width: 1024px) 315px, (min-width: 768px) 240px, 96px"
        className="object-cover"
        onError={() => {
          console.error(`[music.cover_failed] ${id}`);
          setFailed(true);
        }}
      />
    </div>
  );
}
