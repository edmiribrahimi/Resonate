"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/Chip";
import { FOCUS_RING } from "@/components/ui/Button";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";

import { SpaceName } from "@/app/(admin)/admin/location/SpaceName";

import {
  EXIT_REASON_LABELS,
  SIZE_BAND_LABELS,
  SPACE_CATEGORY_LABELS,
  type ExitReason,
  type SizeBand,
  type SpaceCategory,
  type VenueStage,
} from "@/lib/production/sections/vocabulary";

/**
 * The scouted spaces, grouped by how far each one has got.
 *
 * It receives one already-assembled, already-ordered array. It performs no
 * read, holds no database client, computes nothing and re-orders nothing — it
 * draws the sequence it is handed, in the sequence it is handed.
 *
 * ── Where the name-and-stage guarantee lives, and why it is not here ─────────
 *
 * Every name on this list is drawn by `SpaceName`, which renders the stage in
 * the same subtree and has no branch that does not. **The guarantee is in that
 * component rather than in this column declaration**, and the difference is the
 * one between a rule and a structure: a rule kept in a column has to be kept
 * again in the detail page, and again in whatever surface either of them grows.
 * `scripts/verify-section-surface.mjs` check A names that file as the only one
 * allowed to render a space's name, which is the same statement asserted
 * mechanically.
 *
 * ── This list is NOT ordered by anything computed, and that is a gate ────────
 *
 * > **`venue-acquisition.md`: *una classifica non è una disponibilità*.**
 *
 * A per-format score measures how well a space **would** suit a format. It says
 * nothing whatever about whether that space would host us — 184 spaces are
 * scouted and **nobody has been called**. A list ordered by a computed figure is
 * a ranking on the front page of the section, and the first row of a ranking
 * reads as a recommendation.
 *
 * So the caller orders by **stage**, then by name, and the scores live on the
 * detail page, one per format, each carrying its own provenance and the count of
 * questions that were actually answered. There is also no sort control, no
 * filter, no search and no pagination on this surface: a default ordering
 * control is how an ordered list quietly stops being ordered by the thing that
 * mattered.
 *
 * ── A band is not a capacity, and the two are drawn side by side on purpose ──
 *
 * `size_band` is what the archive knows; `real_capacity` is *how many people
 * actually fit*, which is the second of `venue-acquisition.md`'s four questions
 * and the one only somebody standing in the room can close. **Nothing here
 * derives one from the other.** They sit in adjacent columns precisely so the
 * difference is visible: a reader who saw only the band would answer the
 * capacity question with it, and the target for a night is 150 to 300 people —
 * a figure somebody would then repeat on a telephone call.
 *
 * **Measured, and it corrects `45-CONTEXT.md`, which says twice that the numeric
 * capacity is null on every record.** Plan 45-01 counted the scouting export
 * field by field: **38 of 184 records carry a number**, across twenty distinct
 * values, and the other 146 are empty. So *a capacity nobody has measured* is
 * the ordinary state and not the universal one, and this surface may not say
 * that no space has a capacity. The fourth member of the band vocabulary is not
 * a size either — `SIZE_BANDS` names it the unasked marker, and it is on 17 of
 * the 184 — so it is drawn as the distinct state it is and never as a small
 * band.
 *
 * ── A space that has left the race stays on the list ────────────────────────
 *
 * `venue-acquisition.md` puts it as a gate: a space discarded **because it
 * contradicts the identity** stays listed, at zero, and is never removed.
 * Deleting it loses the memory of the choice, and the choice then gets remade
 * from scratch at the first difficulty by somebody who was not in the room.
 * Hiding it loses the same thing more quietly, so there is no branch below that
 * drops a row: an exit is drawn as a mark on the row it belongs to.
 *
 * ⚠ **The exit reason is recorded on the SPACE while the domain reads
 * suitability per FORMAT.** Whoever writes *out of identity* is making a
 * per-format judgement in a space-wide column. That tension is declared by plan
 * 45-07 in `score.ts` and is **not resolved here**, because resolving it is a
 * schema decision. This column therefore draws the reason as what it is — a
 * recorded decision about the space — and never as a verdict about a format.
 *
 * ── The name and the address do not leave this render ────────────────────────
 *
 * A space's name may name a space under negotiation, and a negotiation made
 * public is a negotiation closed badly which does not un-publish. It travels
 * from the caller's props into a table cell and **nowhere else**: it is in no
 * `console.*`, no thrown message, no page title, no analytics call and no
 * `aria-label`. There is no diagnostic in this file at all.
 *
 * **The address is not on this list, at all, in any form.** It is not read by
 * the page that feeds this component and it is not a field of the row type
 * below, so it cannot be drawn here by accident — the same construction
 * `CalendarCommitmentRow` uses for the format it must never carry. A street
 * address with a house number belongs in ONE place on the detail page, and a
 * list is a thing people screenshot.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The row — and the two fields it deliberately does not have
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One scouted space, in the shape this list draws it.
 *
 * > **This type has no address and no computed score — not optional, absent.**
 *
 * Both are the difference between a rule and a guarantee. A rule about what a
 * list may draw can be forgotten by the next reader; a field that is not there
 * cannot be passed. The address is the payload `venue_for_parties` exists to
 * release deliberately, per night; a score beside a name reads as *this place is
 * possible*, and it would be saying it about desk work.
 */
