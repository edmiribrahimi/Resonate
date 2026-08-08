import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import MemberTable from "@/components/admin/MemberTable";
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

export default async function OrganizerMembersPage() {
  // Identity comes from the session, not from an inbound request header.
  const { capabilities, userId, role, status } = await getAccessContext();

  // The question is "may this person reach the organizer area" —
  // `organizer.access`, the same one the middleware asks for `/organizer/*`.
  // This redirect decides reachability only; what a row of `profiles` may be
  // read or written is decided by the row-level policies, and the member
  // actions this table calls re-check on their own.
  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  // The resolver types these `string | null` deliberately, so that no decision
  // can branch on them. They are not a decision here: they are props for a
  // `"use client"` nav that cannot import the DAL. Phase 34 (STAFF-03) converts
  // that nav and this pass-through goes with it.
  const navRole = role as UserRole | null;
  const navStatus = status as UserStatus | null;

  // `userId` is now `string | null`; `MemberTable.currentUserId` is `string`.
  // `?? ""` is behaviour-identical here, and that was checked rather than
  // assumed: the prop is read at exactly one place — `MemberTable.tsx:173`,
  // `member.id === currentUserId` — where a MATCH *suppresses* the action cell
  // on the viewer's own row. A null-vs-null match would therefore refuse more,
  // never admit more, and it cannot happen anyway: `member.id` is a non-null
  // `profiles` primary key, so neither `""` nor `null` can ever equal it. The
  // widened prop is not written because `MemberTable` is shared with the admin
  // members page, which another plan converts; changing its signature from here
  // would edit a file this plan does not own.
  const currentUserId = userId ?? "";

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
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
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
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
      </header>

      <div className="px-6">
        {/*
          `callerRole="organizer"` is gone since 2026-08-08. It was a literal,
          not a fact from the session, and its only effect was to withhold the
          Deactivate and Reactivate controls from this page. The owner decided
          that an organizer may reverse a decision already taken about a person,
          so those two acts now sit on the same gate as approve, reject and the
          role changes — and this page draws them.
        */}
        <MemberTable
          members={members}
          currentUserId={currentUserId}
          showActions={true}
        />
      </div>

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
