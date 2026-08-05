---
phase: 31
slug: live-defects-at-the-door-and-the-bar
document: door-runbook
created: 2026-08-05
audiences: [staff working a night, whoever executes the verification pass in 31-13]
---

# Door Runbook

> Two audiences, one document. The staff working a real night read sections 1–3.
> Whoever executes the verification pass in plan 31-13 reads all seven.
>
> **This file names roles, never people.** `.planning/` is tracked in a public
> repository, so writing this file is publishing it. Section 7 says where the
> per-night specifics go instead, and why that is not negotiable.

---

## 1. The five questions

`checkin-offline.md` requires these five answered in writing before a night. They
are answered here as standing rules; the per-night fill-in — which physical
device, which account, which night — belongs in the uncommitted note described in
section 7.

**Which devices scan, and who holds them.** Two devices, never one. The primary is
held by a staff member assigned to the door and does the scanning. The second is
held by the person supervising the night, is already signed in, and is not used
unless the primary fails — it is the fallback, so it cannot be discovered to be
signed out at the moment it is needed. Both are installed as the app, not opened
as a browser tab: the two must produce two distinct `device_id` values, and a
second browser profile on the same phone does not.

**How the app is entered.** Each device is signed in ahead of the night with an
account holding the `organizer` or `master` role — the scanner surface is not
reachable by a `member`, whatever their status. Credentials are never written in
this file, never in `.planning/`, and never passed in a message thread. They are
entered on the device by the person who owns them, before leaving for the venue.

**What is done if the scanner fails entirely.** In order: switch to the second
device; if that also fails, the door falls back to admitting against the guest
list on the supervising person's screen and writing every admission down on paper
— name as given, time, and which of the two failed. Nobody is turned away because
the software is unavailable. The paper record is reconciled after the night; it is
slower than the app and it is not optional, because an unrecorded admission is
indistinguishable from no admission at all.

**Who decides at the door.** The person supervising the night, not the app and not
the staff member holding the phone. The app reports; a person decides. When the
system and a guest disagree, the decision and its reason are stated out loud to
the staff member so it lands in the paper record or the review list, and is not
carried only in someone's memory.

**The day-of check.** On the day, on each device, with the account it will use:
open the scanner, select the party, scan one known-good code, and confirm the green
screen and the vibration. Then turn the radio off and scan a second known-good
code, and confirm the same screen appears. This takes five minutes at home. The
same discovery — an expired session, a denied camera permission, a service worker
that did not update — takes ten minutes in front of a queue.

---

## 2. The asymmetry, for the person holding the phone

**Refusing a valid guest is worse than admitting a duplicate.** These are not
symmetric mistakes, and the app is built around that:

- A wrong refusal happens in front of a queue, needs a person to undo it, and
  ruins the night of somebody who paid.
- A wrong admission is a number to correct in a report the next day.

So when the information is uncertain — no signal, a state not yet synced — the
default is **admit and record**, never refuse.

**When the amber screen appears, the guest goes in.** Amber is the third outcome:
it states a fact — that this code was already recorded, at a time, by a role — and
it is not a verdict about the person in front of you. It does not say who is at
fault and it does not tell you to stop anyone. Let them through, and let the entry
be reviewed after the night, when nobody is standing in a doorway waiting.

---

## 3. The build rule

**Every offline step in this document runs against `npm run build && npm run start`,
or against a preview deployment, on a phone.** Never against a development server:
the service worker is disabled in development (`next.config.ts:13`), so a
development run measures a cache that does not exist and proves nothing. A
verification note that says "tested locally with the network off" without naming
the build mode has not verified anything.

The phrase to avoid is `npm run dev` — it is named here only so that it is
recognised and refused, never as an instruction.

