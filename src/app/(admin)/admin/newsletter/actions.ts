"use server";

import { redirect, unstable_rethrow } from "next/navigation";
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

/**
 * ── Why these actions return a failure instead of throwing it ────────────────
 *
 * `src/lib/capabilities/server.ts` throws on every resolve failure, on purpose,
 * so that an infrastructure fault can never be mistaken for a refusal. That
 * contract holds *at the resolver*. It said nothing about what a caller does
 * with the throw, and three of this file's four callers swallowed it: the
 * broadcast list rendered a `capabilities.resolve_failed` as **an empty list**,
 * presented as fact, and the page rendered it as *"Newsletter not configured —
 * set RESEND_API_KEY"*, which points the operator at the wrong system entirely.
 * That is CR-01 in `32-REVIEW.md`, and it is the newsletter precedent from
 * `.planning/codebase/CONCERNS.md` recreated by the phase that cites it.
 *
 * A thrown message cannot carry the diagnosis across the wire. Next redacts the
 * message of an error thrown out of a Server Action in a production build — the
 * client receives a generic string and a digest — so `err.message.startsWith(
 * "capabilities.resolve_failed")` works in `next dev` and silently stops working
 * in the deployment where it matters. The category has to be a **value** to
 * survive, so these actions return a tagged result.
 *
 * The tag is decided by POSITION, not by parsing a message: the capability guard
 * runs in its own try, the provider call in another. Nothing depends on the text
 * of an error, which is the part a framework is free to rewrite.
 *
 * This project has **no error tracking** (`meta-gates.md`, verified 2026-08-05),
 * so a log line reaches nobody. Each failure therefore also gets a distinct,
 * rendered UI state — see `BroadcastList.tsx`, `ComposeForm.tsx` and `page.tsx`.
 * The rule the three share: a failure is never drawn as an empty result, and the
 * two causes are never collapsed into one message.
 */
export type NewsletterFailure =
  /** The permission lookup itself failed. Nothing was asked of Resend. */
  | "capabilities_unavailable"
  /** The guard passed; Resend or its configuration did not answer. */
  | "provider_unavailable";

export type NewsletterResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: NewsletterFailure; detail: string };

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs the guard, then the body, and reports which of the two failed.
 *
 * `unstable_rethrow` is what lets this catch anything at all: `redirect()`
 * signals itself by throwing, and a `catch` that swallowed it would turn the
 * refusal of a non-master into a rendered error instead of a redirect. It
 * re-throws Next's control-flow errors and returns for everything else.
 */
async function guarded<T>(
  action: string,
  run: () => Promise<T>
): Promise<NewsletterResult<T>> {
  try {
    await requireMaster();
  } catch (error) {
    unstable_rethrow(error);
    const detail = describe(error);
    console.error(`[newsletter.capabilities_unavailable] ${action}: ${detail}`);
    return { ok: false, failure: "capabilities_unavailable", detail };
  }

  try {
    return { ok: true, data: await run() };
  } catch (error) {
    unstable_rethrow(error);
    const detail = describe(error);
    console.error(`[newsletter.provider_unavailable] ${action}: ${detail}`);
    return { ok: false, failure: "provider_unavailable", detail };
  }
}

export async function getSubscriberStats(): Promise<
  NewsletterResult<{ total: number }>
> {
  return guarded("getSubscriberStats", async () => {
    const resend = getResend();
    const { data } = await resend.contacts.list({ audienceId: getAudienceId() });
    return { total: data?.data?.length ?? 0 };
  });
}

export async function listBroadcasts(): Promise<NewsletterResult<unknown[]>> {
  return guarded("listBroadcasts", async () => {
    const resend = getResend();
    const { data } = await resend.broadcasts.list();
    return data?.data ?? [];
  });
}

export async function createAndSendBroadcast(
  subject: string,
  htmlContent: string
): Promise<NewsletterResult<{ id: string }>> {
  return guarded("createAndSendBroadcast", async () => {
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
      throw new Error(
        `Failed to create broadcast: ${createError?.message ?? "Unknown error"}`
      );
    }

    const { error: sendError } = await resend.broadcasts.send(broadcast.id);

    if (sendError) {
      throw new Error(`Failed to send broadcast: ${sendError.message}`);
    }

    return { id: broadcast.id };
  });
}

export async function deleteBroadcast(
  broadcastId: string
): Promise<NewsletterResult<{ success: true }>> {
  return guarded("deleteBroadcast", async () => {
    const resend = getResend();
    const { error } = await resend.broadcasts.remove(broadcastId);
    if (error) {
      throw new Error(`Failed to delete broadcast: ${error.message}`);
    }
    return { success: true as const };
  });
}
