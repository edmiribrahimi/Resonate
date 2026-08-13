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
 * D-41-01 counts fourteen spine members and this list has fifteen entries: the
 * navigation is one member and two files, because D-41-21 keeps the wrapper as
 * the mechanism that holds Phase 42's fence. The discrepancy is arithmetic, not
 * scope creep, and is written here so nobody re-derives it as a defect.
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
    "src/components/layout/MobileNav.tsx", "converted",
    "the wrapper locking the door to the phone form (D-41-21) — the same spine member as AppNav, kept as a separate file because it is the mechanism holding Phase 42's fence, and Phase 42 deletes it",
  ],
  [
    "src/components/staff/StaffNav.tsx", "converted",
    "the eight work tabs in two forms — mounted by the work layout, a surface of none",
  ],
];

/* ────────────────────────────────────────────────────────────────────────────
 * PHASE_42_PATHS — excluded by path, because they belong to another phase
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Paths this phase does not open for anything beyond a read.
 *
 * The door and the scanner are **Phase 42's**, which takes colour, contrast and
 * type only and does not touch behaviour. The exclusion is by path and not by
 * judgement, because the failure mode is a gate quietly widening its own scope
 * one convenient file at a time.
 *
 * **This exclusion costs nothing, and that is a built thing rather than a
 * lucky one.** `src/components/layout/MobileNav.tsx` exists as a thin wrapper
 * precisely so the door keeps today's navigation layout while the primitive
 * behind it gained a second tier (D-41-21). Without that wrapper, excluding the
 * door would have meant either leaving it on an unconverted component or
 * putting a 224px column on a screen someone reads at an entrance — a change to
 * the door's surface, delivered by a phase whose own fence says the door is not
 * its business.
 *
 * Shape: `[glob, reason]`. Consumers match by prefix-with-wildcard, and a
 * consumer that cannot express a glob should match the literal directory rather
 * than approximate the pattern.
 */
export const PHASE_42_PATHS = [
  [
    "src/app/(admin)/**/scanner/**",
    "the scanner surface and its route — Phase 42 decides what the door looks like above phone width, and it is its decision and not this phase's",
  ],
  [
    "src/components/scanner/**",
    "the scanner's components — the check-in path, which is read at an entrance in the dark with one hand and has an offline behaviour no visual phase should disturb",
  ],
  [
    "src/app/(admin)/door/**",
    "the door's second address — a thin page over the same surface (STAFF-04); excluding one address and not the other would have fenced half a thing",
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

  return { ok: refusals.length === 0, refusals };
}

/** The spine entries a walk may skip today — `pending` members are NOT skipped. */
export function convertedSpinePaths() {
  return SPINE.filter(([, state]) => state === "converted").map(([path]) => path);
}
