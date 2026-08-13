import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import SalesDashboard from "@/components/events/SalesDashboard";
import { FOCUS_RING } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";

/**
 * The takings of one event — the collapsed surface.
 *
 * ── The shell, and the four things this page stopped writing ─────────────────
 *
 * `wide`, and it is **named on §4's closed list** rather than judged here: the
 * primary object of this surface is a dense table of buyers. The width is
 * written at the call rather than left to the default, because a width written
 * is a width a reader can check against that list — and the manifest check
 * compares the two.
 *
 * Four things left in the same move, and they are the four every page loses
 * when it adopts the shell: the page root with its own minimum height and its
 * hard-coded bottom padding; the gutter and the top rhythm on the header, and
 * the repeated gutter on the section below it; the header's bottom padding,
 * which becomes a margin **inside** the shell rather than a padding on a page
 * root; and the hand-written top-level heading, which is the page-title role.
 * The shell owns the maximum, the gutter, the vertical rhythm and the
 * navigation clearance in both tiers, and this file now writes none of them.
 *
 * **There is no loading file for this route** — the directory holds this page
 * and nothing else — so there is none to convert. Said here so the absence is
 * not checked twice.
 *
 * ── The money question, asked before the merge and answered here ─────────────
 *
 * Neither version showed a refund control, a takings figure or a payout detail
 * the other did not. Both mounted `SalesDashboard` with the same six props, and
 * `SalesDashboard` mounts `RefundActions` for every buyer row unconditionally
 * (`SalesDashboard.tsx:215,255`) — so the refund control was already on both,
 * and this merge neither adds nor removes it. The one difference was the
 * **guest-list tile**, which the organizer version had and the `/admin` one did
 * not; it is kept, and the grant that permits it is named at its own comment.
 *
 * ── Reachability: the more restrictive of the two, not the fuller one ────────
 *
 * The `/admin` version asked `admin.access` and did **no** ownership check
 * ("master sees all"); the organizer version asked `organizer.access` and then
 * `ownsOrIsMaster`. The merged page asks `organizer.access` — the key
 * `src/lib/routes/capability-routes.ts` binds to this address, so the middleware
 * and the page give the same verdict (D-34-09) — **and keeps the ownership
 * check**. Verdict-identical per role: a master clears `ownsOrIsMaster` through
 * its `master.manage` branch before the row is read, so it still sees every
 * event; an organizer reached this content at the twin under exactly these two
 * conditions. Dropping the ownership check would have let any organizer read any
 * event's service-role data — a widening D-34-06 forbids.
 */
