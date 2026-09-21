import { Card } from "@/components/ui/Card";
import type { MemberActFailure, DeleteAccountFailure } from "./actions";

/**
 * What a refused member act looks like on screen — one notice per cause.
 *
 * ── Why this component exists, and why it is not optional ────────────────────
 *
 * Plan 43-09 changed the eight member acts from THROWING to RETURNING a tagged
 * result, and in doing so made every `catch` in `MemberTable.tsx` unreachable.
 * Without something drawing the returned tag, a refused act draws **nothing at
 * all** — which is not merely a missing message, it is the failure that reads as
 * a success. That plan wrote six provisional sentences to keep its own change
 * honest and handed the wording, the placement and the styling to this plan.
 * This file is that hand-over completed: the sentences are no longer
 * provisional, and they no longer live inside the table.
 *
 * The shape is `newsletter/FailureNotice.tsx` — the repository's only precedent
 * for "one component, one notice per cause" — followed rather than re-derived.
 *
 * ── There is no shared fallback string here, and there must never be one ─────
 *
 * `meta-gates.md`, *zero fallimenti silenziosi*, with a recorded precedent in
 * this repository: the newsletter form collapses a network fault, a missing key
 * and an already-subscribed address into *"Qualcosa è andato storto"*
 * (`.planning/codebase/CONCERNS.md`), which leaves both the operator and the
 * next developer without a next step. And this project has **no error
 * tracking** at all (`meta-gates.md`, verified 2026-08-05), so a log line
 * reaches nobody: this banner is the only place a refusal exists for a human.
 *
 * ── The tag is a VALUE, never a message ──────────────────────────────────────
 *
 * Next redacts the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`). Everything drawn
 * below is keyed on `failure` and on `detail` — both of which the action
 * chooses from a closed vocabulary — so this surface behaves the same in
 * `next dev` and in the deployment where it matters. `e.message` is not read
 * anywhere in this file or in its caller.
 */

/**
 * Le cause che questa superficie sa disegnare.
 *
 * Vengono da due vocabolari del server — `MemberActFailure`, che governa il
 * cambio di ruolo, e `DeleteAccountFailure`, che dice **quale traccia**
 * impedisce una cancellazione — piu' una sola causa che nasce sul client:
 * l'azione non e' tornata affatto, quindi non c'e' nessuna etichetta da leggere
 * e da qui non si puo' sapere se la scrittura sia atterrata.
 *
 * Le due unioni si sovrappongono su quattro valori e TypeScript le unifica:
 * `capabilities_unavailable`, `forbidden`, `subject_not_found` e `write_failed`
 * si disegnano una volta sola, ed e' giusto cosi' — sono la stessa cosa detta
 * da due atti diversi.
 *
 * Il `Record` totale qui sotto e' cio' che ha costretto a modificare questo
 * file: aggiungere una causa all'azione senza una frase qui e' un errore di
 * `npm run build`, non un rifiuto che non disegna niente. E' l'intera ragione
 * per cui il tipo e' scritto cosi', e il 2026-08-09 ha fatto il suo lavoro.
 *
 * ── Una causa e' USCITA con la fase 50, ed e' la regola che questo file
 *    applica gia' tre volte ───────────────────────────────────────────────────
 *
 * `act_underivable` nominava una transizione di STATO che il server non sapeva
 * chiamare. Lo stato non esiste piu' (D-50-01): il server non puo' piu'
 * produrre quella causa, e una frase che non si puo' piu' disegnare e' il posto
 * dove il prossimo lettore smette di cercare. Cancellata, come
 * `withdrawal_is_master_only`, `restoration_is_master_only` e
 * `master_manage_required` prima di lei.
 */
export type MemberNoticeKind =
  | MemberActFailure
  | DeleteAccountFailure
  | "transport_unavailable";

/**
 * Three tones, because the three demand different things of the reader.
 *
 * `fault` — something broke; retrying is reasonable.
 * `refusal` — the system said no on purpose; retrying changes nothing.
 * `noop` — nothing was wrong and nothing happened.
 *
 * The tone drives the colour, and the colour is never the only channel: every
 * notice states in words which of the three it is
 * (`nextjs-architecture.md`, gate *accessibilità al buio*).
 */
