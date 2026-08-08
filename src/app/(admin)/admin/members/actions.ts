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
import { AccountInvitationEmail } from "@/emails/account-invitation";

// Service-role client for operations that need to bypass RLS
// (organizers don't have RLS write permission on profiles)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * The app URL, read WITHOUT a `||` fallback.
 *
 * This line used to be `process.env.NEXT_PUBLIC_APP_URL || "https://resonate.app"`,
 * and both halves of that were wrong in a way this project has already paid for:
 *
 *   * the fallback host is not the deployed host, so a missing variable did not
 *     fail — it silently produced links to somewhere else, which is the shape of
 *     failure `comms-analytics.md` (gate *variabili d'ambiente verificate*)
 *     forbids;
 *   * `NEXT_PUBLIC_APP_URL` is the exact variable a trailing newline once broke
 *     on this project (recorded: it broke the SumUp webhook URL). `.trim()` is
 *     therefore not defensive tidying, it is the recorded incident.
 *
 * Returns `null` rather than throwing, so each caller decides what a missing
 * value means: a link that cannot be built is a NAMED failure in
 * `createAccount`, and a thrown-and-logged email failure in the two paths that
 * merely decorate a message with a link.
 */
function readAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  // Trailing slashes stripped so `${appUrl}/api/...` cannot produce `//api/...`,
  // which is a different path to Supabase's redirect allow-list matcher.
  return raw.replace(/\/+$/, "");
}

async function sendApprovalEmail(email: string, fullName: string) {
  const appUrl = readAppUrl();
  // Throwing here is deliberate. Both callers of this function invoke it
  // fire-and-forget with `.catch(logEmailFailure)`, so a missing variable now
  // produces one distinguishable log line — `[members.email_failed] … app_url`
  // — instead of an approval message pointing at a host this project does not
  // own.
  if (!appUrl) throw new Error("app_url_missing");
  const html = await render(
    MemberApprovedEmail({ memberName: fullName || "Member", loginUrl: appUrl })
  );
  await sendEmail({
    to: email,
    subject: "Welcome to Resonate - You're Approved!",
    html,
  });
}

/**
 * The invitation for a hand-created account — beside its two siblings, and
 * different from both in one way that matters.
 *
 * `sendApprovalEmail` and `sendRejectionEmail` are called fire-and-forget: a
 * failed approval mail is regrettable, and the approval itself still happened.
 * This one is **awaited** by its caller, because for ACCT-03 the invitation *is*
 * the requirement — a swallowed send here is the requirement failing quietly,
 * and the person is left with an account they cannot sign into and no idea it
 * exists.
 *
 * The link comes from the caller. Building it here would put a second reading
 * of `NEXT_PUBLIC_APP_URL` in the file, and the two could disagree.
 */
