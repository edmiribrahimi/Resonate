"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CapabilityKey } from "@/lib/capabilities/keys";
import { visibleStaffTabs } from "@/lib/routes/staff-tabs";

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
 */
interface StaffNavProps {
  /**
   * The keys resolved server-side for this viewer, as an array.
   *
   * An array and not a `Set` deliberately: a client component's props cross the
   * server/client boundary and must be serialisable, and a `Set` is not.
   */
  capabilities: readonly CapabilityKey[];
}

export default function StaffNav({ capabilities }: StaffNavProps) {
  const pathname = usePathname();

  const visibleTabs = visibleStaffTabs(capabilities);

  return (
    <>
      <style>{`
        .admin-nav-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .admin-nav-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="admin-nav-scroll mb-6 overflow-x-auto">
        <div className="flex gap-2 px-6" style={{ width: "max-content" }}>
          {visibleTabs.map((tab) => {
            const href = tab.href;
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all active:scale-95 active:opacity-80 ${
                  isActive
                    ? "bg-accent text-white"
                    : "bg-card border border-card-border text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
