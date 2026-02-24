"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for operations that need to bypass RLS
// (organizers don't have RLS write permission on profiles)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Master-only verification (for role management, deactivate, reactivate)
async function verifyMaster(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.role !== "master") {
    throw new Error("Forbidden: only master can change roles");
  }

  return user;
}

// Master or organizer verification (for approve/reject operations)
async function verifyAdminOrOrganizer(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.role !== "master" && profile.role !== "organizer") {
    throw new Error("Forbidden: only master or organizer can approve/reject members");
  }

  return user;
}

// --- Master-only actions (existing) ---

export async function updateMemberRole(
  memberId: string,
  newRole: "organizer" | "member"
) {
  const supabase = await createClient();
  const user = await verifyMaster(supabase);

  if (memberId === user.id) {
    throw new Error("Cannot change own role");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }

  revalidatePath("/admin/members");
  return { success: true };
}

export async function deactivateMember(memberId: string) {
  const supabase = await createClient();
  const user = await verifyMaster(supabase);

  if (memberId === user.id) {
    throw new Error("Cannot deactivate yourself");
  }

  const { error } = await supabase
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
  const supabase = await createClient();
  await verifyMaster(supabase);

  const { error } = await supabase
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
  const supabase = await createClient();
  await verifyAdminOrOrganizer(supabase);

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to approve member: ${error.message}`);
  }

  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true };
}

export async function rejectMember(memberId: string) {
  const supabase = await createClient();
  await verifyAdminOrOrganizer(supabase);

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "rejected", role: "member" })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to reject member: ${error.message}`);
  }

  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true };
}

export async function bulkApproveMember(memberIds: string[]) {
  const supabase = await createClient();
  await verifyAdminOrOrganizer(supabase);

  if (memberIds.length === 0) {
    throw new Error("No members selected");
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "approved" })
    .in("id", memberIds);

  if (error) {
    throw new Error(`Failed to bulk approve members: ${error.message}`);
  }

  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true, count: memberIds.length };
}

export async function bulkRejectMember(memberIds: string[]) {
  const supabase = await createClient();
  await verifyAdminOrOrganizer(supabase);

  if (memberIds.length === 0) {
    throw new Error("No members selected");
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "rejected", role: "member" })
    .in("id", memberIds);

  if (error) {
    throw new Error(`Failed to bulk reject members: ${error.message}`);
  }

  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true, count: memberIds.length };
}
