"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Begin a credential reset for the signed-in account.
 *
 * ── The act is untouched ─────────────────────────────────────────────────────
 *
 * The shell and the control converted; **the reset target did not**. The
 * redirect below still aims at the callback with the same `next` parameter, for
 * the reason the comment inside `handleReset` gives — and that comment is kept
 * whole rather than trimmed, because it is the record of a loop this button
 * once created and the thing that stops it being "simplified" back.
 *
 * ── The success box is an announced region, not a green card ─────────────────
 *
 * It carried a green-family border, ground and ink. The set contains **no
 * green** and Phase 40 did not invent one (`globals.css:169-173`), so the
 * confirmation takes `--sem-done` as ink inside the card shell, and it is
 * `role="status"` so it is announced rather than merely coloured.
 *
 * ── A refusal that names one cause for two, recorded and NOT reworded ────────
 *
 * `status === "error"` is reachable two ways — the account has no address on
 * it, and the provider refused to send — and both draw the same four words. It
 * is recorded in this plan's findings at its two line numbers and carried
 * forward rather than rewritten here: rewording a refusal is changing what a
 * person reads, which is not this pass's remit. It matters more than it looks
 * because this repository has **no error tracking**: a cause that is not
 * distinguishable on screen is not distinguishable anywhere.
 */
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

    // The loop this cures, so nobody restores the old value as a
    // simplification: until now this link pointed at `/dashboard`. Following it
    // signed the person in and put them on a page with **no password field** —
    // and the only remedy offered there was this same button, sending the same
    // link back to the same place. `supabase.auth.updateUser({ password })`
    // existed nowhere in `src/` (D-23), so "Reset Password" could not reset a
    // password.
    //
    // It aims at the callback rather than straight at `/set-password` because
    // the callback is what exchanges the code for a session
    // (`src/app/api/auth/callback/route.ts`); landing directly on the surface
    // would land there with no session. `next=/set-password` is on that route's
    // allow-list.
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/set-password`,
    });

    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <Card>
        <p role="status" className="text-sm text-sem-done">
          Password reset email sent. Check your inbox.
        </p>
      </Card>
    );
  }

  return (
    <Button
      variant="secondary"
      onClick={handleReset}
      disabled={status === "loading"}
      className="w-full justify-start"
    >
      {status === "loading" ? "Sending..." : status === "error" ? "Failed — try again" : "Reset Password"}
    </Button>
  );
}
