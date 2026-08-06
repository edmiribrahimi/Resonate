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
      className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6"
    >
      <p className="text-sm font-medium text-red-300">{notice.title}</p>
      <p className="mt-1 text-xs text-muted">{notice.body}</p>
      {detail ? (
        <p className="mt-2 break-words font-mono text-[11px] text-muted">
          {detail}
        </p>
      ) : null}
    </div>
  );
}
