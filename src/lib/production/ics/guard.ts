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

/* ────────────────────────────────────────────────────────────────────────────
 * THE SECOND GUARD — the run nobody is watching
 *
 * WHAT IT ANSWERS, in one sentence: **may a run that no person is watching
 * delete a calendar, when that calendar holds state a half-dead run could not
 * put back?**
 *
 * ── WHY IT EXISTS, AND WHY THE DATE MATTERS ─────────────────────────────────
 *
 * The deferred item that asks for this wrote its own trigger condition in
 * advance: *«the moment the restore tool becomes necessary is not the cron's
 * first run — it is the first tick or the first link»*. On 2026-08-20 a tick was
 * pressed, by a real identity, on a plan row inside the scope one calendar's
 * mirror deletes. The condition it named came true, so the guard it asked for
 * stops being a precaution and becomes a requirement.
 *
 * What makes that one row different from every other row in the six mirrored
 * tables is that **no feed can rebuild it**. A night, a piece, a commitment and
 * a checklist item are all re-derivable from the calendar: delete them and the
 * next successful mirror writes them back. A tick is not in the calendar. The
 * calendar does not record who ticked a box, and nothing else does either.
 *
 * ⚠ **And it does not record who UN-ticked one either — the same fact, missed
 * for two days.** A tick and an untick are one trace read in two directions; the
 * untick simply has no instant, because clearing the instant is HOW an untick is
 * written. This guard therefore counts **decisions**, and its argument is named
 * for what it counts rather than for the direction somebody had in mind.
 *
 * ── ⚠ WHAT «ATTENDED» MEANS, AND WHY IT IS NOT AN ARGUMENT ──────────────────
 *
 * The obvious mechanism is a flag — `--attended` — and it is the wrong one, for
 * the reason the request itself states: **a mechanism that can be passed out of
 * habit is not a guard.** A flag that silences a guard is a flag that ends up in
 * a shell alias, in a runbook, in the one command everybody copies.
 *
 * So attendance is **evidence, never a claim**, and the evidence is a property
 * of how the process was launched rather than a word somebody typed:
 *
 *   * an **interactive terminal** — a cron entry, a serverless invocation and a
 *     CI job all lack one by construction, and none of the three can acquire one
 *     by being edited. Nothing in a scheduled invocation can assert attendance,
 *     because there is nothing to assert *with*;
 *   * and the caller has **not declared itself unattended**. That declaration
 *     exists and travels the other way: it can only ever make this guard fire.
 *     A flag that only narrows is a flag that is harmless to type by habit, and
 *     it is what lets a person exercise the cron's own path from a terminal.
 *
 * **Which stream is consulted, and why it is stdin.** Attendance is read from
 * the input stream and deliberately not from the output one. An operator who
 * pipes the transcript to a file — which this phase's procedures ask them to do
 * — still has a terminal on stdin and is plainly watching; judging them by
 * stdout would classify the most careful invocation as the least supervised.
 *
 * ── ⚠ THE DIRECTION OF THE ERROR ────────────────────────────────────────────
 *
 * Every branch below errs toward **unattended**, which is the refusing side. An
 * attended run misread as unattended costs a person one flag and one evening. An
 * unattended run misread as attended costs a tick that exists nowhere else, in a
 * project with no point-in-time recovery and no error tracking to say it went.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The two conditions a run can be in. A closed vocabulary, like every other one
 * in this directory.
 */
export const RUN_SUPERVISIONS = ["attended", "unattended"] as const;

export type RunSupervision = (typeof RUN_SUPERVISIONS)[number];

/**
 * What is known about how this process was launched.
 *
 * ⚠ **Both fields are evidence, not intent.** Neither is a request to be treated
 * one way or the other: the first is a property of the process's own streams,
 * the second is a declaration that can only ever narrow.
 */
export type SupervisionEvidence = {
  /**
   * True when the launching process has an interactive terminal on its input
   * stream — in Node, `process.stdin.isTTY`.
   *
   * It is passed in rather than read here because this module reaches nothing:
   * claim (a) of `./index` holds, and it is what lets the gate exercise both
   * branches on any machine.
   */
  interactiveTerminal: boolean;
  /**
   * True when the caller has said, explicitly, that nobody is watching.
   *
   * ⚠ **There is no field for the opposite.** A caller cannot declare itself
   * attended, and that asymmetry is the whole design: see the header.
   */
  declaredUnattended: boolean;
};

/**
 * Attended or not — decided from evidence, and never from a claim.
 *
 * ⚠ **Total: no input makes it throw, and every input that is not exactly the
 * attended shape answers `unattended`.** A predicate that threw would surface as
 * an uncaught error inside the very process it exists to restrain.
 */
export function runSupervision({
  interactiveTerminal,
  declaredUnattended,
}: SupervisionEvidence): RunSupervision {
  if (declaredUnattended === true) return "unattended";
  return interactiveTerminal === true ? "attended" : "unattended";
}

