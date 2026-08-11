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

  revalidatePath("/admin/venues");
  return { success: true, id: venue.id, slug: venue.slug };
}

/**
 * Every way `updateVenue` can refuse, one value each — WR-08 of the phase 37
 * review.
 *
 * ── Why a value and not a thrown sentence ────────────────────────────────────
 *
 * Next **redacts** the message of an error thrown out of a Server Action in a
 * production build. Plan 37-08 did the right thing by turning a silent
 * `.update().eq()` into a refusal that exists — before it, an update blocked by
 * RLS answered `{ success: true }` and changed nothing — but it delivered that
 * refusal as a `throw`, so the operator read Next's generic paragraph and the
 * caller degraded it to one sentence for every cause. That is the newsletter
 * precedent recorded in `.planning/codebase/CONCERNS.md`, reached through a
 * door built by the fix for another silent failure.
 *
 * The reveal module of this same phase already carries the argument in full
 * (`admin/events/[id]/reveal/actions.ts:57-63`) and returns typed values
 * everywhere. This is the same shape, in the same phase, for the same reason —
 * and there is **no error tracking** in this product (`meta-gates.md`), so the
 * returned value is the only place a refusal exists for a human.
 */
export type UpdateVenueRefusal =
  /**
   * The gate said no. `catalogue.manage` carries `requires_approved = true`,
   * while the button that leads here is drawn for any organizer — so a
   * **pending** organizer reaches this refusal on an ordinary press. The
   * divergence is deliberate and written down at
   * `(work)/venues/[slug]/page.tsx:210-234`; what was missing was a way to say
   * so to the person pressing.
   */
  | "not_permitted"
  /**
   * Nobody could be identified. **Not a refusal on the merits** — it means the
   * migration that puts `user_id` in the capability payload is not applied on
   * this deployment. Kept apart from the value above for exactly that reason.
   */
  | "identity_missing"
  /**
   * The update matched no row: the venue was deleted while the form was open,
   * **or** a row-level policy refused the write and made the row invisible.
   *
   * These two are genuinely indistinguishable from here — PostgREST answers
   * `PGRST116` for both — and the honest move is to name the pair rather than
   * pick one. It is NOT the same as collapsing distinct causes into one
   * sentence: the sentence tells the reader how to tell them apart.
   */
  | "not_found_or_refused"
  /** Any other database failure. Nothing about the venue changed. */
  | "write_failed";

export type UpdateVenueResult =
  | { ok: true }
  | { ok: false; reason: UpdateVenueRefusal };

/**
 * Update a venue profile. Approved organizers and master only.
 *
 * This writes `venues.address` and `venues.google_maps_url` — a venue-secret
 * write surface (`venue-secrecy.md`).
 *
 * It **returns** its refusals ({@link UpdateVenueRefusal}) instead of throwing
 * them. The set of callers whose write succeeds is unchanged: the gate is the
 * same gate, the client is the same cookie client, and RLS still has the last
 * word. Only what a refused caller gets to READ has changed.
 */
export async function updateVenue(
  venueId: string,
  formData: FormData
): Promise<UpdateVenueResult> {
  // ⚠️ `createClient()` — the COOKIE client, on purpose. See `createVenue`:
  // under the service client the P3 RLS policy stops applying and the gate
  // below becomes the only refusal on a path that writes a venue address.
  // Do not swap it.
  const supabase = await createClient();

  // The gate still throws — it is shared with `createVenue`, whose signature is
  // not this plan's to change — so its two categories are turned into values
  // here, at the boundary that redacts.
  //
  // Reading `err.message` is safe in THIS position and nowhere downstream: the
  // throw never crosses the Server Action boundary, so nothing has redacted it
  // yet. That is precisely the property the client cannot rely on, and the
  // reason it receives a value instead.
  try {
    await assertCatalogueManage();
  } catch (err) {
    const category = err instanceof Error ? err.message : "";
    if (category === "forbidden.catalogue_manage_required") {
      return { ok: false, reason: "not_permitted" };
    }
    if (category === "capabilities.identity_missing") {
      return { ok: false, reason: "identity_missing" };
    }
    throw err;
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

  // `.select("slug").single()` is new, and it buys two things at once.
  //
  // The address to revalidate: the profile page left `(public)` for
  // `(admin)/admin/(work)/venues/[slug]` (D-37-23, plan 37-08), and it is keyed
  // by SLUG. The call this replaces passed `/venues/${venueId}` — an id where a
  // slug belongs, so it named a path no route has ever served, before or after
  // the move. It was a no-op wearing the face of a cache invalidation, and
  // `npm run verify:routes` only started saying so once `/venues/[slug]` left
  // the public allow-list.
  //
  // And a refusal that used to be silent: `.update().eq()` with no matching row
  // returns no error, so an update blocked by RLS or aimed at a deleted venue
  // reported `{ success: true }` and changed nothing. `.single()` turns that
  // into `PGRST116`. This repository has no error tracking (`meta-gates.md`):
  // a write that quietly does nothing reaches nobody.
  const { data: updated, error } = await supabase
    .from("venues")
    .update(updates)
    .eq("id", venueId)
    .select("slug")
    .single();

  if (error) {
    // `code` and `message`, and nothing else. Never the PostgREST error's third
    // field, which carries the rejected row — and the rows of `public.venues`
    // are addresses.
    console.error(
      `[venues.update_refused] venue ${venueId}: ` +
        `${error.code ?? "unknown"} — ${error.message}`
    );
    // Branching on the CODE, never on the message: the message is the
    // provider's prose and changes without notice, and the code is the
    // contract.
    return {
      ok: false,
      reason:
        error.code === "PGRST116" ? "not_found_or_refused" : "write_failed",
    };
  }

  revalidatePath("/admin/venues");
  revalidatePath(`/admin/venues/${updated.slug}`);
  return { ok: true };
}
