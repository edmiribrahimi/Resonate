"use server";

import { revalidatePath } from "next/cache";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { getServiceClient } from "@/lib/supabase/service";

import {
  UUID_PATTERN,
  optionalText,
  optionalUuid,
  validateSectionDraft,
  type QuestionDraft,
  type SectionDraft,
  type SectionWriteResult,
} from "@/lib/production/sections/write-contract";
import type { SectionKind } from "@/lib/production/sections/vocabulary";

/**
 * The sound manifesto's write paths, and the register of what nobody has
 * decided.
 *
 * ── TWO MODULES AND NOT ONE, AND THE REASON IS THE KEY ──────────────────────
 *
 * D-45-06 makes the key that READS a section the key that WRITES it. Every
 * export of a `"use server"` module is a **public endpoint with a convenient
 * signature**, so a single shared module holding both sections' acts would
 * publish this section's write endpoints to a holder of the other section's key
 * — and no build, no policy and no log would say so. The sibling one directory
 * over asks its own key and neither imports the other's gate.
 *
 * What the two legitimately share lives in
 * `src/lib/production/sections/write-contract.ts`, which is a **plain module**:
 * a union of refusal names, three shapes, and the checks that run before the
 * database is asked. `may-upload.ts:27-34` records why a predicate must not be
 * left in a `"use server"` file — it publishes an oracle.
 *
 * ── The section is PINNED here, and it is not an argument ───────────────────
 *
 * Every row this module writes carries `section = 'manifesto'`, from the
 * constant below and from nowhere a caller can reach. A caller able to name the
 * section could write the other section's rules from behind this key, and the
 * split into two modules would be a decoration. The same rule governs the
 * register: this module writes and closes only entries this key can read back —
 * the brand-wide ones and this section's — because a write nobody holding the
 * key can see is a silent failure with a success message on top of it.
 *
 * ── Why the gate is asked here, and it is not belt-and-braces ───────────────
 *
 * Being imported from a page a capability opened protects nothing
 * (`nextjs-architecture.md`, gate *server action autorizzata*). The gate is
 * called FIRST in each export and the service client is constructed AFTER it: an
 * ordering slip turns an act into an unauthenticated write path, and no build
 * would see it. The gate is **not exported**, for the reason
 * `calendar/actions.ts:78-82` gives.
 *
 * ── Why the SERVICE client, with the proof that no untrusted input reaches it ─
 *
 * `20260817120300_production_sections_access.sql` gives `production_section` and
 * `production_open_question` `SELECT` arms and **no write arm at all**. With row
 * level security enabled and no other arm, every session is refused a write on
 * them through PostgREST, so the service client is not a preference: it is the
 * only client that can write here.
 *
 * `access-gating.md` requires a new service-client use to be justified in
 * writing and to prove that no untrusted input reaches it. Every identifier is
 * shape-checked against the uuid pattern **before** any query; the one
 * closed-set value is checked for membership of the tuple that mirrors its SQL
 * `CHECK`; nothing is concatenated into a query and every value travels as a
 * parameter.
 *
 * The uncomfortable corollary, written here rather than left to be discovered:
 * **if the gate below is removed, nothing underneath refuses.**
 *
 * ── Every refusal is a RETURNED value ──────────────────────────────────────
 *
 * Next **redacts** the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`), so a cause carried
 * in a thrown message reaches the reader as a blank exactly where it counts. A
 * refusal nobody can read is a silent failure, and this product has **no error
 * tracking at all**. So every failure is a value with its own name, and the only
 * two throws in this file are the gate's two categories.
 *
 * ── What is logged, and the two things that never reach a log ──────────────
 *
 * The error's code and its message, and nothing else. Never the error object,
 * and never PostgREST's third field — the one it fills with the **entire
 * rejected row**. A rejected row here carries authored prose, and authored prose
 * can quote a line-up nobody has announced: a person who has agreed to play on a
 * date nobody has communicated is material in exactly the sense a space under
 * negotiation is. The field's name is deliberately not spelled anywhere in this
 * file, for the reason `formats/actions.ts:58-63` gives about its own forbidden
 * literal.
 *
 * ── There is no delete export, and there will not be one ───────────────────
 *
 * A question that was asked stays asked. Closing one means **writing what was
 * decided** — the answer is required by this module and again by
 * `production_open_question_closed_xor_resolution` — and a register whose
 * entries can be removed is a register that records what somebody was
 * comfortable remembering.
 *
 * ── Nothing here writes a manifesto, and nothing here fills one in ─────────
 *
 * `sound-manifesto.md` names two opposite errors, and this module is shaped so
 * that it commits neither. It never infers a state: an empty body does not make
 * a rule undecided, and a full one does not make it written. It never supplies
 * text: no default title, no default gap, no adjective describing a sound, a
 * genre or a palette. **Saving nothing stays possible** — a rule can be recorded
 * as undecided, naming its gap and the role that closes it, and that is the
 * answer *not yet written*, not the absence of one.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * What this module is allowed to touch
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The one section this module writes. Pinned, never an argument.
 *
 * Typed as `SectionKind` so that a value outside the tuple that mirrors
 * `production_section_section_check` is a `npm run build` error here rather than
 * a constraint violation at run time.
 */
