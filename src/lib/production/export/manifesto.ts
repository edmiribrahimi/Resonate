/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  THE TABLES THIS MODULE READS — the whole list, and there is no other.    ║
 * ║                                                                          ║
 * ║    · production_section        where section = 'manifesto'                ║
 * ║    · production_open_question  where section = 'manifesto' or is null,    ║
 * ║                                and still open                            ║
 * ║    · formats                   id, name and code — never colour          ║
 * ║                                                                          ║
 * ║  Nothing else. No venue table, no calendar table, no scouting table, no   ║
 * ║  ticket table. This block is the sentence check C of                      ║
 * ║  `scripts/verify-section-export.mjs` reads back from the queries below.   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * The sound manifesto, serialised for whoever goes to the console.
 *
 * ── WHAT THIS MODULE ASSERTS, in one sentence ───────────────────────────────
 *
 * This document **cannot carry an address or an unannounced date, because it
 * does not read the tables that hold them** — not because whoever presses the
 * control is careful (D-45-17).
 *
 * That is a claim about reachability, and it is checked rather than stated:
 * `verify-section-export.mjs` walks the import closure from this file, derives
 * the forbidden table list from the declared schema instead of taking one typed
 * by hand, and fails if any module the walk reaches queries one of them. The
 * narrowness above is what makes that walk short enough to be worth anything.
 *
 * ⚠ **The forbidden list is an ALLOW-LIST here and a deny-list there, and the
 * asymmetry is the point.** The gate can only forbid the tables it knows about; a
 * table added next year is covered only once it declares a dangerous column. This
 * module does not rely on that: it names the three tables it reads, at the top,
 * and a fourth read added below is a change to a list somebody has to edit on
 * purpose. A deny-list silently passes every column added later. An allow-list
 * does not.
 *
 * ── The client is the COOKIE-BOUND one, and this module builds it itself ────
 *
 * No service-role client is imported here and none may be. Both authored sections
 * live in **one table**, so a read that bypassed row level security would return
 * the other section's rows to a caller holding this section's key — an export
 * assembled from rows its caller could never have read is a leak with a nice
 * format. The policies of `20260817120300_production_sections_access.sql` are the
 * boundary, and reading through them is what makes them the boundary here too.
 *
 * The module owns the read rather than taking rows as an argument, so that the
 * closure the gate walks is the whole story: an arm that fetched its own rows
 * would be a query outside the thing being checked.
 *
 * ── Three states, three different documents ────────────────────────────────
 *
 * `sound-manifesto.md` names **two opposite errors** and this serialiser is
 * shaped so that it commits neither:
 *
 *   * **written** — the rule, as authored, in full;
 *   * **coordinates declared** — introduced by a line saying the manifesto itself
 *     is not written **and that what follows binds anyway**, exclusions included.
 *     A brief that dropped the exclusions would let a selector work them out
 *     again, wrongly: *not techno* is a decision as much as any inclusion, and it
 *     exists because somebody had already assumed the opposite;
 *   * **not decided** — *what is missing* and *whose call it is*, and **no prose
 *     invented to fill the page.** *Not yet defined* is a correct answer here.
 *     Synthesising plausible strata, tempi or reference artists would write the
 *     brand on behalf of whoever owns it — and once it is in a brief it IS the
 *     brand for whoever reads it.
 *
 * ── The open questions travel with it, and that is why a failed read refuses ─
 *
 * *Un solo manifesto o uno per sede* is open, and while it is open **no material
 * may take either answer for granted**. A brief handed over without its open
 * questions reads as settled to the person holding it, who has no way to know
 * anything is missing — so a register that did not answer refuses the whole
 * document rather than producing a quieter one.
 *
 * ── And there is no third document ─────────────────────────────────────────
 *
 * The location section has **no export**, and never will (D-45-21 consequence 2):
 * the manifesto and the capitolato leave the perimeter, and scouting does not. A
 * module named after it appearing beside this one fails the gate **by name**,
 * before any walk, whether or not these two files exist.
 */

import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  PERIMETER_NOTICE,
  type ExportResult,
} from "@/lib/production/sections/export-contract";
import type { SectionState } from "@/lib/production/sections/vocabulary";
import type {
  Format,
  ProductionOpenQuestion,
  ProductionSection,
} from "@/types/database";

/* ────────────────────────────────────────────────────────────────────────────
 * The shapes the three reads return
 * ──────────────────────────────────────────────────────────────────────────── */

