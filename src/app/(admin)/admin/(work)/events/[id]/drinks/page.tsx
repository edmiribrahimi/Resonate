import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import { getDrinkItems } from "@/app/(admin)/admin/events/actions";
import DrinkMenuManager from "@/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager";
import EventQRCode from "@/app/(public)/events/[slug]/menu/EventQRCode";

/**
 * The drink menu of an event — the single surface, where there were two.
 *
 * ── The collapse, divergence by divergence (D-34-05) ─────────────────────────
 *
 *  1. **The guard.** `admin.access` (the `/admin` twin) → `organizer.access`.
 *     Decided by `('master','organizer.access',false)` and
 *     `('organizer','organizer.access',false)`
 *     (`20260807000000_capability_model.sql:411-412`), the key
 *     `/admin/events/[id]/drinks` is bound to in
 *     `src/lib/routes/capability-routes.ts:260`. **Not a widening:** an
 *     organizer opened a byte-equivalent page at `/organizer/events/[id]/drinks`
 *     today, and `organizer.access` is held by `master` and `organizer` alone.
 *
 *  2. **Ownership.** The `/organizer` twin selected `created_by` and called
 *     `ownsOrIsMaster`; the `/admin` twin did neither. Resolved towards the
 *     **more restrictive** (D-34-06), which is also the direction that keeps
 *     this page agreeing with the row-level boundary behind it
 *     (`(auth.uid() = created_by) OR has_capability('master.manage')`,
 *     `20260807010000_policies_to_capabilities.sql:255`; master short-circuits
 *     on `('master','master.manage',false)`, `:396`).
 *
 *  3. **The back link.** Two shapes existed — `← Back to Events` at
 *     `/admin/events`, and a chevron `Back to Edit` at the event's edit page.
 *     The `/admin` shape is kept: it is the canonical prefix (D-34-01) and the
 *     shape the sibling collapsed pages under `(work)` already use. The way
 *     forward to this page from the edit surface survives as that page's
 *     `Manage Drink Menu` link. Cosmetic, no verdict attached; no restyle
 *     beyond picking one of two existing shapes (phases 40 and 41 own the look).
 *
 * ── The money path: measured, and untouched ──────────────────────────────────
 *
 * `ticketing-payments.md` governs anything that moves a token. Measured across
 * both twins, 2026-08-09, before the merge:
 *
 *  - Neither page mentions `menu_closes_at`, a token, a grace period or a
 *    redeem call — `grep` returns 0 on both, and on `DrinkMenuManager.tsx`
 *    itself. The closing time is written from
 *    `(public)/events/[slug]/menu/` (`updateMenuClosesAt`), which this plan
 *    does not touch and does not import.
 *  - Both twins called `getDrinkItems(eventId)` identically and mounted
 *    `DrinkMenuManager` with the identical three props and `EventQRCode` with
 *    the identical `menuUrl`. **The pair held no divergence on the money side**,
 *    so there was nothing there to resolve and nothing was resolved.
 *
 * ── `DrinkMenuManager` did not move, and that is the point ───────────────────
 *
 * R-WORK-ROUTES (plan 34-07): only route files enter `(work)`. It stays at
 * `src/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager.tsx`, which is why
 * the import above is absolute and unchanged by this merge. Its other mount is
 * `(public)/events/[slug]/menu/PartyDrinkMenu.tsx:6` — **a public party menu on
 * the drink-purchase path**. Moving the component would have made a routing
 * plan edit a paying surface; leaving it means that file is untouched by this
 * plan and by the whole wave.
 *
 * The two nav mounts and the two casts are gone (D-34-07,
 * `admin/(work)/layout.tsx`); the capability guard stays (D-34-09).
 */

interface DrinksPageProps {
  params: Promise<{ id: string }>;
}

export default async function DrinksPage({ params }: DrinksPageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header. Neither this guard
  // nor the middleware is a substitute for RLS, which is what bounds the reads
  // below: this page and `getDrinkItems` both use the cookie-bound client, so
  // policies still apply.
  const ctx = await getAccessContext();

  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, slug, created_by")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    notFound();
  }

  // Ownership — one call, never a re-inlined comparison. Master short-circuits
  // before the row is considered; a null identity and an unowned row both refuse.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/admin/events");
  }

  const items = await getDrinkItems(eventId);

  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}/menu`;

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/admin/events"
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Drink Menu</h1>
        <p className="text-sm text-muted mt-1">{event.title}</p>
      </header>

      <div className="px-6">
        <DrinkMenuManager
          eventId={eventId}
          eventTitle={event.title}
          initialItems={items}
        />

        {/* Menu QR Code */}
        <div className="mt-8">
          <EventQRCode url={menuUrl} eventTitle={event.title} />
        </div>
      </div>
    </div>
  );
}
