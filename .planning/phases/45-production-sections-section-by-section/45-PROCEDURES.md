---
phase: 45-production-sections-section-by-section
written: 2026-08-17
status: all four pending, and all four DECLARED NOT RUN on 2026-08-18 by the owner. `pending` is the literal state of every Result below and it is deliberate — not `skipped`, not `n/a`: these are declared DEBT, not closed work, and they must stay visible to whoever reads this register next
closes: PROD-02 criterion 1, criterion 2, criterion 3, and the half of D-45-16 that no assertion can hold
carries: the four rows of 45-VALIDATION.md § Manual-Only Verifications, in the researcher's own reasons
accounts: two — a hand-made account holding exactly ONE section key, in a throwaway environment; and an account holding all four keys through the master role. Roles, never names
authorisation: four, and they are four ACTS, not one permission. A1 (plan 45-02) is spent. A2 was granted and spent on 2026-08-17 by plan 45-08, and it did NOT extend to the retirement of plan 45-09 — which asked again and received A2b, granted and spent on 2026-08-18. A3 (plan 45-10) was granted and spent on 2026-08-17. All four are spent. A FIFTH — A4, a fourth mint of the refusal instrument, asked for by plan 45-18 — was **NOT TAKEN, by the owner's decision of 2026-08-18**, and that is a decision and not a missing permission. None of them is this document's to spend: the procedures below write nothing
phase_closes: the rule written on 2026-08-17 was "not before every Result below carries an observation". **It was NOT met, and it is recorded unchanged rather than rewritten**, so that the exception reads as an exception. The owner closed phase 45 on 2026-08-18 with all four Results still `pending`, each declared not run with its reason — which makes the phase closed and the criteria NOT closed. `45-VERIFICATION.md` must say *deferred*, and must say that deferred is not verified
---

# Phase 45 — The Procedures

> **(a) Every `Result` below reads `pending`, and a pending Result is an UNRUN
> procedure** — never a verified-by-inspection in disguise. A table of ticks
> nobody earned is worse than an empty table, because it closes a phase. This
> project has the precedent: a roadmap box went `[x]` on a phase whose only open
> point was that it was not yet proved.
>
> **(b) Roles, never names — and steps, never observations.** `.planning/` is
> tracked and this repository is PUBLIC. A person here is *an account holding one
> section key*, *an account holding all four through the master role*. Never a
> name. And **no space, no unannounced date and no line-up appears anywhere in
> this file**: a step says *open the location section and read the first row*, and
> never what that row says. The scouting archive holds a street address on every
> record (D-45-21, measured), so this rule is not decorum here — it is the same
> rule `venue-acquisition.md` states as *criteri qui, candidati mai*.
>
> **(c) Why these four and not more.** Everything else in this phase has a
> command: `verify:section-surface` reads the sections' files,
> `verify:section-export` walks the export's closure and censuses the catalogue,
> `verify:capabilities` reads the keys and their grants, `verify:refusal` signs in
> as a real role. These four are what **no command in this repository can
> settle**, and the reasons are two. P1 has no subject in production to ask.
> P2, P3 and P4 ask how a screen READS, and a string assertion has no opinion
> about that.
>
> **(d) None of these four writes anything.** No row is created, no number is
> spent, no key is granted. That is why this document carries no snapshot and no
> removal-by-primary-key ritual, and it is a difference from Phase 44's P3 worth
> stating rather than leaving to be noticed: the three acts that DO write in this
> phase are the three authorisations below, and they belong to other plans.

---

## The three authorisations, and why they are three

`ai-engineering.md`, *gate l'autorizzazione a scrivere in produzione e' un atto,
non un permesso*: an authorisation is **consumed once**, covers exactly what was
described when it was asked for, and is recorded with the sitting that spent it.
This phase asks for three different things of three different kinds, and rolling
them into one line would be asking for a permission instead.

