---
phase: 41-shared-primitives-three-tier-layout
plan: 10
subsystem: frontend
tags: [ds-07, ds-09, resp-01, resp-02, resp-03, resp-04, datatable, checkbox, g3, admin-members, conversion-manifest]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 03
    provides: "IconButton, Chip and FOCUS_RING — the focus expression is imported by Checkbox and by the two raw controls left on this surface, never re-authored"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 05
    provides: "PageShell (the wide form), Card, Button, PageTitle, and scripts/conversion-manifest.mjs"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 06
    provides: "Input and Select — the control boundary that measures; Select gained its first importers here"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 07
    provides: "verify-conversion.mjs — the import-closure walk this surface is checked by, and the recorded lesson that a borrowed matcher carries the sibling's purpose"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 08
    provides: "Badge, SkeletonLine and SkeletonCard — and the measured rule that a caller cannot override a primitive's own value for the same property"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 09
    provides: "the house rule that a semantic is INK and not a tinted box, the STALE-then-delete discipline for a shrinking debt list, and the exemption-is-not-a-debt distinction"
provides:
  - "src/components/ui/DataTable.tsx — one array, one column declaration, two trees that are never transformed, switching at md and nowhere else"
  - "src/components/ui/Checkbox.tsx — a 16px drawn box inside a 44x44 hit area that is also the control's programmatic name"
  - "scripts/verify-tables.mjs — G3, three checks, with ReviewListClient exempt by name and reason before the first run"
  - "/admin/members converted whole — five files, the eighth surface in CONVERTED, at wide"
  - "The measured fact that a branch matcher without a trailing boundary guard reads a column-count utility as a branch switch"
  - "The measured fact that pointer-fine-only:min-h-9 is emitted after every unprefixed minimum, so the one permitted shrink is live"
  - "DEF-41-05 — SkeletonLine fixes its own radius and a caller cannot override it"
affects: [41-11, 41-12, 42-scanner, 44-calendar, 45-production-sections]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A dual-render is ONE component with ONE column declaration, not two components: two lists of columns drift, and a column added to the table and forgotten on the card is the defect that renders, compiles and looks correct"
    - "A matcher borrowed in shape from a sibling carries the sibling's PURPOSE — this is the second time in the phase: a boundary guard tuned for one hunt is wrong for the next, and only a mutation finds it"
    - "The primitive hands the caller a fact about WHICH TREE it is in, never a viewport read — the shrink keys off the branch, so a wrong answer costs a slightly-too-large button and never a too-small one"
    - "A hue that no token declares is a hue nobody decided, and on a surface that judges people the word is the safer channel — approved and rejected deliberately share a tone so that no colour ranks a person"
    - "An exemption and a debt do not share a list, and a debt entered and paid inside one plan is the only kind whose payment anybody can check"

key-files:
  created:
    - src/components/ui/DataTable.tsx
    - src/components/ui/Checkbox.tsx
    - scripts/verify-tables.mjs
  modified:
    - src/components/admin/MemberTable.tsx
    - src/app/(admin)/admin/(work)/members/page.tsx
    - src/app/(admin)/admin/(work)/members/loading.tsx
    - src/app/(admin)/admin/members/CreateAccountForm.tsx
    - src/app/(admin)/admin/members/MemberActionNotice.tsx
    - scripts/conversion-manifest.mjs
    - scripts/verify-breakpoints.mjs
    - .planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md

key-decisions:
  - "G3's REMAINING OPENED AT SIX, including MemberTable, and closed the plan at five. The plan's Task 1 acceptance criterion asks the gate to exit 0 before the conversion exists; measured, it cannot — the file it was written for still rendered a table. Reconciled by entering the debt and paying it one commit later, which is strictly better than writing the gate after the conversion: a gate that never went red on the file it was written for has never been observed doing its job."
  - "verify-tables check B's branch matcher takes a TRAILING BOUNDARY GUARD, added as a defect fix during task 2. Without it a substring test reads a column-count utility at 1024px as a branch switch at 1024px, because the switch's name is a prefix of it. The member table's detail grid carries exactly that shape, so the gate would have reddened on a correct file the first time anything imported the primitive — the failure that gets a gate switched off. Proven in both directions on the same line."
  - "All four ROLE marks take the same neutral tone, with staff keeping its dashed border. No token declares a role: the four semantics name states, §5.1's accent list is closed and names a state signal among the things it is never for, and inventing a fifth family would decide in CSS what a role means. The cost is stated: master and organizer now differ from member by their word alone."
  - "approved and rejected take the SAME status tone, and only pending is emphasised. Grading a person in the colours of success and failure is what community-membership.md calls a judgement and 41-08 already resolved the same question the same way. The emphasis tone means look here first and nothing else, so marking a pending request marks a task rather than ranking a person."
  - "Five of the six act buttons take the SECONDARY rung and only the withdrawal is destructive. The file's own reasoning decides it: approving and rejecting a pending request are the two ORDINARY daily acts and deliberately get no confirmation, so a red Reject beside a green Approve would tell an operator that one of the symmetric pair is the dangerous one. The withdrawal is the act that removes a person and — the confirmation's own words — nobody is told."
  - "Cancel moved to FIRST in the DOM on the reversal confirmation. §11 makes the cancel the default and the focus target, 41-09 shipped the same order on the sibling confirmation, and the failure direction of the change is the safe one: a stale reflex now lands on Cancel. Recorded as a deviation because it is a structural change the plan did not ask for."
  - "The row expands from its caret in BOTH branches, and no longer from the name cell or the whole card header. The caret is 44x44 in both branches now, where it was a bare 16px glyph in the table; the card's whole-header button is the affordance that was lost, and it was also a button containing headings."
  - "The create-account control is the SECONDARY rung, not the primary. Creating an account here IS an approval that skips the pending queue, and community-membership.md's gate nessuna corsia grigia says every such way in is an exception to be counted — never the most attractive button on the page."
  - "A pill-shaped placeholder was NOT written for the status tabs. Measured in the emitted stylesheet: SkeletonLine's own radius is emitted after the pill radius, so a caller's radius is inert. The dead class was removed rather than shipped, and the gap recorded as DEF-41-05 — a line of code that provably does nothing is worse than the shape it fails to produce."

