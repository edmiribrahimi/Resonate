import { getAccessContext } from "@/lib/capabilities/server";
import MobileNav from "@/components/layout/MobileNav";
import ScannerClient from "./ScannerClient";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * Two lines, no decision.
 *
 * Despite sitting on the highest-consequence path in the product, this is the
 * lowest-risk file in the census: `role` and `status` are read **only** to hand
 * to `<MobileNav>`, and `<ScannerClient />` renders unconditionally. The gate is
 * the middleware's `door.operate` rule (`middleware.ts:167-171`), not anything
 * here.
 *
 * **No capability gate is added to this page, deliberately.** One here would be
 * a second refusal path in front of the door that has never existed, dressed as
 * defence in depth. Every role must reach exactly what it reached before.
 *
 * `<MobileNav>` and `<StaffNav>` keep taking `role` and `status` as props: they
 * are `"use client"` components and cannot import the DAL. Resolving in the
 * parent Server Component and passing values down is Next.js's own guidance for
 * that case. Converting them to consume capabilities against four roles is
 * STAFF-03, phase 34.
 */
export default async function ScannerPage() {
  const { role, status } = await getAccessContext();

  return (
    <>
      <ScannerClient />
      <MobileNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
      />
    </>
  );
}
