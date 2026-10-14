/**
 * What a document that LEAVES THE PERIMETER answers with, and what it is refused
 * for.
 *
 * ── Why this is a PLAIN module, and why it is not in the export directory ────
 *
 * Two reasons, and they point at two different readers.
 *
 * **For the compiler:** every export of a `"use server"` module is a public
 * endpoint with a convenient signature, and a predicate left in one publishes
 * an oracle. What the export arm shares with the serialiser has to live
 * somewhere the arm does not publish. That is this file, exactly as
 * `write-contract.ts` is that file for the write path. *(Until 2026-10-14 there
 * were two arms, one per capability key, D-45-06; since phase 53, D-53-04, there
 * is one export — the sound manifesto.)*
 *
 * **For a person counting files:** `scripts/verify-section-export.mjs` watches
 * `src/lib/production/export` and fails BY NAME on a module named after the
 * location section, because D-45-21 consequence 2 says that section's content
 * never leaves. The clearest form of *there is one document and nothing else
 * leaves* is a directory holding exactly one file, and that file a document. A
 * contract module sitting there would be a second thing to explain to whoever
 * counts. So it sits here, beside the write contract it mirrors.
 *
 * The capitolato handed to the external designer is production material kept
 * outside the product (`brand-visual-system.md`, gate *capitolato, non file*):
 * it is not an export of this product, and since 2026-10-14 no code here
 * assembles it.
 *
 * ── Two refusals, and neither of them degrades ──────────────────────────────
 *
 * A read that failed is refused rather than skipped, and that is the sharper of
 * the two decisions in this file.
 *
 * `sound-manifesto.md`'s gate *un solo manifesto o uno per sede* says that while
 * a question is open **no material may take either answer for granted**. A brief
 * handed to whoever goes to the console, with its open questions silently
 * dropped because a second read failed, is a brief that reads as SETTLED — and
 * the person reading it has no way to know that anything is missing. The read
 * surface already takes this position in words: *a manifesto shown without its
 * outstanding questions is a manifesto that looks settled*. The serialiser takes
 * it in code.
 *
 * So there is no partial document. Either the whole thing was assembled from
 * reads that all answered, or nothing is produced and the refusal says which
 * read did not answer.
 *
 * ⚠ **One exception was recorded here, and it left with its document.** Until
 * 2026-10-14 the designer's document rendered an unreadable palette INTO itself
 * as a named, visible failure rather than refusing — a reader told *the palette
 * could not be read, do not guess* behaves correctly, one handed no palette
 * reaches for the nearest colours (`brand-visual-system.md`, gate *il colore non
 * si eredita*). That document is no longer produced here; the principle — a
 * failure rendered into the document rather than dropped out of it — is what
 * `export/manifesto.ts` applies to the rules it withholds.
 */

/**
 * Why a document could not be produced. **One member per distinguishable cause**,
 * and no shared bucket — the precedent is the newsletter form answering a network
 * fault, a missing key and an address already subscribed with the same words
 * (`.planning/codebase/CONCERNS.md`), and this product has no error tracking at
 * all, so the returned value is the whole of the observable effect.
 */
export type ExportRefusal =
  /**
   * The section's own rows could not be read. Nothing was produced.
   *
   * Its own code rather than folded with the others, because the three send a
   * reader to three different `SELECT` policies and to three different tables.
   */
  | "sections_read_failed"
  /**
   * The register of open questions could not be read. Nothing was produced.
   *
   * ⚠ **This refuses the whole document on purpose.** See the file's docblock:
   * a brief that lost its open questions is a brief that reads as settled, and
   * the person it was handed to cannot tell.
   */
  | "questions_read_failed"
  /**
   * The catalogue of formats could not be read. Nothing was produced.
   *
   * ⚠ **Also a refusal rather than a degradation, and for a reason specific to
   * this project:** every rule in either document belongs either to one format or
   * to the whole brand, and *the answer changes from format to format*. A
   * document assembled without the catalogue would print every rule under one
   * undifferentiated heading — so a rule written for one format would be read as
   * a rule of the brand by whoever was handed it. That is not a missing label; it
   * is the wrong document with a confident face.
   */
  | "formats_read_failed";

