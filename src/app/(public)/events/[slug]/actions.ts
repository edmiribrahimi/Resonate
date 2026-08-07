"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";

// =============================================================
// Media Server Actions
// =============================================================

/**
 * Pre-upload validation: verify user is authenticated, approved, and has a ticket
 * for the given event (ticket ownership = attendance gate per CONTEXT.md).
 */
export async function validateMediaUpload(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Check user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  const isOrgOrMaster = profile.role === "organizer" || profile.role === "master";

  // Organizers and masters can always upload; members need approved + ticket
  if (!isOrgOrMaster) {
    if (profile.status !== "approved") {
      throw new Error("Not approved");
    }

    // Check attendance (scanned at entry — ticket or member card)
    const { data: attendance } = await supabase
      .from("attendance")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!attendance) {
      throw new Error("You must have attended this event to upload media");
    }
  }

  return { userId: user.id, canUpload: true };
}

/**
 * Post-upload metadata insertion: register a media file in the event_media table
 * after it has been uploaded to Supabase Storage.
 */
export async function registerMedia(
  eventId: string,
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

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-media/${storagePath}`;

  const { data, error } = await supabase
    .from("event_media")
    .insert({
      event_id: eventId,
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
