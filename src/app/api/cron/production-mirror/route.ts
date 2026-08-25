import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/service";
import {
  CALENDAR_KEYS,
  MAX_INPUT_BYTES,
  MAX_INPUT_LINES,
  MIRROR_RESTORE_PATH_VERIFIED,
  MIRROR_SHRINK_FLOOR,
  classifyEntries,
  joinKey,
  mirrorGuard,
  mirrorShrinkMargin,
  parseIcs,
  readNoteSlots,
  reconcile,
  runSupervision,
  unattendedMirrorGuard,
} from "@/lib/production/ics";
import type {
  CalendarKey,
  ExistingSnapshot,
  LineupSlot,
  SeriesPipeline,
  SeriesPipelineRule,
} from "@/lib/production/ics";

/**
 * The mirror, running on its own — `ICS-10`, D-58-05, D-58-07.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THIS ROUTE IS THE HALF OF `D-44-26` THAT FELL. THE OTHER HALF DID NOT.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * On 2026-08-15 the owner closed the import as a **local script only**, with
 * this reason written down: *«the `.ics` would otherwise transit a Vercel
 * server, carrying spaces under negotiation and unannounced dates into logs,
 * caches and runtime errata. That surface does not exist today.»* On 2026-08-20,
 * with the conflict in front of them, the owner chose the automatic update on
 * the platform (D-58-07). The earlier decision is **superseded, not forgotten**,
 * and the reason it existed still holds — it has become a thing to defend **by
 * construction** instead of a surface that does not exist.
 *
 * **`D-44-26` forbade two things and only one of them falls.** The transit of a
 * calendar through a server falls, for this path. **A loading control inside the
 * product does not**: no file input, no drop target, no Server Action that
 * receives a calendar. `44-UI-SPEC.md` §11.3 and check **U2** of
 * `scripts/verify-calendar-surface.mjs` stay valid and are not touched by this
 * file or by anything it caused.
 *
 * ── THE FIVE DEFENCES, AND WHERE EACH ONE IS IN THIS FILE ──────────────────
 *
 *  1. **The feed body is never printed.** Not in a log, not in a response, not
 *     in a diagnostic, not in an uncaught throw. Counts and categories leave;
 *     calendar text never does. The body lives inside {@link readRegisteredFeed}
 *     and is never returned, never stored and never assigned to anything that
 *     outlives that call. ⚠ **Asserted from outside**, by check **U12** of
 *     `scripts/verify-calendar-surface.mjs`, which reads this source and the
 *     writer's and refuses any print or response that interpolates the value a
 *     `.text()` produced. Written down and nothing else, this defence is a
 *     promise the first distracted `catch` breaks — and the platform's runtime
 *     logs are retained, so it is the only defence there is.
 *  2. **No persistence.** The payload lives in memory for the length of the
 *     call: `cache: "no-store"` on the request, `no-store` in the header,
 *     `dynamic = "force-dynamic"` on the route, nothing written to disk.
 *     ⚠ And see *THE SNAPSHOT THAT IS NOT TAKEN HERE* below — the absence is
 *     reasoned, not overlooked.
 *  3. **Faults are reported by category, never by echo.** One outcome per cause,
 *     as a closed union with two **total** `Record`s over it. ⚠ **There is no
 *     single tally of things that went wrong in this file, and there must never
 *     be one**: this runs at night, this repository has no error tracking at
 *     all, and the response body is the only place a cause can be read.
 *  4. **The address is a registered secret, host included.** {@link registerSecret}
 *     takes the raw value, the parsed host and the normalised address, and
 *     {@link redact} runs over every string this file emits. The host goes in on
 *     its own because a network-layer message is written by somebody else and
 *     routinely carries only the host — *getaddrinfo ENOTFOUND ‹host›* is the
 *     shape — and a list holding the whole address would not match that string.
 *  5. **The surface gains no loading control.** See above.
 *
 * ── THE TRANSLATION BETWEEN THE SCRIPT'S EXIT CODES AND THIS ROUTE'S STATUS ──
 *
 * `scripts/import-production-calendar.mjs` speaks in exit codes and this route
 * speaks in HTTP. The correspondence is **declared here** rather than left to be
 * inferred, because the two channels mean different things and somebody reading
 * one will reach for the other:
 *
 * | in the script | what it means | here |
 * |---|---|---|
 * | exit `0` | the mirror ran and finished | `200` |
 * | exit `2` — `refuse()` | **nothing was written**; the import did not happen | `409` |
 * | exit `1` — `failPartway()` | writes happened and then stopped | `500` |
 *
 * ⚠ **A REFUSAL IS NOT A FAILURE, AND IT STILL PAINTS THE RUN RED.** Nothing was
 * written, so nothing failed — and a refusal repeated silently for weeks is a
 * calendar that quietly stopped updating. The platform's cron dashboard reads
 * the 2xx / non-2xx boundary and nothing finer, so both sit on the far side of
 * it. The two codes exist because a person who opens the body should be able to
 * tell *nothing happened* from *something happened and then stopped*, and those
 * two have opposite next steps: the first is safe to retry, the second is
 * `P-58-C`.
 *
 * **The accepted cost is already on the record with D-46-06: if it fails often,
 * the red becomes wallpaper.** Which is exactly why the set of calendars this
 * route mirrors is a **declaration** — see the next block.
 *
 * ── ⚠ WHICH CALENDARS THIS MIRRORS IS DECLARED, AND NOT DECIDED BY A GUARD ──
 *
 * Deferred item **10** of this phase measured the case in advance and named the
 * repair: *«a format with no declared dates is not the same thing as a feed that
 * stopped answering. The distinction is made BEFORE the run and by declaration —
 * which keys the cron mirrors today — never inside the guard, which must go on
 * refusing everything it cannot explain.»*
 *
 * {@link MIRRORED_TODAY} is that declaration. It is a **total** `Record` over
 * {@link CALENDAR_KEYS}, so a fourth calendar cannot be added to the vocabulary
 * without somebody deciding, in this file, whether an unwatched process mirrors
 * it. A list would have answered for today's keys and said nothing about the
 * next one.
 *
 * ⚠ **Nothing here loosens {@link mirrorGuard} or {@link unattendedMirrorGuard}.**
 * Both still run, unchanged, on every calendar that IS declared. A key that is
 * not declared is not mirrored at all — it is never fetched, never read, never
 * planned — so no guard is asked a question it would have to be excused from
 * answering. The two mechanisms are kept apart on purpose: one decides **what
 * this process attempts**, the other decides **whether an attempt may delete**.
 *
 * ── ⚠ THE SNAPSHOT THAT IS NOT TAKEN HERE, AND WHY THAT IS SOUND ────────────
 *
 * The script writes a snapshot to a git-ignored directory **before** removing
 * anything, and says of itself that *a mirror that cannot take its snapshot does
 * not start*. This route takes none, and the reason is not that a serverless
 * filesystem is awkward — it is that on the only branch this route ever deletes
 * on, **the snapshot would be empty by construction**.
 *
 * What a snapshot exists to give back is the two exceptions of state of
 * `ICS-03`: the checklist decisions and the announced-night links. Every other
 * row in the mirrored tables is re-derivable from the calendar — delete it and
 * the next successful mirror writes it back. {@link unattendedMirrorGuard} runs
 * here, before any removal, and refuses this route outright unless **both**
 * counts are zero. So on the branch that reaches a `DELETE`, the snapshot would
 * hold nothing, and a run that died halfway would lose only rows the next run
 * rebuilds from the feed.
 *
 * ⚠ **That guard is therefore load-bearing on this path and not a belt-and-
 * braces.** It is armed while {@link MIRROR_RESTORE_PATH_VERIFIED} is `false` —
 * which it is, because that constant does not measure *the way back exists*, it
 * measures *somebody has watched it put a real decision back*. Deferred item 3
 * holds the case (`R15`) that has not been exercised, and deferred item 13 point
 * 1 holds the consequence: deleting and rewriting a calendar that carries a live
 * decision remains an **owner authorisation**, taken by a person at a terminal.
 * It is not something this route takes for itself, and the refusal below is how
 * that stays true.
 *
 * ── WHAT THE RESPONSE BODY MAY CARRY ────────────────────────────────────────
 *
 * Counts, outcome names, and the **calendar key** — a format sigla, which the
 * migration that created the vocabulary calls publishable. Nothing else: no
 * `source_uid`, no title, no date, no venue word, no address, no host, and no
 * count that identifies one night. A cron body is readable by anybody holding
 * the secret and gets quoted into dashboards.
 *
 * ── WHAT THIS FILE IS NOT ───────────────────────────────────────────────────
 *
 * It is not a replacement for `scripts/import-production-calendar.mjs`. That
 * script is the **attended** path: it takes the snapshot, it carries the one-off
 * arguments, it prints a transcript a person reads, and it audits its own
 * output. This route is the unattended path and does strictly less — the same
 * pure modules, the same guards, in the same order, with every branch that
 * needs a person's judgement turned into a refusal.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * Route configuration
 * ──────────────────────────────────────────────────────────────────────────── */

