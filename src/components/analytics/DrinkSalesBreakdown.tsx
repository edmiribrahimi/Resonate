import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import type { DrinkSalesItem } from "@/lib/analytics/event-queries";

/**
 * What each drink sold, on the per-event analytics surface.
 *
 * ── One column declaration, two branches ─────────────────────────────────────
 *
 * This file used to carry both renderings by hand: a real table above 640px and
 * a card list below it, each spelling its own layout, each free to gain a column
 * the other did not. `DataTable` owns both now (D-41.1-12), and the boundary
 * moves to 768px with it — the primitive writes the breakpoint once so no table
 * chooses again.
 *
 * ── Revenue is a `mark`, and that is the money floor ─────────────────────────
 *
 * D-41.1-13: on a surface that carries money, a figure that decides money is a
 * `mark` and never a `meta`. This page reads money and moves none, but what an
 * operator reads first on a phone is decided here — a revenue figure buried in
 * the detail line among three counts is a card that changed what the surface
 * says. The mark slot gives the value POSITION (opposite the title, at the top
 * of the card) and nothing else, so the renderer supplies the emphasis and the
 * data face itself. Re-stating the data face on a descendant is safe and is
 * recorded as safe at `globals.css:441-449`: it re-states the value rather than
 * rebuilding the shorthand, and only the ordinal and slashed-zero utilities
 * would drop the inherited alignment.
 *
 * ── The four raw palette hits are DELETED, not recoloured ────────────────────
 *
 * The redeemed count was in a green from the raw palette and the refunded count
 * in a red, twice each — once per hand-written branch. Neither is a colour this
 * system has: `41-UI-SPEC.md` §5 inherits four semantic tokens with literal
 * values on both sides of the separation, and the set CONTAINS NO GREEN
 * (`globals.css:169-173`) — adding one would be adding a colour to the brand,
 * which is the owner's. So the completed count takes the completion semantic and
 * the refunded count takes the critical one, taken from the spec rather than
 * matched by eye to the nearest hue.
 *
 * ── And colour was never the only channel ────────────────────────────────────
 *
 * §10. Above 768px each figure sits under its own header cell; below it, the
 * meta slot prints the label with the value, so the two counts are told apart by
 * the words `Redeemed` and `Refunded` whether or not the hue is perceived. With
 * the semantics carrying less chromatic distance than the raw green/red pair
 * did, that label is now the primary distinction rather than a redundancy — the
 * reason it is asserted here rather than assumed.
 */

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

const columns: DataColumn<DrinkSalesItem>[] = [
  {
    key: "name",
    header: "Name",
    card: "title",
    cell: (d) => d.drinkName,
  },
  {
    key: "revenue",
    header: "Revenue",
    card: "mark",
    figure: true,
    align: "end",
    // The mark slot is a bare span: emphasis and the data face are the cell's
    // own, in both branches, so the money figure reads as money on the card too.
    cell: (d) => (
      <span className="font-mono text-sm font-semibold text-ink">
        {eur(d.revenue)}
      </span>
    ),
  },
  {
    key: "quantity",
    header: "Qty",
    card: "meta",
    figure: true,
    align: "end",
    cell: (d) => d.quantity,
  },
  {
    key: "redeemed",
    header: "Redeemed",
    card: "meta",
    figure: true,
    align: "end",
    cell: (d) => <span className="text-sem-done">{d.redeemed}</span>,
  },
  {
    key: "refunded",
    header: "Refunded",
    card: "meta",
    figure: true,
    align: "end",
    cell: (d) => <span className="text-sem-crit">{d.refunded}</span>,
  },
];

export default function DrinkSalesBreakdown({
  drinks,
}: {
  drinks: DrinkSalesItem[];
}) {
  return (
    <DataTable
      rows={drinks}
      columns={columns}
      rowKey={(d) => d.drinkName}
      caption="Drink sales for this event, with the revenue, the quantity sold and how many tokens were redeemed or refunded"
      empty="No drink sales yet"
    />
  );
}