| | What it authorises | Whose plan | State |
|---|---|---|---|
| **A1** | **Minting a session on a real person's identity** through the auth API, read-only, with a verified global revocation at the end — so that a refusal can be measured with a real role rather than a service key | plan 45-02 | **ASKED AND GRANTED 2026-08-17**, with the four measured points put to the owner before the answer. **SPENT the same day, by plan 45-02**: one run, one sitting, both minted sessions revoked globally and each revocation re-read. The transcript and the exit code are in `45-02-SUMMARY.md`. A second sitting is a second authorisation |
| **A2** | **Applying a migration to production** — the additive key split, and then the retirement of the key it replaces, in that order and after a deploy | plans 45-08 and 45-09 | **ASKED AND GRANTED 2026-08-17**, in the owner's words *«Autorizzato: migration + rilettura»*. **SPENT the same day, by plan 45-08.** What it covered: the FIVE migrations `20260817120000`, `120100`, `120200`, `120300`, `120400`, applied ONCE each through `POST /v1/projects/{ref}/database/migrations`, **plus** the one re-run of `verify:refusal`, which mints its own session. What it did NOT cover, and each needs its own act asked by its own plan: the retirement migration `20260817120500_production_read_retire.sql` (plan 45-09), the seed (A3, plan 45-10), any second application, any further re-run, and any write of a data row. The five assigned versions and the recorded read-back are in `45-08-SUMMARY.md` |
| **A2b** | **Retiring the key the split replaced** — applying `20260817120500_production_read_retire.sql`, and one re-run of the refusal instrument to re-measure the pair afterwards | plan 45-09 | **ASKED AND GRANTED 2026-08-18**, in the owner's words *«Autorizzato: ritiro + rilettura»*. **SPENT the same day, by plan 45-09.** What it covered: applying that ONE file, ONCE, through `POST /v1/projects/{ref}/database/migrations` — never `/database/query`, never `PUT` — **plus** one re-run of `verify:refusal`, which mints two sessions of its own. What it did NOT cover, and each would need its own act: any second application, any further re-run, any write of a data row, and any deletion beyond the three `DELETE`s the file already contains. The assigned version `20260817220627`, both snapshots and the catalogue read-back are in `45-09-SUMMARY.md`. **A2b is SPENT** |
| **A3** | **Seeding the scouting archive** into the location section, once, all rows at the mapped stage | plan 45-10 | **ASKED AND GRANTED 2026-08-17**, in the owner's words *«Autorizzato, un run con `--apply`»*. **SPENT the same day, by plan 45-10.** What it covered: **ONE** run of `scripts/seed-production-spaces.mjs` **with `--apply`**, writing rows into `public.production_space` and `public.production_space_attribute` and into no other table — every row arriving at the lowest acquisition stage because the script does not write that column at all, and every attribute arriving `derived` because nobody has been called. What it did NOT cover, and each needs its own act: **a second `--apply` run**, any removal under any flag, any write to a table outside the location section, and the retirement migration (plan 45-09). The pre-snapshot, the transcript and the catalogue read-back are in `45-10-SUMMARY.md` |

**A1 is already spent by the time anybody reads this**, and what it bought is a
baseline rather than a verdict: the entitled/unentitled pair held on the one
calendar table that carries rows, and refused honestly on the five that do not.
Whoever runs A2 re-runs that instrument **under a new authorisation** and must
get the same pair back with the new key. If the pair changes, the reach of the
access changed and not the name of a key.

**That comparison has now been made, on 2026-08-17, and the pair did not move.**
`production_pipeline_rule` read `16 / 0 / 0` before the split and `16 / 0 / 0`
after it, with the six arms asking a different key at the second reading. Both
minted sessions were revoked globally and each revocation was re-read as
`false`. Constraint 3 of D-45-04 — *the split changes the name of a key and not
who can read* — is therefore held by a measurement and not only by a diff. The
run's exit code fell at `2`, which is the honest outcome and not a defect: ten
of the eleven declared tables carry zero rows, and on an empty table the
entitled answer and the unentitled answer are the same bytes.

**And it has now been made a third time, on 2026-08-18 under A2b, after the old
key was removed — and the pair still did not move.** `production_pipeline_rule`
read `16 / 0 / 0` for the third consecutive measurement: before the split, after
the split, and after the retirement. Two further pairs held for the first time,
because A3's seed gave the location section rows to discriminate on:
`production_space` at `184 / 0 / 0` and `production_space_attribute` at
`1840 / 0 / 0`. Pairs held went from one to three, refusals from ten to eight,
and the exit code stayed `2` for the eight tables that are still empty. Both
minted sessions were revoked globally and each revocation was re-read as `false`.

