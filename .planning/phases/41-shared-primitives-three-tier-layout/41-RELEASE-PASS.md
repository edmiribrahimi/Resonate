---
phase: 41-shared-primitives-three-tier-layout
written: 2026-08-12
closed: 2026-08-12 — the owner replied `approved`, one word, with no itemised findings
status: closed on the owner's blanket approval. NO per-item observation was reported back, and none is recorded below. Read `The close` before any Result
closes: the phase gate, and only that. The ROADMAP criteria this pass was written to evidence — criterion 4a (RESP-01 — H41-1), criterion 2's runtime half (DS-08 — H41-2), criterion 3's judgement half (DS-09 — H41-3), criterion 5 (RESP-03 — H41-4) — carry NO itemised evidence and none of them is ticked
batch: the end-of-v1.5 human sitting, alongside `40-RELEASE-PASS.md`, `39-DOOR-PASS.md` and `38-PROCEDURES.md` — not a second sitting
devices: three if possible — a phone, a LARGE TOUCH SCREEN (a tablet, not a narrow phone), and a laptop with a mouse. The tablet may not exist; H41-4 says in advance what happens then
accounts: one signed-in account holding `organizer.access`, `catalogue.manage` AND `admin.access` — all three, because H41-6 counts eight tabs and the eight are gated by three different capabilities. Roles, never names
requires: a checkout that holds `.env.local`, and `npm run dev`. No worktree in this phase had one, which is why not one of these six was taken during execution
phase_closes: closed 2026-08-12 by the owner's approval. An authorisation is not a measurement, and this document does not convert one into the other
---

# Phase 41 — The Release Pass

> **(a) This document was written with every `Result` empty and reading `pending`, and
> an empty Result is an UNRUN procedure** — never a verified-by-inspection in disguise.
> Sixteen gates are registered and `npm run verify` runs fifteen of them in one command;
> **not one of them has seen a pixel.** A tick nobody earned is worse than an empty
> line, because it closes a phase.
> **On 2026-08-12 the owner closed the gate with a single word — `approved` — and no
> itemised findings.** Every `Result` below now records exactly that and nothing more.
> **Read `The close` immediately below before reading any `Result`.**
> **(b) Roles, never names:** this repository is public and `.planning/` is tracked, so
> a person here is *an account holding `organizer.access`* — never a name, never who
> was actually there. This document names routes, files, widths and roles. **No venue
> under negotiation, no unannounced date, no line-up, no person.**
> **(c) This document is written BEFORE the sitting that fills it in.** A procedure
> reconstructed afterwards is a memory, not a measurement. Where a plan in this phase
> already wrote down what a correct surface looks like, that judgement is carried
> across here rather than re-derived on the day by somebody with a viewport open.
> **(d) It joins the end-of-v1.5 sitting.** It does not invent a second sitting. Three
> phases, one device set: Phase 39's door pass, Phase 40's H1–H3, and these six.

---

## The close — read this before any `Result` below

On **2026-08-12** the phase gate was put to the owner as the five steps the plan wrote.
**The reply, in full, was one word:**

> approved

That is the whole of it. It is a real and sufficient authorisation to close the gate —
the plan's own resume signal asked for exactly that word — and this document treats it
as one.

**It is not a report of six observations, and it is not recorded as one.**

| What arrived | What did not |
|---|---|
| an authorisation to close the phase gate | any per-item observation, for any of the six |
| a statement that nothing seen should not be there | any defect, any measurement, any number |
| — | any statement about which devices were available |

So, for **H41-1 … H41-6**, every `Result` below reads *covered by the owner's blanket
approval, without itemised evidence recorded*. **Not one says `observed`, `passed` or
`confirmed`**, because nothing was reported back that could carry those words, and this
document's own opening rule — *a tick nobody earned is worse than an empty line* — does
not make an exception for the close.

**H41-4 is the one to read twice.** The owner never said a large touch screen was
available, and this document does not claim one was. **Criterion 5 (RESP-03) stays
`human_needed` and is NOT ticked.** It was written in advance that this is what happens
when the instrument is absent; the absence of a statement about the instrument is not a
statement that it was there.

**Two things below are measurements, and they are the only two.** The `npm run verify`
and `npm run build` results in §0.1 were run by the executing agent on this tree on
2026-08-12 and are recorded as what that agent measured. Everything else in this
document is an authorisation.

---

## Why a person, when sixteen gates are green

