import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  MEDIA_PARTY_NOT_OF_EVENT,
  MEDIA_UPLOAD_FORBIDDEN,
  mayUploadToParty,
} from "@/lib/media/may-upload";
import {
  MEDIA_STRIP_FAILED,
  MEDIA_STRIP_TOOL_UNAVAILABLE,
  MEDIA_STRIP_UNSUPPORTED_TYPE,
  STRIPPABLE_MIME_TYPES,
  isMediaStripRefusal,
  stripImageMetadata,
  type MediaStripRefusalReason,
} from "@/lib/media/strip-metadata";

/**
 * `POST /api/media/finalize` — the one place where bytes become public.
 *
 * ── WHAT THIS ROUTE ASSERTS, in one sentence ─────────────────────────────────
 * A file reaches the public bucket only after the stripper has returned its
 * bytes; every other outcome is a refusal carrying its own category, and no
 * branch writes the bytes it was handed.
 *
 * ── WHY THE BYTES DO NOT TRAVEL THROUGH THIS REQUEST — read the number ───────
 *
 * The body of this request is JSON and **not a file**, and that is forced by a
 * documented platform ceiling rather than chosen for taste:
 *
 *   * a Vercel Function refuses a request (or response) body larger than
 *     **4.5 MB**, answering `413 FUNCTION_PAYLOAD_TOO_LARGE`. Read at the
 *     source on 2026-08-09: `https://vercel.com/docs/functions/limitations`,
 *     section *Request body size*;
 *   * the product accepts photographs up to **50 MB**
 *     (`src/components/media/MediaUpload.tsx:11`) and videos far above that.
 *
 * So the client deposits the file in the **private** quarantine bucket (plan
 * 35-19) and calls this route with its key; the route picks the bytes up from
 * there with the service role, strips them, and writes the result to the public
 * bucket. A file that has not been stripped is reachable by nobody, which is
 * literally what `media-and-storage.md` asks — gate *EXIF prima della
 * pubblicazione*.
 *
 * **Whoever comes to "simplify" this route into one that accepts the file must
 * read the two numbers above first.** Accepting the file works on every test
 * photograph anybody has to hand and fails in production, on a large one, after
 * a night.
 *
 * ── FAIL CLOSED, deliberately the OPPOSITE of the door ───────────────────────
 *
 * Every outcome that is not "stripped and written" is a refusal. There is no
 * branch that lets a file through so as not to block a member, because
 * `venue-secrecy.md` is monotone: once the file is online the coordinates are
 * out, and no later commit takes them back. `checkin-offline.md` sets the
 * opposite default at the door — admit and record — because there the error is
 * recoverable and it happens in front of a queue. Here nobody is waiting and
 * nothing is recoverable. The two asymmetries point in opposite directions on
 * purpose.
 *
 * ── THE CATEGORIES ARE VALUES, and they reach a screen ───────────────────────
 *
 * Every refusal leaves as a constant in the `reason` field of the answer, never
 * as a sentence to be parsed. Two reasons, and the second is the one that is
 * usually forgotten: Next redacts an error's message in a production build, and
 * this project has **no error tracking** (`meta-gates.md`, verified 2026-08-05)
 * — so a `console.error` here reaches a log that nobody watches. The category
 * travels to the client, and plan 35-21 turns it into a distinguishable line on
 * the screen of the person uploading. A route that collapsed these seventeen
 * outcomes into one 403 would be repeating the newsletter defect recorded in
 * `.planning/codebase/CONCERNS.md`, one domain over.
 *
 * ── WHAT THIS ROUTE DOES NOT DO ──────────────────────────────────────────────
 *
 *   * **It writes no row.** The row in `event_media` stays `registerMedia`'s
 *     job, which carries the same per-night predicate and the night itself.
 *     The consequence, written instead of left to be found: between this route
 *     answering and that action succeeding there is a window in which an object
 *     exists with no row. That object is **already stripped** and no view
 *     references it, so the window costs space and moderation reach, never a
 *     secret. It is the same class of orphan `35-16-SUMMARY.md` flagged, moved
 *     from an un-stripped object to a stripped one.
 *   * **It touches no bucket and no policy.** Its permission to write to the
 *     public bucket comes from the service role. Taking that permission away
 *     from the browser is the fifteenth migration,
 *     `20260809006000_event_media_server_upload_only.sql`, and it belongs to
 *     plan 35-21. **Until that row is applied, this whole route is bypassable**:
 *     the browser can still write straight to the public bucket, exactly as it
 *     does today, and the door it walks through is
 *     `20260225120000_phase7_media.sql:70-75`.
 *   * **It does not sanitise video.** `sharp` decodes still images; an MP4 or
 *     MOV carries its coordinates in a `udta` atom. A video toward a night whose
 *     `venue_secret` is true — **or unreadable** — is refused; on a night that
 *     is not secret a video passes **un-stripped**, and that is a declared,
 *     dated limit (plan 35-14, entry 6), not an omission. Nothing in this
 *     repository may be read as "EXIF sanitisation is shipped" without that
 *     sentence beside it.
 *   * **It does not empty the quarantine.** It removes the object it was given,
 *     in every terminal outcome. An upload abandoned before this call leaves a
 *     file that only the service role can remove, and the sweep for those is
 *     plan 35-14, entry 11 — a cron, outside this phase's eight requirements.
 *
 * ── THE SERVICE CLIENT, and the three untrusted values that reach it ─────────
 *
 * `access-gating.md`, gate *service role*: this client bypasses every row-level
 * policy, so what protects the read and the write is this file and nothing else.
 * Three caller-controlled values reach it, and each is accounted for before it
 * does:
 *
 *   `partyId`         — matched against `UUID_PATTERN`, and passed only as an
 *                       `.eq()` parameter, never as a hand-built filter string;
 *   `quarantinePath`  — three segments, the first two being **this caller's own**
 *                       event and user id, the third with no `/` in it. A path
 *                       naming somebody else's object is refused with its own
 *                       category before any storage call happens;
 *   the bytes         — downloaded from a private bucket and, for an image,
 *                       replaced by the stripper's output before they are
 *                       written anywhere.
 */

