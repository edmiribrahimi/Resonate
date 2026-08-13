"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * The inline offer to give a venue a profile, shown under the event form's
 * venue field when the typed name matched nothing.
 *
 * The smallest file in the cluster and an exact match on two primitives: the
 * container is `Card` and both actions are the button ladder. What that buys is
 * not tidiness — the incumbent's two controls were **26 px tall**, under §6.1's
 * 44 px floor, and its accent-tinted panel and border were drawn outside the
 * token layer.
 *
 * ── It offers, it does not reveal ────────────────────────────────────────────
 *
 * This component names a venue the person typed themselves and shows nothing
 * else about it — no address, no map, no hint, and no state that says whether
 * an address exists. It did not before this conversion and it does not after:
 * an offer to fill in a profile is not a reveal path, and the reason it is
 * written down here is that the next reader will be tempted to enrich the
 * sentence with something the venue record knows.
 *
 * ── The row wraps below the actions ──────────────────────────────────────────
 *
 * `flex-wrap` is the one layout addition. At 390 px a sentence and two 44 px
 * pills do not fit on one line, and the incumbent's fixed row put the actions
 * off the edge at exactly the width RESP-03 is about.
 */

interface VenueProfilePromptProps {
  name: string;
  onCreateClick: () => void;
  onSkip: () => void;
}

export default function VenueProfilePrompt({
  name,
  onCreateClick,
  onSkip,
}: VenueProfilePromptProps) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink">
        Create a profile for <span className="font-semibold">{name}</span>?
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onCreateClick}>
          Create
        </Button>
        <Button size="sm" variant="secondary" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </Card>
  );
}
