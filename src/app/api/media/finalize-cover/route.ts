import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  assertMayManageEvent,
  assertStaffManage,
} from "@/lib/capabilities/guards";
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
 * `POST /api/media/finalize-cover` — the only way a cover reaches the public
 * `event-images` bucket (plan 52.1-13, DBT-14, D-52.1-18).
 *
 * ── WHAT THIS ROUTE ASSERTS, in one sentence ────────────────────────────────
 *
 * A cover reaches `event-images` only after the stripper has rotated it,
 * shrunk it to 1920 px on its long side and re-encoded it as a JPEG without
 * EXIF, at a key THIS ROUTE generated, and only for a session that holds
 * `staff.manage` and names a night that exists; every other outcome is a
 * refusal with its own category.
 *
 * ── WHY IT EXISTS — two reveal paths the browser upload had ─────────────────
 *
 * Until this plan `EventForm.tsx` wrote straight from the browser into
 * `event-images` — `public = true`, readable by URL with no session — at
 * `covers/<timestamp>-<original file name>`. Two things a night with a secret
 * venue cannot afford travelled with it (`venue-secrecy.md`, monotone: a venue
 * can be revealed, never re-hidden):
 *
 *   * **the GPS in the bytes.** A cover picked from a phone's camera roll
 *     carries where it was taken. Measured on 2026-10-02 on the iPhone
 *     simulator: Safari converts a HEIC into a JPEG for an `accept` that does
 *     not name HEIC, and its picker hands the file over with *«Location
 *     Included»* — the GPS tag is still inside. A photograph taken at the venue
 *     is the venue's address.
 *   * **the file name in the URL.** «facciata-della-sede.jpg» in a public URL is
 *     a reveal no cron controls. So the key is generated HERE —
 *     `covers/<uuid>.jpg` — and nothing the uploader chose reaches it.
 *
 * ── WHY THE BYTES DO NOT TRAVEL THROUGH THIS REQUEST ────────────────────────
 *
 * A Vercel Function refuses a body over 4.5 MB, and the cover limit is 5 MB;
 * the two numbers, with their source, are at
 * `src/app/api/media/finalize/route.ts:28-50`. The browser deposits into the
 * private quarantine bucket (`event_media_quarantine_insert_staff`, which asks
 * `staff.manage` — the same key this route asks) and posts the key.
 *
 * ── THE GUARD, and why it is not the visual section's key ───────────────────
 *
 * `assertStaffManage` + `assertMayManageEvent`: the cover of a night is changed
 * by whoever manages that night — the same pair every server action on events
 * asks — not by `production.visual.manage`, which is the archive's key. Asked
 * BEFORE a single byte is touched.
 *
 * ── FAIL CLOSED ─────────────────────────────────────────────────────────────
 *
 * Nothing that cannot be stripped is written: `unstrippable: null`. The output
 * is always JPEG (`encoding: "cover-jpeg"`), whatever was declared.
 *
 * ── THE LOG FORM ────────────────────────────────────────────────────────────
 *
 * The category and, at most, the night's id. **Never the quarantine key, never
 * the generated key, never a file name.**
 *
 * ── WHAT THIS ROUTE DOES NOT DO ─────────────────────────────────────────────
 *
 *   * **It writes no row.** `events.cover_image` is written by the form's save,
 *     as before, with the `publicUrl` answered here.
 *   * **It deletes no previous cover.** A replaced cover stays reachable at its
 *     old URL — today's behaviour, declared as debt in the VERIFICATION.
 *
 * ── `purpose` — 2026-10-03, phase 52.3 ──────────────────────────────────────
 *
 * `purpose` chooses ONLY the key prefix: `"livecut"` writes
 * `livecuts/<uuid>.jpg`, absent or `"event"` writes `covers/<uuid>.jpg`, any
 * other value is a bad request — a closed vocabulary, never a forwarded
 * string. Same bucket, same stripper, same guard: a LiveCut cover is public
 * editorial material exactly like the cover of its night, and `eventId` is the
 * night the LiveCut belongs to. The two keys are written as two whole
 * literals, never as a prefix in a variable: `verify:media-strip` looks for
 * both templates and refuses any third one.
 */

export const runtime = "nodejs";

/** `sharp` is native code: written out, never inherited. Same note as the archive route. */
export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────────────
 * The categories
 * ──────────────────────────────────────────────────────────────────────────── */

/** Nobody is holding this session. */
const COVER_UNAUTHENTICATED = "event_cover.unauthenticated";
/** The body is not the shape this route accepts. */
const COVER_BAD_REQUEST = "event_cover.bad_request";
/** The quarantine key is not this caller's. */
const COVER_PATH_NOT_YOURS = "event_cover.path_not_yours";
/** `staff.manage` is not held. A verdict. */
const COVER_FORBIDDEN = "event_cover.forbidden";
/** The id names no night. A verdict about the request, not about the person. */
const COVER_EVENT_NOT_FOUND = "event_cover.event_not_found";
/** The permission question could not be answered. NOT a refusal of the person. */
const COVER_PERMISSION_UNRESOLVED = "event_cover.permission_unresolved";

