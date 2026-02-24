"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
