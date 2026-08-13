"use client";

import { useState } from "react";

import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import type { ReferralChain } from "@/lib/analytics/cross-event-queries";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

/**
 * The referral chains — one column declaration, two trees. §8.8.
 *
 * ── ADOPTING THE PRIMITIVE MAKES THIS A REAL TABLE FOR THE FIRST TIME ────────
 *
 * **This is a visible change, and it is announced here rather than discovered
 * in a diff.** What stood here was barely a table: the body held one row per
 * chain whose single cell **spanned all three columns**, and inside that cell a
 * native disclosure laid out its own row of values with its own spacing. The
 * three header cells therefore labelled columns that **no cell ever aligned
 * to** — the header said one thing and the body drew another, and the two only
 * looked related because the hand-written widths happened to be close.
 *
 * Under the primitive the three become actual cells, so the referrer, the
 * referred count and the chain spend line up under their own headers. That is
 * an improvement; it is also a change a reader will see, which is why it is
 * written down.
 *
 * ── THE CLIENT BOUNDARY IS CROSSED DELIBERATELY — gap G-b ───────────────────
 *
 * The primitive's expansion apparatus is **controlled**: it takes an
 * is-expanded predicate and a toggle rather than owning the open state itself.
 * That needs state, and state needs a client component. This file was a server
 * component; adopting the expansion makes it a client one.
 *
 * `nextjs-architecture.md`'s gate on what a client boundary drags into the
 * bundle asks that such a move be **stated rather than discovered**, so:
 *
 *   The referral chain carries member names and per-member spend. **That data
 *   is already rendered to HTML today** — the incumbent server component
 *   printed every name and every figure into the markup the browser receives,
 *   including the ones inside the collapsed disclosure. So no new audience is
 *   created and nothing becomes readable that was not readable before. What
 *   changes is the *mechanism*: the same values now travel as props in the
 *   server-component payload instead of only as markup. The surface's own guard
 *   is unchanged — the page still redirects anybody without the capability
 *   before this renders at all — and the security boundary was never this file:
 *   it is the row-level policy on the read.
 *
 * ── The alternative was considered and is refused ────────────────────────────
 *
 * Keeping the native disclosure inside a cell renderer would have left the file
 * a server component. It is refused because it puts the disclosure in **one
 * column** of the table branch and **nowhere sensible** in the card branch —
 * which is precisely the two-lists-that-drift construction the primitive exists
 * to prevent, reintroduced one level down.
 *
 * ── The slot assignment ──────────────────────────────────────────────────────
 *
 *   referrer    → the title. The chain is named by whoever opened it.
 *   referred    → a labelled detail, marked as a figure.
 *   CHAIN SPEND → the MARK. D-41.1-13: on a surface that carries money, the
 *                 figure that decides money is a mark and never a detail. It is
 *                 the figure this table is read for.
 *
 * The mark slot gives position, not weight — the primitive stacks marks in a
 * bare span — so the money cell supplies its own emphasis, the same shape the
 * spend table uses.
 *
 * The nested per-member list becomes the expansion's render, and each
 * disclosure names **its own row**: a column of controls all called "expand"
 * names nothing, and the row here is a person's chain.
 *
 * ── What did not change ──────────────────────────────────────────────────────
 *
 * No query changed, no column added, no capability check touched, no action
 * payload altered.
 */

const columns: DataColumn<ReferralChain>[] = [
  {
    key: "referrer",
    header: "Referrer",
    card: "title",
    cell: (chain) => chain.referrerName,
  },
  {
    key: "referred",
    header: "Referred",
    card: "meta",
    figure: true,
    align: "end",
    cell: (chain) => chain.referredCount,
  },
  {
    key: "chainSpend",
    header: "Chain Spend",
    card: "mark",
    figure: true,
    align: "end",
    cell: (chain) => (
      <span className="font-mono font-semibold text-ink">
        {eur(chain.totalChainSpend)}
      </span>
    ),
  },
];

export default function ReferralChainTable({
  chains,
}: {
  chains: ReferralChain[];
}) {
  // One chain open at a time, which is what the native disclosures did not
  // enforce and what a reader comparing two chains does not need: the figure
  // that compares them is already on every row.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <DataTable
      rows={chains}
      columns={columns}
      rowKey={(chain) => chain.referrerId}
      caption="Referral chains, with how many members each referrer brought in and what that chain has spent"
      empty={
        <>
          <p className="text-base font-semibold text-ink">
            No referrals yet
          </p>
          <p className="mt-1 text-sm text-muted">
            This fills in once a member joins through somebody else&apos;s
            invitation.
          </p>
        </>
      }
      expansion={{
        isExpanded: (chain) => expandedId === chain.referrerId,
        onToggle: (chain) =>
          setExpandedId((current) =>
            current === chain.referrerId ? null : chain.referrerId
          ),
        render: (chain) => (
          <div className="space-y-1">
            {chain.referredMembers.map((member, position) => (
              <div
                key={position}
                className="flex items-center justify-between text-sm text-muted"
              >
                <span>{member.name}</span>
                <span className="font-mono">{eur(member.totalSpend)}</span>
              </div>
            ))}
          </div>
        ),
        label: (chain) => `Members referred by ${chain.referrerName}`,
      }}
    />
  );
}