type CoverRefusal =
  | typeof COVER_UNAUTHENTICATED
  | typeof COVER_BAD_REQUEST
  | typeof COVER_PATH_NOT_YOURS
  | typeof COVER_FORBIDDEN
  | typeof COVER_EVENT_NOT_FOUND
  | typeof COVER_PERMISSION_UNRESOLVED
  | typeof MEDIA_FINALIZE_SOURCE_MISSING
  | typeof MEDIA_FINALIZE_SOURCE_UNREADABLE
  | typeof MEDIA_FINALIZE_TYPE_NOT_ACCEPTED
  | typeof MEDIA_FINALIZE_ALREADY_PUBLISHED
  | typeof MEDIA_FINALIZE_PUBLISH_FAILED
  | typeof MEDIA_FINALIZE_UNEXPECTED
  | MediaStripRefusalReason;

/** Status per refusal — total, so a category without a status is a build error. */
const COVER_HTTP = {
  [COVER_UNAUTHENTICATED]: 401,
  [COVER_BAD_REQUEST]: 400,
  [COVER_PATH_NOT_YOURS]: 403,
  [COVER_FORBIDDEN]: 403,
  [COVER_EVENT_NOT_FOUND]: 404,
  [COVER_PERMISSION_UNRESOLVED]: 503,
  [MEDIA_FINALIZE_SOURCE_MISSING]: 404,
  [MEDIA_FINALIZE_SOURCE_UNREADABLE]: 503,
  [MEDIA_FINALIZE_TYPE_NOT_ACCEPTED]: 415,
  [MEDIA_FINALIZE_ALREADY_PUBLISHED]: 409,
  [MEDIA_FINALIZE_PUBLISH_FAILED]: 503,
  [MEDIA_FINALIZE_UNEXPECTED]: 500,
  [MEDIA_STRIP_UNSUPPORTED_TYPE]: 415,
  [MEDIA_STRIP_TOOL_UNAVAILABLE]: 503,
  [MEDIA_STRIP_FAILED]: 422,
} as const satisfies Record<CoverRefusal, number>;

/**
 * The fate of the quarantine object per outcome — a second total record, not
 * derived from the status. *Ask again* keeps the transit copy; every terminal
 * outcome removes it. Same table as the archive route.
 *
 * `already_published` removes: the key is a fresh uuid, so a collision means a
 * retry of a write that already landed, and the next attempt mints a new key.
 */
const COVER_QUARANTINE = {
  [COVER_UNAUTHENTICATED]: "remove",
  [COVER_BAD_REQUEST]: "remove",
  [COVER_PATH_NOT_YOURS]: "remove",
  [COVER_FORBIDDEN]: "remove",
  [COVER_EVENT_NOT_FOUND]: "remove",
  [COVER_PERMISSION_UNRESOLVED]: "keep",
  [MEDIA_FINALIZE_SOURCE_MISSING]: "remove",
  [MEDIA_FINALIZE_SOURCE_UNREADABLE]: "keep",
  [MEDIA_FINALIZE_TYPE_NOT_ACCEPTED]: "remove",
  [MEDIA_FINALIZE_ALREADY_PUBLISHED]: "remove",
  [MEDIA_FINALIZE_PUBLISH_FAILED]: "keep",
  [MEDIA_FINALIZE_UNEXPECTED]: "keep",
  [MEDIA_STRIP_UNSUPPORTED_TYPE]: "remove",
  [MEDIA_STRIP_TOOL_UNAVAILABLE]: "keep",
  [MEDIA_STRIP_FAILED]: "remove",
} as const satisfies Record<CoverRefusal, "remove" | "keep">;

/** Every field `unknown`: there is no validation library in this repository. */
interface CoverRequestBody {
  eventId?: unknown;
  quarantinePath?: unknown;
  mimeType?: unknown;
  /** Closed vocabulary: absent, `"event"` or `"livecut"`. Chooses the key prefix only. */
  purpose?: unknown;
}

type CoverPurpose = "event" | "livecut";

/** `undefined`/`"event"` → `"event"`, `"livecut"` → `"livecut"`, anything else → `null` (bad request). */
function parsePurpose(value: unknown): CoverPurpose | null {
  if (value === undefined || value === "event") return "event";
  if (value === "livecut") return "livecut";
  return null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Control characters and the backslash — a loop, not a regex (`no-control-regex`). */
function hasHostileCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f || code === 0x5c) return true;
  }
  return false;
}

