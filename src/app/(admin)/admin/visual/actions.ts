"use server";

import { revalidatePath } from "next/cache";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { getServiceClient } from "@/lib/supabase/service";

import { createClient } from "@/lib/supabase/server";

import {
  UUID_PATTERN,
  validateSectionDraft,
  type SectionDraft,
  type SectionWriteResult,
} from "@/lib/production/sections/write-contract";
import {
  ARCHIVE_SIGNATURE_SECONDS,
  areUuids,
  validateVisualAsset,
  type ArchiveSignatureResult,
  type VisualAssetDraft,
  type VisualAssetResult,
} from "@/lib/production/sections/visual-archive";
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

/* ────────────────────────────────────────────────────────────────────────────
 * THE ARCHIVE — the material half, and it is the half that has a deadline
 *
 * The capitolato above says how a piece is produced. What follows records what a
 * piece is produced FROM, and the two live on one surface because separating
 * them is what produces a rule nobody applies and a photograph nobody finds.
 *
 * ⚠ WHY THE ARCHIVE IS NOT A CONVENIENCE. The listing goes out two days before
 * the night, so THAT NIGHT'S PHOTOGRAPH CANNOT EXIST YET. At an artist's first
 * date there is only their press photo; from the second, the piece is pulled
 * from an archive somebody has been building every Thursday. An archive nobody
 * fills is a format that stays dependent on whatever arrives on the Monday for
 * the Tuesday — which is the dependency this table was created to end.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Record one archive row: a photograph of an artist, or a produced piece.
 *
 * ⚠ **The bytes never come through here.** This act takes a stored object KEY
 * and nothing else about the object — no form payload, no binary, no stream.
 * That is forced rather than chosen: a Vercel Function refuses a body over
 * 4.5 MB and this product accepts photographs up to 50 MB, so the browser
 * deposits into the private quarantine bucket and
 * `POST /api/media/finalize-archive` strips the metadata and writes the result
 * into the private archive bucket. The reasoning and its source are in the
 * header of `src/app/api/media/finalize/route.ts`.
 *
 * ⚠ **This act does not check that the object exists.** The arm that wrote it
 * answered with the key it stored, and the caller passes that answer. A row
 * recorded for an object nobody wrote would count something that is not there —
 * which is why the uploader records only on the arm's `ok`, and why
 * `object_key_missing` is a named refusal rather than an empty string reaching
 * a `NOT NULL` column.
 *
 * ⚠ **The spelling of a name is verified at the source, and nothing here can do
 * it.** A misspelling is irrecoverable once it reaches a published piece and it
 * is a discourtesy to whoever is playing. The check below can only refuse an
 * ABSENT name on the kind that needs one; the surface says the rest in words.
 */