/**
 * A produced document: what it is called, and what is in it.
 *
 * ⚠ **The filename carries no date and no venue.** It names the document and
 * nothing else. A filename is a string somebody pastes into a message, forwards,
 * and reads out — it travels further than the file, and it travels where the
 * file's own header does not.
 */
export interface ExportDocument {
  /** The document's name, ending in `.md`. No date, no venue, no format code. */
  readonly filename: string;
  /**
   * The document, as Markdown.
   *
   * Markdown and not PDF, and the absence of a dependency is the decision:
   * `45-RESEARCH.md` § *Don't Hand-Roll* weighed a PDF library and refused it.
   * A package installed to typeset a document the owner can print is
   * supply-chain surface bought for a convenience — and T-45-SC treats an
   * install as a checkpoint, not as an implementation detail.
   */
  readonly markdown: string;
}

/** What either arm answers. */
export type ExportResult =
  | { readonly ok: true; readonly document: ExportDocument }
  | { readonly ok: false; readonly reason: ExportRefusal };

/**
 * What the document does NOT carry, written once as a constant.
 *
 * ── Why this is a constant and not a paragraph ──────────────────────────────
 *
 * The manifesto goes to whoever steps into the booth, and there is **one list of
 * things that must not travel** — `sound-manifesto.md`'s gate *il brief esce dal
 * perimetro* names exactly three. It was written once because, until 2026-10-14,
 * a second document for the external designer shared it; since phase 53
 * (D-53-04) the manifesto is the only document produced here. The constant
 * stays one constant so that whichever document is added next inherits it
 * rather than restating it.
 *
 * ⚠ The text of the notice below still speaks of *these documents* in the
 * plural. It is the content of the produced document, not a comment, and it was
 * left unchanged on purpose by a prose-only plan (53-06): rewording it changes
 * what the owner hands over.
 *
 * ── The first two are structural. The third is not, and it says so. ─────────
 *
 * The serialiser reads no table that holds an address or a date, so the first
 * two lines below are facts about what the code can reach — provable by
 * `scripts/verify-section-export.mjs` walking the import closure from the
 * document, and not by anybody being careful.
 *
 * **The third cannot be reached that way.** A name typed into the body of a rule
 * by its author travels with the body, and no closure walk can read prose. So the
 * third line is written as a step for a person and not as a claim of proof, and
 * the control that produces these documents carries the same sentence beside it.
 * Stating it as a limit is the whole of the mitigation; calling it covered would
 * be worse than not having written it.
 */
export const PERIMETER_NOTICE = [
  "## Before this is handed over",
  "",
  "This document is written to leave: it goes to somebody outside the project, and what leaves does not come back.",
  "",
  "- **It carries no address, and it never names a secret venue.** Where a piece is for a night whose location is not public, the material says `@ Secret Venue` and nothing else. Neither of these documents can reach an address: no query in them touches a table that holds one.",
  "- **It carries no date.** These are rules, not a calendar. Where a rule has a timing it is stated as the rule — *the listing goes out on the Tuesday* — and never as a day.",
  "- **It names no space that has not been acquired in writing.** A space in negotiation named in a document is a negotiation made public.",
  "- **Check it for a line-up before you send it.** This is the one thing no check can do for you: a name somebody typed into the body of a rule travels with that rule. Who plays, and when, is material — it is not part of either of these documents, and a copy that acquired one should have it removed before it goes anywhere.",
  "",
  "There is no stored copy of this document. It is assembled the moment somebody presses, from what has been recorded — so a copy in somebody's hands is exactly as old as the press that produced it, and nothing here tells them that.",
].join("\n");