Every gate in this repository reads **text**. The strongest of them walks an import
graph and asserts what a class string says. **Not one of them can see a box.** The
six observations below are the whole of what Phase 41 knows about itself that a
script cannot state:

| What a gate proves | What only a person proves |
|---|---|
| no unconverted file is reachable from a declared surface | the surface is *workable* at a width somebody actually holds |
| the dialog primitive calls `showModal()` | Escape closes it, and the page behind it does not scroll |
| the dense table renders two trees switching at one breakpoint | the cards are readable and the columns that mattered survived |
| an interactive element declares a minimum height | **anything is 44px** |

The fourth row is the one to read twice. `verify:touch-targets` is scoped, has six
exemptions and went red on two real elements on its first run — and its own header
says, in a box, that **H41-4 is the only proof that anything is 44px.**

---

## How to read a step

- Steps are numbered and are executed **in the order written**.
- Each step ends with a `Result` line. It began as `pending`; fill it with what was
  **observed**. Today none of the six carries an observation — see `The close`.
- An observation is a fact a second person standing beside the device could confirm
  or deny. *"It looked right"* is not an observation; *"at 390px the member list was
  cards, one per member, and a horizontal drag did not move the page"* is.
- Where a step says **that is the finding**, write what happened instead, verbatim.
  **Do not retry until it passes.**
- Where a device is not available, write `human_needed` and the reason. **That is an
  honest verdict and a tick would not be.**
- **Nothing in this pass creates a row in production.** See the closing block, which
  is not boilerplate: this project lost 63 rows across seven tables to a verification
  script, and it has no PITR.

---

## §0 — Preconditions, read ON THE DAY

### §0.1 The tree under test

1. Run `npm run verify`. Record the **verdict line** verbatim and the exit code.
2. Record which gates were **REFUSED** and which were **NOT RUN**, from the two
   blocks the command prints. A refusal measured nothing; it is neither a pass nor a
   failure, and it must be carried into the row below as itself.
3. Run `npm run build`. Record the exit code.

> Expected on a machine without Supabase credentials: `verify:capabilities` REFUSES,
> and the aggregate therefore exits **2**, not 0. That is the command working. On a
> machine that holds the credentials it is expected to exit 0. Record which machine
> this was.

Result: **measured 2026-08-12 by the executing agent, on the worktree that carried plan
41-12. This machine holds NO `.env.local`.**

- `npm run verify` → **exit 2**. Verdict line, verbatim:
  `VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities`
- **15 gates ran. 14 passed, 0 FAILED, 1 REFUSED.**
- **REFUSED:** `verify:capabilities`, with its own stderr:
  `FATAL: missing environment variable(s): SUPABASE_ACCESS_TOKEN,
  NEXT_PUBLIC_SUPABASE_URL. … Nothing was measured.`
- **NOT RUN:** `verify:redirects` — *needs a running dev server; its own header says it
  cannot be part of the build.*
- Count block reconciled: 16 declared, 15 run, 1 needs a server, 0 declared absent,
  **0 MISSING**, 16 accounted for.
- `npm run build` → **exit 0.** Compiled in 6.9s, TypeScript ran, 40 static pages
  generated, 58 routes emitted.

> **The credential difference, stated rather than borrowed.** The exit 2 above is what
> **this** tree produced, and the reason is the missing credential file, not the tree.
> A checkout that holds the Supabase credentials is expected to run the same fifteen
> gates with `verify:capabilities` measuring instead of refusing, and to exit 0. **That
> run was not taken here and is not recorded here as a measurement** — one exit code
> read without its machine is how a refusal becomes a pass by retelling.

### §0.2 The account

1. Sign in with an account holding `organizer.access`, `catalogue.manage` **and**
   `admin.access`. Record which three capabilities the account holds — the
   capabilities, not the person.
2. If the account holds fewer than three, **H41-6 cannot count eight tabs** and its
   Result is `human_needed` with the capability set that was actually available.

Result: `human_needed` — **the owner's approval did not state which capabilities the
account held, or whether one was used at all.** Nothing is recorded here, because
nothing was reported. The consequence is written where it lands: **H41-6a's count of
eight tabs has no recorded capability set behind it.**

---

## H41-1 — Every converted surface, at three widths [criterion 4a · RESP-01]

**The eight surfaces, by route, taken from `scripts/conversion-manifest.mjs` and not
from memory.** The `width` column is the manifest's own value and is what step 3
observes.