### A4 — a fourth mint, ASKED FOR by plan 45-18 and NOT TAKEN — decided 2026-08-18

**This is an act NOT TAKEN by the owner's decision of 2026-08-18. It is not an
act postponed for want of a permission**, and the difference is not wording: a
missing permission is an obstacle that would go away if somebody said yes, while
a decision is a judgement somebody made and can be held to. Recording the second
where the first is true would be inaccurate in the direction that flatters the
executor.

Plan 45-18 instructs its executor to run the refusal instrument *«a third time,
under an authorisation for this sitting»*. The executor did not create one, and
put the question to the owner. **The owner chose not to spend it**, in these
terms: the pair was measured the day before under A2b, after the retirement, and
**nothing has moved since that could change it** — a fourth run would repeat a
measurement that is standing still, at the price of **disconnecting two real
identities everywhere** (the instrument revokes globally, which is what makes it
safe and also what makes it costly to a person who was signed in).

**The measurement that covers the criterion, with its date and the plan that
bought it:** the run of **2026-08-18, under A2b, by plan 45-09** —
`production_pipeline_rule` at **16 / 0 / 0** for the third consecutive
measurement, `production_space` at **184 / 0 / 0**, `production_space_attribute`
at **1840 / 0 / 0**. Both sessions minted there were revoked globally and each
revocation was re-read as `false`. That transcript, and not a run of 45-18, is
the evidence behind success criterion 4.

**What plan 45-18 measured instead, and it is the structural half:**
`pg_policies` was read on production, `read_only`, and returned **16 SELECT
policies** across the eleven production tables asking **four distinct keys**,
each section's tables asking that section's own — plus the register's brand-wide
arm, which is the single policy naming all four. That is criterion 1's structural
half and it is not criterion 4: a catalogue read proves a policy EXISTS and never
that it REFUSES.

**A note for whoever reads this ledger next.** A fifth measurement becomes worth
buying the moment one of these moves: a migration touching any `SELECT` policy on
a production table, a change to `ROLE_GRANTS`, or the first rows written into the
two authored sections' tables — which are still empty, so the instrument still
refuses on them honestly rather than passing.

**What was measured in that sitting instead, and it is the structural half:**
`pg_policies` was read on production, `read_only`, and returned **16 SELECT
policies** across the eleven production tables asking **four distinct keys**,
each section's tables asking that section's own — plus the register's brand-wide
arm, which is the single policy naming all four. That is criterion 1's structural
half and it is not criterion 4: a catalogue read proves a policy EXISTS and never
that it REFUSES.

**Why that run is also the control count, and not only a re-measurement.** D12
requires that the confirmation of a removal be asked of **a source other than the
one acted on**. The retirement was applied through the Management API's
migrations endpoint; this instrument reads through PostgREST with a real signed-in
JWT, which is a different door, a different protocol and — decisively — a path
that RLS actually governs. A count taken with the instrument that caused the
effect is an echo, and this one is not.

---

## How to read a step

- Steps are numbered and are executed **in the order written**.
- Every step names **the account it is performed as**. Where the account changes
  mid-procedure the change is a step of its own, because a step performed as the
  wrong account produces an observation about the wrong question.
- Each procedure ends with one result line, and every one of them reads *pending*
  today. Fill it with what was **observed** — a fact a second person looking at
  the same screen could confirm or deny. *"Access was blocked"* is not an observation. *"Redirected to
  `/dashboard`, and the address bar never showed `/admin/location`"* is.
- Where a step says **if it did not, that is the finding**, write what happened
  instead, verbatim. Do not retry until it passes.

---

## P1 — A holder of one section is refused the others

**What it closes.** Success criterion 1, and it closes it **manually because of a
decision, not because the tooling fell short.**

D-45-03 grants all four section keys to master **and** organizer. So **no subject
exists in production for whom this refusal happens** — there is nobody to ask.
D-45-23 forbids manufacturing one: granting a key to a role in production is an
access change, not a test row, and it would be measuring the system after
altering the thing being measured.

