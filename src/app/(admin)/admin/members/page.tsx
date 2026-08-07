import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import MemberTable from "@/components/admin/MemberTable";
import StaffNav from "@/components/staff/StaffNav";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
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
  // Identity and reachability come from the session, not from three request
  // headers an attacker can set.
  const { capabilities, userId, role, status } = await getAccessContext();

  // Defense in depth behind the middleware — and now the SAME question the
  // middleware asks for `/admin/*`, of the same authority. Never a role list:
  // a fourth role arrives in phase 34.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // The nav components are typed to the `UserRole` / `UserStatus` unions; the
  // resolver answers `string | null`. Same cast the header read already made,
  // from a better source. Phase 34 (STAFF-03) owns these props.
  const navRole = role as UserRole | null;
  const navStatus = status as UserStatus | null;

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
        <MobileNav role={navRole} status={navStatus} />
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
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        </header>
      </AnimatedSection>

      <StaffNav role={navRole} context="admin" />

      <AnimatedSection delay={0.1} className="px-6">
        {/*
          `userId` is `string | null` from the resolver; the identity header
          this replaces was read as `headersList.get(...) || ""`. `?? ""` is
          the null handling here, chosen by reading the consumer, not guessed:

          `currentUserId` is used at ONE place — `MemberTable.tsx:173`,
          `if (member.id === currentUserId)` — to draw "--" instead of the
          actions cell on the viewer's OWN row. Its false branch grants a UI
          affordance, not a permission: the authoritative self-protection is
          server-side and independent of this prop
          (`admin/members/actions.ts:109` throws "Cannot change own role" on
          `memberId === user.id`, with `user` from `supabase.auth.getUser()`).

          So the `null == null` regression `ownsOrIsMaster` exists to prevent
          cannot arise here: `member.id` is a non-null `profiles` primary key,
          so neither `""` nor `null` ever equals it, and `===` does not coerce.
          `?? ""` therefore reproduces today's behaviour in every reachable
          case, including the degraded one where the migration has not been
          applied and `user_id` is absent on a real session. Widening the prop
          would edit a component shared with the organizer members page, which
          belongs to another plan.
        */}
        <MemberTable
          members={members}
          currentUserId={userId ?? ""}
          showActions={true}
          callerRole="master"
        />
      </AnimatedSection>

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
