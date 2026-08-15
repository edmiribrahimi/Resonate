"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/Chip";
import { FOCUS_RING } from "@/components/ui/Button";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";

import { StageBadge } from "./StageBadge";
import {
  formatCivilDate,
  formatCivilTimeRange,
  formatProgressivo,
} from "./dates";
import type {
  CivilDate,
  CivilTime,
  VenueStage,
} from "@/lib/production/ics/vocabulary";

/**
 * The calendar, in date order: the nights, and the days already taken.
 *
 * It receives one already-assembled array. It performs no read, holds no
 * database client, and does no ordering of its own — it draws the sequence it
 * is handed, in the sequence it is handed.
 *
 * ── One chronological list, and there is no second order ─────────────────────
 *
 * > **Sorting by format would hide the rotation, and making the rotation
 * > visible is D-44-08's whole purpose.**
 *
 * Which is why this list has no control that would re-order, narrow, look up or
 * page it. The four are named in `44-UI-SPEC.md` §8.1 and are deliberately
 * **not spelled in this file** — a mechanical check greps for them, and a grep
 * whose only match is the sentence forbidding the thing is a grep that gets
 * ignored the third time it goes red (`@/lib/production/ics/vocabulary` claim
 * (c), and `src/app/(admin)/admin/formats/actions.ts:58-63` before it).
 *
 * The measurement behind the refusal rather than a preference: the file holds
 * fourteen nights and nineteen external commitments. Thirty-three rows are one
 * page. A control added now would be a control with nothing to operate on, and
 * a default ordering control is how a chronological list quietly stops being
 * chronological.
 *
 * ── No format identification colour, and the reason is arithmetic ────────────
 *
 * `formats` carries an identification colour as data on a catalogue row, and a
 * dot in that colour down the format column would make the rotation scannable
 * at a glance. **The list draws none.** The token layer's caution semantic and
 * SunSet's identification colour are **the same hex value, literally** — the
 * two names and the value are set out in `40-UI-SPEC.md` Open Question 3, still
 * open, and are not repeated here because a mechanical check greps for them on
 * this surface. So a surface that draws a format's hue *and* needs a caution
 * mark has one colour meaning two things and no way for the reader to tell
 * which. This surface needs the caution mark (D-44-15), so it spends the hue on
 * the state and keeps the format in **text** — which is also the only channel a
 * person can read aloud (`44-UI-SPEC.md` §5.2).
 *
 * The cost is accepted rather than discovered: checking the rotation is reading
 * a column instead of scanning a stripe. Fourteen nights fit one screen, so the
 * column is readable without scrolling.
 *
 * ── Colour is never the only channel ─────────────────────────────────────────
 *
 * Remove every colour from this list and every fact it states survives: the
 * marks are words, the stage is a word, the withheld counts are sentences. That
 * is the test of `44-UI-SPEC.md` §14, and this surface passes it because §5.2
 * refused the one hue that would not have.
 *
 * ── Names are written as production writes them ──────────────────────────────
 *
 * `re:sonate` with a normal `e` — the reversed glyph lives only inside the logo
 * artwork and is never typed into a string, a label or a comment. Formats are
 * `SunSet`, `RamaDub`, `MotionLab`, `re:sonate`, CamelCase, rendered literally,
 * with `normal-case` declared on every element that carries one: the transform
 * inherits, `uppercase` appears in 43 files in this tree, and *we did not add
 * `uppercase`* is not a guarantee.
 *
 * The audio piece is `LiveCut`. The other word — a mix sent in by somebody who
 * is **not** in any line-up — names a different thing that does not exist yet,
 * and drawn beside real dates and real progressivi it reads as an announcement
 * that the person will play. It is in no label, no comment and no identifier
 * here (D-44-22).
 *
 * ── Divergence from `44-PATTERNS.md` §File Classification, stated ────────────
 *
 * PATTERNS lists `NightRow.tsx` and `CommitmentRow.tsx` as two separate files.
 * They are declared **inline here instead**, as two exported types plus their
 * cells. The structural guarantee below is what the two files were for, and it
 * holds identically either way. Said out loud so their absence is not read as
 * an omission.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The tally — three withholding rules, made unrepresentable-otherwise
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * How many of a night's owed pieces are written — or the reason no figure may
 * be drawn.
 *
 * A union rather than a nullable count, so that **there is no shape of this
 * value that prints a figure it does not have**. The two refusing variants
 * carry no numbers at all, which is stronger than a discipline of not reading
 * them (`44-UI-SPEC.md` §8.5, and OBS-03: a failed read is never rendered as a
 * legitimate value).
 */
