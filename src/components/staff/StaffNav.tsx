"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CapabilityKey } from "@/lib/capabilities/keys";
import { visibleStaffTabs } from "@/lib/routes/staff-tabs";
import { Chip } from "@/components/ui/Chip";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * The staff tab bar. It draws what the viewer holds, and nothing else.
 *
 * ── Hiding a nav item is not protecting a route ──────────────────────────────
 *
 * This component draws a tab only when the viewer holds the capability the
 * middleware will ask for at that address — both read the same declaration,
 * `src/lib/routes/capability-routes.ts`, through the labelled view in
 * `src/lib/routes/staff-tabs.ts`. That is STAFF-03, and it holds in **one**
 * direction: an entry that is drawn has a matching server-side rule.
 *
 * It does **not** hold in the other, and this component does not claim it does.
 * **Hiding a nav item is not protecting a route.** A tab that is absent has not
 * been refused by anything; the refusal is the middleware's, and the boundary on
 * the data is the RLS policy in the migrations. `access-gating.md`, gate
 * *coerenza navigazione/permessi*.
 *
 * ── Why the resolved set arrives as a prop ───────────────────────────────────
 *
 * This is a `"use client"` component and it resolves nothing. It receives the
 * capability keys the server already resolved and filters on them. It must never
 * import the resolver or the guard helpers under `src/lib/capabilities/`: a
 * capability check that moved from the server to the browser would be a check
 * the viewer can edit. Only the label list travels here, and that list is public
 * — route patterns and key strings, both already visible in the URL bar.
 *
 * ── What this component lost, and why ────────────────────────────────────────
 *
 * The prop that named which of the two staff trees this bar was being drawn in.
 * It concatenated a base onto a bare segment, which is how one menu came to hold
 * two spellings of the same seven surfaces. There is one work surface now, so
 * there is one address per tab, and this component no longer knows the two trees
 * apart — it cannot, and that is the point. The `roles: ["master"]` filter went
 * the same way: replaced by the capability the middleware asks, not translated
 * into a second rule.
 *
 * ── Two forms, and the number of tabs is the same in both ────────────────────
 *
 * `strip` is the phone form: one line in flow that scrolls sideways. `column`
 * is the tablet-and-desktop form: the same tabs stacked inside `AppNav`'s side
 * column, under a `Work` heading, **with no horizontal scroll at any width
 * ≥ 768 px**. That last sentence is RESP-04, and it is what H41-6 measures.
 *
 * The two are **two trees, each removed at the other tier by `display`** — the
 * mechanism §8.8 uses for the dual-rendered table, and the one that takes the
 * hidden tree out of the accessibility tree entirely rather than leaving it
 * present and invisible. Neither tree is ever transformed into the other.
 *
 * **The number of tabs does not change with width.** It is decided once, on the
 * server, by the capability set — never by a viewport. A tab filtered in
 * JavaScript at a width would give the paragraph above a second author, and it
 * would put a capability decision in a place the viewer can edit.
 *
 * ── The four defects this file carried, each named ───────────────────────────
 *
 * The incumbent pill was simultaneously four defects in five lines, and all four
 * are closed by the `Chip` primitive rather than by four local edits:
 *
 *  1. a ~32 px target — now `min-h-11`, 44 px, §6.1;
 *  2. white ink on an accent fill at **2.91 : 1** — now `--ground` at
 *     **6.85 : 1**, §5.3;
 *  3. a 500 weight, which this type system does not have — now 600, §7;
 *  4. a line token on a control boundary at **1.39 : 1** — now `--control` at
 *     **7.14 : 1**, §5.2.
 *
 * ── Why the selected tab looks different in the two forms ────────────────────
 *
 * Stated so it is not read as an oversight. In the **strip** the selected tab is
 * an accent-filled chip, because a chip among chips has nothing else to
 * distinguish it. In the **column** it is an accent label with a 2 px leading
 * edge, because there it sits directly under `AppNav`'s own entries and must
 * read as one of them; a filled pill in that stack would say *button*, not
 * *current page*. Both carry `aria-current="page"`, so the state is never
 * carried by colour alone.
 */
interface StaffNavProps {
  /**
   * The keys resolved server-side for this viewer, as an array.
   *
   * An array and not a `Set` deliberately: a client component's props cross the
   * server/client boundary and must be serialisable, and a `Set` is not.
   */
  capabilities: readonly CapabilityKey[];
  /**
   * Which of the two trees this mount draws. Required rather than defaulted:
   * the work layout mounts both, and a default would let a third caller acquire
   * one silently.
   */
  form: "strip" | "column";
}

/** The focus expression is imported, never respelled — `Button.tsx`, §5.4. */
const COLUMN_ENTRY =
  "relative flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm " +
  `transition-all active:scale-95 active:opacity-80 ${FOCUS_RING}`;

export default function StaffNav({ capabilities, form }: StaffNavProps) {
  const pathname = usePathname();

  const visibleTabs = visibleStaffTabs(capabilities);

  if (form === "column") {
    return (
      <nav
        aria-label="Work surfaces"
        className="hidden md:flex md:flex-col md:gap-1 md:overflow-visible"
      >
        {visibleTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`${COLUMN_ENTRY} ${
                isActive ? "text-accent" : "text-muted hover:text-ink"
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-accent"
                />
              )}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <>
      {/*
        The scrollbar is hidden on the strip and only there: the row scrolls by
        drag and by a partial chip showing past the gutter, so the bar itself
        would only be noise. Same construction as
        `(public)/events/FormatFilterRow.tsx:97-110`.
      */}
      <style>{`
        .staff-nav-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .staff-nav-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <nav aria-label="Work surfaces" className="mb-6 px-6 md:hidden">
        {/*
          `-mx-6 px-6` bleeds the row to the gutter so the first and last chip
          sit on the page margin and a partial chip can show past it. The
          gutter is re-added on this element's own parent, so the strip does not
          depend on what it is mounted inside.
        */}
        <div className="staff-nav-scroll -mx-6 flex gap-2 overflow-x-auto px-6">
          {visibleTabs.map((tab) => (
            <Chip
              key={tab.href}
              href={tab.href}
              selected={pathname.startsWith(tab.href)}
              ariaCurrent="page"
            >
              {tab.label}
            </Chip>
          ))}
        </div>
      </nav>
    </>
  );
}
