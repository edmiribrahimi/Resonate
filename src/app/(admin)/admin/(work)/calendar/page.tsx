import { redirect } from "next/navigation";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { turinToday } from "@/utils/datetime";
import {
  CalendarList,
  type CalendarNightRow,
  type CalendarCommitmentRow,
  type CalendarRow,
  type PieceTally,
} from "@/app/(admin)/admin/calendar/CalendarList";
import { formatProgressivo } from "@/app/(admin)/admin/calendar/dates";

import type {
  ProductionChecklistItem,
  ProductionCommitment,
  ProductionImportRun,
  ProductionPiece,
  ProductionPlan,
} from "@/types/database";

/**
 * S1 — the production calendar, in date order, across the whole archive.
 *
 * One night per row with its format, its series number, its venue word, how far
 * that space actually is and how much of its editorial plan is written; the days
 * already taken by somebody else's production in the same sequence; and, at the
 * foot, what the last import did.
 *
 * ── Reachability is the map's answer, never this directory's ─────────────────
 *
 * `admin` in the URL is an address, not an authorisation
 * (`nextjs-architecture.md`, gate *il gruppo non autorizza*). What decides is the
 * row `"/admin/calendar"` under `CAP.PRODUCTION_READ` in
 * `src/lib/routes/capability-routes.ts`, next to its dynamic sister
 * `"/admin/calendar/[id]"` — **one entry**, read by the middleware, by the guard
 * below and by the staff tab, so the three cannot disagree (D-34-09/D-34-10).
 *
 * That entry sat on the map's `scope: "table"` branch from plan 44-04 until this
 * plan, because until this file existed the key gated six tables and no address.
 * A page bound to a table-only key is unreachable **for everyone** —
 * `resolveRoute` returns `null` and the middleware fails closed — with no build
 * error and nothing in a log, which is why the move landed in the same plan as
 * the page rather than in a tidy-up afterwards.
 *
 * ⚠ `next build` would NOT have caught a missing row for the sister address. The
 * backward assertion `_everyStaffRouteIsBound` reads the GENERATED route union,
 * which holds no dynamic route at all, so it can see `/admin/calendar` once this
 * file exists and can never see `/admin/calendar/[id]`. The check that sees both
 * is `npm run verify:routes`, which censuses `page.tsx` from disk.
 *
 * ── The middleware is UX. The RLS is the boundary. ──────────────────────────
 *
 * The map decides where a **redirect** happens: it stops somebody arriving here.
 * It stops nobody reading a `production_plan` row. The boundary is the six
 * `SELECT` policies of `20260815120100_production_calendar_access.sql`, each
 * asking `private.has_capability('production.read')`.
 *
 * **Which is why every read below goes through the cookie-bound client**, and why
 * this file constructs no service client. A read that bypasses the policy proves
 * nothing about the policy, and the policy is the fourth reader this phase's
 * criterion 4 is about. A page that fetched with the service key would render
 * identically for a subject the database would have refused — the exact shape of
 * a feature protected by a redirect alone.
 *
 * ── Nothing here builds a point in time ─────────────────────────────────────
 *
 * Every date on this surface is a **civil** date — a day on a calendar hanging on
 * a wall — and it is formatted from its own characters by
 * `@/app/(admin)/admin/calendar/dates`. This file constructs no instant, calls no
 * locale formatter and imports no timezone library. A conversion that crosses
 * midnight moves a WEEKDAY, and the editorial pipeline is expressed in weekdays:
 * a moved weekday turns a conforming night into a reported error
 * (`production-calendar.md`, D-44-25).
 *
 * The one thing that genuinely needs a clock is *where does today fall in this
 * list* and *is this checklist item past due*. Both take `turinToday()` from
 * `@/utils/datetime`, which is the module `time-and-scheduling.md` declares as
 * the single home of a time boundary. **Not `current_date` in Postgres**: the
 * database session runs in UTC, so between midnight and 02:00 Turin time it
 * names yesterday — during precisely the hours a night is running. The
 * comparisons below are string comparisons between two `YYYY-MM-DD` values, which
 * are ordered identically to the dates themselves.
 *
 * ── The venue word does not leave this render ───────────────────────────────
 *
 * `production_plan.venue_word` may name a space under negotiation, and a
 * negotiation made public does not come back (`venue-acquisition.md`). It travels
 * from the query into a table cell and nowhere else: it is in no `console.*`, no
 * thrown message, no page title, no analytics call and no `aria-label`. The same
 * rule is why the failure branch below logs `error.code` and `error.message` and
 * **never** the error object and never PostgREST's `details` field — which
 * carries the rejected row, and here that row carries `venue_word`.
 */