export default async function SalesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  // Defense in depth, and it stays (D-34-09). The nav mount and the two
  // role/status narrowings that stood here are gone: `admin/(work)/layout.tsx`
  // resolves the context once for the whole tree and draws both navs (D-34-07).
  // `getAccessContext` is `cache()`-scoped per request, so this second ask costs
  // no round trip.
  //
  // Neither the nav's name nor the cast syntax is spelled in this file's prose,
  // so the sweep grep that asserts their absence cannot be defeated by a comment
  // (plan 34-03).
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // `created_by` is selected because the ownership check below needs it. The
  // `/admin` twin selected only `id, title`, which is the shape of a page that
  // does not ask the question.
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/admin/events");
  }

  // Ownership — one call, never a re-inlined comparison.
  //
  // This page later reads `tickets` and `profiles` with the **service-role
  // client**, which bypasses every row-level policy (`access-gating.md`, gate
  // *service role*), and ships buyer names and email addresses into a client
  // component. On that path this `if` is the only boundary there is. The client
  // is retained unchanged by this collapse — the phase changes where a verdict
  // is asked, never what the verdict is — and the statement is recorded here
  // because `meta-gates.md` requires it in writing.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/admin/events");
  }

  // Fetch tiers
  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select("id, name, price, quantity")
    .eq("event_id", eventId)
    .order("created_at");

  // Compute sold counts per tier
  const tierSalesData = await Promise.all(
    (tiers ?? []).map(async (tier) => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("tier_id", tier.id);

      const sold = count ?? 0;
      return {
        id: tier.id,
        name: tier.name,
        price: tier.price,
        quantity: tier.quantity,
        sold,
        revenue: sold * tier.price,
      };
    })
  );

  // Count guest list tickets separately.
  //
  // **Drift, resolved towards more, and the grant that says so is
  // `('master','organizer.access',false)`** (`20260807000000_capability_model.
  // sql:411`). This tile existed only on the organizer twin. Keeping it shows it
  // to a master, who did not see it at the `/admin` address — but a master holds
  // `organizer.access` and therefore already reached the twin, where this tile
  // was drawn. Nobody sees a figure they could not already open; the collapse
  // removes a difference between two addresses the same person could open, which
  // is the drift D-34-05 exists to remove.
  //
  // It is a COUNT OF UNPAID ADMISSIONS, not a takings figure: `ticketing-
  // payments.md`'s guest-list gate calls an entry an ingresso non pagato, and
  // showing how many there are is what makes them countable.
  const { count: guestListCount } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("ticket_type", "guest_list");

  const serviceClient = getServiceClient();

  // Fetch tickets (no profiles join - ambiguous FK through auth.users)
  const { data: rawBuyers } = await serviceClient
    .from("tickets")
    .select("id, amount_paid, created_at, tier_id, ticket_type, user_id, discount_code_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  // Fetch profiles and tiers separately
  const buyerUserIds = [...new Set((rawBuyers ?? []).map((b) => b.user_id).filter(Boolean))] as string[];
  const profileMap = new Map<string, { full_name: string; email: string }>();
  if (buyerUserIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", buyerUserIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name ?? "Unknown", email: p.email ?? "" });
    }
  }

  const tierMap = new Map<string, string>();
  for (const t of tiers ?? []) {
    tierMap.set(t.id, t.name);
  }

  // Fetch discount codes used in this event
  const discountCodeIds = [
    ...new Set(
      (rawBuyers ?? [])
        .map((b) => (b as { discount_code_id?: string }).discount_code_id)
        .filter(Boolean)
    ),
  ] as string[];

  let discountCodeMap = new Map<string, string>();
  let discountSummaryData: {
    code: string;
    uses: number;
    discount_type: "percentage" | "fixed";
    discount_amount: number;
  }[] = [];

  if (discountCodeIds.length > 0) {
    const { data: codes } = await supabase
      .from("discount_codes")
      .select("id, code, discount_type, discount_amount")
      .in("id", discountCodeIds);

    for (const c of codes ?? []) {
      discountCodeMap.set(c.id, c.code);
    }

    const useCounts = new Map<string, number>();
    for (const b of rawBuyers ?? []) {
      const dcId = (b as { discount_code_id?: string }).discount_code_id;
      if (dcId) {
        useCounts.set(dcId, (useCounts.get(dcId) ?? 0) + 1);
      }
    }

    discountSummaryData = (codes ?? []).map((c) => ({
      code: c.code,
      uses: useCounts.get(c.id) ?? 0,
      discount_type: c.discount_type as "percentage" | "fixed",
      discount_amount: c.discount_amount,
    }));
  }

  const buyers = (rawBuyers ?? []).map((b) => {
    const ticketType = (b as { ticket_type?: string }).ticket_type;
    const dcId = (b as { discount_code_id?: string }).discount_code_id;
    const profile = profileMap.get(b.user_id as string);
    return {
      id: b.id,
      memberName: profile?.full_name ?? "Unknown",
      memberEmail: profile?.email ?? "",
      tierName:
        ticketType === "guest_list"
          ? "Guest List"
          : tierMap.get(b.tier_id as string) ?? "Unknown",
      purchaseDate: b.created_at,
      discountCode: dcId ? discountCodeMap.get(dcId) ?? null : null,
    };
  });

  const totalRevenue = tierSalesData.reduce((sum, t) => sum + t.revenue, 0);
  const totalSold = tierSalesData.reduce((sum, t) => sum + t.sold, 0);
  const guestCount = guestListCount ?? 0;

  return (
    <PageShell width="wide">
      <header className="mb-6">
        {/* A label and a target both. It declares the 44px floor and carries
            the one focus expression — imported, never re-spelled. */}
        <Link
          href="/admin/events"
          className={`inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
        >
          &larr; Back to Events
        </Link>
        <PageTitle className="mt-2">Sales</PageTitle>
        <p className="text-sm text-muted">{event.title}</p>
      </header>

      {guestCount > 0 && (
        /* The tile's own edge and ground were drawn out of the raw palette,
           which is the one family a converted surface may not write. It is the
           card shell now. The count takes the data face and the heavier of the
           two weights this system has — the third weight it used to ask for
           does not exist here. */
        <Card className="mb-4">
          <p className="text-sm text-muted">Guest List</p>
          <p className="font-mono text-lg font-semibold text-ink">
            {guestCount} free ticket{guestCount !== 1 ? "s" : ""}
          </p>
        </Card>
      )}
      <SalesDashboard
        eventTitle={event.title}
        tiers={tierSalesData}
        buyers={buyers}
        totalRevenue={totalRevenue}
        totalSold={totalSold}
        discountSummary={discountSummaryData}
      />
    </PageShell>
  );
}
