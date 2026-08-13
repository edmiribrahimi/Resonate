"use client";

import { useCallback, useEffect, useState } from "react";
import RevealVenueDialog, {
  describeRefusal,
  type RevealDialogMode,
} from "@/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog";
import {
  getVenueRevealState,
  type VenueRevealLastAct,
  type VenueRevealStateResult,
} from "@/app/(admin)/admin/events/[id]/reveal/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";
import type { VenueRevealAct } from "@/types/database";
import { formatDateTime } from "@/utils/formatTime";

/**
 * One button, three states, one position — and the trace beside it.
 *
 * ── There is no analog for this in the repository, so it is designed ─────────
 *
 * Measured before writing. The nearest thing is `FormatsCatalogue.tsx:295-305`,
 * a button disabled **because it is busy** (`disabled={listingBusy === …}`).
 * That is not this: here the button goes out because the act **has already been
 * performed, by somebody, at a moment**, and it says so. Nothing in `src/`
 * changes a button's TEXT on a residual count either, and nothing renders a
 * record of who did what next to the control that did it. The dialog wiring —
 * a target in state, `onDone` reloading — is copied from that file. The state
 * machine is not.
 *
 * ── What plan 41.1-20 changed here, and what it deliberately did not ─────────
 *
 * Changed: the container is the shared card, the trace heading is the shared
 * section heading, the three controls are the shared pill, and the four
 * raw-palette sentences are semantic ink. The failed-read notice loses its
 * tinted box and keeps its alert role on the sentence itself — a box around one
 * sentence is a container that states nothing its content does not
 * (`Dialog.tsx:180-193`), and the sentence is what a person reads either way.
 *
 * The outer element goes from a `<section>` to the card's `<div>`. **That
 * removes nothing from the accessibility tree**: a `section` becomes a `region`
 * landmark only when it carries an accessible name, and this one never did — no
 * label, no `aria-labelledby`. Adding one now would be adding a landmark this
 * surface does not have, which is a change and not a conversion.
 *
 * Not changed, and each for a reason older than this conversion: **which state
 * the button is in, when it is offered at all, what it says, what the panel does
 * when the read fails, and every sentence a person reads.** The three
 * paragraphs below are the properties a conversion may not touch, and they are
 * behaviour rather than appearance.
 *
 * ── The three states, and why they share one position (D-37-19, D-37-20) ─────
 *
 *   1. `revealedAt === null`                → **Reveal now**
 *   2. `revealedAt` set, pending > 0        → **Send to the N still missing**
 *   3. `revealedAt` set, pending === 0      → **out**, with the date and the
 *                                              full name of whoever did it
 *
 * They are one control whose label and handler change, not three controls drawn
 * in three places. The reason is the second press: a person who pressed once and
 * is not sure comes back and looks **at the same spot**. If the control has
 * moved, or vanished, the question *"did I already do it?"* has no answer there
 * — and on an act that publishes an address, an unanswered question is somebody
 * pressing again to find out. The refusal is therefore **visible instead of
 * absent**, and it is the answer as well.
 *
 * A spent button is drawn **out, not gone**, for the other half of the same
 * reason: a pressable control on an irreversible act invites a press just to
 * see what happens.
 *
 * ── The state is READ, never remembered ──────────────────────────────────────
 *
 * Every state comes from `getVenueRevealState`, and it is re-read after every
 * successful act instead of being patched from what the act returned. *A
 * measurement taken with the instrument that caused the effect is an echo*
 * (`ai-engineering.md`): a panel that updated itself would show exactly what it
 * expected to show, including on the runs where the write did not do what it
 * believed.
 *
 * ── Undeterminable is NOT empty ──────────────────────────────────────────────
 *
 * If the read fails, the button is **out** and the panel says why. This is the
 * one domain of this project where the safe default is to refuse
 * (`venue-secrecy.md`, gate *default chiuso*): a reveal state nobody could
 * determine does not authorise an irreversible act. There is no error tracking
 * here, so the sentence on screen is the only place the failure exists.
 */

/** The trace's vocabulary, as a person reads it. Total over the three acts. */
const ACT_LABEL: Record<VenueRevealAct, string> = {
  revealed: "Revealed",
  completed: "Sent to the ones still missing",
  re_hidden: "Taken back to secret",
};

