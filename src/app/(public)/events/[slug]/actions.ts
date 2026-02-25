"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  // Check user profile status is approved
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.status !== "approved") {
    throw new Error("Not approved");
  }

  // Check ticket ownership (= attendance gate per CONTEXT.md)
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ticket) {
    throw new Error("No ticket for this event");
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
 */
export async function updateMediaStatus(
  mediaId: string,
  status: "approved" | "rejected"
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify user is organizer or master
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.role !== "organizer" && profile.role !== "master") {
    throw new Error("Forbidden: only organizers can moderate media");
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
 */
export async function deleteMedia(mediaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
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

  // Verify user is either the uploader or an organizer/master
  if (media.uploaded_by !== user.id) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (profile.role !== "organizer" && profile.role !== "master") {
      throw new Error("Forbidden: you can only delete your own media");
    }
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
