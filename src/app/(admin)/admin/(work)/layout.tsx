import type { CSSProperties, ReactNode } from "react";
import AppNav from "@/components/layout/AppNav";
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
 * ── It mounts `AppNav` directly, and the two staff forms it composes ─────────
 *
 * This layout is the **only** mount site that passes `workNav`, because it is
 * the only one under which the eight work surfaces live. From 768 px up the
 * eight tabs are stacked inside the navigation column under a `Work` heading;
 * below it they are a strip in flow above the content. Two trees, each removed
 * at the other tier by `display` — never one tree filtered by width.
 *
 * It mounts `AppNav` and not the `MobileNav` wrapper deliberately: the wrapper
 * exists to lock the **door** to the bar form (D-41-21), and a work surface is
 * not the door.
 *
 * ── The clearance shim, declared rather than discovered ──────────────────────
 *
 * From 768 px up the navigation column occupies 224 px at the leading edge. The
 * 24 pages under this layout have **not been converted yet**: they carry their
 * own bottom clearance and no leading padding at all, so without help their
 * content would sit underneath the column from the first merge.
 *
 * So `{children}` is wrapped in two elements. The outer takes the real
 * clearance from `--nav-inset-inline-start` — 0 on a phone, 14 rem from `md` up.
 * The inner **redeclares that variable as `0px` for its own subtree**, so a page
 * that *has* been converted and renders `PageShell` — whose outer element reads
 * the same variable — adds nothing on top of it. Every work page is then
 * correctly cleared at every width, converted or not, with zero JavaScript and
 * no per-page edit.
 *
 * **Its exit route, written now rather than left to be inferred.** This shim is
 * removed by the plan that converts the **last** page under this layout, at
 * which point `PageShell` owns the clearance alone, as D-41-03 specifies. A
 * transitional mechanism with no written exit is how a transition becomes the
 * architecture.
 *
 * ── `AppNav` now takes the capability set too, and the count that used to
 *    justify otherwise was wrong ──────────────────────────────────────────────
 *
 * This paragraph used to say plan 34-04 did not change `MobileNav`'s signature
 * because it is mounted on **44** pages. That number was already stale when it
 * was written: it predates plan 34-05, which introduced this very layout and
 * folded every work surface into a single mount. **Measured: 13 mount sites**,
 * of which this file is one. Plan 39-03 changed the signature and threaded all
 * 13 — a stale count in prose used to justify leaving a signature alone is how
 * a decision outlives its reason.
 *
 * So `AppNav` and `StaffNav` now take **the same shape**: serialisable
 * capability keys, resolved here in the Server Component because both are
 * `"use client"` and cannot import the DAL. The two `role` / `status` casts
 * survive alongside them — the nav still draws four entries that no capability
 * governs — but **once, here, instead of twice on every page**. They are the
 * same narrowing the pages performed: `AccessContextResult` types both fields
 * `string | null` because they come back from an untyped `rpc()`, and the nav
 * declares the narrower unions. Nothing in this file branches on them.
 */
export default async function WorkSurfaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { capabilities, role, status, liveAssignmentCapabilities } =
    await getAccessContext();

  const staffCapabilities = [...capabilities];

  return (
    <>
      <AppNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={staffCapabilities}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
        workNav={<StaffNav capabilities={staffCapabilities} form="column" />}
      />
      <div className="ps-[var(--nav-inset-inline-start)]">
        <StaffNav capabilities={staffCapabilities} form="strip" />
        {/*
          The inner element redeclares the leading-edge clearance as zero for
          everything below it, so a converted page's own leading padding — which
          reads the same variable — resolves to nothing and does not add a
          second 224 px. See the docblock for when this whole wrapper leaves.

          The class string is deliberately NOT spelled in this comment: Tailwind
          scans comments, cannot tell a description from a use, and an
          abbreviated one emits a malformed rule and a build warning. Measured
          here, not assumed — the warning appeared on the first build.
        */}
        <div
          style={
            { "--nav-inset-inline-start": "0px" } as CSSProperties
          }
        >
          {children}
        </div>
      </div>
    </>
  );
}
