"use client";

import { useId, useMemo, useState } from "react";

import RefundActions from "@/app/(admin)/admin/events/[id]/tickets/RefundActions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/Typography";

/**
 * What one event has taken, and who bought it — the fifth and last table.
 *
 * ── WHERE THE MONEY FLOOR IS MET ON THIS SURFACE, AND IT IS THE EXCEPTION ────
 *
 * D-41.1-13 says that **on a surface carrying money, the figure that decides
 * money is a `mark` and never a detail in the meta line**. Read against the
 * table below, that rule looks skipped: the buyer table's only `mark` is the
 * tier pill, and no column on it is an amount.
 *
 * **It is not skipped — it is met by the surface instead of by the row, and
 * this is the one place in the phase where that is true.** The figure that
 * decides money here is the event total, and it is not a column: it is the card
 * at the top of this component, first on the page, the largest text on it, and
 * the only thing set at the display size. A buyer row does not carry an amount
 * at all — the price is a property of the tier, which is why the tier is the
 * mark. Adding a per-row amount to satisfy the letter of the rule would put a
 * figure on the card that no query returns.
 *
 * This paragraph is in the file rather than only in the plan's summary on
 * purpose: a reader who opens a money table, finds its mark is a pill and finds
 * no explanation concludes the rule was forgotten. The rule was applied; the
 * place it landed is one level up.
 *
 * ── The buyer table is one column declaration, and both branches went ────────
 *
 * This file used to hold **two hand-written lists of columns** — a real table
 * above 640 px and a card list below it, each naming its own fields, its own
 * container, its own empty block and its own copy of the refund control. That
 * is the construction `DataTable`'s own docblock exists to end. Both branches
 * are deleted whole; the branch boundary is now the contract's single one, and
 * the refund control is mounted once by the actions apparatus rather than
 * twice by two branches that could drift.
 *
 * ── The three empty states are still three, and one of them is a claim ───────
 *
 * There are three, and they say three different things:
 *
 *   1. **no tiers configured** — the tier region's own, and it stays there.
 *   2. **no tickets sold yet** — a statement about the night.
 *   3. **no results for a search** — a statement about the filter.
 *
 * The second and the third are both an empty buyer table, and **collapsing them
 * would make the surface lie**: a table filtered to nothing that says *no
 * tickets sold yet* asserts something false about an event that may have sold
 * out. The primitive takes **one** empty node per render, so the caller decides
 * which one it is handed — the selection is written out at `emptyNode` below,
 * deliberately as a named value rather than inline, because it is the one line
 * in this file whose loss would be invisible.
 *
 * ── The search stays here ────────────────────────────────────────────────────
 *
 * The primitive declines filtering and searching by name, so the filter stays
 * at this call site and the primitive is handed rows that are already filtered.
 * The control itself is the field primitive now, which raises it above the
 * touch floor and gives it the one focus expression in place of the suppression
 * it carried; its programmatic name is its own placeholder's words, so nothing
 * a person reads changed. It moved from beside the heading to under it, because
 * the width it used to take was written as a container maximum, which a
 * converted surface does not write.
 *
 * ── Four raw palette hits left, and none of them was replaced by a hue ───────
 *
 * The sold-out pill, the sell-through bar and the discount pill (twice, once
 * per deleted branch) were drawn in raw palette families.
 *
 *  - **The bar states a proportion and no longer grades one.** A line weight for
 *    the track, the tertiary ink for the fill, one fill at every value — the
 *    shape `src/components/analytics/AttendanceCard.tsx` already settled in this
 *    phase, and for its reasons: this token set contains **no green**, and its
 *    amber carries a format's identification value, so a graded meter cannot be
 *    drawn out of it at all. The grade is read off the figures beside it.
 *  - **The pills take the neutral mark.** D-41.1-25 refuses a tone per outcome
 *    and D-41.1-29 measured the two semantic fills that would have carried one
 *    at **1.23 : 1** against each other, where 3 : 1 is the threshold for
 *    telling two components apart. So the word is the channel — and on the
 *    sold-out pill the incumbent hue was arguably arguing the wrong way round
 *    anyway, since a tier that sold out is the good news on this surface.
 *
 * Colour is never the only channel here and never was: *Sold Out* is a word,
 * the bar is full when it is true, and the sold/total figure is beside it.
 *
 * ── What did not change ──────────────────────────────────────────────────────
 *
 * No query changed, no column added, no capability check touched, no action
 * payload altered. **No status transition, no refund amount, no idempotency key
 * and no webhook path is read, written or reshaped by this file** — it renders
 * props and mounts the refund control, which was converted once, elsewhere, as
 * spine, and is not opened here. Every user-visible string is the one that was
 * here.
 */

