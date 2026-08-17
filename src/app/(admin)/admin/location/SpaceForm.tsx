"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/Typography";

import {
  createSpace,
  exitSpace,
  recordAnswer,
  recordExtendedHoursStance,
  setAttribute,
  updateSpace,
  type LocationRefusal,
} from "./actions";

import {
  ANSWERS_SOURCE,
  ANSWERS_SOURCE_LABELS,
  ATTRIBUTE_KEYS,
  ATTRIBUTE_KEY_LABELS,
  ATTRIBUTE_PROVENANCE,
  ATTRIBUTE_PROVENANCE_LABELS,
  ATTRIBUTE_VALUES,
  ATTRIBUTE_VALUE_LABELS,
  EXIT_REASONS,
  EXIT_REASON_LABELS,
  SIZE_BANDS,
  SIZE_BAND_LABELS,
  SPACE_CATEGORIES,
  SPACE_CATEGORY_LABELS,
  type AnswersSource,
  type AttributeKey,
  type AttributeProvenance,
  type AttributeValue,
  type ExitReason,
  type ExtendedHoursStance,
  type SizeBand,
  type SpaceCategory,
} from "@/lib/production/sections/vocabulary";

/**
 * The authoring half of the location section — the record, the four questions,
 * the ten attributes, the one column only a telephone call can move, and the
 * exit.
 *
 * ── What this surface is allowed to make a person believe ───────────────────
 *
 * 184 spaces are on the list, all at the lowest stage, all derived, and **nobody
 * has been called**. So the risk here is not a lost keystroke: it is a control
 * that lets somebody record a fact of the world that did not happen, in a
 * database column that will then be believed. Every shape below follows from
 * that.
 *
 *   * **A provenance is chosen on every save and is never carried over.** The
 *     control below starts on nothing, every time, including where the attribute
 *     already holds a value. `venue-acquisition.md`, gate *derivato non è
 *     verificato*: an edited value that kept the seed's `derived` would be a lie,
 *     and one marked verified that nobody verified would be a worse one. A
 *     preselected option answers a question on the person's behalf, and this is
 *     the question the whole column exists to ask.
 *   * **The unasked marker is drawn as the state it is**, never as a blank
 *     control. A blank and an unanswered question are the same pixel unless the
 *     form refuses to let them be — so it is an option, with a sentence for a
 *     label, and the save is inert while it is the answer.
 *   * **Nothing infers.** The capacity is not derived from the band, the late
 *     hours stance is not derived from the published ones, and no control writes
 *     a stage.
 *
 * ── One control for `answers_source`, and NOT one beside each answer ────────
 *
 * ⚠ **The column is shared by all four answers.** Drawing four selects over one
 * column would let somebody record a rig obtained by telephone beside a closing
 * time read off a listing — and the second save would silently restate the first
 * answer's provenance. The section therefore draws ONE control for the group,
 * labelled as such, with the consequence written beside it. That is a deviation
 * from this plan's own copy, which asked for a select beside each answer; the
 * copy assumed a per-answer column that does not exist.
 *
 * The domain agrees with the schema here, which is why the fix is a control and
 * not a migration: `venue-acquisition.md` says the four questions close with
 * **one telephone call**, and a call has one provenance.
 *
 * ── One sentence per cause, and never a shared *something went wrong* ───────
 *
 * The recorded precedent is the newsletter form collapsing a network fault, a
 * missing key and an address already subscribed into one indebuggable message,
 * and this product has **no error tracking**: the sentence on screen is the whole
 * of the observable effect. `REFUSAL_SENTENCE` below is a **total** map over the
 * refusal union, so a cause added to the act without a sentence here is a
 * `npm run build` error rather than a message written for something else.
 *
 * ── What this surface does NOT do ───────────────────────────────────────────
 *
 *   * **It cannot delete a space.** There is no such act and there will not be
 *     one: leaving the race is a state, and a space discarded for contradicting
 *     the identity stays listed forever, because deleting it loses the memory of
 *     the choice.
 *   * **It does not change the stage.** That is `StageChangeDialog`, because the
 *     one stage that unlocks naming a space in a material has to ask for the
 *     writing in the same panel.
 *   * **It draws no score and no ranking.** A figure beside an editable name
 *     would read as *this venue is possible*, about desk work.
 *   * **It never puts the address in a heading, a label or a diagnostic.** It is
 *     one field on a gated form, and it goes to the database and nowhere else.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The sentences — one per cause, and the map is total over the union
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What each refusal says to the person who caused it.
 *
 * Each opens by saying **what did not happen**, because on a form that is the
 * first thing a reader needs: whether the value they are looking at is the one
 * that is stored. No two members share a sentence — that is the point of the map
 * — and no sentence names a space, an address or a contact.
 */
