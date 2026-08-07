import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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
      const serviceClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if user should be promoted to master
        const masterEmail = process.env.MASTER_EMAIL;
        if (masterEmail && user.email === masterEmail) {
          await serviceClient
            .from("profiles")
            .update({ role: "master", status: "approved" })
            .eq("id", user.id);
        }

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
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