export const runtime = "nodejs";

/**
 * `sharp` is native code and does not run on the edge runtime, so the line above
 * is written out rather than inherited: a runtime that a file does not declare
 * is a runtime that changes under it on an upgrade, and here the change would
 * take the form of a stripper that cannot load.
 *
 * The declaration below is what `nextjs-architecture.md` gate *cache esplicita*
 * asks for. A `POST` handler is not cached today, so the line changes nothing
 * now; it is here so that a `GET` added to this file later inherits the
 * declaration instead of inheriting the default.
 */
export const dynamic = "force-dynamic";

/**
 * The quarantine bucket, named once. Its public sibling is deliberately **not**
 * hoisted into a constant beside it, and the asymmetry is not carelessness: the
 * mechanical assertion that the strip precedes the write is a comparison of line
 * numbers, so the public bucket's name written at the top of this file would sit
 * above the strip and make a correct file fail its own check. It is therefore
 * written inline, once, at the single place that writes. Same discipline, and
 * the same reason, as `35-19-SUMMARY.md` deviation 3: a check that has to be
 * read around stops being read.
 */
const QUARANTINE_BUCKET = "event-media-quarantine";

/**
 * The same spelling `src/app/api/tickets/checkin/route.ts:75-76` and
 * `.../checkin/undo/route.ts:23-24` already carry. A third copy, and it is a
 * copy on purpose: this plan owns one file, and hoisting the pattern into a
 * shared module would edit two routes that belong to other plans in this wave.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The video types the product accepts (`src/components/media/MediaUpload.tsx:9`).
 *
 * This is the **second** spelling of that list and the two must move together.
 * The first cannot be imported: it lives in a `"use client"` component, and
 * importing from one into a route handler drags client code into the server
 * bundle. The image list is not duplicated — `STRIPPABLE_MIME_TYPES` is
 * exported by the module that owns it, and this file imports it.
 */
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime"] as const;

type AllowedVideoMime = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

