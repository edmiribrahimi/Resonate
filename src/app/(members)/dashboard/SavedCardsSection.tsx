"use client";

import { useState, useTransition } from "react";
import { deleteSavedCard } from "./actions";

interface SavedCardsSectionProps {
  initialCards: { token: string; last4: string; cardType: string }[];
}

export default function SavedCardsSection({ initialCards }: SavedCardsSectionProps) {
  const [cards, setCards] = useState(initialCards);
  const [deletingToken, setDeletingToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (cards.length === 0) {
    return null;
  }

  function handleDelete(token: string) {
    setDeletingToken(token);
    // Optimistic removal
    setCards((prev) => prev.filter((c) => c.token !== token));

    startTransition(async () => {
      try {
        await deleteSavedCard(token);
      } catch {
        // Revert on failure
        setCards(initialCards);
      } finally {
        setDeletingToken(null);
      }
    });
  }

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
        Saved Cards
      </p>
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <div
            key={card.token}
            className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-4"
          >
            <span className="text-sm font-medium text-foreground">
              {card.cardType} **** {card.last4}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(card.token)}
              disabled={isPending && deletingToken === card.token}
              className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {isPending && deletingToken === card.token ? "Removing..." : "Remove"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
