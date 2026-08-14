"use client";

/**
 * The upload box, and the two things it stopped being able to do.
 *
 * It no longer writes to the **public** bucket, and it no longer uploads without
 * naming a night. Both were true until plan 35-21; the first is the reason the
 * metadata strip could be walked around, the second is the reason a per-night
 * assignment granted a power nobody could spend.
 *
 * ── The shape of one upload, and why it is three steps and not one ───────────
 *
 *   1. deposit the file in `event-media-quarantine` — a PRIVATE bucket with no
 *      read policy for anybody (`20260809004600`, section 3);
 *   2. `POST /api/media/finalize`, which authorises on the night, strips the
 *      metadata and writes the stripped bytes to the public bucket with the
 *      service role;
 *   3. only on its `ok`, `registerMedia(...)` with the key that route returned.
 *
 * The bytes do not travel through step 2's request. A Vercel Function refuses a
 * body over **4.5 MB** with `FUNCTION_PAYLOAD_TOO_LARGE`, and this component
 * accepts photos up to 50 MB — the reasoning and the source are in the header of
 * `src/app/api/media/finalize/route.ts`.
 *
 * ── The window this component does NOT close ─────────────────────────────────
 *
 * Writing to the quarantine bucket removes the *product's* path to the public
 * one. It does not remove *the* path: until
 * `supabase/migrations/20260809006000_event_media_server_upload_only.sql` is
 * applied by hand — row 15 of the queue in `35-HUMAN-UAT.md`, the one row that
 * is applied AFTER the deploy — any approved session can still write straight
 * into `event-media` from a browser console and skip the strip entirely. The
 * door is `20260225120000_phase7_media.sql:70-77`. This file changing is not
 * that row being applied, and nobody should read it as such.
 *
 * ── Refusals are sentences, one per cause ────────────────────────────────────
 *
 * There is **no error tracking in this product** (`meta-gates.md`), so a
 * `console.error` here reaches a log nobody reads: this screen is the only place
 * a failure becomes observable at all. `/api/media/finalize` answers with a
 * **category as a value** — seventeen of them — precisely so that this component
 * can say seventeen different things instead of one. Collapsing them would undo
 * that work at the last inch and would re-enact the recorded newsletter defect
 * (`.planning/codebase/CONCERNS.md`).
 *
 * The two Server Actions are a different case and are handled differently on
 * purpose: Next **redacts** the message of an error thrown out of a Server Action
 * in a production build (`35-PATTERNS.md` S3), so their category cannot be read
 * from `err.message`. They are separated **by position** instead — which call in
 * the sequence threw — which is a real distinction that survives the redaction.
 * Nothing in this file parses an error message.
 *
 * ── Language ─────────────────────────────────────────────────────────────────
 *
 * The copy is English, like every other user-facing string in this product
 * (measured: no Italian string exists anywhere under `src/`). A half-Italian
 * upload box inside an English application is a defect, not a translation.
 *
 * ── Converted by plan 41.2-18, and what the conversion did NOT touch ─────────
 *
 * The three steps above, their order, the seventeen categories, the two Server
 * Actions and the key scheme are **byte-identical**. Nothing about when the
 * publishing route is called, or with what body, moved. The one bucket this file
 * may name is still the only one it names, and that is asserted by running
 * `verify-media-strip`'s third check rather than by reasoning about a class
 * string.
 *
 * **The preview grid's axis was MIGRATED, not deleted.** It was the last use in
 * this tree of the retired small tier that no primitive absorbs. The analog is
 * `MediaReviewGrid.tsx:154`, and what was copied is its *rule* — the small-tier
 * rule moves onto the tablet tier and the tier above it stays put — rather than
 * its literal string. That grid's base is one column because ITS incumbent base
 * was one column; this one previews square thumbnails, so a one-column base
 * would give every picked file a full-width square on a phone. The base is
 * unchanged and the axis is off the retired tier.
 *
 * **The drop zone became a real control.** It was a clickable division holding a
 * file input that is not displayed, so there was **no keyboard path to the file
 * picker at all** — measured, zero. It is now a button, which brings the shared
 * focus expression, a name the platform announces, and a boundary drawn with the
 * control token rather than the decorative line one (`Card.tsx:20-33`: the
 * question is not what it looks like, it is whether it can be operated).
 */

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateMediaUpload, registerMedia } from "@/app/(public)/events/[slug]/actions";
import { Button, IconButton, FOCUS_RING } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";

