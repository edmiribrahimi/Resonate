"use client";

import { useState } from "react";
import Link from "next/link";
import { StaggeredList, StaggeredItem } from "@/components/motion/StaggeredList";
import DrinkTokenCard from "@/app/(public)/events/[slug]/DrinkTokenCard";

interface TokenData {
  id: string;
  drink_name: string;
  price: number;
  token: string;
  status: "purchased" | "redeemed" | "refunded";
  created_at?: string;
  redeemed_at: string | null;
  refunded_at?: string | null;
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
  const [showCompleted, setShowCompleted] = useState(false);

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

  // Split groups into active (purchased) and completed (redeemed + refunded)
  const activeGroups: typeof groups = [];
  const completedGroups: typeof groups = [];

  for (const group of groups) {
    const purchased = group.tokens.filter((t) => t.status === "purchased");
    const completed = group.tokens.filter(
      (t) => t.status === "redeemed" || t.status === "refunded"
    );

    if (purchased.length > 0) {
      activeGroups.push({ ...group, tokens: purchased });
    }
    if (completed.length > 0) {
      completedGroups.push({ ...group, tokens: completed });
    }
  }

  const totalCompleted = completedGroups.reduce((sum, g) => sum + g.tokens.length, 0);

  return (
    <div>
      {/* Active tokens */}
      {activeGroups.length > 0 && (
        <>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            My Drinks
          </p>
          <StaggeredList className="space-y-3">
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
                <StaggeredItem
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
                </StaggeredItem>
              );
            })}
          </StaggeredList>
        </>
      )}

      {activeGroups.length === 0 && completedGroups.length > 0 && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          My Drinks
        </p>
      )}

      {/* Redeemed tokens (collapsible) */}
      {completedGroups.length > 0 && (
        <div className={activeGroups.length > 0 ? "mt-4" : ""}>
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex w-full items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3 text-sm text-muted hover:text-foreground transition-colors"
          >
            <span>
              Completed ({totalCompleted})
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
              className={`transition-transform ${showCompleted ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showCompleted && (
            <div className="mt-3 space-y-3">
              {completedGroups.map((group, groupIndex) => {
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
                    key={`completed-${group.eventSlug}-${groupIndex}`}
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
