import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Resolve role and status from profiles table
  let role: string | null = null;
  let status: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    role = profile?.role ?? "member";
    status = profile?.status ?? "pending";
  }

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

    // /admin/scanner -> master OR organizer
    if (pathname.startsWith("/admin/scanner")) {
      if (role !== "master" && role !== "organizer") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
    // /admin/* (except scanner) -> master only
    else if (pathname.startsWith("/admin")) {
      if (role !== "master") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    // /organizer/* -> master OR organizer
    if (pathname.startsWith("/organizer")) {
      if (role !== "master" && role !== "organizer") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    // /membership-card, /attendance -> approved only
    if (
      pathname.startsWith("/membership-card") ||
      pathname.startsWith("/attendance")
    ) {
      if (status !== "approved") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  // --- Header injection ---
  // Create new request headers with role/status/id for downstream Server Components
  const requestHeaders = new Headers(request.headers);
  if (user) {
    requestHeaders.set("x-user-role", role ?? "member");
    requestHeaders.set("x-user-status", status ?? "pending");
    requestHeaders.set("x-user-id", user.id);
  }

  // Create response with injected headers
  const finalResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

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