/**
 * Whether the restore path of `P-58-C` step 5 has been **exercised**, as a value
 * rather than as a sentence.
 *
 * ⚠ **`false`, and «the code exists» is not what this flag measures.** The tool
 * exists: `scripts/restore-mirror-snapshot.mjs` reads a snapshot by path, checks
 * its instant against the interrupted run, and puts the two exceptions of state
 * back by primary key with their original actor and instant. What has never
 * happened is a run of it **against a real database**, because exercising it is
 * an act — it writes production rows — and an act needs its own dated
 * authorisation, which as of 2026-08-22 does not exist.
 *
 * The distinction is the same one `58-PROCEDURES.md` makes about a pending
 * `Result`: a procedure that has not been executed is not a procedure that
 * passed. A restore path nobody has ever seen work is exactly as trustworthy as
 * a gate nobody has ever seen go red.
 *
 * ⚠ **Flipping it is a decision with a shape.** It becomes `true` when a run of
 * that script has put a real tick back, with the original actor and instant
 * confirmed **from the catalogue** — a different instrument from the one that
 * caused the effect — and that observation is written down with its date.
 * `scripts/verify-mirror-guards.mjs` asserts the shipped value, so flipping it
 * without touching the gate turns the gate red: the friction is deliberate.
 */
export const MIRROR_RESTORE_PATH_VERIFIED = false;

/**
 * The two things this guard can answer.
 *
 * `unattended_state_at_risk` is kept apart from the feed guard's verdicts rather
 * than folded in with them, because it sends a reader somewhere else entirely:
 * the feed verdicts are about what arrived, this one is about what is already
 * held, and only this one is answered by a person taking the run into their own
 * hands.
 */
export const UNATTENDED_GUARD_VERDICTS = ["ok", "unattended_state_at_risk"] as const;

export type UnattendedGuardVerdict = (typeof UNATTENDED_GUARD_VERDICTS)[number];

export type UnattendedMirrorGuardInput = {
  /** Decided by {@link runSupervision} from evidence, never taken as a claim. */
  supervision: RunSupervision;
  /**
   * How many checklist DECISIONS the declared scope holds — the first exception
   * of state of `ICS-03`, counted before anything is removed.
   *
   * ⚠ **DECISIONS, and it used to say ticks. The rename is the repair, not a
   * tidy-up.** A checklist row carries a decision in either direction: ticked
   * carries an actor and an instant, un-ticked carries an actor and no instant,
   * and the migration that writes both says so in prose — the trace *answers who
   * last decided, in both directions*. While this argument meant *ticks*, a
   * scope holding one untick and no tick counted `0`, this guard answered `ok`,
   * and an unwatched run would have taken that trace away **without a single
   * number in the report going down**. Measured: on 2026-08-24 the catalogue held
   * exactly that shape — 0 ticked, 1 un-ticked, inside a scope a mirror deletes.
   *
   * ⚠ **It counts what would be LOST, which is a different question from what is
   * ticked**, and the two are kept from drifting by having one producer: the
   * caller passes the length of the same list the writer puts back
   * (`ReconcilePlan.decisionsToRestore`). A run that would not restore something
   * has to be a run this predicate refuses; two lists built in two places is how
   * that stops being true.
   *
   * ⚠ A **count**, like every other argument in this module, and for the reason
   * this file's first header gives: the list itself carries a person's name.
   */
  decisionsAtRisk: number;
  /** How many links the declared scope holds — the second exception of state. */
  linksAtRisk: number;
  /**
   * Whether the restore path has been exercised. Callers pass
   * {@link MIRROR_RESTORE_PATH_VERIFIED}.
   *
   * It is a parameter and not a direct read so that both branches are
   * exercisable without editing the module the gate is measuring.
   */
  restorePathVerified: boolean;
};

/**
 * May a run nobody is watching delete this calendar?
 *
 * The rules, each with its reason beside it:
 *
 *   1. **attended → `ok`.** This guard restrains the unattended case and nothing
 *      else. A person at a terminal is who `P-58-C` is written for, and refusing
 *      them would block the one run that can recover from itself — which is what
 *      this phase's own first mirror was.
 *   2. **restore path exercised → `ok`.** The refusal exists because a half-dead
 *      run loses a tick *irrecoverably*. Once the way back has been seen to
 *      work, the loss is recoverable and the refusal has nothing left to protect.
 *   3. **nothing at risk → `ok`.** Zero decisions and zero links means a
 *      half-dead run loses only rows the next successful mirror writes back from
 *      the file. That was true of this project until 2026-08-20 and is the state
 *      the deferred item measured before deciding to wait.
 *
 *      ⚠ **Zero DECISIONS, never zero ticks.** An un-ticked box is a decision
 *      with an author and no instant, and the calendar rebuilds it exactly as
 *      well as it rebuilds a tick: not at all. Reading rule 3 as *nothing is
 *      ticked* is what made this guard answer `ok` over a trace it exists to
 *      protect.
 *   4. **anything at risk → `unattended_state_at_risk`.**
 *
 * ⚠ **Total, and a count it cannot read counts as at risk.** A count that is not
 * a finite number at or above zero is treated as state present, because the
 * alternative — treating an unreadable count as *nothing there* — turns a failed
 * measurement into permission to delete.
 */
export function unattendedMirrorGuard({
  supervision,
  decisionsAtRisk,
  linksAtRisk,
  restorePathVerified,
}: UnattendedMirrorGuardInput): UnattendedGuardVerdict {
  if (supervision === "attended") return "ok";
  if (restorePathVerified === true) return "ok";

  const atRisk = (count: number): boolean => !Number.isFinite(count) || count > 0;
  if (atRisk(decisionsAtRisk) || atRisk(linksAtRisk)) return "unattended_state_at_risk";

  return "ok";
}
