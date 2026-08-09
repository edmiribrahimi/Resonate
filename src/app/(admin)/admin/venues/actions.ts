"use server";

import { revalidatePath } from "next/cache";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/utils/slugify";

/**
 * The catalogue gate. It asks `catalogue.manage` — the key the RLS policies on
 * `public.venues` ask, and the key this module's own documentation describes.
 *
 * The twin of `assertCatalogueManage` in
 * `src/app/(admin)/admin/artists/actions.ts`, which carries the full
 * CR-01 reasoning and the measured grant rows. In short: this gate used to ask
 * `CAP.STAFF_MANAGE` (`requires_approved = false`) while `keys.ts:90-91`
 * documented these operations as requiring an approved status. Code and
 * documentation contradicted each other, and the safety rested on an
 * undocumented coincidence — the cookie client below, under which RLS policy P3
 * refused an unapproved organizer with `42501`.
 *
 * Measured from `20260807000000_capability_model.sql`: `staff.manage` grants
 * master/organizer at `false` (392-393), `catalogue.manage` grants the same two
 * roles at `true` (399-400). The set of callers whose write SUCCEEDS is
 * byte-identical before and after — an unapproved organizer was refused then by
 * the database and is refused now by the action; a master whose status is not
 * `approved` is refused by P3 in both worlds, since P3 carries
 * `requires_approved = true` for master too. Only the point of refusal moved,
 * and it moved earlier, which is the only direction `meta-gates.md` permits
 * without authorisation.
 *
 * ── The venue-secrecy check, since this file writes addresses ────────────────
 *
 * `createVenue` and `updateVenue` write `venues.address` and
 * `venues.google_maps_url` — this is a venue-secret WRITE surface. Nothing here
 * touches `venue_reveal_sent`, the per-ticket / per-RSVP entitlement, or the
 * reveal cron, so the monotone one-way switch is untouched. The set of callers
 * who may write an address does not widen: it is `{organizer, master}` with an
 * approved status, in both worlds, and the gate is now strictly harder to trip
 * than it reads today because it no longer depends on which Supabase client
 * this file happens to use. A caller with no resolvable identity is refused
 * explicitly rather than reaching a `!`.
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
 * @throws `forbidden.catalogue_manage_required` — the answer is no.
 * @throws `capabilities.identity_missing` — the payload carried no `user_id`.
 *         A distinct category on purpose: it is not a refusal on the merits.
 *         Next redacts both messages in a production build, so a client that
 *         must branch on the category carries it as a tagged value decided by
 *         position, never by parsing this text.
 */
async function assertCatalogueManage(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  // catalogue.manage — requires_approved = true. This is the key the P3 RLS
  // policies on `artists` and `venues` ask. Do NOT substitute staff.manage:
  // it is requires_approved = false and admits a pending organizer to a
  // surface that writes `venues.address`.
  if (!capabilities.has(CAP.CATALOGUE_MANAGE)) {
    throw new Error("forbidden.catalogue_manage_required");
  }

  if (!userId) {
    console.error(
      "[capabilities.identity_missing] a caller holds catalogue.manage but " +
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
 * Create a venue profile. Approved organizers and master only.
 *
 * This writes `venues.address` and `venues.google_maps_url` — a venue-secret
 * write surface (`venue-secrecy.md`).
 */
export async function createVenue(formData: FormData) {
  // ⚠️ `createClient()` — the COOKIE client, on purpose. Under it the P3 RLS
  // policy on `venues` is a second, independent refusal of an unapproved
  // caller. `getServiceClient()` bypasses every row-level policy, so swapping
  // it here would leave `assertCatalogueManage()` below as the ONLY thing
  // refusing one — on the path that writes a venue address. That is survivable
  // today only because the gate now asks `catalogue.manage` (CR-01); it was NOT
  // survivable before, when the gate asked `staff.manage` and this line was the
  // whole defence. Do not swap it.
  const supabase = await createClient();
  const { userId } = await assertCatalogueManage();

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
 * Update a venue profile. Approved organizers and master only.
 *
 * This writes `venues.address` and `venues.google_maps_url` — a venue-secret
 * write surface (`venue-secrecy.md`).
 */
export async function updateVenue(venueId: string, formData: FormData) {
  // ⚠️ `createClient()` — the COOKIE client, on purpose. See `createVenue`:
  // under the service client the P3 RLS policy stops applying and the gate
  // below becomes the only refusal on a path that writes a venue address.
  // Do not swap it.
  const supabase = await createClient();
  await assertCatalogueManage();

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