interface TierSalesData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  revenue: number;
}

interface BuyerData {
  id: string;
  memberName: string;
  memberEmail: string;
  tierName: string;
  purchaseDate: string;
  discountCode?: string | null;
}

interface DiscountSummary {
  code: string;
  uses: number;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
}

interface SalesDashboardProps {
  eventTitle: string;
  tiers: TierSalesData[];
  buyers: BuyerData[];
  totalRevenue: number;
  totalSold: number;
  discountSummary?: DiscountSummary[];
}

function formatEUR(amount: number) {
  return `EUR ${amount.toFixed(2)}`;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  } catch {
    return dateStr;
  }
}

/**
 * The slot assignment, which is a judgement about which fact identifies a row
 * and not a layout:
 *
 *   name     → the title. It is who bought.
 *   email    → the subtitle. The primitive truncates it.
 *   tier     → a MARK. See the money-floor paragraph at the top of this file:
 *              the amount that decides money on this surface is the event total
 *              above the table, so the row's mark is what the buyer chose.
 *   discount → a MARK as well, and this is a **deviation from the plan's own
 *              slot table, made on a measurement rather than a preference.**
 *              The plan assigned it to the meta line, conditional, with the cell
 *              returning nothing where there is no code. The primitive renders a
 *              meta label **per column, not per row** (`DataTable.tsx:446-458`),
 *              so a row without a discount — which is most of them — would read
 *              `Discount:` followed by nothing: a card asserting a labelled fact
 *              that does not exist. The mark slot renders a bare span, which is
 *              invisible when the cell returns nothing, and it is also what the
 *              deleted card branch did: a pill when there was a code, and
 *              nothing at all when there was not. Suppressing the meta label
 *              instead was considered and refused — a bare code in the slot
 *              whose whole contract is that its facts are labelled.
 *   date     → a labelled detail, marked as a figure so a column of timestamps
 *              aligns.
 *   refund   → not a column. It is the actions apparatus, so it is mounted once
 *              for both branches.
 *
 * Nothing is dropped: six columns went in and six things come out.
 */
const columns: DataColumn<BuyerData>[] = [
  {
    key: "name",
    header: "Name",
    card: "title",
    cell: (buyer) => buyer.memberName,
  },
  {
    key: "email",
    header: "Email",
    card: "subtitle",
    cell: (buyer) => buyer.memberEmail,
  },
  {
    key: "tier",
    header: "Tier",
    card: "mark",
    cell: (buyer) => <Badge>{buyer.tierName}</Badge>,
  },
  {
    key: "discount",
    header: "Discount",
    card: "mark",
    cell: (buyer) =>
      buyer.discountCode ? <Badge>{buyer.discountCode}</Badge> : null,
  },
  {
    key: "date",
    header: "Date",
    card: "meta",
    figure: true,
    cell: (buyer) => formatDate(buyer.purchaseDate),
  },
];

