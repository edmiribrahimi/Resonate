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
 */
type FormatRow = Pick<Format, "id" | "name" | "code">;

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

  const { data: formatData, error: formatError } = await supabase
    .from("formats")
    .select("id, name, code")
    .is("retired_at", null)
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
  const named = new Map(formats.map((format) => [format.id, format]));

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
    for (const format of formats) {
      const mine = sections.filter((row) => row.format_id === format.id);
      if (mine.length === 0) continue;
      out.push(`## ${format.name} · ${format.code}`, "");
      for (const row of mine) out.push(...renderSection(row));
    }

    const brandWide = sections.filter(
      (row) => row.format_id === null || !named.has(row.format_id)
    );
    if (brandWide.length > 0) {
      out.push("## Across the whole brand", "");
      for (const row of brandWide) out.push(...renderSection(row));
    }
  }

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

/**
 * What is still open, at the end, and never omitted.
 *
 * A question in this register warns and blocks nothing — a block that fires under
 * deadline is a block somebody routes around, and a routed-around block teaches
 * people to route around the next one. But it must **travel**: while a question is
 * open no material may take either of its answers for granted, and a brief that
 * hid it would let it resolve itself by habit, one set at a time.
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
    const format =
      question.format_id === null ? null : named.get(question.format_id) ?? null;
    const scope = format === null ? "the whole brand" : format.name;
    out.push(
      `- **${question.question}** — ${scope}; whose call it is: ${question.decision_owner}.`
    );
  }

  out.push("");
  return out;
}
