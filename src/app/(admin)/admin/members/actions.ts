"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
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
// The result vocabulary — why these actions RETURN a failure instead of
// throwing it
// =============================================================================
//
// Same reasoning as `src/app/(admin)/admin/newsletter/actions.ts:62-91`, which
// is the only precedent in this repository, and it is followed rather than
// re-derived.
//
// Next **redacts** the message of an error thrown out of a Server Action in a
// production build (`src/lib/capabilities/server.ts:59-63`). A caller that
// branches on `err.message` therefore works in `next dev` and silently stops
// working in the deployment where it matters. *A caller that needs the category
// on the client must carry it as a **value**, not as a message.*
//
// And the tag is decided by POSITION, not by parsing anything: the capability
// guard runs in its own `try` (a throw out of it is
// `capabilities_unavailable`), a refusal is a RETURNED outcome from the same
// guard (`forbidden`), and the database call runs in another `try` where the
// category comes from `error.code` — a field of the PostgREST error object and
// not a sentence a framework is free to rewrite.
//
// ── The one field of a PostgREST error that may be propagated ────────────────
//
// Measured in plan 43-01, finding 1: on a CHECK violation against
// `public.profiles`, `error.details` reads
// `Failing row contains (<uuid>, <address>, <full_name>, <membership_code>, …)`
// — the WHOLE row, including the membership code, which
// `src/app/api/membership/list/route.ts` shows is the door's only credential.
// So, in this file:
//
//   * `error.code`    — the category, and the only field that crosses the wire;
//   * `error.message` — carries the constraint name, safe, and is LOGGED only;
//   * `error.details` — never read, never logged, never returned;
//   * the error object as a whole — never logged, because `console.error(x, err)`
//     serialises `details` with it.
//
// ── There is no error tracking in this project ───────────────────────────────
//
// `meta-gates.md`, verified 2026-08-05: no monitoring dependency, so a log line
// reaches nobody. Every failure below therefore also has to become something a
// person can SEE — that is `src/components/admin/MemberTable.tsx`, which draws
// one distinct notice per cause and never draws a failure as "nothing
// happened". The recorded precedent this avoids is the newsletter form
// collapsing a network fault, a missing key and an already-subscribed address
// into "Qualcosa è andato storto" (`.planning/codebase/CONCERNS.md`).

export type MemberActFailure =
  /**
   * The permission lookup itself failed — nothing was asked of the database
   * about the subject. An infrastructure fault, never a refusal.
   */
  | "capabilities_unavailable"
  /** The guard answered no. The caller does not hold the capability. */
  | "forbidden"
  /**
   * The DATABASE refused the write.
   *
   * **This is the only failure in this file that can arrive from a RULE rather
   * than from a bug**, and it deserves the paragraph.
   *
   * `profiles_role_implies_approved` (plan 43-06) says a staff role implies an
   * approved account. It fires on a path nobody tested — by definition, since
   * the path that trips it is the one nobody thought of — and it fires on the
   * day it fires. The sentence a person must read when it does:
   *
   *   *this account holds a staff role, and a staff role must be approved — the
   *   write was refused by the database, not by this screen.*
   *
   * That sentence exists here, and in the notice copy of
   * `MemberTable.tsx`, so that **the day it fires is not the day somebody
   * learns the word "redacted"**.
   *
   * Recognised by the PostgreSQL error CODE `23514`, measured at the JS client
   * in plan 43-01 (measurement 5) and again in 43-06 and 43-07. The constraint
   * NAME travels in `error.message` and is logged for the diagnosis — it is
   * never used to pick the category, because picking a category from a sentence
   * is the failure mode this whole section exists to avoid.
   */
  | "constraint_refused"
  /**
   * `record_membership_act` raised `P0002` (`no_data_found`): the subject id
   * does not name a profile. Distinguishable from every other cause, which is
   * the point — "the row is gone, reload" and "the write was refused" are two
   * different things to do next.
   */
  | "subject_not_found"
  /** Any other database failure. Nothing was changed. */
  | "write_failed"
  /**
   * The request asked for no change at all — an empty selection, or a role
   * change to the role the account already holds.
   *
   * A sixth cause rather than a silent success: the register has no act for
   * "nothing happened", and writing one would put a claim in the register that
   * the database never performed.
   */
  | "nothing_to_do";