type Tone = "fault" | "refusal" | "noop";

type Notice = { tone: Tone; title: string; body: string };

/**
 * The three tones, as INK — not as three tinted boxes.
 *
 * ── What changed in Phase 41, and what deliberately did not ─────────────────
 *
 * The three were raw palette tints with a coloured border each. They are the
 * declared semantics now, carried by the title's ink alone: `Dialog.tsx` fixed
 * that rule for this product, and the arithmetic is the same here — on the card
 * ground, `--sem-crit` is **6.99 : 1** and `--sem-warn` is above it, both
 * against WCAG 1.4.3's 4.5 : 1 for small text. A box around a paragraph is a
 * container that states nothing its content does not.
 *
 * **`noop` takes the plain heading ink and no semantic at all**, because
 * nothing is wrong when it is drawn: the fourth semantic would have been a
 * colour saying "completed" over a sentence explaining that nothing happened.
 *
 * **Not one word of any notice below is rewritten by this phase.** The tone
 * drives the colour and the colour is never the only channel — every notice
 * states in words which of the three it is — and `community-membership.md` is
 * explicit that the text of a refusal is written once, with care, and used the
 * same way every time. This edit is the ink; the sentences are somebody else's
 * decision, already taken.
 */
const TONE_STYLES: Record<Tone, { title: string }> = {
  fault: { title: "text-sem-crit" },
  refusal: { title: "text-sem-warn" },
  noop: { title: "text-ink" },
};

