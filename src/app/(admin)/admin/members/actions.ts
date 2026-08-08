"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAccessContext } from "@/lib/capabilities/server";
import type { AccessContextResult } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import type { MembershipAct } from "@/lib/membership/acts";
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

/**
 * A resolved actor: the access context, with the subject NARROWED to non-null.
 *
 * The narrowing is the point. Every act below writes `p_actor_id` from
 * `ctx.userId`, and `record_membership_act`'s table CHECK makes a `'user'` act
 * with a null actor unrepresentable (`membership_acts_actor_attributed`,
 * proved by mutation in 43-07). Carrying the non-null through the type means
 * the compiler, and not a reviewer, is what stops an unattributed act being
 * written.
 */
type ActorContext = AccessContextResult & { userId: string };

/** A guard's answer: the actor, or the refusal. */
type GuardOutcome =
  | { ok: true; ctx: ActorContext }
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
  const { userId } = ctx;
  if (!userId) throw new Error("capabilities.resolve_failed: no_subject");
  return { ok: true, ctx: { ...ctx, userId } };
}

/** Master or organizer: approve / reject / role changes within the ceiling. */
async function verifyAdminOrOrganizer(): Promise<GuardOutcome> {
  const ctx = await getAccessContext();
  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    return { ok: false, failure: "forbidden", detail: "staff_manage_required" };
  }
  const { userId } = ctx;
  if (!userId) throw new Error("capabilities.resolve_failed: no_subject");
  return { ok: true, ctx: { ...ctx, userId } };
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
  run: (ctx: ActorContext) => Promise<MemberActResult<T>>
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

type ServiceClient = ReturnType<typeof getServiceClient>;

/** What every act returns on success: the subject, and the register row's id. */
type ActRecorded = { memberId: string; actId: string | null };

// =============================================================================
// The register write is NOT a second call
// =============================================================================
//
// Every act below is ONE `.rpc()` to `public.record_membership_act`
// (`supabase/migrations/20260808002000_membership_register.sql`), which performs
// the `public.profiles` write and inserts its register row **inside one
// transaction**.
//
// `.update()` followed by an insert cannot be atomic across two PostgREST
// requests, and a mutation that succeeded while its record failed is exactly the
// untraced act D-11 forbids — silently, because nothing would read the second
// call's error. 43-07 measured the other direction too: when the constraint of
// 43-06 refuses the profile write, the register row is not inserted either
// (`register rows before 2, after 2`). **The register never claims something the
// database refused.**
//
// ── Nothing here is typed by the compiler, and that is worth saying ──────────
//
// No Supabase client in this repository is parameterised with `Database`
// (`src/types/database.ts`, and `acts.ts:28-33` says the same). So the function
// name, the eight parameter names and every column name below are strings that
// `npm run build` cannot check. A green build proves this file COMPILES; it
// proves nothing about the RPC existing, its arguments being spelled right, or
// the SQLSTATE-to-`error.code` mapping this file branches on. That evidence is
// manual procedure M-43-08, written by plan 43-15 — stated here rather than
// implied.
//
// ── The actor comes from the session, and from nowhere else ──────────────────
//
// `p_actor_id` is `ctx.userId`, resolved once per action by `getAccessContext()`
// and narrowed to non-null by `ActorContext`. Never a form field, never a
// header: `npm run verify:no-header-identity` asserts the header-reader count
// stays at zero, and a form field would let the caller name somebody else as
// the author of an act.
//
// `p_actor_kind` is always `'user'` here. `'system'` exists for D-16's
// reconciliation-driven demotion, which has no human author; a surface where a
// person clicked a button is never a system act.

async function recordAct(
  action: string,
  serviceClient: ServiceClient,
  params: {
    subjectId: string;
    act: MembershipAct;
    actorId: string;
    /** `null` means *leave this axis alone* — the function coalesces. */
    role?: string | null;
    status?: string | null;
    note?: string | null;
  }
): Promise<MemberActResult<ActRecorded>> {
  const { data, error } = await serviceClient.rpc("record_membership_act", {
    p_subject_id: params.subjectId,
    p_act: params.act,
    p_actor_id: params.actorId,
    p_actor_kind: "user",
    p_role: params.role ?? null,
    p_status: params.status ?? null,
    p_note: params.note ?? null,
    // Phase 35's per-night assignment is what fills this. Passed explicitly
    // rather than omitted, so the day it stops being null is a one-line diff.
    p_party_id: null,
  });

  if (error) return writeFailure(action, error);

  return {
    ok: true,
    data: {
      memberId: params.subjectId,
      actId: typeof data === "string" ? data : null,
    },
  };
}

// --- Role changes: master OR organizer, within the ceiling ---

