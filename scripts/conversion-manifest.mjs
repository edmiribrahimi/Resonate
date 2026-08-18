/**
 * conversion-manifest — the declared list of what Phase 41 has actually converted.
 *
 * > **A surface enters `CONVERTED` when the WHOLE surface has been converted,
 * > and adding an entry is a DECISION, not a diff nobody reads.**
 *
 * That sentence is the whole point of the file. Criterion 1 of this phase says
 * *"a surface shows the pattern only once that whole surface has been
 * converted"* — a sentence no script can evaluate on its own, because "whole
 * surface" is a judgement about what a person meets, not a property of a file.
 * What a script CAN do is take a human's written claim and check it: plan
 * 41-07's G1 walks a declared surface's import closure and G4 reads the same
 * list. This module is the one place either of them looks, so a wrong entry
 * makes a gate assert the right thing about the wrong file — which is why every
 * entry here carries its reason, and why the shape is `[value, …, reason]`
 * pairs rather than bare strings.
 *
 * The form is not invented. `scripts/verify-routes.mjs` (`PUBLIC_ALLOW`) already
 * writes an allow-list as `[value, reason]` pairs so the reason travels with the
 * entry; `scripts/verify-sunset-gradient.mjs` (`ALLOW_LIST`) already writes
 * *"adding the first one is a DECISION that edits this constant"*; and
 * cross-script ESM import is already house style
 * (`scripts/verify-capabilities.mjs` imports from `scripts/rls-baseline.mjs`).
 * This module composes two existing patterns and adds none.
 *
 * ── Safe to import, and that is a requirement, not a courtesy ────────────────
 *
 * **Nothing here runs at import time.** No walk, no read, no print, no exit. A
 * consumer imports the lists, then calls `checkManifest()` and decides what to
 * do with what comes back. A module that printed a gate report or exited on
 * import would make every future gate that reads it impossible to compose.
 *
 * ── A vacuous green is not a green ──────────────────────────────────────────
 *
 * `verify-tokens.mjs` states the rule this file inherits: a refusal is not a
 * failure, it means **the measurement did not happen**, and it exits 2 rather
 * than 1. An empty `CONVERTED` is exactly that case — a gate scoped to
 * converted surfaces with no converted surface to scan would print a tick
 * having measured nothing, and a tick that cannot go red is worse than no tick,
 * because it makes a phase look supervised. `checkManifest()` returns that
 * condition; **a consumer that ignores it is the defect, and there is no way to
 * make this module force the issue from here.**
 */

import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * `existsSync`, made CASE-EXACT — one verdict on any filesystem.
 *
 * ── The defect this closes, which is a CLASS and not a line ─────────────────
 *
 * `DEF-41-07` item 3 asked whether the case-sensitivity exposure at
 * `scripts/verify-dialogs.mjs:1191` was a line or a class. **It is a class**,
 * and this file held the other half of it: the three existence checks in
 * `checkManifest()` below. The first half is repaired in `verify-dialogs.mjs`
 * by plan 41.1-02, in the same wave; this is the second, and `41.1-RESEARCH.md`
 * §4.6 row 4 is where both are named together.
 *
 * The house volume is APFS, **case-insensitive** (`CLAUDE.md` Guardrail 6),
 * while every declared path here is compared case-EXACTLY by the gates that
 * consume this list — an import-closure walk emits the path the filesystem
 * spells, and a set membership test is byte-for-byte. So a single case typo in
 * an entry below produced **two different verdicts depending on where the
 * repository was checked out**: silently accepted here on a Mac, refused as
 * missing on a case-sensitive volume, and in between, a gate asserting the right
 * thing about a file it identified by a name the tree does not use. A gate whose
 * answer depends on the filesystem is not a gate; it is a coin.
 *
 * ── How ─────────────────────────────────────────────────────────────────────
 *
 * Each segment of the relative path is matched byte-for-byte against the actual
 * directory entries, from `ROOT` down. `Array.prototype.includes` on strings is
 * an exact comparison, so `Login` never matches `login` — which is the whole
 * point, and it is why this cannot be written as a second `existsSync`.
 *
 * `existsSync` is still asked FIRST, and only as a fast negative: a path that
 * does not exist under any casing needs no directory read.
 *
 * **What it deliberately does not do.** It does not normalise Unicode. HFS+ and
 * APFS can store a decomposed (NFD) form of a name a source file spells composed
 * (NFC), and this would call those different. Every path in this manifest is
 * ASCII, so the condition is not reachable today; it is written down rather than
 * discovered by whoever first adds a path with an accent in it.
 */
export function existsCaseExact(relPath) {
  if (!existsSync(join(ROOT, relPath))) return false;

  let dir = ROOT;
  for (const segment of relPath.split("/")) {
    if (segment === "") continue;
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return false;
    }
    if (!entries.includes(segment)) return false;
    dir = join(dir, segment);
  }
  return true;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SPINE — the shared components, excluded from an import-closure walk
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The shared spine D-41-01 names, converted by plans 41-03 and 41-04.
 *
 * **Why a converted surface's import-closure walk skips these.** Read
 * literally, criterion 1 plus transitive component sharing fuses 24 of the 41
 * pages into a single indivisible unit of 104 files — a big bang, which is
 * precisely what the criterion exists to prevent. Converting the spine first
 * breaks that unit into 34, of which 31 are a single page.
 *
 * **And it is not the global replacement the criterion forbids**, because the
 * criterion protects a *person* from meeting a half-converted surface. The
 * spine has no surface of its own; it is what surfaces sit on. Converting it
 * shows nobody a Frankenstein page. The prohibition is about what someone sees,
 * not about how many files a commit touches.
 *
 * **The state column is load-bearing.** A spine list that claims a file is
 * converted before it is, is worse than no list at all: it would make G1 skip a
 * file that still needs the walk. `pending` means *declared spine, not yet
 * converted* — it is excluded from nothing until its plan lands.
 *
 * D-41-01 counts fourteen spine members and this list has fourteen entries —
 * one file each. It had fifteen while the navigation was one member and two
 * files: D-41-21 kept a wrapper beside `AppNav` as the mechanism holding Phase
 * 42's fence, and **Phase 42 deleted it once the door mounted the phone form
 * directly** (D-42-03). The arithmetic is recorded rather than silently
 * corrected, so the entry that left is not re-derived as a missing one.
 *
 * Shape: `[path, state, reason]`, `state` one of `converted` | `pending`.
 */
export const SPINE = [
  [
    "src/components/motion/AnimatedSection.tsx", "converted",
    "motion wrapper — mounted by most surfaces, renders no surface of its own",
  ],
  [
    "src/components/motion/CountUp.tsx", "converted",
    "motion wrapper — a figure animator; §7.1 forbids the display face on any count",
  ],
  [
    "src/components/motion/MotionProvider.tsx", "converted",
    "motion wrapper — carries the reduced-motion setting for the whole library",
  ],
  [
    "src/components/motion/PressableButton.tsx", "converted",
    "motion wrapper — the press feedback the button ladder's base class inherits",
  ],
  [
    "src/components/motion/PressableCard.tsx", "converted",
    "motion wrapper — the interactive form of the card shell, and where its focus expression lives",
  ],
  [
    "src/components/motion/StaggeredList.tsx", "converted",
    "motion wrapper — list entrance; owns no layout a surface could show half-converted",
  ],
  [
    "src/components/ui/Icons.tsx", "converted",
    "the icon set — imported by nearly every surface, renders none",
  ],
  [
    "src/components/ui/Skeleton.tsx", "converted",
    "converted by plan 41-08, which is also the plan that gave it its first importer — /gallery's loading state. It was PENDING for exactly the reason this entry now records as closed: it existed, was correct and had ZERO importers while 102 hand-rolled placeholder blocks lived in 20 other files, and D-41-04 forbids calling that converted. The edit was not cosmetic either: three of its four visual strings were retired by this phase, and rendering it for the first time surfaced a width default that had been overriding every caller since the file was written",
  ],
  [
    "src/components/toast/Toast.tsx", "converted",
    "the toast body — an overlay every surface can raise, belonging to none",
  ],
  [
    "src/components/toast/ToastContainer.tsx", "converted",
    "the toast container — hard-coded the navigation's height independently, which is D-41-03's second consumer",
  ],
  [
    "src/components/toast/ToastContext.tsx", "converted",
    "the toast provider — mounted once at the root",
  ],
  [
    "src/components/formats/FormatMarker.tsx", "converted",
    "the format identification mark — data on a catalogue row, rendered inside other surfaces",
  ],
  [
    "src/components/layout/AppNav.tsx", "converted",
    "the product navigation in both tiers — the spine member every mount site shares",
  ],
  [
    "src/components/staff/StaffNav.tsx", "converted",
    "the eight work tabs in two forms — mounted by the work layout, a surface of none",
  ],
];

/* ────────────────────────────────────────────────────────────────────────────
 * PHASE_42_PATHS — the fence that stood over the door, and came down
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * **EMPTY SINCE 2026-08-18, and the argument that filled it is gone with it.**
 *
 * Three globs stood here — the scanner surface and its route, the scanner's
 * components, and the door's second address — and the docblock above them
 * argued that Phase 42 would decide what the door looks like and that no other
 * phase should open those files. **That argument is spent.** Phase 42 did the
 * work; the door is converted; and one sentence of that docblock had already
 * stopped being true, because it described a thin navigation wrapper beside
 * `AppNav` that plan 42-07 deleted. A fence whose text names a file the tree no
 * longer has is a fence nobody can check.
 *
 * **What replaced it is not silence: it is measurement.** The door's two
 * addresses are declared in `CONVERTED` below — `/admin/scanner` and `/door` —
 * so five checks that had never opened a line of that surface now walk it like
 * any other. A fence says *nobody measured this*; a `CONVERTED` entry says
 * *somebody did, and here is what whole turned out to mean*. The two are not
 * interchangeable, and the swap is the whole content of plan 42-11.
 *
 * **The constant stays exported and stays empty**, rather than being deleted.
 * Three consumers read it — `verify-conversion.mjs` refuses if it is not an
 * array, and `verify-dialogs.mjs` and `verify-touch-targets.mjs` each compare
 * their own local fence against this one and REFUSE on a drift. Deleting the
 * export would turn a compared pair into an unchecked one, which is the failure
 * direction that prints a tick.
 *
 * Shape, unchanged for whoever needs it next: `[glob, reason]`. Consumers match
 * by prefix-with-wildcard, and a consumer that cannot express a glob should
 * match the literal directory rather than approximate the pattern.
 *
 * **And what an empty fence does NOT have.** `PENDING_SURFACES` below carries a
 * refusal this list deliberately does not: a glob matching no `page.tsx` on
 * disk is exit 2 there. The asymmetry is written out in that list's own
 * docblock and it is still correct — this fence dissolves by the hand of the
 * plan written to dissolve it, which has now happened, and an empty list cannot
 * go stale.
 */
export const PHASE_42_PATHS = [];

/* ────────────────────────────────────────────────────────────────────────────
 * PENDING_SURFACES — surfaces another phase built and no phase has measured
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Real surfaces, on no converted list, whose conversion is somebody else's debt.
 *
 * **THE SAME KIND OF THING AS `PHASE_42_PATHS`, AND NOT THE SAME KIND AS
 * `NON_DECLARABLE`.** Read the docblock below this one for the distinction it
 * draws and do not blur it here: a **fence** says *nobody measured it*, a
 * **category refusal** says *somebody measured it and there is nothing for a
 * surface criterion to be true or false about*. The six pages behind this list
 * are the first kind. They render. A person looks at them. Nothing in this file
 * says one word about their markup, and this entry is the written form of that
 * silence rather than a substitute for it.
 *
 * **WHY IT EXISTS, MEASURED 2026-08-18 BY PLAN 42-01.** Repairing DEF-45-01 —
 * the four `CONVERTED` entries naming surfaces the product no longer has — was
 * necessary and not sufficient. With `checkManifest()` no longer refusing,
 * checks A–E passed and **check F failed on six page files** that phases 44 and
 * 45 added and never declared. Check F itself names the three dispositions
 * available and all three are decisions somebody reads: declare them converted,
 * fence them, or refuse them as non-surfaces. Declaring them would be the lie
 * `CONVERTED`'s own docblock names — *a list of claims is how a gate becomes a
 * rubber stamp* — because no plan walked their closure. Refusing them as
 * non-surfaces would be false: they have markup. So: fenced, by name, with the
 * owning phase written inside the reason.
 *
 * **THE NAME CARRIES NO PHASE NUMBER, ON PURPOSE.** `PHASE_42_PATHS` can be
 * named for a phase because it names ONE phase's scope and dissolves when that
 * phase runs. This list is the general shape — *a surface whose conversion
 * belongs to whoever built it* — and a third phase will leave a page behind
 * eventually. This repository has already paid for a constant whose name became
 * a false description of what it holds; a name that describes the CONDITION
 * survives the arithmetic changing under it.
 *
 * **THE ONE EXIT, and it is the same rule every list in this file states.** An
 * entry leaves here in the SAME COMMIT as its `CONVERTED` entry arrives. Not
 * before — an entry that leaves early makes check F red on a correct tree — and
 * not after, because an entry that outlives its surface is a fence around
 * nothing, which is why `checkManifest()` now refuses on exactly that (a
 * refusal `PHASE_42_PATHS` does NOT have, and the asymmetry is deliberate: the
 * Phase 42 fence dissolves by a plan that is written to dissolve it, this one by
 * six unrelated commits nobody coordinates).
 *
 * The reason travels WITH the entry for the reason every list here repeats: a
 * list whose reasons live somewhere else is a list whose reasons stop being true
 * unnoticed.
 *
 * Grouped by the directory that owns the surfaces rather than spelled as six
 * near-identical globs, because six lines differing by one path segment are six
 * lines nobody proof-reads.
 *
 * Shape: `[glob, reason]` — the same shape `PHASE_42_PATHS` carries, matched the
 * same way by the same helper in the consumer.
 */
