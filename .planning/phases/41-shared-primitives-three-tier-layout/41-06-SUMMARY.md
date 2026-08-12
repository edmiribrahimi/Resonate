---
phase: 41-shared-primitives-three-tier-layout
plan: 06
subsystem: form-controls
tags: [primitives, input, textarea, select, access-gating, wcag-1411, brand-spelling, ds-07, resp-01, resp-02, resp-03]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 03
    provides: "FOCUS_RING — the one focus expression, imported rather than spelled a second time, exactly as Chip.tsx reads it"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 05
    provides: "PageShell (width focus), PageTitle, Button (the labelled rung, which renders an anchor when given an href), and the conversion manifest this plan appends to"
provides:
  - "src/components/ui/Input.tsx — Input, Textarea and Select on the boundary that measures (border-control), with a required accessible name and an announced error region"
  - "/login, /register and /set-password — three whole surfaces, the first three entries §4's closed focus list holds besides the payment callback"
  - "the re:sonate spelling on /register — one of the three brand defects §11 assigns to this phase"
affects:
  - "41-07 — G1 walks four declared surfaces instead of one, and check C now covers Input; Textarea and Select are deliberately NOT in PRIMITIVES and the manifest says why"
  - "41-10 — MemberTable's two 16px boxes are Checkbox's first consumer, and Checkbox was deliberately not shipped here"
  - "every later form conversion — the 95 remaining incumbent input sites convert onto this file"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An accessible name is required at compile time through a union of two shapes — a visible label or an aria-label — because a field with no name renders, compiles and looks correct"
    - "The control's id is a required prop rather than a generated one, so the primitives stay importable from a server component without dragging a form into the client bundle"
    - "A surface whose branches return early keeps a page title in each branch: exactly one h1 reaches the browser, and demoting the second would leave that branch with none"
    - "An outcome that replaces the form it came from announces itself, because there is nothing left on the page for a screen reader to have been told"

key-files:
  created:
    - src/components/ui/Input.tsx
  modified:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/register/page.tsx
    - src/app/(auth)/set-password/page.tsx
    - src/app/(auth)/set-password/SetPasswordForm.tsx
    - scripts/conversion-manifest.mjs

key-decisions:
  - "The focus expression is IMPORTED, not spelled. This fails the plan's own grep for the literal and is the right trade: 41-03 exported the constant precisely so a second file could not become a second author of the ring, and the offset in it is load-bearing. The substitute assertion reads the constant's own definition."
  - "The second h1 on /register became a page title, not an h2. The plan asked for a demotion; the two branches return early and are mutually exclusive, so demoting would have left the confirmation screen with no h1 at all — a worse outline than the one being fixed, and the opposite of §7.1's intent."
  - "Textarea and Select ship without a consumer, which is D-41-04's own prohibition. The plan required all three exports; the three (auth) screens contain seven text inputs and neither of the other two controls. They are kept OUT of PRIMITIVES so no gate goes vacuously green, and the manifest carries the paragraph saying so."
  - "The three pills on /set-password that navigate became Button with an href — plain anchors, so a full navigation replaces a client transition. Accepted rather than discovered: on a surface that has just changed a password, re-reading the session beats trusting a cache, and the alternative was hand-writing the button ladder at three sites."
  - "Every field keeps its placeholder and takes aria-label rather than gaining a visible label. The conversion is colour, size and structure; adding seven visible labels is a layout and copy decision, and it is recorded below as owed rather than taken here."

requirements-completed: [DS-07, RESP-01, RESP-02, RESP-03]

# Metrics
duration: ~50min
completed: 2026-08-12
tasks: 3
commits: 3
files_changed: 6
---

# Phase 41 Plan 06: The Text-Entry Primitives and the Three Entry Screens Summary

