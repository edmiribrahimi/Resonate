---
phase: 41-shared-primitives-three-tier-layout
plan: 13
written: 2026-08-12
status: pending — written BEFORE the sitting that fills it in. Every Result below reads `pending`, and an empty Result is an UNRUN procedure, never a verified-by-inspection in disguise
covers: the four surfaces on §4's closed `focus` list, at three widths, AFTER plan 41-13 removed the navigation clearance from the `focus` form (CR-01)
closes: nothing yet. It closes no requirement, ticks no ROADMAP criterion, and replaces no observation that was already owed
requires: a checkout holding `.env.local`, and `npm run dev`. No worktree in this phase held one, which is why no agent took a single row below
role: the owner, on their own machine. Roles, never names — this repository is public and `.planning/` is tracked
---

# Phase 41 — CR-01, the observation the fix created

> **(a) This document is written before anybody looks.** Plan 41-13 changed what a
> person would see on four screens. Nobody has yet seen either the old rendering or
> the new one. A procedure reconstructed after the sitting is a memory; this one is
> written first so the expectations are numbers somebody else chose, not adjectives
> the observer reaches for at the viewport.
>
> **(b) Every `Result` below reads `pending`.** A tick nobody earned is worse than an
> empty line, because it closes something. The words *approved*, *verified* and
> *observed* appear in this document only in prose about what they are **not**.
>
> **(c) Roles, never names.** The four screens are named by their **route**. No account
> is described by whose it is, and no real credential appears anywhere here.
>
> **(d) Nothing here creates a row in production.** This project lost 63 rows across
> seven tables to a verification script and has no PITR. Every step below opens a page
> and reads it.
>
> **(e) Class strings are described, never spelled.** DEF-41-01: Tailwind scans
> `.planning/` and compiles class strings out of prose, and this phase has already
> emitted a malformed rule from a comment. So the focus container is **384px**, by its
> measurement, and not by its utility name.

---

## Why this document exists

`41-VERIFICATION.md` found one blocking gap in this phase — **CR-01** — and plan 41-13
closed it in code: the `focus` form of `src/components/ui/PageShell.tsx` reserved the
navigation clearance on the four routes that mount no navigation at all.

What it reserved, and what that produced:

| Width | Old behaviour | Consequence |
|---|---|---|
| 768px and above | 248px of leading padding against 24px of trailing | the 384px card sat **112px right of the viewport centre** |
| below 768px | ~96px of bottom padding beneath a card with no bar under it | the card sat **~48px above true centre** |

Both numbers come from `41-REVIEW.md`'s CR-01, which read them off `globals.css` and the
shell's own string. **Neither has been seen by a person, before the fix or after it.**
That is exactly what this document is for.

**Two things about the state of the world today, said here rather than implied.**

1. The fix is closed **in code and unguarded by any gate**. Sixteen gates are registered
   and none of them can see this defect: `verify:conversion` check D asks only whether
   the shell declares §4's three maxima and whether a page wrote one of its own. Plan
   **41-17** adds the check that reads the focus literal and fails if it declares either
   navigation property. Until that plan lands, a later edit could put the insets back
   and every gate would stay green.
2. Nobody has looked at these four screens. Not at the regression, not at the fix.

---

## Why no agent produced these observations

The same reason every plan in this phase recorded, written out once more rather than
left implied:

- **No worktree in this phase holds `.env.local`.** The middleware reads Supabase
  credentials on **every** request, so the application does not render without them.
- **Supplying credentials would point a running application at production.** That is an
  act requiring an authorisation no agent in this phase held, and this phase does not
  take one to look at a layout.

**Which role can make them: the owner, on their own machine**, with a checkout that
holds the credentials and `npm run dev` running.

---

## How to measure, so the result is a number

**Horizontal centring.** Read the space to the **left** of the card and the space to its
**right**. If those two differ by no more than **8px**, the card's centre is within
**4px** of the viewport's centre — half the gap difference is the centre offset, which
is why the two tolerances are stated as one criterion and not two. The old defect made
that gap difference 224px at 768px and above; a person cannot miss it, and the tolerance
exists so nobody argues about a hairline.

**Vertical symmetry.** Read the space **above** the card and the space **below** it. They
must be equal within **4px**. The old defect made the lower space ~96px larger.

**Horizontal scroll.** Put a finger, or the trackpad, on the page body and drag sideways.
The page must not move.

**Navigation.** None of these four screens mounts one. If a bottom bar or a side column
appears on any of them, that is the finding, and it is a bigger one than a centring error.

**Reaching the four:**

- `/login` and `/register` — sign out first.
- `/set-password` — the link the product sends. If it is not reachable on the day, the
  row stays `pending` with the reason written in. An unreachable surface is not a pass.
- `/payment/callback` — open it with **no query parameters**, which renders its refusal
  branch: shell, card, page title and a button, which is everything this surface was
  converted onto. **Reaching its paid branch would require a real payment, and this
  document does not create a production row to look at a layout.**

---

## §1 — Twelve rows: four surfaces, three widths

