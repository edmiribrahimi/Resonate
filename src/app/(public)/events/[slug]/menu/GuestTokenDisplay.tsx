"use client";

import {
  useEffect,
  useState,
  useCallback,
  useTransition,
  useRef,
} from "react";

import PressableCard from "@/components/motion/PressableCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { SectionHeading } from "@/components/ui/Typography";
import { formatDateTimeNoYear } from "@/utils/formatTime";

import { redeemDrinkTokenGuest } from "./actions";

/**
 * The drinks a guest bought without an account, and the panel they hold up at
 * the bar to have one poured.
 *
 * ── A guest's proof of purchase lives in THEIR browser, and none of it moved ──
 *
 * For a person with no account, the entry under `resonate_drink_tokens_<event>`
 * **is the receipt** — nothing else in this product knows the purchase happened
 * on this device. So the key's construction, the write, the read and the poll
 * are the lines this conversion had least reason to touch and the most reason to
 * prove untouched: a changed key is a wiped wallet for every guest who already
 * has one, with no error anywhere, in a repository that has **no error
 * tracking**. All four are byte-identical, quoted before and after in this
 * plan's SUMMARY.
 *
 * ── The three silent failures below are RECORDED, not repaired ───────────────
 *
 * The `catch` on the write swallows every cause. The `catch` on the read returns
 * the empty list — which is also the legitimate answer for *this browser bought
 * nothing*, so a storage failure and an empty wallet are indistinguishable to
 * every caller and therefore to the guest. And a token fetch that cannot answer
 * returns the same unknown status as one that is merely on its way, forever,
 * every three seconds.
 *
 * Each carries an entry at `file:line` in this phase's `deferred-items.md`,
 * written in wave 0, routed to a plan that owns what a buyer is told when a
 * purchase fails. **Improving one here would be a behaviour change on the money
 * path under a visual mandate.** The standing cost is stated rather than elided:
 * with no error tracking, each of these reaches a human only when a guest tells
 * somebody at the bar.
 *
 * ── ONE of the three screens converted, and the other two DELIBERATELY NOT ───
 *
 * The plan for this file modelled a single shell at the foot of it. Measured, it
 * carries **three** overlays, exactly as its twin
 * `../RedeemConfirmationModal.tsx` does — the guest's confirmation, and two
 * full-bleed screens that are operated **by the bartender, on the guest's
 * phone**. Only the first is converted.
 *
 * The other two are refused, and the reason is this file's own, one screen
 * below: the serve area *"takes the whole screen above the Cancel row"*. Inside
 * the primitive it becomes a `md`-width panel body — the bartender has to aim —
 * and the narrow Cancel becomes a full-width control in the actions region,
 * directly under the thumb. Reverting an active token at a counter with a queue
 * in front of it is the guard being loosened, not tightened, which is the exact
 * inverse of what a money conversion is allowed to do. D-41.2-06 took this
 * decision for the twin; it is **not inherited** here — an exemption is granted
 * per file or it becomes a way to make a list empty — so this file states its
 * own argument and stays legible to the dialog gate rather than being rewritten
 * into a shape the matcher cannot see.
 *
 * Their **inks** are converted, since a token substitution moves no geometry.
 * Their **shells** are not.
 *
 * ── The two pulses are attention marks, not placeholders ─────────────────────
 *
 * Both say *this one is waiting at the bar* on live content. Neither carries the
 * placeholder signature, and no gate reads them — measured. Swapping either for
 * the line primitive would tell a guest their paid drink was still loading.
 * Consistent with the same two sites on the other side of the fork.
 *
 * ── Focus: before, nothing. After, the close control ─────────────────────────
 *
 * No `data-initial-focus` marker is declared, and that is a decision. The
 * confirmation holds exactly one affirmative answer and the close control, and
 * the close control is first in the DOM and least destructive by construction
 * (`Dialog.tsx:117-147`). Declaring a marker would have meant adding a Cancel
 * control — a new user-visible word on a money confirmation. Enter therefore
 * closes; it never confirms.
 *
 * ── The money path is untouched ──────────────────────────────────────────────
 *
 * One server action is called from here, three times, and all three calls carry
 * the same two arguments in the same order as before: the signed token and the
 * verb. No status transition, no amount, no idempotency key and no webhook path
 * is written, read or reshaped by this file. The action module was **read** so
 * that a rendering change could be told from a payload change, and it was not
 * edited.
 */

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = "resonate_drink_tokens";

