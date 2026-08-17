import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  MEDIA_VISUAL_UPLOAD_FORBIDDEN,
  mayUploadToVisualSection,
} from "@/lib/media/may-upload";
import {
  MEDIA_FINALIZE_ALREADY_PUBLISHED,
  MEDIA_FINALIZE_PUBLISH_FAILED,
  MEDIA_FINALIZE_SOURCE_MISSING,
  MEDIA_FINALIZE_SOURCE_UNREADABLE,
  MEDIA_FINALIZE_TYPE_NOT_ACCEPTED,
  MEDIA_FINALIZE_UNEXPECTED,
  finalizeStrippedUpload,
  releaseQuarantineObject,
} from "@/lib/media/finalize";
import {
  MEDIA_STRIP_FAILED,
  MEDIA_STRIP_TOOL_UNAVAILABLE,
  MEDIA_STRIP_UNSUPPORTED_TYPE,
  type MediaStripRefusalReason,
} from "@/lib/media/strip-metadata";

/**
 * `POST /api/media/finalize-archive` — the place bytes become **filed**, not the
 * place they become public.
 *
 * ── WHAT THIS ROUTE ASSERTS, in one sentence ────────────────────────────────
 *
 * A photograph reaches the private `visual-archive` bucket only after the
 * stripper has returned its bytes, and only for a session holding the visual
 * section's own key; every other outcome is a refusal carrying its own category,
 * and no branch writes the bytes it was handed.
 *
 * ── THE ONE SENTENCE THAT DISTINGUISHES IT FROM ITS SIBLING ─────────────────
 *
 * `/api/media/finalize` publishes: what it writes becomes readable by URL, with
 * no session, the instant it lands. **This route files.** Its destination is
 * private, has no anonymous read arm and has no client insert arm at all
 * (`20260817120400_visual_archive_bucket.sql`, sections 3 and 4) — and **it is
 * that absence, not this route's care, that keeps an unpublished photograph
 * unpublished**. If somebody ever "fixes a broken thumbnail" by adding a public
 * read arm to that bucket, everything written here stops meaning anything, and
 * the migration names that repair so it is recognised when it is proposed in
 * good faith.
 *
 * ── WHY THE ARCHIVE EXISTS AT ALL, because it decides what is acceptable here ─
 *
 * The listing goes out two days before the night, so **that night's photograph
 * cannot exist yet**. At an artist's first date there is only their press photo;
 * from the second, the piece is pulled from an archive somebody has been
 * building every Thursday (`brand-visual-system.md`, gate *l'archivio precede il
 * listing*). An archive is therefore an object KEPT FOR MONTHS and drawn on
 * later — which is why an un-stripped file here would be worse than an
 * un-stripped file on the gallery path, not better: it is a reveal route that
 * stays open long after the upload is forgotten.
 *
 * Two consequences, both enforced rather than hoped for:
 *
 *   * **nothing that cannot be stripped may be filed.** This route passes
 *     `unstrippable: null` to the shared module, so a video — which nothing in
 *     this repository sanitises — is refused with its own category. The archive
 *     bucket's own `allowed_mime_types` says the same thing; whether the storage
 *     API applies that list to a service-role write was NOT verified at the
 *     source (the migration says so in its own words), so **the enforcement that
 *     counts is the stripper**, and the list is the second line;
 *   * **the bytes do not travel through this request.** A Vercel Function
 *     refuses a body over **4.5 MB** and this product accepts photographs up to
 *     50 MB; the two numbers, with their source, are at
 *     `src/app/api/media/finalize/route.ts:28-50`. The client deposits into the
 *     private quarantine bucket and posts the key.
 *
 * ── FAIL CLOSED ─────────────────────────────────────────────────────────────
 *
 * Every outcome that is not "stripped and written" is a refusal, and every step
 * that cannot be completed leaves nothing behind. There is no branch that lets a
 * file through so as not to block somebody: `venue-secrecy.md` is monotone, and
 * a photograph taken inside a venue whose address is not out carries that
 * address in its own bytes. `checkin-offline.md` sets the opposite default at
 * the door — admit and record — because there the error is recoverable and it
 * happens in front of a queue. Here nobody is waiting.
 *
 * ── THE KEY IS NOT A PLACE TO PUT MATERIAL ──────────────────────────────────
 *
 * A key travels in a signed URL, in a request log and in an error message, and
 * it outlives the row. The uploader builds it as `<caller id>/<random>.<ext>` —
 * no artist name, no venue word, no date. This route's contribution is narrower
 * and is the half it can actually enforce: it checks that the key is the
 * caller's own, and **it never echoes one into a log**.
 *
 * ── WHAT THIS ROUTE DOES NOT DO ─────────────────────────────────────────────
 *
 *   * **It writes no row.** `production_visual_asset` is `recordVisualAsset`'s
 *     to write, behind the same key, with the artist's name and the date. The
 *     window between this answer and that write holds an object with no row:
 *     the object is **already stripped** and lives in a bucket nothing public
 *     can read, so the window costs space, never a secret.
 *   * **It mints no read.** A thumbnail exists because `signVisualAssets` signed
 *     for it, briefly, behind the same key.
 *   * **It does not empty the quarantine of anything but its own object.**
 */

