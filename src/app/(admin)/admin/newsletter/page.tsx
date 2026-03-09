import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MobileNav from "@/components/layout/MobileNav";
import StaffNav from "@/components/staff/StaffNav";
import type { UserRole, UserStatus } from "@/types/database";
import { getSubscriberStats } from "./actions";
import NewsletterClient from "./NewsletterClient";

export default async function AdminNewsletterPage() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  if (role !== "master") {
    redirect("/dashboard");
  }

  let stats: { total: number } | null = null;
  let configError: string | null = null;

  try {
    stats = await getSubscriberStats();
  } catch (err) {
    configError = err instanceof Error ? err.message : "Failed to load stats";
  }

  return (
    <div className="min-h-dvh pb-24">
      <div className="px-6 pt-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Admin</h1>
      </div>
      <StaffNav role={role} context="admin" />

      <div className="px-6">
        {configError ? (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
            <p className="text-sm font-medium text-yellow-400">
              Newsletter not configured
            </p>
            <p className="mt-1 text-xs text-muted">
              {configError}. Set RESEND_API_KEY and RESEND_AUDIENCE_ID in your
              environment variables.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-6 rounded-2xl border border-card-border bg-card p-6">
              <p className="text-sm text-muted">Total Subscribers</p>
              <p className="text-3xl font-bold tracking-tight">
                {stats?.total ?? 0}
              </p>
            </div>

            <NewsletterClient />
          </>
        )}
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