export const PENDING_SURFACES = [
  [
    "src/app/(admin)/admin/(work)/calendar/**",
    "the production calendar and its detail page — built by PHASE 44, and its debt: two page files that render, that no plan has walked, and that this phase neither converts nor claims. Phase 42 converts the scanner and takes colour, contrast and type only; absorbing six surfaces it did not build would be a scope change, and a scope change is an owner's decision and not a planning adjustment. NOT AN APPROVAL: nothing here says the markup behind these two pages is right, only that nobody measured it. The entry leaves this list in the SAME COMMIT as its CONVERTED entry arrives, which is the only exit — and a glob here that stops matching any page.tsx is a REFUSAL, because a fence that can silently match nothing is a fence that never dissolves. Recorded as DEF-42-01 with the run that found it",
  ],
  [
    "src/app/(admin)/admin/(work)/location/**",
    "the venue archive and its detail page — built by PHASE 45, and its debt, on the same terms as the calendar entry above: two page files that render, unmeasured, fenced by name and not declared converted. NOT AN APPROVAL. The exit is one CONVERTED entry per surface, in the commit that converts it, and until then this line is the written form of nobody having looked. Recorded as DEF-42-01",
  ],
  [
    "src/app/(admin)/admin/(work)/manifesto/**",
    "the sound manifesto section — built by PHASE 45, and its debt. One page file, rendering, on no converted list. NOT AN APPROVAL: unmeasured, fenced, and it leaves this list in the same commit as its CONVERTED entry. Recorded as DEF-42-01",
  ],
  [
    "src/app/(admin)/admin/(work)/visual/**",
    "the visual system section — built by PHASE 45, and its debt. One page file, rendering, on no converted list. NOT AN APPROVAL: unmeasured, fenced, and it leaves this list in the same commit as its CONVERTED entry. Recorded as DEF-42-01",
  ],
];

/* ────────────────────────────────────────────────────────────────────────────
 * NON_DECLARABLE — the page files that are not surfaces, and never will be
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Route files that exist, render nothing, and therefore cannot be declared.
 *
 * **WHY THIS CONSTANT EXISTS AT ALL, AND WHY IT ARRIVES NOW.** Until check F
 * (`verify-conversion.mjs`) this list was FORTY LINES OF PROSE at the head of
 * `CONVERTED` and nothing read it. `checkManifest()` refuses on an empty
 * `CONVERTED` and on an entry naming a missing path — both **list-side**
 * conditions — while **nothing anywhere counted the `page.tsx` files on disk and
 * compared them to the list**. A forty-second page added next month was
 * invisible and the phase stayed green: *"the manifest is a list nobody checks
 * against reality"* (41.2-WAVE0-FINDINGS.md §8.1, which decided check F IN
 * SCOPE and assigned it to plan 41.2-19).
 *
 * A census needs three buckets, not two, and the third has to be **readable by a
 * gate**. So the argument that used to sit in prose above `CONVERTED` comes out
 * of prose and into this constant, in the same commit as the check that reads
 * it. Its substance is unchanged; what changed is that a machine can now hold it
 * against the tree.
 *
 * **THIS IS NOT A THIRD EXEMPTION LIST, and the distinction is the one
 * `verify-dialogs.mjs` already draws between exempt and fenced.**
 *
 *   - `PHASE_42_PATHS` is a **fence**: files nobody measured at all. Nothing
 *     there says the markup behind them is right; it says this phase does not
 *     open them, and the fence dissolves when Phase 42 runs.
 *   - This list is a **category refusal**: the file was measured, and what the
 *     measurement found is that there is nothing for a surface criterion to be
 *     true or false about. It does not dissolve; an entry leaves it only by the
 *     file ceasing to be what it is.
 *
 * **The one member today, and the arithmetic it closes.** Measured 2026-08-14:
 * `find src/app -name "page.tsx"` returns **41** = **38** declared + **2**
 * behind the Phase 42 fence + **1** here. The arithmetic closes exactly, with no
 * residue and no judgement call, which is the condition under which a tree-side
 * census is worth writing rather than a permanent source of noise.
 *
 * **What check F does NOT make true.** It closes ONE direction — a page that
 * exists and is not accounted for. It does not close the other: a page declared
 * with the wrong width, the wrong reason, or a reason describing work that was
 * not done. Those stay what they have always been, a human's written claim the
 * gates take on trust. Check F turns *the manifest is a list nobody checks
 * against reality* into *the manifest is COMPLETE*, and completeness is not
 * correctness.
 *
 * Shape: `[pageFile, reason]` — the same two-column shape `PHASE_42_PATHS` and
 * `SPINE` already carry, and the reason travels WITH the entry for the reason
 * every list in this file states: a list whose reasons live somewhere else is a
 * list whose reasons stop being true unnoticed.
 */
export const NON_DECLARABLE = [
  [
    "src/app/(admin)/admin/(work)/page.tsx",
    "/admin is an entrance, not a surface: 39 lines, zero className, no markup, ends in a redirect. It resolves the access context, refuses a visitor without organizer.access, and forwards. It can therefore NEVER import PageShell — there is nothing for a shell to wrap — and check D puts any declared surface whose page file does not import the shell into pagesWithoutShell, which is a FAILURE. Declaring it would put a correct file into a red, and a gate that reddens correct code is a gate somebody switches off (§0 rule 3, D-41-19's second failure mode; scripts/verify-media-strip.mjs:51-62 is this repository's own record of it happening). Criterion 1 reads 'every page that renders a surface'; a redirect renders nothing and shows nobody a half-converted screen, which is the thing that criterion protects a person from — so this is not an exemption carved out of the criterion's scope, it was never inside it. Settled BEFORE check D's first red run, which is why it is trusted: an exemption found on a red run is an exemption nobody trusts (D-41-16). If a future plan gives that route markup — a chooser, a landing board, anything a person looks at — it stops being a redirect, it becomes declarable, and this entry comes out in the SAME COMMIT as its CONVERTED entry",
  ],
];

/* ────────────────────────────────────────────────────────────────────────────
 * PRIMITIVES — one entry per EXPORTED SYMBOL, not one per file
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Every rendered primitive a plan has published, with the plan that published it.
 *
 * Plan 41-07's G1 check C asserts each **named export** here has at least one
 * importer under `src/`. That is the mechanical form of a failure this
 * repository already records rather than a hypothetical one: a primitive that
 * exists, is correct, and renders nowhere.
 *
 * **Per export and not per file, deliberately.** `Button.tsx` and `Chip.tsx`
 * each carry two rungs of one ladder, published one wave apart. A file-level
 * entry would go green on `Button.tsx` the moment its icon rung had an importer
 * and would never notice a labelled rung nobody rendered — which is exactly the
 * orphan D-41-04 exists to prevent. A per-file check would be blind to the one
 * thing this list is for.
 *
 * **Seeded with what exists today and nothing more.** An entry for a symbol
 * that does not exist yet is a claim, not a record, and a list of claims is how
 * a gate becomes a rubber stamp. The remaining primitives — the badge rung, the
 * form controls, the dialog, the data table and the skeleton's exports — are
 * added by the plans that publish them.
 *
 * **Rendered primitives only.** The shared focus-expression constant exported
 * beside the button ladder is not listed: it is a class string, not something
 * that renders, and G1 check C's failure mode is a component nobody mounted.
 * Listing it would be defensible; a later plan may add it, and this paragraph
 * is here so that would be a decision rather than a discovery.
 *
 * Shape: `[path, exportName, reason]`.
 */
export const PRIMITIVES = [
  [
    "src/components/ui/Button.tsx", "IconButton",
    "plan 41-03 — the 44x44 icon rung; its consumer in that wave is the toast's dismiss control",
  ],
  [
    "src/components/ui/Chip.tsx", "Chip",
    "plan 41-03 — the interactive badge, and therefore a 44px target; its consumer in that wave is the eight work tabs on the phone strip",
  ],
  [
    "src/components/ui/Button.tsx", "Button",
    "plan 41-05 — the labelled rung, exported in the plan that renders it; three of them on the payment callback",
  ],
  [
    "src/components/ui/PageShell.tsx", "PageShell",
    "plan 41-05 — the content maximum, the gutter, the rhythm and the navigation clearance in both tiers",
  ],
  [
    "src/components/ui/Card.tsx", "Card",
    "plan 41-05 — the one card shell; the container half of D-41-13's 406-site triage",
  ],
  [
    "src/components/ui/Typography.tsx", "PageTitle",
    "plan 41-05 — the display role, and the only site in src/ that names it (D-41-15)",
  ],
  [
    "src/components/ui/Typography.tsx", "SectionHeading",
    "plan 41-05 — §7.3's four axes as one string; its consumer is the side column's work heading",
  ],
  [
    "src/components/ui/Input.tsx", "Input",
    "plan 41-06 — the text-entry control on the boundary that measures; its consumers in that wave are the seven fields of /login, /register and /set-password",
  ],
  [
    "src/components/ui/Chip.tsx", "Badge",
    "plan 41-08 — the non-interactive rung, published in the wave that renders it (D-41-04) and deliberately in the same file as the chip, because the sentence deciding between them governs both. Its consumer is the act mark on /admin/members/register",
  ],
  [
    "src/components/ui/Skeleton.tsx", "SkeletonLine",
    "plan 41-08 — the line placeholder, listed in the plan that finally rendered it; its consumer is /gallery's loading state, which is the first import this file has ever had",
  ],
  [
    "src/components/ui/DataTable.tsx", "DataTable",
    "plan 41-10 — one data array, one column declaration, two trees that are never transformed, switching at md and nowhere else. Its consumer in the same commit range is the member table, which is the densest in the product and was the sixth of seven still choosing its own breakpoint. DS-09 is consolidation and not construction (D-41-17): six of the seven already dual-rendered, four at 640px and two at 1024px, and what this ends is the disagreement",
  ],
  [
    "src/components/ui/Checkbox.tsx", "Checkbox",
    "plan 41-10 — a 16px drawn box inside a 44x44 hit area, published in the plan that renders it (D-41-04). §6.4's ranked list opens with the two boxes it replaces; they are the smallest interactive elements in this phase's territory. The hit area is the <label>, which is also the control's programmatic name, so one element does both jobs and there is no state in which the target exists and the name does not",
  ],
  [
    "src/components/ui/Input.tsx", "Select",
    "plan 41-10 — the native select on the boundary that measures. It shipped with Input in plan 41-06 and was DELIBERATELY absent from this list until now, because the three (auth) screens that plan converted contain no select and an entry would have made check C go red on a correct file. Its first consumers are the member table's two filters and the create-account form's role field. The paragraph below records the absence; this entry closes it",
  ],
  [
    "src/components/ui/Skeleton.tsx", "SkeletonCard",
    "plan 41-10 — the card-shaped placeholder, listed in the plan that first rendered it. Same treatment and same reason as Select above: plan 41-08 converted this file and gave it its first importer, but a gallery's loading state renders no card-shaped placeholder, so this export had no consumer in its own wave and was recorded as absent rather than claimed. Its consumer is /admin/members' loading state, which is Skeleton's SECOND consumer overall — a first importer is a proof, a second is a pattern",
  ],
  [
    "src/components/ui/Skeleton.tsx", "SkeletonTile",
    "plan 41-08 — the square placeholder for a media thumbnail, published in the plan that renders it. A square is a different shape from a line, not a taller one: reaching it by passing a height through the caller's classes would have depended on which of two same-property utilities Tailwind emits last, which is measured below as unreliable in exactly this component",
  ],
  [
    "src/components/ui/Switch.tsx", "Switch",
    "plan 41.1-10 — the one primitive this phase builds; its consumer in the same commit is the drinks menu's availability toggle. Entered by plan 41.1-11, which is the wave's single declared owner of every gate edit (D-41.1-22) — the plan that built it deliberately did not enter it, because check C asserts no published primitive is an orphan and the entry may only land in the same reconciliation that declares the surface rendering it (D-41-04)",
  ],
];

