"use client";

import { useState } from "react";
import type { DrinkItem } from "@/types/database";
import GuestDrinkMenu from "./GuestDrinkMenu";
import DrinkMenuManager from "@/app/(organizer)/organizer/events/[id]/drinks/DrinkMenuManager";

interface Party {
  id: string;
  title: string;
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
  savedCards?: { token: string; last4: string; cardType: string }[];
}

export default function PartyDrinkMenu({
  eventId,
  eventTitle,
  parties,
  drinksByParty,
  canManage,
  isAuthenticated,
  savedCards,
}: PartyDrinkMenuProps) {
  const [selectedPartyId, setSelectedPartyId] = useState(parties[0]?.id ?? "");

  const partyDrinks = drinksByParty.find((d) => d.partyId === selectedPartyId);
  const availableDrinks = partyDrinks?.availableItems ?? [];
  const allItems = partyDrinks?.allItems ?? [];

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

      {/* Drink menu for ordering */}
      {availableDrinks.length > 0 ? (
        <div className="mt-6">
          <GuestDrinkMenu
            key={`guest-${selectedPartyId}`}
            eventId={eventId}
            partyId={selectedPartyId}
            drinks={availableDrinks}
            isAuthenticated={isAuthenticated}
            savedCards={savedCards}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-card-border bg-card p-6 text-center">
          <p className="text-sm text-muted">
            No drinks available{parties.length > 1 ? " for this party" : ""}.
          </p>
        </div>
      )}
    </div>
  );
}
