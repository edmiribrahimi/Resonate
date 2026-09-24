"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { UserRole } from "@/types/database";
import { getNavigation } from "@/lib/rbac/roles";
import type { CapabilityKey } from "@/lib/capabilities/keys";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * The product navigation, in both tiers.
 *
 * D-41-02: **below 768 px it is a bar at the bottom edge; from 768 px up it is a
 * persistent column at the leading edge.** A bottom bar still fixed at 1920 px
 * is not a choice, it is a phone app stretched.
 *
 * ── What the bar carries, since phase 52 (D-52-01..05) ───────────────────────
 *
 * Whoever works sees four entries, in this order: **Events · Check-in · TASK ·
 * Management**. Everybody else — an `attendee`, an anonymous visitor — sees
 * **Events · Account**. TASK is drawn switched off (D-52-03) and Management
 * opens a panel instead of going anywhere. Home does not exist (D-52-02).
 * **Who sees what is decided by `getNavigation` in `src/lib/rbac/roles.ts`**,
 * a pure function over session, role and capability; this file only draws what
 * it returns.
 *
 * ── Width changes layout. It never changes membership. ───────────────────────
 *
 * This is contract, not style, and it is carried here verbatim from
 * `StaffNav.tsx:25-32` because this component is the second author of the same
 * rule and a second author is how a rule drifts.
 *
 * The entry list is resolved **on the server** by `getAccessContext()` and
 * arrives as serialisable capability keys. This is a `"use client"` component:
 * it resolves nothing, it must never import the resolver or the guard helpers
 * under `src/lib/capabilities/`, and **it must not filter, slice, truncate or
 * hide an entry at any width.** A tab dropped in JavaScript to make a column fit
 * is a capability decision taken in a place the viewer can edit.
 *
 * **Hiding a nav item is not protecting a route** — the sentence the account
 * page's Management Tools section carried until NAV-03 removed it, and that
 * `staff-tabs.ts` keeps at its head. The refusal is the middleware's, and the
 * boundary on the data is the RLS policy in the migrations (`access-gating.md`,
 * gate *coerenza navigazione/permessi*). Every row of the panel below has its
 * line in `CAPABILITY_ROUTES` and its page guard; the panel decides visibility,
 * never access.
 *
 * ── It collapses now, and this is the decision reversed WITH its reason ──────
 *
 * This section used to say *"It does not collapse. No toggle, no drawer, no
 * hamburger, no disclosure. RESP-04 forbids hiding navigation behind a menu."*
 * Phase 52 reverses it (D-52-07, D-52-08), and the reversal is written here
 * rather than left for the next reader to find as a contradiction:
 *
 *   - **RESP-04 asks that the WORK SURFACES show their navigation without a
 *     menu from tablet up.** Inside a tool the column list starts **open**
 *     (D-52-08) and reopens on entering any row of the panel, so on a work
 *     surface nothing is behind a menu: RESP-04 holds where it applies.
 *   - Outside the tools — Events, Check-in — the list starts closed, and a
 *     closed list there hides no work surface: the reader is not working on
 *     one.
 *   - On the phone the tools were never in the bar: they were a strip in flow
 *     on the work pages and a list on the account page. The sheet puts them one
 *     tap from any page instead of two screens away. The strip stays on the
 *     work pages (NAV-04, plan 52-11), pinned to the top while a tool scrolls.
 *   - **The column carries ONE list** (D-52-08): the Management panel. The
 *     `Work` section that used to sit under the entries is gone, so a tool is
 *     never listed twice, in two orders, on the same screen.
 *
 * **Two disclosures, two buttons, two states, chosen by CSS** — the sheet from
 * the bar's Management button (`md:hidden` in the responsive form), the list
 * from the column's (`hidden md:flex`). Nothing here reads the viewport
 * (`verify:no-viewport-read`); one button deciding "am I in the bar or in the
 * column?" would have to.
 *
 * ── The bar height is a declared value, not a measurement ─────────────────
 *
 * *(5rem and `h-20` until 2026-09-24; the owner took 16px out of the bar so a
 * phone shows two nights with their posters. Everything below holds with the
 * new number.)*
 *
 * The bar's row is `h-16` — 4 rem — and the safe-area inset sits **outside** it
 * on the nav element, so the bar's total height is exactly
 * `calc(4rem + env(safe-area-inset-bottom))` — and since the pill floats 0.75rem
 * above that edge and is 3.5rem tall, the content clearance is 5rem. That is the literal
 * `--nav-inset-block-end` is built from in `globals.css`, and several files
 * depend on it staying true (the page shell's bottom padding, the toast's
 * offset, the dialog sheet's bottom padding, the sticky buy bar, the
 * variable itself — and, since phase 52, the Management sheet, which ends
 * exactly where the bar begins). **Re-deriving the height from this markup
 * instead of declaring it would silently invalidate them.** If this row's
 * height changes, that variable changes in the same commit.
 *
 * ── Active state in three channels ───────────────────────────────────────────
 *
 * An `--accent` label, a 2 px indicator (an underline in the bar, a leading edge
 * in the column), and **`aria-current="page"`** on the link. Colour is never the
 * only channel. The Management button is current when the path starts with the
 * address of one of its rows, and carries **no** `aria-current` — it is a
 * button; the row in the panel is what declares the page.
 *
 * ── A known consequence of D-39-01, carried over rather than rediscovered ────
 *
 * `isActive` is `pathname.startsWith(entry.href)`, and the Check-in entry's
 * `href` is `/door` (D-39-01). The door's tab highlights at `/door` and **not**
 * at `/admin/scanner` — the old address keeps serving the same surface
 * permanently and as a real page (D-39-02), and somebody who reaches it directly
 * sees no tab highlighted. It is one line to revisit if the door pass reports it
 * as a nuisance; it is not a broken link and it refuses nobody.
 */
