"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  deleteEvent,
  publishEvent,
  unpublishEvent,
} from "@/app/(organizer)/organizer/events/actions";

interface EventItem {
  id: string;
  title: string;
  date: string;
  is_published: boolean;
  capacity: number | null;
  created_by: string | null;
  creator_name?: string | null;
}

interface EventListProps {
  events: EventItem[];
  showCreator?: boolean;
  basePath?: string;
}

export default function EventList({
  events,
  showCreator = false,
  basePath = "/organizer/events",
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
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
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

      {events.map((event) => (
        <div
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
                {event.capacity && (
                  <span>Capacity: {event.capacity}</span>
                )}
                {showCreator && event.creator_name && (
                  <span>By: {event.creator_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Link
              href={`${basePath}/${event.id}/edit`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Edit
            </Link>

            <Link
              href={`${basePath}/${event.id}/tickets`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Manage Tickets
            </Link>

            <Link
              href={`${basePath}/${event.id}/sales`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Sales
            </Link>

            <Link
              href={`${basePath}/${event.id}/media`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
            >
              Media
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
        </div>
      ))}
    </div>
  );
}