/**
 * `Textarea` ships in the same file as `Input` and is DELIBERATELY ABSENT from
 * the list above. **`Select` was, until plan 41-10, and is now entered.**
 *
 * Plan 41-06 was required to publish all three, and the three `(auth)` screens
 * it converts contain **seven text inputs, no textarea and no select**. So two
 * of the three exports had no consumer in their own wave — the exact orphan
 * shape D-41-04 exists to prevent, and the same shape `Skeleton.tsx` had been
 * carrying since before this phase began.
 *
 * They were not entered because an entry would make check C go red on a file
 * that is correct, and silencing that by removing the check is how a gate
 * becomes decoration. Recording the absence in writing is the honest form: the
 * plan that first renders a textarea or a select adds its entry.
 *
 * **`Select`'s entry is that promise kept**, by the plan that gave it three
 * consumers — two filters on the member table and the role field on the
 * create-account form. `Textarea` still has none anywhere in this tree and
 * stays absent, so this paragraph keeps its job for one export instead of two.
 *
 * ── And `SkeletonAvatar`, for the same reason ───────────────────────────────
 *
 * Plan 41-08 converted `Skeleton.tsx` and gave it its first consumer, but the
 * surface it converted is a **gallery**: its loading state is a heading, a
 * subtitle and two grids of square thumbnails. It renders no card-shaped
 * placeholder and no avatar, so two of the file's four exports had no importer
 * in their own wave.
 *
 * **`SkeletonCard` is entered above by plan 41-10**, whose members loading
 * state renders eight of them — the file's second importer overall, which is
 * what turns one proof into a pattern. `SkeletonAvatar` still has none and
 * stays absent.
 *
 * This record has now been written four times — the spine's own note on this
 * file, then the form controls, then the two skeleton exports, now the two that
 * remain — and the repetition is the point: the alternative is a list of
 * claims, and a list of claims is how a gate becomes a rubber stamp.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * CONVERTED — the surfaces declared converted, whole
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The surfaces a plan has converted end to end.
 *
 * `route` is for a human reading the list. **`pageFile` is the exact path a
 * gate opens**, so that no gate has to reimplement Next's route-group and
 * dynamic-segment resolution — the surface inventory already records that a
 * work surface's files live in two directories that are not nested inside one
 * another, so a path-prefix resolver would miss half of a surface and report a
 * green on the half it found.
 *
 * `width` is one of `default` | `wide` | `focus` and **must agree with §4's two
 * closed lists**. Those lists are edited by decision, so a disagreement here is
 * not a typo to correct quietly: one of the two is wrong, and which one is a
 * question for a person.
 *
 * ── `/admin` IS DELIBERATELY NOT DECLARED, AND THE ARGUMENT IS NOW A CONSTANT ─
 *
 * The work surface has **24 pages and 23 declarable surfaces**. The one that is
 * missing is `/admin` itself, at `src/app/(admin)/admin/(work)/page.tsx`. It is
 * left out on purpose so that the next reader counts 24, finds 23, and reads a
 * decision instead of filing a defect.
 *
 * **Forty lines of that decision used to stand HERE, in prose, and nothing read
 * them.** They are now `NON_DECLARABLE` above — same argument, same words,
 * moved into a two-column constant so that a gate can hold it against the tree.
 * The move happened in plan 41.2-19, in the same commit as check F, which is the
 * tree-side census that gives the constant something to be true about. **A
 * paragraph a reader may skip and a list a gate subtracts are not the same
 * artefact**, and the difference is the whole of what 41.2-WAVE0-FINDINGS.md
 * §8.1 identified: `checkManifest()` refuses on an empty list and on a missing
 * path, both list-side, while nothing counted the pages on disk.
 *
 * The precedent for declining to make a claim rather than making a convenient
 * one is the `PRIMITIVES` note above — *"Rendered primitives only"* — where the
 * shared focus-expression constant is left off the list because it renders
 * nothing and G1 check C's failure mode is a component nobody mounted. Same
 * shape, same reason: a list of claims is how a gate becomes a rubber stamp.
 *
 * **What this does NOT say.** It does not say `/admin` is converted, and it does
 * not say it is unconverted. It says this list is not where that question is
 * answered.
 *
 * Shape: `[route, pageFile, width, reason]`.
 */
