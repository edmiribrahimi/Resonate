import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import type { UserRole, UserStatus } from "@/types/database";

export default async function Home() {
  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  // Logged-in users go straight to dashboard
  if (role) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <Image
          src="/images/logo-white.png"
          alt="re:sonate"
          width={320}
          height={90}
          priority
          className="mb-4"
        />

        <div className="flex w-full max-w-xs flex-col gap-3">
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

      <MobileNav role={role} status={status} />
    </div>
  );
}