requirements-completed: [DS-07, DS-09, RESP-01, RESP-02, RESP-03]

# Metrics
duration: ~165min
completed: 2026-08-12
tasks: 3
commits: 3
files_changed: 11
---

# Phase 41 Plan 10: One Table, Two Trees, and the Surface That Decides Who Is In Summary

**Seven tables render in this tree and six of them already dual-rendered — four
switching at 640px and two at 1024px — so DS-09's content was the disagreement,
not the technique. `src/components/ui/DataTable.tsx` ends it: one array, one
column declaration, two trees that are never transformed, switching at 768px and
nowhere else. `/admin/members` is converted whole and is the first surface to
render it, taking G3's debt from six to five and G6's from twenty to nineteen in
the same commits that paid them. Two measurements decided things the plan had
left open — a branch matcher without a boundary guard reads a column-count
utility as a branch switch, and would have reddened on a correct file the first
time anything imported the primitive; and the one permitted shrink in the whole
product is emitted after every unprefixed minimum, so it is live rather than
decorative. And seven raw palette hues left the member row: four for roles, three
for statuses, on the one surface in this product where a colour would be grading
a person.**

## Performance

- **Duration:** ~165 min
- **Tasks:** 3, one commit each
- **Files changed:** 11 — 3 created, 8 modified, **0 deleted**
- **Files under `scanner/` or `(admin)/door/` touched:** **0**, asserted by
  `git diff --name-only cf30d93 HEAD`
- **Packages added, removed or changed:** **0** (D-41-20). `package.json`
  untouched — the primitive is two `<div>`s and a `<table>`, and the shrink is a
  Tailwind custom variant that already existed

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | `DataTable`, `Checkbox`, and G3 with its exemption written first | `8c5b9f5` | `src/components/ui/DataTable.tsx`, `src/components/ui/Checkbox.tsx`, `scripts/verify-tables.mjs` |
| 2 | `MemberTable` onto the primitive — the file G5 will be proven against | `19de5a7` | `MemberTable.tsx`, `verify-tables.mjs`, `verify-breakpoints.mjs` |
| 3 | The rest of `/admin/members`, and the eighth surface | `f51eddd` | `page.tsx`, `loading.tsx`, `CreateAccountForm.tsx`, `MemberActionNotice.tsx`, `conversion-manifest.mjs`, `deferred-items.md` |

## The two debt counts, before and after

| List | Opened | Closed | What it counts |
|---|---|---|---|
| **G3 `REMAINING`** (`verify-tables.mjs`) | **6** | **5** | tables still rendering their own dual-render. Seven exist; one is a permanent exemption and not a debt |
| **G6 `REMAINING`** (`verify-breakpoints.mjs`) | 20 files / 41 uses | **19 files / 37 uses** | files still carrying the 640px prefix |

**Neither line was deleted quietly.** Both gates printed their entry as `STALE`
first — *"converted; remove this entry"* — which is the notice that made each
deletion a response rather than a tidy. `verify-breakpoints.mjs` is not among
this plan's declared files; its entry was removed because the constant's own
discipline says *"when the last one leaves a file, its line leaves this list in
the same commit"*, and no plan in this phase declares that script.

## G3's proven reds — every mutation asserted BEFORE its result was read

`ai-engineering.md`'s *gate prova per mutazione*: assert the mutation landed,
then read the outcome, then assert the revert landed.

| # | Check | Mutation | Assertion taken BEFORE reading | Gate exit | After revert |
|---|---|---|---|---|---|
| **R1** | A | a bare table added to `src/components/ui/Card.tsx`, a file on no list | `grep -c '<table'` → **1** | **1**, naming the file and the line; literal count printed **9** | `grep -c` → **0**, exit **0** |
| **R2** | B | the card branch's breakpoint changed from 768px to 640px inside the primitive | the 640px form → **1**, the 768px form → **0** | **1**, on **both halves** — the switch fell below its expected count *and* a refused breakpoint was named at its line | restored, exit **0** |
| **R3** | B | a display override applied to the table's cells through an arbitrary child selector | `grep -c` on the selector → **1** | **1**, quoting the line and the WebKit bug numbers | `grep -c` → **0**, exit **0** |
| **R4** | C | a `REMAINING` entry pointed at a path that does not exist | `grep -c 'MUTATIONR4'` → **1** | **1**, naming the path | `grep -c` → **0**, exit **0** |