/**
 * The three roles this file may WRITE. There is no fourth.
 *
 * ── The ceiling is a branch that does not exist ──────────────────────────────
 *
 * `'master'` is not a member of this union, is not an argument anywhere below,
 * and no branch writes it. That is deliberately NOT the same thing as
 * validating it away at runtime: a runtime check is a permission that could be
 * misgranted — somebody removes the `if`, or reaches the write through a path
 * that skipped it — whereas an absent union member is a path that is not there
 * to be reached. D-07 puts the ceiling on a *self-replicating* power, so the
 * difference between "refused" and "unrepresentable" is the whole margin.
 */
type WritableRole = "organizer" | "staff" | "member";

/**
 * Ranked so that "promoted" and "demoted" are computed, not guessed.
 *
 * `staff` sits between the two (43-05, D-14): it grants nothing a member lacks
 * on its own, and everything an organizer has flows from `organizer`.
 */
const ROLE_RANK: Record<WritableRole, number> = {
  organizer: 3,
  staff: 2,
  member: 1,
};

/**
 * ── THIS GATE WIDENS. Read this before assuming it was always so ─────────────
 *
 * `updateMemberRole` called `verifyMaster()` until this plan. It now calls
 * `verifyAdminOrOrganizer()`, so **an organizer may change another account's
 * role** — which is D-21: ACCT-01's *"an organizer may promote a staff member
 * to organizer"* is a change this phase MAKES, not a behaviour it inherited.
 * D-07 says why the self-replicating power is granted on purpose: requiring the
 * master for every promotion makes one person the bottleneck of their own
 * community.
 *
 * **Nothing else that `verifyMaster` guards moves with it.**
 * `deactivateMember` and `reactivateMember` are still master-only, deliberately
 * — D-21 says the widening must not carry anything else, and the two functions
 * above exist unmerged for exactly this reason.
 *
 * D-07's ceiling holds in two places, and both are needed now that an organizer
 * can reach this:
 *
 *   1. the TARGET cannot be `master` — `WritableRole` has no such member;
 *   2. the SUBJECT cannot be a `master` — refused below. Without (2) the
 *      widening would let an organizer demote the master, which is not a
 *      promotion but is reached through the same door. The surface already
 *      hides the control (`MemberTable.tsx`, *"Don't show role actions for
 *      other masters"*), and a Server Action is a public endpoint with a
 *      convenient signature (`nextjs-architecture.md`), so the surface hiding
 *      it is not the same as it being refused.
 */
export async function updateMemberRole(
  memberId: string,
  newRole: WritableRole
): Promise<MemberActResult<ActRecorded>> {
  return guarded("updateMemberRole", verifyAdminOrOrganizer, async (ctx) => {
    if (memberId === ctx.userId) {
      return { ok: false, failure: "forbidden", detail: "self_role_change" };
    }

    const serviceClient = getServiceClient();

    // The current role, read for two reasons: to name the act (`promoted` or
    // `demoted` — the register has to say which), and to refuse a `master`
    // subject. `maybeSingle()` and not `single()`: a missing row is
    // `subject_not_found`, and `single()` would report it as a PostgREST error
    // code that classifies as a generic write failure.
    const { data: subject, error: readError } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", memberId)
      .maybeSingle();

    if (readError) return writeFailure("updateMemberRole", readError);
    if (!subject) {
      return { ok: false, failure: "subject_not_found", detail: "no_profile" };
    }

    const currentRole = String(subject.role);

    // Ceiling, part 2 — see the block comment above.
    if (currentRole === "master") {
      return { ok: false, failure: "forbidden", detail: "subject_is_master" };
    }

    if (currentRole === newRole) {
      // No act, and no register row. The register has seven values and none of
      // them means "nothing happened"; writing one anyway would put a
      // transition in the history that the database never performed.
      return { ok: false, failure: "nothing_to_do", detail: "role_unchanged" };
    }

    const act: MembershipAct =
      ROLE_RANK[newRole] > (ROLE_RANK[currentRole as WritableRole] ?? 0)
        ? "promoted"
        : "demoted";

    // Granting a staff role approves the account in the same statement.
    //
    // Owner decision, 2026-08-06: giving someone staff rights while leaving
    // them `pending` is a contradiction in this path, not a state to be
    // defended downstream. Before this, the two axes could drift — a `pending`
    // member promoted to organizer kept `status = 'pending'`, and every surface
    // that read both had to decide what that meant. The door chose to admit
    // them (`api/tickets/checkin/route.ts`); closing it here means the question
    // stops being asked at all.
    //
    // It is also the shape `profiles_role_implies_approved` (43-06) judges, and
    // the reason the constraint will never fire on THIS path: role and status
    // move in one statement, so the forbidden intermediate state never exists.
    //
    // Demotion does NOT revoke approval: `member` and `approved` are different
    // axes (`access-gating.md`, gate *due assi*), and someone who was approved
    // stays approved when they stop being staff. So demotion passes the role
    // alone, and the function leaves `status` where it was.
    const result = await recordAct("updateMemberRole", serviceClient, {
      subjectId: memberId,
      act,
      actorId: ctx.userId,
      role: newRole,
      status: newRole === "member" ? null : "approved",
    });

    if (result.ok) revalidatePath("/admin/members");
    return result;
  });
}

