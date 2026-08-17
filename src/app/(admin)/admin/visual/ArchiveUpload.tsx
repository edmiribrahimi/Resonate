"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_PHOTO_BYTES,
  PHOTO_ACCEPT_STRING,
  PHOTO_MIME_TYPES,
  formatBytes,
} from "@/lib/media/upload-limits";
import {
  VISUAL_ASSET_KINDS,
  VISUAL_ASSET_KIND_LABELS,
  type VisualAssetKind,
} from "@/lib/production/sections/vocabulary";
import type {
  VisualAssetRefusal,
  VisualAssetResult,
} from "@/lib/production/sections/visual-archive";
import {
  OutcomeLine,
  SENTENCE,
  UNREACHABLE,
  NOT_PERMITTED,
  type FormatChoice,
  type Outcome,
} from "@/app/(admin)/admin/manifesto/refusals";

/**
 * Filing one photograph into the archive — three steps, and the bytes never
 * touch a Server Action.
 *
 * ── THE SHAPE OF ONE UPLOAD ─────────────────────────────────────────────────
 *
 *   1. deposit the picture in `event-media-quarantine` — a PRIVATE bucket with
 *      no read policy for anybody (`20260809004600`, section 3);
 *   2. a JSON `POST` of that object key to the archive's finalize arm, which
 *      asks this section's own key, **strips the metadata** and writes the
 *      stripped bytes into the PRIVATE `visual-archive` bucket with the service
 *      role;
 *
 *      (The arm's address is DESCRIBED here and spelled exactly once below, at
 *      the single `fetch`. The acceptance criterion of this plan counts the
 *      occurrences to assert there is one request and not two, and a second
 *      mention in prose would make a correct file fail its own check — the same
 *      choice, for the same reason, that `20260817120400_visual_archive_bucket.sql`
 *      makes about the policy clauses it must not contain.)
 *   3. only on its `ok`, `recordVisualAsset(...)` with the key that arm
 *      returned, the kind, the artist and the date.
 *
 * ── WHY IT IS THE EXISTING PATH AND NOT A NEW ONE ───────────────────────────
 *
 * A second upload mechanism would be a second thing to secure, and the thing to
 * secure is the strip: a photograph off a telephone carries GPS coordinates, a
 * date and a device model **inside the file**, so a picture taken inside a venue
 * whose address is not out carries that address in its bytes. The path above is
 * the one this product already had; what plan 45-17 added is a second
 * destination for it, and the sequence that strips is shared so the two cannot
 * drift.
 *
 * The bytes do not travel through step 2's request. A Vercel Function refuses a
 * body over **4.5 MB** and a photograph here may be up to 50 MB; the reasoning
 * and the source are in the header of `src/app/api/media/finalize/route.ts`.
 *
 * ── WHY THIS IS A SEPARATE COMPONENT FROM `MediaUpload.tsx` ─────────────────
 *
 * The plan asked for the existing uploader to be reused if a destination prop
 * would do. It would not, and the reason is not styling: **every argument that
 * component takes is a night.** It resolves which parties this viewer may upload
 * to, refuses to send anything until one is picked, calls a per-night predicate,
 * posts an event and a party in the body, and writes a row keyed to a party. The
 * archive has none of that — *the archive precedes the listing, and the listing
 * precedes the night* — so a destination prop would have meant making every one
 * of those optional, which is precisely the widening `may-upload.ts` refuses on
 * the predicate itself.
 *
 * What IS shared is what would otherwise drift: the accepted types and the size
 * ceiling come from `@/lib/media/upload-limits`, which both uploaders import.
 * No new numbers were invented here.
 *
 * ── REFUSALS ARE SENTENCES, ONE PER CAUSE ───────────────────────────────────
 *
 * There is **no error tracking in this product** (`meta-gates.md`), so a
 * `console.error` reaches a log nobody reads: this panel is the only place a
 * failure becomes observable at all. The finalize arm answers with a **category
 * as a value**, twelve of them, precisely so that this component can say twelve
 * different things instead of one — and the recording act answers with six more.
 * Collapsing them would undo that work at the last inch and would re-enact the
 * newsletter defect recorded in `.planning/codebase/CONCERNS.md`.
 *
 * The Server Action is a different case and is handled differently on purpose:
 * Next **redacts** the message of an error thrown out of one in a production
 * build, so its category cannot be read from `err.message`. It is distinguished
 * **by position** — which call in the sequence failed — which is a real
 * distinction that survives the redaction. Nothing here parses an error message.
 *
 * ── WHAT THIS COMPONENT MUST NOT DO ─────────────────────────────────────────
 *
 * ⚠ **It logs no object key and no artist name.** A key travels in a signed URL
 * and outlives the row; a name in a line-up that has not been announced is
 * material in the same sense a space under negotiation is, and it is read as an
 * announcement whether or not it was one. A log line on this project reaches a
 * screenshot.
 */

