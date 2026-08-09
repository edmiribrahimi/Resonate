import "server-only";
import type { Sharp } from "sharp";

/**
 * strip-metadata.ts — an image goes in, the same picture comes out, and nothing
 * else does.
 *
 * ── Why the two imports sit ABOVE this block ─────────────────────────────────
 * The plan's acceptance criterion greps `head -3` of this file for
 * `server-only`. Written in the usual order — file docblock first, imports
 * after — the check would read three lines of prose and fail on a file that
 * satisfies it. The header is therefore below the imports on purpose, and the
 * reason is written rather than left to look like carelessness. Same discipline
 * as `35-05-SUMMARY.md` deviation 3: a check that has to be read around stops
 * being read.
 *
 * `import "server-only"` is the first line for a second reason that outlives
 * the grep: this module must never be reachable from a client bundle. It is a
 * server-side gate, and a gate that ships to the browser is a gate the browser
 * chooses whether to run.
 *
 * The `sharp` import is `import type` — erased at build. The runtime load is a
 * dynamic `import()` inside the function, and that is not a style choice: see
 * *The tool that might not be there* below.
 *
 * ── WHAT THIS FILE ASSERTS, in one sentence ─────────────────────────────────
 * Given the bytes of a JPEG, PNG or WebP, it returns bytes that render as the
 * same picture and carry no metadata; in every other case it REFUSES.
 *
 * ── Why it exists ────────────────────────────────────────────────────────────
 * `media-and-storage.md`: *«Ogni immagine caricata da un utente va spogliata
 * dei metadati prima di diventare raggiungibile. Vale in modo assoluto per gli
 * eventi con venue segreto»*. A phone photograph carries GPS coordinates, a
 * date, a time and a device model **inside the file**. A photograph taken
 * inside a secret venue therefore carries the venue's address — not in the
 * caption, in the bytes. It is a reveal path that no surface enumerated in
 * `venue-secrecy.md` passes through, because it is not our code that writes it.
 *
 * ── FAIL CLOSED, and this is deliberately the OPPOSITE of the door ──────────
 * Every outcome that is not "stripped successfully" is a REFUSAL. The direction
 * of the error is *refuse the upload*, never *admit the file*. There is no
 * branch here that hands the caller the bytes it was given, no `catch` that
 * degrades, and no "let it through so as not to block the user".
 *
 * `checkin-offline.md` sets the opposite default at the door: admit, and flag.
 * There, turning away a valid guest happens in front of a queue and the error is
 * recoverable — someone re-scans, someone overrides. **Here there is no queue,
 * nobody is waiting, and the error is not recoverable**: once the file is
 * online the coordinates are out, and `venue-secrecy.md` is monotone — a venue
 * can only be revealed, never re-hidden. The two asymmetries point in opposite
 * directions ON PURPOSE, and whoever reads this file must find the reason here
 * instead of reconstructing it.
 *
 * ── Why `sharp` and not a parser written by hand ─────────────────────────────
 * A reader of JPEG segments and PNG chunks is code somebody has to write, and
 * every format hides information in more than one place — APP1, XMP, PNG's
 * textual chunks, WebP's RIFF container. `sharp` discards metadata **by
 * default** when it re-encodes: less code of ours, less surface to get wrong.
 *
 * The price is declared, not hidden: the re-encode is **not lossless**, the
 * outgoing file is not byte-for-byte the incoming one, and on a large JPEG it
 * costs memory and time. It is worth paying because what is at stake is an
 * address that does not come back.
 *
 * ── The tool that might not be there ─────────────────────────────────────────
 * `sharp` is now a declared dependency of this project (plan 35-19 task 1), at
 * the same version line `next` already resolves. It is still loaded with a
 * dynamic `import()` rather than a static one, so that a missing or
 * unloadable binary becomes a REFUSAL WITH A CATEGORY inside this function
 * instead of a crash at module load. `ai-engineering.md`, gate *un gate deve
 * poter fallire*: a refusal category that no reachable situation can produce is
 * decoration. This one is reachable — sharp ships platform-specific binaries,
 * and a wrong-architecture install fails at load and not at call.
 *
 * ── WHAT THIS FILE DOES NOT COVER — read this before saying "EXIF is done" ───
 * **Videos do not pass through here.** `video/mp4` and `video/quicktime` are
 * accepted by the product's upload surface, and `sharp` does not handle either:
 * it decodes still images. An MP4 or MOV container carries its coordinates in a
 * `udta` atom exactly as a JPEG carries them in EXIF, so a video uploaded from
 * inside a secret venue is **not** sanitised by anything in this repository.
 *
 * This module exports the list of types it can treat and does not pretend about
 * the rest: a caller handing it a video gets a refusal, never a pass. What to
 * DO with a video is the caller's decision and belongs to plan 35-20; the debt
 * is named and dated in plan 35-14. The sentence lives here because here is
 * where somebody would come looking for it.
 *
 * ── What it also does not do ─────────────────────────────────────────────────
 * It knows nothing about where the bytes came from or where they are going. No
 * route, no server action, no database client of any kind is imported — this
 * file turns bytes into bytes. (The acceptance criterion counts occurrences of
 * the alias under which this repository's database clients live; the alias is
 * therefore described and not written, for the same reason as the note at the
 * top.)
 */

