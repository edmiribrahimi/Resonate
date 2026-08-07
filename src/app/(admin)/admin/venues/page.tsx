import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import StaffNav from "@/components/staff/StaffNav";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminVenuesPage() {
  const { capabilities, role, status } = await getAccessContext();

  // This page renders `venues.address`, so who passes this gate is a venue
  // question as well as an access one. The set is unchanged: master before,
  // master after — `admin.access` is the middleware's own rule for `/admin/*`.
  // `CATALOGUE_MANAGE` is refused here for the same reason as on the artists
  // page, and here it would additionally widen ADDRESS visibility to every
  // approved organizer. Nothing about `venue_reveal_sent` is touched.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // The nav components are typed to the `UserRole` / `UserStatus` unions; the
  // resolver answers `string | null`. Same cast the header read already made,
  // from a better source. Phase 34 (STAFF-03) owns these props.
  const navRole = role as UserRole | null;
  const navStatus = status as UserStatus | null;

  const supabase = await createClient();
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, slug, address, photo_url")
    .order("name", { ascending: true });

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
      </header>

      <StaffNav role={navRole} context="admin" />

      <div className="px-6">
        {!venues || venues.length === 0 ? (
          <p className="text-center text-muted py-12">No venues yet.</p>
        ) : (
          <div className="space-y-2">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug}`}
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

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
