"use client";

import { useState, useTransition, useEffect } from "react";
import { Reorder, useDragControls } from "motion/react";
import {
  addDrinkItem,
  updateDrinkItem,
  removeDrinkItem,
  reorderDrinkItems,
} from "@/app/(admin)/admin/events/actions";
import type { DrinkItem } from "@/types/database";
import { Button, IconButton, FOCUS_RING } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { SectionHeading } from "@/components/ui/Typography";

/**
 * The drink menu manager — converted, and the `Switch` primitive's first
 * consumer.
 *
 * ── What did NOT change, and it is the half that matters ─────────────────────
 *
 * This file governs a bar menu: what a guest can be sold, and at what price.
 * The conversion is **markup only** — *no query changed, no column added, no
 * capability check touched, no action payload altered*
 * (`conversion-manifest.mjs:372`). Specifically: the four server actions are
 * called with the same arguments in the same order; the availability flag keeps
 * its name, its value and the negation that produces it; the price is parsed,
 * validated and formatted by the same code in the same locale and currency; and
 * nothing here touches an order, a token, a refund or a closing time — those
 * live elsewhere and this file does not import them.
 *
 * ── Why the toggle is a primitive now ────────────────────────────────────────
 *
 * The control that decided a drink's availability was a hand-written track,
 * drawn 24 px tall against §6.1's 44 px floor and suppressing its own focus
 * indicator, which §5.4 does not allow to survive. It was one of **four**
 * identical copies in this phase's scope; `src/components/ui/Switch.tsx` is the
 * one place that shape now lives, and this call site is the reason that file was
 * allowed to be published at all (D-41-04). The remaining three are the event
 * form's and are adopted by plan 41.1-18.
 *
 * ── Two mechanisms changed shape, and both are recorded rather than buried ───
 *
 *  1. **The edit field is focused by id, not by a ref.** The form controls take
 *     a required `id` — it is what binds a label to its input — and they are
 *     plain function components that do not accept a forwarding ref. The
 *     alternative was to leave one raw input carrying a hand-copied boundary
 *     string, which is the exact duplication the control primitives exist to
 *     end (finding A1, D-41-10). The effect is unchanged: opening an edit puts
 *     the caret in the name field.
 *  2. **The row is a card inside the reorder item**, rather than a reorder item
 *     wearing a card's class string. The drag surface and the drawn box are the
 *     same rectangle either way; splitting them is what lets the shell come
 *     from the primitive instead of from a copied string.
 */

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

interface DrinkMenuManagerProps {
  eventId: string;
  eventTitle: string;
  partyId?: string;
  initialItems: DrinkItem[];
}

