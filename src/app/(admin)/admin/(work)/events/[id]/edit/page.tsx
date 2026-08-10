import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import EventForm from "@/components/events/EventForm";
// R-WORK-ROUTES: inside `(work)` there are only route files, so the panel lives
// one level out and is imported by absolute specifier — the same shape
// `FormatsCatalogue.tsx:8-11` uses for `RetireFormatDialog`.
import VenueRevealPanel from "@/app/(admin)/admin/events/[id]/reveal/VenueRevealPanel";
import { updateEvent } from "@/app/(admin)/admin/events/actions";
import type { NightRefusal } from "@/app/(admin)/admin/events/actions";
import type { AccessType } from "@/types/database";

/**
 * Edit an event — the single surface, where there were two.
 *
 * ── The collapse, divergence by divergence (D-34-05) ─────────────────────────
 *
 * The `/admin` and `/organizer` twins differed on five axes. Each verdict below
 * is decided by a grant row, never by preference:
 *
 *  1. **The guard.** `admin.access` (the `/admin` twin) → `organizer.access`.
 *     Decided by `('master','organizer.access',false)` and
 *     `('organizer','organizer.access',false)`
 *     (`20260807000000_capability_model.sql:411-412`), which is the key
 *     `/admin/events/[id]/edit` is bound to in
 *     `src/lib/routes/capability-routes.ts:256`. **Not a widening:** an
 *     organizer opened a byte-equivalent page at `/organizer/events/[id]/edit`
 *     today. No role reaches this surface that did not reach it before, and
 *     `organizer.access` is held by `master` and `organizer` only — a `staff`
 *     role gains nothing.
 *
 *  2. **Ownership.** The `/organizer` twin called `ownsOrIsMaster`; the
 *     `/admin` twin did not. Resolved towards the **more restrictive** of the
 *     two (D-34-06), which is also the only direction that keeps the interface
 *     agreeing with the row-level boundary: the `events` UPDATE policy is
 *     `(auth.uid() = created_by) OR has_capability('master.manage')`
 *     (`20260807010000_policies_to_capabilities.sql:255`) — the same truth
 *     table `ownsOrIsMaster` states. A master is unaffected
 *     (`('master','master.manage',false)`, `:396`, short-circuits first); an
 *     organizer is admitted on their own events, exactly as at the address they
 *     used yesterday.
 *
 *  3. **The venue — REWRITTEN by plan 37-11 on 2026-08-11. Read the second
 *     paragraph: it governs.**
 *
 *     ── The superseded text, quoted rather than deleted ────────────────────
 *
 *       "**The venue is not revealed one moment earlier by this file.** The
 *        page renders `venue_secret`, `venue_secret_hint`,
 *        `venue_reveal_hours` and `venue_reveal_on_purchase`, so the two gates
 *        above are the only thing between an address and a browser.
 *        `venue_reveal_sent` is monotone (`meta-gates.md`) and this merge makes
 *        neither gate easier to pass — it adds one that the `/admin` twin
 *        lacked. The `event_parties` SELECT and the `initialData` mapping are
 *        carried across **unchanged**: they were byte-identical in both twins,
 *        `menu_closes_at` included, and a routing merge is not the place to
 *        edit a reveal setting."
 *
 *     It was true of the merge it described, and it stays here for the reason
 *     `20260809002000_assignment_acts.sql:110-203` gives about its own rewrite:
 *     a declaration removed without its reason comes back as folklore, and the
 *     next reader "repairs" it. A reader who arrives at the paragraph above
 *     first is told, here, that there is a later one and which of the two
 *     holds.
 *
 *     ── What is true from this commit on ───────────────────────────────────
 *
 *     **This page carries a path that reveals.** `VenueRevealPanel` is mounted
 *     below the form, once per secret night, and pressing its button performs
 *     **one act with both effects** (D-37-01): the address leaves by mail for
 *     whoever is entitled, and the night's public page stops hiding it. There
 *     is no undo — `venue-secrecy.md` treats every caller of that path as
 *     Critical, and this file is now one of them.
 *
 *     Four things keep that from being a widening of the gates above:
 *
 *       * **The key is not this page's key.** `/admin/events/[id]/edit` is
 *         opened by `organizer.access`; letting an address out asks the
 *         thirteenth capability, `venue.reveal`, which carries
 *         `requires_approved = true` on **both** of its grants
 *         (`20260810160000_manual_venue_reveal.sql:105-123`). That is D-37-14:
 *         `staff.manage` ignores approval on purpose, because an organizer
 *         still pending must not be turned away in front of a queue — a reason
 *         that does not exist in front of an address that does not come back.
 *         So the panel is drawn only to a holder, and a non-holder reads one
 *         sentence saying why there is nothing to press.
 *       * **Not drawing it is not protecting it, and nothing here pretends
 *         otherwise.** The guard is inside
 *         `src/app/(admin)/admin/events/[id]/reveal/actions.ts`, which re-asks
 *         `venue.reveal` as the first instruction of every export, and inside
 *         `public.record_venue_reveal_act`, which is executable by
 *         `service_role` alone. A server action is a public endpoint with a
 *         convenient signature; the check on this page is an affordance.
 *       * **`venue_reveal_sent` is still not touched by this file, and it is
 *         still monotone.** The per-recipient switch is raised only by the
 *         sending module, batch by batch, after a batch has actually left. What
 *         the act moves is `venue_revealed_at`, a different column with a
 *         different meaning — *the page is open* rather than *the mails have
 *         gone* — and the one widening of it, the master-only re-hide of
 *         D-37-22, is declared inside the writer beside the line that performs
 *         it. Every act, in all three directions, is appended to
 *         `public.venue_reveal_acts` with the actor's full name, and that trace
 *         is never cleared.
 *       * **No time limit, and that is a decision (D-37-11).** Nothing compares
 *         the clock with the night's start. The brake is the confirmation and
 *         the number of people in it, not an hour: a technical ceiling would be
 *         worked around by moving the automatic window instead — the same act,
 *         one step further away, and no trace at all.
 *
 *     And the last sentence of the superseded paragraph is now false in its
 *     letter as well: **the `event_parties` SELECT is no longer carried across
 *     unchanged.** `venue_revealed_at` is added to it, because the panel is
 *     given what the page rendered so it can say so when the two disagree.
 *
 *  4. **The address.** `/organizer/events` → `/admin/events` (D-34-01), on the
 *     back link and on the ownership refusal. The destination is unchanged in
 *     substance: `/organizer/events` answers with a redirect to `/admin/events`
 *     (plan 34-03), so only the hop is gone.
 *
 *  5. **The `Manage Drink Menu` link**, which only the `/organizer` twin drew.
 *     Kept. It is an affordance, not access: `/admin/events/[id]/drinks` is
 *     bound to the **same** `organizer.access` row
 *     (`capability-routes.ts:260`), so every viewer who reaches this page
 *     already reaches that one, and the drinks page re-asks for itself. Nothing
 *     is revealed by a link to a page the reader may already open.
 *
 * The function name, the comment wording and the import order were the
 * remaining differences — cosmetic, with no verdict attached.
 *
 * ── What this page no longer does ────────────────────────────────────────────
 *
 * The two nav mounts and the two role/status narrowing casts are gone:
 * `admin/(work)/layout.tsx` resolves the context once for the whole tree and
 * draws both navs (D-34-07). The guard below stays (D-34-09) — the
 * middleware and this page give the same verdict because they read the same
 * entry, and a page protected by a redirect alone is not protected
 * (`access-gating.md`).
 *
 * `getAccessContext` is `cache()`-scoped per request, so asking it again after
 * the layout costs no second round trip.
 *
 * ── The catalogue read, and its two deliberate non-filters ───────────────────
 *
 * 1. **Not filtered on `listed`.** `listed` and `retired_at` are different axes:
 *    `retired_at` says NO NEW NIGHT MAY BE ASSIGNED TO THIS, `listed` says A
 *    PERSON HAS DECIDED THIS MAY BE SEEN. A format must be assignable to a night
 *    before it is announced — the entire point of the separation D-36-17
 *    introduced — so filtering the select on `listed` would make a format
 *    unusable until the moment it becomes public.
 *
 * 2. **Not filtered on `retired_at` either, unlike the create page.** A night on
 *    this page may already carry a retired format, and the select has to be able
 *    to display the truth: omitting the row would mean that merely opening this
 *    form and saving would silently reassign an archived night, and archived
 *    nights are not rewritten (D-36-10). `EventForm` does the filtering — active
 *    formats, plus the retired one this particular night already carries — and
 *    `updateEvent` refuses a *change to* a retired format, which is the half
 *    that survives a forged POST.
 *
 * Both queries use the COOKIE client, so the caller's own capabilities decide
 * what comes back: the listed formats to everyone, and everything to a holder
 * of `catalogue.manage`.
 */

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, title, description, date, venue_secret, lineup, cover_image, is_published, created_by"
    )
    .eq("id", eventId)
    .single();

  if (error || !event) {
    notFound();
  }

  // Ownership — one call, never a re-inlined comparison. Master short-circuits
  // before the row is considered; a null identity and an unowned row both
  // refuse. See axis 2 above for the grant row that decides it.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/admin/events");
  }

  // Fetch parties for this event (with venue join).
  //
  // `format_id`, `series_id` and `number` are on this projection, and they have
  // to be: a field added to the form's shape but not to what the page reads
  // arrives as `undefined`, the select opens empty on a night that HAS a format,
  // and saving reassigns it. `npm run build` cannot catch it — no Supabase
  // client in this repository is parameterised with `Database`.
  //
  // `venue_revealed_at` is here for the reveal panel below, and for one purpose
  // only: it is what THIS render saw, read through the caller's own session,
  // and the panel compares it with what it reads a moment later through the
  // service client. A disagreement means somebody acted on this night in
  // between, and the panel says so instead of letting the form above be edited
  // one act behind. It never draws the button — see axis 3 of the docblock.
  const { data: parties } = await supabase
    .from("event_parties")
    .select("id, title, description, date, time, end_time, menu_closes_at, venue_text, access_type, capacity, sort_order, venue_id, lineup, venue_secret, venue_secret_hint, venue_reveal_hours, venue_reveal_on_purchase, venue_revealed_at, format_id, series_id, number, venues(name)")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  const [{ data: formats, error: formatsError }, { data: series, error: seriesError }] =
    await Promise.all([
      supabase
        .from("formats")
        .select("id, name, color, retired_at")
        .order("sort_order", { ascending: true }),
      supabase
        .from("party_series")
        .select("id, format_id, name, highest_assigned")
        .order("name", { ascending: true }),
    ]);

  // A failed catalogue read does NOT render a form with empty selects.
  //
  // `/events` turns a failed read into an empty list (`page.tsx:135-139`) and
  // `meta-gates.md` names that shape as the one not to repeat. Here it would be
  // worse than an empty page: the selects would open blank on nights that
  // already have a format and a series, and saving would rewrite them.
  if (formatsError || seriesError) {
    console.error(
      `[events.catalogue_read_failed] event=${eventId} ` +
        `formats=${formatsError?.code ?? "ok"} series=${seriesError?.code ?? "ok"}`
    );
    return (
      <div className="min-h-dvh pb-24">
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
        </header>
        <div className="px-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">
              The list of formats and series could not be loaded, so this form cannot be
              shown. Editing now would open the format and series fields blank on nights
              that already have them, and saving would rewrite those nights. Reload the
              page.
            </p>
          </div>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:border-accent/50 transition-colors mt-4"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  // The page guard above does NOT extend to this action. Next.js is explicit
  // that a page-level check does not cover the Server Actions defined inside
  // it — an action is its own entry point, POSTable directly. No second gate is
  // added here on purpose: `boundUpdateEvent` delegates to `updateEvent`, which
  // calls `assertStaffManage` and then `assertEventOwnership` inside itself
  // (`(admin)/admin/events/actions.ts`, re-measured 2026-08-09 — not assumed).
  // Adding a check here would create a NEW refusal path on a surface whose
  // behaviour must not change.
  // ── The nights a reveal can act on ─────────────────────────────────────────
  //
  // Only the secret ones. A night that is not secret has no address under
  // wraps, and `revealVenueNow` answers `not_secret` to it — so drawing the
  // control there would be drawing a button whose only possible reply is that
  // it should not have been drawn. The reveal module says the same thing from
  // the other side, about the same value.
  //
  // The place is the venue's own name, falling back to the night's free text.
  // When there is neither, the panel refuses to arm itself and says why: an act
  // that publishes nothing still writes a record that cannot be taken back.
  const secretNights = (parties ?? [])
    .map((p: Record<string, unknown>) => {
      const venues = p.venues as { name: string } | { name: string }[] | null;
      const venueName = venues
        ? Array.isArray(venues)
          ? venues[0]?.name ?? null
          : venues.name
        : null;
      return {
        id: p.id as string,
        title: p.title as string,
        secret: (p.venue_secret as boolean) ?? false,
        venueName: venueName ?? (p.venue_text as string | null) ?? null,
        revealedAt: (p.venue_revealed_at as string | null) ?? null,
      };
    })
    .filter((night) => night.secret);

  // Axis 3: the panel asks a key this page does not. Hiding it is an
  // affordance, never the guard — every export of the reveal module re-asks
  // `venue.reveal` inside itself, so a forged POST meets the same answer.
  const mayReveal = ctx.capabilities.has(CAP.VENUE_REVEAL);

  async function boundUpdateEvent(
    formData: FormData
  ): Promise<{
    success: boolean;
    id?: string;
    error?: string;
    // The named refusal travels through this binding as a VALUE. Widening the
    // return type is what makes that possible: Next redacts the message of an
    // error thrown out of a Server Action in a production build, so a category
    // carried as a message would work in `next dev` and stop where it counts.
    refusal?: NightRefusal;
  }> {
    "use server";
    return updateEvent(eventId, formData);
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
      </header>

      <div className="px-6">
        <EventForm
          initialData={{
            id: event.id,
            title: event.title,
            description: event.description,
            date: event.date,
            venue_secret: event.venue_secret,
            lineup: event.lineup ?? [],
            cover_image: event.cover_image,
            is_published: event.is_published,
            parties: (parties ?? []).map((p: Record<string, unknown>) => {
              const venues = p.venues as { name: string } | { name: string }[] | null;
              const venueName = venues ? (Array.isArray(venues) ? venues[0]?.name : venues.name) : null;
              return {
                id: p.id as string,
                title: p.title as string,
                description: p.description as string | null,
                date: p.date as string,
                time: p.time as string,
                end_time: p.end_time as string | null,
                menu_closes_at: p.menu_closes_at as string | null,
                venue_text: p.venue_text as string | null,
                venue_id: p.venue_id as string | null,
                venue_name: venueName,
                lineup: (p.lineup as string[]) ?? [],
                venue_secret: (p.venue_secret as boolean) ?? false,
                venue_secret_hint: (p.venue_secret_hint as string | null) ?? null,
                venue_reveal_hours: (p.venue_reveal_hours as number | null) ?? null,
                venue_reveal_on_purchase: (p.venue_reveal_on_purchase as boolean) ?? true,
                access_type: p.access_type as AccessType,
                capacity: p.capacity as number | null,
                sort_order: p.sort_order as number,
                format_id: p.format_id as string | null,
                series_id: p.series_id as string | null,
                // NOT `?? 0`: null is the real state of a night that is the ACT
                // of another night and has no number of its own (§9a).
                number: p.number as number | null,
              };
            }),
          }}
          formats={formats ?? []}
          series={series ?? []}
          action={boundUpdateEvent}
          submitLabel="Save Changes"
        />

        {secretNights.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold tracking-tight">Venue reveal</h2>
            <p className="mt-1 text-sm text-muted">
              The address of a secret night normally comes out on its own, at
              the window. This is the hand on the same lever, for the evening it
              does not — and it does not come back.
            </p>

            {mayReveal ? (
              <div className="mt-4 space-y-4">
                {secretNights.map((night) => (
                  <VenueRevealPanel
                    key={night.id}
                    eventId={eventId}
                    partyId={night.id}
                    nightTitle={night.title}
                    venueName={night.venueName}
                    pageRevealedAt={night.revealedAt}
                  />
                ))}
              </div>
            ) : (
              // A refusal that is visible beats a refusal that is absent: this
              // account can edit the night above but may not let its address
              // out, and reading that here is better than finding an empty
              // space and wondering where the control went.
              <p className="mt-4 rounded-xl border border-card-border bg-card p-4 text-sm text-muted">
                Releasing a venue asks for a permission this account does not
                hold, so there is nothing to press here. It is a separate key
                from the one that opens this page, and it requires an approved
                account.
              </p>
            )}
          </section>
        )}

        <Link
          href={`/admin/events/${eventId}/drinks`}
          className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:border-accent/50 transition-colors mt-4"
        >
          Manage Drink Menu
        </Link>
      </div>
    </div>
  );
}
