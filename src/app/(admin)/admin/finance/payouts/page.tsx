import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import FinanceSubNav from "@/components/admin/FinanceSubNav";
import PayoutList from "@/components/admin/PayoutList";
import MobileNav from "@/components/layout/MobileNav";
import type { UserRole, UserStatus } from "@/types/database";

export default async function PayoutsPage() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  if (role !== "master") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
      </header>

      <AdminNav role={role} />

      <div className="px-6">
        <FinanceSubNav />
        <PayoutList />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
