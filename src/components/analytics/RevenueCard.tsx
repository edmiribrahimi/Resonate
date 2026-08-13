"use client";

import CountUp from "@/components/motion/CountUp";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";
import type { EventRevenue } from "@/lib/analytics/event-queries";

/**
 * What one event took, net and gross, split between tickets and drinks.
 *
 * ── Three things left this file, and each one is a decision ──────────────────
 *
 * **1. The accent tint.** This card used to be drawn on an accent-tinted
 * gradient behind an accent-tinted border, which is what made it read as the
 * primary panel of the surface. `41-UI-SPEC.md` §5.1 reserves the accent for
 * four things — the primary button fill, the active navigation entry, a link in
 * prose, and the lineup pills on an event card — and a card ground is none of
 * them. So the tint goes and the card is the same card as the others.
 *
 * The hierarchy it carried is not lost, because it was never only a hue: this
 * panel is still first on the page, still full width where the two below it
 * share a row, and still the only one whose figure is set at the display size.
 * Position and size say *read this first* in a vocabulary the contract owns.
 *
 * **2. The display face never reaches a figure.** §7.1 is explicit — the
 * display role lands on exactly one thing, the page title, and never on any
 * figure or count. The totals here are the largest text on the surface and they
 * are still not the page title. They take the **data** face instead, which is
 * where a figure belongs (DS-05): the numeric alignment is declared once at the
 * role in `globals.css:433-453`, so columns of money line up without this file
 * asking for it.
 *
 * **3. The discount line's raw purple.** A discount is not an outcome and not a
 * state — it is a fact about how the gross became the net — and the semantic set
 * has nothing that means *discounted*. Inventing one at a call site is how a
 * design system acquires a rule nobody decided, so the hue goes and the line
 * keeps the only channel that was ever load-bearing: the word `Discounts`, the
 * count in brackets, and the minus sign in front of the amount.
 */

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

/**
 * §7.3's label/data role, written out rather than imported.
 *
 * `SectionHeading` is the same string plus a bottom margin, and D-41-11 makes it
 * a convenience rather than a requirement — "a surface that writes the string is
 * equally converted". These two are sub-labels inside a card that already has a
 * heading, so they own their own rhythm; appending a second margin utility to
 * the component would be the padding collision `DataTable.tsx:476-484` records,
 * where both utilities are the same property at the same specificity and the
 * winner is whichever the framework emits last.
 */
const SUB_LABEL =
  "font-mono text-xs font-semibold uppercase tracking-widest text-muted";

export default function RevenueCard({ revenue }: { revenue: EventRevenue }) {
  return (
    <Card>
      {/* Primary total */}
      <SectionHeading>Net Revenue</SectionHeading>
      <p className="font-mono text-3xl font-semibold tracking-tight text-ink">
        <CountUp value={revenue.totalNet} format={eur} />
      </p>
      <p className="mt-1 font-mono text-xs text-muted">
        Gross: <CountUp value={revenue.totalGross} format={eur} />
      </p>

      {/* Breakdown columns */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        {/* Tickets */}
        <div>
          <p className={SUB_LABEL}>Tickets</p>
          <p className="mt-2 font-mono text-base font-semibold text-ink">
            <CountUp value={revenue.netTickets} format={eur} />
          </p>
          <div className="mt-1 space-y-0.5 font-mono text-xs text-muted">
            <p>
              Gross: <CountUp value={revenue.grossTickets} format={eur} />
            </p>
            <p>
              Refunds:{" "}
              <CountUp
                value={revenue.grossTickets - revenue.netTickets}
                format={eur}
              />
            </p>
            {revenue.discountedTickets > 0 && (
              <p>
                Discounts ({revenue.discountedTickets}): −
                <CountUp value={revenue.totalDiscount} format={eur} />
              </p>
            )}
          </div>
        </div>

        {/* Drinks */}
        <div>
          <p className={SUB_LABEL}>Drinks</p>
          <p className="mt-2 font-mono text-base font-semibold text-ink">
            <CountUp value={revenue.netDrinks} format={eur} />
          </p>
          <div className="mt-1 space-y-0.5 font-mono text-xs text-muted">
            <p>
              Gross: <CountUp value={revenue.grossDrinks} format={eur} />
            </p>
            <p>
              Refunds:{" "}
              <CountUp
                value={revenue.grossDrinks - revenue.netDrinks}
                format={eur}
              />
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
