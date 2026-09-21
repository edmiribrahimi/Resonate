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
// Tre import sono usciti da questa riga con la fase 50: `MemberApprovedEmail`,
// `MemberRejectedEmail` e `MemberReactivatedEmail`. Erano i messaggi dell'asse
// dello stato, che non esiste piu' (D-50-01), e i loro MITTENTI vivevano qui —
// i modelli li cancella il piano 50-08. Un import verso un file cancellato e'
// un build rosso nell'onda sbagliata, quindi il mittente esce per primo.
import { AccountInvitationEmail } from "@/emails/account-invitation";
import { buildPasswordSetLink } from "@/lib/auth/password-set-link";

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

/**
 * The invitation for a hand-created account — **l'unico messaggio rimasto in
 * questo file**, e il piu' esigente dei tre che c'erano.
 *
 * Aveva due fratelli, `sendApprovalEmail` e `sendRejectionEmail`, chiamati
 * fire-and-forget: una mail di approvazione mancata era un peccato, e
 * l'approvazione era comunque avvenuta. Sono usciti con l'asse dello stato
 * (D-50-01/D-50-14), e questo resta solo — **awaited** dal suo chiamante,
 * perche' per ACCT-03 l'invito *e'* il requisito: un invio ingoiato qui e' il
 * requisito che fallisce in silenzio, e la persona resta con un account in cui
 * non puo' entrare e di cui non sa nulla.
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
    category: "account_invitation",
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
   * The role write was refused because the subject holds a LIVE per-night
   * assignment.
   *
   * ── This is a RULE working, and it is a NEW way to refuse an operation ──────
   *
   * `party_assignments` carries a composite foreign key
   * `(user_id, assignee_role) → public.profiles (id, role)`
   * (`20260809000000_party_assignments.sql`, section 3). It has deliberately no
   * update-cascading action, so changing a role out from under a live
   * assignment is REFUSED with `23503` rather than silently propagated. A
   * `staff` account with a live door assignment cannot quietly become a
   * `member` while that assignment keeps resolving at the door.
   *
   * **It is not only a demotion.** Any role move breaks the pair: promoting a
   * `staff` holder to `organizer` fails the same key for the same reason. The
   * name of this cause says "demotion" because that is the urgent path, and the
   * sentence a person reads says the whole truth.
   *
   * ── Why it may not arrive as a generic failure ──────────────────────────────
   *
   * Section 3c of that migration states the requirement and names plan 35-08 as
   * the surface that owes it: **the refusal must name the assignments that
   * block, and it must offer a way out.** A generic refusal here is the
   * *"Qualcosa è andato storto"* precedent this repository has already recorded
   * (`.planning/codebase/CONCERNS.md`), on an urgent path, in a product with no
   * error tracking at all. So the `detail` this cause carries is the LIST of
   * blocking nights, and `revokeAssignmentsAndDemote` below is the one action
   * that clears them.
   */
  | "live_assignments_block_demotion"
  /**
   * `revokeAssignmentsAndDemote` stopped part-way: at least one revocation
   * landed and the role change did NOT happen.
   *
   * Its own cause, and emphatically not a `write_failed` — whose sentence
   * promises *"nothing was written"*, which here would be false. The world is in
   * a state nobody chose: some nights have lost their staff, the account still
   * holds its role. That is worth its own screen, because the next step is to
   * look at what remains rather than to retry blindly.
   */
  | "revocation_incomplete"
  /**
   * The request asked for no change at all — a role change to the role the
   * account already holds.
   *
   * A cause of its own rather than a silent success: the register has no act
   * for "nothing happened", and writing one would put a claim in the register
   * that the database never performed.
   *
   * ── `act_underivable` stava qui, ed e' uscito con la fase 50 ───────────────
   *
   * Nominava una transizione di STATO che questo file non sapeva chiamare. Lo
   * stato non esiste piu' (D-50-01), quindi la causa non e' piu' producibile da
   * nessun percorso — e una causa gestita e irraggiungibile e' il posto dove il
   * prossimo lettore smette di cercare. Cancellata invece che lasciata, come
   * `master_manage_required` e le due riserve del 2026-08-08 prima di lei.
   */
  | "nothing_to_do";

/**
 * Perche' `deleteAccount` ha un vocabolario suo invece di allargare questo.
 *
 * Le dodici cause qui sotto dicono **quale traccia** impedisce la
 * cancellazione, e sono dodici perche' dodici sono gli insiemi misurati sul
 * catalogo (`50-MEASURES.md`, M10): undici vincoli che BLOCCANO piu' i
 * biglietti, che invece cascherebbero. Metterle in `MemberActFailure`
 * significherebbe offrirle a `updateMemberRole`, che non puo' produrne
 * nessuna — e un'unione che promette cause irraggiungibili e' la stessa
 * ambiguita' che questo file toglie altrove, un piano piu' su.
 *
 * `CreateAccountFailure` ha gia' fatto questa scelta per la stessa ragione.
 * Le quattro cause condivise — la coppia della guardia, il soggetto assente e
 * il fallimento generico — compaiono in entrambe le unioni: TypeScript le
 * unifica, e `MemberActionNotice` le disegna una volta sola.
 *
 * **Nessuna di queste e' «qualcosa e' andato storto».** Il precedente
 * registrato in `.planning/codebase/CONCERNS.md` — il form newsletter che
 * collassa rete, chiave mancante e indirizzo gia' iscritto in una frase sola —
 * e' esattamente cio' che una causa unica per dodici insiemi rifarebbe, su una
 * superficie dove l'operatore deve sapere COSA andare a togliere.
 */
export type DeleteAccountFailure =
  | "capabilities_unavailable"
  | "forbidden"
  | "subject_not_found"
  | "write_failed"
  /** Ha biglietti: `tickets.user_id` e' `ON DELETE CASCADE` e li cancellerebbe. */
  | "delete_account_has_tickets"
  /** E' su una guest list: `guest_list_entries.profile_id`. */
  | "delete_account_on_guest_list"
  /** Ha aggiunto voci di guest list: `guest_list_entries.added_by`. */
  | "delete_account_added_guests"
  /** Ha ammesso qualcuno da guest list: `guest_list_entries.checked_in_by`. */
  | "delete_account_admitted_guests"
  /** Ha convalidato biglietti alla porta: `tickets.checked_in_by`. */
  | "delete_account_checked_in_tickets"
  /** Ha registrato presenze alla porta: `attendances.checked_in_by`. */
  | "delete_account_checked_in_attendances"
  /** Ha operato lo scanner: `door_scan_events.operator_id`. */
  | "delete_account_has_door_scans"
  /** Ha concesso assegnazioni: `party_assignments.assigned_by`. */
  | "delete_account_granted_assignments"
  /** Ha ricevuto assegnazioni: `party_assignments.user_id`, che cascherebbe. */
  | "delete_account_holds_assignments"
  /** Ha creato artisti: `artists.created_by`. */
  | "delete_account_created_artists"
  /** Ha creato sedi: `venues.created_by`. */
  | "delete_account_created_venues"
  /** Ha chiesto o deciso rimborsi: `ticket_refunds.requested_by`/`processed_by`. */
  | "delete_account_touched_refunds"
  /**
   * Il `23503` che passa comunque, tradotto.
   *
   * Fra il censimento e la cancellazione qualcuno puo' aver scritto una riga —
   * una voce di guest list aggiunta alle due di notte mentre l'operatore
   * guardava la lista. Il database rifiuta, e questa causa dice che ha
   * rifiutato **per una traccia**, non per un guasto. Mai `23503` nudo.
   */
  | "delete_account_still_referenced";

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