/** The state read, as this panel holds it. `loading` is not `not revealed`. */
type PanelState =
  | { phase: "loading" }
  | { phase: "failed"; sentence: string }
  | { phase: "ready"; state: Extract<VenueRevealStateResult, { ok: true }> };

interface VenueRevealPanelProps {
  readonly eventId: string;
  readonly partyId: string;
  /** Rendered verbatim — a night's title is stored as it is written. */
  readonly nightTitle: string;
  /**
   * The place, by name: the venue's own name, or the night's free text when
   * there is no venue row.
   *
   * `null` means this night names no place at all, and that is treated as a
   * reason not to draw a live button — see the `blocked` branch below.
   */
  readonly venueName: string | null;
  /**
   * `event_parties.venue_revealed_at` **as the page rendered it**.
   *
   * It does NOT drive the button. It is kept for one purpose: the page read it
   * with the caller's own session and this panel reads the state with the
   * service client, at a later instant — so a disagreement between the two
   * means somebody acted on this night between the render and now, and saying
   * so out loud is cheaper than letting a person act on a screen that is one
   * act behind.
   */
  readonly pageRevealedAt: string | null;
}

export default function VenueRevealPanel({
  eventId,
  partyId,
  nightTitle,
  venueName,
  pageRevealedAt,
}: VenueRevealPanelProps) {
  const [panel, setPanel] = useState<PanelState>({ phase: "loading" });
  const [dialogMode, setDialogMode] = useState<RevealDialogMode | null>(null);

  /**
   * The read.
   *
   * It does NOT set `loading` itself, and that is not a style choice: called
   * straight out of the effect below, a synchronous `setState` in its body is a
   * cascading render (`react-hooks/set-state-in-effect`). The first read starts
   * from the initial state, which is already `loading`; the reload after an act
   * declares it explicitly in {@link reload}, where it is an event handler and
   * therefore allowed to.
   */
  const load = useCallback(async () => {
    try {
      const result = await getVenueRevealState(eventId, partyId);

      if (!result.ok) {
        setPanel({
          phase: "failed",
          sentence: `The reveal state of this night could not be read, so nothing here can be pressed. ${describeRefusal(
            result.reason
          )}`,
        });
        return;
      }

      setPanel({ phase: "ready", state: result });
    } catch (err) {
      // The same shape branch as the dialog, and for the same reason: Next
      // redacts a Server Action's message in a production build, so the cause
      // is read from the failure's shape and never from a sentence.
      const unreachable =
        err instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);

      setPanel({
        phase: "failed",
        sentence: unreachable
          ? "The reveal state of this night could not be read: the request never reached the server. Nothing here can be pressed until it can. Check the connection and reload."
          : "The reveal state of this night could not be read: the server refused the request. This account may not hold the permission that lets an address out. Nothing here can be pressed.",
      });
    }
  }, [eventId, partyId]);

  /**
   * Re-read after an act. The panel goes back to `loading` first, deliberately:
   * showing the previous state while the new one is in flight is the panel
   * remembering, and remembering is what this component must not do on a
   * surface where the previous state may have been the one before an
   * irreversible act.
   */
  const reload = useCallback(() => {
    setPanel({ phase: "loading" });
    void load();
  }, [load]);

  useEffect(() => {
    // Declared here and called here, which is the shape
    // `components/admin/TransactionList.tsx:344-372` already uses for a read on
    // mount. The state lands in a callback after the await, never synchronously
    // in the effect body.
    const run = async () => {
      await load();
    };
    void run();
  }, [load]);

  const state = panel.phase === "ready" ? panel.state : null;
  const revealed = state !== null && state.revealedAt !== null;
  const pending = state?.recipientsPending ?? 0;

  /**
   * The one button, resolved.
   *
   * `mode` is `null` whenever the button is out — which is what makes "out" a
   * single fact rather than three places remembering to disable something.
   */
  const button: {
    label: string;
    mode: RevealDialogMode | null;
    working: boolean;
  } =
    panel.phase === "loading"
      ? { label: "Reading the reveal state…", mode: null, working: true }
      : panel.phase === "failed"
        ? { label: "Reveal now", mode: null, working: false }
        : venueName === null
          ? { label: "Reveal now", mode: null, working: false }
          : !revealed
            ? { label: "Reveal now", mode: "reveal", working: false }
            : pending > 0
              ? {
                  label: `Send to the ${pending} still missing`,
                  mode: "complete",
                  working: false,
                }
              : { label: "Revealed", mode: null, working: false };

  /**
   * The answer that stands where the button was, when the button is out
   * because the act is done (D-37-19). The name is written in full: this is a
   * staff surface, the reader is already inside, and responsibility is the
   * point of the act (D-37-18).
   */
  const spentSentence =
    state !== null && revealed && pending === 0
      ? state.lastAct
        ? `Revealed on ${formatDateTime(state.lastAct.at)} by ${state.lastAct.actorName}. Everybody who was entitled at that moment has the address.`
        : "This night is marked as revealed and no act is recorded for it. That should not be possible from this surface: the column was set by something else. Do not press anything here before somebody has looked at why."
      : null;

  // Compared on null-ness, not on the two strings: the page reads the column
  // through PostgREST with the caller's session and this panel reads it through
  // the service client, and a difference in timestamp rendering between the two
  // would raise a warning about nothing. What matters is whether the two
  // instruments disagree about the FACT.
  const pageSaidRevealed = pageRevealedAt !== null;

  const disagreement =
    state !== null && pageSaidRevealed !== revealed
      ? revealed
        ? "This night was revealed after this page was rendered. What you are reading below is the current state; the form above is one act behind. Reload the page before editing it."
        : "This night was taken back to secret after this page was rendered. What you are reading below is the current state; the form above is one act behind. Reload the page before editing it."
      : null;

  return (
    <Card>
      {/* `normal-case`: the heading carries a night's title, and
          `text-transform` inherits. */}
      <h3 className="text-sm font-semibold text-ink normal-case">
        {nightTitle}
      </h3>

      {venueName ? (
        <p className="mt-1 text-xs text-muted normal-case">{venueName}</p>
      ) : (
        <p className="mt-1 text-xs text-sem-crit">
          This night names no venue and no venue text, so there is no address to
          release. Give it a venue in the form above first — a reveal that
          publishes nothing still writes an act that cannot be taken back.
        </p>
      )}

      {disagreement && (
        <p role="status" className="mt-3 text-xs text-sem-warn">
          {disagreement}
        </p>
      )}

      {/*
        The failed read keeps its alert role and its own sentence, and loses the
        tinted box it used to sit in. The role is what makes it announced; the
        box was decoration around one paragraph, and the ink is the semantic
        critical token rather than a raw palette step.
      */}
      {panel.phase === "failed" && (
        <p role="alert" className="mt-3 text-sm text-sem-crit">
          {panel.sentence}
        </p>
      )}

      {/*
        ONE button. Its text and its handler change with the state read from the
        database; its position does not. Everything that could have been a
        second button — the answer to a second press — is the sentence
        underneath it.

        The conditional below is the one that decides whether an irreversible
        act can be started from this surface, and it is byte-for-byte the one
        this file has always carried.
      */}
      <div className="mt-4">
        <Button
          className="w-full"
          disabled={button.mode === null}
          onClick={() => {
            if (button.mode !== null) setDialogMode(button.mode);
          }}
        >
          {button.working ? "Working…" : button.label}
        </Button>

        {spentSentence && (
          <p className="mt-2 text-xs text-muted normal-case">{spentSentence}</p>
        )}

        {panel.phase === "ready" && !revealed && venueName !== null && (
          <p className="mt-2 text-xs text-muted">
            {pending === 1
              ? "1 person would receive the address if this were pressed now."
              : `${pending} people would receive the address if this were pressed now.`}{" "}
            Counted per person, so somebody holding both a ticket and an RSVP
            counts once.
          </p>
        )}

        {panel.phase === "ready" && revealed && pending > 0 && (
          <p className="mt-2 text-xs text-muted">
            Revealed, and {pending === 1 ? "1 person" : `${pending} people`}{" "}
            still {pending === 1 ? "has" : "have"} not been reached by mail.
            Pressing sends only to them — nobody already reached is mailed
            again.
          </p>
        )}
      </div>

      {/*
        The phase travels, not a boolean. An unread trace and an empty one are
        different facts and the list must not print the same sentence for both —
        see the component.
      */}
      <VenueRevealTrace acts={state?.acts ?? []} phase={panel.phase} />

      {/*
        Taking a night back to secret is a SEPARATE, secondary act — not an undo
        sitting beside the main button. It appears only on a revealed night, and
        whether this account may perform it is decided by the database, not by
        this file: a person who is not a master finds out by pressing and reads
        the refusal, which is the same principle as the spent button above —
        a refusal that is visible beats one that is absent.
      */}
      {panel.phase === "ready" && revealed && venueName !== null && (
        <div className="mt-5 border-t border-line pt-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDialogMode("re_hide")}
          >
            Take back to secret
          </Button>
          <p className="mt-2 text-xs text-muted">
            Master only. It unsends nothing and clears nothing: the acts above
            stay, so this night keeps saying it was revealed even while its page
            hides the address again.
          </p>
        </div>
      )}

      {dialogMode !== null && venueName !== null && (
        <RevealVenueDialog
          open
          mode={dialogMode}
          eventId={eventId}
          partyId={partyId}
          nightTitle={nightTitle}
          venueName={venueName}
          // The number the confirmation shows is the one this panel READ, and
          // for the completion arm it is the same `recipientsPending` the button
          // has just printed — so the sentence and the label cannot disagree.
          recipientCount={pending}
          onClose={() => setDialogMode(null)}
          // Re-read from the server. Never a local patch of what the act said.
          onDone={reload}
        />
      )}
    </Card>
  );
}

