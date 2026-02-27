import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import EventList from "@/components/events/EventList";
import AdminNav from "@/components/admin/AdminNav";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminEventsPage() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  // Defense in depth: verify master access
  if (role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: rawEvents, error } = await supabase
    .from("events")
    .select("id, title, date, is_published, created_by")
    .order("date", { ascending: false });

  if (error) {
    return (
      <div className="min-h-dvh pb-24">
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Event Management
          </h1>
        </header>
        <div className="px-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">
              Failed to load events: {error.message}
            </p>
          </div>
        </div>
        <MobileNav role={role} status={status} />
      </div>
    );
  }

  const events = (rawEvents ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    is_published: e.is_published,
    created_by: e.created_by,
  }));

  return (
    <div className="min-h-dvh pb-24">
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <Link
          href="/admin/events/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Create Event
        </Link>
      </header>

      <AdminNav />

      <div className="px-6">
        <EventList events={events} basePath="/admin/events" />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
