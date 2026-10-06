"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * The waveform of a LiveCut — OUR data, drawn by us (plan 52.3-22,
 * `52.3-PLAYER-RESEARCH.md` §1).
 *
 * ── Where the bars come from ─────────────────────────────────────────────────
 *
 * `peaks` is `livecuts.waveform_peaks`: up to 2000 amplitude peaks 0..255
 * computed from the recording itself by `scripts/livecut-peaks.mjs` at
 * publication. Nothing is fetched here, nothing comes from SoundCloud, and the
 * bars exist before any play. A LiveCut without peaks does not mount this
 * component: the bar keeps its plain progress line, never a fake wave.
 *
 * ── Drawing ──────────────────────────────────────────────────────────────────
 *
 * A canvas, redrawn on resize and on every position change: the 1800 peaks are
 * resampled to one bar per 3 px (2 px bar, 1 px gap — ~300 bars at 900 px),
 * mirrored around the middle line. The played part is the accent — it is
 * «now», the one thing the accent is reserved for on this page — and the part
 * still to play is the strong line colour. Both are READ from the CSS custom
 * properties of the element at draw time: no colour literal in this file
 * (`verify:semantic-separation`), and the theme stays the theme's.
 *
 * ── Seek, with a keyboard and with a thumb ───────────────────────────────────
 *
 * APG «Media Seek Slider» (W3C, 2026-01-20): the focusable element is
 * `role="slider"` with `aria-valuemin/max/now` in seconds and an
 * `aria-valuetext` in minutes and seconds; ←/→ move 5 s, PageUp/PageDown 60 s,
 * Home/End to the ends. With a pointer the seek is committed on `pointerup`
 * only — every seek is a postMessage to the SoundCloud iframe — and the
 * position under the finger is previewed meanwhile. `touch-action: none` so a
 * horizontal drag scrubs instead of scrolling; the hit area is at least 44 px
 * tall on a phone (WCAG 2.2 SC 2.5.8 asks 24; the project's standard is 44).
 */

export const SEEK_STEP_S = 5;
export const SEEK_PAGE_S = 60;

const BAR_PX = 2;
const GAP_PX = 1;
const MIN_BAR_PX = 2;

function valueText(seconds: number, duration: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const dm = Math.floor(duration / 60);
  return `${m} min ${s} s of ${dm} min`;
}

/**
 * Max per bucket: the loudest moment of a bar is what the eye reads as the
 * bar. Scaled to the LOUDEST peak of this LiveCut, not to 255: the recorder
 * leaves headroom (a file-sourced row measured max 153 of 255 on 2026-10-06)
 * while SoundCloud normalises its own, and two rows side by side must read
 * the same height. The data stays raw in the database.
 */
function resample(peaks: readonly number[], bars: number): Float32Array {
  const out = new Float32Array(bars);
  if (bars === 0 || peaks.length === 0) return out;
  let loudest = 1;
  for (const p of peaks) if (p > loudest) loudest = p;
  for (let i = 0; i < bars; i++) {
    const from = Math.floor((i * peaks.length) / bars);
    const to = Math.max(from + 1, Math.floor(((i + 1) * peaks.length) / bars));
    let max = 0;
    for (let j = from; j < to; j++) if (peaks[j] > max) max = peaks[j];
    out[i] = max / loudest;
  }
  return out;
}

export default function Waveform({
  peaks,
  durationSeconds,
  positionSeconds,
  onSeek,
  label = "Playback position",
  className = "",
}: {
  peaks: readonly number[];
  durationSeconds: number;
  /** The widget's position, in seconds; the component previews the drag on top of it. */
  positionSeconds: number;
  onSeek: (seconds: number) => void;
  label?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const barsRef = useRef<Float32Array>(new Float32Array(0));
  const [dragSeconds, setDragSeconds] = useState<number | null>(null);

  const duration = Math.max(1, durationSeconds);
  const shown = dragSeconds ?? Math.min(duration, Math.max(0, positionSeconds));
  const relative = shown / duration;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const rect = host.getBoundingClientRect();
    const width = Math.max(0, Math.floor(rect.width));
    const height = Math.max(0, Math.floor(rect.height));
    if (width === 0 || height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const bars = Math.floor((width + GAP_PX) / (BAR_PX + GAP_PX));
    if (barsRef.current.length !== bars) barsRef.current = resample(peaks, bars);
    const values = barsRef.current;

    const styles = getComputedStyle(host);
    const played = styles.getPropertyValue("--accent").trim() || "currentColor";
    const ahead = styles.getPropertyValue("--line-strong").trim() || "currentColor";
    const playedBars = relative * bars;
    const mid = height / 2;

    for (let i = 0; i < bars; i++) {
      const h = Math.max(MIN_BAR_PX, values[i] * (height - 2));
      const x = i * (BAR_PX + GAP_PX);
      // A bar straddling the position is split so the edge moves per pixel, not per bar.
      if (i + 1 <= playedBars) {
        ctx.fillStyle = played;
        ctx.fillRect(x, mid - h / 2, BAR_PX, h);
      } else if (i < playedBars) {
        const split = (playedBars - i) * BAR_PX;
        ctx.fillStyle = played;
        ctx.fillRect(x, mid - h / 2, split, h);
        ctx.fillStyle = ahead;
        ctx.fillRect(x + split, mid - h / 2, BAR_PX - split, h);
      } else {
        ctx.fillStyle = ahead;
        ctx.fillRect(x, mid - h / 2, BAR_PX, h);
      }
    }
  }, [peaks, relative]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      barsRef.current = new Float32Array(0);
      draw();
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [draw]);

  const secondsAt = (clientX: number): number => {
    const host = hostRef.current;
    if (!host) return shown;
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0) return shown;
    const r = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return r * duration;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragSeconds(secondsAt(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragSeconds === null) return;
    setDragSeconds(secondsAt(e.clientX));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragSeconds === null) return;
    const target = secondsAt(e.clientX);
    setDragSeconds(null);
    onSeek(target);
  };
  const onPointerCancel = () => setDragSeconds(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = shown - SEEK_STEP_S;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = shown + SEEK_STEP_S;
        break;
      case "PageDown":
        next = shown - SEEK_PAGE_S;
        break;
      case "PageUp":
        next = shown + SEEK_PAGE_S;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = duration;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    onSeek(Math.min(duration, Math.max(0, next)));
  };

  return (
    <div
      ref={hostRef}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={valueText(shown, duration)}
      aria-orientation="horizontal"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
      // A FIXED height: a canvas inside an auto-height box falls back to its
      // intrinsic 300×150 (measured on 2026-10-06: the bar grew to 187 px).
      // 44 px on a phone (the project's touch target); 48 from `md:`.
      className={`relative h-11 w-full cursor-pointer touch-none select-none rounded-md md:h-12 ${FOCUS_RING} ${className}`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
    </div>
  );
}
