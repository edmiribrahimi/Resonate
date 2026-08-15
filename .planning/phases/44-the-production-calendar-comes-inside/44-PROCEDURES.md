---
phase: 44-the-production-calendar-comes-inside
written: 2026-08-15
status: all pending
closes: PROD-01 criterion 3, PROD-01 criterion 4, D-44-06, and the three venue-secrecy decisions 44-12 wrote but did not prove
carries: 44-12-SUMMARY.md parts A and B (into P4) and parts C and D (into P3), verbatim in substance
accounts: five — master, organizer approved, organizer pending (seeded by hand), staff assigned to the door, plain member approved; roles, never names
authorisation: P1, P2 and P4 read only. **P3 WRITES TO PRODUCTION and needs its own dated authorisation** — it may not ride along with the others
phase_closes: not before every Result below carries an observation
---

# Phase 44 — The Procedures

> **(a) Every `Result` below reads `pending`, and a pending Result is an UNRUN
> procedure** — never a verified-by-inspection in disguise. A table of ticks
> nobody earned is worse than an empty table, because it closes a phase. This
> project has the precedent: a roadmap box went `[x]` on a phase whose only open
> point was that it was not yet proved.
>
> **(b) Roles, never names.** `.planning/` is tracked and this repository is
> PUBLIC. A person here is *the account holding `production.read` by the master
> role*, *an organizer account in status `pending`*, *an account assigned to the
> door for a night*. Never a name. And **no venue, no night's date and no
> line-up appears anywhere in this file** — a step says *open the calendar and
> read the first row*, never what that row says.
>
> **(c) Why these four and not more.** Everything else in this phase has a
> command. These are the four things **no command in this repository can
> settle**, and the reason is the same for all of them: nothing here opens a
> session. `verify:routes` reads declarations. `verify:calendar-surface` reads
> files. `verify:capabilities` reads rows — **through the Management API, which
> connects with a role that BYPASSES RLS**, so its read-back proves the six
> policies EXIST and never that they REFUSE. P1 is the first evidence of a
> refusal that will exist anywhere in this project.
>
> **(d) P3 is separated on purpose.** It writes to production and creates
> something the public may see. It carries its own authorisation line, its own
> snapshot, and a removal by primary key. It does not run in the same sitting as
> the others unless that sitting was authorised for it by name.

---

## How to read a step

- Steps are numbered and are executed **in the order written**.
- Every step names **the role it is performed as**. Where the role changes
  mid-procedure the change is a step of its own, because a step performed as the
  wrong account produces an observation about the wrong question.
- Every step ends with a `Result: pending` line. Fill it with what was
  **observed** — a fact a second person looking at the same screen could confirm
  or deny. *"Access was blocked"* is not an observation. *"Redirected to
  `/dashboard`, address bar never showed `/admin/calendar`"* is.
- Where a step says **if it did not, that is the finding**, write what happened
  instead, verbatim. Do not retry until it passes.
- **P1, P2 and P4 create nothing.** P3 does, and says so at every step.

---

## P1 — Criterion 4, with real roles and at three levels

**What it closes.** *Is the calendar refused to somebody the capability model
does not admit?* Criterion 4 names **three readers of one declaration** — the
middleware, the page guard, and the row-level policy — and asks whether they
refuse the same person. Nothing automated in this repository can ask it.

**Why the third level is the one that matters.** `src/lib/routes/capability-routes.ts`
decides where a redirect happens: it stops somebody **arriving** at a page, not
**reading** a row. The boundary on the data is the six policies in
`20260815120100_production_calendar_access.sql`. Plan 44-07 read those policies
back through the Management API, which connects as a role that **bypasses RLS** —
so that read said the policies exist and said nothing at all about a refusal.
Steps 4, 8, 12, 16 and 20 below are the first measurement of the boundary
itself.

