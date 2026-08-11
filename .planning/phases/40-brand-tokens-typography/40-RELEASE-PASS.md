---
phase: 40-brand-tokens-typography
written: 2026-08-11
status: all pending
closes: ROADMAP criterion 4 (the home-screen half — DS-06), ROADMAP criterion 5 (DS-10)
batch: the end-of-v1.5 human sitting, alongside `38-PROCEDURES.md` and `39-DOOR-PASS.md` — not a second sitting
devices: two — one of them the actual staff phone, and at least one on which the app is NOT yet installed
accounts: one staff account holding `door.operate` for the night; roles, never names
requires: a shipped release, and a radio that can be switched off
phase_closes: not before this document is filled in
---

# Phase 40 — The Release Pass

> **(a) Every `Result` below is empty and reads `pending`, and an empty Result is an
> UNRUN procedure** — never a verified-by-inspection in disguise. Three of the four
> claims here cannot be reached from the repository at all: they need a device, a
> shipped release and a radio that is off. A tick nobody earned is worse than an
> empty line, because it closes a phase.
> **(b) Roles, never names:** this repository is public and `.planning/` is tracked, so
> a person here is *a staff account holding `door.operate` for the night* — never a
> name, never a shift, never who was actually there. No venue, no night's date and no
> line-up appears anywhere in this file.
> **(c) This document is written BEFORE the release it tests.** A procedure
> reconstructed afterwards is a memory, not a measurement — and H3 in particular
> cannot be reconstructed, because its first step happens before the release exists.
> **(d) It joins the end-of-v1.5 sitting** that already absorbs `38-PROCEDURES.md` and
> `39-DOOR-PASS.md`. It does not invent a second sitting, and where a phone is shared
> with `39-DOOR-PASS.md` §8, read that document's §0.4 first: `skipWaiting` and
> `clientsClaim` replace the WORKER, and from Phase 40 onward the activate purge
> replaces the document BUCKETS — a measurement taken without knowing which worker is
> active reports on code that is no longer running.

---

## How to read a step

- Steps are numbered and are executed **in the order written**.
- Each step ends with a `Result: pending` line. Fill it with what was **observed**, and
  with the wall-clock time asked for beside it.
- An observation is a fact a second person standing beside the device could confirm or
  deny. *"It looked right"* is not an observation; *"the label under the icon read
  `re:sonate`, iOS 18.4, fresh install"* is.
- Where a step says **that is the finding**, write what happened instead, verbatim.
  **Do not retry until it passes.**
- Nothing in this pass creates a row in production. See the closing block.

---

## §0 — Preconditions, read ON THE DAY

### §0.1 The deployed build under test is the one intended

1. Read the build id **off the page**, in the browser. Do not assume it from a commit.
2. Record the build id and the wall-clock time.

Result: pending

### §0.2 The active service worker is the new one

1. DevTools → Application → Service Workers.
2. Record the **script URL** of the active worker, verbatim, and whether it is the
   worker shipped by the release under test.

> Why: from this phase onward the worker carries an `activate` purge of the three
> document buckets. A reading taken against the previous worker measures the defect
> this phase closed, not the behaviour it introduced.

Result: pending

---

## H1 — The installed app name [ROADMAP criterion 4, home-screen half · DS-06]

**This step gets one attempt per device — one attempt per phone — and the constraint
is part of the procedure, not a footnote.** On iOS **no** manifest field updates after
installation. On Android
`name` and `short_name` are **not** among the fields that trigger an update. Once the
app is installed the before-state is gone and cannot be recovered without uninstalling.

**An existing install keeps the old label, and that is NOT a failure of this change.**
A criterion an existing install could fail must not be written, so this step is
performed on a device where the app is **not yet installed** — or on one from which it
has been deliberately uninstalled first, which is itself the spending of that device's
single attempt.

1. Confirm the app is **not installed** on this device. If it is, either use another
   device or record that the attempt for this device is being spent by uninstalling.
2. Install the app to the home screen from the release under test.
3. Read the label under the icon. It must read `re:sonate` — normal `e`, lower case,
   with the colon.