/** Where the bytes land FIRST, and the only bucket this component may name. */
const QUARANTINE_BUCKET = "event-media-quarantine";

/**
 * One sentence per way the archive arm can say no.
 *
 * A `Record<string, string>` rather than a total one over an imported union,
 * because the categories cross an HTTP boundary as strings: adding one upstream
 * and forgetting it here degrades to the fallback below — which still prints the
 * raw category — instead of melting into a shared sentence. **A category nobody
 * wrote a line for must stay identifiable on the screen.**
 */
const ARCHIVE_REASON_TEXT: Record<string, string> = {
  "media_archive.unauthenticated":
    "your session expired before the picture was filed -- sign in and try again.",
  "media_archive.malformed_request":
    "the request was malformed, so nothing was filed. This is a bug in the app, not something you did.",
  "media_archive.path_not_yours":
    "that upload does not belong to your session, so it was not filed.",
  "forbidden.production_visual_manage_required":
    "this account is not allowed to file into the visual archive. If this panel was open a moment ago, reload the page and check what it can still do.",
  "media_archive.permission_unresolved":
    "we could not check your permission, so nothing was filed. Your upload is still held -- try again in a moment.",

  "media_finalize.source_missing":
    "the upload was no longer in the holding area, so nothing was filed. Select the picture again.",
  "media_finalize.source_unreadable":
    "we could not read the upload back from the holding area, so nothing was filed. It is still held -- try again in a moment.",
  "media_finalize.type_not_accepted":
    "the archive keeps only pictures that can have their location data removed -- JPEG, PNG or WebP. Nothing that cannot be stripped is kept, because the archive is drawn on months later.",
  "media_finalize.already_published":
    "something already occupies that name in the archive, so this one was not filed. Try again.",
  "media_finalize.publish_failed":
    "the picture could not be written to the archive. Your upload is still held -- try again in a moment.",
  "media_finalize.unexpected":
    "something we did not anticipate went wrong, so nothing was filed. Your upload is still held -- try again in a moment.",

  "media_strip.unsupported_type":
    "this image type cannot have its metadata stripped, so it was not filed.",
  "media_strip.tool_unavailable":
    "the tool that removes location data from photographs is unavailable, so nothing was filed. Your upload is still held -- try again in a moment.",
  "media_strip.failed":
    "stripping the picture's metadata failed, so it was NOT filed. A photograph taken at a venue whose address is not out carries its coordinates, so we would rather lose the upload than keep them.",
};

/**
 * One sentence per way the recording act can say no.
 *
 * ⚠ **Total over the union**, unlike the map above, and the difference is not an
 * inconsistency: this one crosses no HTTP boundary, so a cause added to
 * `VisualAssetRefusal` without a sentence here is an `npm run build` error —
 * which is the only part of this contract a compiler can hold in a repository
 * with no test runner.
 *
 * ⚠⚠ **EVERY ONE OF THESE FIRES AFTER THE BYTES ARE IN THE ARCHIVE, and each
 * sentence has to say so.** Step 3 of `submit` is the only caller, and it runs
 * only once the finalize arm has answered `ok` — which means the picture has
 * been stripped, written into `visual-archive` and its holding copy removed. A
 * refusal here therefore leaves an OBJECT WITH NO ROW.
 *
 * These sentences used to open with *«Nothing was recorded»*. That is true of the
 * row and false of the world, and it is read as *nothing happened* by the person
 * in front of it — who then does the one thing that makes it worse, which is
 * upload the picture again. It is the newsletter defect recorded in
 * `.planning/codebase/CONCERNS.md` in its other form: not an error swallowed, an
 * error DESCRIBED WRONG, with a persistent effect behind it.
 *
 * The reason it matters more than a wording: an object no row names is reachable
 * by nothing in this product. `production_visual_asset` is only ever inserted
 * into and selected from, the archive bucket has no sweep, and *removal stays
 * possible* is a capacity of the service role rather than a function anybody
 * holding this section's key can reach. So an orphan is a photograph of a
 * recognisable person that cannot be taken out of the product — and telling
 * somebody is the whole of the remedy, which is why every sentence ends there.
 */
