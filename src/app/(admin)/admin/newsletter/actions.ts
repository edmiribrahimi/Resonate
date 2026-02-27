"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import type { UserRole } from "@/types/database";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function getAudienceId() {
  if (!process.env.RESEND_AUDIENCE_ID) {
    throw new Error("RESEND_AUDIENCE_ID is not configured");
  }
  return process.env.RESEND_AUDIENCE_ID;
}

async function requireMaster() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  if (role !== "master") {
    redirect("/dashboard");
  }
}

export async function getSubscriberStats() {
  await requireMaster();
  const resend = getResend();
  const { data } = await resend.contacts.list({ audienceId: getAudienceId() });
  return {
    total: data?.data?.length ?? 0,
  };
}

export async function listBroadcasts() {
  await requireMaster();
  const resend = getResend();
  const { data } = await resend.broadcasts.list();
  return data?.data ?? [];
}

export async function createAndSendBroadcast(subject: string, htmlContent: string) {
  await requireMaster();
  const resend = getResend();
  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>";

  const { data: broadcast, error: createError } = await resend.broadcasts.create({
    audienceId: getAudienceId(),
    from: fromAddress,
    subject,
    html: htmlContent,
  });

  if (createError || !broadcast) {
    throw new Error(`Failed to create broadcast: ${createError?.message ?? "Unknown error"}`);
  }

  const { error: sendError } = await resend.broadcasts.send(broadcast.id);

  if (sendError) {
    throw new Error(`Failed to send broadcast: ${sendError.message}`);
  }

  return { id: broadcast.id };
}

export async function deleteBroadcast(broadcastId: string) {
  await requireMaster();
  const resend = getResend();
  const { error } = await resend.broadcasts.remove(broadcastId);
  if (error) {
    throw new Error(`Failed to delete broadcast: ${error.message}`);
  }
  return { success: true };
}
