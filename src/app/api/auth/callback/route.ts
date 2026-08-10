import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { resolveNext } from "@/lib/routes/next-redirect";
import { Resend } from "resend";

/**
 * `NEXT_ALLOW_LIST`, `DEFAULT_NEXT` and `resolveNext` **stood here** until plan
 * 37-12. They now live in `src/lib/routes/next-redirect.ts`, unchanged: the four
 * patterns byte for byte, the five named refusals one by one, and the paragraph
 * on why the patterns are anchored.
 *
 * They moved because they acquired a second caller. `src/app/(auth)/login/
 * page.tsx` was writing `searchParams.get("next")` straight into
 * `window.location.href` — this defence's twin, with the defence missing.
 * **Copying** the list there would have produced two hand-maintained
 * allow-lists, and two hand-maintained allow-lists diverge at the first new
 * address: somebody adds a path to one, the other keeps refusing it, and the
 * two halves of the same product disagree about where a person may land.
 *
 * Nothing about this route changed. Same input, same verdict, same
 * `?link=refused` on a substitution — which matters more here than it reads,
 * because this is an authentication path and an extraction that moves a verdict
 * on one is not a refactoring.
 */

/**
 * The value `?master=` carries when the reconciliation did not do its job, one
 * value per cause.
 *
 * `null` means **no flag, no banner**, and it now covers two situations that are
 * both correct and are kept apart in the LOG rather than in the URL: the
 * reconciliation ran and there is nothing to say (`reconciled`, `unchanged`), or
 * it could not run because this deploy is ahead of its database — see
 * `SCHEMA_AHEAD_OF_DATABASE`. The second is an operator condition with its own
 * log category and its own loud observable effect elsewhere; what it is not is a
 * member's problem, and the member's dashboard is not where it belongs.
 *
 * There is no shared fallback string here on purpose. This project has a
 * recorded precedent for the opposite (`.planning/codebase/CONCERNS.md`: the
 * newsletter form drawing a network fault, a missing key and an
 * already-subscribed address as one sentence), and the whole point of reading
 * the outcome is being able to tell four different silences apart.
 */
type MasterFlag =
  /** `MASTER_EMAIL` is unset or empty — the reconciliation did not run. */
  | "unconfigured"
  /** It is set and is not an address — a half-pasted or truncated value. */
  | "malformed"
  /** It matches more than one account, so acting would mean guessing. */
  | "ambiguous"
  /** It matches no account — the incumbent keeps the master role. */
  | "unknown"
  /** The zero-master guard aborted: the configuration asks for a lockout. */
  | "refused"
  /** The call failed for any other reason. */
  | "unavailable";

/**
 * The custom SQLSTATE the zero-master guard raises
 * (`20260808004000_master_reconcile.sql`), so this file can tell that refusal
 * from any other raise **without parsing a message**. Next redacts a message in
 * a production build, and a message is not an interface.
 *
 * Honest limit, in the same terms 43-09 used for `P0002`: that a custom SQLSTATE
 * survives PostgREST and arrives as `error.code` at the JS client is an
 * **assumption**, not a measurement. The degradation is safe — if it does not
 * arrive, the branch below falls through to `unavailable`, so the failure is
 * still observable, only less precisely named.
 */
const ZERO_MASTERS_SQLSTATE = "RS001";

/**
 * The codes that mean **this deploy is ahead of its database**, and nothing
 * else.
 *
 * ── The window this closes, which is not hypothetical ────────────────────────
 *
 * The five migrations of phase 43 are applied BY HAND by the owner; pushing this
 * branch deploys the CODE automatically. The gap between the two operations is a
 * real interval on a real clock, and inside it `reconcile_master` does not exist
 * in the database this build is talking to. Before this constant, every member's
 * sign-in inside that window came back `?master=unavailable` and drew the amber
 * banner on `/dashboard` — a fault notice, addressed to 150 people who cannot
 * act on it, about an account that is not theirs, saying in as many words *"if
 * you are not that person, there is nothing for you to do"*.
 *
 * That is not a degradation, it is a defect with a wide audience. A deployment
 * that is ahead of its schema is an OPERATOR condition, and the person who can
 * end it is the one holding the migration queue.
 *
 *   PGRST202  PostgREST: the function is not in the schema cache — the label
 *             this project will actually meet, because the JS client speaks to
 *             PostgREST and not to Postgres.
 *   42883     PostgreSQL `undefined_function`, if the SQLSTATE reaches the
 *             client instead.
 *   42P01     PostgreSQL `undefined_relation` — the same statement about a table
 *             the function reads, for a half-applied queue.
 *
 * All three are recognised rather than only the first, for the reason 43-09 gave
 * about `P0002`: which label survives PostgREST is an ASSUMPTION here and not a
 * measurement, and recognising three costs nothing while recognising one would
 * leave the banner drawn on the label that actually arrives.
 *
 * ── WHY THIS IS NOT THE START OF DEFENSIVE ERROR-SWALLOWING ──────────────────
 *
 * `meta-gates.md` forbids collapsing distinct causes into one silence, and this
 * set exists to do the opposite of that. Everything OUTSIDE it keeps the banner
 * and its flag: `refused` (the zero-master guard aborted), `unavailable` (the
 * call failed for a reason nobody has named), and the four outcome flags. The
 * three codes here are the one cause that is (a) certain to be transient,
 * (b) certain to affect every member equally, and (c) not actionable by any of
 * them. They are separated OUT of `unavailable`, not folded INTO it, and they
 * carry their own log category so the two are never one line in a log either.
 */
