/**
 * The feed guard — the predicate that decides whether a mirror may run at all.
 *
 * WHAT IT ANSWERS, in one sentence: **given how many entries the last successful
 * mirror of one calendar carried and how many the arriving one carries, may this
 * run delete that calendar and write it back?**
 *
 * ── WHY IT IS A REQUIREMENT AND NOT A REFINEMENT ────────────────────────────
 *
 * D-58-05 moved the source from a file somebody exported by hand to an address
 * a scheduled process reads on its own. Two facts meet at that point and the
 * meeting is the whole reason this module exists:
 *
 *   * a mirror **deletes and rewrites**. There is no transaction across the gap
 *     and this project has no point-in-time recovery;
 *   * this project has **no error tracking at all**. Nothing that fails at night
 *     reaches a human being by itself (`CLAUDE.md`, zero silent failures).
 *
 * An unattended process that deletes and rewrites is the worst shape that second
 * fact can take. So `ICS-10` guard (a) is not a nicety on top of the cron: **it
 * is the reason the cron is acceptable**, and it is written BEFORE the cron
 * exists rather than after it has run once.
 *
 * ── ⚠ TWO COUNTS, NEVER TWO LISTS, AND THE DIFFERENCE IS DOMAIN ─────────────
 *
 * The arguments are **numbers**. A guard handed the entries themselves would be
 * holding the titles of the calendar — unannounced dates, spaces under
 * negotiation, line-ups — and the step from there to an error message that
 * interpolates one is short. That is defence 1 of D-58-07: *counts and
 * categories leave, never text*. A count cannot reveal anything, and the
 * predicate that decides whether half a calendar gets deleted does not need to
 * know **what** is in it: **how much** is enough.
 *
 * ── ⚠ THE THRESHOLD IS A POLICY. IT WAS CHOSEN, NOT MEASURED ────────────────
 *
 * {@link MIRROR_SHRINK_FLOOR} is `0.75`: an arriving feed carrying fewer than
 * three quarters of the entries the last successful mirror carried is treated as
 * shrunk.
 *
 * **There is no data under that number, and pretending otherwise would be the
 * exact error `production-calendar.md` records against itself** — a planned
 * rotation written down as a verified history, at the past tense, in the very
 * document that forbids it. No feed of this project has ever shrunk; there is
 * nothing to measure, so the number is a decision and is labelled one.
 *
 * **Which way it errs, stated so the next reader does not have to derive it.**
 * It errs toward REFUSING: a calendar that legitimately loses a quarter of its
 * entries is refused and needs a person. It never errs toward accepting, because
 * the cost of the two directions is not symmetric — a refusal costs a person one
 * evening, an acceptance costs a calendar nobody can put back.
 *
 * **When it gets revised.** The first time a real, intended shrink is refused.
 * That event carries the one thing this number lacks — an actual distribution of
 * how much a real calendar moves between two exports — and the revision belongs
 * to whoever holds that measurement, written down as a measurement. Until then
 * the value stays where it is and stays labelled as chosen. Widening it because
 * a run went red is how a guard becomes a formality.
 *
 * ── ⚠ THE AUTHORISED WAY PAST IS NOT AN ARGUMENT OF THIS PREDICATE ──────────
 *
 * A calendar really does shrink sometimes: the owner removes dates. So there has
 * to be a way through, and there is one — an explicit argument on the importer,
 * whose use is **recorded in the report**, in the same shape as the renumbering
 * re-authorisation, because *a guard with no authorised exit is a guard somebody
 * removes*.
 *
 * That argument is deliberately **not a parameter here**. A predicate that
 * answered `ok` because somebody asked it to would have stopped measuring, and
 * the report would then carry a verdict instead of an observation. This module
 * always says what it sees; the caller holding the argument decides whether what
 * it sees is a refusal or an authorised acceptance, and writes down that it
 * decided.
 *
 * And the authorisation covers `feed_shrank` **only**. {@link MIRROR_EMPTY_IS_NEVER_AUTHORISED}
 * carries that rule as a value rather than as a sentence, so a caller reads it
 * instead of remembering it: zero entries is a broken export or a broken source,
 * never a decision, and no argument makes it one.
 *
 * ── PURITY, LIKE EVERY MODULE BEHIND THIS BARREL ────────────────────────────
 *
 * No client, no filesystem, no network read, no clock. Claim (a) of `./index`
 * applies here word for word, and here it buys something specific: a guard with
 * no way to reach anything is a guard whose answer depends on its two arguments
 * and nothing else — which is why `scripts/verify-mirror-guards.mjs` can
 * exercise all of it on any machine, with no material and no credential.
 *
 * ── WHAT A GREEN HERE DOES NOT MEAN ─────────────────────────────────────────
 *
 * That the mirror is safe. It means these two shapes of a bad feed do not reach
 * a `DELETE`. A feed that is the right size and the wrong calendar passes this
 * predicate untouched — that boundary is the declared calendar key, elsewhere —
 * and the way back from a run that died halfway is `P-58-C`, which is a
 * procedure and not a number.
 */

