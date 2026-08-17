"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/Typography";
import {
  OutcomeLine,
  SENTENCE,
  run,
  type FormatChoice,
  type Outcome,
} from "@/app/(admin)/admin/manifesto/refusals";

import type {
  CloseQuestion,
  OpenQuestion,
} from "@/lib/production/sections/write-contract";

/**
 * The register — opening a question, and closing one with its answer.
 *
 * ── IT WARNS AND IT BLOCKS NOTHING (D-45-15, inheriting D-44-16) ────────────
 *
 * ⚠ **No control in this file takes anything else on the page out of service**,
 * and that absence is the requirement rather than an unfinished part. The owner
 * chose warning over blocking for a reason the previous phase already paid for:
 * **a block that fires under deadline is a block somebody routes around** — the
 * listing goes out on the Tuesday for the Thursday, and a surface that refused to
 * let a piece proceed because a question is outstanding would be answered by
 * producing the piece somewhere this product cannot see. Then the register is a
 * record of questions nobody consults instead of a warning somebody reads, and
 * it also teaches people to route around the next one.
 *
 * The two `disabled` attributes below are on **this form's own submit
 * controls**, while a save is in flight or while a required field is empty.
 * There is no third, and nothing outside these two cards can be reached from
 * here.
 *
 * ── An owner is required, and it is what makes this a register ──────────────
 *
 * `production_open_question.decision_owner` is `NOT NULL`. A question with no
 * owner is the state this register was built to abolish — it is the one thing
 * that distinguishes a register from a list of complaints, and a warning that
 * says something is unresolved without saying who resolves it reads as nobody's
 * job, which is the shape an open question already has when nobody writes it
 * down at all.
 *
 * **A role, never a person.** This repository is public, and a decision
 * attributed to a name ages badly the moment somebody leaves.
 *
 * ── Closing means writing what was decided ─────────────────────────────────
 *
 * The answer is required here and again by
 * `production_open_question_closed_xor_resolution`, which makes the closing date
 * and the resolution inseparable in the database. A question closed without its
 * answer is a question that will be asked again — the register kept the question
 * and lost the only thing it was keeping it for.
 *
 * **Closing is not deleting**, and there is no delete path in the act this form
 * calls. A closed entry stays in the table with its answer beside it; the pages
 * stop warning about it because they read only the open ones, and *settled* is a
 * different fact from *never asked*.
 *
 * ── What a question may say ────────────────────────────────────────────────
 *
 * A **criterion** — *is the sound one manifesto or one per venue*, *does a space
 * host the same format twice* — and never a candidate. No space under
 * negotiation, no unannounced date, no line-up, no artist. The register is read
 * on surfaces whose whole purpose is producing material that leaves the
 * perimeter, and a question is prose like any other.
 */
export function OpenQuestionForm({
  open,
  close,
  formats,
  questions,
  section,
  sectionLabel,
}: {
  /** The act that opens one, handed over by the page that owns the key. */
  open: OpenQuestion;
  /** The act that closes one, from the same module and the same key. */
  close: CloseQuestion;
  /**
   * The listed formats, or `null` when the catalogue could not be read — which
   * is not an empty list and is not drawn as one.
   */
  formats: readonly FormatChoice[] | null;
  /** The questions currently open on this surface, oldest first. */
  questions: readonly { readonly id: string; readonly question: string }[];
  /**
   * The section this form files a question under when the author says it belongs
   * to this body of rules. Pinned by the page, never typed: the act refuses a
   * section its own key cannot read back, because a warning nobody holding the
   * key can see is a silent failure with a success message on top.
   */
  section: string;
  /** How this surface refers to its own body of rules, in a sentence. */
  sectionLabel: string;
}) {
  return (
    <div className="space-y-4">
      <OpenOne
        open={open}
        formats={formats}
        section={section}
        sectionLabel={sectionLabel}
      />
      <CloseOne close={close} questions={questions} />
    </div>
  );
}

/* ── Opening one ──────────────────────────────────────────────────────────── */

