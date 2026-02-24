import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MembershipCardView from "@/components/membership/MembershipCardView";
import MobileNav from "@/components/layout/MobileNav";

export default async function MembershipCardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const fullName = user.user_metadata?.full_name || "Membro";

  // TODO: fetch membership_code from profiles table
  const membershipCode = "RSN-DEMO1234";

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Membership Card</h1>
      </header>

      <div className="px-6">
        <MembershipCardView
          fullName={fullName}
          membershipCode={membershipCode}
          memberSince={user.created_at}
        />

        <div className="mt-6 rounded-2xl border border-card-border bg-card p-5">
          <h2 className="mb-2 font-semibold">Come usare la card</h2>
          <ol className="list-inside list-decimal text-sm text-muted leading-relaxed">
            <li>Mostra il QR code all&apos;ingresso dell&apos;evento</li>
            <li>Lo staff scannerizzerà il codice</li>
            <li>La tua presenza verrà registrata automaticamente</li>
          </ol>
        </div>

        <div className="mt-4">
          <button className="w-full rounded-full border border-card-border py-3 text-sm font-medium transition-colors hover:bg-card">
            Aggiungi a Apple/Google Wallet
          </button>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
