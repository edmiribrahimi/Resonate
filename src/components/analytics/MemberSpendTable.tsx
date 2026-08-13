import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import type { MemberSpendProfile } from "@/lib/analytics/cross-event-queries";

const eur = (n: number) => `EUR ${n.toFixed(2)}`;

/**
 * Top spenders — one column declaration, two trees. `41-UI-SPEC.md` §8.8.
 *
 * ── What left, and why none of it was migrated ───────────────────────────────
 *
 * This file used to hold **two hand-written lists of columns**: a real table
 * above 640px and a card list below it, each naming its own fields, its own
 * container and its own empty state. That is the exact construction
 * `DataTable`'s docblock exists to end — *"two lists of columns drift, and the
 * drift renders, compiles and looks correct on the machine of whoever added
 * it"*. Both branches are deleted whole; what stands here is one array and one
 * call, and there is nowhere for the two to disagree.
 *
 * Nothing in the deleted markup was carried across. The branch switch was at
 * the wrong boundary (D-41-05: one boundary, 768px, and the primitive owns it),
 * the container edge and ground were the legacy alias names, and seven cells
 * asked for weight 500 — a weight this system does not have, since Phase 40
 * left it two and only two. The primitive writes all of their replacements.
 *
 * ── The rank is DATA, and that is gap G-a's resolution ───────────────────────
 *
 * The rank used to be the array index, read inside the render. The primitive's
 * cell renderer receives **only the row** — never its position — so the rank
 * cannot be derived inside a cell any more.
 *
 * Two ways out existed and only one is honest. Widening the cell signature to
 * pass the index would edit a **published contract that already has an
 * adopter**, to give every table a parameter one table wants. Precomputing the
 * rank onto the row is data: it is assigned once, where the ordering is known,
 * and it survives being re-sorted or re-sliced downstream without silently
 * meaning something else. The second is what this does.
 *
 * ── The slot assignment, which is a judgement and not a layout ───────────────
 *
 * The card is a title, the marks that qualify it, and the details underneath.
 * Which fact is this row's identity is settled here:
 *
 *   rank + name → the title block, rank first, because that is what the card
 *                 said before: the position led the name on one line, and it
 *                 leads it here. `none` was considered and refused — a card
 *                 that dropped the rank would carry it only as *position in a
 *                 scrolling list*, which is not the fact, and a column silently
 *                 dropped from the card is a column the phone user never sees.
 *   email       → the subtitle. The primitive already truncates it.
 *   TOTAL SPEND → the MARK. D-41.1-13: on a surface that carries money, the
 *                 figure that decides money is a mark and never a detail in the
 *                 meta line. This surface exists to be read for that figure;
 *                 burying it among tickets, drinks and events would change what
 *                 an operator reads first.
 *   tickets, drinks, events → labelled details, each marked as a figure so a
 *                 column of numbers aligns. Nothing is dropped.
 *
 * ── The mark slot gives position, not weight (gap G-c) ───────────────────────
 *
 * The primitive stacks marks at the end of the card inside a bare span; the
 * card's *title* is what carries the weight. So the money column's own cell
 * renderer supplies its emphasis — the data face plus weight 600 on the
 * primary ink, which is the shape the member table already uses for a figure
 * that is being read rather than scanned. No contract edit is involved, and
 * the renderer was already there.
 *
 * Re-declaring the data face on a descendant of a figure cell is the same
 * value, not a second one: the warning in the primitive's docblock is about the
 * numeric-variant shorthand, which nothing here writes.
 *
 * ── What did not change ──────────────────────────────────────────────────────
 *
 * No query changed, no column added, no capability check touched, no action
 * payload altered. Seven columns went in and seven slots come out, in the same
 * order, reading the same fields of the same row.
 */

/** The row as the table reads it: the profile, plus its position in the order. */
type RankedMemberSpend = MemberSpendProfile & { readonly rank: number };

const columns: DataColumn<RankedMemberSpend>[] = [
  {
    key: "rank",
    header: "#",
    card: "title",
    figure: true,
    cell: (member) => `#${member.rank}`,
  },
  {
    key: "name",
    header: "Name",
    card: "title",
    cell: (member) => member.fullName,
  },
  {
    key: "email",
    header: "Email",
    card: "subtitle",
    cell: (member) => member.email,
  },
  {
    key: "tickets",
    header: "Tickets",
    card: "meta",
    figure: true,
    align: "end",
    cell: (member) => eur(member.ticketSpend),
  },
  {
    key: "drinks",
    header: "Drinks",
    card: "meta",
    figure: true,
    align: "end",
    cell: (member) => eur(member.drinkSpend),
  },
  {
    key: "total",
    header: "Total",
    card: "mark",
    figure: true,
    align: "end",
    cell: (member) => (
      <span className="font-mono font-semibold text-ink">
        {eur(member.totalSpend)}
      </span>
    ),
  },
  {
    key: "events",
    header: "Events",
    card: "meta",
    figure: true,
    align: "end",
    cell: (member) => member.eventsAttended,
  },
];

export default function MemberSpendTable({
  members,
}: {
  members: MemberSpendProfile[];
}) {
  // The rank is assigned here, where the ordering is known, and travels on the
  // row from this point on. See the docblock — gap G-a.
  const ranked: RankedMemberSpend[] = members.map((member, position) => ({
    ...member,
    rank: position + 1,
  }));

  return (
    <DataTable
      rows={ranked}
      columns={columns}
      rowKey={(member) => member.userId}
      caption="Top spenders, with what each member has spent on tickets and on drinks, and how many nights they attended"
      empty={
        <>
          <p className="text-base font-semibold text-ink">
            No member spending yet
          </p>
          <p className="mt-1 text-sm text-muted">
            This fills in once a night has sold a ticket or served a drink.
          </p>
        </>
      }
    />
  );
}