> **Open blocker, recorded 2026-08-05, must be closed before any offline step
> below is treated as evidence.** `npm run build` does **not** currently emit
> `public/sw.js`. The project builds with Turbopack (the Next 16 default;
> `turbopack: {}` at `next.config.ts:17`) while the Serwist Next plugin is a
> webpack plugin: it prints a Turbopack-unsupported warning and emits nothing.
> Observed on this build: `public/sw.js` absent, and zero occurrences of
> `serviceWorker` anywhere in `.next/static`.
>
> The consequence for whoever runs the verification pass: an empty `apis` cache
> bucket does **not** prove the cache boundary works. It is equally consistent
> with there being no service worker at all — and today that is the likelier
> reading. Before recording any offline observation, first confirm a service
> worker is actually registered on the device (DevTools → Application → Service
> Workers must list one for this origin). If none is listed, stop: the offline
> behaviour being verified does not exist yet, and the night is running without
> it.

---

## 4. The six-scan sequence

Three outcomes, twice: once with the network on, once with the radio physically
off. Airplane mode on the device — not throttling in DevTools, and not a
disconnected laptop.

| # | Network | Code scanned | What must be seen |
|---|---------|--------------|-------------------|
| 1 | on | a valid, unused code | green, vibration, the guest counted |
| 2 | on | the same code again | amber, stating the time and the role that recorded it |
| 3 | on | a code this system never issued | red, refused, distinct from amber |
| 4 | off | a second valid, unused code | green, vibration, queued |
| 5 | off | the code from step 4, again | amber, stating a time and a role |
| 6 | off | a code this system never issued | red, refused |

**The point of running it twice is that the two halves must be identical.** Three
screens, the same three, in the same order, with the same wording. The repeat must
show a time and an operator **both** times — an amber that degrades to "already
scanned" with no detail when offline is a failure of this step, not a lesser
version of it.

Feedback fires locally, before any network round trip. If a screen waits on the
network before showing a colour, that is a defect to record even if the eventual
answer is right.

---

## 5. The two-device procedure

This produces the genuine offline duplicate — the case the sync has to detect
rather than silently resolve.

1. Two **installs on two devices**. Not two browser profiles: those do not produce
   two `device_id` values, and without two device ids the `two_devices`
   classification cannot happen at all.
2. Both devices signed in, both with the same party selected.
3. Take both offline — radio off on each.
4. Scan the **same** ticket on device A. Wait some minutes. Scan it on device B.
5. Bring device A back online. Wait for its queue to drain. Then bring B online.
6. Read the result: one recorded arrival, one entry in the review list classified
   as `two_devices`, and no queue entry silently dropped.

Record which device was A, the gap in minutes, and the order of reconnection. All
three change what the sync sees, so an observation without them cannot be compared
against the next one.

---

## 6. The four seeded conflict causes

All four are produced on one night, deliberately, so the review list can be judged
against real rows rather than described:

1. **A double read** — the same operator, the same device, the same code, seconds
   apart. This is the scanner reading twice, not a conflict: it must be *absent*
   from the review list and *present* in the counter.
2. **A second unused ticket held by the same buyer** — one person, two tickets,
   both valid. Not a duplicate; it must not be classified as one.
3. **Two devices, minutes apart** — the procedure in section 5.
4. **A code this system never issued** — an invalid signature. It is refused at the
   door, and it must also surface when the network returns.

Expected shape: three rows in the review list, the double read absent from it and
counted separately. Write down what actually appeared, including the classification
each row was given.

---

## 7. What cannot live in this file

`.planning/` is tracked in a **public** repository. Committing this file publishes
it, and a publication is irreversible: it survives in forks, mirrors and history
long after any deletion.

So the following never appear here, in any section, in any example:

- the name of any person — staff, member, or guest; roles only
- credentials, tokens, recovery codes, or the email address of any account
- which physical device is used, and its identifiers
- the venue, and anything that locates it
- the date of the night

Those go in an **uncommitted note under `docs/`**, which is ignored by git and
verified to stay ignored. Fill that note in before the night, keep it off this
repository, and delete nothing from this file to make room for it.

**This rule is stated here on purpose**, so the next person filling the runbook in
does not have to rediscover it — and does not discover it by pushing it.