| # | Route | Width | Reach it by |
|---|---|---|---|
| 1 | `/payment/callback` | focus | opening it **with no query parameters** — see the note below |
| 2 | `/login` | focus | signing out first |
| 3 | `/register` | focus | signing out first |
| 4 | `/set-password` | focus | the link the product sends; both of its outcomes if reachable |
| 5 | `/gallery` | wide | signed in |
| 6 | `/admin/formats` | default | `catalogue.manage` |
| 7 | `/admin/members/register` | default | `organizer.access` |
| 8 | `/admin/members` | wide | `organizer.access` |

> **`/payment/callback` is opened with NO parameters, and that is deliberate.** With
> no `ctx` and no order it renders its refusal branch, which mounts the shell, the
> card, the page title and a button — everything this surface was converted onto.
> **Reaching its paid branch would require a real payment, and this pass does not
> create a production row to look at a layout.** If the paid branch is seen during
> ordinary use on the day, record it; otherwise it is `human_needed`, which costs
> nothing, and paying for a screenshot would cost something irreversible.

At **390px**, **768px** and **1280px**, for each of the eight:

1. **Nothing is clipped** — no text cut off at an edge, no control half off-screen.
2. **Nothing is stretched** — at 1280px the content **stops widening** and the page
   ground is visible on both sides. This is RESP-02, and it is the property the
   `wide` and `focus` widths exist to produce.
3. **No horizontal scroll on the page body.** Put a finger (or the trackpad) on the
   page and drag sideways. The page must not move. Do this at 390px on every one of
   the eight; it is the width where it fails if it fails.
4. Record, per surface, **which of the three widths were seen** and what was wrong
   at any of them.

### Two things carried forward, so a correct page is not filed as a defect

- **`/admin/formats`** — the explanatory paragraph under `Retired` now runs the full
  content width. That is **DEF-41-04**, recorded by plan 41-09: a maximum-width
  matcher cannot tell a paragraph's reading measure from a container maximum. It is
  a known and accepted appearance, not a layout bug.
- **`/login` and `/register`** — the closing sentence of each carries the only link
  to the other. Plan 41-11 gave both links the 44px minimum, which **opens the line
  box of the paragraph they sit in**. Read that sentence at 390px: it must still read
  as a sentence, on one line, with the link vertically centred against the text
  rather than dropped below it. **This is the only visual change plan 41-11 made, it
  was made without being able to look at it, and it is the first thing to look at.**

Result: **covered by the owner's blanket approval of 2026-08-12, without itemised
evidence recorded.** No surface, no width and no defect was reported back. Nothing here
is marked observed, and **criterion 4a (RESP-01) is not ticked** — neither the eight
surfaces nor the three widths has a recorded observation behind it.

---

## H41-2 — A converted dialog, on a phone and on a laptop [criterion 2 · DS-08]

> **This settles research assumption A2** — *"background scroll lock under
> `showModal()` is unverified"*. **Plan 41-09 did NOT observe it.** It could not: it
> had no `.env.local` either, and `/admin/formats` is behind `catalogue.manage`. It
> wrote the procedure instead, and step 4 below is that procedure. **A2 is open, and
> this is where it closes.** Nothing in 41-09's SUMMARY should be read as an answer
> to it, and the primitive deliberately writes **no scroll lock of its own** —
> writing one before observing whether the platform already does it would be a second
> author for a behaviour nobody has measured.

Signed in with `catalogue.manage`, open `/admin/formats`.

1. **At 390px** — press `Add format`. The panel rises from the **bottom edge**, is
   full width, and its **top two corners are rounded while its bottom two are not**.
   The three fields carry a visible boundary; the buttons sit at the foot with
   clearance above the bottom navigation bar.
2. **At 1280px** — the same panel is a **centred window**, at most 512px wide, all
   four corners rounded, the page visible around it.
3. **Press Escape** at both widths. It closes. **Nothing in this codebase makes it
   close** — that is the platform, and it is the whole argument for the extraction.
4. **Scroll the page behind the open panel**, at both widths, with the wheel and with
   a touch drag. **Record whether the background moved.** *(This is A2.)*
5. **Tab through the open panel.** Focus must not leave it. Again: no code here does
   that.
6. **Open `Retire` on any format.** Focus must land on **Cancel**, not on the retire
   button, and **pressing Enter immediately must not retire anything.** This is the
   single most important observation in this list — a format's progressivo is already
   on a poster, and the numbering is a monotone guard.
