"use client";

import { useState, useMemo, useTransition } from "react";
import type { DrinkItem } from "@/types/database";
import GuestDrinkMenu from "./GuestDrinkMenu";
import DrinkMenuManager from "@/app/(organizer)/organizer/events/[id]/drinks/DrinkMenuManager";
import { updateMenuClosesAt } from "./actions";

interface Party {
  id: string;
  title: string;
  date: string;
  end_time: string | null;
  menu_closes_at: string | null;
}

interface PartyDrinks {
  partyId: string;
  allItems: DrinkItem[];
  availableItems: DrinkItem[];
}

interface PartyDrinkMenuProps {
  eventId: string;
  eventTitle: string;
  parties: Party[];
  drinksByParty: PartyDrinks[];
  canManage: boolean;
  isAuthenticated: boolean;
}

/**
 * Compute the menu closing datetime for a party.
 * Uses menu_closes_at if set, otherwise falls back to end_time.
 * Returns null if neither is set (menu never closes automatically).
 */
function getMenuCloseTime(party: Party): Date | null {
  const closeTime = party.menu_closes_at ?? party.end_time;
  if (!closeTime) return null;

  // closeTime is "HH:MM" or "HH:MM:SS", party.date is "YYYY-MM-DD"
  const dt = new Date(`${party.date}T${closeTime}`);

  // If the closing time is before the party start (e.g. party at 23:00, closes at 03:00),
  // assume it's the next day
  const partyDate = new Date(party.date);
  if (dt.getTime() < partyDate.getTime() + 12 * 60 * 60 * 1000) {
    // If close time hour < 12, likely next day
    const hours = dt.getHours();
    if (hours < 12) {
      dt.setDate(dt.getDate() + 1);
    }
  }

  return dt;
}

type MenuStatus = "open" | "grace" | "closed";

function getMenuStatus(party: Party): MenuStatus {
  const closeTime = getMenuCloseTime(party);
  if (!closeTime) return "open"; // no closing time = always open

  const now = new Date();
  if (now < closeTime) return "open";

  // Grace period: 1 hour after close
  const graceEnd = new Date(closeTime.getTime() + 60 * 60 * 1000);
  if (now < graceEnd) return "grace";

  return "closed";
}

function MenuCloseControl({
  party,
  onUpdate,
}: {
  party: Party;
  onUpdate: (partyId: string, time: string | null) => void;
}) {
  const currentValue = party.menu_closes_at ?? "";
  const [time, setTime] = useState(currentValue);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const hasChanged = time !== currentValue;
  const fallback = party.end_time
    ? `Falls back to end time (${party.end_time.slice(0, 5)})`
    : "No auto-close set";

  function handleSave() {
    startTransition(async () => {
      await updateMenuClosesAt(party.id, time || null);
      onUpdate(party.id, time || null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleClear() {
    setTime("");
    startTransition(async () => {
      await updateMenuClosesAt(party.id, null);
      onUpdate(party.id, null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-card-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-medium text-muted mb-1">
            Menu closes at
          </label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={time}
              onChange={(e) => { setTime(e.target.value); setSaved(false); }}
              className="h-9 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-accent/50"
            />
            {hasChanged && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="h-9 rounded-lg bg-accent px-3 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {isPending ? "..." : "Save"}
              </button>
            )}
            {currentValue && !hasChanged && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isPending}
                className="h-9 rounded-lg border border-card-border px-3 text-xs font-medium text-muted transition-colors hover:text-foreground hover:border-red-500/30 disabled:opacity-50"
              >
                Clear
              </button>
            )}
            {saved && (
              <span className="text-xs text-green-400">Saved</span>
            )}
          </div>
          {!time && (
            <p className="mt-1 text-xs text-muted">{fallback}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PartyDrinkMenu({
  eventId,
  eventTitle,
  parties: initialParties,
  drinksByParty,
  canManage,
  isAuthenticated,
}: PartyDrinkMenuProps) {
  const [selectedPartyId, setSelectedPartyId] = useState(initialParties[0]?.id ?? "");
  const [parties, setParties] = useState(initialParties);

  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const partyDrinks = drinksByParty.find((d) => d.partyId === selectedPartyId);
  const availableDrinks = partyDrinks?.availableItems ?? [];
  const allItems = partyDrinks?.allItems ?? [];

  const menuStatus = useMemo(
    () => (selectedParty ? getMenuStatus(selectedParty) : "open"),
    [selectedParty]
  );

  function handleMenuCloseUpdate(partyId: string, time: string | null) {
    setParties((prev) =>
      prev.map((p) =>
        p.id === partyId ? { ...p, menu_closes_at: time } : p
      )
    );
  }

  return (
    <div>
      {/* Party selector */}
      {parties.length > 1 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {parties.map((party) => (
            <button
              key={party.id}
              type="button"
              onClick={() => setSelectedPartyId(party.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedPartyId === party.id
                  ? "bg-accent text-white"
                  : "bg-card border border-card-border text-muted hover:text-foreground"
              }`}
            >
              {party.title}
            </button>
          ))}
        </div>
      )}

      {/* Menu close time control (organizer/admin only) */}
      {canManage && selectedParty && (
        <MenuCloseControl
          key={selectedPartyId}
          party={selectedParty}
          onUpdate={handleMenuCloseUpdate}
        />
      )}

      {/* Drink menu manager (organizer/admin) */}
      {canManage && selectedPartyId && (
        <div className="mt-6">
          <DrinkMenuManager
            key={selectedPartyId}
            eventId={eventId}
            eventTitle={eventTitle}
            partyId={selectedPartyId}
            initialItems={allItems}
          />
        </div>
      )}

      {/* Menu closed / grace period banners */}
      {menuStatus === "closed" && (
        <div className="mt-6 rounded-xl border border-card-border bg-card p-6 text-center">
          <p className="text-sm text-muted">
            The drink menu is closed.
          </p>
        </div>
      )}

      {menuStatus === "grace" && (
        <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
          <p className="text-sm text-yellow-300/90">
            The menu is closed. You can still redeem purchased tokens for the next hour.
          </p>
        </div>
      )}

      {/* Drink menu for ordering (only when open) */}
      {menuStatus === "open" && (
        <>
          {availableDrinks.length > 0 ? (
            <div className="mt-6">
              <GuestDrinkMenu
                key={`guest-${selectedPartyId}`}
                eventId={eventId}
                partyId={selectedPartyId}
                drinks={availableDrinks}
                isAuthenticated={isAuthenticated}
              />
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-card-border bg-card p-6 text-center">
              <p className="text-sm text-muted">
                No drinks available{parties.length > 1 ? " for this party" : ""}.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