export interface AppNavProps {
  role: UserRole | null;
  // ── La prop dello stato e' uscita (fase 50, 50-09, D-50-01) ───────────────
  //
  // Stava qui sotto `role`, e i tredici punti d'innesto la passavano con un
  // cast. Il filtro che la leggeva non esiste piu', la funzione di database non
  // la mette piu' nel payload, e la colonna che la produceva e' uscita dal
  // database nella stessa fase. Toglierla dalla firma ha reso i tredici un
  // errore di compilazione ciascuno: **e' cosi' che l'elenco dei file da
  // toccare e' stato costruito**, invece che a memoria.
  /**
   * Held by role. Empty for an anonymous visitor — `ANONYMOUS_CONTEXT`.
   *
   * **Required, deliberately.** All 13 mount sites pass it, so a fourteenth
   * that forgets is a build error naming the file rather than a surface that
   * compiles, renders, and draws a plausible but wrong navigation — which this
   * repository has no error tracking to notice.
   */
  capabilities: readonly CapabilityKey[];
  /**
   * Held by a live per-night assignment, or `null` when the payload did not
   * carry the key. `null` is **not** flattened to `[]` on the way in: absent and
   * empty are different facts (`capabilities/server.ts`).
   */
  liveAssignmentCapabilities: readonly string[] | null;
  /**
   * `"responsive"` — the bar below 768 px, the column at and above it.
   * `"phone"` — the bar at every width. **It has one consumer, and naming it is
   * the point:** the door mounts this component with `form="phone"`, directly
   * and by decision (D-42-03). The check-in surface is worked one-handed at an
   * entrance and does not give 224 px to a column. Until Phase 42 the same prop
   * reached the door through a one-line wrapper beside this file; the wrapper
   * is deleted and the reason it carried lives here, or the next reader finds
   * a prop with no purpose and proposes removing it.
   */
  form?: "responsive" | "phone";
  // ── La prop degli strumenti di lavoro e' uscita (fase 52, 52-11, D-52-08) ──
  //
  // Portava le tab degli strumenti nella colonna, sotto un titolo `Work`, e il
  // layout di lavoro era il suo unico consumatore. Dal 2026-09-23 la colonna ha
  // **una lista sola**: il pannello Management qui sotto, che dentro uno
  // strumento parte aperto. Tenere anche la sezione `Work` avrebbe mostrato gli
  // stessi strumenti due volte, in due ordini diversi. Da telefono la striscia
  // resta, disegnata dal layout di lavoro (`StaffNav`, NAV-04).
}

