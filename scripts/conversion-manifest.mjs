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
 * ── `/admin` IS DELIBERATELY NOT DECLARED, AND THIS IS WHY ──────────────────
 *
 * The work surface has **24 pages and 23 declarable surfaces**. The one that is
 * missing is `/admin` itself, at `src/app/(admin)/admin/(work)/page.tsx`, and it
 * is left out on purpose so that the next reader counts 24, finds 23, and reads
 * this paragraph instead of filing a defect.
 *
 * That file is 39 lines, carries **zero `className`**, renders no markup, and
 * ends in a `redirect`. It is an entrance: it resolves the access context,
 * refuses a visitor without `organizer.access`, and forwards. **It therefore can
 * never import `PageShell`** — there is nothing for a shell to wrap — and check
 * D of `verify-conversion.mjs` puts any declared surface whose page file does
 * not import the shell into `pagesWithoutShell`, which is a FAILURE. Declaring
 * it would produce a red on a correct file, and a gate that reddens correct code
 * is a gate somebody switches off (§0 rule 3, D-41-19's second failure mode;
 * `scripts/verify-media-strip.mjs:51-62` is this repository's own record of it
 * happening).
 *
 * **Criterion 1 reads *every page that renders a surface*.** A redirect renders
 * nothing and shows nobody a half-converted screen, which is the thing the
 * criterion protects a person from. So `/admin` is not an exemption carved out
 * of the criterion's scope; it was never inside it.
 *
 * **This was settled BEFORE check D's first red run**, which is the whole point
 * of writing it here rather than discovering it: an exemption found on a red run
 * is an exemption nobody trusts, and the gate is what gets edited next (D-41-16).
 *
 * The precedent for declining to make a claim rather than making a convenient
 * one is the `PRIMITIVES` note a few hundred lines above this — *"Rendered
 * primitives only"*, `conversion-manifest.mjs:206-214` at the time it was
 * written, where the shared focus-expression constant is left off the list
 * because it renders nothing and G1 check C's failure mode is a component nobody
 * mounted. Same shape, same reason: a list of claims is how a gate becomes a
 * rubber stamp.
 *
 * **What this does NOT say.** It does not say `/admin` is converted, and it does
 * not say it is unconverted. It says this list is not where that question is
 * answered. If a future plan gives that route markup — a chooser, a landing
 * board, anything a person looks at — it stops being a redirect, it becomes
 * declarable, and this paragraph comes out in the same commit as its entry.
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
   * Same construction as the wave-3 block above and for the same reason: every
   * reason below is the text the plan that did the work reported in its own
   * SUMMARY, taken verbatim rather than re-composed, with the only editorial
   * change being that a reason a SUMMARY printed across several lines is joined
   * into the one string this list's shape requires. Four plans reported; this
   * one writes (D-41.1-22).
   *
   * **All five routes are NAMED on §4's closed wide list**, so `checkManifest()`
   * and check D can compare the width against the contract rather than take it
   * on agreement: `verify-conversion.mjs`'s `WIDE_ROUTES` carries all five at
   * :1223-:1227.
   *
   * ── THE SIXTH SURFACE OF THIS WAVE WAS HELD, AND THE HOLD IS NOW SPENT ─────
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
   * expired rather than assumed expired.** The entry is in the WAVE 9 block at
   * the end of this list. What was checked before writing it: `RefundDialog.tsx`
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
   * on this tree on 2026-08-14 is
   * `src/app/(admin)/admin/(work)/finance/page.tsx`, and `/admin/finance` is on
   * §4's closed wide list at `verify-conversion.mjs:1218`. Recorded here rather
   * than silently corrected in the quotation: a reported entry text is taken as
   * reported, and an editorial fix to somebody else's sentence is exactly the
   * move this block's opening paragraph refuses.
   * ────────────────────────────────────────────────────────────────────────── */

  [
    "/admin/analytics/members", "src/app/(admin)/admin/(work)/analytics/members/page.tsx", "wide",
    "plan 41.1-12 — whole, and 'whole' here is SIX files in two directories: the route file and its loading state under (work)/, and the two tables and the two KPI tiles under components/analytics/. Everything else the closure reaches is spine already converted (the two motion wrappers) or a lib module carrying zero class attributes. Named on §4's CLOSED wide list — the primary object is two dense tables. This is the surface that gives DataTable its SECOND and THIRD adopters, which is what turns one proof into a pattern. THE CAUTION, because this surface reads money without moving any: the total spend and the chain spend are both MARK slots and never meta details (D-41.1-13), each supplying its own emphasis because the primitive gives a mark position and not weight; no query changed, no column added, no capability check touched, no action payload altered, and no status transition, refund amount, idempotency key or webhook path exists anywhere in the closure. TWO THINGS A READER WILL SEE. First, the referral chain becomes a REAL table for the first time: its body used to hold one cell spanning all three columns with a native disclosure inside, so its three headers labelled columns no cell aligned to, and the three are actual cells now. Second, that file crosses to the client, because the expansion apparatus is controlled and needs state — declared here and in its docblock rather than discovered in a diff, and no new audience is created, since every name and figure it carries is already rendered to HTML today. The rank stopped being an array index and became a property of the row (gap G-a): widening the primitive's published cell signature for one table was refused, and dropping the rank from the card was refused too, because list position is not the fact.",
  ],
  [
    "/admin/events/[id]/analytics", "src/app/(admin)/admin/(work)/events/[id]/analytics/page.tsx", "wide",
    "plan 41.1-13 — whole, and 'whole' here is TEN files in two directories: the route file and its loading state under (work)/, and eight cards, charts and one table under src/components/analytics/. The rest of the closure is spine or carries zero class attributes: the animation wrapper writes none of its own and is already reached by two declared surfaces, the count-up and the query module have none at all, and the primitives are converted. Named on §4's CLOSED wide list. This is the surface that gives DataTable its SECOND adopter — one column declaration, five columns, and revenue as the mark because a figure that decides money is never a meta (D-41.1-13). THE PART WITH NO ANALOG IS THE CHARTS: no converted file in this tree is one, and a chart's palette is unreachable by a class-string scanner, so all three were READ. Four legacy token aliases became the current names at identical values; the two accent bar fills and the funnel's data-carried four-step palette were LEFT AND REPORTED rather than substituted, because §5.1 has no clause for a chart series and the categorical palette lives in a file outside the authorized list — neither is a format identification colour and neither is a sunset stop, which is the halt test, and both pass it. Nine raw palette hits left the surface and three of them were decisions rather than substitutions: the token lifecycle's three segments ARE states and take the completion and critical semantics, the attendance meter STOPPED GRADING because the set has no green, amber may not be a bare fill and the thresholds are written nowhere, and the discount line lost a hue the semantic set has no meaning for. The legend words and the meta labels are untouched, so colour is not the only channel anywhere on this page. No query changed, no column added, no capability check touched, no action payload altered — the organizer refusal, the admin.access gate on the two master-only panels and the skipped funnel round trip are byte-identical",
  ],
  [
    "/admin/analytics", "src/app/(admin)/admin/(work)/analytics/page.tsx", "wide",
    "plan 41.1-14 — whole, and 'whole' here is four files: the route file, its placeholder, the KPI grid and the activity feed. Named on §4's closed wide list, because its primary object is a multi-column grid — the one genuinely three-tier axis this product has, and the axis that grid was declaring from the SMALL prefix, which put three columns into the 544px a portrait tablet leaves. It gained the middle step. The figures moved to the data face, which §7.1 requires of any figure and count and which is what aligns them; the revenue tile lost an accent wash and an accent edge with no semantic tone put in their place, because a fill that means look here first is not a fill that grades. Eight hand-rolled pulsing blocks gone. No query changed, no column added, no capability check touched, no action payload altered.",
  ],
  [
    "/admin/analytics/compare", "src/app/(admin)/admin/(work)/analytics/compare/page.tsx", "wide",
    "plan 41.1-14 — whole, and 'whole' here is four files: the route file, its placeholder, the event picker and the comparison chart. Named on §4's closed wide list: its primary object is up to four series side by side. The picker is the only thing a person touches on this surface, so every row is the checkbox primitive now — the 16px drawn box kept, a 44x44 target around it — and the two mode pills are chips, which closes finding A2 where an accent fill carried white at 2.91:1. THE CHART WAS READ RATHER THAN SCANNED: its four series colours are one token and three raw values set through a rendering prop, invisible to every class-string gate, and neither a format identity colour nor the sunset gradient — so they were recorded, not substituted, and the gap they expose is a question for the owner. Six hand-rolled pulsing blocks gone. No query changed, no column added, no capability check touched, no action payload altered.",
  ],
  [
    "/admin/members/growth", "src/app/(admin)/admin/(work)/members/growth/page.tsx", "wide",
    "plan 41.1-14 — whole, and 'whole' here is four files: the route file, its placeholder, the growth chart and the summary card. Named on §4's closed wide list. THE CAUTION, because this is the surface where the community's growth is read: `community-membership.md` says growth is only meaningful next to how many seats a night has, and NO capacity figure, ratio or caption implying one was added — that is a product question and it went to the SUMMARY, not into the page. The heading read Admin, which is the prefix speaking, and is the surface's own name now, second instance of the correction /admin/members already made. Ten hand-rolled pulsing blocks, the most of the seven placeholders, gone. The chart's two band colours were read and recorded, not substituted. No query changed, no column added, no capability check touched, no action payload altered.",
  ],

  /* ──────────────────────────────────────────────────────────────────────────
   * WAVE 9 — the last five, and the commit that carries them is also the commit
   * that deletes the layout shim.
   *
   * Four of the five reasons below are the text the plan that did the work
   * reported in its own SUMMARY, taken verbatim rather than re-composed, on the
   * same argument as the wave-3 and wave-5 blocks: the plan that walked the
   * closure is the one that knows what *whole* turned out to mean. The only
   * editorial change is that a reason a SUMMARY printed across several lines is
   * joined into the one string this list's shape requires. Three plans reported;
   * this one writes (D-41.1-22).
   *
   * The fifth — `/admin/finance` — is the entry plan 41.1-15 drafted and this
   * list held; see the WAVE 5 block above for why it was held and what was
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
   * That count is also the precondition the layout shim's removal was waiting
   * for: `src/app/(admin)/admin/(work)/layout.tsx` stopped applying the leading
   * clearance in the same commit as these five entries, and may never stop
   * declaring it.
   * ────────────────────────────────────────────────────────────────────────── */

  [
    "/admin/finance", "src/app/(admin)/admin/(work)/finance/page.tsx", "wide",
    "the finance ledger — the transaction list on DataTable, its cursor pagination and async detail intact; no query changed, no column added, no capability check touched, no action payload altered, and no status transition, refund amount, idempotency key or webhook path moved",
  ],
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
