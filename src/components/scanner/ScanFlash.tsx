"use client";

import { useEffect, type ReactNode } from "react";

/**
 * The three things the door can say, and why each one carries three channels.
 *
 * The prop is **semantic**: it names what happened, never how it should look.
 * There is deliberately no colour prop, no `variant` and no className override —
 * Phase 42 (DS-04) owns the scanner's colour and a style escape hatch here would
 * have to be unpicked there, one call site at a time. It would also let a caller
 * assert a state this component did not derive.
 *
 * `already_recorded` is the third state, and it covers two situations that are
 * the same instruction to a member of staff: **this person is admitted, and
 * someone should look at this afterwards.** It is used for a repeat read, and
 * for an admission that carried a flag (`refunded_before_night`,
 * `not_in_cache`). It is never a refusal — the person in front of the scanner
 * was admitted either way, and the door's asymmetry is that a false refusal
 * happens in front of a queue while a false admission is a number in a report.
 */
export type ScanFlashType = "success" | "already_recorded" | "error";

interface ScanFlashProps {
  type: ScanFlashType;
  title: string;
  subtitle?: string;
  onDismiss: () => void;
}

/** The one shape every state's icon shares, so only the path differs between them. */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      className="h-20 w-20 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      {children}
    </svg>
  );
}

interface FlashState {
  /** The full-screen fill. */
  bg: string;
  /** How long it stays before dismissing itself, in ms. */
  delay: number;
  /** The glyph, distinct per state so colour is never the only channel. */
  icon: ReactNode;
}

/**
 * One lookup, and the only place any of this changes.
 *
 * Three channels carry each state's identity — **colour, icon and dwell** — plus
 * a fourth the caller fires (`src/utils/haptics.ts`). That is not redundancy:
 * the door is a dark room, the phone is held one-handed at arm's length with a
 * queue in front of it, and iOS degrades `navigator.vibrate` to nothing at all.
 * A state told apart by hue alone is a state half the devices at the door cannot
 * tell apart.
 *
 * **Amber, not yellow, and that is the point.** `yellow-500` already means
 * *Offline* on the scanner's connectivity pill
 * (`src/app/(admin)/admin/scanner/ScannerClient.tsx`). If the third scan state
 * were yellow too, a member of staff glancing at a phone at two in the morning
 * would have to work out whether the screen means "already admitted" or "you
 * have no signal" — two facts with nothing in common.
 *
 * **Dwell is information.** `already_recorded` sits for 2500 ms rather than 2000
 * because it carries a time and an operator to read, and it is read while
 * someone is waiting.
 */
const FLASH_STATES: Record<ScanFlashType, FlashState> = {
  success: {
    bg: "bg-green-500/90",
    delay: 1500,
    icon: (
      <Glyph>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4.5 12.75 6 6 9-13.5"
        />
      </Glyph>
    ),
  },
  already_recorded: {
    bg: "bg-amber-500/90",
    delay: 2500,
    // A clock face: it reads as *already, earlier*. An exclamation mark or a
    // crossed circle would read as a refusal, which this state never is.
    icon: (
      <Glyph>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </Glyph>
    ),
  },
  error: {
    bg: "bg-red-500/90",
    delay: 2000,
    icon: (
      <Glyph>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18 18 6M6 6l12 12"
        />
      </Glyph>
    ),
  },
};

export default function ScanFlash({
  type,
  title,
  subtitle,
  onDismiss,
}: ScanFlashProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, FLASH_STATES[type].delay);
    return () => clearTimeout(timer);
  }, [type, onDismiss]);

  const state = FLASH_STATES[type];

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center ${state.bg} animate-[flash-in_150ms_ease-out]`}
      onClick={onDismiss}
      role="status"
      aria-live="assertive"
    >
      {/* Icon */}
      <div className="mb-4">{state.icon}</div>

      {/* Title */}
      <p className="text-2xl font-bold text-white text-center px-8">
        {title}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-white/80 text-center mt-2 px-8">
          {subtitle}
        </p>
      )}

      {/* Tap hint */}
      <p className="absolute bottom-12 text-xs text-white/50">
        Tap to dismiss
      </p>
    </div>
  );
}