export type PieceTally =
  | {
      readonly state: "counted";
      readonly written: number;
      readonly owed: number;
      /** In one of the three withheld states — never rolled into "missing". */
      readonly waiting: number;
    }
  /** How many episodes exist descends from how many people played. */
  | { readonly state: "lineup_dependent" }
  /** The count itself could not be read. Never a `0`, never an em-dash. */
  | { readonly state: "unreadable" };

/* ────────────────────────────────────────────────────────────────────────────
 * The two row shapes — and the one that is structurally incapable of a format
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One of our nights.
 *
 * `seriesName` is carried because a night's identity is its format **and** its
 * series, and because the venue segment of the title is the series' venue. It
 * is not drawn as its own column: `44-UI-SPEC.md` §8.2 declares six, and the
 * sigla already encodes the series on every row that has one.
 *
 * `lateCount` is nullable on purpose. `null` means *we could not count*, and
 * the mark then does not render at all — a `Late` badge with no real figure
 * beside it would be a made-up number on the one mark a person opens this page
 * for.
 */
export interface CalendarNightRow {
  readonly kind: "night";
  readonly id: string;
  readonly formatName: string;
  readonly seriesName: string | null;
  readonly venueWord: string | null;
  readonly venueStage: VenueStage | null;
  readonly sigla: string;
  readonly progressivo: number | null;
  readonly date: CivilDate;
  readonly announced: boolean;
  readonly diverged: boolean;
  readonly lateCount: number | null;
  readonly pieces: PieceTally;
}

/**
 * A day already taken by something that is not ours.
 *
 * > **This type has no format, no series, no sigla and no number — not
 * > optional, absent.**
 *
 * It mirrors the deliberately absent columns of the row it comes from, and it
 * is the difference between a rule and a guarantee: handing an external
 * commitment a format and a progressivo it does not have is the precise harm
 * D-44-18 names, and both of those values travel on to surfaces that name
 * formats. A rule can be forgotten by the next reader. A field that is not
 * there cannot be passed.
 *
 * It sits in the **same chronological list** as the nights, because the reason
 * it is in the calendar at all is so that a night is not scheduled against it —
 * and a separate section makes the collision invisible, which is the one thing
 * it exists to prevent. It is never counted in any figure this surface prints
 * about nights.
 */
export interface CalendarCommitmentRow {
  readonly kind: "commitment";
  readonly id: string;
  readonly title: string;
  readonly date: CivilDate;
  readonly startTime: CivilTime;
  readonly endTime: CivilTime;
}

/**
 * Where today falls, as a row of the same list.
 *
 * A marker inside the sequence rather than a boundary between two sequences: it
 * keeps past and future one continuous list, so the distance between the last
 * aired night and the next one is something you can see rather than something
 * you compute (`44-UI-SPEC.md` §8.1).
 *
 * **The one place this departs from §8.1's letter**, stated rather than
 * glossed: §8.1 asks for a full-width rule, and a row inside a table cannot
 * span its columns through `DataTable`'s column declaration. The rule is drawn
 * in the leading cell instead. The alternative — two tables with a rule between
 * them — would buy the full width by giving up the continuous list, which is
 * the property the marker exists for.
 */
export interface CalendarTodayRow {
  readonly kind: "today";
  readonly id: string;
}

export type CalendarRow =
  | CalendarNightRow
  | CalendarCommitmentRow
  | CalendarTodayRow;