The three screens a person meets before they are anybody now draw their fields
with a boundary that measures — **7.14 : 1 against WCAG 1.4.11's 3 : 1**, where
it was **1.39** — every control shows a keyboard user where the focus is, the
submit's label is legible against its own fill, and the brand on `/register` is
spelled the way the brand is spelled. Nothing any of the three forms decides
moved.

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | `Input`, `Textarea`, `Select` | `faad79b` | `src/components/ui/Input.tsx` |
| 2 | `/login` and `/register` whole | `13deff2` | `(auth)/login/page.tsx`, `(auth)/register/page.tsx` |
| 3 | `/set-password` whole, and the manifest | `ef19d0b` | `(auth)/set-password/page.tsx`, `(auth)/set-password/SetPasswordForm.tsx`, `scripts/conversion-manifest.mjs` |

### Task 1 — three controls, and the reason the boundary is not decoration

`Input.tsx:96` carries §8.6's string verbatim. The five computed pairings are in
the docblock with their WCAG clause, and so is the sentence that makes the
boundary non-negotiable: **an input's well is `--sunk` inside a card of
`--surface`, 1.04 : 1**, so the fill cannot show where the control is and the
boundary is the only channel there is.

| Pairing | Computed | Against |
|---|---|---|
| boundary `--control` on `--sunk` | **7.03** | 1.4.11, 3 : 1 |
| boundary `--control` on `--surface` | **6.78** | 1.4.11, 3 : 1 |
| boundary `--control` on `--ground` — where these three screens put it | **7.14** | 1.4.11, 3 : 1 |
| value `--ink` on `--sunk` | **17.02** | 1.4.3, 4.5 : 1 |
| placeholder `--muted` on `--sunk` | **7.03** | 1.4.3, 4.5 : 1 |
| error text `--sem-crit` on `--surface` | **6.99** | 1.4.3, 4.5 : 1 |

Three properties are load-bearing and each is written into the file:

1. **An accessible name is required, and the type is what requires it.** Either a
   visible `label`, which becomes a real `<label htmlFor>`, or an `aria-label` —
   never neither. A field with no name is announced as "edit text" and nothing
   else, which is a defect that renders, compiles and looks correct. This is the
   same argument that made `IconButton`'s label a required prop in 41-03 rather
   than a convention.
2. **The height is a floor, never a height.** A target must be *at least* 44 px
   and must still grow with its content; a fixed height clips a textarea the
   moment somebody types a second line.
3. **The `id` is a required prop and not a generated one.** Generating it would
   need `useId`, and a hook in this file would force every server component that
   renders a form into the client bundle. Requiring it also makes the label
   binding and the error's `aria-describedby` mechanical rather than optional.

The error region is `role="alert"`, addressed by `aria-describedby`, and sets
`aria-invalid` — and all three exist **only while there is a failure**, so a
field at rest is not permanently marked invalid.

**`Checkbox` and `Switch` were not built.** Their first consumers are plan
41-10's member table and the drink menu manager / event form respectively, and
D-41-04 forbids publishing a primitive in a wave that does not convert a surface
onto it.

### Task 2 — the front door, and what did not move

| Finding | Before | After |
|---|---|---|
| **A1** — the control boundary | the legacy boundary name, aliasing the decorative line token, **1.39 : 1** | `--control`, **7.14 : 1** on the page ground |
| **A2** — the accent used as a fill | white ink, **2.91 : 1** | the page ground as ink, **6.85 : 1** |
| **A3** — the focus indicator | the outline killed outright, nothing in its place | the system's one expression, offset so the ring lands on the page |

Plus three things the contract forces and the plan did not have to name:

- **The accent stopped being a state signal.** Both surfaces drew a failure in
  `--accent`, which §5.1 reserves for the primary fill, the active navigation
  entry, a link in prose and the lineup pills. A refusal is a state, so it takes
  `--sem-crit` (**7.37 : 1** on the page ground) and it is announced as well as
  coloured.
- **`/register`'s password checklist left the raw Tailwind palette.** It used a
  green with no token and no computed ratio; it now uses `--sem-done` at
  **5.99 : 1** on the page ground. The tick and the bullet stay, so colour was
  never and is still not the only channel.
- **Weight 500 disappeared.** Phase 40 fixed the weights at 400 and 600; the two
  submits carried 500 through a utility this system does not have.

