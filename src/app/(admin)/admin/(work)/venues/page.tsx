import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";

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
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Venues</h1>
      </header>

      <div className="px-6">
        {!venues || venues.length === 0 ? (
          <p className="text-center text-muted py-12">No venues yet.</p>
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
                className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3 hover:bg-card/80 transition-colors"
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background text-muted text-lg">
                    &#127963;
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-foreground">
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
      </div>
    </div>
  );
}