4. Record: the label **verbatim**, the platform, the OS version, whether the install
   was **fresh**, and the wall-clock time.

> What a pass here does **not** mean: DS-06's own word is *everywhere*, and 25 further
> `Resonate` literals remain in the product — the Wallet pass, the payment sheet's
> merchant name, and every email subject, body and footer, whose `From` name is an
> environment value no commit can change. A tick here closes the home-screen half of
> criterion 4 and nothing more.

Result: pending

---

## H2 — The splash screen [ROADMAP criterion 4 · DS-06]

`background_color` **is** in Android's update list, so on Android this can be observed
on an existing install. On iOS it needs the reinstall H1 already performed — so on iOS,
**run this in the same minute as H1, on the same phone**, or the attempt is spent.

1. Launch the installed app **from the home screen** — the icon, not a browser tab.
2. Watch the **first** frame.
3. It must be `#0A0712`, the product's ground, and not the previous near-black
   `#0a0a0a`. The two are close enough that this is a comparison, not a glance: if
   there is any doubt, record the doubt rather than a verdict.
4. Record: the platform, whether the install was fresh or existing, what the first
   frame looked like, and the wall-clock time.

Result: pending

---

## H3 — The version boundary at the door [ROADMAP criterion 5 · DS-10]

> **This is the only proof DS-10 will ever have.** No script can stand in for it: it is
> a device, a release, and a radio that is off. The code shipped in plan 40-05 is in
> place and is **not** evidence that it behaves — this section is.

**Device** — the actual staff phone that would be used at an entrance, with the app
installed to the home screen. Not a simulator, not a desktop.
**Role** — a staff account holding `door.operate` for the night.

The five steps run **in order**, across a release, and each carries its own `Result`.

### H3.1 Warm the door, online, before the release

1. On that phone, **online**, open `/door`.
2. Confirm it rendered **fully styled** — the ground is the dark violet-black, not a
   white or unstyled page.
3. Record the wall-clock time and what was observed.

> This step happens **before** the release ships. It cannot be performed afterwards,
> which is the whole reason this document is written in advance.

Result: pending

### H3.2 Ship a release

1. Ship a release that changes at least one style, so the stylesheet's content hash
   changes and the previous stylesheet leaves the precache. A release with no style
   change does not exercise the boundary.
2. Record the deploy wall-clock time and the new build id.

Result: pending

### H3.3 Return within 24 h, with the radio off

1. Return to the phone **within 24 h** of H3.1 — outside that window the runtime
   cache has expired by itself and the measurement is about expiry, not about the
   release boundary.
2. Switch the radio **off**: aeroplane mode, not merely a weak signal and not merely
   Wi-Fi off. **Record which**, verbatim — this is the step most easily done by halves.
3. Record the wall-clock time.

Result: pending

### H3.4 Open the door, and record which of exactly three things happened

1. Launch the app from the home screen and reach `/door`.
2. **It renders fully styled, or it does not render at all. It never renders unstyled,
   never renders half, and never reloads itself.**
3. Record **which** of those happened, verbatim, plus the wall-clock time.
4. **Read the bucket list, not a log.** With the device inspected from a desktop
   (Safari Web Inspector or Chrome DevTools → Application → Cache Storage), record
   **which of `others`, `pages`, `pages-rsc`, `pages-rsc-prefetch` are present** after
   the activation.

   > This step is read from Cache Storage and never from console output, and the
   > reason is mechanical: `caches.delete` on a bucket that does not exist resolves
   > **`false`**, not a rejection. The purge can therefore resolve
   > `[false, false, false, false]` and be indistinguishable from success. A boolean
   > nobody reads is not observability, and in a project with **no error tracking** a
   > log is a place nobody looks. The bucket list is a source other than the one that
   > performed the action — which is the only kind of confirmation that counts.
   >
   > `others` is the bucket that matters. `pages` is expected to be **absent even
   > before the purge**: Serwist's `pages` rule matches on the *request's*
   > `Content-Type`, which a GET navigation does not have, so documents land in
   > `others`. Its presence in the purge list is forward-looking, not load-bearing.