`/register:85` — **`Join the re:sonate community`**, normal `e`, lower case,
colon. The reversed glyph is a drawn mark that lives inside the logo artwork and
is not a character anybody types (`brand-visual-system.md`). This is one of the
three defects §11 assigns to this phase, and it is a string rather than a
component: the wordmark primitive ships with the surface that renders the brand
as a standalone mark, which is not this one.

**The accent survives on exactly two elements across both files** — the
`Sign Up` and `Sign In` links in prose, which is one of its four reserved uses,
at **6.85 : 1**.

### Task 3 — the password screen, and four outcomes that stayed four

The five raw palette colours became the declared semantics for their meaning: a
refusal is `--sem-crit`, a completion is `--sem-done`. The eleven legacy token
names became the names they alias, and those are aliases (`globals.css:247-250`),
so **the rename changes no pixel**. `text-[11px]` is not a declared size and the
provider-code line takes 12px at the label/data role.

**Not one of the four outcomes was merged, renamed or re-worded.** An expired
link, a refused password, a dead network and an unverifiable session are the
reason `SetPasswordForm.tsx` exists — they are the difference between four
different next actions for the person reading them, and this repository has no
error tracking, so what is on screen is the only observable effect there is.
Collapsing two of them because they now render the same component would have
undone the file while making it look tidier. The docblock says so, in the file.

The success box gained `role="status"`. It **replaces** the form it came from, so
without a live region a screen-reader user submits and is told nothing at all —
`status` rather than `alert` because this is the good ending and it should not
interrupt.

The manifest now holds **four** surfaces. `/set-password` enters it by its
**route file** rather than by the form, because the route file imports the form
and an import-closure walk from it therefore covers both; naming the form would
have fenced off the half that owns the shell and the page title.

## Evidence

### The access path is unchanged, and the assertion is the plan's own

```
git diff -U0 -w "src/app/(auth)/login/page.tsx" "src/app/(auth)/register/page.tsx" \
  | grep -E '^[-+]' | grep -vE '^(\+\+\+|---)' \
  | grep -cE 'signInWithPassword|resolveNext|claimGuestOrders|redirect|\brole\b|\bstatus\b'
```

**Returns `2`, and both are the same line:**

```
+          <p role="alert" className="text-sm text-sem-crit">
+          <p role="alert" className="text-sm text-sem-crit">
```

That is an **ARIA role**, not the permission axis. No line touching the
credential call, the destination allow-list, the guest-token claim, any redirect,
or any branch on a role or a status appears in the diff **in either direction**.

The same assertion over the `/set-password` unit, with that file's own tokens:

```
git diff -U0 -w "src/app/(auth)/set-password/page.tsx" \
  "src/app/(auth)/set-password/SetPasswordForm.tsx" | grep -E '^[-+]' \
  | grep -E 'updateUser|getSession|createClient|redirect|\brole\b|\bstatus\b|validatePassword|canSubmit'
```

**Returns two lines**, the added `role="status"` and the comment above it
explaining why it is `status` and not `alert`.

**Why the assertion is stated with `-w`.** The `/login` conversion re-indented a
comment paragraph by two spaces when the two nested wrappers became one shell,
and one line of that paragraph contains the word `redirectTo` — it is the comment
recording *why* the destination is validated before it is followed. Without `-w`
the count is `4` instead of `2`, and the two extra lines are that one comment
line in both directions, differing only in leading whitespace. Stated here rather
than hidden by choosing the flag quietly.

### The assertions, each with its command