export const runtime = "nodejs";

/**
 * `sharp` is native code and does not run on the edge runtime, so the line above
 * is written out rather than inherited: a runtime a file does not declare is a
 * runtime that changes under it on an upgrade, and here the change would take
 * the form of a stripper that cannot load.
 */
export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────────────
 * The categories — values, and each one reaches a screen
 * ──────────────────────────────────────────────────────────────────────────── */

/** Nobody is holding this session. */
const ARCHIVE_UNAUTHENTICATED = "media_archive.unauthenticated";
/** The body is not the shape this route accepts. */
const ARCHIVE_MALFORMED_REQUEST = "media_archive.malformed_request";
/** The key names an object that is not this caller's. */
const ARCHIVE_PATH_NOT_YOURS = "media_archive.path_not_yours";
/** The visual section's key was not held. A verdict. */
const ARCHIVE_FORBIDDEN = MEDIA_VISUAL_UPLOAD_FORBIDDEN;
/** The permission question could not be answered. NOT a refusal of the person. */
const ARCHIVE_PERMISSION_UNRESOLVED = "media_archive.permission_unresolved";

/**
 * Every way this route can say no.
 *
 * Nine of the twelve are **imported rather than re-minted**: six from the shared
 * pickup-strip-write module, three from the stripper. A second spelling of a
 * category is a second thing to keep in step with the sentence a person reads.
 */
type ArchiveRefusal =
  | typeof ARCHIVE_UNAUTHENTICATED
  | typeof ARCHIVE_MALFORMED_REQUEST
  | typeof ARCHIVE_PATH_NOT_YOURS
  | typeof ARCHIVE_FORBIDDEN
  | typeof ARCHIVE_PERMISSION_UNRESOLVED
  | typeof MEDIA_FINALIZE_SOURCE_MISSING
  | typeof MEDIA_FINALIZE_SOURCE_UNREADABLE
  | typeof MEDIA_FINALIZE_TYPE_NOT_ACCEPTED
  | typeof MEDIA_FINALIZE_ALREADY_PUBLISHED
  | typeof MEDIA_FINALIZE_PUBLISH_FAILED
  | typeof MEDIA_FINALIZE_UNEXPECTED
  | MediaStripRefusalReason;

/**
 * The status each refusal answers with, as a **total** `Record` over the union:
 * a category added without a status is an `npm run build` error and not a silent
 * 500.
 *
 * `503` carries the meaning `require-operator.ts` gave it and is not a synonym
 * for "error": *the question could not be answered, this is not a refusal of
 * you*. Collapsing the unresolved arm into the 403 would tell somebody who holds
 * the key, on a bad database minute, that they do not.
 */
const ARCHIVE_HTTP = {
  [ARCHIVE_UNAUTHENTICATED]: 401,
  [ARCHIVE_MALFORMED_REQUEST]: 400,
  [ARCHIVE_PATH_NOT_YOURS]: 403,
  [ARCHIVE_FORBIDDEN]: 403,
  [ARCHIVE_PERMISSION_UNRESOLVED]: 503,
  [MEDIA_FINALIZE_SOURCE_MISSING]: 404,
  [MEDIA_FINALIZE_SOURCE_UNREADABLE]: 503,
  [MEDIA_FINALIZE_TYPE_NOT_ACCEPTED]: 415,
  [MEDIA_FINALIZE_ALREADY_PUBLISHED]: 409,
  [MEDIA_FINALIZE_PUBLISH_FAILED]: 503,
  [MEDIA_FINALIZE_UNEXPECTED]: 500,
  [MEDIA_STRIP_UNSUPPORTED_TYPE]: 415,
  [MEDIA_STRIP_TOOL_UNAVAILABLE]: 503,
  [MEDIA_STRIP_FAILED]: 422,
} as const satisfies Record<ArchiveRefusal, number>;

