import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import AdminNav from "@/components/admin/AdminNav";
import TransactionList from "@/components/admin/TransactionList";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminFinancePage() {
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
        <TransactionList />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
