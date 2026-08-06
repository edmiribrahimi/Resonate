import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CAP } from "@/lib/capabilities/keys";

/**
 * Set on the RESPONSE when the access context could not be resolved.
 *
 * This project has no error tracking — no monitoring dependency in
 * `package.json` — so a `console.error` goes to a log nobody watches. On a
 * failure the four rules below fail closed to exactly today's verdicts, which
 * means the user sees an ordinary bounce to `/dashboard` and cannot tell an
 * infrastructure fault from a permissions refusal. This header is the
 * difference: it rides every response the middleware produces on the degraded
 * path, redirects included, so the failure is *observable* and not merely
 * logged (`meta-gates.md`, zero fallimenti silenziosi; D-28).
 *
 * It is never read. Nothing downstream branches on it, and the inbound copy is
 * deleted with the three `x-user-*` names below for the reason recorded there:
 * an inbound header is attacker-supplied input.
 */
const CAPABILITY_DIAGNOSTIC_HEADER = "x-capabilities-resolve-failed";

export async function updateSession(request: NextRequest) {
  // Track cookies set by Supabase so we can re-apply them after creating
  // the final response with injected headers
  let pendingCookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
            // Track for re-application after header injection
            pendingCookies.push({ name, value, options: options as Record<string, unknown> });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Resolve the access context from the ONE definition — the same
  // private.has_capability() the row-level policies ask, reached through the
  // one exposed wrapper. This replaces the profiles.select("role, status")
  // that stood here: same number of round trips, not one more (D-05). The
  // matcher includes /api/*, so this path runs before every door scan, and a
  // second query here would be a second query on a phone on a bad network in
  // front of a queue.
  //
  // The call stays INSIDE `if (user)` deliberately: public.my_access_context()
  // is granted to `authenticated` and revoked from `anon`, so an anonymous
  // request must not call it at all rather than call it and be refused.
  //
  // `role` and `status` survive as values only because the header-injection
  // block below still needs them — 46 files read x-user-role / x-user-status,
  // and replacing that transport is a later phase. No decision here reads them.
  let role: string | null = null;
  let status: string | null = null;
  let capabilities = new Set<string>();
  let capabilitiesResolveFailed = false;

  if (user) {
    const { data, error } = await supabase.rpc("my_access_context");

    if (error) {
      // The old code discarded this error and silently defaulted to
      // member/pending. The DEFAULTS are preserved below, because CAP-03
      // requires every verdict to be the one it was — but the SILENCE is not.
      capabilitiesResolveFailed = true;
      console.error(
        `[capabilities.resolve_failed] middleware could not resolve the access ` +
          `context for ${request.nextUrl.pathname} — code=${error.code ?? "unknown"}. ` +
          `Failing closed to member/pending with no capabilities: every ` +
          `capability-gated route now bounces to /dashboard.`
      );
    }

    const context = data as {
      capabilities?: unknown;
      role?: string | null;
      status?: string | null;
    } | null;

    // The same `?? "member"` / `?? "pending"` defaults, in the same place. An
    // authenticated user with no profile row is still a pending member, and
    // the capability set for that subject is the empty set — which produces
    // the same verdict on all four rules by a different mechanism.
    role = context?.role ?? "member";
    status = context?.status ?? "pending";
    capabilities = new Set(
      Array.isArray(context?.capabilities)
        ? (context.capabilities as string[])
        : []
    );
  }

  // The bounce, which is the same three lines the four rules each wrote
  // inline, plus the diagnostic header on the degraded path. It is one
  // function rather than four copies precisely because of that header: a
  // failure that is observable on the final response but not on the four
  // redirects would be invisible on exactly the requests it breaks.
  const bounceToDashboard = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const response = NextResponse.redirect(url);
    if (capabilitiesResolveFailed) {
      response.headers.set(CAPABILITY_DIAGNOSTIC_HEADER, "1");
    }
    return response;
  };

  // --- Route protection ---

  // Protected routes requiring authentication
  const protectedPrefixes = [
    "/dashboard",
    "/membership-card",
    "/attendance",
    "/admin",
    "/organizer",
  ];

  if (!user) {
    // Unauthenticated: redirect from protected routes to login
    if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  } else {
    // Authenticated: enforce role-based access

    // The ordering below is load-bearing and is NOT a lookup table on purpose.
    // /admin/scanner is tested BEFORE the general /admin branch, as an
    // if / else if pair: invert them and /admin/scanner matches
    // startsWith("/admin") first, is judged by admin.access, and every
    // organizer is locked out of the door — the refusal that happens in front
    // of a queue. The two rules that follow are SEPARATE `if` statements, not
    // a continuation of that chain: a request that fell through the /admin
    // pair is still tested against both.

    // /admin/scanner -> door.operate (role alone: door.operate is granted with
    // requires_approved = false, deliberately, so a pending organizer is not
    // refused at the door)
    if (pathname.startsWith("/admin/scanner")) {
      if (!capabilities.has(CAP.DOOR_OPERATE)) {
        return bounceToDashboard();
      }
    }
    // /admin/* (except scanner) -> admin.access (granted to master alone)
    else if (pathname.startsWith("/admin")) {
      if (!capabilities.has(CAP.ADMIN_ACCESS)) {
        return bounceToDashboard();
      }
    }

    // /organizer/* -> organizer.access (master or organizer, status ignored)
    if (pathname.startsWith("/organizer")) {
      if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
        return bounceToDashboard();
      }
    }

    // /membership-card, /attendance -> membership.card.view (granted to all
    // three roles with requires_approved = true, which is `status =
    // 'approved'` for any role — the predicate this replaces)
    if (
      pathname.startsWith("/membership-card") ||
      pathname.startsWith("/attendance")
    ) {
      if (!capabilities.has(CAP.MEMBERSHIP_CARD_VIEW)) {
        return bounceToDashboard();
      }
    }
  }

  // --- Header injection ---
  // Create new request headers with role/status/id for downstream Server Components
  const requestHeaders = new Headers(request.headers);

  // An inbound x-user-* header is attacker-supplied input: the client can send
  // whatever it likes. These are cleared unconditionally BEFORE the branch
  // below, because a request that is not authenticated used to carry the
  // client's own value straight through to the Server Components and server
  // actions that read it — including the SumUp refund path, which gates on
  // x-user-role and then uses a service-role client that bypasses every RLS
  // policy. Only this middleware may set them.
  requestHeaders.delete("x-user-role");
  requestHeaders.delete("x-user-status");
  requestHeaders.delete("x-user-id");
  // Same reason, one header later: the diagnostic below is only ever set on a
  // RESPONSE. An inbound copy is attacker-supplied input, and a client that
  // could assert "the capability lookup failed" to a downstream reader would be
  // handing it a forged excuse.
  requestHeaders.delete(CAPABILITY_DIAGNOSTIC_HEADER);

  if (user) {
    requestHeaders.set("x-user-role", role ?? "member");
    requestHeaders.set("x-user-status", status ?? "pending");
    requestHeaders.set("x-user-id", user.id);
  }

  // Create response with injected headers
  const finalResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // The degraded path, made visible on the responses that are not redirects.
  if (capabilitiesResolveFailed) {
    finalResponse.headers.set(CAPABILITY_DIAGNOSTIC_HEADER, "1");
  }

  // Re-apply all Supabase cookies to the final response (cookie preservation)
  // Without this, users would be logged out on every navigation because the
  // new response object loses the cookies set by Supabase's setAll callback
  for (const cookie of pendingCookies) {
    finalResponse.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  // Also copy any cookies from the supabaseResponse that may have been set
  // during the initial auth flow (before pendingCookies tracking)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    if (!pendingCookies.some((pc) => pc.name === cookie.name)) {
      finalResponse.cookies.set(cookie.name, cookie.value);
    }
  });

  return finalResponse;
}