export default async function AdminCalendarPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone.
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_READ)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  /*
    THREE READS, AND EVERY EMBED CHECKED AGAINST ITS FOREIGN KEYS.

    An embed through a table that has MORE THAN ONE relationship to the embedded
    table is answered by PostgREST with `HTTP 300 PGRST201` — and the failure is
    SILENT through this client: `data` comes back null with no exception thrown,
    and the page renders no events at all. The measured precedent in this
    repository is an unqualified embed of `party_series` through `event_parties`.

    So each of the four embeds below was checked against
    `20260815120000_production_calendar.sql` rather than assumed:

      production_plan → formats                 one FK, `format_id`
      production_plan → party_series            one FK, `series_id`
      production_plan ← production_piece        one FK, `plan_id`
      production_plan ← production_checklist_item  one FK, `plan_id`

    and no junction table carries foreign keys to both sides of any of the four,
    so none of them can be read as a many-to-many either. All four are therefore
    unambiguous, and adding a constraint-name qualifier would be naming a
    generated identifier this file has no way to verify.

    `linked_party_id` is deliberately NOT embedded. It points at
    `public.event_parties`, whose read arms are a different question with a
    different audience; this surface only needs to know WHETHER it is set.
  */
  const { data: planRows, error: planError } = await supabase
    .from("production_plan")
    .select(
      `id, source_uid, date, number, venue_word, venue_stage, linked_party_id,
       formats ( name ),
       party_series ( name, code ),
       production_piece ( id, origin, unresolved_reason ),
       production_checklist_item ( id, ticked_at, due_date )`
    )
    .order("date", { ascending: true });

  const { data: commitmentRows, error: commitmentError } = await supabase
    .from("production_commitment")
    .select("id, title, occurrence_date, start_time, end_time")
    .order("occurrence_date", { ascending: true });

  /*
    The last run, whichever run it was.

    A dry run is a real row and is not filtered out here: it IS the last thing
    that happened, and hiding it would leave the block describing a run that is
    no longer the most recent one. `ImportRunSummary` says which kind it was
    instead — the tallies of a run that applied nothing mean something different
    from the tallies of one that did, and the difference is drawn rather than
    left to be inferred.
  */
  const { data: runRows, error: runError } = await supabase
    .from("production_import_run")
    .select(
      `id, started_at, finished_at, file_byte_size, entries_seen, entries_by_class,
       unclassified_count, divergences, unsupported_recurrences, dry_run`
    )
    .order("started_at", { ascending: false })
    .limit(1);

  /*
    THREE OUTCOMES, NEVER TWO (OBS-03).

    Rows returned; zero rows; and THE READ ITSELF FAILED. The third gets its own
    sentence and never the empty state, because *the calendar is empty* and *we
    could not read the calendar* have different next steps and this repository has
    no error tracking at all — `package.json` carries no monitoring dependency, so
    a failure that is only logged reaches nobody. The observable effect IS the
    sentence on the screen.

    `error.code` and `error.message` only. Never the error object, and never
    `details`, which carries the rejected row.
  */
  const readError = planError ?? commitmentError ?? runError;
  if (readError) {
    console.error(
      `[calendar.read_failed] code=${readError.code} message=${readError.message}`
    );
    return <CalendarReadFailed />;
  }

  const today = turinToday();
  const lastRun = (runRows as ProductionImportRun[] | null)?.[0] ?? null;

  const nights = ((planRows as PlanRow[] | null) ?? []).map((row) =>
    toNightRow(row, today, lastRun)
  );
  const commitments = ((commitmentRows as CommitmentRow[] | null) ?? []).map(
    toCommitmentRow
  );

  const rows = mergeChronologically(nights, commitments, today);

  return (
    /*
      `wide`, and this is the decision that adds `/admin/calendar` to the closed
      wide list of `41-UI-SPEC.md` §4 — declared here and recorded in the plan's
      SUMMARY, per that document's own discipline of editing such a list by
      DECISION and not by diff. The qualification is met literally: the surface's
      primary object is a dense table (`44-UI-SPEC.md` §8.1).

      `loading.tsx` beside this file carries the same width for the same reason:
      a placeholder at a different maximum makes the content jump sideways the
      moment the data lands.
    */
    <PageShell width="wide">
      <header className="pb-6">
        <PageTitle>Calendar</PageTitle>
      </header>

      <div className="space-y-10">
        <CalendarList
          rows={rows}
          empty={lastRun === null ? <NeverImported /> : <NoNights />}
        />
      </div>
    </PageShell>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The three states that are not a list of rows
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `44-UI-SPEC.md` §13.2 — and it is deliberately NOT the empty state.
 *
 * An empty list and a failed read look identical on a screen unless somebody
 * makes them different, and identical is the silent failure with a neutral face
 * this project has already paid for once (`meta-gates.md`, the newsletter
 * precedent). The second sentence exists so the reader knows there is nothing to
 * repair in the data before reloading.
 *
 * `role="alert"` so it is announced, and it is the only alert region on this
 * surface, distinguishable from every other message on it (`44-UI-SPEC.md` §13.2).
 */
function CalendarReadFailed() {
  return (
    <PageShell width="wide">
      <header className="pb-6">
        <PageTitle>Calendar</PageTitle>
      </header>
      <div role="alert" className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">
          We could not read the production calendar.
        </p>
        <p className="mt-1 text-sm text-muted">
          This is a failed read, not an empty calendar. Reload the page; nothing
          in the data has changed.
        </p>
      </div>
    </PageShell>
  );
}

/**
 * `44-UI-SPEC.md` §13.1, first row — and the second sentence is not decoration.
 *
 * There is no upload control on this surface and there will not be one: the
 * calendar file never leaves the machine that holds it, and the import is a local
 * script (D-44-26). **Without the sentence, a missing upload button reads as an
 * unfinished feature and somebody builds it** — which is the whole reason the
 * copy contract spells the absence out instead of leaving it to be noticed.
 */
function NeverImported() {
  return (
    <>
      <p className="text-base font-semibold text-ink">
        The calendar has not been imported yet
      </p>
      <p className="mt-1 text-sm text-muted">
        Run the import on the machine that holds the calendar file. There is
        nothing to upload here — the file never leaves that machine.
      </p>
    </>
  );
}

/**
 * `44-UI-SPEC.md` §13.1, second row.
 *
 * A different fact from the one above, with a different repair: the import ran,
 * so the thing to check is which file it was given. Told apart by whether a
 * `production_import_run` row exists — which is why the run is read even on a
 * visit that draws no tallies.
 */
function NoNights() {
  return (
    <>
      <p className="text-base font-semibold text-ink">No nights in the calendar</p>
      <p className="mt-1 text-sm text-muted">
        The import ran and read no nights. Check that it was given the right file.
      </p>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The two strings this file adds to §13.4, each with its reason
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What the Night column reads when the import could not resolve the entry's
 * format.
 *
 * `production_plan.format_id` is nullable **on purpose**: the migration records
 * that an entry whose format the import could not resolve *"is a finding to
 * report, not a row to refuse — and refusing it would lose the day, which is the
 * one thing the calendar is for."* So the row exists and has to be drawn, and the
 * six columns of §8.2 have no form for it.
 *
 * A sentence rather than a blank, in the register `dates.ts` already sets for
 * this phase: a blank is indistinguishable from a value somebody chose to leave
 * empty, and those are different facts.
 */
const FORMAT_NOT_RESOLVED = "Format not resolved";

/**
 * What the Sigla column reads when neither the series nor the format carries a
 * code.
 *
 * The same shape and the same register as `NO_PROGRESSIVO` (`no number`) which
 * `dates.ts` already exports and this surface already draws — *this row has no
 * sigla*, said plainly, rather than an em-dash that would read as *fine*.
 */
const NO_SIGLA = "no sigla";

/**
 * What a taken day reads in the Night column when the entry carries no title.
 *
 * `production_commitment.title` is nullable, and the row still has to be drawn:
 * the whole reason it is in the calendar is so a night is not scheduled against
 * it, and a day that is taken is taken whether or not somebody named it. A blank
 * cell would read as a rendering fault and invite a reader to dismiss the row.
 *
 * It says nothing about whose the day is, which is the point: the title is
 * somebody else's and is not ours to publish, and its absence is not a fact worth
 * inventing a replacement for.
 */
const UNTITLED_COMMITMENT = "Untitled entry";

/* ────────────────────────────────────────────────────────────────────────────
 * Shaping a plan row into the row the list draws
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `RMDB-BZ-001` — the series code and the progressivo, composed.
 *
 * The series code where there is one, because two satellite series legitimately
 * share the progressivo `001` and are told apart only by their code. The format's
 * code is the fallback for a night whose series is not resolved; where neither
 * resolves there is no sigla to compose, and this says so rather than printing
 * half of one.
 */
function composeSigla(row: PlanRow): string {
  const code = row.party_series?.code ?? null;
  if (code === null) return NO_SIGLA;
  return `${code}-${formatProgressivo(row.number)}`;
}

/**
 * How much of a night's editorial plan is written — or the reason no figure may
 * be drawn (`44-UI-SPEC.md` §8.5).
 *
 * Three withholding rules, and the union `PieceTally` makes two of them
 * unrepresentable-otherwise:
 *
 *   · **the count could not be read** → `unreadable`, which the list draws as
 *     `We could not count`. Never `0`, never an em-dash. It is reachable: the
 *     embed comes back absent rather than empty when the join itself did not
 *     answer, and a `0` there would say *this night owes nothing*;
 *   · **a LiveCut count that is not knowable** → `lineup_dependent`, and NO
 *     FIGURE AT ALL. How many episodes a night owes descends from how many people
 *     played, so the OWED total is itself unknown — three is not a constant, and
 *     one archived edition carries two (D-44-13);
 *   · **a piece withheld for one of the other two reasons** is counted as
 *     `waiting` and never rolled into *missing*.
 *
 * `written` is `origin === "file"`: a date the calendar carries. A proposal is
 * owed and not written, which is the distinction D-44-09b exists to keep.
 */
function tallyPieces(pieces: PieceRow[] | null | undefined): PieceTally {
  if (pieces === null || pieces === undefined) return { state: "unreadable" };

  for (const piece of pieces) {
    if (piece.unresolved_reason === "depends_on_lineup") {
      return { state: "lineup_dependent" };
    }
  }

  let written = 0;
  let waiting = 0;
  for (const piece of pieces) {
    if (piece.origin === "file") written += 1;
    if (piece.unresolved_reason !== null) waiting += 1;
  }

  return { state: "counted", written, owed: pieces.length, waiting };
}

/**
 * How many of a night's checklist items are unticked and past due — or `null`,
 * meaning *we could not count*.
 *
 * ⚠ **The predicate is evaluated here and stored nowhere**, which is D-44-15
 * written as code: `ticked_at IS NULL AND due_date < today`. A stored lateness
 * flag is only true at the moment it is written, and keeping it true would need a
 * fifth nightly cron in a project whose four existing crons tell nobody when they
 * fail — giving the checklist a way to be quietly wrong in the one direction that
 * matters, showing a night as on time while it is late.
 *
 * `null` and not `0` where the items could not be read: `CalendarList` renders no
 * `Late` badge at all for `null`, and a `Late 0` — or worse, a silent absence
 * standing in for an unread count — would be a made-up number on the one mark a
 * person opens this page for.
 */
function countLate(
  items: ChecklistRow[] | null | undefined,
  today: string
): number | null {
  if (items === null || items === undefined) return null;

  let late = 0;
  for (const item of items) {
    if (item.ticked_at !== null) continue;
    if (item.due_date === null) continue;
    if (item.due_date < today) late += 1;
  }
  return late;
}

/**
 * Whether this night's plan row and its announced night disagree (D-44-07).
 *
 * There is no `diverged` column, and its absence is deliberate: a divergence is
 * found by the import and reported as a `(source_uid, reason)` pair on the run
 * row, which is exactly why those pairs carry a **uid** and never a title — a
 * title would name an unannounced date, and these values reach terminals and
 * screenshots.
 *
 * ⚠ **When `divergences` is null, no row is marked, and that is not this function
 * quietly answering `false`.** The fact that the divergence count could not be
 * read is drawn at the foot of the same page, where §10 requires that tally to
 * say `We could not count` rather than print a zero. The absence is observable —
 * on the block rather than on the row, because `CalendarNightRow.diverged` is a
 * boolean and this plan does not widen the contract 44-05 froze.
 */
function isDiverged(sourceUid: string, run: ProductionImportRun | null): boolean {
  const divergences = run?.divergences ?? null;
  if (divergences === null) return false;
  return divergences.some((entry) => entry.source_uid === sourceUid);
}

function toNightRow(
  row: PlanRow,
  today: string,
  run: ProductionImportRun | null
): CalendarNightRow {
  return {
    kind: "night",
    id: row.id,
    formatName: row.formats?.name ?? FORMAT_NOT_RESOLVED,
    seriesName: row.party_series?.name ?? null,
    venueWord: row.venue_word,
    venueStage: row.venue_stage,
    sigla: composeSigla(row),
    progressivo: row.number,
    date: row.date,
    announced: row.linked_party_id !== null,
    diverged: isDiverged(row.source_uid, run),
    lateCount: countLate(row.production_checklist_item, today),
    pieces: tallyPieces(row.production_piece),
  };
}

/**
 * A day already taken by something that is not ours.
 *
 * ⚠ **Nothing here reads a format, a series or a number, because
 * `CalendarCommitmentRow` has none and neither does the table** — the absence is
 * the deliverable (D-44-18). Handing an external commitment an identity it does
 * not have is a harm that travels: both values reach surfaces that name formats
 * and print sigle. The guarantee is structural at three levels — the column, the
 * type and the prop — and this function is the one place a caller could have
 * broken it by hand.
 *
 * The times fall back to a value the formatter refuses rather than to an invented
 * one: `formatCivilTimeRange` answers anything it cannot read with its own
 * sentence, so an all-day commitment reads as a time nobody can state instead of
 * as `00:00 → 00:00`, which would be a claim.
 */
function toCommitmentRow(row: CommitmentRow): CalendarCommitmentRow {
  return {
    kind: "commitment",
    id: row.id,
    title: row.title ?? UNTITLED_COMMITMENT,
    date: row.occurrence_date,
    startTime: row.start_time ?? "",
    endTime: row.end_time ?? "",
  };
}

/**
 * The two sequences into one, with today's position marked once.
 *
 * ⚠ **One chronological list and there is no second order.** The nights and the
 * taken days interleave, because the reason a commitment is in the calendar at
 * all is so that a night is not scheduled against it — and a separate section
 * makes the collision invisible, which is the one thing it exists to prevent
 * (§8.6).
 *
 * The `Today` marker goes **before the first row that is not in the past**, so
 * past and future stay one continuous list and the distance between the last
 * aired night and the next one is something you can see rather than something you
 * compute (§8.1). Where every row is past it lands at the end; where every row is
 * future it lands at the start; both are the same rule, not two cases.
 *
 * The sort is stable and the comparison is on the `YYYY-MM-DD` characters — fixed
 * width, most significant field first, so string order is date order. Nothing
 * here builds an instant to compare two days.
 */
function mergeChronologically(
  nights: readonly CalendarNightRow[],
  commitments: readonly CalendarCommitmentRow[],
  today: string
): CalendarRow[] {
  const dated = [...nights, ...commitments].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  const rows: CalendarRow[] = [];
  let markerPlaced = false;
  for (const row of dated) {
    if (!markerPlaced && row.date >= today) {
      rows.push({ kind: "today", id: "today-marker" });
      markerPlaced = true;
    }
    rows.push(row);
  }
  if (!markerPlaced && dated.length > 0) {
    rows.push({ kind: "today", id: "today-marker" });
  }

  return rows;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The shapes the three selects return
 * ──────────────────────────────────────────────────────────────────────────── */

/*
  ⚠ NOTHING CHECKS THESE AGAINST THE DATABASE.

  No Supabase client in this repository is parameterised with `Database`
  (measured at four call sites in `36-06-SUMMARY.md`, and restated at the head of
  the production block in `src/types/database.ts`), so `.select("…")` returns
  values the compiler cannot relate to a column, and the casts below are
  assertions rather than checks.

  A green `npm run build` therefore proves that the JSX and the mappers
  type-check against THESE DECLARATIONS. It proves nothing whatever about whether
  a column is spelled the way the applied migration spells it. Every name in the
  three selects above was read by hand out of
  `20260815120000_production_calendar.sql` and
  `20260815120100_production_calendar_access.sql`, and then checked against the
  six interfaces in `src/types/database.ts` — which plan 44-07 confirmed against
  the live catalogue read-back rather than against a migration file alone. That
  chain is the only check performed on them, and it is written down so nobody
  reads the green as a stronger claim than it is.

  The row types are COMPOSED from those six interfaces with `Pick`, never
  restated. A second hand-written copy of a column list is a second place to
  change and only one of them would be changed — and the embedded relations are
  spelled here only because `Pick` has no way to describe a PostgREST join.
*/

type PieceRow = Pick<ProductionPiece, "id" | "origin" | "unresolved_reason">;

type ChecklistRow = Pick<
  ProductionChecklistItem,
  "id" | "ticked_at" | "due_date"
>;

type PlanRow = Pick<
  ProductionPlan,
  | "id"
  | "source_uid"
  | "date"
  | "number"
  | "venue_word"
  | "venue_stage"
  | "linked_party_id"
> & {
  /** One FK, `format_id`. Null where the import could not resolve the format. */
  formats: { name: string } | null;
  /** One FK, `series_id`. `code` is the sigla's first half. */
  party_series: { name: string; code: string } | null;
  production_piece: PieceRow[] | null;
  production_checklist_item: ChecklistRow[] | null;
};

type CommitmentRow = Pick<
  ProductionCommitment,
  "id" | "title" | "occurrence_date" | "start_time" | "end_time"
>;

/*
  ⚠ NOT CACHEABLE, AND SAID OUT LOUD RATHER THAN INHERITED.

  Every row on this surface is an unannounced date, and some of them carry the
  word for a space that is under negotiation. `nextjs-architecture.md`'s gate
  *cache esplicita* requires a surface showing secret data to declare it, and its
  gate *service worker* is the sharper half: Serwist serves content when the
  network is missing, including OLD content, and a stale calendar is a set of
  dates and spaces rendered to whoever is holding the phone now rather than to
  whoever was entitled when it was cached.

  `cookies()` inside `createClient` already opts this route out of static
  rendering, so this line changes no behaviour today. It is here because the
  reason must survive a refactor that removes the cookie read.
*/
export const dynamic = "force-dynamic";
