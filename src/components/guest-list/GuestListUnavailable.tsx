/**
 * The guest list could not be READ. This is not an empty guest list.
 *
 * ── Why this component exists (CR-02) ────────────────────────────────────────
 *
 * Both guest-list surfaces used to fall through a failed `SELECT` into
 * `entries ?? []` and hand `[]` to `GuestListClient`, which renders its ordinary
 * empty state. "This event has no guests" and "I could not read the guest list"
 * then shared a pixel. This repository has **no error tracking**
 * (`meta-gates.md`), so the `console.error` above the fallthrough reached
 * nobody: the only human who could have noticed was the person holding the
 * phone, and the screen was telling them the opposite.
 *
 * `checkin-offline.md` fixes the asymmetry that makes this the worst place in
 * the product for a silent failure: admitting a duplicate is recoverable,
 * **refusing a valid guest happens in front of a queue** and is not. So the
 * failure gets a face of its own — a distinct colour, a distinct sentence, the
 * error category, and an explicit instruction NOT to refuse anyone on the
 * strength of this screen.
 *
 * Server component on purpose: it holds no state and must not enlarge the
 * client bundle of a surface used at the door on a bad connection.
 *
 * @param code  the database error category, shown so two different failures are
 *              two different reports rather than one shrug. Never parsed by
 *              anything — the *outcome* is decided by position at the call site.
 */
export default function GuestListUnavailable({ code }: { code: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
      <p className="text-sm font-semibold text-red-400">
        The guest list could not be loaded.
      </p>
      <p className="mt-2 text-sm text-foreground">
        This is <strong>not</strong> an empty guest list — the read failed. Do
        not turn anyone away on the strength of this screen.
      </p>
      <p className="mt-3 text-xs text-muted">
        Reload the page. If it fails again, check the guest in from the scanner
        or against the ticket, and report this code: <code>{code}</code>
      </p>
    </div>
  );
}
