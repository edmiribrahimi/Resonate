"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/Typography";
import { SectionStateBadge } from "@/app/(admin)/admin/manifesto/SectionStateBadge";
import {
  OutcomeLine,
  SENTENCE,
  run,
  type FormatChoice,
  type Outcome,
} from "@/app/(admin)/admin/manifesto/refusals";

import {
  SECTION_STATES,
  SECTION_STATE_LABELS,
  type SectionState,
} from "@/lib/production/sections/vocabulary";
import type { SaveSection } from "@/lib/production/sections/write-contract";

/**
 * The authoring half of an authored section — **one** form, mounted by both
 * surfaces, taking its act as a prop.
 *
 * ── One component and two callers, and the reason is a default ──────────────
 *
 * A second copy of this form would be a second place a state default could creep
 * back in, and the whole of criterion 3 on the write side is that no default
 * exists anywhere. So the two pages import this file and hand over their own
 * module's `saveSection`: the sound manifesto's, which asks the manifesto key,
 * and the visual capitolato's, which asks the visual key. **This file imports
 * neither module**, and it could not choose between them if it wanted to.
 *
 * ── THE STATE CONTROL CHOOSES NOTHING FOR THE AUTHOR ────────────────────────
 *
 * ⚠ Not *written*, not *not decided*, and **not the first item of the list**.
 * The column has no default and neither does the argument, because the two
 * candidate defaults are wrong in opposite directions and `sound-manifesto.md`
 * names both errors:
 *
 *   * a default of *written* **fills the void** — a row created and left alone
 *     would claim a rule exists where nobody wrote one, and once that reaches a
 *     brief or a piece of artwork it IS the brand for whoever reads it;
 *   * a default of *not decided* **answers for a coordinate that has been
 *     declared** — an omission dressed as prudence. A format with no manifesto
 *     can still carry declared coordinates, including things it explicitly is
 *     not, and those bind.
 *
 * The cost is that the control cannot be left alone and the save is inert until
 * somebody chooses. That is the point, and it is the shape `SpaceForm.tsx`'s
 * provenance control takes one directory over, for the same reason: **the
 * control starts on nothing every time, including where the row already holds a
 * value.** Carrying the stored state forward would let a rule keep *written*
 * through an edit that emptied it — a decision the surface would have taken on
 * somebody's behalf.
 *
 * What the recorded state IS, is drawn beside the control as a word, by the one
 * badge both surfaces use. Showing it is not choosing it.
 *
 * ── The three states ask for three different things ─────────────────────────
 *
 *   * **written** — the body is required, refused here and again by
 *     `production_section_written_has_a_body`. An empty row in this state is the
 *     emptiness *not* declared, which is the one thing this section was built to
 *     make impossible;
 *   * **not decided** — *what is missing* and *whose call it is* are both
 *     required, refused here and again by
 *     `production_section_not_decided_names_its_gap`. Without both, the state is
 *     a shrug, and a shrug reads as nobody's job;
 *   * **coordinates declared** — **neither**, and the form says why in one line.
 *     Demanding a gap here would push the author into **inventing** it: writing
 *     what is absent from a rule nobody has written. A declared coordinate is a
 *     true statement that stops short.
 *
 * Every requirement is readable **before** the submit is pressed, in the same
 * panel as the control that raises it — never only as a refusal afterwards.
 *
 * ── Saving nothing stays possible, and that is a requirement ───────────────
 *
 * *Not yet written* is an answer here, not the absence of one. A rule can be
 * recorded as undecided — naming its gap and the role that closes it — with no
 * body at all, and a rule whose coordinates are declared needs neither. A form
 * that forced prose into an empty manifesto would make this product write the
 * brand on behalf of whoever owns it.
 *
 * ── The explicit negatives go in the body, and there is no field for them ───
 *
 * *Not techno*, *no palm trees*, *never the venue's logo*: the exclusions are
 * decisions as much as the inclusions, and they exist because somebody had
 * already assumed the opposite. A separate field for them invites a surface that
 * draws the permissions and drops the prohibitions — the exact failure they were
 * written to prevent, rebuilt one layout at a time.
 *
 * ── What this form must never do ────────────────────────────────────────────
 *
 *   * **It supplies no text.** No default title, no suggested gap, no adjective
 *     describing a sound, a genre or a palette, and no colour borrowed from the
 *     format that has one.
 *   * **It names no space.** The capitolato leaves the perimeter, and there is
 *     no venue field here, on either surface.
 *   * **It deletes nothing.** Neither act has a delete path and neither will.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * What the pages hand over
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The row as the form needs it, composed by the page rather than passed whole.
 *
 * The two conditional columns travel under **the database's own names**, for the
 * reason `SectionVoid.tsx` gives about its own props: naming the columns the
 * constraint names is what makes an assertion about this file say something
 * about the data, rather than about a convention two files happen to share.
 */
