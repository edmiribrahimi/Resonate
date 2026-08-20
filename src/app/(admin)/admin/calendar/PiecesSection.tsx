import type { ReactNode } from "react";

import { PieceDate, type PieceDateState } from "./PieceDate";
import { PIECE_KIND_LABELS, type PieceKind } from "@/lib/production/ics/vocabulary";

/**
 * One night's editorial plan: every piece it owes, with its date or the reason
 * it has none.
 *
 * It receives one already-assembled array. It performs no read, holds no
 * database client and does no ordering of its own — it draws the sequence it is
 * handed, in the sequence it is handed, exactly as `CalendarList` does for S1.
 *
 * ── Every date goes through `PieceDate`, and through nothing else ────────────
 *
 * That is check U5 of `44-UI-SPEC.md` §15, and it is the premise every other
 * guarantee on this surface rests on. {@link PieceRowView} carries its date as a
 * {@link PieceDateState} — the five-variant union — and **not** as a string, so
 * this file has no bare date to render even if somebody wanted to draw one. A
 * second renderer is a second place where a proposal can be drawn as a fact, and
 * `44-UI-SPEC.md` §0 rule 2 makes *a proposal must never read as settled* the
 * phase's highest-risk display decision.
 *
 * There is therefore no call to a date formatter anywhere below.
 *
 * ── The owed set, and why a missing piece is not an absent one ───────────────
 *
 * A row here is an **owed** piece: the pipeline rules say the format owes it,
 * and the import writes a row for it whether or not the file carries one
 * (D-44-09b part 2). Without that, a piece nobody has written and a piece nobody
 * owes would look identical — a blank in both cases — and only one of the two is
 * work.
 *
 * Which is also why this section prints **no count of its own rows**. S1's cell
 * carries the tally; here the rows *are* the tally, and a second figure computed
 * a second way is a second thing to disagree with the first.
 *
 * ── `LiveCut`, and the other word ───────────────────────────────────────────
 *
 * The audio piece is a `LiveCut` — the recording of a set somebody played at one
 * of **our** nights, one per dj who played it. The other word names a different
 * thing that **does not exist yet**: a mix sent in by a selector who is in no
 * line-up. Drawn on a production surface beside real dates and real progressivi,
 * it reads as an announcement that the person will play, and it is not one
 * (D-44-22, `production-calendar.md`). It appears in no label, no comment, no
 * component name, no variable name and no string in this file, and the check for
 * its absence is a grep with nothing to find.
 *
 * ── A LiveCut is identified by its MARKER, never by a person ────────────────
 *
 * `PT1`, `PT2`, `PT3` — the label the file carries. {@link PieceRowView} has
 * **no field for an artist, a dj or any other name**, so the association cannot
 * be made here by accident or on purpose: associating a marker with a person
 * would be a guess, and a guess about a line-up drawn on a screen is a line-up
 * on a screen. The absent field is the guarantee; the sentence is only its
 * explanation (`production_commitment`'s absent columns, same device).
 *
 * ── Waiting is the rule behaving correctly ──────────────────────────────────
 *
 * A night with a listing and a timetable but no LiveCut and no after movie is
 * waiting for an edition that is not in the calendar yet. `PieceDate` draws
 * `Waiting for <edition>` and names it; **nothing on this surface calls that
 * state late, unfinished or a gap**, because it is none of those. The three
 * withheld reasons stay three sentences for the same reason they stay three
 * columns: each has a different next step, and one of them has no next step at
 * all.
 *
 * ── What is deliberately not drawn ──────────────────────────────────────────
 *
 * A date written in the file that differs from what its rule would have proposed
 * is drawn **identically** to one that matches (D-44-10). The stored column that
 * answers that question feeds the divergence report and reaches no pixel; this
 * file takes no flag carrying it, has no notion of an exception, and must not
 * acquire one. The next reader's instinct will be to add it back as a kindness.
 *
 * And nothing here says what a format **sounds** like. `RamaDub`, `MotionLab`
 * and `re:sonate` have no written manifesto, so no string, class name or comment
 * in this file may allude to one (`sound-manifesto.md`).
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The row — and the two fields it structurally cannot carry
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One owed piece, in the shape this section draws it.
 *
 * ⚠ **No name field and no bare date field, and both absences are deliberate.**
 * The first keeps a line-up off the screen; the second keeps a proposal from
 * being drawn as a fact. Neither may be added.
 */
