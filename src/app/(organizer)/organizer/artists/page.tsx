import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import StaffNav from "@/components/staff/StaffNav";
import type { UserRole, UserStatus } from "@/types/database";

export default async function OrganizerArtistsPage() {
  const { capabilities, role, status } = await getAccessContext();

  // The question is "may this person reach the organizer area", which is what
  // `organizer.access` names and what the middleware already asks for
  // `/organizer/*`. NOT `catalogue.manage`: that one requires an approved
  // status, and a `pending` organizer reaches this listing today. Narrowing it
  // here would be a verdict change, not a conversion.
  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  // The resolver types these `string | null` deliberately, so that no decision
  // can branch on them. They are not a decision here: they are props for two
  // `"use client"` navs that cannot import the DAL. The cast lives at that
  // boundary and nowhere else. Phase 34 (STAFF-03) converts the navs and this
  // pass-through goes with them.
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
        <h1 className="text-3xl font-bold tracking-tight">Organizer</h1>
      </header>

      <StaffNav role={navRole} context="organizer" />

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
