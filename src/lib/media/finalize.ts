import "server-only";

import { getServiceClient } from "@/lib/supabase/service";
import {
  STRIPPABLE_MIME_TYPES,
  isMediaStripRefusal,
  stripImageMetadata,
  type MediaStripRefusalReason,
} from "@/lib/media/strip-metadata";

/**
 * finalize.ts — pick the bytes up, STRIP them, write them to the destination
 * that was named. One implementation, two destinations.
 *
 * ── WHY THE IMPORTS SIT ABOVE THIS BLOCK ────────────────────────────────────
 * Same discipline, and the same reason, as `may-upload.ts:1-15` and
 * `strip-metadata.ts:1-15`: `import "server-only"` is asserted by reading the
 * head of the file, and a file written docblock-first would fail a check it
 * satisfies.
 *
 * ── WHAT THIS FILE ASSERTS, in one sentence ─────────────────────────────────
 *
 * Bytes reach a destination bucket only after the stripper has returned them,
 * unless the caller supplied — by name, in the argument — a gate for a type the
 * stripper cannot treat; and the destination is a **required argument with no
 * default anywhere in this file**.
 *
 * ── WHY IT EXISTS AT ALL, which is a fact about the SECOND destination ──────
 *
 * Plan 45-17 files dj photographs into a private archive bucket. The obvious
 * shape — a second route with its own download, its own strip and its own write
 * — is two copies of a sequence whose correctness is an ORDER. Two copies of an
 * order is one copy that will stop stripping, and it will stop stripping in the
 * copy nobody is reading, months after the plan that wrote it closed. So the
 * sequence lives here once, and `/api/media/finalize` and
 * `/api/media/finalize-archive` are two callers that differ in **where they
 * write** and **who they let past the stripper** — and in nothing else.
 *
 * ── THE DESTINATION HAS NO DEFAULT, AND THAT IS THE FILE'S SHARPEST RULE ────
 *
 * `destinationBucket` is a required field of the request. There is no default,
 * no fallback and no `??` anywhere below, because **a default destination is
 * exactly the bug that publishes an archive photograph**. The two destinations
 * of this product differ in the one way that cannot be undone: one is
 * `public = true` and readable by URL with no session at all
 * (`20260225120000_phase7_media.sql:64-66`), the other is private with no
 * anonymous read arm (`20260817120400_visual_archive_bucket.sql`). A caller who
 * forgot to name a destination and got the public one would have published
 * material nobody decided to publish — and in this domain an accidental
 * publication is read as an announcement.
 *
 * ── WHY THE BYTES DO NOT TRAVEL THROUGH THE CALLER'S REQUEST ────────────────
 *
 * Both callers are Vercel Functions, and the two numbers that force the shape
 * are written where a reader will meet them: `finalize/route.ts:28-50`. This
 * module receives an object **key**, never a file, and reads the bytes out of
 * the private quarantine bucket with the service role.
 *
 * ── THE SERVICE CLIENT, and what protects it ────────────────────────────────
 *
 * `access-gating.md`, gate *service role*: this client bypasses every row-level
 * policy, so what protects the read and the write is the caller's own ownership
 * check on the key plus this file. This module performs **no permission check
 * of its own and must never be given one** — a predicate here would be a second
 * answer to a question each route already asks with its own key, and two
 * answers to one question is how a route gets a verdict it did not ask for.
 * Each caller asks its predicate FIRST and reaches this module only after.
 *
 * ── THE LOG FORM ────────────────────────────────────────────────────────────
 *
 * `code=… message=…`, and **never the object key**. A key travels in a signed
 * URL, in a request log and in an error message, it outlives the row, and on the
 * archive path its user-supplied portion is chosen by whoever uploads. The
 * migration that created the archive bucket asks for keys that carry no artist
 * name, no venue word and no uncommunicated date; this file's contribution is
 * simply never to echo one. There is **no error tracking in this product**
 * (`meta-gates.md`), so what a caller returns is the only place a refusal exists
 * for a human being — which is why every failure below leaves as a categorised
 * value rather than as a thrown message.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The transit area
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The one bucket this module READS from — private, with no read policy for
 * anybody (`20260809004600`, section 3), which is why the service role is what
 * opens it.
 *
 * It is deliberately the only bucket named as a literal in this file. Anything
 * this module WRITES to arrives as an argument, and the structural gate
 * `npm run verify:media-strip` asserts that no destination literal grew back in
 * here.
 */
