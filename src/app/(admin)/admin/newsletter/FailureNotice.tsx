import type { NewsletterFailure } from "./actions";

/**
 * The rendered half of CR-01's fix.
 *
 * A newsletter action can fail for two reasons that look identical from the
 * outside and want opposite responses: the **permission lookup** failed (the
 * database could not answer who is asking — an infrastructure fault), or the
 * **provider** failed (Resend or its configuration). Before this component the
 * first was drawn as an empty broadcast list and as *"Newsletter not configured
 * — set RESEND_API_KEY"*, which sends the operator to the wrong system.
 *
 * This project has no error tracking (`meta-gates.md`, verified 2026-08-05), so
 * a log line reaches nobody on its own. The observable effect is therefore this
 * banner, and its whole job is to keep the causes apart. Never add a shared
 * fallback string here: collapsing distinct causes into one message is the
 * recorded newsletter anti-pattern (`.planning/codebase/CONCERNS.md`) that CR-01
 * found recreated.
 *
 * `transport_unavailable` is the client-only third case — the action never
 * returned at all, so there is no tag to read.
 *
 * ── Converted by plan 41.1-06, and what the conversion did NOT do ────────────
 *
 * The class strings moved to the token system; **the three copy blocks below
 * are untouched, byte for byte.** §11 says of the confirmations it converts
 * *"none introduced"*, and the same restraint applies to a message whose
 * wording is not a visual plan's to change. That matters more here than
 * anywhere else in this surface, because the whole point of this component is
 * that the three causes stay apart — a conversion that "tidied" them towards
 * one sentence would recreate `CONCERNS.md`'s recorded defect while looking
 * like a styling commit.
 *
 * **The finding this plan carries forward rather than fixes.** The three kinds
 * here are distinguished and the copy is good. What is NOT covered by them is
 * the fourth cause: `provider_unavailable` is one tag for every way Resend can
 * fail — a missing key, a rejected key, a rate limit and an address already
 * subscribed all arrive with the same title and the same instruction to check
 * two environment variables. That is a narrower version of the same
 * collapsed-cause shape, it lives in `actions.ts` and not here, and widening
 * this plan to split it would have put a behavioural change inside a
 * conversion commit. Recorded in the plan's summary, not silently repaired.
 *
 * ── Tone comes from the ink, not from a fill ─────────────────────────────────
 *
 * The incumbent drew a red-tinted box with a raw palette family. The two error
 * regions this system has already built — `Dialog.tsx:316-322` and the field
 * error inside `Input.tsx:183-187` — both carry the critical semantic as
 * **ink**, on the ordinary container ground, with `role="alert"` doing the
 * announcing. This follows them: the boundary and the title take `--sem-crit`
 * (6.99 : 1 on the surface ground), the ground stays the ordinary surface, and
 * no opacity modifier is stacked on a token — a second border colour appended
 * after the first would depend on Tailwind's emission order, which is the trap
 * WR-05 recorded in this same phase family.
 */
export type NoticeKind = NewsletterFailure | "transport_unavailable";

const NOTICES: Record<NoticeKind, { title: string; body: string }> = {
  capabilities_unavailable: {
    title: "Permission lookup failed — this is not a refusal",
    body:
      "The database could not answer which capabilities this session holds, so " +
      "nothing here could be loaded. This is an infrastructure fault, not a " +
      "statement about your permissions, and an empty area below is not an " +
      "empty result. Check that the capability model migration is applied and " +
      "that EXECUTE on public.my_access_context() is still granted to " +
      "authenticated.",
  },
  provider_unavailable: {
    title: "The newsletter provider did not answer",
    body:
      "The permission check passed. Resend, or its configuration, failed — so " +
      "this could not be loaded, and what you see below is not the truth about " +
      "your broadcasts. Check RESEND_API_KEY and RESEND_AUDIENCE_ID.",
  },
  transport_unavailable: {
    title: "The server did not answer",
    body:
      "The request did not complete, so nothing was loaded. This is a transport " +
      "failure — it says nothing about your permissions or about Resend. " +
      "Retrying is reasonable.",
  },
};

export default function FailureNotice({
  kind,
  detail,
}: {
  kind: NoticeKind;
  detail?: string;
}) {
  const notice = NOTICES[kind];

  return (
    <div
      role="alert"
      className="rounded-2xl border border-sem-crit bg-surface p-6"
    >
      <p className="text-sm font-semibold text-sem-crit">{notice.title}</p>
      <p className="mt-1 text-xs text-muted">{notice.body}</p>
      {detail ? (
        <p className="mt-2 break-words font-mono text-xs text-muted">
          {detail}
        </p>
      ) : null}
    </div>
  );
}
