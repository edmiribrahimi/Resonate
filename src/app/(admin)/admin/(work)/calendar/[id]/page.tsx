import { notFound, redirect } from "next/navigation";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import { turinToday, turinWallClock } from "@/utils/datetime";
import type { ChecklistItemView } from "@/app/(admin)/admin/calendar/ChecklistSection";
import {
  AnnounceNightDialog,
  CalendarNightChecklist,
} from "@/app/(admin)/admin/calendar/AnnounceNightDialog";
import {
  PiecesSection,
  type PieceRowView,
} from "@/app/(admin)/admin/calendar/PiecesSection";
import { StageBadge } from "@/components/production/StageBadge";
import type { PieceDateState } from "@/app/(admin)/admin/calendar/PieceDate";
import {
  formatCivilDate,
  formatProgressivo,
  isCivilDate,
} from "@/app/(admin)/admin/calendar/dates";

import { PIECE_KINDS, type PieceKind } from "@/lib/production/ics/vocabulary";
import type {
  ProductionChecklistItem,
  ProductionPiece,
  ProductionPlan,
} from "@/types/database";

/**
 * S2 — one night: its editorial pieces, and its checklist.
 *
 * ── Reachability is the map's answer, never this directory's ─────────────────
 *
 * `admin` in the URL is an address, not an authorisation
 * (`nextjs-architecture.md`, gate *il gruppo non autorizza*). What decides is the
 * row `"/admin/calendar/[id]"` under `CAP.PRODUCTION_CALENDAR_MANAGE` in
 * `src/lib/routes/capability-routes.ts`, sitting in **one entry** beside its list
 * `"/admin/calendar"` — read by the middleware, by the guard below and by the
 * staff tab, so the three cannot disagree (D-34-09/D-34-10). Plan 44-09 wrote
 * that entry; **no plan since has added a second entry or a second key.**
 *
 * ── The key was renamed by plan 45-05, and the reach did not move ────────────
 *
 * This guard asked `production.read` until that commit. PROD-02 makes
 * entitlement per SECTION, so the one key became four (D-45-04) and the calendar
 * took its own. The same two roles reach this page before and after — D-45-04
 * constraint 3 forbids the grants from narrowing or widening — and the database
 * still holds `production.read` until plan 45-08 applies the additive migration,
 * which leaves the old key and its grants in place precisely so that nobody is
 * refused at any instant of the sequence.
 *
 * ⚠ `next build` would NOT have caught a missing row for this address. The
 * backward assertion `_everyStaffRouteIsBound` reads the GENERATED route union,
 * which holds no dynamic route at all — so it can never see this one, and a green
 * build says nothing whatever about it. The check that sees it is
 * `npm run verify:routes`, which censuses `page.tsx` from disk. A page bound to
 * nothing is unreachable **for everyone**, with no build error and nothing in a
 * log, because `resolveRoute` returns `null` and the middleware fails closed.
 *
 * ── The middleware is UX. The RLS is the boundary. ──────────────────────────
 *
 * The map decides where a **redirect** happens: it stops somebody arriving here.
 * It stops nobody reading a `production_plan` row. The boundary is the six
 * `SELECT` policies rewritten by `20260817120000_production_section_keys.sql`
 * §3, each asking `private.has_capability('production.calendar.manage')`.
 *
 * **Which is why every read below goes through the cookie-bound client**, and why
 * this file constructs no service client. A read that bypasses the policy proves
 * nothing about the policy — a page fetching with the service key renders
 * identically for a subject the database would have refused, which is the exact
 * shape of a feature protected by a redirect alone.
 *
 * ── The parameter is shape-checked before it reaches a query ────────────────
 *
 * `id` is untrusted input arriving from the URL. It is tested against the UUID
 * pattern **before** the client is constructed, and a value that fails the shape
 * is `notFound()` rather than a query — the same discipline
 * `formats/actions.ts:111-113` keeps for its own identifiers.
 *
 * ── Three outcomes, never two ───────────────────────────────────────────────
 *
 * The row exists · the row does not exist · **the read itself failed.** The third
 * gets its own sentence and never `notFound()`, and on a page reached from a list
 * that distinction is not academic: a 404 here reads as *the night was deleted*,
 * which is a different fact with a very different next step. `.maybeSingle()`
 * rather than `.single()` is what makes the three separable — `.single()` answers
 * *no rows* with an error, collapsing outcomes two and three into one.
 *
 * This repository has **no error tracking at all**, so a failure that is only
 * logged reaches nobody: the sentence on the screen is the whole of the
 * observable effect (`meta-gates.md`).
 *
 * ── Nothing here builds a point in time ─────────────────────────────────────
 *
 * Every date on this surface is **civil** — a day on a calendar hanging on a
 * wall — formatted from its own characters by
 * `@/app/(admin)/admin/calendar/dates`. This file constructs no instant, calls no
 * locale formatter and imports no timezone library. A conversion that crosses
 * midnight moves a WEEKDAY, and the editorial pipeline is expressed in weekdays:
 * a moved weekday turns a conforming night into a reported error (D-44-25).
 *
 * The two values that genuinely need a clock — *is this checklist item past due*
 * and *when was this item ticked* — come from `@/utils/datetime`, the module
 * `time-and-scheduling.md` declares as the single home of a time boundary.
 *
 * ── The venue word does not leave this render ───────────────────────────────
 *
 * `production_plan.venue_word` may name a space under negotiation, and a
 * negotiation made public does not come back (`venue-acquisition.md`). It travels
 * from the query into the header line and nowhere else: it is in no `console.*`,
 * no thrown message, no page title, no analytics call and no `aria-label`. The
 * same rule is why the failure branch logs `error.code` and `error.message` and
 * **never** the error object and never PostgREST's `details` field — which
 * carries the rejected row, and here that row carries `venue_word`.
 *
 * ── There is no input on this surface ───────────────────────────────────────
 *
 * No date field, no date picker, no file input and no drag target (D-44-02,
 * D-44-26). The calendar file never leaves the machine that holds it; the import
 * is a local script, and a missing upload control on this page is a decision
 * rather than an unfinished feature.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The shape check, before anything is asked of the database
 * ──────────────────────────────────────────────────────────────────────────── */

