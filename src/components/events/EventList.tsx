"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StaggeredList, StaggeredItem } from "@/components/motion/StaggeredList";
import {
  deleteEvent,
  publishEvent,
  unpublishEvent,
} from "@/app/(admin)/admin/events/actions";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Chip";

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
 *
 * ── The six became one, and the reason is a measurement (plan 41.1-07) ───────
 *
 * `41-UI-SPEC.md` §6.4 names this row: six controls on one line, none of them
 * reaching the 44px floor, on the surface a person operates a night from. The
 * fix is the floor; what carries it needed deciding.
 *
 * **`Chip` cannot carry these hrefs, and that is measured rather than argued.**
 * `Chip`'s prop is the bare route type, which is that type at its default
 * parameter — and at the default parameter the dynamic arm collapses, which is
 * the same collapse the paragraph above records for annotations. Written as
 * `<Chip href={…}>` and typechecked on 2026-08-13, the compiler said:
 *
 *     TS2322: Type '`/admin/events/${string}/edit`' is not assignable to
 *             type 'Route | undefined'.
 *
 * `Link` does not have the problem because `Link` is **generic** and infers the
 * type argument from the template. Three ways out were available and two are
 * refused: casting the href, which switches off the only check that makes a
 * stale address a build error instead of a 404 somebody clicks; and widening
 * `Chip` to be generic the way `Link` is, which is a change to a shared
 * primitive that no plan in this wave was given and that two plans could
 * collide on. **The third is taken here, and it is `41.1-PATTERNS.md` §2.5's own
 * "best single call site to copy": a `<Link>` carrying the composed shape with
 * the focus expression IMPORTED, never re-spelled.** The question it leaves —
 * *should `Chip` be generic over its route so a dynamic address can be a chip?*
 * — is written into this plan's summary as owed, not decided here.
 *
 * **One `<Link>`, rendered six times.** The class string is therefore written
 * once and written literally inside the attribute, which is also the only form
 * the touch-target gate can read: it does not resolve a module constant, and
 * says so in its own exemption list. The segments are a literal union, so each
 * of the six addresses is still checked by inference at build time — a segment
 * that stops being a route is a build error here, exactly as it was when these
 * were six hand-written hrefs. Still no annotation, still no cast.
 */

/**
 * The six addresses a night is operated from, and the label each carries.
 *
 * `as const` is load-bearing: without it the segment widens to `string`, the
 * template stops matching any dynamic route, and the build fails loudly. It
 * cannot fail quietly in this direction, which is the only property that
 * matters here.
 */
const ROW_CONTROLS = [
  { segment: "edit", label: "Edit" },
  { segment: "tickets", label: "Manage Tickets" },
  { segment: "sales", label: "Sales" },
  { segment: "guest-list", label: "Guest List" },
  { segment: "media", label: "Media" },
  { segment: "analytics", label: "Analytics" },
] as const;

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
      /* §8.11's empty-state contract — a class string, not a component: a
         heading, and one body sentence naming the next step. The words are the
         ones that were already here, rearranged into the two lines the contract
         asks for; none is introduced. */
      <div className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">No events yet</p>
        <p className="mt-1 text-sm text-muted">
          Create your first event to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* The refusal, in the semantic ink and with the role that announces it.
          The tinted box that stood here stated nothing its sentence did not,
          and it was drawn in a raw palette. The sentences are unchanged: each
          of the three acts still names itself, and a thrown message still
          reaches the screen — this product has no error tracking, so what is
          printed here is the whole of what anybody will learn. */}
      {error && (
        <p role="alert" className="text-sm text-sem-crit">
          {error}
        </p>
      )}

      <StaggeredList className="space-y-3">
      {events.map((event) => (
        <StaggeredItem
          key={event.id}
          /* The card contract — the container radius, the line token on the
             edge, the surface ground and the 24px padding. The same three
             values `SkeletonCard` writes, so the placeholder that precedes this
             list occupies the box these rows will take. */
          className="rounded-2xl border border-line bg-surface p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-ink truncate">
                  {event.title}
                </h3>
                {/* A mark, not a target: it states what this night is and
                    cannot be operated, so it is a badge and renders a span.
                    The emphasis stays where it already was — a published night
                    is the one the eye should find first, because it is the one
                    members can already see. The word is the channel; the fill
                    only makes it findable. */}
                <Badge
                  tone={event.is_published ? "emphasis" : "neutral"}
                  className="shrink-0"
                >
                  {event.is_published ? "Published" : "Draft"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>{formatDate(event.date)}</span>
                {showCreator && event.creator_name && (
                  <span>By: {event.creator_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* The row of controls.

              Every one of the eight is at the 44px floor now, and none of them
              shrinks: the shrink allow-list is closed at one item and this row
              is not on it. Where the eight no longer fit on one line at phone
              width they WRAP — the row already wrapped, and no breakpoint
              prefix is introduced to hide the width they need. */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {ROW_CONTROLS.map(({ segment, label }) => (
              <Link
                key={segment}
                href={`/admin/events/${event.id}/${segment}`}
                className={`inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-control px-4 text-xs font-semibold normal-case tracking-wide text-ink-2 transition-all hover:text-ink active:scale-95 active:opacity-80 ${FOCUS_RING}`}
              >
                {label}
              </Link>
            ))}

            {/* Publishing a night makes it visible to members, so it keeps the
                accent it already carried — on the ladder's terms, where an
                accent FILL takes the ground as its ink at 6.85 : 1 instead of
                accent ink on an accent wash. Unpublishing is the quiet half of
                the same pair and is secondary. */}
            {event.is_published ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleUnpublish(event.id)}
                disabled={isPending && pendingAction === `unpublish-${event.id}`}
              >
                {pendingAction === `unpublish-${event.id}`
                  ? "..."
                  : "Unpublish"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handlePublish(event.id)}
                disabled={isPending && pendingAction === `publish-${event.id}`}
              >
                {pendingAction === `publish-${event.id}` ? "..." : "Publish"}
              </Button>
            )}

            {/* Deleting a night is the destructive rung, and it keeps the red
                channel it had — at 7.36 : 1 rather than a palette ink on a
                tint. The confirmation on a published night is unchanged: this
                conversion touched no guard, only the pill it sits on. */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(event)}
              disabled={isPending && pendingAction === `delete-${event.id}`}
            >
              {pendingAction === `delete-${event.id}` ? "..." : "Delete"}
            </Button>
          </div>
        </StaggeredItem>
      ))}
      </StaggeredList>
    </div>
  );
}
