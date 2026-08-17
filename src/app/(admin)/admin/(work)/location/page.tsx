import { redirect } from "next/navigation";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import {
  SpaceList,
  type SpaceRow,
} from "@/app/(admin)/admin/location/SpaceList";
import { NewSpaceForm } from "@/app/(admin)/admin/location/SpaceForm";

import { VENUE_STAGES } from "@/lib/production/sections/vocabulary";
import type { ProductionSpace } from "@/types/database";

/**
 * The location section, S1 — every scouted space, with its stage beside its
 * name.
 *
 * ── Reachability is the map's answer, never this directory's ─────────────────
 *
 * `admin` in the URL is an address, not an authorisation
 * (`nextjs-architecture.md`, gate *il gruppo non autorizza*). What decides is the
 * row `"/admin/location"` under `CAP.PRODUCTION_LOCATION_MANAGE` in
 * `src/lib/routes/capability-routes.ts`, beside its dynamic sister
 * `"/admin/location/[id]"` — **one entry**, read by the middleware, by the guard
 * below and (from plan 45-18) by the staff tab, so the three cannot disagree
 * (D-34-09/D-34-10).
 *
 * ⚠ **That entry moved to the `routes:` branch in the same commit as this
 * file, and the order was forced rather than chosen.** It sat on the map's
 * `scope: "table"` branch from plan 45-05 until now, because until this file
 * existed the key gated rows and no address. A page bound to a table-only key is
 * unreachable **for everyone** — `resolveRoute` returns `null` and the
 * middleware fails closed — with **no build error and nothing in a log**, and
 * this project has no error tracking at all, so a section down for everybody is
 * a section nobody learns is down except by opening it. The asymmetry decides
 * the order: a page on disk with no entry is a build error; an entry whose page
 * is not on disk is silent.
 *
 * ⚠ `next build` would NOT have caught a missing row for the sister address.
 * The backward assertion `_everyStaffRouteIsBound` reads the GENERATED route
 * union, which holds no dynamic route at all, so it can see `/admin/location`
 * once this file exists and can never see `/admin/location/[id]`. The check that
 * sees both is `npm run verify:routes`, which censuses `page.tsx` from disk.
 *
 * ── The middleware is UX. The RLS is the boundary. ──────────────────────────
 *
 * The map decides where a **redirect** happens: it stops somebody arriving here.
 * It stops nobody reading a `production_space` row. The boundary is the
 * `SELECT` policies of `20260817120200_production_sections.sql`, each asking
 * `private.has_capability('production.location.manage')`, applied to production
 * by plan 45-08.
 *
 * **Which is why every read below goes through the cookie-bound client**, and
 * why this file constructs no service client. A read that bypasses the policy
 * proves nothing about the policy, and the policy is the fourth reader this
 * phase's criterion 4 is about. A page that fetched with the service key would
 * render identically for a subject the database would have refused — the exact
 * shape of a feature protected by a redirect alone. On this section that
 * mistake would serve names of spaces under negotiation to somebody the
 * database had already said no to.
 *
 * ── This list is empty today, and that is the state it ships in ─────────────
 *
 * The five tables were applied to production on 2026-08-17 (plan 45-08) and
 * **they hold no rows**: the scouting seed is plan 45-10, which is a separate
 * authorisation to write to production and has not been given. So the ordinary
 * first render of this page is the empty state, and the empty state is written
 * to say which emptiness it is rather than to look like a list that finished
 * loading.
 *
 * ── The names do not leave this render ──────────────────────────────────────
 *
 * `production_space.name` may name a space under negotiation, and a negotiation
 * made public does not come back (`venue-acquisition.md`, gate *uno spazio non
 * acquisito non si nomina*). It travels from the query into a table cell and
 * nowhere else: it is in no `console.*`, no thrown message, no page title, no
 * analytics call and no `aria-label`.
 *
 * **The address is not read at all by this page.** It is not in the select
 * below and it is not a field of `SpaceRow`, so it cannot reach this surface by
 * accident — a list is a thing people screenshot, and this column holds a street
 * address with a house number on a large minority of the rows it will carry.
 *
 * The same rule is why the failure branch logs `error.code` and `error.message`
 * and **never** the error object and never PostgREST's third field — which
 * carries the rejected row, and here that row carries a name.
 */