| Assertion | Command | Result |
|---|---|---|
| the build, after every task | `npm run build` | exit `0` (×3), no new warning |
| the token gate | `node scripts/verify-tokens.mjs` | exit `0`, seven checks green |
| semantic separation | `node scripts/verify-semantic-separation.mjs` | exit `0` |
| the breakpoint gate (G6) | `node scripts/verify-breakpoints.mjs` | exit `0`, debt list untouched — none of the four files carried a breakpoint |
| the viewport gate (G7) | `node scripts/verify-no-viewport-read.mjs` | exit `0` |
| the route gate | `node scripts/verify-routes.mjs` | exit `0` |
| the gradient gate | `node scripts/verify-sunset-gradient.mjs` | exit `0` |
| the boundary is the control boundary | `grep -c 'border-control' Input.tsx` | `1` |
| no line token and no legacy name on the primitive | `grep -cE 'card-border\|border-line\b\|border-faint' Input.tsx` | `0` |
| no outline-killer, no rejected radius | `grep -cE 'focus:outline-none\|rounded-lg' Input.tsx` | `0` |
| the error region announces | `grep -c 'role="alert"' Input.tsx` | `1` |
| the height is a floor | `grep -c 'min-h-11' Input.tsx` | `1` |
| **the focus expression is the shared one** | `grep -c 'FOCUS_RING' Input.tsx` · `grep -n 'outline-offset-2' Button.tsx` | `4` · `Button.tsx:72` |
| no white ink on any of the four files | `grep -c 'text-white'` | `0` each |
| no outline-killer on any of the four files | `grep -c 'focus:outline-none'` | `0` each |
| no legacy token on any of the four files | `grep -cE 'card-border\|bg-card\b\|bg-background\|text-foreground'` | `0` each |
| no raw palette colour on any of the four files | `grep -cE '(bg\|text\|border)-(red\|green\|…)-[0-9]'` | `0` each |
| no weight 500, no undeclared size | `grep -cE 'font-medium\|text-\[11px\]'` on the `/set-password` unit | `0` each |
| the brand is spelled | `grep -c 'Join the re:sonate community' register/page.tsx` | `1` |
| **and the old spelling is gone entirely** | `grep -c 'Resonate' register/page.tsx` | `0` |
| no raw h1 survives on any of the three surfaces | `grep -c '<h1'` | `0`, `0`, `0` |
| the page title is the primitive | `grep -c 'PageTitle' register/page.tsx` | `3` — one import, two mutually exclusive branches |
| the display face still lands in one file under `src/` | `grep -rl 'font-display' src` | `Typography.tsx` and the stylesheet that declares the family |
| the primitive has consumers | `grep -rl 'components/ui/Input' src` | the three converted surfaces |
| seven fields render through it | `grep -c '<Input'` | `2` + `3` + `2` |
| the accent survives only where §5.1 reserves it | `grep -rn 'text-accent'` on the three surfaces | `2` — both prose links; `0` on the password form |
| the manifest, as the plan asks | the plan's `node -e` one-liner | `converted 4`, exit `0` |
| the manifest's own checks | `checkManifest()` | `{ ok: true, refusals: [] }` |
| **the door was not touched** | `git diff --name-only <base> HEAD \| grep -cE 'scanner/\|\(admin\)/door/'` | `0` |
| nothing was deleted | `git diff --diff-filter=D --name-only HEAD~1 HEAD` | empty, after all three commits |

### The manifest's refusal was proven able to fire, not only to pass

`ai-engineering.md` requires that a check be shown to fire, and that the mutation
be asserted to have landed before its result is read. A fourth `CONVERTED` entry
naming a path that is not on disk was pushed in-process:

```
mutation landed: true
before ok: true | after ok: false | refusals: 1
restored ok: true converted: 4
```

The refusal is the one that matters for an entry like the three added here: a
declared surface that is not where it says it is makes a gate assert the right
thing about the wrong file.

## Deviations from Plan

### 1. [Contract conflict] The focus expression is imported, so the plan's literal grep returns 0

**Found during:** Task 1, writing the class string.
**Issue:** the acceptance criterion is
`grep -c 'focus-visible:outline-offset-2' src/components/ui/Input.tsx` **is at
least 1**. It returns `0`, because the ring comes from the constant 41-03
exported for exactly this purpose — *"exported so that `Chip.tsx` reads it rather
than spelling it a second time. One declaration, one place, greppable."*
**Resolution:** imported, not spelled. Spelling it would have made this file a
second author of the one expression the whole system shares, and the alternative
of writing the literal into a comment is forbidden outright (DEF-41-01: Tailwind
cannot tell a class string in a comment from a use).
**Substitute assertion, which is stronger than the original:**
`grep -c 'FOCUS_RING' Input.tsx` returns `4`, and `grep -n 'outline-offset-2'
src/components/ui/Button.tsx` returns `72` — the offset is present, in the one
place it is declared, and reaches this file by import rather than by copy.

