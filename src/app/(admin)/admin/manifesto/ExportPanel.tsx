"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";
import {
  NOT_PERMITTED,
  OutcomeLine,
  SENTENCE,
  UNREACHABLE,
  type Outcome,
} from "@/app/(admin)/admin/manifesto/refusals";
import type {
  ExportRefusal,
  ExportResult,
} from "@/lib/production/sections/export-contract";

/**
 * The one control that hands a document over — **one component, two callers.**
 *
 * ── Why one component and two callers ───────────────────────────────────────
 *
 * A second copy would be a second place the sentence below could be softened, or
 * left off, and that sentence is the only mitigation standing between an author's
 * prose and somebody outside the project. So this file imports neither arm and
 * could not choose between them if it wanted to: the act arrives as a **prop**,
 * from the page whose key was already asked to draw it.
 *
 * ── The file is built HERE, in the browser, and no route serves it ──────────
 *
 * The act answers with a filename and a string; this component turns them into a
 * download without a second address existing anywhere. That is not a convenience:
 * a route serving a document is an address somebody can keep — bookmarked,
 * pasted, opened again after their key has been taken away — and it would be a
 * third pattern for `src/lib/routes/capability-routes.ts` to bind, on the one
 * kind of content that leaves the building. Nothing was added to that map by the
 * plan that wrote this file.
 *
 * ── The outcome stays in the panel ─────────────────────────────────────────
 *
 * A transient notification is the wrong shape for this: it is gone before
 * somebody has finished reading it, and what is being reported is either *a
 * document that is now on your disk and about to be sent to a third party* or *a
 * refusal you have to act on*. Both belong beside the control, where they can be
 * read twice.
 *
 * ── What a green from the gate does NOT buy, and why the sentence exists ────
 *
 * `scripts/verify-section-export.mjs` proves what the serialisers can **reach**.
 * It reads imports and query strings; it cannot read prose. An address or a date
 * cannot arrive in either document because no query in them touches a table that
 * holds one — but **a line-up somebody typed into the body of a rule travels with
 * that rule**, and no closure walk will ever see it.
 *
 * `sound-manifesto.md`'s gate *il brief esce dal perimetro* asks for a person to
 * check exactly that before the brief is handed over, and that is what the
 * sentence beside the control is: a step for a human being, stated as a limit
 * rather than dressed up as a proof. A claim of coverage here would be worse than
 * saying nothing, because it would stop the check from happening.
 */

/**
 * One sentence per cause, and no shared bucket — the map is **total** over the
 * union, so a refusal added to the contract without a sentence here is a
 * `npm run build` error rather than a message written for something else.
 *
 * The recorded precedent this avoids is the newsletter form in this repository
 * answering a network fault, a missing key and an address already subscribed with
 * the same words. There is no error tracking in this project, so the sentence on
 * the screen is the whole of the observable effect.
 */
const EXPORT_REFUSAL_SENTENCE: Record<ExportRefusal, string> = {
  sections_read_failed:
    "No document was produced. The recorded rules could not be read, so nothing was assembled — a partial document is worse than none, because whoever received it could not tell what was missing. Reload the page and try again.",
  questions_read_failed:
    "No document was produced. The register of open questions could not be read, and the document is refused rather than sent without it: a brief that lost its open questions reads as settled to whoever is handed it. Reload the page and try again.",
  formats_read_failed:
    "No document was produced. The catalogue of formats could not be read, so a rule written for one format would have been printed as a rule of the whole brand. Reload the page and try again.",
};

export function ExportPanel({
  produce,
  documentName,
  handedTo,
}: {
  /**
   * The act, handed over by the page. Each section passes its own arm, which
   * asks its own key — this file imports neither and cannot reach either.
   */
  produce: () => Promise<ExportResult>;
  /** What the document is called in a sentence, e.g. *the sound manifesto*. */
  documentName: string;
  /** Who it goes to, in this section's own words. */
  handedTo: string;
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [working, setWorking] = useState(false);

  async function press() {
    if (working) return;
    setWorking(true);
    setOutcome(null);

    try {
      const result = await produce();

      if (!result.ok) {
        setOutcome({
          tone: "crit",
          message: EXPORT_REFUSAL_SENTENCE[result.reason],
        });
        return;
      }

      /*
        The file is assembled here and released immediately.

        `revokeObjectURL` is not tidying: an object URL that is never revoked is
        a copy of the document held in the tab for as long as it stays open, and
        this is the one kind of content in this product whose whole nature is to
        leave. The anchor is put in the document and taken out again because
        several browsers will not follow a click on an element that was never
        attached.
      */
      const blob = new Blob([result.document.markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = result.document.filename;
      window.document.body.appendChild(anchor);
      anchor.click();
      window.document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setOutcome({
        tone: "done",
        message: `${result.document.filename} was produced and saved. Read it before you send it.`,
      });
    } catch (thrown) {
      /*
        Branching on the SHAPE of the failure and never on its message: a
        production build redacts the message of an error thrown out of a Server
        Action, so the shape is the most that can honestly be distinguished.
      */
      const unreachable =
        thrown instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);
      setOutcome({
        tone: "crit",
        message: unreachable ? UNREACHABLE : NOT_PERMITTED,
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card>
      <SectionHeading>HANDING IT OVER</SectionHeading>

      <p className={`mt-3 ${SENTENCE}`}>
        This produces {documentName} as a Markdown file, from what has been
        recorded. It is not stored anywhere: the copy you get is exactly as recent
        as this press, and nothing in the file will tell its reader that.
      </p>

      <p role="note" className="mt-3 text-sm text-ink">
        <strong className="font-semibold">
          Read it before you send it: this document leaves the perimeter.
        </strong>{" "}
        It goes to {handedTo}. It cannot carry an address or a date, because
        nothing it reads holds one — but a name in a line-up is prose somebody
        typed, and prose travels with the rule it was typed into. Check for one,
        and take it out before the file goes anywhere.
      </p>

      <div className="mt-6">
        <Button variant="secondary" size="md" disabled={working} onClick={press}>
          {working ? "Producing…" : "Produce the document"}
        </Button>
        <OutcomeLine outcome={outcome} />
      </div>
    </Card>
  );
}