export interface PieceRowView {
  readonly id: string;
  /** One of the six the pipeline produces. Drawn through `PIECE_KIND_LABELS`. */
  readonly kind: PieceKind;
  /** `PT1`, `PT2`, `PT3` — a marker the file carries, never a person. */
  readonly partMarker: string | null;
  /** The five-variant union of `44-UI-SPEC.md` §7. Never a string. */
  readonly state: PieceDateState;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The three sentences this section owns
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What a proposal **is**, said once and above the list (ICS-06).
 *
 * ⚠ **The counterpart of a mirror.** A proposal is not stored so it can be
 * looked up later: it is worked out again from the pipeline rules every time
 * the calendar is read in. So a row can change, or stop being there, with
 * nobody having touched it — and a change nobody announced is a change
 * somebody will later swear was never made. That is why the sentence exists at
 * all: `58-CONTEXT.md` admits the recomputation *«a patto che sia detto»*, and
 * this is where it is said.
 *
 * ── Where it deliberately is NOT ────────────────────────────────────────────
 *
 * Not on `PieceDate`. That component is the one renderer of a piece's date
 * (check U5) and it already carries the four channels that keep a proposal
 * from reading as settled — badge, dashed edge, muted ink, the adjacent word.
 * Repeating this sentence on every row would add a fifth channel that is pure
 * noise, and a caution repeated on the majority case is the exact failure §5.3
 * refuses. It goes **once**, above the list.
 *
 * ── And it does not raise its voice ─────────────────────────────────────────
 *
 * `REASON`, never `emphasis`. On this surface `emphasis` means *look here
 * first* and exactly two facts earn it — `Late` and `Diverged` (check U6). A
 * proposal is the majority case here, not an alarm: the sentence explains, it
 * does not summon.
 *
 * It names no format, no sigla and no brand (U8), and it carries no date and
 * builds none (U3). Check U11 asserts that it exists, that it is conditioned
 * on the rows, and that it spends no emphasis.
 */
const PROPOSALS_RECOMPUTED =
  "Rows marked Proposed are not decisions: they are worked out again every time the calendar is read in, so one can change or stop being there on its own.";

/**
 * Why this section may print no figure for the LiveCuts (D-44-13).
 *
 * How many episodes a night owes descends from **how many people played**, so
 * where the line-up is not recorded the owed total is itself unknown. Three is
 * not a constant: one archived edition carries two. So the sentence stands where
 * a count would have been, and no number is drawn beside it — not a `3`, not a
 * `0` and not an em-dash (`44-UI-SPEC.md` §8.5, OBS-03).
 *
 * *(Where a count ever does become knowable it comes from the structured
 * line-up on `party_credits`, and never from the communicated text the night
 * carries — the migration says outright that the latter is what was written for
 * the public, which is a different question from who actually played.)*
 */
const LINEUP_DEPENDENT = "LiveCuts depend on the line-up";

/**
 * What this section draws when the pieces could not be read at all.
 *
 * ⚠ **A failed read is not a night with no pieces**, and the two may not share a
 * rendering: one is a fault to reload, the other is a fact about the night. This
 * repository has already paid once for a single message covering every cause
 * (`meta-gates.md`, the newsletter precedent), and it has **no error tracking**,
 * so the sentence on the screen is the whole of the observable effect.
 */
const UNREADABLE_HEADING = "We could not read the pieces for this night";
const UNREADABLE_BODY =
  "Reload the page; nothing in the data has changed.";

/* ────────────────────────────────────────────────────────────────────────────
 * The shared shapes — a class agreement, never a wrapper component
 * ──────────────────────────────────────────────────────────────────────────── */

/** The body role. */
const KIND = "text-sm text-ink normal-case";

/**
 * The label/data role of `44-UI-SPEC.md` §4, with the transform declared.
 *
 * `normal-case` because `text-transform` inherits and `uppercase` appears in 43
 * files in this tree: *we did not add `uppercase`* is a hope about every
 * ancestor a caller might one day put above this, not a guarantee. A marker is
 * written the way the file writes it.
 */
const MARKER = "font-mono text-xs font-semibold normal-case text-muted";

/** The body role at `--muted`. `--muted` on `--surface` is 6.78 : 1. */
const REASON = "text-sm text-muted";

/* ────────────────────────────────────────────────────────────────────────────
 * The section
 * ──────────────────────────────────────────────────────────────────────────── */

export function PiecesSection({
  pieces,
  empty,
}: {
  /**
   * Already ordered by the caller — this component preserves what it is given.
   * `null` means **the read did not answer**, which is not an empty night.
   */
  readonly pieces: readonly PieceRowView[] | null;
  /**
   * Supplied by the caller because only the caller knows which emptiness this
   * is: *nothing is written for this night yet* and *we do not know what this
   * night owes* are two different facts with two different next steps.
   */
  readonly empty: ReactNode;
}) {
  if (pieces === null) {
    return (
      <div role="alert" className="py-6">
        <p className="text-base font-semibold text-ink">{UNREADABLE_HEADING}</p>
        <p className="mt-1 text-sm text-muted">{UNREADABLE_BODY}</p>
      </div>
    );
  }

  if (pieces.length === 0) {
    return <div className="px-6 py-12 text-center">{empty}</div>;
  }

  // Derived from the rows rather than passed in: it is a fact about what this
  // section is holding, and a prop would be a second place for it to be wrong.
  const lineupDependent = pieces.some(
    (piece) =>
      "unresolved" in piece.state &&
      piece.state.unresolved === "depends_on_lineup"
  );

  // Same device, same reason (ICS-06): whether this section is holding a
  // proposal is a fact about the rows in hand, so it is read off them. A prop
  // would let a caller say *no proposals here* over a list full of them, and
  // the sentence that is supposed to keep a recomputation honest would be the
  // thing hiding it.
  const proposalsHeld = pieces.some(
    (piece) => "origin" in piece.state && piece.state.origin === "proposed"
  );

  return (
    <div>
      {proposalsHeld || lineupDependent ? (
        <div className="mb-4 space-y-1">
          {proposalsHeld ? (
            <p className={REASON}>{PROPOSALS_RECOMPUTED}</p>
          ) : null}
          {lineupDependent ? <p className={REASON}>{LINEUP_DEPENDENT}</p> : null}
        </div>
      ) : null}

      <ul className="divide-y divide-line">
        {pieces.map((piece) => (
          <li
            key={piece.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
          >
            <span className={KIND}>
              {PIECE_KIND_LABELS[piece.kind]}
              {piece.partMarker === null ? null : (
                <span className={`ms-2 ${MARKER}`}>{piece.partMarker}</span>
              )}
            </span>

            {/* The one renderer of a piece's date. See the docblock: there is no
                second one on this surface, and this prop cannot be a bare date. */}
            <PieceDate {...piece.state} />
          </li>
        ))}
      </ul>
    </div>
  );
}