**The five accounts.** `master` and `organizer` are the two grants
(`20260815120100_production_calendar_access.sql:109,114`), both with
`requires_approved = false`, which is D-44-27 and the owner's call. `member` and
`staff` are refusals — nothing grants them. The pending organizer is the account
that tests whether the flag the owner chose behaves as chosen.

### P1.0 — Preconditions, read ON THE DAY

**As:** whoever runs the procedure.

1. Confirm the deployment under test carries the phase-44 commits: the staff
   navigation shows a `Calendar` tab when signed in as master.
2. Record the five accounts to be used, **by role and status only**, and confirm
   each can sign in. The pending organizer is seeded by hand — an organizer row
   with `status = 'pending'` — because no signup path creates one any more, and
   that closed path is the bet D-44-27 rests on.
3. Record the wall-clock time. A precondition read yesterday is a memory, not a
   precondition.

Result: pending

### P1.1 — The master

**As:** the account holding `production.read` through the `master` role.

4. Sign in. Request `/admin/calendar`. Observe: the page renders, and the
   address bar still reads `/admin/calendar`.
5. Open the first row in the list — **do not record what it says** — and observe
   `/admin/calendar/<id>` renders.
6. Confirm the `Calendar` tab is drawn in the staff navigation.
7. **Row level.** With this session's **own access token** (not the service key,
   not the anon key alone), issue a PostgREST `SELECT` against `production_plan`
   — `Authorization: Bearer <this session's token>`, `apikey: <anon key>`.
   Observe rows are returned. Record **the count only**, never a row.

> Expected: admitted at all three levels. A refusal here is a finding, and it is
> the more serious direction — it means the surface is unusable by the one role
> that certainly should hold it.

Result: pending

### P1.2 — The approved organizer

**As:** an `organizer` account in status `approved`.

8. Sign in. Request `/admin/calendar`. Observe whether the page renders.
9. Request `/admin/calendar/<id>` for the same id used in step 5. Observe.
10. Observe whether the `Calendar` tab is drawn.
11. **Row level.** Repeat step 7 with this session's own token. Observe whether
    rows return, and record the count only.

> Expected: admitted at all three levels.

Result: pending

### P1.3 — The pending organizer

**As:** an `organizer` account in status `pending`, seeded by hand.

12. Sign in. Request `/admin/calendar`. Observe.
13. Request `/admin/calendar/<id>`. Observe.
14. Observe whether the `Calendar` tab is drawn.
15. **Row level.** Repeat step 7 with this session's own token. Observe.

> Expected: **admitted**, because `requires_approved` is `false` on the
> organizer grant. That is D-44-27, and it is the owner's decision, not an
> oversight. **If the verdict is a refusal, that is the finding** — it means the
> flag the owner chose is not the flag the system applies, and the divergence is
> the thing to record, not to reconcile in your head.
>
> Record the three verdicts separately even when they agree. Three readers
> agreeing is the observation; one summary sentence is not.

Result: pending

### P1.4 — The account assigned to the door

**As:** a `staff` account **assigned to the door for a night**. This is the
account the whole procedure exists for.

16. Sign in. Confirm this account can reach the door — it holds `door.operate`
    for a night — so that the refusal below is about the calendar and not about
    a broken account.
17. Request `/admin/calendar`. Observe the refusal: where it lands, and whether
    the calendar's content was ever on screen, even for a frame.
18. Request `/admin/calendar/<id>` directly, by typing the address. Observe.
19. Observe that the `Calendar` tab is **not** drawn — and note that this
    observation proves nothing on its own. Hiding a tab is not protecting a
    route (`staff-tabs.ts:20-28`); it is step 20 that carries the weight.
20. **Row level.** Repeat step 7 with this session's own token. Observe whether
    rows return.

