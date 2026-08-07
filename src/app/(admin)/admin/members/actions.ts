"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAccessContext } from "@/lib/capabilities/server";
import type { AccessContextResult } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { render } from "@react-email/render";
import { sendEmail } from "@/lib/email";
import { MemberApprovedEmail } from "@/emails/member-approved";
import { MemberRejectedEmail } from "@/emails/member-rejected";

// Service-role client for operations that need to bypass RLS
// (organizers don't have RLS write permission on profiles)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://resonate.app";

async function sendApprovalEmail(email: string, fullName: string) {
  const html = await render(
    MemberApprovedEmail({ memberName: fullName || "Member", loginUrl: APP_URL })
  );
  await sendEmail({
    to: email,
    subject: "Welcome to Resonate - You're Approved!",
    html,
  });
}

async function sendRejectionEmail(email: string, fullName: string) {
  const html = await render(
    MemberRejectedEmail({ memberName: fullName || "Member" })
  );
  await sendEmail({
    to: email,
    subject: "Update on Your Resonate Membership",
    html,
  });
}

// =============================================================================
// TWO functions, and they are NOT duplicates. Do not merge them.
// =============================================================================
//
// Their bodies are now four lines each and differ in exactly one: the
// capability key. That is what will tempt the next reader who runs `diff` on
// them into folding one into the other. It is also the whole point.
//
//   verifyMaster            -> CAP.MASTER_MANAGE  -> master ONLY
//   verifyAdminOrOrganizer  -> CAP.STAFF_MANAGE   -> master AND organizer
//
// Merging them onto STAFF_MANAGE hands every organizer the power to change
// another member's role, which is precisely the ceiling
// `.planning/ACCESS-MODEL-DECISIONS.md` §6 puts in place: an organizer may
// promote staff -> organizer, an organizer may NOT create a master, because a
// self-replicating power must not reach the top. Merging them onto
// MASTER_MANAGE goes the other way and takes approve/reject away from every
// organizer. Neither direction is a tidy-up; both are verdict changes.
//
// EQUIVALENCE, MEASURED against `private.role_capabilities`
// (`20260807000000_capability_model.sql`):
//
//   deleted test                                   grant rows                    requires_approved
//   role !== "master"                              ('master','master.manage')    false      :396
//   role !== "master" && role !== "organizer"      ('master','staff.manage')     false      :392
//                                                  ('organizer','staff.manage')  false      :393
//
// Both deleted tests read a `select("role")`. `status` was never fetched, so it
// could not be part of either predicate — which is why both map to grants with
// `requires_approved = false`, and why neither maps to `catalogue.manage`
// (`requires_approved = true`, :399-400). `member` is not `approved`: two axes,
// and only one of them was ever being read here.
//
// WHY `master.manage` AND NOT `admin.access`. The two resolve to the same
// predicate today — master alone, status ignored — so picking by predicate is
// invisible. They are different QUESTIONS. `master.manage` asks "is this a
// reserved operation", and `CAP_DESCRIPTIONS["master.manage"]` names *changing
// another member's role or status* by hand. `admin.access` asks "may they reach
// the admin area", and the two part company in phase 34, when the admin and
// organizer trees collapse into one surface.

/** Master-only: role management, deactivate, reactivate. */
async function verifyMaster(): Promise<AccessContextResult> {
  const ctx = await getAccessContext();
  if (!ctx.capabilities.has(CAP.MASTER_MANAGE)) {
    throw new Error("forbidden.master_manage_required");
  }
  // A real subject, or nothing happens. Attribution (§5) requires every
  // approval, rejection and promotion to record WHO — so an action must never
  // proceed on a null identity. It sits here rather than at each call site
  // because seven call sites are seven chances to omit it.
  if (!ctx.userId) throw new Error("capabilities.resolve_failed: no_subject");
  return ctx;
}

/** Master or organizer: approve / reject. */
async function verifyAdminOrOrganizer(): Promise<AccessContextResult> {
  const ctx = await getAccessContext();
  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    throw new Error("forbidden.staff_manage_required");
  }
  if (!ctx.userId) throw new Error("capabilities.resolve_failed: no_subject");
  return ctx;
}

// --- Master-only actions (existing) ---

