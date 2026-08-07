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
 * ── The key was chosen by the owner, and this is what the choice preserves ────
 *
 * `createArtist` and `updateArtist` used to read `profiles.role` and refuse
 * anything outside `{organizer, master}` — **role only, status ignored**. The
 * RLS policies on `public.artists`, by contrast, gate on `catalogue.manage`,
 * which carries `requires_approved = true`
 * (`supabase/migrations/20260807000000_capability_model.sql:399-400`).
 *
 * The two layers disagree, deliberately, and the disagreement is measured: an
 * `organizer`/`pending` caller PASSES this gate and is then refused by the
 * database with `42501`. That asymmetry is named twice in
 * `32-CARRY-FORWARD.md` and re-observed in `33-01-SUMMARY.md`. This phase's
 * contract is that behaviour does not change, so the key here is the one whose
 * predicate is byte-equal to the deleted code: `staff.manage`, granted to
 * `master` and `organizer` with `requires_approved = false` (same migration,
 * lines 392-393). Reproduce the asymmetry; do not tidy it.
 *
 * **This is not the two keys collapsing.** `catalogue.manage` keeps its own
 * grants, keeps `requires_approved = true`, and keeps guarding the tables — it
 * is still the thing that actually refuses a pending organizer here. What
 * changed is only *where the role half of the question is asked*: a session-
 * derived capability instead of a `public.profiles` round trip.
 *
 * Moving this call site to `CAP.CATALOGUE_MANAGE` is a live option and a real
 * improvement — it would refuse a pending organizer in the action, with a
 * sentence, instead of leaking a `42501` out of a write. It is deferred rather
 * than declined, and the reason it is deferred is that it is the ONE change in
 * this phase that a user could see. See `33-10-SUMMARY.md`.
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
 * @throws `forbidden.staff_manage_required` — the answer is no.
 * @throws `capabilities.identity_missing` — a capability resolved but the
 *         payload carried no `user_id`, which means
 *         `20260808000000_access_context_user_id.sql` has not been applied.
 *         Refusing is strictly safer than the `!` this line replaces: no
 *         Supabase client in this repository carries a `Database` generic, so
 *         `string | null` would have compiled green all the way into
 *         `created_by`.
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
  const { userId } = await assertStaffManage();

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
 * Update an artist profile. Only organizers/master can call this.
 */
export async function updateArtist(artistId: string, formData: FormData) {
  const supabase = await createClient();
  await assertStaffManage();

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
