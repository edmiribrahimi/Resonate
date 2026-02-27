"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/utils/slugify";

/**
 * Search artists by name (case-insensitive, partial match).
 */
export async function searchArtists(query: string) {
  if (!query || query.trim().length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id, name, slug")
    .ilike("name", `%${query.trim()}%`)
    .order("name", { ascending: true })
    .limit(10);
  return data ?? [];
}

/**
 * Check if an artist profile already exists (case-insensitive).
 */
export async function checkArtistExists(name: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id, slug")
    .ilike("name", name)
    .maybeSingle();

  return { exists: !!data, slug: data?.slug ?? null };
}

/**
 * Create an artist profile. Only organizers/master can call this.
 */
export async function createArtist(formData: FormData) {
  const supabase = await createClient();

  // Verify role
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "organizer" && profile.role !== "master")) {
    throw new Error("Forbidden: only organizers can create artist profiles");
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    throw new Error("Artist name is required");
  }

  const bio = (formData.get("bio") as string)?.trim() || null;
  const photoUrl = (formData.get("photo_url") as string)?.trim() || null;
  const instagramUrl = (formData.get("instagram_url") as string)?.trim() || null;
  const soundcloudUrl = (formData.get("soundcloud_url") as string)?.trim() || null;
  const spotifyUrl = (formData.get("spotify_url") as string)?.trim() || null;
  const websiteUrl = (formData.get("website_url") as string)?.trim() || null;

  // Generate slug
  let slug = slugify(name);
  const { data: existingSlug } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const { data: artist, error } = await supabase
    .from("artists")
    .insert({
      name,
      slug,
      bio,
      photo_url: photoUrl,
      instagram_url: instagramUrl,
      soundcloud_url: soundcloudUrl,
      spotify_url: spotifyUrl,
      website_url: websiteUrl,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      throw new Error("An artist with this name already exists");
    }
    throw new Error(`Failed to create artist: ${error.message}`);
  }

  revalidatePath("/artists");
  return { success: true, slug: artist.slug };
}

/**
 * Update an artist profile. Only organizers/master can call this.
 */
export async function updateArtist(artistId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "organizer" && profile.role !== "master")) {
    throw new Error("Forbidden: only organizers can update artist profiles");
  }

  const bio = (formData.get("bio") as string)?.trim() || null;
  const photoUrl = (formData.get("photo_url") as string)?.trim() || null;
  const instagramUrl = (formData.get("instagram_url") as string)?.trim() || null;
  const soundcloudUrl = (formData.get("soundcloud_url") as string)?.trim() || null;
  const spotifyUrl = (formData.get("spotify_url") as string)?.trim() || null;
  const websiteUrl = (formData.get("website_url") as string)?.trim() || null;

  // Build update object — only include photo_url if a new one is provided
  const updates: Record<string, string | null> = {
    bio,
    instagram_url: instagramUrl,
    soundcloud_url: soundcloudUrl,
    spotify_url: spotifyUrl,
    website_url: websiteUrl,
  };

  if (photoUrl) {
    updates.photo_url = photoUrl;
  }

  const { error } = await supabase
    .from("artists")
    .update(updates)
    .eq("id", artistId);

  if (error) {
    throw new Error(`Failed to update artist: ${error.message}`);
  }

  revalidatePath("/artists");
  revalidatePath(`/artists/${artistId}`);
  return { success: true };
}
