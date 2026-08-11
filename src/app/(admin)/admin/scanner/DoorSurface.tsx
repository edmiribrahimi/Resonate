import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import ScannerClient from "./ScannerClient";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The door's surface. It has a server-side gate, and it did not always.
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
 * On check-in and on attendance the per-night form is the **second arm**: the
 * role question is asked first and the night is named only on its refusal
 * branch, so an account that holds `door.operate` by role pays nothing
 * (`@/lib/door/night-arm.ts` for why the two are not one call). On attendance
 * that arm covers the **POST**, the half that writes, and it does **not** cover
 * a report drained from the offline queue — that one keeps the answer it always
 * had, for the reason the route's own docblock gives. This sentence used to
 * claim the whole of `attendance`, and until the CR-01 fix it was true of the
 * `GET` alone.
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
 * `<MobileNav>` and `<StaffNav>` are `"use client"` components and cannot
 * import the DAL, so the values they need are resolved in the parent Server
 * Component and passed down — Next.js's own guidance for that case. **What they
 * take has changed:** `StaffNav` has taken serialisable capability keys since
 * plan 34-04, and `MobileNav` takes them as of plan 39-03, which is what lets
 * the Check-in entry be drawn on `door.operate` — the same key the guard below
 * asks — instead of on a role list plus an approval flag (D-39-06). It still
 * takes `role` and `status` as well, because four of its five entries are
 * governed by no capability at all.
 *
 * That is a **visibility** change and nothing else. The guard below is
 * unchanged by it, and so is `requireDoorOperator({ partyId })` in the three
 * door Route Handlers, which is where the boundary on the door's data actually
 * is.
 *
 * ── Why this is a component and no longer a page — phase 39 ──────────────────
 *
 * Everything above used to live in `page.tsx`, one address away. It is mounted
 * by **two** pages now — `/admin/scanner` and `/door` — because Phase 39 gives
 * the door its permanent address (D-39-01) while keeping the old one serving
 * the same surface, permanently and as a real page, never as a redirect
 * (D-39-02).
 *
 * The guard lives **here** rather than in either page for one reason: so that a
 * future editor cannot add a check to one address and not the other. That
 * mitigation is structural and not procedural — the two pages are three lines
 * each and have nothing in them to diverge. A guard copied twice is a guard
 * that will be edited once.
 *
 * This file is a **non-route module**, so it sits outside `(work)` at
 * `src/app/(admin)/admin/…` by R-WORK-ROUTES (`nextjs-architecture.md`), and it
 * does not move out of `scanner/` either: `checkin-offline.md` is routed by a
 * glob ending in `scanner/**`, and moving this file would quietly take the
 * door's own domain gate off the door.
 */
export default async function DoorSurface() {
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
        capabilities={[...ctx.capabilities]}
        liveAssignmentCapabilities={
          ctx.liveAssignmentCapabilities ? [...ctx.liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
