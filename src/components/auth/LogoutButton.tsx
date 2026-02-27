"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-2xl border border-card-border bg-card p-5 text-sm font-medium text-red-400 transition-all hover:border-red-400/50 hover:bg-red-400/10 active:scale-[0.98] active:opacity-80 w-full text-left"
    >
      Log out
    </button>
  );
}
