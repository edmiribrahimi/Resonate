"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StaggeredList, StaggeredItem } from "@/components/motion/StaggeredList";
import {
  deleteEvent,
  publishEvent,
  unpublishEvent,
} from "@/app/(admin)/admin/events/actions";

interface EventItem {
  id: string;
  title: string;
  date: string;
  is_published: boolean;
  created_by: string | null;
  creator_name?: string | null;
}

interface EventListProps {
  events: EventItem[];
  showCreator?: boolean;
}

/**
 * ── The tree-prefix prop is gone, and the six hrefs below stay UNANNOTATED ────
 *
 * There were two events surfaces and this component was shared by both, so it
 * took the tree it was being drawn in as a prop. Plan 34-01 narrowed that prop
 * from `string` to the two literals actually passed; plan 34-11 collapsed the
 * surfaces, which left it with **one caller and one value**. A prop nobody can
 * vary is an option nobody has, and options nobody has are where the next
 * divergence starts — so the one surviving address is inlined instead.
 *
 * That inlining is what makes the six hrefs checkable, and the check is
 * `<Link>`'s inference rather than an annotation. Measured 2026-08-09 against
 * the generated `.next/types/link.d.ts` of `next@16.1.6`: the bare route type is
 * parameterised by `string`, and `RouteImpl`'s dynamic arm collapses to `never`
 * when it is — so annotating one of these templates with it is a TS2322, while
 * passing the same template straight to `<Link>` compiles and a template with a
 * bogus final segment does not. `Link` is generic
 * (`Link<RouteType>(props: LinkProps<RouteType>)`), so `RouteType` is inferred
 * from the template and the dynamic arm resolves.
 *
 * **So do not annotate these hrefs, and above all do not cast them to the route
 * type.** The annotation does not compile, and the cast that would make it
 * compile switches the check off entirely — which is the outcome this note
 * exists to prevent. A stale link in this component is a build error today; a
 * cast would demote it to a 404 found by whoever clicks it.
 *
 * The tokens this paragraph deliberately does not spell — the prop's name, and
 * the cast — are the ones the plan's acceptance criteria grep this file for.
 * Plans 34-03 and 34-06 both recorded the same self-inflicted failure: a
 * criterion a comment can defeat is a criterion nobody can run.
 */
export default function EventList({
  events,
  showCreator = false,
}: EventListProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePublish(eventId: string) {
    setPendingAction(`publish-${eventId}`);
    setError(null);
    startTransition(async () => {
      try {
        const result = await publishEvent(eventId);
        if (!result.success) {
          setError("Failed to publish event.");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to publish event."
        );
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleUnpublish(eventId: string) {
    setPendingAction(`unpublish-${eventId}`);
    setError(null);
    startTransition(async () => {
      try {
        const result = await unpublishEvent(eventId);
        if (!result.success) {
          setError("Failed to unpublish event.");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to unpublish event."
        );
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleDelete(event: EventItem) {
    setError(null);

    if (event.is_published) {
      const confirmed = window.confirm(
        "This event is published and visible to members. Are you sure you want to delete it?"
      );
      if (!confirmed) return;
    }

    setPendingAction(`delete-${event.id}`);
    startTransition(async () => {
      try {
        const result = await deleteEvent(event.id);
        if (!result.success) {
          setError("Failed to delete event.");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete event."
        );
      } finally {
        setPendingAction(null);
      }
    });
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-8 text-center">
        <p className="text-muted">
          No events yet. Create your first event to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <StaggeredList className="space-y-3">
      {events.map((event) => (
        <StaggeredItem
          key={event.id}
          className="rounded-xl border border-card-border bg-card p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {event.title}
                </h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    event.is_published
                      ? "bg-green-500/20 text-green-400"
                      : "bg-muted/20 text-muted"
                  }`}
                >
                  {event.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>{formatDate(event.date)}</span>
                {showCreator && event.creator_name && (
                  <span>By: {event.creator_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Link
              href={`/admin/events/${event.id}/edit`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Edit
            </Link>

            <Link
              href={`/admin/events/${event.id}/tickets`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Manage Tickets
            </Link>

            <Link
              href={`/admin/events/${event.id}/sales`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Sales
            </Link>

            <Link
              href={`/admin/events/${event.id}/guest-list`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Guest List
            </Link>

            <Link
              href={`/admin/events/${event.id}/media`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Media
            </Link>

            <Link
              href={`/admin/events/${event.id}/analytics`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Analytics
            </Link>

            {event.is_published ? (
              <button
                type="button"
                onClick={() => handleUnpublish(event.id)}
                disabled={isPending && pendingAction === `unpublish-${event.id}`}
                className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-card-border/30 transition-colors disabled:opacity-50"
              >
                {pendingAction === `unpublish-${event.id}`
                  ? "..."
                  : "Unpublish"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handlePublish(event.id)}
                disabled={isPending && pendingAction === `publish-${event.id}`}
                className="rounded-full border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
              >
                {pendingAction === `publish-${event.id}` ? "..." : "Publish"}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDelete(event)}
              disabled={isPending && pendingAction === `delete-${event.id}`}
              className="rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {pendingAction === `delete-${event.id}` ? "..." : "Delete"}
            </button>
          </div>
        </StaggeredItem>
      ))}
      </StaggeredList>
    </div>
  );
}