/* ────────────────────────────────────────────────────────────────────────────
 * The cells
 * ──────────────────────────────────────────────────────────────────────────── */

/** The body role. `--muted` on `--surface` is 6.78 : 1. */
const REASON = "text-sm text-muted";

/** Every element that carries a format name, a sigla or the brand. */
const LITERAL = "normal-case";

/**
 * The in-text link, in the shape this product already writes it.
 *
 * Copied rather than invented: `admin/(work)/members/page.tsx:204` and
 * `admin/(work)/events/[id]/drinks/page.tsx:123` carry the same string, and
 * `MemberTable.tsx:1115` carries it on a button. Dotted underline, 4px offset,
 * `hover:text-ink`, and the tree's one focus expression — no new token, no new
 * class, and nothing about this that a reader has to learn.
 *
 * **`min-h-11` is deliberate and it makes the desktop rows taller.** 44px is a
 * floor, not a target, and it is keyed off nothing: `DataTable` hands a column
 * no way to tell which of its two trees it is rendering in, and the accessibility
 * contract forbids keying a touch target off width (`44-UI-SPEC.md` §14 — the
 * only permitted shrink is the primitive's own desktop row actions, an
 * allow-list closed at one item). So the phone card gets its 44px and the table
 * branch grows from 44px rows to 68px. That is the accepted cost, written here
 * rather than discovered by whoever wonders why the table loosened.
 *
 * The title sits in a child rather than directly on the anchor because the card
 * branch truncates its title (`DataTable.tsx:409-417`), and an atomic inline —
 * which an `inline-flex` anchor is — takes a clip where the ellipsis used to be.
 * A flex item that hides its overflow shrinks below its content, so the ellipsis
 * comes back. The transform is declared on that child, which is the element that
 * actually renders the literal.
 */
const ROW_LINK =
  `inline-flex min-h-11 max-w-full items-center underline decoration-dotted ` +
  `underline-offset-4 transition-colors hover:text-ink ${FOCUS_RING}`;

function nightTitle(row: CalendarNightRow): string {
  const head =
    row.venueWord === null
      ? row.formatName
      : `${row.formatName} x ${row.venueWord}`;
  return `${head} ${formatProgressivo(row.progressivo)}`;
}

/**
 * The four marks, and `emphasis` spent on two of them.
 *
 * `emphasis` means *look here first* and nothing else. **There is no `On time`
 * badge, no green tick column and no `Complete` mark**: the token layer's
 * semantic set contains no green and this phase does not invent one, and — more
 * to the point — a badge on every row is a badge on no row. No badge means
 * good.
 */
function NightMarks({ row }: { row: CalendarNightRow }): ReactNode {
  const late = row.lateCount;
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      {late !== null && late > 0 ? (
        <Badge tone="emphasis">{`Late ${late}`}</Badge>
      ) : null}
      {row.diverged ? <Badge tone="emphasis">Diverged</Badge> : null}
      {row.announced ? <Badge>Announced</Badge> : null}
    </span>
  );
}

function TallyCell({ tally }: { tally: PieceTally }): ReactNode {
  if (tally.state === "unreadable") {
    return <span className={REASON}>We could not count</span>;
  }
  if (tally.state === "lineup_dependent") {
    return <span className={REASON}>LiveCuts depend on the line-up</span>;
  }
  const written = `${tally.written} of ${tally.owed} written`;
  if (tally.waiting > 0) {
    return <span>{`${written} · ${tally.waiting} waiting`}</span>;
  }
  return <span>{written}</span>;
}

/**
 * The word `Today`, in the label role, between two rules.
 *
 * `tracking-widest` and the upper-casing belong to the label role this project
 * already uses for a section heading; the word is neither a format name nor the
 * brand, so no literal is being transformed.
 */