/**
 * The trace, on the night itself and not in a separate register (D-37-17).
 *
 * Most recent first. A re-hide **adds** a line, it does not remove the reveal
 * above it: after taking a night back to secret this list still reads
 * *Revealed — … — <name>* while the button has gone back to *Reveal now*, and
 * that pair is the condition D-37-22 was granted on. It is therefore mounted
 * **outside** every `revealed` guard, deliberately: a trace that disappeared
 * with the state it records would leave the page saying one thing and the mails
 * that went out saying another.
 *
 * ── Three states, not two, and the third is the reason this is a component ───
 *
 * `loading`, `unread` and `empty` used to be two: a failed read arrived here as
 * an empty array and printed *"Nothing has been done to this night's venue
 * yet."* — an **affirmative sentence, stated as fact, about a night whose
 * history nobody could read**. The red box above said the read had failed and
 * this line contradicted it one paragraph down; on an already-revealed night it
 * is the sentence that invites the second press D-37-19 exists to prevent.
 *
 * It is the same defect this phase removed twice underneath — `no_recipients`
 * against `recipients_unavailable` in the sender, then `unavailable` on the
 * count — surfacing a third time in the **view**. `venue-secrecy.md`, gate
 * *default chiuso*: an undeterminable state is not an empty one, and that holds
 * for a sentence on a screen exactly as it holds for a number in a column.
 */
function VenueRevealTrace({
  acts,
  phase,
}: {
  readonly acts: readonly VenueRevealLastAct[];
  readonly phase: PanelState["phase"];
}) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <SectionHeading as="h4">Acts on this night</SectionHeading>

      {phase === "loading" ? (
        <p className="text-xs text-muted">Reading…</p>
      ) : phase === "failed" ? (
        <p className="text-xs text-sem-crit">
          The trace could not be read, so what has been done to this night is
          unknown. This is NOT “nothing has been done”: if this night has
          already been revealed, that act happened and this list cannot show it.
          Reload before deciding anything.
        </p>
      ) : acts.length === 0 ? (
        // Reached only on a successful read, so the sentence is a measurement
        // and may be stated as one.
        <p className="text-xs text-muted">
          Nothing has been done to this night&apos;s venue yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {acts.map((act) => (
            <li
              key={`${act.at}-${act.act}`}
              className="text-xs text-muted normal-case"
            >
              <span className="text-ink">{ACT_LABEL[act.act]}</span>
              {" — "}
              {formatDateTime(act.at)}
              {" — "}
              {act.actorName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