export const CONVERTED = [
  [
    "/payment/callback", "src/app/(public)/payment/callback/page.tsx", "focus",
    "plan 41-05 — the smallest whole surface in the tree: one file, no imports of its own beyond the primitives and its own server action, and it exercises the shell, the card and the page title at once. Named on §4's closed focus list",
  ],
  [
    "/login", "src/app/(auth)/login/page.tsx", "focus",
    "plan 41-06 — the front door, whole: both fields on the control boundary, the submit on the accent fill's own ink, every outline-killer gone. Named on §4's closed focus list, and it already used the focus width by hand, so the shell is adoption",
  ],
  [
    "/register", "src/app/(auth)/register/page.tsx", "focus",
    "plan 41-06 — whole, including the branch that renders after a successful sign-up: three fields, the password checklist off the raw palette and onto the completion semantic, and the brand spelled re:sonate. Named on §4's closed focus list",
  ],
  [
    "/set-password", "src/app/(auth)/set-password/page.tsx", "focus",
    "plan 41-06 — the surface is TWO files, and this entry names the ROUTE file rather than the form, because the route file imports the form and an import-closure walk from it therefore covers both; naming the form instead would have fenced off the half that owns the shell and the page title. All four outcomes stayed four. Named on §4's closed focus list",
  ],
  [
    "/gallery", "src/app/(public)/gallery/page.tsx", "wide",
    "plan 41-08 — whole, and 'whole' cost more than the plan expected: the closure reaches the shared thumbnail grid and the media viewer, neither of which any plan in this phase declares, and both of which carried raw palette. They were converted with it, because a surface is declared converted when what it REACHES is converted — that is what this manifest's own gate walks. The read is untouched: same table, same filter on the row's moderation state, same ordering, same cap. Named on §4's closed wide list",
  ],
  [
    "/admin/formats", "src/app/(admin)/admin/(work)/formats/page.tsx", "default",
    "plan 41-09 — whole, and 'whole' here is SIX files in two directories: the route file under (work)/, and the catalogue, the two form dialogs, the destructive confirmation and the swatch picker one directory out, where R-WORK-ROUTES keeps everything that is not a route. NOT on §4's wide list and therefore default. This is also the surface that first renders the Dialog primitive: three of the seven byte-identical native shells left the tree here, and the gate that counts the rest went 17 to 14 in the same commit. ColorSwatchPicker is reached by this closure and is a NAMED EXEMPTION in two gates — a format's identification colour is data on a row, not a token — so its hexes are untouched and the gate reports the exemption as applied rather than skipping it in silence. Nothing the dialogs DO moved: not the actions, not the fields, not the validation, and above all not the numbering — a progressivo is already on a poster",
  ],
  [
    "/admin/members/register", "src/app/(admin)/admin/(work)/members/register/page.tsx", "default",
    "plan 41-08 — whole. NOT on §4's wide list and therefore default, which is not a fallback: it is the answer for every surface nobody had to argue about. Four raw palette colours went, and two of them were decisions rather than substitutions — the accent stopped being a state signal (§5.1 names that among the things it is never for) and the automatic author stopped being amber, since the only amber here is the warning semantic and it is also SunSet's identification colour. Personal data: no column added, no field surfaced, and who performed an act and when both still render",
  ],
  [
    "/admin/members", "src/app/(admin)/admin/(work)/members/page.tsx", "wide",
    "plan 41-10 — whole, and 'whole' here is FIVE files in two directories: the route file and its loading state under (work)/, and the table, the create-account form and the refusal notice one directory out, where R-WORK-ROUTES keeps everything that is not a route. Named on §4's CLOSED wide list, and it is the reason that list exists — the primary object is the densest table in the product. This is also the surface that first renders DataTable and Checkbox, and the second that renders Skeleton. THE CAUTION, because this is where the gating mechanism is operated: role and status are two orthogonal axes and stay two columns and two marks, no query changed, no column added, no capability check touched, no action payload altered, and who approved or rejected and when both still render. Seven raw palette families left the row — four role hues and three status hues — and that is a decision rather than a substitution: no token declares a role, and grading a person in the colours of success and failure is what community-membership.md calls a judgement. The words are the channel, and they always were, since each mark's content is the role's or the status's own name",
  ],

  /* ──────────────────────────────────────────────────────────────────────────
   * WAVE 3 — the ten surfaces plans 41.1-06 … 41.1-10 converted.
   *
   * Every reason below is the text the plan that did the work reported in its
   * own SUMMARY, taken verbatim rather than re-composed here. That is not
   * deference: the plan that walked the closure is the one that knows what
   * *whole* turned out to mean, and a reconciliation re-writing those sentences
   * would be asserting about files it did not open. The only editorial change
   * is that a reason reported across several lines of a SUMMARY is joined into
   * one string, because this list's shape is one string per entry.
   *
   * They are entered HERE and not by their own plans because D-41.1-22 makes
   * the wave's reconciliation the single declared owner of every gate edit in
   * the wave: a `CONVERTED` list is one file that every plan in a wave would
   * want to edit, which is exactly what D-41.1-15's partition rule cannot
   * express. Five plans reported; one plan writes.
   * ────────────────────────────────────────────────────────────────────────── */

  [
    "/admin/artists", "src/app/(admin)/admin/(work)/artists/page.tsx", "default",
    "plan 41.1-06 — whole, and 'whole' here is ONE file: the closure reaches only three modules under @/lib and all three carry zero class attributes, and no loading/error/not-found file exists beside the route. NOT on §4's closed wide list and therefore default, which is not a fallback: it is the answer for every surface nobody had to argue about, and this is a list of one-line rows rather than a dense table. The empty state's next-step sentence is measured rather than assumed — CreateArtistModal has exactly one importer in the tree and it is components/events/EventForm.tsx:8, so an artist is created from a night's line-up and not from here. No query changed, no column added, no capability check touched, no action payload altered",
  ],
  [
    "/admin/venues", "src/app/(admin)/admin/(work)/venues/page.tsx", "default",
    "plan 41.1-06 — whole, and 'whole' here is ONE file. The profile at /admin/venues/[slug] is a DIFFERENT surface with its own closure, which reaches EditVenueButton.tsx and is not declared by this plan: a sibling route under one directory is not one surface. NOT on §4's closed wide list and therefore default, which is not a fallback. THE CAUTION, because this page renders venues.address: no query changed, no column added, no capability check touched, no action payload altered — so the audience of that column is exactly what it was, nothing here reads or writes venue_reveal_sent, venue_reveal_on_purchase or venue_secret_hint_reveal_hours, and the empty state's copy names the route to take and no place at all",
  ],
  [
    "/admin/newsletter", "src/app/(admin)/admin/(work)/newsletter/page.tsx", "default",
    "plan 41.1-06 — whole, and 'whole' here is FIVE files in two directories: the route file plus the four co-located client modules one group shallower, which is R-WORK-ROUTES working as declared. actions.ts is in the closure and carries zero class attributes, so it is reached and has nothing to convert. NOT on §4's closed wide list and therefore default, which is not a fallback: the surface is one figure, one form and one short history, none of which is a dense table. THE CAUTION: the three failure kinds in FailureNotice.tsx keep their copy byte for byte — keeping the causes apart is the reason that component exists, and a conversion that tidied them towards one sentence would recreate CONCERNS.md's recorded defect while looking like a styling commit. No query changed, no column added, no capability check touched, no action payload altered",
  ],
  [
    "/admin/venues/[slug]", "src/app/(admin)/admin/(work)/venues/[slug]/page.tsx", "default",
    "plan 41.1-07 — whole, and 'whole' here is TWO files: the page and the edit modal its only local import mounts. NOT on §4's closed wide list and therefore default, which is not a fallback but the answer for every surface nobody had to argue about. THE CAUTION, because this page renders a venue's ADDRESS to staff: no query changed, no column added, no capability check touched, no action payload altered, and no visibility predicate moved — the withholding rule that drops an event whose party here is secret and unrevealed is byte-identical, the address renders inside the same conditional, and the edit affordance is drawn on the same role test. The modal's hand-rolled overlay is gone and the platform supplies Escape, the focus trap and the top layer; its four raw palette values were deleted by the status prop rather than recoloured",
  ],
  [
    "/admin/events", "src/app/(admin)/admin/(work)/events/page.tsx", "default",
    "plan 41.1-07 — whole, and 'whole' here is THREE files: the page, the row renderer it imports, and the route-adjacent placeholder the extension of the scanned set now reaches. NOT on §4's closed wide list and therefore default. Both branches render the same shell at the same maximum, so the page does not change width when it fails. §6.4's six-in-a-row case is paid: eight controls, every one at the floor, none shrinking, and the row still wraps rather than gaining a breakpoint prefix. THE CAUTION: no query changed, no column added, no capability check touched, no action payload altered, and no series identifier was renumbered, re-sorted or re-derived — the order is still the query's. The six navigation controls are Links and not Chips, and the reason is a compiler error recorded in the file's own docblock",
  ],
  [
    "/admin/events/[id]/guest-list", "src/app/(admin)/admin/(work)/events/[id]/guest-list/page.tsx", "wide",
    "plan 41.1-08 — whole, and 'whole' here is THREE files in three directories: the route file, the client component R-WORK-ROUTES keeps a level out, and the failed-read state. wide because the route is NAMED on §4's closed wide list, so the width is checkable against that list rather than agreed with. THE CAUTION, because this is a lane around the approval gate and community-membership.md counts such a lane as an exception to the gating mechanism rather than a convenience: no query changed, no column added, no capability check touched, no action payload altered, and no entry path, attribution or count moved — who added an entry is still written server-side. It is also the tree's ONLY toast consumer and not one call site, string or tone was touched",
  ],
  [
    "/admin/events/[id]/assignments", "src/app/(admin)/admin/(work)/events/[id]/assignments/page.tsx", "default",
    "plan 41.1-08 — whole, and 'whole' here is TWO files: the route file and the client component a level out. NOT on §4's wide list and therefore default, which is not a fallback: the roster is a short stack of night cards, not a dense table. THE CAUTION, because this surface grants a capability for one night: no capability key, guard or action payload changed, the four assignable keys and the closed refusal set are byte-identical, and the composite foreign key is still the boundary behind an affordance that is still only a filter. Its one small-prefix use was paid by reading the class — a track template, not a column count — and the gate reported the entry STALE rather than this plan deleting it (D-41.1-22)",
  ],
  [
    "/admin/events/[id]/media", "src/app/(admin)/admin/(work)/events/[id]/media/page.tsx", "default",
    "plan 41.1-09 — whole, and 'whole' here is TWO files: the route and the moderation grid it is the only importer of. NOT on §4's wide list and therefore default, which is not a fallback but the answer for every surface nobody had to argue about. The grid gained §2.2's middle step — one column, two at the tablet tier, three at desktop — and the image size hint moved with the boundary, or every browser between the two widths fetches a half-width file for a full-width slot. The three status tiles take NO semantic token: the warning semantic is also SunSet's identification colour and a rejected upload is not a critical outcome, so the label beside each count carries what the hue carried badly. THE CAUTION, because this surface decides what a member's upload becomes: no query changed, no column added, no capability check touched, no action payload altered, and moderation still flips the ROW and not the OBJECT — media-and-storage.md's gate moderazione = rimozione is open before this conversion and open after it, and no visual change closes it",
  ],
  [
    "/admin/events/[id]/review", "src/app/(admin)/admin/(work)/events/[id]/review/page.tsx", "wide",
    "plan 41.1-09 — whole, and 'whole' here is TWO files: the route and the client list one directory out, which R-WORK-ROUTES keeps outside the route group. Named on §4's closed wide list, and the width is written out so a reader can check it against that list rather than infer it. The copy-out diagnostic grid inside it is PERMANENTLY EXEMPT (D-41-16, D-41.1-14) and stayed a table: no card branch, no data-table primitive, and no entry on any debt list — the negative obligation was asserted by grep AFTER the conversion, because the failure mode here is a later tidy. What it did owe is paid: the eleven-pixel type size is gone and the grid takes the label/data size, with the accepted consequence that it scrolls slightly more. THE CAUTION, because this is door evidence: no classification moved, no identifier became a name, the technical view still receives entries and nothing else, no query changed, no column added, no capability check touched, no action payload altered",
  ],
  [
    "/admin/events/[id]/drinks", "src/app/(admin)/admin/(work)/events/[id]/drinks/page.tsx", "default",
    "plan 41.1-10 — whole, and 'whole' here is FOUR files in three directories: the route file under (work)/, the menu manager one directory out where R-WORK-ROUTES keeps everything that is not a route, the Switch primitive this plan publishes, and the QR control under (public)/ — the sixth entry on D-41.1-19's authorised list, in this phase BY THE OWNER'S DATED DECISION of 2026-08-13 and not by this plan's measurement of it. NOT on §4's closed wide list and therefore default. This is the surface that first renders Switch, and the reason that file could be published at all (D-41-04): four hand-written 24px tracks were one accessibility finding written four times, and the other three are the event form's, adopted by plan 41.1-18. THE CAUTION, because this surface governs what a guest can be sold: no query changed, no column added, no capability check touched, no action payload altered — handleToggle does not appear in the diff, so the availability flag keeps its name, its value and the negation that produces it, and nothing about a price, an order, a token, a refund or a closing time was opened. Phase 41.2 inherits both the QR control and the menu manager already converted, which is the harmless direction",
  ],

  /* ──────────────────────────────────────────────────────────────────────────
   * WAVE 5 — the five analytics surfaces plans 41.1-12 … 41.1-15 converted.
   *
   * ── CORRECTED 2026-08-18 BY PLAN 42-01: THREE OF THE FIVE ARE GONE ─────────
   *
   * **Two of this block's five entries are still below; three left this list on
   * 2026-08-18, together with `/admin/finance` from the WAVE 9 block.** The
   * surfaces they named — `/admin/analytics`, `/admin/analytics/compare`,
   * `/admin/analytics/members` and `/admin/finance` — were **REMOVED FROM THE
   * PRODUCT** by a declared decision (finance and analytics are read in the
   * payment provider's own console, not here), and this list did not move in the
   * same commit. `checkManifest()` therefore refused — exit 2, *nothing was
   * measured* — on four entries claiming files that are not on disk, and it took
   * `verify:conversion` and `verify:touch-targets` down with it: two of the
   * seventeen gates in this repository measured nothing until this correction.
   *
   * DEF-45-01 named the repair in its own words — *"the repair is the removal of
   * the four entries from the CONVERTED list, not a widening of the matcher"* —
   * and a removal is what was done: no matcher widened, no tolerance added, no
   * entry repointed at a neighbouring file. Verified before deleting: exactly
   * four of the then-38 entries had a `pageFile` absent from the tree, and they
   * were exactly those four. 34 remain, all present.
   *
   * **The history below is kept and not deleted, and its tense is now wrong on
   * purpose.** The paragraphs that follow describe work that really happened and
   * a hold that was really reasoned about; what changed is the world, not the
   * record of it. Read them as *what was true until 2026-08-18*, and read this
   * paragraph for what is true after. `/admin/events/[id]/analytics` — a
   * per-night surface, a different route from the three removed ones — is
   * untouched and still declared.
   * ──────────────────────────────────────────────────────────────────────────
   *
   * Same construction as the wave-3 block above and for the same reason: every
   * reason below is the text the plan that did the work reported in its own
   * SUMMARY, taken verbatim rather than re-composed, with the only editorial
   * change being that a reason a SUMMARY printed across several lines is joined
   * into the one string this list's shape requires. Four plans reported; this
   * one writes (D-41.1-22).
   *
   * **All five routes were NAMED on §4's closed wide list**, so `checkManifest()`
   * and check D could compare the width against the contract rather than take it
   * on agreement: `verify-conversion.mjs`'s `WIDE_ROUTES` carried all five at
   * :1223-:1227. Three of those five routes no longer have a surface; their names
   * stay on `WIDE_ROUTES` because that list is a **contract about width**, read
   * only for routes this list declares, and a route nobody declares is a name
   * nothing consults. Removing them is a separate decision from this repair and
   * was not taken here.
   *
   * ── THE SIXTH SURFACE OF THIS WAVE WAS HELD, THE HOLD WAS SPENT, AND THE
   *    SURFACE IS NOW GONE ────────────────────────────────────────────────────
   *
   * *(History. `/admin/finance` left this list on 2026-08-18 with the three
   * analytics entries above — the surface was removed from the product, see the
   * correction at the head of this block. What follows is why it was held while
   * it existed, kept because a hold reasoned about in writing is the record of a
   * decision and deleting it would leave the reader with an absence.)*
   *
   * `/admin/finance` was converted by plan 41.1-15 and was **held**, not
   * forgotten. Check A walks a declared surface's import closure, and this one
   * goes through `src/components/admin/TransactionList.tsx` into
   * `src/components/admin/RefundDialog.tsx`, which **plan 41.1-17 converts in
   * wave 7**. An entry written then would have been a claim about a file nobody
   * had opened yet, and check A would have reddened on that file's palette hits
   * — correctly. The declaration belonged to plan **41.1-24**, the
   * reconciliation that follows the wave which converts the refund dialog.
   *
   * **RELEASED 2026-08-14 by plan 41.1-24, and the hold's reason was checked
   * expired rather than assumed expired.** The entry lived in the WAVE 9 block
   * further down until 2026-08-18, when the surface itself was removed from the
   * product and the entry went with it. What was checked before writing it:
   * `RefundDialog.tsx`
   * is on plan 41.1-17's SUMMARY as converted, and the file on this tree carries
   * no raw palette hit for check A to redden on. A hold released because its
   * calendar passed rather than because its cause was re-measured is the same
   * defect as a count that fell for the wrong reason (§9 P1).
   *
   * **An absence with a written reason is a decision; an absence without one is
   * read as an oversight**, which is the argument the `/admin` paragraph above
   * makes at length and the `PRIMITIVES` notes make three times over.
   *
   * The entry text plan 41.1-15 drafted, quoted verbatim from its SUMMARY §8.2:
   *
   *     ['/admin/finance', 'wide', 'the finance ledger — the transaction list
   *      on DataTable, its cursor pagination and async detail intact; no query
   *      changed, no column added, no capability check touched, no action
   *      payload altered, and no status transition, refund amount, idempotency
   *      key or webhook path moved'],
   *
   * **One measured caution for plan 41.1-24, and it is why this is quoted
   * rather than pasted.** The draft above is THREE elements and this list's
   * shape is FOUR — `[route, pageFile, width, reason]`. Pasted as written, the
   * width slot would receive the reason string and `pageFile` would receive
   * `'wide'`; `checkManifest()` catches it, because `existsCaseExact('wide')`
   * is false and it would refuse with "not on disk under that exact name" —
   * a refusal whose sentence points at a missing file rather than at a missing
   * field, which is a long way from the actual defect. The page file measured
   * on this tree on 2026-08-14 was
   * `src/app/(admin)/admin/(work)/finance/page.tsx` — **not on disk since the
   * surface was removed from the product**, which is exactly the refusal
   * DEF-45-01 records — and `/admin/finance` is on §4's closed wide list at
   * `verify-conversion.mjs:1218`. Recorded here rather
   * than silently corrected in the quotation: a reported entry text is taken as
   * reported, and an editorial fix to somebody else's sentence is exactly the
   * move this block's opening paragraph refuses.
   * ────────────────────────────────────────────────────────────────────────── */

  [
    "/admin/events/[id]/analytics", "src/app/(admin)/admin/(work)/events/[id]/analytics/page.tsx", "wide",
    "plan 41.1-13 — whole, and 'whole' here is TEN files in two directories: the route file and its loading state under (work)/, and eight cards, charts and one table under src/components/analytics/. The rest of the closure is spine or carries zero class attributes: the animation wrapper writes none of its own and is already reached by two declared surfaces, the count-up and the query module have none at all, and the primitives are converted. Named on §4's CLOSED wide list. This is the surface that gives DataTable its SECOND adopter — one column declaration, five columns, and revenue as the mark because a figure that decides money is never a meta (D-41.1-13). THE PART WITH NO ANALOG IS THE CHARTS: no converted file in this tree is one, and a chart's palette is unreachable by a class-string scanner, so all three were READ. Four legacy token aliases became the current names at identical values; the two accent bar fills and the funnel's data-carried four-step palette were LEFT AND REPORTED rather than substituted, because §5.1 has no clause for a chart series and the categorical palette lives in a file outside the authorized list — neither is a format identification colour and neither is a sunset stop, which is the halt test, and both pass it. Nine raw palette hits left the surface and three of them were decisions rather than substitutions: the token lifecycle's three segments ARE states and take the completion and critical semantics, the attendance meter STOPPED GRADING because the set has no green, amber may not be a bare fill and the thresholds are written nowhere, and the discount line lost a hue the semantic set has no meaning for. The legend words and the meta labels are untouched, so colour is not the only channel anywhere on this page. No query changed, no column added, no capability check touched, no action payload altered — the organizer refusal, the admin.access gate on the two master-only panels and the skipped funnel round trip are byte-identical",
  ],
  [
    "/admin/members/growth", "src/app/(admin)/admin/(work)/members/growth/page.tsx", "wide",
    "plan 41.1-14 — whole, and 'whole' here is four files: the route file, its placeholder, the growth chart and the summary card. Named on §4's closed wide list. THE CAUTION, because this is the surface where the community's growth is read: `community-membership.md` says growth is only meaningful next to how many seats a night has, and NO capacity figure, ratio or caption implying one was added — that is a product question and it went to the SUMMARY, not into the page. The heading read Admin, which is the prefix speaking, and is the surface's own name now, second instance of the correction /admin/members already made. Ten hand-rolled pulsing blocks, the most of the seven placeholders, gone. The chart's two band colours were read and recorded, not substituted. No query changed, no column added, no capability check touched, no action payload altered.",
  ],

  /* ──────────────────────────────────────────────────────────────────────────
   * WAVE 9 — the last five, and the commit that carries them is also the commit
   * that deletes the layout shim.
   *
   * ── CORRECTED 2026-08-18 BY PLAN 42-01: FOUR OF THE FIVE ARE BELOW ─────────
   *
   * `/admin/finance` left this block on 2026-08-18 because the surface was
   * **removed from the product** by a declared decision, and this list had not
   * moved with it — the fourth of the four dead entries DEF-45-01 named, and the
   * reason `checkManifest()` had been refusing with exit 2. The paragraph about
   * the held entry below is kept as history; see the correction at the head of
   * the WAVE 5 block for the measurement and the repair.
   *
   * Four of the five reasons below are the text the plan that did the work
   * reported in its own SUMMARY, taken verbatim rather than re-composed, on the
   * same argument as the wave-3 and wave-5 blocks: the plan that walked the
   * closure is the one that knows what *whole* turned out to mean. The only
   * editorial change is that a reason a SUMMARY printed across several lines is
   * joined into the one string this list's shape requires. Three plans reported;
   * this one writes (D-41.1-22).
   *
   * The fifth — `/admin/finance` — was the entry plan 41.1-15 drafted and this
   * list held, and it is **no longer below**: see the correction at the head of
   * this block. See the WAVE 5 block above for why it was held and what was
   * re-measured before releasing it. **The draft was THREE elements where this
   * list takes FOUR**, which plan 41.1-15 recorded rather than silently
   * corrected. The missing element is `pageFile`, supplied here from the tree;
   * the reason text itself is unedited. Pasted as drafted, `pageFile` would have
   * received `'wide'` and `checkManifest()` would have refused with "not on disk
   * under that exact name" — a sentence pointing at a missing file rather than
   * at a missing field.
   *
   * ── THE ARITHMETIC, so nobody counts 24 and finds 23 ───────────────────────
   *
   * 24 page files live under `admin/(work)/`. One of them — `/admin` itself —
   * renders nothing and ends in a `redirect`, and the paragraph at the head of
   * this list explains at length why it is not declarable. That leaves **23
   * declarable work pages, all 23 declared**. With the 8 surfaces Phase 41
   * declared before this phase opened, this list holds **28** entries.
   *
   * **RE-MEASURED 2026-08-18 by plan 42-01, because that count is history and a
   * stale count is read as a current one.** The tree moved twice since: four
   * surfaces were removed from the product (see the correction above) and six
   * were added by phases 44 and 45. Counted on this tree today:
   * **26** page files under `admin/(work)/`, of which **1** is the redirect this
   * list explains at length, **19** are declared here, and **6** are fenced by
   * `PENDING_SURFACES` as debt of the phases that built them. 1 + 19 + 6 = 26,
   * and the arithmetic closes with no residue — which is the condition check F
   * exists to keep true rather than to assert once. Across the whole of
   * `src/app` the list holds **34** entries.
   *
   * That count is also the precondition the layout shim's removal was waiting
   * for: `src/app/(admin)/admin/(work)/layout.tsx` stopped applying the leading
   * clearance in the same commit as these five entries, and may never stop
   * declaring it.
   * ────────────────────────────────────────────────────────────────────────── */

  [
    "/admin/events/[id]/sales", "src/app/(admin)/admin/(work)/events/[id]/sales/page.tsx", "wide",
    "plan 41.1-21 — whole, and 'whole' here is TWO files: the route file and SalesDashboard.tsx, its only importer. The third file in the closure, RefundActions.tsx, was converted once as spine in plan 41.1-17 precisely so this surface and the tickets surface could stay two plans, and it is not opened here. THE MONEY FLOOR'S ONE EXCEPTION IS HERE and is written in the component rather than only in a plan: D-41.1-13 puts the figure that decides money in a row's mark, and on this surface there is no such figure on a row — the event total is a card ABOVE the table, so the row's mark is the tier pill. A reader who finds a money table whose mark is a pill and no explanation concludes the rule was skipped. wide, named on §4's closed list as 'the per-event sales table'. There is no loading file for this route to convert. Three empty states in, three out, and the one that matters is chosen by a named value in the caller so a search matching nothing cannot claim the night sold nothing. No query changed, no column added, no capability check touched, no action payload altered; no status transition, no refund amount, no idempotency key and no webhook path moved.",
  ],
  [
    "/admin/events/[id]/tickets", "src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx", "wide",
    "plan 41.1-22 — whole, and 'whole' here is FIVE files in two directories: the route file and the four ticket components, with the refund control they mount converted one wave earlier as spine so that two plans in the same wave would not both reach it. Named on §4's closed wide list. THE CAUTION, because this is the surface that decides what a guest pays: no query changed, no column added, no capability check touched, no action payload altered, and no validation attribute moved — every price, quantity, discount value and usage ceiling keeps its type, its required flag, its minimum and its step, proved as a multiset over comment-stripped source rather than by reading a diff. No status transition, refund amount, idempotency key or webhook path is reachable from any of the five. The closure's twenty focus suppressions are now one imported expression — eighteen paid here, two paid by plan 41.1-17.",
  ],
  [
    "/admin/events/new", "src/app/(admin)/admin/(work)/events/new/page.tsx", "default",
    "plan 41.1-23 — the route file only, and 'only' is the point: the 1669-line form it mounts was converted whole by plan 41.1-18 and its five satellites by 41.1-19, so this entry declares the last file of that closure rather than the closure. NOT on §4's wide list and therefore default, which is not a fallback. Both branches take the same width, so the page does not change measure when the catalogue read fails. THE CAUTION: this route resolves who may create a night — no query changed, no column added, no capability check touched, no action payload altered, and the refusal redirect goes where it went. The refusal region gained an alert role because there is no error tracking here; its sentence is unchanged.",
  ],
  [
    "/admin/events/[id]/edit", "src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx", "default",
    "plan 41.1-23 — the route file only; the form (41.1-18), its five satellites (41.1-19) and the reveal panel (41.1-20) were converted before it. NOT on §4's wide list and therefore default, which is not a fallback. THE CAUTION, because this is the one work page that reaches the venue reveal: the conditional deciding whether the panel is drawn at all, and all five props it is given, are byte-identical before and after — no query changed, no column added, no capability check touched, no action payload altered, the ownership guard and both refusal redirects are where they were, and a night's format, series and number pass through untouched. Not drawing the panel was never the guard and this conversion did not make it one.",
  ],

  /* ──────────────────────────────────────────────────────────────────────────
   * PHASE 41.2 WAVE 1 — the three cheapest public surfaces, converted by plans
   * 41.2-03 and 41.2-04.
   *
   * Same construction as the wave-3, wave-5 and wave-9 blocks above and for the
   * same reason: every reason below is the text the plan that did the work
   * reported in its own SUMMARY, taken rather than re-composed, with the only
   * editorial change being that a reason a SUMMARY printed across several lines
   * is joined into the one string this list's shape requires. Two plans
   * reported; this one writes (D-41.1-22).
   *
   * ── WHAT WAS DIFFED, AND AGAINST WHAT ──────────────────────────────────────
   *
   * These three entries were written after diffing the tree, never after
   * reading either SUMMARY's counts. *A debt tracked by a proxy metric is closed
   * by anything that moves the metric* (D-41.1-16), and this repository has four
   * recorded recurrences of a number that fell for a reason nobody wrote down.
   * So: each page file was confirmed on disk, each closure's directory was
   * listed for a route-adjacent file (there is none beside any of the three —
   * a measured zero, not an assumption), and the own-maximum count on each was
   * re-derived with a raw grep that does not use the gates' shared comment
   * stripper.
   *
   * ── ALL THREE ARE `default`, AND `focus` IS UNAVAILABLE RATHER THAN DEFERRED
   *
   * None of the three is on §4's closed wide list, so `default` is the answer
   * and not a fallback. `focus` is not merely undesired on them: check E fails
   * any surface declaring `focus` while mounting a navigation
   * (`verify-conversion.mjs:3372`), and D-41.2-01 mounts the responsive form on
   * all three. Deferring implies it could be picked up later; it cannot be
   * picked up at all while the surface mounts a navigation.
   *
   * ── THE MEASURE ENTRY SHIPS IN THIS COMMIT, NOT THE NEXT ONE ───────────────
   *
   * `/artists/[slug]` is the phase's only DECLARE disposition, and its
   * `TYPOGRAPHIC_MEASURES` line lands in the SAME commit as its entry here, per
   * D-41-16. Split across two commits it fails both ways round: the declaration
   * alone is a check-D red on a correct line, and the measure alone is a
   * REFUSAL — *"no CONVERTED surface declares this page file"*. Wave 0's prose
   * named plan 41.2-04 as the entry's author and that plan's own rule 1 named
   * this one; the plan won, on D-41.1-22, and the disagreement is recorded in
   * `41.2-04-FINDINGS.md` F-41.2-04-01 rather than resolved in silence.
   * ────────────────────────────────────────────────────────────────────────── */

  [
    "/", "src/app/page.tsx", "default",
    "plan 41.2-03 — whole, and 'whole' here is ONE file: the landing route file itself. Everything its closure reaches beyond the primitives is spine already converted, and no loading, error or not-found file exists beside the route — listed, not assumed. NOT on §4's closed wide list and therefore default, which is not a fallback but the answer for every surface nobody had to argue about; focus is UNAVAILABLE rather than deferred, because this surface now mounts the responsive navigation DIRECTLY and check E fails any focus surface that mounts one. The own-maximum wave 0 dispositioned DELETE is gone and the disposition was applied rather than decided here; the equal-width action column it was actually buying is re-established by a grid that sizes to its widest child — not by a second maximum, and not by a fixed width, which would overflow the gutter on a 360px phone and put a horizontal scrollbar on the product's first screen. THE COPY CAUTION: the surface gains exactly ONE heading and its accessible string is the wordmark image's existing alt text, so no copy was introduced — the title WRAPS the image rather than carrying the brand as text, because Typography.tsx:34-42 puts the display face on that element and forbids it on a format name, re:sonate among them. The two call-to-action pills stayed Links and did NOT become Chips: the chip's only filled form is its selected state, which is also what emits aria-current, and a landing call to action is not the current item among its siblings, so taking the fill would make that claim falsely to every assistive technology reading the page. THE NO-BEHAVIOUR-CHANGE SENTENCE, which is the line a reviewer greps the diff against: no query changed, no column added, no capability check touched, no action payload altered",
  ],
  [
    "/newsletter", "src/app/(public)/newsletter/page.tsx", "default",
    "plan 41.2-03 — whole, and 'whole' here is TWO files: the route file and the subscribe form it is the only importer of. No loading, error or not-found file exists beside the route. NOT on §4's closed wide list and therefore default; focus is UNAVAILABLE rather than deferred, for the same check-E reason as the landing surface. THE HEADING CAUTION, and it is the opposite of what the research expected: the PAGE FILE GAINED NO HEADING. Measured across the surface rather than the page file, the form already carries one in EACH of its two mutually exclusive branches, so a title on the page file would have given the surface two headings per render; the substitution was done in the form, in place, one per branch, because the invariant is what the browser gets and not the count in a file. THE FORM'S OWN ENTRY COLUMN IS RETAINED, and the reason is written into the component's docblock rather than left sitting in a blind spot: check D reads the page file only, and that is a LIMIT rather than a permission — the shell owns the page measure now, and a single-field subscribe form run across the whole of it is not a form. RECORDED AND NOT REPAIRED: the subscribe form still collapses a network fault, a missing key and an address already on the list into one sentence, and this repository has no error tracking, so that sentence is the whole of what anybody will learn; naming the causes decides what an API route may tell an anonymous caller about an address it already holds, which is a question about a list of people and belongs to a plan that owns that route. THE NO-BEHAVIOUR-CHANGE SENTENCE, which is the line a reviewer greps the diff against: no query changed, no column added, no capability check touched, no action payload altered",
  ],
  [
    "/artists/[slug]", "src/app/(public)/artists/[slug]/page.tsx", "default",
    "plan 41.2-04 — whole, and 'whole' here is TWO files: the route file and the edit dialog its only local import mounts. No loading, error or not-found file exists beside the route. NOT on §4's closed wide list and therefore default; focus is UNAVAILABLE rather than deferred — check E fails any focus surface that mounts a navigation and this one mounts the responsive form directly. THE READING MEASURE STAYS, and this is the phase's ONLY DECLARE disposition: the bio paragraph's width is a property of one block of text and not a container maximum taken back from the shell, so the line was left alone and TYPOGRAPHIC_MEASURES carries it — written in the SAME commit as this entry (D-41-16), because a declaration without the entry is a check-D red on a correct line and an entry without the declaration is a refusal. That line's class string is byte-identical to what it was and its indentation is two spaces deeper, a mechanical consequence of one more nesting level; the matcher reads neither whitespace nor line numbers. This is also the phase's FIRST DIALOG CONVERSION, and it landed on the cheapest correct place for one — a surface carrying no money and no address: the hand-rolled overlay, panel and heading are gone for the Dialog primitive at the size §8.3's closed list already named this file at, so Escape, the focus trap, background inertness and the top layer arrive from the platform. The confirming control sits on the PRIMARY rung and not the destructive one, because a filled red is reserved for an act that destroys and saving a bio destroys nothing; the initial-focus marker is on Cancel and on nothing else, so the key that arrives before anyone has read the panel is not the key that saves; the refusal reports in the primitive's status region outside the scroller and never through a toast. Nine raw controls that declared no height at all are on primitives carrying an unprefixed 44px minimum, and the six labels became a prop, which is what gives each control a binding it did not have. RECORDED AND NOT REPAIRED: the dialog's catch still collapses a capability refusal, a failed update and a request that never arrived into one sentence, and naming them needs the server action to return a result union instead of throwing, which this phase does not open. Copy and payload are identical multisets before and after. THE NO-BEHAVIOUR-CHANGE SENTENCE, which is the line a reviewer greps the diff against: no query changed, no column added, no capability check touched, no action payload altered",
  ],

  /* ──────────────────────────────────────────────────────────────────────────
   * PHASE 41.2 WAVE 3 — the public funnel, the two member surfaces and the
   * ticket, converted by plans 41.2-06, 41.2-07 and 41.2-08.
   *
   * Same construction as every block above it, and for the same reason: every
   * reason below is the text the plan that did the work reported in its own
   * SUMMARY, taken rather than re-composed, with the only editorial change
   * being that a reason a SUMMARY printed across several lines is joined into
   * the one string this list's shape requires. Three plans reported; this one
   * writes (D-41.1-22).
   *
   * ── WHAT WAS DIFFED, AND AGAINST WHAT ──────────────────────────────────────
   *
   * These four entries were written after diffing the TREE, never after reading
   * any of the three SUMMARYs' counts. *A debt tracked by a proxy metric is
   * closed by anything that moves the metric* (D-41.1-16), and this repository
   * has four recorded recurrences of a number that fell for a reason nobody
   * wrote down. So: each page file was confirmed on disk case-exactly, each
   * route directory was LISTED for a route-adjacent file rather than assumed —
   * `/events` and `/membership-card` each have one placeholder, `/attendance`
   * and `/tickets/[id]` have none — and the own-maximum count on all six files
   * was re-derived with a raw grep that does not use the gates' shared comment
   * stripper. All six returned zero.
   *
   * ── THE PAIRING WAS ALREADY AT ITS NEW VALUE BEFORE THIS BLOCK EXISTED ─────
   *
   * Check E's pairing is computed from two tree-wide reads and never consults
   * this list (F-41.2-05-01). It moved 5/5 → 9/9 in WAVE 3's own conversion
   * commits, and the reconciliation that writes these four entries could not
   * have moved it. What these entries actually move is the declared-surface
   * count, the width-against-§4 comparison, the route-table partition and the
   * set of files checks A, B and D walk. Those are the figures to quote; the
   * pairing is reported and never leaned on.
   *
   * ── ALL FOUR ARE `default`, AND ON `/tickets/[id]` focus IS UNAVAILABLE ────
   *
   * None of the four is on §4's closed wide list, so `default` is the answer
   * and not a fallback. On `/tickets/[id]` the focus form is not merely
   * undesired: check E fails any surface declaring it while mounting a
   * navigation, and D-41.2-01 mounts one there. Deferring implies it could be
   * picked up later; it cannot be picked up at all while the surface mounts a
   * navigation. `/events` is the one place in this block where a width was
   * genuinely DEFERRED rather than unavailable — see its entry.
   * ────────────────────────────────────────────────────────────────────────── */

  [
    "/events", "src/app/(public)/events/page.tsx", "default",
    "plan 41.2-06 — whole, and 'whole' here is FOUR files: the route file, the tab surface it mounts, the format filter row and the route-adjacent placeholder the extension of the scanned set now reaches. NOT on §4's closed wide list and therefore default, which is not a fallback but the answer for every surface nobody had to argue about. THE WIDE FORM WAS DEFERRED AND NOT REJECTED, and this surface was the phase's ONE candidate for it: §4's stated criterion is a surface whose primary object is a dense table or a multi-column grid, and the nights render as a single column today — measured on the markup rather than argued, since the grid utility occurs nowhere in the tab file. Should a later phase lay the nights out in columns the change is one word in the shell's call plus a line on §4's list, and the deferral is written above the call in the file itself so the next reader sees a decision and not an oversight. THE CAUTION, because this is the public funnel and it is the surface that names venues: the declared render mode is still DECLARED and not derived — a copy of this list rendered before a reveal window and served after it shows the wrong side of a one-way switch, so venue-secrecy.md requires the mark rather than the observation; the stored-flag comparison is still written explicitly against false, so a row that never arrived, a join that failed or an absent column still counts as secret, and the count of the other forms of that flag is equal before and after; the label ternary is byte-identical with the SECRET BRANCH FIRST, and it is the only rendering of a venue on this surface; and the night select's column multiset is unchanged — 22 tokens, 17 distinct — proved over comment-stripped source rather than by reading a diff, because a column dropping out of that list fails nothing and merely changes what a predicate sees. The qualified embed hint survives too: unqualified it answers with an ambiguity error and FAILS SILENTLY, rendering the page as though there were no nights at all. THE NAVIGATION SENTENCE: this surface mounts the responsive form DIRECTLY and declares the tablet-tier column clearance in the same commit, the declaration byte-identical by checksum to the specimen at src/app/(public)/gallery/page.tsx:110 and the declaring element wrapping the shell with the navigation as its sibling; width may change layout and never membership, and the same four props go in, in the same order, so no entry can appear or disappear. RECORDED AND NOT REPAIRED: the listing's transient catch collapses a transport failure with no code into the sentence a stranger reads as an empty product, and this repository has no error tracking, so that sentence is the whole of what anybody learns. THE NO-BEHAVIOUR-CHANGE SENTENCE, which is the line a reviewer greps the diff against: no query changed, no column added, no capability check touched, no action payload altered",
  ],
  [
    "/attendance", "src/app/(members)/attendance/page.tsx", "default",
    "plan 41.2-07 — whole, and 'whole' here is ONE file: the route file itself, with no loading, error or not-found file beside it — the directory was listed, not assumed. This is the phase's CONTROL SURFACE and the reason it is worth its own entry: no money, no venue, no dialog, and zero measured interactive elements, so the diff it produced is the baseline three heavier plans are read against — 113 insertions on a 74-line file, of which the MARKUP moved five lines and the other 71 are the docblock and the placement comments. A reader costing the remaining conversions from the raw number would be costing the prose. NOT on §4's closed wide list and therefore default, which is not a fallback. THE NAVIGATION SENTENCE: the responsive form is mounted DIRECTLY and the tablet-tier column clearance declared in the same commit, byte-identical by checksum to the specimen at src/app/(public)/gallery/page.tsx:110, the declaring element wrapping the shell with the navigation as its sibling; width may change layout and never membership, and the same four props go in so no entry appears or disappears. DECLARED RATHER THAN HIDDEN: the list branch on this surface is a pre-existing stub — a TODO and a hardcoded empty array — so the empty branch is the only branch a member can reach, and it was INHERITED unchanged because fetching rows is a query and this conversion opens none. The branch was converted anyway, since a branch that never draws still ships its class strings to checks A and B. THE NO-BEHAVIOUR-CHANGE SENTENCE, which is the line a reviewer greps the diff against: no query changed, no column added, no capability check touched, no action payload altered",
  ],
  [
    "/membership-card", "src/app/(members)/membership-card/page.tsx", "default",
    "plan 41.2-07 — whole, and 'whole' here is FOUR files: the route file, its route-adjacent placeholder, the card view it mounts and the referral control beside it. That last file is reached by TWO of this phase's closures, so it was converted once as spine ahead of both, with the reason written INTO the file rather than only into a SUMMARY, so that this surface and the dashboard stay two plans instead of being merged into one. NOT on §4's closed wide list and therefore default. THE DOOR CAUTION: the conditional guarding what a person holds up at an entrance is BYTE-IDENTICAL apart from two spaces of indentation the shell's nesting supplied, proved on the trimmed line by checksum, and the card element with its three props is byte-identical by the same instrument; the code's payload, its 192px box in BOTH branches and its two tones are the module's and that module was read and never written; and the four token renames on the card view are declared ALIASES of their replacements, so the diff is provably a rename that moves no computed value at all — which is the only kind of edit this surface accepts, because refusing a valid guest is worse than admitting a duplicate and the first error happens in front of a queue. The accent-bordered gradient was deliberately kept OFF the card primitive: adopting it would delete the edge, flatten the gradient and reflow two padding zones, which is a redesign of the object a person presents at a door rather than a conversion. THE NAVIGATION SENTENCE: the responsive form is mounted DIRECTLY and the tablet-tier clearance declared in the same commit, byte-identical by checksum to the specimen at src/app/(public)/gallery/page.tsx:110, the declaring element wrapping the shell with the navigation as its sibling; width may change layout and never membership, and the same four props go in so no entry appears or disappears — a sentence that is load-bearing rather than ceremonial on the member area, where what a person can see IS the product. THE NO-BEHAVIOUR-CHANGE SENTENCE, which is the line a reviewer greps the diff against: no query changed, no column added, no capability check touched, no action payload altered",
  ],
  [
    "/tickets/[id]", "src/app/(public)/tickets/[id]/page.tsx", "default",
    "plan 41.2-08 — whole, and 'whole' here is ONE file: the route file itself. The refund control that sits beside it in the same directory has NO importer anywhere in the tree, so no closure walk reaches it and this entry does not claim it. No loading, error or not-found file exists beside the route — listed, not assumed. NOT on §4's closed wide list and therefore default. THE NARROW FORM IS UNAVAILABLE HERE RATHER THAN DEFERRED, and the distinction is the point: this file wrote the narrow measure BY HAND, TWICE, which is the file asking to be narrow, and it cannot have it — check E reports every surface declaring the focus form while mounting a navigation as a failure, the gate's own summary states the invariant as focus if and only if none is mounted, and D-41.2-01 mounts one here. Deferring implies it could be picked up later; it cannot be picked up at all while this surface mounts a navigation, and the word is repeated here so the next reader does not re-propose the narrow form from the shape of the file. Both hand-written maxima were DELETED per wave 0's disposition — they go together or the control stops matching the card — and the three roads that would have preserved the old width were each refused in writing, the third of them named as using a stated limit as a permission. THE CAUTION, because this surface holds the same secret as the public event page under a DIFFERENT PREDICATE: the venue line, its assignment and its comment are byte-identical, indentation included, and the block was deliberately left two spaces shallower than its siblings rather than re-indented, because re-indenting would have cost that assertion its qualifier-free form and a guard with no undo deserves the stronger claim; the stored secrecy flag is still SELECTED and still READ NOWHERE — its two sites are the select and a type, no branch, ternary or comparison consults it — so the surface holds the flag and does not use it, and if it ever looks consulted the file has grown a predicate it does not have. The divergence from the public event page is deliberate, documented in the file, and NOT reconciled here: reconciling it would be a behaviour change on the one act in this product that cannot be undone, decided by a visual conversion. THE RENDER MODE IS A QUESTION AND NOT AN ANSWER: this route IS dynamic and does not SAY so — it is dynamic only because something in its tree reads a session — so it satisfies venue-secrecy.md by derivation, and the one-line declaration that would close the gap is an owner's decision recorded with its measurement rather than taken inside a conversion. The wallet control kept its plain anchor and therefore does not prefetch: the other candidate primitive renders a typed link, and a hover would have MINTED A PASS — a money-path behaviour change dressed as a styling choice, avoided in the choosing rather than discovered afterwards. THE NAVIGATION SENTENCE: the responsive form is mounted DIRECTLY and the tablet-tier clearance declared in the same commit, byte-identical by checksum to the specimen at src/app/(public)/gallery/page.tsx:110, the declaring element wrapping the shell with the navigation as its sibling; width may change layout and never membership, and the same four props go in so no entry appears or disappears. THE NO-BEHAVIOUR-CHANGE SENTENCE, which is the line a reviewer greps the diff against: no query changed, no column added, no capability check touched, no action payload altered",
  ],

  /* ──────────────────────────────────────────────────────────────────────────
   * PHASE 41.2 WAVES 5, 6 AND 7 — the bar, the member dashboard and the public
   * event page, converted by plans 41.2-10 … 41.2-18 and declared here by
   * 41.2-19, the phase's third and last gate editor (D-41.1-22).
   *
   * Same construction as every block above it: every reason below is the text
   * the plan that did the work reported in its own SUMMARY, taken rather than
   * re-composed, joined into the one string this list's shape requires. Eight
   * plans reported; this one writes.
   *
   * ── WHAT WAS DIFFED, AND AGAINST WHAT ──────────────────────────────────────
   *
   * Against the TREE, never against the plans' own counts. `find src/app -name
   * "page.tsx"` returned **41**; each of the three page files below was
   * confirmed on disk case-exactly; each route directory was LISTED for a
   * route-adjacent file rather than assumed — `/events/[slug]/menu`,
   * `/dashboard` and `/events/[slug]` each have exactly one placeholder, three
   * measured ones and no `error` or `not-found` anywhere.
   *
   * ── THE PAIRING WAS ALREADY 12/12 BEFORE THIS BLOCK EXISTED ────────────────
   *
   * Check E's pairing is computed from two tree-wide reads and never consults
   * this list (F-41.2-05-01). It reached 12/12 in WAVE 7's own conversion
   * commits and the reconciliation that writes these three entries could not
   * have moved it. What these entries move is the declared-surface count
   * (35 → 38), the width-against-§4 comparison, the route-table partition and
   * the set of files checks A, B and D walk. Those are the figures to quote;
   * the pairing is reported and never leaned on.
   *
   * ── ALL THREE ARE `default`, AND `focus` IS UNAVAILABLE ────────────────────
   *
   * None of the three is on §4's closed wide list, so `default` is the answer
   * and not a fallback. `focus` is not deferred on any of them: check E fails
   * any surface declaring it while mounting a navigation
   * (`verify-conversion.mjs:3372`), and all three mount one.
   * ────────────────────────────────────────────────────────────────────────── */

  [
    "/events/[slug]/menu", "src/app/(public)/events/[slug]/menu/page.tsx", "default",
    "plans 41.2-11 and 41.2-12 — whole, and 'whole' here is FOUR files across two plans plus a placeholder: the route file and the organizer-facing menu (41.2-11), the guest's token screen and the guest purchase path (41.2-12), and the route-adjacent placeholder beside them, six hand-rolled pulses gone. A FIFTH file in this directory, the guest login banner, was converted in wave 0 under D-41.2-03 and is DELIBERATELY STILL UNREACHABLE — its import is commented out with a restore note, so no closure walk arrives at it and this entry does not claim it. NOT on §4's closed wide list and therefore default, which is not a fallback; focus is UNAVAILABLE rather than deferred, because this surface mounts the responsive navigation and check E fails any focus surface that mounts one. THE NAVIGATION SENTENCE, and it is the phase's one CONDITIONAL pair: the mount is conditional on a boolean, so the tablet-tier clearance is declared under the SAME boolean — two halves of one predicate rather than two static lines, the utility token matching the specimen at src/app/(public)/gallery/page.tsx:110 by checksum while the line deliberately does not. The conditional bottom clearance was DELETED rather than preserved: the shell reserves exactly what the signed-in branch reserved and corrects the tablet tier the pair could not reach. THE PHASE'S LAST STANDING OWN-MAXIMUM occurrence was here, composed at run time inside a template literal, and it is gone; the two conditional paddings on that same line survived, because dropping the authenticated branch would put the menu's last row under the phone navigation bar. THE VENUE CAUTION, and it is the correction the roadmap carried: this surface reads NO LOCATION AT ALL — zero occurrences across its files and no venue column in any of its select calls, re-measured on the tree after every diff rather than inherited from the premise the phase was written on. The heading decision is RECORDED EITHER WAY: the surface stays headless as a declared exception, because the file already carried a written decision to omit the event title and date and there is no dominant line to promote. The closing-time payload is byte-identical, and the guest's browser custody is proved byte-identical on all four paths — key, write, read, poll — by its ABSENCE from the diff rather than by an assertion about it. THE REFUSAL THAT IS PART OF THIS SURFACE: the guest token screen holds THREE shells where the plan modelled one, and the two the bartender operates are refused and left legible to the gate — D-41.2-07, granted per file on this file's own argument and explicitly NOT inherited from its twin. RECORDED AND NOT REPAIRED: five silent catches on the guest money path, each at its own file:line. THE NO-BEHAVIOUR-CHANGE SENTENCE, which is the line a reviewer greps the diff against: no query changed, no column added, no capability check touched, no action payload altered",
  ],
  [
    "/dashboard", "src/app/(members)/dashboard/page.tsx", "default",
    "plans 41.2-13 and 41.2-14 — whole, and 'whole' here is THREE files across two plans plus a placeholder: the route file and the member's token list (41.2-13), the member's own media section (41.2-14), and the route-adjacent placeholder, eleven hand-rolled pulses gone. The referral control beside it was converted ONE WAVE EARLIER as spine by plan 41.2-07, and the four money-core files in WAVE 5 by plan 41.2-10, precisely so that three surfaces stayed three plans instead of collapsing into one; neither is claimed here. NOT on §4's closed wide list and therefore default — this was the phase's SECOND wide candidate and the form is DEFERRED rather than rejected, reversible in one word of the shell's call; focus is UNAVAILABLE rather than deferred, for the check-E reason every surface in this block carries. THE NAVIGATION SENTENCE: the responsive form is mounted DIRECTLY and the tablet-tier column clearance declared in the same commit, on a div wrapping the shell with the navigation as its sibling, the token byte-identical by checksum to the specimen at src/app/(public)/gallery/page.tsx:110. THE MEDIA SECTION'S DISPOSITION IS STATED WITH ITS REASON, because it is the one place in this phase where a debt left a list by DELEGATION rather than by a shell swap: the tree's only hand-rolled role-marked overlay now delegates to the file already declared PERMANENTLY EXEMPT — the full-bleed media viewer — instead of being re-shelled onto the dialog primitive or granted an exemption of its own. That was decided in writing BEFORE the diff, and it is the reason D-41.2-06's warning against extending an exemption by analogy did not have to be exercised here. This is also the phase's heaviest raw-palette file, cleared against wave 0's own per-file number; the token grouping predicate is byte-identical; three tinted marks became neutral badges because the accent is not a state signal; and the disclosure toggle refused the button ladder — every rung is a pill and this is a full-width bar — so it stays a raw element, declares the 44px floor itself and IMPORTS the shared focus expression. One behaviour was ADDED AND DECLARED rather than discovered in a diff: the disclosure's expanded state, whose only previous channel was a rotating chevron. RECORDED AND NOT REPAIRED: a silent catch on a member's own money read, at its file:line. THE NO-BEHAVIOUR-CHANGE SENTENCE, which is the line a reviewer greps the diff against: no query changed, no column added, no capability check touched, no action payload altered",
  ],
  [
    "/events/[slug]", "src/app/(public)/events/[slug]/page.tsx", "default",
    "plans 41.2-15 … 41.2-18 — whole, and 'whole' here is the route file (41.2-15, knot 2), the secret-venue hint dialog (41.2-16, knot 3), the three money satellites (41.2-17) and four more satellites plus the placeholder (41.2-18); the shared money core beneath it was converted in wave 5 as spine and is not claimed here. NOT on §4's closed wide list and therefore default; focus is UNAVAILABLE rather than deferred, because this surface mounts the responsive navigation. THE NAVIGATION SENTENCE: the responsive form is mounted DIRECTLY and the tablet-tier clearance declared in the same commit — the TWELFTH of twelve — the token byte-identical by checksum to the specimen at src/app/(public)/gallery/page.tsx:110. THE CAUTION, and this one is the heaviest in the phase, because this is THE ONE PAGE IN THE PRODUCT WHERE MONEY AND A SECRET ADDRESS MEET. Every venue-critical property was counted AFTER the diff, not reasoned about: (1) the venue chain is still THREE BRANCHES AND AN ELSE-NULL, tests identical and in order, the guard byte-identical including indentation — the body was deliberately left two levels shallower than its new wrappers so that claim carries no whitespace qualifier; (2) the reveal test is still WRITTEN POSITIVELY and still carries the comment that explains why, because `undefined !== null` is TRUE and the negated form plus a dropped column opens every secret night silently; (3) the render mode is still DECLARED and not derived — one occurrence before, one after; (4) this route still exports NO social-preview metadata — zero occurrences before and after — and THE ABSENCE IS A DECISION (T-37-25), because a preview card carrying a secret address is a publication; (5) the night select's columns are unchanged as a MULTISET over comment-stripped source, 22 tokens and 21 distinct, corroborated by a raw second instrument agreeing in both states, with the qualified embed hint kept WHOLE as one token — unqualified it answers an ambiguity error and FAILS SILENTLY, rendering the page as though the night had no parties at all. THE COUNT '17' IS A DRIFTED FIGURE and is recorded rather than quietly satisfied (F-41.2-15-01): the plan and the context both said seventeen, the tree says 18 top-level items / 22 tokens / 21 distinct, and the MULTISET is the assertion while the number only describes it. The visibility function still has SEVEN ARMS AND TWO VERDICTS, still ANDed at the render site so the narrower always wins. Every satellite mount conditional and every prop is byte-identical, and NOT DRAWING A SATELLITE WAS NEVER THE GUARD — this conversion did not make it one. The hint dialog reached the platform's modal — Escape, focus trap, inert background — WITHOUT ONE CONDITIONAL LINE CHANGING, its three unlock branches still three and its deliberate two-bullet asymmetry still asymmetric; its two roads in became chips rather than buttons carrying an address, because the button ladder's link branch renders a bare anchor and would have lost client navigation, prefetching and the build-time address check silently. On the money satellites every validation attribute is proved unchanged as a SORTED MULTISET over comment-stripped source rather than by anybody reading a diff, and the purchase resumption's conditions are absent from the diff entirely. The upload surface still does not name the bucket it must never name; the tree's LAST use of the retired breakpoint tier was migrated by copying the analog's RULE rather than its literal string; and the share control's exit enumeration was rebuilt by reading the code, its payload proved byte-identical by checksum. RECORDED AND NOT REPAIRED: a seventh money-path failure — a reduction applied before signing up is carried INTO the stored intent and never carried OUT of it. THE NO-BEHAVIOUR-CHANGE SENTENCE, which is the line a reviewer greps the diff against: no query changed, no column added, no capability check touched, no action payload altered",
  ],

  /* ──────────────────────────────────────────────────────────────────────────
   * PHASE 42 — THE DOOR, at both of its addresses.
   *
   * Converted by plans 42-06 … 42-10 and declared here by 42-11, the phase's
   * single gate editor (D-41.1-22, applied again): a shared list is one file
   * every plan in a wave would want to edit, so five plans reported and one
   * plan writes. Every reason below is that work reported, joined into the one
   * string this list's shape requires.
   *
   * ── WHY THESE TWO ENTRIES AND THE FENCE ARE ONE COMMIT ────────────────────
   *
   * Until 2026-08-18 both pages sat behind `PHASE_42_PATHS` above, and check F
   * counted them in a bucket of their own. With the fence gone and no entry
   * here, two `page.tsx` files go UNACCOUNTED; with an entry here and the fence
   * still standing, the census counts the same page twice. Neither order is a
   * state this tree may pass through, so the fence empties and these two lines
   * arrive together.
   *
   * ── BOTH ARE `default`, AND BOTH OTHER WIDTHS ARE UNAVAILABLE ─────────────
   *
   * Neither route is on §4's closed wide list, so `default` is the answer and
   * not a fallback — the same answer thirty-four other declared surfaces give.
   * `focus` is UNAVAILABLE rather than deferred: check E fails any surface
   * declaring it while mounting a navigation, and this surface mounts one,
   * locked to its phone form (D-42-03). `wide` would mean adding two routes to
   * a CLOSED list, which is a decision nobody took and not a default anybody
   * may reach for.
   *
   * ── THE TWO ENTRIES ARE TWO, AND THAT IS THE POINT ────────────────────────
   *
   * The door has two addresses on purpose (D-39-01, D-39-02): `/door`, because
   * in this project `admin` in a URL is an address and not an authorisation and
   * the person working the door is not an administrator; and `/admin/scanner`,
   * served permanently and as a REAL PAGE, never a redirect, because a redirect
   * needs a network the door is designed not to have. Declaring one and not the
   * other would declare half a thing — the same argument the fence made when it
   * fenced both.
   * ────────────────────────────────────────────────────────────────────────── */

  [
    "/admin/scanner", "src/app/(admin)/admin/scanner/page.tsx", "default",
    "plans 42-06 … 42-10 — whole, and 'whole' here is TWENTY files walked and FOUR carrying markup: the route file, the access guard that mounts the navigation, the check-in client, and the accept/refuse/already-recorded flash. The other sixteen are libraries with no class attribute in them. No loading, error or not-found file exists beside the route — listed, not assumed. NOT on §4's closed wide list and therefore default; focus is UNAVAILABLE rather than deferred, because this surface mounts a navigation and check E fails any focus surface that does. THE NAVIGATION SENTENCE, and it is the one surface in the product that reads differently from the other twelve: the navigation is mounted LOCKED TO ITS PHONE FORM, so the door keeps the bar at every width and never receives the leading column — the tablet-tier clearance is therefore ABSENT here BY DECISION (D-42-03), and check E's pairing counts twelve declaring files against twelve mounting the responsive form with this surface in neither set. THE CAUTION, and its formula is NOT the one every entry above carries, because that formula is about queries and columns and money and this surface is about a DOOR: at two in the morning, in the dark, one-handed, in front of a queue, with the radio off. So the assertion is the one a reviewer can hold against the diff HERE: no outcome changed — the three the scanner can say are still three, still the same type, still reached from the same call sites; no dwell changed; no haptic changed, nor the outcome-to-haptic mapping; no queue shape or store version changed; no undo path changed; no torch behaviour changed; no auto-return changed; and the decode configuration is BYTE-IDENTICAL — frame rate, decoded region and camera facing are three literals this phase did not touch, because changing them would be a behaviour change dressed as a layout commit. All of it is diffable rather than assertable: the mechanical record in 42-BASELINE.md is re-captured after this phase and compared block by block, and the only content differences it accepts are the two outcome fills and the scanned-file count. WHAT STAYED RAW, so a reader of this list finds the derogation without opening the gate: the accept green and the darkened refusal red are DECLARED DEROGATIONS in check A, per utility and per line, because the semantic vocabulary has NO accept colour — phase 40 declined to invent one — and because the refusal deliberately does not take the critical semantic, which sits at 2.2 from the colour that everywhere else in this product means press here. THE MAXIMA ARE THE SURFACE'S OWN AND SAID SO: this page does not import the shell and is declared FULL-BLEED for it, carrying 1024px on the surface container and 384px on the viewfinder — both of them two of the shell's own three, never a fourth number. RECORDED AND NOT REPAIRED: fourteen touch targets below the floor (DEF-42-03, a numbered debt in verify-touch-targets), three control boundaries at 2.05:1 against a 3:1 floor (DEF-42-06), and the door's counters left proportional rather than tabular (DEF-42-02). AND WHAT NO GREEN HERE SAYS: criterion 3 — every scanner behaviour unchanged from before the conversion — is PERMANENTLY WITHOUT A TERM OF COMPARISON (DEF-42-04), because the door pass on the unconverted scanner was never run and its subject no longer exists. This entry is a written claim about a diff; that the door works at an entrance is a person's observation and it is still owed",
  ],
  [
    "/door", "src/app/(admin)/door/page.tsx", "default",
    "plans 42-06 … 42-10 — the door's permanent address (STAFF-04, D-39-01), whole, and 'whole' here is the SAME twenty files as /admin/scanner with ONE substitution: this route file in place of that one. Nineteen of the twenty are shared, because both addresses render the same guard and the same client — this page is nine live lines and a mount. It is declared SEPARATELY rather than folded into its twin for the reason the fence gave when it fenced both: check D reads the PAGE FILE, check F counts page files on disk, and a surface reached by two routes that declares only one leaves the other unaccounted. Both addresses are opened by ONE capability entry and never by a second predicate, and that is unchanged by this phase. NOT on §4's closed wide list and therefore default; focus is UNAVAILABLE for the same check-E reason as its twin. THE CAUTION IS THE SAME CAUTION, and it is repeated in full rather than cross-referenced, because a reason that lives somewhere else is a reason that stops being true unnoticed: no outcome changed; no dwell changed; no haptic changed, nor the outcome-to-haptic mapping; no queue shape or store version changed; no undo path changed; no torch behaviour changed; no auto-return changed; and the decode configuration is BYTE-IDENTICAL — frame rate, decoded region and camera facing untouched. Diffed against 42-BASELINE.md block by block rather than asserted. WHAT STAYED RAW: the accept green and the darkened refusal red, both DECLARED DEROGATIONS in check A per utility and per line — the semantic set has no accept colour, and the refusal declines the critical semantic because it collides with the accent. THE MAXIMA ARE THE SURFACE'S OWN: full-bleed by construction, 1024px on the surface and 384px on the viewfinder, both drawn from the shell's own three. RECORDED AND NOT REPAIRED: DEF-42-02, DEF-42-03 and DEF-42-06, none of them this phase's to close. AND WHAT NO GREEN HERE SAYS: criterion 3 has no term of comparison and cannot acquire one (DEF-42-04) — a green on this line says the files agree with the gates, never that the door works in front of a queue",
  ],
];