export interface SectionFormRecord {
  readonly id: string;
  readonly title: string;
  readonly format_id: string | null;
  readonly state: SectionState;
  readonly body: string | null;
  readonly missing: string | null;
  readonly decision_owner: string | null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The form
 * ──────────────────────────────────────────────────────────────────────────── */

export function SectionForm({
  save,
  formats,
  record,
  noun,
}: {
  /**
   * The act, handed over by the page. The manifesto page passes its module's
   * `saveSection` and the visual page passes its own — one form, two keys, and
   * this file can reach neither module.
   */
  save: SaveSection;
  /**
   * The listed formats, or `null` when the catalogue could not be read. `null`
   * is not an empty list and is not drawn as one: with no catalogue an entry can
   * still be recorded, but only as belonging to the whole brand, and the form
   * says so instead of showing a select with nothing in it.
   */
  formats: readonly FormatChoice[] | null;
  /** The row being corrected, or `null` to record a new one. */
  record: SectionFormRecord | null;
  /** What this section calls one of its entries — *rule*, or *clause*. */
  noun: string;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(record?.title ?? "");
  const [formatId, setFormatId] = useState<string>(record?.format_id ?? "");
  const [body, setBody] = useState(record?.body ?? "");
  const [gap, setGap] = useState(record?.missing ?? "");
  const [owner, setOwner] = useState(record?.decision_owner ?? "");

  /*
    ⚠ THE STATE STARTS ON NOTHING, EVERY TIME — including where the row already
    holds one.

    See the docblock. The empty string is not a fourth state: it is the absence
    of an answer, it can never be submitted, and the act refuses it by name if a
    forged body sends one.
  */
  const [state, setState] = useState<string>("");

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [working, setWorking] = useState(false);

  const chosen = state === "" ? null : (state as SectionState);
  const needsBody = chosen === "written";
  const needsGap = chosen === "not_decided";

  /*
    What makes the save inert, spelled out clause by clause rather than folded
    into one boolean, so each is legible beside the sentence that explains it.
    Every one of these is refused by the act as well — this is the half a person
    reads before pressing, not the half that decides.
  */
  const incomplete =
    chosen === null ||
    title.trim() === "" ||
    (needsBody && body.trim() === "") ||
    (needsGap && (gap.trim() === "" || owner.trim() === ""));

  /*
    The two conditional columns are cleared under any state that does not use
    them, rather than carried. Sending the stored values under `written` would
    leave a *what is missing* line on a rule somebody had just finished writing —
    true when it was typed, false the moment it was saved, and invisible on the
    read surface, which draws neither.
  */
  async function submit() {
    if (working) return;
    setWorking(true);
    setOutcome(null);

    const said = await run(
      () =>
        save(record?.id ?? null, {
          title,
          format_id: formatId,
          state,
          body,
          missing: needsGap ? gap : "",
          decision_owner: needsGap ? owner : "",
        }),
      record === null
        ? `The ${noun} is recorded, in the state you chose.`
        : `The ${noun} is saved.`
    );

    setOutcome(said);
    setWorking(false);

    if (said.tone === "done") {
      if (record === null) {
        setTitle("");
        setFormatId("");
        setBody("");
        setGap("");
        setOwner("");
      }
      // The state control returns to nothing on every completed save, for the
      // same reason it starts there: the next save is a new decision.
      setState("");
      router.refresh();
    }
  }

  const key = record?.id ?? "new";

  return (
    <Card>
      <SectionHeading>
        {record === null ? `RECORD A ${noun.toUpperCase()}` : `EDIT THIS ${noun.toUpperCase()}`}
      </SectionHeading>

      <div className="mt-4 space-y-5">
        <Input
          id={`section-title-${key}`}
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          hint="How this entry is referred to. Nothing here is written for you."
        />

        {formats === null ? (
          <p role="alert" className="text-sm text-sem-crit">
            The catalogue of formats could not be read, so this {noun} can only be
            recorded as belonging to the whole brand. That is a legitimate answer
            — the spelling, the grid-safe square and the order of publication are
            not properties of one format — but it is not the same as choosing it.
          </p>
        ) : (
          <Select
            id={`section-format-${key}`}
            label="Which format it belongs to"
            value={formatId}
            onChange={(e) => setFormatId(e.target.value)}
            hint="Leave it on the whole brand where the rule is not about one format. Filing such a rule under a format files it in four places, and only one of them gets corrected."
          >
            <option value="">The whole brand</option>
            {formats.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name}
              </option>
            ))}
          </Select>
        )}

