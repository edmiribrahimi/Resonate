"use client";

import { useState } from "react";
import DrinkTokenCard from "./DrinkTokenCard";
import type { DrinkTokenStatus } from "@/types/database";

interface MyDrinksProps {
  tokens: {
    id: string;
    drink_name: string;
    price: number;
    token: string;
    status: DrinkTokenStatus;
    redeemed_at: string | null;
  }[];
}

export default function MyDrinks({ tokens: initialTokens }: MyDrinksProps) {
  const [tokens, setTokens] = useState(initialTokens);

  function handleRedeemed(tokenId: string) {
    setTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId
          ? { ...t, status: "redeemed" as const, redeemed_at: new Date().toISOString() }
          : t
      )
    );
  }

  function handleActivated(tokenId: string) {
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, status: "active" as const } : t))
    );
  }

  function handleCancelled(tokenId: string) {
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, status: "purchased" as const } : t))
    );
  }

  // Active first (mid-redemption), then purchased, then refunded, then redeemed
  const order: Record<DrinkTokenStatus, number> = {
    active: 0,
    purchased: 1,
    refunded: 2,
    redeemed: 3,
  };
  const sorted = [...tokens].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
        My Drinks
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((token) => (
          <DrinkTokenCard
            key={token.id}
            token={token}
            onRedeemed={handleRedeemed}
            onActivated={handleActivated}
            onCancelled={handleCancelled}
          />
        ))}
      </div>
    </div>
  );
}