/** The seven server causes, one sentence each. No two collapse. */
const NOTICES: Record<MemberNoticeKind, Notice> = {
  capabilities_unavailable: {
    tone: "fault",
    title: "Permission check failed — this is not a refusal",
    body:
      "The database could not answer which capabilities this session holds, so " +
      "nothing was attempted and nothing was changed. This is an " +
      "infrastructure fault, not a statement about what you are allowed to do. " +
      "Retrying is reasonable; if it persists, check that the capability model " +
      "migration is applied and that EXECUTE on public.my_access_context() is " +
      "still granted to authenticated.",
  },

  // Refined by `detail` in `FORBIDDEN_BY_DETAIL` below — this entry is the one
  // a refusal falls back to, and it still names the code rather than hiding it.
  forbidden: {
    tone: "refusal",
    title: "The server refused this act",
    body:
      "Nothing was attempted and nothing was changed. This is a refusal, not a " +
      "fault: retrying will produce the same answer. The reason the server " +
      "gave is shown below.",
  },

  /**
   * The sentence plan 43-09 wrote, kept **verbatim** rather than reworded.
   *
   * It is the one cause in this vocabulary that can arrive from a RULE instead
   * of from a bug: `profiles_role_implies_approved` (plan 43-06) says a staff
   * role implies an approved account, and it fires on the day it fires — on a
   * path nobody tested, by definition. The wording names WHERE the refusal came
   * from on purpose, so that the day the constraint fires is not the day
   * somebody learns the word "redacted".
   */
  constraint_refused: {
    tone: "refusal",
    title:
      "This account holds a staff role, and a staff role must be approved — " +
      "the write was refused by the database, not by this screen",
    body:
      "Nothing was changed: the profile write and its register row are one " +
      "transaction, so the register does not claim an act the database " +
      "refused. Approve the account first, then set the role — or set both at " +
      "once with a role change, which moves the two axes in a single " +
      "statement. The constraint's name is in the server log; the code below " +
      "is what identified it here.",
  },

  subject_not_found: {
    tone: "refusal",
    title: "This account no longer exists",
    body:
      "The row was gone by the time the write ran, so nothing was changed and " +
      "nothing was recorded. Reload the list — what you are looking at is out " +
      "of date. This is a different thing from a refused write: there is " +
      "nothing here to retry.",
  },

  write_failed: {
    tone: "fault",
    title: "The write failed — nothing was changed",
    body:
      "The database refused or could not complete the write for a reason this " +
      "screen cannot name more precisely. Nothing was written to the account " +
      "and nothing was recorded in the register. The code below is the " +
      "diagnosis; retrying is reasonable once, and a second identical failure " +
      "is worth reporting rather than repeating.",
  },

  // Refined by `detail` in `NOTHING_TO_DO_BY_DETAIL` below.
  nothing_to_do: {
    tone: "noop",
    title: "Nothing to do — the request asked for no change",
    body:
      "No act was recorded, and that is correct rather than a shortfall: the " +
      "register has ten values and none of them means \"nothing happened\", " +
      "so writing one anyway would put a change in the history that the " +
      "database never performed.",
  },

  // ───────────────────────────────────────────────────────────────────────────
  // LE CAUSE DELLA CANCELLAZIONE — tredici insiemi, dodici frasi, e nessuna
  // dice «qualcosa è andato storto»
  // ───────────────────────────────────────────────────────────────────────────
  //
  // D-50-16: togliere l'accesso a qualcuno significa cancellare il suo account,
  // e l'azione **può rifiutare**. `50-MEASURES.md` M10 ha contato undici
  // vincoli che bloccano una cancellazione più i biglietti, che invece
  // cascherebbero — e un rifiuto che non dicesse QUALE traccia manderebbe
  // l'operatore a cercare a tentoni su una superficie dove ogni tentativo è
  // irreversibile appena riesce.
  //
  // **Il `detail` sotto ogni frase è la sola cosa che dice cosa andare a
  // togliere**, e in questo prodotto non esiste alcun error tracking: quella
  // riga è la sola diagnosi che esisterà mai.

  delete_account_has_tickets: {
    tone: "refusal",
    title: "This account holds tickets — it cannot be deleted",
    body:
      "Nothing was deleted. A ticket belongs to the person who bought it, and " +
      "the database would delete the tickets along with the account: that is " +
      "a cascade this product deliberately did not change, because the " +
      "alternative is editing a money path to make an administrative screen " +
      "easier. The count below is what blocks it. If access has to end, the " +
      "answer is not this button.",
  },

  delete_account_holds_assignments: {
    tone: "refusal",
    title: "This account is assigned to a night — it cannot be deleted",
    body:
      "Nothing was deleted. Deleting the account would take its per-night " +
      "assignments with it, and a revocation is never a deletion: the record " +
      "stays, because the door has to be able to ask later whether somebody " +
      "was assigned at the moment they scanned. Revoke the assignments from " +
      "the event's assignments page first — that is recorded — and the answer " +
      "here will change.",
  },

  delete_account_granted_assignments: {
    tone: "refusal",
    title: "This account granted assignments — it cannot be deleted",
    body:
      "Nothing was deleted. Every per-night assignment records who granted " +
      "it, and the database refuses to leave those rows without an author. " +
      "The count below is what blocks it.",
  },

  delete_account_has_door_scans: {
    tone: "refusal",
    title: "This account worked the door — it cannot be deleted",
    body:
      "Nothing was deleted. Every scan records the operator who performed it, " +
      "and the database refuses to leave those rows without one. This is the " +
      "door's own history and it is not rewritten from this screen.",
  },

  delete_account_checked_in_tickets: {
    tone: "refusal",
    title: "This account validated tickets at the door — it cannot be deleted",
    body:
      "Nothing was deleted. A validated ticket records who admitted its " +
      "holder. The count below is what blocks it.",
  },

  delete_account_checked_in_attendances: {
    tone: "refusal",
    title: "This account recorded attendances — it cannot be deleted",
    body:
      "Nothing was deleted. An attendance records who admitted the person, " +
      "and the database refuses to leave that column empty. The count below " +
      "is what blocks it.",
  },

  delete_account_admitted_guests: {
    tone: "refusal",
    title: "This account admitted guests — it cannot be deleted",
    body:
      "Nothing was deleted. A guest-list entry records who let its guest in. " +
      "The count below is what blocks it.",
  },

  delete_account_added_guests: {
    tone: "refusal",
    title: "This account created guest-list entries — it cannot be deleted",
    body:
      "Nothing was deleted. Every guest-list entry records who added it, and " +
      "that column cannot be left empty. The count below is what blocks it.",
  },

  delete_account_on_guest_list: {
    tone: "refusal",
    title: "This account is on a guest list — it cannot be deleted",
    body:
      "Nothing was deleted. The entry names this account as its guest. Remove " +
      "the entry from the night's guest list first, and the answer here will " +
      "change.",
  },

  delete_account_touched_refunds: {
    tone: "refusal",
    title: "This account requested or decided a refund — it cannot be deleted",
    body:
      "Nothing was deleted. A refund records who asked for it and who decided " +
      "it, and this is a money path: the record outlives the account. The " +
      "count below is what blocks it.",
  },

  delete_account_created_artists: {
    tone: "refusal",
    title: "This account created artists — it cannot be deleted",
    body:
      "Nothing was deleted. Catalogue rows record who created them. Hand the " +
      "artists over to another account first, or leave this one in place.",
  },

  delete_account_created_venues: {
    tone: "refusal",
    title: "This account created venues — it cannot be deleted",
    body:
      "Nothing was deleted. Catalogue rows record who created them. Hand the " +
      "venues over to another account first, or leave this one in place.",
  },

  /**
   * Il `23503` che passa fra il conteggio e la cancellazione, tradotto.
   *
   * Non è lo stesso evento degli altri dodici: là il conteggio ha visto e ha
   * rifiutato; qui il conteggio era pulito e **qualcosa è comparso nel
   * frattempo** — una voce di guest list aggiunta alle due di notte mentre
   * l'operatore guardava la lista. La frase dice di rileggere, perché quello
   * che si vede sullo schermo non è più vero.
   */
  delete_account_still_referenced: {
    tone: "refusal",
    title: "Something was written while this was being checked",
    body:
      "Nothing was deleted. The count taken a moment ago was clean, and the " +
      "database still refused: a row naming this account appeared between the " +
      "two — somebody added a guest, or the door scanned. Reload the list and " +
      "look again; what this screen was showing is out of date rather than " +
      "wrong. One thing did happen: the register carries a deletion row for " +
      "an account that still exists, with your name on it. That is the " +
      "deliberate order — a trace too many can be read, a deletion with no " +
      "trace cannot be contested.",
  },

  /**
   * PHASE 35 — the refusal that is a rule, and the one with a way out.
   *
   * `party_assignments` ties `(user_id, assignee_role)` to the live profile row,
   * so a role change aimed at somebody who holds a LIVE per-night assignment is
   * refused by the database with `23503`. That is the rule working: a member of
   * staff with a live door assignment cannot quietly become a `member` while the
   * assignment keeps resolving at the door.
   *
   * **The `detail` under this notice is the list of blocking nights**, and it is
   * the one detail on this surface that carries data rather than a closed
   * literal. `20260809000000_party_assignments.sql` section 3c requires it: a
   * generic refusal here is the recorded newsletter defect on an urgent path, in
   * a product with no error tracking, so the answer has to name what blocks.
   */
  live_assignments_block_demotion: {
    tone: "refusal",
    title:
      "This person is assigned to a night — revoke the assignments first, then change the role",
    body:
      "Nothing was changed. A live per-night assignment names the role its " +
      "holder had when it was granted, so the database refuses to move that " +
      "role out from under it — for a demotion and for a promotion alike. The " +
      "nights that block it are listed below. Revoke them from the event's " +
      "assignments page and set the role afterwards, or use the single action " +
      "that does both: it revokes each assignment, then changes the role, and " +
      "records them as the separate acts they are. A revocation is never a " +
      "deletion — it stays in the record, because the door has to be able to " +
      "ask later whether somebody was assigned at the moment they scanned.",
  },

  /**
   * The state nobody chose. Its own cause because `write_failed`'s sentence
   * promises *"nothing was written"*, and here that would be false.
   */
  revocation_incomplete: {
    tone: "fault",
    title:
      "Some assignments were revoked and the role was NOT changed — the account is between two states",
    body:
      "The combined action stopped at the first revocation it could not " +
      "perform, deliberately: changing the role after only some of them would " +
      "have left a night without the person covering it and an account whose " +
      "role no longer matches anything. What was revoked is revoked and is " +
      "recorded; the role is untouched. Open the event's assignments page and " +
      "look at what remains before trying again — the count below says how far " +
      "it got.",
  },

  transport_unavailable: {
    tone: "fault",
    title: "The server did not answer",
    body:
      "The request did not complete, so there is no result to read — and, " +
      "unlike every other notice here, this one cannot tell you whether the " +
      "write landed. Reload the list and look at the account before trying " +
      "again.",
  },
};