/**
 * The image types this module can treat — the three the product already accepts
 * for photos (`src/components/media/MediaUpload.tsx:8`), enumerated once here
 * so that no caller re-types them.
 *
 * The video types the product accepts are deliberately NOT in this list. See
 * the header.
 */
export const STRIPPABLE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type StrippableMime = (typeof STRIPPABLE_MIME_TYPES)[number];

/**
 * Why a strip did not happen. **Values, decided by position — never sentences
 * to be parsed.**
 *
 * The reason that is stated rather than assumed: Next redacts a Server Action's
 * error message in a production build, so a caller that read `error.message` to
 * decide what to show would be reading an empty string. Same rule as
 * `src/lib/door/outcome.ts`, and same rule as the `23514` branch recorded in
 * `20260808001000_role_implies_approved.sql:194-201`.
 *
 * Three causes, and each is reachable:
 *
 *   `unsupported_type`   the declared mime is not in `STRIPPABLE_MIME_TYPES`,
 *                        or the bytes are not the container the mime claims.
 *   `tool_unavailable`   `sharp` could not be loaded at all.
 *   `failed`             `sharp` loaded and refused these bytes — corrupt file,
 *                        empty buffer, a format it does not decode.
 */
export const MEDIA_STRIP_UNSUPPORTED_TYPE = "media_strip.unsupported_type";
export const MEDIA_STRIP_TOOL_UNAVAILABLE = "media_strip.tool_unavailable";
export const MEDIA_STRIP_FAILED = "media_strip.failed";

export type MediaStripRefusalReason =
  | typeof MEDIA_STRIP_UNSUPPORTED_TYPE
  | typeof MEDIA_STRIP_TOOL_UNAVAILABLE
  | typeof MEDIA_STRIP_FAILED;

/**
 * The three literals written out once, as a **total** `Record` over the union.
 *
 * Adding a fourth reason, renaming one or dropping one becomes a
 * `npm run build` error here rather than a guard that quietly stops recognising
 * a refusal it was written to recognise. In a repository with no test runner
 * that build is the only automatic gate there is. Same construction as
 * `src/lib/capabilities/keys.ts` and `src/lib/door/outcome.ts`.
 */
const MEDIA_STRIP_REASONS: Record<MediaStripRefusalReason, true> = {
  [MEDIA_STRIP_UNSUPPORTED_TYPE]: true,
  [MEDIA_STRIP_TOOL_UNAVAILABLE]: true,
  [MEDIA_STRIP_FAILED]: true,
};