| # | Route | Width | What must be true | Result |
|---|---|---|---|---|
| 1 | `/login` | 390 | space above the card and space below it equal within 4px; no navigation bar; no horizontal scroll | pending |
| 2 | `/login` | 768 | card centre within 4px of the viewport centre; no side column; no horizontal scroll | pending |
| 3 | `/login` | 1440 | card centre within 4px of the viewport centre; no side column; no horizontal scroll | pending |
| 4 | `/register` | 390 | space above the card and space below it equal within 4px; no navigation bar; no horizontal scroll | pending |
| 5 | `/register` | 768 | card centre within 4px of the viewport centre; no side column; no horizontal scroll | pending |
| 6 | `/register` | 1440 | card centre within 4px of the viewport centre; no side column; no horizontal scroll | pending |
| 7 | `/set-password` | 390 | space above the card and space below it equal within 4px; no navigation bar; no horizontal scroll | pending |
| 8 | `/set-password` | 768 | card centre within 4px of the viewport centre; no side column; no horizontal scroll | pending |
| 9 | `/set-password` | 1440 | card centre within 4px of the viewport centre; no side column; no horizontal scroll | pending |
| 10 | `/payment/callback` | 390 | refusal branch, no parameters. Space above and below the card equal within 4px; no navigation bar; no horizontal scroll | pending |
| 11 | `/payment/callback` | 768 | refusal branch, no parameters. Card centre within 4px of the viewport centre; no side column; no horizontal scroll | pending |
| 12 | `/payment/callback` | 1440 | refusal branch, no parameters. Card centre within 4px of the viewport centre; no side column; no horizontal scroll | pending |

**Rows 2, 3, 5, 6, 8, 9, 11 and 12 are the ones that would have caught the regression.**
At 768 and 1440 the old rendering put the card 112px to the right — a gap difference of
224px against a tolerance of 8px. If any of these eight rows fails after the fix, read
`§3` before touching anything.

---

## §2 — The thirteenth row, asked separately

| # | Route | Width | What must be true | Result |
|---|---|---|---|---|
| 13 | `/register` | 390 | the form is taller than the viewport. Scroll to the last field: nothing is cut off at the **top** edge, and the form ends with a **visible gap** below its last element rather than sitting flush to the bottom of the page | pending |

**Why this one is asked on its own.** The fix removed the bottom padding the `focus` form
used to reserve — ~96px on a phone. On the three short surfaces that padding was dead
space under a centred card. On `/register`, whose form can exceed the viewport height,
it was the only thing between the last field and the bottom edge. **This is the single
row where the fix could plausibly have made something worse**, so it is asked as its own
question rather than folded into row 4, where a `pending` would hide it.

---

## §3 — What a failure looks like

- **A card sitting right of centre at 768 or 1440** means the navigation insets are back
  in the `focus` form. It is a regression of the regression, and **plan 41-17's check E
  should have gone red in CI before anybody looked at a screen**. If it did not, the gate
  is the second finding and the layout is only the first.
- **A navigation bar or a side column on any of the four** means one of them acquired a
  layout it did not have. That is a larger finding than a centring error, because two of
  these four routes are the product's front door and one reports the outcome of money
  already moved.
- **The last field of `/register` flush against the bottom edge at 390px** means the fix
  removed padding that was doing work on that one surface. Write it as-is; do not retry
  until it looks acceptable.

Where a step fails, **write what happened, verbatim.** Do not adjust the viewport until
it passes.

---

## §4 — What this document refuses to do

**It does not tick RESP-01 or RESP-02.** Both remain PARTIAL. RESP-01 closes only after
phase 41.2, and no set of twelve rows on four surfaces closes a requirement that spans
every converted surface in the milestone. **It does not tick RESP-03 either** — touch
targets are H41-4's question, they need a large touch screen, and nothing here measures
a box.

**It does not replace H41-1.** H41-1 asks the same question of **all eight** converted
surfaces and is still owed in full for the other four — `/gallery`, `/admin/formats`,
`/admin/members/register`, `/admin/members`. This document is the **additional**
observation that CR-01's fix created, not a substitute for one that was already owed.
`41-RELEASE-PASS.md` records that H41-1 was closed by a one-word authorisation with no
itemised evidence; that stays exactly as it stands, and nothing here upgrades it.

**It claims nothing.** Thirteen rows, thirteen `pending`. The word *approved* is an
authorisation, the word *verified* is a claim about files, and the word *observed*
belongs to a person who has looked. None of the three applies to any row above.

---

## §5 — Results

| § | Observation | What it would close | Result |
|---|---|---|---|
| §1 rows 1–12 | four focus routes × three widths: centring, symmetry, no navigation, no horizontal scroll | the re-observation `41-VERIFICATION.md` asks for after CR-01's fix — and **only** that | pending |
| §2 row 13 | `/register` at 390px, scrolled to its last field | the one place the fix's bottom-padding change could have made something worse | pending |
| — | RESP-01 | — | **not ticked** — PARTIAL, closes only after phase 41.2 |
| — | RESP-02 | — | **not ticked** — PARTIAL |
| — | RESP-03 | — | **not ticked** — H41-4's question, and it needs a device |
| — | H41-1 | — | **still owed in full**, for all eight surfaces. This document is not it |
</content>
</invoke>
