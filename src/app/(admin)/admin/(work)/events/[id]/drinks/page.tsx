import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import { getDrinkItems } from "@/app/(admin)/admin/events/actions";
import DrinkMenuManager from "@/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager";
import EventQRCode from "@/app/(public)/events/[slug]/menu/EventQRCode";
import { FOCUS_RING } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import RefundRequestList, {
  type PendingRefund,
} from "@/app/(admin)/admin/events/[id]/drinks/RefundRequestList";

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

  /*
    ── Le richieste di rimborso in attesa di questa serata ────────────────────

    LETTE CON IL CLIENT LEGATO AL COOKIE, non con quello di servizio. Una lettura
    che scavalca la policy non prova nulla sulla policy, e la policy — che chiede
    `staff.manage` — e' il confine vero: la guardia in cima a questa pagina
    impedisce di ARRIVARE qui, non di leggere queste righe.

    L'embed e' qualificato sul nome del vincolo perche' `drink_tokens` ha piu' di
    una relazione verso le tabelle vicine, e un embed ambiguo e' risposto da
    PostgREST con un 300 che attraverso questo client NON solleva: `data` torna
    null e la lista si disegna vuota. Su questa superficie una lista vuota per
    errore e' indistinguibile da «nessuno ha chiesto niente», che e' anche lo
    stato normale.

    ⚠ UNA COINCIDENZA CHE OGGI TIENE, E CHE NON E' UN VINCOLO. La guardia in cima
    a questa pagina chiede `organizer.access`; la policy della tabella chiede
    `staff.manage`. Misurate in produzione il 2026-08-20, le due sono tenute
    **dagli stessi ruoli** — master e organizer — quindi chi arriva qui puo'
    leggere.

    Il giorno in cui divergessero, un lettore ammesso dalla pagina e rifiutato
    dalla base dati leggerebbe zero righe SENZA UN ERRORE — PostgREST non
    distingue «la policy ti ha rifiutato» da «non c'e' niente» — e la sezione gli
    direbbe «nessuna richiesta in attesa», che sarebbe falso e credibile. Se un
    giorno si tocca l'una delle due, si guarda l'altra.
  */
  const { data: refundRows, error: refundError } = await supabase
    .from("drink_refund_request")
    .select(
      "token_id, requested_at, drink_tokens!inner(drink_name, price, status, activation_count, event_id)"
    )
    .eq("status", "pending")
    .eq("drink_tokens.event_id", eventId)
    .order("requested_at", { ascending: true });

  if (refundError) {
    // Non silenzioso: una lettura fallita non si rende come «nessuna richiesta».
    console.error(
      `[drinks.refund_requests_read_failed] ${refundError.code || "transport"}: ${refundError.message}`
    );
  }

  const pendingRefunds: PendingRefund[] = (refundRows ?? []).map((row) => {
    const t = row.drink_tokens as unknown as {
      drink_name: string;
      price: number;
      status: string;
      activation_count: number | null;
    };
    return {
      tokenId: row.token_id as string,
      drinkName: t.drink_name,
      price: Number(t.price),
      activationCount: t.activation_count,
      requestedAt: row.requested_at as string,
      redeemed: t.status === "redeemed",
    };
  });

  return (
    /*
      `default` and not `wide`: §4's wide list is closed and does not name this
      route. The shell owns the maximum, the gutter, the vertical rhythm and the
      navigation clearance in both tiers, so this page writes none of them — the
      hand-written bottom clearance it used to carry was the phone number only,
      and from 768px up the navigation leaves the bottom edge entirely.
    */
    <PageShell width="default">
      <header className="mb-6">
        <Link
          href="/admin/events"
          className={`inline-flex min-h-11 items-center text-xs text-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-ink ${FOCUS_RING}`}
        >
          &larr; Back to Events
        </Link>
        <PageTitle className="mt-2">Drink Menu</PageTitle>
        <p className="text-sm text-muted mt-1">{event.title}</p>
      </header>

      <DrinkMenuManager
        eventId={eventId}
        eventTitle={event.title}
        initialItems={items}
      />

      <div className="mt-8">
        <SectionHeading>Richieste di rimborso</SectionHeading>
        <p className="mb-3 text-sm text-muted">
          Un drink mai attivato viene rimborsato da solo quando qualcuno lo
          chiede. Qui arrivano gli altri: il numero accanto dice quante volte
          quel token è stato attivato, ed è un fatto da leggere, non un verdetto.
        </p>
        {refundError ? (
          <p className="text-sm text-ink-2">
            Non siamo riusciti a leggere le richieste di rimborso. Questa lista
            non è vuota: è illeggibile.
          </p>
        ) : (
          <RefundRequestList requests={pendingRefunds} />
        )}
      </div>

      {/* Menu QR Code */}
      <div className="mt-8">
        <EventQRCode url={menuUrl} eventTitle={event.title} />
      </div>
    </PageShell>
  );
}