export type MemberActResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: MemberActFailure; detail: string };

/** PostgreSQL `check_violation`. Measured at the JS client in plan 43-01. */
const CHECK_VIOLATION = "23514";

/**
 * PostgreSQL `no_data_found` — what `record_membership_act` raises for a
 * subject that does not exist (`20260808002000_membership_register.sql:417-423`).
 */
const NO_DATA_FOUND = "P0002";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The shape of a PostgREST error, narrowed to the two fields this file reads. */
type WriteError = { code?: string | null; message?: string | null };

/**
 * The category of a refused write, from its CODE alone.
 *
 * `23514` is also the code of the register's own CHECKs
 * (`membership_acts_act_check`, `membership_acts_actor_attributed`). Those are
 * unreachable except by a bug in THIS file — a misspelled act value, or an
 * actor kind that disagrees with the actor — so mapping the code to
 * `constraint_refused` is right for the case an operator can meet, and the
 * constraint name in the logged message is what tells the two apart afterwards.
 */
function classifyWriteFailure(error: WriteError): MemberActFailure {
  if (error.code === CHECK_VIOLATION) return "constraint_refused";
  if (error.code === NO_DATA_FOUND) return "subject_not_found";
  return "write_failed";
}

/**
 * Logs the diagnosis and returns the tagged failure.
 *
 * `code` and `message` — never the error object, never `details`. See the
 * section above for why that is a rule and not a preference.
 */
function writeFailure(
  action: string,
  error: WriteError
): { ok: false; failure: MemberActFailure; detail: string } {
  const failure = classifyWriteFailure(error);
  console.error(
    `[members.${failure}] ${action}: code=${error.code ?? "unknown"} ` +
      `message=${error.message ?? "(none)"}`
  );
  return { ok: false, failure, detail: error.code ?? "unknown" };
}

// =============================================================================
// TWO functions, and they are NOT duplicates. Do not merge them.
// =============================================================================
//
// Their bodies are now a handful of lines each and differ in exactly one: the
// capability key. That is what will tempt the next reader who runs `diff` on
// them into folding one into the other — or into parameterising the key, which
// is the same fold wearing an argument. It is also the whole point.
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
//
// ── What changed, and what did not ───────────────────────────────────────────
//
// These two used to THROW on both outcomes. They now RETURN a refusal and
// still THROW when the lookup itself failed, and that asymmetry is the position
// the tag is read from: a throw out of `getAccessContext()` is
// `capabilities_unavailable`, a returned `{ok:false}` is `forbidden`. The
// VERDICTS are byte-identical to before — same key, same capability, same
// answer for every persona.

/** A guard's answer: the actor, or the refusal. */
type GuardOutcome =
  | { ok: true; ctx: AccessContextResult }
  | { ok: false; failure: "forbidden"; detail: string };

/** Master-only: deactivate, reactivate. */
async function verifyMaster(): Promise<GuardOutcome> {
  const ctx = await getAccessContext();
  if (!ctx.capabilities.has(CAP.MASTER_MANAGE)) {
    return { ok: false, failure: "forbidden", detail: "master_manage_required" };
  }
  // A real subject, or nothing happens. Attribution (§5) requires every
  // approval, rejection and promotion to record WHO — so an action must never
  // proceed on a null identity. It sits here rather than at each call site
  // because eight call sites are eight chances to omit it.
  //
  // It THROWS rather than returning `forbidden`, on purpose: a resolver that
  // produced no subject did not refuse anybody, it failed. The throw lands in
  // `guarded`'s first catch and is reported as `capabilities_unavailable`,
  // which is the cause an operator can act on.
  if (!ctx.userId) throw new Error("capabilities.resolve_failed: no_subject");
  return { ok: true, ctx };
}

/** Master or organizer: approve / reject / role changes within the ceiling. */
async function verifyAdminOrOrganizer(): Promise<GuardOutcome> {
  const ctx = await getAccessContext();
  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    return { ok: false, failure: "forbidden", detail: "staff_manage_required" };
  }
  if (!ctx.userId) throw new Error("capabilities.resolve_failed: no_subject");
  return { ok: true, ctx };
}

