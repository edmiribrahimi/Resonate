import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

/** Where a `next` value that is not on the list below ends up. */
const DEFAULT_NEXT = "/dashboard";

/**
 * The complete set of relative paths a `next` value may resolve to.
 *
 * ── Why this list exists at all ──────────────────────────────────────────────
 *
 * `next` arrives from a URL. It is attacker-controlled, and it is consumed
 * **after** `exchangeCodeForSession` — that is, after this request has minted a
 * session. An open redirect from an authenticated callback is not a cosmetic
 * defect: it is a phishing primitive aimed at exactly the people who hold the
 * most access, because the link that carries it is a link they were expecting.
 *
 * Concatenating with `origin` (what stood here) prevents a jump to another
 * host, and that is genuinely most of the risk — but it is not validation, it
 * is an accident of string building, and phase 43 adds a **second** parametric
 * redirect: plan 43-11 aims an invitation here through `generateLink`'s
 * `redirectTo`. `access-gating.md`'s gate *redirect validato* says every new
 * parametric redirect uses an allow-list of relative paths, so the pre-existing
 * one stops being somebody else's problem the moment a second one arrives.
 *
 * ── What is on the list, and why each entry ──────────────────────────────────
 *
 *   /dashboard          the default, and where every unrecognised value lands
 *   /set-password       what plan 43-04 built and what Reset Password now aims at
 *   /events/<slug>      produced by `?next=` on RsvpButton.tsx:35 and
 *                       TierSelection.tsx:224, forwarded through
 *                       register/page.tsx:45
 *   /events/<slug>/menu produced by GuestLoginBanner.tsx:42 and :138
 *
 * The slug charset is not a guess: `src/utils/slugify.ts:11-20` produces exactly
 * `[a-z0-9-]` and truncates at 80. Widening this pattern by hand would admit
 * path segments the product never generates.
 *
 * **Adding an entry is an access decision.** A pattern with a `.*` in it, or one
 * that does not anchor both ends, re-opens what this list closes.
 */
const NEXT_ALLOW_LIST: readonly RegExp[] = [
  /^\/dashboard$/,
  /^\/set-password$/,
  /^\/events\/[a-z0-9-]{1,80}$/,
  /^\/events\/[a-z0-9-]{1,80}\/menu$/,
];

/**
 * Resolve an inbound `next` to a path that is safe to put in a `Location`
 * header, and say whether a substitution happened.
 *
 * The guards below are redundant against the anchored patterns above — nothing
 * with a scheme, a backslash or a leading `//` can match them. They are written
 * out anyway, because they are what a future entry on that list is checked
 * against, and because each one names a concrete refusal:
 *
 *   `https://example.com`   an absolute URL — refused: no leading `/`
 *   `//example.com`         protocol-relative, the classic bypass — refused
 *   `%2F%2Fexample.com`     the same thing pre-encoded; `searchParams.get`
 *                           has already decoded it by the time it arrives here,
 *                           so it is refused by the same rule
 *   `/\example.com`         a backslash, which several browsers normalise to
 *                           `/` — refused
 *   `javascript:alert(1)`   a scheme — refused
 *   `/admin`                well-formed, same-origin, and simply not on the
 *                           list — refused, because an allow-list refuses by
 *                           default rather than by enumeration of what is bad
 */
function resolveNext(raw: string | null): { path: string; refused: boolean } {
  if (raw === null) return { path: DEFAULT_NEXT, refused: false };

  const wellFormed =
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.includes("\\") &&
    !raw.includes(":") &&
    // A CR, an LF or any other control character in a value bound for a
    // `Location` header is a response-splitting attempt. Written as escapes,
    // never as literal control bytes in this source file.
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f]/.test(raw);

  if (wellFormed && NEXT_ALLOW_LIST.some((pattern) => pattern.test(raw))) {
    return { path: raw, refused: false };
  }

  return { path: DEFAULT_NEXT, refused: true };
}

/**
 * The value `?master=` carries when the reconciliation did not do its job, one
 * value per cause. `null` means it ran and there is nothing to say.
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
      // value per cause. Its honest limit is identical to `?link=refused`'s and
      // to the middleware's `?access=unavailable`: **nothing renders it today**
      // (WR-04, deferred). The URL itself is the observable effect — which is
      // more than a `console.error` in a product with no error tracking, and
      // less than a notice. Rendering it belongs to whichever plan next touches
      // `/dashboard`.
      if (masterFlag) {
        destination.searchParams.set("master", masterFlag);
      }
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