/**
 * `forbidden` e' un'etichetta sola che copre rifiuti distinti, e dire a una
 * persona soltanto *«non hai il permesso»* li collasserebbe esattamente come il
 * difetto registrato del form newsletter collassa le sue tre cause.
 *
 * ── LE CAUSE USCITE DI QUI, e toglierle e' il punto ──────────────────────────
 *
 * `withdrawal_is_master_only`, `restoration_is_master_only` e
 * `master_manage_required` sono uscite il 2026-08-08, quando la decisione del
 * proprietario ha tolto la riserva al master e `verifyMaster` ha smesso di
 * esistere in `admin/members/actions.ts`.
 *
 * `self_approve`, `self_reject`, `self_deactivate`, `self_reactivate` e
 * `readmission_before_role_change` sono uscite con la **fase 50**: nominavano
 * atti sull'asse dello stato, che non esiste piu' (D-50-01). Il server non puo'
 * piu' produrre nessuno di quei valori.
 *
 * Si cancellano invece di lasciarle al loro posto, perche' una causa gestita e'
 * dove un lettore successivo smette di cercare — il piano 43-09 trovo' due
 * `catch` diventati irraggiungibili e il 43-14 un commento che accanto negava
 * il difetto.
 *
 * `self_delete` non e' la loro sostituta: e' il gemello di `self_role_change`
 * sull'unico atto distruttivo rimasto, ed e' quello in cui la regola *nessun
 * atto raggiunge il proprio autore* costa di piu'.
 *
 * Every key below is a `detail` literal chosen by `admin/members/actions.ts`
 * — a value, not a message, and therefore safe to branch on and safe to render.
 */