### The pair that proves the boundary guard is load-bearing

This is the one that found a real defect, and it is the phase's own recorded
lesson arriving a second time (41-07, deviation 2: *a regex borrowed from a
sibling carries the sibling's purpose*).

| # | Condition | Mutation | Assertion taken BEFORE reading | Gate exit |
|---|---|---|---|---|
| **G1** | guard present | a column-count utility at 1024px added to the detail grid of `MemberTable.tsx`, which is an importer | `grep -c` → **1** | **0** — the gate correctly reads it as a grid's column count, not a branch switch |
| **G2** | guard **disabled** | the same tree, with the trailing guard replaced by a plain substring test | `grep -c 'MUTATION G2'` → **1** | **1**, naming `MemberTable.tsx:778` and quoting the correct line |

**G2 is the point.** Without the guard the gate reddens on a **correct file**,
which `verify-media-strip.mjs:51-62` records as the failure that gets a gate
switched off — and a gate that is switched off guards nothing. The substring
test could not tell the utility that *shows a grid at 1024px* from the utility
that *sets a grid's columns at 1024px*, because the first is a prefix of the
second. Inspection did not find it; the conversion did, on the first file that
imported the primitive.

## The two measurements that decided something

### 1. The one permitted shrink is live, and that was not obvious

§6.3's allow-list is closed at one item: the row-action buttons in the
primitive's table branch may fall to 36px on a machine with no coarse pointer.
Those buttons are the shared `sm` rung, which carries a 44px minimum from the
button ladder. **Two rules, same property, same specificity — so the stylesheet's
order decides, and nothing about the class attribute does.** That is the exact
collision `Skeleton.tsx` measured and lost, silently, for the whole life of that
file.

Read out of the emitted stylesheet on 2026-08-12, not assumed:

```
byte 14722   .min-h-11{min-height:calc(var(--spacing) * 11)}            ← the ladder's floor
byte 72739   @media (any-pointer:fine) and (not (any-pointer:coarse)){
               .pointer-fine-only\:min-h-9{min-height:…* 9)}            ← the shrink
```

The variant is emitted **last**, after every unprefixed utility and after every
768px one, so it wins where its query matches. **The shrink is real.** Had the
order been the other way the class would have been inert, and the correct
response would have been to delete it and say so — which is what happened to a
radius on the same surface (see DEF-41-05 below).

### 2. `SkeletonLine` cannot be given a radius, so the pill placeholder was not written

The members loading state stands in for four 44px pills. The honest placeholder
for a pill is a pill:

```
byte 21718   .rounded-full{…}      ← the pill radius, written FIRST
byte 21846   .rounded-xl{…}        ← SkeletonLine's own, written AFTER and winning
```

A caller appending a pill radius gets the container radius anyway, with no
warning of any kind. **The class was removed rather than written**, because a
line of code that provably does nothing reads as a decision to whoever finds it
next. Recorded as **DEF-41-05**, with the fix left to the plan that owns
`Skeleton.tsx` — the same refusal 41-07 made about `Toast.tsx`.

## Deviations from Plan

### 1. [Plan's acceptance criterion vs. the tree] G3 opens at six, not five

- **Found during:** Task 1, the gate's first run.
- **The two halves that collide:** Task 1's criterion says
  *"`node scripts/verify-tables.mjs` exits 0"*, and the plan's threat register
  describes *"G3 over five not-yet-converted tables"*. At the end of Task 1
  `MemberTable.tsx` still rendered its own table, so the gate exited **1** on
  it, correctly.
- **Reconciled line by line**, per the phase's inherited lesson. Neither half is
  wrong about the end state: **five** is what `REMAINING` holds after Task 2,
  and the criterion is right that Task 1 must commit green. What the plan did
  not say is what the list holds *in between*.
- **Resolution:** `MemberTable.tsx` opened `REMAINING` as the sixth entry, with
  its reason naming the commit that would pay it, and left in Task 2 after the
  gate printed it `STALE`. **This is strictly better than the alternative** —
  writing the gate after the conversion so it could open at five would have
  produced a gate that never went red on the file it was written for.
- **Commits:** `8c5b9f5` (entered), `19de5a7` (paid).

### 2. [Rule 1 — Bug] check B's branch matcher was blind in the wrong direction

- **Found during:** Task 2, before the first importer existed — while reading the
  detail grid's classes against the matcher I had just shipped.
- **Issue:** the matcher tested `line.includes(\`${bp}:${utility}\`)`. The
  utility that shows a grid and the utility that sets a grid's column count
  share a prefix, so a correct column-count utility at 1024px matched as a
  branch switch at 1024px.
- **Consequence had it shipped:** the gate reddens on a correct file the moment
  anything imports the primitive — which is the same commit. §0 rule 3 and
  `verify-media-strip.mjs:51-62` both name that as how a gate gets switched off.
- **Fix:** a leading and trailing boundary guard, so the utility must be the
  whole utility. **Proven in both directions** (G1/G2 above), with the mutation
  asserted before each result was read.
- **Why it is the phase's own lesson again:** 41-07 recorded that *a regex
  borrowed from a sibling carries the sibling's purpose, not just its shape*.
  This matcher was not borrowed — it was written fresh, and made the same class
  of error, which is the argument for keeping the rule general rather than
  filing it against one script.
- **Commit:** `19de5a7`.

### 3. [Structural change the plan did not ask for] Cancel is first in the DOM on the reversal confirmation

- **Found during:** Task 2, converting `ReversalConfirm`.
- **What changed:** the confirmation's buttons were `[ confirm ] [ Cancel ]` and
  are now `[ Cancel ] [ confirm ]`.
- **Why:** §11's destructive-confirmation rule makes the cancel *the default and
  the focus target* — the resting state — and 41-09 shipped the same order on
  the sibling confirmation, recording *"Cancel is still first in the DOM"* as a
  property it preserved. The confirming act here is the one that removes a
  person from the community and, in the confirmation's own words, **nobody is
  told**.
- **The failure direction is the safe one**, which is `checkin-offline.md`'s
  asymmetry applied to a control: an operator acting on a stale reflex now lands
  on Cancel. The reverse ordering would have made the reflex land on the
  irreversible act.
- **Recorded as a deviation rather than folded in**, because it is a structural
  change to a destructive confirmation and *«misura due volte, taglia una»*
  applies to the button as much as to the query.
- **Commit:** `19de5a7`.

### 4. [Contract gap] §11's list of destructive confirmations is missing one, and it is this one

- **Found during:** Task 2, checking the button order against §11.
- **Issue:** §11 says *"Destructive confirmation | **none introduced.** Three
  exist and are converted: retiring a format, refunding a ticket, and revealing
  a venue."* Measured, there is a **fourth**: `MemberTable.tsx`'s
  `ReversalConfirm`, which withdraws an approved member's access.
- **Why it matters rather than being a typo:** the three named are all about a
  *thing* — a format, a ticket, an address. The fourth is about a **person**,
  and it is the only one of the four whose own copy says *nobody is told*. A
  closed list that omits the most consequential member of its own category is a
  list somebody will trust.
- **Not resolved here.** The rule was applied (the destructive rung, cancel
  first, no Enter-to-confirm — there is no form, so Enter does nothing); the
  enumeration is a contract edit and belongs where a person reviews it.

### 5. [Reconciliation] The filters this plan converts are in `MemberTable`, not in `page.tsx`

- **Found during:** Task 3, reading the plan's file assignment.
- **Issue:** Task 3 says *"`page.tsx` — … filters become `Chip` at 44px — and
  these are RESP-04's filters"*. Measured, `page.tsx` has **no filters**: the
  status tabs, the search field and the two selects all live in
  `MemberTable.tsx`.
- **Resolution:** they were converted in Task 2, with the surface they belong
  to. RESP-04's property holds either way and was verified: **nothing on this
  surface is behind a disclosure at any width**, so the filters are visible from
  768px up without opening anything — and below it too.
- **A second reading, recorded so it is not re-derived:** §6.4 names
  `analytics/compare` and `members/growth` as *"the pages' own filter
  controls"*. Neither is this page, so the plan's sentence appears to be a
  generalisation of §6.4's row rather than a measurement of this file.

### 6. [Rule 2 — missing critical functionality] Three unlabelled controls gained names

- **Found during:** Task 2 and Task 3.
- **Issue:** the search field and the two filter selects had **no accessible
  name at all** — the search field's only description was a placeholder, which
  disappears the moment somebody types into it, and the two selects had none.
  The create-account form's three labels were `<label>` elements with **no
  `htmlFor`**, so none of them was its control's programmatic name either.
- **Fix:** the two filters take an `aria-label`; the three form fields take
  `Input`/`Select`'s required accessible name, which renders a real
  `<label htmlFor>`. The role field's standing door-offline sentence moved into
  the `hint` slot, so it is now named in `aria-describedby` — it was a loose
  paragraph beside the control before.
- **Why it is Rule 2 and not a nicety:** this is the surface that admits people
  to the community, and every one of these controls decides which rows an
  operator is looking at when they press Approve.

## What the conversion changed on the row, and what it did not

### The seven hues that left, and why that is a decision rather than a substitution

| Mark | Was | Is | Reason |
|---|---|---|---|
| **role** — master, organizer | two palette hues reading as a vocabulary of power | `Badge`, neutral tone | **no token declares a role.** The four semantics name states; §5.1's accent list is closed and names *a state signal* among the things it is never for. A fifth family would be deciding in CSS what a role means |
| **role** — staff | neutral, **dashed** | `Badge`, neutral, **dashed** | kept exactly. The dash is the one differentiator the file's own long argument reached for, and it carries no hue at all |
| **role** — member | neutral | `Badge`, neutral | unchanged in meaning |
| **status** — approved, rejected | green and red | `Badge`, **the same** neutral tone | grading a person in the colours of success and failure is what `community-membership.md` calls a judgement. With one tone between them, **no hue ranks one person above another** |
| **status** — pending | yellow | `Badge`, emphasis tone | *look here first*, which is what that tone means and all it means. A pending request is **work outstanding**; marking a task is not grading a person |
| **the four counts** | four palette hues keyed to the four badge hues | the data face, one ink | a figure reading "3" in blue does not say *organizers* to anybody who has not learnt the key. The word beside it always did |
| **the six act buttons** | six palette hues | five on the `secondary` rung, the withdrawal on `destructive` | the file's own reasoning: approve and reject are **the two ORDINARY daily acts** and deliberately symmetric in ceremony, so they may not be asymmetric in colour |

**The cost, stated rather than glossed:** `master` and `organizer` no longer
differ from `member` by anything but their word. Scanning a list for an
organizer is now reading rather than glancing. That is the trade, and the
alternative was keeping two hues that no token declares on the surface that
decides who is in this community.

### The sizes

| Site | Was | Is |
|---|---|---|
| the two selection boxes | `h-4 w-4`, **16px** | `Checkbox` — the same 16px box inside a **44 × 44** label that is also its name |
| the six row actions | a hand-written pill computing to ~28px | `Button` at the `sm` rung — 44px, `--control` boundary, and the one permitted shrink in the table branch |
| the four status tabs | ~30px, with nothing telling a screen reader which was current | `Chip` — 44px, `aria-current` |
| the three filters | 36px, no accessible name | `Input` / `Select` — 44px, named |
| the staff-count shortcut | a bare inline `<button>` | the same button, with the 44px minimum and the shared focus expression |
| the register link on the page | a bare inline `<Link>` | the same link, with the minimum and the focus expression |
| the disclosure caret | a 16px glyph in a 2px-padded button | the primitive's own control, 44 × 44 in **both** branches |

### And what did NOT move — asserted mechanically, not remembered

`/admin/members` is where approvals and rejections happen. The assertions:

```
git diff -U0 -- src/components/admin/MemberTable.tsx | grep '^[+-]' | grep -v '^\(+++\|---\)' \
  | grep -E 'select\(|from\(|eq\(|CAP|capabilit|approve|reject|formData|startTransition'
```

**Twelve matches on `MemberTable.tsx`, all accounted for:** prose in the new
docblocks, the `ActionVariant` union's own member names (`"approve"`,
`"reject"`), and the two class-string maps that were replaced. **Not one is a
call, a condition or a payload.**

