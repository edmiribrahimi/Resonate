"use client";

import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/Chip";
import { Checkbox } from "@/components/ui/Checkbox";

import { formatCivilDate, UNREADABLE_DATE } from "./dates";
import type { CivilDate } from "@/lib/production/ics/vocabulary";

/**
 * One night's checklist: the editorial pieces **plus** the production steps.
 *
 * ── What the checklist is for, which is not what it looks like ───────────────
 *
 * It covers **what can make a date fail, not only what can be drawn** (D-44-14).
 * A night with every piece designed and no space confirmed in writing is not a
 * night that is nearly ready; it is a night that does not exist. A checklist
 * tracking only artwork would report that night as calm — which is the direction
 * that hides work, and the one this surface exists to close.
 *
 * So the five kinds are the pieces collapsed into one, and four production steps
 * beside them: the space confirmed in writing, the dj confirmed, the photo
 * arrived, and — where the space is an exhibition space — **its approval of the
 * material that names it**, which is a stage of production with its own duration
 * and sits *inside* the two days before the listing rather than after them
 * (`brand-visual-system.md`).
 *
 * ── Lateness is computed here, at render, and stored nowhere ─────────────────
 *
 * The predicate is `not ticked` **and** `due date before today`, and today's
 * civil date arrives as a prop from the server component: this file constructs
 * no instant and calls no locale formatter, because the pipeline is expressed in
 * weekdays and a conversion that crosses midnight moves a weekday.
 *
 * **There is no stored lateness column of any name, and its absence is the
 * decision.** A stored flag is only true at the moment it is written; keeping it
 * true would need a fifth nightly job in a project whose four existing jobs tell
 * nobody when they fail. That would give the checklist a way to be quietly wrong
 * in the one direction that matters — showing a night as on time while it is
 * late — and being able to see *late* from the list, without opening the night,
 * is the whole of D-44-15. Computed, the answer cannot rot: it is recomputed by
 * the act of asking.
 *
 * ── A tick warns, never blocks — and it is REVERSIBLE ────────────────────────
 *
 * Ticking raises no dialog, gates nothing and moves no focus (D-44-16). And a
 * tick can be undone; undoing it re-records the author.
 *
 * That is worth writing beside the code because **the wrong precedent is one
 * directory away**. This repository's nearest neighbours are all one-way
 * switches — a venue reveal that has been sent, a payment that has reached
 * completed, a series progressivo that has been spent — and none of their
 * reasoning travels here: *nothing leaves the building when somebody ticks a
 * box*, which is the property those three have and this one does not. The three
 * one-way switches `meta-gates.md` names are untouched by this phase, and a
 * fourth must not be borrowed onto this row. A tick that cannot be undone
 * becomes a lie the first time somebody clicks the wrong line, and a checklist
 * nobody trusts is a checklist nobody reads.
 *
 * ── Two failures, two sentences ─────────────────────────────────────────────
 *
 * *You may not do this* and *it did not save* are different facts with different
 * next steps, and they are never collapsed into one. The banned shape is the one
 * this repository has already paid for: the newsletter form that answers a
 * network fault, a missing key and an address already subscribed with a single
 * indistinguishable message. Every notice below is a `role="alert"` region and
 * carries its own words.
 *
 * A refusal that the surface does not recognise is **named**, never hidden —
 * `FormatsCatalogue`'s `default` arm applied here: an unexpected code appended to
 * the sentence is one more thing a person can act on, and swallowing it is how a
 * cause disappears without a log anybody reads.
 *
 * ── It renders and reports; it does not write ───────────────────────────────
 *
 * The act that records a tick is plan 44-12's. It arrives as {@link onTick},
 * which is why this file compiles and renders before the act exists — and why
 * the act's own refusal codes live with the act, mapped onto the two facts this
 * surface can state. Where the prop is absent the boxes are inert and **say so**:
 * a disabled control with no explanation is indistinguishable from a refusal,
 * and those are the two things §13.2 exists to keep apart.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The handler's contract — two facts, and a name for anything else
 * ──────────────────────────────────────────────────────────────────────────── */

