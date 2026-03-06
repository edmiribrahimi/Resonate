"use client";

import { useState } from "react";
import Link from "next/link";
import DrinkTokenCard from "@/app/(public)/events/[slug]/DrinkTokenCard";

interface DashboardDrinkTokensProps {
  groups: {
    eventTitle: string;
    eventSlug: string;
    eventDate: string;
    tokens: {
      id: string;
      drink_name: string;
      price: number;
      token: string;
      status: "purchased" | "redeemed";
      redeemed_at: string | null;
    }[];
  }[];
}

export default function DashboardDrinkTokens({
  groups: initialGroups,
}: DashboardDrinkTokensProps) {
  const [groups, setGroups] = useState(initialGroups);

  function handleRedeemed(groupIndex: number, tokenId: string) {
    setGroups((prev) =>
      prev.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              tokens: group.tokens.map((t) =>
                t.id === tokenId
                  ? { ...t, status: "redeemed" as const, redeemed_at: new Date().toISOString() }
                  : t
              ),
            }
          : group
      )
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
        My Drinks
      </p>
      <div className="space-y-3">
        {groups.map((group, groupIndex) => {
          // Sort tokens: unredeemed first, redeemed last
          const sorted = [...group.tokens].sort((a, b) => {
            if (a.status === "purchased" && b.status === "redeemed") return -1;
            if (a.status === "redeemed" && b.status === "purchased") return 1;
            return 0;
          });

          const formattedDate = group.eventDate
            ? new Date(group.eventDate + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "";

          return (
            <div
              key={`${group.eventSlug}-${groupIndex}`}
              className="rounded-2xl border border-card-border bg-card p-4"
            >
              <Link
                href={`/events/${group.eventSlug}`}
                className="mb-3 block"
              >
                <p className="text-sm font-semibold text-foreground truncate">
                  {group.eventTitle}
                </p>
                {formattedDate && (
                  <p className="text-xs text-muted">{formattedDate}</p>
                )}
              </Link>
              <div className="grid grid-cols-2 gap-3">
                {sorted.map((token) => (
                  <DrinkTokenCard
                    key={token.id}
                    token={token}
                    onRedeemed={(tokenId) =>
                      handleRedeemed(groupIndex, tokenId)
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