And in the stronger direction — **zero removed lines** in any of the five files
match `approveMember`, `rejectMember`, `deactivateMember`, `reactivateMember`,
`updateMemberRole`, `bulkApproveMember`, `bulkRejectMember`, `handleAction`,
`handleBulk`, `startTransition`, `formData`, `CAP` or `capabilit`, other than
the two prop-drilling sites where `isSelectable` and `selectedIds.has(...)`
collapsed from **two copies into one declaration** — which is the consolidation
itself, with both predicates carried over verbatim.

On `page.tsx` the assertion is stronger still: `supabase`, `.select`, `.order`,
`CAP.`, `redirect`, `getAccessContext`, `rawMembers` and `extractReferrerName`
produce **no diff lines at all**. The read, the guard and the flattening are
byte-identical.

**Specifically:**

- **The two axes stay two.** `role` and `status` are two columns in the table
  and two adjacent marks on the card. Neither is rendered as the other, neither
  is merged, and the column declaration names them separately.
- **No bulk action became easier to reach.** The toolbar's three shapes, its
  per-tab gating, `isSelectable`'s two exclusions, and the confirmation that
  **replaces** the toolbar while it is open are all unchanged. No batch was
  added to the All tab, which still deliberately has none.
- **Attribution is untouched.** Nothing in these five files reads or writes who
  performed an act; the register is `actions.ts`'s and was not opened.