/** The two facts this surface can state about a tick that did not happen. */
export type ChecklistRefusal = "not_permitted" | "not_saved";

/**
 * What {@link ChecklistTickHandler} answers.
 *
 * `unexpected` carries a code this surface does not recognise, so the caller's
 * union may grow without this file falling silently behind it: the sentence
 * stays one of the two, and the code is named beside it rather than dropped.
 */
export type ChecklistTickOutcome =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly refusal: ChecklistRefusal;
      readonly unexpected?: string;
    };

/** Supplied by the caller. Absent until the act that records a tick exists. */
export type ChecklistTickHandler = (
  itemId: string,
  ticked: boolean
) => Promise<ChecklistTickOutcome>;

/* ────────────────────────────────────────────────────────────────────────────
 * The row
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One thing that has to happen before a night can happen.
 *
 * `tickedOn` is a **civil date**, resolved from the stored instant by the server
 * component: a `timestamptz` read back arrives in UTC, and slicing its first ten
 * characters is the wrong day for two hours out of every twenty-four. This file
 * may not do that conversion and does not have the input to.
 */
export interface ChecklistItemView {
  readonly id: string;
  /** The item's own sentence, in production's words. */
  readonly label: string;
  /** Null where nothing in the product says what this step is anchored to. */
  readonly dueDate: CivilDate | null;
  readonly ticked: boolean;
  /** Who ticked it. Null where the record carries no name. */
  readonly tickedBy: string | null;
  /** When, as a civil day. Null where the stored instant would not read. */
  readonly tickedOn: CivilDate | null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The sentences — and each one appears exactly once
 * ──────────────────────────────────────────────────────────────────────────── */

const NOT_PERMITTED = "You do not have permission to change this checklist.";

const NOT_SAVED = "We could not save that tick. The item is unchanged.";

/**
 * What a row says where no due date is recorded.
 *
 * Four of the five kinds carry none, and the reason is a refusal rather than an
 * omission: the pipeline rules hold the **editorial** anchors and no others, so
 * a due date for *the space confirmed in writing* would have to be invented
 * here — a second rule table, disagreeing with the first the week somebody edits
 * one of them. `production-calendar.md` is explicit that the correct answer to
 * an undeclared coordinate is *not yet decided*.
 *
 * A sentence and not a blank: a blank cell reads as *fine*, and *fine* is
 * precisely the claim that cannot be made. The consequence is drawn rather than
 * hidden — an item with no due date can never read as late.
 */
const NO_DUE_DATE = "No date is recorded for this step";

/** Where the record ticked an item without naming who did it. */
const TICKER_NOT_NAMED = "somebody the record does not name";

/**
 * What the section says while the act that records a tick does not exist.
 *
 * Distinguishable from both refusals above on purpose: *the control is not here
 * yet* is a third fact, and rendering a disabled box in silence would let a
 * reader take it for the first of the two.
 */
const NOT_WRITABLE_YET =
  "This checklist is read-only for now. The boxes show what has already been ticked; the act that records a tick is not on this surface yet.";

const UNREADABLE_HEADING = "We could not read the checklist for this night";
const UNREADABLE_BODY = "Reload the page; nothing in the data has changed.";

/* ────────────────────────────────────────────────────────────────────────────
 * The shared shapes
 * ──────────────────────────────────────────────────────────────────────────── */

/** The label/data role of `44-UI-SPEC.md` §4, with the transform declared. */
const DATA_FACE = "font-mono text-xs font-semibold normal-case";

/** The body role at `--muted`. `--muted` on `--surface` is 6.78 : 1. */
const REASON = "text-sm text-muted";

/**
 * Turns an outcome into one of the two sentences, naming an unrecognised code
 * beside it rather than swallowing it.
 */
function describeRefusal(
  refusal: ChecklistRefusal,
  unexpected: string | undefined
): string {
  const sentence = refusal === "not_permitted" ? NOT_PERMITTED : NOT_SAVED;
  if (unexpected === undefined) return sentence;
  return `${sentence} The checklist refused this with "${unexpected}", which this surface does not expect.`;
}

function ChecklistRow({
  item,
  today,
  onTick,
}: {
  readonly item: ChecklistItemView;
  readonly today: CivilDate;
  readonly onTick?: ChecklistTickHandler;
}) {
  const [ticked, setTicked] = useState(item.ticked);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // D-44-15's predicate, evaluated at render and stored nowhere. The comparison
  // is between two `YYYY-MM-DD` strings, which are fixed-width and
  // most-significant-first, so string order is date order and nothing has to
  // build an instant to make it.
  const late = !ticked && item.dueDate !== null && item.dueDate < today;

  // The author line describes the RECORDED tick, so it is drawn only while the
  // box still agrees with what the server handed over. After a change of its
  // own the row knows the new state and not yet its author, and drawing the
  // previous author beside it would attribute an act to the wrong person.
  const showsAuthor = ticked && item.ticked;

  async function change(next: boolean) {
    if (onTick === undefined) return;

    setNotice(null);
    setPending(true);

    // Applied on success only. A box that flips and flips back has told the
    // reader something untrue for as long as the round trip took, and on this
    // surface the untrue thing is *this is done*.
    const outcome = await onTick(item.id, next);

    setPending(false);
    if (outcome.ok) {
      setTicked(next);
      return;
    }
    setNotice(describeRefusal(outcome.refusal, outcome.unexpected));
  }

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {/* A real checkbox, its label bound by `htmlFor` inside a 44 × 44 hit
            area — the primitive does both, and the label IS the hit area, so
            there is no state in which the target exists and the name does not.
            Ticking raises no dialog and moves no focus (D-44-16). */}
        <Checkbox
          id={`checklist-${item.id}`}
          label={item.label}
          checked={ticked}
          disabled={onTick === undefined || pending}
          readOnly={onTick === undefined}
          onChange={
            onTick === undefined
              ? undefined
              : (event) => {
                  void change(event.currentTarget.checked);
                }
          }
        />

        <span className="inline-flex flex-wrap items-center gap-2">
          {late ? <Badge tone="emphasis">Late</Badge> : null}
          {item.dueDate === null ? (
            <span className={REASON}>{NO_DUE_DATE}</span>
          ) : (
            <span
              className={`${DATA_FACE} ${late ? "text-ink" : "text-muted"}`}
            >
              {formatCivilDate(item.dueDate)}
            </span>
          )}
        </span>
      </div>

      {showsAuthor ? (
        <p className={`ms-12 mt-1 ${DATA_FACE} text-muted`}>
          Ticked by {item.tickedBy ?? TICKER_NOT_NAMED} ·{" "}
          {item.tickedOn === null
            ? UNREADABLE_DATE
            : formatCivilDate(item.tickedOn)}
        </p>
      ) : null}

      {notice === null ? null : (
        <p role="alert" className={`ms-12 mt-1 ${REASON}`}>
          {notice}
        </p>
      )}
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The section
 * ──────────────────────────────────────────────────────────────────────────── */

export function ChecklistSection({
  items,
  today,
  empty,
  onTick,
}: {
  /**
   * Already ordered by the caller. `null` means **the read did not answer**,
   * which is not a night that owes nothing.
   */
  readonly items: readonly ChecklistItemView[] | null;
  /** Today's civil date in Turin, resolved by the server component. */
  readonly today: CivilDate;
  /** Supplied by the caller: only the caller knows which emptiness this is. */
  readonly empty: ReactNode;
  /** Absent until the act that records a tick exists. */
  readonly onTick?: ChecklistTickHandler;
}) {
  if (items === null) {
    return (
      <div role="alert" className="py-6">
        <p className="text-base font-semibold text-ink">{UNREADABLE_HEADING}</p>
        <p className="mt-1 text-sm text-muted">{UNREADABLE_BODY}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="px-6 py-12 text-center">{empty}</div>;
  }

  return (
    <div>
      {onTick === undefined ? (
        <p className={`mb-4 ${REASON}`}>{NOT_WRITABLE_YET}</p>
      ) : null}

      <ul className="divide-y divide-line">
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            today={today}
            onTick={onTick}
          />
        ))}
      </ul>
    </div>
  );
}