/*
  ⚠ NOTHING CHECKS THESE AGAINST THE DATABASE.

  No Supabase client in this repository is parameterised with `Database`, so a
  select string is a string as far as the compiler is concerned and the casts
  below are assertions. Composed with `Pick` rather than restated, for the reason
  both read surfaces give: a second hand-written copy of a column list is a
  second place to change, and only one of the two would be changed.
*/
type SectionRow = Pick<
  ProductionSection,
  "id" | "format_id" | "title" | "state" | "body" | "missing" | "decision_owner"
>;

type QuestionRow = Pick<
  ProductionOpenQuestion,
  "id" | "question" | "decision_owner" | "format_id"
>;

/**
 * The catalogue, read SEPARATELY rather than embedded.
 *
 * Two reasons, and the second is the one that decided it. An embed through a
 * table with more than one relationship to the embedded table is answered with
 * `HTTP 300 PGRST201` and the failure is **silent** through this client — `data`
 * comes back null with no exception — which on a document that is about to leave
 * the perimeter would produce a brief with every rule missing. And a separate
 * read is the one shape check C of the gate can see: it reads `.from(…)` and is
 * blind to a table named inside a select string, so an embed would leave the
 * positive half of that check passing vacuously.
 *
 * ⚠ `color` is not selected. Every format carries an identification colour and
 * one printed in a brief becomes a palette nobody decided — `brand-visual-system.md`,
 * gate *il colore non si eredita*. A value that is never loaded cannot be
 * rendered by accident.
 *
 * `code` is the format's own sigla — `RSNT`, `SNST`, `RMDB`, `MTNLB`. The
 * per-venue form of a sigla is NOT built here and must not be: it carries a venue.
 *
 * ⚠ `retired_at` IS selected, and the read is no longer filtered on it. The
 * filter used to live in the query, which meant the map of names held only active
 * formats and *this rule belongs to no format* and *this rule belongs to a
 * retired format* arrived at the renderer as the same fact. The catalogue is now
 * read whole and the two are separated where they are actually different — see
 * `render`. The column is a timestamp with no venue and no unannounced date in
 * it, and nothing below prints it.
 */
type FormatRow = Pick<Format, "id" | "name" | "code" | "retired_at">;

/* ────────────────────────────────────────────────────────────────────────────
 * The document
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The filename. No date, no venue, no format.
 *
 * A filename is a string somebody pastes into a message, forwards and reads
 * aloud; it travels further than the file and it arrives where the document's own
 * header does not.
 */
const FILENAME = "sound-manifesto.md";

