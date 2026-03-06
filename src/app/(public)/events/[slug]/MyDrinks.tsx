"use client";

import { useState } from "react";
import DrinkTokenCard from "./DrinkTokenCard";

interface MyDrinksProps {
  tokens: {
    id: string;
    drink_name: string;
    price: number;
    token: string;
    status: "purchased" | "redeemed";
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

  // Sort: unredeemed first, redeemed last
  const sorted = [...tokens].sort((a, b) => {
    if (a.status === "purchased" && b.status === "redeemed") return -1;
    if (a.status === "redeemed" && b.status === "purchased") return 1;
    return 0;
  });

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
          />
        ))}
      </div>
    </div>
  );
}
