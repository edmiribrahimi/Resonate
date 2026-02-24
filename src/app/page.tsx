import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import MobileNav from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import type { UserRole, UserStatus } from "@/types/database";

export default async function Home() {
  let nextEvent: { slug: string; title: string; date: string } | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("events")
      .select("slug, title, date")
      .gte("date", new Date().toISOString().split("T")[0])
      .eq("is_published", true)
      .order("date", { ascending: true })
      .limit(1)
      .single();

    nextEvent = data;
  } catch {
    // No upcoming events or query failed -- gracefully show no event preview
  }

  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <Image
          src="/images/logo-white.png"
          alt="re:sonate"
          width={320}
          height={90}
          priority
          className="mb-4"
        />

        <p className="mb-8 text-sm uppercase tracking-widest text-muted">
          motion music hub
        </p>

        {nextEvent && (
          <Link
            href={`/events/${nextEvent.slug}`}
            className="mb-8 block w-full max-w-xs rounded-lg border border-card-border p-4 transition-colors hover:bg-card"
          >
            <span className="block font-semibold">{nextEvent.title}</span>
            <span className="block text-sm text-muted">
              {new Date(nextEvent.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </Link>
        )}

        <div className="flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/events"
            className="flex h-12 items-center justify-center rounded-full bg-accent font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Discover Events
          </Link>
          <Link
            href="/register"
            className="flex h-12 items-center justify-center rounded-full border border-card-border font-medium transition-colors hover:bg-card"
          >
            Join
          </Link>
        </div>
      </main>

      <MobileNav role={role} status={status} />
    </div>
  );
}