7. **Force a refusal** — try to give a format a colour another active format holds.
   The sentence appears **inside the panel**, above the buttons, in the critical ink,
   and is on screen without scrolling.

Result: **covered by the owner's blanket approval of 2026-08-12, without itemised
evidence recorded.** **Step 4 is assumption A2, and A2 REMAINS OPEN**: nobody reported
whether the background scrolled behind the open panel, so nothing about it is known and
nothing about it is written. Step 6 — Cancel holding focus on `Retire` — likewise has
no recorded observation. **Criterion 2's runtime half (DS-08) is not ticked.**

---

## H41-3 — The densest converted table, on a phone [criterion 3 · DS-09]

`/admin/members`, at **390px**, signed in with `organizer.access`.

**Which columns matter is a judgement, and plan 41-10 made it in advance** so the
person observing checks against a decision rather than re-making one at a viewport:

| Column | Card slot | Why |
|---|---|---|
| Name | title | it is who the row is about, and the only thing an operator searches by |
| Address | subtitle | the second identifier, and the one that disambiguates two people with one name. **Truncated, not dropped** |
| Role | mark | one of the two axes |
| Status | mark | the other axis, and the one that decides which acts the row offers |
| Joined | meta, labelled | a date needs its label without a header row above it |

**Nothing was dropped: all five columns appear on the card.** That is the claim.

1. The list is **cards**, one per member — not a table squeezed narrow.
2. **Nothing scrolls sideways.** Put a finger on a card and drag horizontally; the
   page must not move.
3. Each card shows the name large, the address under it, the role and the status as
   **two separate marks** on the right, and `Joined: …` underneath.
4. **Tap the caret** on a card. The detail region opens *inside that card* — referred
   by, referred members, events attended — in one column.
5. **Open the Pending tab.** Each card gains a checkbox on the left. Select two; the
   toolbar appears above the list with `2 selected` and two buttons.
6. **On the Approved tab**, select one and press `Withdraw access from selected`. The
   confirmation replaces the toolbar. **Cancel is the first button.** The four
   sentences are present, including *"Nobody is told."* **Press Cancel.**

> Step 6 ends on Cancel, and that is not politeness. Withdrawing access is the
> gating mechanism operating on a real person's account; this pass reads it and does
> not perform it.

Result: **covered by the owner's blanket approval of 2026-08-12, without itemised
evidence recorded.** No card, no column and no drag was reported back. The five-column
judgement plan 41-10 made in advance stands as a judgement and **has not been checked
against a rendered card. Criterion 3's judgement half (DS-09) is not ticked.**

---

## H41-4 — The smallest control, on a LARGE TOUCH SCREEN [criterion 5 · RESP-03]

> **THE AVAILABILITY RISK, IN THE BODY AND NOT IN A FOOTNOTE.** `41-RESEARCH.md`
> flags that a tablet may not be available. **If no large touch screen is available,
> criterion 5 is recorded `human_needed` and is NOT ticked.** No green from
> `verify:touch-targets` substitutes for it, and this document does not claim it
> does. A phone is not a substitute either: criterion 5 says *large touch screens
> included*, and a 1024px tablet is touched — it is precisely the device on which a
> layout designed for a mouse arrives and a finger cannot hit anything.

A tablet, not a narrow phone. Measure — with the device's own tooling if it has any,
with a thumb if it does not.

1. **`/login` — the `Sign Up` link at the end of the closing sentence.** Put a thumb
   on it. It must be comfortably reachable without aiming. **Then the twin on
   `/register`.** These two are the newest elements in the phase and **the only ones
   whose rendered box nobody has ever seen.**
2. **`/admin/members`** — the staff-count shortcut inside the sentence of counts, the
   status tabs, the two filters, the search field, the row actions, the disclosure
   caret **in both branches**, and **both checkboxes**. Every one at least 44×44.
3. **`/gallery`** — the event heading link above each group, and every thumbnail.
4. **`/admin/formats`** — every colour swatch in the picker, which is a radio group
   used one-thumbed.
5. **`/payment/callback`, `/set-password`, `/admin/members/register`** — every button
   and every link.

**Expected: ≥ 44×44 CSS px, everywhere, with exactly one exception** — see H41-5.

Record the **smallest thing found**, where it was, and how it was measured.

Result: **`human_needed`. NOT ticked.**

