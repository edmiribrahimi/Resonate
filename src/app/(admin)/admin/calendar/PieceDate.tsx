import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Chip";

import { formatCivilDate } from "./dates";
import type { CivilDate } from "@/lib/production/ics/vocabulary";

/**
 * The **only** renderer of a piece's date on this surface.
 *
 * > No other component under `src/app/(admin)/admin/calendar/` may render a
 * > piece's date. That is check U5 of `44-UI-SPEC.md` §15, and it is the
 * > premise every guarantee below rests on: a second renderer is a second place
 * > where a proposal can be drawn as a fact.
 *
 * *(A night's own date is a different thing and is not a piece's date. It comes
 * off the plan row, it is always written, and the list draws it with
 * `formatCivilDate` directly.)*
 *
 * ── The prop is a union, so a bare date is UNREPRESENTABLE ───────────────────
 *
 * `44-UI-SPEC.md` §7 calls this **the phase's highest-risk display decision**,
 * and rule 2 of its §0 is that a **proposed date must never read as settled**.
 * The four channels that keep it, in order of how early they act:
 *
 *   1. **Structure.** {@link PieceDateState} has exactly five variants and no
 *      sixth. Every one of them carries either an `origin` or an `unresolved`,
 *      so there is no shape of this prop that is a date with no provenance. The
 *      union mirrors the two CHECK constraints the phase's migration puts on
 *      `production_piece`, and it is the strongest available form of a rule:
 *      one that can only be kept by remembering it is not kept.
 *   2. **A dashed leading rule** on a proposal's row — `border-s-2
 *      border-dashed border-control` — so it reads as unfinished at the edge of
 *      vision, before a single word has been read.
 *   3. **The ink register.** A proposal is `--muted`, 6.78 : 1; a written date
 *      is `--ink`, 16.41 : 1. Two unmistakably different weights of presence,
 *      and both clear WCAG 1.4.3.
 *   4. **The word `Proposed`**, always adjacent to the date, never behind a
 *      hover, a tooltip or an icon — a tooltip is not a channel on a touch
 *      device.
 *
 * **None of the four is a hue, and that is deliberate.** `--sem-warn`'s
 * declared meaning is literally *a provisional state*, so a caution colour
 * looks like the obvious answer. It is refused because on this surface a
 * proposal is the **majority** case — every owed piece not yet written gets one
 * — and a caution applied to the majority stops being a caution and becomes the
 * page's background, at which point the two rows that genuinely need attention
 * are invisible. A proposal must **recede**, not shout (`44-UI-SPEC.md` §5.3).
 *
 * ── A written date that breaks the rule is drawn IDENTICALLY (D-44-10) ───────
 *
 * States 1 and 2 of §7 are the same pixels. This component has no notion of an
 * "exception", takes no flag saying whether a date follows its rule, and **must
 * not acquire one**. The database column that answers that question feeds the
 * divergence report of D-44-07 and reaches no pixel at all.
 *
 * That is the owner's decision and its cost was read and accepted: after three
 * months nobody can tell rule from exception on screen. It is written here
 * rather than smoothed over, because the next reader's instinct will be to add
 * the flag back as a kindness.
 *
 * ── Three reasons stay three sentences ───────────────────────────────────────
 *
 * `awaiting_next_edition`, `depends_on_lineup` and `not_derivable` are three
 * different facts with three different next steps, and one of them is *the rule
 * behaving correctly*. Collapsing them into one shared word is the collapsed-
 * `catch` shape this repository has already paid for once — the newsletter form
 * that answers a network fault, a missing key and a duplicate address with the
 * same sentence (`meta-gates.md`). So no shared word exists in this file, and
 * the check for its absence is a grep.
 *
 * **`awaiting_next_edition` is not an error and must not look like one.** An
 * edition with a listing and a timetable but no LiveCut and no after movie is
 * waiting for a night that is not in the calendar yet. Nothing here calls that
 * missing, late, incomplete or broken.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The union — five variants, no sixth
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Where a piece's date came from, or the one reason it has none.
 *
 * `edition` on the first unresolved variant is the sigla and number of the
 * night being waited for, taken from the data. It is required, because
 * *waiting* without saying *for what* is a gap by another name (D-44-12).
 */