function OpenOne({
  open,
  formats,
  section,
  sectionLabel,
}: {
  open: OpenQuestion;
  formats: readonly FormatChoice[] | null;
  section: string;
  sectionLabel: string;
}) {
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [owner, setOwner] = useState("");
  const [formatId, setFormatId] = useState<string>("");

  /*
    Three values and not two, because *the whole brand* is a CHOICE and not an
    absence. An empty select would make the brand-wide answer the thing that
    happens when nobody answers, and the register's most general entries — the
    spelling, the grid-safe square, the order of publication — are exactly the
    ones nobody else is going to raise.
  */
  const [scope, setScope] = useState<string>("");

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [working, setWorking] = useState(false);

  const incomplete =
    question.trim() === "" || owner.trim() === "" || scope === "";

  async function submit() {
    if (working) return;
    setWorking(true);
    setOutcome(null);

    const said = await run(
      () =>
        open({
          question,
          decision_owner: owner,
          // The empty string is read as an absence by the act, and an absent
          // section is what brand-wide MEANS in this column.
          section: scope === "section" ? section : "",
          format_id: formatId,
        }),
      "The question is in the register. It warns, and it stops nothing."
    );

    setOutcome(said);
    setWorking(false);

    if (said.tone === "done") {
      setQuestion("");
      setOwner("");
      setFormatId("");
      setScope("");
      router.refresh();
    }
  }

  return (
    <Card>
      <SectionHeading>OPEN A QUESTION</SectionHeading>

      <p className={SENTENCE}>
        Something nobody has decided, and whose call it is. It appears beside the
        work it bears on and lets the work proceed: a block that fires under
        deadline is a block somebody routes around, and then nobody reads the next
        one either. Write it as a criterion — never as a candidate, and never with
        a name, a date or a place in it.
      </p>

      <div className="mt-5 space-y-5">
        <Textarea
          id="new-question"
          label="The question"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <Input
          id="new-question-owner"
          label="Whose call it is"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          hint="A role, never a person. A question with no owner is the state this register exists to abolish."
        />

        <Select
          id="new-question-scope"
          label="What it bears on"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          hint="The whole brand is a real answer, not a fallback: some rules are not properties of one body of rules at all."
        >
          <option value="">Say what it bears on</option>
          <option value="section">{sectionLabel}</option>
          <option value="brand">The whole brand</option>
        </Select>

        {formats === null ? (
          <p role="alert" className="text-sm text-sem-crit">
            The catalogue of formats could not be read, so this question can only
            be filed without one. It will appear in the register above the
            entries rather than beside a single format&apos;s.
          </p>
        ) : (
          <Select
            id="new-question-format"
            label="Which format it is about"
            value={formatId}
            onChange={(e) => setFormatId(e.target.value)}
            hint="Optional. A question with no format is drawn in the register at the top of the page, where a warning under the fold would only reach whoever scrolled."
          >
            <option value="">No single format</option>
            {formats.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name}
              </option>
            ))}
          </Select>
        )}

        <Button
          variant="primary"
          size="md"
          disabled={working || incomplete}
          onClick={submit}
        >
          {working ? "Working…" : "Open the question"}
        </Button>
        <OutcomeLine outcome={outcome} />
      </div>
    </Card>
  );
}

/* ── Closing one ──────────────────────────────────────────────────────────── */

function CloseOne({
  close,
  questions,
}: {
  close: CloseQuestion;
  questions: readonly { readonly id: string; readonly question: string }[];
}) {
  const router = useRouter();

  const [questionId, setQuestionId] = useState<string>("");
  const [resolution, setResolution] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [working, setWorking] = useState(false);

  const incomplete = questionId === "" || resolution.trim() === "";

  async function submit() {
    if (working) return;
    setWorking(true);
    setOutcome(null);

    const said = await run(
      () => close(questionId, resolution),
      "The question is closed, with what was decided beside it. It stays in the register; the pages simply stop warning about it."
    );

    setOutcome(said);
    setWorking(false);

    if (said.tone === "done") {
      setQuestionId("");
      setResolution("");
      router.refresh();
    }
  }

  if (questions.length === 0) {
    return (
      <Card>
        <SectionHeading>CLOSE A QUESTION</SectionHeading>
        <p className={SENTENCE}>
          Nothing is open on this surface. That is a state and not an error: it
          says every question anybody wrote down here has been answered, or that
          none has been written yet — and the two are told apart by whether the
          register above has ever had anything in it.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeading>CLOSE A QUESTION</SectionHeading>

      <p className={SENTENCE}>
        Closing one means writing what was decided. The answer is required here
        and in the database — a question closed without it is a question that
        will be asked again, and this is not a deletion: the entry stays, with
        the answer beside it.
      </p>

      <div className="mt-5 space-y-5">
        <Select
          id="close-question"
          label="Which question"
          value={questionId}
          onChange={(e) => setQuestionId(e.target.value)}
        >
          <option value="">Choose one</option>
          {questions.map((one) => (
            <option key={one.id} value={one.id}>
              {one.question}
            </option>
          ))}
        </Select>

        <Textarea
          id="close-question-resolution"
          label="What was decided"
          rows={3}
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          hint="In the words whoever owns the decision would use. This is what the register keeps."
        />

        <Button
          variant="primary"
          size="md"
          disabled={working || incomplete}
          onClick={submit}
        >
          {working ? "Working…" : "Close it, with the answer"}
        </Button>
        <OutcomeLine outcome={outcome} />
      </div>
    </Card>
  );
}