/**
 * The refusal itself.
 *
 * It is thrown, never returned, so that no caller can reach the success path by
 * forgetting to check a flag. The category travels as the `reason` **field** —
 * a value — and the message exists only for a server-side log.
 *
 * **The message never carries a file name, a path or a caption.** On this
 * project a raised message reaches a log and a log reaches a screenshot
 * (`20260808002000_membership_register.sql:313-316`), and a photo's file name
 * is written by a phone that was standing inside the venue.
 */
export class MediaStripRefusal extends Error {
  readonly reason: MediaStripRefusalReason;

  constructor(reason: MediaStripRefusalReason) {
    super(reason);
    this.name = "MediaStripRefusal";
    this.reason = reason;
  }
}

/**
 * Recognise a refusal without `instanceof`.
 *
 * `instanceof` is wrong here for the same reason `isDoorOutcome` avoids it: the
 * value may have crossed a bundle boundary, and a class identity does not
 * survive one. The discriminant is the `reason` field, checked against the
 * total record above with `hasOwnProperty` so that a `reason` of `"toString"`
 * does not resolve through the prototype chain.
 */
export function isMediaStripRefusal(
  value: unknown
): value is MediaStripRefusal {
  if (typeof value !== "object" || value === null) return false;
  if (!("reason" in value)) return false;
  const reason = (value as { reason: unknown }).reason;
  return (
    typeof reason === "string" &&
    Object.prototype.hasOwnProperty.call(MEDIA_STRIP_REASONS, reason)
  );
}

/**
 * How each treatable type is re-encoded, as a **total** `Record` over the
 * union: a fourth mime added to `STRIPPABLE_MIME_TYPES` without an encoder
 * here is a build error, not a silent fall-through to some default format.
 *
 * Each entry re-encodes into the SAME format it decoded, so the strip does not
 * quietly turn a member's PNG into a JPEG.
 */
const REENCODE: Record<StrippableMime, (pipeline: Sharp) => Sharp> = {
  "image/jpeg": (pipeline) => pipeline.jpeg(),
  "image/png": (pipeline) => pipeline.png(),
  "image/webp": (pipeline) => pipeline.webp(),
};

/**
 * What `sharp` calls each of those formats when it reports what it actually
 * decoded. Used to check the declared mime against the real container.
 */
const DETECTED_FORMAT: Record<StrippableMime, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * The shape of the thing `import("sharp")` hands back at runtime.
 *
 * Named here so the dynamic import below stays readable and so a change in
 * sharp's own typings surfaces as a build error in one place rather than in the
 * middle of the function.
 */
type SharpConstructor = typeof import("sharp");

