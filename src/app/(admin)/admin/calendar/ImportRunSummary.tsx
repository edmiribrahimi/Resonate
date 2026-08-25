import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";
import { turinWallClock } from "@/utils/datetime";

import { formatCivilDate, isCivilDate, isCivilTime } from "./dates";
import type { CalendarKey, EntryClass } from "@/lib/production/ics/vocabulary";

/**
 * What the last mirror actually did, **for each calendar** — this phase's answer
 * to having no monitoring.
 *
 * ── Why this is a block on a page and not a page of its own ─────────────────
 *
 * There is **no error tracking in this repository**. `package.json` carries no
 * monitoring dependency, so no production failure reaches a human on its own:
 * the crons run at night and nobody is told when they fail. Under that
 * constraint *the error is logged* is not a mitigation, because a log is a place
 * nobody looks (`meta-gates.md`, §Controllo zero fallimenti silenziosi). A
 * failure that counts needs an **observable effect**.
 *
 * This block is that effect, which is why it renders **at the foot of the
 * calendar and never behind a click**. An import summary behind a second click
 * is a log with a nicer font: it is seen by whoever already suspects something,
 * which is exactly the person who did not need telling. It renders on every
 * visit, whether or not anything went wrong.
 *
 * ── ⚠ ONE BLOCK PER CALENDAR, AND THREE STATES EACH (`ICS-10`, guard b) ─────
 *
 * Since `ICS-02` the rows of this project belong to one of three calendars, and
 * since plan 58-12 a process nobody is watching writes them. `ICS-10` guard (b)
 * is what makes that acceptable: *the outcome and the time of the last
 * successful mirror **per key**, on a surface, with a failure **distinguishable**
 * from «it has not run yet»*. A single most-recent run answered for whichever
 * calendar happened to be last and said nothing at all about the other two —
 * which is the same shape as a zero standing in for a measurement.
 *
 * The three states, and none of them is a default of another:
 *
 *  1. **It ran and finished** — the tallies, and the instant it finished.
 *  2. **It began and did not finish** — the tallies it managed, and the instant
 *     it began. A run with no finish is not a tidy row to be back-filled: it IS
 *     the observation, and it is the state the recovery procedure is written for.
 *  3. **It has not run yet** — a sentence, and **no tallies at all**. A block of
 *     zeros says the mirror ran and found nothing. It did not run.
 *
 * ── ⚠ WHAT THIS BLOCK CANNOT SAY, WRITTEN DOWN RATHER THAN LEFT TO BE FOUND ──
 *
 * **A refusal leaves no row here.** Every gate that stops the mirror before the
 * first removal — an unreachable source, an empty feed, a feed below the shrink
 * floor, a progressivo that moved, a decision an unwatched run may not risk —
 * refuses *before* the register row is opened, on purpose: nothing was written,
 * so nothing is recorded as having been. What that costs is exactly this: a
 * calendar refusing every night looks, from here, like a calendar whose last
 * success is simply getting older.
 *
 * So **the instant is the thing to read on this block**, not the tallies. A
 * calendar the unwatched process mirrors daily whose last success is a week old
 * is a calendar that has been refusing for a week. The other half of that
 * signal is the cron's own status, which is non-2xx on a refusal precisely so
 * the platform paints the run red — see `src/app/api/cron/production-mirror/route.ts`.
 *
 * ── Four rules, none of them optional ───────────────────────────────────────
 *
 *  1. **Every tally is a real count or a sentence saying it could not be read.**
 *     Never `0` standing in for *we did not measure*, and never an em-dash
 *     (OBS-03). `0 unclassified` and *we could not count the unclassified* are
 *     different facts with different next steps, and a zero is the more
 *     reassuring of the two — which is precisely why it may not be borrowed.
 *  2. **`N unclassified` is drawn as prominently as every other tally**, never
 *     behind a disclosure. Entries the grammars do not describe must be seen and
 *     counted, never guessed: a count nobody sees is a guess with extra steps,
 *     and the guess would hand an entry a format and a progressivo it does not
 *     have (D-44-18, D-44-20).
 *  3. **Unclassified and divergent detail carries UIDs and reason codes, never a
 *     title.** An entry's title is an unannounced date, a space under
 *     negotiation, or a line-up. These lines are read by whoever is debugging an
 *     import, which means they reach a terminal, a screenshot and — the
 *     irreversible one — a document under `.planning/`, which is tracked and
 *     public. **The props below carry no field for a title at all**: the same
 *     device the commitment row uses, because a rule is a sentence somebody has
 *     to remember and an absent field is a guarantee.
 *  4. **`unclassified`, `divergence` and `unsupported recurrence` are three
 *     tallies, and there is no fourth figure summing them.** Three findings,
 *     three repairs. One number covering all three is the `catch` block that
 *     swallows every cause, which this project has already paid for once — the
 *     newsletter's *"Qualcosa è andato storto"*, which made a network fault, a
 *     missing key and a duplicate address indistinguishable.
 *
 *     The word such a figure would be given is **not written in this file, not
 *     even in order to forbid it**, and neither is the name of the control that
 *     would hide the unclassified count. A mechanical check greps for both, and a
 *     grep whose only match is the sentence forbidding the thing is a grep that
 *     gets ignored the third time it goes red — the discipline `CalendarList.tsx`
 *     and `dates.ts` already keep for the four date literals, and
 *     `formats/actions.ts:58-63` before them.
 *
 * ── ⚠ AND STILL NO LOADING CONTROL ON THIS SURFACE ─────────────────────────
 *
 * `D-58-07` reversed **half** of `D-44-26`: a calendar may now transit a server,
 * on the cron's path and nowhere else. The other half stands. There is no file
 * input here, no drop target, no Server Action receiving a calendar, and none
 * may be added — `44-UI-SPEC.md` §11.3 and check **U2** of
 * `scripts/verify-calendar-surface.mjs` are unchanged by that decision. The
 * empty state below goes on explaining the absence, because a missing button
 * reads as an unfinished feature and somebody eventually builds it.
 *
 * ── The calendar key may be shown, and nothing beside it may ────────────────
 *
 * A calendar key is a **format sigla**, and the migration that created the
 * closed vocabulary calls those publishable. No venue name, no date and no
 * line-up appears on this block, ever.
 *
 * ── No instant is constructed here ──────────────────────────────────────────
 *
 * A run's timestamp is a real point in time, unlike every other date on this
 * surface, so it is the one value that needs a zone. It is resolved by
 * `turinWallClock` in `@/utils/datetime` — the module `time-and-scheduling.md`
 * declares as the single home of a time boundary — and comes back as a civil day
 * and an `HH:MM`, which this file then draws through the phase's own formatter.
 * Nothing here builds a date, calls a locale formatter or reads a zone.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The props — and what they structurally cannot carry
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One finding, as it may be drawn.
 *
 * ⚠ **A uid and a reason code, and no third field.** There is no `title`, no
 * `summary`, no `date` and no `venue_word` on this type, and none may be added:
 * a uid names nothing to anybody outside the file, and every other candidate
 * names something that has not been announced. Rule 3 above, made
 * unrepresentable-otherwise rather than merely written down.
 */
