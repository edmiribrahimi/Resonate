import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import MobileNav from "@/components/layout/MobileNav";
import EventForm from "@/components/events/EventForm";
import { createEvent } from "@/app/(organizer)/organizer/events/actions";
import type { UserRole, UserStatus } from "@/types/database";

export default async function NewEventPage() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  // Defense in depth: verify organizer or master access
  if (role !== "organizer" && role !== "master") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create Event</h1>
      </header>

      <div className="px-6">
        <EventForm action={createEvent} submitLabel="Create Event" />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
