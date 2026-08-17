import { notFound, redirect } from "next/navigation";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import { turinWallClock } from "@/utils/datetime";

import { SpaceName } from "@/app/(admin)/admin/location/SpaceName";
import { ScoreCell } from "@/app/(admin)/admin/location/ScoreCell";
import { AttributeCell } from "@/app/(admin)/admin/location/AttributeCell";
import { SpaceForm } from "@/app/(admin)/admin/location/SpaceForm";
import { StageChangeDialog } from "@/app/(admin)/admin/location/StageChangeDialog";
import { PromoteSpaceDialog } from "@/app/(admin)/admin/location/PromoteSpaceDialog";

import {
  computeFormatScore,
  type ScoredAttribute,
  type SpaceForScoring,
} from "@/lib/production/sections/score";
import {
  ANSWERS_SOURCE_LABELS,
  ATTRIBUTE_KEYS,
  EXIT_REASON_LABELS,
  EXTENDED_HOURS_STANCE_LABELS,
  SIZE_BAND_LABELS,
  SPACE_CATEGORY_LABELS,
  type AnswersSource,
  type AttributeKey,
  type AttributeValue,
} from "@/lib/production/sections/vocabulary";
import { isCivilTime, UNREADABLE_TIME } from "@/app/(admin)/admin/calendar/dates";

import type {
  Format,
  ProductionSpace,
  ProductionSpaceAttribute,
} from "@/types/database";
import type { ReactNode } from "react";

/**
 * The location section, S2 — one scouted space, whole, and every unanswered
 * question saying so.
 *
 * ── Reachability is the map's answer, never this directory's ─────────────────
 *
 * `admin` in the URL is an address, not an authorisation
 * (`nextjs-architecture.md`, gate *il gruppo non autorizza*). What decides is
 * the row `"/admin/location/[id]"` under `CAP.PRODUCTION_LOCATION_MANAGE` in
 * `src/lib/routes/capability-routes.ts`, sitting in **one entry** beside its
 * list — read by the middleware, by the guard below and (from plan 45-18) by the
 * staff tab, so the three cannot disagree (D-34-09/D-34-10).
 *
 * ⚠ `next build` would NOT have caught a missing row for this address. The
 * backward assertion `_everyStaffRouteIsBound` reads the GENERATED route union,
 * which holds no dynamic route at all — so it can never see this one, and a
 * green build says nothing whatever about it. The check that sees it is
 * `npm run verify:routes`, which censuses `page.tsx` from disk.
 *
 * ── The middleware is UX. The RLS is the boundary. ──────────────────────────
 *
 * The map decides where a **redirect** happens: it stops somebody arriving here.
 * It stops nobody reading a `production_space` row. The boundary is the three
 * `SELECT` policies of `20260817120300_production_sections_access.sql`, each
 * asking `private.has_capability('production.location.manage')`.
 *
 * **Which is why every read below goes through the cookie-bound client**, and
 * why this file constructs no service client. A read that bypasses the policy
 * proves nothing about the policy — a page fetching with the service key renders
 * identically for a subject the database would have refused, which is the exact
 * shape of a feature protected by a redirect alone. On this page that mistake
 * would serve a street address.
 *
 * ── This page reads FIRST, and then authors. Plan 45-13 added the second half. ─
 *
 * Until 45-13 this docblock said there was no way to write anything from here,
 * and that the absence was a decision. **The absence is gone and the decision it
 * protected is not**: the writing surface below is `SpaceForm` and
 * `StageChangeDialog`, both of them one directory over, and the one column that
 * must never be filled by anything but a telephone call is still unreachable by
 * inference — its control offers two words and no third, and no act in
 * `location/actions.ts` derives it from anything. See the hours section below.
 *
 * ── And since 45-14 one act on this page writes OUTSIDE the section ──────────
 *
 * `PromoteSpaceDialog` crosses a space into `public.venues`. Stated here rather
 * than left in the header of the file it lives in, because it is the one thing
 * about this page that the rest of the docblock would otherwise contradict: two
 * paragraphs down, *the name and the address do not leave this render* is about
 * THIS RENDER and remains exactly true — neither reaches a log, a message or a
 * title. The crossing is a different sentence: it moves both into another table,
 * on purpose, behind two capability keys, a stage that means *in writing*, and a
 * confirmation that names what leaves. It creates no night and arms no reveal;
 * `promoteSpace`'s own docblock carries the evidence for that rather than the
 * claim.
 *
 * The read cards come first and the authoring comes after them, deliberately: a
 * form field shows what is stored, and what is stored is not the same statement
 * as what the record SAYS — the unanswered questions, the sentence per absence
 * and the four suitabilities have no representation inside an input.
 *
 * ── Three outcomes, never two ───────────────────────────────────────────────
 *
 * The row exists · the row does not exist · **the read itself failed.** The
 * third gets its own sentence and never `notFound()`: reached from a list, a 404
 * reads as *the space was removed*, and this table's whole design says a space
 * is **never** removed — leaving the race is a state. `.maybeSingle()` rather
 * than `.single()` is what makes the three separable; `.single()` answers *no
 * rows* with an error and collapses the second into the third.
 *
 * ⚠ **A row the policy refused is INDISTINGUISHABLE here from a row that does
 * not exist**, and that is correct behaviour rather than a defect. Under
 * row-level security a refused row simply is not in the result, so both arrive
 * as `null` and both draw the same page. Telling them apart would require this
 * surface to know a row exists that the reader may not see — which is an oracle:
 * a person could learn that some particular identifier names a scouted space
 * without being entitled to read it.
 *
 * ── The name and the address do not leave this render ───────────────────────
 *
 * The name may name a space under negotiation, and the address is a street
 * address — the thing itself, and exactly the payload `public.venue_for_parties`
 * exists to release deliberately, per night, never partially. Both travel from
 * the query into ONE place in the markup and nowhere else: no `console.*`, no
 * thrown message, no page title beyond the heading, no analytics call and no
 * `aria-label`. **The address is rendered exactly once, in the record card at
 * the foot**, and nothing else on this page repeats it.
 *
 * The same rule is why every failure branch logs `error.code` and
 * `error.message` and **never** the error object and never PostgREST's third
 * field — which carries the rejected row, and this row carries both.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The shape check, before anything is asked of the database
 * ──────────────────────────────────────────────────────────────────────────── */