export async function updateMemberRole(
  memberId: string,
  newRole: "organizer" | "member"
) {
  const ctx = await verifyMaster();

  if (memberId === ctx.userId) {
    throw new Error("Cannot change own role");
  }

  // Granting the organizer role approves the account in the same write.
  //
  // Owner decision, 2026-08-06: giving someone staff rights while leaving them
  // `pending` is a contradiction in this path, not a state to be defended
  // downstream. Before this, the two axes could drift — a `pending` member
  // promoted to organizer kept `status = 'pending'`, and every surface that read
  // both had to decide what that meant. The door chose to admit them
  // (`api/tickets/checkin/route.ts`); closing it here means the question stops
  // being asked at all.
  //
  // Demotion does NOT revoke approval: `member` and `approved` are different
  // axes (`access-gating.md`, gate *due assi*), and someone who was approved
  // stays approved when they stop being staff.
  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update(
      newRole === "organizer"
        ? { role: newRole, status: "approved" }
        : { role: newRole }
    )
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }

  revalidatePath("/admin/members");
  return { success: true };
}

export async function deactivateMember(memberId: string) {
  const ctx = await verifyMaster();

  if (memberId === ctx.userId) {
    throw new Error("Cannot deactivate yourself");
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "rejected", role: "member" })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to deactivate member: ${error.message}`);
  }

  revalidatePath("/admin/members");
  return { success: true };
}

export async function reactivateMember(memberId: string) {
  await verifyMaster();

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to reactivate member: ${error.message}`);
  }

  revalidatePath("/admin/members");
  return { success: true };
}

// --- Approve/Reject actions (master + organizer) ---

export async function approveMember(memberId: string) {
  await verifyAdminOrOrganizer();

  const serviceClient = getServiceClient();

  // Fetch member email and name before the status update
  const { data: member } = await serviceClient
    .from("profiles")
    .select("email, full_name")
    .eq("id", memberId)
    .single();

  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to approve member: ${error.message}`);
  }

  // Send approval email fire-and-forget
  if (member?.email) {
    sendApprovalEmail(member.email, member.full_name).catch((err) =>
      console.error("Failed to send approval email:", err)
    );
  }

  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true };
}

export async function rejectMember(memberId: string) {
  await verifyAdminOrOrganizer();

  const serviceClient = getServiceClient();

  // Fetch member email and name before the status update
  const { data: member } = await serviceClient
    .from("profiles")
    .select("email, full_name")
    .eq("id", memberId)
    .single();

  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "rejected", role: "member" })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to reject member: ${error.message}`);
  }

  // Send rejection email fire-and-forget
  if (member?.email) {
    sendRejectionEmail(member.email, member.full_name).catch((err) =>
      console.error("Failed to send rejection email:", err)
    );
  }

  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true };
}

export async function bulkApproveMember(memberIds: string[]) {
  await verifyAdminOrOrganizer();

  if (memberIds.length === 0) {
    throw new Error("No members selected");
  }

  const serviceClient = getServiceClient();

  // Fetch all affected members' emails and names before the bulk update
  const { data: members } = await serviceClient
    .from("profiles")
    .select("id, email, full_name")
    .in("id", memberIds);

  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "approved" })
    .in("id", memberIds);

  if (error) {
    throw new Error(`Failed to bulk approve members: ${error.message}`);
  }

  // Send approval emails sequentially (fire-and-forget) to respect Resend rate limits
  if (members && members.length > 0) {
    (async () => {
      for (const m of members) {
        if (m.email) {
          try {
            await sendApprovalEmail(m.email, m.full_name);
          } catch (err) {
            console.error(`Failed to send approval email to ${m.email}:`, err);
          }
        }
      }
    })().catch(console.error);
  }

  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true, count: memberIds.length };
}

export async function bulkRejectMember(memberIds: string[]) {
  await verifyAdminOrOrganizer();

  if (memberIds.length === 0) {
    throw new Error("No members selected");
  }

  const serviceClient = getServiceClient();

  // Fetch all affected members' emails and names before the bulk update
  const { data: members } = await serviceClient
    .from("profiles")
    .select("id, email, full_name")
    .in("id", memberIds);

  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "rejected", role: "member" })
    .in("id", memberIds);

  if (error) {
    throw new Error(`Failed to bulk reject members: ${error.message}`);
  }

  // Send rejection emails sequentially (fire-and-forget) to respect Resend rate limits
  if (members && members.length > 0) {
    (async () => {
      for (const m of members) {
        if (m.email) {
          try {
            await sendRejectionEmail(m.email, m.full_name);
          } catch (err) {
            console.error(`Failed to send rejection email to ${m.email}:`, err);
          }
        }
      }
    })().catch(console.error);
  }

  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true, count: memberIds.length };
}