async function sendAccountInvitation(
  email: string,
  fullName: string,
  setPasswordUrl: string
) {
  const html = await render(
    AccountInvitationEmail({
      memberName: fullName || "ciao",
      setPasswordUrl,
    })
  );
  await sendEmail({
    to: email,
    // Italian, like the body: `comms-analytics.md`, gate *template in italiano*.
    // The sender is `RESEND_FROM_EMAIL`, resolved inside `sendEmail`, so this
    // goes out from `noreply@` like every other transactional message.
    subject: "Il tuo account re:sonate è pronto",
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

/**
 * The failure branch, shared by every action in this file.
 *
 * `membershipCode` is optional and only ONE path sets it: `createAccount`'s
 * two invitation failures, where the account exists and already works at the
 * door while the message does not exist. It rides on the failure rather than on
 * a success because it is not a success — and an operator told "the invitation
 * failed" without the code has been told half of what happened.
 */
type FailureBranch<F extends string> = {
  ok: false;
  failure: F;
  detail: string;
  membershipCode?: string | null;
};

/** A tagged outcome, parameterised by the vocabulary of failures it can carry. */
export type ActResult<T, F extends string> =
  | { ok: true; data: T }
  | FailureBranch<F>;

export type MemberActResult<T> = ActResult<T, MemberActFailure>;

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
/**
 * The three tags `guarded` itself produces, from POSITION alone.
 *
 * Named because the generic below has to promise they are in the caller's
 * vocabulary: an action that declares its own failure union must still be able
 * to receive these three, or a refusal would arrive as a tag nothing on the
 * surface knows how to draw.
 */
type GuardTag = "capabilities_unavailable" | "forbidden" | "write_failed";

async function guarded<T, F extends string = MemberActFailure>(
  action: string,
  verify: () => Promise<GuardOutcome>,
  run: (ctx: ActorContext) => Promise<ActResult<T, F>>
): Promise<ActResult<T, F | GuardTag>> {
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

// =============================================================================
// THE ACT GROUP — the rule every act below holds, and the next one inherits
// =============================================================================
//
// Six acts write `public.profiles.role` and `.status` through
// `record_membership_act`, behind TWO gates:
//
//   verifyMaster            -> master.manage -> deactivateMember, reactivateMember
//   verifyAdminOrOrganizer  -> staff.manage  -> approveMember, rejectMember,
//                                               updateMemberRole, the two bulks,
//                                               createAccount
//
// CR-01 of `43-REVIEW.md` found the two gates reaching the SAME WRITES.
// `rejectMember` performs, byte for byte, the `UPDATE` of the master-only
// `deactivateMember`; `approveMember` performs the `UPDATE` of the master-only
// `reactivateMember`. **A master-only restriction that is reachable through a
// sibling with a wider gate is not a restriction.** The reachable outcome was
// concrete: an organizer calling `rejectMember(<the master>)` — a Server Action
// is a public endpoint, and the table merely HIDING the control on a master's
// row is an affordance and not a boundary — left the product with **no master at
// all**, and with no way back inside the product, because `WritableRole` has no
// `'master'` and no branch writes one.
//
// THE RULE CHOSEN HERE. Three parts, and a seventh act inherits all three.
//
//   1. NO ACT IN THIS GROUP REACHES A SUBJECT WHO HOLDS `master`.
//      Uniform, under BOTH gates, independent of who is calling. `WritableRole`
//      is deliberately NOT widened and the recovery path does not come back into
//      this file: restoring the top role stays where D-12 put it —
//      `public.reconcile_master`, driven by the deployment environment, whose own
//      zero-master guard refuses a configuration that would leave nobody. This
//      rule is that guard's counterpart one layer up: the database refuses to
//      REACH zero masters, and this file refuses to AIM at the one there is.
//
//   2. NO ACT IN THIS GROUP REACHES ITS OWN AUTHOR.
//      Every act is recorded with its author; an act whose author and subject
//      are the same person is the one shape attribution cannot make safe. 43-09
//      added this to `reactivateMember` calling its absence *«un'incoerenza che
//      il prossimo avrebbe copiato invece di notare»* — and stopped one function
//      short of `approveMember` and `rejectMember`, which is the copy it feared.
//
//   3. THE ACT NAMES THE TRANSITION IT PERFORMS. Two status transitions are
//      RESERVED to the `master.manage` pair, and are refused to every act under
//      the wide gate — whoever is calling, master included:
//
//          approved -> rejected   IS `deactivateMember`  — withdrawing an access
//                                                          that had been granted
//          rejected -> approved   IS `reactivateMember`  — restoring one
//
//      Under the wide gate an act may DECIDE AN OPEN APPLICATION (`pending` ->
//      `approved` or `rejected`) and may re-assert a status the account already
//      holds. It may not overturn a decision the narrow gate made. That is what
//      makes the master-only pair a restriction rather than a longer route to
//      the same write.
//
//      Rule 3 is not only the permission repair — it is what keeps the REGISTER
//      truthful. `acts.ts:41-45` says `rejected` and `deactivated` are two acts
//      for one write BECAUSE they are performed for two different reasons, and
//      the register is the only place that difference survives. Letting
//      `approveMember` revive a rejected account would write `approved` where
//      `reactivated` is what happened: a history that misnames itself is worse
//      than a history that is missing, because it is read as true.
//
//      It binds `updateMemberRole` too, and that is deliberate rather than
//      incidental: a promotion to `organizer` or `staff` writes
//      `status = 'approved'` in the SAME statement (43-06), so a promotion aimed
//      at a rejected account is a reactivation reached through a third door.
//      A demotion passes the role alone and leaves the status axis where it was,
//      so it is unconstrained by rule 3 — `member` and `approved` are two axes
//      (`access-gating.md`, gate *due assi*).
//
//   The surface already agrees with rule 3 and does not have to change:
//   `MemberTable.tsx` offers Approve and Reject only on a `pending` row (:406),
//   the bulk pair only on the pending tab (:781), and a role change only on an
//   `approved` one (:318). Rule 3 makes the server REFUSE what the surface
//   already declines to offer — which is the whole distinction between hiding a
//   control and refusing a request.
//
//   FOR A BULK ACT, a refused subject becomes an OUTCOME and is never dropped.
//   43-14's contract is one distinguishable sentence per cause, and
//   *"5 selected, 4 rejected, 1 refused because it is the master"* is not the
//   same report as *"5 rejected"* — a count that quietly shrinks is the asserted
//   count of 43-09 wearing the opposite sign.

/** The status axis, as every act in this group writes it. */
const STATUS_APPROVED = "approved";
const STATUS_REJECTED = "rejected";

/**
 * Is this status write one of the two transitions reserved to `master.manage`?
 *
 * `to === null` means the act does not move the status axis at all (a demotion),
 * and nothing is reserved about leaving a value alone.
 */
function isReservedTransition(from: string, to: string | null): boolean {
  if (to === null) return false;
  if (from === STATUS_APPROVED && to === STATUS_REJECTED) return true;
  if (from === STATUS_REJECTED && to === STATUS_APPROVED) return true;
  return false;
}

/** A refusal, in the shape every act in this group returns it. */
type SubjectRefusal = { ok: false; failure: MemberActFailure; detail: string };

/**
 * The three rules above, in one read, before any act in this group writes.
 *
 * Returns the subject's CURRENT role and status on success, because two callers
 * need them anyway — `updateMemberRole` names the act from the role it is
 * replacing — and a second read would be a second truth.
 *
 * `maybeSingle()` and not `single()`: a missing row is `subject_not_found`, and
 * `single()` would report it as a PostgREST code that classifies as a generic
 * write failure. The distinction is the difference between *"reload the list"*
 * and *"the write was refused"*.
 *
 * ── `ownsReservedTransitions`, and why its default is the safe one ───────────
 *
 * `false` unless stated. Only `deactivateMember` and `reactivateMember` pass
 * `true`, because they ARE the two reserved transitions — refusing them their
 * own operation would be rule 3 eating the pair it exists to protect. A seventh
 * act that forgets the flag therefore gets the RESTRICTIVE answer, which is the
 * direction a forgotten flag has to fail in.
 */
async function assertSubjectActionable(
  serviceClient: ServiceClient,
  ctx: ActorContext,
  memberId: string,
  opts: {
    /** The action name, for the log line of a failed read. */
    action: string;
    /** The `detail` a self-aimed act carries — one value per act, never shared. */
    selfDetail: string;
    /** The status this act writes, or `null` when it leaves the axis alone. */
    statusWrite: string | null;
    ownsReservedTransitions?: boolean;
  }
): Promise<{ ok: true; role: string; status: string } | SubjectRefusal> {
  // Rule 2, first and without a round trip: an act aimed at its own author is
  // refused before the database is asked anything about anybody.
  if (memberId === ctx.userId) {
    return { ok: false, failure: "forbidden", detail: opts.selfDetail };
  }

  const { data: subject, error } = await serviceClient
    .from("profiles")
    .select("role, status")
    .eq("id", memberId)
    .maybeSingle();

  if (error) return writeFailure(opts.action, error);
  if (!subject) {
    return { ok: false, failure: "subject_not_found", detail: "no_profile" };
  }

  const role = String(subject.role);
  const status = String(subject.status);

  // Rule 1.
  if (role === "master") {
    return { ok: false, failure: "forbidden", detail: "subject_is_master" };
  }

  // Rule 3.
  if (
    !opts.ownsReservedTransitions &&
    isReservedTransition(status, opts.statusWrite)
  ) {
    return {
      ok: false,
      failure: "forbidden",
      // Two details rather than one, because the two want two different next
      // steps: one says *use Deactivate*, the other says *use Reactivate*.
      detail:
        status === STATUS_APPROVED
          ? "withdrawal_is_master_only"
          : "restoration_is_master_only",
    };
  }

  return { ok: true, role, status };
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
 * ── The union is the ceiling in the SOURCE. This is the ceiling at RUNTIME ────
 *
 * The comment above says an absent union member is "a path that is not there to
 * be reached". That is true of every caller written in this repository, and it
 * is **not** true of the wire.
 *
 * A Server Action is a public endpoint with a convenient signature
 * (`nextjs-architecture.md`, gate *server action autorizzata*). Its arguments
 * are deserialised from a POST body; TypeScript is erased before any of that
 * runs, so `newRole: WritableRole` constrains what this repository can WRITE and
 * constrains nothing about what an authenticated organizer can SEND. A crafted
 * request carrying `"master"` would reach `record_membership_act` unopposed —
 * `profiles_role_check` admits `master`, because master is a real role — and the
 * self-replicating power D-07 forbids would have been granted by a value that
 * never appears in the source.
 *
 * So the ceiling is held twice, and neither is redundant:
 *
 *   1. **unrepresentable in the source** — `WritableRole` has no `'master'`, so
 *      nobody writing code here can produce one by accident;
 *   2. **unreachable from the wire** — this predicate, tested against the SAME
 *      closed set, so nobody sending bytes here can produce one on purpose.
 *
 * `ROLE_RANK` is the set: one literal, three keys, and adding a fourth role
 * means editing the place that already decides promotion from demotion.
 */
function isWritableRole(value: unknown): value is WritableRole {
  return typeof value === "string" && Object.hasOwn(ROLE_RANK, value);
}

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
    // Ceiling, part 1, AT RUNTIME — see `isWritableRole`. The union above is a
    // source-level guarantee and this is the wire-level one; a crafted
    // `newRole: "master"` is refused here rather than written.
    if (!isWritableRole(newRole)) {
      return { ok: false, failure: "forbidden", detail: "role_not_writable" };
    }

    const serviceClient = getServiceClient();

    // Granting a staff role approves the account in the same statement; a
    // demotion leaves the status axis alone. Computed BEFORE the guard, because
    // rule 3 judges the transition this act is about to perform.
    const statusWrite = newRole === "member" ? null : STATUS_APPROVED;

    // Rules 1, 2 and 3 in one read — see THE ACT GROUP above. This replaces the
    // self-check and the `subject_is_master` refusal that used to live here
    // inline, and the read it used to do to name the act: `subject.role` comes
    // back from the same statement.
    const subject = await assertSubjectActionable(serviceClient, ctx, memberId, {
      action: "updateMemberRole",
      selfDetail: "self_role_change",
      statusWrite,
    });
    if (!subject.ok) return subject;

    const currentRole = subject.role;

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
      status: statusWrite,
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
    const serviceClient = getServiceClient();

    // Rules 1 and 2. NOT rule 3: this act IS `approved -> rejected`, so it
    // passes `ownsReservedTransitions` — see THE ACT GROUP above.
    const subject = await assertSubjectActionable(serviceClient, ctx, memberId, {
      action: "deactivateMember",
      selfDetail: "self_deactivate",
      statusWrite: STATUS_REJECTED,
      ownsReservedTransitions: true,
    });
    if (!subject.ok) return subject;

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
    const serviceClient = getServiceClient();

    // Rules 1 and 2 — the self-check 43-09 added here is now the group's, held
    // for all six acts instead of for three. NOT rule 3: this act IS
    // `rejected -> approved`.
    const subject = await assertSubjectActionable(serviceClient, ctx, memberId, {
      action: "reactivateMember",
      selfDetail: "self_reactivate",
      statusWrite: STATUS_APPROVED,
      ownsReservedTransitions: true,
    });
    if (!subject.ok) return subject;

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

    // Rules 1, 2 and 3 — see THE ACT GROUP above. Rule 3 is what stops this
    // being `reactivateMember` under a wider gate and a wrong name: a `rejected`
    // subject is refused with `restoration_is_master_only`.
    const subject = await assertSubjectActionable(serviceClient, ctx, memberId, {
      action: "approveMember",
      selfDetail: "self_approve",
      statusWrite: STATUS_APPROVED,
    });
    if (!subject.ok) return subject;

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

    // Rules 1, 2 and 3 — see THE ACT GROUP above. This is the function CR-01
    // was found on: gated on `staff.manage`, writing `role: 'member',
    // status: 'rejected'`, and carrying neither guard, so an organizer could aim
    // it at the master and leave the product with none. Rule 3 additionally
    // stops it being `deactivateMember` under a wider gate: an `approved`
    // subject is refused with `withdrawal_is_master_only`.
    const subject = await assertSubjectActionable(serviceClient, ctx, memberId, {
      action: "rejectMember",
      selfDetail: "self_reject",
      statusWrite: STATUS_REJECTED,
    });
    if (!subject.ok) return subject;

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
  /**
   * The refusal's `detail` — a value from a closed set, never a message.
   *
   * Added for CR-01. Six of the seven `forbidden` details this file produces are
   * now reachable per subject inside a batch, and `forbidden` alone would tell
   * an operator only *"one of them was refused"*. That is the collapse
   * `meta-gates.md` forbids by name and 43-14 spent a component avoiding: the
   * report has to be able to say **"5 selected, 4 rejected, 1 refused because it
   * is the master"**, and a subject that quietly vanished from the count would
   * be the asserted count of 43-09 wearing the opposite sign.
   */
  detail?: string;
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
  /** The `detail` a self-aimed subject carries in THIS batch. One per act. */
  selfDetail: string,
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
    // THE ACT GROUP, per subject. Both bulks are gated on `staff.manage`, so
    // rules 1, 2 and 3 all apply — `bulkRejectMember([<the master>])` was the
    // second half of CR-01, and it reached the same write as the single act
    // without even the self-check.
    //
    // The refusal becomes an OUTCOME and the loop continues. A refused subject
    // never disappears from the report: it is counted in `failed` and carries
    // its own cause AND detail, so the notice says which subject and why. The
    // batch is not aborted, for the same reason 43-09 gave — a caller told WHICH
    // one was refused can act on it; a caller told "the batch failed" can only
    // start again and hope.
    const subject = await assertSubjectActionable(serviceClient, ctx, subjectId, {
      action,
      selfDetail,
      statusWrite: write.status ?? null,
    });

    if (!subject.ok) {
      outcomes.push({
        subjectId,
        ok: false,
        failure: subject.failure,
        detail: subject.detail,
      });
      continue;
    }

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
        : { subjectId, ok: false, failure: result.failure, detail: result.detail }
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
      { status: STATUS_APPROVED },
      "self_approve",
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
      { role: "member", status: STATUS_REJECTED },
      "self_reject",
      sendRejectionEmail
    )
  );
}

// =============================================================================
// createAccount — an approval performed by someone entitled to approve
// =============================================================================
//
// ACCT-01 through ACCT-04 in one action, and the first thing to say about it is
// what it IS: `community-membership.md` calls every way into this community
// outside the ordinary approval flow an **exception to the gating**, to be
// counted and attributed rather than treated as a convenience. D-08 says the
// same from the other side — creating an account *is* the act of approval. That
// is why the gate is `STAFF_MANAGE` (approval's own gate) and not something
// looser, why the act lands in the register with its author, and why
// `approved_via` is written rather than left null.
//
// ── Three defects in the existing analog are NOT copied ─────────────────────
//
// `src/lib/guest-list/process-entry.ts:218-251` already creates an auth user
// and generates a recovery link. Three of its lines are defects rather than
// patterns, and each is replaced here rather than inherited:
//
//   :249-251  a 500 ms sleep on a timer, standing in for a read-back. The call
//             is not repeated here even as a quotation, so the plan's grep for
//             it can assert zero rather than "zero outside the comments".
//             If the `handle_new_user` trigger has not written
//             the profile by then, the following statement matches zero rows,
//             changes nothing and returns `error: null`: an account with no
//             profile, no membership code and no entry, failing invisibly.
//             Replaced by an update that RETURNS its rows, so zero rows is a
//             named failure instead of a silence.
//   :240-243  a failed `generateLink` logged and then swallowed into a `/login`
//             fallback. The person receives a message that cannot do what it
//             says. Replaced by a distinct returned cause.
//   :245-247  the app URL read with an or-default to a hard-coded host — again
//             not quoted literally, so the grep can assert zero. A missing
//             variable there produces links to a host this project does not
//             own, instead of failing. See `readAppUrl` at the top of this file.
//
// ── Why an ORDER, and why THIS order ────────────────────────────────────────
//
// Everything that can be checked without side effects is checked FIRST — the
// capability gate, the input, the app URL — because every failure after
// `createUser` leaves an auth user behind, and a retry then collides with
// `already_exists`. Refusing early costs nothing; refusing late costs an
// orphaned account and a confusing second attempt.
//
// After that the sequence is: create the auth user, write the approval channel
// (which doubles as the trigger read-back), record the act, then read the code,
// then the link, then the send. The register write is deliberately LAST among
// the writes to `profiles`, so the register never records an approval whose
// preconditions failed.

/**
 * What can go wrong, one word each. There is no shared "action failed".
 *
 * Eleven causes rather than a tidy three, because a person reading a notice has
 * to know **what state the world is in**, and these differ:
 *
 *   * `already_exists` — nothing was created. Also the idempotency key
 *     (`comms-analytics.md`, *una mail non si richiama*): a second attempt on
 *     the same address must not send a second invitation, and it does not,
 *     because this returns before the link is generated.
 *   * `profile_missing` — the auth user exists, the profile does not. The
 *     trigger did not run. Nobody was approved and nothing was sent.
 *   * `constraint_refused` — the database refused the approval write, `23514`.
 *   * `invitation_link_failed` / `invitation_link_misaimed` — **the account
 *     exists and already works at the door**; only the message does not. Both
 *     carry the membership code for exactly that reason.
 *   * `invitation_send_failed` — the link existed, the provider did not accept
 *     the message. Different from the two above: the link can be re-sent,
 *     whereas a link that was never generated has to be generated.
 *
 * `nothing_to_do` and `subject_not_found` are absent on purpose: creation always
 * changes something, and a subject that does not exist is `profile_missing`
 * here, which says *the trigger did not run* rather than *reload the list*.
 */
export type CreateAccountFailure =
  | "capabilities_unavailable"
  | "forbidden"
  | "invalid_input"
  | "app_url_missing"
  | "already_exists"
  | "profile_missing"
  | "constraint_refused"
  | "write_failed"
  | "invitation_link_failed"
  | "invitation_link_misaimed"
  | "invitation_send_failed";

export type CreateAccountData = {
  memberId: string;
  actId: string | null;
  /**
   * The door's credential, minted by the trigger.
   *
   * `null` only if it could not be read back — which does not undo the
   * creation, so it is reported as a success carrying an absence rather than as
   * a failure. The surface says so; the table below it holds the code anyway.
   */
  membershipCode: string | null;
  role: WritableRole;
};

export type CreateAccountResult = ActResult<
  CreateAccountData,
  CreateAccountFailure
>;

/** The register's own failure vocabulary, translated into this path's. */
function asCreateFailure(
  failure: MemberActFailure
): CreateAccountFailure {
  // A subject the register cannot find means the trigger did not write the
  // profile — the only way to reach it here, since the id came from an auth
  // user created moments earlier by this same call.
  if (failure === "subject_not_found") return "profile_missing";
  if (failure === "constraint_refused") return "constraint_refused";
  return "write_failed";
}

/**
 * Do the two URLs name the same target?
 *
 * ── Why this comparison exists at all ───────────────────────────────────────
 *
 * `generateLink` merges `options` into the request BODY and returns
 * `properties.redirect_to` (measured in plan 43-01 from the installed 2.97.0
 * package, finding 4). If the requested target is not on the project's Auth
 * redirect allow-list, Auth does not refuse — it falls back to the site URL and
 * returns a link that works, lands somewhere else, and says nothing about it.
 *
 * Plan 43-04 read the allow-list read-only and found every deployed origin
 * carries a `/**` entry, so the production answer is already yes. This is not
 * therefore redundant: it is the ASSERTION that keeps that answer true. A
 * dashboard edit a year from now would otherwise be discovered by a person who
 * followed an invitation and arrived at a dashboard with no password field.
 *
 * The comparison is structural, not textual — origin, path and the `next`
 * parameter — because a returned value that differs only in a trailing slash or
 * in case of scheme is the same target, and failing on that would be a false
 * alarm on a path where a false alarm blocks an invitation.
 */
function sameRedirectTarget(returned: string, requested: string): boolean {
  try {
    const a = new URL(returned);
    const b = new URL(requested);
    const path = (u: URL) => u.pathname.replace(/\/+$/, "") || "/";
    return (
      a.protocol === b.protocol &&
      a.host.toLowerCase() === b.host.toLowerCase() &&
      path(a) === path(b) &&
      a.searchParams.get("next") === b.searchParams.get("next")
    );
  } catch {
    // An unparseable value is not the requested target. Treated as a mismatch
    // rather than as a crash: this runs on the invitation path and a throw here
    // would be reported as a generic write failure.
    return false;
  }
}

/**
 * Create an account, approved, with its role, its register row and its
 * invitation.
 *
 * ── The role is a closed union, and the ceiling is held TWICE ───────────────
 *
 * `"master"` is not in `WritableRole`, is not an argument here, and no branch
 * below produces it — that is the ceiling in the source. `isWritableRole` holds
 * it at runtime, because a Server Action is a public endpoint and TypeScript is
 * erased before the POST body is deserialised. See `isWritableRole` for why
 * neither half is redundant.
 *
 * `"organizer"` IS in the union, and that is D-20 rather than an oversight:
 * whoever may promote reaches the same end state, and forcing create-then-
 * promote would write two register rows for one act — a history that says
 * something happened twice when it happened once.
 *
 * ── What the widest caller can reach ───────────────────────────────────────
 *
 * The widest caller is an **organizer** (`STAFF_MANAGE` resolves to master and
 * organizer). Stated explicitly, as plan 43-09 did for `updateMemberRole`:
 *
 *   * **role** — `member`, `staff` or `organizer`, and nothing else, on both
 *     the source and the wire;
 *   * **subject** — a NEW account only. This action has no subject id
 *     parameter, so unlike `updateMemberRole` there is no existing account it
 *     can be aimed at: a duplicate address is refused before anything is
 *     written, so it cannot be used to touch, re-approve or re-role somebody
 *     who already exists — including a master;
 *   * **status** — `approved`, always. There is no argument for it.
 *
 * That is also why this is the one act in the group that does NOT call
 * `assertSubjectActionable`: the three rules are about a subject the caller
 * NAMED, and here there is none to name. The subject is minted a few lines below
 * by `createUser`, so it cannot be a master (rule 1), cannot be the author
 * (rule 2), and its status transition is `pending -> approved` — an open
 * application being decided, which rule 3 permits under this gate. Stated rather
 * than left as an absence, so the next reader does not read the missing call as
 * the omission CR-01 was.
 *
 * ── The service-role client, justified as `access-gating.md` requires ───────
 *
 * `auth.admin.createUser` and `auth.admin.generateLink` exist only on a
 * service-role client; no RLS policy can grant them. The rule's other half is
 * *never reachable from untrusted input*: the capability gate runs before the
 * client is constructed, the address is trimmed and lower-cased, the role is
 * tested against a closed set, and no caller-supplied value reaches a query
 * that names a row other than the one this call just created.
 *
 * The residual, named rather than implied: `already_exists` is an
 * account-existence oracle, and this repository has **no rate limiting
 * anywhere** (`access-gating.md`, verified 2026-08-05). The gate is the
 * mitigation — master and organizer are entitled to know who is in the
 * community — and nothing unauthenticated reaches this action.
 */
export async function createAccount(input: {
  email: string;
  fullName: string;
  role: WritableRole;
}): Promise<CreateAccountResult> {
  return guarded<CreateAccountData, CreateAccountFailure>(
    "createAccount",
    verifyAdminOrOrganizer,
    async (ctx) => {
      // ── Everything checkable without a side effect, before the first one ──
      //
      // Hand-written, and that is a REVIEW ITEM rather than a preference:
      // `package.json` has no validation library and this plan adds none, so
      // these three tests are the whole contract. A real address is not
      // verifiable by any string test — Auth is the authority and it refuses
      // what it refuses — so the aim here is only to stop the obviously empty
      // and the obviously malformed before an auth user exists.
      const email = input.email.trim().toLowerCase();
      if (!email || !email.includes("@") || email.includes(" ")) {
        return { ok: false, failure: "invalid_input", detail: "email" };
      }

      const fullName = input.fullName.trim();
      if (!fullName) {
        return { ok: false, failure: "invalid_input", detail: "full_name" };
      }

      if (!isWritableRole(input.role)) {
        return { ok: false, failure: "invalid_input", detail: "role" };
      }
      const role = input.role;

      const appUrl = readAppUrl();
      if (!appUrl) {
        console.error(
          "[members.app_url_missing] createAccount: NEXT_PUBLIC_APP_URL is unset or blank"
        );
        return {
          ok: false,
          failure: "app_url_missing",
          detail: "NEXT_PUBLIC_APP_URL",
        };
      }

      // The callback, not `/set-password` directly. Plan 43-04: the callback is
      // what exchanges the recovery code for a session, and a link aimed
      // straight at the surface would land there with no session and draw the
      // expired-link notice on a link that was fine. `next` is resolved by that
      // route against its own enumerated allow-list, on which `/set-password`
      // is a listed entry.
      const redirectTo = `${appUrl}/api/auth/callback?next=/set-password`;

      const serviceClient = getServiceClient();

      // ── 1. The auth user ────────────────────────────────────────────────
      //
      // `email_confirm: true` is deliberate and is the whole of D-09 in one
      // flag: the creator vouched for this person, so there is nobody to
      // confirm anything to, and the account has to be usable at the door on
      // the night it was created for — which cannot wait for a confirmation
      // click that may never come.
      //
      // `full_name` in `user_metadata` because that is the only field the
      // `handle_new_user` trigger reads from it
      // (`20260310000000_guest_list.sql:145-155`). The membership code is minted
      // by that trigger and NOT by `src/utils/qr.ts`'s generator: two
      // generators for one identifier drift, and the trigger's is the one the
      // door already trusts.
      const { data: created, error: authError } =
        await serviceClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (authError || !created?.user) {
        // Both labels are recognised because GoTrue has used both for a
        // duplicate address, and which one this project's instance emits is
        // not knowable from this repository without creating a duplicate
        // account against production. Recognising both costs nothing;
        // recognising neither would report the one refusal an operator meets
        // routinely as a generic fault.
        const code = authError?.code;
        if (code === "email_exists" || code === "user_already_exists") {
          console.error("[members.already_exists] createAccount: email_exists");
          return {
            ok: false,
            failure: "already_exists",
            detail: "email_exists",
          };
        }
        // Never the error object and never its body: an auth error on this path
        // carries the address that was submitted.
        console.error(
          `[members.write_failed] createAccount: auth code=${code ?? "unknown"} ` +
            `status=${authError?.status ?? "unknown"}`
        );
        return { ok: false, failure: "write_failed", detail: code ?? "auth" };
      }

      const memberId = created.user.id;

      // ── 2. The approval channel, which is ALSO the read-back ─────────────
      //
      // `approved_via = 'admin_manual'` is D-08 made legible in the data as
      // well as in the register: an allowed value of
      // `profiles_approved_via_check` (`referral | guest_list | admin_manual`)
      // that no code path writes today. There is no fourth label and this plan
      // does not widen that constraint.
      //
      // It is written BEFORE the register act, on purpose. Any failure here
      // leaves the profile exactly as the trigger wrote it — `member`,
      // `pending`, unapproved — and nothing in the register claiming otherwise.
      // The other order would leave an approved account whose channel is
      // unrecorded, which is the state D-08 exists to prevent.
      //
      // And `.select("id")` is what replaces the analog's 500 ms sleep: an
      // update that matches no row returns an EMPTY array with `error: null`.
      // So "the trigger has not written the profile" stops being a silence and
      // becomes `profile_missing` — deterministically, without depending on the
      // `P0002 → error.code` mapping that plan 43-09 flagged as an assumption
      // rather than a measurement. That mapping is still honoured below, as a
      // second net.
      const { data: channelRows, error: channelError } = await serviceClient
        .from("profiles")
        .update({ approved_via: "admin_manual" })
        .eq("id", memberId)
        .select("id");

      if (channelError) {
        const failed = writeFailure("createAccount", channelError);
        return { ...failed, failure: asCreateFailure(failed.failure) };
      }

      if (!channelRows || channelRows.length === 0) {
        console.error(
          `[members.profile_missing] createAccount: subject=${memberId} ` +
            `no profile row after createUser — handle_new_user did not run`
        );
        return {
          ok: false,
          failure: "profile_missing",
          detail: "trigger_did_not_run",
        };
      }

      // ── 3. The act, and the approval, in ONE transaction ────────────────
      //
      // Role and status move together in a single statement, which is both
      // D-08 (the account lands approved, not back in the queue it was just
      // let out of) and the reason `profiles_role_implies_approved` cannot fire
      // on this path: the forbidden intermediate state — a staff role on a
      // `pending` account — never exists. A plain `createUser` leaves
      // `status = 'pending'`, so writing the role alone would be a hard `23514`
      // for `staff` and `organizer`, and a contradiction for `member`.
      //
      // `act: "created"` and the actor from the session: D-11, and
      // `community-membership.md`'s *chi decide è tracciato*. The profile write
      // and the register row are one transaction inside the function, so this
      // path cannot produce an approval nobody is named for.
      const recorded = await recordAct("createAccount", serviceClient, {
        subjectId: memberId,
        act: "created",
        actorId: ctx.userId,
        role,
        status: "approved",
      });

      if (!recorded.ok) {
        return { ...recorded, failure: asCreateFailure(recorded.failure) };
      }

      // ── 4. The credential, read back ────────────────────────────────────
      //
      // Needed by the surface: an operator whose invitation failed still has to
      // be able to admit this person. A failed read does not undo anything, so
      // it is logged with its own category and carried as an absence rather
      // than raised as a failure.
      let membershipCode: string | null = null;
      const { data: profile, error: codeError } = await serviceClient
        .from("profiles")
        .select("membership_code")
        .eq("id", memberId)
        .maybeSingle();

      if (codeError) {
        console.error(
          `[members.code_unreadable] createAccount: subject=${memberId} ` +
            `code=${codeError.code ?? "unknown"}`
        );
      } else {
        membershipCode = profile?.membership_code ?? null;
      }

      // The account exists and is admissible from here on. Every failure below
      // says so, and carries the code.
      const codeCarried = { membershipCode };

      // ── 5. The link ─────────────────────────────────────────────────────
      //
      // `recovery` and not `invite`: `invite` CREATES a user (the user already
      // exists by now) and does not permit setting a password; `recovery`
      // requires an existing user and does. A recovery link also cannot carry
      // metadata — `GenerateRecoveryLinkParams.options` is
      // `Pick<GenerateLinkOptions, 'redirectTo'>` in the installed 2.97.0
      // package — which is why the target rides in the URL.
      const { data: link, error: linkError } =
        await serviceClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo },
        });

      if (linkError || !link?.properties?.action_link) {
        console.error(
          `[members.invitation_link_failed] createAccount: subject=${memberId} ` +
            `code=${linkError?.code ?? "unknown"} status=${linkError?.status ?? "unknown"}`
        );
        revalidatePath("/admin/members");
        return {
          ok: false,
          failure: "invitation_link_failed",
          detail: linkError?.code ?? "no_action_link",
          ...codeCarried,
        };
      }

      if (!sameRedirectTarget(link.properties.redirect_to ?? "", redirectTo)) {
        // The requested target was not honoured — the signature of an allow-list
        // entry that is not there. The link WORKS; it just lands somewhere with
        // no password field. Sending it would be worse than not sending it,
        // because the failure would then be a person's confusion rather than an
        // operator's notice. The returned value is not logged: it is a URL Auth
        // chose, and the diagnosis is the mismatch, not its content.
        console.error(
          `[members.invitation_link_misaimed] createAccount: subject=${memberId} ` +
            `redirect_to did not match the requested target`
        );
        revalidatePath("/admin/members");
        return {
          ok: false,
          failure: "invitation_link_misaimed",
          detail: "redirect_to_mismatch",
          ...codeCarried,
        };
      }

      // ── 6. The send, AWAITED ────────────────────────────────────────────
      //
      // The one place `approveMember`'s fire-and-forget is deliberately not
      // copied. There the mail decorates an act that already happened; here the
      // invitation IS the requirement (ACCT-03), so a swallowed send is the
      // requirement failing quietly — and this project has no error tracking, so
      // quietly means nobody ever finds out.
      try {
        await sendAccountInvitation(email, fullName, link.properties.action_link);
      } catch (err) {
        logEmailFailure("createAccount", memberId, err);
        revalidatePath("/admin/members");
        return {
          ok: false,
          failure: "invitation_send_failed",
          detail: "send_failed",
          ...codeCarried,
        };
      }

      revalidatePath("/admin/members");
      revalidatePath("/organizer/members");

      return {
        ok: true,
        data: { memberId, actId: recorded.data.actId, membershipCode, role },
      };
    }
  );
}
