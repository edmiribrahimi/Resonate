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
import {
  logMoneyPathFailure,
  type ReadResult,
  type SafeError,
} from "@/lib/failure/money-path";
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
 * ── The three silent failures below are REPAIRED (phase 46, plan 46-05) ──────
 *
 * They were recorded here and left alone by the visual conversion, because
 * improving one under a visual mandate would have been a behaviour change on the
 * money path. Plan 46-05 is the plan that owns them, and this is what each one
 * produces now. The section is rewritten rather than deleted: a docblock still
 * describing a defect the file no longer has is itself a silent failure.
 *
 *   1. **The custody write.** `storeGuestOrder` returned `void` and its `catch`
 *      swallowed every cause. It now returns a tagged result, and a refused
 *      write reaches the component as `GUEST_CUSTODY_STORE_FAILED`.
 *   2. **The custody read.** `getGuestOrderIds` returned `[]` from its `catch` —
 *      which is also the legitimate answer for *this browser bought nothing*, so
 *      a storage failure and an empty wallet were indistinguishable to every
 *      caller and therefore to the guest. It now returns `ReadResult`, so
 *      *empty* and *unreadable* differ **in the type** and no caller can render
 *      one as the other. The `|| "[]"` inside the `try` stays and is not the
 *      defect: it fires when the key is absent, which genuinely is an empty
 *      wallet. The defect was the `catch`.
 *   3. **The token fetch and its poll.** A fetch that could not answer reported
 *      the same `"unknown"` as one merely on its way, and the poll's bound at
 *      ten called `clearInterval` and nothing else — no state change, the same
 *      spinner, no terminal message, which was the commonest terminal state on
 *      this surface. Four named states replace the one string, and the bound
 *      sets one of them before it clears the timer.
 *
 * **What has NOT changed, and is the reason the repair is safe.** The standing
 * cost is stated rather than elided: there is still **no error tracking**, so
 * every `logMoneyPathFailure` line below reaches nobody on its own. The effect
 * that counts is the sentence drawn on this screen. And this phase ships the
 * **guest-facing half only** (D-46-10c): no staff surface shows a guest's orders
 * or tokens, so no sentence here sends anybody to the bar to be looked up — the
 * bar has nothing to look at, and a promise the product does not keep would be
 * this file's own defect reintroduced as copy. A bar-side lookup is deferred.
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

/**
 * The two ways this browser can fail to hold a guest's receipt.
 *
 * Constants first, the union from `typeof`, then a **total** `Record` over the
 * union — the construction `src/lib/door/outcome.ts:278-302` sets and
 * `src/lib/failure/money-path.ts` §1 writes down. The totality is the point: a
 * category added here without its sentence is an `npm run build` error, not a
 * category that renders as nothing, and in a repository with no test runner that
 * build is the only automatic gate there is.
 *
 * The **values** are the names the approved sentence list gives these two causes
 * (`46-COPY.md` §2, `RECEIPT_STORE_FAILED` and `RECEIPT_STORE_UNREADABLE`), so
 * the category a reader finds in the code is the category the owner approved a
 * sentence for. The **identifiers** carry the `GUEST_CUSTODY` prefix because
 * custody of the receipt is what they are about, and because this file also
 * declares a second, unrelated union further down for the token fetch.
 *
 * This union is the surface's **own**, not a shared one — `money-path.ts` §2
 * refuses a god-union, since a category on a bar screen and a category in a cron
 * report have different readers and different remedies.
 */
const GUEST_CUSTODY_STORE_FAILED = "RECEIPT_STORE_FAILED";
const GUEST_CUSTODY_READ_FAILED = "RECEIPT_STORE_UNREADABLE";

type GuestCustodyFailure =
  | typeof GUEST_CUSTODY_STORE_FAILED
  | typeof GUEST_CUSTODY_READ_FAILED;

/**
 * The two approved sentences, verbatim from `46-COPY.md` §2.
 *
 * Neither manufactures alarm about money that is safe, and that is a constraint
 * on this register rather than a nicety: a browser that cannot store a receipt
 * has not lost a payment — it has lost the **proof** — and each sentence says
 * which. Neither sends the guest to the bar, because no staff surface can look
 * an order up (D-46-10c).
 */
const GUEST_CUSTODY_MESSAGE: Record<GuestCustodyFailure, string> = {
  [GUEST_CUSTODY_STORE_FAILED]:
    "Your order was placed. This browser could not keep a copy of it, so this device may not be able to show your drinks again — keep this page open until they are served.",
  [GUEST_CUSTODY_READ_FAILED]:
    "We could not read the drinks saved on this device — that is not the same as having none. Reload the page, or open it in the browser you bought them with.",
};

