"use client";

import { useState } from "react";
import Link from "next/link";
import DrinkTokenCard from "@/app/(public)/events/[slug]/DrinkTokenCard";

interface TokenData {
  id: string;
  drink_name: string;
  price: number;
  token: string;
  status: "purchased" | "redeemed";
  created_at?: string;
  redeemed_at: string | null;
}

interface DashboardDrinkTokensProps {
  groups: {
    eventTitle: string;
    eventSlug: string;
    eventDate: string;
    tokens: TokenData[];
  }[];
}

export default function DashboardDrinkTokens({
  groups: initialGroups,
}: DashboardDrinkTokensProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [showRedeemed, setShowRedeemed] = useState(false);

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

  // Split groups into active (has purchased tokens) and redeemed-only
  const activeGroups: typeof groups = [];
  const redeemedGroups: typeof groups = [];

  for (const group of groups) {
    const purchased = group.tokens.filter((t) => t.status === "purchased");
    const redeemed = group.tokens.filter((t) => t.status === "redeemed");

    if (purchased.length > 0) {
      activeGroups.push({ ...group, tokens: purchased });
    }
    if (redeemed.length > 0) {
      redeemedGroups.push({ ...group, tokens: redeemed });
    }
  }

  const totalRedeemed = redeemedGroups.reduce((sum, g) => sum + g.tokens.length, 0);

  return (
    <div>
      {/* Active tokens */}
      {activeGroups.length > 0 && (
        <>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            My Drinks
          </p>
          <div className="space-y-3">
            {activeGroups.map((group, groupIndex) => {
              const formattedDate = group.eventDate
                ? new Date(group.eventDate + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "";

              // Find the original group index for handleRedeemed
              const origIndex = groups.findIndex(
                (g) => g.eventSlug === group.eventSlug && g.eventDate === group.eventDate
              );

              return (
                <div
                  key={`active-${group.eventSlug}-${groupIndex}`}
                  className="rounded-2xl border border-card-border bg-card p-4"
                >
                  <Link href={`/events/${group.eventSlug}`} className="mb-3 block">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {group.eventTitle}
                    </p>
                    {formattedDate && (
                      <p className="text-xs text-muted">{formattedDate}</p>
                    )}
                  </Link>
                  <div className="grid grid-cols-2 gap-3">
                    {group.tokens.map((token) => (
                      <DrinkTokenCard
                        key={token.id}
                        token={token}
                        onRedeemed={(tokenId) => handleRedeemed(origIndex, tokenId)}
                        showTimestamps
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeGroups.length === 0 && redeemedGroups.length > 0 && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          My Drinks
        </p>
      )}

      {/* Redeemed tokens (collapsible) */}
      {redeemedGroups.length > 0 && (
        <div className={activeGroups.length > 0 ? "mt-4" : ""}>
          <button
            type="button"
            onClick={() => setShowRedeemed(!showRedeemed)}
            className="flex w-full items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3 text-sm text-muted hover:text-foreground transition-colors"
          >
            <span>
              Redeemed ({totalRedeemed})
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${showRedeemed ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showRedeemed && (
            <div className="mt-3 space-y-3">
              {redeemedGroups.map((group, groupIndex) => {
                const formattedDate = group.eventDate
                  ? new Date(group.eventDate + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "";

                const origIndex = groups.findIndex(
                  (g) => g.eventSlug === group.eventSlug && g.eventDate === group.eventDate
                );

                return (
                  <div
                    key={`redeemed-${group.eventSlug}-${groupIndex}`}
                    className="rounded-2xl border border-card-border bg-card p-4"
                  >
                    <Link href={`/events/${group.eventSlug}`} className="mb-3 block">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {group.eventTitle}
                      </p>
                      {formattedDate && (
                        <p className="text-xs text-muted">{formattedDate}</p>
                      )}
                    </Link>
                    <div className="grid grid-cols-2 gap-3">
                      {group.tokens.map((token) => (
                        <DrinkTokenCard
                          key={token.id}
                          token={token}
                          onRedeemed={(tokenId) => handleRedeemed(origIndex, tokenId)}
                          showTimestamps
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
