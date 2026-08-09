"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import {
  mayUploadToParty,
  MEDIA_NIGHT_REQUIRED,
  MEDIA_UPLOAD_FORBIDDEN,
} from "@/lib/media/may-upload";

// =============================================================
// Media Server Actions
// =============================================================

/**
 * ── The night is a parameter of BOTH actions, and it is TRAILING and OPTIONAL
 *    only for as long as one caller has not been rewritten ────────────────────
 *
 * Plan 35-16 specifies `registerMedia(eventId, partyId, storagePath, type,
 * fileSize)` — the night second, required. It is written here as a **trailing
 * optional parameter instead**, and the reason is mechanical rather than
 * stylistic: the single caller of both actions today is
 * `src/components/media/MediaUpload.tsx`, which is rewritten by **plan 35-21,
 * two waves later**. A required parameter added now is `TS2554` on that file,
 * `npm run build` red, and a red tree handed to the plans of the wave in
 * between — a failure that is nobody's to fix where it appears.
 *
 * **The optionality costs the gate nothing, and here is why.** A Server Action
 * parameter's type is not a boundary: the client sends whatever it likes over
 * the wire, so an absent night has to be refused AT RUNTIME under either
 * signature. Both actions therefore refuse a missing night with
 * `MEDIA_NIGHT_REQUIRED` before asking any permission question. There is no
 * branch on which the absence of a night is tolerated — tolerating it would make
 * the whole gate bypassable by omitting an argument, which is the one shape this
 * plan exists to prevent.
 *
 * **The consequence, declared instead of discovered:** from this commit until
 * plan 35-21 ships, `MediaUpload.tsx` names no night, so **every upload refuses
 * — organizer and master included**. Today that is the only working upload path
 * (see the presence-arm paragraph in `@/lib/media/may-upload`), so this is a
 * real, temporary, in-phase regression. It is the fail-closed direction, it
 * never reaches production alone (the phase deploys as one), and it mirrors what
 * the database will do anyway: `20260809004500` refuses a row without a night
 * with `23514`.
 *
 * **What plan 35-21 owes:** pass the night from `MediaGallerySection` through
 * `MediaUpload`, then move `partyId` to the position the plan names and make it
 * required. Its own acceptance criteria already grep `MediaUpload.tsx` for
 * `partyId`, so the first half is mechanically asserted by the plan that owns
 * the file; the second half is this paragraph's job to remember.
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
 * caller destructures. Plan 35-21 rewrites that caller and owns the conversion;
 * doing it here would be the red build described above.
 *
 * One further honesty: the two sub-reasons the deleted code distinguished ("not
 * approved" and "no attendance record") are both inside the predicate's presence
 * arm now and both surface as `forbidden.media_upload_required`. The predicate
 * answers yes or no; the arm that said no is in the code, not in the message.
 */
export async function validateMediaUpload(eventId: string, partyId?: string) {
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
 */
export async function registerMedia(
  eventId: string,
  storagePath: string,
  type: "photo" | "video",
  fileSize: number,
  partyId?: string
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
      console.error("Failed to delete storage file:", storageError);
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