/**
 * A caught value reduced to the only two fields anything on this path may log.
 *
 * `logMoneyPathFailure` takes a `SafeError`, and the parameter is the guard: a
 * whole caught object does not satisfy it, so *never log the object* is enforced
 * by the type rather than remembered. What is caught here is a `DOMException` or
 * a `SyntaxError` rather than a PostgREST error, but the rule is the shape of the
 * log line and not the origin of the fault.
 */
function toSafeError(caught: unknown): SafeError {
  return caught instanceof Error
    ? { code: caught.name, message: caught.message }
    : { code: "non_error_throw", message: null };
}

type GuestCustodyWriteResult =
  | { ok: true }
  | { ok: false; reason: typeof GUEST_CUSTODY_STORE_FAILED };

/**
 * Write one order id into this browser's wallet, and say whether it landed.
 *
 * The key and what is stored in it are byte-identical to what they were: a
 * changed key is a wiped wallet for every guest who already has one, with no
 * error anywhere. Only the **return type** changed.
 *
 * A byte-identical copy of the pre-46-05 helper still lives in
 * `GuestDrinkMenu.tsx:95`, and the comment above it — written in plan 46-02 —
 * already names this divergence in advance. It is deliberate and it is bounded:
 * that copy has no component to render into on its write path, and widening this
 * plan to a second file to change a contract nothing there reads would be scope
 * this plan did not take. Recorded in `46-05-SUMMARY.md` rather than left to be
 * discovered.
 */
function storeGuestOrder(
  eventId: string,
  orderId: string
): GuestCustodyWriteResult {
  try {
    const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
    const existing = JSON.parse(
      localStorage.getItem(key) || "[]"
    ) as string[];
    if (!existing.includes(orderId)) {
      existing.push(orderId);
      localStorage.setItem(key, JSON.stringify(existing));
    }
    return { ok: true };
  } catch (caught) {
    logMoneyPathFailure("guest_custody.write", toSafeError(caught));
    return { ok: false, reason: GUEST_CUSTODY_STORE_FAILED };
  }
}

/**
 * Read this browser's wallet, and never answer *nothing* when the answer is
 * *could not tell*.
 *
 * `ReadResult` is the shared shape from `src/lib/failure/money-path.ts`, taken
 * rather than re-invented, and it exists for exactly this read: an empty list of
 * drink receipts means either *you bought nothing* or *we could not read what you
 * bought*, and the `catch { return []; }` this replaces rendered the second as
 * the first. There is no arm to fall through now — the caller has to name which
 * one it is before it can render anything.
 *
 * The `|| "[]"` inside the `try` is **not** the defect and stays: it fires when
 * the key is absent, and a browser with no key genuinely bought nothing. The
 * defect was reporting a *thrown* read as that same answer.
 */