/** Node built-ins and the Supabase client. Not the edge. */
export const runtime = "nodejs";

/**
 * Defence 2, at the framework level: nothing about this response is cached, and
 * nothing about it may be pre-rendered. A cached answer would be a copy of a
 * measurement of the material sitting somewhere nobody declared.
 */
export const dynamic = "force-dynamic";

/**
 * Three calendars, each with a network read and a handful of statements.
 *
 * `60` and not more: it is the ceiling every plan of the platform allows, so
 * this value cannot become the reason a deploy is refused on a day nobody is
 * looking at deploys. The feed read has its own, shorter bound
 * ({@link FEED_TIMEOUT_MS}).
 */
export const maxDuration = 60;

/*
 * ── THE SCHEDULE, DECLARED HERE BECAUSE `vercel.json` CANNOT HOLD A SENTENCE ──
 *
 * `30 8 * * *`, and the entry in `vercel.json` is **UTC** like every other one:
 * that is **10:30 in Turin in summer, 09:30 in winter** (`Europe/Rome`, and the
 * changeover falls inside every season this calendar covers).
 *
 * ⚠ **It is chosen to be outside a night, not merely outside the other crons.**
 * A `re:sonate` night runs 22:00 → 06:00 local, so anything before 06:00 local
 * can land while the door is still open. This slot is four and a half hours
 * after the latest a night can end, and it does not collide with the five
 * schedules already registered — 06:00, 07:00, 07:30, 08:00 and 09:00 UTC.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The declaration of what this process mirrors
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Why one calendar is not mirrored by an unwatched process today.
 *
 * A closed vocabulary, so the reason travels in the response beside the key and
 * a person reading a dashboard does not have to come and find this file. Neither
 * value is a fault: they are decisions, and they answer `200`.
 */
const WITHHELD_REASONS = [
  /**
   * The format has **no dates at all**, so its feed answers, is well formed and
   * carries nothing. {@link mirrorGuard} refuses that — correctly, since *empty
   * feed* and *broken export* are indistinguishable from the reader's side — and
   * would go on refusing it every single night for as long as the situation
   * lasts, which is months. A recurring expected red is worse than no red: it is
   * the noise that teaches people to ignore the channel, and the night a
   * mirrored calendar refuses for a real reason that refusal would be
   * indistinguishable from the usual noise (deferred item 10).
   */
  "no_declared_dates",
  /**
   * The calendar holds a live checklist decision — state no feed can rebuild —
   * inside the scope a mirror deletes. Deleting and rewriting it is an **owner
   * authorisation** taken by a person at a terminal, not a thing an unwatched
   * process takes for itself (deferred item 13, point 1).
   *
   * ⚠ This is a **declaration**, and {@link unattendedMirrorGuard} still runs on
   * every mirrored key regardless. The declaration keeps the attempt from being
   * made at all; the guard is what makes the attempt safe when it is made. One
   * is not a substitute for the other, and dropping either would leave a hole
   * the other cannot cover.
   */
  "state_needs_a_person",
] as const;

type WithheldReason = (typeof WITHHELD_REASONS)[number];

/** Mirrored, or withheld with a reason. There is no third shape. */
type MirrorDeclaration = { mirrored: true } | { mirrored: false; reason: WithheldReason };

/**
 * Which calendars an unwatched process mirrors **today**.
 *
 * ⚠ **A total `Record` over {@link CALENDAR_KEYS}, and the totality is the
 * point.** The owner declared that adding a format or changing the calendar
 * arrangement takes a new key, and every new key is a declared migration
 * (D-58-06). This map makes that arrival stop the compiler until somebody has
 * decided whether a process nobody is watching may delete and rewrite it. A list
 * of the keys to mirror would have answered for today and said nothing about the
 * next one.
 *
 * ⚠ **Changing a `false` to a `true` is a decision with a shape.** For
 * `no_declared_dates` it is: the format has dates in the calendar, so its feed
 * carries entries. For `state_needs_a_person` it is: an owner authorisation,
 * dated, **or** {@link MIRROR_RESTORE_PATH_VERIFIED} turned `true` by somebody
 * having watched the way back put a real decision back. Neither is a tidy-up.
 */
const MIRRORED_TODAY = {
  /**
   * Withheld. Measured 2026-08-22: one live checklist decision inside the scope
   * this key deletes, pressed by a real identity on 2026-08-20. The way back
   * from a run that dies halfway has never been exercised, so the loss would be
   * permanent — there is no transaction across the removal and no point-in-time
   * recovery behind it.
   */
  rsnt: { mirrored: false, reason: "state_needs_a_person" },
  /** Mirrored. Measured 2026-08-22: zero decisions and zero links at risk. */
  rmdb: { mirrored: true },
  /**
   * Withheld. MotionLab has no date in the calendar because the space is not
   * acquired, so the feed answers with an envelope and no entry. That is a
   * format with an expectation rather than a cadence, and it is not a broken
   * export.
   */
  mtnlb: { mirrored: false, reason: "no_declared_dates" },
} as const satisfies Record<CalendarKey, MirrorDeclaration>;

/* ────────────────────────────────────────────────────────────────────────────
 * The outcomes — a closed union, one per cause
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Every way one calendar's mirror can end.
 *
 * ⚠ **One member per cause, and no member that means *something went wrong*.**
 * A single tally would say that this process did not do what it was asked and
 * nothing about which part or why — the shape this repository has already paid
 * for once, in the newsletter form that answered every fault with one sentence
 * and made a network fault, a missing key and a duplicate address
 * indistinguishable (`meta-gates.md`).
 *
 * The names are grouped by where they sit in the run, and the grouping is the
 * reading order of a person debugging one:
 *
 *   * **before the network** — the declaration, the registration, the address;
 *   * **the network** — unreachable, refused, otherwise unavailable;
 *   * **what came back** — not a calendar at all, empty, shrunk;
 *   * **what is already held** — the register, the catalogue, a progressivo that
 *     moved, a decision an unwatched run may not risk;
 *   * **the writes** — stopped partway.
 */
const MIRROR_OUTCOMES = [
  "mirrored",
  "not_mirrored_by_declaration",
  "source_not_registered",
  "source_address_invalid",
  "source_unreachable",
  "source_refused",
  "source_unavailable",
  "feed_not_a_calendar",
  "feed_empty",
  "feed_shrank",
  "register_unreadable",
  "register_unwritable",
  "catalogue_unreadable",
  "progressivo_changed",
  "unattended_state_at_risk",
  "write_stopped_partway",
] as const;

type MirrorOutcome = (typeof MIRROR_OUTCOMES)[number];

/**
 * The status each outcome answers with, as a **total** `Record` over the union.
 *
 * Read the translation table in this file's header before changing one of these:
 * the three values are the script's three exit codes, and they are not free.
 *
 *   * `200` — the mirror ran, or was withheld by declaration. Nothing to look at.
 *   * `409` — a **refusal**. Nothing was written; the import did not happen.
 *   * `500` — a **failure partway**. Writes happened and then stopped, which is
 *     the state `P-58-C` is written for.
 *
 * ⚠ **A refusal is non-2xx on purpose.** The platform's cron dashboard reads the
 * boundary and nothing finer, and that boundary is this route's whole observable
 * channel: there is no error tracking in this repository, so a category inside a
 * `200` is a log line, and a log is a place nobody looks. A calendar that has
 * quietly stopped updating must paint the run red, or nobody finds out until
 * somebody notices a date missing from a surface.
 */
