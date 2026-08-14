"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/ui/Typography";
import DrinkTokenCard from "./DrinkTokenCard";
import type { DrinkTokenStatus } from "@/types/database";

/**
 * What a member has already paid for, listed.
 *
 * ── This file had one conversion, and the measurement is the whole task ──────
 *
 * The pattern map lists this file against the card shell as an exact match. Read
 * at its render site there is **no card here**: it is a heading and a grid, and
 * the card is `DrinkTokenCard`, which plan 41.2-10 converted one wave earlier as
 * spine. Re-measured with the gates' own matchers over comment-stripped source,
 * this file carried **zero** raw palette utilities and **zero** legacy token
 * utilities before this diff — wave 0's per-file census agrees, since the file
 * appears on neither of its two lists.
 *
 * So the one thing here was the section heading, which was one of the ten
 * spellings the type contract replaced. Nothing else was opened, and saying so
 * with two numbers is the substance rather than a footnote — the same treatment
 * the provider mount got in wave 5.
 *
 * ── The token card is mounted, not opened ────────────────────────────────────
 *
 * Its mount and all five props it is given are byte-identical either side of
 * this diff. Nothing about a token's state is decided here: the three handlers
 * below mirror onto local state a transition the server action already made, so
 * that a card does not have to wait for a round trip to stop looking unchanged.
 * No status transition, no amount, no idempotency key and no webhook path is
 * written, read or reshaped by this file.
 */

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
      <SectionHeading>My Drinks</SectionHeading>
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