### 2. [Plan instruction vs. accessibility] `/register`'s second heading stayed a page title

**Found during:** Task 2, reading the file.
**Issue:** the plan says the second `<h1>` becomes an `<h2>`, and its criterion
is `grep -c '<h1' register/page.tsx` returns `1`. Two things make that
unsatisfiable as written. First, §7.1 requires the page title to be the
`PageTitle` primitive, which does not spell `<h1` at the call site — so the count
is `0` either way. Second, and this is the substantive half: **the two headings
are in mutually exclusive branches**. The confirmation screen returns early, so
demoting its heading would have left that branch with **no `<h1>` at all** — a
worse document outline than the one the rule exists to fix.
**Resolution:** both branches render `PageTitle`. `Typography.tsx:44-51` already
writes the governing clause — *"where a page's branches are mutually exclusive,
several may be written and exactly one renders: the invariant is what the browser
gets, not the count in the file."* The comment at the call site says which
invariant is being kept and why.
**Substitute assertion:** `grep -c '<h1'` returns `0` and `grep -c 'PageTitle'`
returns `3` (one import, two branches) — exactly one h1 reaches the browser on
either path.
**Commit:** `13deff2`.

### 3. [D-41-04 tension, recorded not resolved] `Textarea` and `Select` ship with no consumer

**Found during:** Task 1.
**Issue:** the plan requires all three exports and its frontmatter declares them;
the three surfaces it converts contain **seven text inputs, no textarea and no
select**. Two of the three exports are therefore orphans on the day they land —
the exact shape D-41-04 exists to prevent, and the shape `Skeleton.tsx` has been
carrying since before this phase began.
**Resolution:** built as instructed, and **kept out of `PRIMITIVES`**. An entry
would make 41-07's check C go red on a file that is correct, and the way that
gets "fixed" is by weakening the check. The manifest carries a paragraph naming
the absence, so the plan that first renders a textarea or a select adds the entry
as a decision rather than discovering it as a gap.
**Commit:** `ef19d0b`.

### 4. [Contract silent on a detail] `Textarea` carries vertical padding the string does not

**Found during:** Task 1.
**Issue:** §8.6 gives one string to all three controls. A single-line input's
value is centred by the user agent; a textarea's starts at the top edge, two
pixels from the boundary — touching the very boundary this file exists to make
visible.
**Resolution:** 12 px of vertical padding on `Textarea` and on neither of the
other two, because neither has the problem. Written into the file as a decision
with its reason rather than left as an unexplained extra class.

### 5. [Behaviour, accepted rather than discovered] Three links became anchors instead of client transitions

**Found during:** Task 3.
**Issue:** `/set-password` had three `next/link` pills — one after success, two
after a dead or unverifiable session — all hand-writing a button's geometry, two
of them on the legacy boundary the acceptance criteria require gone.
**Resolution:** `Button` with an `href`, which renders a plain `<a>` (41-05's
mechanism, with its written rationale: a link that navigates stays a link, so
middle-click and copy-address survive). **The observable consequence: a full
navigation replaces a client transition.** Recorded rather than glossed. It is
accepted for a domain reason as well as a tidiness one — on a surface that has
just changed a password, a full navigation re-reads the session rather than
trusting a client cache — and the alternative was hand-writing the ladder at
three sites, which is the thing the ladder exists to stop.
**`next/link` is no longer imported by that file.** Nothing else in it navigates.
**Commit:** `ef19d0b`.

### 6. [Rule 2 — accessibility] Three additions nobody asked for and nobody would have reported

- **`role="status"` on `/set-password`'s success box** (`ef19d0b`). It replaces
  the form, so without a live region the submit is silent to a screen reader.
- **`aria-hidden="true"` on `/register`'s envelope glyph** (`13deff2`). It is
  decoration above a title that says the same thing in words; without the
  attribute its treatment is left to the assistive technology rather than
  declared. Same shape as 41-05 deviation 3.
