import { redirect } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import StaffNav from "@/components/staff/StaffNav";
import TransactionList from "@/components/admin/TransactionList";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminFinancePage() {
  // One resolve for the whole render. The decision below asks `capabilities`;
  // `role` and `status` are carried on only as PROPS to two `"use client"`
  // navs, which cannot import the capability module and therefore still take
  // the two axes as values. Nothing here branches on them — teaching the navs
  // to ask capabilities is phase 34 (STAFF-03), and this is a source swap.
  const { capabilities, role, status } = await getAccessContext();

  // Same question the middleware asks of `/admin/*`, asked again here because
  // a page-level check is the surface's own gate and not an inherited one.
  // `admin.access` is granted to `master` alone, so no role's reach moves.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
      </header>

      {/* The two casts are the same ones the header read performed, moved to
          the point of use. `AccessContextResult` types both fields
          `string | null` because they come back from an untyped `rpc()`; the
          navs declare the narrower unions. Nothing decides anything on them. */}
      <StaffNav capabilities={[...capabilities]} />

      <div className="px-6">
        <TransactionList />
      </div>

      <MobileNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
      />
    </div>
  );
}