/**
 * Runs the guard, then the body, and reports which of the two failed.
 *
 * `unstable_rethrow` is in both catches for the reason
 * `newsletter/actions.ts:106-113` gives: Next signals its own control flow —
 * `redirect()`, `notFound()` — by throwing, and a `catch` that swallowed one
 * would turn a navigation into a rendered error. It re-throws Next's
 * control-flow errors and returns for everything else.
 *
 * `getAccessContext()` is destructured ONCE per action, into `outcome.ctx`,
 * and passed to the body. `cache()` does **not** memoise inside a Server Action
 * (`src/lib/capabilities/server.ts:103-116`, measured), so a second call would
 * be a second full round trip, not a free read.
 */
async function guarded<T>(
  action: string,
  verify: () => Promise<GuardOutcome>,
  run: (ctx: AccessContextResult) => Promise<MemberActResult<T>>
): Promise<MemberActResult<T>> {
  let outcome: GuardOutcome;

  try {
    outcome = await verify();
  } catch (error) {
    unstable_rethrow(error);
    const detail = describe(error);
    console.error(`[members.capabilities_unavailable] ${action}: ${detail}`);
    return { ok: false, failure: "capabilities_unavailable", detail };
  }

  if (!outcome.ok) {
    console.error(`[members.forbidden] ${action}: ${outcome.detail}`);
    return { ok: false, failure: "forbidden", detail: outcome.detail };
  }

  try {
    return await run(outcome.ctx);
  } catch (error) {
    unstable_rethrow(error);
    const detail = describe(error);
    console.error(`[members.write_failed] ${action}: ${detail}`);
    return { ok: false, failure: "write_failed", detail };
  }
}

/**
 * Reads the address and the name needed by an email, after the write.
 *
 * After, not before: on a refused write there is nothing to send, and fetching
 * first would pull an address into memory for an act that never happened.
 */
async function readContact(
  serviceClient: ReturnType<typeof getServiceClient>,
  memberId: string
): Promise<{ email: string | null; full_name: string } | null> {
  const { data } = await serviceClient
    .from("profiles")
    .select("email, full_name")
    .eq("id", memberId)
    .single();
  return data ?? null;
}

/**
 * A mail that did not leave is a failure with no observable effect on the
 * member's screen — so it is logged with its own category and the SUBJECT ID.
 *
 * The subject id and not the address: this project's logs end up in
 * screenshots, and an address in a log is an address published. A uuid names
 * the row without naming the person, which is the same rule
 * `record_membership_act` follows for `subject_label`.
 */
function logEmailFailure(action: string, memberId: string, error: unknown) {
  console.error(
    `[members.email_failed] ${action}: subject=${memberId} ${describe(error)}`
  );
}

// --- Master-only actions ---

export async function updateMemberRole(
  memberId: string,
  newRole: "organizer" | "member"
): Promise<MemberActResult<{ memberId: string }>> {
  return guarded("updateMemberRole", verifyMaster, async (ctx) => {
    if (memberId === ctx.userId) {
      return { ok: false, failure: "forbidden", detail: "self_role_change" };
    }

    // Granting the organizer role approves the account in the same write.
    //
    // Owner decision, 2026-08-06: giving someone staff rights while leaving
    // them `pending` is a contradiction in this path, not a state to be
    // defended downstream. Before this, the two axes could drift — a `pending`
    // member promoted to organizer kept `status = 'pending'`, and every surface
    // that read both had to decide what that meant. The door chose to admit
    // them (`api/tickets/checkin/route.ts`); closing it here means the question
    // stops being asked at all.
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

    if (error) return writeFailure("updateMemberRole", error);

    revalidatePath("/admin/members");
    return { ok: true, data: { memberId } };
  });
}

export async function deactivateMember(
  memberId: string
): Promise<MemberActResult<{ memberId: string }>> {
  return guarded("deactivateMember", verifyMaster, async (ctx) => {
    if (memberId === ctx.userId) {
      return { ok: false, failure: "forbidden", detail: "self_deactivate" };
    }

    const serviceClient = getServiceClient();
    const { error } = await serviceClient
      .from("profiles")
      .update({ status: "rejected", role: "member" })
      .eq("id", memberId);

    if (error) return writeFailure("deactivateMember", error);

    revalidatePath("/admin/members");
    return { ok: true, data: { memberId } };
  });
}