const QUARANTINE_BUCKET = "event-media-quarantine";

/* ────────────────────────────────────────────────────────────────────────────
 * The categories — values, owned here, imported by both callers
 * ──────────────────────────────────────────────────────────────────────────── */

/** There is no object at that key. Terminal, and it is the caller's fact. */
export const MEDIA_FINALIZE_SOURCE_MISSING = "media_finalize.source_missing";
/** The object could not be fetched, and the cause is ours rather than the caller's. */
export const MEDIA_FINALIZE_SOURCE_UNREADABLE = "media_finalize.source_unreadable";
/** A declared type neither the stripper nor this caller's gate accepts. */
export const MEDIA_FINALIZE_TYPE_NOT_ACCEPTED = "media_finalize.type_not_accepted";
/** Something already occupies that key at the destination. */
export const MEDIA_FINALIZE_ALREADY_PUBLISHED = "media_finalize.already_published";
/** The write to the destination failed. */
export const MEDIA_FINALIZE_PUBLISH_FAILED = "media_finalize.publish_failed";
/** A cause this module did not foresee. Never merged with one it did. */
export const MEDIA_FINALIZE_UNEXPECTED = "media_finalize.unexpected";

/**
 * Every way THIS MODULE can say no.
 *
 * The three strip refusals are **imported rather than re-minted**: the stripper
 * owns them, a caller already reads them, and a second spelling is a second
 * thing to keep in step.
 *
 * ⚠ The six spellings above are **byte-identical to the constants
 * `/api/media/finalize` declared before this module existed**, and that is a
 * requirement rather than a coincidence: `MediaUpload.tsx` maps those exact
 * strings to seventeen distinguishable sentences on the screen of whoever is
 * uploading. Re-wording one here would collapse a sentence into the fallback
 * without a single build error.
 */
export type FinalizeStepRefusal =
  | typeof MEDIA_FINALIZE_SOURCE_MISSING
  | typeof MEDIA_FINALIZE_SOURCE_UNREADABLE
  | typeof MEDIA_FINALIZE_TYPE_NOT_ACCEPTED
  | typeof MEDIA_FINALIZE_ALREADY_PUBLISHED
  | typeof MEDIA_FINALIZE_PUBLISH_FAILED
  | typeof MEDIA_FINALIZE_UNEXPECTED
  | MediaStripRefusalReason;

/* ────────────────────────────────────────────────────────────────────────────
 * The one escape from the stripper, and it has to be asked for by name
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What a caller does about bytes the stripper cannot treat.
 *
 * **`null` is the archive's answer and the safe one**: a type outside
 * `STRIPPABLE_MIME_TYPES` is refused, nothing is written, and the reason says
 * which. That is not caution, it is the archive's own contract — the bucket
 * accepts the three strippable image types and no others, *because nothing that
 * cannot be stripped may be kept in an archive that is drawn on months later*
 * (`20260817120400_visual_archive_bucket.sql`, section 1).
 *
 * A function is the **published** path's answer, and only because this product
 * accepts video there and nothing in this repository sanitises a video: `sharp`
 * decodes still images, while an MP4 or a MOV carries the shot's coordinates and
 * time in a `udta` atom. That limit is declared and dated (plan 35-14, entry 6),
 * not glossed. The gate receives the real bytes precisely so it can check the
 * declared type against the real container — a photograph labelled `video/mp4`
 * must never reach a bucket un-stripped — and it answers with **its own**
 * refusal name, which is why this module is generic over that name instead of
 * flattening it to `string`: a caller that returns a category its own status map
 * does not carry is a build error here rather than a 500 in production.
 *
 * ⚠ **A gate that always answers `ok` is a strip switched off.** If one is ever
 * written, it belongs beside a paragraph naming the type it admits and the
 * reason nothing can strip it — as `/api/media/finalize`'s does.
 */
export type UnstrippableGate<R extends string> = (
  bytes: Buffer,
  mimeType: string
) => Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: R }>;

