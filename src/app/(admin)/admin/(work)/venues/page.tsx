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
 * The venues catalogue listing — one file where there were two (D-34-05).
 *
 * ── The grant that decided the merge ─────────────────────────────────────────
 *
 * `organizer.access`, decided by the row `('organizer','organizer.access',
 * false)` in `private.role_capabilities` and by nothing on either page. A `diff`
 * of the two versions before the merge showed **no body difference at all** —
 * the same `select("id, name, slug, address, photo_url")` and the same address
 * markup on both sides. What differed was the guard, the heading, the function
 * name, the import order and two comments.
 *
 * ── The address question, which is the one this page has to answer ───────────
 *
 * This page renders `venues.address`, so who passes the gate is a venue question
 * as well as an access one. The comment this replaces warned that
 * `catalogue.manage` *"would additionally widen ADDRESS visibility to every
 * approved organizer"*. Measured on the diff rather than assumed: the organizer
 * twin already rendered this same component over this same column, so **an
 * organizer already sees these addresses today**, at `/organizer/venues`. The
 * audience of `venues.address` is unchanged by the collapse — the address
 * widens, the surface does not.
 *
 * And the reveal is untouched in the strict sense `venue-secrecy.md` means:
 * nothing here reads or writes `venue_reveal_sent`, `venue_reveal_on_purchase`
 * or `venue_secret_hint_reveal_hours`, and this is a staff surface behind a
 * capability, not a public one. `venues.address` is the CATALOGUE address of a
 * known venue; the monotone switch lives per-ticket and per-RSVP on the event
 * path, which this file never touches. No reveal can be advanced from here.
 *
 * `catalogue.manage` is still the key the **actions** re-ask inside themselves
 * (`admin/venues/actions.ts`) — a different question from reachability, and one
 * that `requires_approved` where this one does not.
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
 * this page mounts neither form, so a declaration here would fail that check.
 *
 * ── Converted by plan 41.1-06 ────────────────────────────────────────────────
 *
 * Whole is ONE file: the import closure reaches `@/lib/**` only, and no module
 * in it carries a class attribute. The profile at `/admin/venues/[slug]` is a
 * DIFFERENT surface with its own closure (it reaches `EditVenueButton.tsx`) and
 * is converted by its own plan — a sibling route under one directory is not one
 * surface, and treating it as one would declare a page whose closure still
 * reaches an unconverted file.
 *
 * There is no `loading.tsx`, `error.tsx` or `not-found.tsx` beside this route.
 *
 * **The address is untouched, and that is the sentence this page owes.** The
 * conversion changes class strings, JSX structure and imports: no query
 * changed, no column added, no capability check touched, no action payload
 * altered — so the audience of `venues.address` is exactly what it was, and
 * nothing here reads or writes a reveal flag.
 */
export default async function AdminVenuesPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09).
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, slug, address, photo_url")
    .order("name", { ascending: true });

  return (
    /*
      `default` and not `wide`: §4's wide list is closed and does not name this
      route. That is not a fallback — it is the answer for every surface nobody
      had to argue about, and this is a list of short rows rather than a dense
      table.

      The shell owns the maximum, the gutter, the vertical rhythm and the
      navigation clearance in both tiers, so this page writes none of them.
    */
    <PageShell width="default">
      <header className="mb-6">
        <PageTitle>Venues</PageTitle>
      </header>

      {!venues || venues.length === 0 ? (
        /*
          §8.11's empty-state contract — a heading and one sentence naming the
          next step. `CreateVenueModal` has exactly one importer in the tree
          (`src/components/events/EventForm.tsx:10`), so a venue is created
          while a night is written, not from here.

          The sentence says where to go and NOT where any venue is: an empty
          state is copy, and copy about venues is a place an address can leak
          into by accident.
        */
        <div className="px-6 py-12 text-center">
          <p className="text-base font-semibold text-ink">No venues yet</p>
          <p className="mt-1 text-sm text-muted">
            A venue is created while a night is written on the event form, and
            appears here once it exists.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* The profile left `(public)` for `(work)` (D-37-23, plan 37-08),
              so this listing points at `/admin/venues/<slug>` and not at
              `/venues/<slug>`, which no route serves any more. Left unchanged
              it would have been a link to a 404 from the one surface that
              exists to open these profiles. */}
          {venues.map((venue) => (
            <Link
              key={venue.id}
              href={`/admin/venues/${venue.slug}`}
              className={`flex min-h-11 items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:bg-raised ${FOCUS_RING}`}
            >
              {venue.photo_url ? (
                <Image
                  src={venue.photo_url}
                  alt={venue.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ground text-lg text-muted">
                  &#127963;
                </div>
              )}
              <div>
                <span className="text-sm font-semibold text-ink">
                  {venue.name}
                </span>
                {venue.address && (
                  <p className="text-xs text-muted">{venue.address}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