**Therefore this procedure runs in a THROWAWAY environment**, on an account made
by hand there, and it never touches production. What it can prove is that the
four doors are four doors. What it cannot prove is anything about production's
grants — those are read from the catalogue by `verify:capabilities`, and the two
statements must stay separate in the verification document.

**And the third level is the one that matters.** `capability-routes.ts` decides
where a redirect happens: it stops somebody **arriving** at a page, not
**reading** a row. `CLAUDE.md` Operating Principle 2 puts it as the project's own
rule — the middleware is UX, the policy is security — so a surface that redirects
while its rows stay readable by token is a surface that is exposed.

**As:** whoever runs the procedure, then a hand-made account holding **exactly
one** section key.

1. Stand up a throwaway environment carrying this phase's migrations. Confirm it
   is not production by reading the project reference back, and record that you
   did. A procedure that begins by assuming which database it is pointed at is a
   procedure that will eventually be pointed at the other one.
2. Create one account there and grant it **one** section key — the manifesto's.
   Record which key, and confirm the other three are absent rather than present
   and false: under this project's capability model a refusal is the **absence of
   a row**, and a row that says `false` would GRANT (`verify-capabilities.mjs`
   states the resolver and why).
3. Sign in as that account. Request each of the four section addresses in turn —
   the calendar, the location section, the manifesto, the visual system — and
   record for each whether it rendered or refused.
4. For every refusal, record **where it came from**: the middleware, the page
   guard, or the row-level policy. The criterion names the third, and a refusal
   that came only from the navigation not drawing a tab is not a refusal at all.
5. **Row level, and this is the step the criterion rests on.** With that
   session's **own access token** — not the service key, not the anon key alone —
   issue a read against each section's tables. Record **the counts only**, never
   a row. Expected: rows for the manifesto's table, nothing for the other three.
6. Repeat steps 3 to 5 as an account holding **all four** keys, so the procedure
   carries its own positive control. A refusal measured with no entitled
   comparison is a measurement that cannot tell a policy from an empty table —
   which is exactly what `verify:refusal` was built as a pair to avoid.
7. Write the observations into one table: four addresses × three levels × two
   accounts. **A blank cell is not a pass.**

Result: pending

> **DECLARED NOT RUN — 2026-08-18, by the owner. `pending` is the literal state
> and it stays.**
>
> **Why no agent could run it.** The procedure needs a subject holding exactly
> **one** section key. **D-45-03** grants all four keys to master *and* organizer,
> so **no such subject exists in production**; **D-45-23** forbids manufacturing
> one there, because granting a key to a role in production is an access change
> and not a test row — a criterion made green by altering the thing it measures is
> worse than an open criterion. The only lawful subject lives in a **throwaway
> environment**, and standing one up is an act nobody in this phase was asked to
> perform.
>
> **What the person who runs it must observe** — enough to execute without
> re-reading the phase:
>
> 1. **Which database you are pointed at**, read back from the project reference
>    and written down before anything else. Not assumed.
> 2. **That the other three keys are ABSENT, not present-and-false.** Under this
>    capability model a refusal is the **absence of a row**; a row saying `false`
>    would GRANT. Read `private.role_capabilities` and record the row count.
> 3. **For each of the four addresses, whether it rendered or refused** — typed
>    into the address bar, never clicked, because a link that was never drawn is
>    not a refusal.
> 4. **Where each refusal came from** — the middleware redirect, the page guard,
>    or the row-level policy. Distinguish them by what you see: the middleware and
>    the guard both land you on `/dashboard`, so the way to tell them apart is to
>    read which one fired first (the guard cannot run if the middleware already
>    redirected). **The criterion rests on the third.**
> 5. **The row counts read with that session's OWN access token** — not the
>    service key, not the anon key alone. Counts only, never a row. Expected: rows
>    for the manifesto's table, nothing for the other three.
> 6. **The same five observations as an account holding all four keys**, which is
>    the positive control. Without it a zero cannot be told from an empty table.
> 7. **One table: four addresses × three levels × two accounts. A blank cell is
>    not a pass.**
>
> And the sentence the result must carry, unsoftened: what this closes is *a
> viewer holding one section was refused the others **there**, in a throwaway
> environment, never in production.*