export default function DrinkMenuManager({
  eventId,
  eventTitle: _eventTitle,
  partyId,
  initialItems,
}: DrinkMenuManagerProps) {
  const [items, setItems] = useState<DrinkItem[]>(initialItems);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  useEffect(() => {
    if (!editingId) return;
    document.getElementById(editNameFieldId(editingId))?.focus();
  }, [editingId]);

  function handleAdd() {
    const trimmedName = name.trim();
    const parsedPrice = parseFloat(price);

    if (!trimmedName || isNaN(parsedPrice) || parsedPrice <= 0) return;

    startTransition(async () => {
      try {
        const newItem = await addDrinkItem(eventId, trimmedName, parsedPrice, partyId);
        setItems((prev) => [...prev, newItem]);
        setName("");
        setPrice("");
      } catch (err) {
        console.error("Failed to add drink item:", err);
      }
    });
  }

  function startEdit(item: DrinkItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
  }

  function handleSaveEdit(item: DrinkItem) {
    const trimmedName = editName.trim();
    const parsedPrice = parseFloat(editPrice);

    if (!trimmedName || isNaN(parsedPrice) || parsedPrice <= 0) return;
    if (trimmedName === item.name && parsedPrice === item.price) {
      cancelEdit();
      return;
    }

    startTransition(async () => {
      try {
        await updateDrinkItem(item.id, { name: trimmedName, price: parsedPrice });
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, name: trimmedName, price: parsedPrice } : i
          )
        );
        cancelEdit();
      } catch (err) {
        console.error("Failed to update drink item:", err);
      }
    });
  }

  function handleToggle(item: DrinkItem) {
    startTransition(async () => {
      try {
        await updateDrinkItem(item.id, {
          is_available: !item.is_available,
        });
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, is_available: !i.is_available } : i
          )
        );
      } catch (err) {
        console.error("Failed to toggle drink item:", err);
      }
    });
  }

  function handleRemove(itemId: string) {
    startTransition(async () => {
      try {
        await removeDrinkItem(itemId);
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      } catch (err) {
        console.error("Failed to remove drink item:", err);
      }
    });
  }

  function handleReorder(newItems: DrinkItem[]) {
    const prev = items;
    setItems(newItems);
    startTransition(async () => {
      try {
        await reorderDrinkItems(
          eventId,
          newItems.map((i) => i.id)
        );
      } catch (err) {
        console.error("Failed to reorder drink items:", err);
        setItems(prev);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <Card>
        <SectionHeading>Add Item</SectionHeading>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input
              id="drink-new-name"
              aria-label="Name of the new drink"
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-24 shrink-0">
            <Input
              id="drink-new-price"
              aria-label="Price of the new drink, in euro"
              type="number"
              placeholder="Price"
              step="0.50"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={isPending || !name.trim() || !price}
            className="shrink-0"
          >
            Add
          </Button>
        </div>
      </Card>

      {/* Item list */}
      {items.length === 0 ? (
        /* §8.11's empty-state contract — a class string, not a component. */
        <div className="px-6 py-12 text-center">
          <p className="text-base font-semibold text-ink">No drink items yet</p>
          <p className="mt-1 text-sm text-muted">
            A menu cannot open without an item. Add the first one above.
          </p>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="space-y-2"
        >
          {items.map((item) => (
            <DrinkRow
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              isPending={isPending}
              editName={editName}
              editPrice={editPrice}
              setEditName={setEditName}
              setEditPrice={setEditPrice}
              onStartEdit={() => startEdit(item)}
              onSaveEdit={() => handleSaveEdit(item)}
              onCancelEdit={cancelEdit}
              onToggle={() => handleToggle(item)}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

/**
 * The edit field's id, in one place.
 *
 * It is read twice — once by the effect that puts the caret there when an edit
 * opens, once by the control that renders it — and a second spelling is how the
 * two stop agreeing.
 */
function editNameFieldId(itemId: string) {
  return `drink-edit-name-${itemId}`;
}

interface DrinkRowProps {
  item: DrinkItem;
  isEditing: boolean;
  isPending: boolean;
  editName: string;
  editPrice: string;
  setEditName: (v: string) => void;
  setEditPrice: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
}

function DrinkRow({
  item,
  isEditing,
  isPending,
  editName,
  editPrice,
  setEditName,
  setEditPrice,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggle,
  onRemove,
}: DrinkRowProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item value={item} dragListener={false} dragControls={dragControls}>
      <Card
        className={`flex items-center gap-3 transition-opacity ${
          !item.is_available ? "opacity-50" : ""
        }`}
      >
        {/* Drag handle (hidden while editing to avoid pointer conflicts) */}
        {!isEditing && (
          <button
            type="button"
            onPointerDown={(e) => dragControls.start(e)}
            className={`inline-flex min-h-11 min-w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-ink-2 transition-colors hover:text-ink active:cursor-grabbing ${FOCUS_RING}`}
            aria-label={`Drag to reorder ${item.name}`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="9" cy="6" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="9" cy="18" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="15" cy="6" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="15" cy="18" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
        )}

        {isEditing ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 basis-32">
              <Input
                id={editNameFieldId(item.id)}
                aria-label={`Name of ${item.name}`}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEdit();
                  if (e.key === "Escape") onCancelEdit();
                }}
              />
            </div>
            <div className="w-24 shrink-0">
              <Input
                id={`drink-edit-price-${item.id}`}
                aria-label={`Price of ${item.name}, in euro`}
                type="number"
                step="0.50"
                min="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEdit();
                  if (e.key === "Escape") onCancelEdit();
                }}
              />
            </div>
            <Button
              size="sm"
              onClick={onSaveEdit}
              disabled={isPending}
              className="shrink-0"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelEdit}
              className="shrink-0"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            {/*
              The name and the price open the editor, so they are one control
              and the control says so at rest: a hover-only affordance is
              invisible on the device this product is used on most.
            */}
            <button
              type="button"
              onClick={onStartEdit}
              className={`min-h-11 min-w-0 flex-1 rounded-xl px-1 text-left ${FOCUS_RING}`}
            >
              <p className="whitespace-pre-line text-sm text-ink underline decoration-dotted underline-offset-4">
                {item.name}
              </p>
              {/*
                A figure carries the data face (§8.8), which already brings
                tabular figures with it, so a column of prices lines up.
                Deliberately NOT the accent: §5.1's accent list is closed and a
                price is on none of it.
              */}
              <p className="font-mono text-sm font-semibold text-ink">
                {formatPrice(item.price)}
              </p>
            </button>

            <Switch
              id={`drink-available-${item.id}`}
              label={`Toggle ${item.name} availability`}
              labelHidden
              checked={item.is_available}
              onChange={onToggle}
              disabled={isPending}
              className="shrink-0"
            />

            <IconButton
              onClick={onRemove}
              disabled={isPending}
              aria-label={`Remove ${item.name}`}
              className="shrink-0"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </IconButton>
          </>
        )}
      </Card>
    </Reorder.Item>
  );
}
