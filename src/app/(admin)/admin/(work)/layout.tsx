import type { ReactNode } from "react";
import MobileNav from "@/components/layout/MobileNav";
import StaffNav from "@/components/staff/StaffNav";
import { getAccessContext } from "@/lib/capabilities/server";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The collapsed work surface: one access-context resolution, both navs mounted
 * once, for every page under `admin/(work)/`.
 *
 * D-34-07. There was no `layout.tsx` in either route group, so every page
 * repeated the same two mounts and the same two `role as UserRole` casts — the
 * casts the code itself flagged as this phase's to remove.
 *
 * ── Why a nested `(work)` group and not `admin/layout.tsx` ───────────────────
 *
 * A layout at `src/app/(admin)/admin/layout.tsx` would also wrap
 * `/admin/scanner`, which would put a tab bar and a SECOND bottom nav on the
 * door — and closing that would mean editing `admin/scanner/page.tsx` to drop
 * its own mount. This phase does not touch the door's page (STAFF-04 is Phase
 * 39, alone, because a redirect needs a network the door is designed not to
 * have). A route group does not affect the URL, so `(work)/analytics/page.tsx`
 * still serves `/admin/analytics` and `scanner/` stays outside the group,
 * byte-identical. It also pre-positions Phase 39: when the door leaves for its
 * own address, it is already structurally separate.
 *
 * ── `getAccessContext()` is called exactly once here, and that is not a saving
 *    a page below has to be careful about ─────────────────────────────────────
 *
 * `getAccessContext` is `cache()`-scoped per request (`capabilities/server.ts`),
 * so a page underneath that calls it again for its own guard costs **no second
 * round trip**. That matters here and not only in the abstract: the same
 * middleware path serves the door, and this project counts round trips on bad
 * networks.
 *
 * ── It throws, and that must stay a throw ────────────────────────────────────
 *
 * `getAccessContext` raises `capabilities.resolve_failed: <code>` and never
 * returns a degraded value. **It is deliberately NOT wrapped in `try/catch`**
 * (D-34-08, state 3). An infrastructure fault dressed as a permission denial is
 * a silent failure with an alibi, and this repository has **no error tracking**
 * to contradict it: a caught resolve failure would refuse a master with exactly
 * the face it uses to refuse a pending member, and nobody would ever learn the
 * difference. The three states — no session, capability missing, could not
 * resolve — never collapse into one.
 *
 * ── This layout is NOT a guard ───────────────────────────────────────────────
 *
 * It resolves and it draws. **Every page below keeps its own capability
 * check** (D-34-09): the middleware and the page give the same verdict because
 * they read the same entry in `src/lib/routes/capability-routes.ts`, and a
 * layout-level guard would be a third place asking a question that already has
 * two askers. The middleware is still UX and the RLS is still the boundary —
 * mounting a nav from a resolved context changes neither.
 *
 * ── `MobileNav` keeps `role` / `status`, deliberately ────────────────────────
 *
 * Plan 34-04 did not change its signature: it is mounted on 44 pages, including
 * the door's, and its three public entries are not capability-gated. So the two
 * casts survive — but **once, here, instead of twice on every page**. They are
 * the same narrowing the pages performed: `AccessContextResult` types both
 * fields `string | null` because they come back from an untyped `rpc()`, and
 * the nav declares the narrower unions. Nothing in this file branches on them.
 * `StaffNav` takes the held capability keys, as rewritten by plan 34-04.
 */
export default async function WorkSurfaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { capabilities, role, status, liveAssignmentCapabilities } =
    await getAccessContext();

  return (
    <>
      <StaffNav capabilities={[...capabilities]} />
      {children}
      <MobileNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