const icons: Record<string, ReactNode> = {
  // ── Il glifo `home` e' uscito, e la domanda che lo teneva e' chiusa ───────
  //
  // Stava qui con una nota: *la fase 52 (`NAV-01`) decide se quella voce
  // torna*. La fase 52 l'ha deciso — **Home non torna** (D-52-02): la radice
  // resta il rimando a `/events`, e nessuna voce la chiede. Un disegno che
  // nessuna voce puo' chiedere non e' un dizionario piu' completo: e' un indizio
  // falso per il prossimo lettore, che cerca la voce che lo usa.
  calendar: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  qrcode: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
    </svg>
  ),
  user: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  // Phase 52 — TASK (D-52-03). Heroicons v2 outline, same form as the above.
  "clipboard-document-check": (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
    </svg>
  ),
  // Phase 52 — Management, closed (D-52-07).
  "squares-2x2": (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  ),
  // Phase 52 — Management, open in the bar: the icon says how it closes.
  "x-mark": (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
};

/**
 * The bar, at both forms. The safe-area inset sits on this element and the row
 * inside it is exactly 5 rem — see the docblock.
 *
 * The column's ground is `--ground`: it is page furniture, not content. It
 * cannot be told from the page by its ground at any value (1.05 : 1 against
 * `--surface`, 1.14 : 1 against `--raised`), so the separation is the trailing
 * line — `border-e border-line`, 1.29 : 1, decorative and correct as such,
 * because the column's *content* says where it is.
 */
// ── Why the bar is pinned to its own compositing layer ──────────────────────
//
// Reported on an iPhone, 2026-08-14: the bar sometimes leaves the bottom of the
// screen during and after scrolling. The declaration below is not the fault —
// `fixed inset-x-0 bottom-0` is correct, and the static suspects were ruled out
// by reading the tree: `AppNav` is mounted as a **sibling** of the page content
// at every mount site, so the `active:scale-*` transforms on cards are not its
// ancestors and cannot make it position against them; `<body>` carries no
// transform or filter either.
//
// What is left is how the bar is PAINTED. `backdrop-blur-xl` makes iOS Safari
// recompose this element against the pixels behind it on every scroll frame,
// and during elastic (rubber-band) scrolling it composes against a surface that
// is itself still moving — which is when a fixed bar visibly lags or lands in
// the wrong place. `translate3d(0,0,0)` promotes the bar to a stable layer of
// its own so the compositor moves it instead of repainting it.
//
// **This is a mitigation for the most likely cause, not a verified fix.** It
// cannot be proved from here: the report is iOS Safari, this repository has no
// test runner, and the behaviour does not reproduce in a desktop browser. It
// has to be exercised on the phone that showed it. Two things to watch there,
// because a transform and a backdrop-filter on the same element interact: that
// the blur still reads as blur, and that the bar's ground has not gone flat.
// If either changed, the next move is to drop the blur for an opaque ground —
// which is a visual decision, not a bug fix, and belongs to whoever owns the
// look.
//
// **And it is the reason the Management sheet is NOT inside this element.** A
// `fixed` descendant of a transformed ancestor is positioned against the
// ancestor, not the viewport: a sheet rendered inside this `<nav>` would be
// placed inside the bar's 5 rem. The sheet and its scrim are therefore
// SIBLINGS of this element, rendered right after it (52-UI-SPEC.md §B.2).
// ── A floating pill on the phone (owner's decision, 2026-09-24) ────────────
//
// The bar no longer sits on the screen's edge: it floats 0.75rem above the
// safe area, inset 1rem from both sides, fully rounded, with the same
// translucent ground. The active entry gets a filled pill behind icon and
// label (`INDICATOR_PHONE`) instead of an accent line under it. The insets
// are logical (`start`/`end`) so the column form can override the same
// properties at `md:` without a physical/logical race. The clearance the
// content keeps under it is `--nav-inset-block-end` in `globals.css`, now
// 5.5rem: 4rem of bar plus the air on either side.
// Sized to its entries (owner, 2026-09-24): the `<nav>` is a full-width,
// click-through strip that only centres; the ROW is the pill, as wide as the
// entries it holds — two for a visitor, more for staff — and 56px tall.
const NAV_PHONE =
  "fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 " +
  "flex justify-center pointer-events-none " +
  "[transform:translate3d(0,0,0)] [-webkit-backface-visibility:hidden]";

const NAV_RESPONSIVE =
  `${NAV_PHONE} md:pointer-events-auto md:block md:inset-x-auto md:inset-y-0 md:start-0 md:z-50 md:w-56 ` +
  "md:border-e md:border-line md:bg-ground/80 md:backdrop-blur-xl";