const FORBIDDEN_BY_DETAIL: Record<string, Notice> = {
  staff_manage_required: {
    tone: "refusal",
    title: "This session cannot change or delete an account",
    body:
      "Nothing was attempted. Changing a role, creating an account and " +
      "deleting one are reserved to a master or an organizer — one gate for " +
      "all three, and deliberately not a narrower one for the destructive " +
      "act: a restriction reachable through a sibling with a wider gate is " +
      "not a restriction. If you believe you are one of those, sign out and " +
      "back in: the answer came from the capability model, not from this page.",
  },
  subject_is_master: {
    tone: "refusal",
    title: "No act on this surface can be aimed at the master, by anybody",
    body:
      "Nothing was changed. The refusal comes from the server, not from this " +
      "screen: the table hides the control on a master's row, and hiding a " +
      "control is not the same as refusing a request — a Server Action is a " +
      "public endpoint with a convenient signature. It covers every act here " +
      "— the role change and the deletion alike — because a restriction " +
      "reachable through a sibling act is not a restriction. Changing who " +
      "holds the top role is done through the deployment environment, which " +
      "is the one place it is recorded.",
  },
  self_role_change: {
    tone: "refusal",
    title: "You cannot change your own role",
    body:
      "Nothing was changed. Every act on somebody's account is recorded with " +
      "its author, and an act whose author and subject are the same person is " +
      "the one shape that attribution cannot make safe. Ask another master or " +
      "organizer.",
  },
  self_delete: {
    tone: "refusal",
    title: "You cannot delete your own account",
    body:
      "Nothing was deleted. It is the same refusal as changing your own role, " +
      "and here it costs the most it can: deleting yourself would take away " +
      "the session that could put it right, and nothing about a deletion can " +
      "be put right — this repository has no point-in-time recovery. Ask " +
      "another master or organizer.",
  },
  role_not_writable: {
    tone: "refusal",
    title: "That role cannot be granted from here",
    body:
      "Nothing was changed. Three roles can be written by this surface — " +
      "member, staff and organizer — and master is not one of them: a " +
      "self-replicating power must not reach the top. The ceiling is held in " +
      "the action and re-tested against the request body, so it is not the " +
      "menu that refused, and adding an option to the menu would not add a " +
      "capability.",
  },
};