/** Nobody is holding this session. */
const MEDIA_FINALIZE_UNAUTHENTICATED = "media_finalize.unauthenticated";
/** The body is not the shape this route accepts. */
const MEDIA_FINALIZE_MALFORMED_REQUEST = "media_finalize.malformed_request";
/** The key names an object that is not this caller's. */
const MEDIA_FINALIZE_PATH_NOT_YOURS = "media_finalize.path_not_yours";
/** The permission question could not be answered. NOT a refusal of the person. */
const MEDIA_FINALIZE_PERMISSION_UNRESOLVED =
  "media_finalize.permission_unresolved";
/** There is no object at that key. */
const MEDIA_FINALIZE_SOURCE_MISSING = "media_finalize.source_missing";
/** The object could not be fetched, and the cause is ours rather than the caller's. */
const MEDIA_FINALIZE_SOURCE_UNREADABLE = "media_finalize.source_unreadable";
/** A declared type this product does not accept at all. */
const MEDIA_FINALIZE_TYPE_NOT_ACCEPTED = "media_finalize.type_not_accepted";
/** Declared a video; the bytes are not a video container. */
const MEDIA_FINALIZE_CONTAINER_MISMATCH = "media_finalize.container_mismatch";
/** A video toward a night whose venue is secret, or whose secrecy is unreadable. */
const MEDIA_FINALIZE_VIDEO_ON_SECRET_NIGHT =
  "media_finalize.video_on_secret_night";
/** Something already occupies that key in the public bucket. */
const MEDIA_FINALIZE_ALREADY_PUBLISHED = "media_finalize.already_published";
/** The write to the public bucket failed. */
const MEDIA_FINALIZE_PUBLISH_FAILED = "media_finalize.publish_failed";
/** A cause this route did not foresee. Never merged with one it did. */
const MEDIA_FINALIZE_UNEXPECTED = "media_finalize.unexpected";

/**
 * Every way this route can say no.
 *
 * Three of them are **imported rather than re-minted**: the two the per-night
 * predicate owns and the three the stripper owns. Re-spelling any of them here
 * would be a second definition of a category whose first definition is the one
 * a caller already reads.
 */
type FinalizeRefusal =
  | typeof MEDIA_FINALIZE_UNAUTHENTICATED
  | typeof MEDIA_FINALIZE_MALFORMED_REQUEST
  | typeof MEDIA_FINALIZE_PATH_NOT_YOURS
  | typeof MEDIA_PARTY_NOT_OF_EVENT
  | typeof MEDIA_UPLOAD_FORBIDDEN
  | typeof MEDIA_FINALIZE_PERMISSION_UNRESOLVED
  | typeof MEDIA_FINALIZE_SOURCE_MISSING
  | typeof MEDIA_FINALIZE_SOURCE_UNREADABLE
  | typeof MEDIA_FINALIZE_TYPE_NOT_ACCEPTED
  | typeof MEDIA_FINALIZE_CONTAINER_MISMATCH
  | typeof MEDIA_FINALIZE_VIDEO_ON_SECRET_NIGHT
  | typeof MEDIA_FINALIZE_ALREADY_PUBLISHED
  | typeof MEDIA_FINALIZE_PUBLISH_FAILED
  | typeof MEDIA_FINALIZE_UNEXPECTED
  | MediaStripRefusalReason;

/**
 * The status each refusal answers with, as a **total** `Record` over the union:
 * a category added without a status is an `npm run build` error and not a
 * silent 500. Same construction, and the same reason, as `DOOR_HTTP`
 * (`src/lib/door/outcome.ts:44-48`).
 *
 * `503` is used with the meaning `require-operator.ts` gave it and not as a
 * synonym for "error": *the question could not be answered, this is not a
 * refusal of you*. That distinction is the reason the permission-unresolved arm
 * exists at all — collapsing it into the 403 would tell a master, on a bad
 * database minute, that they may not upload.
 */
