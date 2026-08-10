import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import EventForm from "@/components/events/EventForm";
import { updateEvent } from "@/app/(admin)/admin/events/actions";
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
 *  3. **The venue is not revealed one moment earlier by this file.** The page
 *     renders `venue_secret`, `venue_secret_hint`, `venue_reveal_hours` and
 *     `venue_reveal_on_purchase`, so the two gates above are the only thing
 *     between an address and a browser. `venue_reveal_sent` is monotone
 *     (`meta-gates.md`) and this merge makes neither gate easier to pass — it
 *     adds one that the `/admin` twin lacked. The `event_parties` SELECT and
 *     the `initialData` mapping are carried across **unchanged**: they were
 *     byte-identical in both twins, `menu_closes_at` included, and a routing
 *     merge is not the place to edit a reveal setting.
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

  // Fetch parties for this event (with venue join)
  const { data: parties } = await supabase
    .from("event_parties")
    .select("id, title, description, date, time, end_time, menu_closes_at, venue_text, access_type, capacity, sort_order, venue_id, lineup, venue_secret, venue_secret_hint, venue_reveal_hours, venue_reveal_on_purchase, venues(name)")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  // The page guard above does NOT extend to this action. Next.js is explicit
  // that a page-level check does not cover the Server Actions defined inside
  // it — an action is its own entry point, POSTable directly. No second gate is
  // added here on purpose: `boundUpdateEvent` delegates to `updateEvent`, which
  // calls `assertStaffManage` and then `assertEventOwnership` inside itself
  // (`(admin)/admin/events/actions.ts`, re-measured 2026-08-09 — not assumed).
  // Adding a check here would create a NEW refusal path on a surface whose
  // behaviour must not change.
  async function boundUpdateEvent(
    formData: FormData
  ): Promise<{ success: boolean; id?: string; error?: string }> {
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
              };
            }),
          }}
          action={boundUpdateEvent}
          submitLabel="Save Changes"
        />

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