const SCHEMA_AHEAD_OF_DATABASE = new Set(["PGRST202", "42883", "42P01"]);

/**
 * Reconcile who holds the master role against the deployment environment.
 *
 * ── Why this exists, and what it replaces ────────────────────────────────────
 *
 * What stood here promoted on every login and never demoted, so every past
 * master kept the role forever — an undeclared one-way switch, which
 * `meta-gates.md` treats as the most dangerous class of change. D-12 is the
 * explicit authorisation to make it two-way; the rule itself now lives, dated,
 * in the migration history, which is exactly what the promotion lacked.
 *
 * ── Four things about this call ──────────────────────────────────────────────
 *
 * 1. **Nothing from the request reaches it.** The single argument is
 *    `process.env.MASTER_EMAIL`, a deployment value. That matters more than it
 *    looks: plan 43-11 found and closed a live hole where a TypeScript union
 *    read as a ceiling on what a Server Action could receive, when the type is
 *    erased before the POST body is deserialised. There is no equivalent hole
 *    here, because there is no request-derived input on this path at all — the
 *    only such value in this file is `next`, and it is allow-listed above.
 *    `access-gating.md`, gate *service role*: the service client is used here,
 *    and no untrusted input reaches it.
 *
 * 2. **The value is trimmed and lower-cased before it leaves.** `MEMORY.md`
 *    records a trailing newline on a sibling Vercel variable
 *    (`NEXT_PUBLIC_APP_URL`) breaking the SumUp webhook. The function trims and
 *    lower-cases again on its own side, and compares `lower(trim(...))` on both
 *    sides of the address — the house style of
 *    `20260310000000_guest_list.sql:116`. Doing it twice is not redundancy: the
 *    function must hold the property for any caller, and this caller must not
 *    depend on it holding.
 *
 * 3. **It runs on every login, and that is what makes the repair true** rather
 *    than true-when-the-right-person-signs-in. It is one round trip, on the
 *    callback route only — **not** the middleware, so it is nowhere near the
 *    door's path (`middleware.ts` matches `/api/*`; this handler does not run
 *    on those requests). The next reader will ask; that is the answer.
 *
 * 4. **It writes only when something is actually wrong.** Both writes inside the
 *    function sit behind predicates that are empty in the steady state, so an
 *    unchanged product logging in twice a day produces **no** register rows. A
 *    register that gained two rows a day forever would be unreadable, which is
 *    the same failure as it being empty.
 *
 * ── The result is read. That is the whole point of this function ─────────────
 *
 * The code this replaces discarded it — no `error`, no `.select()` — so a failed
 * promotion was invisible, and with no error tracking in this product
 * (`meta-gates.md`) invisible means nobody ever knows. The failure that silence
 * hid is specific: *the master was silently never promoted, and after D-12
 * silently never demoted either, so the old master keeps the role.*
 */
