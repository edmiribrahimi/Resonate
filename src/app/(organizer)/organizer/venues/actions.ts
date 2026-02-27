"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/utils/slugify";

/**
 * Search venues by name (case-insensitive, partial match).
 */
export async function searchVenues(query: string) {
  if (!query || query.trim().length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("venues")
    .select("id, name, slug, address")
    .ilike("name", `%${query.trim()}%`)
    .order("name", { ascending: true })
    .limit(10);
  return data ?? [];
}

/**
 * Check if a venue profile already exists (case-insensitive).
 */
export async function checkVenueExists(name: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("venues")
    .select("id, slug, address")
    .ilike("name", name)
    .maybeSingle();

  return { exists: !!data, id: data?.id ?? null, slug: data?.slug ?? null, address: data?.address ?? null };
}

/**
 * Create a venue profile. Only organizers/master can call this.
 */
export async function createVenue(formData: FormData) {
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
    throw new Error("Forbidden: only organizers can create venue profiles");
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    throw new Error("Venue name is required");
  }

  const bio = (formData.get("bio") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const googleMapsUrl = (formData.get("google_maps_url") as string)?.trim() || null;
  const photoUrl = (formData.get("photo_url") as string)?.trim() || null;
  const instagramUrl = (formData.get("instagram_url") as string)?.trim() || null;
  const websiteUrl = (formData.get("website_url") as string)?.trim() || null;

  // Generate slug
  let slug = slugify(name);
  const { data: existingSlug } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const { data: venue, error } = await supabase
    .from("venues")
    .insert({
      name,
      slug,
      bio,
      address,
      google_maps_url: googleMapsUrl,
      photo_url: photoUrl,
      instagram_url: instagramUrl,
      website_url: websiteUrl,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      throw new Error("A venue with this name already exists");
    }
    throw new Error(`Failed to create venue: ${error.message}`);
  }

  revalidatePath("/venues");
  return { success: true, id: venue.id, slug: venue.slug };
}

/**
 * Update a venue profile. Only organizers/master can call this.
 */
export async function updateVenue(venueId: string, formData: FormData) {
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
    throw new Error("Forbidden: only organizers can update venue profiles");
  }

  const bio = (formData.get("bio") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const googleMapsUrl = (formData.get("google_maps_url") as string)?.trim() || null;
  const photoUrl = (formData.get("photo_url") as string)?.trim() || null;
  const instagramUrl = (formData.get("instagram_url") as string)?.trim() || null;
  const websiteUrl = (formData.get("website_url") as string)?.trim() || null;

  const updates: Record<string, string | null> = {
    bio,
    address,
    google_maps_url: googleMapsUrl,
    instagram_url: instagramUrl,
    website_url: websiteUrl,
  };

  if (photoUrl) {
    updates.photo_url = photoUrl;
  }

  const { error } = await supabase
    .from("venues")
    .update(updates)
    .eq("id", venueId);

  if (error) {
    throw new Error(`Failed to update venue: ${error.message}`);
  }

  revalidatePath("/venues");
  revalidatePath(`/venues/${venueId}`);
  return { success: true };
}