const MIRROR_HTTP = {
  mirrored: 200,
  not_mirrored_by_declaration: 200,
  source_not_registered: 409,
  source_address_invalid: 409,
  source_unreachable: 409,
  source_refused: 409,
  source_unavailable: 409,
  feed_not_a_calendar: 409,
  feed_empty: 409,
  feed_shrank: 409,
  register_unreadable: 409,
  register_unwritable: 409,
  catalogue_unreadable: 409,
  progressivo_changed: 409,
  unattended_state_at_risk: 409,
  write_stopped_partway: 500,
} as const satisfies Record<MirrorOutcome, number>;

/**
 * The sentence each outcome reports with — a second total `Record`, answering a
 * different question about the same union.
 *
 * They are operator-facing: they are read in a hosting dashboard by whoever
 * watches deployments. **No sentence is composed at run time and none carries a
 * count** — the counts travel as fields beside them, which is what keeps the
 * wording written once and keeps a calendar's own figures out of a string that
 * gets copied into a chat window.
 *
 * ⚠ **Not one of them quotes anything that arrived.** Every sentence below could
 * be written before the feed was read, and that is the test each one had to pass.
 */
const MIRROR_REPORT = {
  mirrored: "The mirror ran and finished: this calendar was deleted and written back.",
  not_mirrored_by_declaration:
    "This calendar is not mirrored by the unwatched process today. The reason travels beside it and is a decision, not a fault.",
  source_not_registered:
    "No source is registered for this calendar. Set its variable in the environment of whatever runs this, never in a file in this tree.",
  source_address_invalid:
    "A source is registered for this calendar but it is not an address this run will read from. Its value is not printed and will not be.",
  source_unreachable:
    "The registered source did not answer in time, or could not be reached at all. Nothing was read, so nothing was written.",
  source_refused:
    "The registered source answered that this address no longer grants this calendar. That is what a re-publication looks like from here: re-register the new address.",
  source_unavailable:
    "The registered source answered with a failure that is not about access. It is reported apart from the access case so that whoever reads this looks in the right place.",
  feed_not_a_calendar:
    "The registered source answered successfully and what came back is not a calendar. An empty calendar means look at the export; this means look at the address.",
  feed_empty:
    "What arrived carries no entries at all. That is a wrong export or a source that stopped answering with a calendar, and it is never a decision. Nothing was removed.",
  feed_shrank:
    "What arrived is smaller than the declared floor, so this run would have written back less than it removed. An unwatched run has no way to authorise that. Nothing was removed.",
  register_unreadable:
    "The import register could not be read, so the feed guard could not be applied. It is refused rather than treated as a first run: a first run is allowed to write.",
  register_unwritable:
    "The import register would not accept the row that opens this run, so the run was not opened and nothing was removed.",
  catalogue_unreadable:
    "Something this run has to read before it may plan could not be read. Nothing was removed.",
  progressivo_changed:
    "A night already held comes back from the file carrying a different progressivo. A progressivo that has been given out is already on a poster: append, never renumber. Nothing was removed.",
  unattended_state_at_risk:
    "Nobody is watching this run and what it would delete holds state no calendar can rebuild. There is no way back that has ever been exercised. Nothing was removed.",
  write_stopped_partway:
    "The writes began and then stopped. This calendar is in a state between the removal and the rewrite, and the recovery procedure is the way out of it.",
} as const satisfies Record<MirrorOutcome, string>;

/* ────────────────────────────────────────────────────────────────────────────
 * The redaction list — defence 4
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The strings that must never appear in anything this file emits.
 *
 * ⚠ **Per call, not per module.** A module-level list would outlive the request
 * on a warm serverless instance and accumulate the addresses of every calendar
 * this deployment has ever read, which is a longer-lived copy of a secret than
 * the one this whole file exists to avoid.
 */
type Redactor = {
  registerSecret: (value: string) => void;
  redact: (text: string) => string;
};