// --- Master-only actions: deactivate, reactivate (D-21: these do NOT widen) ---

export async function deactivateMember(
  memberId: string
): Promise<MemberActResult<ActRecorded>> {
  return guarded("deactivateMember", verifyMaster, async (ctx) => {
    if (memberId === ctx.userId) {
      return { ok: false, failure: "forbidden", detail: "self_deactivate" };
    }

    const serviceClient = getServiceClient();
    const result = await recordAct("deactivateMember", serviceClient, {
      subjectId: memberId,
      act: "deactivated",
      actorId: ctx.userId,
      // Both axes in one statement, as before. The demotion is what keeps this
      // path compatible with `profiles_role_implies_approved`: withdrawing the
      // approval of an organizer without also demoting them would be exactly
      // the state 43-06 makes unrepresentable.
      role: "member",
      status: "rejected",
    });

    if (result.ok) revalidatePath("/admin/members");
    return result;
  });
}

export async function reactivateMember(
  memberId: string
): Promise<MemberActResult<ActRecorded>> {
  return guarded("reactivateMember", verifyMaster, async (ctx) => {
    // The self-check its two siblings had and this one did not. One line, and
    // its absence was an inconsistency the next person would have copied rather
    // than noticed.
    if (memberId === ctx.userId) {
      return { ok: false, failure: "forbidden", detail: "self_reactivate" };
    }

    const serviceClient = getServiceClient();
    const result = await recordAct("reactivateMember", serviceClient, {
      subjectId: memberId,
      act: "reactivated",
      actorId: ctx.userId,
      status: "approved",
    });

    if (result.ok) revalidatePath("/admin/members");
    return result;
  });
}

// --- Approve/Reject actions (master + organizer) ---

export async function approveMember(
  memberId: string
): Promise<MemberActResult<ActRecorded>> {
  return guarded("approveMember", verifyAdminOrOrganizer, async (ctx) => {
    const serviceClient = getServiceClient();

    const result = await recordAct("approveMember", serviceClient, {
      subjectId: memberId,
      act: "approved",
      actorId: ctx.userId,
      status: "approved",
    });

    if (!result.ok) return result;

    const member = await readContact(serviceClient, memberId);
    if (member?.email) {
      sendApprovalEmail(member.email, member.full_name).catch((err) =>
        logEmailFailure("approveMember", memberId, err)
      );
    }

    revalidatePath("/admin/members");
    revalidatePath("/organizer/members");
    return result;
  });
}

export async function rejectMember(
  memberId: string
): Promise<MemberActResult<ActRecorded>> {
  return guarded("rejectMember", verifyAdminOrOrganizer, async (ctx) => {
    const serviceClient = getServiceClient();

    // `rejected` and `deactivated` are the same write and two acts, because
    // they are performed for two different reasons: this one refuses an
    // application, the other withdraws an access that had been granted
    // (`acts.ts:41-45`). The register is the only place that difference
    // survives, and it is the difference a season is read by.
    //
    // The demotion in the same statement is why rejecting an organizer does not
    // violate `profiles_role_implies_approved`.
    const result = await recordAct("rejectMember", serviceClient, {
      subjectId: memberId,
      act: "rejected",
      actorId: ctx.userId,
      role: "member",
      status: "rejected",
    });

    if (!result.ok) return result;

    const member = await readContact(serviceClient, memberId);
    if (member?.email) {
      sendRejectionEmail(member.email, member.full_name).catch((err) =>
        logEmailFailure("rejectMember", memberId, err)
      );
    }

    revalidatePath("/admin/members");
    revalidatePath("/organizer/members");
    return result;
  });
}

