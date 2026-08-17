/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  THE TABLES THIS MODULE READS — the whole list, and there is no other.    ║
 * ║                                                                          ║
 * ║    · production_section        where section = 'visual'                   ║
 * ║    · production_open_question  where section = 'visual' or is null,       ║
 * ║                                and still open                            ║
 * ║    · formats                   id, name and code — never colour          ║
 * ║                                                                          ║
 * ║  AND ONE FILE, WHICH IS NOT A TABLE:                                      ║
 * ║    · src/app/globals.css, through the run-time reader — the palette's     ║
 * ║      values, read and never carried                                       ║
 * ║                                                                          ║
 * ║  Nothing else. No venue table, no calendar table, no scouting table, and  ║
 * ║  not the visual section's own asset table either: an artist's photograph  ║
 * ║  is material, not capitolato, and the archive stays inside the perimeter. ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * The visual capitolato, serialised for the external designer.
 *
 * ── WHAT WE HAND OVER IS THE CAPITOLATO, NOT THE FILE ───────────────────────
 *
 * `brand-visual-system.md` puts it as a gate: the artwork is produced by somebody
 * outside the project, and what this project owns and delivers is **the brief**.
 * The brief carries the rules — what is fixed and what is variable, the grid-safe
 * square, a date legible in a thumbnail, the order of publication and how it
 * inverts in the grid, the declared typography and its declared degradation — and
 * `venue-secrecy.md` adds the half that decides this module's shape: **it does
 * not carry the address.**
 *
 * ── WHAT THIS MODULE ASSERTS, in one sentence ───────────────────────────────
 *
 * This document **cannot carry an address or an unannounced date, because it does
 * not read the tables that hold them** (D-45-17) — and `verify-section-export.mjs`
 * proves it by walking the import closure from this file rather than by anybody
 * being careful. The list at the top is an **allow-list**: three tables named on
 * purpose, so that a fourth read is an edit somebody makes deliberately. A
 * deny-list would silently pass every column added later.
 *
 * ⚠ **The rules in this document are AUTHORED, and this module writes none of
 * them.** It is the container, not the author. Where nothing has been recorded it
 * says so — it does not fill the page with the rules it happens to know, because
 * a rule that arrived from a serialiser is a rule nobody decided, and once it is
 * in a designer's hands it is the capitolato for whoever reads it. The two
 * prohibitions below are the exception, and they are not brand rules: they are
 * conditions of **handing the document over**, and they belong on every copy
 * whatever anybody has written.
 *
 * ── THE PALETTE IS READ, NEVER RESTATED — D-45-09 ──────────────────────────
 *
 * A capitolato names colours, and `verify:semantic-separation` check B forbids any
 * file under `src/` from containing a value declared in the token file's `:root`.
 * That is not a tension to route around: **it is the gate working.** The values
 * come from `src/lib/production/sections/tokens.ts` at run time, so there is no
 * literal in this file for the check to find and **no third exemption was added
 * to that gate's list**.
 *
 * ⚠ And if the palette cannot be read, it is **rendered as a named failure inside
 * the document** rather than dropped. This is the one place this module degrades
 * instead of refusing, and the reason is what the reader does next: a designer
 * handed *the palette could not be read, do not guess* behaves correctly, and one
 * handed a document with no colour section at all reaches for the nearest colours
 * — which is `brand-visual-system.md`'s gate *il colore non si eredita* failing on
 * the far side of the perimeter, where nobody here would see it.
 *
 * ── The client is the COOKIE-BOUND one, and this module builds it itself ────
 *
 * No service-role client is imported here and none may be. Both authored sections
 * live in **one table**, so a read that bypassed row level security would return
 * the other section's rows to a caller holding this section's key — a document
 * assembled from rows its caller could never have read is a leak with a nice
 * format. The module owns the read rather than taking rows as an argument, so
 * that the closure the gate walks is the whole story.
 *
 * ── And there is no third document ─────────────────────────────────────────
 *
 * The location section has **no export** (D-45-21 consequence 2). Scouting never
 * leaves the perimeter: a space that has not been acquired in writing is not named
 * in any material, any caption or any capitolato, and a module offering to carry
 * that list would be the decision reversed in a filename. The gate fails **by
 * name** if one appears beside this file.
 */

