"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { redactDbError } from "@/lib/errors/redact";
import {
  mayUploadToParty,
  MEDIA_NIGHT_REQUIRED,
  MEDIA_UPLOAD_FORBIDDEN,
} from "@/lib/media/may-upload";

// =============================================================
// Media Server Actions
// =============================================================

/**
 * ── The night is the SECOND parameter of both actions, and it is REQUIRED ─────
 *
 * Plan 35-16 wrote it trailing and optional, deliberately and temporarily: its
 * only caller — `src/components/media/MediaUpload.tsx` — belonged to plan 35-21,
 * two waves later, and a required parameter added then would have been a
 * `TS2554` on that file and a red tree handed to a wave that did not break it.
 * The paragraph it left here named the debt and named who owed it.
 *
 * **Plan 35-21 has now rewritten that caller, so the debt is paid here.** The
 * signature is the one 35-16 specified: `registerMedia(eventId, partyId,
 * storagePath, type, fileSize)`, night second, night required. `TS2554` is now
 * the *desired* behaviour — a future caller that forgets the night does not
 * compile.
 *
 * **The runtime refusal stays, and removing it would be the mistake.** A Server
 * Action parameter's type is not a boundary: the client sends whatever it likes
 * over the wire, so an absent or empty night must be refused AT RUNTIME under
 * any signature. Both actions still refuse with `MEDIA_NIGHT_REQUIRED` before
 * asking any permission question. The type stops an honest caller from
 * forgetting; the runtime check stops a dishonest one from omitting.
 *
 * **The window 35-16 declared is closed by this commit.** Between wave 6 and
 * this one, every upload refused — organizer and master included — because no
 * caller named a night (`deferred-items.md`, item 9). From here uploads work
 * again, and they land in the **quarantine** bucket first: the browser no longer
 * writes to the public one.
 */

/**
 * Pre-upload validation: may this session upload to THIS NIGHT of this event?
 *
 * The predicate is `mayUploadToParty`, imported and never re-stated. An access
 * rule written twice is two rules, and that is the defect the whole of phase 32
 * exists not to repeat — `registerMedia` below reads the same one, because it is
 * the action that actually writes the row.
 *
 * ── Three outcomes, kept distinct ────────────────────────────────────────────
 *
 *   `Not authenticated`            — nobody is here
 *   `media.night_required`         — no night was named
 *   `media.party_not_of_event`     — that night belongs to another event
 *   `forbidden.media_upload_required` — the three arms all answered no
 *
 * Collapsing them is the recorded newsletter defect — one "Qualcosa è andato
 * storto" for a network fault, a missing key and an already-subscribed address
 * (`.planning/codebase/CONCERNS.md`). They are separated by **which line
 * threw**, never by parsing a string.
 *
 * **And the honest limit of that, which a reader must not have to discover:**
 * this action signals by THROWING, and Next redacts the message of an error
 * thrown out of a Server Action in a production build (`guards.ts:73-79`). So
 * the categories above are distinguishable in `next dev` and in a log, and NOT
 * on the client, where they arrive as one redacted message. Carrying a category
 * to the client requires a **tagged value decided by position** — a discriminated
 * result — and that is a change to this function's return type, which its one
 * caller destructures.
 *
 * **Plan 35-21 rewrote that caller and did NOT convert the return type, which is
 * a decision and not an omission.** Its caller now distinguishes these outcomes
 * **by position** — which call in the sequence threw — and shows a different
 * sentence for each, which is what `35-PATTERNS.md` S3 asks for and what the
 * seventeen categories of `/api/media/finalize` deliver as a *value* rather than
 * a message. Converting this action to a discriminated result would add a third
 * spelling of the same categories for the two questions position already
 * separates. If a future caller needs finer granularity than "permission" versus
 * "registration", THAT is the change to make, and it is a change to this return
 * type, not to a string.
 *
 * One further honesty: the two sub-reasons the deleted code distinguished ("not
 * approved" and "no attendance record") are both inside the predicate's presence
 * arm now and both surface as `forbidden.media_upload_required`. The predicate
 * answers yes or no; the arm that said no is in the code, not in the message.
 */
