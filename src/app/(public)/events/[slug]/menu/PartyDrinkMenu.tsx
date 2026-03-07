"use client";

import { useState, useMemo } from "react";
import type { DrinkItem } from "@/types/database";
import GuestDrinkMenu from "./GuestDrinkMenu";
import DrinkMenuManager from "@/app/(organizer)/organizer/events/[id]/drinks/DrinkMenuManager";

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

export default function PartyDrinkMenu({
  eventId,
  eventTitle,
  parties,
  drinksByParty,
  canManage,
  isAuthenticated,
}: PartyDrinkMenuProps) {
  const [selectedPartyId, setSelectedPartyId] = useState(parties[0]?.id ?? "");

  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const partyDrinks = drinksByParty.find((d) => d.partyId === selectedPartyId);
  const availableDrinks = partyDrinks?.availableItems ?? [];
  const allItems = partyDrinks?.allItems ?? [];

  const menuStatus = useMemo(
    () => (selectedParty ? getMenuStatus(selectedParty) : "open"),
    [selectedParty]
  );

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
