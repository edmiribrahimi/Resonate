import { redirect } from "next/navigation";
import TransactionList from "@/components/admin/TransactionList";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";

/**
 * `finance/actions.ts` did NOT move with this page, and that is R-WORK-ROUTES,
 * not an oversight. It is imported from outside its directory by
 * `src/components/admin/RefundDialog.tsx` and
 * `src/components/admin/TransactionList.tsx` — both on the refund path — so
 * moving it would have changed their specifiers and forced this plan to edit
 * two files it does not own. A route group governs routing, and `actions.ts`
 * is not a route: it gains nothing by moving. The server action re-checks role
 * and status inside itself either way; being imported from a gated page has
 * never been what protects it.
 */
export default async function AdminFinancePage() {
  // Resolved once by `(work)/layout.tsx`, which also mounts both navs and now
  // holds the two `UserRole` / `UserStatus` casts that used to sit here.
  // `getAccessContext` is `cache()`-scoped per request, so asking again for
  // this page's own guard costs no second round trip.
  const { capabilities } = await getAccessContext();

  // Same question the middleware asks of `/admin/*`, asked again here because
  // a page-level check is the surface's own gate and not an inherited one.
  // `admin.access` is granted to `master` alone, so no role's reach moves.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // `wide` — `/admin/finance` is on §4's CLOSED wide list, and it is there for
  // the reason the list exists: the surface's primary object is a dense table of
  // payments. The shell owns the maximum, the gutter, the vertical rhythm and
  // the navigation clearance in both tiers; this page writes none of them.
  return (
    <PageShell width="wide">
      <header className="mb-6">
        {/*
          The surface's own name, not the tree's. `<h1>Admin</h1>` was the URL
          prefix speaking, and after D-34-02 the word `admin` in an address no
          longer describes who is standing on it. This page is the finance
          surface; the members page took the same correction for the same
          reason, and the two now read as one system rather than as two pages
          that both call themselves Admin.
        */}
        <PageTitle>Finance</PageTitle>
      </header>

      <TransactionList />
    </PageShell>
  );
}