export async function reactivateMember(
  memberId: string
): Promise<MemberActResult<{ memberId: string }>> {
  return guarded("reactivateMember", verifyMaster, async () => {
    const serviceClient = getServiceClient();
    const { error } = await serviceClient
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", memberId);

    if (error) return writeFailure("reactivateMember", error);

    revalidatePath("/admin/members");
    return { ok: true, data: { memberId } };
  });
}

// --- Approve/Reject actions (master + organizer) ---

export async function approveMember(
  memberId: string
): Promise<MemberActResult<{ memberId: string }>> {
  return guarded("approveMember", verifyAdminOrOrganizer, async () => {
    const serviceClient = getServiceClient();

    const { error } = await serviceClient
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", memberId);

    if (error) return writeFailure("approveMember", error);

    const member = await readContact(serviceClient, memberId);
    if (member?.email) {
      sendApprovalEmail(member.email, member.full_name).catch((err) =>
        logEmailFailure("approveMember", memberId, err)
      );
    }

    revalidatePath("/admin/members");
    revalidatePath("/organizer/members");
    return { ok: true, data: { memberId } };
  });
}

export async function rejectMember(
  memberId: string
): Promise<MemberActResult<{ memberId: string }>> {
  return guarded("rejectMember", verifyAdminOrOrganizer, async () => {
    const serviceClient = getServiceClient();

    const { error } = await serviceClient
      .from("profiles")
      .update({ status: "rejected", role: "member" })
      .eq("id", memberId);

    if (error) return writeFailure("rejectMember", error);

    const member = await readContact(serviceClient, memberId);
    if (member?.email) {
      sendRejectionEmail(member.email, member.full_name).catch((err) =>
        logEmailFailure("rejectMember", memberId, err)
      );
    }

    revalidatePath("/admin/members");
    revalidatePath("/organizer/members");
    return { ok: true, data: { memberId } };
  });
}

export async function bulkApproveMember(
  memberIds: string[]
): Promise<MemberActResult<{ count: number }>> {
  return guarded("bulkApproveMember", verifyAdminOrOrganizer, async () => {
    if (memberIds.length === 0) {
      return { ok: false, failure: "nothing_to_do", detail: "no_subjects_selected" };
    }

    const serviceClient = getServiceClient();

    const { data: members } = await serviceClient
      .from("profiles")
      .select("id, email, full_name")
      .in("id", memberIds);

    const { error } = await serviceClient
      .from("profiles")
      .update({ status: "approved" })
      .in("id", memberIds);

    if (error) return writeFailure("bulkApproveMember", error);

    // Send approval emails sequentially (fire-and-forget) to respect Resend rate limits
    if (members && members.length > 0) {
      (async () => {
        for (const m of members) {
          if (m.email) {
            try {
              await sendApprovalEmail(m.email, m.full_name);
            } catch (err) {
              logEmailFailure("bulkApproveMember", m.id, err);
            }
          }
        }
      })().catch((err) => logEmailFailure("bulkApproveMember", "batch", err));
    }

    revalidatePath("/admin/members");
    revalidatePath("/organizer/members");
    return { ok: true, data: { count: memberIds.length } };
  });
}

export async function bulkRejectMember(
  memberIds: string[]
): Promise<MemberActResult<{ count: number }>> {
  return guarded("bulkRejectMember", verifyAdminOrOrganizer, async () => {
    if (memberIds.length === 0) {
      return { ok: false, failure: "nothing_to_do", detail: "no_subjects_selected" };
    }

    const serviceClient = getServiceClient();

    const { data: members } = await serviceClient
      .from("profiles")
      .select("id, email, full_name")
      .in("id", memberIds);

    const { error } = await serviceClient
      .from("profiles")
      .update({ status: "rejected", role: "member" })
      .in("id", memberIds);

    if (error) return writeFailure("bulkRejectMember", error);

    // Send rejection emails sequentially (fire-and-forget) to respect Resend rate limits
    if (members && members.length > 0) {
      (async () => {
        for (const m of members) {
          if (m.email) {
            try {
              await sendRejectionEmail(m.email, m.full_name);
            } catch (err) {
              logEmailFailure("bulkRejectMember", m.id, err);
            }
          }
        }
      })().catch((err) => logEmailFailure("bulkRejectMember", "batch", err));
    }

    revalidatePath("/admin/members");
    revalidatePath("/organizer/members");
    return { ok: true, data: { count: memberIds.length } };
  });
}
