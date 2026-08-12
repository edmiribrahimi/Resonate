import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import FormatsCatalogue, {
  RetiredFormatsList,
  type CatalogueFormat,
} from "@/app/(admin)/admin/formats/FormatsCatalogue";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";

/**
 * The catalogue surface — the one place a person can see what formats and series
 * exist, change a name or a colour, list a format, and retire one.
 *
 * FMT-05 asks that labels and colours come from data, so that a colour changes
 * without a deploy and a retired sigla cannot appear on a forward-looking
 * surface. This page is where that data changes.
 *
 * ── This page asks a DIFFERENT key from its two sibling catalogue surfaces ────
 *
 * `(work)/venues/page.tsx` and `(work)/artists/page.tsx` both ask
 * `organizer.access`. This one asks **`catalogue.manage`**, and the divergence is
 * deliberate rather than an oversight to be tidied away later.
 *
 * `catalogue.manage` is `requires_approved = true`; `organizer.access` is not.
 * So a **pending** organizer reaches the venues listing and does not reach this
 * one — and that is the better refusal of the two. This surface is not a listing
 * with a couple of buttons on it: every control on it writes, and every one of
 * those writes re-asks `catalogue.manage` inside the action
 * (`admin/formats/actions.ts`). Letting a pending organizer in would draw them a
 * page whose every button refuses them, one press at a time, with no sentence
 * saying why — the silent failure with a neutral face this project has already
 * paid for once (`meta-gates.md`).
 *
 * And it is the key `src/lib/routes/capability-routes.ts` binds to this address
 * (plan 36-06). That is the part that is not a preference: the middleware reads
 * that entry, this guard reads that entry, and the staff tab reads that entry.
 * Three readers, one declaration, so they cannot disagree (D-34-09/D-34-10).
 *
 * ── What this file is, and what it is not ────────────────────────────────────
 *
 * It fetches, it lays out, and it holds no state. Every interactive affordance —
 * `Add format`, `Add series`, the edit triggers, the listing control, the retire
 * and restore confirmations — belongs to `FormatsCatalogue`, one directory out at
 * `src/app/(admin)/admin/formats/`. R-WORK-ROUTES keeps route files alone inside
 * `(work)`: a route group governs routing and nothing else, so a client component
 * moved in here would buy nothing and change the specifier in every file that
 * imports it (`nextjs-architecture.md`).
 */
