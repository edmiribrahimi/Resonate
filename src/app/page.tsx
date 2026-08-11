import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import { getAccessContext } from "@/lib/capabilities/server";
import type { UserRole, UserStatus } from "@/types/database";

export default async function Home() {
  // Identity, role and status come from the session, not from a request header.
  const { userId, role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  // Logged-in users go straight to dashboard.
  //
  // This keys on `userId` where the header version keyed on `role`, and that
  // is what KEEPS the verdict rather than changing it. Under the header
  // transport `role` was a proxy for "authenticated":
  // `src/lib/supabase/middleware.ts:219-223` sets the role header if and only
  // if `user` exists, and its `?? "member"` fallback makes it truthy for
  // every signed-in caller — including one with no `profiles` row, a case that
  // file names explicitly (`middleware.ts:105-110`).
  //
  // `getAccessContext()` carries no such fallback. `my_access_context()` reads
  // `role` straight out of `public.profiles`
  // (`supabase/migrations/20260808000000_access_context_user_id.sql:130-132`),
  // so it is `null` for an authenticated caller with no profile row while
  // `user_id` — `auth.uid()` — is still theirs. Transcribing `if (role)`
  // literally would stop redirecting that caller and drop them on the public
  // landing page: a verdict change on a public surface, which CAP-05
  // criterion 4 forbids. `userId` is non-null exactly when the middleware's
  // `if (user)` was true, and it is `string | null`, never `""` (D-33-01-A),
  // so the test is exact rather than accidental.
  if (userId) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-16 px-6 pb-24 text-center">
        <Image
          src="/images/logo-white.png"
          alt="re:sonate"
          width={320}
          height={90}
          priority
        />

        <div className="flex w-full max-w-xs flex-col gap-4">
          <Link
            href="/events"
            className="flex h-12 items-center justify-center rounded-full bg-accent font-medium text-white transition-all hover:bg-accent-hover active:scale-95 active:opacity-80"
          >
            Discover Events
          </Link>
          <Link
            href="/register"
            className="flex h-12 items-center justify-center rounded-full border border-card-border font-medium transition-all hover:bg-card active:scale-95 active:opacity-80"
          >
            Join
          </Link>
          <Link
            href="/login"
            className="text-center text-sm text-muted transition-all hover:text-foreground active:scale-95 active:opacity-80"
          >
            Already a member? <span className="text-accent">Sign In</span>
          </Link>
        </div>
      </main>

      <MobileNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </div>
  );
}