/**
 * What happens to the quarantine object after each outcome — a **second** total
 * `Record`, deliberately not derived from the status above.
 *
 * The four outcomes that mean *the answer is not in yet* KEEP the transit copy,
 * because a route that says retry and destroys the thing you would retry with
 * has not offered a retry: it has lost an upload made once, possibly the only
 * copy of a press photo somebody sent on a Monday. Every terminal outcome
 * removes it.
 *
 * A total `Record` rather than a rule inferred from `ARCHIVE_HTTP[r] === 503`,
 * because the two answer different questions and a derivation would silently
 * re-decide this one every time a status changes.
 */
const ARCHIVE_QUARANTINE = {
  [ARCHIVE_UNAUTHENTICATED]: "remove",
  [ARCHIVE_MALFORMED_REQUEST]: "remove",
  [ARCHIVE_PATH_NOT_YOURS]: "remove",
  [ARCHIVE_FORBIDDEN]: "remove",
  [ARCHIVE_PERMISSION_UNRESOLVED]: "keep",
  [MEDIA_FINALIZE_SOURCE_MISSING]: "remove",
  [MEDIA_FINALIZE_SOURCE_UNREADABLE]: "keep",
  [MEDIA_FINALIZE_TYPE_NOT_ACCEPTED]: "remove",
  [MEDIA_FINALIZE_ALREADY_PUBLISHED]: "remove",
  [MEDIA_FINALIZE_PUBLISH_FAILED]: "keep",
  [MEDIA_FINALIZE_UNEXPECTED]: "keep",
  [MEDIA_STRIP_UNSUPPORTED_TYPE]: "remove",
  [MEDIA_STRIP_TOOL_UNAVAILABLE]: "keep",
  [MEDIA_STRIP_FAILED]: "remove",
} as const satisfies Record<ArchiveRefusal, "remove" | "keep">;

/**
 * The accepted body. Every field is `unknown` on purpose: there is no validation
 * library in this repository, so a typed optional would let a number through at
 * run time while reading as though it could not.
 *
 * ⚠ **There is no `eventId` and no `partyId`, and the absence is the point.** An
 * archive photograph belongs to no night — see the header — and a field for one
 * would be the first step back toward the per-night predicate this path
 * deliberately does not use.
 */
interface ArchiveRequestBody {
  quarantinePath?: unknown;
  mimeType?: unknown;
}

/**
 * Control characters and the backslash, refused in the last segment of a key.
 *
 * A loop over char codes rather than a regular expression, for the reason the
 * sibling route gives: a character class holding control characters is the one
 * shape `no-control-regex` refuses, and silencing a linter to write a security
 * check is how a security check ends up being read past.
 */
function hasHostileCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f || code === 0x5c) return true;
  }
  return false;
}

/** A short, safe description of a thrown thing, for the server log only. */
function describe(cause: unknown): string {
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  return String(cause);
}