const THIS_SECTION: SectionKind = "manifesto";

/**
 * The register entries this key may write and close: this section's, and the
 * brand-wide ones.
 *
 * `production_open_question.section` is nullable and carries **no vocabulary
 * check**, deliberately — the register spans all four sections and a question
 * can bear on the whole brand rather than on one body of rules. That freedom is
 * right for the column and wrong for one key's write path: the table has five
 * separate `SELECT` arms, so an entry filed under another section would be a row
 * this key cannot read back.
 */
function mayTouchQuestion(section: string | null): boolean {
  return section === null || section === THIS_SECTION;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The gate — asked once per export, and deliberately not exported
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Shape copied from `location/actions.ts:170-188`, including the two separate
 * throw categories: an unresolvable identity is **not** a refusal on the merits
 * — it means the migration that puts the caller's id in the payload is not
 * applied — and collapsing the two is the pattern `meta-gates.md` forbids.
 *
 * It returns the context it resolved, so no export re-asks. `cache()` does not
 * memoise inside a Server Action body (`capabilities/server.ts:104-116`,
 * measured in phase 33), so a second call is a second full round trip and no
 * compiler sees it: **more than one `await assertManifestoSection(` in one
 * export is the defect.**
 *
 * @throws `forbidden.production_manifesto_manage_required` — the answer is no.
 * @throws `capabilities.identity_missing` — the payload carried no caller id.
 */
async function assertManifestoSection(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_MANIFESTO_MANAGE)) {
    throw new Error("forbidden.production_manifesto_manage_required");
  }

  if (!userId) {
    console.error(
      "[manifesto.identity_missing] section=none " +
        "code=identity_missing message=a caller holds the manifesto key and the " +
        "access context resolved no caller id. This is NOT a refusal on the " +
        "merits — the migration that adds the caller to the payload is not applied."
    );
    throw new Error("capabilities.identity_missing");
  }

  return { userId };
}

/** The one client this module uses, named so the helpers can be typed. */
type SectionClient = ReturnType<typeof getServiceClient>;

/**
 * Both surfaces that draw what this module writes.
 *
 * The visual page is here too, and it is not an overreach: a brand-wide register
 * entry — one with no section — is drawn on **both** authored surfaces, because
 * a question about the spelling or the order of publication belongs to neither
 * body of rules alone. Revalidating a path is cache invalidation and grants
 * nothing; leaving it out would leave the other surface showing a question
 * somebody has already closed.
 */