/** PostgreSQL `foreign_key_violation`. Phase 35's composite key raises it. */
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * The one foreign key on `public.profiles (id, role)` — phase 35's.
 *
 * Named as a constant because `20260808001000_role_implies_approved.sql:179-181`
 * already set the rule for this repository: **anyone renaming a constraint
 * renames it everywhere that asserts it.** This is now one of those places.
 */
const LIVE_ASSIGNMENT_FK = "party_assignments_assignee_role_fk";

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
  if (isBlockedByLiveAssignment(error)) return "live_assignments_block_demotion";
  return "write_failed";
}

/**
 * Is this the phase-35 refusal — a role write blocked by a LIVE assignment?
 *
 * ── The constraint NAME is read here, and that is not the thing this file
 *    forbids ────────────────────────────────────────────────────────────────
 *
 * The rule everywhere above is that a CATEGORY is never picked from a sentence,
 * and it is not being broken. The CODE decides the family: `23503` says a
 * foreign key refused the write, and that is a field of the error object, not
 * prose. The NAME then says WHICH foreign key — and `23503` can reach this file
 * from any other key on `public.profiles`, so collapsing them would be the same
 * failure this whole section exists to avoid, one scale smaller.
 *
 * The identifier is one this repository chose and declared
 * (`20260809000000_party_assignments.sql`), not a phrase a framework may
 * reword — the same standing this file already gives the constraint name it
 * logs for diagnosis.
 *
 * **The direction of the error is the safe one**, and that is why the test is
 * written this way round: a message that does not carry the name falls back to
 * `write_failed`, which promises less. It never asserts a specific cause it
 * could not confirm — a refusal that named the wrong reason would send an
 * operator to revoke assignments that are not the problem.
 */