const RECORD_REASON_TEXT: Record<VisualAssetRefusal, string> = {
  invalid_kind:
    "The picture is IN THE ARCHIVE and no entry was written for it, so nothing on this page can find it again -- tell somebody, and do not upload it a second time. The cause: nobody said whether this is a photograph of an artist or a produced piece, and there is no default. This form is meant to refuse before sending in that case, so reaching this sentence is itself worth reporting.",
  object_key_missing:
    "The picture MAY be in the archive and no entry was written for it: the app lost track of where it was put, so this page cannot tell you which of the two states you are in. Reload before uploading it again, and tell somebody if it happens twice.",
  artist_name_missing:
    "The picture is IN THE ARCHIVE and no entry was written for it, so nothing on this page can find it again -- tell somebody, and do not upload it a second time. The cause: a photograph of an artist needs the artist's name, because the archive is looked up BY NAME on the Monday before a Tuesday listing. This form is meant to refuse before sending in that case, so reaching this sentence is itself worth reporting.",
  invalid_format_id:
    "The picture is IN THE ARCHIVE and no entry was written for it, so nothing on this page can find it again -- tell somebody, and do not upload it a second time. The cause: the format could not be identified. A photograph may belong to no format at all -- it belongs to the artist -- but it cannot belong to one this page cannot name.",
  invalid_taken_on:
    "The picture is IN THE ARCHIVE and no entry was written for it, so nothing on this page can find it again -- tell somebody, and do not upload it a second time. The cause: that is not a calendar date. Leaving it empty is fine and common -- an archive built from press photos often does not know when they were taken, and a guessed date is worse than none.",
  write_failed:
    "The picture is IN THE ARCHIVE and its entry was not written, so it will not appear in the list and nothing on this page can find it again. Tell somebody rather than uploading it again: a second upload files a second copy that nothing names either.",
};

/** What the picker has accepted, before anything is sent. */
interface PickedPhoto {
  readonly file: globalThis.File;
  readonly preview: string;
}

interface ArchiveUploadProps {
  /** The listed formats, or `null` when the catalogue could not be read. */
  readonly formats: FormatChoice[] | null;
  /** The recording act, taken as a prop for the reason `SectionForm` gives. */
  readonly record: (draft: {
    kind: string;
    object_key: string;
    artist_name: string;
    format_id: string;
    taken_on: string;
  }) => Promise<VisualAssetResult>;
}

/**
 * What is still missing before a single byte may leave the device, as the
 * sentence to show — or `null` when nothing is.
 *
 * ── WHY A GUARD EXISTS HERE AT ALL ──────────────────────────────────────────
 *
 * The sequence in `submit` deposits, strips and writes into the archive BEFORE
 * the row is validated, and the holding copy is removed on the way. So a refusal
 * at step 3 does not undo step 2: it leaves an object in a private bucket that no
 * row names, no surface enumerates and no sweep collects. Two of the six causes
 * were reachable by simply not answering *What is it?* — which made *forgetting a
 * field* and *creating an object nobody can ever remove* the same gesture.
 *
 * ── AND WHY IT IS SHAPED LIKE THIS ONE AND NOT INVENTED ─────────────────────
 *
 * `OpenQuestionForm.tsx` already does exactly this: an `incomplete` computed from
 * the required fields, handed to its own submit control's `disabled`. That form
 * also records the limit of the technique, and it holds here unchanged — **this
 * takes nothing outside this card out of service.** It is one control refusing to
 * send an incomplete thing, not a surface blocking work: a block that fires under
 * deadline is a block somebody routes around.
 *
 * ── IT RETURNS THE SENTENCE, NOT A BOOLEAN ──────────────────────────────────
 *
 * A disabled button with no sentence beside it is a surface that says no without
 * saying what for, and this product has no error tracking: the sentence on the
 * screen is the whole of the observable effect. One cause, one sentence — the
 * same rule the two maps above keep.
 *
 * ⚠ The date and the format are NOT checked here. Both come from controls that
 * can only produce a valid value or an empty one, so a check would be a second
 * copy of `validateVisualAsset`'s rules living in a component and drifting from
 * it. They remain reachable by a tampered page, and the sentences for them now
 * say what exists when they fire.
 */
