"use server";

import { revalidatePath } from "next/cache";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/utils/slugify";

/**
 * The catalogue gate. It asks `catalogue.manage` — the key the RLS policies on
 * `public.artists` ask, and the key this module's own documentation describes.
 *
 * ── CR-01: the contradiction this resolves ───────────────────────────────────
 *
 * It used to ask `CAP.STAFF_MANAGE` while `keys.ts:90-91` documented these same
 * operations as *"Create and edit artists and venues. Requires an approved
 * status as well as the role."* The code and its own documentation said
 * opposite things, and the phase's stated contract (`guards.ts:127-131`) is
 * that the TypeScript gate and the row-level gate *"ask the same key of the
 * same authority"*. They asked different keys.
 *
 * ── Why this is not a widening, and not a narrowing — MEASURED ───────────────
 *
 * From `supabase/migrations/20260807000000_capability_model.sql`:
 *
 *   staff.manage       master false, organizer false   (lines 392-393)
 *   catalogue.manage   master true,  organizer true    (lines 399-400)
 *
 * The set of callers whose write SUCCEEDS is byte-identical before and after.
 * An `organizer`/`pending` was already refused — by RLS policy P3, which asks
 * `catalogue.manage` with `requires_approved = true`, and answered `42501`. A
 * `master` whose status is not `approved` was refused by the same policy, for
 * the same reason: P3 carries `requires_approved = true` for master too. Nobody
 * who could write before is refused now, and nobody who was refused before can
 * write now.
 *
 * What changed is **where** the refusal happens: in the action, with a
 * sentence, instead of leaking a `42501` out of a write. That is the direction
 * `meta-gates.md` permits without authorisation — a gate may only become harder
 * to trip — and it removes the hazard CR-01 named: the refusal no longer
 * depends on which Supabase client this file happens to use.
 *
 * `staff.manage` keeps its own grants and its own call sites (`ticket_tiers`,
 * events, guest list). The two keys are not collapsed; they were swapped here
 * because only one of them is the question these four writes are actually
 * asking.
 *
 * ── Why it is a local function and not an import ──────────────────────────────
 *
 * Its natural home is `src/lib/capabilities/guards.ts`, beside
 * `ownsOrIsMaster`. That file belongs to another plan executing in parallel, so
 * hoisting it there is a follow-up, not this commit. It is deliberately NOT
 * exported: every export of a `"use server"` module is a public endpoint, and a
 * gate is not one.
 *
 * ── Resolve once ─────────────────────────────────────────────────────────────
 *
 * `cache()` does NOT memoise inside a Server Action body — measured, three
 * calls ran the body three times (`src/lib/capabilities/server.ts:103-121`). So
 * this resolves `getAccessContext()` exactly once and hands the caller back the
 * one thing it may still need. Never call it a second time in the same action.
 *
 * ── Two categories, never one ────────────────────────────────────────────────
 *
 * "You may not" and "I do not know who you are" throw different strings. This
 * project has no error tracking, and a `catch` that collapses causes is the
 * recorded newsletter defect (`meta-gates.md`). Note that Next REDACTS the
 * message of an error thrown out of a Server Action in a production build, so
 * these strings exist for `next dev` and for the server log — a client that
 * needs to branch on the category must carry it as a tagged value decided by
 * position, never by parsing this text.
 *
 * @throws `forbidden.catalogue_manage_required` — the answer is no.
 * @throws `capabilities.identity_missing` — a capability resolved but the
 *         payload carried no `user_id`, which means
 *         `20260808000000_access_context_user_id.sql` has not been applied.
 *         Refusing is strictly safer than the `!` this line replaces: no
 *         Supabase client in this repository carries a `Database` generic, so
 *         `string | null` would have compiled green all the way into
 *         `created_by`.
 */
async function assertCatalogueManage(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  // catalogue.manage — requires_approved = true. This is the key the P3 RLS
  // policies on `artists` and `venues` ask. Do NOT substitute staff.manage:
  // it is requires_approved = false and admits a pending organizer.
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
 * Create an artist profile. Approved organizers and master only.
 */
export async function createArtist(formData: FormData) {
  // ⚠️ `createClient()` — the COOKIE client, on purpose. Under it the P3 RLS
  // policy on `artists` is a second, independent refusal of an unapproved
  // caller. `getServiceClient()` bypasses every row-level policy, so swapping
  // it here would leave `assertCatalogueManage()` below as the ONLY thing
  // refusing one. That is survivable today only because the gate now asks
  // `catalogue.manage` (CR-01); it was NOT survivable before, when the gate
  // asked `staff.manage` and this line was the whole defence. Do not swap it.
  const supabase = await createClient();
  const { userId } = await assertCatalogueManage();

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
      created_by: userId,
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
 * Update an artist profile. Approved organizers and master only.
 */
export async function updateArtist(artistId: string, formData: FormData) {
  // ⚠️ `createClient()` — the COOKIE client, on purpose. See `createArtist`:
  // under the service client the P3 RLS policy stops applying and the gate
  // below becomes the only refusal. Do not swap it.
  const supabase = await createClient();
  await assertCatalogueManage();

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
