"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Chip";

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

/**
 * The section label, at the label/data role.
 *
 * The four axes are `SectionHeading`'s — 12px, weight 600, wide tracking, the
 * data face — and the bottom margin is deliberately **not** among them: the row
 * this heading shares with the counter carries the margin, and appending a
 * zero margin after the component's own 16px would lose, because both are the
 * same property at the same specificity and the larger step is written later in
 * the emitted sheet. D-41-11 — a surface that writes the string is equally
 * converted, and the component is a convenience rather than a demand.
 */
const SELECTOR_LABEL =
  "font-mono text-xs font-semibold uppercase tracking-widest text-muted";

/**
 * The event picker — the only thing on this surface a person actually touches.
 *
 * ── Why the floor matters more here than anywhere else on this page ──────────
 *
 * Nothing else on `/admin/analytics/compare` is interactive except the two mode
 * chips. If a row of this list is hard to hit on a tablet, the surface is hard
 * to use, full stop. Each row's box was 16px with no hit area around it; it is
 * the primitive now, which keeps the 16px drawn box — §8.6 chose that over
 * enlarging the glyph, because a 44px checkbox in a list would be a different
 * control — and puts a 44×44 target around it.
 *
 * ── The selected row is `--raised`, not an accent wash ───────────────────────
 *
 * §5.1 names `--raised` for exactly this: a selected row. The accent's
 * reserved-for list is a positive enumeration and a row wash is not on it.
 *
 * ── The date is a Badge, and could not have been a Chip ──────────────────────
 *
 * It states when the night was and cannot be operated, so it renders a span.
 * The sentence that decides it is at the top of `Chip.tsx`: a badge that is a
 * link or a button is a chip. This one is neither.
 */
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
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={SELECTOR_LABEL}>Select Events</h2>
        <span className="font-mono text-xs text-muted">
          {selectedIds.length}/{maxSelection} selected
        </span>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {events.map((event) => {
          const isSelected = selectedIds.includes(event.id);
          const isDisabled = !isSelected && selectedIds.length >= maxSelection;

          return (
            <div
              key={event.id}
              className={`flex items-center gap-3 rounded-xl px-3 transition-colors ${
                isSelected
                  ? "bg-raised"
                  : isDisabled
                    ? "opacity-40"
                    : "hover:bg-raised"
              }`}
            >
              <Checkbox
                id={`compare-event-${event.id}`}
                label={event.title}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => handleToggle(event.id)}
              />
              <Badge className="ml-auto shrink-0">
                {formatDate(event.date)}
              </Badge>
            </div>
          );
        })}

        {events.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-base font-semibold text-ink">No nights yet</p>
            <p className="mt-1 text-sm text-muted">
              A night appears here once it exists in the calendar.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
