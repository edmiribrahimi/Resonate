import MobileNav from "@/components/layout/MobileNav";
import NewsletterForm from "@/components/newsletter/NewsletterForm";
import { getAccessContext } from "@/lib/capabilities/server";
import type { UserRole, UserStatus } from "@/types/database";

export default async function NewsletterPage() {
  // Role and status come from the session, not from a request header.
  // Nothing on this page gates on either: both are handed to MobileNav, a
  // "use client" component that cannot import the resolver. Converting the nav
  // itself to consume capabilities is phase 34 (STAFF-03).
  const { role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-24">
      <NewsletterForm />
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