---

## P2 — The stage is visible wherever a space is named

**What it closes.** Success criterion 2, and the half `verify:section-surface`
cannot reach. Check A of that gate proves `StageBadge` is in the same tree as the
name. **Whether a person reads it as a stage rather than as decoration is not a
string.**

**Why it matters more than it sounds.** `venue-acquisition.md`: mapped, verified,
contacted and acquired are four different things, all 184 scouted records sit at
the first, and **nobody has been called.** A ranking read as an availability puts
a date in the calendar with nowhere to happen — and a name presented as a venue
is a negotiation made public, which does not come back.

**The reader must not have read this phase.** Somebody who knows the four stages
will find the badge because they are looking for it, and the observation is
worthless from that person.

**As:** whoever runs the procedure, with one reader who has read none of this
phase's documents.

8. Open the location section with rows at each of the four stages on screen at
   once. Confirm all four are visible before the reader arrives.
9. Ask, without explaining anything first: **"which of these could we hold a
   night in tomorrow?"** Say nothing else. Do not point. Do not define anything.
10. Record the answer **verbatim**, including hesitation and including any
    question the reader asks back. A question asked back is data.
11. Open one space's detail — **do not record what it says** — and ask the same
    question about that one space.
12. Record that answer verbatim. Then explain the four stages, and record which
    channel the reader says they had actually used: the badge, its wording, its
    position, or none of them.

> **A wrong answer here is the finding, not a failure of the reader.** The
> temptation is to explain and re-ask until the answer is right; doing so
> destroys the only measurement this procedure can make. Record which surface the
> reader was looking at when they answered — the list and the detail draw the
> stage differently, and one may carry it while the other does not.

Result: pending

> **DECLARED NOT RUN — 2026-08-18, by the owner. `pending` is the literal state
> and it stays.**
>
> **Why no agent could run it.** The measurement is **a person's first reading of
> a screen**, and it is only valid from **a reader who has read none of this
> phase's documents**. An agent that has just read the four stages will find the
> badge because it is looking for it, and an observation from that reader is
> worthless by construction. There is no assertion that substitutes: check A of
> `verify:section-surface` proves `StageBadge` is in the same tree as the name and
> says of itself that it stops there.
>
> **What the person who runs it must observe:**
>
> 1. **That rows at all four stages are on screen at once**, confirmed before the
>    reader arrives — otherwise the question has no discriminating answer.
> 2. **The reader's answer, verbatim**, to *«which of these could we hold a night
>    in tomorrow?»* — asked with nothing explained first, nothing pointed at.
>    **Including hesitation, and including any question asked back: a question
>    asked back is data.**
> 3. **The same, on one space's detail page** — the list and the detail draw the
>    stage differently, and one may carry it while the other does not.
> 4. **Which channel the reader says they actually used**, asked only after
>    explaining the four stages: the badge, its wording, its position, or none of
>    them.
> 5. **Which surface they were looking at when they answered.**
>
> **A wrong answer is the finding, not a failure of the reader.** Do not explain
> and re-ask until the answer is right: doing so destroys the only measurement
> this procedure can make. And the stake is domain, not cosmetics — a ranking read
> as an availability puts a date in the calendar with nowhere to happen, and a
> name presented as a venue is a negotiation made public, which does not come
> back.

---

## P3 — The void reads as declared, not as broken

**What it closes.** Success criterion 3. Check C of `verify:section-surface`
proves the `not_decided` branch names what is missing and whose call it is. **A
declared void and a failed load are the same bytes to a grep**, and the whole
difference is how the panel reads.

**Why the distinction is load-bearing here.** `sound-manifesto.md`: *non-scritto
e' una risposta, inventato non lo e'*. Two formats have no written manifesto and
one of them has no palette. If those sections read as broken, somebody fills
them — and a brand written by whoever was passing is exactly the failure the
gate exists to prevent. Saying *not yet decided* is the correct answer, and it
has to LOOK like an answer.

**As:** an account holding all four section keys.

13. Open a section in each of the three states in turn — written, coordinates
    declared, and not decided. Confirm all three exist before starting.
14. On the not-decided one, ask a reader who has read none of this phase:
    **"is anything on this screen wrong or missing?"**