/**
 * `nothing_to_do` copre le situazioni che vogliono passi successivi diversi.
 *
 * `status_unchanged` e `no_subjects_selected` sono uscite con la fase 50: la
 * prima nominava un asse che non esiste piu', la seconda l'azione in blocco che
 * non esiste piu'. Nessuna delle due e' piu' producibile dal server.
 */
const NOTHING_TO_DO_BY_DETAIL: Record<string, Notice> = {
  role_unchanged: {
    tone: "noop",
    title: "This account already holds that role",
    body:
      "No act was recorded, on purpose: a role change that changes no role is " +
      "not an event, and writing one would put a transition in the register " +
      "that never happened. Nothing is wrong here.",
  },
};

/**
 * The notice for a cause, refined by its detail where the detail carries a
 * distinct meaning.
 *
 * An unrecognised detail deliberately falls back to the CAUSE's own notice and
 * still shows the raw value underneath. That is not a shared "action failed":
 * the reader is told which category the refusal belongs to and is shown the
 * exact word the server used, which is the smallest honest answer this surface
 * can give for a value it does not yet have a sentence for.
 */
export function resolveMemberNotice(
  kind: MemberNoticeKind,
  detail?: string
): Notice {
  if (kind === "forbidden" && detail && FORBIDDEN_BY_DETAIL[detail]) {
    return FORBIDDEN_BY_DETAIL[detail];
  }
  if (kind === "nothing_to_do" && detail && NOTHING_TO_DO_BY_DETAIL[detail]) {
    return NOTHING_TO_DO_BY_DETAIL[detail];
  }
  return NOTICES[kind];
}

export default function MemberActionNotice({
  kind,
  detail,
  subject,
  compact = false,
}: {
  kind: MemberNoticeKind;
  /**
   * The action's `detail` — a code chosen from a closed set, never a message.
   *
   * It is rendered verbatim in a monospace line, following
   * `newsletter/FailureNotice.tsx`. Residual, named rather than left to be
   * discovered: two of the six causes (`capabilities_unavailable` and the
   * `write_failed` raised by an unexpected throw) carry an error *message*
   * rather than a code, because that is what `guarded` has to hand. On an
   * admin-only surface with no error tracking anywhere in the product, showing
   * it is the lesser cost — the alternative deletes the only diagnosis that
   * will ever exist.
   */
  detail?: string;
  /** Who the act was aimed at, when the notice is about one row of a batch. */
  subject?: string;
  /** Inside a table cell the body would break the row; the title carries it. */
  compact?: boolean;
}) {
  const notice = resolveMemberNotice(kind, detail);
  const styles = TONE_STYLES[notice.tone];

  // 11px is not a declared size (§6.4). The diagnostic line takes the label
  // size, 12px, at `--muted` on `--surface` — **6.78 : 1**. It is the one line
  // on this surface a person reads out to somebody else, so it is the last one
  // that should be the smallest thing on screen.
  if (compact) {
    return (
      <span role="alert" className={`text-xs ${styles.title}`}>
        {subject ? <span className="font-semibold">{subject}: </span> : null}
        {notice.title}.{" "}
        <span className="text-muted">{notice.body}</span>
        {detail ? (
          <span className="ml-1 font-mono text-xs text-muted">({detail})</span>
        ) : null}
      </span>
    );
  }

  return (
    <Card role="alert">
      <p className={`text-sm font-semibold ${styles.title}`}>
        {subject ? <span className="font-semibold">{subject} — </span> : null}
        {notice.title}
      </p>
      <p className="mt-1 text-xs text-muted">{notice.body}</p>
      {detail ? (
        <p className="mt-2 break-words font-mono text-xs text-muted">
          {detail}
        </p>
      ) : null}
    </Card>
  );
}