/** Narrow a caller-supplied string to a type this module can treat. */
function isStrippableMime(mime: string): mime is StrippableMime {
  return (STRIPPABLE_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Strip an image's metadata, or refuse.
 *
 * @param input the file's bytes, as received
 * @param mime  the declared content type — **untrusted**: it comes from the
 *              browser, see the container check below
 * @returns the same picture, re-encoded in the same format, without metadata
 * @throws {MediaStripRefusal} on every other outcome. Never returns the bytes
 *         it was handed, and never a degraded value.
 */
export async function stripImageMetadata(
  input: Buffer,
  mime: string
): Promise<Buffer> {
  // ── Refusal 1: a type this module does not treat ──────────────────────────
  // A video lands here, and lands here as a refusal rather than as a pass. So
  // does anything else the upload surface might grow to accept.
  if (!isStrippableMime(mime)) {
    console.error(
      `[${MEDIA_STRIP_UNSUPPORTED_TYPE}] refused a declared type this module ` +
        `does not treat: ${mime}. Videos are NOT covered — see this file's header.`
    );
    throw new MediaStripRefusal(MEDIA_STRIP_UNSUPPORTED_TYPE);
  }

  // ── Refusal 2: the tool itself ────────────────────────────────────────────
  // Loaded here and not at module scope so that this is a categorised refusal
  // rather than a crash while the module graph is being built.
  let sharp: SharpConstructor;
  try {
    // `sharp` publishes `export = sharp`, so the dynamic import hands back the
    // namespace with the callable on `default` — measured against the compiler,
    // not assumed: writing `typeof import("sharp")` here is a build error that
    // names the shape.
    sharp = (await import("sharp")).default;

    // And the shape is checked at runtime too, because the CommonJS-to-ESM
    // interop is the bundler's decision and not ours. Without this line a
    // changed interop surfaces as "sharp is not a function" — an uncategorised
    // crash on the one path in this repository where a crash must not become a
    // way through.
    if (typeof sharp !== "function") {
      throw new TypeError("sharp did not load as a callable");
    }
  } catch (cause) {
    console.error(
      `[${MEDIA_STRIP_TOOL_UNAVAILABLE}] sharp could not be loaded, so NO ` +
        `image can be sanitised on this instance. Every upload is being ` +
        `refused until this is fixed. ${describe(cause)}`
    );
    throw new MediaStripRefusal(MEDIA_STRIP_TOOL_UNAVAILABLE);
  }

  try {
    const pipeline = sharp(input, { failOn: "error" });

    // The declared mime is browser-supplied and therefore a claim, not a fact.
    // Reading what sharp actually decoded closes the gap: without this, a file
    // labelled `image/jpeg` whose bytes are something else would be transcoded
    // into a JPEG — a success on a file nobody validated. An empty buffer also
    // stops here, because it has no format at all.
    const { format } = await pipeline.metadata();

    if (format !== DETECTED_FORMAT[mime]) {
      console.error(
        `[${MEDIA_STRIP_UNSUPPORTED_TYPE}] declared ${mime} but decoded ` +
          `${format ?? "nothing"}. Refused rather than transcoded.`
      );
      throw new MediaStripRefusal(MEDIA_STRIP_UNSUPPORTED_TYPE);
    }

    // ── `.rotate()` BEFORE the re-encode, and this line is load-bearing ─────
    // A phone photograph's orientation lives INSIDE the EXIF. Stripping the
    // metadata without applying it first produces photographs rotated ninety
    // degrees — silently, and on every portrait shot, which is nearly every
    // photograph taken at a night. `.rotate()` with no arguments applies the
    // EXIF orientation and then clears it: it is the line that makes the
    // sanitisation invisible to whoever looks at the picture. Moving it after
    // the encoder, or deleting it as redundant, breaks that and breaks it
    // quietly.
    const output = await REENCODE[mime](pipeline.rotate()).toBuffer();

    return output;
  } catch (cause) {
    // A refusal raised inside the block above is already categorised; it must
    // not be re-wrapped into a different category on its way out.
    if (isMediaStripRefusal(cause)) throw cause;

    console.error(
      `[${MEDIA_STRIP_FAILED}] sharp refused these bytes (declared ${mime}). ` +
        `The upload is refused: an un-stripped file is never admitted. ` +
        `${describe(cause)}`
    );
    throw new MediaStripRefusal(MEDIA_STRIP_FAILED);
  }
}

/**
 * A short, safe description of a thrown thing, for the server log only.
 *
 * `sharp` is handed a Buffer and never a path, so its messages describe the
 * decode and not the file system. The `String()` fallback exists because a
 * thrown non-Error is possible and swallowing it would be the silent failure
 * this whole file is written against.
 */
function describe(cause: unknown): string {
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  return String(cause);
}

/**
 * ── The observable effect, which is NOT in this file ─────────────────────────
 *
 * `meta-gates.md`, verified 2026-08-05: **this product has no error tracking**.
 * `console.error` above therefore reaches a log that nobody watches. A failure
 * that matters needs an effect somebody SEES.
 *
 * That effect is the caller's job, and the caller is plan 35-20: it turns the
 * `reason` field of a `MediaStripRefusal` into three distinguishable messages
 * on the screen of the person uploading. Three, not one — the newsletter form
 * recorded in `.planning/codebase/CONCERNS.md` collapses every cause into
 * *«Qualcosa e' andato storto»* and is the precedent not to repeat.
 *
 * Until that lands, a refusal here is a rejected upload with a log line and
 * nothing else. That is stated rather than left to be discovered.
 */
