import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Chip";

import {
  ATTRIBUTE_KEY_LABELS,
  ATTRIBUTE_PROVENANCE_LABELS,
  ATTRIBUTE_VALUE_LABELS,
  type AttributeKey,
  type AttributeProvenance,
  type AttributeValue,
} from "@/lib/production/sections/vocabulary";

/**
 * The **only** renderer of a scouted attribute's value on this surface.
 *
 * > No other file under `src/app/(admin)/admin/location/` or
 * > `src/app/(admin)/admin/(work)/location/` may draw an attribute's value.
 * > Same single-renderer rule as `ScoreCell`, asserted by the same surface gate
 * > (plan 45-06), and for the same reason: a second renderer is a second place
 * > where an unanswered question can be drawn as an answer.
 *
 * One attribute, one value, one provenance. It receives three words and never a
 * row — no name, no address, no stage — so there is nothing here that could
 * name a space.
 *
 * ── `not_asked` IS A WORD, NEVER A BLANK, NEVER A DASH, NEVER A COLOUR ──────
 *
 * This is the whole reason the component exists rather than a `<td>` with a
 * string in it.
 *
 * **A blank cell and an unasked question are the same pixel** unless a component
 * refuses to let them be. And the refusal is not defensive programming against a
 * corner case: measured on the archive, the evening-viability attribute is
 * unanswered on **100 of 184 spaces**, so a surface that drew it blank would be
 * **reporting ignorance as a negative on most of the list** — and it would do it
 * on the question `venue-acquisition.md` names as the one that screens out the
 * most candidates.
 *
 * The label for that value is a sentence in the vocabulary rather than a dash,
 * and this component prints it as it is given. It also prints the fact in a
 * badge, so the row reads *unanswered* before it is read at all.
 *
 * ── The provenance is omitted for an unanswered question, deliberately ──────
 *
 * The provenance column is `NOT NULL`, so a value exists even where nobody has
 * asked — and *derived from the profile* printed beside *not asked yet* is a
 * claim about an answer that does not exist. So the word is drawn beside an
 * answer and only beside an answer. Nothing is drawn instead of it: the badge
 * and the sentence are already there, and there is no branch of this component
 * that produces nothing.
 *
 * ── The attribute names itself ──────────────────────────────────────────────
 *
 * The label is rendered in the cell and not left to a column header, because
 * this surface is read on a phone: a header scrolls off the top of a long list,
 * and the word *Good* detached from the question it answers is not an answer.
 * In a table on a wide screen it repeats the header, which is a smaller cost
 * than the one it buys.
 *
 * ── No hue carries any of this ──────────────────────────────────────────────
 *
 * Four graded values plus an unasked marker is the classic case for a colour
 * scale, and it is refused for the reason the stage badge already gives one
 * directory over: this tree's semantics name **states** — critical, caution,
 * information, completion — and grading a scouting answer against them would
 * settle in CSS what a telephone call settles. `derived` is also the majority
 * state here, and a caution on the majority becomes the page's background.
 *
 * Two channels instead: the ink register (`--ink` 16.41 : 1 for the answer,
 * `--muted` 6.78 : 1 for everything that qualifies it) and an adjacent word.
 */

/** The label/data role, with the transform declared. `uppercase` inherits. */
const ANSWER_FACE = "font-mono text-sm font-semibold normal-case text-ink";

/** The question this cell answers, recessed under the answer. */
const LABEL = "text-xs text-muted";

/** The body role for a sentence. `--muted` on `--surface` is 6.78 : 1. */
const SENTENCE = "text-sm text-muted";

function Cell({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex flex-col items-start gap-1">{children}</span>
  );
}

function Line({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {children}
    </span>
  );
}

export function AttributeCell({
  attribute,
  value,
  provenance,
}: {
  attribute: AttributeKey;
  value: AttributeValue;
  provenance: AttributeProvenance;
}) {
  if (value === "not_asked") {
    return (
      <Cell>
        <span className={LABEL}>{ATTRIBUTE_KEY_LABELS[attribute]}</span>
        <Line>
          <Badge>{ATTRIBUTE_VALUE_LABELS[value]}</Badge>
          <span className={SENTENCE}>Nobody has put the question.</span>
        </Line>
      </Cell>
    );
  }

  return (
    <Cell>
      <span className={LABEL}>{ATTRIBUTE_KEY_LABELS[attribute]}</span>
      <Line>
        <span className={ANSWER_FACE}>{ATTRIBUTE_VALUE_LABELS[value]}</span>
        <span className={SENTENCE}>
          {ATTRIBUTE_PROVENANCE_LABELS[provenance]}
        </span>
      </Line>
    </Cell>
  );
}
