"use client";

import { useState } from "react";
import { IconButton } from "@/components/ui/Button";

/**
 * The share control — converted by plan 41.2-18.
 *
 * ── What leaves the product here, enumerated by reading the code ─────────────
 *
 * A share sheet is a **publication**, and a publication is not recallable. So
 * the enumeration is rebuilt from this file rather than carried forward from a
 * document, because a list is dated by construction. There are exactly three
 * strings this component can hand to the platform, and all three arrive from
 * above:
 *
 *   1. `title`       — the prop, from the event row's own title;
 *   2. `text`        — the description prop, falling back to (1);
 *   3. `url`         — the URL of this page itself, which is this route's slug.
 *
 * The two props are passed from the page at a single site, and the row they come
 * from is selected without any of the columns that carry a place. **The
 * clipboard branch writes (3) and nothing else.**
 *
 * **This conversion changed none of them.** `handleShare` below is byte-identical
 * to its previous form: no field was added to the payload, none was removed, and
 * nothing new is read. What changed is the control that calls it.
 *
 * ── What the conversion did change ───────────────────────────────────────────
 *
 * It was a 40px circle with **no accessible name at all** — an icon-only control
 * carrying two glyphs and no label, which a screen reader announces as "button"
 * and nothing else. The icon rung types the name as required rather than
 * trusting it, and puts the target at 44x44. The name also carries the state,
 * because on this control the glyph swap is the ONLY feedback and a glyph is not
 * announced.
 */

interface ShareButtonProps {
  title: string;
  description?: string | null;
}

export default function ShareButton({ title, description }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    const shareData = {
      title,
      text: description || title,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard not available
      }
    }
  }

  return (
    <IconButton
      aria-label={copied ? "Link copied" : "Share"}
      variant="secondary"
      className="bg-surface"
      onClick={handleShare}
    >
      {copied ? (
        <svg className="h-5 w-5 text-sem-done" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
        </svg>
      )}
    </IconButton>
  );
}
