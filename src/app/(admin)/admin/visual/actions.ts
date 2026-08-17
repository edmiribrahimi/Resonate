"use server";

import { revalidatePath } from "next/cache";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { getServiceClient } from "@/lib/supabase/service";

import {
  UUID_PATTERN,
  validateSectionDraft,
  type SectionDraft,
  type SectionWriteResult,
} from "@/lib/production/sections/write-contract";
import type { SectionKind } from "@/lib/production/sections/vocabulary";

/**
 * The visual capitolato's write path — one clause at a time, behind this
 * section's own key.
 *
 * ── TWO MODULES AND NOT ONE, AND THE REASON IS THE KEY ──────────────────────
 *
 * D-45-06 makes the key that READS a section the key that WRITES it. Every
 * export of a `"use server"` module is a **public endpoint with a convenient
 * signature**, so a single shared module holding both authored sections' acts
 * would publish this section's write endpoint to a holder of the other
 * section's key — and no build, no policy and no log would say so. The sibling
 * one directory over asks its own key; this file imports neither its gate nor
 * its acts, and the assertion is mechanical: this module names one capability
 * constant and the sibling names a different one.
 *
 * What the two legitimately share lives in
 * `src/lib/production/sections/write-contract.ts`, which is a **plain module**:
 * a union of refusal names, three shapes, and the checks that run before the
 * database is asked. `may-upload.ts:27-34` records why a predicate must not be
 * left in a `"use server"` file — it publishes an oracle.
 *
 * ── The section is PINNED here, and it is not an argument ───────────────────
 *
 * Every row this module writes carries `section = 'visual'`, from the constant
 * below and from nowhere a caller can reach; and the read before every
 * correction refuses a row that belongs to the other section. Both tables are
 * shared by both sections, so without that check an identifier would be enough
 * to edit rules this key never opened.
 *
 * ── Why the gate is asked here, and why the SERVICE client ─────────────────
 *
 * Being imported from a page a capability opened protects nothing
 * (`nextjs-architecture.md`, gate *server action autorizzata*). The gate is
 * called FIRST and the client is constructed AFTER it; it is **not exported**,
 * for the reason `calendar/actions.ts:78-82` gives.
 *
 * `20260817120300_production_sections_access.sql` gives `production_section` a
 * `SELECT` arm and **no write arm at all**, so with row level security enabled
 * every session is refused a write through PostgREST and the service client is
 * the only client that can write here. Every identifier is shape-checked against
 * the uuid pattern before any query, the one closed-set value is checked against
 * the tuple that mirrors its SQL `CHECK`, nothing is concatenated into a query,
 * and every value travels as a parameter.
 *
 * **If the gate below is removed, nothing underneath refuses.**
 *
 * ── Every refusal is a RETURNED value, and every log carries two fields ────
 *
 * Next redacts the message of an error thrown out of a Server Action in a
 * production build, so a cause carried in a thrown message reaches the reader as
 * a blank exactly where it counts — and this product has **no error tracking at
 * all**. So each failure is a value with its own name, and the only two throws
 * are the gate's two categories.
 *
 * What reaches a log is the error's code and its message, and nothing else.
 * Never the error object, and never PostgREST's third field, the one it fills
 * with the **entire rejected row**: a rejected row here carries the capitolato's
 * own prose, and the capitolato is the document that leaves the perimeter. The
 * field's name is deliberately not spelled anywhere in this file.
 *
 * ── What this module may not write, which is the section's whole discipline ─
 *
 *   * **No space, ever.** The capitolato goes to the external designer, and
 *     `venue-secrecy.md` calls it an exit route. This module touches no venue
 *     table, takes no venue argument and has no venue field: what a clause can
 *     name is what will leave.
 *   * **No allusion to a sound.** Where a format's sonic identity is unwritten,
 *     its materials carry no genre, no reference to a scene and no adjective that
 *     sounds like a promise. Nothing here supplies text of any kind.
 *   * **No palette borrowed to fill a gap.** A format with no palette keeps its
 *     materials neutral; this module writes prose an author typed and invents no
 *     colour, no gradient and no default.
 *   * **No delete path**, and there will not be one.
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
const THIS_SECTION: SectionKind = "visual";

/* ────────────────────────────────────────────────────────────────────────────
 * The gate — asked once per export, and deliberately not exported
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The sibling's shape, with this section's key, including the two separate throw
 * categories: an unresolvable identity is **not** a refusal on the merits — it
 * means the migration that puts the caller's id in the payload is not applied —
 * and collapsing the two is the pattern `meta-gates.md` forbids.
 *
 * `cache()` does not memoise inside a Server Action body
 * (`capabilities/server.ts:104-116`, measured in phase 33), so a second call is a
 * second full round trip and no compiler sees it: **more than one
 * `await assertVisualSection(` in one export is the defect.**
 *
 * @throws `forbidden.production_visual_manage_required` — the answer is no.
 * @throws `capabilities.identity_missing` — the payload carried no caller id.
 */
