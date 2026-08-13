import type { ReactNode } from "react";
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
 * ── The clearance: declared here, applied by the shell ───────────────────────
 *
 * From 768 px up the navigation column occupies 224 px at the leading edge. This
 * layout **declares** that clearance at the `md` tier — 0 on a phone, 14 rem
 * from `md` up — and every page below **applies** it for itself, because every
 * page below renders `PageShell`, whose outer element reads the same declared
 * value. One declaration, twenty-three consumers, zero JavaScript. That is
 * D-41-03's design as originally specified.
 *
 * **This element used to only APPLY the clearance**, taking it from an ambient
 * `:root` declaration in `globals.css`. SUPERSEDED 2026-08-13 by D-41.1-01, kept
 * beside the measurement: that ambient value was true of two of the thirteen
 * navigation mount sites and false of the other eleven, so it is now zero
 * everywhere and the two sites with a column declare it themselves. Nothing
 * about what this layout RENDERS changed — the same 224 px at the same tier —
 * only where the number comes from.
 *
 * **And it used to also APPLY the clearance as leading padding, with a second,
 * nested element re-declaring the value as zero for its subtree.** SUPERSEDED
 * 2026-08-14 by plan 41.1-24, kept beside its measurement rather than deleted:
 * that pairing was a shim for the pages this layout wrapped that had **not yet
 * been converted**. An unconverted page renders no `PageShell`, so it applied no
 * clearance of its own and would have sat underneath the column; the outer
 * element paid for it, and the inner element zeroed the value again so that a
 * page which HAD been converted did not add a second 224 px on top.
 *
 * **The exit was written into this file before it was taken, and it was two
 * steps.** *(1)* Plan 41.1-05 gave this element the declaration and kept the
 * padding. *(2)* Plan 41.1-24 — the plan that declared the **last** page under
 * this layout converted — removed the inner element and this element's padding
 * in the **same commit** as that declaration. The order was binding and not a
 * preference, in both directions: stopping the padding one commit early would
 * have put a still-unconverted page under the column, which is the exact failure
 * the shim existed to prevent; removing the inner element early would have given
 * every converted page 448 px of leading clearance at tablet width and up. The
 * precondition was checked on the tree rather than assumed — 24 page files live
 * under this layout, 23 of them import `PageShell`, and the 24th is
 * `(work)/page.tsx`, which renders nothing and ends in a `redirect`.
 *
 * **What may still never change: this layout may not stop DECLARING.** Check E
 * of `scripts/verify-conversion.mjs` holds that the files declaring the
 * leading-edge column clearance are exactly the files mounting the responsive
 * navigation form, and it fails in both directions. Drop the declaration and all
 * twenty-three pages below read zero and lose their clearance instead.
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
      {/*
        This element DECLARES the leading-edge column clearance and no longer
        applies it: one arbitrary-property utility at the md tier, setting the
        clearance custom property to fourteen rems. Every page below applies it
        for itself through PageShell, which reads the same declared value.

        It is one half of a pairing, and the pairing is asserted rather than
        conventional: check E of scripts/verify-conversion.mjs holds that the
        files declaring the leading-edge column clearance are exactly the files
        mounting the responsive navigation form, and it fails in both directions.
        This file is one of the two; the public gallery is the other.

        It has to declare it because since D-41.1-01 nothing above it does: the
        stylesheet's ambient value is zero at every width, precisely so that a
        route mounting no navigation cannot inherit a column it does not have.

        The utility is written WHOLE in the class list and is NOT spelled in this
        comment. That is measured, not stylistic: Tailwind scans comments, cannot
        tell a description from a use, and an abbreviated arbitrary property
        emits a malformed rule and a build warning — it appeared on the first
        build of plan 41.1-05.
      */}
      <div className="md:[--nav-inset-inline-start:14rem]">
        <StaffNav capabilities={staffCapabilities} form="strip" />
        {children}
      </div>
    </>
  );
}