> **How to read the outcome, decided in advance so the reading is not negotiated after
> the fact:**
>
> - **Rendered fully styled** — pass.
> - **Did not render at all** — **also a pass.** It is the accepted cost, recorded in
>   `sw.ts` beside the listener and in D-40-13: after a release the first open of any
>   page must be online, and the remedy is the runbook's online warm-up
>   (`checkin-offline.md:57`), which every night already requires.
> - **Rendered unstyled, or half** — **failure of DS-10.** Write it as-is.
> - **Reloaded itself** — **failure of D-40-11**, and the more serious of the two,
>   because a page that reloads during a scan tears down the camera, the selected
>   party and the in-memory undo list. Write it as-is; do not retry until it passes.

Result: pending

### H3.5 The queue survived — with the radio still off

1. **Without switching the radio back on**, check that a scan queued before the release
   is still present in the door's queue.
2. Record what was found, and the wall-clock time.

> Why this step exists and why it is here rather than reasoned about: the purge deletes
> three **Cache Storage** buckets, while the door's queue lives in **IndexedDB**
> (`src/lib/offline/`) — a different storage API a Cache Storage purge cannot reach.
> That is the claim, and this is the only place it is ever **observed**. It is
> T-40-25's third and last mitigation; the other two are greps, and a grep cannot see a
> queue.

Result: pending

---

## H4 (optional) — Inter resolves `tnum`

**Skip unless free**, and the reason is recorded here rather than left looking like an
omission: it is **moot for DS-05**, because the data role is mono and its figures align
by construction. This is a curiosity about the interface face, not a requirement.

1. DevTools on a figure column rendered in the interface face.
2. Inspect `font-feature-settings` / the computed numeric variant.
3. Record what was found.

Result: pending

---

## §9 — Results

One row per observation. Every `Result` cell reads `pending` until the sitting fills it.

| § | Observation | What it closes | Result | Wall-clock time |
|---|---|---|---|---|
| §0.1 | the deployed build id, read off the page | precondition — all | pending | |
| §0.2 | the active worker's script URL, and that it is the release under test | precondition — H3 | pending | |
| H1 | the label under the icon, verbatim, on a **fresh** install; platform and OS version | criterion 4, home-screen half (DS-06) | pending | |
| H2 | the first frame at launch — `#0A0712` and not the previous black | criterion 4 (DS-06) | pending | |
| H3.1 | `/door` warmed online, fully styled, before the release | precondition — criterion 5 | pending | |
| H3.2 | the release shipped, with at least one style changed | precondition — criterion 5 | pending | |
| H3.3 | returned within 24 h, radio off — aeroplane mode or otherwise, stated | precondition — criterion 5 | pending | |
| H3.4 | which of the three outcomes happened, verbatim, and which document buckets survived | **criterion 5 (DS-10)** | pending | |
| H3.5 | a queued scan still present, radio still off | T-40-25 (the IndexedDB boundary) | pending | |
| H4 | `tnum` on a figure column in the interface face | optional — moot for DS-05 | pending | |

---

## Closing block

### What this pass creates in production: nothing

H1 and H2 read a label and a frame. H3 opens a page the staff device already opens on
any night, and its fifth step **reads** the queue without draining or clearing it. No
row is created, and **if any step ever finds itself needing to create one, it has
drifted** — this project lost 63 production rows across seven tables to a verification
script, with no PITR, and the authorisation to write to production is an act that is
spent once and recorded, not a standing permission.

### One attempt per phone, and how to spend it well

H1 and, on iOS, H2 are single-shot per device. Read both procedures **before**
installing anything, and run them in the same minute on the same phone. A second phone
is listed in the frontmatter for exactly this reason: it is the only way to get a second
fresh install without destroying the first observation.

### Scheduled is not verified

Until every `Result` above is filled in, **DS-06's home-screen half and DS-10 are
`human_needed`**, and no VERIFICATION document, no green gate and no build may say
otherwise. `npm run build`, `verify:tokens`, `verify:semantic-separation` and
`verify:sunset-gradient` prove the **files**; they prove nothing about a label on a
home screen or a door in a dark room with the radio off.

The phase is *executed* when the code ships. It is *complete* when this document is
filled in.