export interface ImportFinding {
  readonly source_uid: string;
  readonly reason: string;
}

/**
 * What one run did, in the shape this block draws it.
 *
 * Every count is `number | null`, and the `null` is load-bearing: it means *this
 * figure could not be read*, and it is drawn as a sentence rather than as a zero.
 * A non-nullable count would have made rule 1 a discipline instead of a shape.
 */
export interface ImportRun {
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly entriesSeen: number | null;
  readonly entriesByClass: Partial<Record<EntryClass, number>> | null;
  readonly unclassifiedCount: number | null;
  readonly divergences: readonly ImportFinding[] | null;
  readonly unsupportedRecurrences: readonly ImportFinding[] | null;
  readonly dryRun: boolean;
}

/**
 * One calendar and the last run recorded for it.
 *
 * ⚠ **`run === null` is a state and not a missing value.** It means *no run of
 * this calendar has ever been recorded*, and the block draws a sentence for it
 * rather than a row of zeros. The caller is the only place that can tell the two
 * apart, because only the caller knows whether the read succeeded — which is why
 * a failed read never arrives here at all.
 */
export interface CalendarMirrorState {
  readonly calendarKey: CalendarKey;
  readonly run: ImportRun | null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The one sentence that stands in for a figure
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `44-UI-SPEC.md` §13.2, last row — *never `0`, never `—`*.
 *
 * The same words `CalendarList` already draws in its piece-count cell, and the
 * sameness is deliberate: one sentence for one fact across the surface, so a
 * reader who has learnt what it means on a row does not have to learn it again at
 * the foot of the page.
 */
const COULD_NOT_COUNT = "We could not count";

/** The body role at `--muted`. `--muted` on `--surface` is 6.78 : 1. */
const REASON = "text-sm text-muted";

/* ────────────────────────────────────────────────────────────────────────────
 * The cells
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One tally: a real count with its noun, or the sentence.
 *
 * The noun is passed already agreed with its figure, because English pluralises
 * three of these seven irregularly enough that deriving it would be a rule with
 * exceptions, and a wrong plural on a diagnostic surface reads as a surface
 * nobody maintains.
 */
function Tally({
  count,
  label,
}: {
  readonly count: number | null;
  readonly label: (n: number) => string;
}): ReactNode {
  if (count === null) {
    return <span className={REASON}>{COULD_NOT_COUNT}</span>;
  }
  return <span className="text-sm text-ink">{label(count)}</span>;
}

/**
 * The findings, listed by uid and reason code.
 *
 * **Not behind a disclosure**, and the absence of one is rule 2 rather than a
 * layout preference: the whole reason these rows exist is that somebody has to
 * see them. Where there are none, nothing renders — an empty list under a heading
 * is a heading that trains a reader to skip the region.
 */
function Findings({
  heading,
  findings,
}: {
  readonly heading: string;
  readonly findings: readonly ImportFinding[] | null;
}): ReactNode {
  if (findings === null || findings.length === 0) return null;

  return (
    <div>
      <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-muted">
        {heading}
      </p>
      <ul className="space-y-1">
        {findings.map((finding) => (
          <li
            key={`${finding.source_uid}:${finding.reason}`}
            className={`font-mono ${REASON}`}
          >
            {/* The uid and the reason code, and nothing else — see rule 3. */}
            {finding.source_uid} · {finding.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * An instant, as a Turin wall clock.
 *
 * Two failures get two answers, neither of them a plausible-looking substitute:
 * a timestamp that will not parse, and one that parses into parts the phase's own
 * formatters refuse. Both draw the same sentence as an unreadable count, because
 * both are the same fact — *we could not read this* — and this surface has one
 * way of saying it.
 *
 * ⚠ **The caller chooses WHICH instant**, and the choice carries meaning: a run
 * that finished is stamped with the instant it finished, a run that did not is
 * stamped with the instant it began. Passing the same field for both would have
 * made the two states look alike in the one place they differ most.
 */
function RunInstant({ instant }: { readonly instant: string }): ReactNode {
  const wall = turinWallClock(instant);
  if (wall === null || !isCivilDate(wall.date) || !isCivilTime(wall.time)) {
    return <span className={REASON}>{COULD_NOT_COUNT}</span>;
  }
  return (
    <span className={REASON}>
      {formatCivilDate(wall.date)}, {wall.time}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The three states of one calendar
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * State 3: nothing has ever been recorded for this calendar.
 *
 * ⚠ **No tallies.** A block of zeros says the mirror ran and found nothing, and
 * it did not run. The pattern is the one the page already keeps for its own
 * empty state (`44-UI-SPEC.md` §13.1), reused here rather than reinvented.
 */
function NeverMirrored(): ReactNode {
  return (
    <p className={REASON}>
      This calendar has never been mirrored. No run has been recorded for it, so
      there is nothing to count — which is a different fact from a run that
      counted nothing.
    </p>
  );
}

/**
 * States 1 and 2: a run exists, and it either finished or it did not.
 *
 * The two are told apart by the instant that is drawn and by the badge, and
 * never by the tallies alone: a run that stopped partway has real counts up to
 * the point it stopped, and reading those as a completed mirror is exactly the
 * misreading this block exists to prevent.
 */
function RecordedRun({ run }: { readonly run: ImportRun }): ReactNode {
  const byClass = run.entriesByClass;
  const countOf = (entryClass: EntryClass): number | null =>
    byClass === null ? null : byClass[entryClass] ?? null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Tally count={run.entriesSeen} label={(n) => `${n} entries read`} />
        <Tally
          count={countOf("night")}
          label={(n) => (n === 1 ? "1 night" : `${n} nights`)}
        />
        <Tally
          count={countOf("piece")}
          label={(n) => (n === 1 ? "1 piece" : `${n} pieces`)}
        />
        <Tally
          count={countOf("commitment")}
          label={(n) => (n === 1 ? "1 day taken" : `${n} days taken`)}
        />
        {/*
          The unclassified count is read from its OWN column and not from the
          breakdown above, which is how the migration stores it and why: *this is
          the number a person is meant to look at, and a figure buried inside a
          jsonb blob is a figure nobody reads.* It is drawn in the same row, at
          the same size, as every other tally — rule 2.
        */}
        <Tally
          count={run.unclassifiedCount}
          label={(n) => `${n} unclassified`}
        />
        {/*
          Three findings, three tallies, and no fourth figure summing them.
          Adding them would be arithmetic that destroys information: an
          unclassified entry, a divergent number and a recurrence nobody expanded
          are repaired by three different people doing three different things —
          rule 4.
        */}
        <Tally
          count={run.divergences === null ? null : run.divergences.length}
          label={(n) => (n === 1 ? "1 divergence" : `${n} divergences`)}
        />
        <Tally
          count={
            run.unsupportedRecurrences === null
              ? null
              : run.unsupportedRecurrences.length
          }
          label={(n) =>
            n === 1 ? "1 unsupported recurrence" : `${n} unsupported recurrences`
          }
        />

        {/*
          A dry run produced a plan and applied none of it, so its tallies
          describe what WOULD have happened. Drawn rather than left to be
          inferred: the block's whole job is saying what the calendar's rows came
          from, and *they did not come from this run* is the most important thing
          it could say.
        */}
        {run.dryRun ? <Badge>Dry run</Badge> : null}

        {/*
          A run with no finish is not a tidy row to be back-filled: it is the
          observation. Either the mirror is still going or it stopped without
          saying so, and both are things a person looking at this block needs to
          know before trusting the figures above it.

          A NEUTRAL badge, and the restraint is the contract's rather than a
          preference: §5.3 spends the emphasis fill on `Late N` and `Diverged`
          and on nothing else, and a third claim on it would leave three marks
          saying *look here first*, which is the same as none of them saying it.
          The fact survives without the fill, because it is a word (§14).
        */}
        {run.finishedAt === null ? <Badge>Did not finish</Badge> : null}
      </div>

      <p className="mt-2">
        {/*
          The finish for a run that finished, the start for one that did not.
          Two states, two instants, and neither borrows the other's.
        */}
        {run.finishedAt === null ? (
          <RunInstant instant={run.startedAt} />
        ) : (
          <RunInstant instant={run.finishedAt} />
        )}
      </p>

      <div className="mt-4 space-y-3">
        <Findings heading="Divergences" findings={run.divergences} />
        <Findings
          heading="Unsupported recurrences"
          findings={run.unsupportedRecurrences}
        />
      </div>
    </>
  );
}

/** One calendar: its key, then whichever of the three states it is in. */
function CalendarState({ state }: { readonly state: CalendarMirrorState }): ReactNode {
  return (
    <section>
      {/*
        A calendar key is a format sigla and is publishable. It is drawn as
        written — lower case, as the closed vocabulary and the column spell it —
        rather than transformed into something that would read as a claim about
        how the sigla is printed on a poster.
      */}
      <p className="mb-1 font-mono text-xs font-semibold tracking-widest text-muted">
        {state.calendarKey}
      </p>
      {state.run === null ? <NeverMirrored /> : <RecordedRun run={state.run} />}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The block
 * ──────────────────────────────────────────────────────────────────────────── */

export function ImportRunSummary({
  states,
}: {
  /**
   * One entry per calendar key, in the order of the closed vocabulary.
   *
   * ⚠ **A calendar with no recorded run is still an entry**, carrying a `null`
   * run. Leaving it out would have made *never mirrored* and *not a calendar of
   * this project* the same absence on the screen, which is the third answer
   * arriving dressed as one of the other two.
   */
  readonly states: readonly CalendarMirrorState[];
}) {
  // An empty array means the caller has no calendars to describe at all, which
  // is not a state this surface has a sentence for. It is not the same as a
  // calendar that has never run, and it is not drawn as one.
  if (states.length === 0) return null;

  return (
    <Card>
      <SectionHeading>Last mirror, by calendar</SectionHeading>

      <div className="mt-2 space-y-6">
        {states.map((state) => (
          <CalendarState key={state.calendarKey} state={state} />
        ))}
      </div>

      {/*
        The limit of this block, said here rather than left to be discovered by
        somebody trusting a stale instant. See the header: a mirror that refuses
        writes no row, on purpose, so an ageing instant is what a run of refusals
        looks like from this surface.
      */}
      <p className={`mt-6 ${REASON}`}>
        A mirror that refuses writes nothing here, because nothing was written at
        all. An instant that stops moving on a calendar that should be mirrored
        every day is what a run of refusals looks like from this page; the run
        itself goes red where the schedules are watched.
      </p>
    </Card>
  );
}