        {/* ── The state, and the control that chooses nothing ─────────────── */}

        <div className="space-y-3">
          {record === null ? null : (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span>Recorded now:</span>
              <SectionStateBadge state={record.state} />
            </p>
          )}

          <Select
            id={`section-state-${key}`}
            label="How settled this is"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">Say which of the three this is</option>
            {SECTION_STATES.map((one) => (
              <option key={one} value={one}>
                {SECTION_STATE_LABELS[one]}
              </option>
            ))}
          </Select>

          {chosen === null ? (
            <p role="alert" className="text-sm text-sem-crit">
              Nothing is chosen for you here, and nothing is carried over from the
              last save. Written would claim a rule exists where nobody wrote one;
              not decided would answer for a coordinate somebody has already
              declared. Both are wrong, in opposite directions, so the answer is
              yours.
            </p>
          ) : null}

          {chosen === "coordinates_declared" ? (
            <p className={SENTENCE}>
              This state asks for neither a gap nor an owner, deliberately: a
              coordinate that exists is a true statement that stops short, and
              demanding a <em>what is missing</em> line here would push you into
              inventing one. Put what binds — the exclusions included — in the
              body: they are decisions as much as the permissions, and there is no
              separate field for them.
            </p>
          ) : null}
        </div>

        {/* ── The body ────────────────────────────────────────────────────── */}

        <Textarea
          id={`section-body-${key}`}
          label={needsBody ? "The rule, as written (required)" : "The rule, as written"}
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          hint="Exclusions belong here with the rest of it. What is written binds, and nothing here is filled in from anywhere else."
        />

        {chosen === "written" && body.trim() === "" ? (
          <p role="alert" className="text-sm text-sem-crit">
            A {noun} marked as written has something written in it. Write it, or
            choose a different state — an empty {noun} in this state is the
            emptiness left undeclared.
          </p>
        ) : null}

        {needsGap && body.trim() !== "" ? (
          <p role="status" className={SENTENCE}>
            Worth knowing: while this {noun} is undecided the page draws the void
            — what is missing and whose call it is — and not the body. The text
            stays stored and comes back the moment the state changes; it is simply
            not what a reader is shown while nothing has been decided.
          </p>
        ) : null}

        {/* ── The void, revealed by the state that needs it ──────────────── */}

        {needsGap ? (
          <div className="space-y-5 border-s-2 border-dashed border-control ps-4">
            <p className={SENTENCE}>
              Both of these are required in this state, here and in the database.
              A {noun} that says only <em>not decided</em> reads as nobody&apos;s
              job, and somebody under deadline fills it in.
            </p>

            <Input
              id={`section-missing-${key}`}
              label="What is missing (required)"
              value={gap}
              onChange={(e) => setGap(e.target.value)}
              hint="The decision that is outstanding, in your words — not a guess at what the answer will be."
            />

            <Input
              id={`section-owner-${key}`}
              label="Whose call it is (required)"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              hint="A role, never a person: this repository is public, and a decision attributed to a name ages badly the moment somebody leaves."
            />

            {gap.trim() === "" || owner.trim() === "" ? (
              <p role="alert" className="text-sm text-sem-crit">
                Write both before saving. The constraint named
                production_section_not_decided_names_its_gap refuses the row
                otherwise — and a blank one on the page would look like a failed
                load rather than a decision nobody has taken.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <Button
          variant="primary"
          size="md"
          disabled={working || incomplete}
          onClick={submit}
        >
          {working ? "Working…" : record === null ? `Record this ${noun}` : "Save"}
        </Button>
        <OutcomeLine outcome={outcome} />
      </div>
    </Card>
  );
}
