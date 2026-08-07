import { redirect } from "next/navigation";
import Link from "next/link";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import EventForm from "@/components/events/EventForm";
import { createEvent } from "@/app/(organizer)/organizer/events/actions";
import type { UserRole, UserStatus } from "@/types/database";

export default async function NewEventPage() {
  const { capabilities, role, status } = await getAccessContext();

  // The question is "may this person reach the organizer area" —
  // `organizer.access`, the same one the middleware asks for `/organizer/*`.
  // Reaching this form is not permission to create an event: `createEvent` is a
  // server action, therefore a public endpoint, and re-checks on its own.
  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  // The resolver types these `string | null` deliberately, so that no decision
  // can branch on them. They are not a decision here: they are props for a
  // `"use client"` nav that cannot import the DAL. Phase 34 (STAFF-03) converts
  // that nav and this pass-through goes with it.
  const navRole = role as UserRole | null;
  const navStatus = status as UserStatus | null;

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

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