// 4rem since 2026-09-24 (owner's decision, «leggera»): the bar lost 16px of
// air so a phone shows two nights, poster included. Icons, labels and the
// 44px targets did not move. `--nav-inset-block-end` in `globals.css` says
// the same number — the two are one declaration in two places, on purpose.
const ROW_PHONE =
  "pointer-events-auto flex h-14 max-w-[calc(100vw-2rem)] items-stretch gap-1 px-1.5 " +
  "rounded-full border border-line bg-ground/75 shadow-lg backdrop-blur-xl";

const ROW_RESPONSIVE =
  `${ROW_PHONE} md:h-full md:max-w-none md:flex-col md:items-stretch md:gap-1 ` +
  "md:overflow-y-auto md:px-4 md:py-6 " +
  "md:rounded-none md:border-0 md:bg-transparent md:shadow-none md:backdrop-blur-none";

/**
 * The focus expression is imported from the ladder, never respelled (§5.4).
 *
 * The incumbent bar had **none**: a keyboard user tabbing along the navigation
 * saw nothing move. That is not a style gap, it is the indicator WCAG 2.4.7
 * requires, and it is added here rather than deferred to the surface that
 * notices — nobody was going to notice, because this repository has no error
 * tracking and a missing focus ring raises nothing.
 */
const ENTRY_PHONE =
  "relative isolate my-1 flex min-h-11 flex-none flex-col items-center justify-center gap-0.5 px-5 " +
  `rounded-full text-xs transition-all active:scale-95 active:opacity-80 ${FOCUS_RING}`;

const ENTRY_RESPONSIVE =
  `${ENTRY_PHONE} md:my-0 md:min-h-11 md:flex-none md:flex-row md:items-center md:gap-3 ` +
  "md:justify-start md:gap-3 md:rounded-xl md:px-4 md:text-sm";

/**
 * The column-tier restatement for the two new entries that sit in the column
 * (TASK, and nothing else: the column's Management button has its own string).
 * Only breakpoint-prefixed utilities — the unprefixed minimum is written
 * LITERALLY in each element's own class attribute below, because
 * `verify:touch-targets` reads an interpolated constant as no declaration at
 * all, and the one entry allowed to rely on constants is the link carrying
 * the `ENTRY_*` ternary (`PRIMITIVE_RAW_ELEMENTS`). The new elements do not
 * reuse that ternary (52-UI-SPEC.md §0 rule 4).
 */
const COLUMN_TIER =
  "md:flex-none md:flex-row md:items-center md:justify-start md:gap-3 " +
  "md:rounded-xl md:px-4 md:text-sm";

/** 2 px. An underline in the bar; a leading edge in the column. */
// The phone indicator is the FILL behind the active entry, not a line under
// it (2026-09-24): `-z-10` inside the entry's own stacking context (`isolate`)
// puts it under icon and label. The column keeps its accent bar on the edge.
const INDICATOR_PHONE = "absolute inset-0 -z-10 rounded-full bg-surface";

const INDICATOR_RESPONSIVE =
  `${INDICATOR_PHONE} md:inset-auto md:inset-y-1 md:start-0 md:z-auto ` +
  "md:w-0.5 md:rounded-full md:bg-accent";

/**
 * The leading-edge indicators of the panel's rows (52-UI-SPEC.md §B.2, §B.3).
 *
 * A current row speaks in three channels — `--accent`, this 2 px edge, and
 * `aria-current="page"` — with no icon, heading or group separator: `Account`
 * and `Gallery` read as rows like the tools (D-52-07). The column row's edge
 * is also the column Management button's.
 */
const INDICATOR_EDGE = "absolute inset-y-1 start-0 w-0.5 rounded-full bg-accent";

const INDICATOR_SHEET_ROW = "absolute inset-y-2 start-0 w-0.5 rounded-full bg-accent";

/**
 * The icon well — 52-UI-SPEC.md §A.2. **Every** entry carries it, so the four
 * icons sit at the same height as TASK's, whose well shows a dashed border.
 * The border is transparent everywhere else; without the well, TASK's icon
 * would sit 2 px lower than its neighbours.
 */
const WELL =
  "relative inline-flex h-7 w-10 items-center justify-center rounded-full border";

