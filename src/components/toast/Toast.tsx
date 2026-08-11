"use client";

/**
 * A notification raised by a surface — never by a dialog. The reason a dialog
 * is excluded is written where the toast is provided, in `ToastContext.tsx`.
 *
 * ── The colours are the declared semantics, not six palette guesses ──────────
 *
 * This file used to carry six raw palette utilities for three meanings that the
 * token layer had already named. Phase 40 declared the vocabulary; this is the
 * conversion (41-UI-SPEC §5.1, §8.10).
 *
 *   success  → `--sem-done`  5.69 : 1 as ink on `--surface`
 *   failure  → `--sem-crit`  6.99 : 1
 *   info     → `--sem-info`  6.78 : 1 — it holds the same value as `--muted`,
 *              the tertiary ink, and the coincidence is recorded in
 *              `globals.css` so neither is "fixed" without knowing the other
 *              moved. An info notice reading as tertiary text is a degradation,
 *              not a wrong statement.
 *
 * All three clear 4.5 : 1 for body text. `--sem-warn` has no consumer here
 * because this component has no warning type, and one is **not invented** to
 * complete a set: adding a fourth type is a decision about what the product
 * says, not a tidying of a record.
 *
 * **Every semantic here is an INK, never a fill** — the boundary carries the
 * same hue at 30% and is decorative, so no fill/ink pairing arises and
 * `--ground` is not needed as an ink (`40-UI-SPEC.md` §4.3 states the rule for
 * the case where it is: a semantic used as a fill carries `--ground`, never
 * `--ink`, never white).
 *
 * ── The legacy names were ALIASES, so this changes no pixel ─────────────────
 *
 * The panel's ground and the message's ink moved off the two legacy names onto
 * the current ones. Both legacy names are declared in `globals.css` as aliases
 * of exactly the tokens they were replaced by, so **the rename is a rename**:
 * read the diff as one, not as a restyle. The point of doing it is that the
 * aliases lose a consumer — emptied first, removed second, which is the only
 * order in which a Tailwind token rename is not silent, because Tailwind emits
 * no error for a utility whose token is gone.
 *
 * The two old names are not spelled out here, for two reasons this repository
 * has already paid for: the gate that counts them cannot tell a violation from
 * its own explanation, and a class string in a comment is, to Tailwind, a live
 * candidate indistinguishable from a use (DEF-41-01). `git log` holds them.
 *
 * ── What is announced, and to whom ───────────────────────────────────────────
 *
 * A notification nobody is told about is the same defect as a notification
 * painted under a dialog. The failure toast is `role="alert"`; success and info
 * are `role="status"`. That is §11's rule and the same pair a converted dialog
 * uses in its own panel — one contract, two places.
 *
 * **The copy is the caller's**, and this component cannot fix it. §11 bans the
 * shape the newsletter form has: one string standing for a network fault, a
 * missing key and a duplicate address at once. Nothing here collapses causes —
 * it renders the string it is handed — but a caller that hands it one generic
 * string per `catch` has the banned shape, and no colour token repairs that.
 */

type ToastType = "success" | "error" | "info";

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onDismiss: (id: string) => void;
}

const typeStyles: Record<ToastType, string> = {
  success: "border-sem-done/30 text-sem-done",
  error: "border-sem-crit/30 text-sem-crit",
  info: "border-sem-info/30 text-sem-info",
};

/**
 * `alert` interrupts; `status` waits its turn. A failed guest addition is the
 * former, a successful one the latter — the distinction is the whole of it.
 */
const roles: Record<ToastType, "alert" | "status"> = {
  success: "status",
  error: "alert",
  info: "status",
};

function SuccessIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm3.354 5.354-4 4a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7 9.293l3.646-3.647a.5.5 0 0 1 .708.708z"
        fill="currentColor"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm2.354 8.646a.5.5 0 0 1-.708.708L8 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L7.293 8 5.646 6.354a.5.5 0 1 1 .708-.708L8 7.293l1.646-1.647a.5.5 0 0 1 .708.708L8.707 8l1.647 1.646z"
        fill="currentColor"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm.5 10.5a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 1 0v4zM8 5.5A.75.75 0 1 1 8 4a.75.75 0 0 1 0 1.5z"
        fill="currentColor"
      />
    </svg>
  );
}

const icons: Record<ToastType, () => React.ReactElement> = {
  success: SuccessIcon,
  error: ErrorIcon,
  info: InfoIcon,
};

export default function Toast({ id, message, type, onDismiss }: ToastProps) {
  const Icon = icons[type];

  return (
    <div
      role={roles[type]}
      /*
       * No `min-h-11` on the panel: a toast is not a control, and §6's 44px is
       * about what a finger has to hit. Its dismiss button IS a control, and
       * takes the number below.
       */
      className={`bg-surface border rounded-xl px-4 py-3 shadow-lg max-w-sm w-full flex items-center gap-3 ${typeStyles[type]}`}
    >
      <Icon />
      <span className="flex-1 text-sm text-ink">{message}</span>
      {/*
        The icon control form of §8.5 — 44 × 44, written here rather than
        imported: the shared primitive is being extracted in a sibling plan of
        this same wave and does not exist on this branch, so importing it would
        not compile. The contract is the primitive's, verbatim, and this is the
        call site that adopts it when it lands.

        The focus ring is `--ink` with a 2px offset (§5.4), which puts it on the
        panel rather than on the control — the offset is what makes it an
        indicator, and it is not cosmetic.
      */}
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-0 text-muted hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        aria-label="Close"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M10.5 3.5 3.5 10.5M3.5 3.5l7 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
