"use client";

import type { LiveCutView } from "@/lib/livecuts/view";
import { useMusicPlayer, useMusicPosition } from "./MusicPlayer";
import Waveform from "./Waveform";

/**
 * The waveform under the card that is PLAYING — and nothing under every other
 * card (plan 52.3-22; `52.3-PLAYER-RESEARCH.md` §3: hearthis and SoundCloud
 * keep the wave inline, Beatport keeps it in the bar; we draw it in the bar
 * always and on the current row only, so the list stays dense).
 *
 * A client leaf inside a server card: it reads the player's context and
 * returns `null` unless this LiveCut is the current one AND has peaks. The
 * server card knows nothing of playback.
 */
export default function LiveCutRowWave({
  liveCut,
  className = "",
}: {
  liveCut: LiveCutView;
  className?: string;
}) {
  const { current, seek } = useMusicPlayer();
  const { positionMs } = useMusicPosition();
  if (current !== liveCut.id || !liveCut.peaks) return null;
  return (
    <div className={className}>
      <Waveform
        peaks={liveCut.peaks}
        durationSeconds={liveCut.durationSeconds}
        positionSeconds={positionMs / 1000}
        onSeek={seek}
        label={`Playback position, ${liveCut.title}`}
      />
    </div>
  );
}