- **Personal data:** no column added, no field surfaced, no query changed. The
  membership code is still **not** rendered by the table, which the file's own
  `subjectLabel` comment gives the reason for — it is the door's only credential
  and a batch report ends up in a screenshot.
- **The refusal wording is untouched.** `MemberActionNotice.tsx`'s diff removes
  exactly four lines: the `TONE_STYLES` type and its three class strings. Not
  one notice sentence, tone assignment or `detail` key changed.

## For plan 41-11 — G5's six exemption shapes on this surface

The plan asks for *a list of every element in `MemberTable.tsx` that fits none of
G5's six exemption shapes, or an explicit statement that there is none.*

> **There is none.** Every interactive element on this surface is either
> primitive-rendered or carries the 44px minimum explicitly.

Measured across all five files:

| Shape | Present here? | Where |
|---|---|---|
| **1** — Phase 42 by path | n/a | no file on this surface is under a fenced path |
| **2** — rendered by a primitive | **yes, and it is almost everything** | `Button`, `Chip`, `Input`, `Select`, `Checkbox`, and `DataTable`'s own disclosure control |
| **3** — the DataTable desktop row actions at the shrunk minimum | **yes** | `MemberTable.tsx` carries **both** `pointer-fine-only:min-h-9` (1 occurrence) **and** the `ui/DataTable` import (1). This is the only file in the tree where exemption 3 can be exercised |
| **4** — a wrapper whose only child is a control, marked `data-target="child"` | **no such wrapper exists** | measured: `grep -c 'data-target="child"'` returns **0**, and there is no `<Link>`-around-`<Button>` or equivalent anywhere in the five files. The marker is not written, because writing one where nothing needs it would be an exemption claimed for nothing |
| **5** — a visually-hidden input whose visible target is its label | **not in this form** | `Checkbox` is a **visible** 16px input inside a 44px label, so it is exemption **2**, not 5. Flagged because a G5 written to expect the hidden-input shape on a checkbox would look for the wrong thing here |
| **6** — a non-interactive `Badge` | **yes** | `RoleBadge` and `StatusBadge` both render `Badge`, which is a `<span>` with no prop that makes it interactive |

