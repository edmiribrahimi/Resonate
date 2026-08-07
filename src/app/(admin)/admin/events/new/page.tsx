import { redirect } from "next/navigation";
import Link from "next/link";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import EventForm from "@/components/events/EventForm";
import { createEvent } from "@/app/(organizer)/organizer/events/actions";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminNewEventPage() {
  const {
    capabilities,
    role: rawRole,
    status: rawStatus,
  } = await getAccessContext();

  // Reachability, decided from the session rather than from a request header.
  // `createEvent` re-verifies inside itself: a page-level check does not
  // extend to a Server Action, which is its own entry point.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // role/status still flow to <MobileNav> as props: the source changed, the
  // consumer did not. Nothing here branches on them. Phase 34 (STAFF-03) owns
  // converting the nav to capabilities.
  const role = rawRole as UserRole | null;
  const status = rawStatus as UserStatus | null;

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/admin/events"
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