const FINALIZE_HTTP = {
  [MEDIA_FINALIZE_UNAUTHENTICATED]: 401,
  [MEDIA_FINALIZE_MALFORMED_REQUEST]: 400,
  [MEDIA_FINALIZE_PATH_NOT_YOURS]: 403,
  [MEDIA_PARTY_NOT_OF_EVENT]: 400,
  [MEDIA_UPLOAD_FORBIDDEN]: 403,
  [MEDIA_FINALIZE_PERMISSION_UNRESOLVED]: 503,
  [MEDIA_FINALIZE_SOURCE_MISSING]: 404,
  [MEDIA_FINALIZE_SOURCE_UNREADABLE]: 503,
  [MEDIA_FINALIZE_TYPE_NOT_ACCEPTED]: 415,
  [MEDIA_FINALIZE_CONTAINER_MISMATCH]: 415,
  [MEDIA_FINALIZE_VIDEO_ON_SECRET_NIGHT]: 422,
  [MEDIA_FINALIZE_ALREADY_PUBLISHED]: 409,
  [MEDIA_FINALIZE_PUBLISH_FAILED]: 503,
  [MEDIA_FINALIZE_UNEXPECTED]: 500,
  [MEDIA_STRIP_UNSUPPORTED_TYPE]: 415,
  [MEDIA_STRIP_TOOL_UNAVAILABLE]: 503,
  [MEDIA_STRIP_FAILED]: 422,
} as const satisfies Record<FinalizeRefusal, number>;

/**
 * What happens to the quarantine object after each outcome — a **second** total
 * `Record`, and deliberately not a rule derived from the status above.
 *
 * The plan asks for the object to be removed in a `finally`, in every branch.
 * That is right for every branch except the ones that answer *"ask again"*: a
 * route that says retry and destroys the thing you would retry with has not
 * offered a retry, it has lost a member's upload — up to 50 MB of it, uploaded
 * once over a phone connection. So the four outcomes that mean *the answer is
 * not in yet* keep the source, and every terminal one removes it.
 *
 * Written as a total `Record` rather than inferred from `FINALIZE_HTTP[r] ===
 * 503`, because the two records answer different questions and a derivation
 * would silently re-decide this one every time a status changes. A new category
 * must state, at build time, what happens to the bytes.
 *
 * The cost of `keep` is named and accepted: an object left in a bucket that is
 * **private and has no read policy for anybody** (plan 35-19) is space, not
 * disclosure — threat T-35-114.
 */
const FINALIZE_QUARANTINE = {
  [MEDIA_FINALIZE_UNAUTHENTICATED]: "remove",
  [MEDIA_FINALIZE_MALFORMED_REQUEST]: "remove",
  [MEDIA_FINALIZE_PATH_NOT_YOURS]: "remove",
  [MEDIA_PARTY_NOT_OF_EVENT]: "remove",
  [MEDIA_UPLOAD_FORBIDDEN]: "remove",
  [MEDIA_FINALIZE_PERMISSION_UNRESOLVED]: "keep",
  [MEDIA_FINALIZE_SOURCE_MISSING]: "remove",
  [MEDIA_FINALIZE_SOURCE_UNREADABLE]: "keep",
  [MEDIA_FINALIZE_TYPE_NOT_ACCEPTED]: "remove",
  [MEDIA_FINALIZE_CONTAINER_MISMATCH]: "remove",
  [MEDIA_FINALIZE_VIDEO_ON_SECRET_NIGHT]: "remove",
  [MEDIA_FINALIZE_ALREADY_PUBLISHED]: "remove",
  [MEDIA_FINALIZE_PUBLISH_FAILED]: "keep",
  [MEDIA_FINALIZE_UNEXPECTED]: "keep",
  [MEDIA_STRIP_UNSUPPORTED_TYPE]: "remove",
  [MEDIA_STRIP_TOOL_UNAVAILABLE]: "keep",
  [MEDIA_STRIP_FAILED]: "remove",
} as const satisfies Record<FinalizeRefusal, "remove" | "keep">;

/**
 * The accepted body. Every field is `unknown` on purpose, for the reason
 * `src/app/api/tickets/checkin/route.ts:78-84` already states: there is no
 * validation library in this repository, so a typed optional would let a number
 * through at runtime while reading as though it could not.
 */