**The owner's approval never stated that a large touch screen was available**, and this
document will not read a silence as a device. No box was reported measured, no smallest
control was named, and no method was described — so **criterion 5 (RESP-03) has no
evidence at all behind it**, and it is recorded exactly as this section said in advance
it would be if the instrument were absent.

The blanket approval covers this item as an authorisation to close the phase gate. **It
does not measure 44 pixels, and no green from `verify:touch-targets` does either** — the
table at the head of this document says that gate asserts a class string and that H41-4
is the only thing in this repository that asserts a box. That remains true today.

---

## H41-5 — A desktop with a mouse only [the other half of the `any-pointer` trade]

D-41-07 accepted a trade out loud: one shrink, applied only where the pointer is
fine. This is the half that observes it did not go further than that.

On a laptop, mouse only, `/admin/members` at 1280px:

1. **The row-action pills in the table branch are about 36px tall — and ONLY those.**
2. **If they are 44px**, the custom variant did not match. That is the finding.
3. **If anything else on any converted surface is under 44px**, that is a defect the
   gate could not see — which is the entire reason a person is doing this.

Result: **covered by the owner's blanket approval of 2026-08-12, without itemised
evidence recorded.** The row-action pills were not reported measured at any height, so
**D-41-07's accepted trade is still an intention rather than an observation.**

---

## H41-6 — Eight tabs at 768px, and the door that must not have changed

### H41-6a — the tabs [RESP-04]

**The ~808px figure in the research is an estimate. This is the measurement.**

The eight work surfaces are `Events`, `Members`, `Artists`, `Venues`, `Formats`,
`Newsletter`, `Finance`, `Analytics`. **Three different capabilities gate them**, so
the count of eight is only observable from the account §0.2 describes. With fewer
capabilities, record how many tabs were visible and against which capability set —
that is still a useful measurement, and it is not a tick.

Open any work surface and read the navigation:

1. **At 390px**: the navigation is a bar at the **bottom edge**; the work tabs are a
   strip in flow above the content; the current tab is an accent-filled pill and is
   **not flush to the left gutter**.
2. **At 768px**: the bar is gone; a **224px column** stands at the left edge with a
   single hairline on its trailing side; under a `Work` heading the **eight tabs are
   stacked and all visible without scrolling anything sideways**. **If a tab requires
   scrolling, RESP-04 is not met** — and that is the finding, written as-is.
3. **At 1280px**: the column is **still 224px**. It must not widen; the extra width
   goes to the content.
4. At all three widths: tab through the navigation with the keyboard and confirm the
   ring appears **on the page around** each entry, not inside it.

Result: **covered by the owner's blanket approval of 2026-08-12, without itemised
evidence recorded.** No tab count was reported, and §0.2 records that the capability set
in use was never stated — so **the count of eight has neither an observation nor an
account behind it. RESP-04 is not ticked, and the ~808px estimate is still an estimate.**

### H41-6b — the door, which this phase claims not to have touched

> **This is the phase's tampering check, and it is the one step here that is about
> the entrance rather than about a layout.** The door is Phase 42's, and D-41-21
> exists so that a phase which gave the navigation a second tier could not put a
> 224px column on a screen somebody reads at an entrance, in the dark, one-handed.

1. Open **`/door`** and **`/admin/scanner`**.
2. **At every width you can reach** — phone, tablet, laptop — the navigation must be
   **the bottom bar it has always been**.
3. **If a 224px column appears at either address, the D-41-21 fence has failed** and
   Phase 42's scope was entered by accident. Write it as-is; it is the most important
   negative result this pass can produce.
4. The one permitted difference from before: the bar's entries are now at least 44px
   tall.

Result: **covered by the owner's blanket approval of 2026-08-12, without itemised
evidence recorded.** The owner reported nothing that should not be there, and that is
the closest this pass comes to a negative result on the door — **but nobody reported
opening `/door` or `/admin/scanner`, so it is an absence of a complaint and not an
observation of a bottom bar.**

The mechanical half of T-41-47 does stand on its own and is recorded where it was
measured: no plan in this phase touched a file under `scanner/` or under the door's
route group, asserted per plan by its own diff. **What has not been observed is the
rendered navigation at either address.**

---

## §9 — Results

One row per observation. **`human_needed` is a legitimate value in this column and a
tick is not, unless somebody saw it.**

**Two rows are measurements. Every other row is an authorisation.** `approved (blanket)`
means the owner's single word covers the item and **no itemised evidence was reported
back for it** — it is not an observation, and no row below is ticked on the strength of
it.