function revalidateSection() {
  revalidatePath("/admin/manifesto");
  revalidatePath("/admin/visual");
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE ONE — a rule of the manifesto, in the state its author chose
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Record or correct one rule of the sound manifesto.
 *
 * ⚠ **`state` is a required field of the draft with no default anywhere** — not
 * in the column, not in this argument, and not in the control that fills it. The
 * two candidate defaults are wrong in opposite directions, which is why neither
 * exists: *written* fills a void nobody filled, and *not decided* answers for a
 * coordinate that has been declared. `sound-manifesto.md` names both errors, and
 * the middle state is the whole reason the vocabulary has three members.
 *
 * ⚠ **Nothing here infers it.** The check lives in `validateSectionDraft`, and
 * the prohibition is written in that file too: an empty body does not make a
 * rule undecided, and a full one does not make it written.
 *
 * **The explicit negatives go in the body**, with the rest of the rule. There is
 * deliberately no column for them: a `negatives` column invites a surface that
 * draws the positives and drops them, which is the exact failure the exclusions
 * were written to prevent, rebuilt one layout at a time.
 *
 * `id === null` records a new rule; an id corrects one, and only one this key
 * owns — the read below is what stops this act from editing the other section's
 * rules by way of an identifier.
 */
export async function saveSection(
  id: string | null,
  draft: SectionDraft
): Promise<SectionWriteResult> {
  // Asked FIRST, and once. The client is constructed after it, never before.
  const { userId } = await assertManifestoSection();

  if (id !== null && (typeof id !== "string" || !UUID_PATTERN.test(id))) {
    return { ok: false, reason: "invalid_id" };
  }

  const checked = validateSectionDraft(draft);
  if (!checked.ok) return checked;

  const client = getServiceClient();
  const now = new Date().toISOString();

  if (id === null) {
    const { error } = await client.from("production_section").insert({
      section: THIS_SECTION,
      title: checked.value.title,
      format_id: checked.value.format_id,
      state: checked.value.state,
      body: checked.value.body,
      missing: checked.value.missing,
      decision_owner: checked.value.decision_owner,
      updated_by: userId,
    });

    if (error) {
      console.error(
        `[manifesto.create_failed] section=new code=${error.code ?? "unknown"} message=${error.message}`
      );
      return { ok: false, reason: "write_failed" };
    }

    revalidateSection();
    return { ok: true };
  }

  const guard = await loadSection(client, id);
  if (!guard.ok) return guard;

  const { error } = await client
    .from("production_section")
    .update({
      title: checked.value.title,
      format_id: checked.value.format_id,
      state: checked.value.state,
      body: checked.value.body,
      missing: checked.value.missing,
      decision_owner: checked.value.decision_owner,
      updated_at: now,
      updated_by: userId,
    })
    .eq("id", id);

  if (error) {
    console.error(
      `[manifesto.save_failed] section=${id} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();
  return { ok: true };
}

/**
 * The rule, read for the one fact that decides whether this key may write it.
 *
 * It reads through the service client, like the write that follows it, and that
 * is deliberate: a pre-check performed with a client the write does not use is a
 * pre-check about a different question. The entitlement was settled by the gate;
 * this settles **which section the row belongs to**, which the gate cannot,
 * because both sections live in one table.
 *
 * ⚠ It does **not** read the body. A guard has no use for authored prose, and a
 * value that is never loaded is a value that cannot reach a log.
 */
async function loadSection(
  client: SectionClient,
  sectionId: string
): Promise<{ ok: true } | { ok: false; reason: "read_failed" | "section_not_found" | "section_not_ours" }> {
  const { data, error } = await client
    .from("production_section")
    .select("id, section")
    .eq("id", sectionId)
    .maybeSingle();

  if (error) {
    console.error(
      `[manifesto.section_read_failed] section=${sectionId} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "read_failed" };
  }

  if (data === null) {
    return { ok: false, reason: "section_not_found" };
  }

  const row = data as unknown as { section: string };
  if (row.section !== THIS_SECTION) {
    return { ok: false, reason: "section_not_ours" };
  }

  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE TWO — a question is opened, and it stops nothing
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Put a question in the register.
 *
 * ⚠ **Both text fields are required, and the second is the point of the
 * register.** A question with no owner is the state the register was built to
 * abolish — it is what distinguishes a register from a list of complaints — and
 * `decision_owner` is `NOT NULL` in the column for that reason. A **role**, never
 * a person: this repository is public, and a decision attributed to a name ages
 * badly the moment somebody leaves.
 *
 * ⚠ **Nothing written here blocks anything** (D-45-15, inheriting D-44-16). The
 * entry warns on the surface that depends on it and lets the work proceed,
 * because a block that fires under deadline is a block somebody routes around —
 * and a routed-around block also teaches people to route around the next one.
 * There is no column, no flag and no return value through which an entry could
 * take a control out of service.
 *
 * **What the question may say:** a criterion — *is the sound one manifesto or one
 * per venue* — and never a candidate. No space under negotiation, no unannounced
 * date, no line-up. The rule is the writer's to keep; it is repeated here because
 * this is the act that puts the row in a table.
 */
export async function openQuestion(
  draft: QuestionDraft
): Promise<SectionWriteResult> {
  await assertManifestoSection();

  const question = optionalText(draft?.question);
  if (question === null) {
    return { ok: false, reason: "question_missing" };
  }

  const decision_owner = optionalText(draft?.decision_owner);
  if (decision_owner === null) {
    return { ok: false, reason: "decision_owner_missing" };
  }

  const section = optionalText(draft?.section);
  if (!mayTouchQuestion(section)) {
    return { ok: false, reason: "section_not_ours" };
  }

  const format = optionalUuid(draft?.format_id);
  if (!format.ok) {
    return { ok: false, reason: "invalid_format_id" };
  }

  const client = getServiceClient();

  const { error } = await client.from("production_open_question").insert({
    question,
    decision_owner,
    section,
    format_id: format.value,
  });

  if (error) {
    console.error(
      `[manifesto.question_failed] section=${section ?? "brandwide"} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();
  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE THREE — closing one means writing what was decided
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Close a question, with its answer.
 *
 * ⚠ **The resolution is required**, and it is refused twice: here, where the
 * reason can be a sentence, and by
 * `production_open_question_closed_xor_resolution`, which is the boundary. A
 * question closed without its answer is a question that will be reopened — the
 * register kept the question and lost the only thing it was keeping it for.
 *
 * ⚠ **Closing is not deleting, and there is no delete export in this module.**
 * A closed entry stays in the table with its answer beside it; the surfaces stop
 * warning about it because they read only the open ones, which is a different
 * fact from it having never been asked.
 */
export async function closeQuestion(
  id: string,
  resolution: unknown
): Promise<SectionWriteResult> {
  await assertManifestoSection();

  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return { ok: false, reason: "invalid_id" };
  }

  const answer = optionalText(resolution);
  if (answer === null) {
    return { ok: false, reason: "resolution_missing" };
  }

  const client = getServiceClient();

  const { data, error: readError } = await client
    .from("production_open_question")
    .select("id, section, closed_at")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error(
      `[manifesto.question_read_failed] section=unknown code=${readError.code ?? "unknown"} message=${readError.message}`
    );
    return { ok: false, reason: "read_failed" };
  }

  if (data === null) {
    return { ok: false, reason: "question_not_found" };
  }

  const row = data as unknown as {
    section: string | null;
    closed_at: string | null;
  };

  if (!mayTouchQuestion(row.section)) {
    return { ok: false, reason: "section_not_ours" };
  }

  if (row.closed_at !== null) {
    return { ok: false, reason: "already_closed" };
  }

  const now = new Date().toISOString();

  const { error } = await client
    .from("production_open_question")
    .update({ closed_at: now, resolution: answer, updated_at: now })
    .eq("id", id);

  if (error) {
    console.error(
      `[manifesto.close_failed] section=${row.section ?? "brandwide"} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();
  return { ok: true };
}