15. Record the answer verbatim. Expected: the reader does not call it broken,
    failed, empty, or late. If the reader reads it as an error, that is a finding
    against the surface and not against the reader.
16. Ask the reader to say, from the screen alone, **what is missing and whose
    call it is**. Record whether they can, and record which words they used.
17. On the *coordinates declared* one, ask the same question at step 14. This is
    the state most likely to be mistaken for a half-finished *written*, and it is
    the one no automated check distinguishes at all.

Result: pending

> **DECLARED NOT RUN — 2026-08-18, by the owner. `pending` is the literal state
> and it stays.**
>
> **Why no agent could run it.** *Declared* and *broken* are **the same bytes to a
> grep** — check C proves every `not_decided` branch names `missing` and
> `decision_owner`, and says of itself that it cannot tell one from the other on a
> screen. The whole difference is a judgement, and it needs a reader who has read
> none of this phase, for the same reason as P2.
>
> **What the person who runs it must observe:**
>
> 1. **That all three states exist and are open in turn** — written, coordinates
>    declared, not decided — confirmed before starting.
> 2. **The reader's answer, verbatim**, to *«is anything on this screen wrong or
>    missing?»* asked on the **not-decided** one. **Expected: they do not call it
>    broken, failed, empty or late.** If they read it as an error, that is a
>    finding against the surface and not against the reader.
> 3. **Whether they can say, from the screen alone, WHAT is missing and WHOSE call
>    it is** — and the words they used.
> 4. **The same question on the *coordinates declared* one.** This is the state
>    most likely to be mistaken for a half-finished *written*, and **no automated
>    check distinguishes it at all.**
>
> Why the distinction is load-bearing rather than tidy: `sound-manifesto.md` —
> *non-scritto e' una risposta, inventato non lo e'*. Two formats have no written
> manifesto and one has no palette. **If those panels read as broken, somebody
> fills them**, and a brand written by whoever was passing is exactly what the
> gate exists to prevent. *Not yet decided* is the correct answer, and it has to
> LOOK like an answer.

---

## P4 — An unanswered attribute is a question nobody asked, and a format colour is not a palette

**What it closes.** Two judgements no assertion can hold, and they are put in one
procedure because they are the same shape: in both, the correct thing and the
wrong thing are identical to a grep and different to an eye.

**The first.** Five scouting attributes carry a *to verify* value per attribute
(D-45-11, measured in the source). **A blank cell and an unasked question are the
same pixel.** `venue-acquisition.md` calls the four questions the thing a phone
call closes, and the last of them — until what hour one may play — is the one
that screens out the most candidates. A screen that renders *not asked* as blank
reports ignorance as a negative, and a negative is what stops somebody calling.

**The second.** `formats.color` is `NOT NULL`, so every format carries an
identification colour, **including the one that has no palette**. Check D of
`verify:section-surface` says of itself that it is weak, and this is why: a
swatch at four pixels and a swatch at two hundred are the same source line. Size
is precisely what turns an identification colour into a palette, and
`brand-visual-system.md` is explicit that a format without a palette keeps its
materials neutral rather than borrowing one.

**As:** an account holding all four section keys, with a reader who has read none
of this phase.

18. Open a space carrying several attributes at *to verify*, alongside at least
    one attribute that was answered and one that is genuinely absent.
19. Ask the reader: **"which of these do we know, and which has nobody asked
    yet?"** Record the answer verbatim.
20. Record whether *not asked* and *absent* were distinguished. If they were not,
    that is the finding — and it is a finding about the surface, since the data
    already carries the distinction per attribute.
21. Open the visual section on **MotionLab**, which has no palette. Record
    whether the panel reads as *no palette yet* rather than as a palette.
22. Record **the size at which the identification colour is drawn**, in pixels,
    measured on the screen rather than read out of a class name. This number is
    the observation; everything else in this step is context for it.
23. Ask the reader: **"what are this format's colours?"** Expected: the reader
    says the format does not have any yet. If the reader names the identification
    colour, the swatch is doing the thing the whole decision was taken to prevent.

Result: pending