**The two raw interactive elements on the whole surface, both already at 44px:**

| File | Line | Element | Why it is raw |
|---|---|---|---|
| `src/components/admin/MemberTable.tsx` | `1109` | `<button>` — the staff-count shortcut | it is a word inside a sentence of counts, not a pill. Carries `min-h-11` and the shared focus expression |
| `src/app/(admin)/admin/(work)/members/page.tsx` | `202` | `<Link>` — *Membership acts →* | a quiet text link leading off the surface. Kept a link so middle-click and copy-address survive; carries `min-h-11` and the focus expression |

**One warning for the G5 author.** The row actions carry `min-h-9` **through the
`pointer-fine-only:` variant only** — the unprefixed minimum comes from the
`Button` primitive and is not written at the call site. A G5 that reads the raw
string `min-h-9` and looks for a sibling `min-h-11` **in the same file** will
not find one, because the 44px lives in `Button.tsx`. Exemption 3 as §13 words
it — *"both that variant and the DataTable import are present in the file"* — is
satisfied and is the right test; a stricter one would not be.

## Verification

Per `CLAUDE.md` Guardrail 1 and `meta-gates.md`: **there is no test runner for
the product**, and nothing below is claimed on the basis of tests passing.

| Check | Result |
|---|---|
| `npm run build` after every task | **exit 0** — compiled, TypeScript clean, 40 static pages |
| `node scripts/verify-tables.mjs` | **exit 0** — three checks, 7 table elements accounted for, `REMAINING = 5` |
| `node scripts/verify-conversion.mjs` | **exit 0** — four checks, **8** surfaces, **53** files scanned, 15 of 15 primitives with an importer |
| `node scripts/verify-breakpoints.mjs` | **exit 0** — 19 files still carry the 640px prefix, 37 uses |
| `node scripts/verify-tokens.mjs` | **exit 0** |
| `node scripts/verify-dialogs.mjs` | **exit 0** — `REMAINING = 14`, unchanged |
| `node scripts/verify-semantic-separation.mjs` | **exit 0** |
| `node scripts/verify-no-viewport-read.mjs` | **exit 0** |
| `node scripts/verify-sunset-gradient.mjs` | **exit 0** |
| `node scripts/verify-media-strip.mjs` | **exit 0** |
| `node scripts/verify-capabilities.mjs` | **exit 2 — a REFUSAL, nothing measured.** It needs Supabase credentials this worktree does not hold, and its state is identical before any change in this plan. Recorded rather than omitted, because an unrun gate reported as absent is how a green becomes a claim |
| `git diff --name-only cf30d93 HEAD` | 11 files, **zero** under `scanner/` or `(admin)/door/` |
| `git diff --diff-filter=D --name-only cf30d93 HEAD` | empty — **nothing deleted** |
| `git status --short` after the last commit | clean, no untracked files |

### The acceptance criteria, one by one

| Criterion | Result |
|---|---|
| `grep -c 'md:hidden' DataTable.tsx` ≥ 1 | **1** |
| `grep -cE '\bsm:\|\blg:grid\|lg:block\|lg:hidden' DataTable.tsx` = 0 | **0** |
| `grep -cE 'display: *block\|display: *grid' DataTable.tsx` = 0 | **0** |
| `grep -cE 'ordinal\|slashed-zero' DataTable.tsx` = 0 | **0** — the property is described in prose for exactly this reason |
| `grep -c 'ReviewListClient' verify-tables.mjs` ≥ 1 | **3** — a named constant, its reason constant, and the header |
| A proven red, asserted first | **R1** |
| B proven red, asserted first | **R2** (plus **R3** for the display override, and the **G1/G2** pair) |
| `grep -cE '\blg:(block\|hidden)' MemberTable.tsx` = 0 | **0** |
| `grep -c 'ui/DataTable' MemberTable.tsx` ≥ 1 | **1** |
| `grep -c 'h-4 w-4' MemberTable.tsx` = 0 | **0** — the 16px box moved inside `Checkbox`, where it is the drawn box within the 44 × 44 hit area |
| legacy tokens on `MemberTable.tsx` = 0 | **0** |
| `data-target="child"` ≥ 1 **or** the SUMMARY states no such wrapper exists | **0**, and the statement is made above with the measurement behind it |
| behaviour-unchanged diff on `MemberTable.tsx` | **12 matches, all prose, union member names or replaced class maps**; zero action-path lines removed |
| `verify-conversion` walks `/admin/members`, A–D pass, D records `wide` | **exit 0**, 17 files in that closure, width `wide` |
| `grep -c 'animate-pulse' loading.tsx` = 0 · `ui/Skeleton` ≥ 1 | **0** · **2** |
| legacy tokens on the three Task 3 files | **0 / 0 / 0** |
| `CONVERTED.length === 8` | **exit 0** |
| behaviour diff over all five files | **five matches, all prose or `Array.from` placeholder literals** |