// File validation constants
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const ALL_ALLOWED_TYPES = [...ALLOWED_PHOTO_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_PHOTO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

const ACCEPT_STRING = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

/**
 * Where the bytes land FIRST, and the only bucket this component may name.
 *
 * The public bucket `event-media` is deliberately absent from this file — the
 * structural check `npm run verify:media-strip` fails if it reappears here, and
 * that check is the guard against a second writer growing back later.
 */
const QUARANTINE_BUCKET = "event-media-quarantine";

/**
 * One sentence per way the finalize route can say no.
 *
 * Written as a `Record` over the categories that route exports as values, so
 * that adding a category upstream and forgetting it here degrades to the
 * fallback below — which still prints the raw category — rather than to a shared
 * message that hides which of the seventeen happened.
 *
 * The two the plan asks to be spelled out in full are the strip failure and the
 * video-on-a-secret-night refusal: those are the two a member will actually
 * meet, and both are cases where "upload failed, try again" would be a lie.
 */
const FINALIZE_REASON_TEXT: Record<string, string> = {
  // Refusals of the person, or of what they sent.
  "media_finalize.unauthenticated":
    "your session expired before the file was published -- sign in and try again.",
  "media_finalize.malformed_request":
    "the upload request was malformed, so nothing was published. This is a bug in the app, not something you did.",
  "media_finalize.path_not_yours":
    "that file does not belong to your session, so it was not published.",
  "media.party_not_of_event":
    "the night you picked belongs to a different event, so the file was not published.",
  "forbidden.media_upload_required":
    "you are not allowed to upload to that night. A photo assignment covers one night only.",

  // The question could not be answered. NOT a refusal of the person.
  "media_finalize.permission_unresolved":
    "we could not check your permission for that night, so nothing was published. Your file is still held -- try again in a moment.",
  "media_finalize.source_unreadable":
    "we could not read the file back from the holding area, so nothing was published. Your file is still held -- try again in a moment.",
  "media_finalize.publish_failed":
    "the file could not be written to the gallery. Your file is still held -- try again in a moment.",
  "media_finalize.unexpected":
    "something we did not anticipate went wrong, so nothing was published. Your file is still held -- try again in a moment.",

  // Terminal, and each says what it actually means.
  "media_finalize.source_missing":
    "the uploaded file was no longer in the holding area, so nothing was published. Select it again.",
  "media_finalize.type_not_accepted":
    "that file type is not accepted, so it was not published.",
  "media_finalize.container_mismatch":
    "the file's contents do not match the type it claims to be, so it was not published.",
  "media_finalize.video_on_secret_night":
    "videos are not allowed on this night. Its venue is secret, and we cannot strip a video's location data -- photos are fine.",
  "media_finalize.already_published":
    "a file already exists at that name in the gallery, so this one was not published. Try uploading it again.",

  // The stripper's three, owned by `src/lib/media/strip-metadata.ts`.
  "media_strip.unsupported_type":
    "this image type cannot have its metadata stripped, so it was not uploaded.",
  "media_strip.tool_unavailable":
    "the tool that removes location data from photos is unavailable, so the file was NOT uploaded. Your file is still held -- try again in a moment.",
  "media_strip.failed":
    "stripping the photo's metadata failed, so the file was NOT uploaded. A photo taken at a secret venue carries its coordinates, so we would rather lose the upload than publish them.",
};

/** A night this viewer may upload to. Resolved on the server, never here. */
export interface UploadableParty {
  id: string;
  title: string;
  date: string;
}

interface SelectedFile {
  file: File;
  preview: string;
  type: "photo" | "video";
  error?: string;
}

interface MediaUploadProps {
  eventId: string;
  /**
   * The nights this viewer may upload to, resolved by
   * `hasCapability(CAP.MEDIA_UPLOAD, { partyId })` on the server for each night
   * of the event (`events/[slug]/page.tsx`). This list is a **convenience, not a
   * boundary**: it lives in the browser, so it can be edited. Every night named
   * here is re-checked by `validateMediaUpload`, by `/api/media/finalize` and by
   * `registerMedia`, each against the same one predicate.
   */
  uploadableParties: UploadableParty[];
  onUploadComplete?: () => void;
}

/** `2026-10-10` -> `Sat 10 Oct`. Local formatting only; nothing is parsed back. */
function formatNightDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** The label a night carries in the picker and in the single-night line. */
function nightLabel(party: UploadableParty): string {
  return `${party.title} -- ${formatNightDate(party.date)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(file: File): string {
  const name = file.name;
  const dot = name.lastIndexOf(".");
  if (dot >= 0) return name.slice(dot + 1).toLowerCase();
  // Fallback from MIME type
  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return mimeMap[file.type] || "bin";
}

export default function MediaUpload({
  eventId,
  uploadableParties,
  onUploadComplete,
}: MediaUploadProps) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, "pending" | "uploading" | "done" | "error">>(new Map());
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<{ name: string; message: string }[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Which night, and why there is no preselection ──────────────────────────
  //
  // With more than one night the picker starts EMPTY and the upload button stays
  // disabled until a night is chosen. Preselecting would make the common case
  // "the night chosen by inattention", and a photograph filed under the wrong
  // night is not a cataloguing slip when one of those nights happens inside a
  // venue whose address is still secret.
  //
  // With exactly one night there is no picker: it is used, and it is NAMED on
  // screen, so nobody uploads without seeing where the file is going.
  //
  // With zero nights the control does not render. `canUpload` should have been
  // false upstream, so arriving here means a permission question went
  // unanswered — an error state with its own sentence, never a mute box
  // (`nextjs-architecture.md`, gate *stato vuoto e d'errore*).
  const soleParty = uploadableParties.length === 1 ? uploadableParties[0] : null;
  const [selectedPartyId, setSelectedPartyId] = useState<string>(soleParty?.id ?? "");
  const selectedParty =
    uploadableParties.find((p) => p.id === selectedPartyId) ?? null;

  const validateFile = useCallback((file: File): { valid: boolean; type: "photo" | "video"; error?: string } => {
    const isPhoto = ALLOWED_PHOTO_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isPhoto && !isVideo) {
      return { valid: false, type: "photo", error: `"${file.name}" -- unsupported file type (${file.type || "unknown"})` };
    }

    const type = isPhoto ? "photo" : "video";
    const maxSize = isPhoto ? MAX_PHOTO_SIZE : MAX_VIDEO_SIZE;

    if (file.size > maxSize) {
      const limit = isPhoto ? "10MB" : "100MB";
      return { valid: false, type, error: `"${file.name}" exceeds ${limit} limit (${formatFileSize(file.size)})` };
    }

    return { valid: true, type };
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setError(null);
    setFileErrors([]);
    setSuccessMessage(null);
    const fileArray = Array.from(newFiles);
    const errors: string[] = [];
    const validFiles: SelectedFile[] = [];

    for (const file of fileArray) {
      const result = validateFile(file);
      if (result.valid) {
        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
          type: result.type,
        });
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      setError(errors.join(". "));
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, [validateFile]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleUpload = async () => {
    if (files.length === 0 || uploading) return;

    // The night is required by every layer below, so it is required here too --
    // and refused with its own sentence rather than a disabled button that
    // explains nothing.
    const partyId = selectedPartyId;
    if (!partyId) {
      setError("Pick which night these files are from before uploading.");
      return;
    }

    setUploading(true);
    setError(null);
    setFileErrors([]);
    setSuccessMessage(null);

    // ── Step 1: may this session upload to THIS night? ────────────────────────
    //
    // Position, not message: a throw here is the permission question, and it is
    // the only thing this catch can mean. Next redacts the message in
    // production, so `err.message` is not read.
    let userId: string;
    try {
      const result = await validateMediaUpload(eventId, partyId);
      userId = result.userId;
    } catch (cause) {
      console.error("[media_upload.validate_failed] permission check threw", cause);
      setError(
        "We could not confirm you may upload to that night, so nothing was uploaded. " +
          "If you were assigned to a different night, pick that one."
      );
      setUploading(false);
      return;
    }

    // ── Step 2: quarantine -> finalize -> register, per file ──────────────────
    const supabase = createClient();
    const progressMap = new Map<number, "pending" | "uploading" | "done" | "error">();
    files.forEach((_, i) => progressMap.set(i, "pending"));
    setUploadProgress(new Map(progressMap));

    const failures: { name: string; message: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const selectedFile = files[i];
      progressMap.set(i, "uploading");
      setUploadProgress(new Map(progressMap));

      const ext = getFileExtension(selectedFile.file);
      // The SAME key scheme as before. `/api/media/finalize` requires exactly
      // three segments, the first two being this event and the caller's own id,
      // and publishes the stripped bytes under the same key.
      const quarantinePath = `${eventId}/${userId}/${Date.now()}-${i}.${ext}`;

      // 2a. Deposit into the PRIVATE bucket. Nothing is reachable from here:
      //     `20260809004600` grants no read policy to anybody, deliberately.
      const { error: depositError } = await supabase.storage
        .from(QUARANTINE_BUCKET)
        .upload(quarantinePath, selectedFile.file, {
          contentType: selectedFile.file.type,
        });

      if (depositError) {
        progressMap.set(i, "error");
        setUploadProgress(new Map(progressMap));
        console.error(
          `[media_upload.deposit_failed] ${QUARANTINE_BUCKET} write refused`,
          depositError
        );
        failures.push({
          name: selectedFile.file.name,
          message:
            "the file could not be placed in the holding area, so it was never published. Nothing left your device's control.",
        });
        continue;
      }

      // 2b. The ONLY path to the public bucket. It authorises on the night,
      //     strips the metadata and writes the result with the service role.
      let finalizedPath: string;
      try {
        const response = await fetch("/api/media/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            partyId,
            quarantinePath,
            mimeType: selectedFile.file.type,
            fileSize: selectedFile.file.size,
          }),
        });

        const payload: unknown = await response.json().catch(() => null);
        const ok =
          typeof payload === "object" &&
          payload !== null &&
          (payload as { ok?: unknown }).ok === true;

        if (!response.ok || !ok) {
          // The category arrives as a VALUE, which is the whole reason the route
          // answers this way. An unknown category still prints itself rather
          // than melting into a shared sentence -- a category nobody wrote a line
          // for must remain identifiable on the screen.
          const reason =
            typeof payload === "object" &&
            payload !== null &&
            typeof (payload as { reason?: unknown }).reason === "string"
              ? (payload as { reason: string }).reason
              : `http_${response.status}`;
          const text =
            FINALIZE_REASON_TEXT[reason] ??
            `it was refused with an unrecognised reason (${reason}), so it was not published.`;
          progressMap.set(i, "error");
          setUploadProgress(new Map(progressMap));
          console.error(`[${reason}] media finalize refused for one file`);
          failures.push({ name: selectedFile.file.name, message: text });
          continue;
        }

        const path = (payload as { path?: unknown }).path;
        if (typeof path !== "string" || path === "") {
          throw new Error("finalize.missing_path");
        }
        finalizedPath = path;
      } catch (cause) {
        // A network fault or an unreadable answer. Distinct from every refusal
        // above, because the file may or may not have been published and the
        // person deserves to be told which uncertainty they are in.
        progressMap.set(i, "error");
        setUploadProgress(new Map(progressMap));
        console.error("[media_upload.finalize_unreachable]", cause);
        failures.push({
          name: selectedFile.file.name,
          message:
            "we could not reach the server that publishes it, so it may or may not have gone through. Refresh the page before trying again.",
        });
        continue;
      }

      // 2c. The row, with the night. Only now, and only with the key the route
      //     returned.
      try {
        await registerMedia(
          eventId,
          partyId,
          finalizedPath,
          selectedFile.type,
          selectedFile.file.size
        );
        progressMap.set(i, "done");
        setUploadProgress(new Map(progressMap));
      } catch (cause) {
        progressMap.set(i, "error");
        setUploadProgress(new Map(progressMap));
        console.error("[media_upload.register_failed] row insert threw", cause);
        // Distinguished by POSITION from 2b: the bytes ARE published, only the
        // row is missing. Saying "upload failed" here would be false, and the
        // difference matters -- the file exists in the gallery bucket and an
        // organizer cannot see it to moderate it.
        failures.push({
          name: selectedFile.file.name,
          message:
            "it was published but could not be recorded, so it will not appear in the gallery. Tell an organizer rather than uploading it again.",
        });
      }
    }

    if (failures.length === 0) {
      // Clean up previews
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
      setUploadProgress(new Map());
      setSuccessMessage("Media uploaded! It will appear after organizer approval.");
      onUploadComplete?.();
    } else {
      // One line per file, each carrying its own cause. There is deliberately no
      // single summary sentence: a shared message is the recorded newsletter
      // defect, and it is the exact thing seventeen server-side categories exist
      // to avoid.
      setFileErrors(failures);
      if (failures.length < files.length) onUploadComplete?.();
    }

    setUploading(false);
  };

  // Zero nights, with the box rendered anyway: `canUpload` was true on some
  // other ground while no night resolved. It is a distinguishable ERROR STATE,
  // never a mute control -- and never a drop zone that accepts files it cannot
  // send anywhere.
  if (uploadableParties.length === 0) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-sem-warn/40 bg-sem-warn/10 p-4"
      >
        <p className="text-sm text-sem-warn">
          Uploads are unavailable here right now: we could not work out which
          night a file would belong to. Reload the page, and tell an organizer if
          it keeps happening.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Which night ──────────────────────────────────────────────────────
          One night: named, never a silent default. Several: an empty picker,
          because a preselected night is a night chosen by inattention. */}
      {soleParty ? (
        <p className="text-sm text-muted">
          Uploading to <span className="text-ink">{nightLabel(soleParty)}</span>
        </p>
      ) : (
        <Select
          id="media-upload-night"
          label="Which night are these from?"
          value={selectedPartyId}
          onChange={(e) => {
            setSelectedPartyId(e.target.value);
            setError(null);
          }}
          disabled={uploading}
        >
          <option value="">Select a night...</option>
          {uploadableParties.map((party) => (
            <option key={party.id} value={party.id}>
              {nightLabel(party)}
            </option>
          ))}
        </Select>
      )}

      {/* Drop zone.

          A button and no longer a clickable division: the file input below is
          not displayed, so before this conversion the ONLY way to open the
          picker was a pointer. The element carries the shared focus expression
          and a boundary drawn with the control token, because it can be
          operated — `Card.tsx:20-33`. The input stays a sibling rather than a
          child: a form control inside a button is not valid content, and the
          wrapper keeps the surrounding rhythm at exactly the slots it had. */}
      <div>
        <button
          type="button"
          className={`relative flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${FOCUS_RING} ${
            dragOver
              ? "border-accent bg-accent/5"
              : "border-control hover:border-accent/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg aria-hidden="true" className="mb-2 h-8 w-8 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 18h16" />
          </svg>
          <span className="text-sm text-muted">
            Upload photos or videos
          </span>
          <span className="mt-1 block text-xs text-muted/70">
            Photos up to 50MB -- Videos up to 500MB
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              addFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

      {/* Error message. An announced region in the critical semantic, carried
          as ink over a tint rather than as a fill -- a semantic used as a FILL
          takes the ground as its ink, and this is not one. */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4"
        >
          <p className="text-sm text-sem-crit">{error}</p>
        </div>
      )}

      {/* Per-file refusals: one line per file, each with its own cause.
          Deliberately NOT summarised into a single sentence -- see the header. */}
      {fileErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4"
        >
          <ul className="space-y-1">
            {fileErrors.map((failure, index) => (
              <li key={`${failure.name}-${index}`} className="text-sm text-sem-crit">
                <span className="font-medium">{failure.name}</span> --{" "}
                {failure.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div
          role="status"
          className="rounded-2xl border border-sem-done/40 bg-sem-done/10 p-4"
        >
          <p className="text-sm text-sem-done">{successMessage}</p>
        </div>
      )}

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="space-y-3">
          {/* The axis MIGRATED, not deleted -- see the header. The rule that
              sat on the retired tier now sits on the tablet tier; the base is
              untouched, because these are square thumbnails and a one-column
              base would give every picked file a full-width square on a phone. */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {files.map((selectedFile, index) => {
              const status = uploadProgress.get(index);
              return (
                <div key={index} className="relative rounded-lg bg-surface overflow-hidden">
                  <div className="aspect-square">
                    {selectedFile.type === "photo" ? (
                      <img
                        src={selectedFile.preview}
                        alt={selectedFile.file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-sunk">
                        <svg aria-hidden="true" className="h-10 w-10 text-ink-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* File info overlay at bottom.

                      The ground under this ink is a photograph, so it cannot be
                      a token: this is the one tolerated palette exception, a
                      TRANSLUCENT achromatic scrim through the background prefix,
                      and it is here for the reason `Lightbox.tsx:25-33` gives
                      for its own. What changed is the ink above it, which was a
                      raw achromatic and is now the ink tokens -- a dark scrim
                      under a light ink is the readable direction. */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                    <p className="truncate text-xs text-ink">{selectedFile.file.name}</p>
                    <p className="text-xs text-ink-2">{formatFileSize(selectedFile.file.size)}</p>
                  </div>

                  {/* Status overlay */}
                  {status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                    </div>
                  )}
                  {status === "done" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <svg aria-hidden="true" className="h-8 w-8 text-sem-done" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <svg aria-hidden="true" className="h-8 w-8 text-sem-crit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </div>
                  )}

                  {/* Remove button (not during upload).

                      It was a 24px circle, which is not a target: the icon rung
                      is 44x44 unconditionally. The accessible name it already
                      carried is now required by the rung's own type rather than
                      trusted, and the scrim under it is the same tolerated one
                      the sibling section uses at `MyMediaSection.tsx:246`. */}
                  {!uploading && (
                    <IconButton
                      variant="ghost"
                      className="absolute top-1 right-1 bg-black/60 text-ink"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${selectedFile.file.name}`}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </IconButton>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upload button. Disabled until a night is named -- and the reason is
              written next to it, because a control that refuses without saying
              why is the same silent failure in a nicer shape. */}
          {!uploading && (
            <>
              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={files.length === 0 || !selectedParty}
              >
                Upload {files.length} {files.length === 1 ? "file" : "files"}
                {selectedParty ? ` to ${selectedParty.title}` : ""}
              </Button>
              {!selectedParty && (
                <p className="text-center text-xs text-muted">
                  Pick a night above to enable the upload.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
