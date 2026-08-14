"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

/**
 * End the session.
 *
 * ── Why this is NOT the destructive rung ─────────────────────────────────────
 *
 * It was drawn in the red family — a critical-family ink, and a border and
 * ground of the same family on hover. It is now `secondary`, and that is a
 * decision rather than a token substitution.
 *
 * **The destructive rung is for acts that destroy.** Signing out destroys
 * nothing: the account, its tickets and its uploads are all exactly where they
 * were, and the act is undone by signing back in. Painting it in the critical
 * semantic would spend, on a reversible act, the one colour this system has for
 * telling somebody that what they are about to do cannot be taken back — and a
 * warning that appears on things that are fine is a warning nobody reads on the
 * one thing that is not.
 *
 * ── The act is untouched ─────────────────────────────────────────────────────
 *
 * `signOut()`, then the same destination and the same refresh. What happens
 * after a session ends is `access-gating.md` territory; this pass changed the
 * control and nothing it calls.
 */
export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      variant="secondary"
      onClick={handleLogout}
      className="w-full justify-start"
    >
      Log out
    </Button>
  );
}