/* ────────────────────────────────────────────────────────────────────────────
 * The checks a consumer must run before trusting any of the above
 * ──────────────────────────────────────────────────────────────────────────── */

const WIDTHS = new Set(["default", "wide", "focus"]);

/**
 * Returns `{ ok, refusals }`. A **refusal is not a failure** — it means the
 * measurement did not happen, and the convention this repository already uses
 * for that is **exit 2**, distinct from a red check's exit 1.
 *
 * Call it first, before reading a single entry. Every condition below makes
 * some later assertion vacuous rather than wrong, which is the failure mode
 * that goes unnoticed: a gate scanning an empty list prints a tick.
 */
export function checkManifest() {
  const refusals = [];

  if (CONVERTED.length === 0) {
    refusals.push(
      "CONVERTED is empty. A gate scoped to converted surfaces with no converted\n" +
        "       surface to scan would print a tick having measured nothing. A vacuous green\n" +
        "       is not a green — this is exit 2, not exit 0."
    );
  }

  if (PRIMITIVES.length === 0) {
    refusals.push(
      "PRIMITIVES is empty. The orphan check would pass by having nothing to check,\n" +
        "       which is the exact shape of the failure it exists to catch."
    );
  }

  for (const [route, pageFile, width] of CONVERTED) {
    if (!existsCaseExact(pageFile)) {
      refusals.push(
        `CONVERTED names ${route} at ${pageFile}, which is not on disk under that exact\n` +
          "       name. Either the surface moved and this entry moves with it in the same\n" +
          "       commit, or the entry is a claim about a file that does not exist — and on a\n" +
          "       case-insensitive volume the third possibility is a CASE TYPO in the path\n" +
          "       above, which every consumer of this list compares case-exactly. Nothing was\n" +
          "       measured."
      );
    }
    if (!WIDTHS.has(width)) {
      refusals.push(
        `CONVERTED names ${route} with width "${width}", which is not one of the three\n` +
          "       forms §4 declares. A fourth width is a decision that edits the contract first."
      );
    }
  }

  for (const [path] of SPINE) {
    if (!existsCaseExact(path)) {
      refusals.push(
        `SPINE names ${path}, which is not on disk under that exact name. A spine\n` +
          "       entry is an EXCLUSION from an import-closure walk, so a stale one silently\n" +
          "       removes a real file from a gate's scope — the one failure direction that\n" +
          "       produces a green. A CASE TYPO does it too: the walk emits the path the\n" +
          "       filesystem spells, and the exclusion is matched case-exactly against it."
      );
    }
  }

  for (const [path, exportName] of PRIMITIVES) {
    if (!existsCaseExact(path)) {
      refusals.push(
        `PRIMITIVES names ${exportName} in ${path}, which is not on disk under that\n` +
          "       exact name — a missing file, or a case typo this repository's gates would\n" +
          "       resolve differently from the volume it is checked out on. Nothing was\n" +
          "       measured."
      );
    }
  }

  /*
   * A stale NON_DECLARABLE entry REFUSES, for the reason every other list in
   * this function refuses: a stale entry reads exactly like a live one. Check F
   * subtracts this list from the tree's census, so an entry naming a file that
   * is gone would silently make the arithmetic close on a page nobody accounted
   * for — the one failure direction that prints a tick.
   */
  for (const [path] of NON_DECLARABLE) {
    if (!existsCaseExact(path)) {
      refusals.push(
        `NON_DECLARABLE names ${path}, which is not on disk under that exact name.\n` +
          "       This list is SUBTRACTED from check F's tree-side census, so a stale entry\n" +
          "       does not merely sit there: it forgives a page that does not exist while some\n" +
          "       page that does exist goes unaccounted for. If the route was deleted or moved,\n" +
          "       its line leaves in the same commit. Nothing was measured."
      );
    }
  }

  /*
   * A PENDING_SURFACES glob matching NO page.tsx on disk REFUSES — the sixth
   * condition, added 2026-08-18 by plan 42-01, and the one `PHASE_42_PATHS`
   * deliberately does not have.
   *
   * The other five conditions read a path and ask the filesystem about it. This
   * one reads a PATTERN, so the stale direction looks different: an entry cannot
   * name a file that is gone, it can only stop catching anything — and a fence
   * catching nothing is indistinguishable, in the report and in the exit code,
   * from a fence doing its job. Check F subtracts this list from the tree's
   * census exactly as it subtracts NON_DECLARABLE, so a glob that has quietly
   * stopped matching is a scope boundary nobody can see, still printed as though
   * somebody drew it.
   *
   * Either the surface was CONVERTED and the entry should have left in that
   * commit, or it was removed from the product and the entry outlived it. Both
   * are the same defect DEF-45-01 recorded on CONVERTED, in the direction that
   * prints a tick instead of a red.
   *
   * The walk is here rather than in a consumer for the reason the module's own
   * docblock gives: nothing runs at import time, but a consumer must be able to
   * ask ONE function whether the lists can be trusted before reading an entry.
   */
  for (const [glob] of PENDING_SURFACES) {
    if (!globMatchesSomePage(glob)) {
      refusals.push(
        `PENDING_SURFACES declares ${glob}, which matches NO page.tsx on disk. A fence\n` +
          "       that catches nothing is not a smaller fence: it is a scope boundary a reader\n" +
          "       still sees printed and no file is behind. Either the surface was CONVERTED —\n" +
          "       in which case this line leaves in the SAME COMMIT as its CONVERTED entry,\n" +
          "       which is this list's only exit — or the surface was removed from the product\n" +
          "       and the entry outlived it, which is DEF-45-01 again in the direction that\n" +
          "       prints a tick. Nothing was measured."
      );
    }
  }

  return { ok: refusals.length === 0, refusals };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The glob helper `checkManifest()`'s sixth condition needs
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `**` spans separators, `*` does not, every other character is literal.
 *
 * Deliberately the SAME translation `verify-conversion.mjs` applies to
 * `PHASE_42_PATHS`, so a glob written here means on this side exactly what it
 * means on the consumer's side. Two matchers disagreeing about one pattern would
 * let `checkManifest()` accept a fence check F never applies — which is a
 * refusal that does not fire and a page that goes unaccounted for.
 */
function globToRegExp(glob) {
  let out = "^";
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i += 1;
        if (glob[i + 1] === "/") i += 1;
      } else {
        out += "[^/]*";
      }
      continue;
    }
    out += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${out}$`);
}

/** Every `page.tsx` under `src/app`, relative to ROOT, symlinks not followed. */
function appPageFiles() {
  const out = [];
  const walk = (abs, rel) => {
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const childRel = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(join(abs, entry.name), childRel);
        continue;
      }
      if (entry.isFile() && entry.name === "page.tsx") out.push(childRel);
    }
  };
  walk(join(ROOT, "src/app"), "src/app");
  return out;
}

function globMatchesSomePage(glob) {
  const re = globToRegExp(glob);
  return appPageFiles().some((rel) => re.test(rel));
}

/** The spine entries a walk may skip today — `pending` members are NOT skipped. */
export function convertedSpinePaths() {
  return SPINE.filter(([, state]) => state === "converted").map(([path]) => path);
}