interface FinalizeRequestBody {
  eventId?: unknown;
  partyId?: unknown;
  quarantinePath?: unknown;
  mimeType?: unknown;
  fileSize?: unknown;
}

/**
 * The top-level box types an ISO base media file — MP4, and the QuickTime MOV
 * this product also accepts — may begin with.
 *
 * Why this exists at all: the declared mime comes from the browser and is a
 * claim. On the image branch the stripper already refuses a container that does
 * not match the claim (plan 35-19, deviation 1). On the **video** branch nothing
 * would, and the video branch is the one that writes the bytes UN-STRIPPED — so
 * without this check, labelling a photograph `video/mp4` publishes it with its
 * GPS intact. The claim is therefore checked against the container here too, in
 * the only way available without a decoder: the box header.
 *
 * The false refusal this can produce, stated rather than met: a pre-`ftyp`
 * QuickTime file whose first box is none of these is refused. The direction of
 * that error is the safe one on this path, and the refusal carries its own
 * category rather than reading as a fault.
 */
const ISO_BMFF_TOP_LEVEL_BOXES = new Set([
  "ftyp",
  "moov",
  "mdat",
  "free",
  "skip",
  "wide",
  "pnot",
]);

function looksLikeVideoContainer(bytes: Buffer): boolean {
  if (bytes.length < 12) return false;
  return ISO_BMFF_TOP_LEVEL_BOXES.has(bytes.subarray(4, 8).toString("latin1"));
}

function isStrippableMime(mime: string): mime is (typeof STRIPPABLE_MIME_TYPES)[number] {
  return (STRIPPABLE_MIME_TYPES as readonly string[]).includes(mime);
}

function isAllowedVideoMime(mime: string): mime is AllowedVideoMime {
  return (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Control characters and the backslash, refused in the last segment of a key.
 *
 * Written as a loop over char codes rather than as a regular expression on
 * purpose: a character class holding control characters is the one shape
 * `no-control-regex` refuses, and silencing a linter to write a security check
 * is how a security check ends up being read past.
 */
function hasHostileCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f || code === 0x5c) return true;
  }
  return false;
}