const REFUSAL_SENTENCE: Record<LocationRefusal, string> = {
  invalid_id: "Nothing was saved. This space could not be identified, so the database was never asked — reload the page.",
  name_missing: "Nothing was saved. A space needs a name: it is the only handle the list has, and a row without one cannot be found again.",
  invalid_category: "Nothing was saved. That category is not one of the eleven this section knows — reload the page and pick again.",
  invalid_size_band: "Nothing was saved. That capacity band is not one of the four — reload the page and pick again.",
  published_hours_blank: "Nothing was saved. The hours it keeps cannot be left empty: clearing the field is not the same as nobody having asked, and the two must stay distinguishable. Write the hours, or leave the unasked marker in place.",
  invalid_attribute: "Nothing was saved. That is not one of the ten attributes this section holds — reload the page.",
  invalid_value: "Nothing was saved. That is not one of the five values an attribute can take — reload the page.",
  provenance_missing: "Nothing was saved. Say whether this value was read off the profile or checked on the ground: a value that does not say which it is cannot be told apart from one that was verified, and a suitability is only as good as its weakest input.",
  answers_source_missing: "Nothing was saved. Say how these four answers were obtained. A public listing and a telephone call are different facts, and only one of them can carry a night — and “nobody has asked” is not a way of obtaining an answer.",
  invalid_answer: "Nothing was saved. That answer is not the shape its question takes — a capacity is a whole number above zero, and a closing hour is written as HH:MM on a 24-hour clock.",
  invalid_stage: "Nothing was saved. That is not one of the four stages — reload the page.",
  invalid_stance: "Nothing was saved. This column takes only “will discuss” or “will not discuss”, and it can never be moved back to “nobody has asked”: erasing a recorded call would make the call have to happen twice.",
  invalid_exit_reason: "Nothing was saved. That is not one of the four reasons a space leaves the race — reload the page.",
  exit_date_missing: "Nothing was saved. An exit carries why and when, together. A date without a reason is a row nobody can read, and a reason without a date is a row nobody can place.",
  agreement_evidence_missing: "Nothing was saved. Acquired means in writing: say where the agreement is — a mail of such a date, a signed contract — before the stage moves.",
  promoted_cannot_leave_acquired: "Nothing was saved. This space has already been crossed into the venue list, so its stage cannot leave acquired from here. Undo the crossing where it was made, then come back.",
  note_carries_contact: "Nothing was saved. This text carries what looks like a mail address or a mobile number, and these fields hold criteria and observation only — no contact, no person, no price. Nothing was masked and nothing was stored: take the contact out and save again.",
  space_not_found: "Nothing was saved. This space is no longer readable from here — reload the page.",
  space_exited: "Nothing was saved. This space has left the race, and a record of that decision is not edited any further. It stays on the list, which is the point.",
  already_exited: "Nothing was saved a second time. This space had already left the race — reload the page: it now says so.",
  read_failed: "Nothing was saved. A read that had to happen first did not answer, so nothing was attempted. Try again.",
  write_failed: "Nothing was saved. The database refused the write.",
};

