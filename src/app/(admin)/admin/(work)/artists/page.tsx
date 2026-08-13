import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { FOCUS_RING } from "@/components/ui/Button";

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
 *
 * **And that is also why this file declares no navigation clearance** (plan
 * 41.1-05, D-41.1-01). Check E asserts that the set of files declaring the
 * column clearance is exactly the set mounting the responsive navigation form;
 * this page mounts neither form, so declaring one here would fail that check in
 * the direction that names the file.
 *
 * ── Converted by plan 41.1-06 ────────────────────────────────────────────────
 *
 * Whole is ONE file: the import closure above reaches `@/lib/**` only, and no
 * module in it carries a class attribute (measured: zero `className` in all
 * three). There is no `loading.tsx`, `error.tsx` or `not-found.tsx` beside this
 * route, so D-41.1-21's route-adjacent set is empty here.
 *
 * No query changed, no column added, no capability check touched, no action
 * payload altered. The diff is class strings, JSX structure and imports.
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
    /*
      `default` and not `wide`: §4's wide list is closed and does not name this
      route. That is not a fallback — it is the answer for every surface nobody
      had to argue about, and this is a list of one-line rows rather than a
      dense table.

      The shell owns the maximum, the gutter, the vertical rhythm and the
      navigation clearance in both tiers, so this page writes none of them. The
      bottom clearance this file used to hand-write was the phone number only,
      and from 768px up the navigation leaves the bottom edge entirely.
    */
    <PageShell width="default">
      <header className="mb-6">
        <PageTitle>Artists</PageTitle>
      </header>

      {!artists || artists.length === 0 ? (
        /*
          §8.11's empty-state contract — a class string, not a component, and a
          heading plus one sentence naming the next step. The next step is not
          on this page: `CreateArtistModal` has exactly one importer in the tree
          (`src/components/events/EventForm.tsx:8`), so an artist is created
          while a night's line-up is filled in. Saying so is the difference
          between an empty state and a dead end.
        */
        <div className="px-6 py-12 text-center">
          <p className="text-base font-semibold text-ink">No artists yet</p>
          <p className="mt-1 text-sm text-muted">
            An artist is created from a night&rsquo;s line-up on the event form,
            and appears here once it exists.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.slug}`}
              className={`flex min-h-11 items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:bg-raised ${FOCUS_RING}`}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ground text-lg text-muted">
                  &#127925;
                </div>
              )}
              <span className="text-sm font-semibold text-ink">
                {artist.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