function storeGuestOrder(eventId: string, orderId: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
    const existing = JSON.parse(
      localStorage.getItem(key) || "[]"
    ) as string[];
    if (!existing.includes(orderId)) {
      existing.push(orderId);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch {
    /* localStorage unavailable */
  }
}

function getGuestOrderIds(eventId: string): string[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
    return JSON.parse(localStorage.getItem(key) || "[]") as string[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenData {
  id: string;
  drink_name: string;
  price: number;
  token: string;
  status: "purchased" | "active" | "redeemed" | "refunded";
  redeemed_at: string | null;
  refunded_at?: string | null;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

// ---------------------------------------------------------------------------
// GuestRedeemConfirmationModal — fork of RedeemConfirmationModal
// Uses redeemDrinkTokenGuest instead of redeemDrinkToken
// Two-step flow: customer activates -> bartender finalizes (or customer cancels)
// ---------------------------------------------------------------------------

type Phase = "confirm" | "activating" | "active" | "serving" | "served" | "cancelling";

function GuestRedeemConfirmationModal({
  drinkName,
  signedToken,
  initialActive = false,
  onClose,
  onActivated,
  onRedeemed,
  onCancelled,
}: {
  drinkName: string;
  signedToken: string;
  initialActive?: boolean;
  onClose: () => void;
  onActivated?: () => void;
  onRedeemed: () => void;
  onCancelled?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(initialActive ? "active" : "confirm");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const servedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "served") return;
    servedTimerRef.current = setTimeout(() => {
      onRedeemed();
      onClose();
    }, 3000);
    return () => {
      if (servedTimerRef.current) clearTimeout(servedTimerRef.current);
    };
  }, [phase, onRedeemed, onClose]);

  const handleActivate = useCallback(() => {
    setError(null);
    setPhase("activating");
    startTransition(async () => {
      try {
        await redeemDrinkTokenGuest(signedToken, "activate");
        setPhase("active");
        onActivated?.();
      } catch (err) {
        setPhase("confirm");
        setError(err instanceof Error ? err.message : "Activation failed.");
      }
    });
  }, [signedToken, startTransition, onActivated]);

  const handleServe = useCallback(() => {
    setError(null);
    setPhase("serving");
    startTransition(async () => {
      try {
        await redeemDrinkTokenGuest(signedToken, "serve");
        setPhase("served");
      } catch (err) {
        setPhase("active");
        setError(err instanceof Error ? err.message : "Redemption failed.");
      }
    });
  }, [signedToken, startTransition]);

  const handleCancel = useCallback(() => {
    setError(null);
    setPhase("cancelling");
    startTransition(async () => {
      try {
        await redeemDrinkTokenGuest(signedToken, "cancel");
        onCancelled?.();
        onClose();
      } catch (err) {
        setPhase("active");
        setError(err instanceof Error ? err.message : "Cancellation failed.");
      }
    });
  }, [signedToken, startTransition, onCancelled, onClose]);

  const handleServedTap = useCallback(() => {
    if (servedTimerRef.current) clearTimeout(servedTimerRef.current);
    onRedeemed();
    onClose();
  }, [onRedeemed, onClose]);

  /**
   * Every route out of the confirmation runs through here — the close control,
   * Escape, and the platform's own close event — so none of them can leave a
   * stale refusal behind. The caller unmounts this panel as well, but the rule
   * holds here rather than depending on that.
   */
  const closeConfirm = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  if (phase === "served") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-ground/95 backdrop-blur-md"
        onClick={handleServedTap}
      >
        <div className="text-center">
          <p
            className="text-6xl font-bold text-accent"
            style={{ animation: "servedScale 400ms ease-out forwards" }}
          >
            SERVED
          </p>
          <p className="mt-4 text-lg text-ink-2">{drinkName}</p>
        </div>
        <style>{`
          @keyframes servedScale {
            from { transform: scale(0.5); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Active screen — full-bleed tap target so the bartender doesn't have to aim
  if (phase === "active" || phase === "serving" || phase === "cancelling") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-ground/95 backdrop-blur-md">
        {/* Big tap-to-serve area: takes the whole screen above the Cancel row */}
        <button
          type="button"
          onClick={handleServe}
          disabled={isPending}
          className="flex flex-1 flex-col items-center justify-center px-6 text-center transition-colors active:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-accent animate-pulse">
            {phase === "serving" ? "Serving..." : "Tap anywhere to serve"}
          </p>
          {/*
            The step moves to the phase's own boundary and is not deleted: the
            drink name is what a bartender reads at a glance in a dark room, and
            one size for every width would have decided that by default. It was
            written at a second breakpoint this contract does not use, which is
            the only thing that changed — the same disposition the other half of
            this fork took one wave earlier, deliberately matched.
          */}
          <p className="mt-4 text-4xl md:text-5xl font-bold text-ink">
            {drinkName}
          </p>
          <p className="mt-2 text-sm text-ink-2">Active — awaiting service</p>
          {/*
            Announced rather than merely printed. It was a tinted box that said
            nothing to anyone not looking at it, and there is no error tracking
            behind it to notice either.
          */}
          {error && (
            <span role="alert" className="mt-6 text-sm text-sem-crit">
              {error}
            </span>
          )}
          <p className="mt-12 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-ground">
            {phase === "serving" ? "Serving..." : "Mark as served"}
          </p>
        </button>

        {/* Cancel row, kept narrow so the bartender's tap can't hit it by mistake */}
        <div className="px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="mx-auto block rounded-full border border-control bg-transparent px-6 py-2 text-xs font-medium text-ink-2 transition-colors hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "cancelling" ? "Cancelling..." : "Cancel"}
          </button>
        </div>
      </div>
    );
  }

  // Initial confirm (or activating)
  return (
    <Dialog
      open
      onClose={closeConfirm}
      title="Redeem Drink"
      status={error ? { tone: "crit", message: error } : null}
      actions={
        <Button
          className="w-full"
          onClick={handleActivate}
          disabled={isPending}
        >
          {phase === "activating" ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Activating...
            </span>
          ) : (
            "Confirm"
          )}
        </Button>
      }
    >
      <p className="text-center text-xl font-semibold text-ink">{drinkName}</p>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// GuestDrinkTokenCard — fork of DrinkTokenCard using guest redeem modal
// ---------------------------------------------------------------------------

function GuestDrinkTokenCard({
  token,
  onRedeemed,
  onActivated,
  onCancelled,
}: {
  token: TokenData;
  onRedeemed: (tokenId: string) => void;
  onActivated?: (tokenId: string) => void;
  onCancelled?: (tokenId: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);

  if (token.status === "redeemed") {
    return (
      /*
        The padding is written on the two axes rather than as one value: the
        shell's own `p-6` is emitted AFTER a shorter `p-4` in the sheet and would
        win, which is the named-value ordering defect `Skeleton.tsx:60-81`
        records. The density of a two-column grid of tokens on a phone is the
        caller's, so it is spelled in a family the shell does not set.
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
          {/*
            The tick carried `aria-label="Redeemed"`, so a screen reader was
            already being told the word. It is now the badge's own text: nothing
            a screen reader hears changed, a sighted reader reads what a screen
            reader was already given, and the raw hue goes — D-41.1-25 refuses a
            tone per outcome. The other half of this fork made the same move on
            the same component one wave earlier.
          */}
          <Badge className="shrink-0">Redeemed</Badge>
        </div>
        <p className="mt-2 text-xs text-ink-2">
          {token.redeemed_at
            ? `Redeemed at ${formatDateTimeNoYear(token.redeemed_at)}`
            : "Already redeemed"}
        </p>
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
        <p className="mt-2 text-xs text-ink-2">Automatically refunded</p>
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
        <Button className="mt-3 w-full" onClick={() => setShowModal(true)}>
          {isActive ? "Active — tap to serve" : "Redeem"}
        </Button>
      </PressableCard>

      {/* Mounted only while open — one panel, not one per card. */}
      {showModal && (
        <GuestRedeemConfirmationModal
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

// ---------------------------------------------------------------------------
// GuestTokenDisplay — main export
// ---------------------------------------------------------------------------

interface GuestTokenDisplayProps {
  eventId: string;
  initialOrderId: string | null;
}

export default function GuestTokenDisplay({
  eventId,
  initialOrderId,
}: GuestTokenDisplayProps) {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTokensForOrders = useCallback(
    async (orderIds: string[]): Promise<TokenData[]> => {
      const results = await Promise.all(
        orderIds.map(async (oid) => {
          try {
            const res = await fetch(`/api/drinks/tokens?order_id=${oid}`);
            if (!res.ok) return { tokens: [], orderStatus: "unknown" };
            return (await res.json()) as {
              tokens: TokenData[];
              orderStatus: string;
            };
          } catch {
            return { tokens: [] as TokenData[], orderStatus: "unknown" };
          }
        })
      );
      return results.flatMap((r) => r.tokens);
    },
    []
  );

  // Initial load
  useEffect(() => {
    const orderIds = new Set<string>();

    // From URL param
    if (initialOrderId) {
      orderIds.add(initialOrderId);
      storeGuestOrder(eventId, initialOrderId);
    }

    // From localStorage
    for (const id of getGuestOrderIds(eventId)) {
      orderIds.add(id);
    }

    if (orderIds.size === 0) {
      setLoading(false);
      return;
    }

    fetchTokensForOrders([...orderIds]).then((t) => {
      setTokens(t);
      setLoading(false);
    });
  }, [eventId, initialOrderId, fetchTokensForOrders]);

  // Listen for new orders from GuestDrinkMenu
  useEffect(() => {
    function handleNewOrder(e: Event) {
      const customEvent = e as CustomEvent<{ orderId: string }>;
      const { orderId } = customEvent.detail;

      storeGuestOrder(eventId, orderId);

      // Start polling for the new order's tokens
      pollCountRef.current = 0;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = setInterval(async () => {
        pollCountRef.current += 1;

        try {
          const res = await fetch(`/api/drinks/tokens?order_id=${orderId}`);
          if (!res.ok) return;
          const data = (await res.json()) as {
            tokens: TokenData[];
            orderStatus: string;
          };

          if (data.tokens.length > 0) {
            setTokens((prev) => {
              const existingIds = new Set(prev.map((t) => t.id));
              const newTokens = data.tokens.filter(
                (t) => !existingIds.has(t.id)
              );
              return [...prev, ...newTokens];
            });
          }

          // Stop polling when order is completed or max retries reached
          if (data.orderStatus === "completed" || pollCountRef.current >= 10) {
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
          }
        } catch {
          // keep polling
        }
      }, 3000);
    }

    window.addEventListener("guestOrderComplete", handleNewOrder);
    return () => {
      window.removeEventListener("guestOrderComplete", handleNewOrder);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [eventId]);

  function handleRedeemed(tokenId: string) {
    setTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId
          ? {
              ...t,
              status: "redeemed" as const,
              redeemed_at: new Date().toISOString(),
            }
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

  // Sort: active first (the one being served right now), then purchased, then refunded, then redeemed
  const statusOrder = { active: 0, purchased: 1, refunded: 2, redeemed: 3 };
  const sorted = [...tokens].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status]
  );

  // Don't render anything if no tokens and not loading
  if (!loading && tokens.length === 0) {
    return null;
  }

  return (
    <div>
      <SectionHeading className="mb-3">Your Drinks</SectionHeading>
      {loading ? (
        /*
          The sentence stays, and the line primitive does not arrive here. A
          skeleton grid needs a literal count, and on this surface the count is
          the number of drinks somebody has already paid for — showing two grey
          cards to a guest who bought five is a lie in the one direction this
          path must never lie in. A sentence claims nothing about how many.
        */
        <div className="text-center py-8">
          <p className="text-sm text-ink-2">Loading your drinks...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sorted.map((token) => (
            <GuestDrinkTokenCard
              key={token.id}
              token={token}
              onRedeemed={handleRedeemed}
              onActivated={handleActivated}
              onCancelled={handleCancelled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
