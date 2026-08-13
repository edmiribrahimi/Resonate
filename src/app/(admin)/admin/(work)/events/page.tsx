import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import AnimatedSection from "@/components/motion/AnimatedSection";
import EventList from "@/components/events/EventList";
import { FOCUS_RING } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";

/**
 * The single events surface, where `/admin/events` and `/organizer/events` were
 * two (D-34-05).
 *
 * ── Two keys, because they are two questions ─────────────────────────────────
 *
 * Reachability is `organizer.access` — *may this account reach the events
 * surface* — and it is the key `CAPABILITY_ROUTES` binds `/admin/events` to
 * (`src/lib/routes/capability-routes.ts:254`), so the middleware and this page
 * read one declaration and cannot disagree (D-34-09).
 *
 * The row scope is `master.manage` — *may this account manage events it does
 * not own*. That key is declared `scope: "table"` in the map
 * (`capability-routes.ts:315-319`) precisely because it gates rows and reserved
 * operations, never addresses. Conflating the two would have been the naming
 * error `keys.ts:38-45` exists to prevent: a key named after its predicate
 * rather than after its question, invisible until the day the grants diverge.
 *
 * ── Nothing widened to make the collapse pass (D-34-06) ──────────────────────
 *
 * A master holds both keys, so the query stays unfiltered and this page shows a
 * master exactly what `/admin/events` showed. An organizer holds
 * `organizer.access` and not `master.manage`, so it is scoped to
 * `created_by = <their id>` — exactly what `/organizer/events` showed. The
 * address a role reaches changed; the rows it sees did not.
 *
 * The `admin.access` guard the `/admin` version carried is NOT the more
 * restrictive behaviour being abandoned: it guarded an address the route map
 * now binds to `organizer.access`, and it is the `master.manage` filter — taken
 * from the organizer version — that keeps every row verdict where it was.
 *
 * ── Both navs are the layout's ───────────────────────────────────────────────
 *
 * `(work)/layout.tsx` mounts the tab bar and the bottom bar once, and holds the
 * two role/status narrowings both versions of this page used to repeat.
 * `getAccessContext` is `cache()`-scoped per request, so asking again here for
 * this page's own guard costs no second round trip — and the page keeps asking,
 * because a layout is not a guard (D-34-09).
 */
