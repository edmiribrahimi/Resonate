import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import StaffNav from "@/components/staff/StaffNav";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminArtistsPage() {
  const { capabilities, role, status } = await getAccessContext();

  // `ADMIN_ACCESS`, not `CATALOGUE_MANAGE`, despite the matching word: this is
  // the master-only catalogue LISTING inside `/admin`, and the question it asks
  // is reachability of the admin area — verbatim the middleware's own rule for
  // `/admin/*`. `catalogue.manage` is granted to organizers AND requires an
  // approved status, so it would both widen (an organizer would reach a
  // master-only page) and narrow (a `pending` master would not).
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // The nav components are typed to the `UserRole` / `UserStatus` unions; the
  // resolver answers `string | null`. Same cast the header read already made,
  // from a better source. Phase 34 (STAFF-03) owns these props.
  const navRole = role as UserRole | null;
  const navStatus = status as UserStatus | null;

  const supabase = await createClient();
  const { data: artists } = await supabase
    .from("artists")
    .select("id, name, slug, photo_url")
    .order("name", { ascending: true });

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
      </header>

      <StaffNav capabilities={[...capabilities]} />

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

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
