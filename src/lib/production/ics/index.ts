/**
 * The production calendar's reader, in one import.
 *
 * Seven modules — the vocabularies, the line unfolder, the parser, the classifier,
 * the anchor resolver, the reconciler and the feed guard — behind one specifier, so
 * that the local script and the golden-file check read the same definitions rather
 * than two that agree today.
 *
 * ── (a) EVERY MODULE BEHIND THIS BARREL IS PURE ─────────────────────────────
 *
 * No request headers, no Supabase client, no filesystem, no network call, and no
 * date object constructed anywhere in the directory. `now` is an argument to
 * {@link reconcile}; a weekday is integer arithmetic on a `YYYY-MM-DD` string
 * (`./anchors`); the alias map and the pipeline rules arrive as arguments because
 * their values are words for spaces and rows in a table, not literals in a public
 * repository.
 *
 * That purity is not an aesthetic. It is what lets the same code be exercised by a
 * local script, by the golden-file check of plan 44-08, and — if the owner ever
 * reverses claim (c) below — by a caller rather than by a redesign. The
 * alternative is what this repository has already paid for twice and written down:
 * three menus and ten ownership checks, each internally consistent and none
 * agreeing with the others (`src/lib/routes/staff-tabs.ts`,
 * `src/lib/capabilities/guards.ts`).
 *
 * It is also what makes the claim *the import writes nothing* checkable rather
 * than believed: a module with no client cannot write, whoever calls it.
 *
 * ── (b) ⚠ THIS BARREL MUST NEVER BE RE-EXPORTED FROM A SERVER-ACTION MODULE ──
 *
 * A file carrying the server-action directive publishes **every one of its exports
 * as a public endpoint**, invocable directly, with a forged body, by anybody who
 * can reach the deployment. Re-exporting the parser from such a file would publish
 * a calendar reader as a door — and being imported from a page that a capability
 * opened protects none of it (`nextjs-architecture.md`, gate *server action
 * autorizzata*).
 *
 * That is precisely why `src/lib/media/may-upload.ts` is a plain module and not an
 * export of its neighbour, and the reason is written into that file: leaving the
 * predicate in the action and exporting it so a second caller could reuse it would
 * have published an oracle. Naming the rule **here**, next to the thing it
 * protects, is the same device applied to this directory.
 *
 * The directive itself is deliberately **not spelled anywhere under
 * `src/lib/production/`** — not in code and not in the sentence forbidding it —
 * for the reason `src/app/(admin)/admin/formats/actions.ts:58-63` gives about its
 * own forbidden literal: *a grep whose only match is the sentence forbidding the
 * thing is a grep that gets ignored the third time it goes red.* A mechanical
 * check over this directory has nothing to find, and that is what makes it worth
 * running. `./vocabulary` claim (b) uses the same discipline for the seventh piece
 * kind, and `./anchors` for the four date-library names.
 *
 * ── (c) ⚠ D-44-26: THE IMPORT IS A LOCAL SCRIPT ONLY ────────────────────────
 *
 * There is **no upload surface in this product**: no Server Action that accepts a
 * file, no route that receives one, and no drag target anywhere. That is a
 * decision, not an omission, and the reason is not convenience.
 *
 * An in-product upload would make the `.ics` **transit a serverless function** —
 * carrying spaces under negotiation, unannounced dates and line-ups into logs,
 * caches, framework error pages and whatever a future exception handler decides to
 * echo. The owner's own flow is *many changes on the Mac, then update the app*, so
 * the upload would buy no convenience while adding that cost. The surface does not
 * exist today, and criterion 2 of this phase exists to keep it from existing.
 *
 * The material itself never leaves the machine: `docs/` is gitignored and held
 * there by check **F** of `npm run verify:persona`, which requires both that the
 * directory is ignored and that nothing inside it is already tracked — a
 * `.gitignore` does not remove from the index what is already in it.
 *
 * **Where this disagrees with the research, and it does:** `44-RESEARCH.md`
 * §Import Path recommends building the upload **as well as** the script, and
 * weighs it fairly. That document is dated **before** the owner closed the
 * question. The disagreement is written down instead of smoothed over, so the next
 * reader who opens the research is not surprised by an absence and does not
 * "complete" the phase by building the thing it deliberately left out. Where the
 * two differ, the owner's decision wins (`44-UI-SPEC.md` §11.3).
 *
 * ── What a green build does NOT prove ───────────────────────────────────────
 *
 * That the modules behind this barrel read the real file correctly. Every count —
 * the entries, the four classes, the anchors' conformance, and the empty plan of a
 * second pass — is asserted by `scripts/verify-ics-import.mjs` in plan 44-08,
 * against the file the owner supplied on one day. Nothing here claims a criterion
 * of this phase is satisfied.
 */

export * from "./vocabulary";
export * from "./unfold";
export * from "./parse";
export * from "./classify";
export * from "./anchors";
export * from "./reconcile";
export * from "./guard";