/** Produce the manifesto, or refuse by name. */
export async function buildSoundManifesto(): Promise<ExportResult> {
  const supabase = await createClient();

  const { data: sectionData, error: sectionError } = await supabase
    .from("production_section")
    .select("id, format_id, title, state, body, missing, decision_owner")
    .eq("section", "manifesto")
    .order("title", { ascending: true });

  if (sectionError) {
    console.error(
      `[manifesto.export_sections_read_failed] code=${sectionError.code ?? "unknown"} message=${sectionError.message}`
    );
    return { ok: false, reason: "sections_read_failed" };
  }

  /*
    The register: this section's entries and the brand-wide ones, still open.

    `section IS NULL` is not an oversight — a question can bear on the whole brand
    rather than on one body of rules, and those are precisely the ones nobody else
    is going to raise. `closed_at IS NULL` because a closed entry carries its
    answer and a brief that kept warning about settled questions is a brief whose
    warnings stop being read.
  */
  const { data: questionData, error: questionError } = await supabase
    .from("production_open_question")
    .select("id, question, decision_owner, format_id")
    .or("section.eq.manifesto,section.is.null")
    .is("closed_at", null)
    .order("opened_at", { ascending: true });

  if (questionError) {
    console.error(
      `[manifesto.export_questions_read_failed] code=${questionError.code ?? "unknown"} message=${questionError.message}`
    );
    return { ok: false, reason: "questions_read_failed" };
  }

  /*
    The catalogue, WHOLE — retired formats included, and the filter moved into the
    rendering where it belongs.

    Retirement decides how a format is READ (it carries no heading of its own, and
    its sigla is not cited in anything that leaves), not whether this module is
    allowed to know its name. A read filtered here left the renderer unable to
    tell a rule that belongs to NO format from a rule that belongs to a RETIRED
    one, and it published the second as the first.
  */
  const { data: formatData, error: formatError } = await supabase
    .from("formats")
    .select("id, name, code, retired_at")
    .order("sort_order", { ascending: true });

  if (formatError) {
    console.error(
      `[manifesto.export_formats_read_failed] code=${formatError.code ?? "unknown"} message=${formatError.message}`
    );
    return { ok: false, reason: "formats_read_failed" };
  }

  const sections = (sectionData ?? []) as unknown as SectionRow[];
  const questions = (questionData ?? []) as unknown as QuestionRow[];
  const formats = (formatData ?? []) as unknown as FormatRow[];

  return {
    ok: true,
    document: {
      filename: FILENAME,
      markdown: render(sections, questions, formats),
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Rendering — and every sentence it may not write
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The document, assembled.
 *
 * The order is chosen and not incidental: what the document is, then what it must
 * not carry, then the rules, then what is still open. The perimeter notice sits
 * **before** the content because it is a step the reader takes before sending it
 * on, and an instruction after the thing it governs is an instruction read too
 * late.
 */
function render(
  sections: readonly SectionRow[],
  questions: readonly QuestionRow[],
  formats: readonly FormatRow[]
): string {
  /*
    ── TWO COLLECTIONS OUT OF ONE READ, and the split is the whole of the fix ──

    `named` is EVERY format the catalogue answered with, retired ones included. It
    answers *which format is this rule for?*

    `listed` is the active ones. It decides *what order is this document read in,
    and which headings does it carry?*

    They used to be one collection, built from a read filtered on `retired_at is
    null`. `!named.has(row.format_id)` was then true for two different reasons at
    once — *this rule belongs to no format* and *this rule belongs to a format
    that is not in the active catalogue* — and the second fell into the brand-wide
    branch. So a rule written for ONE format was handed to whoever steps into the
    booth as a rule of the WHOLE BRAND. That is precisely the failure
    `export-contract.ts` refuses the entire document over when the catalogue does
    not answer — *«that is not a missing label; it is the wrong document with a
    confident face»* — happening quietly on the path where it does answer.

    ── AND THE THIRD CAUSE, WHICH THE FIX HAD TO ACCOUNT FOR ──────────────────

    There are not two causes here but three. This read goes through row level
    security: `formats_select_listed` returns what is `listed`, and everything
    else needs `catalogue.manage` — a key the two export arms do not ask for. So a
    format that is not listed is invisible to this module whatever its retirement
    says, and a rule pointing at one arrives with a `format_id` that names nothing
    in the answer. `brandWide` is therefore defined POSITIVELY — `format_id is
    null`, and nothing else — so every leftover is a leftover by construction
    rather than by a condition somebody has to keep complete.
  */
  const named = new Map(formats.map((format) => [format.id, format]));
  const listed = formats.filter((format) => format.retired_at === null);

  const out: string[] = [
    "# Sound manifesto",
    "",
    "How a format is played — never who plays it, and never when.",
    "",
    "What is written here binds. What is **not written** is an answer too, and it is not the same as unconstrained: a format with no manifesto can still carry declared coordinates, including things it explicitly is not, and those bind. Nothing in this document is filled in from anywhere else — where a rule is undecided it says what is missing and whose call it is, and stops there.",
    "",
    PERIMETER_NOTICE,
    "",
  ];

  if (sections.length === 0) {
    /*
      The empty document, and it is a document rather than an error.

      The tables were applied to production and hold no rows. *Nothing has been
      recorded yet* is the true state, and it is written as such — no sample rule,
      no placeholder manifesto, no adjective describing a sound. A brief that
      invented one to avoid looking short would be the brand for whoever read it.
    */
    out.push(
      "## Nothing has been recorded yet",
      "",
      "No rule of this manifesto has been written down. That is the state as it stands, not a document that failed to load, and nothing has been invented to fill it: for every format, the honest answer today is that it is not yet written.",
      ""
    );
  } else {
    /*
      Grouped by format, with the brand-wide rules last.

      A rule that belongs to no format is not a leftover: the spelling, the way a
      brief is handed over and what a document may carry are properties of the
      brand. It goes last because a reader looking for one format's rules is
      looking for a heading with a name on it.
    */
    for (const format of listed) {
      const mine = sections.filter((row) => row.format_id === format.id);
      if (mine.length === 0) continue;
      out.push(`## ${format.name} · ${format.code}`, "");
      for (const row of mine) out.push(...renderSection(row));
    }

    /*
      Brand-wide means ONE thing, and it is the thing the column says.

      Not *no format*, plus *a format I could not name*, plus *a format that was
      retired* — those are four sentences that happen to fail the same test, and
      this heading is the one place in the document where the difference is the
      whole content of the heading.
    */
    const brandWide = sections.filter((row) => row.format_id === null);
    if (brandWide.length > 0) {
      out.push("## Across the whole brand", "");
      for (const row of brandWide) out.push(...renderSection(row));
    }
  }

  out.push(...renderWithheld(sections, named));
  out.push(...renderQuestions(questions, named));

  return out.join("\n");
}

/**
 * One rule, in whichever of the three states it is in — and the three read as
 * three different things on the page.
 *
 * Folding two of them into one rendering is the failure this whole vocabulary
 * exists to prevent: a declared coordinate printed like an unwritten rule reads
 * as FREE, and a format that reads as free gets written by whoever is under
 * deadline.
 *
 * `state` is the union, so a fourth state added to the vocabulary is a build
 * error here rather than a rule that falls through to a blank in a document
 * somebody has already sent.
 */
function renderSection(row: SectionRow): string[] {
  const state: SectionState = row.state;

  if (state === "not_decided") {
    return [
      `### ${row.title} — not yet decided`,
      "",
      "This is not written, and nothing here stands in for it. What follows is the gap itself.",
      "",
      `- **What is missing:** ${row.missing ?? "recorded without saying, which the database refuses — treat this row as broken rather than as an answer."}`,
      `- **Whose call it is:** ${row.decision_owner ?? "recorded without saying, which the database refuses — treat this row as broken rather than as an answer."}`,
      "",
    ];
  }

  if (state === "coordinates_declared") {
    return [
      `### ${row.title} — coordinates declared`,
      "",
      "The manifesto for this is not written. What follows is what has already been declared, **and it binds** — including anything it says this is *not*. An exclusion is a decision as much as an inclusion: it is here because somebody had already assumed the opposite, and it is reported rather than worked out again.",
      "",
      body(row.body),
      "",
    ];
  }

  return [`### ${row.title}`, "", body(row.body), ""];
}

/**
 * The authored prose, **verbatim**.
 *
 * Nothing is reflowed, escaped or reinterpreted. The column holds writing by
 * whoever owns the brand, and normalising it here would be this module deciding
 * what somebody else's emphasis means — the same rule both read surfaces keep by
 * rendering it with `whitespace-pre-line` and nothing else.
 *
 * A written rule with no text is a row that reached here without passing
 * `production_section_written_has_a_body`. It is reported as the defect it is,
 * rather than printed as a shorter rule.
 */
function body(text: string | null): string {
  if (text === null || text.trim() === "") {
    return "_This is marked as written and carries no text. That is a defect in the record, not a short rule — it should not have been saved in this state, and it should not be read as one._";
  }
  return text;
}

/* ────────────────────────────────────────────────────────────────────────────
 * What was left out, counted and said — never reclassified
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The rules this document withheld, as a count and a reason.
 *
 * ── THE DECISION, AND IT IS A DECISION ──────────────────────────────────────
 *
 * A rule whose format is not in the active catalogue is **not printed** here, and
 * the alternative — a heading of its own, marked *retired* — was weighed and
 * refused. `production-calendar.md` puts it as a gate: **a retired sigla is not
 * cited, not even to explain the history**, and `brand-visual-system.md` says
 * every material carries the sigla *as it is today*. A heading here is
 * `## Name · CODE` — it is the sigla, in a document written to be handed to
 * somebody outside the project who then produces work from it. Printing it would
 * trade one wrong attribution for an invitation to produce for a format that has
 * been retired.
 *
 * ── BUT WITHHOLDING IN SILENCE WOULD BE THE SAME DEFECT WEARING A ────────────
 * ── DIFFERENT FACE ──────────────────────────────────────────────────────────
 *
 * There is no error tracking in this product, and this document leaves the
 * building: a rule that vanished between the record and the brief would be
 * unobservable from either end. So the omission is **counted and named**, which
 * is the position `export-contract.ts` already takes about the palette — a
 * failure rendered INTO the document rather than dropped out of it — for the same
 * reason: a reader told *something is missing, ask* behaves correctly, and a
 * reader who was told nothing reaches for the nearest answer.
 *
 * ⚠ **The counts name no format.** Not the name, not the sigla, not the title of
 * the rule — a title can carry the format's name in it. A number and a cause is
 * the whole of what may travel.
 *
 * ── TWO CAUSES, TWO SENTENCES ───────────────────────────────────────────────
 *
 * *Retired* and *not in the answer* send a reader to two different people: the
 * first to whoever decides whether the rule retires with its format, the second
 * to whoever keeps the catalogue — because it means either a row pointing at a
 * format that is gone, or a format this account cannot read through
 * `formats_select_listed`. Collapsing them would be the shared bucket every
 * refusal union in this phase exists to avoid.
 */
function renderWithheld(
  sections: readonly SectionRow[],
  named: ReadonlyMap<string, FormatRow>
): string[] {
  const retired = sections.filter((row) => {
    if (row.format_id === null) return false;
    const format = named.get(row.format_id);
    return format !== undefined && format.retired_at !== null;
  });

  const unnameable = sections.filter(
    (row) => row.format_id !== null && !named.has(row.format_id)
  );

  if (retired.length === 0 && unnameable.length === 0) return [];

  const out = ["## What this document does not carry", ""];

  if (retired.length > 0) {
    out.push(
      `- **${count(retired.length)} written for a format that has been retired, and ${retired.length === 1 ? "it is" : "they are"} not printed above.** A retired format is not named in anything that leaves — not even to explain a history — and a rule written for one format is not a rule of the brand, so there is no heading this could have gone under. It is withheld and counted rather than moved. If you were expecting one of these, ask for it; its absence here is not permission.`,
      ""
    );
  }

  if (unnameable.length > 0) {
    out.push(
      `- **${count(unnameable.length)} pointing at a format the catalogue did not return, and ${unnameable.length === 1 ? "it is" : "they are"} not printed above.** The catalogue answered; ${unnameable.length === 1 ? "this rule does" : "these rules do"} not match anything in the answer. That is a defect in the record, or a format this account may not read — it is not a statement about the brand, and it is reported rather than reclassified. Tell whoever keeps the catalogue.`,
      ""
    );
  }

  out.push(
    "Nothing is missing from the record: what is withheld is withheld from this document, and each rule is still filed under the format it was written for.",
    ""
  );

  return out;
}

/** `1 rule` or `n rules`, so a sentence can be written once for both. */
function count(n: number): string {
  return n === 1 ? "1 rule" : `${n} rules`;
}

/**
 * What one open question BEARS ON, in words that cannot be read as another scope.
 *
 * ⚠ **`the whole brand` is now said for one reason only**, which is that the
 * question was filed against no format. It used to be what came out whenever the
 * format could not be looked up, so a question about a single format reached the
 * booth as a question about everything.
 *
 * The two other cases keep the question and say what it is really about, without
 * naming the format — the same rule the withheld rules follow, for the same
 * reason.
 */
function scopeOf(
  formatId: string | null,
  named: ReadonlyMap<string, FormatRow>
): string {
  if (formatId === null) return "the whole brand";

  const format = named.get(formatId);
  if (format === undefined) {
    return "one format, which the catalogue did not return -- not the brand as a whole";
  }
  if (format.retired_at !== null) {
    return "one format, which has been retired -- not the brand as a whole";
  }
  return format.name;
}

/**
 * What is still open, at the end, and never omitted.
 *
 * A question in this register warns and blocks nothing — a block that fires under
 * deadline is a block somebody routes around, and a routed-around block teaches
 * people to route around the next one. But it must **travel**: while a question is
 * open no material may take either of its answers for granted, and a brief that
 * hid it would let it resolve itself by habit, one set at a time.
 *
 * ⚠ **A question is KEPT where a rule is withheld, and the asymmetry is the
 * point rather than an inconsistency.** A rule tells whoever reads this what to
 * do; an open question tells them what NOT to settle. Withholding a rule removes
 * an instruction that should never have been given in that form. Withholding a
 * warning removes the only thing standing between a reader and settling the
 * question by habit — which is why a register that did not answer refuses the
 * whole document rather than producing a quieter one. So a question whose format
 * cannot be named travels, with a scope that says so.
 */
function renderQuestions(
  questions: readonly QuestionRow[],
  named: ReadonlyMap<string, FormatRow>
): string[] {
  if (questions.length === 0) {
    return [
      "## Still open",
      "",
      "Nothing is recorded as open against this manifesto. That is what the register says today — it is not a claim that every question has been asked.",
      "",
    ];
  }

  const out = [
    "## Still open",
    "",
    "These are undecided. They stop nothing, and they are not to be resolved by assumption in a set or in a piece of artwork: while one is open, neither of its answers may be taken for granted.",
    "",
  ];

  for (const question of questions) {
    out.push(
      `- **${question.question}** — ${scopeOf(question.format_id, named)}; whose call it is: ${question.decision_owner}.`
    );
  }

  out.push("");
  return out;
}
