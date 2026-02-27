"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangeEmailButton() {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleChange() {
    const trimmed = newEmail.trim();
    if (!trimmed) return;

    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: trimmed });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-sm text-green-400">
        Confirmation email sent to <span className="font-medium">{newEmail.trim()}</span>. Check your inbox to confirm the change.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-card-border bg-card p-5 text-left text-sm font-medium text-muted transition-all hover:border-accent/50 hover:text-foreground active:scale-[0.98] active:opacity-80"
      >
        Change Email
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 space-y-3">
      <p className="text-sm font-medium text-foreground">Change Email</p>
      <input
        type="email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        placeholder="New email address"
        className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
      />
      {errorMsg && (
        <p className="text-sm text-red-400">{errorMsg}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleChange}
          disabled={status === "loading" || !newEmail.trim()}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 active:opacity-80 disabled:opacity-50"
        >
          {status === "loading" ? "Sending..." : "Confirm"}
        </button>
        <button
          onClick={() => { setOpen(false); setNewEmail(""); setStatus("idle"); setErrorMsg(""); }}
          className="rounded-full border border-card-border px-5 py-2 text-sm font-medium text-muted transition-all hover:text-foreground active:scale-95 active:opacity-80"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
