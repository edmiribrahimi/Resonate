"use client";

import { useState } from "react";
import DrinkTokenCard from "../DrinkTokenCard";

interface TokenData {
  id: string;
  drink_name: string;
  price: number;
  token: string;
  status: "purchased" | "redeemed";
  redeemed_at: string | null;
}

interface UserTokenDisplayProps {
  tokens: TokenData[];
}

export default function UserTokenDisplay({ tokens: initial }: UserTokenDisplayProps) {
  const [tokens, setTokens] = useState(initial);

  if (tokens.length === 0) return null;

  function handleRedeemed(tokenId: string) {
    setTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId
          ? { ...t, status: "redeemed" as const, redeemed_at: new Date().toISOString() }
          : t
      )
    );
  }

  const sorted = [...tokens].sort((a, b) => {
    if (a.status === "purchased" && b.status === "redeemed") return -1;
    if (a.status === "redeemed" && b.status === "purchased") return 1;
    return 0;
  });

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
        Your Drinks
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
