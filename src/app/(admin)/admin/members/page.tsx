import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import MemberTable from "@/components/admin/MemberTable";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminMembersPage() {
  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const userId = headersList.get("x-user-id") || "";

  // Defense in depth: middleware already blocks non-master, but verify here too
  if (role !== "master") {
    redirect("/dashboard");
  }

  // Fetch all profiles
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status, membership_code, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-dvh pb-24">
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Member Management
          </h1>
        </header>
        <div className="px-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">
              Failed to load members: {error.message}
            </p>
          </div>
        </div>
        <MobileNav role={role} status={status} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Member Management
        </h1>
      </header>

      <div className="px-6">
        <MemberTable
          members={members || []}
          currentUserId={userId}
          showActions={true}
        />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
