import { VISUAL_ASSET_KINDS, type VisualAssetKind } from "./vocabulary";
import { UUID_PATTERN, isMember, optionalText, optionalUuid } from "./write-contract";

/**
 * What a row of the dj-photograph archive is refused for, how long a signature
 * lives, and the shape checks that run **before** the database is asked.
 *
 * ── Why this is a PLAIN module and not part of the action file ──────────────
 *
 * A `"use server"` module may export nothing but async functions, so a union, a
 * constant and a validator cannot live there. That is a mechanical reason, and
 * there is a better one beside it: `may-upload.ts:27-34` records what happens
 * when a predicate is left in such a file — **every export becomes a public
 * endpoint**, and the export in question becomes an oracle. Nothing here is
 * asked over the wire; it is read by the one action module that holds the key.
 *
 * ── And why it is a SEPARATE module from `write-contract.ts` ────────────────
 *
 * That file is shared by the two authored sections — the sound manifesto and the
 * visual capitolato — and its refusal union is total over a map both of their
 * forms read (`refusals.tsx:37`). The archive belongs to **one** of those
 * sections: the manifesto has no material. Adding these causes to the shared
 * union would force the manifesto's form to carry a sentence for a refusal it
 * can never produce, which is how a shared vocabulary stops describing anything.
 *
 * ── The archive is not a gallery, and the difference decides these rules ────
 *
 * The listing goes out two days before the night, so **that night's photograph
 * cannot exist yet**: at an artist's first date there is only their press photo,
 * and from the second the piece is pulled from an archive somebody has been
 * building every Thursday (`brand-visual-system.md`, gate *l'archivio precede il
 * listing*). Two consequences are written into the checks below rather than left
 * to a convention:
 *
 *   * a photograph OF AN ARTIST with no artist recorded cannot be pulled for a
 *     listing, so it is not an archive entry — it is a stored object. That is
 *     why `artist_name_missing` exists and applies only to that kind;
 *   * a NAME IS VERIFIED AT THE SOURCE before it is used
 *     (`brand-visual-system.md`, gate *spelling degli artisti*). No check here
 *     can do that, and the surface says so in words instead of pretending.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * How long a signature lives
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The lifetime of a thumbnail's signed address, in seconds.
 *
 * ⚠ **A URL is a string somebody forwards.** That is the whole reason there is a
 * number here at all: the archive bucket is private and has no anonymous read
 * arm, so the *only* way an unauthorised person sees an archive photograph is by
 * being handed an address that still works. The lifetime is what makes that
 * window close by itself, without anybody remembering to close it.
 *
 * Five minutes, and the two directions it is chosen between are both real:
 *
 *   * **shorter** would expire while the page is still loading images on a
 *     phone connection at a venue, and a thumbnail that fails to load is
 *     indistinguishable from an empty archive to whoever is looking at it;
 *   * **longer** is time in which a copied address, pasted into a chat, still
 *     opens for somebody who does not hold this section's key.
 *
 * It is a value rather than a literal at the call site so that changing it is a
 * decision made in one place, next to its reason.
 */
export const ARCHIVE_SIGNATURE_SECONDS = 300;

/* ────────────────────────────────────────────────────────────────────────────
 * The refusals — one value per distinguishable cause, and no shared bucket
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Every way recording an archive row can be refused.
 *
 * There is no shared *something went wrong*. The recorded precedent in this
 * repository is the newsletter form answering a network fault, a missing key and
 * an address already subscribed with one indebuggable sentence
 * (`.planning/codebase/CONCERNS.md`), and this product has **no error tracking
 * at all** — so the returned value is the only place a refusal exists for a
 * human being.
 */
export type VisualAssetRefusal =
  /**
   * The kind is absent, or is not one of the two.
   *
   * Refused rather than defaulted. The two kinds are answers to different
   * questions — *a photograph of an artist* is an input to a piece, *a produced
   * piece* is an output — and guessing one files a press photo where finished
   * artwork goes, or the reverse. Neither is found again by whoever needs it.
   */
  | "invalid_kind"
  /**
   * No stored key arrived, so there is nothing to point a row at.
   *
   * Reachable when the deposit succeeded and the finalize arm refused: the
   * caller must not record a row for an object that was never written, or the
   * archive would count something that is not there.
   */
  | "object_key_missing"
  /**
   * A photograph OF AN ARTIST with nobody recorded.
   *
   * Its own cause, and it applies to one kind only. An archive exists to be
   * drawn on by name on the Monday before a Tuesday listing; a photograph
   * nobody can look up is stored, not archived. A produced piece is legitimately
   * anonymous and is not refused.
   */
  | "artist_name_missing"
  /**
   * The format identifier is not a uuid.
   *
   * Its own cause rather than folded in, because absence is legitimate here: a
   * photograph can belong to no format — it belongs to the artist — and a caller
   * reading a shared code could not tell a bad value from a blank one.
   */
  | "invalid_format_id"
  /**
   * The date is present and is not a calendar date.
   *
   * ⚠ It is the date the photograph was TAKEN, and it is legitimately absent:
   * an archive built from press photos often does not know it. It is never
   * inferred from the upload moment, which would put a false fact in the one
   * column somebody sorts by.
   */
  | "invalid_taken_on"
  /** The write was attempted and refused. Nothing was recorded. */
  | "write_failed";

