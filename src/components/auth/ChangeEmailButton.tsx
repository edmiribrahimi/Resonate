"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

/**
 * Change the address this account is reachable at.
 *
 * ── What was converted, and what was deliberately not touched ────────────────
 *
 * The shell, the controls and the two hand-rolled status boxes converted. **The
 * act did not.** `supabase.auth.updateUser` below is called with exactly the
 * argument it was called with before — the trimmed address and nothing else —
 * because what a person can do to their own account is `access-gating.md`
 * territory and a visual pass touches the control, never the act.
 *
 * ── The two boxes are gone rather than recoloured ────────────────────────────
 *
 * They carried a green-family border, ground and ink for the success and a red
 * ink for the failure. They are now **announced regions in the semantic
 * tokens** — `role="status"` for the confirmation, `role="alert"` for the
 * refusal, the shape `venues/EditVenueButton.tsx:36-45` states for a dialog and
 * `(auth)/login/page.tsx:170-174` states for a control that is not inside one.
 * The refusal here reaches the person through the input primitive's own error
 * region, which is what binds it to the field with `aria-describedby` instead
 * of leaving it a loose sentence beside it.
 *
 * **The sentences themselves are untouched, to the byte.** The failure is still
 * whatever the provider said, not a bucket: this repository has **no error
 * tracking**, so what is on screen is the whole of what anybody will ever
 * learn, and collapsing two causes into one word here would be the newsletter
 * defect recorded in `.planning/codebase/CONCERNS.md`.
 *
 * The field takes its accessible name from `aria-label` rather than a visible
 * label, because a visible label would be **new copy** on a surface this pass
 * is not allowed to reword. The primitive requires one or the other by type,
 * and adopting a primitive does not authorise declining the contract it
 * imposes.
 */
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
      <Card>
        <p role="status" className="text-sm text-sem-done">
          Confirmation email sent to <span className="font-medium">{newEmail.trim()}</span>. Check your inbox to confirm the change.
        </p>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        className="w-full justify-start"
      >
        Change Email
      </Button>
    );
  }

  return (
    <Card className="space-y-3">
      <p className="text-sm font-medium text-ink">Change Email</p>
      <Input
        id="change-email"
        aria-label="New email address"
        type="email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        placeholder="New email address"
        error={errorMsg || undefined}
      />
      <div className="flex gap-2">
        <Button
          onClick={handleChange}
          disabled={status === "loading" || !newEmail.trim()}
        >
          {status === "loading" ? "Sending..." : "Confirm"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => { setOpen(false); setNewEmail(""); setStatus("idle"); setErrorMsg(""); }}
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
}