/**
 * The three things this guard can answer. A closed vocabulary, like every other
 * one in this directory: the caller branches on all three or the compiler says
 * so.
 *
 * `feed_empty` and `feed_shrank` are kept apart rather than folded into one
 * *too small*, and the split is the point. They send a reader to different
 * places — an empty feed is a broken export or a source that no longer answers
 * with a calendar; a shrunk one may be a person having removed dates — and only
 * one of the two can ever be authorised. A single category would have made the
 * authorisation apply to both.
 */
export const MIRROR_GUARD_VERDICTS = ["ok", "feed_empty", "feed_shrank"] as const;

export type MirrorGuardVerdict = (typeof MIRROR_GUARD_VERDICTS)[number];

/**
 * The fraction of the previous successful mirror's entry count below which an
 * arriving feed counts as shrunk.
 *
 * ⚠ **Chosen, not measured.** Read the paragraph in this module's header before
 * touching it: it says which way the number errs, why that direction is the one
 * this project can afford, and what event — a real intended shrink, refused —
 * earns the right to revise it.
 *
 * It is exported so that the gate builds its edge case FROM it instead of from a
 * number copied into a script. A gate that carried its own copy of this value
 * would be deciding a policy that is not its own, in a place nobody looks for
 * one.
 */
export const MIRROR_SHRINK_FLOOR = 0.75;

/**
 * `feed_empty` is never authorisable, as a value rather than as a sentence.
 *
 * The importer's escape argument covers a shrunk feed and nothing else. Leaving
 * that rule in prose only would put it one distracted edit away from an
 * authorisation that empties a calendar.
 */
export const MIRROR_EMPTY_IS_NEVER_AUTHORISED = true;

export type MirrorGuardInput = {
  /**
   * How many entries the last **successful** mirror of THIS calendar key
   * carried.
   *
   * ⚠ `null` means *there is no previous run for this key* — the first mirror of
   * a calendar — and it is **not** `zero`. Collapsing the two would make a first
   * run indistinguishable from a run whose predecessor found nothing, and the
   * guard would then refuse the one thing it cannot refuse: the beginning.
   */
  previousEntries: number | null;
  /** How many entries the arriving feed carries. */
  currentEntries: number;
};

/**
 * The smallest arriving count this guard admits against a given previous count.
 *
 * Exported because the importer prints it in its refusal — *it carries N, the
 * floor is M against a previous P* — and three numbers a person can act on beat
 * a percentage they have to compute under pressure. All three name nothing:
 * they are counts.
 *
 * `Math.ceil`, so the admitted margin is the first count at or above the
 * fraction and never a hair below it.
 */
export function mirrorShrinkMargin(previousEntries: number): number {
  return Math.ceil(previousEntries * MIRROR_SHRINK_FLOOR);
}

/**
 * May this run delete a calendar and write it back from what just arrived?
 *
 * The rules, each with the reason beside it rather than in a paragraph
 * somewhere else:
 *
 *   1. **zero entries arriving → `feed_empty`, whatever the previous count
 *      was.** An empty calendar is a wrong export or a broken source; it is
 *      never a decision. This comes first on purpose: the check that must not
 *      be reachable around.
 *   2. **no previous run for this key, and entries arriving → `ok`.** The guard
 *      cannot forbid the first pass, and saying so here is better than
 *      discovering it at three in the morning.
 *   3. **a previous count that is not a positive number → `ok`.** There is
 *      nothing to have shrunk from. It is stated rather than left implicit
 *      because the alternative — dividing by it — is the arithmetic that
 *      produces a verdict out of nothing.
 *   4. **arriving below the declared floor → `feed_shrank`.**
 *   5. **anything else → `ok`.**
 *
 * ⚠ **It is total: no input makes it throw.** A count that is not a finite
 * number at or above zero is answered `feed_empty`, which is the refusing
 * direction. The alternative — an exception — would surface as an uncaught
 * error inside an unattended process, and an unattended process in a repository
 * with no error tracking fails silently by definition.
 */
export function mirrorGuard({ previousEntries, currentEntries }: MirrorGuardInput): MirrorGuardVerdict {
  const arriving = Number.isFinite(currentEntries) ? currentEntries : -1;
  if (arriving < 1) return "feed_empty";

  if (previousEntries === null) return "ok";
  if (!Number.isFinite(previousEntries) || previousEntries < 1) return "ok";

  return arriving < mirrorShrinkMargin(previousEntries) ? "feed_shrank" : "ok";
}