function whatIsMissing(
  picked: PickedPhoto | null,
  kind: VisualAssetKind | "",
  artistName: string
): string | null {
  if (picked === null) return "Choose a picture to enable this.";

  if (kind === "")
    return "Say what it is before this can be filed. There is no default: guessing files a press photo where finished artwork goes, and neither is found again by whoever needs it.";

  if (kind === "dj_photo" && artistName.trim() === "")
    return "A photograph of an artist needs the artist's name before it is filed. The archive is looked up BY NAME on the Monday before a Tuesday listing, and a picture nobody can look up is stored rather than archived.";

  return null;
}

/** The extension for a key, from the name if it has one and from the type if not. */
function extensionFor(file: globalThis.File): string {
  const dot = file.name.lastIndexOf(".");
  if (dot >= 0) {
    const fromName = file.name.slice(dot + 1).toLowerCase();
    if (/^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  }
  const fromType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return fromType[file.type] ?? "bin";
}

export function ArchiveUpload({ formats, record }: ArchiveUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [picked, setPicked] = useState<PickedPhoto | null>(null);
  const [kind, setKind] = useState<VisualAssetKind | "">("");
  const [artistName, setArtistName] = useState("");
  const [formatId, setFormatId] = useState("");
  const [takenOn, setTakenOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const artistRequired = kind === "dj_photo";

  /** The one guard, read by the button and asked again inside `submit`. */
  const missing = whatIsMissing(picked, kind, artistName);
  const incomplete = missing !== null;

  const choose = useCallback((files: FileList | null) => {
    setOutcome(null);
    const file = files?.[0];
    if (file === undefined) return;

    // Both refusals are their own sentence, and both name the file so that
    // picking several in a row is not confusing.
    if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setOutcome({
        tone: "crit",
        message: `"${file.name}" is a ${file.type || "type the browser did not name"}. The archive keeps only pictures whose location data can be removed -- JPEG, PNG or WebP.`,
      });
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setOutcome({
        tone: "crit",
        message: `"${file.name}" is ${formatBytes(file.size)} and the ceiling is ${formatBytes(MAX_PHOTO_BYTES)}.`,
      });
      return;
    }

    setPicked((previous) => {
      if (previous !== null) URL.revokeObjectURL(previous.preview);
      return { file, preview: URL.createObjectURL(file) };
    });
  }, []);

  const clear = useCallback(() => {
    setPicked((previous) => {
      if (previous !== null) URL.revokeObjectURL(previous.preview);
      return null;
    });
    if (inputRef.current !== null) inputRef.current.value = "";
  }, []);

  const submit = async () => {
    if (picked === null || busy) return;

    /*
      The same guard the button reads, asked again — because `disabled` is a
      property of a rendered control and not a boundary. It survives no reload,
      no devtools and no stale render, and what is on the other side of it here
      is not a rejected form: it is an object written into a private bucket that
      nothing in this product can name again.

      It answers with the sentence rather than returning quietly. A control that
      does nothing when pressed is the silent failure this file's header refuses
      twice over.
    */
    if (missing !== null) {
      setOutcome({ tone: "crit", message: missing });
      return;
    }

    setBusy(true);
    setOutcome(null);

    const supabase = createClient();

    // ── Step 0: who is this ────────────────────────────────────────────────
    //
    // The first segment of the key is the caller's own id, and the arm refuses
    // any key whose first segment is somebody else's. Reading it here is a
    // convenience, not a boundary: the server re-derives it from the session.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      setOutcome({
        tone: "crit",
        message:
          "Nothing was filed: your session could not be read. Sign in again and retry.",
      });
      setBusy(false);
      return;
    }

    /*
      The key, and it carries NOTHING.

      ⚠ A key travels in a signed URL, in a request log and in an error message,
      and it outlives the row. It must carry no artist name, no venue word and no
      date that has not been communicated -- the migration that created the
      archive bucket says so, and this is the line that has to make it true.

      So: the caller's id, a random identifier and the extension. Not the file's
      own name, which is very often the artist's; not a timestamp, which is a
      date, and the one date nobody meant to publish is the one nobody noticed
      was in a name.
    */
    const objectKey = `${user.id}/${crypto.randomUUID()}.${extensionFor(picked.file)}`;

    // ── Step 1: deposit into the PRIVATE holding area ──────────────────────
    const { error: depositError } = await supabase.storage
      .from(QUARANTINE_BUCKET)
      .upload(objectKey, picked.file, { contentType: picked.file.type });

    if (depositError !== null) {
      // The category, never the key.
      console.error(
        `[visual_archive.deposit_failed] code=${depositError.name} message=the holding area refused the write`
      );
      setOutcome({
        tone: "crit",
        message:
          "The picture could not be placed in the holding area, so it was never filed. Nothing left your device's control.",
      });
      setBusy(false);
      return;
    }

    // ── Step 2: the ONLY path into the archive bucket ──────────────────────
    //
    // It asks this section's key, strips the metadata and writes the result with
    // the service role. Its refusal arrives as a VALUE, which is the whole reason
    // it answers this way.
    let storedKey: string;
    try {
      const response = await fetch("/api/media/finalize-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quarantinePath: objectKey, mimeType: picked.file.type }),
      });

      const payload: unknown = await response.json().catch(() => null);
      const accepted =
        typeof payload === "object" &&
        payload !== null &&
        (payload as { ok?: unknown }).ok === true;

      if (!response.ok || !accepted) {
        const reason =
          typeof payload === "object" &&
          payload !== null &&
          typeof (payload as { reason?: unknown }).reason === "string"
            ? (payload as { reason: string }).reason
            : `http_${response.status}`;
        console.error(
          `[visual_archive.finalize_refused] code=${reason} message=the archive arm refused`
        );
        setOutcome({
          tone: "crit",
          message:
            ARCHIVE_REASON_TEXT[reason] ??
            `It was refused with an unrecognised reason (${reason}), so it was not filed.`,
        });
        setBusy(false);
        return;
      }

      const path = (payload as { path?: unknown }).path;
      if (typeof path !== "string" || path === "") {
        throw new Error("archive.missing_path");
      }
      storedKey = path;
    } catch {
      // A network fault or an unreadable answer. Distinct from every refusal
      // above, because the picture may or may not have been filed and the person
      // deserves to be told which uncertainty they are in.
      console.error("[visual_archive.finalize_unreachable] code=network message=no answer");
      setOutcome({
        tone: "crit",
        message:
          "We could not reach the server that files it, so it may or may not have gone through. Reload the page before trying again.",
      });
      setBusy(false);
      return;
    }

    // ── Step 3: the entry, and only now ────────────────────────────────────
    //
    // Distinguished by POSITION from step 2: if this fails, the picture IS in the
    // archive and only its entry is missing. Saying "the upload failed" here
    // would be false, and the difference matters -- the object exists and nobody
    // can find it.
    try {
      const result = await record({
        kind,
        object_key: storedKey,
        artist_name: artistName,
        format_id: formatId,
        taken_on: takenOn,
      });

      if (!result.ok) {
        setOutcome({ tone: "crit", message: RECORD_REASON_TEXT[result.reason] });
        setBusy(false);
        return;
      }
    } catch (thrown) {
      // Branching on the SHAPE of the failure and not on its message: a thrown
      // error that reached the server is the gate saying no, and a `TypeError` is
      // the request never having arrived.
      const unreachable =
        thrown instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);
      setOutcome({ tone: "crit", message: unreachable ? UNREACHABLE : NOT_PERMITTED });
      setBusy(false);
      return;
    }

    clear();
    setKind("");
    setArtistName("");
    setFormatId("");
    setTakenOn("");
    setOutcome({
      tone: "done",
      message:
        "Filed. It is held privately: the archive is not published, and a thumbnail on this page loads through an address the server signs for a few minutes at a time.",
    });
    setBusy(false);
    router.refresh();
  };

  return (
    <Card>
      <h3 className="text-base font-semibold text-ink">Add to the archive</h3>

      <p className={`mt-2 ${SENTENCE}`}>
        Pictures are held <strong className="font-semibold text-ink">privately</strong>{" "}
        and are not published by being filed here. Location data is removed
        before anything is stored -- a photograph taken indoors carries the
        address it was taken at, inside the file.
      </p>

      <div className="mt-4 space-y-4">
        {/* The picker. A real control: the input itself is not displayed, so a
            division would leave no keyboard path to it at all. */}
        <div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {picked === null ? "Choose a picture" : "Choose a different picture"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_ACCEPT_STRING}
            className="hidden"
            onChange={(event) => choose(event.target.files)}
          />
          <p className={`mt-2 ${SENTENCE}`}>
            JPEG, PNG or WebP, up to {formatBytes(MAX_PHOTO_BYTES)}. No video: nothing
            in this product can remove a video&apos;s location data, and nothing that
            cannot be stripped is kept in an archive that is drawn on months later.
          </p>
        </div>

        {picked === null ? null : (
          <div className="flex items-center gap-3">
            {/* The local preview, from the picked file and not from the server:
                nothing has been uploaded yet at this point. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={picked.preview}
              alt=""
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{picked.file.name}</p>
              <p className="text-xs text-muted">{formatBytes(picked.file.size)}</p>
            </div>
          </div>
        )}

        <Select
          id="archive-kind"
          label="What is it?"
          value={kind}
          onChange={(event) => setKind(event.target.value as VisualAssetKind | "")}
          disabled={busy}
        >
          {/* No preselection, for the reason the section form gives about its own
              control: the two kinds answer different questions, and one chosen by
              inattention files a press photo where finished artwork goes. */}
          <option value="">Say which...</option>
          {VISUAL_ASSET_KINDS.map((value) => (
            <option key={value} value={value}>
              {VISUAL_ASSET_KIND_LABELS[value]}
            </option>
          ))}
        </Select>

        <Input
          id="archive-artist"
          label={artistRequired ? "Artist (required)" : "Artist (optional)"}
          value={artistName}
          onChange={(event) => setArtistName(event.target.value)}
          disabled={busy}
        />
        <p className={SENTENCE}>
          Verify the spelling at the source before you type it. A name misspelled
          here becomes a name misspelled on a published piece, and that does not
          come back -- it is a discourtesy to whoever is playing.
        </p>

        {formats === null ? (
          <p className={SENTENCE}>
            The list of formats could not be read, so this picture can only be
            filed as belonging to no format. That is a legitimate answer -- a
            photograph belongs to the artist -- but it is not the one being
            chosen here.
          </p>
        ) : (
          <Select
            id="archive-format"
            label="Format (optional)"
            value={formatId}
            onChange={(event) => setFormatId(event.target.value)}
            disabled={busy}
          >
            <option value="">No format -- it belongs to the artist</option>
            {formats.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name}
              </option>
            ))}
          </Select>
        )}

        <Input
          id="archive-taken-on"
          type="date"
          label="Taken on (optional)"
          value={takenOn}
          onChange={(event) => setTakenOn(event.target.value)}
          disabled={busy}
        />
        <p className={SENTENCE}>
          Leave it empty if you do not know. It is never filled in from the moment
          of upload: that would put a date in the one column somebody sorts by,
          and it would be the wrong one.
        </p>

        <Button className="w-full" onClick={submit} disabled={incomplete || busy}>
          {busy ? "Filing..." : "File it"}
        </Button>
        {/* The sentence beside the inert control, and it names WHICH answer is
            missing. A control disabled without one is a surface saying no
            without saying what for -- and here the thing on the far side of the
            press is irreversible, so the person deserves to know before they
            press rather than after. */}
        {missing === null ? null : (
          <p className={`text-center ${SENTENCE}`}>{missing}</p>
        )}
      </div>

      <OutcomeLine outcome={outcome} />
    </Card>
  );
}