> Expected: refused at all three levels, and **step 20 is the one that matters**.
> A redirect with rows still readable by token is a surface protected by a
> redirect, which `CLAUDE.md` Operating Principle 2 calls exposed. If rows
> return here, **stop the procedure and record it as a blocker** — this surface
> holds unannounced dates and spaces under negotiation, and that is not a defect
> to finish the sitting around.

Result: pending

### P1.5 — The plain member

**As:** a `member` account in status `approved`.

21. Sign in. Request `/admin/calendar`. Observe.
22. Request `/admin/calendar/<id>`. Observe.
23. **Row level.** Repeat step 7 with this session's own token. Observe.

> Expected: refused at all three levels.

Result: pending

### P1.6 — The verdict table

24. Write the fifteen observations into one table — five roles × three levels —
    and state, in one sentence, whether the three readers refused the same
    people. **A blank cell is not a pass.**

Result: pending

---

## P2 — Criterion 3, and it is a judgement rather than a measurement

**What it closes.** *Does a proposed date read as settled?* `44-UI-SPEC.md` §7
calls this **the phase's highest-risk display decision**, and §15 says plainly
that it is the one thing only a person can settle. The whole of §7 — the word
`Proposed`, the muted ink register, the dashed leading rule, the five-variant
union — exists to make the answer obvious. This procedure asks whether it did.

**The reader must not have read the spec.** Somebody who has read §7 cannot
un-know the three channels, and will find them because they are looking for
them. The observation is worthless from that person.

### P2.1 — The sitting

**As:** whoever runs the procedure, with one reader who has **not** read
`44-UI-SPEC.md` and has not been briefed on this phase.

25. Sign in as master and open `/admin/calendar`, then a night that has at least
    one written piece date and at least one proposed one. Confirm both are on
    screen at once before the reader arrives.
26. Show S1 — the calendar list. Ask, without explaining anything first:
    **"which of these dates are decided, and which are not?"** Say nothing else.
    Do not point. Do not define "decided".
27. Record the answer **verbatim**, including hesitation and including any
    question the reader asks back. A question asked back is data.
28. Show S2 — one night, with its pieces. Ask the same question again.
29. Record that answer verbatim.
30. Only now, explain the distinction, and record what the reader says about
    which channel they had actually used — the word, the ink, the dashed rule,
    or none of them.

> **A wrong answer here is the finding, not a failure of the reader.** Write it
> down as it happened. The temptation is to explain and re-ask until the answer
> is right; doing so destroys the only measurement this procedure can make.
>
> Record which surface the reader was looking at when they answered, because S1
> and S2 draw the distinction differently and one of them may carry it and the
> other not.

Result: pending

### P2.2 — The state that must not look like an error

31. On the same screen, find a piece in the *waiting for an edition* state — the
    rule behaving correctly when the next edition is not in the calendar. Ask
    the reader: **"is anything on this row wrong or missing?"**
32. Record the answer verbatim.

> Expected: the reader does not call it missing, late, incomplete or broken.
> `44-UI-SPEC.md` §7 states that requirement in those words. If the reader reads
> it as an error, that is a finding against the surface.

Result: pending

---

## P3 — The announcement act, end to end

> ## ⚠ THIS PROCEDURE WRITES TO PRODUCTION
>
> It creates a container and a night, and it spends a series progressivo — which
> is one of this project's three **monotone guards**: a number, once assigned, is
> already on a poster, so it is added in the tail and never renumbered.
>
> **It needs its own authorisation, given on the day, naming this procedure.**
> An authorisation to run the other three does not cover this one
> (`ai-engineering.md`, *gate l'autorizzazione a scrivere in produzione e' un
> atto, non un permesso*). Write the authorisation and its date into P3.0 before
> step 34, and write down when it was spent.
>
> **The removal at the end is by PRIMARY KEY, from a list captured before the
> write, and never by clicking a delete control on a page.** This is not
> caution: on 2026-08-10 a verification removed rows by walking up the DOM from a
> title, matched every delete control on the page, and destroyed two real
> production events and **63 rows across seven tables** — of which the 63 were
> not recoverable, because this project has no point-in-time recovery. A
> selector by primary key that is wrong finds nothing. A selector by interface
> that is wrong finds everything.

