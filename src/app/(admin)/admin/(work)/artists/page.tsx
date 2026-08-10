import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";

/**
 * The artists catalogue listing — one file where there were two (D-34-05).
 *
 * ── The grant that decided the merge ─────────────────────────────────────────
 *
 * `organizer.access`, decided by the row `('organizer','organizer.access',
 * false)` in `private.role_capabilities` and by nothing on either page. The two
 * versions differed in the capability they asked — `admin.access` here,
 * `organizer.access` on the twin — and in nothing else that runs: a `diff` of
 * the two files before the merge showed **no body difference at all**, only the
 * guard, the heading, the function name, the import order and two comments.
 *
 * **This is not a widening in D-34-06's sense.** The address widens; the surface
 * does not. An organizer reached this identical page today at
 * `/organizer/artists` — same query, same rows, same markup — and now reaches it
 * at the address `src/lib/routes/capability-routes.ts` binds to
 * `organizer.access`. Nothing was granted, revoked or re-scoped to make the
 * collapse pass.
 *
 * ── Still not `catalogue.manage`, and the reason changed shape ───────────────
 *
 * The comment this replaces argued why `admin.access` and not
 * `catalogue.manage`; after the collapse that argument is about a capability
 * this page no longer asks. What survives of it: `catalogue.manage` is the key
 * the **actions** re-ask inside themselves (`admin/artists/actions.ts`), and
 * that is a different question from reachability. It also `requires_approved`,
 * so asking it here would NARROW — a `pending` organizer reaches this listing
 * today. Reaching a listing and changing the catalogue are two verdicts, asked
 * in two places, and the collapse keeps them apart.
 *
 * ── The navs are not mounted here ────────────────────────────────────────────
 *
 * `(work)/layout.tsx` mounts both and performs the `UserRole` / `UserStatus`
 * casts once (D-34-07), so `role` and `status` are no longer read by this
 * consumer at all. The payload's own keys are untouched — removing those is a
 * migration, and this phase writes none.
 */
export default async function AdminArtistsPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone.
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: artists } = await supabase
    .from("artists")
    .select("id, name, slug, photo_url")
    .order("name", { ascending: true });

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Artists</h1>
      </header>

      <div className="px-6">
        {!artists || artists.length === 0 ? (
          <p className="text-center text-muted py-12">No artists yet.</p>
        ) : (
          <div className="space-y-2">
            {artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.slug}`}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3 hover:bg-card/80 transition-colors"
              >
                {artist.photo_url ? (
                  <Image
                    src={artist.photo_url}
                    alt={artist.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-muted text-lg">
                    &#127925;
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">
                  {artist.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