function TodayMarker(): ReactNode {
  return (
    <span className="flex items-center gap-3">
      <span aria-hidden="true" className="h-px w-6 bg-line-strong" />
      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
        Today
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The columns — one declaration, both branches
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Six columns from `44-UI-SPEC.md` §8.2, and a seventh.
 *
 * **The seventh is a stated addition, not a drift.** §8.6 requires the external
 * commitment to carry the sentence `Not a re:sonate production` on its row, and
 * none of the six has a card label under which that sentence would read
 * truthfully — `Pieces:` and `Sigla:` would both be labels that lie, and the
 * title and subtitle slots are truncated to one line on a phone, which would
 * drop the sentence at exactly the width where the card layout exists. So the
 * sentence gets a slot of its own, with no card label at all, empty on a night.
 */
const columns: readonly DataColumn<CalendarRow>[] = [
  {
    key: "night",
    header: "Night",
    card: "title",
    cell: (row) => {
      if (row.kind === "night") {
        /*
          THE ONLY DOOR TO THE NIGHT'S PAGE, AND IT WAS MISSING.

          `/admin/calendar/[id]` had its route entry, its policies and its page
          guard, and no way in: the staff tab registers the list alone, and this
          column drew text. Both of the phase's writes — the tick and the
          announcement — live on that page, so until this link existed they were
          reachable only by typing a uuid into the address bar.

          `Link`, never `Button` with an `href` (`44-UI-SPEC.md` §12): that
          branch renders a bare anchor with an untyped address.

          It renders on the night branch and on no other. A commitment is
          somebody else's evening — there is no plan row behind it to open, and
          `CalendarCommitmentRow` has no field that could address one. The
          today marker is a marker.
        */
        return (
          <Link href={`/admin/calendar/${row.id}`} className={ROW_LINK}>
            <span className={`${LITERAL} truncate`}>{nightTitle(row)}</span>
          </Link>
        );
      }
      if (row.kind === "commitment") {
        return <span className={`${LITERAL} text-muted`}>{row.title}</span>;
      }
      return <TodayMarker />;
    },
  },
  {
    key: "date",
    header: "Date",
    card: "subtitle",
    figure: true,
    cell: (row) => {
      if (row.kind === "night") return formatCivilDate(row.date);
      if (row.kind === "commitment") {
        return `${formatCivilDate(row.date)} · ${formatCivilTimeRange(
          row.startTime,
          row.endTime
        )}`;
      }
      return null;
    },
  },
  {
    key: "state",
    header: "State",
    card: "mark",
    cell: (row) => {
      if (row.kind === "night") return <NightMarks row={row} />;
      if (row.kind === "commitment") return <Badge>Day taken</Badge>;
      return null;
    },
  },
  {
    key: "sigla",
    header: "Sigla",
    card: "meta",
    figure: true,
    cell: (row) =>
      row.kind === "night" ? (
        <span className={LITERAL}>{row.sigla}</span>
      ) : null,
  },
  {
    key: "stage",
    header: "Venue stage",
    card: "meta",
    cell: (row) =>
      row.kind === "night" ? <StageBadge stage={row.venueStage} /> : null,
  },
  {
    key: "pieces",
    header: "Pieces",
    card: "meta",
    figure: true,
    cell: (row) =>
      row.kind === "night" ? <TallyCell tally={row.pieces} /> : null,
  },
  {
    key: "note",
    header: "Note",
    card: "meta",
    cardLabel: "",
    cell: (row) =>
      row.kind === "commitment" ? (
        <span className={`${LITERAL} ${REASON}`}>Not a re:sonate production</span>
      ) : null,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * The component
 * ──────────────────────────────────────────────────────────────────────────── */

export function CalendarList({
  rows,
  empty,
}: {
  /** Already ordered by the caller. This component preserves what it is given. */
  readonly rows: readonly CalendarRow[];
  /**
   * Supplied by the caller because only the caller knows which emptiness this
   * is. *The import has never run* and *the import ran and read no nights* are
   * two different facts with two different next steps, and a block of zeros
   * standing in for the first says the import ran (`44-UI-SPEC.md` §13.1).
   */
  readonly empty: ReactNode;
}) {
  return (
    <DataTable<CalendarRow>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      caption="The production calendar in date order: our nights, and the days already taken by something that is not ours."
      empty={empty}
    />
  );
}
