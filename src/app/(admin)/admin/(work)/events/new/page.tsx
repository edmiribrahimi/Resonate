import { redirect } from "next/navigation";
import Link from "next/link";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import EventForm from "@/components/events/EventForm";
import { createEvent } from "@/app/(admin)/admin/events/actions";

/**
 * The single event-creation form, where `/admin/events/new` and
 * `/organizer/events/new` were two (D-34-05).
 *
 * The guard is `organizer.access` — the key `CAPABILITY_ROUTES` binds
 * `/admin/events/new` to (`src/lib/routes/capability-routes.ts:255`), so this
 * page and the middleware read one declaration (D-34-09). It replaces the
 * `/admin` version's `admin.access` because the address's binding moved, not
 * because this page decided to admit anyone new: an organizer already reached
 * this exact form at `/organizer/events/new`.
 *
 * Reaching the form is not permission to create an event. `createEvent` is a
 * Server Action, therefore its own public entry point, and re-asks its own
 * question inside itself — which is why `actions.ts` stays outside `(work)`
 * (R-WORK-ROUTES) and is imported by absolute specifier from here.
 *
 * Both navs and the two `UserRole` / `UserStatus` casts are `(work)/layout.tsx`'s.
 */
export default async function NewEventPage() {
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

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
    </div>
  );
}