async function assertVisualSection(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_VISUAL_MANAGE)) {
    throw new Error("forbidden.production_visual_manage_required");
  }

  if (!userId) {
    console.error(
      "[visual.identity_missing] section=none " +
        "code=identity_missing message=a caller holds the visual key and the " +
        "access context resolved no caller id. This is NOT a refusal on the " +
        "merits — the migration that adds the caller to the payload is not applied."
    );
    throw new Error("capabilities.identity_missing");
  }

  return { userId };
}

/** The one client this module uses, named so the helper can be typed. */
type SectionClient = ReturnType<typeof getServiceClient>;

/**
 * The one surface that draws what this module writes.
 *
 * Only this one, and the narrowness is deliberate: a clause of the capitolato is
 * drawn on the visual surface and nowhere else. The register — whose brand-wide
 * entries do appear on both authored pages — is not written from here.
 */
function revalidateSection() {
  revalidatePath("/admin/visual");
}

/* ────────────────────────────────────────────────────────────────────────────
 * THE ONE WRITE — a clause of the capitolato, in the state its author chose
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Record or correct one clause of the visual capitolato.
 *
 * ⚠ **`state` is a required field of the draft with no default anywhere** — not
 * in the column, not in this argument, and not in the control that fills it. The
 * two candidate defaults are wrong in opposite directions, which is why neither
 * exists: *written* fills a void nobody filled, and *not decided* answers for a
 * rule that has already been half-settled. The middle state is the whole reason
 * the vocabulary has three members.
 *
 * ⚠ **Nothing here infers it.** The check lives in `validateSectionDraft`, and
 * the prohibition is written in that file too: an empty body does not make a
 * clause undecided, and a full one does not make it written.
 *
 * **The explicit negatives go in the body**, with the rest of the clause —
 * *no palm trees*, *never the venue's logo*, *the sunset gradient belongs to one
 * format*. There is deliberately no column for them: a `negatives` column invites
 * a surface that draws the permissions and drops the prohibitions, which is the
 * exact failure the exclusions were written to prevent.
 *
 * `id === null` records a new clause; an id corrects one, and only one this key
 * owns.
 */
export async function saveSection(
  id: string | null,
  draft: SectionDraft
): Promise<SectionWriteResult> {
  // Asked FIRST, and once. The client is constructed after it, never before.
  const { userId } = await assertVisualSection();

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
        `[visual.create_failed] section=new code=${error.code ?? "unknown"} message=${error.message}`
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
      `[visual.save_failed] section=${id} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();
  return { ok: true };
}

/**
 * The clause, read for the one fact that decides whether this key may write it.
 *
 * It reads through the service client, like the write that follows it: a
 * pre-check performed with a client the write does not use is a pre-check about
 * a different question. The entitlement was settled by the gate; this settles
 * **which section the row belongs to**, which the gate cannot, because both
 * authored sections live in one table.
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
      `[visual.section_read_failed] section=${sectionId} code=${error.code ?? "unknown"} message=${error.message}`
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