export default async function AdminLocationPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone.
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_LOCATION_MANAGE)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  /*
    ONE READ, ZERO EMBEDS — AND THE EMBED CHECK IS WRITTEN ANYWAY.

    An embed through a table that has MORE THAN ONE relationship to the embedded
    table is answered by PostgREST with `HTTP 300 PGRST201`, and the failure is
    SILENT through this client: `data` comes back null with no exception thrown,
    and the page renders an empty list. The measured precedent in this repository
    is an unqualified embed of `party_series` through `event_parties`. On this
    surface that failure mode is worse than usual, because *the list is empty*
    is ALSO the true state today — an ambiguous embed here would be
    indistinguishable from the seed not having run.

    So the two relations of `20260817120100_production_location.sql` were read
    out of the file rather than assumed, and the derivation is recorded here for
    whoever adds the first embed to this read:

      production_space → formats                    one FK, `home_format_id`
      production_space ← production_space_attribute one FK, `space_id`

    and no junction table carries foreign keys to both sides of either, so
    neither can be read as a many-to-many. Two further foreign keys leave this
    table — `promoted_venue_id` to `public.venues` and `created_by` to
    `public.profiles` — and neither is embedded anywhere in this section.

    ⚠ **THIS READ USES NEITHER OF THE TWO, AND THAT IS THE POINT.** The list
    draws no score, so it needs no attribute; and it draws no home format, so it
    needs no catalogue join. Reading ten attribute rows per space to render
    nothing would be the ambiguity risk taken for no return. The attributes are
    embedded on the detail page, where the scores are computed, and the check is
    re-derived there rather than inherited.

    `promoted_venue_id` is deliberately NOT embedded and never will be here: it
    points at `public.venues`, which is the list a night's venue is chosen from
    and the head of the one public road to an address. This table has no edge
    into that road, and a join written for convenience would be the first one.
  */
  const { data: spaceRows, error: spaceError } = await supabase
    .from("production_space")
    .select("id, name, stage, category, size_band, real_capacity, exit_reason")
    .order("name", { ascending: true });

  /*
    THREE OUTCOMES, NEVER TWO (OBS-03).

    Rows returned; zero rows; and THE READ ITSELF FAILED. The third gets its own
    sentence and never the empty state, because *no space has been imported* and
    *we could not read the list* have different next steps — and on this section
    the first of those two is TRUE TODAY, which makes the pair especially easy
    to confuse. This repository has no error tracking at all, so a failure that
    is only logged reaches nobody: the sentence on the screen IS the observable
    effect.

    `error.code` and `error.message` only. Never the error object, and never
    PostgREST's third field, which carries the rejected row — and that row
    carries a space's name.
  */
  if (spaceError) {
    console.error(
      `[location.list_read_failed] code=${spaceError.code} message=${spaceError.message}`
    );
    return <LocationReadFailed />;
  }

  const rows = orderByStageThenName((spaceRows as SpaceSelectRow[] | null) ?? []);

  return (
    /*
      `wide`, and this is a DECISION that adds `/admin/location` to the closed
      wide list of `41-UI-SPEC.md` §4 — declared here and recorded in this plan's
      SUMMARY, per that document's own discipline of editing such a list by
      decision and not by diff. The qualification is met literally, on the same
      reading the calendar's list met it: the surface's primary object is a dense
      table.

      `loading.tsx` beside this file carries the same width for the same reason:
      a placeholder at a different maximum makes the content jump sideways the
      moment the data lands.
    */
    <PageShell width="wide">
      <header className="pb-6">
        <PageTitle>Location</PageTitle>
        <NobodyHasBeenCalled />
      </header>

      <SpaceList rows={rows} empty={<NeverSeeded />} />

      {/*
        THE ONE WRITE ON THIS SURFACE, AND IT IS NOT AN UPLOAD.

        Plan 45-13 gives `createSpace` a place to be reached from. Without one it
        would be an endpoint nobody can reach through the product and anybody can
        reach with a forged body, which is strictly worse than not having it.

        ⚠ It does not contradict the empty state above. Typing one space by hand
        is not importing the archive: the scouting stays a local file and the
        import stays a local script, and nothing here accepts a document. The
        idempotence key of the import is left null on a hand-typed row for
        exactly that reason — the column's own comment says so.

        And it carries NO stage control. A new row lands at the lowest stage by
        the column's default, which is the only kind of default that is safe
        here: it can never manufacture progress.
      */}
      <div className="pt-8">
        <NewSpaceForm />
      </div>
    </PageShell>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The standing sentence, and the two states that are not a list of rows
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The one paragraph this surface may not be read without.
 *
 * `venue-acquisition.md` states it twice as a gate — *una classifica non è una
 * disponibilità*, and *when presenting a ranking: say explicitly that no one has
 * been called*. A page listing 184 places, each with a stage and a suitability a
 * click away, is exactly the surface where a reader takes a list of candidates
 * for a list of options, and the module says the surface has to say so rather
 * than leave it to be known.
 *
 * It renders on every visit, above the list, and it is not behind a click: a
 * disclosure is read by whoever already knew.
 */
function NobodyHasBeenCalled() {
  return (
    <p className="mt-2 max-w-3xl text-sm text-muted">
      Desk work. <strong className="font-semibold text-ink">Nobody has been
      called.</strong> A stage says how far a space has got — and{" "}
      <em>acquired</em> means in writing, not that somebody said yes on the
      phone. A score, on a space&apos;s own page, says how well it{" "}
      <em>would</em> suit one format. Neither says a space would host us, and no
      space is named in any material before it is acquired.
    </p>
  );
}

/**
 * The failed read — and it is deliberately NOT the empty state.
 *
 * An empty list and a failed read look identical on a screen unless somebody
 * makes them different, and identical is the silent failure with a neutral face
 * this project has already paid for once (`meta-gates.md`, the newsletter
 * precedent). On this section the confusion is not hypothetical: the list is
 * genuinely empty until plan 45-10 seeds it, so a failed read would land on the
 * one page where *nothing here* is the expected sight.
 *
 * `role="alert"` so it is announced, and it is the only alert region on this
 * surface.
 */
function LocationReadFailed() {
  return (
    <PageShell width="wide">
      <header className="pb-6">
        <PageTitle>Location</PageTitle>
      </header>
      <div role="alert" className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">
          We could not read the scouted spaces.
        </p>
        <p className="mt-1 text-sm text-muted">
          This is a failed read, not an empty section. Reload the page; nothing
          in the data has changed.
        </p>
      </div>
    </PageShell>
  );
}

/**
 * The empty state — which is the state this section ships in.
 *
 * The five tables were applied to production on 2026-08-17 and hold no rows.
 * The scouting lives in a local file that is deliberately not in this
 * repository, and it arrives through a local script; there is no upload control
 * on this surface and there will not be one.
 *
 * **The second sentence is not decoration.** Without it a missing upload button
 * reads as an unfinished feature and somebody builds one — which would put the
 * whole scouting archive on a road that ends in a public repository. The same
 * absence, said out loud, is what the calendar's own empty state does.
 */
function NeverSeeded() {
  return (
    <>
      <p className="text-base font-semibold text-ink">
        No space has been imported yet
      </p>
      <p className="mt-1 text-sm text-muted">
        The scouting is a local file and the import is a local script. There is
        nothing to upload here — the file never leaves the machine that holds
        it.
      </p>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The order — by stage, then by name, and by nothing computed
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * How far each stage is from the bottom, most advanced first.
 *
 * **The database cannot do this ordering.** `stage` is `text`, so `ORDER BY
 * stage` sorts alphabetically — *acquired, contacted, mapped, verified* — which
 * is four words in an order that means nothing. `VENUE_STAGES` is the ordered
 * tuple and this reverses its index, so the sequence is *acquired · contacted ·
 * verified · mapped*.
 *
 * **Most advanced first, and it is a choice with a reason.** Today every row
 * would be at the bottom stage, so both directions draw the same page; the day
 * one space is acquired, it is the row whose distinctness has to survive a
 * screenful of candidates. A stage buried under 180 rows is a stage nobody
 * reads, and the whole reason the column exists is that it is read.
 *
 * ⚠ **This is not a ranking and cannot become one.** It orders by a recorded
 * fact — how far a conversation has got — and never by a computed suitability.
 * A list ordered by a score would be *una classifica* on the front page of the
 * section, which is the reading `venue-acquisition.md` forbids by name.
 */
const STAGE_ORDER: Readonly<Record<string, number>> = Object.fromEntries(
  VENUE_STAGES.map((stage, index) => [stage, VENUE_STAGES.length - 1 - index])
);

/**
 * The rows in reading order: stage first, then name.
 *
 * The name comparison is `localeCompare` with no locale argument, which is the
 * runtime's own collation — these are proper names of places, written the way
 * the place writes them, and a byte comparison would file every accented name
 * after every unaccented one.
 *
 * The sort is performed here rather than in the query for the reason in
 * `STAGE_ORDER`, and the page hands `SpaceList` a finished sequence: that
 * component re-orders nothing, so there is one place where this decision lives.
 */
function orderByStageThenName(rows: readonly SpaceSelectRow[]): SpaceRow[] {
  return rows
    .map(toSpaceRow)
    .sort(
      (a, b) =>
        (STAGE_ORDER[a.stage] ?? 0) - (STAGE_ORDER[b.stage] ?? 0) ||
        a.name.localeCompare(b.name)
    );
}

/**
 * A selected row, in the shape the list draws it.
 *
 * ⚠ **Nothing here invents a capacity from a band.** The two travel as the two
 * different facts they are: `size_band` is what the archive knows, and
 * `real_capacity` is *how many people actually fit* — the question only somebody
 * standing in the room can close. Measured on the scouting export: 38 of 184
 * records carry a number and 146 do not, so the missing case is ordinary and the
 * present case is real. A `?? 0` anywhere in this function would turn *nobody
 * measured this room* into *this room holds nobody*.
 */
function toSpaceRow(row: SpaceSelectRow): SpaceRow {
  return {
    id: row.id,
    name: row.name,
    stage: row.stage,
    category: row.category,
    sizeBand: row.size_band,
    realCapacity: row.real_capacity,
    exitReason: row.exit_reason,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The shape the select returns
 * ──────────────────────────────────────────────────────────────────────────── */

/*
  ⚠ NOTHING CHECKS THIS AGAINST THE DATABASE.

  No Supabase client in this repository is parameterised with `Database`, so
  `.select("…")` returns values the compiler cannot relate to a column, and the
  cast below is an assertion rather than a check.

  A green `npm run build` therefore proves that the JSX and the mappers
  type-check against THIS DECLARATION. It proves nothing whatever about whether
  a column is spelled the way the applied migration spells it. Every name in the
  select above was read by hand out of `20260817120100_production_location.sql`
  and checked against `ProductionSpace` in `src/types/database.ts`, which plan
  45-08 confirmed against the live catalogue read-back. That chain is the only
  check performed, and it is written down so nobody reads the green as a
  stronger claim than it is.

  The row type is COMPOSED from that interface with `Pick`, never restated: a
  second hand-written copy of a column list is a second place to change, and
  only one of the two would be changed.
*/
type SpaceSelectRow = Pick<
  ProductionSpace,
  "id" | "name" | "stage" | "category" | "size_band" | "real_capacity" | "exit_reason"
>;

/*
  ⚠ NOT CACHEABLE, AND SAID OUT LOUD RATHER THAN INHERITED.

  Every row on this surface names a space that may be under negotiation.
  `nextjs-architecture.md`'s gate *cache esplicita* requires a surface showing
  secret data to declare it, and its gate *service worker* is the sharper half:
  Serwist serves content when the network is missing, including OLD content, and
  a stale list of spaces is a set of names rendered to whoever is holding the
  phone now rather than to whoever was entitled when it was cached.

  `cookies()` inside `createClient` already opts this route out of static
  rendering, so this line changes no behaviour today. It is here because the
  reason must survive a refactor that removes the cookie read.
*/
export const dynamic = "force-dynamic";