/** What a throw out of an act can be told apart into, and no further. */
const NOT_PERMITTED =
  "Nothing was saved. This account is not allowed to write in the location section. If this surface was open a moment ago, reload the page and check what it can still do.";
const UNREACHABLE =
  "Nothing was saved. The request never reached the server — check the connection and try again.";

/* ────────────────────────────────────────────────────────────────────────────
 * The one wrapper every control runs its act through
 * ──────────────────────────────────────────────────────────────────────────── */

type Outcome = { readonly tone: "done" | "crit"; readonly message: string };

/**
 * Runs an act and turns whatever it answers into one sentence.
 *
 * The `catch` branches on the **shape** of the failure and not on its message: a
 * production build redacts the message of an error thrown out of a Server
 * Action, so the shape is the most that can honestly be told apart. Every other
 * failure in every act is a returned value, so a throw that reached the server
 * is the gate.
 */
async function run(
  act: () => Promise<{ ok: true } | { ok: false; reason: LocationRefusal }>,
  saved: string
): Promise<Outcome> {
  try {
    const result = await act();
    if (result.ok) return { tone: "done", message: saved };
    return { tone: "crit", message: REFUSAL_SENTENCE[result.reason] };
  } catch (thrown) {
    const unreachable =
      thrown instanceof TypeError ||
      (typeof navigator !== "undefined" && navigator.onLine === false);
    return { tone: "crit", message: unreachable ? UNREACHABLE : NOT_PERMITTED };
  }
}

/** The outcome of one section, in that section's own panel. */
function OutcomeLine({ outcome }: { outcome: Outcome | null }) {
  if (outcome === null) return null;
  return (
    <p
      role={outcome.tone === "crit" ? "alert" : "status"}
      className={`mt-3 text-sm ${outcome.tone === "crit" ? "text-sem-crit" : "text-sem-done"}`}
    >
      {outcome.message}
    </p>
  );
}

/** The recessed sentence face, shared with the read surface one file over. */
const SENTENCE = "text-sm text-muted";

/* ────────────────────────────────────────────────────────────────────────────
 * What the page hands over
 * ──────────────────────────────────────────────────────────────────────────── */

/** One attribute as the space currently holds it. */
export interface HeldAttributeView {
  readonly attribute: AttributeKey;
  readonly value: AttributeValue;
  readonly provenance: AttributeProvenance;
}

/**
 * The record, as the form needs it.
 *
 * Composed by the page rather than passed as a row: a form has no use for the
 * columns it cannot write, and a value that never crosses the boundary is a
 * value that cannot be drawn by accident.
 */
