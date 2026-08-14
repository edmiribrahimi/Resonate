"use client";

import { useState } from "react";

import PressableCard from "@/components/motion/PressableCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";

import RedeemConfirmationModal from "./RedeemConfirmationModal";

/**
 * One drink token, in the four states it can be in.
 *
 * ── Nothing about a token's state is re-derived here ─────────────────────────
 *
 * Whether a token is purchased, active, redeemed or refunded is decided by the
 * server action and the payment webhook, and this file only branches on what it
 * was handed. No status is computed, no amount is arithmetic, and the price
 * formatter is the one that was here, character for character. The four
 * callbacks are passed through unchanged.
 *
 * ── The confirmation stays mounted only while it is open ─────────────────────
 *
 * A guest with eight tokens renders eight of these. A confirmation mounted per
 * card would be eight panels in the DOM, of which seven are closed — so the
 * conditional below is a **property**, not a formatting choice, and it is the
 * one `RefundActions.tsx:51-53` states for the same reason on the work side.
 *
 * ── Two hues lost, and the loss is the decision ──────────────────────────────
 *
 * The completed states carried a green tick and a blue word. Both become the
 * neutral badge: D-41.1-25 refuses a tone per outcome, and the tick becomes the
 * word its own `aria-label` already carried — so nothing a screen reader hears
 * changed, and a sighted reader now reads what a screen reader was already
 * being told.
 *
 * ── The pulse is kept, and it is NOT a placeholder ───────────────────────────
 *
 * The pulse on an active token is an attention mark on live content: it says
 * *this one is waiting at the bar*. It is not a loading skeleton, it carries
 * none of the placeholder's signature, and no gate reads it — measured. Swapping
 * it for the line primitive would have replaced a live card with a grey bar.
 */

interface DrinkTokenCardProps {
  token: {
    id: string;
    drink_name: string;
    price: number;
    token: string;
    status: "purchased" | "active" | "redeemed" | "refunded";
    created_at?: string;
    redeemed_at: string | null;
    refunded_at?: string | null;
  };
  onRedeemed: (tokenId: string) => void;
  onActivated?: (tokenId: string) => void;
  onCancelled?: (tokenId: string) => void;
  showTimestamps?: boolean;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default function DrinkTokenCard({ token, onRedeemed, onActivated, onCancelled, showTimestamps }: DrinkTokenCardProps) {
  const [showModal, setShowModal] = useState(false);

  if (token.status === "redeemed") {
    return (
      /*
        The padding is written on the two axes rather than as one value: the
        shell's own `p-6` is emitted AFTER a shorter `p-4` in the sheet and
        would win, which is the named-value ordering defect `Skeleton.tsx:60-81`
        records. The density of a list of tokens on a phone is the caller's, so
        it is spelled in a family the shell does not set.
      */
      <Card className="px-4 py-4 opacity-60">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">
              {token.drink_name}
            </p>
            <p className="mt-0.5 text-xs text-ink-2">
              {formatPrice(token.price)}
            </p>
          </div>
          <Badge className="shrink-0">Redeemed</Badge>
        </div>
        {showTimestamps && (
          <div className="mt-2 space-y-0.5">
            {token.created_at && (
              <p className="text-xs text-ink-2">
                Purchased: {formatTime(token.created_at)}
              </p>
            )}
            {token.redeemed_at && (
              <p className="text-xs text-ink-2">
                Redeemed: {formatTime(token.redeemed_at)}
              </p>
            )}
          </div>
        )}
      </Card>
    );
  }

  if (token.status === "refunded") {
    return (
      <Card className="px-4 py-4 opacity-60">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">
              {token.drink_name}
            </p>
            <p className="mt-0.5 text-xs text-ink-2">
              {formatPrice(token.price)}
            </p>
          </div>
          <Badge className="shrink-0">Refunded</Badge>
        </div>
        {showTimestamps && (
          <div className="mt-2 space-y-0.5">
            {token.created_at && (
              <p className="text-xs text-ink-2">
                Purchased: {formatTime(token.created_at)}
              </p>
            )}
            {token.refunded_at && (
              <p className="text-xs text-ink-2">
                Refunded: {formatTime(token.refunded_at)}
              </p>
            )}
          </div>
        )}
      </Card>
    );
  }

  const isActive = token.status === "active";

  return (
    <>
      <PressableCard
        className={`rounded-xl border p-4 ${
          isActive
            ? "border-accent bg-accent/10 animate-pulse"
            : "border-accent/30 bg-gradient-to-br from-surface to-accent/5"
        }`}
      >
        <p className="text-sm font-medium text-ink truncate">
          {token.drink_name}
        </p>
        <p className="mt-0.5 text-sm text-accent font-semibold">
          {formatPrice(token.price)}
        </p>
        {showTimestamps && token.created_at && (
          <p className="mt-1 text-xs text-ink-2">
            Purchased: {formatTime(token.created_at)}
          </p>
        )}
        <Button className="mt-3 w-full" onClick={() => setShowModal(true)}>
          {isActive ? "Active — tap to serve" : "Redeem"}
        </Button>
      </PressableCard>

      {/* Mounted only while open — see the docblock. */}
      {showModal && (
        <RedeemConfirmationModal
          drinkName={token.drink_name}
          signedToken={token.token}
          initialActive={isActive}
          onClose={() => setShowModal(false)}
          onActivated={() => onActivated?.(token.id)}
          onCancelled={() => onCancelled?.(token.id)}
          onRedeemed={() => {
            onRedeemed(token.id);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