/** What one call to this module is asked to do. */
export interface FinalizeRequest<R extends string> {
  /** Three-or-two-segment key inside the quarantine bucket, already proved to be the caller's. */
  readonly quarantinePath: string;
  /** The declared type. A claim, checked below against what the stripper or the gate says. */
  readonly mimeType: string;
  /** Where the bytes go. Required, and there is no default anywhere in this file. */
  readonly destinationBucket: string;
  /** What to do with bytes the stripper cannot treat. See {@link UnstrippableGate}. */
  readonly unstrippable: UnstrippableGate<R> | null;
  /**
   * A short, non-identifying string put in this module's log lines so a reader
   * can tell the two callers apart. **Never a key, never a name, never a date.**
   */
  readonly logScope: string;
}

/** What one call answers. `ok` means the bytes are at the destination. */
export type FinalizeStepResult<R extends string> =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: FinalizeStepRefusal | R };

/* ────────────────────────────────────────────────────────────────────────────
 * Two small readers, kept out of the sequence so the sequence reads as one
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The HTTP status a storage error carried, read defensively.
 *
 * `@supabase/storage-js` is a **transitive** package here — `package.json`
 * declares `@supabase/supabase-js`, not this one — so its error classes are read
 * by shape and never imported.
 */
function storageErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

/** A short, safe description of a thrown thing, for the server log only. */
function describe(cause: unknown): string {
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  return String(cause);
}

function isStrippableMime(
  mime: string
): mime is (typeof STRIPPABLE_MIME_TYPES)[number] {
  return (STRIPPABLE_MIME_TYPES as readonly string[]).includes(mime);
}

/* ────────────────────────────────────────────────────────────────────────────
 * THE SEQUENCE — download, strip, write. In that order, once.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Pick the object up from quarantine, strip it, and write the result to the
 * destination the caller named.
 *
 * The order below is the whole guarantee, and it is an order a reader can check:
 * there is exactly one call to the stripper, exactly one write, and the write is
 * the last statement. `npm run verify:media-strip` check B asserts that ordering
 * mechanically in **this** file — which is where it moved when the sequence
 * moved, because a check measuring a route that no longer strips would have gone
 * on being green about nothing.
 *
 * ⚠ **It does not remove the quarantine object.** That is deliberate and it is
 * not a gap: WHEN the transit copy may be destroyed is a decision each caller
 * makes per refusal — a route that answers *ask again* and destroys the bytes
 * you would ask again with has not offered a retry, it has lost a 50 MB upload
 * made once over a phone connection. The removal itself is
 * {@link releaseQuarantineObject} below, so neither caller reimplements it.
 */
