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

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
    "src/components/ui/Skeleton.tsx", "pending",
    "PENDING until plan 41-08 — it exists, is correct and has ZERO importers, while 102 hand-rolled placeholder blocks live in 20 other files. It is D-41-04's own precedent and may not be marked converted before the plan that gives it a consumer",
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
];

/**
 * `Textarea` and `Select` ship in the same file as `Input` and are DELIBERATELY
 * ABSENT from the list above.
 *
 * Plan 41-06 was required to publish all three, and the three `(auth)` screens
 * it converts contain **seven text inputs, no textarea and no select**. So two
 * of the three exports have no consumer in their own wave — the exact orphan
 * shape D-41-04 exists to prevent, and the same shape `Skeleton.tsx` has been
 * carrying since before this phase began.
 *
 * They are not entered here because an entry would make check C go red on a
 * file that is correct, and silencing that by removing the check is how a gate
 * becomes decoration. Recording the absence in writing is the honest form: the
 * plan that first renders a textarea or a select adds its entry, and until then
 * this paragraph is the record that nobody forgot rather than that nobody
 * looked. It is the same treatment `SPINE` gives `Skeleton.tsx` and the same
 * treatment the focus-expression constant gets above.
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
    if (!existsSync(join(ROOT, pageFile))) {
      refusals.push(
        `CONVERTED names ${route} at ${pageFile}, which is not on disk. Either the\n` +
          "       surface moved and this entry moves with it in the same commit, or the entry\n" +
          "       is a claim about a file that does not exist. Nothing was measured."
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
    if (!existsSync(join(ROOT, path))) {
      refusals.push(
        `SPINE names ${path}, which is not on disk. A spine entry is an EXCLUSION from\n` +
          "       an import-closure walk, so a stale one silently removes a real file from a\n" +
          "       gate's scope — the one failure direction that produces a green."
      );
    }
  }

  for (const [path, exportName] of PRIMITIVES) {
    if (!existsSync(join(ROOT, path))) {
      refusals.push(
        `PRIMITIVES names ${exportName} in ${path}, which is not on disk. Nothing was measured.`
      );
    }
  }

  return { ok: refusals.length === 0, refusals };
}

/** The spine entries a walk may skip today — `pending` members are NOT skipped. */
export function convertedSpinePaths() {
  return SPINE.filter(([, state]) => state === "converted").map(([path]) => path);
}