- **The one focus expression on the two prose links** (`13deff2`). §5.4 says *the
  one focus expression, everywhere*, and a link is a control a keyboard reaches.
  The plan's own must-have is *"on every control of the three entry screens"*.

None of the three changes what any form decides, and none would ever be reported:
this repository has no error tracking and a missing screen-reader announcement
raises nothing at all.

## Findings — recorded as findings, not fixed

The plan asks explicitly for any error copy that collapses distinct causes, and
forbids rewriting it here.

**1. `/login:72` — one message for three different causes.**
`setError("Incorrect email or password")` is set on **every** failure of the
credential call: a wrong password, an address that was never confirmed, and a
transport failure that never reached the provider all produce the same sentence.
The third is the sharp one — somebody with no network is told their password is
wrong.

**And the two rules pull against each other on this string, which is why it is
reported rather than resolved.** §11 says an error names the problem and the next
step; T-41-20 forbids widening a message so that it discloses whether an address
exists. Both are satisfiable at once, but only by splitting on the axis that is
not the credential: **transport failure versus refusal**, never *which* of the
two fields was wrong. That is a change to what the front door tells someone about
their account, it is `access-gating` primary, and it belongs to a plan that is
Critical and carries an owner decision.

**2. `/register:59` — the provider's own wording, rendered verbatim.**
`setError(error.message)` puts a third party's sentence on the community's front
door. It is not the banned shape — distinct causes do produce distinct messages —
but the copy changes when Supabase changes it, in a release nobody here reads.
`SetPasswordForm.tsx:18-35` already argues this case in writing for its own
branches and reads a tagged value instead; `/register` has not had that treatment.

**3. All seven fields are labelled by their placeholder.**
Each now carries an `aria-label`, so the programmatic name exists and the
`(auth)` screens match what `/set-password` already did. But **a placeholder
disappears the moment somebody types**, so there is no visible label on any of
the three screens at the point where somebody is checking what they entered. The
primitive supports a visible `label` and renders it as a real `<label htmlFor>`;
using it is a layout and copy decision across three screens, not a colour one, and
it is owed rather than taken here.