export async function recordVisualAsset(
  draft: VisualAssetDraft
): Promise<VisualAssetResult> {
  // Asked FIRST, and once. The client is constructed after it, never before.
  const { userId } = await assertVisualSection();

  const checked = validateVisualAsset(draft);
  if (!checked.ok) return checked;

  // The service client, for the reason the header gives: with row level
  // security enabled and no write arm on this table, every session is refused a
  // write through PostgREST. Every value below has passed a shape check, nothing
  // is concatenated into a query, and every value travels as a parameter.
  const { error } = await getServiceClient()
    .from("production_visual_asset")
    .insert({
      kind: checked.value.kind,
      object_key: checked.value.object_key,
      artist_name: checked.value.artist_name,
      format_id: checked.value.format_id,
      taken_on: checked.value.taken_on,
      created_by: userId,
    });

  if (error) {
    // `code` and `message`, never the error object and never PostgREST's third
    // field — which carries THE WHOLE REJECTED ROW, and a rejected row here
    // carries an artist's name and a storage key. The field's name is
    // deliberately not spelled anywhere in this module.
    console.error(
      `[visual.asset_write_failed] section=archive code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();
  return { ok: true };
}

/**
 * Mint a short-lived address for each of the archive rows named.
 *
 * ── WHY A SIGNATURE AND NOT A URL ───────────────────────────────────────────
 *
 * The archive bucket is **private**, has no anonymous read arm and has no client
 * write arm at all (`20260817120400_visual_archive_bucket.sql`, sections 3 and
 * 4). An archive photograph is **not published**: it is held so that a listing
 * can be produced from it later, and a photograph of somebody who has agreed to
 * play on a date nobody has communicated is material in exactly the sense a
 * space under negotiation is. So a thumbnail on this surface exists **because
 * the server signed for it**, briefly — the same door as the rest of the
 * section rather than a second one.
 *
 * The repair this design exists to make unnecessary is named in that migration
 * so it is recognised when somebody proposes it in good faith: *"the thumbnails
 * do not load — add a public read arm on the bucket."* That would make the whole
 * archive readable by URL, with no session, to anybody holding a key.
 *
 * ── THE COOKIE-BOUND CLIENT, DELIBERATELY ───────────────────────────────────
 *
 * Both the row read and the signature go through the caller's own session, not
 * the service role. The bucket's one read arm asks
 * `private.has_capability('production.visual.manage')`, so a session without the
 * key cannot mint an address even if this code were reached — the guard above is
 * the message, the policy is the boundary, and routing this through the service
 * role would have removed the boundary and left only the message.
 *
 * ── ONE CALL FOR THE WHOLE LIST, AND WHY ────────────────────────────────────
 *
 * The plan asked for one signature per asset. It is one call over a list
 * instead: the archive is filled every Thursday, so it grows without bound, and
 * a per-row act would be one gate round trip **and** one query **and** one
 * signing request per photograph on every render of the page. Each row still
 * gets its own address with its own expiry — what is shared is the question
 * *may this session see the archive*, which is one question however many rows
 * are on the screen.
 *
 * ⚠ **The storage key never leaves this function.** The answer is keyed by the
 * ROW's identifier, so the surface can render a thumbnail without ever holding a
 * pointer it could log, copy or link.
 */
export async function signVisualAssets(
  assetIds: readonly unknown[]
): Promise<ArchiveSignatureResult> {
  await assertVisualSection();

  if (!areUuids(assetIds)) {
    // Refused whole rather than quietly narrowed: a page that silently dropped
    // one thumbnail would look like an archive with a hole in it, and nobody
    // would know which row was missing or why.
    console.error(
      "[visual.asset_sign_failed] section=archive code=invalid_id " +
        "message=a caller named something that is not a row identifier"
    );
    return { ok: false, reason: "read_failed" };
  }

  if (assetIds.length === 0) {
    return { ok: true, urls: {} };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("production_visual_asset")
    .select("id, object_key")
    .in("id", assetIds);

  if (error) {
    console.error(
      `[visual.asset_read_failed] section=archive code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "read_failed" };
  }

  const rows = (data ?? []) as unknown as { id: string; object_key: string }[];

  if (rows.length === 0) {
    return { ok: true, urls: {} };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("visual-archive")
    .createSignedUrls(
      rows.map((row) => row.object_key),
      ARCHIVE_SIGNATURE_SECONDS
    );

  if (signError || signed === null) {
    // Its own cause, kept apart from a failed read: here the rows ARE on the
    // screen with their kind, their artist and their date, and only the picture
    // is missing. Telling somebody the archive could not be read would be false
    // and would send them to reload a page that is already showing them what it
    // holds.
    console.error(
      `[visual.asset_sign_failed] section=archive code=${signError?.name ?? "unknown"} ` +
        "message=storage would not sign the archive addresses"
    );
    return { ok: false, reason: "sign_failed" };
  }

  /*
    Back to row identifiers, in the order the signatures came in.

    `createSignedUrls` answers positionally and carries the path it signed; the
    keys are matched by POSITION rather than by comparing paths, because
    comparing would mean holding both lists of pointers side by side for the
    length of a loop, and the point of this function is that a pointer stops
    here. A signature that failed individually arrives with a null address and is
    simply absent from the map — the surface draws that row without a picture and
    says so, which is the honest shape of a partial answer.
  */
  const urls: Record<string, string> = {};
  signed.forEach((entry, index) => {
    const row = rows[index];
    if (row === undefined) return;
    if (typeof entry.signedUrl !== "string" || entry.signedUrl === "") return;
    urls[row.id] = entry.signedUrl;
  });

  return { ok: true, urls };
}