export default function SalesDashboard({
  tiers,
  buyers,
  totalRevenue,
  totalSold,
  discountSummary,
}: SalesDashboardProps) {
  const [search, setSearch] = useState("");
  const searchId = useId();

  const filteredBuyers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buyers;
    return buyers.filter(
      (b) =>
        b.memberName.toLowerCase().includes(q) ||
        b.memberEmail.toLowerCase().includes(q) ||
        b.tierName.toLowerCase().includes(q)
    );
  }, [buyers, search]);

  /**
   * Gap G-d, and the one line in this file that must not be lost.
   *
   * The primitive draws its empty node when the rows it was handed are empty,
   * and it takes exactly one node per render — so **which of the two statements
   * the table can make is decided here**, before it is handed over. There are no
   * buyers at all only when the unfiltered list is empty; every other empty
   * table is a search that matched nothing, and saying *no tickets sold yet* to
   * that is a false statement about the night.
   */
  const emptyNode =
    buyers.length === 0 ? (
      <p className="text-base font-semibold text-ink">No tickets sold yet</p>
    ) : (
      <p className="text-base font-semibold text-ink">
        No results for &quot;{search}&quot;
      </p>
    );

  return (
    <div className="space-y-6">
      {/* The event total.
          It is the figure that decides money on this surface, and the reason
          the row's mark is a pill — see the docblock. The accent tint and the
          tinted edge that used to make it read as the primary panel are gone:
          the accent is reserved for four things and a card ground is none of
          them. The hierarchy it carried was never only a hue, and the three
          channels that carried it are all still here — this panel is first on
          the surface, it is the only figure set at the display size, and it
          takes the data face, where a figure belongs. */}
      <Card>
        <p className="text-sm text-muted">Total Revenue</p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-ink">
          {formatEUR(totalRevenue)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {totalSold} ticket{totalSold !== 1 ? "s" : ""} sold
        </p>
      </Card>

      {/* Per-Tier Breakdown */}
      <div>
        <SectionHeading>Tier Breakdown</SectionHeading>
        <div className="space-y-3">
          {tiers.map((tier) => {
            const sellThrough =
              tier.quantity > 0 ? (tier.sold / tier.quantity) * 100 : 0;
            const isSoldOut = tier.quantity > 0 && tier.sold >= tier.quantity;

            return (
              <Card key={tier.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-ink">
                        {tier.name}
                      </h3>
                      {/* A mark that states, never a target: it cannot be
                          operated, so it is the badge rung and not the chip
                          one. The neutral tone is the contract's answer and
                          not a shortage — the word is the channel. */}
                      {isSoldOut && (
                        <span className="shrink-0">
                          <Badge>Sold Out</Badge>
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      {formatEUR(tier.price)} per ticket
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold text-ink">
                      {formatEUR(tier.revenue)}
                    </p>
                    <p className="font-mono text-xs text-muted">
                      {tier.sold}/{tier.quantity} sold
                    </p>
                  </div>
                </div>
                {/* The sell-through meter. One fill at every value: the track is
                    a line weight because it is the boundary of nothing, and the
                    fill is the tertiary ink, which states an amount without
                    claiming an outcome. It used to turn a second hue at 100%;
                    the bar being full already says that, and the word above it
                    says it in the channel that survives a reader who cannot
                    tell the two hues apart. */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-muted transition-all"
                    style={{ width: `${Math.min(sellThrough, 100)}%` }}
                  />
                </div>
              </Card>
            );
          })}
          {tiers.length === 0 && (
            <p className="text-sm text-muted">No tiers configured</p>
          )}
        </div>
      </div>

      {/* Buyer List */}
      <div>
        <SectionHeading>Buyers</SectionHeading>
        {buyers.length > 0 && (
          /* The width is a control's, written on its wrapper and only above the
             phone tier — never a container maximum, which is the shell's alone
             and which the incumbent wrote here. */
          <div className="mb-4 md:w-80">
            <Input
              id={searchId}
              aria-label="Search by name, email, tier..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, tier..."
            />
          </div>
        )}
        <DataTable
          rows={filteredBuyers}
          columns={columns}
          rowKey={(buyer) => buyer.id}
          caption="Buyers of this event, with the tier each one holds, any discount code used, and when the purchase was made"
          empty={emptyNode}
          actions={{
            /* The column has a name for a screen reader and no word on screen:
               it had a blank header, which is a column labelled by nothing, and
               giving it a visible one would be introducing copy on a money
               surface. */
            header: <span className="sr-only">Actions</span>,
            /* The density argument is deliberately not read. §6.3's one
               permitted shrink applies to a row action drawn by this primitive,
               and the control below draws its own at the unconditional floor —
               measured in plan 41.1-17, which converted it. */
            render: (buyer) => (
              <RefundActions ticketId={buyer.id} isDirectRefund />
            ),
          }}
        />
      </div>

      {/* Discount Code Summary */}
      {discountSummary && discountSummary.length > 0 && (
        <div>
          <SectionHeading>Discount Codes</SectionHeading>
          <div className="space-y-2">
            {discountSummary.map((ds) => (
              <Card
                key={ds.code}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-ink">
                    {ds.code}
                  </p>
                  <p className="font-mono text-xs text-muted">
                    {ds.discount_type === "percentage"
                      ? `${ds.discount_amount}%`
                      : formatEUR(ds.discount_amount)}{" "}
                    off
                  </p>
                </div>
                <p className="shrink-0 font-mono text-sm font-semibold text-ink">
                  {ds.uses} {ds.uses === 1 ? "uso" : "usi"}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
