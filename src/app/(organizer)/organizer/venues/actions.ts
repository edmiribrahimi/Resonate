"use server";

import { revalidatePath } from "next/cache";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/utils/slugify";

/**
 * The catalogue gate, asked once instead of twice — and `staff.manage`, not
 * `catalogue.manage`, ON PURPOSE.
 *
 * The twin of the function of the same name in
 * `src/app/(organizer)/organizer/artists/actions.ts`, which carries the full
 * reasoning. In short: the deleted code read `profiles.role` and refused
 * anything outside `{organizer, master}` — **role only, status ignored** —
 * while the RLS policies on `public.venues` gate on `catalogue.manage`, which
 * carries `requires_approved = true`. The two layers disagree deliberately, and
 * an `organizer`/`pending` caller PASSES here and is refused by the database
 * with `42501`. `staff.manage` is the key whose predicate is byte-equal to the
 * deleted line (`20260807000000_capability_model.sql:392-393`), so the measured
 * asymmetry survives untouched.
 *
 * **The two keys are not collapsed.** `catalogue.manage` keeps its grants, its
 * `requires_approved = true`, and its policies on this table. Only the role
 * half of the question moved off a `public.profiles` round trip.
 *
 * ── The venue-secrecy check, since this file writes addresses ────────────────
 *
 * `createVenue` and `updateVenue` write `venues.address` and
 * `venues.google_maps_url`. Nothing here touches `venue_reveal_sent`, the
 * per-ticket / per-RSVP entitlement, or the reveal cron, and the set of callers
 * who may write an address is byte-identical before and after — `staff.manage`
 * holders, exactly the `{organizer, master}` of the deleted line. The monotone
 * one-way switch is not made easier to trip, in either direction, by this
 * change. The one direction the gate moved at all is stricter: a caller with no
 * resolvable identity is now refused explicitly rather than reaching a `!`.
 *
 * ── Why it is a local function and not an import ──────────────────────────────
 *
 * Its natural home is `src/lib/capabilities/guards.ts`, which belongs to
 * another plan executing in parallel; hoisting it is a follow-up, not this
 * commit. It is deliberately NOT exported — every export of a `"use server"`
 * module is a public endpoint, and a gate is not one.
 *
 * ── Resolve once ─────────────────────────────────────────────────────────────
 *
 * `cache()` does NOT memoise inside a Server Action body (measured;
 * `src/lib/capabilities/server.ts:103-121`). One resolve per invocation, and
 * the caller reuses the returned local.
 *
 * @throws `forbidden.staff_manage_required` — the answer is no.
 * @throws `capabilities.identity_missing` — the payload carried no `user_id`.
 *         A distinct category on purpose: it is not a refusal on the merits.
 *         Next redacts both messages in a production build, so a client that
 *         must branch on the category carries it as a tagged value decided by
 *         position, never by parsing this text.
 */
async function assertStaffManage(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  if (!capabilities.has(CAP.STAFF_MANAGE)) {
    throw new Error("forbidden.staff_manage_required");
  }

  if (!userId) {
    console.error(
      "[capabilities.identity_missing] a caller holds staff.manage but " +
        "my_access_context() returned no user_id. This is NOT a refusal on " +
        "the merits — the migration adding user_id has not been applied."
    );
    throw new Error("capabilities.identity_missing");
  }

  return { userId };
}

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
  const { userId } = await assertStaffManage();

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
      created_by: userId,
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
  await assertStaffManage();

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