export async function finalizeStrippedUpload<R extends string>(
  request: FinalizeRequest<R>
): Promise<FinalizeStepResult<R>> {
  const { quarantinePath, mimeType, destinationBucket, unstrippable, logScope } =
    request;

  const serviceClient = getServiceClient();

  // ── 1. Fetch the bytes out of quarantine ──────────────────────────────────
  //
  // The service role, because the quarantine bucket has no read policy for
  // anybody and that absence IS its protection (plan 35-19, section 3). A policy
  // written "for the server" would be a grant to everyone in order to serve one
  // caller.
  const { data: blob, error: downloadError } = await serviceClient.storage
    .from(QUARANTINE_BUCKET)
    .download(quarantinePath);

  if (downloadError || !blob) {
    // "There is no such object" and "storage did not answer" are two different
    // facts, told apart by the status the error carried: the first is terminal
    // and is the caller's, the second is retryable and is ours. An
    // unrecognisable error takes the retryable arm — the arm that keeps the
    // uploader's bytes.
    const status = storageErrorStatus(downloadError);
    const missing = status === 404 || status === 400;
    console.error(
      `[media_finalize.download] scope=${logScope} code=${status ?? "unknown"} ` +
        "message=the quarantine object could not be read"
    );
    return {
      ok: false,
      reason: missing
        ? MEDIA_FINALIZE_SOURCE_MISSING
        : MEDIA_FINALIZE_SOURCE_UNREADABLE,
    };
  }

  const sourceBytes = Buffer.from(await blob.arrayBuffer());

  // ── 2. The fork on the declared type ──────────────────────────────────────
  let bytesToWrite: Buffer;

  if (isStrippableMime(mimeType)) {
    // An image. Every outcome other than a stripped buffer returns, and each
    // carries its own category through to the caller — three of them, not one:
    // the type, the tool, and the bytes. **Nothing in this branch can return the
    // bytes it was handed**, which is the sentence the whole module exists for.
    try {
      bytesToWrite = await stripImageMetadata(sourceBytes, mimeType);
    } catch (cause) {
      if (isMediaStripRefusal(cause)) {
        return { ok: false, reason: cause.reason };
      }
      // The stripper's contract is that it only ever throws a categorised
      // refusal. An uncategorised throw is a cause this module did not foresee,
      // and it is answered as such rather than dressed as a strip failure.
      console.error(
        `[${MEDIA_FINALIZE_UNEXPECTED}] scope=${logScope} code=uncategorised ` +
          `message=the stripper threw something that is not a categorised refusal. ${describe(cause)}`
      );
      return { ok: false, reason: MEDIA_FINALIZE_UNEXPECTED };
    }
  } else if (unstrippable !== null) {
    // A type the stripper cannot treat, and a caller that has said in its own
    // file which type and why. The gate reads the REAL bytes, so a claim about
    // the container is checked rather than believed, and it answers with its own
    // category.
    let verdict: Awaited<ReturnType<UnstrippableGate<R>>>;
    try {
      verdict = await unstrippable(sourceBytes, mimeType);
    } catch (cause) {
      console.error(
        `[${MEDIA_FINALIZE_UNEXPECTED}] scope=${logScope} code=gate_threw ` +
          `message=the caller's unstrippable gate threw. ${describe(cause)}`
      );
      return { ok: false, reason: MEDIA_FINALIZE_UNEXPECTED };
    }

    if (!verdict.ok) {
      return { ok: false, reason: verdict.reason };
    }

    // Passing as received, and the limit is the caller's declared one. See
    // {@link UnstrippableGate}.
    bytesToWrite = sourceBytes;
  } else {
    // No gate, and the stripper cannot treat this type. Refused, and nothing was
    // written. This is the archive's whole answer to video.
    return { ok: false, reason: MEDIA_FINALIZE_TYPE_NOT_ACCEPTED };
  }

  // ── 3. The write, to the destination the caller named ─────────────────────
  //
  // `upsert: false` on purpose: overwriting is not a thing this module does, and
  // a key that is already taken is an outcome with its own name rather than a
  // silent replacement of somebody's file.
  //
  // `contentType` is passed explicitly. Without it a Buffer is stored as
  // `text/plain`, and the bucket would then serve a photograph as text — the
  // strip would have worked and the picture would still be broken. The value is
  // the declared mime, which by this line has been checked against the real
  // container on both branches.
  const { error: writeError } = await serviceClient.storage
    .from(destinationBucket)
    .upload(quarantinePath, bytesToWrite, {
      contentType: mimeType,
      upsert: false,
    });

  if (writeError) {
    // 409 means the key is taken. Reachable when an earlier call wrote and then
    // failed to clean up. It is answered with its own terminal category and NOT
    // as a success: a module reporting success for bytes it did not write on
    // this call is the one shape no acceptance criterion could see.
    const status = storageErrorStatus(writeError);
    console.error(
      `[media_finalize.write] scope=${logScope} code=${status ?? "unknown"} ` +
        "message=the destination refused the write"
    );
    return {
      ok: false,
      reason:
        status === 409
          ? MEDIA_FINALIZE_ALREADY_PUBLISHED
          : MEDIA_FINALIZE_PUBLISH_FAILED,
    };
  }

  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The transit area is left as it was found — but WHEN is the caller's call
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Remove one object from the quarantine bucket.
 *
 * Written here so that neither route reimplements it, and it deliberately
 * decides **nothing**: each caller keeps its own total record of which refusals
 * destroy the transit copy and which keep it, because *the answer is not in yet*
 * and *this is over* are different facts about the same bytes.
 *
 * A failed cleanup never changes an answer. What is left behind is an object in
 * a bucket that is **private and has no read policy for anybody** — space, not
 * disclosure (threat T-35-114) — and the sweep for those is plan 35-14, entry
 * 11.
 */
export async function releaseQuarantineObject(
  quarantinePath: string,
  logScope: string
): Promise<void> {
  const { error: removeError } = await getServiceClient()
    .storage.from(QUARANTINE_BUCKET)
    .remove([quarantinePath]);

  if (removeError) {
    console.error(
      `[media_finalize.quarantine_not_cleared] scope=${logScope} ` +
        `code=${removeError.name ?? "unknown"} message=an object stayed in the ` +
        "transit area. This is space, not disclosure: the bucket is private and " +
        "has no read policy."
    );
  }
}
