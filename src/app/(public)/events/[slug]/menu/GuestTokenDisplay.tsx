"use client";

import {
  useEffect,
  useState,
  useCallback,
  useTransition,
  useRef,
} from "react";
import { redeemDrinkTokenGuest } from "./actions";

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

  if (phase === "served") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
        onClick={handleServedTap}
      >
        <div className="text-center">
          <p
            className="text-6xl font-bold text-accent"
            style={{ animation: "servedScale 400ms ease-out forwards" }}
          >
            SERVED
          </p>
          <p className="mt-4 text-lg text-muted">{drinkName}</p>
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

  if (phase === "active" || phase === "serving" || phase === "cancelling") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md">
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
          <p className="mt-4 text-4xl sm:text-5xl font-bold text-foreground">
            {drinkName}
          </p>
          <p className="mt-2 text-sm text-muted">Active — awaiting service</p>
          {error && (
            <div className="mt-6 w-full max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          <p className="mt-12 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-white">
            {phase === "serving" ? "Serving..." : "Mark as served"}
          </p>
        </button>

        <div className="px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="mx-auto block rounded-full border border-card-border bg-transparent px-6 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "cancelling" ? "Cancelling..." : "Cancel"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6 pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))] sm:pb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Redeem Drink</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-card-border transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mb-6 text-center text-xl font-semibold text-foreground">{drinkName}</p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleActivate}
          disabled={isPending}
          className="w-full rounded-full py-3 px-8 font-semibold text-white transition-all bg-accent active:scale-95 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </button>
      </div>
    </div>
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
      <div className="rounded-xl border border-card-border bg-card p-4 opacity-60">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {token.drink_name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {formatPrice(token.price)}
            </p>
          </div>
          <span
            className="shrink-0 text-green-400 text-lg"
            aria-label="Redeemed"
          >
            &#10003;
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">Already redeemed</p>
      </div>
    );
  }

  if (token.status === "refunded") {
    return (
      <div className="rounded-xl border border-card-border bg-card p-4 opacity-60">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {token.drink_name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {formatPrice(token.price)}
            </p>
          </div>
          <span className="shrink-0 text-blue-400 text-xs font-medium" aria-label="Refunded">
            Refunded
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">Automatically refunded</p>
      </div>
    );
  }

  const isActive = token.status === "active";

  return (
    <>
      <div
        className={`rounded-xl border p-4 ${
          isActive
            ? "border-accent bg-accent/10 animate-pulse"
            : "border-accent/30 bg-gradient-to-br from-card to-accent/5"
        }`}
      >
        <p className="text-sm font-medium text-foreground truncate">
          {token.drink_name}
        </p>
        <p className="mt-0.5 text-sm text-accent font-semibold">
          {formatPrice(token.price)}
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="mt-3 w-full rounded-full bg-accent py-2.5 font-medium text-white transition-all active:scale-95 active:opacity-80"
        >
          {isActive ? "Active — tap to serve" : "Redeem"}
        </button>
      </div>

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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
        Your Drinks
      </h2>
      {loading ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted">Loading your drinks...</p>
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
