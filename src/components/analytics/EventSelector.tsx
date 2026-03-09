"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface EventOption {
  id: string;
  title: string;
  date: string;
}

interface EventSelectorProps {
  events: EventOption[];
  selectedIds: string[];
  maxSelection?: number;
}

export default function EventSelector({
  events,
  selectedIds,
  maxSelection = 4,
}: EventSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleToggle = useCallback(
    (eventId: string) => {
      const current = new Set(selectedIds);
      if (current.has(eventId)) {
        current.delete(eventId);
      } else {
        if (current.size >= maxSelection) return;
        current.add(eventId);
      }

      const params = new URLSearchParams(searchParams.toString());
      const ids = Array.from(current);
      if (ids.length > 0) {
        params.set("events", ids.join(","));
      } else {
        params.delete("events");
      }

      router.push(`?${params.toString()}`);
    },
    [selectedIds, maxSelection, searchParams, router]
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
          Select Events
        </h2>
        <span className="text-xs text-muted">
          {selectedIds.length}/{maxSelection} selected
        </span>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {events.map((event) => {
          const isSelected = selectedIds.includes(event.id);
          const isDisabled = !isSelected && selectedIds.length >= maxSelection;

          return (
            <label
              key={event.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                isSelected
                  ? "bg-accent/10"
                  : isDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-card-border/20"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => handleToggle(event.id)}
                className="h-4 w-4 rounded border-card-border accent-accent"
              />
              <span className="flex-1 text-sm truncate">{event.title}</span>
              <span className="shrink-0 rounded-full bg-card-border/30 px-2 py-0.5 text-xs text-muted">
                {formatDate(event.date)}
              </span>
            </label>
          );
        })}

        {events.length === 0 && (
          <p className="py-4 text-center text-sm text-muted/60">
            No events found
          </p>
        )}
      </div>
    </div>
  );
}
