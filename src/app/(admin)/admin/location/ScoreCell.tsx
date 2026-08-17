import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Chip";

import type { ScoreResult } from "@/lib/production/sections/score";
import { ATTRIBUTE_PROVENANCE_LABELS } from "@/lib/production/sections/vocabulary";

/**
 * The **only** renderer of a per-format score on this surface.
 *
 * > No other file under `src/app/(admin)/admin/location/` or
 * > `src/app/(admin)/admin/(work)/location/` may draw a score. That is the
 * > single-renderer rule `PieceDate.tsx:9-16` states for a piece's date and the
 * > surface gate of plan 45-06 asserts here, and it is the premise everything
 * > below rests on: a second renderer is a second place where a hypothesis can
 * > be drawn as a fact.
 *
 * ── The prop is the union, so a bare number is UNREPRESENTABLE ───────────────
 *
 * The single prop is {@link ScoreResult}, imported whole from the module that
 * computes it. There is no local prop type here, and in particular there is no
 * shape of this component's input that is a figure with no provenance beside
 * it. It is the strongest available form of a rule: one that can only be kept
 * by remembering it is not kept.
 *
 * That matters more here than it does for a date. `venue-acquisition.md`, gate
 * *derivato non è verificato*: a figure computed from a venue's public profile
 * is a **hypothesis**; one checked on the ground for that format is a **datum**.
 * Whoever reads this must be able to tell them apart — which is D-45-11's
 * second mitigation, and it is the reason the provenance travels in the same
 * value as the number rather than in a second prop a caller could forget.
 *
 * ── Four channels, and NONE of them is a hue ────────────────────────────────
 *
 *   1. **Structure.** The provenance word sits **beside** the number, on the
 *      same line, not under it and not behind a hover — a tooltip is not a
 *      channel on a touch device.
 *   2. **The ink register.** The figure is `--ink` (16.41 : 1); every word that
 *      qualifies it is `--muted` (6.78 : 1). Two unmistakably different weights
 *      of presence, both clearing WCAG 1.4.3, and both already measured in the
 *      token layer rather than chosen here.
 *   3. **A leading rule** on the three non-numeric variants, so the row reads as
 *      *not a number* at the edge of vision before a word has been read.
 *   4. **An adjacent word**, always — the provenance for a figure, a sentence
 *      for each variant that is not one.
 *
 * **The caution semantic is refused, and the refusal is argued rather than
 * assumed.** Its declared meaning is literally *a provisional state*, which
 * makes a caution colour look like the obvious answer for `derived`. It is
 * refused for the reason `PieceDate.tsx:42-48` gives about proposals and
 * `45-PATTERNS.md` §C3 carries over verbatim: **`derived` is the MAJORITY state
 * here** — 184 spaces scouted, nobody called — and a caution applied to the
 * majority stops being a caution and becomes the page's background, at which
 * point the handful of rows genuinely checked on the ground are the ones that
 * disappear. *(The token is named in words rather than spelled, so that the
 * grep asserting no hue on this surface stays honest at zero.)*
 *
 * ── Two leading rules, because a gap is not a decision ──────────────────────
 *
 * `weights_not_declared` and `not_enough_answered` are **dashed**: both are
 * unfinished, and a dashed edge is what unfinished looks like in this tree.
 * `out_of_identity` is **solid**: somebody decided it, and drawing a decision as
 * unfinished would be the collapse the union exists to prevent.
 *
 * ── Three variants, three sentences, and no shared word ─────────────────────
 *
 * *Nobody has written this format's weighting yet* is not *too few questions
 * have answers* is not *kept on the list and scored zero*. Three different facts
 * with three different next steps: write a weighting, make a telephone call, or
 * nothing at all — the third is a decision already taken and correctly recorded.
 *
 * The word sets of the three are **pairwise disjoint**, deliberately, because
 * the check for a shared word is a grep. Collapsing them into one shared phrase
 * would be the `catch` shape this repository has already paid for once — the
 * newsletter form answering a network fault, a missing key and a duplicate
 * address with the same sentence (`meta-gates.md`).
 *
 * ── What this cell does NOT print, and why ──────────────────────────────────
 *
 *   * **The format.** The union carries a format code only on the variant that
 *     has no weighting, and the code is internal — the column that holds these
 *     cells names the format, and a cell lifted out of that column has lost the
 *     only thing that makes its number mean anything. A score is read **per
 *     format, never as an absolute verdict on a place.**
 *   * **A numeral for `out_of_identity`.** The zero is said in words, because
 *     the union does not carry it as a number. So it cannot be sorted beside a
 *     computed one, averaged into anything, or mistaken for a low score: it is a
 *     space that was ruled out and **kept on the list rather than deleted**,
 *     which is what preserves the memory of the choice.
 *   * **A stage.** The stage belongs beside the space's name, wherever it is
 *     named, and it is what stops any of this reading as an availability. It is
 *     `StageBadge`'s job and not this component's.
 */

/** The label/data role, with the transform declared. `uppercase` inherits. */
const FIGURE_FACE = "font-mono text-base font-semibold normal-case text-ink";

/** The same face, recessed — for a count, which is data and not a verdict. */
const COUNT_FACE = "font-mono text-xs font-semibold normal-case text-muted";

/** The body role for a sentence. `--muted` on `--surface` is 6.78 : 1. */
const SENTENCE = "text-sm text-muted";

/** Unfinished: a gap that a weighting or a telephone call would close. */
const UNFINISHED_EDGE = "border-s-2 border-dashed border-control ps-2";

/** Decided: somebody ruled on this, and a decision is not a gap. */
const DECIDED_EDGE = "border-s-2 border-control ps-2";

function Row({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`.trimEnd()}
    >
      {children}
    </span>
  );
}

export function ScoreCell({ score }: { score: ScoreResult }) {
  if (score.kind === "score") {
    return (
      <Row>
        <span className={FIGURE_FACE}>{score.value.toFixed(1)}</span>
        <span className={SENTENCE}>
          {ATTRIBUTE_PROVENANCE_LABELS[score.provenance]}
        </span>
        <span className={COUNT_FACE}>
          {score.askedCount}/{score.totalCount} answered
        </span>
      </Row>
    );
  }

  if (score.kind === "weights_not_declared") {
    return (
      <Row className={UNFINISHED_EDGE}>
        <Badge>No weighting</Badge>
        <span className={SENTENCE}>
          Nobody has written this format&apos;s weighting yet.
        </span>
      </Row>
    );
  }

  if (score.kind === "not_enough_answered") {
    return (
      <Row className={UNFINISHED_EDGE}>
        <Badge>Too few answers</Badge>
        <span className={SENTENCE}>
          Too few questions have answers for a figure to mean anything.
        </span>
        <span className={COUNT_FACE}>
          {score.askedCount}/{score.totalCount} answered
        </span>
      </Row>
    );
  }

  return (
    <Row className={DECIDED_EDGE}>
      <Badge>Out of identity</Badge>
      <span className={SENTENCE}>
        Kept on the list, never deleted, and scored zero.
      </span>
    </Row>
  );
}