export interface SpaceRow {
  readonly id: string;
  /** ⚠ Internal, never public. May name a space under negotiation. */
  readonly name: string;
  /** Never null on this table: entering the list IS the mapping. */
  readonly stage: VenueStage;
  readonly category: SpaceCategory | null;
  /** What the archive knows. ⚠ Never read as an answer to the one below. */
  readonly sizeBand: SizeBand | null;
  /** How many people actually fit. `null` on the ordinary row. */
  readonly realCapacity: number | null;
  /** Why it left the race, or `null` while it is still in it. */
  readonly exitReason: ExitReason | null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The sentences, each naming one fact and no other
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What the capacity column reads where nobody has obtained the answer.
 *
 * *Measured* rather than *asked*, and the word is chosen: the band beside it
 * already says *not asked yet* for its own unasked marker, and two adjacent
 * cells reading the same sentence about two different questions is how a reader
 * concludes they are one question. This one is closed by somebody standing in
 * the room, not by a telephone call.
 */
const CAPACITY_NOT_MEASURED = "Capacity not measured";

/** What the band column reads where the archive holds no band at all. */
const BAND_NOT_RECORDED = "No band recorded";

/** What the category column reads where the archive holds no category. */
const CATEGORY_NOT_RECORDED = "Category not recorded";

/** The mark on a row whose space has left the race. */
const LEFT_THE_RACE = "Left the race";

/* ────────────────────────────────────────────────────────────────────────────
 * The cells
 * ──────────────────────────────────────────────────────────────────────────── */

/** The body role. `--muted` on `--surface` is 6.78 : 1. */
const REASON = "text-sm text-muted";

/** The label/data face, with the transform declared. */
const FIGURE_FACE = "font-mono text-sm font-semibold normal-case text-ink";

/**
 * The in-text link, in the shape this product already writes it.
 *
 * Copied rather than invented: `CalendarList.tsx:244-246` carries the same
 * string, and it carries it for the reasons written there — `min-h-11` is the
 * 44px floor the accessibility contract sets, and the name sits in a child so
 * the card branch keeps its ellipsis instead of taking a clip.
 */
const ROW_LINK =
  `inline-flex min-h-11 max-w-full items-center underline decoration-dotted ` +
  `underline-offset-4 transition-colors hover:text-ink ${FOCUS_RING}`;

/**
 * The four questions and the ten attributes are not on this list, so a space's
 * capacity is drawn as a figure or as the sentence that says nobody measured it.
 *
 * **Never a zero and never a dash.** A dash is what a blank looks like, and a
 * blank and an unmeasured room are the same pixel unless something refuses to
 * let them be.
 */
function CapacityCell({ capacity }: { capacity: number | null }): ReactNode {
  if (capacity === null) {
    return <span className={REASON}>{CAPACITY_NOT_MEASURED}</span>;
  }
  return <span className={FIGURE_FACE}>{capacity}</span>;
}

/**
 * The band, with its unasked marker drawn as the distinct state it is.
 *
 * The vocabulary's fourth member is **not a small band** — it is the marker for
 * a question nobody put — and its label is already a sentence rather than a
 * word, which is what stops it sorting into the sizes in a reader's head.
 */
function BandCell({ band }: { band: SizeBand | null }): ReactNode {
  if (band === null) {
    return <span className={REASON}>{BAND_NOT_RECORDED}</span>;
  }
  if (band === "not_asked") {
    return <Badge>{SIZE_BAND_LABELS[band]}</Badge>;
  }
  return <span className={FIGURE_FACE}>{SIZE_BAND_LABELS[band]}</span>;
}

function CategoryCell({
  category,
}: {
  category: SpaceCategory | null;
}): ReactNode {
  if (category === null) {
    return <span className={REASON}>{CATEGORY_NOT_RECORDED}</span>;
  }
  return <span className="normal-case">{SPACE_CATEGORY_LABELS[category]}</span>;
}

/**
 * The mark for a space that left the race, and the empty fragment for one that
 * has not.
 *
 * `emphasis` means *look here first* and nothing else — there is no mark for a
 * space still in the race, because a badge on every row is a badge on no row.
 * The reason is drawn as a word beside the mark: *left the race* without saying
 * why is the deletion this table exists to prevent, performed in the render.
 */
function ExitCell({ reason }: { reason: ExitReason | null }): ReactNode {
  if (reason === null) {
    return <></>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge tone="emphasis">{LEFT_THE_RACE}</Badge>
      <span className={REASON}>{EXIT_REASON_LABELS[reason]}</span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The columns — one declaration, both branches
 * ──────────────────────────────────────────────────────────────────────────── */

const columns: readonly DataColumn<SpaceRow>[] = [
  {
    key: "space",
    header: "Space",
    card: "title",
    cell: (row) => (
      /*
        THE ONLY DOOR TO A SPACE'S PAGE.

        No tab registers this section — that is plan 45-18 — so without this
        link the detail would be reachable only by typing a uuid into the
        address bar. That is the defect the calendar surface had to repair after
        the fact, and it is repaired here in the commit that created the
        destination.

        ⚠ **It could not be written one commit earlier**, and the reason is the
        assertion working rather than an oversight: `typedRoutes` puts a dynamic
        address into the generated `Route` union only once a `page.tsx` serves
        it, so this `Link` was a COMPILE ERROR while `[id]/page.tsx` was not on
        disk. The tree has no way to point at an address that does not exist.

        `Link`, never `Button` with an `href` (`44-UI-SPEC.md` §12): that branch
        renders a bare anchor with an untyped address.
      */
      <Link href={`/admin/location/${row.id}`} className={ROW_LINK}>
        <span className="truncate">
          <SpaceName name={row.name} stage={row.stage} />
        </span>
      </Link>
    ),
  },
  {
    key: "category",
    header: "Category",
    card: "subtitle",
    cell: (row) => <CategoryCell category={row.category} />,
  },
  {
    key: "band",
    header: "Size band",
    card: "meta",
    cell: (row) => <BandCell band={row.sizeBand} />,
  },
  {
    key: "capacity",
    header: "Real capacity",
    card: "meta",
    figure: true,
    cell: (row) => <CapacityCell capacity={row.realCapacity} />,
  },
  {
    key: "exit",
    header: "Exit",
    card: "mark",
    cell: (row) => <ExitCell reason={row.exitReason} />,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * The component
 * ──────────────────────────────────────────────────────────────────────────── */

export function SpaceList({
  rows,
  empty,
}: {
  /** Already ordered by the caller. This component preserves what it is given. */
  readonly rows: readonly SpaceRow[];
  /**
   * Supplied by the caller, because only the caller knows which emptiness this
   * is. *The scouting has never been imported* and *we could not read the list*
   * are two different facts with two different next steps, and a surface that
   * drew them the same way would be the silent failure with a neutral face this
   * project has already paid for once.
   */
  readonly empty: ReactNode;
}) {
  return (
    <DataTable<SpaceRow>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      caption="The scouted spaces, grouped by how far each one has got. A stage is not an availability: nobody has been called."
      empty={empty}
    />
  );
}