**4. `/login:91-93` — a `catch` with an empty body.**
The guest-token claim swallows every failure. It is pre-existing, it is
deliberate, and the comment gives the reason (*"tokens will be claimed on next
menu visit"*) — the failure has a documented recovery path rather than no path.
Noted because `meta-gates.md` requires a silent catch to be justified in writing
where it is, and this one is. Untouched.

## Carried forward, not fixed

**The toast's dismiss control still writes the `IconButton` contract by hand.**
`src/components/toast/Toast.tsx:169-182`, unchanged since 41-05 recorded it. Not
among this plan's declared files either.

**The remaining incumbent input sites.** `41-PATTERNS.md` §2.6 counts 102
occurrences across nine byte-exact strings; seven of them converted here. The
other 95 convert with their surfaces, and every one of them is currently drawing
a control boundary at 1.39 : 1.

## Known Stubs

None. Every element these three surfaces render is wired to the state it already
had; no placeholder value, no empty array standing in for data, no TODO, no mock.
No branch was added and none was removed.

## Threat Flags

None. This plan added no route, no query, no server action, no user data and no
branch on `role` or `status`. Its four `mitigate` dispositions:

- **T-41-18 (spoofing, the three screens)** — the diff assertion over the
  credential call, the destination allow-list, the guest-token claim and every
  redirect returns zero matching lines on all four files; the only matches are
  ARIA roles, and they are quoted above rather than counted away.
- **T-41-19 (elevation, `/register`)** — nothing about what the form submits or
  about which status a new account receives appears in the diff. The sign-up
  call, the confirmation destination, the full name and the referral code are
  byte-identical. Referral and approval are the community's gate
  (`community-membership.md`); this plan rendered that form and did not re-decide
  it.
- **T-41-20 (disclosure in the error copy)** — the conflict the register names is
  live on `/login`, and it is **recorded above rather than resolved silently**,
  which is what the disposition asks for. No message was widened.
- **T-41-21 (the focus ring)** — `focus:outline-none` is `0` on all four files;
  the 2 px offset is present in the one place it is declared and reaches every
  control here by import. Without it, the ring on the accent fill would be
  2.52 : 1 and would not be an indicator.
- **T-41-SC** — **no package was installed, added or removed.** `package.json` is
  untouched by this plan.

`venue_reveal_sent` and every other monotone guard are untouched. Nothing under
`scanner/` or `(admin)/door/` was opened — the diff is six files, exactly the six
the plan declared.

## Manual verification still owed

This repository has **no test runner for the product** (`CLAUDE.md`, guardrail 1).
Nothing above may be read as "the tests pass": seven gates and a typecheck are
green, **and not one of them has seen a pixel**.

### H41-1 for these three surfaces — **not observed, and not ticked**

**It could not be made from this worktree, and the reason is the same one 41-05
measured rather than assumed.** This worktree carries no `.env.local`, only the
example; the middleware constructs a Supabase client on **every** request, so a
locally started server returns HTTP 500 on any address including a public one.
Supplying credentials would mean pointing a running application at production,
which `ai-engineering.md` treats as an act requiring an authorisation this agent
does not hold and did not ask for. No server was started, nothing was seeded and
nothing was read.

**The procedure, written so the next person executes it rather than designs it:**

1. `npm run dev` in a checkout that has `.env.local`.
2. Open **`/login`**, then **`/register`**, then **`/set-password`**. The first
   two need no session at all. `/set-password` opened without a recovery link
   renders its *no session* branch immediately, which is the cheapest way to see
   the shell, the notice and the secondary action together; seeing the form
   itself needs a real reset link.
3. At **390 px**: the card is centred, the gutter is even on both sides, the
   title does not clip, and there is **no horizontal scrollbar on the body**.
4. At **768 px**: the navigation is the 224 px column at the leading edge. **The
   content must be centred inside the space the column leaves, not inside the
   viewport.** If it sits visibly left of centre or slides under the column, the
   inline-start padding landed on the wrong element.
5. At **1280 px**: the column is still 224 px and the content is still 384 px,
   centred in the remainder. Neither widens.
6. At all three, on each screen: **tab through every control** — both fields and
   the submit on `/login`, three fields and the submit on `/register`, both
   fields and the submit on `/set-password`, plus the prose link at the foot of
   the first two. A ring must appear **on the page around** each control, not
   inside it. **The primary submit is the one to look at hardest**: it is the
   filled pill, and it is the case where a ring without the offset would vanish
   into the fill.
7. Type into a field and confirm the boundary is still visible — this is the
   whole point of the plan, and it is the one thing a contrast number can make
   likely but not certain against a real screen at a real brightness.

### The copy check the plan asks for by name — **also not observed**

Sign in with a **wrong password** and confirm the message still distinguishes
what it distinguished before the conversion. The expected observation is that it
does: the string is byte-identical and the branch is untouched. What it
distinguished before was **nothing** — finding 1 above — so the correct outcome
of this step is *"unchanged, and still wrong in the way already recorded"*.

### Two judgements a contract made that want an eye on them

- **The page titles are now `text-3xl` in Orbitron** where they were 30 px and
  24 px in the interface face. *"Become a Member"* and *"Set your password"* will
  wrap in a 384 px column. That is §7.1 applied correctly, not a defect — but it
  is a visual decision made by a contract rather than by a person.
- **The submits are 48 px tall and full width** where they were 48 px and full
  width, so nothing moved there — but they now sit at `lg`, the rung reserved for
  *the single primary action on a focus screen*, which is exactly what each of
  them is.

## Self-Check: PASSED

- `src/components/ui/Input.tsx` — FOUND
- `src/app/(auth)/login/page.tsx` — FOUND
- `src/app/(auth)/register/page.tsx` — FOUND
- `src/app/(auth)/set-password/page.tsx` — FOUND
- `src/app/(auth)/set-password/SetPasswordForm.tsx` — FOUND
- `scripts/conversion-manifest.mjs` — FOUND
- commit `faad79b` — FOUND
- commit `13deff2` — FOUND
- commit `ef19d0b` — FOUND