// =============================================================================
// The two bulk acts — a count that is MEASURED, not asserted
// =============================================================================
//
// Both used to be one statement over `.in()` returning
// `{ success: true, count: memberIds.length }`. That count was **asserted from
// the input**: it reported N successes because N ids were passed in, and it
// would have reported N whatever the database did with them. `meta-gates.md`
// calls that shape a silent failure, and it is the worst kind — it does not
// look like an error, it looks like a receipt.
//
// Two failure modes made it concrete (`43-RESEARCH.md` § Pitfall 8):
//
//   * under `profiles_role_implies_approved`, ONE bad row fails the whole
//     `.in()` statement, and the message names one id — so the operator is told
//     nothing about the other N−1;
//   * a future refactor that loops would keep the asserted count and report N
//     successes for fewer.
//
// The register settles the shape by itself: `record_membership_act` writes ONE
// row per subject, so a batch is a loop. `community-membership.md` (gate *chi
// decide è tracciato*) requires the same thing from the other side — one act on
// one member's status, recorded with who did it and when. A single register row
// covering many subjects would not satisfy it.
//
// **A failed subject does not abort the rest**, and that is a decision. A batch
// of approvals where one row is refused should approve the others: a caller
// told WHICH one failed can act on it, a caller told "the batch failed" can
// only start again and hope.

export type BulkSubjectOutcome = {
  subjectId: string;
  ok: boolean;
  failure?: MemberActFailure;
};

export type BulkActData = {
  /** Counted from the outcomes below. Never from the length of the input. */
  succeeded: number;
  failed: number;
  outcomes: BulkSubjectOutcome[];
};

async function runBulk(
  action: string,
  ctx: ActorContext,
  memberIds: string[],
  act: MembershipAct,
  write: { role?: string | null; status?: string | null },
  sendMail: (email: string, fullName: string) => Promise<void>
): Promise<MemberActResult<BulkActData>> {
  // Read once, named `requested`, and used ONLY as the denominator of a report.
  // The success count below never touches it — that is the whole difference
  // between this function and the one it replaces.
  const requested = memberIds.length;

  if (requested === 0) {
    return { ok: false, failure: "nothing_to_do", detail: "no_subjects_selected" };
  }

  const serviceClient = getServiceClient();
  const outcomes: BulkSubjectOutcome[] = [];

  for (const subjectId of memberIds) {
    const result = await recordAct(action, serviceClient, {
      subjectId,
      act,
      actorId: ctx.userId,
      role: write.role ?? null,
      status: write.status ?? null,
    });

    outcomes.push(
      result.ok
        ? { subjectId, ok: true }
        : { subjectId, ok: false, failure: result.failure }
    );
  }

  const succeededIds = outcomes.filter((o) => o.ok).map((o) => o.subjectId);
  const succeeded = succeededIds.length;
  const failed = outcomes.length - succeeded;

  if (failed > 0) {
    // Distinct from every single-act log line, and it carries the two numbers
    // rather than a verdict. The observable effect for the operator is the
    // notice `MemberTable.tsx` draws from the outcomes — this line is only the
    // diagnosis, and in a project with no error tracking a log line alone would
    // reach nobody.
    console.error(
      `[members.bulk_partial] ${action}: ${succeeded} recorded, ${failed} refused ` +
        `of ${requested} requested`
    );
  }

  // The mail goes only to the subjects whose act actually landed. Approving
  // nobody and mailing them anyway is the same lie as the asserted count, told
  // to the member instead of the operator.
  if (succeeded > 0) {
    const { data: members } = await serviceClient
      .from("profiles")
      .select("id, email, full_name")
      .in("id", succeededIds);

    if (members && members.length > 0) {
      // Sequential (fire-and-forget) to respect Resend rate limits.
      (async () => {
        for (const m of members) {
          if (m.email) {
            try {
              await sendMail(m.email, m.full_name);
            } catch (err) {
              logEmailFailure(action, m.id, err);
            }
          }
        }
      })().catch((err) => logEmailFailure(action, "batch", err));
    }
  }

  if (succeeded > 0) {
    revalidatePath("/admin/members");
    revalidatePath("/organizer/members");
  }

  return { ok: true, data: { succeeded, failed, outcomes } };
}

export async function bulkApproveMember(
  memberIds: string[]
): Promise<MemberActResult<BulkActData>> {
  return guarded("bulkApproveMember", verifyAdminOrOrganizer, (ctx) =>
    runBulk(
      "bulkApproveMember",
      ctx,
      memberIds,
      "approved",
      { status: "approved" },
      sendApprovalEmail
    )
  );
}

export async function bulkRejectMember(
  memberIds: string[]
): Promise<MemberActResult<BulkActData>> {
  return guarded("bulkRejectMember", verifyAdminOrOrganizer, (ctx) =>
    runBulk(
      "bulkRejectMember",
      ctx,
      memberIds,
      "rejected",
      // The demotion travels with the rejection, exactly as the single act does:
      // it is what keeps a rejected organizer compatible with
      // `profiles_role_implies_approved`.
      { role: "member", status: "rejected" },
      sendRejectionEmail
    )
  );
}