**What it carries.** `44-12-SUMMARY.md` specified parts C and D for this
document. They are carried below rather than rewritten, with the anonymous
public read added — the observation that decides whether the venue stayed
secret, which is the one thing 44-12 wrote and explicitly did not prove.

### P3.0 — Authorisation and snapshot

**As:** whoever runs the procedure.

33. Write here the owner's authorisation for **this procedure**, with its date.
    If it is absent, stop: there is nothing to do at this step but obtain it.
34. **Enumerate the cascade by reading the constraints**, not by remembering it:
    list every table reachable from `events` and from the night table by a
    foreign key declared `ON DELETE CASCADE`. Snapshot **all of them**, not only
    the two you intend to touch. The 2026-08-10 snapshot covered events and
    nights — which is why those came back — and not the seven tables hanging off
    them, which did not.
35. Capture, **before any write**: the series' current `highest_assigned`, and
    the full id list of `events` and of the night table. This list is the only
    thing the removal in step 47 is allowed to consult.
36. Record the wall-clock time.

Result: pending

### P3.1 — The refusal on the stage (44-12 part C)

**As:** an `organizer` account in status `approved`.

37. Open a night whose `venue_stage` is **not** `acquired`. Press
    `Announce this night`.
38. Observe the dialog: it names **the stage** and never a space. Confirm no
    venue word appears anywhere in the dialog, in the page title, or in a
    tooltip.
39. Observe that `Announce` is **inert** — it cannot be pressed.
40. Confirm nothing was written: no new row in `events`, none in the night
    table, and `highest_assigned` unchanged from step 35.

> This is the venue-secrecy answer the owner gave in 44-12, observed rather than
> assumed. If a night at a stage below `acquired` **can** be announced, that
> contradicts the decision and is the finding.

Result: pending

### P3.2 — The four body parts

**As:** the same organizer.

41. Set the stage to `acquired` on **one** night, by hand, recording the id.
    Open the dialog again and read **all four body parts** before pressing
    anything.
42. Observe that the open checklist items are **named, not counted**. A count is
    a number somebody has to go and look up; a name is the thing itself.
43. Observe that the sentence about the series number is present, and that it
    says the number cannot be given back.
44. Observe that what part 1 says about the venue matches the owner's decision
    recorded in 44-12 — that the space is not carried across and no address is
    written.

Result: pending

### P3.3 — The write, and what it created (44-12 part D)

**As:** the same organizer.

45. Press `Announce`, and confirm. Observe the outcome panel: the night exists,
    it is **unpublished**, and its number is spent.
46. Read the created night directly: `venue_secret` is `true`, `venue_id` and
    `venue_text` are null, `venue_reveal_on_purchase` is **`false`** against a
    column default of `true`, and the title carries **no venue word**.
47. Read the container: `is_published` is `false`.
48. Read the plan row: `linked_party_id` is set to the created night.
49. Re-read the series' `highest_assigned`. Observe it has **risen** and has not
    fallen. A fall is a monotone-guard violation and is a blocker, not a finding.
50. Confirm the confirmation text shown on screen **never names the venue**.

Result: pending

### P3.4 — The anonymous read, which is the observation that matters most

**As:** **no session at all.** A fresh private window, no cookie, signed out.

51. Request the public event page for the night just created. Record what is
    and is not readable: whether the night appears at all, and whether any
    venue word, address or map link is present.
52. Request `/events` signed out. Confirm the night is not listed.

> Expected: nothing about the venue is readable, and an unpublished night is not
> listed. **If any address is readable, stop and treat it as a blocker**: a venue
> revealed cannot be un-revealed — the mail has gone, the screenshot exists — and
> the correct next action is to remove the rows (step 54) before anything else.