/** The same shape as `formats/actions.ts:111-113`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ────────────────────────────────────────────────────────────────────────────
 * The sentences, each naming one fact and no other
 * ──────────────────────────────────────────────────────────────────────────── */

/** The first question. */
const NO_RIG_ANSWER = "Nobody has asked what rig is there.";

/**
 * The second question — and the wording is *measured*, not *asked*.
 *
 * The band on this same page already says *not asked yet* for its own unasked
 * marker, and two adjacent lines reading the same sentence about two different
 * questions is how a reader concludes they are one question. This one is closed
 * by somebody standing in the room.
 */
const NO_CAPACITY_ANSWER = "Capacity not measured — nobody has stood in the room.";

/** The third question. */
const NO_GUEST_DJ_ANSWER = "Nobody has asked whether a guest dj may play.";

/** The fourth question, and the one that screens out the most candidates. */
const NO_CLOSING_TIME_ANSWER = "Nobody has asked until what hour one may play.";

/** What the record card reads where the archive holds no street address. */
const NO_ADDRESS = "No address recorded";

/** What the record card reads where a free-text field was never written. */
const NOT_WRITTEN = "Not written";

/* ────────────────────────────────────────────────────────────────────────────
 * The page
 * ──────────────────────────────────────────────────────────────────────────── */