export interface SpaceFormRecord {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly category: SpaceCategory | null;
  readonly source: string | null;
  readonly shortDescription: string | null;
  readonly note: string | null;
  readonly sizeBand: SizeBand | null;
  readonly publishedHours: string;
  readonly rig: string | null;
  readonly realCapacity: number | null;
  readonly guestDjAllowed: boolean | null;
  readonly closingTime: string | null;
  readonly answersSource: AnswersSource;
  readonly extendedHoursStance: ExtendedHoursStance;
  /** Whether the space has left the race. Every act below is refused if it has. */
  readonly exited: boolean;
  readonly attributes: readonly HeldAttributeView[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * The form
 * ──────────────────────────────────────────────────────────────────────────── */

export function SpaceForm({ record }: { record: SpaceFormRecord }) {
  if (record.exited) {
    /*
      No controls at all, and a sentence in their place. Disabled controls here
      would be indistinguishable from a surface that is still loading, and the
      act is not refused for a reason a person can fix: it is refused because the
      row is a record of a decision, and it stays on the list for exactly that.
    */
    return (
      <Card>
        <SectionHeading>AUTHORING</SectionHeading>
        <p className={SENTENCE}>
          This space has left the race, so nothing on it is edited any further.
          It is not removed and it will not be: deleting it would lose the memory
          of the choice, and the choice would be remade from scratch at the first
          difficulty.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <RecordFields record={record} />
      <AnswerFields record={record} />
      <StanceField record={record} />
      <AttributeFields record={record} />
      <ExitField record={record} />
    </div>
  );
}

/* ── The record ───────────────────────────────────────────────────────────── */

function RecordFields({ record }: { record: SpaceFormRecord }) {
  const router = useRouter();

  const [name, setName] = useState(record.name);
  const [address, setAddress] = useState(record.address ?? "");
  const [category, setCategory] = useState<string>(record.category ?? "");
  const [sizeBand, setSizeBand] = useState<string>(record.sizeBand ?? "");
  const [publishedHours, setPublishedHours] = useState(record.publishedHours);
  const [source, setSource] = useState(record.source ?? "");
  const [shortDescription, setShortDescription] = useState(
    record.shortDescription ?? ""
  );
  const [note, setNote] = useState(record.note ?? "");

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [working, setWorking] = useState(false);

  async function save() {
    if (working) return;
    setWorking(true);
    setOutcome(null);
    const said = await run(
      () =>
        updateSpace(record.id, {
          name,
          address,
          category,
          sizeBand,
          publishedHours,
          source,
          shortDescription,
          note,
        }),
      "The record is saved."
    );
    setOutcome(said);
    setWorking(false);
    if (said.tone === "done") router.refresh();
  }

  return (
    <Card>
      <SectionHeading>THE RECORD</SectionHeading>
      <div className="space-y-5">
        <Input
          id="space-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="As whoever owns the place writes it."
        />

        {/*
          THE ADDRESS, AND IT IS THE ONE FIELD ON THIS SURFACE THAT IS A STREET
          ADDRESS RATHER THAN A SHORTHAND.

          It is a field, never a heading, never a label and never a diagnostic.
          It reaches the database and stops there — no log line, no returned
          value, no message anywhere in this section carries it.
        */}
        <Input
          id="space-address"
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          hint="Internal, and it stays internal: this section is the one whose content must not leave the perimeter."
        />

        <Select
          id="space-category"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          hint="Descriptive, and it ranks nothing: a space that is right for one format can be out of identity for another."
        >
          <option value="">Not recorded</option>
          {SPACE_CATEGORIES.map((one) => (
            <option key={one} value={one}>
              {SPACE_CATEGORY_LABELS[one]}
            </option>
          ))}
        </Select>

        {/*
          ⚠ THE BAND IS NOT THE CAPACITY, AND THE TWO CONTROLS ARE NOT ADJACENT
          BY ACCIDENT — they are adjacent so that a reader can see they are two
          questions. The band lives here, with the record. The number lives in
          the four questions below, with a provenance attached, because it is
          closed by somebody standing in the room.
        */}
        <Select
          id="space-size-band"
          label="Capacity band"
          value={sizeBand}
          onChange={(e) => setSizeBand(e.target.value)}
          hint="A band, not a capacity. The target for a night is 150 to 300 people, and a band cannot say whether a room is inside that."
        >
          <option value="">No band recorded</option>
          {SIZE_BANDS.map((one) => (
            <option key={one} value={one}>
              {SIZE_BAND_LABELS[one]}
            </option>
          ))}
        </Select>

        <Input
          id="space-published-hours"
          label="The hours it keeps"
          value={publishedHours}
          onChange={(e) => setPublishedHours(e.target.value)}
          hint="A published fact, so it may be researched. Leave the unasked marker where nobody has looked — an empty field is refused, because a blank and an unasked question are not the same thing."
        />

        <Input
          id="space-source"
          label="Where the record came from"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />

        <Textarea
          id="space-short-description"
          label="What the scouting wrote"
          rows={3}
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          hint="Criteria and observation only — no contact, no person, no price."
        />

        <Textarea
          id="space-note"
          label="Note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          hint="Same contract as above. A text carrying a mail address or a mobile number is refused whole, never masked."
        />
      </div>

      <div className="mt-6">
        <Button variant="primary" size="md" onClick={save} disabled={working}>
          {working ? "Working…" : "Save the record"}
        </Button>
        <OutcomeLine outcome={outcome} />
      </div>
    </Card>
  );
}

/* ── The four questions ───────────────────────────────────────────────────── */

/**
 * The four answers, each with its own save, above **one** provenance control.
 *
 * See the file docblock: the column is shared, so the control is shared, and the
 * sentence beside it says what saving any one answer does to the other three.
 */
function AnswerFields({ record }: { record: SpaceFormRecord }) {
  const router = useRouter();

  const [answersSource, setAnswersSource] = useState<string>(
    record.answersSource
  );
  const [rig, setRig] = useState(record.rig ?? "");
  const [capacity, setCapacity] = useState(
    record.realCapacity === null ? "" : String(record.realCapacity)
  );
  const [guestDj, setGuestDj] = useState<string>(
    record.guestDjAllowed === null ? "" : record.guestDjAllowed ? "yes" : "no"
  );
  const [closingTime, setClosingTime] = useState(
    record.closingTime === null ? "" : record.closingTime.slice(0, 5)
  );

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [working, setWorking] = useState(false);

  // The unasked marker is a legitimate state of the column and a refused
  // provenance for an answer. Inert rather than hidden: the reason is readable
  // above the control, before anything is pressed.
  const sourceMissing = answersSource === "not_asked" || answersSource === "";

  async function save(
    build: () => Parameters<typeof recordAnswer>[1],
    saved: string
  ) {
    if (working) return;
    setWorking(true);
    setOutcome(null);
    const said = await run(
      () => recordAnswer(record.id, build(), answersSource as AnswersSource),
      saved
    );
    setOutcome(said);
    setWorking(false);
    if (said.tone === "done") router.refresh();
  }

  return (
    <Card>
      <SectionHeading>THE FOUR QUESTIONS</SectionHeading>

      <p className={SENTENCE}>
        What rig is there, how many people actually fit, whether a guest dj may
        play, and until what hour. They are the columns a telephone call closes,
        and the last screens out the most candidates: a listing that says “dj and
        live music” is answering what a wedding reception asks, not what a night
        that ends at six asks.
      </p>

      <div className="mt-5 space-y-5">
        {/*
          ONE CONTROL FOR THE GROUP, AND THE SENTENCE SAYS WHY.

          The database holds one provenance for all four answers. A control
          beside each would draw four independent promises over one column, and
          the second save would quietly restate the first answer's source.
        */}
        <Select
          id="answers-source"
          label="How these four answers were obtained"
          value={answersSource}
          onChange={(e) => setAnswersSource(e.target.value)}
          hint="One value for all four: saving any answer below restates it for the other three. That is the shape of the column, and the four questions close with one call."
        >
          {ANSWERS_SOURCE.map((one) => (
            <option key={one} value={one}>
              {ANSWERS_SOURCE_LABELS[one]}
            </option>
          ))}
        </Select>

        {sourceMissing ? (
          <p role="alert" className="text-sm text-sem-crit">
            “Nobody has asked” is the state of a question nobody put, not a way
            of obtaining an answer. Say how the answer was obtained before
            saving one.
          </p>
        ) : null}

        <div className="space-y-3">
          <Input
            id="answer-rig"
            label="What rig is there"
            value={rig}
            onChange={(e) => setRig(e.target.value)}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={working || sourceMissing}
            onClick={() =>
              save(() => ({ question: "rig", rig }), "The rig is saved.")
            }
          >
            Save this answer
          </Button>
        </div>

        <div className="space-y-3">
          <Input
            id="answer-capacity"
            label="How many people actually fit"
            inputMode="numeric"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            hint="A whole number above zero, and it is not derived from the band. Only somebody standing in the room closes this one."
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={working || sourceMissing}
            onClick={() =>
              save(
                () => ({ question: "real_capacity", capacity }),
                "The capacity is saved."
              )
            }
          >
            Save this answer
          </Button>
        </div>

        <div className="space-y-3">
          <Select
            id="answer-guest-dj"
            label="May a guest dj play"
            value={guestDj}
            onChange={(e) => setGuestDj(e.target.value)}
          >
            {/* The empty option is the unasked state of this column, which is
                nullable for exactly that reason: printing “no” for it would be
                reporting ignorance as a refusal. It cannot be saved. */}
            <option value="">Nobody has asked</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            disabled={working || sourceMissing || guestDj === ""}
            onClick={() =>
              save(
                () => ({
                  question: "guest_dj_allowed",
                  allowed: guestDj === "yes",
                }),
                "The guest dj answer is saved."
              )
            }
          >
            Save this answer
          </Button>
        </div>

        <div className="space-y-3">
          <Input
            id="answer-closing-time"
            label="Until what hour one may play"
            placeholder="HH:MM"
            value={closingTime}
            onChange={(e) => setClosingTime(e.target.value)}
            hint="24-hour clock. A night runs 22:00 to 06:00, so this hour is legitimately smaller than the hour a night starts."
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={working || sourceMissing}
            onClick={() =>
              save(
                () => ({ question: "closing_time", closingTime }),
                "The closing hour is saved."
              )
            }
          >
            Save this answer
          </Button>
        </div>
      </div>

      <OutcomeLine outcome={outcome} />
    </Card>
  );
}

/* ── The column only a telephone call can move ────────────────────────────── */

/**
 * ⚠ The two words, and no third.
 *
 * The unasked marker is **not** an option, and that is the strongest rule in
 * this section: the column is absent from every source by nature, because it is
 * not published anywhere — it is the answer to a phone call. Offering the marker
 * back would offer a way to erase a call that happened, on the single question
 * that screens out the most candidates.
 */
function StanceField({ record }: { record: SpaceFormRecord }) {
  const router = useRouter();

  const [stance, setStance] = useState<string>("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [working, setWorking] = useState(false);

  async function save() {
    if (working) return;
    setWorking(true);
    setOutcome(null);
    const said = await run(
      () =>
        recordExtendedHoursStance(
          record.id,
          stance as Exclude<ExtendedHoursStance, "not_asked">
        ),
      "The stance is recorded."
    );
    setOutcome(said);
    setWorking(false);
    if (said.tone === "done") router.refresh();
  }

  return (
    <Card>
      <SectionHeading>WILL IT DISCUSS LATER HOURS</SectionHeading>

      <p className={SENTENCE}>
        Recorded now:{" "}
        {record.extendedHoursStance === "not_asked"
          ? "nobody has asked."
          : record.extendedHoursStance === "will_discuss"
            ? "it will discuss."
            : "it will not discuss."}{" "}
        This is not a fact about the place and it is published nowhere — it is
        the answer to a phone call. Only somebody who made that call can move it,
        and once moved it can never go back to “nobody has asked”: erasing a
        recorded call would make the call have to happen twice.
      </p>

      <div className="mt-5 space-y-3">
        <Select
          id="extended-hours-stance"
          label="What they said"
          value={stance}
          onChange={(e) => setStance(e.target.value)}
        >
          <option value="">Choose what they said</option>
          <option value="will_discuss">Will discuss</option>
          <option value="will_not_discuss">Will not discuss</option>
        </Select>

        <Button
          variant="primary"
          size="sm"
          disabled={working || stance === ""}
          onClick={save}
        >
          {working ? "Working…" : "Record the call"}
        </Button>
        <OutcomeLine outcome={outcome} />
      </div>
    </Card>
  );
}

/* ── The ten attributes ───────────────────────────────────────────────────── */

function AttributeFields({ record }: { record: SpaceFormRecord }) {
  const held = new Map<AttributeKey, HeldAttributeView>();
  for (const one of record.attributes) held.set(one.attribute, one);

  return (
    <Card>
      <SectionHeading>ATTRIBUTES</SectionHeading>
      <p className={SENTENCE}>
        All ten, always. An attribute with no row is the same fact as one nobody
        asked about, and the fifth value is that fact rather than an empty cell.
        Every save says again where the value came from: a value read off the
        profile is a hypothesis, one checked on the ground is a datum, and a
        suitability is only as verified as its weakest input.
      </p>

      {/* `md:` and not `sm:` — this tree's tiers are 768px and 1024px, and
          640px would put the two-column layout on a phone held sideways. */}
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {ATTRIBUTE_KEYS.map((key) => (
          <AttributeRow
            key={key}
            spaceId={record.id}
            attribute={key}
            current={held.get(key) ?? null}
          />
        ))}
      </div>
    </Card>
  );
}

function AttributeRow({
  spaceId,
  attribute,
  current,
}: {
  spaceId: string;
  attribute: AttributeKey;
  current: HeldAttributeView | null;
}) {
  const router = useRouter();

  const [value, setValue] = useState<string>(current?.value ?? "not_asked");

  /*
    ⚠ THE PROVENANCE STARTS ON NOTHING, EVERY TIME — including where the
    attribute already holds one.

    Carrying the stored provenance forward would let an edited value keep the
    seed's `derived`, which is a lie, or keep a `field_verified` nobody
    re-verified, which is a worse one. The control has no preselected option and
    the save is inert until somebody says which it is.
  */
  const [provenance, setProvenance] = useState<string>("");

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [working, setWorking] = useState(false);

  async function save() {
    if (working) return;
    setWorking(true);
    setOutcome(null);
    const said = await run(
      () =>
        setAttribute(
          spaceId,
          attribute,
          value as AttributeValue,
          provenance as AttributeProvenance
        ),
      "The attribute is saved."
    );
    setOutcome(said);
    setWorking(false);
    if (said.tone === "done") router.refresh();
  }

  return (
    <div className="space-y-3">
      <Select
        id={`attribute-${attribute}`}
        label={ATTRIBUTE_KEY_LABELS[attribute]}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        {ATTRIBUTE_VALUES.map((one) => (
          <option key={one} value={one}>
            {ATTRIBUTE_VALUE_LABELS[one]}
          </option>
        ))}
      </Select>

      <Select
        id={`attribute-${attribute}-provenance`}
        label="Where this value came from"
        value={provenance}
        onChange={(e) => setProvenance(e.target.value)}
      >
        <option value="">Say which this is</option>
        {ATTRIBUTE_PROVENANCE.map((one) => (
          <option key={one} value={one}>
            {ATTRIBUTE_PROVENANCE_LABELS[one]}
          </option>
        ))}
      </Select>

      <Button
        variant="secondary"
        size="sm"
        disabled={working || provenance === ""}
        onClick={save}
      >
        Save this attribute
      </Button>
      <OutcomeLine outcome={outcome} />
    </div>
  );
}

/* ── Leaving the race ─────────────────────────────────────────────────────── */

/**
 * The exit — a reason and a date, together, and no way back from this surface.
 *
 * ⚠ **The reason is recorded against the SPACE, for every format at once**,
 * while the domain reads suitability PER FORMAT: a space that is out of identity
 * for the night can be exactly right for the aperitivo satellite. There is no
 * per-format exit and this panel does not pretend there is one — it says so
 * above the controls, so that whoever writes *out of identity* knows what the
 * column will make of it. Closing that difference is a schema decision and it
 * belongs to whoever owns the section.
 *
 * The confirming control is inert until both halves are given, and the reason is
 * readable before it is pressed rather than applied silently after.
 */
function ExitField({ record }: { record: SpaceFormRecord }) {
  const router = useRouter();

  const [reason, setReason] = useState<string>("");
  const [day, setDay] = useState<string>("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [working, setWorking] = useState(false);

  const incomplete = reason === "" || day === "";

  async function save() {
    if (working) return;
    setWorking(true);
    setOutcome(null);
    const said = await run(
      () => exitSpace(record.id, reason as ExitReason, day),
      "The exit is recorded. The space stays on the list."
    );
    setOutcome(said);
    setWorking(false);
    if (said.tone === "done") router.refresh();
  }

  return (
    <Card>
      <SectionHeading>LEAVING THE RACE</SectionHeading>

      <p className={SENTENCE}>
        This does not remove the space, and nothing here can: a space discarded
        for contradicting the identity stays on the list forever, because
        deleting it loses the memory of the choice and the choice gets remade
        from scratch at the first difficulty. There is no way back through this
        surface.
      </p>

      <p className={`mt-3 ${SENTENCE}`}>
        The reason is recorded against this space and therefore against every
        format at once. Suitability is read per format — a space that is out of
        identity for one can be right for another — and this column cannot say
        which. If the judgement you are about to record is about one format only,
        it will not be stored as one.
      </p>

      <div className="mt-5 space-y-3">
        <Select
          id="exit-reason"
          label="Why it left"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="">Choose a reason</option>
          {EXIT_REASONS.map((one) => (
            <option key={one} value={one}>
              {EXIT_REASON_LABELS[one]}
            </option>
          ))}
        </Select>

        <Input
          id="exit-date"
          type="date"
          label="When it left"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          hint="Why and when travel together, or it is not an exit."
        />

        <Button
          variant="destructive"
          size="md"
          disabled={working || incomplete}
          onClick={save}
        >
          {working ? "Working…" : "Record the exit"}
        </Button>
        <OutcomeLine outcome={outcome} />
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Putting a space on the list
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The create form, for the list surface.
 *
 * ⚠ **It has no stage control**, and that is the design rather than an omission:
 * a new row lands at the lowest stage by the column's own default, and a default
 * that cannot rise is the only kind that is safe here. A create that could set a
 * stage would let a desk exercise arrive already looking like an agreement.
 */
export function NewSpaceForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [address, setAddress] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [working, setWorking] = useState(false);

  async function save() {
    if (working) return;
    setWorking(true);
    setOutcome(null);

    try {
      const result = await createSpace({ name, category, address });
      if (result.ok) {
        setOutcome({
          tone: "done",
          message:
            "The space is on the list, at the lowest stage. Nobody has called it, and nothing here says otherwise.",
        });
        setName("");
        setCategory("");
        setAddress("");
        router.refresh();
      } else {
        setOutcome({
          tone: "crit",
          message: REFUSAL_SENTENCE[result.reason],
        });
      }
    } catch (thrown) {
      const unreachable =
        thrown instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);
      setOutcome({
        tone: "crit",
        message: unreachable ? UNREACHABLE : NOT_PERMITTED,
      });
    }

    setWorking(false);
  }

  return (
    <Card>
      <SectionHeading>PUT A SPACE ON THE LIST</SectionHeading>
      <p className={SENTENCE}>
        It enters at the lowest stage. Mapped is a desk exercise — it says
        somebody wrote the place down, and nothing more.
      </p>

      <div className="mt-5 space-y-5">
        <Input
          id="new-space-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select
          id="new-space-category"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Not recorded</option>
          {SPACE_CATEGORIES.map((one) => (
            <option key={one} value={one}>
              {SPACE_CATEGORY_LABELS[one]}
            </option>
          ))}
        </Select>
        <Input
          id="new-space-address"
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          hint="Optional, and internal."
        />

        <Button
          variant="primary"
          size="md"
          disabled={working || name.trim() === ""}
          onClick={save}
        >
          {working ? "Working…" : "Add the space"}
        </Button>
        <OutcomeLine outcome={outcome} />
      </div>
    </Card>
  );
}
