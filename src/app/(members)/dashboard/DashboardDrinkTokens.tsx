"use client";

import { useState } from "react";
import Link from "next/link";
import { StaggeredList, StaggeredItem } from "@/components/motion/StaggeredList";
import { FOCUS_RING } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";
import DrinkTokenCard from "@/app/(public)/events/[slug]/DrinkTokenCard";

/**
 * A member's own drink tokens, on their own dashboard — converted by plan
 * 41.2-13.
 *
 * ── Nothing about a token's state is re-derived here ─────────────────────────
 *
 * Which tokens are active and which are completed is decided by a lifecycle
 * this component renders and does not own: the purchase path writes
 * `purchased`, the redemption action writes `redeemed`, and the expiry cron
 * writes `refunded`. **The two grouping predicates below are byte-identical
 * before and after this conversion**, as is the reduction that counts the
 * completed ones and the timestamp formatting the completed rows carry. No
 * status transition, no amount, no idempotency key and no webhook path is
 * written, read or reshaped by this file — it renders what it was handed.
 *
 * That matters more here than the class strings do. A member reads this list to
 * check that what they paid for is still there, so a token rendered into the
 * wrong group is indistinguishable, to them, from a token that is gone.
 *
 * ── What changed ─────────────────────────────────────────────────────────────
 *
 * The two group shells are the card primitive; the ink names are the declared
 * ones; the three interactive elements declare the 44px floor and the two links
 * plus the disclosure carry the imported focus expression rather than a
 * re-spelled one. The rows themselves are `DrinkTokenCard`, converted one wave
 * earlier by plan 41.2-10 as the shared money core — **read here, not opened**,
 * so that plan and this one stayed two plans.
 *
 * ── Why the disclosure did NOT take the button ladder ────────────────────────
 *
 * Its boundary was a line token on an operable control, which is finding A1's
 * exact shape, so it moved to `--control` (7.14 : 1 against 1.39 : 1) — that
 * half is not in question. The **rung** is: every size in the ladder is a pill,
 * and this is a full-width disclosure bar with a chevron that rotates. Appending
 * a container radius to a rung would depend on which of two same-property
 * utilities Tailwind emits last — the named-value ordering defect
 * `Skeleton.tsx:60-81` measured — and dropping the radius instead would make a
 * full-bleed lozenge out of a bar nobody asked to change. So it stays a raw
 * element, declares the floor itself and imports the ring. Same reasoning shape
 * as plan 41.2-07's refusal on the referral input: the primitive is adopted
 * where it fits, and where it does not the reason is written down rather than
 * the element bent.
 */

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
          <SectionHeading>My Drinks</SectionHeading>
          <StaggeredList className="space-y-3">
            {activeGroups.map((group, groupIndex) => {
              const formattedDate = group.eventDate
                ? (() => {
                    const d = new Date(group.eventDate + "T00:00:00");
                    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return `${d.getDate()} ${M[d.getMonth()]}`;
                  })()
                : "";

              // Find the original group index for handleRedeemed
              const origIndex = groups.findIndex(
                (g) => g.eventSlug === group.eventSlug && g.eventDate === group.eventDate
              );

              return (
                <StaggeredItem key={`active-${group.eventSlug}-${groupIndex}`}>
                  {/*
                    The padding is written on the two axes: the shell's own 24px
                    is emitted after a shorter value in the sheet and would win —
                    the ordering defect DrinkTokenCard.tsx:81-87 records — and
                    the density of a token grid on a phone is the caller's.
                    Written identically on the completed twin below, because the
                    two shells are deliberately the same shell.
                  */}
                  <Card className="px-4 py-4">
                    <Link
                      href={`/events/${group.eventSlug}`}
                      className={`mb-3 block min-h-11 ${FOCUS_RING}`}
                    >
                      <p className="text-sm font-semibold text-ink truncate">
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
                  </Card>
                </StaggeredItem>
              );
            })}
          </StaggeredList>
        </>
      )}

      {activeGroups.length === 0 && completedGroups.length > 0 && (
        <SectionHeading>My Drinks</SectionHeading>
      )}

      {/* Redeemed tokens (collapsible) */}
      {completedGroups.length > 0 && (
        <div className={activeGroups.length > 0 ? "mt-4" : ""}>
          {/*
            The boundary moved from a line token to the control token: this is
            an element a finger operates, and a line token reaches at most
            1.39 : 1 against WCAG 1.4.11's 3 : 1, where `--control` is 7.14 : 1
            on the page ground. That is D-41-13's triage, and the half that does
            NOT belong to the card primitive. Why it is still a raw element and
            not a ladder rung is in the docblock at the head of this file.
          */}
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            aria-expanded={showCompleted}
            className={`flex min-h-11 w-full items-center justify-between rounded-xl border border-control bg-surface px-4 py-3 text-sm text-muted hover:text-ink transition-colors ${FOCUS_RING}`}
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
                  ? (() => {
                      const d = new Date(group.eventDate + "T00:00:00");
                      const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      return `${d.getDate()} ${M[d.getMonth()]}`;
                    })()
                  : "";

                const origIndex = groups.findIndex(
                  (g) => g.eventSlug === group.eventSlug && g.eventDate === group.eventDate
                );

                return (
                  <Card
                    key={`completed-${group.eventSlug}-${groupIndex}`}
                    className="px-4 py-4"
                  >
                    <Link
                      href={`/events/${group.eventSlug}`}
                      className={`mb-3 block min-h-11 ${FOCUS_RING}`}
                    >
                      <p className="text-sm font-semibold text-ink truncate">
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
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
