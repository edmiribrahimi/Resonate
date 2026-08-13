import { Card } from "@/components/ui/Card";

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
 * ── What the conversion changed here, and what it deliberately did not ───────
 *
 * The shell is now the card primitive and the failing ink is the crit semantic,
 * which is the same move `(work)/members/page.tsx:126-135` already made on its
 * own failed read. **The raw red ground is gone rather than re-toned**: three
 * raw palette utilities stated the alarm with a fill, and §5's separation gives
 * that job to one ink token with a computed contrast (6.99 : 1 on the card
 * ground) instead of to a colour family with none.
 *
 * **Not changed: a single word of the copy, and `role="alert"` is added rather
 * than traded for the colour.** The sentences are the only thing standing
 * between a failed read and somebody at a door concluding the list is empty —
 * `41-UI-SPEC.md` §11 introduces no error string, and §12 says colour is never
 * the only channel. Losing the fill is therefore only safe because the words
 * and the assertive role carry it, which is why both are named here.
 *
 * @param code  the database error category, shown so two different failures are
 *              two different reports rather than one shrug. Never parsed by
 *              anything — the *outcome* is decided by position at the call site.
 */
export default function GuestListUnavailable({ code }: { code: string }) {
  return (
    <Card role="alert">
      <p className="text-sm font-semibold text-sem-crit">
        The guest list could not be loaded.
      </p>
      <p className="mt-2 text-sm text-ink">
        This is <strong>not</strong> an empty guest list — the read failed. Do
        not turn anyone away on the strength of this screen.
      </p>
      <p className="mt-3 text-xs text-muted">
        Reload the page. If it fails again, check the guest in from the scanner
        or against the ticket, and report this code: <code>{code}</code>
      </p>
    </Card>
  );
}