/** The same shape as `formats/actions.ts:111-113`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ────────────────────────────────────────────────────────────────────────────
 * The strings this file adds to §13.4, each with its reason
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What the Night name reads when the import could not resolve the entry's
 * format.
 *
 * `production_plan.format_id` is nullable **on purpose**: an entry whose format
 * the import could not resolve *"is a finding to report, not a row to refuse —
 * and refusing it would lose the day, which is the one thing the calendar is
 * for."* So the row exists and has to be drawn, and S1 already draws this
 * sentence in the same case. One sentence for one fact across the surface.
 */
const FORMAT_NOT_RESOLVED = "Format not resolved";

/** The same shape and register as `NO_PROGRESSIVO`, and S1's own `no sigla`. */
const NO_SIGLA = "no sigla";

/**
 * What the header reads where the calendar entry carries no venue word.
 *
 * A sentence rather than a blank, and the stage badge beside it does **not**
 * disappear: a blank reads as *fine*, and *fine* is precisely the claim that
 * cannot be made about a space nobody has recorded.
 */
const NO_VENUE_WORD = "no venue recorded";

/**
 * What a piece waiting on the next edition is told it is waiting for, where the
 * night carries no series code or no progressivo of its own.
 *
 * *Waiting* without saying *for what* is a gap by another name (D-44-12), so the
 * edition is named wherever it can be — see {@link composeNextEdition}. Where it
 * cannot, this says so instead of composing half a sigla, which would name a
 * night that does not exist rather than one that does not exist **yet**.
 */
const NEXT_EDITION_UNNAMED = "the next edition of this series";