function getGuestOrderIds(
  eventId: string
): ReadResult<string[], typeof GUEST_CUSTODY_READ_FAILED> {
  try {
    const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    ) as string[];
    return { ok: true, value };
  } catch (caught) {
    logMoneyPathFailure("guest_custody.read", toSafeError(caught));
    return { ok: false, reason: GUEST_CUSTODY_READ_FAILED };
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

// ---------------------------------------------------------------------------
// What the token fetch and its poll can end in
// ---------------------------------------------------------------------------

/**
 * Four states replace the one string `"unknown"`.
 *
 * `"unknown"` was returned both by a fetch that could not answer and — as far as
 * every reader of it was concerned — by an order merely on its way, so the poll
 * could not tell *not yet* from *never*, and neither could the guest. The
 * *could-not-answer* members are kept apart from the *not-yet* one on purpose:
 * `DOOR_NIGHT_UNRESOLVED` (`src/lib/door/outcome.ts:280`) is the template, and
 * `/api/media/finalize/route.ts:229-234` states the reason in the other half of
 * the tree — *the question could not be answered, and this is not a refusal of
 * you*. Collapsing them tells somebody they were denied when in fact nobody
 * looked.
 *
 * This is the surface's **own** union and it is not merged with the custody one
 * above: a browser that cannot hold a receipt and a server that will not answer
 * are different facts with different remedies, and one `Record` over both would
 * be a totality check that had stopped meaning anything (`money-path.ts` §2).
 */
const TOKENS_ARRIVING = "TOKENS_ARRIVING";
const TOKENS_UNREACHABLE = "TOKENS_UNREACHABLE";
const TOKENS_REFUSED = "TOKENS_REFUSED";
const TOKENS_GAVE_UP = "TOKENS_GAVE_UP";

type GuestTokenFetchState =
  | typeof TOKENS_ARRIVING
  | typeof TOKENS_UNREACHABLE
  | typeof TOKENS_REFUSED
  | typeof TOKENS_GAVE_UP;

/**
 * The four approved sentences, verbatim from `46-COPY.md` §2.
 *
 * Three of them say *your payment is not affected*, and that is the register
 * constraint rather than reassurance for its own sake: a request that failed
 * says nothing about money that has already moved, and a sentence which let a
 * guest infer otherwise would manufacture alarm about money that is safe. None
 * carries an order id, a token id, a signed token, an HTTP status or a server
 * message (T-46-15) — nothing from the response body is interpolated into any
 * sentence here.
 */
const GUEST_TOKEN_FETCH_MESSAGE: Record<GuestTokenFetchState, string> = {
  [TOKENS_ARRIVING]:
    "Your drinks are still being confirmed — this usually takes a few seconds.",
  [TOKENS_UNREACHABLE]:
    "We could not reach the server to check your drinks. Your payment is not affected — check your connection and reload.",
  [TOKENS_REFUSED]:
    "The server could not answer for this order. Your payment is not affected — reload in a moment.",
  [TOKENS_GAVE_UP]:
    "Your drinks have not been confirmed yet and we have stopped checking. Your payment is not affected — reload this page to check again.",
};

/**
 * The one sentence on this surface that is **not** a refusal, and deliberately
 * not a member of either union above.
 *
 * A category means *something went wrong*. This means *nothing has, and here is
 * how to keep it that way* — it is a warning that arrives **before** the failure
 * it prevents, which is the opposite of every other sentence in this file.
 * Folding it into a refusal union would make a `Record` total over a set that
 * had stopped describing one thing, which is how a totality check quietly stops
 * meaning anything.
 *
 * It earns its place from a measured fact rather than from caution: the drink
 * menu is reachable **only by scanning a QR code at the bar**, so the buyer is
 * inside the venue and the buy-here-reopen-there loss case cannot happen. What
 * remains is a private window that gets closed, and until this sentence shipped
 * nothing on the surface told a guest that. Approved together with the sentence
 * list on 2026-08-14 (`46-COPY.md` §2b).
 */
const RECEIPT_KEEP_TAB_OPEN =
  "Keep this tab open until your drinks are served — if you are browsing privately, closing it will lose them.";

/**
 * The order statuses that let the poll stop, looked up without trusting the
 * prototype chain.
 *
 * `orderStatus` arrives inside a JSON body this file does not own, so it is read
 * with `Object.prototype.hasOwnProperty.call` before it indexes anything — the
 * form `ScannerClient.tsx:271-273` uses for exactly the same reason. A payload
 * answering `"constructor"` or `"toString"` would otherwise find an inherited
 * property and be read as a terminal answer, which on this surface means the
 * poll stops while the drinks are still coming (T-46-16).
 *
 * This is a lookup table, **not** the total `Record` construction: it is keyed by
 * a string from outside, so it cannot be total over anything. The two totality
 * maps in this file are the ones above.
 *
 * `completed` is the only member, and it is the same value the poll compared
 * against before this change — the comparison is unchanged, its lookup is not.
 */
const ORDER_STATUS_TERMINAL: Record<string, true> = { completed: true };

function orderIsComplete(orderStatus: string): boolean {
  return Object.prototype.hasOwnProperty.call(
    ORDER_STATUS_TERMINAL,
    orderStatus
  );
}

/**
 * What one pass over the guest's orders came back with: the tokens, and the
 * first state that was not an answer. `failure` is `null` when every order was
 * answered — the empty token list is then the truthful *none yet*, and it says
 * so by being `ok`-shaped rather than by being empty.
 */
type GuestTokenFetchResult = {
  tokens: TokenData[];
  failure: GuestTokenFetchState | null;
};

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
  /**
   * Which custody failure this device hit, if any — the category, never a
   * composed sentence. Set where a helper returns not-ok; drawn by the render.
   */
  const [custodyFailure, setCustodyFailure] =
    useState<GuestCustodyFailure | null>(null);
  /**
   * Which fetch or poll state this surface is in, if any. `null` means nothing
   * has failed and nothing is in flight.
   */
  const [fetchState, setFetchState] = useState<GuestTokenFetchState | null>(
    null
  );
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /**
   * What the most recent poll tick ended in, so the bound can say whether the
   * poll ran out having never reached the server, having been refused, or having
   * simply run out of turns. A ref rather than state: it is read at the bound,
   * not rendered, and re-rendering the grid every three seconds to hold it would
   * be motion on a surface somebody is holding up at a counter.
   */
  const pollFailureRef = useRef<GuestTokenFetchState | null>(null);

  const fetchTokensForOrders = useCallback(
    async (orderIds: string[]): Promise<GuestTokenFetchResult> => {
      const results = await Promise.all(
        orderIds.map(async (oid): Promise<GuestTokenFetchResult> => {
          try {
            const res = await fetch(`/api/drinks/tokens?order_id=${oid}`);
            if (!res.ok) {
              /*
                Discard site 1. This returned an empty token list carrying the
                ambiguous status, so a server that refused arrived at the caller
                looking exactly like an order with no drinks on it.
              */
              logMoneyPathFailure("guest_tokens.fetch", {
                code: String(res.status),
                message: "the token endpoint refused this order",
              });
              return { tokens: [], failure: TOKENS_REFUSED };
            }
            const data = (await res.json()) as {
              tokens: TokenData[];
              orderStatus: string;
            };
            return { tokens: data.tokens, failure: null };
          } catch (caught) {
            // Discard site 2 — the request never reached the server.
            logMoneyPathFailure("guest_tokens.fetch", toSafeError(caught));
            return { tokens: [], failure: TOKENS_UNREACHABLE };
          }
        })
      );
      return {
        tokens: results.flatMap((r) => r.tokens),
        failure: results.find((r) => r.failure !== null)?.failure ?? null,
      };
    },
    []
  );

  // Initial load
  useEffect(() => {
    const orderIds = new Set<string>();

    // From URL param
    if (initialOrderId) {
      orderIds.add(initialOrderId);
      const written = storeGuestOrder(eventId, initialOrderId);
      if (!written.ok) setCustodyFailure(written.reason);
    }

    /*
      From localStorage. This is where the defect completed: a failed read used
      to contribute nothing to the set, so the component went on as if the
      browser were empty and — a few lines below and again at the early return —
      rendered the screen of somebody who bought nothing. The read now says which
      of the two it is, and the failure is held rather than discarded.

      Where both custody failures occur, the write one is kept: it is the one
      that says the device may not be able to show the receipt again, and it is
      the one with a consequence outside this page. The functional updater is how
      that precedence survives React's batching of the two setters.
    */
    const saved = getGuestOrderIds(eventId);
    if (saved.ok) {
      for (const id of saved.value) {
        orderIds.add(id);
      }
    } else {
      setCustodyFailure((previous) => previous ?? saved.reason);
    }

    if (orderIds.size === 0) {
      setLoading(false);
      return;
    }

    fetchTokensForOrders([...orderIds]).then((result) => {
      setTokens(result.tokens);
      if (result.failure) setFetchState(result.failure);
      setLoading(false);
    });
  }, [eventId, initialOrderId, fetchTokensForOrders]);

  // Listen for new orders from GuestDrinkMenu
  useEffect(() => {
    function handleNewOrder(e: Event) {
      const customEvent = e as CustomEvent<{ orderId: string }>;
      const { orderId } = customEvent.detail;

      /*
        The order was just placed and this is the write that makes it findable
        again. If the browser refuses it, the guest is told so — the money is
        safe and the sentence says so, but this device may not be able to show
        the drinks a second time.
      */
      const written = storeGuestOrder(eventId, orderId);
      if (!written.ok) setCustodyFailure(written.reason);

      // Start polling for the new order's tokens
      pollCountRef.current = 0;
      pollFailureRef.current = null;
      setFetchState(TOKENS_ARRIVING);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      function stopPolling() {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }

      pollTimerRef.current = setInterval(async () => {
        pollCountRef.current += 1;

        try {
          const res = await fetch(`/api/drinks/tokens?order_id=${orderId}`);
          if (!res.ok) {
            /*
              Discard site 3. This was `if (!res.ok) return;` — the tick ended
              and left nothing behind, not even a record that it had failed. It
              now records the cause so the bound below can name it, and falls
              through to the bound instead of returning: the poll keeps running,
              which is the behaviour that was correct, but it can now stop.
            */
            logMoneyPathFailure("guest_tokens.poll", {
              code: String(res.status),
              message: "the token endpoint refused this order",
            });
            pollFailureRef.current = TOKENS_REFUSED;
          } else {
            const data = (await res.json()) as {
              tokens: TokenData[];
              orderStatus: string;
            };
            pollFailureRef.current = null;

            if (data.tokens.length > 0) {
              setTokens((prev) => {
                const existingIds = new Set(prev.map((t) => t.id));
                const newTokens = data.tokens.filter(
                  (t) => !existingIds.has(t.id)
                );
                return [...prev, ...newTokens];
              });
            }

            // Stop polling when the order is complete — the one good ending.
            if (orderIsComplete(data.orderStatus)) {
              setFetchState(null);
              stopPolling();
              return;
            }
          }
        } catch (caught) {
          /*
            Keep polling — that behaviour is correct and stays. What changes is
            that the tick no longer forgets it failed: the bound reads this and
            tells the guest the poll ran out having never reached the server,
            rather than reporting a bound reached against a server that answered.
          */
          logMoneyPathFailure("guest_tokens.poll", toSafeError(caught));
          pollFailureRef.current = TOKENS_UNREACHABLE;
        }

        /*
          The bound, and it is the point of this change. It used to sit inside
          the `try` **after** the two early exits, so a failing endpoint skipped
          it on every tick and the poll ran forever; and when it was reached it
          called `clearInterval` and nothing else — no state change, the same
          spinner, no terminal message — which made it the commonest terminal
          state on this surface and the one a guest could never see.

          The state is set **before** the timer is cleared, and it carries what
          the last tick ended in: refused, unreachable, or simply out of turns.
          The bound of ten and the three-second period are unchanged.
        */
        if (pollCountRef.current >= 10) {
          setFetchState(pollFailureRef.current ?? TOKENS_GAVE_UP);
          stopPolling();
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

  /*
    Where the defect completed, and where it is closed.

    Two entirely different situations reached this line and both drew nothing:
    a browser that genuinely holds no orders, and a browser that could not be
    read or a server that could not be asked. A guest whose receipt could not be
    read must not be handed the screen of a guest who bought nothing — that is
    the whole of `OBS-03` on this surface, and every category declared above is
    inert until this predicate knows the difference.

    So: still nothing when there is genuinely nothing, and the section with its
    sentence whenever a custody failure or a fetch state is held.
  */
  const custodySentence = custodyFailure
    ? GUEST_CUSTODY_MESSAGE[custodyFailure]
    : null;
  const fetchSentence = fetchState
    ? GUEST_TOKEN_FETCH_MESSAGE[fetchState]
    : null;
  /*
    Where both are present the custody one is drawn: it is the one that says the
    device may not be able to show the receipt again, and the only one with a
    consequence that outlives this page. A fetch state resolves on a reload; a
    lost receipt does not.
  */
  const failureSentence = custodySentence ?? fetchSentence;

  if (
    !loading &&
    tokens.length === 0 &&
    custodyFailure === null &&
    fetchState === null
  ) {
    return null;
  }

  /*
    The banner is drawn on the healthy state, and it is suppressed while a
    failure sentence is showing: `RECEIPT_STORE_FAILED` already ends with *keep
    this page open until they are served*, and two versions of one instruction
    is how a register starts to fray.

    The predicate is the one the card itself uses — `token.status === "active"`,
    the same comparison `GuestDrinkTokenCard` makes — so the notice appears
    exactly when a guest is holding something at the counter.
  */
  const hasActiveToken = tokens.some((token) => token.status === "active");

  return (
    <div>
      <SectionHeading className="mb-3">Your Drinks</SectionHeading>
      {/*
        Announced, and drawn in place. A toast is forbidden here by build gate
        rather than by preference: this file renders `Dialog`, and
        `scripts/verify-dialogs.mjs` check C refuses any file that renders one
        and reaches for the toast hook — a native dialog paints in the top
        layer, so a toast under it would report invisibly, and this project has
        no error tracking to notice on anybody's behalf. Same shape as the
        announced region already inside this file's active-token screen.
      */}
      {failureSentence && (
        <p role="alert" className="mb-3 text-sm text-sem-crit">
          {failureSentence}
        </p>
      )}
      {!failureSentence && hasActiveToken && (
        <p className="mb-3 text-sm text-ink-2">{RECEIPT_KEEP_TAB_OPEN}</p>
      )}
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