export async function validateMediaUpload(eventId: string, partyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  if (!partyId) {
    throw new Error(MEDIA_NIGHT_REQUIRED);
  }

  if (!(await mayUploadToParty(eventId, partyId))) {
    throw new Error(MEDIA_UPLOAD_FORBIDDEN);
  }

  return { userId: user.id, canUpload: true };
}

/**
 * Post-upload metadata insertion: register a media file in `event_media` after
 * it has been uploaded to Supabase Storage.
 *
 * ── This is the half that makes the gate a gate ──────────────────────────────
 *
 * Before this commit this action carried **no check beyond `auth.getUser()`**,
 * and the only thing protecting it was `event_media_insert_member` — which
 * admits every account holding `membership.active`, **`staff` included**,
 * because D-14 grants it that key (`20260808000500_staff_role.sql:136`, and
 * `20260809004500` section 6 says so in as many words). A Server Action is a
 * public endpoint with a convenient signature: gating only `validateMediaUpload`
 * would have left the whole rule walkable around by calling this one directly.
 *
 * **This is a narrowing of a path that checked nothing**, which is a change of
 * behaviour and is said here rather than found later. It is the rule
 * `media-and-storage.md` already states — gate *chi carica ha titolo* — applied
 * where the row is written.
 *
 * The insert carries `party_id`. Without it the trigger
 * `event_media_require_party` refuses with `23514` even on the service
 * connection (`20260809004500`, section 4) — that is the net **under** the code,
 * not the place the rule lives.
 *
 * ── `storagePath` no longer names bytes the browser wrote ────────────────────
 *
 * Since plan 35-21 the caller does not write to `event-media` at all: it deposits
 * into the private `event-media-quarantine` bucket and then calls
 * `POST /api/media/finalize`, which authorises, strips the metadata and writes
 * the stripped bytes to the public bucket. `storagePath` is the key **that route
 * returned**, and the row is written only after it answered `ok`.
 *
 * This action still does not verify that an object exists at that key, and that
 * is unchanged rather than newly accepted: a row pointing at nothing renders a
 * broken image in a moderation queue, which is visible, whereas the reverse —
 * bytes in the public bucket with no row — is the invisible one, and it is the
 * one `/api/media/finalize` is built to make rare. The window between a
 * successful publish and this insert is named in `35-20-SUMMARY.md`,
 * constatazione 3.
 */
export async function registerMedia(
  eventId: string,
  partyId: string,
  storagePath: string,
  type: "photo" | "video",
  fileSize: number
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  if (!partyId) {
    throw new Error(MEDIA_NIGHT_REQUIRED);
  }

  if (!(await mayUploadToParty(eventId, partyId))) {
    throw new Error(MEDIA_UPLOAD_FORBIDDEN);
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-media/${storagePath}`;

  const { data, error } = await supabase
    .from("event_media")
    .insert({
      event_id: eventId,
      party_id: partyId,
      uploaded_by: user.id,
      url: publicUrl,
      type,
      file_size: fileSize,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register media: ${error.message}`);
  }

  // Revalidate event page to show the new upload to the uploader
  revalidatePath(`/events`);

  return data;
}

/**
 * Moderation action: update media status (approve/reject).
 * Only organizers and master can perform this action.
 *
 * **`staff.manage`, and the equivalence was measured, not assumed.** The
 * predicate deleted below read `role in (organizer, master)` from a
 * `select("role")` — `status` was never fetched, so it could not be part of the
 * test. `private.role_capabilities` grants `staff.manage` to `master` and to
 * `organizer` with `requires_approved = false` on both rows
 * (`20260807000000_capability_model.sql:392-393`), which is the same predicate,
 * row for row. `CAP_DESCRIPTIONS["staff.manage"]` names *media moderation* by
 * hand.
 *
 * The two near neighbours are verdict changes and were rejected:
 * `CATALOGUE_MANAGE` carries `requires_approved = true` (`:399-400`) and would
 * refuse a **pending** organizer who moderates today; `ADMIN_ACCESS` is granted
 * to `master` alone (`:408`) and would refuse every organizer.
 *
 * One `getAccessContext()` per invocation: `cache()` does NOT memoise inside a
 * Server Action body (measured, 33-RESEARCH), so a second call would be a
 * second round trip.
 */