> **DECLARED NOT RUN — 2026-08-18, by the owner. `pending` is the literal state
> and it stays.**
>
> **Why no agent could run it.** Its central observation is **a size in pixels,
> measured on a screen** — and **no assertion in this repository can see size.**
> Check D of `verify:section-surface` says so of itself and calls itself weak: a
> swatch at four pixels and one at two hundred are **the same source line**, and
> size is exactly what turns an identification colour into a palette. Reading a
> number out of a class name is not the measurement; it is the thing the
> measurement exists to go around.
>
> **What the person who runs it must observe:**
>
> 1. **The reader's answer, verbatim**, to *«which of these do we know, and which
>    has nobody asked yet?»* — on a space carrying several attributes at *to
>    verify*, **alongside** at least one answered and one genuinely absent.
> 2. **Whether *not asked* and *absent* were distinguished at all.** If they were
>    not, that is the finding, and it is a finding about the surface: the data
>    already carries the distinction per attribute, so the screen lost it.
> 3. **On the visual section, on the format that has NO palette:** whether the
>    panel reads as *no palette yet* rather than as a palette.
> 4. **The size, in pixels, at which the identification colour is drawn** —
>    measured on the screen, not read out of a class name. **This number is the
>    observation; everything else in this step is context for it.**
> 5. **The reader's answer, verbatim**, to *«what are this format's colours?»*
>    **Expected: they say the format does not have any yet.** If they name the
>    identification colour, the swatch is doing the exact thing the decision was
>    taken to prevent.
>
> Domain stake on the first half: `venue-acquisition.md` calls the four questions
> the thing a phone call closes, and the last of them — until what hour one may
> play — screens out the most candidates. **A screen that renders *not asked* as
> blank reports ignorance as a negative, and a negative is what stops somebody
> calling.**

---

## Closing block

- **Nothing in P1, P2, P3 or P4 creates a row in production.** P1 runs entirely
  in a throwaway environment; the other three read screens.
- **A GREEN BUILD IS NOT A PROOF OF REFUSAL.** `npm run build` typechecks;
  `npm run verify` asserts that files agree with contracts; neither opens a
  session, and neither has an opinion about how a panel reads. It is the same
  shape as Phase 44's criterion 4, and it is why D-45-18 and D-45-19 exist: the
  first because a log line is a place nobody watches in a project with no error
  tracking, the second because the Management API connects with a role that
  **bypasses RLS** and can therefore prove a policy EXISTS and never that it
  REFUSES.
- **What this document does not close.** It says nothing about a screen at 2 a.m.
  on a staff phone, nothing about performance, and nothing about any section's
  content — by construction, because the content is exactly what may not travel
  into a tracked file in a public repository.
- **A pending Result is not a passed one.** Where a procedure is deferred, this
  phase's VERIFICATION.md must say *deferred*, and must say that deferred is not
  verified. The `[x]` on a roadmap box is a claim about evidence, and the
  evidence for these four is the `Result:` lines above.

### How this document ends, on 2026-08-18

**All four Results read `pending`, all four are declared NOT RUN, and the phase
was closed anyway — by the owner, knowingly.** That is written here rather than
inferred from a silence, because the two ways a phase can end with four pending
procedures look identical from the outside and are opposite in kind: one is a
decision, the other is a document nobody finished reading.

Three consequences, and none of them softens:

1. **The phase is closed. The criteria are not.** Criterion 1 has its structural
   half (the four keys, read from `pg_policies`) and **not** its refusal half;
   criteria 2 and 3, and the half of D-45-16 no assertion can hold, have
   **nothing** — no automated check in this repository was ever able to reach
   them, which is why these four exist at all.
2. **`pending`, and deliberately not `skipped` or `n/a`.** Those two words close
   a line; `pending` leaves it open. This is **declared debt**, and it is meant to
   still be legible to somebody opening this file months from now who was not in
   the room.
3. **Each procedure above now carries what its executor must observe**, written
   so it can be performed by another person without re-reading the phase. That
   was the point of declaring them rather than deleting them: **an unrun
   procedure that nobody can pick up is the same as no procedure.**

*Phase 45 — written on the date in the frontmatter. Contains no space, no
unannounced date, no line-up and no personal name. `re:sonate` is written with a
normal `e`.*