export default async function AdminFormatsPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone.
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.CATALOGUE_MANAGE)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  /*
    Two reads, and NEITHER filters `retired_at` OR `listed`.

    That is what makes this the surface a retirement can be undone from and a
    format can be prepared on before anybody sees it. Both halves of the reason
    are true at once and both are worth writing down:

      * a caller who reaches this query holds `catalogue.manage`, so the
        `formats_select_catalogue_manage` and `party_series_select_catalogue_manage`
        arms admit every row — unlisted, retired, and series with no night yet;
      * a caller who does NOT hold it never reaches the query, because the guard
        above sent them to `/dashboard`. If they somehow did, RLS would still
        answer with the listed formats alone and with the series reachable
        through a published night — the row boundary does not depend on this
        page being correct.

    The order is `sort_order` then `name`: `sort_order` is spaced by ten so a
    fifth format can be placed between two without touching the others, and the
    name is the tie-break so two formats sharing a position do not swap places
    between two renders.
  */
  const { data: formatRows } = await supabase
    .from("formats")
    .select("id, slug, name, code, color, listed, retired_at, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const { data: seriesRows } = await supabase
    .from("party_series")
    .select("id, format_id, name, code, retired_at, highest_assigned")
    .order("code", { ascending: true })
    .order("name", { ascending: true });

  const formats: CatalogueFormat[] = (formatRows ?? []).map((row: RawFormat) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    code: row.code,
    color: row.color,
    listed: row.listed,
    sortOrder: row.sort_order,
    retiredAt: row.retired_at,
    series: (seriesRows ?? [])
      .filter((series: RawSeries) => series.format_id === row.id)
      .map((series: RawSeries) => ({
        id: series.id,
        name: series.name,
        code: series.code,
        retiredAt: series.retired_at,
        highestAssigned: series.highest_assigned,
      })),
  }));

  const active = formats.filter((format) => format.retiredAt === null);
  const retired = formats.filter((format) => format.retiredAt !== null);

  /*
    The colours already spoken for, keyed by upper-case hex.

    ⚠ RETIRED FORMATS ARE NOT IN THIS MAP, and that is the one thing on this page
    a green build cannot check. `formats_color_active_unique` is a PARTIAL unique
    index — `WHERE retired_at IS NULL` — so retiring a format RELEASES its tint
    and the next format may take it. A map built from `formats` instead of from
    `active` would compile, render, and refuse a colour that is in fact free,
    with a sentence naming a format nobody can see on the working list.
  */
  const takenBy: Record<string, string> = Object.fromEntries(
    active.map((format) => [format.color.toUpperCase(), format.name])
  );

  return (
    /*
      `default` and not `wide`: §4's wide list is closed and does not name this
      route. That is not a fallback — it is the answer for every surface nobody
      had to argue about, and the catalogue is a list of short rows rather than
      a dense table.

      The shell owns the maximum, the gutter, the vertical rhythm and the
      navigation clearance in BOTH tiers, so the page writes none of them: the
      hand-written bottom clearance this file used to carry was the phone number
      only, and from 768px up the navigation leaves the bottom edge entirely.
    */
    <PageShell width="default">
      <header className="pb-6">
        <PageTitle>Formats</PageTitle>
      </header>

      <div className="space-y-10">
        {formats.length === 0 && (
          /* §8.11's empty-state contract — a class string, not a component. */
          <div className="px-6 py-12 text-center">
            <p className="text-base font-semibold text-ink">No formats yet</p>
            <p className="mt-1 text-sm text-muted">
              A night cannot be saved without a format. Add the first one.
            </p>
          </div>
        )}

        {/*
          The active list. `takenBy` travels down so a colour already spoken for
          can be named with its holder instead of being discovered on save.
        */}
        <FormatsCatalogue formats={active} takenBy={takenBy} />

        {retired.length > 0 && (
          <section aria-labelledby="retired-formats-heading" className="space-y-3">
            {/*
              §7.3's one string, written out rather than imported: the section
              is named by this heading through `aria-labelledby`, so the heading
              needs an id, and D-41-11 is explicit that the component is a
              convenience — "a surface that writes the string is equally
              converted". Widening a primitive to carry one attribute would have
              been the more expensive of the two.
            */}
            <h2
              id="retired-formats-heading"
              className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted"
            >
              Retired
            </h2>

            {/*
              The sentence below is not decoration, and it is deliberately next
              to the control rather than only handled by it.

              Restoring is NOT the inverse of retiring. Retiring released this
              format's colour — the uniqueness index is partial on
              `retired_at IS NULL` — so another active format may hold it now,
              and `restoreFormat` is then refused. A reader who sees a reversible
              retirement and a restore that sometimes fails, with nothing written
              beside it, takes the asymmetry for a defect and "fixes" it.
            */}
            {/*
              The reading measure this paragraph used to carry is GONE, and it
              is a loss rather than a tidy. §4 gives the content maximum to the
              shell and D-41-06 says a converted page writes none of its own;
              G4 reads that literally, so a typographic measure on a `<p>` and a
              container maximum on a page root are the same string to it. The
              contract has no room for the first, this plan does not own the
              gate, and dodging the check with an inline style would be evasion
              with a different spelling. Recorded as DEF-41-04 so §4's next
              revision can decide whether a MEASURE is a MAXIMUM.
            */}
            <p className="text-xs text-muted">
              Restoring is not an undo. Retiring released the format&rsquo;s
              colour, so another format may hold it now — when it does, the
              restore is refused until one of the two takes a different colour.
              Nights already recorded under a retired format keep their name and
              stay where they are.
            </p>

            <RetiredFormatsList formats={retired} takenBy={takenBy} />
          </section>
        )}
      </div>
    </PageShell>
  );
}

/*
  The shapes, spelled out here because nothing checks them for us.

  No Supabase client in this repository is parameterised with `Database`
  (measured at four call sites in `36-06-SUMMARY.md`), so `.select("…")` returns
  values the compiler cannot relate to a column. A green `npm run build` proves
  the JSX type-checks against these declarations; it proves nothing about whether
  a column is spelled the way the applied migration spells it. Every name in the
  two selects above was read out of `20260810120000_formats_and_series.sql` by
  hand — that is the only check performed on them.
*/
interface RawFormat {
  id: string;
  slug: string;
  name: string;
  code: string;
  color: string;
  listed: boolean;
  retired_at: string | null;
  sort_order: number;
}

interface RawSeries {
  id: string;
  format_id: string;
  name: string;
  code: string;
  retired_at: string | null;
  highest_assigned: number;
}

/*
  The camelCase shapes the surface reads — `CatalogueFormat` and
  `CatalogueSeries` — are declared by `FormatsCatalogue.tsx` and imported, not
  re-declared here. Two declarations of one shape are two places to change, and
  only one of them would be changed.
*/