/**
 * The HTTP status a storage error carried, read defensively.
 *
 * `@supabase/storage-js` is a **transitive** package here — `package.json`
 * declares `@supabase/supabase-js`, not this one — so its error classes are read
 * by shape and never imported. Importing them would be the phantom dependency
 * plan 35-19 task 1 removed for `sharp`, re-introduced one module over.
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

export async function POST(request: Request) {
  /**
   * The key this handler is allowed to remove, and it stays `null` until the
   * ownership check has passed.
   *
   * That order is the whole guard: were it set from the body, any approved
   * account could delete anybody else's in-flight upload by naming its key —
   * a denial-of-service primitive handed out by the cleanup step.
   */
  let ownedQuarantinePath: string | null = null;

  /** `null` means success, or not decided yet. Written only by `refuse()`. */
  let decided: FinalizeRefusal | null = null;

  const serviceClient = getServiceClient();

  /**
   * The only way out of this handler that is not a success.
   *
   * One function, so the category, the status, the log line and the fate of the
   * quarantine object cannot drift apart at one call site out of fifteen. Same
   * shape and the same reason as `respond()` in the check-in route: written as
   * one function, the order cannot be reversed by an edit in one place.
   *
   * The log carries the category and the night, and nothing else. No key, no
   * caption, no file name: a raised message reaches a log and on this project a
   * log reaches a screenshot.
   */
  const refuse = (reason: FinalizeRefusal, partyId: string | null = null) => {
    decided = reason;
    console.error(`[${reason}] media finalize refused`, { partyId });
    return NextResponse.json(
      { ok: false, reason },
      { status: FINALIZE_HTTP[reason] }
    );
  };

  try {
    // ── 1. Identity ─────────────────────────────────────────────────────────
    // The cookie-bound client, exactly as `validateMediaUpload` and
    // `registerMedia` resolve it. This answers *who is calling*; nothing about
    // permission is decided here.
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return refuse(MEDIA_FINALIZE_UNAUTHENTICATED);
    }

    // ── 2. Shape ────────────────────────────────────────────────────────────
    let body: FinalizeRequestBody;
    try {
      body = await request.json();
    } catch {
      return refuse(MEDIA_FINALIZE_MALFORMED_REQUEST);
    }

    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
    const partyId = typeof body.partyId === "string" ? body.partyId.trim() : "";
    const quarantinePath =
      typeof body.quarantinePath === "string" ? body.quarantinePath : "";
    const mimeType =
      typeof body.mimeType === "string" ? body.mimeType.trim() : "";

    // `body.fileSize` is part of the wire shape this plan declares and is
    // deliberately read by nothing: the only size that means anything here is
    // the length of the bytes actually downloaded, and a size announced by the
    // caller is a claim. It stays in the interface so the contract with plan
    // 35-21 is visible; it decides nothing.

    if (
      !UUID_PATTERN.test(eventId) ||
      !UUID_PATTERN.test(partyId) ||
      quarantinePath === "" ||
      mimeType === ""
    ) {
      return refuse(MEDIA_FINALIZE_MALFORMED_REQUEST);
    }

    // ── 3. The key is this caller's ─────────────────────────────────────────
    //
    // Exactly three segments, the first two being the event named in the body
    // and **the id of whoever is calling**. Without this, any approved account
    // could hand this route somebody else's quarantine key and have their file
    // published under their name — the one shape that turns a private transit
    // area into a shared one.
    //
    // The third segment may not contain a `/`, which is what makes a key of the
    // form `…/…/../../elsewhere` unreachable: with no separator left there are
    // no further segments to walk. Its charset is otherwise left alone, because
    // it is generated by our own client from a timestamp and an extension and
    // narrowing it further would refuse ordinary files for no gain.
    const segments = quarantinePath.split("/");
    const leaf = segments[2] ?? "";

    if (
      segments.length !== 3 ||
      segments[0] !== eventId ||
      segments[1] !== user.id ||
      leaf === "" ||
      leaf === "." ||
      leaf === ".." ||
      hasHostileCharacters(leaf)
    ) {
      return refuse(MEDIA_FINALIZE_PATH_NOT_YOURS, partyId);
    }

    ownedQuarantinePath = quarantinePath;

    // ── 4. May this account upload to THIS night ────────────────────────────
    //
    // The predicate is imported and never re-stated: `validateMediaUpload`,
    // `registerMedia` and this route read ONE definition, which is the whole
    // reason plan 35-16 put it in a plain module instead of exporting it from a
    // `"use server"` file.
    //
    // Three outcomes, kept apart, because they say three different things:
    //   `false`                     — the three arms answered no. A verdict.
    //   `media.party_not_of_event`  — the pair is incoherent. Not a verdict.
    //   anything else it throws     — the question was not answered. Not a
    //                                 verdict either, and never collapsed into
    //                                 the 403: a resolver that cannot answer
    //                                 must not read as "you may not".
    //
    // `party.invalid_id` — the resolver's other throw — lands in the same
    // unresolved arm. It is unreachable behind `UUID_PATTERN` above, and a
    // caller bug answered as retryable costs nothing; the alternative is
    // matching a literal that module does not export, which would break
    // silently the day it is reworded.
    let mayUpload: boolean;
    try {
      mayUpload = await mayUploadToParty(eventId, partyId);
    } catch (cause) {
      if (cause instanceof Error && cause.message === MEDIA_PARTY_NOT_OF_EVENT) {
        return refuse(MEDIA_PARTY_NOT_OF_EVENT, partyId);
      }
      console.error(
        `[${MEDIA_FINALIZE_PERMISSION_UNRESOLVED}] the per-night predicate did ` +
          `not answer. This is NOT a refusal. ${describe(cause)}`
      );
      return refuse(MEDIA_FINALIZE_PERMISSION_UNRESOLVED, partyId);
    }

    if (!mayUpload) {
      return refuse(MEDIA_UPLOAD_FORBIDDEN, partyId);
    }

    // ── 5. Fetch the bytes out of quarantine ────────────────────────────────
    //
    // The service role, because the quarantine bucket has no read policy for
    // anybody and that absence IS its protection (plan 35-19, section 3). A
    // policy written "for the server" would be a grant to everyone in order to
    // serve one caller.
    const { data: blob, error: downloadError } = await serviceClient.storage
      .from(QUARANTINE_BUCKET)
      .download(quarantinePath);

    if (downloadError || !blob) {
      // "There is no such object" and "storage did not answer" are two
      // different facts and are told apart by the status the error carried:
      // the first is terminal and is the caller's, the second is retryable and
      // is ours. An unrecognisable error takes the retryable arm, which is the
      // arm that keeps the member's bytes.
      const status = storageErrorStatus(downloadError);
      const missing = status === 404 || status === 400;
      console.error(
        `[media_finalize.download] quarantine object unavailable for night ` +
          `${partyId}: status ${status ?? "unknown"}`
      );
      return refuse(
        missing ? MEDIA_FINALIZE_SOURCE_MISSING : MEDIA_FINALIZE_SOURCE_UNREADABLE,
        partyId
      );
    }

    const sourceBytes = Buffer.from(await blob.arrayBuffer());

    // ── 6. The fork on the declared type ────────────────────────────────────
    let bytesToPublish: Buffer;

    if (isStrippableMime(mimeType)) {
      // An image. Every outcome other than a stripped buffer throws, and each
      // throw carries its own category through to the caller — three of them,
      // not one: the type, the tool, and the bytes. Nothing in this branch can
      // return the bytes it was handed.
      try {
        bytesToPublish = await stripImageMetadata(sourceBytes, mimeType);
      } catch (cause) {
        if (isMediaStripRefusal(cause)) {
          return refuse(cause.reason, partyId);
        }
        // The stripper's contract is that it only ever throws a categorised
        // refusal. An uncategorised throw from it is a cause this route did not
        // foresee, and it is answered as such rather than dressed as a strip
        // failure.
        console.error(
          `[${MEDIA_FINALIZE_UNEXPECTED}] the stripper threw something that is ` +
            `not a categorised refusal. ${describe(cause)}`
        );
        return refuse(MEDIA_FINALIZE_UNEXPECTED, partyId);
      }
    } else if (isAllowedVideoMime(mimeType)) {
      // A video, and nothing in this repository sanitises one.
      //
      // The claim is checked against the container first, because this is the
      // branch that writes un-stripped bytes: a photograph labelled `video/mp4`
      // must not reach the public bucket with its coordinates in it.
      if (!looksLikeVideoContainer(sourceBytes)) {
        return refuse(MEDIA_FINALIZE_CONTAINER_MISMATCH, partyId);
      }

      // `venue-secrecy.md`, gate *default chiuso*: when the state of the reveal
      // cannot be determined, the venue is not shown. Applied here, that reads
      // — a video is admitted only when the night is KNOWN not to be secret.
      // Secret, unreadable and non-existent all refuse, and they refuse with the
      // same category because they say the same thing to the person uploading:
      // this kind of file is not accepted on this night.
      //
      // Read with the service role deliberately. `event_parties_select_published`
      // (`20260225150000_party_architecture.sql:30-37`) shows an ordinary member
      // only the nights of published events, so the caller's own privileges
      // would answer "no row" for a night that exists — turning a question about
      // the NIGHT into a question about WHO IS ASKING. That is the defect plan
      // 35-18 measured inside a policy body and replaced with a `SECURITY
      // DEFINER` accessor; the same answer applies one layer up.
      const { data: party, error: partyError } = await serviceClient
        .from("event_parties")
        .select("venue_secret")
        .eq("id", partyId)
        .maybeSingle();

      if (partyError || !party || party.venue_secret !== false) {
        console.error(
          `[${MEDIA_FINALIZE_VIDEO_ON_SECRET_NIGHT}] video refused for night ` +
            `${partyId}: secrecy ${
              partyError
                ? `unreadable (${partyError.code ?? "unknown"})`
                : !party
                  ? "night not found"
                  : "true"
            }`
        );
        return refuse(MEDIA_FINALIZE_VIDEO_ON_SECRET_NIGHT, partyId);
      }

      // Passing un-stripped, and the limit is declared rather than implied:
      // an MP4 or MOV carries the shot's coordinates and time in a `udta` atom
      // exactly as a JPEG carries them in EXIF, `sharp` decodes still images
      // only, and closing this needs a container rewriter that is in none of
      // this phase's eight requirements. Recorded, dated 2026-08-08, as entry 6
      // of plan 35-14. Whoever reads "EXIF sanitisation is shipped" somewhere
      // else in this repository should come back to this paragraph.
      bytesToPublish = sourceBytes;
    } else {
      // Neither an image this module can treat nor a video this product
      // accepts. The two lists are not re-typed here as a third opinion: one is
      // imported from the stripper, the other is this file's mirror of the
      // upload surface, named at the top.
      return refuse(MEDIA_FINALIZE_TYPE_NOT_ACCEPTED, partyId);
    }

    // ── 7. The write, and it is the only one in this product ────────────────
    //
    // `upsert: false` on purpose: overwriting is not a thing this route does,
    // and a key that already exists is an outcome with its own name below
    // rather than a silent replacement of somebody's file.
    //
    // `contentType` is passed explicitly. Without it a Buffer is stored as
    // `text/plain`, and the public bucket would then serve a photograph as
    // text — the strip would have worked and the picture would still be broken.
    // The value is the declared mime, which by this line has been checked
    // against the real container on both branches.
    const { error: publishError } = await serviceClient.storage
      .from("event-media")
      .upload(quarantinePath, bytesToPublish, {
        contentType: mimeType,
        upsert: false,
      });

    if (publishError) {
      // 409 means the key is taken. Reachable when an earlier call published
      // and then failed to clean up. It is answered with its own terminal
      // category and NOT as a success: a route that reported success for bytes
      // it did not strip on this call would be the one shape this file exists
      // to prevent, and no acceptance criterion could see it.
      const status = storageErrorStatus(publishError);
      console.error(
        `[media_finalize.publish] write refused for night ${partyId}: status ` +
          `${status ?? "unknown"}`
      );
      return refuse(
        status === 409
          ? MEDIA_FINALIZE_ALREADY_PUBLISHED
          : MEDIA_FINALIZE_PUBLISH_FAILED,
        partyId
      );
    }

    // The path, and nothing else. The row is `registerMedia`'s to write, with
    // its own predicate and the night.
    return NextResponse.json({ ok: true, path: quarantinePath }, { status: 200 });
  } catch (cause) {
    // The genuine last resort. Every foreseen failure above has its own
    // category, so anything arriving here is by definition one this plan did
    // not foresee — and it must not be indistinguishable from one it did.
    console.error(
      `[${MEDIA_FINALIZE_UNEXPECTED}] media finalize failed. ${describe(cause)}`
    );
    return refuse(MEDIA_FINALIZE_UNEXPECTED);
  } finally {
    // ── 8. The transit area is left as it was found ─────────────────────────
    //
    // Removed after a success and after every terminal refusal; kept for the
    // four outcomes that mean *ask again*, because a retry needs the bytes.
    // `decided` is `null` exactly when the handler is returning a success.
    const fate: "remove" | "keep" =
      decided === null ? "remove" : FINALIZE_QUARANTINE[decided];

    if (ownedQuarantinePath !== null && fate === "remove") {
      const { error: removeError } = await serviceClient.storage
        .from(QUARANTINE_BUCKET)
        .remove([ownedQuarantinePath]);

      // A failed cleanup never changes the answer. After a success the bytes
      // are already public and the row is about to be written, so turning this
      // into a refusal would report a failure that did not happen and leave the
      // object behind anyway. What is left is an orphan in a **private** bucket
      // — space, not disclosure — and the sweep for those is plan 35-14,
      // entry 11.
      if (removeError) {
        console.error(
          "[media_finalize.quarantine_not_cleared] an object stayed in the " +
            "transit area. This is space, not disclosure: the bucket is " +
            `private and has no read policy. ${describe(removeError)}`
        );
      }
    }
  }
}
