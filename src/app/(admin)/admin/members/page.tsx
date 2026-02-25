import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import MemberTable from "@/components/admin/MemberTable";
import AdminNav from "@/components/admin/AdminNav";
import type { UserRole, UserStatus } from "@/types/database";

// Extract referrer name from Supabase join result
// The join may return a single object or an array depending on FK detection
function extractReferrerName(referrer: unknown): string | null {
  if (!referrer) return null;
  if (Array.isArray(referrer)) {
    const first = referrer[0] as { full_name?: string } | undefined;
    return first?.full_name || null;
  }
  return (referrer as { full_name?: string }).full_name || null;
}

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

  // Fetch all profiles with referral data via self-referencing join
  const supabase = await createClient();
  const { data: rawMembers, error } = await supabase
    .from("profiles")
    .select(
      `id, email, full_name, role, status, membership_code, created_at, referred_by,
       referrer:profiles!referred_by(full_name)`
    )
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

  // Flatten the referrer join data
  const members = (rawMembers || []).map((m) => ({
    id: m.id,
    email: m.email,
    full_name: m.full_name,
    role: m.role as UserRole,
    status: m.status as UserStatus,
    membership_code: m.membership_code,
    created_at: m.created_at,
    referred_by: m.referred_by,
    referrer_name: extractReferrerName(m.referrer),
  }));

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
      </header>

      <AdminNav />

      <div className="px-6">
        <MemberTable
          members={members}
          currentUserId={userId}
          showActions={true}
          callerRole="master"
        />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