export type PieceDateState =
  | { readonly origin: "file"; readonly date: CivilDate }
  | { readonly origin: "proposed"; readonly date: CivilDate }
  | { readonly unresolved: "awaiting_next_edition"; readonly edition: string }
  | { readonly unresolved: "depends_on_lineup" }
  | { readonly unresolved: "not_derivable" };

/**
 * `late` is the seventh state of §7 and it is an overlay, not a variant: a late
 * piece is a written or proposed one whose checklist item is past and unticked.
 * It adds a mark and changes **nothing** about the date's ink.
 */
export type PieceDateProps = PieceDateState & { readonly late?: boolean };

/* ────────────────────────────────────────────────────────────────────────────
 * The shared shapes — one class agreement, never a wrapper component
 * ──────────────────────────────────────────────────────────────────────────── */

/** The label/data role of `44-UI-SPEC.md` §4, with the transform declared. */
const DATA_FACE = "font-mono text-xs font-semibold normal-case";

/** The body role, for a reason sentence. `--muted` on `--surface` is 6.78 : 1. */
const REASON = "text-sm text-muted";

/**
 * The dashed leading rule, channel 2. It is on the row rather than on the date
 * so that it is legible at the edge of vision, which a character-height border
 * would not be.
 */
const UNFINISHED_EDGE = "border-s-2 border-dashed border-control ps-2";

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

/**
 * The late mark. `emphasis` means *look here first* and nothing else, and on
 * this surface exactly two facts earn it — this one and `Diverged`, which
 * belongs to the list rather than to a piece. There is no second `emphasis` in
 * this file and the check for that is a count.
 */
function LateMark() {
  return <Badge tone="emphasis">Late</Badge>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The component
 * ──────────────────────────────────────────────────────────────────────────── */

export function PieceDate(props: PieceDateProps) {
  const late = props.late === true;

  if ("origin" in props) {
    if (props.origin === "file") {
      // State 1, and state 2 with it. See the docblock: no flag, no difference.
      return (
        <Row>
          <span className={`${DATA_FACE} text-ink`}>
            {formatCivilDate(props.date)}
          </span>
          {late ? <LateMark /> : null}
        </Row>
      );
    }

    // State 3. Four channels, none of them a hue.
    return (
      <Row className={UNFINISHED_EDGE}>
        <Badge>Proposed</Badge>
        <span className={`${DATA_FACE} text-muted`}>
          {formatCivilDate(props.date)}
        </span>
        {late ? <LateMark /> : null}
      </Row>
    );
  }

  if (props.unresolved === "awaiting_next_edition") {
    // State 4. The rule behaving correctly, and it names what it is waiting for.
    return (
      <Row>
        <Badge>Waiting</Badge>
        <span className={REASON}>
          Waiting for{" "}
          <span className={`${DATA_FACE} text-muted`}>{props.edition}</span>
        </span>
        <span className={REASON}>The next edition is not in the calendar.</span>
      </Row>
    );
  }

  if (props.unresolved === "depends_on_lineup") {
    // State 5. No figure — not a count, not a zero, not an em-dash. How many
    // LiveCuts exist descends from how many people played, and three is not a
    // constant.
    return (
      <Row>
        <Badge>Waiting</Badge>
        <span className={REASON}>Depends on the line-up</span>
      </Row>
    );
  }

  // State 6. By rule, permanently: this listing's anticipation is not a fixed
  // number, so nothing may compute one.
  return (
    <Row>
      <Badge>No proposal</Badge>
      <span className={REASON}>
        This listing&apos;s anticipation is not a fixed rule, so nothing is
        proposed. Read it from the calendar.
      </span>
    </Row>
  );
}
