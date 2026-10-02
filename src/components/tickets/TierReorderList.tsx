"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderTiers } from "@/app/(admin)/admin/events/[id]/tickets/actions";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * One list of ticket tiers that can be put in the order the people who manage
 * the night choose — DBT-18, D-52.1-23, 2026-10-01.
 *
 * ── The seven owner decisions this file implements (D1–D7) ───────────────────
 *
 *  - **D1 — the drag starts from the handle only.** The three-line handle on the
 *    right of each row is the only activator (`setActivatorNodeRef`), and it is
 *    the only element carrying `touch-none`: touching the rest of the row scrolls
 *    the page, as it always did.
 *  - **D2 — a «Reorder» mode behind a button.** In the normal view the list is
 *    the server-rendered `TierCard`s (`children`) and nothing moves. «Reorder»
 *    swaps them for compact rows — name, price, handle — and hides edit and
 *    delete until «Done» or «Cancel». A tier cannot be edited half-way through a
 *    reorder, so the two writes cannot interleave.
 *  - **D3 — it saves only with «Done».** Dragging changes local state only.
 *    «Done» sends the WHOLE list in ONE call to `reorderTiers`, which writes it
 *    with one statement (`reorder_ticket_tiers`, plan 52.1-06). «Cancel» puts
 *    back the order the mode opened with and writes nothing. There is no
 *    autosave: a half-dragged order is never what the public sees.
 *  - **D4 — the public sees this order.** Not here: the single ordering
 *    `sort_order, price, created_at` in every reader is plan 52.1-08. A reorder
 *    moves positions only — no price, no quantity, no sale window is sent.
 *  - **D5 — per night, Event Pass apart.** One `DndContext` per instance, and
 *    the page mounts one instance per list: a tier cannot be dragged into
 *    another night's list, and the RPC would refuse it anyway (`stale_list`).
 *  - **D6 — the same method on desktop, tablet and phone.** Mouse after 4 px,
 *    finger (and pen on iPad, which arrives as touch) after a long press,
 *    keyboard with Space then the arrow keys. The keyboard is the
 *    accessibility path, not an «arrows» UI: there are no arrow buttons.
 *  - **D7 — long press ~0.5 s, then the row lifts.** `TouchSensor` with
 *    `delay: 500` and a 6 px tolerance for the tremor of a thumb.
 *
 * ── Why a second drag library (declared choice, 2026-10-01) ──────────────────
 *
 * `DrinkMenuManager.tsx` reorders with `Reorder` from `motion/react`, which
 * starts on `pointerdown`: it has no activation delay and no keyboard sensor.
 * D7 and keyboard access written by hand are the research's «Don't Hand-Roll»
 * (`52.1-RESEARCH.md` §Don't Hand-Roll), so the tiers use `@dnd-kit`. The repo
 * therefore carries two drag libraries on purpose: `motion` for the drink menu,
 * `@dnd-kit` for the tiers. From `DrinkMenuManager` only the **handle** is
 * copied (44 px, `touch-none`, `aria-label`, position) — **not** its save,
 * `reorderDrinkItems`, which issues one write per row and ignores failures.
 *
 * Mouse + Touch and not Pointer: the dnd-kit documentation recommends the pair
 * when touch needs a delay. On the handle, `select-none` and
 * `[-webkit-touch-callout:none]` stop iOS from opening its selection / preview
 * menu during the 500 ms press (assumption A2, measured in P-521-D).
 *
 * ── Five outcomes, five messages (`meta-gates.md`, zero silent failures) ─────
 *
 *  - `ok` → `router.refresh()`, back to the normal view in the new order;
 *  - `stale_list` → the list changed elsewhere (a tier added or deleted on
 *    another device): reload, with a «Reload» button — not a generic error;
 *  - `forbidden` → this person can no longer manage the night;
 *  - `failed` → the write was refused as a whole: nothing changed;
 *  - `no_response` → the call threw (network, deploy): the order MAY or may not
 *    be saved, and only a reload can tell — so the message says that.
 *
 * On any refusal the mode stays open with the local order, so «Done» can be
 * retried or «Cancel» pressed; nothing is ever reported as saved that was not.
 */

export interface ReorderableTier {
  id: string;
  name: string;
  price: number;
}

interface TierReorderListProps {
  eventId: string;
  /** `null` for the Event Pass list. */
  partyId: string | null;
  /** In the order the page read them — the single reader's order. */
  tiers: ReorderableTier[];
  /** The server-rendered `TierCard`s of this list, shown in the normal view. */
  children: ReactNode;
}

type SaveError = "stale_list" | "forbidden" | "failed" | "no_response";

const ERROR_MESSAGE: Record<SaveError, string> = {
  stale_list:
    "The list changed on another device — reload the page to see it",
  forbidden: "You can no longer manage this night",
  failed: "Could not save the order — nothing was changed",
  no_response:
    "No response from the server — the order may not be saved; reload to check",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export default function TierReorderList({
  eventId,
  partyId,
  tiers,
  children,
}: TierReorderListProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "reorder">("view");
  const [order, setOrder] = useState<string[]>(() => tiers.map((t) => t.id));
  const [startOrder, setStartOrder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<SaveError | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // D7 — a long press of ~0.5 s before the row lifts; 6 px of thumb tremor.
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = new Map(tiers.map((t) => [t.id, t]));
  const nameOf = (id: string | number) => byId.get(String(id))?.name ?? "tier";
  const positionOf = (id: string | number) => order.indexOf(String(id)) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${nameOf(active.id)}, position ${positionOf(active.id)} of ${order.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} moved to position ${positionOf(over.id)} of ${order.length}.`
        : `${nameOf(active.id)} is no longer over the list.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} dropped at position ${positionOf(over.id)} of ${order.length}. Press Done to save.`
        : `${nameOf(active.id)} dropped back in place.`,
    onDragCancel: ({ active }) =>
      `Reordering cancelled. ${nameOf(active.id)} returned to its place.`,
  };

  // The normal view: the server's cards, untouched. «Reorder» only when there
  // is something to reorder.
  if (mode === "view") {
    return (
      <div className="space-y-3">
        {tiers.length >= 2 && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                // Re-read from the props every time the mode opens: after a
                // save and `router.refresh()` the props carry the stored order.
                const current = tiers.map((t) => t.id);
                setOrder(current);
                setStartOrder(current);
                setError(null);
                setMode("reorder");
              }}
            >
              Reorder
            </Button>
          </div>
        )}
        {children}
      </div>
    );
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const from = prev.indexOf(String(active.id));
      const to = prev.indexOf(String(over.id));
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  }

  function handleCancel() {
    // D3 — no write: the order the mode opened with comes back.
    setOrder(startOrder);
    setError(null);
    setMode("view");
  }

  async function handleDone() {
    if (saving) return;
    // Nothing moved: no write is needed, and none is made.
    if (order.length === startOrder.length && order.every((id, i) => id === startOrder[i])) {
      setError(null);
      setMode("view");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await reorderTiers(eventId, partyId, order);
      if (result.ok) {
        setMode("view");
        router.refresh();
        return;
      }
      setError(result.reason);
    } catch (err) {
      console.error("[tickets.reorder_no_response]", {
        eventId,
        partyId,
        message: err instanceof Error ? err.message : String(err),
      });
      setError("no_response");
    } finally {
      setSaving(false);
    }
  }

  const rows = order
    .map((id) => byId.get(id))
    .filter((t): t is ReorderableTier => t !== undefined);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Hold the handle, then drag. Nothing is saved until Done.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To pick up a tier, press Space or Enter. Use the up and down arrow keys to move it. Press Space or Enter again to drop it, or Escape to cancel. Press Done to save the order.",
          },
        }}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2" aria-label="Tiers in their order">
            {rows.map((tier) => (
              <SortableTierRow key={tier.id} tier={tier} disabled={saving} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-sem-crit px-4 py-3"
        >
          <p className="text-sm text-ink">{ERROR_MESSAGE[error]}</p>
          {(error === "stale_list" || error === "no_response") && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={handleDone} disabled={saving}>
          {saving ? "Saving…" : "Done"}
        </Button>
      </div>
    </div>
  );
}

function SortableTierRow({
  tier,
  disabled,
}: {
  tier: ReorderableTier;
  disabled: boolean;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tier.id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10" : undefined}
    >
      <Card
        className={`flex items-center gap-3 py-2 ${
          isDragging ? "shadow-lg ring-1 ring-control" : ""
        }`}
      >
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
          {tier.name}
        </p>
        <p className="shrink-0 text-sm font-semibold text-ink">
          {formatPrice(tier.price)}
        </p>
        {/* D1 — the only activator, and the only element with touch-none:
            the rest of the row scrolls the page. */}
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${tier.name}`}
          className={`inline-flex min-h-11 min-w-11 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-full text-ink-2 transition-colors [-webkit-touch-callout:none] hover:text-ink active:cursor-grabbing ${FOCUS_RING}`}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </Card>
    </li>
  );
}