export default async function EventsPage() {
  // Identity and capabilities come from the session, not from an inbound
  // request header a client can set.
  const { capabilities, userId } = await getAccessContext();

  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  // Narrow `userId` from `string | null` to `string` before it reaches the
  // filter below. Unreachable in practice — `organizer.access` is only ever
  // granted to an authenticated subject, and an anonymous caller resolves to
  // the empty set and was already sent away above.
  //
  // NOT `userId ?? ""`. The two are different requests on the wire, not two
  // spellings of one: postgrest-js serialises the value through a template
  // literal (`PostgrestFilterBuilder.ts:115`,
  // `searchParams.append(column, ` + "`eq.${value}`" + `)`), so `null` leaves as
  // `created_by=eq.null` and `""` leaves as `created_by=eq.`. Sending either
  // one silently is how a list page starts returning a set nobody asked for.
  //
  // ⚠️ MEASURED, and it is the reason this line is written rather than assumed:
  // **the typechecker does not enforce it.** Removing this block entirely and
  // passing `string | null` straight to `.eq()` produces NO error, and so does
  // passing an object literal — both were tried, the mutation was asserted
  // applied, and `npx tsc --noEmit` stayed green for both. The cause is the one
  // `keys.ts:22-24` already names: no Supabase client in this repository is
  // parameterised with a `Database` generic, so `eq()`'s value argument
  // degrades to an unchecked type and its `NonNullable` constraint never bites.
  // `npm run build` is this project's only automatic gate, and on this line it
  // is blind. This runtime refusal is the whole guard.
  if (!userId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const query = supabase
    .from("events")
    .select("id, title, date, is_published, created_by")
    .order("date", { ascending: false });

  // Master sees all; everyone else who reached this page sees their own.
  //
  // The polarity is deliberately "NOT master" rather than "IS organizer", and
  // that flip is the point of this line. Today the truth table is identical —
  // a master holds `master.manage` and gets the unfiltered query, an organizer
  // does not and gets `created_by = <their id>` — so this changes no verdict
  // for the three roles that exist. It changes what happens to the fourth.
  // `staff` arrives one phase later and grants no work permission; under the
  // old allow-list of one — a bare equality against the organizer role — a
  // `staff` account that reached this page would fail that equality, skip the
  // filter entirely, and see EVERY organizer's events.
  // Under a deny-list it inherits the narrow scope and sees its own, which is
  // none. A new role lands on the safe side by default, without anyone having
  // to remember this file.
  //
  // The key is `master.manage` because the question is "may this person manage
  // events they do not own" — the reserved-operation question `keys.ts:55`
  // names. Not `admin.access`, which asks "may they reach the master-only
  // surfaces"; this surface is not one of them. The two are granted to the same
  // role today and are not the same question, and picking by predicate instead
  // of by question is invisible until the day the grants diverge.
  //
  // This scope is a filter written in Node, not a security boundary. What a
  // caller may actually read from `events` is decided by the row-level
  // policies; this decides what the page asks for.
  if (!capabilities.has(CAP.MASTER_MANAGE)) {
    query.eq("created_by", userId);
  }

  const { data: events, error } = await query;

  if (error) {
    return (
      /*
        The refusal branch renders the SAME shell at the SAME maximum as the
        branch below it. A page that changed width when it failed would move
        the heading a person is looking at in the moment they most need it
        where they left it.

        The refusal itself is the semantic ink and the role that announces it,
        not a tinted box: the box stated nothing its sentence did not, and it
        was drawn in a raw palette. The message keeps the database's own words
        — this product has no error tracking, so a cause collapsed here is a
        cause nobody ever learns.
      */
      <PageShell width="default">
        <header className="mb-6">
          <PageTitle>Events</PageTitle>
        </header>
        <p role="alert" className="text-sm text-sem-crit">
          Failed to load events: {error.message}
        </p>
      </PageShell>
    );
  }

  return (
    /*
      `default` and not `wide`: §4's wide list is closed and does not name this
      route. That is not a fallback — it is the answer for every surface nobody
      had to argue about. The shell owns the maximum, the gutter, the vertical
      rhythm and the navigation clearance, so this file writes none of them, and
      the hand-written bottom clearance it used to carry was the phone's number
      only.
    */
    <PageShell width="default">
      <AnimatedSection>
        <header className="mb-6 flex items-center justify-between gap-3">
          {/*
            One surface, one heading. `<h1>Admin</h1>` and `<h1>Organizer</h1>`
            both named a role rather than the surface, and after the collapse
            this page serves both — so neither survives. "Events" is not an
            invention: it is the label `staff-tabs.ts:88` already gives this
            address, so the tab the viewer clicked and the heading they land on
            now read the same word. The wider vocabulary question — retiring
            `admin` from the URL and the headings — is Phase 40/41's, and this
            is not it.
          */}
          <PageTitle>Events</PageTitle>

          {/*
            The surface's one primary action, on the ladder's geometry — the
            44px floor, the named horizontal step, and an accent FILL whose ink
            is the ground at 6.85 : 1 where white on accent was 2.91 and failed
            1.4.3.

            It stays a `<Link>` rather than becoming the button ladder's anchor
            branch, and that is a decision rather than an oversight: the ladder
            renders a plain anchor, which in the App Router is a full document
            load. Converting this control onto it would have converted the
            appearance and quietly removed client-side navigation and
            prefetching from the primary action of a work surface — a behaviour
            change, which a visual conversion may not make. The class string is
            therefore written here, once, with the focus expression IMPORTED
            rather than re-spelled (§3.4). The gap it exposes — that neither the
            ladder nor the chip can BE a `next/link` — is reported by this
            plan's summary as a question owed, not answered here.
          */}
          <Link
            href="/admin/events/new"
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-semibold text-ground transition-all active:scale-95 active:opacity-80 ${FOCUS_RING}`}
          >
            Create Event
          </Link>
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <EventList events={events ?? []} />
      </AnimatedSection>
    </PageShell>
  );
}
