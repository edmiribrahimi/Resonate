"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function handleReset() {
    setStatus("loading");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      setStatus("error");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });

    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-sm text-green-400">
        Password reset email sent. Check your inbox.
      </div>
    );
  }

  return (
    <button
      onClick={handleReset}
      disabled={status === "loading"}
      className="w-full rounded-2xl border border-card-border bg-card p-5 text-left text-sm font-medium text-muted transition-all hover:border-accent/50 hover:text-foreground active:scale-[0.98] active:opacity-80 disabled:opacity-50"
    >
      {status === "loading" ? "Sending..." : status === "error" ? "Failed — try again" : "Reset Password"}
    </button>
  );
}