Result: pending

### P3.5 — The second press

**As:** the same organizer.

53. Press `Announce` on the **same** plan row a second time. Observe it is
    refused, and record **the reason code it gives**. Re-read
    `highest_assigned` and confirm **no second number was spent**.

Result: pending

### P3.6 — The removal

**As:** whoever runs the procedure.

54. Remove **only** the rows created in this procedure, **by the primary keys
    captured in step 35**, computed as the difference between the id lists then
    and now. Never by a control on a page, never by title, never by walking up
    from an element.
55. Confirm the removal from **a source other than the one you acted on**: you
    deleted by key against the database, so confirm the count in the interface.
    A measurement taken with the instrument that caused the effect is an echo,
    not a measurement.
56. Restore the plan row's `venue_stage` to the value recorded in step 41, and
    clear `linked_party_id`.
57. Record that the authorisation from step 33 is now **spent**, with the time.

> **`highest_assigned` is NOT rolled back**, and must not be. The number was
> spent; a monotone guard moves forward only. The next announcement takes the
> next number and the gap is the record that this procedure ran.

Result: pending

---

## P4 — The tick, and the refusal that is not a failure

**What it closes.** The other write path, and the one place where two different
facts could collapse into one sentence — the shape this repository has already
paid for once, in a newsletter form that answered a network fault, a missing key
and a duplicate address with the same words.

**It creates nothing durable.** A tick is set and unset on an existing checklist
item; no row is created and no number is spent. It does not need P3's
authorisation.

### P4.1 — The tick, as an approved organizer (44-12 part A)

**As:** an `organizer` account in status `approved`.

58. Open `/admin/calendar`, then a night with at least one checklist item.
59. Observe that the read-only notice is **gone** and the boxes are operable.
60. Tick an item. Observe: the box stays ticked, the `Late` mark — if there was
    one — clears, and the author line appears carrying **this account's own**
    name.
61. Untick the same item. Observe the author line disappears with the tick.
62. Re-tick it. Observe the author is re-recorded.
63. Read the item in the database: `ticked_by` and `ticked_by_name` name the
    account that pressed, and are not null.

Result: pending

### P4.2 — The tick, refused (44-12 part B)

**As:** the `staff` account assigned to the door — the same account as P1.4.

64. Reach `/admin/calendar/<id>` with that session. Observe the redirect: the
    page is not reached at all.
65. Invoke the tick action directly against the deployment with a forged body.
    Observe it is refused.
66. Observe that the response carries **no database sentence** — no constraint
    name, no table name, no SQL text. A refusal that quotes the database tells
    the caller the shape of what it is guarding.

Result: pending

### P4.3 — The two sentences that must stay two

**As:** a role that does not hold the key.

67. Attempt the tick and read the message. Observe it says **you do not have
    permission** — and **not** *it did not save*.

> These are two different facts with two different next steps: one means ask for
> the key, the other means press again. A single message covering both sends
> somebody to press again forever. **If the two have collapsed into one
> sentence, that is the finding**, and it is the specific regression this step
> exists to catch.

Result: pending

---

## Closing block

- **Nothing in P1, P2 or P4 creates a row in production.** P3 does, under its
  own authorisation, and removes what it created by primary key.
- **What this document does not close.** It says nothing about a screen at 2 a.m.
  on a staff phone, nothing about performance, and nothing about any night's
  content — by construction, because the content is exactly what may not travel
  into a tracked file in a public repository.
- **A pending Result is not a passed one.** Where a procedure is deferred, the
  phase's VERIFICATION.md must say *deferred*, and must say that deferred is not
  verified. The `[x]` on a roadmap box is a claim about evidence, and the
  evidence for these four is the `Result:` lines above.

*Phase 44 — written 2026-08-15. Contains no venue, no unannounced date, no
line-up and no personal name. `re:sonate` is written with a normal `e`.*