## Manual verification still owed — H41-3 and H41-1

**Not performed, and this is the part of the plan's output that could not be
delivered.** No green above stands in for it.

The reason is the one 41-05, 41-07, 41-08 and 41-09 each recorded, and it is
strongest here: the application cannot be run from this worktree because the
middleware reads Supabase credentials on **every** request
(`src/lib/supabase/middleware.ts:267-268`; `.env.local` does not exist here,
only the example), and `/admin/members` is additionally behind
`organizer.access`, so observing it needs an authenticated session **holding a
capability that lets it read every member's name and address**. Pointing a
running application at production is an act requiring an authorisation this
agent does not hold, and on this surface it would also mean rendering real
people's personal data to take a screenshot.

### The H41-3 judgement, made in advance so the person observing knows what to check

The plan asks the SUMMARY to record *which columns matter on a phone* as a
judgement rather than a tick. The judgement, and where each column went:

| Column | Card slot | Why |
|---|---|---|
| **Name** | title | it is who the row is about, and the only thing an operator searches by |
| **Email** | subtitle | the second identifier, and the one that disambiguates two people with one name. Truncated, not dropped |
| **Role** | mark | one of the two axes. Adjacent to status and separately legible |
| **Status** | mark | the other axis, and the one that decides which acts the row offers |
| **Joined** | meta, labelled | a date needs its label without a header row above it; it is the least urgent of the five, so it goes underneath |

**Nothing was dropped.** All five columns of the table appear on the card, which
is the strongest form the judgement could take and is only possible because the
table has five columns rather than seven.

### The procedure, written so the person doing it knows what a correct surface looks like

Sign in with an account holding `organizer.access` and open `/admin/members`.

1. **At 390px (H41-3).** The list is **cards**, one per member. **Nothing
   scrolls sideways** — put a finger on a card and drag horizontally; the page
   must not move. Each card shows the name large, the address under it, the role
   and the status as two separate marks on the right, and `Joined: …` underneath.
2. **Tap the caret** on a card. The detail region opens *inside that card* —
   referred by, referred members, events attended — in one column.
3. **Open the Pending tab.** Each card gains a checkbox on the left. Select two;
   the toolbar appears above the list on the raised ground with `2 selected` and
   two buttons. **Every one of those controls is at least 44px** — check with a
   thumb, not with an eye.
4. **On the Approved tab**, select one and press `Withdraw access from selected`.
   The confirmation replaces the toolbar. **Cancel is the first button.** The
   four sentences are present, including *"Nobody is told."* Press Cancel.
5. **At 768px (H41-1).** The cards become a **table**, with a header row. The
   side column appears and the bottom bar goes. The filter row is on one line.
   The row actions are pills in the last column.
6. **At 1280px (H41-1).** **The content stops widening**, with the page ground
   visible on both sides. This is the property RESP-02 is about and `wide` is
   1280px, not 1024px — `/admin/members` is on §4's closed wide list.
7. **On a desktop with a mouse only (H41-5)**, the row-action pills are ~36px
   tall rather than 44px, and **only** those. If they are 44px, the custom
   variant did not match; if anything *else* on the surface is under 44px, that
   is a defect.
8. **Tab through the whole surface.** Every control draws the same focus ring at
   a 2px offset. In particular the checkboxes: focus lands on the 16px box, and
   the ring is around the box.
9. **Force a refusal** — try to approve your own account. The notice appears
   under the row in the critical ink with no tinted box around it, and names the
   reason.

## Known Stubs

**None.** No TODO, no FIXME, no placeholder, no component wired to empty data,
no list seeded with a symbol that does not exist. Every count in
`verify-tables.mjs` is a measurement taken on this tree; both contrast figures
quoted in new code are read out of `41-UI-SPEC.md` with their inputs; and the
two class-order facts are read out of the emitted stylesheet with their byte
offsets.

The one class that *would* have been a stub — a pill radius on a line
placeholder — was **removed** and recorded as DEF-41-05 rather than shipped.

## Threat model — the six dispositions this plan carries

- **T-41-35 (Elevation of Privilege — `MemberTable` row actions):**
  **mitigated.** No capability check, action payload or gating condition was
  touched; the diff assertion over `CAP`, `capabilit`, `approve`, `reject`,
  `formData` and `startTransition` found twelve matches, **all prose, union
  member names or replaced class strings**, and zero removed action-path lines.
  Every one of the eight server actions is called from the same place, with the
  same argument, under the same condition. No bulk action became reachable in
  fewer steps: the toolbar's per-tab gating, `isSelectable`'s two exclusions and
  the confirmation that replaces the toolbar are unchanged, and the All tab
  still has no batch.