/* ────────────────────────────────────────────────────────────────────────────
 * The page
 * ──────────────────────────────────────────────────────────────────────────── */

export default async function CalendarNightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone.
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_CALENDAR_MANAGE)) {
    redirect("/dashboard");
  }

  // BEFORE the client, before the query. A parameter that is not the shape of an
  // identifier is not a lookup that returns nothing — it is not a lookup.
  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const supabase = await createClient();

  /*
    ONE READ, AND EVERY EMBED CHECKED AGAINST ITS FOREIGN KEYS.

    An embed through a table that has MORE THAN ONE relationship to the embedded
    table is answered by PostgREST with `HTTP 300 PGRST201` — and the failure is
    SILENT through this client: `data` comes back null with no exception thrown,
    and the page renders an empty night. The measured precedent in this
    repository is an unqualified embed of `party_series` through `event_parties`.

    These are the same four embeds plan 44-09 checked against
    `20260815120000_production_calendar.sql`, re-read rather than inherited:

      production_plan → formats                    one FK, `format_id`
      production_plan → party_series               one FK, `series_id`
      production_plan ← production_piece           one FK, `plan_id`
      production_plan ← production_checklist_item  one FK, `plan_id`

    and no junction table carries foreign keys to both sides of any of the four,
    so none can be read as a many-to-many either. All four are therefore
    unambiguous, and adding a constraint-name qualifier would be naming a
    generated identifier this file has no way to verify — which fails in exactly
    the same silent way an ambiguous embed does.

    `linked_party_id` is deliberately NOT embedded: it points at
    `public.event_parties`, whose read arms are a different question with a
    different audience.

    `.maybeSingle()` and not `.single()`: see the docblock's third outcome.
  */
  const { data: planRow, error: planError } = await supabase
    .from("production_plan")
    .select(
      `id, date, number, venue_word, venue_stage, format_id, linked_party_id,
       formats ( name ),
       party_series ( name, code ),
       production_piece ( id, kind, part_marker, date, origin, unresolved_reason ),
       production_checklist_item ( id, kind, label, due_date, sort_order,
                                   ticked_at, ticked_by_name )`
    )
    .eq("id", id)
    .maybeSingle();

  if (planError) {
    // `error.code` and `error.message` only. Never the error object, and never
    // `details`, which carries the rejected row — and this row carries the
    // venue word.
    console.error(
      `[calendar.night_read_failed] code=${planError.code} message=${planError.message}`
    );
    return <NightReadFailed />;
  }

  if (planRow === null) {
    notFound();
  }

  const plan = planRow as unknown as PlanRow;

  const pieceRows = plan.production_piece ?? null;
  const checklistRows = plan.production_checklist_item ?? null;

  /*
    WHETHER THIS FORMAT'S OBLIGATIONS ARE KNOWN AT ALL.

    Asked only where a section would otherwise be empty, and it is the difference
    between two sentences that look alike and are not: *this format owes no
    production steps* is a fact about the format, and *we do not know what this
    format owes* is a fact about our data. Drawing the first where the second is
    true is a plausible sentence covering a fault, which is the shape OBS-03
    refuses — and an empty checklist that reads as finished is the direction that
    hides work.

    A format the import could not resolve is by definition one whose obligations
    are unknown, so it short-circuits without a query.
  */
  let owedIsKnown = true;
  if ((pieceRows?.length ?? 0) === 0 || (checklistRows?.length ?? 0) === 0) {
    if (plan.format_id === null) {
      owedIsKnown = false;
    } else {
      const { data: ruleRows, error: ruleError } = await supabase
        .from("production_pipeline_rule")
        .select("id")
        .eq("format_id", plan.format_id)
        .limit(1);

      if (ruleError) {
        console.error(
          `[calendar.night_rules_read_failed] code=${ruleError.code} message=${ruleError.message}`
        );
        // The obligations are half of what this page states, so a read that did
        // not answer them is a failed read of the night and not a night with a
        // shorter list.
        return <NightReadFailed />;
      }

      owedIsKnown = (ruleRows?.length ?? 0) > 0;
    }
  }

  const today = turinToday();
  const formatName = plan.formats?.name ?? FORMAT_NOT_RESOLVED;
  const seriesCode = plan.party_series?.code ?? null;
  const nextEdition = composeNextEdition(seriesCode, plan.number);

  const pieces =
    pieceRows === null
      ? null
      : [...pieceRows]
          .sort(comparePieces)
          .map((row) => toPieceRow(row, nextEdition));

  const items =
    checklistRows === null
      ? null
      : [...checklistRows].sort(compareChecklistItems).map(toChecklistItem);

  return (
    /*
      `default` and not `wide`: §4's wide list is closed, and the entry this
      phase added to it by decision is the LIST, whose primary object is a dense
      table. A night is not one (`44-UI-SPEC.md` §9.1). `[id]/loading.tsx` beside
      this file carries the same width for the same reason a placeholder always
      does: a different maximum makes the content jump sideways the moment the
      data lands.
    */
    <PageShell width="default">
      <header className="pb-6">
        {/* The display face lands on the page title and nowhere else, and
            `normal-case` is DECLARED rather than assumed: `text-transform`
            inherits, `uppercase` appears in 43 files in this tree, and *we did
            not add `uppercase`* is a hope about every ancestor, not a
            guarantee. `SunSet`, `RamaDub`, `MotionLab` and `re:sonate` are read,
            not decorated — and the brand is written with a normal `e`. */}
        <PageTitle className="normal-case">
          {composeNightName(formatName, plan.venue_word, plan.number)}
        </PageTitle>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-xs font-semibold normal-case text-muted">
            {composeSigla(seriesCode, plan.number)}
          </span>
          <span className="font-mono text-xs font-semibold normal-case text-muted">
            {formatCivilDate(plan.date)}
          </span>
          <span className="text-sm text-muted">
            {plan.venue_word ?? NO_VENUE_WORD}
          </span>
          <StageBadge stage={plan.venue_stage} />
        </div>

        {/*
          THE ONE CTA OF THIS PHASE (§13.0), and the only control on either
          calendar surface that writes something the public may eventually see.

          Everything it needs to state its consequence is already on this page,
          so nothing extra is read for it: the stage the space has reached, the
          items still open, and whether the calendar row is already tied to a
          night. `openItems` travels as SENTENCES and never as a count —
          `Venue not confirmed in writing` reads as a decision, a figure reads
          as a formality (§11.2 part 3) — and `null` is carried through, because
          a checklist that could not be read is not a checklist with nothing on
          it.
        */}
        <div className="mt-4">
          <AnnounceNightDialog
            planId={plan.id}
            venueStage={plan.venue_stage}
            alreadyAnnounced={plan.linked_party_id !== null}
            openItems={
              items === null
                ? null
                : items.filter((item) => !item.ticked).map((item) => item.label)
            }
          />
        </div>
      </header>

      {/*
        PIECES ABOVE CHECKLIST, and the order is the contract's (§9.1).

        The checklist's items are mostly ABOUT the pieces, and reading a tick
        before knowing what it is about is reading an answer before the question.
      */}
      <div className="space-y-8">
        <Card>
          <SectionHeading>PIECES</SectionHeading>
          <PiecesSection
            pieces={pieces}
            empty={owedIsKnown ? <NothingWritten /> : <PiecesOwedUnknown />}
          />
        </Card>

        <Card>
          <SectionHeading>CHECKLIST</SectionHeading>
          {/*
            The tick is wired. `CalendarNightChecklist` is `ChecklistSection`
            with the act supplied — which removes the read-only notice and the
            `disabled` attribute the section draws in its absence.

            The wiring lives on the client side of the boundary because the
            mapping between the act's reason codes and the section's two
            sentences is a FUNCTION, and a function cannot travel from a server
            component into a client component as a prop.
          */}
          <CalendarNightChecklist
            items={items}
            today={today}
            empty={owedIsKnown ? <NoProductionSteps /> : <StepsOwedUnknown />}
          />
        </Card>
      </div>
    </PageShell>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The states that are not a night
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `44-UI-SPEC.md` §13.2 — and it is deliberately NOT `notFound()`.
 *
 * On a page reached from a list, a 404 reads as *the night was deleted*. It was
 * not: the read did not answer. The second sentence exists so the reader knows
 * there is nothing to repair in the data before reloading.
 *
 * `role="alert"` so it is announced, and it is the only alert region this file
 * renders.
 */
function NightReadFailed() {
  return (
    <PageShell width="default">
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

/** `44-UI-SPEC.md` §13.1, third row — verbatim. */
function NothingWritten() {
  return (
    <>
      <p className="text-base font-semibold text-ink">
        Nothing is written for this night yet
      </p>
      <p className="mt-1 text-sm text-muted">
        Every piece below is a proposal until it is written in the calendar file.
      </p>
    </>
  );
}

/** `44-UI-SPEC.md` §13.1, fourth row — verbatim. */
function NoProductionSteps() {
  return (
    <>
      <p className="text-base font-semibold text-ink">
        This format owes no production steps
      </p>
      <p className="mt-1 text-sm text-muted">Pieces still appear above.</p>
    </>
  );
}

/**
 * The emptiness §13.1 does not have a row for, and it is not the same fact.
 *
 * A format with no pipeline rule recorded — or one the import could not resolve
 * at all — owes an **unknown** amount, not nothing. Drawing §13.1's sentence
 * here would say *there is no work* on a night where nobody has established what
 * the work is, and the reader would have no reason to look further.
 */
function PiecesOwedUnknown() {
  return (
    <>
      <p className="text-base font-semibold text-ink">
        We do not know what this night owes
      </p>
      <p className="mt-1 text-sm text-muted">
        No pipeline rule is recorded for its format, so this is an unread plan
        rather than an empty one.
      </p>
    </>
  );
}

/** The checklist half of the same fact. Two sentences, because two next steps. */
function StepsOwedUnknown() {
  return (
    <>
      <p className="text-base font-semibold text-ink">
        We do not know what this night&apos;s production owes
      </p>
      <p className="mt-1 text-sm text-muted">
        No pipeline rule is recorded for its format. This is not a checklist with
        nothing left on it.
      </p>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Composing the three names the header carries
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `RamaDub x <venue> 001` — the format, the venue segment where the series has
 * one, and the progressivo.
 *
 * ⚠ **S1 composes the same name in `CalendarList.tsx`, and the two must move
 * together.** Neither is the source: the source is the published rule that the
 * name on the app is the name of the format, with its per-venue progressivo
 * (`brand-visual-system.md`, gate *il nome sull'app e' il nome del format*). The
 * duplication is written down rather than removed because the alternative was
 * exporting a helper typed against S1's thirteen-field row, which would have
 * made this page build a row it does not have.
 */
function composeNightName(
  formatName: string,
  venueWord: string | null,
  progressivo: number | null
): string {
  const head = venueWord === null ? formatName : `${formatName} x ${venueWord}`;
  return `${head} ${formatProgressivo(progressivo)}`;
}

/**
 * `RMDB-BZ-001` — the series code and the progressivo, composed.
 *
 * The series code and not the format's, because two satellite series legitimately
 * share the progressivo `001` and are told apart only by their code. Where the
 * series does not resolve there is no sigla to compose, and this says so rather
 * than printing half of one.
 */
function composeSigla(
  seriesCode: string | null,
  progressivo: number | null
): string {
  if (seriesCode === null) return NO_SIGLA;
  return `${seriesCode}-${formatProgressivo(progressivo)}`;
}

/**
 * The edition a waiting piece is waiting for.
 *
 * ⚠ **This is derived, and the derivation rests on a published rule rather than
 * on a guess.** A series' progressivi are appended to and never renumbered —
 * one of this project's three monotone guards — and they carry neither gaps nor
 * duplicates, so *the next edition of this series* is this night's number plus
 * one. Nothing in the data names it directly, because the night it names is
 * precisely the one that is **not in the calendar yet**: that is the state, not
 * a gap in it.
 *
 * Where the night carries no series code or no number of its own — an opening
 * act has no sigla, so it legitimately has no progressivo — no name is composed.
 * Half a sigla would name a night that does not exist rather than one that does
 * not exist yet.
 */
function composeNextEdition(
  seriesCode: string | null,
  progressivo: number | null
): string {
  if (seriesCode === null || progressivo === null) return NEXT_EDITION_UNNAMED;
  return `${seriesCode}-${formatProgressivo(progressivo + 1)}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Shaping the rows the two sections draw
 * ──────────────────────────────────────────────────────────────────────────── */

/** Where a kind falls in the vocabulary that declares the six. */
const KIND_ORDER: Record<PieceKind, number> = Object.fromEntries(
  PIECE_KINDS.map((kind, index) => [kind, index])
) as Record<PieceKind, number>;

/**
 * The pipeline's own order: by the day the piece falls on, and the undated ones
 * after them.
 *
 * **A piece with no date has no place in a sequence**, so it is not given a
 * guessed one: it goes after everything that can be placed, in the order the
 * vocabulary declares the six kinds. Interleaving it would put a date on it in
 * the reader's head, which is the one thing this surface may not do.
 *
 * The comparison between two dates is a string comparison on `YYYY-MM-DD` —
 * fixed width, most significant field first — so string order is date order and
 * nothing here builds an instant to sort by.
 */
function comparePieces(a: PieceRow, b: PieceRow): number {
  if (a.date !== null && b.date !== null && a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }
  if (a.date !== null && b.date === null) return -1;
  if (a.date === null && b.date !== null) return 1;

  const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  if (byKind !== 0) return byKind;

  const aMarker = a.part_marker ?? "";
  const bMarker = b.part_marker ?? "";
  return aMarker < bMarker ? -1 : aMarker > bMarker ? 1 : 0;
}

/**
 * A piece row as one of the five variants of `44-UI-SPEC.md` §7.
 *
 * The database makes a sixth shape unrepresentable:
 * `production_piece_date_xor_reason` requires exactly one of a date and a
 * reason, and `production_piece_proposal_has_no_source` stops a computed date
 * wearing the file's authority. The final branch therefore covers only
 * `not_derivable` — and it is also the least-claiming of the five if a row ever
 * arrived that the constraints say cannot, because *read it from the calendar*
 * is advice that is never wrong.
 */
function toPieceState(row: PieceRow, nextEdition: string): PieceDateState {
  if (row.date !== null) {
    return row.origin === "file"
      ? { origin: "file", date: row.date }
      : { origin: "proposed", date: row.date };
  }
  if (row.unresolved_reason === "awaiting_next_edition") {
    return { unresolved: "awaiting_next_edition", edition: nextEdition };
  }
  if (row.unresolved_reason === "depends_on_lineup") {
    return { unresolved: "depends_on_lineup" };
  }
  return { unresolved: "not_derivable" };
}

/**
 * ⚠ **No name is read here, and none is available to be read.** A LiveCut is
 * identified by its part marker; the file carries a marker and not a person, and
 * `PieceRowView` has no field a name could travel in. The stored column that
 * says whether a written date follows its rule is not read either: it feeds the
 * divergence report and reaches no pixel (D-44-10).
 */
function toPieceRow(row: PieceRow, nextEdition: string): PieceRowView {
  return {
    id: row.id,
    kind: row.kind,
    partMarker: row.part_marker,
    state: toPieceState(row, nextEdition),
  };
}

/** The import's own order, and the label as a stable tie-break. */
function compareChecklistItems(a: ChecklistRow, b: ChecklistRow): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
}

/**
 * When a tick was recorded, as a civil day.
 *
 * `ticked_at` is a `timestamptz` and is the one real instant on this surface, so
 * it is the one value that needs a zone. It is resolved by `turinWallClock` —
 * slicing the first ten characters of the ISO string is the wrong day for two
 * hours out of every twenty-four — and `null` is carried rather than replaced: a
 * stored timestamp that will not read is drawn as *we could not read this*,
 * never as a plausible-looking substitute.
 */
function tickedOnCivilDate(tickedAt: string | null): string | null {
  if (tickedAt === null) return null;
  const wall = turinWallClock(tickedAt);
  if (wall === null || !isCivilDate(wall.date)) return null;
  return wall.date;
}

function toChecklistItem(row: ChecklistRow): ChecklistItemView {
  return {
    id: row.id,
    label: row.label,
    dueDate: row.due_date,
    ticked: row.ticked_at !== null,
    tickedBy: row.ticked_by_name,
    tickedOn: tickedOnCivilDate(row.ticked_at),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The shapes the select returns
 * ──────────────────────────────────────────────────────────────────────────── */

/*
  ⚠ NOTHING CHECKS THESE AGAINST THE DATABASE.

  No Supabase client in this repository is parameterised with `Database`, so
  `.select("…")` returns values the compiler cannot relate to a column, and the
  cast above is an assertion rather than a check.

  A green `npm run build` therefore proves that the JSX and the mappers
  type-check against THESE DECLARATIONS. It proves nothing whatever about
  whether a column is spelled the way the applied migration spells it. Every
  name in the two selects above was read by hand out of
  `20260815120000_production_calendar.sql` and then checked against the six
  interfaces in `src/types/database.ts` — which plan 44-07 confirmed against a
  live catalogue read-back rather than against a migration file alone. That
  chain is the only check performed on them.

  The row types are COMPOSED from those interfaces with `Pick`, never restated:
  a second hand-written copy of a column list is a second place to change and
  only one of them would be changed. The embedded relations are spelled here
  only because `Pick` has no way to describe a PostgREST join.
*/

type PieceRow = Pick<
  ProductionPiece,
  "id" | "kind" | "part_marker" | "date" | "origin" | "unresolved_reason"
>;

type ChecklistRow = Pick<
  ProductionChecklistItem,
  "id" | "kind" | "label" | "due_date" | "sort_order" | "ticked_at" | "ticked_by_name"
>;

type PlanRow = Pick<
  ProductionPlan,
  | "id"
  | "date"
  | "number"
  | "venue_word"
  | "venue_stage"
  | "format_id"
  /**
   * The bridge to the announced night (D-44-06, D-44-07). Selected as a SCALAR
   * and deliberately not embedded: it points at the night's own table, whose
   * read arms are a different question with a different audience, and this page
   * needs only the one fact *is this night already announced*.
   */
  | "linked_party_id"
> & {
  /** One FK, `format_id`. Null where the import could not resolve the format. */
  formats: { name: string } | null;
  /** One FK, `series_id`. `code` is the sigla's first half. */
  party_series: { name: string; code: string } | null;
  production_piece: PieceRow[] | null;
  production_checklist_item: ChecklistRow[] | null;
};

/*
  ⚠ NOT CACHEABLE, AND SAID OUT LOUD RATHER THAN INHERITED.

  This page renders an unannounced date and the word for a space that may be
  under negotiation. `nextjs-architecture.md`'s gate *cache esplicita* requires a
  surface showing secret data to declare it, and its gate *service worker* is the
  sharper half: Serwist serves content when the network is missing, including OLD
  content, and a stale night is a date and a space rendered to whoever is holding
  the phone now rather than to whoever was entitled when it was cached.

  `cookies()` inside `createClient` already opts this route out of static
  rendering, so this line changes no behaviour today. It is here because the
  reason must survive a refactor that removes the cookie read.
*/
export const dynamic = "force-dynamic";
