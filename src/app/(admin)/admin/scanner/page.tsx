import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import ScannerClient from "./ScannerClient";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The door's page. It has a server-side gate, and it did not always.
 *
 * ── Why the decision changed, since it did ───────────────────────────────────
 *
 * This file used to say, in as many words, that **no capability gate was added
 * to this page, deliberately** — that one here would be a second refusal path
 * in front of the door, dressed as defence in depth. That paragraph was
 * **correct when it was written**, and it is reversed here rather than deleted
 * quietly, because a decision reversed without its reason reads as an
 * oversight to the next person.
 *
 * What made it correct was a premise phase 35 removes. Back then the
 * middleware's `door.operate` rule was the *complete* answer: there was no way
 * for somebody who did not hold that capability by role to arrive at this
 * address at all, so a check here could only ever refuse somebody the router
 * had already admitted. That premise is now false. The coarse gate in
 * `src/lib/supabase/middleware.ts` also admits a **live assignment** for the
 * trade, which is what lets a member of staff assigned to tonight's door reach
 * the scanner at all — `staff` does not hold `door.operate` by role. A widened
 * router with no server-side check behind it is a surface protected by a
 * redirect alone (`access-gating.md`, gate *RLS-e'-il-confine*).
 *
 * ── The predicate is the middleware's, and that is a requirement ─────────────
 *
 * Role **or** live assignment, read from the same two fields of the same
 * payload. Not "similar to": the same. A stricter test here would produce
 * somebody admitted by the routing and refused by the page — a **second
 * refusal in front of the door**, which is exactly what the old paragraph
 * feared and that fear is still right. Anybody who clears the coarse gate
 * clears this one. If the two ever diverge, this is the copy that is wrong.
 *
 * ── This gate is COARSE, and it cannot be anything else ──────────────────────
 *
 * At this point **no night has been chosen**: the selection happens inside
 * `ScannerClient`. The per-night question has no subject here, and inventing
 * one would mean guessing. So this gate answers only *"may this account work a
 * door at all"*, and its job is to stop a surface from being protected by a
 * redirect alone — not to scope anybody to a date.
 *
 * ── Where the real boundary is, by name ──────────────────────────────────────
 *
 * `requireDoorOperator({ partyId })` in the three door routes — check-in, undo
 * and attendance. Those write with the **service client**, so no row-level
 * policy sees them and the guard is the only boundary there is.
 *
 * And the second half is a shape rather than a check: the night list that
 * `/api/tickets/attendance` returns is filtered by assignment (plan 35-10), so
 * somebody assigned to a different night reaches this page and simply **does
 * not find that night in the list**. That is where the per-night restriction
 * becomes true.
 *
 * The refusal here goes to a bare `/dashboard` with no `?access=` cause,
 * deliberately: the causes are the middleware's vocabulary for a routing
 * decision, and reaching this line means the routing already said yes.
 *
 * `<MobileNav>` and `<StaffNav>` keep taking `role` and `status` as props: they
 * are `"use client"` components and cannot import the DAL. Resolving in the
 * parent Server Component and passing values down is Next.js's own guidance for
 * that case. Converting them to consume capabilities against four roles is
 * STAFF-03, phase 34.
 */
export default async function ScannerPage() {
  // Resolved ONCE. `cache()` memoises within a render, so the two props below
  // and the gate cost one round trip between them.
  const ctx = await getAccessContext();

  // `liveAssignmentCapabilities` is `Set<string> | null`, and the `null` — the
  // key absent from the payload, meaning the migration carrying it is not
  // applied — refuses here, as it must: admitting on a key that is missing
  // would open the door to every authenticated account the moment a migration
  // lags. The distinction between "absent" and "empty" is not lost by this
  // line, it is reported by the middleware's `?access=` cause, which is the
  // gate the person actually meets first.
  const maySeeTheDoor =
    ctx.capabilities.has(CAP.DOOR_OPERATE) ||
    (ctx.liveAssignmentCapabilities !== null &&
      ctx.liveAssignmentCapabilities.has(CAP.DOOR_OPERATE));

  if (!maySeeTheDoor) {
    redirect("/dashboard");
  }

  return (
    <>
      <ScannerClient />
      <MobileNav
        role={ctx.role as UserRole | null}
        status={ctx.status as UserStatus | null}
      />
    </>
  );
}