- **T-41-36 (Information Disclosure — the member list and the referral chain):**
  **mitigated.** No column added, no query changed; `.select`, `.order`,
  `supabase` and `extractReferrerName` produce **no diff lines at all** on
  `page.tsx`. The membership code is still not rendered by the table. The
  loading state's eight cards are a literal read from nothing, so no placeholder
  leaks a count or a name.
- **T-41-37 (Repudiation — who approved or rejected, and when):**
  **mitigated.** Nothing in these five files reads or writes attribution; the
  register lives in `actions.ts`, which this plan did not open. The link into
  the register is still drawn **unconditionally**, for the reason the page's own
  comment gives — a hidden link protects nothing and tells the holder of a
  granted capability that they do not hold it.
- **T-41-38 (Denial of Service — a display override on a table):**
  **mitigated.** Forbidden in the primitive's docblock with MDN and both WebKit
  bug numbers, and **asserted absent by check B**, proven red by R3.
- **T-41-39 (Denial of Service — G3 over not-yet-converted tables):**
  **mitigated.** `REMAINING` and the `ReviewListClient` exemption both existed
  before the gate's first run; the exemption is not on the list, so the number
  can reach zero; a converted file produces a `STALE` notice rather than a red;
  and the boundary-guard defect that *would* have reddened a correct file was
  found and fixed before any importer existed.
- **T-41-SC (Tampering — package installs):** **no package installed, removed or
  changed.** `package.json` is untouched.

**Monotone guards:** all three untouched. `venue_reveal_sent` is not reachable
from any file in this plan; no payment state is written; no format's series
numbering is read, written or renumbered.

## Threat Flags

**None.** No route added, no query, no input, no schema, no network path, and no
new branch on `role` or `status`. One surface changed appearance; it did not
change what it can read, who can reach it, or what any control does.

## What the next plans inherit

- **`DataTable` exists, and an eighth hand-rolled dual-render is now a gate
  failure.** A file rendering a table and not on `REMAINING` fails check A; a
  second breakpoint for the branch switch fails check B, in the primitive or in
  any importer.
- **The debt has a number that can be watched: five.** It only goes down, the
  gate prints it on every run, and every entry names the surface that will
  remove it. **No remaining plan in Phase 41 declares any of the five** — that is
  written on the constant rather than left to be discovered.
- **`MemberTable.tsx` is ready for G5**, and the shapes it needs are enumerated
  above with their line numbers. Exemption 3 has its only possible site here;
  exemption 4 has no site anywhere on this surface and the SUMMARY says so
  rather than the file claiming one; exemption 5 does **not** describe this
  tree's checkbox, which is a warning worth reading before writing the matcher.
- **`Checkbox` exists and `Switch` does not**, deliberately: D-41-04 forbids
  publishing a primitive in a wave that does not render it, and this surface has
  no switch. Its consumers are the drink menu manager and the event form.
- **A caller cannot override a primitive's own value for the same property.**
  Three instances are now recorded — a width (41-08), a padding (this plan,
  avoided) and a radius (DEF-41-05) — and the general form is worth a gate:
  a primitive that fixes a property and lets a caller append the same property
  silently discards it, with no warning of any kind.
- **The shrink is live and measured**, so §6.3's allow-list has a real site
  rather than a hypothetical one, and H41-5 has something to observe.
- **A hue that no token declares is a hue nobody decided.** The role and status
  marks are the strongest form of that argument this phase has met, because the
  thing being coloured is a person. Any surface that later wants to distinguish
  roles at a glance needs either a token decision or a second channel that is
  not colour — and the dashed border is the precedent for the second.
- **§11's list of three destructive confirmations is missing a fourth**, and the
  fourth is the one that removes a person.
- **DEF-41-05 needs an owner**, and no plan in this phase declares
  `src/components/ui/Skeleton.tsx`.

## Self-Check

- `src/components/ui/DataTable.tsx` — **FOUND** (21 893 byte)
- `src/components/ui/Checkbox.tsx` — **FOUND** (5 362 byte)
- `scripts/verify-tables.mjs` — **FOUND** (39 676 byte), `REVIEW_GRID_FILE` present
- `src/components/admin/MemberTable.tsx` — **FOUND**, imports `ui/DataTable`, zero table elements, zero legacy tokens
- `src/app/(admin)/admin/(work)/members/page.tsx` — **FOUND**, imports `PageShell` at `wide`
- `src/app/(admin)/admin/(work)/members/loading.tsx` — **FOUND**, zero hand-rolled pulses
- `src/app/(admin)/admin/members/CreateAccountForm.tsx` — **FOUND**, on the form controls
- `src/app/(admin)/admin/members/MemberActionNotice.tsx` — **FOUND**, three inks, no tinted box
- `scripts/conversion-manifest.mjs` — **FOUND**, `CONVERTED.length === 8`
- `scripts/verify-breakpoints.mjs` — **FOUND**, the paid entry removed
- `.planning/…/deferred-items.md` — **FOUND**, DEF-41-05 present
- commit `8c5b9f5` — **FOUND**
- commit `19de5a7` — **FOUND**
- commit `f51eddd` — **FOUND**

## Self-Check: PASSED