/** What a refused recording answers. */
export type VisualAssetResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: VisualAssetRefusal };

/**
 * Every way minting thumbnail addresses can be refused.
 *
 * Two causes and not one: *the rows could not be read* and *storage would not
 * sign* send a reader to different places, and only the second leaves the rows
 * on the screen with their names and dates intact.
 */
export type ArchiveSignatureRefusal = "read_failed" | "sign_failed";

/**
 * What one batch of signatures answers.
 *
 * `urls` is keyed by the ROW's identifier and never by the object key: the
 * surface that renders a thumbnail has no business holding a storage pointer,
 * and a pointer a page cannot name is a pointer it cannot log, copy or link.
 */
export type ArchiveSignatureResult =
  | { readonly ok: true; readonly urls: Readonly<Record<string, string>> }
  | { readonly ok: false; readonly reason: ArchiveSignatureRefusal };

/* ────────────────────────────────────────────────────────────────────────────
 * The shape a caller hands over
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One archive row, as a caller submits it.
 *
 * Every field is `unknown`: this arrives on an untrusted POST, and a declared
 * type on a Server Action argument is a comment as far as the wire is concerned.
 *
 * ⚠ **There is no caption field here, and its absence is deliberate.** The
 * column exists and holds criteria and description; nothing on this path writes
 * it, because a free-text line beside a photograph is exactly where an address
 * or an unannounced date gets typed by somebody being helpful.
 */
export interface VisualAssetDraft {
  readonly kind?: unknown;
  readonly object_key?: unknown;
  readonly artist_name?: unknown;
  readonly format_id?: unknown;
  readonly taken_on?: unknown;
}

/** An archive row that has passed every check the database will make again. */
export interface ValidatedVisualAsset {
  readonly kind: VisualAssetKind;
  readonly object_key: string;
  readonly artist_name: string | null;
  readonly format_id: string | null;
  readonly taken_on: string | null;
}

/**
 * A calendar date in the form the column stores, checked for shape **and** for
 * existence.
 *
 * The shape test alone admits `2026-02-31`, which Postgres then refuses with a
 * code that says nothing a person can act on. Re-reading the parsed date is what
 * separates *that day does not exist* from *those characters are not a date* —
 * and both are told apart from *no date was given*, which is correct and common.
 */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

/**
 * Check a draft, and refuse it **by name** before the query.
 *
 * ⚠ **Nothing here fills anything in.** Not the kind, not the date, not the
 * artist. Every value comes from the argument, because each of the three has a
 * plausible default that would be wrong: the upload moment is not the moment a
 * photograph was taken, *produced piece* is not what most of this archive holds,
 * and a name guessed from a file name is a name nobody verified at the source.
 */
export function validateVisualAsset(
  draft: VisualAssetDraft
): { ok: true; value: ValidatedVisualAsset } | { ok: false; reason: VisualAssetRefusal } {
  if (!isMember(VISUAL_ASSET_KINDS, draft.kind)) {
    return { ok: false, reason: "invalid_kind" };
  }

  const objectKey = optionalText(draft.object_key);
  if (objectKey === null) {
    return { ok: false, reason: "object_key_missing" };
  }

  const artistName = optionalText(draft.artist_name);
  if (draft.kind === "dj_photo" && artistName === null) {
    return { ok: false, reason: "artist_name_missing" };
  }

  const format = optionalUuid(draft.format_id);
  if (!format.ok) {
    return { ok: false, reason: "invalid_format_id" };
  }

  const takenOn = optionalText(draft.taken_on);
  if (takenOn !== null && !isCalendarDate(takenOn)) {
    return { ok: false, reason: "invalid_taken_on" };
  }

  return {
    ok: true,
    value: {
      kind: draft.kind,
      object_key: objectKey,
      artist_name: artistName,
      format_id: format.value,
      taken_on: takenOn,
    },
  };
}

/**
 * The identifiers of the rows a caller wants addresses for, checked for shape.
 *
 * Every one must be a uuid: these arrive on an untrusted POST and travel into an
 * `.in()` filter, and a malformed identifier is answered by PostgREST with a
 * code that says nothing about which one was wrong. A list with a bad member is
 * refused whole rather than quietly narrowed — a page that silently dropped one
 * thumbnail would look like an archive with a hole in it.
 */
export function areUuids(values: readonly unknown[]): values is readonly string[] {
  return values.every(
    (value) => typeof value === "string" && UUID_PATTERN.test(value)
  );
}
