"use server";

import { redirect } from "next/navigation";
import { getResend } from "@/lib/email";
import { CAP } from "@/lib/capabilities/keys";
import { hasCapability } from "@/lib/capabilities/server";

function getAudienceId() {
  if (!process.env.RESEND_AUDIENCE_ID) {
    throw new Error("RESEND_AUDIENCE_ID is not configured");
  }
  return process.env.RESEND_AUDIENCE_ID;
}

/**
 * The reference conversion: one guard asking the one definition.
 *
 * ── Why the verdict does not move ────────────────────────────────────────────
 *
 * This read the injected role header and refused on `role !== "master"`. The
 * header name is deliberately not spelled here: the phase-gate census is
 * `grep -rl` over that literal, and a comment naming it would keep this file in
 * a count that exists to measure how many files still *read* it. (That has
 * already happened once — `src/types/database.ts` took the count from 46 to 47
 * in wave 5 by mentioning it in a doc comment. Recorded in the summary.)
 * `admin.access` is
 * granted to `master` and to nobody else, with `requires_approved = false`
 * (`supabase/migrations/20260807000000_capability_model.sql`, section 7) — which
 * is `role !== "master"` inverted, for every real subject. A `master` of any
 * status holds it; an `organizer` or a `member` of any status does not. The
 * eleven-persona table in `32-08-SUMMARY.md` is the same mapping, measured.
 *
 * For a **forged** header the verdict is also identical, and this is worth
 * saying because it would be easy to sell this as a security fix. It is not.
 * The middleware already deletes every one of those inbound headers and
 * re-sets them from the session (`src/lib/supabase/middleware.ts`), so the
 * header was not forgeable here either. **This conversion narrows nothing** —
 * it removes a dependency, which is what the next phase does 45 more times.
 *
 * ── What it costs ────────────────────────────────────────────────────────────
 *
 * One database round trip per render of this surface. The middleware already
 * resolved the same context on the same request, but it runs in a separate
 * execution and React's `cache()` cannot span the two — so this is a genuine
 * extra query, not a memoised read. It is paid here on purpose: newsletter is a
 * low-traffic admin surface, and paying it once is what makes "one definition,
 * three callers" an observation rather than a claim. The money surface next
 * door (`admin/finance/actions.ts`) holds a byte-identical copy of this guard
 * and is deliberately NOT converted in this phase (D-13).
 *
 * A failure to resolve throws — it does not fall through to a refusal. See
 * `src/lib/capabilities/server.ts`: an empty capability set on failure would
 * refuse a master exactly the way it refuses a member, and there is no error
 * tracking in this project to tell the two apart.
 */
async function requireMaster() {
  if (!(await hasCapability(CAP.ADMIN_ACCESS))) {
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