function isBlockedByLiveAssignment(error: WriteError): boolean {
  return (
    error.code === FOREIGN_KEY_VIOLATION &&
    (error.message ?? "").includes(LIVE_ASSIGNMENT_FK)
  );
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
// ONE gate for every member act — and it used to be TWO. Read why before
// re-splitting it.
// =============================================================================
//
// There was a `verifyMaster` here, on `CAP.MASTER_MANAGE`, guarding
// `deactivateMember` and `reactivateMember`, with a long comment forbidding the
// merge. **It is gone, by OWNER DECISION of 2026-08-08**, and the old rationale
// is replaced below rather than deleted, because a rationale that vanishes is a
// rationale that gets re-derived wrongly.
//
//   verifyMaster            -> CAP.MASTER_MANAGE  -> master ONLY        (REMOVED)
//   verifyAdminOrOrganizer  -> CAP.STAFF_MANAGE   -> master AND organizer
//
// ── What the old rationale said, and what supersedes it ─────────────────────
//
// Plan 43-09's threat register, **T-43-09-02** (*«the promotion widening
// carrying deactivate and reactivate with it»*), asserted the opposite of what
// this file now does: *«Only `updateMemberRole` moves to
// `verifyAdminOrOrganizer`; the other two keep `verifyMaster`, and an acceptance
// criterion asserts it.»* That assertion was an AGENT's, and it was right for
// its own day.
//
// **The owner was asked, in plain product terms, who may reverse a decision
// already taken about a person — readmit somebody who was rejected, or exclude
// somebody who was approved — and chose: an organizer may do everything.** That
// decision supersedes T-43-09-02. Keeping the two acts on `master.manage` while
// the SAME transitions were reachable through `approveMember` and
// `rejectMember` (which the same owner decision opened) is not a boundary: it is
// CR-01's shape again — *a restriction reachable through a sibling with a wider
// gate is not a restriction* — with the sides swapped. The narrow gate was not
// protecting the outcome, it was only deciding which button produced it.
//
// So all six acts now sit on ONE gate, and the ceiling that D-07 actually cares
// about is held where it always was and is untouched by this: `WritableRole`
// has no `'master'` (source), `isWritableRole` re-tests it against the wire, and
// rule 1 below refuses every act aimed at a subject who holds `master`.
//
// EQUIVALENCE, MEASURED against `private.role_capabilities`
// (`20260807000000_capability_model.sql`):
//
//   test                                           grant rows                    requires_approved
//   role !== "master" && role !== "organizer"      ('master','staff.manage')     false      :392
//                                                  ('organizer','staff.manage')  false      :393
//
// The deleted test read a `select("role")`. `status` was never fetched, so it
// could not be part of the predicate — which is why it maps to grants with
// `requires_approved = false`, and why it does not map to `catalogue.manage`
// (`requires_approved = true`, :399-400). `member` is not `approved`: two axes,
// and only one of them was ever being read here.
//
// **`CAP.MASTER_MANAGE` still exists** and is still asked elsewhere
// (`organizer/events/**`, `organizer/events/[id]/tickets/**`). What was removed
// is this file's use of it, not the key.
//
// ── What changed, and what did not ───────────────────────────────────────────
//
// This used to THROW on both outcomes. It now RETURNS a refusal and still
// THROWS when the lookup itself failed, and that asymmetry is the position the
// tag is read from: a throw out of `getAccessContext()` is
// `capabilities_unavailable`, a returned `{ok:false}` is `forbidden`.

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

/**
 * Master or organizer: approve, reject, readmit, withdraw, change a role within
 * the ceiling, create an account.
 *
 * The `userId` check is a real subject, or nothing happens. Attribution (§5)
 * requires every approval, rejection and promotion to record WHO — so an action
 * must never proceed on a null identity. It sits here rather than at each call
 * site because eight call sites are eight chances to omit it.
 *
 * It THROWS rather than returning `forbidden`, on purpose: a resolver that
 * produced no subject did not refuse anybody, it failed. The throw lands in
 * `guarded`'s first catch and is reported as `capabilities_unavailable`, which
 * is the cause an operator can act on.
 */
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
// PHASE 35 — a role write blocked by a live assignment, and the way out
// =============================================================================
//
// Three exported acts write `role` and can now be refused with `23503` on
// `party_assignments_assignee_role_fk`: `updateMemberRole` (any role move),
// `deactivateMember` and `rejectMember` (both write `role: 'member'`). None of
// them handled it before this plan, and all three would have answered with
// their generic write failure — the exact shape of the recorded precedent, on
// the one path where somebody is standing at a screen trying to get something
// done tonight.
//
// The classification is CENTRAL — `classifyWriteFailure`, one branch, so it
// cannot be added to two of the three paths and forgotten on the sibling
// somebody was not looking at. What each path does for itself is the
// ENRICHMENT: turning the tag into a sentence that names WHICH nights, which
// needs the subject id and a second read and therefore cannot live in a
// synchronous classifier.

/**
 * The `detail` of a blocked role write: the nights that block it.
 *
 * ── This is the ONE detail in this file that carries data, not a literal ─────
 *
 * Everywhere else `detail` is a value from a closed set, and the reason is that
 * `MemberActionNotice.tsx` LOOKS IT UP to refine a sentence. This one is not
 * looked up — no map has a key for it — it is RENDERED, verbatim, in the
 * monospace line that component already draws under every notice. Nothing
 * branches on it, so it cannot become a category smuggled inside a string.
 *
 * It carries data because the requirement is that it must:
 * `20260809000000_party_assignments.sql` section 3c asks for a refusal that
 * **names the assignments that block**, and there is no error tracking in this
 * product — a log line reaches nobody, so this string is the only place the
 * answer exists for the person who needs it.
 *
 * No personal data. A date, a night's title and a capability key: the subject is
 * the account the operator already has selected, and this repository is public.
 *
 * If the enrichment read itself fails, the detail says so rather than pretending
 * to a complete list. A truncated list would send somebody to revoke two of
 * three assignments and meet the same refusal again with less trust in it.
 */
async function describeBlockingAssignments(
  serviceClient: ServiceClient,
  memberId: string
): Promise<string> {
  // ── «Live» here means what the DATABASE means by it, since it is the database
  //    that refused ─────────────────────────────────────────────────────────
  //
  // `revoked_at IS NULL` alone was the filter, and it named rows that were NOT
  // blocking anything: an assignment that ended three weeks ago and that nobody
  // revoked is not live, and since CR-02 it does not block a role write either —
  // `profiles_release_expired_assignments` retires it inside the same statement
  // (`20260809007000_expired_assignments_release_role.sql`). Listing it would
  // send somebody to the assignments page of every past event to revoke history,
  // and the sentence above the list says *«live»*, which would have been false.
  //
  // The second clause uses THIS server's clock, and that is acceptable here for
  // a reason worth writing down: this string is a **diagnosis**, never a
  // boundary. The boundary is `now() >= ends_at` inside the release function, on
  // the database's clock, which no other process can move. A device clock — or
  // an app server's — is evidence, never authority (`checkin-store.ts:135-136`),
  // and a minute of skew here can only put a night on the list that the next
  // attempt will find already retired.
  const { data: live, error } = await serviceClient
    .from("party_assignments")
    .select("party_id, capability")
    .eq("user_id", memberId)
    .is("revoked_at", null)
    .gt("ends_at", new Date().toISOString());

  if (error || !live) {
    console.error(
      `[members.live_assignments_block_demotion] could not list the blocking ` +
        `assignments: ${error?.code ?? "unknown"}`
    );
    return "blocked by live assignments — the list could not be read";
  }

  if (live.length === 0) {
    // The write was refused by that key and nothing is live. The two readings
    // disagree, which is information: a concurrent revocation between the two
    // statements, a key firing for a reason this file has mis-identified, or —
    // since CR-02 — `profiles_release_expired_assignments` not running, which is
    // what an ENDED assignment blocking a role write would mean. Saying so is
    // the honest answer; claiming "no assignments" as though the refusal had not
    // happened is not.
    return "blocked by a live assignment that is no longer there — reload and try again";
  }

  const { data: nights } = await serviceClient
    .from("event_parties")
    .select("id, title, date")
    .in(
      "id",
      live.map((row) => row.party_id as string)
    );

  const nightById = new Map(
    (nights ?? []).map((n) => [n.id as string, n as { title: string; date: string }])
  );

  const listed = live
    .map((row) => {
      const night = nightById.get(row.party_id as string);
      // The date is written as it is STORED — a plain `YYYY-MM-DD`, no
      // formatting. It is unambiguous, it carries no zone question
      // (`time-and-scheduling.md`), and it is the same string the organizer
      // sees on the assignments page.
      const when = night ? `${night.date} ${night.title}` : row.party_id;
      return `${when} — ${row.capability}`;
    })
    .join("; ");

  return `${live.length} live assignment(s): ${listed}`;
}

/**
 * Replaces a blocked write's `detail` with the list of nights that block it.
 *
 * Called by the three role-writing acts, each of which passes through it only on
 * the one tag. Everything else is returned untouched.
 */
async function withBlockingNights<T>(
  serviceClient: ServiceClient,
  memberId: string,
  result: MemberActResult<T>
): Promise<MemberActResult<T>> {
  if (result.ok || result.failure !== "live_assignments_block_demotion") {
    return result;
  }
  return {
    ...result,
    detail: await describeBlockingAssignments(serviceClient, memberId),
  };
}

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
    note?: string | null;
  }
): Promise<MemberActResult<ActRecorded>> {
  const { data, error } = await serviceClient.rpc("record_membership_act", {
    p_subject_id: params.subjectId,
    p_act: params.act,
    p_actor_id: params.actorId,
    p_actor_kind: "user",
    p_role: params.role ?? null,
    // ── `p_status` SI PASSA ANCORA, e sempre `null`. Non e' una dimenticanza ──
    //
    // La firma della funzione conserva il parametro, **accettato e ignorato**:
    // `20260921120000_drop_status_and_referral.sql` lo dichiara accanto a se'
    // stessa, e la ragione e' l'ACL — una firma nuova perde il `REVOKE`/`GRANT`
    // di `20260808002000:485-490`. Passarlo esplicitamente a `null`, invece di
    // ometterlo, e' cio' che rende il giorno in cui il parametro sparira' un
    // diff di una riga sola, qui e non sparso per il file.
    p_status: null,
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
// THE ACT GROUP — un asse solo, da questa fase in poi
// =============================================================================
//
// Fino alla fase 50 questo blocco governava SEI atti su DUE assi: il ruolo e lo
// stato. Lo stato non esiste piu' — `profiles.status`, `pending`, `rejected` e
// le quattro transizioni che li muovevano sono usciti dallo schema con
// `20260921120000_drop_status_and_referral.sql` (D-50-01).
//
// Quindi: `approveMember`, `rejectMember`, `deactivateMember`,
// `reactivateMember` e le due bulk **non esistono piu'**, insieme a
// `planStatusAct`, `deriveStatusAct`, `MAIL_FOR_ACT` e le tre mail che ne
// dipendevano. Non sono state lasciate a rifiutare per sempre: un ramo che non
// si puo' piu' prendere e' il posto dove il prossimo lettore smette di cercare,
// ed e' la regola che questo file applica gia' tre volte (`verifyMaster`,
// `master_manage_required`, le due riserve del 2026-08-08).
//
// **Togliere l'accesso a qualcuno significa ora cancellare il suo account**
// (D-50-16), e quell'atto vive in `deleteAccount`, in fondo a questo file. Non
// c'e' nessun interruttore intermedio fra «esiste» e «non esiste»: nessun ban
// lato Auth con il profilo vivo, nessuna colonna «sospeso», nessun
// `revoked_at` sui profili. `community-membership.md`, gate *nessuna corsia
// grigia*: una via d'uscita che aggira il percorso dichiarato si svuota senza
// che nessuna riga di codice cambi.
//
// QUELLO CHE RESTA, e che vale per `updateMemberRole`, `createAccount` e
// `deleteAccount`:
//
//   1. NESSUN ATTO RAGGIUNGE UN SOGGETTO CHE E' `master`.
//      Uniforme, indipendente da chi chiama. `WritableRole` non ha `'master'`
//      e nessun ramo lo scrive: ripristinare il ruolo piu' alto resta dove
//      D-12 l'ha messo, `public.reconcile_master`, guidato dall'ambiente di
//      deploy. Questa e' la contropartita un piano piu' su: il database
//      rifiuta di ARRIVARE a zero master, questo file rifiuta di MIRARE
//      all'unico che c'e'.
//
//   2. NESSUN ATTO RAGGIUNGE IL PROPRIO AUTORE.
//      Ogni atto si registra con il suo autore; un atto in cui autore e
//      soggetto coincidono e' l'unica forma che l'attribuzione non puo' rendere
//      sicura. Vale ora anche per la cancellazione, dove il costo e' il piu'
//      alto possibile: un master che cancella se stesso lascia il prodotto
//      senza nessuno che possa rimediare dall'interno.
//
//   3. L'ATTO NOMINA CIO' CHE E' SUCCESSO, NON LA FUNZIONE CHE E' STATA
//      CHIAMATA. La regola sopravvive alla scomparsa dello stato: resta su
//      `promoted`/`demoted`, calcolati da `ROLE_RANK` e non passati come
//      letterale, e su `created` e `deleted`, che sono due fatti e non due
//      pulsanti.
//
// Entrambe le prime due regole sono tenute da `assertSubjectActionable`, in UNA
// lettura, prima che qualunque atto scriva.

/** A refusal, in the shape every act in this group returns it. */
type SubjectRefusal = { ok: false; failure: MemberActFailure; detail: string };

/**
 * Rules 1 and 2, in ONE read, before any act in this group writes.
 *
 * Restituisce il RUOLO corrente del soggetto e il suo CODICE DI MEMBERSHIP.
 *
 * Il ruolo serve a `updateMemberRole`, che da li' calcola `promoted` o
 * `demoted` invece di riceverlo come letterale. Il codice serve a
 * `deleteAccount`: e' l'etichetta con cui il soggetto sopravvive nel registro
 * (`membership_acts.subject_label`), e va letto **prima** della cancellazione,
 * perche' dopo non c'e' piu' nessuna riga da cui leggerlo. Una lettura sola per
 * tutti e due, che e' la regola che questa funzione ha sempre tenuto: una
 * seconda lettura sarebbe una seconda verita'.
 *
 * ── `status` non si legge piu', e non e' una svista ──────────────────────────
 *
 * Questo `select` diceva `("role, status")`. La colonna e' uscita dallo schema
 * (D-50-01) e il codice va in produzione PRIMA della migration (D-50-24):
 * chiederla nella finestra di deploy funzionerebbe, chiederla dopo darebbe
 * `42703` su ogni atto. Non si chiede piu'.
 *
 * `maybeSingle()` and not `single()`: a missing row is `subject_not_found`, and
 * `single()` would report it as a PostgREST code that classifies as a generic
 * write failure. The distinction is the difference between *"reload the list"*
 * and *"the write was refused"*.
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
  }
): Promise<
  { ok: true; role: string; membershipCode: string | null } | SubjectRefusal
> {
  // Rule 2, first and without a round trip: an act aimed at its own author is
  // refused before the database is asked anything about anybody.
  if (memberId === ctx.userId) {
    return { ok: false, failure: "forbidden", detail: opts.selfDetail };
  }

  const { data: subject, error } = await serviceClient
    .from("profiles")
    .select("role, membership_code")
    .eq("id", memberId)
    .maybeSingle();

  if (error) return writeFailure(opts.action, error);
  if (!subject) {
    return { ok: false, failure: "subject_not_found", detail: "no_profile" };
  }

  const role = String(subject.role);

  // Rule 1.
  if (role === "master") {
    return { ok: false, failure: "forbidden", detail: "subject_is_master" };
  }

  return {
    ok: true,
    role,
    membershipCode: subject.membership_code ?? null,
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
 * **`verifyMaster` non esiste piu' in questo file**, e da questa fase non
 * esiste piu' nemmeno cio' che guardava: `deactivateMember` e
 * `reactivateMember` sono usciti con l'asse dello stato (D-50-01/D-50-16).
 * L'unico atto distruttivo rimasto e' `deleteAccount`, in fondo, e tiene la
 * stessa guardia di questo — nessun percorso nuovo, nessuna capability nuova.
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

    // Rules 1 and 2 in one read — see THE ACT GROUP above. This replaces the
    // self-check and the `subject_is_master` refusal that used to live here
    // inline, and the read it used to do to name the act: `subject.role` comes
    // back from the same statement.
    const subject = await assertSubjectActionable(serviceClient, ctx, memberId, {
      action: "updateMemberRole",
      selfDetail: "self_role_change",
    });
    if (!subject.ok) return subject;

    // ── LA TERZA PORTA VERSO UNA RIAMMISSIONE E' CHIUSA PERCHE' NON C'E' PIU' ─
    //
    // Qui stava un rifiuto, `readmission_before_role_change`: una promozione
    // scriveva `status = 'approved'` nello stesso statement, quindi puntata a
    // un account `rejected` ne rovesciava la decisione portando un nome di atto
    // che sapeva parlare solo del RUOLO. Il registro avrebbe detto `promoted`
    // dove la verita' era `reactivated`.
    //
    // **Lo stato non esiste piu'** (D-50-01): una promozione muove un asse
    // solo, e non c'e' nessuna decisione chiusa da rovesciare di straforo. Il
    // rifiuto esce con la sua causa invece di restare a guardia di una cosa che
    // non puo' piu' accadere.

    const currentRole = subject.role;

    if (currentRole === newRole) {
      // No act, and no register row. The register has ten values and none of
      // them means "nothing happened"; writing one anyway would put a
      // transition in the history that the database never performed.
      return { ok: false, failure: "nothing_to_do", detail: "role_unchanged" };
    }

    const act: MembershipAct =
      ROLE_RANK[newRole] > (ROLE_RANK[currentRole as WritableRole] ?? 0)
        ? "promoted"
        : "demoted";

    // UN ASSE SOLO. Fino alla fase 50 questa chiamata ne muoveva due —
    // concedere `staff` o `organizer` scriveva anche `status = 'approved'`, per
    // la decisione del proprietario del 2026-08-06, e declassare lasciava lo
    // stato dov'era. Il secondo asse non c'e' piu' (D-50-01): resta il ruolo, e
    // `profiles_role_implies_approved` — il vincolo che giudicava la coppia —
    // e' caduto con la colonna che leggeva.
    const result = await recordAct("updateMemberRole", serviceClient, {
      subjectId: memberId,
      act,
      actorId: ctx.userId,
      role: newRole,
    });

    // PHASE 35. This write can now be refused with `23503` on
    // `party_assignments_assignee_role_fk`, and on THIS path it is not only a
    // demotion: the composite key ties `(user_id, assignee_role)` to the live
    // profile row, so promoting a `staff` holder to `organizer` breaks the pair
    // exactly as demoting them to `member` does. Either way the answer must name
    // the nights rather than read as a failed write.
    if (result.ok) revalidatePath("/admin/members");
    return withBlockingNights(serviceClient, memberId, result);
  });
}

/**
 * THE WAY OUT of a role change blocked by live assignments: revoke them, then
 * change the role — as ONE action, so nobody has to know the order.
 *
 * `20260809000000_party_assignments.sql` section 3c names this plan as the
 * surface that owes it, and the reason is not convenience: the refusal lands on
 * an urgent path, and a rule with no exit is indistinguishable, to the person
 * meeting it, from a product that is broken.
 *
 * ── TWO ACTS, and they stay two ─────────────────────────────────────────────
 *
 * Each revocation is recorded as `unassigned` by
 * `public.record_party_assignment_act`, and the role change is recorded as
 * `promoted` / `demoted` by `public.record_membership_act`. They are NOT fused
 * into one entry. They are different things — a night's power taken back, and
 * an account's role moved — and the register is the only place that difference
 * survives a season (`acts.ts:41-45`, the same argument that keeps `rejected`
 * and `deactivated` apart for one identical write).
 *
 * ── IT STOPS AT THE FIRST FAILED REVOCATION ─────────────────────────────────
 *
 * A role change performed after half the revocations would leave a state nobody
 * chose, and — worse — one the composite key would then permit, because the
 * remaining assignment is the only thing that was still refusing it. So the
 * sequence stops, and it says so with its own cause (`revocation_incomplete`)
 * rather than through `write_failed`, whose sentence promises that nothing was
 * written.
 *
 * ── THE MASTER CASE IS INHERITED, NOT REWRITTEN ─────────────────────────────
 *
 * CR-01 of `43-REVIEW.md` found a path on which an organizer could reach the
 * master. This function does not get to reintroduce it, and it does not get its
 * own copy of the refusal either: it calls `assertSubjectActionable`, which is
 * where rules 1 and 2 live for every act in this file, and it delegates the role
 * write to `updateMemberRole`, which holds the ceiling in both places
 * (`WritableRole` in the source, `isWritableRole` against the wire). A second
 * implementation of "not the master" would be a second place to get it wrong,
 * and the first one was got wrong once already.
 *
 * The check runs BEFORE any revocation, deliberately: refusing after the
 * revocations would have stripped a master of their nights on the way to a
 * refusal.
 *
 * ── THE PRICE, DECLARED: the access context is resolved TWICE ───────────────
 *
 * `guarded` resolves it here, and `updateMemberRole` resolves it again — and
 * `cache()` does not memoise inside a Server Action (`server.ts:103-116`,
 * measured), so that is two full round trips rather than a free read. S4 of
 * `35-PATTERNS.md` asks for one resolution per action and this pays two.
 *
 * It is paid on purpose. The alternative is to inline the role write, which
 * means re-deriving `promoted` / `demoted`, the readmission refusal, the
 * `role_unchanged` case and the master ceiling — the four things this function
 * is explicitly not allowed to copy. One extra round trip on a rare
 * administrative path is the cheaper of the two costs, and it is the one that
 * cannot silently diverge.
 *
 * ── The name says "demote"; the signature is general ────────────────────────
 *
 * Any role move is refused by the key, not only a demotion. The name is the one
 * the plan and the migration agreed on and is kept so the two documents still
 * point at this function; `nextRole` is what it actually does.
 */
export async function revokeAssignmentsAndDemote(
  memberId: string,
  nextRole: WritableRole
): Promise<MemberActResult<ActRecorded>> {
  const cleared = await guarded(
    "revokeAssignmentsAndDemote",
    verifyAdminOrOrganizer,
    async (ctx): Promise<MemberActResult<{ revoked: number }>> => {
      // The wire-level ceiling, before anything is revoked: a crafted
      // `nextRole: "master"` must not cost somebody their nights on its way to
      // being refused by the delegate.
      if (!isWritableRole(nextRole)) {
        return { ok: false, failure: "forbidden", detail: "role_not_writable" };
      }

      const serviceClient = getServiceClient();

      // Rules 1 and 2, the file's own — never a copy. `self_role_change` is the
      // detail this surface already draws, because this IS a role change and a
      // second wording for the same refusal would be a second thing to keep in
      // step.
      const subject = await assertSubjectActionable(
        serviceClient,
        ctx,
        memberId,
        {
          action: "revokeAssignmentsAndDemote",
          selfDetail: "self_role_change",
        }
      );
      if (!subject.ok) return subject;

      const { data: live, error } = await serviceClient
        .from("party_assignments")
        .select("party_id, capability")
        .eq("user_id", memberId)
        .is("revoked_at", null);

      if (error) return writeFailure("revokeAssignmentsAndDemote", error);

      let revoked = 0;

      for (const row of live ?? []) {
        const { error: revokeError } = await serviceClient.rpc(
          "record_party_assignment_act",
          {
            p_party_id: row.party_id,
            p_subject_id: memberId,
            p_capability: row.capability,
            p_act: "unassigned",
            p_actor_id: ctx.userId,
          }
        );

        if (revokeError) {
          // Only the code and the constraint-bearing message. The field that
          // carries the failing row is never read here, for the reason stated
          // at the top of this file.
          console.error(
            `[members.revocation_incomplete] revokeAssignmentsAndDemote: ` +
              `revoked=${revoked} of ${(live ?? []).length}, ` +
              `code=${revokeError.code ?? "unknown"}`
          );
          return {
            ok: false,
            failure: "revocation_incomplete",
            detail: `${revoked} of ${(live ?? []).length} revoked; the role was not changed`,
          };
        }

        revoked += 1;
      }

      return { ok: true, data: { revoked } };
    }
  );

  if (!cleared.ok) return cleared;

  // Zero live assignments is NOT short-circuited into a success: the operator
  // asked for a role change and the only honest answer is the one the existing
  // path gives, including whatever else might refuse it.
  return updateMemberRole(memberId, nextRole);
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
// looser, and why the act lands in the register with its author.
//
// **Il canale d'ingresso non si scrive piu' in una colonna** — `approved_via`
// esce con D-50-09, e la fase 49 aveva gia' deciso di non contarci l'ingresso
// dalla cassa. Cio' che resta a dire *da dove e' entrato questo account* e' la
// riga di registro, che porta l'atto, l'autore e l'istante: una colonna con tre
// etichette diceva meno, e lo diceva in un posto che nessuna superficie legge.
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

      // ── Il link punta a `/set-password`, NON al callback ─────────────────
      //
      // Il piano 43-04 aveva ragionato al contrario — «il callback e' quello che
      // scambia il codice per una sessione» — e **quel ragionamento non reggeva
      // per un link generato dal server**. Misurato in laboratorio il
      // 2026-08-19: `generateLink` produce un flusso *implicito*, la sessione
      // arriva nel FRAMMENTO, il frammento non viaggia verso il server, il
      // callback non trova `?code` e rimanda a `/login?error=auth` — **col token
      // gia' bruciato**. Nessuno degli account invitati poteva entrare.
      //
      // Il link ora si costruisce in un posto solo, da `hashed_token`, e
      // `/set-password` lo spende con `verifyOtp` sulla pagina che ha il campo.
      // Vedi `src/lib/auth/password-set-link.ts`.

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

      // ── 2. LA LETTURA DI RITORNO — e ora e' SOLO quella ──────────────────
      //
      // Qui stava un `update({ approved_via: "admin_manual" }).select("id")`,
      // e faceva **due** cose: scriveva il canale d'ingresso (D-08) e, di
      // rimbalzo, rilevava che il trigger non aveva scritto il profilo.
      //
      // `approved_via` esce con la fase 50 (D-50-09): la colonna non esiste
      // piu'. **La diagnosi no.** Toglierla insieme alla scrittura avrebbe
      // cancellato l'unico rilevamento di un account Auth senza profilo — la
      // forma di fallimento che il codice analogo della guest list produceva in
      // silenzio dietro un `setTimeout` di 500 ms, e che questo percorso esiste
      // per non ripetere (`meta-gates.md`, zero fallimenti silenziosi).
      //
      // Quindi resta una `select("id")` PURA sulla stessa riga, e il ramo di
      // fallimento e' identico: zero righe significa *il trigger non ha
      // girato*, deterministicamente, senza dipendere dal mapping
      // `P0002 → error.code` che il piano 43-09 aveva segnalato come
      // assunzione e non come misura. Quel mapping resta comunque, sotto, come
      // seconda rete.
      //
      // `maybeSingle()` NON si usa qui: `single()`/`maybeSingle()` collassano
      // «zero righe» in un codice PostgREST, mentre questa forma restituisce un
      // array vuoto con `error: null` — ed e' l'array vuoto la diagnosi.
      const { data: channelRows, error: channelError } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("id", memberId);

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

      // ── 3. L'atto e il ruolo, in UNA transazione ────────────────────────
      //
      // Qui ruolo e stato si muovevano insieme, ed era la ragione per cui
      // `profiles_role_implies_approved` non poteva scattare su questo
      // percorso. Il vincolo e' caduto con la colonna che leggeva (D-50-01):
      // resta il ruolo, e non c'e' piu' nessuno stato intermedio proibito da
      // evitare, perche' non c'e' piu' nessuno stato.
      //
      // `act: "created"` and the actor from the session: D-11, and
      // `community-membership.md`'s *chi decide è tracciato*. The profile write
      // and the register row are one transaction inside the function, so this
      // path cannot produce an account nobody is named for.
      const recorded = await recordAct("createAccount", serviceClient, {
        subjectId: memberId,
        act: "created",
        actorId: ctx.userId,
        role,
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
      // Una definizione sola, condivisa con il percorso della guest list, che
      // portava lo stesso difetto e per giunta senza `redirectTo`.
      const link = await buildPasswordSetLink(
        serviceClient.auth.admin,
        email,
        appUrl
      );

      if (!link.ok) {
        console.error(
          `[members.invitation_link_failed] createAccount: subject=${memberId} ` +
            `reason=${link.reason} detail=${link.detail}`
        );
        revalidatePath("/admin/members");
        return {
          ok: false,
          failure: "invitation_link_failed",
          detail: link.detail,
          ...codeCarried,
        };
      }

      // Il controllo su `redirect_to` che stava qui non ha piu' oggetto: la
      // destinazione non e' piu' scelta da Auth ma costruita da noi, quindi non
      // c'e' nessuna allow-list che possa disattenderla in silenzio. Era una
      // guardia giusta sul percorso sbagliato.

      // ── 6. The send, AWAITED ────────────────────────────────────────────
      //
      // The one place `approveMember`'s fire-and-forget is deliberately not
      // copied. There the mail decorates an act that already happened; here the
      // invitation IS the requirement (ACCT-03), so a swallowed send is the
      // requirement failing quietly — and this project has no error tracking, so
      // quietly means nobody ever finds out.
      try {
        await sendAccountInvitation(email, fullName, link.url);
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

      return {
        ok: true,
        data: { memberId, actId: recorded.data.actId, membershipCode, role },
      };
    }
  );
}

// =============================================================================
// deleteAccount — l'unico modo di togliere l'accesso, e l'unico che puo' dire
// di NO
// =============================================================================
//
// D-50-16, decisione del proprietario: **togliere l'accesso a qualcuno
// significa cancellare il suo account.** Non c'e' nessuno stato intermedio fra
// «esiste» e «non esiste» — nessun ban lato Auth con il profilo vivo, nessuna
// colonna «sospeso», nessun `revoked_at`. `community-membership.md`, gate
// *nessuna corsia grigia*: una via d'uscita che aggira il percorso dichiarato
// si svuota senza che nessuna riga di codice cambi.
//
// ── E per questo l'azione deve poter RIFIUTARE ───────────────────────────────
//
// `50-MEASURES.md` M10 ha riletto dal catalogo (`pg_constraint`, non dal testo
// delle migration) i 47 vincoli che puntano a `public.profiles` o ad
// `auth.users`. **Undici BLOCCANO** una cancellazione, e `tickets.user_id` e'
// `ON DELETE CASCADE` — cioe' cancellare una persona cancellerebbe i suoi
// biglietti.
//
// Quindi: **un account che ha lavorato non e' cancellabile**, e senza un
// censimento prima l'operatore leggerebbe `23503`. Le tre strade di
// `50-RESEARCH.md` §4.2 erano: allargare la cascata sul percorso del denaro,
// accettare in silenzio, oppure rifiutare dicendo la causa. D-50-16 prende la
// terza. **Nessun cambio allo schema, nessuna cascata toccata.**
//
// ── Il censimento PRIMA, e il `23503` COMUNQUE ───────────────────────────────
//
// Le due reti insieme, non una sola. Il conteggio dice *quali* tracce esistono
// e con quanti elementi, cosi' la frase e' specifica — *«3 biglietti»*, *«2
// assegnazioni»* — e ogni insieme ha il suo codice di rifiuto proprio: una
// frase unica per dodici cause diverse rifarebbe il difetto del form newsletter
// che `.planning/codebase/CONCERNS.md` ha gia' registrato. Il `23503` resta
// gestito con la sua causa, perche' fra il censimento e la cancellazione
// qualcuno puo' aver scritto una riga.
//
// ── Cosa questa funzione NON fa ──────────────────────────────────────────────
//
// Non tocca lo schema, non cambia nessuna cascata, non cancella righe in
// nessuna tabella per conto proprio, e non tocca `membership_code`: e' la
// credenziale della porta, e la toglie la fase 51.

/**
 * Un insieme di tracce, con il nome da mostrare e la causa che porta.
 *
 * L'elenco **non** e' quello di `50-RESEARCH.md` §4.1, che ne dichiarava sette
 * e ne elencava otto: e' quello **misurato** in `50-MEASURES.md` M10. Le tre
 * differenze sono `attendances.checked_in_by`,
 * `guest_list_entries.checked_in_by` e `ticket_refunds.processed_by` — e le
 * prime due **sono due porte**: sono le colonne che registrano chi ha ammesso
 * qualcuno. Ignorarle avrebbe prodotto il `23503` davanti a una fila, la sera
 * in cui si cancella un account di staff che ha lavorato.
 */
type BlockingSet = {
  /** Il codice di rifiuto proprio di questo insieme. */
  failure: DeleteAccountFailure;
  /** La tabella da interrogare. */
  table: string;
  /** La colonna che porta l'identificativo del soggetto. */
  column: string;
  /** Come si nomina l'insieme in una frase, al singolare e al plurale. */
  one: string;
  many: string;
};

/**
 * L'ordine e' quello in cui l'operatore li incontra, dal piu' comune al piu'
 * raro, e non e' cosmetico: quando piu' insiemi bloccano insieme, il `failure`
 * restituito e' quello del PRIMO, mentre il `detail` li nomina tutti. Un ordine
 * stabile significa che due cancellazioni identiche danno la stessa risposta.
 *
 * `party_assignments.user_id` e' l'unica riga che **non** blocca a livello di
 * database — quella chiave e' CASCADE — ed e' qui lo stesso per la ragione di
 * `checkin-offline.md`: *una revoca non e' mai una cancellazione, resta nel
 * registro, perche' la porta deve poter chiedere dopo se qualcuno era assegnato
 * nel momento in cui ha scansionato.* Cancellare l'account porterebbe via
 * quelle righe in silenzio. Stessa strada dei biglietti: si rifiuta, non si
 * allarga ne' si restringe la cascata.
 */
const BLOCKING_SETS: readonly BlockingSet[] = [
  {
    failure: "delete_account_has_tickets",
    table: "tickets",
    column: "user_id",
    one: "1 biglietto",
    many: "biglietti",
  },
  {
    failure: "delete_account_holds_assignments",
    table: "party_assignments",
    column: "user_id",
    one: "1 assegnazione ricevuta",
    many: "assegnazioni ricevute",
  },
  {
    failure: "delete_account_granted_assignments",
    table: "party_assignments",
    column: "assigned_by",
    one: "1 assegnazione concessa",
    many: "assegnazioni concesse",
  },
  {
    failure: "delete_account_has_door_scans",
    table: "door_scan_events",
    column: "operator_id",
    one: "1 scansione operata alla porta",
    many: "scansioni operate alla porta",
  },
  {
    failure: "delete_account_checked_in_tickets",
    table: "tickets",
    column: "checked_in_by",
    one: "1 biglietto convalidato alla porta",
    many: "biglietti convalidati alla porta",
  },
  {
    failure: "delete_account_checked_in_attendances",
    table: "attendances",
    column: "checked_in_by",
    one: "1 presenza registrata alla porta",
    many: "presenze registrate alla porta",
  },
  {
    failure: "delete_account_admitted_guests",
    table: "guest_list_entries",
    column: "checked_in_by",
    one: "1 ospite ammesso da guest list",
    many: "ospiti ammessi da guest list",
  },
  {
    failure: "delete_account_added_guests",
    table: "guest_list_entries",
    column: "added_by",
    one: "1 voce di guest list creata",
    many: "voci di guest list create",
  },
  {
    failure: "delete_account_on_guest_list",
    table: "guest_list_entries",
    column: "profile_id",
    one: "1 voce di guest list a suo nome",
    many: "voci di guest list a suo nome",
  },
  {
    failure: "delete_account_touched_refunds",
    table: "ticket_refunds",
    column: "requested_by",
    one: "1 rimborso richiesto",
    many: "rimborsi richiesti",
  },
  {
    failure: "delete_account_touched_refunds",
    table: "ticket_refunds",
    column: "processed_by",
    one: "1 rimborso processato",
    many: "rimborsi processati",
  },
  {
    failure: "delete_account_created_artists",
    table: "artists",
    column: "created_by",
    one: "1 artista creato",
    many: "artisti creati",
  },
  {
    failure: "delete_account_created_venues",
    table: "venues",
    column: "created_by",
    one: "1 sede creata",
    many: "sedi create",
  },
];

/** Cosa il censimento ha trovato, per un insieme che non e' vuoto. */
type BlockingCount = { set: BlockingSet; count: number };

/**
 * Conta le righe di ogni insieme, **prima** di toccare qualunque cosa.
 *
 * `head: true` con `count: "exact"`: nessuna riga viaggia, solo il numero. Su
 * una superficie dove il soggetto e' una persona, tirare in memoria le sue
 * righe per contarle sarebbe leggere dati che a nessuno servono.
 *
 * **Un errore di lettura non si ingoia.** Se una delle interrogazioni fallisce
 * il censimento e' incompleto e la cancellazione **non** procede: procedere su
 * un censimento parziale significherebbe cancellare credendo di aver guardato.
 * Si restituisce `null` e il chiamante rifiuta con `write_failed`, la cui frase
 * promette che niente e' stato scritto — ed e' vero, perche' a quel punto non
 * si e' ancora scritto niente.
 */
async function censusBlockingSets(
  serviceClient: ServiceClient,
  subjectId: string
): Promise<BlockingCount[] | null> {
  const found: BlockingCount[] = [];

  for (const set of BLOCKING_SETS) {
    const { count, error } = await serviceClient
      .from(set.table)
      .select("*", { count: "exact", head: true })
      .eq(set.column, subjectId);

    if (error) {
      // Il codice e il messaggio, mai l'oggetto e mai `details` — la regola in
      // cima a questo file. `set.table` e `set.column` sono letterali nostri.
      console.error(
        `[members.delete_census_failed] deleteAccount: ` +
          `${set.table}.${set.column} code=${error.code ?? "unknown"} ` +
          `message=${error.message ?? "(none)"}`
      );
      return null;
    }

    if ((count ?? 0) > 0) found.push({ set, count: count ?? 0 });
  }

  return found;
}

/**
 * La frase che l'operatore legge, costruita dagli insiemi che hanno bloccato.
 *
 * Porta **quali** insiemi e **con quanti elementi**, perche' e' la sola cosa
 * che dice cosa andare a togliere. Nessun dato personale: numeri e nomi di
 * insiemi, sul soggetto che l'operatore ha gia' selezionato.
 */
function describeBlockingSets(found: BlockingCount[]): string {
  return found
    .map(({ set, count }) => (count === 1 ? set.one : `${count} ${set.many}`))
    .join("; ");
}

/** Cosa `deleteAccount` restituisce quando riesce. */
export type DeleteAccountData = {
  memberId: string;
  /** L'id della riga di registro scritta PRIMA della cancellazione. */
  actId: string | null;
  /** Il codice che il soggetto aveva, e con cui sopravvive nel registro. */
  membershipCode: string | null;
};

export type DeleteAccountResult = ActResult<
  DeleteAccountData,
  DeleteAccountFailure
>;

/**
 * Cancella un account — o rifiuta dicendo perche' non si puo'.
 *
 * ── La guardia e' la stessa degli altri atti, e questo e' deliberato ─────────
 *
 * `verifyAdminOrOrganizer`, cioe' `staff.manage`: nessun percorso nuovo,
 * nessuna capability nuova. D-50-16 lo chiede per nome, e la ragione e' quella
 * di CR-01 in `43-REVIEW.md`: **una restrizione raggiungibile attraverso un
 * atto fratello con un cancello piu' largo non e' una restrizione.** Un
 * cancello piu' stretto qui deciderebbe quale pulsante produce l'esito, non
 * l'esito.
 *
 * Le regole 1 e 2 valgono e sono tenute da `assertSubjectActionable`:
 *
 *   * **nessun atto raggiunge il `master`.** Cancellare l'unico master
 *     lascerebbe il prodotto senza nessuno che possa rimediare dall'interno, e
 *     `reconcile_master` — che gira a ogni deploy — cercherebbe un indirizzo
 *     che non esiste piu' in `auth.users`;
 *   * **nessun atto raggiunge il proprio autore.** Qui il costo e' il massimo
 *     possibile: chi cancella se stesso perde la sessione con cui potrebbe
 *     rimediare, e non c'e' niente da annullare.
 *
 * ── L'ordine, e perche' la riga di registro viene PRIMA ──────────────────────
 *
 * 1. guardia, 2. lettura del soggetto (una sola: ruolo e codice),
 * 3. censimento, 4. **riga di registro**, 5. cancellazione dell'utente Auth.
 *
 * La riga **prima** e non dopo: dopo, il soggetto non esiste piu' e
 * `record_membership_act` solleverebbe `P0002` — lascerebbe una cancellazione
 * senza traccia, che e' esattamente cio' che `community-membership.md` vieta
 * col gate *chi decide e' tracciato*. Il prezzo, dichiarato invece che
 * scoperto: se la cancellazione fallisce DOPO la riga, il registro porta un
 * `deleted` per un account che esiste ancora. E' il verso giusto dei due — una
 * traccia in piu' si legge e si capisce, una cancellazione senza traccia non si
 * contesta — e la risposta lo dice a chi ha premuto.
 *
 * `subject_label` lo scrive la funzione dal profilo, ed e' **il codice di
 * membership, mai un indirizzo e mai un nome** (`20260808002000:203`,
 * `20260921120000:601`). `subject_id` va a `NULL` per costruzione
 * (`ON DELETE SET NULL`), quindi la riga resta leggibile dopo la cancellazione.
 *
 * ── La cancellazione ─────────────────────────────────────────────────────────
 *
 * `auth.admin.deleteUser` dal client di servizio: e' l'unico client su cui quel
 * metodo esiste, e nessuna policy RLS puo' concederlo. Il profilo cade per
 * cascata (`schema.sql:55`). Non si cancella `public.profiles` a mano: sarebbero
 * due cancellazioni per una cosa sola, e la seconda lascerebbe un utente Auth
 * senza profilo — la forma che `createAccount` diagnostica come
 * `profile_missing`.
 *
 * **E' irreversibile, e questo repository non ha PITR.** La conferma sta sulla
 * superficie (`MemberTable.tsx`); qui sta il rifiuto, che e' la parte che un
 * click non aggira.
 */
export async function deleteAccount(
  subjectId: string
): Promise<DeleteAccountResult> {
  return guarded<DeleteAccountData, DeleteAccountFailure>(
    "deleteAccount",
    verifyAdminOrOrganizer,
    async (ctx) => {
      const serviceClient = getServiceClient();

      // Regole 1 e 2, in UNA lettura, e il codice di membership con loro —
      // letto ora perche' dopo la cancellazione non c'e' piu' riga da cui
      // leggerlo.
      const subject = await assertSubjectActionable(
        serviceClient,
        ctx,
        subjectId,
        { action: "deleteAccount", selfDetail: "self_delete" }
      );

      if (!subject.ok) {
        // Le cause di `assertSubjectActionable` vivono in `MemberActFailure`.
        // Le tre che puo' produrre — `forbidden`, `subject_not_found`,
        // `write_failed` — sono tutte e tre anche in `DeleteAccountFailure`, e
        // il compilatore lo verifica qui invece che crederci.
        const failure: DeleteAccountFailure =
          subject.failure === "forbidden" ||
          subject.failure === "subject_not_found"
            ? subject.failure
            : "write_failed";
        return { ok: false, failure, detail: subject.detail };
      }

      // ── Il censimento, prima di toccare qualunque cosa ──────────────────
      const found = await censusBlockingSets(serviceClient, subjectId);

      if (found === null) {
        return {
          ok: false,
          failure: "write_failed",
          detail: "census_unreadable",
        };
      }

      if (found.length > 0) {
        const detail = describeBlockingSets(found);
        // Il log porta il soggetto come uuid e la frase degli insiemi: nessun
        // indirizzo, nessun nome, e nemmeno il codice di membership — i log di
        // questo progetto finiscono negli screenshot e il codice e' la
        // credenziale della porta.
        console.error(
          `[members.${found[0].set.failure}] deleteAccount: ` +
            `subject=${subjectId} blocked_by=${detail}`
        );
        return { ok: false, failure: found[0].set.failure, detail };
      }

      // ── La riga di registro, PRIMA della cancellazione ──────────────────
      const recorded = await recordAct("deleteAccount", serviceClient, {
        subjectId,
        act: "deleted",
        actorId: ctx.userId,
      });

      if (!recorded.ok) {
        const failure: DeleteAccountFailure =
          recorded.failure === "subject_not_found"
            ? "subject_not_found"
            : "write_failed";
        return { ok: false, failure, detail: recorded.detail };
      }

      // ── La cancellazione ────────────────────────────────────────────────
      const { error: deleteError } =
        await serviceClient.auth.admin.deleteUser(subjectId);

      if (deleteError) {
        // IL `23503` CHE PASSA COMUNQUE, TRADOTTO NELLA SUA CAUSA.
        //
        // Fra il censimento e questa riga qualcuno puo' aver scritto: una voce
        // di guest list aggiunta mentre l'operatore guardava la lista. Il
        // database rifiuta, e la risposta dice che ha rifiutato **per una
        // traccia comparsa dopo**, non per un guasto — e dice di rileggere,
        // perche' il censimento di un minuto fa non e' piu' vero. **Mai
        // `23503` nudo e mai una frase generica.**
        //
        // Il codice si cerca in due posti perche' un errore di GoTrue non ha la
        // forma di un errore PostgREST: `code` puo' portare un'etichetta sua e
        // lo SQLSTATE arriva dentro il messaggio. Il messaggio si ISPEZIONA e
        // non si RESTITUISCE, e la direzione del test e' quella sicura: cio'
        // che non porta il codice cade nel ramo generico sotto, che promette
        // meno.
        const raw = `${deleteError.code ?? ""} ${deleteError.message ?? ""}`;
        if (raw.includes(FOREIGN_KEY_VIOLATION)) {
          console.error(
            `[members.delete_account_still_referenced] deleteAccount: ` +
              `subject=${subjectId} code=${FOREIGN_KEY_VIOLATION}`
          );
          return {
            ok: false,
            failure: "delete_account_still_referenced",
            detail: "una traccia è comparsa dopo il conteggio",
          };
        }

        console.error(
          `[members.write_failed] deleteAccount: subject=${subjectId} ` +
            `code=${deleteError.code ?? "unknown"} ` +
            `status=${deleteError.status ?? "unknown"}`
        );
        return {
          ok: false,
          failure: "write_failed",
          detail: deleteError.code ?? "auth_delete",
        };
      }

      revalidatePath("/admin/members");

      return {
        ok: true,
        data: {
          memberId: subjectId,
          actId: recorded.data.actId,
          membershipCode: subject.membershipCode,
        },
      };
    }
  );
}
