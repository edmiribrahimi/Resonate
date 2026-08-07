import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import EventList from "@/components/events/EventList";
import StaffNav from "@/components/staff/StaffNav";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminEventsPage() {
  const {
    capabilities,
    role: rawRole,
    status: rawStatus,
  } = await getAccessContext();

  // Reachability, decided from the session rather than from a request header.
  // The middleware asks the same question for `/admin/*`; this is defence in
  // depth, not a substitute for it — and neither is a substitute for RLS.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // role/status still flow to <MobileNav> / <StaffNav> as props: the source
  // changed, the consumer did not. Nothing here branches on them. The cast
  // narrows `string | null` to the union those client components declare;
  // phase 34 (STAFF-03) owns converting them to capabilities.
  const role = rawRole as UserRole | null;
  const status = rawStatus as UserStatus | null;

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
      <AnimatedSection>
        <header className="flex items-center justify-between px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <Link
            href="/admin/events/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Create Event
          </Link>
        </header>
      </AnimatedSection>

      <StaffNav role={role} context="admin" />

      <AnimatedSection delay={0.1} className="px-6">
        <EventList events={events} basePath="/admin/events" />
      </AnimatedSection>

      <MobileNav role={role} status={status} />
    </div>
  );
}
