import { headers } from "next/headers";
import MobileNav from "@/components/layout/MobileNav";
import NewsletterForm from "@/components/newsletter/NewsletterForm";
import type { UserRole, UserStatus } from "@/types/database";

export default async function NewsletterPage() {
  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-24">
      <NewsletterForm />
      <MobileNav role={role} status={status} />
    </div>
  );
}
