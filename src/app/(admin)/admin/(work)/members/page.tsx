import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AnimatedSection from "@/components/motion/AnimatedSection";
import MemberTable from "@/components/admin/MemberTable";
import CreateAccountForm from "@/app/(admin)/admin/members/CreateAccountForm";
import { FOCUS_RING } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The one members surface — the collapse of `/admin/members` and
 * `/organizer/members`, which were 171 and 118 lines and the phase's largest
 * divergence.
 *
 * ── Every resolved divergence, with the grant that decided it (D-34-05) ──────
 *
 * The two versions differed because the ORGANIZER page was missing things the
 * capability model already permitted — not because an organizer was meant to
 * see less. Four differences, four verdicts:
 *
 * 1. **The guard: `admin.access` → `organizer.access`.** Decided by
 *    `capability-routes.ts`, which binds `/admin/members` to
 *    `organizer.access`, and by the organizer twin, which already asked exactly
 *    that key. `admin.access` was the PREFIX's meaning, not this surface's
 *    (D-34-02); `/admin/members/growth` keeps it because the map binds that
 *    route there, and longest-literal-match makes the more specific route win.
 *
 * 2. **`<CreateAccountForm />` — kept.** Decided by **D-20 of Phase 43** (*an
 *    organizer may create an account directly as organizer*) and by
 *    `createAccount`'s own re-check of `staff.manage`, which an organizer
 *    holds. Resolving towards MORE is permitted here only because an existing
 *    grant already says so — D-34-06. **No grant was edited, no
 *    `requires_approved` flipped, no capability key added.**
 *
 * 3. **The `Membership acts →` link — kept, and kept unconditional.** Decided
 *    by `('organizer','register.read',true)`, granted in
 *    `20260808002000_membership_register.sql:130` and unreachable until now
 *    only because of the prefix rule this phase dissolves. See the comment on
 *    the link itself for why it is not wrapped in a capability check.
 *
 * 4. **`AnimatedSection` — kept, from the admin file.** Cosmetic, and named as
 *    cosmetic so that nobody later reads it as a difference that meant
 *    something.
 *
 * ── What did NOT move ────────────────────────────────────────────────────────
 *
 * `actions.ts`, `CreateAccountForm.tsx` and `MemberActionNotice.tsx` stay at
 * `src/app/(admin)/admin/members/`, outside `(work)` — R-WORK-ROUTES, declared
 * in plan 34-07. They are not routes, so a route group gives them nothing,
 * while moving them would rewrite three import specifiers inside
 * `src/components/admin/MemberTable.tsx` — the surface that approves and
 * rejects members, and a file this plan does not own. Hence the absolute
 * specifier above rather than the `./CreateAccountForm` this page used to
 * carry: the edit is inside the page, which is where it belongs.
 *
 * Every cache-revalidation argument in `actions.ts` is likewise untouched —
 * sixteen calls, as six adjacent admin + organizer pairs and four lone admin
 * ones. Collapsing them is plan 34-16's, alone, because deleting the wrong
 * half of a pair is a one-character mistake with no detector and no error
 * tracking behind it. (The function's name is deliberately not spelled here:
 * an acceptance criterion greps this diff for it, and a comment that defeats a
 * criterion is a criterion nobody can run — plan 34-03's recorded lesson.)
 */

// Extract referrer name from Supabase join result
// The join may return a single object or an array depending on FK detection
function extractReferrerName(referrer: unknown): string | null {
  if (!referrer) return null;
  if (Array.isArray(referrer)) {
    const first = referrer[0] as { full_name?: string } | undefined;
    return first?.full_name || null;
  }
  return (referrer as { full_name?: string }).full_name || null;
}

export default async function MembersPage() {
  // Identity and reachability come from the session, not from three request
  // headers an attacker can set. Resolved once by `(work)/layout.tsx`, which
  // also mounts both navs; `getAccessContext` is `cache()`-scoped per request,
  // so asking again here for this page's own guard costs no second round trip.
  const { capabilities, userId } = await getAccessContext();

  // Defense in depth behind the middleware — and the SAME question the
  // middleware asks of `/admin/members`, of the same authority, because both
  // read the same entry in `src/lib/routes/capability-routes.ts` (D-34-09).
  // Never a role list.
  //
  // This is the organizer twin's own key, unchanged in meaning: what a row of
  // `profiles` may be read or written is decided by the row-level policies, and
  // every member action re-checks on its own. The middleware is UX; the RLS is
  // the boundary.
  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  // Fetch all profiles with referral data via self-referencing join
  const supabase = await createClient();
  const { data: rawMembers, error } = await supabase
    .from("profiles")
    .select(
      `id, email, full_name, role, status, membership_code, created_at, referred_by,
       referrer:profiles!referred_by(full_name)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    // The two branches of this page are mutually exclusive, so both may write
    // an `<h1>` and exactly one renders — §7.1's rule is about what the browser
    // gets, not about the count in the file.
    //
    // §11's error contract: the problem AND what to do. The second sentence is
    // added rather than inherited, because this repository has **no error
    // tracking** — nothing about this failure reaches a human anywhere else, so
    // a reader who is told only that something failed has been told nothing
    // they can act on.
    return (
      <PageShell width="wide">
        <header className="mb-6">
          <PageTitle>Members</PageTitle>
        </header>
        <Card role="alert" className="text-center">
          <p className="text-sm text-sem-crit">
            The member list could not be read: {error.message}
          </p>
          <p className="mt-2 text-xs text-muted">
            Nothing was changed. Reload the page; if it fails again, the
            database refused the read rather than the page failing to ask, and
            the code above is the diagnosis.
          </p>
        </Card>
      </PageShell>
    );
  }

  // Flatten the referrer join data
  const members = (rawMembers || []).map((m) => ({
    id: m.id,
    email: m.email,
    full_name: m.full_name,
    role: m.role as UserRole,
    status: m.status as UserStatus,
    membership_code: m.membership_code,
    created_at: m.created_at,
    referred_by: m.referred_by,
    referrer_name: extractReferrerName(m.referrer),
  }));

  // `wide` — `/admin/members` is on §4's CLOSED wide list, and it is the reason
  // that list exists: a surface whose primary object is a dense table. The
  // content stops widening at 1280px instead of running edge to edge at 1920,
  // and the shell owns that maximum, the gutter, the vertical rhythm and the
  // navigation clearance in both tiers. This page writes none of them.
  return (
    <PageShell width="wide">
      <AnimatedSection>
        <header className="mb-6">
          {/*
            The surface's own name, not the tree's. `<h1>Admin</h1>` was the
            prefix speaking; after D-34-02 the word `admin` in a URL no longer
            describes who is on it, and it certainly should not name a page an
            organizer opens. The vocabulary question beyond this belongs to
            phases 40/41 — and this is that phase: the title is the display
            role now, which is the only place in `src/` that names it.
          */}
          <PageTitle>Members</PageTitle>
          {/*
            The way into the register.

            D-11 records every act; without a way in, the recording is a table
            nobody opens. `community-membership.md`, gate *chi decide è
            tracciato*: the simplest path to let somebody in is the one that
            must be made VISIBLE — and it is this page that holds both of them,
            the create form and the approve buttons.

            The link is drawn unconditionally, and the reasoning is the same as
            the one written above the create form: this page already refused
            anybody without `organizer.access`, the register page re-asks for
            `register.read` on its own, and what may actually be READ is decided
            by `membership_acts_select_register_read`. A hidden link protects
            nothing; a shown link that leads to a refusal costs a redirect.

            One edge is handled here rather than tidied away. `register.read`
            carries `requires_approved = true` (D-19 of Phase 43, and that
            requirement is not negotiable), so a **pending** organizer reaching
            this page sees a link that leads to a refusal. That was already
            true on the master side, and it stays true: making the link
            conditional would be a navigation change with no matching server
            change — the inverse of STAFF-03, and worse, because a link that
            vanishes tells the holder of a granted capability that they do not
            hold it.
          */}
          {/* A finger target, not a line of text. It was a bare inline link
              with no height of its own; §6.1's floor applies to every
              interactive element with a label, and this one leads off the
              surface. It stays a link — middle-click and copy-address survive —
              and gains the minimum and the shared focus expression. */}
          <Link
            href="/admin/members/register"
            className={`mt-2 inline-flex min-h-11 items-center text-sm text-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-ink ${FOCUS_RING}`}
          >
            Membership acts &rarr;
          </Link>
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        {/*
          The creation surface, above the table.

          It is NOT gated again here, and that is deliberate rather than an
          omission: the page already refused anybody without `ORGANIZER_ACCESS`
          above, and the action itself re-asks for `STAFF_MANAGE` on every call.
          Hiding a control is not protecting an endpoint (`access-gating.md`,
          gate *coerenza navigazione/permessi*), so the authority is in
          `createAccount` and this mount is the affordance.

          It is mounted for an organizer because **D-20 of Phase 43 already
          says so** — *an organizer may create an account directly as
          organizer* — and because `createAccount` asks `staff.manage`, which
          an organizer holds. The ceiling of D-07 is untouched: neither master
          nor organizer may create or promote to `master`, and that is enforced
          in the action, not here.
        */}
        <CreateAccountForm />

        {/*
          `userId` is `string | null` from the resolver; the identity header
          this replaces was read as `headersList.get(...) || ""`. `?? ""` is
          the null handling here, chosen by reading the consumer, not guessed:

          `currentUserId` is used at ONE place — `MemberTable.tsx:173`,
          `if (member.id === currentUserId)` — to draw "--" instead of the
          actions cell on the viewer's OWN row. Its false branch grants a UI
          affordance, not a permission: the authoritative self-protection is
          server-side and independent of this prop
          (`admin/members/actions.ts:109` throws "Cannot change own role" on
          `memberId === user.id`, with `user` from `supabase.auth.getUser()`).

          So the `null == null` regression `ownsOrIsMaster` exists to prevent
          cannot arise here: `member.id` is a non-null `profiles` primary key,
          so neither `""` nor `null` ever equals it, and `===` does not coerce.
          `?? ""` therefore reproduces today's behaviour in every reachable
          case, including the degraded one where the migration has not been
          applied and `user_id` is absent on a real session. Both collapsed
          pages carried this same reading, independently, and reached the same
          conclusion; widening the prop would edit `MemberTable`, which this
          plan does not own.
        */}
        {/*
          `callerRole` is gone from this component since 2026-08-08. It was
          passed here as the LITERAL "master" — never a fact read from the
          session — and it decided one thing: whether the Deactivate and
          Reactivate controls were drawn. The owner decision that widened those
          two acts onto the same gate as the other four removed the question,
          and `MemberTable.tsx` says why the prop was deleted rather than left
          unused. The organizer twin recorded the same deletion from its side,
          which is why the two pages could merge without a behavioural choice
          being made here.
        */}
        <MemberTable
          members={members}
          currentUserId={userId ?? ""}
          showActions={true}
        />
      </AnimatedSection>
    </PageShell>
  );
}
