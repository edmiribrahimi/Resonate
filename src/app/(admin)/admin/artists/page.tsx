import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import AdminNav from "@/components/admin/AdminNav";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminArtistsPage() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  if (role !== "master") {
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
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
      </header>

      <AdminNav role={role} />

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

      <MobileNav role={role} status={status} />
    </div>
  );
}