import "server-only";

import { readBrandPalette } from "@/lib/production/sections/tokens";
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
  ⚠ NOTHING CHECKS THESE AGAINST THE DATABASE. No client here is parameterised
  with `Database`, so the casts below are assertions rather than checks. Composed
  with `Pick` and never restated: a second hand-written copy of a column list is a
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
 * The catalogue, read SEPARATELY rather than embedded — the same two reasons the
 * manifesto's serialiser gives: an ambiguous embed fails **silently** through this
 * client and would produce a brief with every clause missing, and check C of the
 * gate reads `.from(…)` and is blind to a table named inside a select string.
 *
 * ⚠ `color` is not selected, and on this document the reason is at its sharpest:
 * every format carries an identification colour, **including the one that has no
 * palette of its own**, and a colour printed in the document whose subject IS the
 * palette becomes a palette nobody decided.
 */
type FormatRow = Pick<Format, "id" | "name" | "code">;

/* ────────────────────────────────────────────────────────────────────────────
 * The document
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The filename. No date, no venue, no format.
 *
 * A filename is a string somebody pastes into a message and reads aloud; it
 * travels further than the file, and it arrives where the document's own header
 * does not.
 */
const FILENAME = "visual-capitolato.md";

/** Produce the capitolato, or refuse by name. */
export async function buildVisualCapitolato(): Promise<ExportResult> {
  const supabase = await createClient();

  const { data: sectionData, error: sectionError } = await supabase
    .from("production_section")
    .select("id, format_id, title, state, body, missing, decision_owner")
    .eq("section", "visual")
    .order("title", { ascending: true });

  if (sectionError) {
    console.error(
      `[visual.export_sections_read_failed] code=${sectionError.code ?? "unknown"} message=${sectionError.message}`
    );
    return { ok: false, reason: "sections_read_failed" };
  }

  /*
    The register: this section's entries and the brand-wide ones, still open.

    `section IS NULL` matters more here than anywhere: the spelling of the brand,
    the grid-safe square and the order of publication belong to no single format,
    and they are exactly the questions a designer would otherwise settle by
    picking one.
  */
  const { data: questionData, error: questionError } = await supabase
    .from("production_open_question")
    .select("id, question, decision_owner, format_id")
    .or("section.eq.visual,section.is.null")
    .is("closed_at", null)
    .order("opened_at", { ascending: true });

  if (questionError) {
    console.error(
      `[visual.export_questions_read_failed] code=${questionError.code ?? "unknown"} message=${questionError.message}`
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
      `[visual.export_formats_read_failed] code=${formatError.code ?? "unknown"} message=${formatError.message}`
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
 * Rendering
 * ──────────────────────────────────────────────────────────────────────────── */

function render(
  sections: readonly SectionRow[],
  questions: readonly QuestionRow[],
  formats: readonly FormatRow[]
): string {
  const named = new Map(formats.map((format) => [format.id, format]));

  const out: string[] = [
    "# Visual capitolato",
    "",
    "This is the brief, not the artwork — the rules a piece is produced against.",
    "",
    PERIMETER_NOTICE,
    "",
  ];

  if (sections.length === 0) {
    out.push(
      "## Nothing has been recorded yet",
      "",
      "No clause of this capitolato has been written down. That is the state as it stands, not a document that failed to load — and nothing has been invented to stand in for it: no sample clause, no borrowed palette, no rule that arrived from a program rather than from whoever owns the brand.",
      ""
    );
  } else {
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

  out.push(...renderPalette());
  out.push(...renderQuestions(questions, named));

  return out.join("\n");
}

/**
 * One clause, in whichever of the three states it is in.
 *
 * `state` is the union, so a fourth state added to the vocabulary is a build
 * error here rather than a clause falling through to a blank in a document
 * somebody has already sent to a designer.
 */
function renderSection(row: SectionRow): string[] {
  const state: SectionState = row.state;

  if (state === "not_decided") {
    return [
      `### ${row.title} — not yet decided`,
      "",
      "This is not settled, and nothing here stands in for it. Do not resolve it in a piece: what follows is the gap itself.",
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
      "This clause is not settled. What follows is what has already been declared, **and it binds anyway** — including anything it says is *not* allowed. A prohibition is a decision as much as a permission, and it is here because somebody had already assumed the opposite.",
      "",
      body(row.body),
      "",
    ];
  }

  return [`### ${row.title}`, "", body(row.body), ""];
}

/**
 * The authored prose, **verbatim** — nothing reflowed, escaped or reinterpreted.
 * The column holds a document written by whoever owns the brand.
 */
function body(text: string | null): string {
  if (text === null || text.trim() === "") {
    return "_This is marked as written and carries no text. That is a defect in the record, not a short rule._";
  }
  return text;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The palette — values read at run time, and a failure that is counted
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The colour table, from the one place the colours are declared.
 *
 * ⚠ **There is no colour value written in this file.** Each row of the table is
 * assembled from what the token file declares at the moment somebody presses, so
 * the document and the product cannot disagree — six colours written twice are
 * six colours that diverge, and this project already spent a migration making one
 * place authoritative.
 *
 * The sentence under the table is the interim rule and it is not decoration: a
 * format that has **no palette yet** does not inherit this one — its materials
 * stay neutral until somebody decides. Borrowing colours to fill the gap is how a
 * format loses an identity before it has one, and it is the likeliest thing for a
 * designer to do in good faith with a document that did not say.
 *
 * ⚠ **Which format that is, is NOT written here.** That is authored content — a
 * clause above, in the undecided state, naming the gap and the role that closes
 * it — and a constant in a serialiser asserting it would be this module settling a
 * question the register exists to keep open.
 */
function renderPalette(): string[] {
  const palette = readBrandPalette();

  if (!palette.ok) {
    /*
      Counted and visible, never a silent drop.

      There is no error tracking in this project, so a failure that only reached a
      log would reach nobody — and this one leaves the building inside a document.
      The code distinguishes the four causes; the sentence tells the person holding
      the brief what to do, which is: not guess.
    */
    console.error(
      `[visual.export_palette_unreadable] code=${palette.code} message=${palette.message}`
    );
    return [
      "## The palette",
      "",
      `> **The palette could not be read, and this document was produced without it.** (\`${palette.code}\`)`,
      "",
      "This is a stated absence, not an omission you may fill. Ask for the colour values before producing anything that uses them — do not sample them from an existing piece, and do not approximate them: a colour that drifted once stays drifted across everything produced after it.",
      "",
    ];
  }

  const out = [
    "## The palette",
    "",
    "| Name | Value |",
    "| --- | --- |",
  ];

  for (const token of palette.tokens) {
    out.push(`| \`${token.name}\` | \`${token.value}\` |`);
  }

  out.push(
    "",
    "These are read from the project's own stylesheet at the moment this document is produced, so they are the values in use and not a copy that has aged.",
    "",
    "**A format with no palette of its own does not inherit this one.** Until it has one, its materials stay neutral: borrowing colours to fill the gap is how a format loses its identity before it has acquired one. Where one format's colour treatment is its exclusive signature, it stays exclusive — using it elsewhere takes the meaning away from the format it belongs to. Which format is in which position is a clause above; it is not stated here, because it is a decision to be read from the rules rather than from a colour table.",
    ""
  );

  return out;
}

/**
 * What is still open, at the end, and never omitted.
 *
 * On this document it is the difference between a designer asking and a designer
 * choosing. A question that reached the brief gets asked; one that did not gets
 * settled in a piece of artwork, and the piece is then the decision.
 */
function renderQuestions(
  questions: readonly QuestionRow[],
  named: ReadonlyMap<string, FormatRow>
): string[] {
  if (questions.length === 0) {
    return [
      "## Still open",
      "",
      "Nothing is recorded as open against this capitolato. That is what the register says today — it is not a claim that every question has been asked.",
      "",
    ];
  }

  const out = [
    "## Still open",
    "",
    "These are undecided. They stop nothing, and they are not to be resolved inside a piece: while one is open, neither of its answers may be taken for granted. If one of them blocks you, ask — do not choose.",
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