/** The category a guard's throw carries, read from WHICH guard line threw. */
function guardRefusal(cause: unknown): CoverRefusal | null {
  if (!(cause instanceof Error)) return null;
  const m = cause.message;
  if (m === "forbidden.staff_manage_required") return COVER_FORBIDDEN;
  if (m === "forbidden.not_event_manager") return COVER_FORBIDDEN;
  if (m === "forbidden.event_not_found") return COVER_EVENT_NOT_FOUND;
  if (
    m.startsWith("capabilities.resolve_failed") ||
    m.startsWith("event.lookup_failed")
  ) {
    return COVER_PERMISSION_UNRESOLVED;
  }
  return null;
}

/** A short, safe description of a thrown thing, for the server log only. */
function describe(cause: unknown): string {
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  return String(cause);
}

export async function POST(request: Request) {
  /** Set only after the ownership check: see the archive route for why. */
  let ownedQuarantinePath: string | null = null;
  /** `null` means success, or not decided yet. Written only by `refuse()`. */
  let decided: CoverRefusal | null = null;
  /** The night, for the log — an id, never a title. Set once validated. */
  let loggedEventId = "-";

  /**
   * The only way out that is not a success. The log carries the category and
   * the night's id, and NOTHING else: no key, no file name.
   */
  const refuse = (reason: CoverRefusal) => {
    decided = reason;
    console.error(`[${reason}] cover finalize refused event=${loggedEventId}`);
    return NextResponse.json(
      { ok: false, reason },
      { status: COVER_HTTP[reason] }
    );
  };

  try {
    // ── 1. Identity ─────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return refuse(COVER_UNAUTHENTICATED);
    }

    // ── 2. Shape ────────────────────────────────────────────────────────────
    let body: CoverRequestBody;
    try {
      body = await request.json();
    } catch {
      return refuse(COVER_BAD_REQUEST);
    }

    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
    const quarantinePath =
      typeof body.quarantinePath === "string" ? body.quarantinePath : "";
    const mimeType =
      typeof body.mimeType === "string" ? body.mimeType.trim() : "";

    const purpose = parsePurpose(body.purpose);

    if (
      !UUID_RE.test(eventId) ||
      quarantinePath === "" ||
      mimeType === "" ||
      purpose === null
    ) {
      return refuse(COVER_BAD_REQUEST);
    }
    loggedEventId = eventId;

    // ── 3. The quarantine key is this caller's ──────────────────────────────
    // Exactly `<caller id>/<leaf>`, the leaf without `/` and without hostile
    // characters: another uploader's in-flight file cannot be named here.
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
      return refuse(COVER_PATH_NOT_YOURS);
    }

    ownedQuarantinePath = quarantinePath;

    // ── 4. Permission, BEFORE a byte is touched ─────────────────────────────
    // A verdict (`forbidden`, `event_not_found`) is kept apart from a question
    // that went unanswered (`permission_unresolved`): a bad database minute
    // must never read as "you may not".
    try {
      const ctx = await assertStaffManage();
      await assertMayManageEvent(supabase, eventId, ctx);
    } catch (cause) {
      const category = guardRefusal(cause);
      if (category !== null) return refuse(category);
      console.error(
        `[${MEDIA_FINALIZE_UNEXPECTED}] code=guard_threw message=the cover ` +
          `guard threw an uncategorised error. ${describe(cause)}`
      );
      return refuse(MEDIA_FINALIZE_UNEXPECTED);
    }

    // ── 5. Pick up, strip, write — the key is generated HERE ────────────────
    //
    // `covers/<uuid>.jpg`: nothing the uploader chose (file name, time, size)
    // reaches the public URL — `venue-secrecy.md`. `.jpg` because the encoding
    // below always writes JPEG. A LiveCut cover gets its own prefix, under the
    // same writer (phase 52.3): both literals whole, for `verify:media-strip`.
    const destinationKey =
      purpose === "livecut"
        ? `livecuts/${crypto.randomUUID()}.jpg`
        : `covers/${crypto.randomUUID()}.jpg`;

    const outcome = await finalizeStrippedUpload<never>({
      quarantinePath,
      mimeType,
      destinationBucket: "event-images",
      destinationKey,
      encoding: "cover-jpeg",
      unstrippable: null,
      logScope: "event_cover",
    });

    if (!outcome.ok) {
      return refuse(outcome.reason);
    }

    // ── 6. The public URL — a pure string build, no request ─────────────────
    const {
      data: { publicUrl },
    } = getServiceClient().storage.from("event-images").getPublicUrl(destinationKey);

    return NextResponse.json({ ok: true, publicUrl }, { status: 200 });
  } catch (cause) {
    console.error(
      `[${MEDIA_FINALIZE_UNEXPECTED}] code=unexpected message=cover finalize ` +
        `failed. ${describe(cause)}`
    );
    return refuse(MEDIA_FINALIZE_UNEXPECTED);
  } finally {
    // ── 7. The transit area is left as it was found ─────────────────────────
    const fate: "remove" | "keep" =
      decided === null ? "remove" : COVER_QUARANTINE[decided];

    if (ownedQuarantinePath !== null && fate === "remove") {
      await releaseQuarantineObject(ownedQuarantinePath, "event_cover");
    }
  }
}
