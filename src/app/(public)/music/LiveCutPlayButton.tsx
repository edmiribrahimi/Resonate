"use client";

import { FOCUS_RING } from "@/components/ui/Button";
import type { LiveCutView } from "@/lib/livecuts/view";
import { PlayerIcon, useMusicPlayer } from "./MusicPlayer";

/**
 * The play of one LiveCut card (UI-SPEC §A.5).
 *
 * ONE card play at a time is filled with the accent — «now»: before any play,
 * the first card in reading order (`isFirst`, decided by the page on the
 * filtered result); after the first tap, the card loaded in the player. Every
 * other card is neutral. The accent is never the only channel: position before
 * the first play, then the icon and the accessible name, which always carries
 * the whole title (the visual truncation on a phone is visual only).
 *
 * The tap calls the shared player and does NOT move the focus: it stays on
 * this button (§A.5, Accessibility).
 *
 * `relative` is load-bearing: from `md:` the play shares the cover's grid cell,
 * and the cover's wrapper is positioned (`LiveCutCover`, for `next/image`
 * `fill`). A positioned box paints above a non-positioned one whatever the DOM
 * order, so without `relative` the cover sat ON the play and swallowed every
 * tap — measured by CDP `elementFromPoint` on 2026-10-03 (the hit was the
 * cover's `<img>`). Positioned and later in the DOM, the play paints on top.
 */
export default function LiveCutPlayButton({
  liveCut,
  isFirst,
}: {
  liveCut: LiveCutView;
  isFirst: boolean;
}) {
  const { current, status, play, pause } = useMusicPlayer();

  const isCurrent = current === liveCut.id;
  const isNow = isCurrent || (current === null && isFirst);
  const loading = isCurrent && status === "loading";
  const playing = isCurrent && status === "playing";

  const label = `${loading ? "Loading" : playing ? "Pause" : "Play"} ${liveCut.title}`;
  const tone = isNow ? "bg-accent text-ground" : "bg-ground border border-control text-ink";

  return (
    <button
      type="button"
      aria-label={label}
      aria-busy={loading ? "true" : undefined}
      onClick={() => {
        if (playing) pause();
        else if (!loading) play(liveCut);
      }}
      className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full active:scale-95 active:opacity-80 ${tone} ${FOCUS_RING}`}
    >
      <PlayerIcon name={loading ? "arrow-path" : playing ? "pause" : "play"} className="h-5 w-5" />
    </button>
  );
}
