import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";
import { turinWallClock } from "@/utils/datetime";

import { formatCivilDate, isCivilDate, isCivilTime } from "./dates";
import type { EntryClass } from "@/lib/production/ics/vocabulary";

/**
 * What the last import actually did — this phase's answer to having no
 * monitoring.
 *
 * ── Why this is a block on a page and not a page of its own ─────────────────
 *
 * There is **no error tracking in this repository**. `package.json` carries no
 * monitoring dependency, so no production failure reaches a human on its own:
 * four crons run at night and nobody is told when they fail. Under that
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
 * ── Never imported yet is an empty state, not a block of zeros ──────────────
 *
 * A zeroed block says the import ran and found nothing. It did not run. The
 * caller decides — only the page knows which emptiness this is — and this
 * component renders nothing at all for `run === null`, so the two cannot be
 * confused by a default (`44-UI-SPEC.md` §13.1).
 *
 * ── No instant is constructed here ──────────────────────────────────────────
 *
 * The run's timestamp is a real point in time, unlike every other date on this
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
 * When the run started, as a Turin wall clock.
 *
 * Two failures get two answers, neither of them a plausible-looking substitute:
 * a timestamp that will not parse, and one that parses into parts the phase's own
 * formatters refuse. Both draw the same sentence as an unreadable count, because
 * both are the same fact — *we could not read this* — and this surface has one
 * way of saying it.
 */
function RunTimestamp({ startedAt }: { readonly startedAt: string }): ReactNode {
  const wall = turinWallClock(startedAt);
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
 * The block
 * ──────────────────────────────────────────────────────────────────────────── */

export function ImportRunSummary({
  run,
}: {
  /**
   * `null` means **the import has never run**, and this component draws nothing
   * for it. The page draws §13.1's empty state instead: a block of zeros would
   * say the import ran and found nothing, and it did not run.
   */
  readonly run: ImportRun | null;
}) {
  if (run === null) return null;

  const byClass = run.entriesByClass;
  const countOf = (entryClass: EntryClass): number | null =>
    byClass === null ? null : byClass[entryClass] ?? null;

  return (
    <Card>
      <SectionHeading>Last import</SectionHeading>

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
          observation. Either the import is still going or it stopped without
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
        <RunTimestamp startedAt={run.startedAt} />
      </p>

      <div className="mt-4 space-y-3">
        <Findings heading="Divergences" findings={run.divergences} />
        <Findings
          heading="Unsupported recurrences"
          findings={run.unsupportedRecurrences}
        />
      </div>
    </Card>
  );
}