| § | Observation | What it closes | Result |
|---|---|---|---|
| §0.1 | `npm run verify` verdict + exit code; which gates REFUSED; which were NOT RUN; `npm run build` exit code | precondition — all | **MEASURED 2026-08-12, no `.env.local`:** verify **exit 2** — 14 passed, 0 FAILED, 1 REFUSED (`verify:capabilities`), 1 not run (`verify:redirects`); build **exit 0** |
| §0.2 | the three capabilities the account holds | precondition — H41-6a | **`human_needed`** — never stated |
| H41-1 | eight surfaces × three widths: clipped / stretched / horizontal scroll | **criterion 4a (RESP-01)** | approved (blanket) — **no itemised evidence; not ticked** |
| H41-1b | the two auth links still read as a sentence at 390px | plan 41-11's only visual change | approved (blanket) — **no itemised evidence; still unseen** |
| H41-2 | sheet at 390px, window at 1280px, Escape closes | **criterion 2's runtime half (DS-08)** | approved (blanket) — **no itemised evidence; not ticked** |
| H41-2d | **whether the background scrolled behind the open panel** | **assumption A2 — open since research** | **A2 STILL OPEN** — nothing reported |
| H41-2f | Cancel holds focus on `Retire`; Enter retires nothing | the numbering is a monotone guard | approved (blanket) — **no itemised evidence** |
| H41-3 | cards at 390px, no sideways scroll, all five columns present | **criterion 3's judgement half (DS-09)** | approved (blanket) — **no itemised evidence; not ticked** |
| H41-4 | the smallest control on a **large touch screen**, measured | **criterion 5 (RESP-03)** | **`human_needed` — no large touch screen was stated available. NOT TICKED** |
| H41-5 | the row-action pills ~36px with a mouse, and only those | D-41-07's accepted trade | approved (blanket) — **no height was reported** |
| H41-6a | eight tabs at 768px without scrolling the strip | RESP-04 | approved (blanket) — **no count reported; not ticked** |
| H41-6b | the door is the bottom bar at every width, both addresses | **D-41-21 · T-41-47** | approved (blanket) — **no complaint reported; neither address reported opened** |

---

## Closing block

### What this pass creates in production: nothing

It opens pages and reads them. Its three most tempting steps are all written to stop
short of a write:

- **H41-1 on `/payment/callback`** opens the refusal branch and does **not** make a
  payment to see the paid one.
- **H41-3 step 6** opens the withdraw-access confirmation and **presses Cancel**.
- **H41-2 step 6** opens `Retire` and confirms that **Enter does nothing**.

**If any step ever finds itself needing to create a row, it has drifted.** This
project lost 63 production rows across seven tables to a verification script, with no
PITR, and authorisation to write to production is an act that is spent once and
recorded — never a standing permission.

### Nothing here reveals a venue

No step opens a venue-reveal path, none sends mail, and none touches
`venue_reveal_sent`. The reveal is monotone and irreversible; a pass that reads
layouts has no business near it, and this one does not go there.

### Why not one of these six was taken during execution

Every plan in this phase recorded the same reason, and it is recorded once more here
rather than left implied: **no worktree held `.env.local`**, the middleware reads
Supabase credentials on **every** request, and pointing a running application at
production is an act requiring an authorisation no agent in this phase held. On
`/admin/members` it would additionally have meant rendering real people's personal
data to look at a card.

### Approved is not verified

This section was written before the close and said that until every `Result` was filled
in, **criterion 4a (RESP-01), criterion 5 (RESP-03), the runtime half of criterion 2
(DS-08), the judgement half of criterion 3 (DS-09) and assumption A2** were
`human_needed`. **The owner's approval closed the phase gate. It did not fill any of
them in**, so all five stand exactly where they stood, and no VERIFICATION document, no
green gate, no `npm run verify` table and no build may say otherwise.

Sixteen gates prove the **files**. They prove nothing about a thumb on a link, a
panel on a phone, or a door in a dark room. **A one-word approval proves that the owner
authorised the phase to close** — which is a decision the owner is entitled to make, and
the honest name for it is a decision, not a measurement.

**The phase is *executed* and the gate is *closed*. The six observations remain owed**,
and they are owed to the end-of-v1.5 sitting that already holds Phase 40's H1–H3 and
Phase 39's door pass. If that sitting ever happens, the `Result` lines above are where
the evidence goes, and each of them currently says, in full, what it does not contain.