export async function updateMediaStatus(
  mediaId: string,
  status: "approved" | "rejected"
) {
  const supabase = await createClient();
  const ctx = await getAccessContext();

  // Two categories, never collapsed into one (`meta-gates.md`). An anonymous
  // caller resolves to the empty capability set and would be refused by the
  // line below anyway — but "there is nobody here" and "this person may not"
  // are different causes, and this file used to distinguish them.
  if (!ctx.userId) {
    throw new Error("Not authenticated");
  }

  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    throw new Error("forbidden.staff_manage_required");
  }

  const { error } = await supabase
    .from("event_media")
    .update({ status })
    .eq("id", mediaId);

  if (error) {
    throw new Error(`Failed to update media status: ${error.message}`);
  }

  // Revalidate event pages to reflect status change
  revalidatePath(`/events`);

  return { success: true };
}

/**
 * Delete a media record and its storage file.
 * Members can delete their own uploads; organizers/master can delete any.
 *
 * **The shape below is the rule, and it must survive.** A member may delete
 * their own upload and nobody else's; staff may delete anyone's. Media uploaded
 * by members is user content and who may moderate it is an access decision
 * (`media-and-storage.md`), so today's answer is reproduced exactly:
 * `staff.manage`, granted to `master` and `organizer` with
 * `requires_approved = false` on both rows
 * (`20260807000000_capability_model.sql:392-393`) — the same predicate the
 * deleted `select("role")` test expressed, `status` included in neither.
 *
 * **Why the explicit `!ctx.userId` throw is not redundant.**
 * `AccessContextResult.userId` is `string | null` and `event_media.uploaded_by`
 * is nullable too. The old code compared `user.id`, which could not be null past
 * its auth guard. Without the throw, a caller with no identity meeting a row
 * owned by nobody would compare `null !== null` → false → **admitted through the
 * ownership arm**. That arm runs precisely when the capability arm is false, so
 * the capability check does not cover it. Do not delete this line "because the
 * capability check covers it" — it does not, and this repository has no test
 * that would notice.
 *
 * The ownership test stays first: it is the common case, it is a local
 * comparison, and it reads as the rule the function is expressing.
 *
 * Nothing about storage changed — same bucket, same path derivation, same
 * public-URL prefix. This function decides *who may delete*, not *what is
 * stored*.
 */
export async function deleteMedia(mediaId: string) {
  const supabase = await createClient();
  const ctx = await getAccessContext();

  if (!ctx.userId) {
    throw new Error("Not authenticated");
  }

  // Fetch the media record to get uploaded_by and URL
  const { data: media, error: mediaError } = await supabase
    .from("event_media")
    .select("uploaded_by, url")
    .eq("id", mediaId)
    .single();

  if (mediaError || !media) {
    throw new Error("Media not found");
  }

  // Verify user is either the uploader or staff
  if (
    media.uploaded_by !== ctx.userId &&
    !ctx.capabilities.has(CAP.STAFF_MANAGE)
  ) {
    throw new Error("forbidden.staff_manage_required");
  }

  // Extract storage path from the public URL
  // URL format: {SUPABASE_URL}/storage/v1/object/public/event-media/{path}
  const bucketPrefix = "/storage/v1/object/public/event-media/";
  const urlObj = new URL(media.url);
  const storagePath = urlObj.pathname.split(bucketPrefix)[1];

  if (storagePath) {
    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("event-media")
      .remove([storagePath]);

    if (storageError) {
      console.error(`[media.storage_delete_failed] ${redactDbError(storageError)}`);
      // Continue to delete the DB record even if storage deletion fails
    }
  }

  // Delete the event_media record
  const { error: deleteError } = await supabase
    .from("event_media")
    .delete()
    .eq("id", mediaId);

  if (deleteError) {
    throw new Error(`Failed to delete media record: ${deleteError.message}`);
  }

  // Revalidate event pages
  revalidatePath(`/events`);

  return { success: true };
}