async function reconcileMaster(): Promise<MasterFlag | null> {
  const configured = (process.env.MASTER_EMAIL ?? "").trim().toLowerCase();

  const { data, error } = await getServiceClient().rpc("reconcile_master", {
    p_email: configured,
  });

  if (error) {
    // `code` and `message` only. **Never the error object and never
    // `error.details`**, which on a CHECK violation against `profiles` carries
    // the ENTIRE failing row — uuid, address, full name and the membership
    // code, which is the door's only credential (43-01, finding 1).
    const { code, message } = error as {
      code?: string | null;
      message?: string | null;
    };

    // The deploy is ahead of its database. A NO-OP, with its OWN category — and
    // deliberately no flag, so no member is shown a fault they are not the
    // audience for and cannot end. See `SCHEMA_AHEAD_OF_DATABASE` above.
    //
    // The honest limit, said rather than implied: this repository has no error
    // tracking (`meta-gates.md`, verified 2026-08-05), so this log line reaches
    // nobody on its own. It does not have to. The state it describes is ALREADY
    // observable to the only person who can act on it, loudly and by a different
    // route: until the queue is applied, every act on `/admin/members` answers
    // `write_failed` with its own notice, because `record_membership_act` is
    // missing from the same database — and `/admin/members/register` is empty.
    // The operator meets the failure the first time they try to do their job.
    // What this branch removes is the audience that could do nothing about it.
    if (code && SCHEMA_AHEAD_OF_DATABASE.has(code)) {
      console.error(
        `[auth.reconcile_master.schema_absent] reconcile_master is not in this ` +
          `database — code=${code}. The deploy is ahead of its migration queue: ` +
          `apply the phase 43 migrations. Nobody was promoted, nobody was ` +
          `demoted, and no member was shown a notice.`
      );
      return null;
    }

    console.error(
      `[auth.reconcile_master] refused code=${code ?? "none"} ${message ?? ""}`
    );
    return code === ZERO_MASTERS_SQLSTATE ? "refused" : "unavailable";
  }

  // `.rpc()` is untyped in this repository — no Supabase client here is
  // parameterised with `Database` (`src/types/database.ts`) — so this shape is
  // narrowed at runtime rather than trusted. The value comes from the database
  // and not from a request, so this is defensive rather than a boundary.
  const outcome =
    typeof data === "object" && data !== null && "outcome" in data
      ? (data as { outcome: unknown }).outcome
      : null;

  switch (outcome) {
    // The two silent outcomes. `unchanged` is the common case on every login.
    // `reconciled` is deliberately silent too: a demotion's observable effect is
    // its row in `public.membership_acts`, which is the right place for it —
    // flagging it on the redirect of some unrelated person's login would put an
    // administrative event in front of somebody it is not about.
    case "reconciled":
    case "unchanged":
      return null;

    case "unset":
      console.error(
        "[auth.reconcile_master] MASTER_EMAIL is unset or empty — nobody promoted, nobody demoted"
      );
      return "unconfigured";

    case "malformed":
      console.error(
        "[auth.reconcile_master] MASTER_EMAIL is not an address — nobody promoted, nobody demoted"
      );
      return "malformed";

    case "ambiguous":
      console.error(
        "[auth.reconcile_master] MASTER_EMAIL matches more than one account — refusing to guess which"
      );
      return "ambiguous";

    case "no_such_account":
      console.error(
        "[auth.reconcile_master] MASTER_EMAIL names no account — the incumbent keeps the role"
      );
      return "unknown";

    default:
      // An outcome this file does not know is a migration and a route that have
      // drifted apart. Named as its own case rather than folded into success.
      console.error(
        `[auth.reconcile_master] unrecognised outcome=${String(outcome)}`
      );
      return "unavailable";
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const { path: next, refused: nextRefused } = resolveNext(
    searchParams.get("next")
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Deliberately outside the `if (user)` below. The reconciliation is about
      // the account the deployment environment names, not about whoever just
      // signed in, so making an administrative repair depend on an unrelated
      // `getUser()` succeeding would be tying two things that are not related.
      const masterFlag = await reconcileMaster();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Auto-subscribe to newsletter (fire-and-forget)
        if (user.email && process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          resend.contacts.create({
            email: user.email,
            audienceId: process.env.RESEND_AUDIENCE_ID,
          }).catch(() => {});
        }
      }

      // The substitution is not silent. `next` is already known-safe here, so
      // the URL is built rather than concatenated, and a refused value carries
      // a flag in the same shape `src/lib/supabase/middleware.ts:137-139` uses
      // for its own degraded path (`?access=unavailable`).
      //
      // Its honest limit, stated rather than implied: nothing renders `?link=refused`
      // today, exactly as nothing renders `?access=unavailable` (WR-04, deferred).
      // The URL itself is the observable effect — which is more than a log line
      // in a product with no error tracking (`meta-gates.md`), and less than a
      // notice. A person holding a broken link can see that they did not arrive
      // where the link said; they are not told why.
      const destination = new URL(next, origin);
      if (nextRefused) {
        destination.searchParams.set("link", "refused");
      }
      // The reconciliation's failure is observable in the same shape, with one
      // value per cause.
      //
      // A note this file carried is now WRONG and is corrected rather than left
      // to mislead: it said *"nothing renders it today"*. It does.
      // `dashboard/page.tsx:317-335` draws an amber banner on the PRESENCE of
      // this parameter, and has since it was introduced. That is precisely why
      // `reconcileMaster` no longer returns a flag when the function is simply
      // absent from the database (WR-05): a flag set here is a banner shown to
      // whoever just signed in, and during the window between deploying this
      // build and applying its migrations that is every member, every login.
      if (masterFlag) {
        destination.searchParams.set("master", masterFlag);
      }
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