export default async function LocationSpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone.
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_LOCATION_MANAGE)) {
    redirect("/dashboard");
  }

  // BEFORE the client, before the query. A parameter that is not the shape of an
  // identifier is not a lookup that returns nothing — it is not a lookup.
  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const supabase = await createClient();

  /*
    ONE READ OF THE SPACE, AND EVERY EMBED CHECKED AGAINST ITS FOREIGN KEYS.

    An embed through a table that has MORE THAN ONE relationship to the embedded
    table is answered by PostgREST with `HTTP 300 PGRST201`, and the failure is
    SILENT through this client: `data` comes back null with no exception thrown,
    and the page renders nothing. The measured precedent in this repository is an
    unqualified embed of `party_series` through `event_parties`.

    So each embed was checked against `20260817120100_production_location.sql`
    rather than assumed:

      production_space → formats                    one FK, `home_format_id`
      production_space ← production_space_attribute one FK, `space_id`

    and no junction table carries foreign keys to both sides of either, so
    neither can be read as a many-to-many. Both are therefore unambiguous, and
    adding a constraint-name qualifier would be naming a generated identifier
    this file has no way to verify — which fails in exactly the same silent way
    an ambiguous embed does.

    ⚠ `promoted_venue_id` IS SELECTED AND IS STILL NOT EMBEDDED, and the two are
    different things rather than a softened rule. Plan 45-14 put a crossing on
    this page, and a surface that offers an act has to know whether the act has
    already happened — so the COLUMN is read, as one nullable identifier, and it
    is used for exactly one decision: whether to draw the trigger or the sentence
    that says the crossing is made. **No embed, no join and no second query**:
    the column points at `public.venues`, the list a night's venue is chosen from
    and the head of the one public road to an address, and a join written for
    convenience would be this table's first edge into that road. Nothing on this
    page renders the venue's name, its slug or its address, and nothing reads
    them. `created_by` is not embedded either — who typed a row is not a fact
    this surface states.

    `.maybeSingle()` and not `.single()`: see the docblock's third outcome.
  */
  const { data: spaceRow, error: spaceError } = await supabase
    .from("production_space")
    .select(
      `id, name, address, category, source, short_description, stage,
       size_band, real_capacity, rig, guest_dj_allowed, closing_time,
       published_hours, extended_hours_stance, answers_source,
       agreement_evidence, exited_at, exit_reason, already_used, in_use, note,
       promoted_venue_id,
       formats ( name ),
       production_space_attribute ( attribute, value, provenance )`
    )
    .eq("id", id)
    .maybeSingle();

  if (spaceError) {
    // `error.code` and `error.message` only. Never the error object, and never
    // PostgREST's third field, which carries the rejected row — and this row
    // carries a name and a street address.
    console.error(
      `[location.space_read_failed] code=${spaceError.code} message=${spaceError.message}`
    );
    return <SpaceReadFailed />;
  }

  if (spaceRow === null) {
    notFound();
  }

  const record = spaceRow as unknown as SpaceSelectRow;

  /*
    THE FORMAT CATALOGUE — READ SEPARATELY, AND ON PURPOSE.

    The four suitabilities are drawn by mapping over THE CATALOGUE and not over
    the results this page managed to compute. A format whose weighting nobody has
    written must still appear, saying so: its absence would read as a zero, and a
    zero is a different sentence — *scored nothing* rather than *nobody has
    written the weighting*.

    `retired_at IS NULL` removes the fallback format, which exists only to hold
    rows nobody classified and is unlisted by construction. `sort_order` is the
    catalogue's own sequence, so the four appear here in the order every other
    surface shows them.

    ⚠ **This read is entitled independently of the section key.** The
    `formats_select_listed` policy is `USING (listed = true)` — unconditional —
    so the four listed formats are readable by anybody, and no part of this
    surface depends on the reader also holding `catalogue.manage`.
  */
  const { data: formatRows, error: formatError } = await supabase
    .from("formats")
    .select("id, code, name")
    .is("retired_at", null)
    .order("sort_order", { ascending: true });

  if (formatError) {
    console.error(
      `[location.formats_read_failed] code=${formatError.code} message=${formatError.message}`
    );
  }

  const formats = (formatRows as FormatSelectRow[] | null) ?? null;

  const attributes = record.production_space_attribute ?? [];
  const held = new Map<AttributeKey, HeldAttribute>();
  for (const one of attributes) {
    held.set(one.attribute, one);
  }

  /*
    THE SHAPE THE SCORE MODULE TAKES, AND IT IS NOT A ROW.

    `SpaceForScoring` carries attributes, a capacity, how the answers were
    obtained and why the space left the race — and no name, no address and no
    stage. A function that cannot see which space it is scoring cannot leak one,
    and composing that shape here rather than handing over the row is what keeps
    it that way.
  */
  const forScoring: SpaceForScoring = {
    attributes: attributes.map(
      (one): ScoredAttribute => ({
        attribute: one.attribute,
        value: one.value,
        provenance: one.provenance,
      })
    ),
    realCapacity: record.real_capacity,
    answersSource: record.answers_source,
    exitReason: record.exit_reason,
  };

  const exited = toExit(record.exited_at, record.exit_reason);

  return (
    /*
      `default` and not `wide`: §4's wide list is closed, and the entry this plan
      added to it by decision is the LIST, whose primary object is a dense table.
      One space is not one. `[id]/loading.tsx` beside this file carries the same
      width for the same reason a placeholder always does.
    */
    <PageShell width="default">
      <header className="pb-6">
        {/* The display face lands on the page title and nowhere else, and
            `normal-case` is DECLARED rather than assumed: `text-transform`
            inherits, `uppercase` appears in 43 files in this tree, and *we did
            not add `uppercase`* is a hope about every ancestor rather than a
            guarantee. A space's name is written the way whoever owns the place
            writes it, and an upper-cased version is a different-looking claim
            about a name we do not own. */}
        <PageTitle className="normal-case">
          <SpaceName name={record.name} stage={record.stage} />
        </PageTitle>

        {/*
          THE STAGE CHANGE SITS BESIDE THE STAGE, AND NOT AT THE FOOT OF A FORM.

          It is the one act on this section that decides whether the space may be
          named outside this surface, and the panel it opens carries the rule and
          the evidence field together. It draws no name of its own: the name is
          in the heading above, in the one renderer allowed to draw it, with the
          stage beside it.
        */}
        {/*
          THE CROSSING STANDS BESIDE THE STAGE CHANGE, AND THAT IS DELIBERATE.

          They are the two acts on this page whose effect is read outside this
          section, and the second one is only reachable through the first: a
          space crosses from `acquired` and from no other stage. Putting them
          together is what makes that sequence legible instead of a rule
          somebody discovers by being refused.

          ⚠ **HIDING THE TRIGGER PROTECTS NOTHING**, and it is written here so
          nobody mistakes this arrangement for a control. What this surface holds
          IS the secret — the name of a space under negotiation and a street
          address — and the three things that refuse an unentitled subject are
          the middleware entry, this page's own guard above, and the row-level
          policies. The absence of a button is none of them, and a person who can
          read this page could call the act directly with a forged body. The gate
          inside `promoteSpace` is what refuses them, and it asks two keys.

          It is drawn for every space still in the race, not only for the
          acquired ones, and that is the read of *visible where it can be
          pressed* this surface takes: the panel's whole job on a space that is
          not acquired is to say WHY it will not cross, and a trigger hidden on
          those spaces would make that sentence unreachable. The confirming
          control inside is inert there, with the stage named above it.
        */}
        {exited === null ? (
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <StageChangeDialog spaceId={record.id} currentStage={record.stage} />
            <PromoteSpaceDialog
              spaceId={record.id}
              name={record.name}
              stage={record.stage}
              /* WHETHER there is an address, never the address. The panel says
                 whether one crosses; it does not need the street to say that. */
              hasAddress={record.address !== null}
              alreadyPromoted={record.promoted_venue_id !== null}
            />
          </div>
        ) : null}
      </header>

      <div className="space-y-8">
        {/*
          THE EXIT COMES FIRST, ABOVE EVERYTHING IT QUALIFIES.

          A space that left the race is still on the list — `venue-acquisition.md`
          keeps one discarded for contradicting the identity listed, at zero,
          forever, because deleting it loses the memory of the choice and the
          choice then gets remade at the first difficulty. Which means a reader
          can arrive at a full record for a space nobody is pursuing, and they
          have to know that before they read the rest of it, not after.
        */}
        {exited === null ? null : <ExitNotice exit={exited} />}

        {/*
          ACQUIRED MEANS IN WRITING, AND THE LINE IS THE WRITING.

          The database refuses the stage without it, so wherever the stage is
          `acquired` this line exists and is drawn verbatim. It is the only
          stage that unlocks naming the space in a material, and a reader about
          to do that is entitled to see what the claim rests on rather than to
          trust a badge.
        */}
        {record.stage === "acquired" ? (
          <AgreementNotice evidence={record.agreement_evidence} />
        ) : null}

        <Card>
          <SectionHeading>THE FOUR QUESTIONS</SectionHeading>
          {/*
            `venue-acquisition.md` § *le quattro domande*: what rig is there, how
            many people actually fit, whether a guest dj may play, and until what
            hour. They are the columns a telephone call closes, and the module
            names the last as the one that screens out the most candidates.

            **How each answer was obtained is drawn beside it**, and it is not a
            formality: *until 01:00 according to the venue's public page* and
            *until 01:00 because they said so on the phone* are DIFFERENT FACTS,
            and only one of them can carry a night. A public listing answers the
            question a wedding reception asks. A surface that hid the difference
            would make it unanswerable from here.

            Where an answer is missing, the line says so and **no source is drawn
            beside it** — a source printed beside an absence is a claim about an
            answer that does not exist. Same discipline as `AttributeCell`.
          */}
          <div className="space-y-5">
            <Answer
              question="What rig is there"
              answer={record.rig}
              missing={NO_RIG_ANSWER}
              source={record.answers_source}
            />
            <Answer
              question="How many people actually fit"
              answer={
                record.real_capacity === null
                  ? null
                  : String(record.real_capacity)
              }
              missing={NO_CAPACITY_ANSWER}
              source={record.answers_source}
              figure
            />
            <Answer
              question="May a guest dj play"
              answer={guestDjAnswer(record.guest_dj_allowed)}
              missing={NO_GUEST_DJ_ANSWER}
              source={record.answers_source}
            />
            <Answer
              question="Until what hour one may play"
              answer={closingTimeAnswer(record.closing_time)}
              missing={NO_CLOSING_TIME_ANSWER}
              source={record.answers_source}
              figure
            />
          </div>
        </Card>

        <Card>
          <SectionHeading>HOURS</SectionHeading>
          {/*
            TWO COLUMNS, AND THEY ARE NOT ONE COLUMN FOR A STATED REASON.

            The hours a venue KEEPS are a published fact and may be researched.
            Whether it will even DISCUSS hours beyond those is not published
            anywhere — it is not a fact about the place, it is the answer to a
            phone call that has not happened.

            ⚠ **No crawl, no inference and no default may ever move the second
            off its unasked value**, and **nothing on this page may fill it**:
            this surface reads and has no control that writes. A value derived
            for it would be *derivato non è verificato* committed in the one
            column built to prevent it, arriving with the authority of a database
            column on the single question that screens out the most candidates.
            The failure is concrete: a space marked *will discuss* by a scraper,
            a date planned on it, and the conversation happening for the first
            time in the week of the night.
          */}
          <div className="space-y-5">
            <Field label="The hours it keeps">
              {record.published_hours === "not_asked" ? (
                <Badge>Nobody has asked</Badge>
              ) : (
                <span className={ANSWER_FACE}>{record.published_hours}</span>
              )}
            </Field>
            <Field label="Will it discuss later hours">
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge>
                  {EXTENDED_HOURS_STANCE_LABELS[record.extended_hours_stance]}
                </Badge>
                <span className={SENTENCE}>
                  Only a telephone call moves this. Nothing on this page can.
                </span>
              </span>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionHeading>ATTRIBUTES</SectionHeading>
          {/*
            ALL TEN, ALWAYS — mapped over the vocabulary and never over the rows
            the space happens to hold.

            An attribute with no row is the same fact as an attribute nobody
            asked about, and `score.ts` already treats the two identically:
            `answerFor` returns null for both and neither reaches the
            denominator. Drawing only the rows that exist would turn *nobody has
            put the question* into a shorter list, which reads as *these are the
            ones that matter*.
          */}
          {/* `md:` and not `sm:` — §2.1 fixes this tree's tiers at 768px and
              1024px, and 640px would put the two-column layout on a phone held
              sideways. `npm run verify:breakpoints` check B asserts it. */}
          <div className="grid gap-5 md:grid-cols-2">
            {ATTRIBUTE_KEYS.map((key) => {
              const one = held.get(key);
              return (
                <AttributeCell
                  key={key}
                  attribute={key}
                  value={one === undefined ? UNHELD_VALUE : one.value}
                  /*
                    Where the space holds no row, this argument is INERT:
                    `AttributeCell` draws nothing beside an unanswered question,
                    for the reason written in its own docblock. It is passed
                    because the component's contract requires it and there is no
                    absent case in the column it mirrors — the database column is
                    `NOT NULL` and has no default, precisely so that a value
                    cannot exist without saying which it is.
                  */
                  provenance={one === undefined ? "derived" : one.provenance}
                />
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeading>HOW WELL IT WOULD SUIT EACH FORMAT</SectionHeading>
          {/*
            FOUR RESULTS SIDE BY SIDE, AND NOT ONE OF THEM IS COMPARED TO
            ANOTHER.

            `score.ts` §(b) states the module's own limit: each format weighs the
            same attributes differently, so a dominant criterion worth 4 of 10 is
            a DIFFERENT criterion in each weighting. Two results from two formats
            are two answers to two different questions, and any surface that
            sorted, averaged or ranked them together would be answering a
            question the module did not ask. Nothing here sorts: the sequence is
            the catalogue's.

            And the heading says *would*. A figure here measures how well a space
            would suit a format; it says nothing about whether that space would
            host us, because **nobody has been called**.
          */}
          <SuitabilityList
            formats={formats}
            forScoring={forScoring}
            exitReason={record.exit_reason}
          />
        </Card>

        <Card>
          <SectionHeading>THE RECORD</SectionHeading>
          <div className="space-y-5">
            {/*
              THE ADDRESS, IN ONE PLACE ON THIS PAGE AND NOWHERE ELSE.

              It is not in the heading, not in a link, not in a label and not in
              any diagnostic. It is a street address with a house number on a
              large minority of the rows this table will carry — the thing
              itself, not a shorthand a reader could fail to place — and it is
              exactly the payload `public.venue_for_parties` releases per night,
              deliberately, when somebody has decided it should leave the
              perimeter. Nothing about this section is that decision.
            */}
            <Field label="Address">
              {record.address === null ? (
                <span className={SENTENCE}>{NO_ADDRESS}</span>
              ) : (
                <span className={ANSWER_FACE}>{record.address}</span>
              )}
            </Field>

            <Field label="Category">
              {record.category === null ? (
                <span className={SENTENCE}>Not recorded</span>
              ) : (
                <span className="normal-case">
                  {SPACE_CATEGORY_LABELS[record.category]}
                </span>
              )}
            </Field>

            {/*
              THE BAND, AND IT IS NOT THE CAPACITY ABOVE.

              ⚠ Nothing on this page derives one from the other. The target for a
              night is 150 to 300 people and a band cannot answer whether a given
              room is inside it. The fourth member of the vocabulary is **not a
              small size** — it is the marker for a question nobody put, on 17 of
              the 184 records measured — and it is drawn as the distinct state it
              is.
            */}
            <Field label="Size band">
              {record.size_band === null ? (
                <span className={SENTENCE}>No band recorded</span>
              ) : record.size_band === "not_asked" ? (
                <Badge>{SIZE_BAND_LABELS[record.size_band]}</Badge>
              ) : (
                <span className={ANSWER_FACE}>
                  {SIZE_BAND_LABELS[record.size_band]}
                </span>
              )}
            </Field>

            <Field label="Scouted for">
              {record.formats === null ? (
                <span className={SENTENCE}>
                  No format claimed it, which is ordinary.
                </span>
              ) : (
                <span className="normal-case">{record.formats.name}</span>
              )}
            </Field>

            <Field label="Where the record came from">
              {record.source === null ? (
                <span className={SENTENCE}>{NOT_WRITTEN}</span>
              ) : (
                <span>{record.source}</span>
              )}
            </Field>

            <Field label="What the scouting wrote">
              {record.short_description === null ? (
                <span className={SENTENCE}>{NOT_WRITTEN}</span>
              ) : (
                <span>{record.short_description}</span>
              )}
            </Field>

            <Field label="Note">
              {record.note === null ? (
                <span className={SENTENCE}>{NOT_WRITTEN}</span>
              ) : (
                <span>{record.note}</span>
              )}
            </Field>

            {/*
              TWO FACTS ABOUT US, NOT ABOUT THE SPACE — which is why they are not
              attributes and why they weigh nothing. They are drawn because a
              place we have already used is a different conversation from a place
              nobody has ever spoken to.
            */}
            <Field label="Our history with it">
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                {record.already_used ? (
                  <Badge>Has hosted us before</Badge>
                ) : (
                  <span className={SENTENCE}>Never hosted us</span>
                )}
                {record.in_use ? <Badge>In the rotation now</Badge> : null}
              </span>
            </Field>
          </div>
        </Card>

        {/*
          THE AUTHORING HALF — plan 45-13, behind the same guard as everything
          above it, which is the page guard and, underneath it, the policy.

          The record is composed here rather than handed over as a row: a form
          has no use for the columns it cannot write, and a value that never
          crosses the boundary is a value that cannot be drawn by accident. The
          address does cross, because it is a field on this form; it goes to the
          database and to nothing else.
        */}
        <SpaceForm
          record={{
            id: record.id,
            name: record.name,
            address: record.address,
            category: record.category,
            source: record.source,
            shortDescription: record.short_description,
            note: record.note,
            sizeBand: record.size_band,
            publishedHours: record.published_hours,
            rig: record.rig,
            realCapacity: record.real_capacity,
            guestDjAllowed: record.guest_dj_allowed,
            closingTime: record.closing_time,
            answersSource: record.answers_source,
            extendedHoursStance: record.extended_hours_stance,
            exited: exited !== null,
            attributes: attributes.map((one) => ({
              attribute: one.attribute,
              value: one.value,
              provenance: one.provenance,
            })),
          }}
        />
      </div>
    </PageShell>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The faces
 * ──────────────────────────────────────────────────────────────────────────── */

/** The label/data face, with the transform declared. `uppercase` inherits. */
const ANSWER_FACE = "font-mono text-sm font-semibold normal-case text-ink";

/** The body role for a sentence. `--muted` on `--surface` is 6.78 : 1. */
const SENTENCE = "text-sm text-muted";

/** The question a value answers, recessed above it. */
const LABEL = "text-xs text-muted";

/**
 * One labelled fact.
 *
 * The label is rendered beside the value and not left to a column header,
 * because this surface is read on a phone: a header scrolls off the top and a
 * bare string detached from the question it answers is not an answer. It is the
 * same construction `AttributeCell` uses one directory over, for the same
 * reason.
 */
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}

/**
 * One of the four questions, with how the answer was obtained beside it — or
 * the sentence that says nobody obtained one.
 *
 * **There is no branch here that produces nothing.** A blank cell and an
 * unanswered question are the same pixel unless a component refuses to let them
 * be, and on these four columns the unanswered case is the majority: nobody has
 * been called at all.
 */
function Answer({
  question,
  answer,
  missing,
  source,
  figure = false,
}: {
  question: string;
  /** The answer as a string, or `null` where nobody obtained one. */
  answer: string | null;
  /** The sentence for this particular question, shared with no other. */
  missing: string;
  /** How the four answers were obtained. Drawn only beside a real answer. */
  source: AnswersSource;
  figure?: boolean;
}) {
  if (answer === null) {
    return (
      <Field label={question}>
        <span className={SENTENCE}>{missing}</span>
      </Field>
    );
  }

  return (
    <Field label={question}>
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={figure ? ANSWER_FACE : "normal-case text-ink"}>
          {answer}
        </span>
        <span className={SENTENCE}>{ANSWERS_SOURCE_LABELS[source]}</span>
      </span>
    </Field>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The four states that are not a field
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The failed read — deliberately NOT `notFound()`.
 *
 * A 404 on a page reached from a list reads as *this space was removed*, and
 * this table's design says a space is never removed. `role="alert"` so it is
 * announced, and it is the only alert region on this surface.
 */
function SpaceReadFailed() {
  return (
    <PageShell width="default">
      <header className="pb-6">
        <PageTitle>Space</PageTitle>
      </header>
      <div role="alert" className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">
          We could not read this space.
        </p>
        <p className="mt-1 text-sm text-muted">
          This is a failed read, not a space that is gone. No space is ever
          removed from this list. Reload the page; nothing in the data has
          changed.
        </p>
      </div>
    </PageShell>
  );
}

/** A space and its exit, once the pair has been read as the pair it is. */
interface Exit {
  readonly reason: string;
  readonly when: string | null;
}

/**
 * The exit, drawn above everything it qualifies.
 *
 * ⚠ **The reason is recorded on the SPACE while the domain reads suitability
 * per FORMAT**, and this notice says which of the two it is rather than
 * resolving the difference. Whoever wrote *out of identity* was making a
 * per-format judgement in a space-wide column; plan 45-07 declared that tension
 * in `score.ts` and left it open, because closing it is a schema decision and
 * not a rendering one. So the sentence below names the space, never a format —
 * and the suitability card still draws all four results, because a space ruled
 * out is ruled out for every format the column can speak for and that is the
 * arithmetic the module already performs.
 */
function ExitNotice({ exit }: { exit: Exit }) {
  return (
    <Card>
      <div className="flex flex-col items-start gap-2">
        <Badge tone="emphasis">Left the race</Badge>
        <p className="text-base font-semibold text-ink">{exit.reason}</p>
        <p className="text-sm text-muted">
          Recorded against this space, not against one format — the column is
          space-wide and the domain reads suitability per format, which is a
          difference nobody has decided how to close. The space stays on the
          list: deleting it would lose the memory of the choice, and the choice
          would be remade from scratch at the first difficulty.
          {exit.when === null ? null : ` Recorded ${exit.when}.`}
        </p>
      </div>
    </Card>
  );
}

/**
 * The evidence line for an acquired space, verbatim.
 *
 * The database refuses the stage without a non-blank value here, so the `null`
 * branch is unreachable through any write path that exists — and it is written
 * anyway, because a page that assumed a constraint would draw a blank if the
 * constraint were ever relaxed, and a blank beside *acquired* reads as *fine*.
 */
function AgreementNotice({ evidence }: { evidence: string | null }) {
  return (
    <Card>
      <div className="flex flex-col items-start gap-2">
        <Badge>Acquired means in writing</Badge>
        {evidence === null ? (
          <p className="text-sm text-muted">
            This space is marked acquired and carries no pointer to the
            agreement. That pair should not be possible: treat the stage as
            unconfirmed until somebody says where the writing is.
          </p>
        ) : (
          <p className="text-base text-ink">{evidence}</p>
        )}
      </div>
    </Card>
  );
}

/**
 * The four suitabilities — or the sentence that says why none could be drawn.
 *
 * Mapped over the CATALOGUE, so a format whose weighting nobody has written
 * still appears and says so. A failed catalogue read is its own sentence and
 * never an empty card: *no format has a weighting* and *we could not read the
 * formats* are different facts with different next steps, and this repository
 * has no error tracking, so the sentence on the screen is the whole of the
 * observable effect.
 */
function SuitabilityList({
  formats,
  forScoring,
  exitReason,
}: {
  formats: readonly FormatSelectRow[] | null;
  forScoring: SpaceForScoring;
  exitReason: SpaceForScoring["exitReason"];
}) {
  if (formats === null) {
    return (
      <p className="text-sm text-muted">
        We could not read the format catalogue, so no weighting could be
        applied. This is a failed read and not a verdict about this space.
      </p>
    );
  }

  if (formats.length === 0) {
    return (
      <p className="text-sm text-muted">
        The format catalogue holds nothing to weigh this space against.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {formats.map((one) => (
        <Field key={one.id} label={one.name}>
          {/*
            THE COLUMN NAMES THE FORMAT, AND THAT IS NOT DECORATION.

            `ScoreCell` deliberately does not print the format: a cell lifted out
            of its column has lost the only thing that makes its figure mean
            anything, since a suitability is read per format and never as an
            absolute verdict on a place. The label above is that column.
          */}
          <ScoreCell score={computeFormatScore(one.code, forScoring)} />
        </Field>
      ))}
      {exitReason === "out_of_identity" ? (
        <p className={SENTENCE}>
          Every result above is the recorded exit, not a computation: a decision
          somebody made outranks a weighting, including the one nobody has
          written.
        </p>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Reading the three values that need a rule
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What an attribute reads where the space holds no row for it at all.
 *
 * The same value `score.ts` treats it as: an attribute that is not on the space
 * is the same fact as one nobody asked about, and neither reaches a
 * denominator.
 */
const UNHELD_VALUE: AttributeValue = "not_asked";

/**
 * The third question, as a word.
 *
 * `null` is NOT drawn as *no*: the column is nullable and null means nobody has
 * asked, so printing a refusal there would be reporting ignorance as an answer.
 * The caller draws the missing sentence instead.
 */
function guestDjAnswer(allowed: boolean | null): string | null {
  if (allowed === null) return null;
  return allowed ? "Yes" : "No";
}

/**
 * The fourth question, as `HH:MM`.
 *
 * ⚠ **Postgres serialises a `time` as `HH:MM:SS`, not `HH:MM`**, so the stored
 * value is eight characters and `isCivilTime` — which is exact about the shape
 * it can draw — refuses it. The head is taken and then checked rather than
 * trusted: a surface that printed *we could not read this time* against every
 * real answer would be a silent failure wearing a careful sentence, and a
 * surface that printed the raw eight characters would be inventing a precision
 * the question does not have.
 *
 * 24-hour, no zone suffix, and nothing here builds an instant. A night runs
 * 22:00 to 06:00, so this value is legitimately SMALLER than the hour a night
 * starts, and a conversion that moved it across midnight would move a weekday.
 */
function closingTimeAnswer(stored: string | null): string | null {
  if (stored === null) return null;
  const head = stored.slice(0, 5);
  return isCivilTime(head) ? head : UNREADABLE_TIME;
}

/**
 * The exit, read as the inseparable pair the database enforces.
 *
 * `production_space_exit_xor_reason` makes *both or neither* a constraint, so a
 * half-exit should not exist; this reads the reason as the thing that decides,
 * because a reason without a date is still an exit somebody recorded while a
 * date without a reason names nothing.
 *
 * The date is rendered through `turinWallClock`, which is the declared home of
 * a time boundary in this project — the runtime is UTC and the reader is in
 * Turin, and the two disagree about which day it is for two hours every night.
 * A timestamp that will not parse draws no date at all rather than an epoch one.
 */
function toExit(
  exitedAt: string | null,
  reason: SpaceForScoring["exitReason"]
): Exit | null {
  if (reason === null) return null;
  const wall = exitedAt === null ? null : turinWallClock(exitedAt);
  return {
    reason: EXIT_REASON_LABELS[reason],
    when: wall === null ? null : `${wall.date} ${wall.time} in Turin`,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The shapes the two selects return
 * ──────────────────────────────────────────────────────────────────────────── */

/*
  ⚠ NOTHING CHECKS THESE AGAINST THE DATABASE.

  No Supabase client in this repository is parameterised with `Database`, so
  `.select("…")` returns values the compiler cannot relate to a column, and the
  casts are assertions rather than checks.

  A green `npm run build` therefore proves that the JSX and the mappers
  type-check against THESE DECLARATIONS. It proves nothing whatever about
  whether a column is spelled the way the applied migration spells it. Every
  name in the two selects was read by hand out of
  `20260817120100_production_location.sql` and `20260810120000_formats_and_series.sql`
  and checked against `src/types/database.ts`, whose production block plan 45-08
  confirmed against the live catalogue read-back. That chain is the only check
  performed, and it is written down so nobody reads the green as a stronger
  claim than it is.

  ⚠ **And a further limit, specific to this plan:** these are the FIRST reads of
  these tables from any surface, and the tables hold no rows — the seed is plan
  45-10. So nothing below has yet been exercised against a real row, and the
  score arithmetic has not either. A green here is a green about declarations.

  The row types are COMPOSED from the interfaces with `Pick`, never restated: a
  second hand-written copy of a column list is a second place to change, and only
  one of the two would be changed. The embedded relations are spelled out only
  because `Pick` has no way to describe a PostgREST join.
*/

type HeldAttribute = Pick<
  ProductionSpaceAttribute,
  "attribute" | "value" | "provenance"
>;

type SpaceSelectRow = Pick<
  ProductionSpace,
  | "id"
  | "name"
  | "address"
  | "category"
  | "source"
  | "short_description"
  | "stage"
  | "size_band"
  | "real_capacity"
  | "rig"
  | "guest_dj_allowed"
  | "closing_time"
  | "published_hours"
  | "extended_hours_stance"
  | "answers_source"
  | "agreement_evidence"
  | "exited_at"
  | "exit_reason"
  | "already_used"
  | "in_use"
  | "note"
  | "promoted_venue_id"
> & {
  /** One FK, `home_format_id`. Null is ordinary: no format claimed the space. */
  formats: { name: string } | null;
  /** One FK, `space_id`. Absent where the join itself did not answer. */
  production_space_attribute: HeldAttribute[] | null;
};

type FormatSelectRow = Pick<Format, "id" | "code" | "name">;

/*
  ⚠ NOT CACHEABLE, AND SAID OUT LOUD RATHER THAN INHERITED.

  This page renders the name of a space that may be under negotiation and its
  street address. `nextjs-architecture.md`'s gate *cache esplicita* requires a
  surface showing secret data to declare it, and its gate *service worker* is the
  sharper half: Serwist serves content when the network is missing, including OLD
  content, and a stale record is an address rendered to whoever is holding the
  phone now rather than to whoever was entitled when it was cached.

  `cookies()` inside `createClient` already opts this route out of static
  rendering, so this line changes no behaviour today. It is here because the
  reason must survive a refactor that removes the cookie read.
*/
export const dynamic = "force-dynamic";
