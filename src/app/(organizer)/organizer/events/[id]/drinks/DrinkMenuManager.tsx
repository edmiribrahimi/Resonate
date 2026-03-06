"use client";

import { useState, useTransition } from "react";
import {
  addDrinkItem,
  updateDrinkItem,
  removeDrinkItem,
} from "@/app/(organizer)/organizer/events/actions";
import type { DrinkItem } from "@/types/database";

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

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="rounded-xl border border-card-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          Add Item
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Price"
              step="0.50"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="flex-1 sm:w-24 sm:flex-none rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending || !name.trim() || !price}
              className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent-hover active:scale-95 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Item list */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-card-border bg-card p-6 text-center">
          <p className="text-sm text-muted">
            No drink items yet. Add your first item above.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-xl border border-card-border bg-card p-4 transition-opacity ${
                !item.is_available ? "opacity-50" : ""
              }`}
            >
              {/* Name + price */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <p className="text-sm text-accent font-semibold">
                  {formatPrice(item.price)}
                </p>
              </div>

              {/* Availability toggle */}
              <button
                type="button"
                onClick={() => handleToggle(item)}
                disabled={isPending}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed ${
                  item.is_available ? "bg-accent" : "bg-card-border"
                }`}
                role="switch"
                aria-checked={item.is_available}
                aria-label={`Toggle ${item.name} availability`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                    item.is_available ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                disabled={isPending}
                className="shrink-0 rounded-lg p-2 text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:cursor-not-allowed"
                aria-label={`Remove ${item.name}`}
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