function newRedactor(): Redactor {
  const secrets: string[] = [];
  return {
    registerSecret(value: string) {
      const trimmed = value.trim();
      // A one-character secret would redact half the alphabet out of every
      // sentence. Anything that short is not an address.
      if (trimmed.length > 4 && !secrets.includes(trimmed)) secrets.push(trimmed);
    },
    redact(text: string) {
      let out = text;
      for (const secret of secrets) out = out.split(secret).join("[registered]");
      return out;
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * What one calendar's run measured
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The counts one calendar's run may report.
 *
 * ⚠ **Every field is a count or a category name.** There is no field here for a
 * `source_uid`, a title, a date, a space or a person, and none may be added: this
 * object is serialised into a response body that gets quoted into dashboards.
 *
 * ⚠ **`null` is not zero.** A figure that could not be measured stays absent
 * rather than becoming a reassuring `0` — the same rule the calendar surface
 * keeps for its tallies (OBS-03).
 */
type MirrorCounts = {
  /** How many entries arrived. A count of the file, naming none of it. */
  entriesSeen?: number;
  /** How many the last successful mirror of this key carried, if there was one. */
  previousEntries?: number | null;
  /** The smallest arriving count the feed guard admits against that previous one. */
  shrinkFloor?: number;
  nights?: number;
  pieces?: number;
  commitments?: number;
  unclassified?: number;
  /** Rows removed and rows written back, kept apart: they answer different questions. */
  nightsRemoved?: number;
  plansWritten?: number;
  piecesWritten?: number;
  commitmentsWritten?: number;
  checklistItemsWritten?: number;
  lineupSlotsWritten?: number;
  decisionsPutBack?: number;
  linksPutBack?: number;
  /**
   * Restores that matched NO row — counted apart, and never folded into the two
   * above.
   *
   * ⚠ **A restore that touches nothing is not a smaller success: it is a
   * finding.** `supabase-js` answers `{ data: null, error: null }` for an
   * `UPDATE` whose `WHERE` selects nothing, so without reading the rows back
   * these would be indistinguishable from work done — and the state they carry
   * is the one thing in this system no feed can rebuild. They ride out in the
   * counts because this project has no error tracking, and a log line alone is
   * not an observable effect.
   */
  decisionsUnplaced?: number;
  linksUnplaced?: number;
  /** How many write steps completed before a failure. `P-58-C` reads this first. */
  writeStepsCompleted?: number;
  /** How many nights came back renumbered. A count; none of them is named. */
  renumberings?: number;
  /** What the supervision predicate answered from evidence, never from a claim. */
  supervision?: "attended" | "unattended";
  /** Why an unwatched process does not mirror this calendar today. */
  withheldReason?: WithheldReason;
};

/** One calendar's result: the key, the outcome, the sentence, the counts. */
type CalendarResult = {
  calendarKey: CalendarKey;
  outcome: MirrorOutcome;
  report: string;
  counts: MirrorCounts;
};

/**
 * A refusal or a failure, as a value rather than as a thrown exception.
 *
 * ⚠ **Not a `throw`.** An exception carrying a message assembled near the body
 * is one distracted `catch` away from a stack trace in a retained runtime log,
 * and the whole of defence 1 is that no such path exists. A value cannot leak
 * what it was never handed.
 */
class MirrorStop {
  constructor(
    readonly outcome: MirrorOutcome,
    readonly counts: MirrorCounts = {}
  ) {}
}

function stop(outcome: MirrorOutcome, counts: MirrorCounts = {}): never {
  throw new MirrorStop(outcome, counts);
}

/**
 * `code` and `message` from a rejected statement, and never the third field.
 *
 * PostgREST's `details` carries **the whole rejected row** on a constraint
 * violation, and on `production_plan` that row carries a venue word. The rule is
 * the one `logMoneyPathFailure` already keeps on the money path, applied here
 * for the same reason and against a different kind of harm.
 */
function describe(fault: { code?: string; message?: string } | null): string {
  return `${fault?.code ?? "no_code"}: ${fault?.message ?? "no message"}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The source of one calendar
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The environment variable that registers the address of one calendar.
 *
 * The NAME is derived from the key, which is public; the VALUE never is. There
 * is no map literal here, on purpose: a map would be a second spelling of the
 * closed vocabulary, and two spellings of one fact are how the two start to
 * differ. It is the same derivation the script performs, and it has to stay the
 * same one — a deployment configures the variable once for both callers.
 */
function feedSourceVariable(key: CalendarKey): string {
  return `PRODUCTION_CALENDAR_FEED_${key.toUpperCase()}`;
}

/**
 * The address this run reads from, with both forms and the host registered.
 *
 * ⚠ **The scheme is normalised on the STRING and the address re-parsed.** A
 * calendar published from a Mac is commonly handed out under the subscription
 * scheme, which is the same request over TLS with a different word in front.
 * Assigning to `.protocol` on a parsed address whose scheme is not one the URL
 * standard calls *special* is silently ignored — the assignment appears to
 * succeed and the value does not change — so the rewrite happens before parsing,
 * where it can be seen to work.
 *
 * ⚠ **Anything that is neither of the two is a refusal, not a coercion.** A
 * local-file scheme would turn a registration back into a local read and quietly
 * reopen the second way in that `ICS-09` closed.
 */
function resolveFeedAddress(raw: string, redactor: Redactor): URL {
  redactor.registerSecret(raw);

  const normalised = raw.replace(/^webcal:/i, "https:");

  let parsed: URL;
  try {
    parsed = new URL(normalised);
  } catch {
    stop("source_address_invalid");
  }

  // Before anything can print, including the refusal three lines below.
  redactor.registerSecret(parsed.hostname);
  redactor.registerSecret(parsed.href);

  if (parsed.protocol !== "https:") stop("source_address_invalid");

  return parsed;
}

/** Twenty seconds. A calendar that has not answered by then is not answering. */
const FEED_TIMEOUT_MS = 20_000;

/**
 * Reads the calendar and returns **the parse and one count**. Never the body.
 *
 * ⚠ **Defence 1 lives in this function's scope and nowhere else.** The value the
 * response text produces is bound to one local, is measured, is handed to the
 * parser, and goes out of scope. It is not returned, not stored, not logged, not
 * interpolated and not sliced into a diagnostic. Check **U12** of
 * `scripts/verify-calendar-surface.mjs` reads this file and asserts exactly that.
 */
async function readRegisteredFeed(address: URL) {
  let response: Response;
  try {
    response = await globalThis.fetch(address, {
      // Defence 2: no HTTP cache anywhere along the path.
      cache: "no-store",
      redirect: "follow",
      headers: { "cache-control": "no-store", accept: "text/calendar" },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
  } catch {
    // ⚠ Nothing from the caught value is read. A network message routinely
    // interpolates the host, and while the host is registered and would be
    // redacted, the rule this file keeps is to not print the thing rather than
    // to rely on the net catching it. The category is the diagnostic.
    stop("source_unreachable");
  }

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    stop("source_refused");
  }
  if (!response.ok) stop("source_unavailable");

  const feedBody = await response.text();

  if (Buffer.byteLength(feedBody, "utf8") > MAX_INPUT_BYTES) stop("feed_not_a_calendar");
  if (feedBody.split(/\r?\n/).length > MAX_INPUT_LINES) stop("feed_not_a_calendar");

  /*
   * ⚠ THE ENVELOPE IS CHECKED HERE AND NOT LEFT TO THE READER.
   *
   * Handed a page of HTML the shared reader comes back with no refusal and zero
   * entries, and the run would then be stopped one gate later as an empty feed.
   * That is the wrong category, and the wrong category is the whole failure
   * defence 3 exists against: an empty calendar sends a person to look at their
   * export, when what happened is that the address answered `200` with somebody
   * else's page. Two different repairs.
   *
   * The literal below is an iCalendar keyword, not material.
   */
  if (!/^BEGIN:VCALENDAR/im.test(feedBody)) stop("feed_not_a_calendar");

  const result = parseIcs(feedBody);
  // The parser's own refusal code is a member of a closed vocabulary and is
  // never a quotation of what it was reading. It is not carried into the
  // response either: the category is what a reader acts on.
  if (result.refusal !== null) stop("feed_not_a_calendar");

  return result;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The mirror of one calendar
 * ──────────────────────────────────────────────────────────────────────────── */

/** The largest number of occurrences one recurring commitment may expand into. */
const RECURRENCE_OCCURRENCE_CAP = 200;

/**
 * The sigla a series is written as, composed from the two halves that exist.
 *
 * The composition never invents: a series whose own code already begins with its
 * format's is taken as written, so a catalogue that stores the whole sigla in one
 * column and one that stores the halves both arrive at the same string.
 */
function composeSigla(formatCode: string, seriesCode: string | null): string {
  if (!seriesCode) return formatCode;
  if (seriesCode === formatCode) return formatCode;
  if (seriesCode.startsWith(`${formatCode}-`)) return seriesCode;
  return `${formatCode}-${seriesCode}`;
}

/**
 * One calendar, from the registered address to a closed register row.
 *
 * The order of the gates is the script's order and it is a contract rather than
 * a style: a run that is going to refuse should refuse having done as little as
 * possible, and every gate before the first `DELETE` leaves the calendar exactly
 * as it found it.
 */
async function mirrorOneCalendar(
  calendarKey: CalendarKey,
  redactor: Redactor
): Promise<MirrorCounts> {
  /* ── Gate 1 — the registered source ─────────────────────────────────────── */

  const registered = process.env[feedSourceVariable(calendarKey)] ?? null;
  if (registered === null || registered.trim() === "") stop("source_not_registered");

  const address = resolveFeedAddress(registered.trim(), redactor);

  /* ── Gate 2 — credentials, before the material ──────────────────────────── */

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    stop("catalogue_unreadable");
  }
  const db = getServiceClient();

  /* ── Gate 3 — the material ──────────────────────────────────────────────── */

  const parsed = await readRegisteredFeed(address);
  const entriesSeen = parsed.events.length;

  /* ── Gate 4 — the feed guard (`ICS-10`, guard a) ────────────────────────────
   *
   * ⚠ Before every removal and before the plan is even built. The previous count
   * comes from the register and never from the tables: the question is *how much
   * did the last successful mirror of THIS calendar carry*, and counting rows
   * would count what is there now — exactly what a half-finished previous run
   * would have made wrong.
   */

  const lastRun = await db
    .from("production_import_run")
    .select("entries_seen")
    .eq("calendar_key", calendarKey)
    .eq("dry_run", false)
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1);

  if (lastRun.error) {
    // Not folded into the catalogue's category: a register this run cannot read
    // is a guard this run cannot apply, and proceeding as though there were no
    // previous mirror would turn an unreadable register into permission to
    // delete.
    console.error(`[production_mirror.register_unreadable] ${redactor.redact(describe(lastRun.error))}`);
    stop("register_unreadable", { entriesSeen });
  }

  const previousEntries: number | null =
    lastRun.data.length === 0 || lastRun.data[0].entries_seen === null
      ? null
      : lastRun.data[0].entries_seen;

  const measured: MirrorCounts = {
    entriesSeen,
    previousEntries,
    shrinkFloor:
      previousEntries === null || previousEntries < 1
        ? undefined
        : mirrorShrinkMargin(previousEntries),
  };

  const feedVerdict = mirrorGuard({ previousEntries, currentEntries: entriesSeen });
  if (feedVerdict === "feed_empty") stop("feed_empty", measured);
  if (feedVerdict === "feed_shrank") {
    /*
     * ⚠ **There is no authorised way past this one here, and that is the
     * difference between the two callers rather than an omission.** The script
     * takes an explicit argument and records its use in a transcript a person
     * reads. An unwatched process has nobody to take that decision and nowhere
     * to record it, so a calendar that really did lose a quarter of its entries
     * waits for a person. The floor is a policy that was chosen and not measured
     * (`guard.ts`), and it errs towards refusing on purpose.
     */
    stop("feed_shrank", measured);
  }

  /* ── The catalogue ──────────────────────────────────────────────────────── */

  const formatsRead = await db.from("formats").select("id, code, name");
  const seriesRead = await db.from("party_series").select("id, format_id, code, name, ics_alias");
  const rulesRead = await db
    .from("production_pipeline_rule")
    .select(
      "format_id, series_id, piece_kind, anchor_kind, anchor_weekday, anchor_direction, derivable, episodes_from_lineup, episode_count"
    );

  const catalogueFault = formatsRead.error ?? seriesRead.error ?? rulesRead.error;
  if (catalogueFault) {
    console.error(`[production_mirror.catalogue_unreadable] ${redactor.redact(describe(catalogueFault))}`);
    stop("catalogue_unreadable", measured);
  }

  const formats = formatsRead.data ?? [];
  const series = seriesRead.data ?? [];
  const pipelineRuleRows = rulesRead.data ?? [];

  const formatById = new Map(formats.map((row) => [row.id, row]));
  const siglaBySeriesId = new Map<string, string>();
  const catalogueBySigla = new Map<string, { seriesId: string | null; formatId: string | null }>();
  const aliases = new Map<string, string>();

  for (const row of series) {
    const format = formatById.get(row.format_id);
    if (format === undefined) continue;
    const sigla = composeSigla(format.code, row.code);
    siglaBySeriesId.set(row.id, sigla);
    catalogueBySigla.set(sigla, { seriesId: row.id, formatId: format.id });
    // The map the classifier joins on. Read here, never declared: its values are
    // words for spaces.
    if (typeof row.ics_alias === "string" && row.ics_alias.trim() !== "") {
      aliases.set(row.ics_alias.trim().toLowerCase(), sigla);
    }
  }
  for (const format of formats) {
    if (!catalogueBySigla.has(format.code)) {
      catalogueBySigla.set(format.code, { seriesId: null, formatId: format.id });
    }
  }

  /* ── Classification, and the line-up read from the notes ────────────────── */

  const classified = classifyEntries(parsed.events, aliases);

  const eventByUid = new Map(parsed.events.map((event) => [event.uid, event]));
  const lineupSlotsByNight = new Map<string, Map<string, { slot: LineupSlot; sourceUid: string }>>();

  const gatherSlots = (nightKey: string | null, uid: string) => {
    if (nightKey === null) return;
    const event = eventByUid.get(uid);
    if (event === undefined) return;
    const slots = readNoteSlots(event.description);
    if (slots.length === 0) return;

    let windows = lineupSlotsByNight.get(nightKey);
    if (windows === undefined) {
      windows = new Map();
      lineupSlotsByNight.set(nightKey, windows);
    }
    for (const slot of slots) {
      const window = `${slot.startTime}|${slot.endTime}`;
      const already = windows.get(window);
      if (already !== undefined) {
        // Only ever FILLS IN. A note that names the players beats one that only
        // declared the window; two notes that both name them are left as the
        // first said, because picking between them here would be a guess.
        if (already.slot.artists.length === 0 && slot.artists.length > 0) {
          windows.set(window, { slot, sourceUid: event.uid });
        }
        continue;
      }
      windows.set(window, { slot, sourceUid: event.uid });
    }
  };

  for (const night of classified.nights) gatherSlots(night.key, night.uid);
  for (const piece of classified.pieces) {
    const declared =
      piece.declaredNightKey !== null
        ? piece.declaredNightKey
        : piece.seriesCode !== null && piece.number !== null
          ? joinKey(piece.seriesCode, piece.number)
          : null;
    gatherSlots(declared, piece.uid);
  }

  /** One entry per **slot**, never per name: a b2b is one set and one LiveCut. */
  const lineupSlotCounts = new Map<string, number>();
  for (const [nightKey, windows] of lineupSlotsByNight) lineupSlotCounts.set(nightKey, windows.size);

  measured.nights = classified.nights.length;
  measured.pieces = classified.pieces.length;
  measured.commitments = classified.commitments.length;
  measured.unclassified = classified.unclassified.length;

  /* ── What this calendar already holds ───────────────────────────────────── */

  const planRead = await db
    .from("production_plan")
    .select(
      "id, source_uid, series_id, number, venue_word, date, start_time, end_time, source_sequence, source_last_modified, linked_party_id, calendar_key"
    )
    .eq("calendar_key", calendarKey);

  if (planRead.error) {
    console.error(`[production_mirror.catalogue_unreadable] ${redactor.redact(describe(planRead.error))}`);
    stop("catalogue_unreadable", measured);
  }
  const planRows = planRead.data ?? [];
  const scopedPlanIds = planRows.map((row) => row.id);

  let checklistRows: {
    id: string;
    plan_id: string;
    kind: string;
    label: string;
    ticked_at: string | null;
    ticked_by: string | null;
    ticked_by_name: string | null;
  }[] = [];
  if (scopedPlanIds.length > 0) {
    const read = await db
      .from("production_checklist_item")
      .select("id, plan_id, kind, label, ticked_at, ticked_by, ticked_by_name")
      .in("plan_id", scopedPlanIds);
    if (read.error) {
      console.error(`[production_mirror.catalogue_unreadable] ${redactor.redact(describe(read.error))}`);
      stop("catalogue_unreadable", measured);
    }
    checklistRows = read.data ?? [];
  }

  /** The sigla a stored night is written as, resolved through the catalogue. */
  const siglaOf = (row: { series_id: string | null }): string | null =>
    row.series_id === null ? null : siglaBySeriesId.get(row.series_id) ?? null;

  const planSourceUidById = new Map(planRows.map((row) => [row.id, row.source_uid]));

  const existing: ExistingSnapshot = {
    plans: planRows.map((row) => ({
      id: row.id,
      sourceUid: row.source_uid,
      // Resolved, never read off a column: the plan row stores a reference and a
      // sigla has one owner.
      seriesCode: siglaOf(row),
      number: row.number,
      venueWord: row.venue_word,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      sourceSequence: row.source_sequence,
      sourceLastModified: row.source_last_modified,
      linkedPartyId: row.linked_party_id,
    })),
    checklistItems: checklistRows
      .filter((row) => planSourceUidById.has(row.plan_id))
      .map((row) => ({
        id: row.id,
        // Joined here, BEFORE anything is removed, which is the first step of
        // the restore procedure.
        planSourceUid: planSourceUidById.get(row.plan_id) as string,
        kind: row.kind as never,
        label: row.label,
        tickedAt: row.ticked_at,
        tickedBy: row.ticked_by,
        // ⚠ A person's name. It travels in memory and back to its own column.
        // Nowhere else — never a response, never a log.
        tickedByName: row.ticked_by_name,
      })),
  };

  /* ── The plan of writes ─────────────────────────────────────────────────── */

  const ruleFromRow = (row: {
    piece_kind: string;
    anchor_kind: string;
    anchor_weekday: number | null;
    anchor_direction: string;
    derivable: boolean;
    episodes_from_lineup: boolean;
    episode_count: number | null;
  }): SeriesPipelineRule =>
    ({
      kind: row.piece_kind,
      rule: {
        anchorKind: row.anchor_kind,
        anchorWeekday: row.anchor_weekday,
        anchorDirection: row.anchor_direction,
        derivable: row.derivable,
        episodesFromLineup: row.episodes_from_lineup,
        episodeCount: row.episode_count,
      },
    }) as SeriesPipelineRule;

  const rulesForSigla = (sigla: string): SeriesPipelineRule[] => {
    const entry = catalogueBySigla.get(sigla);
    if (entry === undefined) return [];
    const merged = new Map<string, SeriesPipelineRule>();
    for (const row of pipelineRuleRows) {
      if (row.format_id !== entry.formatId || row.series_id !== null) continue;
      merged.set(row.piece_kind, ruleFromRow(row));
    }
    if (entry.seriesId !== null) {
      for (const row of pipelineRuleRows) {
        if (row.series_id !== entry.seriesId) continue;
        merged.set(row.piece_kind, ruleFromRow(row));
      }
    }
    return [...merged.values()];
  };

  /*
   * ⚠ THE `null` IS FILTERED HERE AND IT IS NOT A REPAIR: it is a case that does
   * not belong in this list. A piece may legitimately carry no series, and a
   * piece without a series has no series pipeline by definition. `??` and `|| ""`
   * are forbidden here: an empty-string sigla would become a live key and every
   * series-less piece would inherit that one bucket's rules, which is a wrong
   * `conforms_to_rule` stored on a row.
   */
  const siglaInFile = [
    ...new Set(
      [...classified.nights, ...classified.pieces]
        .map((entry) => entry.seriesCode)
        .filter((code): code is string => code !== null)
    ),
  ].sort();

  const seriesPipelines: SeriesPipeline[] = siglaInFile.map((sigla) => ({
    seriesCode: sigla,
    // An input, and a property of the space rather than of the format. Nothing
    // in the schema stores it today, so it is `false` here and the consequence
    // is that no space-approval item is generated — a configuration gap, said
    // out loud rather than left as a checklist that looks complete.
    requiresSpaceApproval: false,
    rules: rulesForSigla(sigla),
  }));

  const now = new Date().toISOString();

  const plan = reconcile(
    {
      calendarKey,
      nights: classified.nights,
      pieces: classified.pieces,
      commitments: classified.commitments,
      unclassified: classified.unclassified,
      unsupportedRecurrences: parsed.unsupportedRecurrences,
      lineupSlotCounts,
      recurrenceOccurrenceCap: RECURRENCE_OCCURRENCE_CAP,
    },
    existing,
    seriesPipelines,
    now
  );

  /* ── The guard of the progressivo — `ICS-01b`, D-58-01 ──────────────────────
   *
   * ⚠ **The third one-way switch of the project, and on this path it lives
   * here.** `production_plan_refuse_renumber` is `BEFORE UPDATE OF number`; a
   * mirror deletes and inserts, so that trigger never fires on this path. It
   * stays installed and still defends every other writer.
   *
   * ⚠ **It refuses the WHOLE run, before anything is removed.** A file in which
   * one known entry came back renumbered is a file somebody should look at
   * before any of it is mirrored.
   *
   * ⚠ **And there is no re-authorising argument here.** The script has one and
   * records its use in a transcript; an unwatched process has nobody to take
   * that decision. A progressivo that has been given out is already on a poster.
   */

  const storedNumberByUid = new Map(
    existing.plans
      .filter((row) => row.number !== null)
      .map((row) => [row.sourceUid, row.number])
  );

  let renumberings = 0;
  for (const night of classified.nights) {
    const stored = storedNumberByUid.get(night.uid);
    if (stored === undefined || stored === night.number) continue;
    renumberings += 1;
  }
  if (renumberings > 0) {
    // A count, and never the sigla or the two progressivi. The script may print
    // those because it prints to a terminal a person is holding; this body is
    // serialised into a dashboard, and the venue half of a sigla also occurs
    // inside an entry title.
    stop("progressivo_changed", { ...measured, renumberings });
  }

  /* ── The guard of the unattended run — deferred item 3, point 2 ─────────────
   *
   * ⚠ **After the plan is built and before ANYTHING is written.** Nothing is
   * removed on this branch, so nothing failed.
   *
   * WHAT IT PROTECTS is one row rather than a category. Every row in the
   * mirrored tables is re-derivable from the calendar: delete it and the next
   * successful mirror puts it back. **A checklist decision is not.** The calendar
   * does not record who ticked a box, nor who un-ticked one, so it is the only
   * state in this system a half-dead run loses for good — with no transaction
   * across the gap and no point-in-time recovery behind it.
   *
   * ⚠ **The counts come from the plan and are not counted again here.** One list,
   * two readers: the writer puts back exactly what this guard counted, and a run
   * that would not put something back has to be a run this guard refuses. Two
   * lists built in two places is how that stops being true.
   *
   * ⚠ **This route is unattended by construction.** A serverless function has no
   * controlling terminal and cannot acquire one — which is the honest form of
   * the evidence `runSupervision` reads, and the reason deferred item 20 is a
   * finding about a person's terminal and not about this caller.
   */

  const supervision = runSupervision({
    interactiveTerminal: false,
    declaredUnattended: true,
  });
  measured.supervision = supervision;

  const unattendedVerdict = unattendedMirrorGuard({
    supervision,
    decisionsAtRisk: plan.decisionsToRestore.length,
    // NOT `linksToRestore.length`. That list is over-collected on purpose and
    // includes links on rows `ICS-03b` keeps out of the deletion entirely — a
    // single announced night would otherwise refuse every unattended run for
    // ever, on state this code documents as a no-op. See `ReconcilePlan.linksAtRisk`.
    linksAtRisk: plan.linksAtRisk,
    restorePathVerified: MIRROR_RESTORE_PATH_VERIFIED,
  });
  if (unattendedVerdict !== "ok") stop("unattended_state_at_risk", measured);

  /* ── The run row, opened first ──────────────────────────────────────────────
   *
   * A process killed halfway leaves a row with a null `finished_at` — which IS
   * the observation, and must never be back-filled to make the table look tidy.
   * It is also the third of the three states the calendar surface draws.
   */

  const opened = await db
    .from("production_import_run")
    .insert({
      calendar_key: calendarKey,
      file_byte_size: null,
      entries_seen: entriesSeen,
      entries_by_class: {
        night: classified.nights.length,
        piece: classified.pieces.length,
        commitment: classified.commitments.length,
        unclassified: classified.unclassified.length,
      },
      unclassified_count: classified.unclassified.length,
      dry_run: false,
    })
    .select("id")
    .single();

  if (opened.error) {
    console.error(`[production_mirror.register_unwritable] ${redactor.redact(describe(opened.error))}`);
    stop("register_unwritable", measured);
  }
  const runId = opened.data.id as string;

  /* ── The removal, in the order the foreign keys obligate ────────────────────
   *
   * The order is not preferred, it is forced:
   *
   *   1. the checklist — its reference is the ONLY cascade in this schema.
   *      Emptying it explicitly makes the number of decisions that go away a
   *      number somebody counted instead of a side effect nobody saw. It carries
   *      no key of its own, so it is scoped THROUGH the plan rows this run
   *      already read — the same rows, never a second condition;
   *   2. the line-up, by the same selector and for the same reason;
   *   3. the pieces before the nights — that reference is `NO ACTION`;
   *   4. the nights, narrowed by the survival exception of `ICS-03b`;
   *   5. the occupied days, in ONE statement.
   *
   * ⚠ **The direction of the mistake is the design.** A condition that is too
   * wide removes MORE than it should — this repository has paid for that
   * direction once, 63 rows across seven tables — and a narrow condition that is
   * wrong finds nothing.
   */

  let writeStepsCompleted = 0;
  const withCounts = (): MirrorCounts => ({ ...measured, writeStepsCompleted });

  const step = async (action: () => PromiseLike<{ error: { code?: string; message?: string } | null }>) => {
    const { error: fault } = await action();
    if (fault) {
      console.error(`[production_mirror.write_stopped_partway] ${redactor.redact(describe(fault))}`);
      stop("write_stopped_partway", withCounts());
    }
    writeStepsCompleted += 1;
  };

  /**
   * A write whose EFFECT is measured, not merely attempted.
   *
   * ⚠ **`step` above cannot tell a restore that landed from one that matched no
   * row.** `supabase-js` answers `{ data: null, error: null }` for an `UPDATE`
   * whose `WHERE` selects nothing — so a counter incremented next to the call
   * counts attempts, and the report that reads it says *put back N decision(s)
   * with the original actor and instant* while nothing at all was written.
   *
   * That matters here more than anywhere else in this repository: a checklist
   * tick is the one piece of production state **no feed can rebuild** — the
   * calendar does not record who ticked a box. A restore that silently misses is
   * the exact shape of the loss the whole unattended guard exists to prevent,
   * arriving through the door marked *success*.
   *
   * The miss is real and reachable: the deletion above removes checklist items
   * for **every** scoped plan, survivors included, while the rewrite only
   * recreates items for the nights the file still carries. A linked night that
   * has left the file therefore keeps its plan row and loses its checklist — and
   * a restore keyed on `(plan_id, kind, label)` finds nothing to update. Labels
   * carry a progressivo (`LiveCut 3`), so a changed timetable produces the same
   * miss on a night that never left.
   *
   * @returns how many rows the write actually touched
   */
  const stepCounting = async (
    action: () => PromiseLike<{
      data: unknown[] | null;
      error: { code?: string; message?: string } | null;
    }>
  ): Promise<number> => {
    const { data, error: fault } = await action();
    if (fault) {
      console.error(`[production_mirror.write_stopped_partway] ${redactor.redact(describe(fault))}`);
      stop("write_stopped_partway", withCounts());
    }
    writeStepsCompleted += 1;
    return data?.length ?? 0;
  };

  const survivingPlanIds = new Set(plan.plansThatSurviveDeletion.map((row) => row.id));
  const planIdsToRemove = scopedPlanIds.filter((id) => !survivingPlanIds.has(id));

  if (scopedPlanIds.length > 0) {
    // Every item the scope selects, survivors INCLUDED: leaving one night's
    // items behind would produce a checklist half from this run and half from a
    // previous one.
    await step(() =>
      db.from("production_checklist_item").delete().in("plan_id", scopedPlanIds)
    );
    await step(() => db.from("production_lineup_slot").delete().in("plan_id", scopedPlanIds));
  }

  await step(() => db.from("production_piece").delete().eq("calendar_key", calendarKey));

  if (planIdsToRemove.length > 0) {
    // TWO conditions, and the second one only ever NARROWS. It is also the
    // by-primary-key discipline `ai-engineering.md` requires of anything that
    // removes production rows: if the two ever disagreed, their intersection is
    // the smaller set, which is the only direction in which disagreement is safe.
    await step(() =>
      db
        .from("production_plan")
        .delete()
        .eq("calendar_key", calendarKey)
        .in("id", planIdsToRemove)
    );
  }

  // ONE statement: the self-reference is `NO ACTION`, which is checked at the
  // END of a statement, so one statement carrying parent and children away
  // together passes while two in the wrong order do not.
  await step(() => db.from("production_commitment").delete().eq("calendar_key", calendarKey));

  measured.nightsRemoved = planIdsToRemove.length;

  /* ── The write-back ─────────────────────────────────────────────────────────
   *
   * Plain inserts, not upserts: against a scope that was just emptied a conflict
   * would mean the removal did not do what it said, and that is a finding to
   * raise rather than a state to merge into.
   */

  const catalogueFor = (sigla: string) =>
    catalogueBySigla.get(sigla) ?? { seriesId: null, formatId: null };

  if (plan.plansToInsert.length > 0) {
    const rows = plan.plansToInsert.map((row) => {
      const entry = catalogueFor(row.seriesCode);
      return {
        source_uid: row.sourceUid,
        // Written HERE and only here: the number the file assigned, on a row
        // that does not exist yet. Nothing below updates this column, ever.
        number: row.number,
        venue_word: row.venueWord,
        date: row.date,
        start_time: row.startTime,
        end_time: row.endTime,
        source_sequence: row.sourceSequence,
        source_last_modified: row.sourceLastModified,
        format_id: entry.formatId,
        series_id: entry.seriesId,
        calendar_key: row.calendarKey,
        // `venue_id` and `venue_stage` stay null on purpose: which space a night
        // happens in, and whether it is acquired, is a person's judgement
        // recorded in writing. An import that inferred it from a word in a title
        // would be turning a candidate into a booking.
        last_seen_at: row.seenAt,
      };
    });
    await step(() => db.from("production_plan").insert(rows));
  }
  measured.plansWritten = plan.plansToInsert.length;

  // Read back, so that pieces and checklist items point at the identifiers the
  // database actually handed out rather than at ones this process guessed.
  const appliedPlans = await db
    .from("production_plan")
    .select("id, series_id, number, source_uid, calendar_key")
    .eq("calendar_key", calendarKey);
  if (appliedPlans.error) {
    console.error(`[production_mirror.write_stopped_partway] ${redactor.redact(describe(appliedPlans.error))}`);
    stop("write_stopped_partway", withCounts());
  }

  const planIdByKey = new Map<string, string>();
  const planIdBySourceUid = new Map<string, string>();
  for (const row of appliedPlans.data ?? []) {
    const sigla = siglaOf(row);
    if (sigla !== null && row.number !== null) planIdByKey.set(joinKey(sigla, row.number), row.id);
    planIdBySourceUid.set(row.source_uid, row.id);
  }

  if (plan.piecesToInsert.length > 0) {
    await step(() =>
      db.from("production_piece").insert(
        plan.piecesToInsert.map((row) => ({
          source_uid: row.sourceUid,
          plan_id: row.planKey === null ? null : planIdByKey.get(row.planKey) ?? null,
          series_code: row.seriesCode,
          number: row.number,
          kind: row.kind,
          part_marker: row.partMarker,
          date: row.date,
          origin: row.origin,
          unresolved_reason: row.unresolvedReason,
          conforms_to_rule: row.conformsToRule,
          naming_convention: row.namingConvention,
          source_sequence: row.sourceSequence,
          source_last_modified: row.sourceLastModified,
          calendar_key: row.calendarKey,
          last_seen_at: row.seenAt,
        }))
      )
    );
  }
  measured.piecesWritten = plan.piecesToInsert.length;

  if (plan.commitmentsToInsert.length > 0) {
    await step(() =>
      db.from("production_commitment").insert(
        plan.commitmentsToInsert.map((row) => ({
          source_uid: row.sourceUid,
          occurrence_date: row.occurrenceDate,
          start_time: row.startTime,
          end_time: row.endTime,
          title: row.title,
          recurrence_raw: row.recurrenceRaw,
          calendar_key: row.calendarKey,
          last_seen_at: row.seenAt,
        }))
      )
    );
  }
  measured.commitmentsWritten = plan.commitmentsToInsert.length;

  // An expanded occurrence points back at the entry it came from. Resolved after
  // the inserts, by `(source_uid, occurrence_date)`, which is that table's own
  // unique key — never by matching a title.
  const expansions = plan.commitmentsToInsert.filter((row) => row.expandedFromDate !== null);
  if (expansions.length > 0) {
    const applied = await db
      .from("production_commitment")
      .select("id, source_uid, occurrence_date, calendar_key")
      .eq("calendar_key", calendarKey);
    if (applied.error) {
      console.error(`[production_mirror.write_stopped_partway] ${redactor.redact(describe(applied.error))}`);
      stop("write_stopped_partway", withCounts());
    }
    const commitmentIdByKey = new Map(
      (applied.data ?? []).map((row) => [`${row.source_uid}|${row.occurrence_date}`, row.id])
    );
    for (const row of expansions) {
      const parentId = commitmentIdByKey.get(`${row.sourceUid}|${row.expandedFromDate}`);
      const childId = commitmentIdByKey.get(`${row.sourceUid}|${row.occurrenceDate}`);
      if (parentId === undefined || childId === undefined || parentId === childId) continue;
      await step(() =>
        db.from("production_commitment").update({ expanded_from: parentId }).eq("id", childId)
      );
    }
  }

  if (plan.checklistItemsToInsert.length > 0) {
    const rows = plan.checklistItemsToInsert
      .filter((row) => planIdByKey.has(row.planKey))
      .map((row) => ({
        plan_id: planIdByKey.get(row.planKey) as string,
        kind: row.kind,
        label: row.label,
        due_date: row.dueDate,
        sort_order: row.sortOrder,
      }));
    if (rows.length > 0) await step(() => db.from("production_checklist_item").insert(rows));
    measured.checklistItemsWritten = rows.length;
  } else {
    measured.checklistItemsWritten = 0;
  }

  /* ── the line-up, written back BY THE SLOT ──────────────────────────────────
   *
   * ⚠ **One row per slot, and the array is where several people go.** A b2b is
   * one set and therefore one LiveCut, so the schema that stores it makes the
   * obvious count the right count.
   *
   * ⚠ **This is the only place in this route where a person's name is written
   * anywhere.** It goes into a column behind row-level security. Nothing about
   * these rows is reported: the field below is a count.
   */
  const lineupRowsToWrite: {
    plan_id: string;
    source_uid: string;
    start_time: string;
    end_time: string;
    artists: readonly string[];
    sort_order: number;
  }[] = [];
  for (const [nightKey, windows] of lineupSlotsByNight) {
    const planId = planIdByKey.get(nightKey);
    if (planId === undefined) continue;
    let order = 0;
    for (const held of [...windows.values()].sort((a, b) =>
      a.slot.startTime.localeCompare(b.slot.startTime)
    )) {
      lineupRowsToWrite.push({
        plan_id: planId,
        source_uid: held.sourceUid,
        start_time: held.slot.startTime,
        end_time: held.slot.endTime,
        artists: held.slot.artists,
        sort_order: order,
      });
      order += 1;
    }
  }
  if (lineupRowsToWrite.length > 0) {
    await step(() => db.from("production_lineup_slot").insert(lineupRowsToWrite));
  }
  measured.lineupSlotsWritten = lineupRowsToWrite.length;

  /* ── The re-attachment — the two exceptions of state (`ICS-03`) ─────────────
   *
   * ⚠ **A RESTORE IS NOT AN ACT.** The decisions go back with their ORIGINAL
   * instant and their ORIGINAL actor, written straight to their columns. They do
   * NOT go through the tick-recording function, which re-records who decided on
   * every call — running a restore through it would attribute every decision in
   * the calendar to this cron.
   *
   * ⚠ **Keyed on what survives.** A plan row's `id` is generated and did not
   * survive the removal, so both restores key on `source_uid`, and the decisions
   * on `(source_uid, kind, label)`.
   *
   * ⚠ **On this path both lists are empty by construction**: the unattended guard
   * above refused unless both counts were zero. The code is here anyway, and
   * deliberately: the guard is what makes the lists empty, and a writer that
   * could not put them back if they were not would be a writer that quietly
   * disagreed with the guard the day somebody flips
   * {@link MIRROR_RESTORE_PATH_VERIFIED}.
   */

  let linksPutBack = 0;
  let linksUnplaced = 0;
  for (const link of plan.linksToRestore) {
    const planId = planIdBySourceUid.get(link.planSourceUid);
    if (planId === undefined) {
      linksUnplaced += 1;
      continue;
    }
    const touched = await stepCounting(() =>
      db
        .from("production_plan")
        .update({ linked_party_id: link.linkedPartyId })
        .eq("id", planId)
        .select("id")
    );
    if (touched === 0) linksUnplaced += 1;
    else linksPutBack += touched;
  }
  measured.linksPutBack = linksPutBack;
  measured.linksUnplaced = linksUnplaced;

  let decisionsPutBack = 0;
  let decisionsUnplaced = 0;
  for (const decision of plan.decisionsToRestore) {
    const planId = planIdBySourceUid.get(decision.planSourceUid);
    if (planId === undefined) {
      decisionsUnplaced += 1;
      continue;
    }
    const touched = await stepCounting(() =>
      db
        .from("production_checklist_item")
        .update({
          // The originals. Not now, and not whoever ran this. `ticked_at` is
          // NULL on an untick and writing that null is the whole restore of that
          // direction.
          ticked_at: decision.tickedAt,
          ticked_by: decision.tickedBy,
          ticked_by_name: decision.tickedByName,
        })
        .eq("plan_id", planId)
        .eq("kind", decision.kind)
        .eq("label", decision.label)
        .select("id")
    );
    if (touched === 0) decisionsUnplaced += 1;
    else decisionsPutBack += touched;
  }
  measured.decisionsPutBack = decisionsPutBack;
  measured.decisionsUnplaced = decisionsUnplaced;

  /* ── A restore that matched nothing is a FINDING, not a quiet zero ─────────
   *
   * This project has no error tracking, so a log line alone is not an
   * observable effect (`meta-gates.md`). The count therefore rides out on the
   * run row as well, where the calendar surface draws it — and the run does not
   * get to look like a clean success while a person's decision went missing.
   *
   * Not a refusal: by the time this code runs the delete has already happened,
   * and refusing here would leave the scope emptier than a finished run. The
   * honest move is to finish the rewrite and say what was not put back.
   */
  if (decisionsUnplaced > 0 || linksUnplaced > 0) {
    console.error(
      `[production_mirror.restore_matched_no_row] calendar=${calendarKey} ` +
        `decisions_unplaced=${decisionsUnplaced} links_unplaced=${linksUnplaced} ` +
        "— the snapshot holds them and the catalogue does not"
    );
  }

  /* ── The run row is closed last ─────────────────────────────────────────── */

  const closed = await db
    .from("production_import_run")
    .update({
      finished_at: new Date().toISOString(),
      unsupported_recurrences: plan.unsupportedRecurrences.map((record) => ({
        source_uid: record.uid,
        reason: record.reason,
      })),
    })
    .eq("id", runId);

  if (closed.error) {
    console.error(`[production_mirror.write_stopped_partway] ${redactor.redact(describe(closed.error))}`);
    stop("write_stopped_partway", withCounts());
  }

  return withCounts();
}

/* ────────────────────────────────────────────────────────────────────────────
 * The run
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The status of the whole request: the worst of the calendars.
 *
 * `500` beats `409` beats `200`, and the ordering is the one a person needs:
 * a request in which one calendar stopped partway is a request that has to be
 * looked at before one in which another merely refused.
 */
function worstStatus(results: readonly CalendarResult[]): number {
  return results.reduce((worst, result) => Math.max(worst, MIRROR_HTTP[result.outcome]), 200);
}

/**
 * The mirror, once per declared calendar.
 *
 * ⚠ **The calendars run in sequence and one does not stop the next.** They are
 * separate scopes with separate registers, and a source that stopped answering
 * for one is not a reason to leave the others un-mirrored for a night. Each one
 * carries its own outcome into the body.
 */
export async function GET(request: Request) {
  /* ── The secret has to EXIST before it can be compared ─────────────────────
   *
   * ⚠ **The five older crons write `Bearer ${process.env.CRON_SECRET}` straight
   * into the comparison, and this one deliberately does not.** With the variable
   * absent that template collapses to the literal string `Bearer undefined`, and
   * anybody who sends exactly that header is admitted — a deployment missing the
   * variable does not fail closed, it fails OPEN.
   *
   * On the other five the cost of that is a reconciliation running for a
   * stranger. Here the success path is a `DELETE` across four tables with the
   * service role, on the one dataset in this project that no feed can rebuild.
   * The two are not the same bet, so this route does not take it.
   *
   * The other five are NOT changed from here: they move money, they are outside
   * this phase, and hardening them is its own decision with its own verification.
   * This comment is the record that the divergence is deliberate.
   */
  const cronSecret = process.env.CRON_SECRET;
  if (typeof cronSecret !== "string" || cronSecret.length === 0) {
    // Distinguishable from a wrong secret, and never says which is which to the
    // caller: 401 to them, a named category to whoever reads the deployment.
    console.error(
      "[production_mirror.cron_secret_absent] the route refused every request: " +
        "CRON_SECRET is not set in this environment"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: CalendarResult[] = [];

  for (const calendarKey of CALENDAR_KEYS) {
    const declaration: MirrorDeclaration = MIRRORED_TODAY[calendarKey];

    if (!declaration.mirrored) {
      results.push({
        calendarKey,
        outcome: "not_mirrored_by_declaration",
        report: MIRROR_REPORT.not_mirrored_by_declaration,
        counts: { withheldReason: declaration.reason },
      });
      continue;
    }

    // A redactor per calendar: one address never reaches another's sentences,
    // and nothing outlives the request.
    const redactor = newRedactor();

    try {
      const counts = await mirrorOneCalendar(calendarKey, redactor);
      results.push({
        calendarKey,
        outcome: "mirrored",
        report: MIRROR_REPORT.mirrored,
        counts,
      });
    } catch (caught) {
      if (caught instanceof MirrorStop) {
        results.push({
          calendarKey,
          outcome: caught.outcome,
          report: MIRROR_REPORT[caught.outcome],
          counts: caught.counts,
        });
        continue;
      }
      /*
       * ⚠ **NOTHING OF THE CAUGHT VALUE IS READ, AND THAT IS DEFENCE 1 AT ITS
       * SHARPEST EDGE.** An unexpected throw inside a parser or a client is the
       * one path whose message could carry a fragment of what it was reading,
       * and the platform's runtime logs are retained. So the category is the
       * whole of the diagnostic, and the calendar key beside it is a public
       * sigla.
       *
       * It is reported as a failure partway rather than as a refusal because
       * this handler cannot know which side of the first removal it happened on,
       * and the direction that costs a person an evening is the one that says
       * *go and look*.
       */
      console.error(`[production_mirror.write_stopped_partway] calendar=${calendarKey} unexpected`);
      results.push({
        calendarKey,
        outcome: "write_stopped_partway",
        report: MIRROR_REPORT.write_stopped_partway,
        counts: {},
      });
    }
  }

  const status = worstStatus(results);

  if (status !== 200) {
    // On failure only. A line every night on the success path is noise in the
    // one place a real failure has to be legible. Counts and categories, never a
    // word of what arrived.
    for (const result of results) {
      if (MIRROR_HTTP[result.outcome] === 200) continue;
      console.error(`[production_mirror.${result.outcome}] calendar=${result.calendarKey}`, result.counts);
    }
  }

  return NextResponse.json({ calendars: results }, { status });
}