export async function POST(request: Request) {
  /**
   * The key this handler is allowed to remove, and it stays `null` until the
   * ownership check has passed.
   *
   * That order is the whole guard: were it set from the body, anybody holding
   * the visual key could delete somebody else's in-flight upload by naming its
   * key — a denial-of-service primitive handed out by the cleanup step.
   */
  let ownedQuarantinePath: string | null = null;

  /** `null` means success, or not decided yet. Written only by `refuse()`. */
  let decided: ArchiveRefusal | null = null;

  /**
   * The only way out of this handler that is not a success.
   *
   * One function, so the category, the status, the log line and the fate of the
   * quarantine object cannot drift apart at one call site out of twelve.
   *
   * ⚠ The log carries the category and **nothing else**. No key, no file name,
   * no artist: a name in a line-up that has not been announced is material in
   * the same sense a space under negotiation is, and a log line on this project
   * reaches a screenshot.
   */
  const refuse = (reason: ArchiveRefusal) => {
    decided = reason;
    console.error(`[${reason}] archive finalize refused`);
    return NextResponse.json(
      { ok: false, reason },
      { status: ARCHIVE_HTTP[reason] }
    );
  };

  try {
    // ── 1. Identity ─────────────────────────────────────────────────────────
    // The cookie-bound client. This answers *who is calling*; nothing about
    // permission is decided here.
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return refuse(ARCHIVE_UNAUTHENTICATED);
    }

    // ── 2. Shape ────────────────────────────────────────────────────────────
    let body: ArchiveRequestBody;
    try {
      body = await request.json();
    } catch {
      return refuse(ARCHIVE_MALFORMED_REQUEST);
    }

    const quarantinePath =
      typeof body.quarantinePath === "string" ? body.quarantinePath : "";
    const mimeType =
      typeof body.mimeType === "string" ? body.mimeType.trim() : "";

    if (quarantinePath === "" || mimeType === "") {
      return refuse(ARCHIVE_MALFORMED_REQUEST);
    }

    // ── 3. The key is this caller's ─────────────────────────────────────────
    //
    // Exactly two segments, the first being **the id of whoever is calling**.
    // The gallery path uses three because its first segment is the event; this
    // path has no event, so it has no third segment, and asking for one would be
    // asking for a night the archive does not have.
    //
    // Without this check, anybody holding the visual key could hand this route
    // somebody else's quarantine key and have their file filed — the one shape
    // that turns a private transit area into a shared one.
    //
    // The last segment may not contain a `/`, which is what makes a key of the
    // form `…/../../elsewhere` unreachable: with no separator left there are no
    // further segments to walk.
    const segments = quarantinePath.split("/");
    const leaf = segments[1] ?? "";

    if (
      segments.length !== 2 ||
      segments[0] !== user.id ||
      leaf === "" ||
      leaf === "." ||
      leaf === ".." ||
      hasHostileCharacters(leaf)
    ) {
      return refuse(ARCHIVE_PATH_NOT_YOURS);
    }

    ownedQuarantinePath = quarantinePath;

    // ── 4. May this account file into the visual archive ────────────────────
    //
    // Asked FIRST, before a single byte is touched. The predicate is imported
    // and never re-stated, and it takes **no night** — the second predicate of
    // `may-upload.ts`, not a widened first one.
    //
    // Two outcomes kept apart: `false` is a verdict, and a throw is the question
    // going unanswered. A resolver that cannot answer must never read as *you
    // may not*, because that is the reading that refuses the person who owns the
    // brand on a bad database minute.
    let mayFile: boolean;
    try {
      mayFile = await mayUploadToVisualSection();
    } catch (cause) {
      console.error(
        `[${ARCHIVE_PERMISSION_UNRESOLVED}] code=unresolved message=the visual ` +
          `section predicate did not answer. This is NOT a refusal. ${describe(cause)}`
      );
      return refuse(ARCHIVE_PERMISSION_UNRESOLVED);
    }

    if (!mayFile) {
      return refuse(ARCHIVE_FORBIDDEN);
    }

    // ── 5. Pick up, strip, write — the same sequence the gallery path runs ──
    //
    // `unstrippable: null` is this route's whole answer to everything the
    // stripper cannot treat: refused, with its own category, nothing written.
    // The gallery path passes a gate there because this product accepts video in
    // a gallery; an archive drawn on months later does not get that exception.
    //
    // The destination is written inline, once. It is a required argument of the
    // module and the module has **no default** — a default destination is how a
    // filed photograph becomes a published one.
    const outcome = await finalizeStrippedUpload<never>({
      quarantinePath,
      mimeType,
      destinationBucket: "visual-archive",
      logScope: "archive",
      unstrippable: null,
    });

    if (!outcome.ok) {
      return refuse(outcome.reason);
    }

    // The stored key, and nothing else. The row is `recordVisualAsset`'s to
    // write, behind the same key, with the artist's name and the date.
    return NextResponse.json({ ok: true, path: quarantinePath }, { status: 200 });
  } catch (cause) {
    // The genuine last resort. Every foreseen failure above has its own
    // category, so anything arriving here is one this plan did not foresee — and
    // it must not be indistinguishable from one it did.
    console.error(
      `[${MEDIA_FINALIZE_UNEXPECTED}] code=unexpected message=archive finalize ` +
        `failed. ${describe(cause)}`
    );
    return refuse(MEDIA_FINALIZE_UNEXPECTED);
  } finally {
    // ── 6. The transit area is left as it was found ─────────────────────────
    //
    // Removed after a success and after every terminal refusal; kept for the
    // four outcomes that mean *ask again*. `decided` is `null` exactly when the
    // handler is returning a success.
    const fate: "remove" | "keep" =
      decided === null ? "remove" : ARCHIVE_QUARANTINE[decided];

    if (ownedQuarantinePath !== null && fate === "remove") {
      await releaseQuarantineObject(ownedQuarantinePath, "archive");
    }
  }
}