export default function AppNav({
  role,
  capabilities,
  liveAssignmentCapabilities,
  form = "responsive",
}: AppNavProps) {
  const pathname = usePathname();
  const { bar, panel } = getNavigation(
    role,
    capabilities,
    liveAssignmentCapabilities
  );

  const isPhone = form === "phone";

  // "Am I inside the panel?" — the path starts with the address of one of its
  // rows. More precise than a `/admin/` prefix: it covers `/gallery` and
  // `/account`, and it excludes `/admin/scanner`, which is the door.
  const inPanel = panel.some((entry) => pathname.startsWith(entry.href));

  // ── Two states, one per disclosure (never one state read by width) ───────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [columnOpen, setColumnOpen] = useState(inPanel);
  const sheetButtonRef = useRef<HTMLButtonElement>(null);

  // ── The address changed: close the sheet, reopen the list if inside ──────
  //
  // Inside `(work)` this component is NOT unmounted between navigations
  // (Pitfall 4), so neither state recomputes on its own. This is React's
  // "adjust state while rendering" form rather than an effect: the correction
  // lands in the same render as the new address, with no frame in which the
  // sheet is still drawn over the page that was just opened.
  //
  // The list **reopens** on entering a panel row and **never closes itself**:
  // somebody who closed it on a tool and moved to Events finds it as they left
  // it; somebody entering a tool finds it open, which is what keeps RESP-04
  // true on a work surface (see the docblock).
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (seenPathname !== pathname) {
    setSeenPathname(pathname);
    setSheetOpen(false);
    if (inPanel) {
      setColumnOpen(true);
    }
  }

  // ── Escape closes the sheet and returns focus to its button ──────────────
  //
  // The sheet is a NON-MODAL DISCLOSURE, not a dialog, and it is declared as
  // one: no `<dialog>`, no `Dialog.tsx`, no inert veil. `Dialog.tsx` requires a
  // title the owner ruled out (D-52-07: only the list) and makes everything
  // behind it inert — including this bar, whose Management button must stay
  // tappable to close the sheet. Focus is not trapped; Tab leaves the sheet
  // like any other list. What a disclosure owes the keyboard is `Escape` and
  // focus returning to the control that opened it, and both are here.
  useEffect(() => {
    if (!sheetOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSheetOpen(false);
        sheetButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen]);

  function closeSheetToButton() {
    setSheetOpen(false);
    sheetButtonRef.current?.focus();
  }

  const showSheet = sheetOpen && panel.length > 0;

  // The phone form (the door) is a bar at every width, and so is its sheet;
  // the responsive form hands the column tier to the column list.
  const phoneOnly = isPhone ? "" : "md:hidden";

  // ── Where the sheet ends, at the door on a tablet ────────────────────────
  //
  // The sheet ends where the bar begins: `--nav-inset-block-end`. From `md`
  // up that variable is `0px` (`globals.css`), because the responsive bar
  // leaves the bottom edge there — but the door's phone form does NOT leave it.
  // A sheet on the door at tablet width would therefore reach the bottom edge
  // and cover the bar it was opened from. The phone form restates the bar's
  // declared height at `md` (the same literal the variable is built from),
  // so the bar stays tappable at every width (T-52-30). This duplicates the
  // literal on purpose and in one place; if the row's height changes, this
  // line changes with the variable.
  const sheetBottom = isPhone
    ? "bottom-[var(--nav-inset-block-end)] md:bottom-[calc(5rem+env(safe-area-inset-bottom))]"
    : "bottom-[var(--nav-inset-block-end)]";
  const sheetMaxHeight = isPhone
    ? "max-h-[calc(100dvh-var(--nav-inset-block-end)-4rem)] md:max-h-[calc(100dvh-5rem-env(safe-area-inset-bottom)-4rem)]"
    : "max-h-[calc(100dvh-var(--nav-inset-block-end)-4rem)]";

  return (
    <>
      <nav data-nav-form={form} className={isPhone ? NAV_PHONE : NAV_RESPONSIVE}>
        <div className={isPhone ? ROW_PHONE : ROW_RESPONSIVE}>
          {bar.map((entry) => {
            if (entry.kind === "link") {
              // Il ramo `href === "/"` non torna: Home e' uscita con la fase 50
              // (D-50-12) e la fase 52 ha deciso che resta fuori (D-52-02).
              //
              // **Il ramo generale e' l'unico** (fase 51, D-51-09b): la voce
              // Account porta `/login` senza sessione ed e' un indirizzo come
              // un altro; il 308 del vecchio indirizzo dell'account cambia il
              // `pathname` del browser **prima** che questa pagina renda, quindi
              // un secondo confronto sul vecchio indirizzo sarebbe una seconda
              // verita' che diverge alla prima volta che una delle due si muove.
              const isActive = pathname.startsWith(entry.href);

              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`${isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE} ${
                    isActive ? "text-accent" : "text-muted"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className={isPhone ? INDICATOR_PHONE : INDICATOR_RESPONSIVE}
                    />
                  )}
                  <span className={`${WELL} border-transparent`}>
                    {icons[entry.icon]}
                  </span>
                  <span>{entry.label}</span>
                </Link>
              );
            }

            if (entry.kind === "disabled") {
              // ── TASK, drawn switched off — D-52-03, D-52-24 ─────────────
              //
              // A `button` with `aria-disabled`, NOT a link: no `href`, no
              // `onClick`, no `title`, no tooltip, no placeholder page, no
              // "Soon". It stays in the Tab order, so a screen reader finds it
              // and hears that it is unavailable. It reads NO data and shows no
              // count: the tasks do not exist until phase 53.
              //
              // Its state is not carried by the grey. `--faint` on `--ground`
              // is 3.54:1 — the one declared use of that colour as text,
              // exempt under WCAG 1.4.3 as an inactive component — and the
              // non-colour channel is the DASHED border of the well ("not
              // finished", as elsewhere in the tree) plus `aria-disabled`. No
              // `active:` feedback and `cursor-default`: a tap does nothing and
              // must not look as if it did something.
              return (
                <button
                  key="task"
                  type="button"
                  aria-disabled="true"
                  className={`relative flex min-h-11 flex-1 cursor-default flex-col items-center justify-center gap-1 text-xs text-faint ${FOCUS_RING} ${
                    isPhone ? "" : COLUMN_TIER
                  }`}
                >
                  {/*
                    The badge slot of TASK-04, built in phase 53 — its geometry
                    is fixed here so phase 53 finds it instead of inventing it,
                    and NOTHING is drawn in it today (no empty span, no zero):
                      anchor   this well (it is `relative`)
                      place    absolute, -top-1, start at calc(100% - 0.5rem):
                               8 px past the well's trailing edge, 4 px above
                      size     h-4 (16 px), min-w-4, px-1, rounded-full
                      text     font-mono text-xs font-semibold, two numbers
                               joined by a middle dot (e.g. 3·1)
                      extent   at most 12·12 ≈ 44 px, inside half a 90 px entry
                      rule     absolute: it never changes the row's 5 rem nor
                               the entry's width
                      colour   phase 53's, from the 41 palette — never
                               `--accent`, which is a navigation state
                  */}
                  <span className={`${WELL} border-dashed border-faint`}>
                    {icons[entry.icon]}
                  </span>
                  <span>{entry.label}</span>
                </button>
              );
            }

            // ── Management — two buttons, two disclosures, chosen by CSS ────
            //
            // The bar's button opens the sheet (the bar tier only in the
            // responsive form, every width in the phone form); the column's
            // opens the list (column tier only, responsive form only). Each has
            // its own state. Neither carries `aria-current`: the row inside
            // the panel declares the page.
            const barTone = inPanel
              ? "text-accent"
              : sheetOpen
                ? "text-ink"
                : "text-muted";
            const columnTone = inPanel ? "text-accent" : "text-muted hover:text-ink";

            return (
              <div key="management" className="contents">
                <button
                  ref={sheetButtonRef}
                  type="button"
                  aria-expanded={sheetOpen}
                  aria-controls="management-sheet"
                  onClick={() => setSheetOpen((open) => !open)}
                  className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-xs transition-all active:scale-95 active:opacity-80 ${FOCUS_RING} ${barTone} ${phoneOnly}`}
                >
                  {inPanel && (
                    <span aria-hidden="true" className={INDICATOR_PHONE} />
                  )}
                  <span className={`${WELL} border-transparent`}>
                    {icons[sheetOpen ? "x-mark" : entry.icon]}
                  </span>
                  <span>{entry.label}</span>
                </button>

                {!isPhone ? (
                  <>
                    <button
                      type="button"
                      aria-expanded={columnOpen}
                      aria-controls="management-column"
                      onClick={() => setColumnOpen((open) => !open)}
                      className={`relative hidden min-h-11 items-center gap-3 rounded-xl px-4 text-sm transition-all active:scale-95 active:opacity-80 md:flex ${FOCUS_RING} ${columnTone}`}
                    >
                      {inPanel && (
                        <span aria-hidden="true" className={INDICATOR_EDGE} />
                      )}
                      <span className={`${WELL} border-transparent`}>
                        {icons[entry.icon]}
                      </span>
                      <span>{entry.label}</span>
                      <svg
                        aria-hidden="true"
                        className={`ms-auto h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${
                          columnOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>

                    {/*
                      The list in the column — D-52-08, 52-UI-SPEC.md §B.3.
                      Closed with the `hidden` ATTRIBUTE, which takes it out of
                      the Tab order and the accessibility tree (Tailwind's
                      preflight makes that attribute win over `md:flex`). Not
                      `CollapsibleSection`, which leaves the links tabbable at
                      zero opacity (Pitfall 9). No animation: it appears and
                      disappears; only the chevron turns.
                    */}
                    <nav
                      id="management-column"
                      aria-label="Management"
                      hidden={!columnOpen}
                      className="hidden md:flex md:flex-col md:gap-1"
                    >
                      {panel.map((row) => {
                        const isRowActive = pathname.startsWith(row.href);

                        return (
                          <Link
                            key={row.href}
                            href={row.href}
                            aria-current={isRowActive ? "page" : undefined}
                            className={`relative flex min-h-11 items-center rounded-xl ps-16 pe-4 text-sm ${FOCUS_RING} ${
                              isRowActive ? "text-accent" : "text-muted hover:text-ink"
                            }`}
                          >
                            {isRowActive && (
                              <span aria-hidden="true" className={INDICATOR_EDGE} />
                            )}
                            {row.label}
                          </Link>
                        );
                      })}
                    </nav>
                  </>
                ) : null}
              </div>
            );
          })}

          {/*
            There is no `Work` section under the entries any more (D-52-08,
            plan 52-11, 2026-09-23): the Management list above is the column's
            only list, and it is the same list the phone sheet shows.
          */}
        </div>
      </nav>

      {/*
        ── The sheet — D-52-07, 52-UI-SPEC.md §B.2 ─────────────────────────────

        SIBLINGS of the `<nav>` above, never children: that element is
        transformed, and a `fixed` child would be positioned inside the bar.
        Rendered right after it, so Tab from the Management button enters the
        first row directly.

        NOT A DIALOG, and declared as such (see the Escape effect above): no
        `<dialog>`, no `Dialog.tsx`, and no full-viewport inset utility — the
        scrim stops where the bar begins, so the bar stays visible and tappable
        under it. That is also why `verify:dialogs` does not read this as a
        dialog shell: it is not one.

        Closes on: a tap on the scrim, a tap on Management again, `Escape`, a tap
        on any row (the current one included — the path does not change and on
        its own would not close it), and any change of address. Opens with the
        160 ms keyframe in `globals.css`; closes instantly.

        z-50, the navigation's own rank (41 §10): above the sticky buy bar
        (z-40) and the hung strip, below dialogs and toasts. No new rank.
      */}
      {showSheet ? (
        <>
          <div
            aria-hidden="true"
            data-nav-sheet=""
            onClick={closeSheetToButton}
            className={`fixed inset-x-0 top-0 z-50 bg-black/80 animate-[management-scrim-in_160ms_ease-out] motion-reduce:animate-none ${sheetBottom} ${phoneOnly}`}
          />
          <nav
            id="management-sheet"
            aria-label="Management"
            data-nav-sheet=""
            className={`fixed inset-x-0 z-50 mx-auto max-w-lg overflow-y-auto rounded-t-2xl border-t border-line bg-surface py-2 animate-[management-sheet-in_160ms_ease-out] motion-reduce:animate-none ${sheetBottom} ${sheetMaxHeight} ${phoneOnly}`}
          >
            {panel.map((row) => {
              const isRowActive = pathname.startsWith(row.href);

              // A tap on a row navigates AND closes — the current row too,
              // whose address does not change and would not close it alone.
              return (
                <Link
                  key={row.href}
                  href={row.href}
                  aria-current={isRowActive ? "page" : undefined}
                  onClick={() => setSheetOpen(false)}
                  className={`relative flex min-h-11 items-center px-6 text-sm active:bg-raised ${FOCUS_RING} ${
                    isRowActive ? "text-accent" : "text-ink-2"
                  }`}
                >
                  {isRowActive && (
                    <span aria-hidden="true" className={INDICATOR_SHEET_ROW} />
                  )}
                  {row.label}
                </Link>
              );
            })}
          </nav>
        </>
      ) : null}
    </>
  );
}

