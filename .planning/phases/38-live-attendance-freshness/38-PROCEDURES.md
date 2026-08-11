---
phase: 38-live-attendance-freshness
plan: 01
written: 2026-08-11
executed_by: plan 38-07
status: all pending
mechanical_preconditions_run: 2026-08-11T11:49Z
---

# Phase 38 — Door Procedures P1 … P7

> **A procedure written after the observation is a description, not a check.**
> That is the whole reason this file exists in wave 1, before a single line of
> SQL or TSX of this phase has been written. Seven of the phase's requirements
> end at a phone, a pocket, a queue or a session this repository cannot mint;
> there is no test runner for the product, so these procedures are not a
> supplement to the evidence — for LIVE-01 through LIVE-06 they *are* the
> evidence.
>
> **Roles, never names.** This repository is public and `.planning/` is tracked,
> so every line here is a publication. A person is *an account holding
> `door.operate` for that night* — never a name, never a shift, never who was
> actually there. No venue, no night's date and no line-up appears in this file.
> The `written:` field above is this document's own date; it is not a night.
>
> **Every Result below is empty and reads `pending`.** Plan 38-07 fills them in
> with the observation and the wall-clock time. An empty Result is an unrun
> procedure and must read as one — a table of ticks nobody earned is worse than
> an empty table, because it closes a phase.
>
> **Status after plan 38-07's first sitting, 2026-08-11: all seven are still
> `pending`, and each now carries the reason it is.** The plan's one mechanical
> task was run in full — the build, every **G** extraction, every **S** probe —
> and none of it touches P1 … P7, which is the point of their existing. Six of
> the seven end at a device, a pocket or a session this repository cannot mint;
> the seventh, **P6**, writes to production and **has no authorisation**: the
> owner's permission of 2026-08-11 was scoped to plan 38-04's single DDL
> transaction and is recorded as spent and exhausted. A `pending` here is a
> statement that the observation has not been made — it is never a
> verified-by-inspection in disguise.

---

## How to read a procedure

Each procedure has five fixed sections.

- **Role** — the capability the account must hold. A second reader must be able
  to say who qualifies without asking who was on shift.
- **Setup** — what must be true before the first observation. Network state is
  always explicit, because it is the variable the whole phase turns on.
- **Observe** — numbered. Each item is a fact a second person standing beside
  the device could confirm or deny. "It felt fast" is not an observation.
- **Record** — what is written down, including the wall-clock time.
- **Result** — left empty until performed.

---

## The preconditions, read on the day — and what they do not license

Plan 38-07 ran the phase's whole mechanical set (**B**, **G**, **S**) in one
sitting on **2026-08-11**, before presenting P1 … P7. The full commands and
their output are in `38-07-SUMMARY.md`; the two readings that are preconditions
of these procedures rather than evidence for a requirement are repeated here,
because a procedure run against a suspended Realtime or an unapplied migration
would produce a Result that means nothing:

| Precondition | Read at | Value |
|---|---|---|
| `GET /v1/projects/{ref}/config/realtime` → `suspend` | **2026-08-11T11:49:45Z** | **`false`** — Realtime is not suspended |
| One `SELECT` policy on `realtime.messages`, zero write policies, four triggers on the four tables | 2026-08-11T11:49:42Z | present, unchanged from plan 38-04's after-figure |

`suspend: true` at 22:00 would make this whole phase a no-op with no error
anywhere, which is why the reading carries its time. **It was read hours before
any of these procedures; it is not a reading taken at the door, and it does not
transfer to a later night.** Re-read it on the day.

**And what none of it settles.** Every **S** probe runs through the Management
API as `supabase_read_only_user`, which **bypasses RLS**. Not one of them shows
that a real member session is refused. **LIVE-06 is closed by P7 and by nothing
before it** — and LIVE-01 by P5 and P6, because a trigger in `pg_trigger` is not
a message on a wire.

---

## P1 — the channel never established

Carries **LIVE-02**, **LIVE-04**, **LIVE-05**.

**Role** — an account holding `door.operate` for the night being opened.

**Setup** — desktop Chrome. DevTools → Network → *Request blocking* → block the
project's Realtime WebSocket endpoint (`wss://<project-ref>.supabase.co/realtime/*`;
the concrete ref stays in `.env.local` and is not written here). With the block
already active, open the door and select the night. The rest of the network
stays up: this is the *never established* case, not the offline case.

**Observe**
1. The counter row reads `updated Ns ago`, and N climbs — the door is honest
   that nothing is arriving.
2. A scan of a valid code returns its verdict, and the latency is
   indistinguishable from a scan with the channel healthy.
3. At about 5 minutes the staleness band appears.
4. Tapping the counter row reloads the list and N returns to `0s`.
5. No sentence about permission, authorisation or the operator appears anywhere
   on the screen (D-38-04 — a refused channel is not a verdict about who you are).

**Record** — the wall-clock time of observation 3, the value of N when the band
appeared, and the verdict latency of observation 2 next to a healthy-channel
scan for comparison.

**Result** — **pending**, and pending means *not verified*, not
verified-by-inspection.

*Reason (2026-08-11, plan 38-07).* P1 needs a desktop browser with request
blocking active on the Realtime socket, a door opened behind that block, a valid
code scanned, and a person watching a screen for the five minutes it takes the
band to appear. Every one of those is an observation at a device. The executing
agent has no browser, no camera and no code to scan, and the one thing it could
have produced — a claim that the band appears at five minutes — is exactly the
claim `38-VALIDATION.md` exists to stop being written without having been seen.

---

## P2 — the channel dropped mid-night

Carries **LIVE-02**, **LIVE-03**, **LIVE-05**.

**Role** — an account holding `door.operate` for the night.

**Setup** — door open and healthy first: band absent, counter resetting normally.
Only then DevTools → Network → *Offline*, or airplane mode with the page left
open. The page is never reloaded by hand during this procedure.

**Observe**
1. A scan still returns its verdict, from the cache, with the network down.
2. The staleness band appears.
3. On restoring the network, a full reload happens **with nobody touching the
   screen**, and the counter returns to `updated 0s ago`. This one is LIVE-03,
   and "nobody touching the screen" is the load-bearing half of it.
4. The band disappears once the reload lands.

**Record** — the wall-clock time of observations 2 and 3, and the elapsed time
between restoring the network and the counter resetting.

**Result** — **pending**, and pending means *not verified*.

*Reason (2026-08-11, plan 38-07).* P2 requires a network actually being cut and
restored under a live door, and its load-bearing observation — the reload that
fires **with nobody touching the screen** — is a claim about the absence of a
human action. That is precisely the observation a machine cannot make on its own
behalf: it can produce the reload, and it cannot testify that no thumb caused it.
LIVE-03 stands on this one.

---

## P3 — the pocket

Carries **LIVE-03**. This is the only procedure that settles **assumption A1**
(an iOS home-screen PWA fires `visibilitychange` → `visible` on resume from
suspension, and `pageshow` on a bfcache restore), and it cannot be replaced by a
desk simulation: Safari and iOS Safari implement neither `freeze` nor `resume`,
so the wake signal is composed by hand and only the device says whether the
composition works.

**Role** — an account holding `door.operate` for the night, on the actual staff
phone that would be used at an entrance, not a simulator and not a desktop.

**Setup** — the door installed to the home screen (standalone, not a browser
tab), night selected, network on. Perform one scan so the list is known-fresh.
Lock the phone and put it in a pocket for **at least 65 minutes** — the floor is
not arbitrary: the access token lives 3600 s, so anything under 60 minutes
tests suspension without testing expiry, and the two together are the case.

**Observe**
1. On unlocking and returning to the app, a full reload fires on resume.
2. The counter reads `updated 0s ago` within a few seconds — not after the
   5-minute parachute, which would mean the resume signal never arrived and A1
   is false.
3. The band, if it had appeared, disappears.
4. A scan performed immediately after the resume returns its verdict normally.

**Record** — the wall-clock time the phone was locked and the time it was woken
(so the elapsed minutes are on the record, not asserted), the elapsed seconds to
observation 2, and whether observation 2 arrived by the resume path or by the
parachute. If it arrived by the parachute, A1 is **false** and that is the
finding — it is not a failed run to repeat until it passes.

**Result** — **pending**, and pending means *not verified*.

*Reason (2026-08-11, plan 38-07).* P3 needs the actual staff phone, the door
installed to the home screen, and **at least 65 minutes of it locked in a
pocket** — the floor is past the access token's 3600-second life, so nothing
shorter tests the case. It cannot be simulated from a desk, and that is not a
convenience argument: Safari and iOS Safari implement neither `freeze` nor
`resume`, so the wake signal is composed by hand and **only the device says
whether the composition works**. **Assumption A1 therefore remains open** — and
it is open in the direction that matters, because if the resume path never fires
the parachute still refreshes the list at five minutes and the screen looks
correct the whole time.

---

## P4 — degraded, not dropped

Carries **LIVE-02**.

**Role** — an account holding `door.operate` for the night.

**Setup** — DevTools → Network → throttling *Slow 3G*. The channel is up; it is
merely slow. This is the case that separates "the verdict never waits on the
channel" from "the channel happens to be fast".

**Observe**
1. The verdict latency of an **offline-path** scan is unchanged against the
   unthrottled baseline. It never touches the network, so it must not move.
2. The list reload is merely late — the counter climbs higher than usual before
   resetting.
3. If verdict latency moves, the deferral rule of plan 38-03 has been violated:
   `mergeAttendees` is holding a `readwrite` transaction on the same IndexedDB
   object store the verdict reads (Pitfall 6), and the reload is no longer
   deferring behind a scan in progress.

**Record** — the verdict latency under throttling beside the unthrottled one,
both measured on the offline path, and the wall-clock time.

**Result** — **pending**, and pending means *not verified*.

*Reason (2026-08-11, plan 38-07).* P4 is a **latency comparison** between two
scans of a real code, one throttled and one not. It has no structural
counterpart: the deferral gate can be shown to exist by grep — and it was, see
`38-07-SUMMARY.md` § **G2** — but whether it actually keeps `mergeAttendees`'
`readwrite` transaction out of the verdict's path is a number measured at a
device with a camera. A structural green here would be the most misleading of
all the greens in this phase, because Pitfall 6 is invisible to it.

---

## P5 — two devices, the headline behaviour

Carries **LIVE-01**. This is the only proof the phase delivered what it is named
after, and it is also the only proof that `private: true` matches on both
sides — **Pitfall 2**, the most deceptive failure in this phase. Pitfall 2 is
invisible to every other check in the phase: the channel joins, `subscribe`
reports `SUBSCRIBED`, the band never appears because the channel genuinely *is*
live, no policy error is raised anywhere, and the list still only ever changes
every five minutes. Nothing but this procedure catches it.

**Role** — two accounts, each holding `door.operate` for the same night, signed
in on two separate devices. Two roles on one night, not one account in two
tabs — a single session in two tabs shares a Supabase browser client and would
not prove what two doors prove.

**Setup** — both devices on the same night, both with the door open and healthy
(band absent). Device B is then **put down and not touched again** for the rest
of the procedure.

**Observe**
1. Check in a valid code on device A.
2. Device B's counter changes **without anyone touching device B**.
3. It happens within about **2 seconds** of the check-in on A. A change that
   only arrives around five minutes later is not a pass — it is the safety
   reload doing its job while LIVE-01 does not, which is precisely how this
   failure hides.

**Record** — the elapsed time between the verdict on A and the counter change on
B, measured with a clock and written as a number, plus the wall-clock time.
Repeat three times and record all three elapsed times; a single sample cannot
distinguish 2 seconds from luck.

**Result** — **pending**, and pending means *not verified*.

*Reason (2026-08-11, plan 38-07).* P5 needs **two devices** and **two accounts**,
each holding `door.operate` for the same night, plus a valid code to check in on
one of them. The executing agent has none of the three, and it cannot mint a
member session — that is the same limit that leaves LIVE-06 open.

**This is the pending that costs the most, and it should be read as a hole and
not as a formality.** P5 is the only check in the phase that can see **Pitfall
2**: if `private: true` fails to match on both sides, or the topic's case does
not match, the channel joins, `subscribe` reports `SUBSCRIBED`, the band never
appears — because the channel genuinely *is* live — no policy error is raised
anywhere, and the list still only ever changes every five minutes. **The phase
looks finished and LIVE-01 is not delivered.** Nothing already run in plan 38-07
would notice: the build is green, the five extractions are clean, the policy is
in production and the four triggers exist.

---

## P6 — the event-level fan-out, and the reassignment

Carries **LIVE-01**. Two acts, on **one row**, under **one** authorisation.

Act one is **Pitfall 1**: `tickets.party_id` and `guest_list_entries.party_id`
are nullable by construction, and a trigger that sends to `'door:' || NULL`
sends to nobody — while the 5-minute safety reload keeps every screen looking
right, so the defect hides. Act two is **D-38-24**: a row moved between two
nights must reload the night that *lost* it as well as the night that gained it,
and the quiet failure there is the origin door refreshing five minutes later and
looking perfectly healthy in the meantime.

### This procedure writes to production, and this project has an incident on record

On 2026-08-10 a verification script destroyed **63 production rows across seven
tables**; the events and nights came back from a snapshot, the 63 rows did not,
and this project has no PITR. The four rules below are that incident written as
a procedure. They are part of the procedure text, not a reminder kept elsewhere.

1. **Capture the primary key at creation time.** The moment the guest-list entry
   is created, record its `id`. Not its name, not its position in a list — its
   primary key, written down before anything else happens.
2. **Delete by that primary key.** Never by clicking a delete control in a page,
   never by selecting on a name or a label, never by walking up a DOM tree from
   a matched element. The direction of the failure is the point: a selector that
   is too wide deletes *more* than it should; a delete by primary key, when it is
   wrong, finds nothing. Only one of those two ways of failing is compatible with
   a procedure that claims production was left as it was found.
3. **Confirm the removal from a different source than the one used to act.** A
   removal performed through the interface is confirmed by a read-only database
   probe; a removal performed in the database is confirmed in the interface. A
   count taken with the instrument that caused the effect is not a measurement,
   it is an echo.
4. **Snapshot, before starting, every table reachable by cascade** from
   `guest_list_entries` — enumerated by reading the foreign-key constraints, not
   remembered. A cascade is a write path nobody declared. Read it, read-only:

   ```sql
   select con.conname,
          src.relname as child_table,
          tgt.relname as parent_table,
          con.confdeltype
     from pg_constraint con
     join pg_class src on src.oid = con.conrelid
     join pg_class tgt on tgt.oid = con.confrelid
    where con.contype = 'f'
      and tgt.relname = 'guest_list_entries';
   ```

   `confdeltype = 'c'` is `ON DELETE CASCADE`. Every child table returned is in
   the snapshot, whether or not this procedure intends to touch it.

**The authorisation is spent once.** The owner's permission to write to
production covers exactly what is described here — one guest-list entry with no
party, on an event with at least two nights, created and then reassigned and then
deleted by its primary key — and it is named before it is requested, not
afterwards. It does not extend to a second row, to a retry with a different
shape, or to a removal performed with an instrument other than the one agreed.
When the row is gone, the authorisation is exhausted; record when it was spent.

**Role** — an account holding the capability to manage the guest list for that
event, plus read-only Management API access for the confirming probe of rule 3.

**Setup** — an event with **at least two nights**. The four rules above executed
in order: the cascade enumerated and the snapshot taken **before** anything is
created. Both doors open, one per night, each on an account holding
`door.operate` for its own night, both healthy, both then left untouched.

**Observe**
1. **Act one.** Create one guest-list entry carrying **no party** on that event,
   and capture its primary key in the same moment. **Both** doors reload,
   without anyone touching either — this is the fan-out, and a reload on only
   one of the two is Pitfall 1 present.
2. **Act two, first move (D-38-24).** Assign that same entry to one of the
   event's nights. **Both** doors reload: the night that gained the entry and
   the night that lost it.
3. **Act two, second move.** Move the same entry to the other night. Again both
   doors reload.
4. Delete the entry **by the primary key captured in observation 1**, and only
   then.
5. Confirm the deletion from a different source than the one used to delete
   (rule 3), and confirm against the snapshot that nothing else moved.

**Record** — the primary key at creation; the wall-clock time of each of the
five observations; for each of observations 1–3, whether each door reloaded
**live** or only after about five minutes, per door and named by which night it
was serving; the confirming probe's output; and the moment the authorisation was
spent. A reload that arrived at five minutes is recorded as five minutes, not as
a pass.

**Result** — **pending**, and pending means *not verified*.

*Reason (2026-08-11, plan 38-07), and this one is a refusal rather than an
inability.* P6 **writes a row to production**, and the only authorisation this
phase has ever held was the one granted on 2026-08-11 for plan 38-04 — scoped to
*one DDL transaction, zero row writes*, spent at **11:15:24 UTC** and **recorded
as exhausted** in `38-04-SUMMARY.md`. It does not stretch to creating a
guest-list entry, and an authorisation given against a description stops covering
anything the moment the description stops matching.

So P6 was **not attempted**, and no snapshot was taken either — a snapshot is the
first of the four rules, and taking it would have been the first step of a
procedure that has no permission to run. The four rules are already written into
the procedure above and stay there for whoever does run it: snapshot the cascade
set enumerated from `pg_constraint`, capture the primary key at creation, delete
by that key, confirm from a source other than the one acted on. They are the
2026-08-10 incident written as a procedure — 63 rows across seven tables, no
PITR, gone.

**What stays unmeasured, and it is two distinct defects.** Act one is **Pitfall
1**: a row carrying no party emitting to `door:NULL` reaches nobody, and the
5-minute parachute keeps every screen looking right, so LIVE-01 degrades into
LIVE-04 in silence. Act two is **D-38-24**: the origin door refreshing at five
minutes instead of live, which looks like success precisely because both doors
end up correct.

---

## P7 — a person not assigned to the night hears nothing

Carries **LIVE-06**.

**Role** — an approved `member` account with **no** assignment to that night.
Note the two axes: `member` is the role and `approved` is the status, and neither
of them is an assignment to a night. That is the whole point of the account used
here.

**Setup** — the door URL will redirect for this account, so the subscription is
not driven from the door. Drive it from a scratch page or the Realtime Inspector
using **that account's own session** — never a service key, never another
account's token, or the procedure proves nothing about the boundary. The night's
id is treated as known to the subscriber: the claim under test is not that the
id is secret.

**Observe**
1. The subscription reports `CHANNEL_ERROR`.
2. **No message ever arrives**, including while a check-in is performed on that
   night from a properly assigned door. Observation 1 without observation 2 is
   only half the proof.

**Record** — the status string verbatim, the wall-clock time, and the fact that a
check-in was performed on that night during the observation window.

**Note, and it belongs in the record rather than in the door's UI.**
`CHANNEL_ERROR` alone does not distinguish "not your night" from an expired
token, a join rate limit, or Realtime restarting. That ambiguity is exactly why
D-38-04 forbids the door from turning this status into a sentence about the
operator: the same string has at least four causes, and three of them are not
about who you are.

**Result** — **pending**, and pending means *not verified*.

*Reason (2026-08-11, plan 38-07).* P7 requires **an approved `member` account's
own session**, driven from a scratch page or the Realtime Inspector. A service
key will not do and neither will another account's token: with either of those
the procedure proves nothing about the boundary it exists to test. The executing
agent cannot mint that session, and every probe available to it goes through the
Management API as `supabase_read_only_user`, **which bypasses RLS**.

**So LIVE-06 is open.** What plan 38-04 measured and plan 38-07 re-measured is
that exactly one `SELECT` policy exists on `realtime.messages`, that its rendered
`qual` names `private.has_capability` and the literal `'door.operate'`, and that
no write policy exists at all. Every one of those is a statement about the
catalogue. **None of them is a statement about an authenticated browser being
refused**, and no probe reachable from here can be.

---

## Coverage, and one divergence recorded rather than resolved

| Procedure | Requirements | Also settles |
|-----------|--------------|--------------|
| P1 | LIVE-02, LIVE-04, LIVE-05 | — |
| P2 | LIVE-02, LIVE-03, LIVE-05 | — |
| P3 | LIVE-03 | assumption A1 |
| P4 | LIVE-02 | Pitfall 6 |
| P5 | LIVE-01 | Pitfall 2, assumption A3 |
| P6 | LIVE-01 | Pitfall 1, D-38-24 |
| P7 | LIVE-06 | Pitfall 5 |

**Divergence with `38-VALIDATION.md` § Manual-Only Verifications.** That table
describes P4 as *"never-established channel: airplane mode before opening the
door, six scans, then reconnect and sync"*. `38-RESEARCH.md` § The LIVE-02 Proof
and `38-01-PLAN.md` both describe P4 as *degraded, not dropped* — Slow 3G with
the channel up. P4 is written here as the plan and the research say, because
those two agree and they are the instruction being executed.

The consequence is stated rather than hidden: **the fully-offline door — no
network at all before the door is opened, a run of scans queued, then reconnect
and drain — is not covered by P1 … P7 as written.** P1 blocks only the WebSocket
and leaves the rest of the network up, so it is not that scenario. This is not a
gap in LIVE-02's channel argument, which P1, P2 and P4 carry between them; it is
a gap against the offline queue, which is prior art from earlier phases and not
this phase's subject. Recorded here so a later reader finds a stated gap instead
of a missing procedure, and so plan 38-07 or the verifier can decide whether to
run it.

**Plan 38-07 did not run it, and did not close the divergence either.** It cannot
choose between the two descriptions on evidence, because neither version of P4
has been performed; picking one now would be an editorial decision dressed as a
finding. It stays open for the verifier, alongside the seven pendings below.

---

## Status board — plan 38-07, first sitting, 2026-08-11

The eighth row is not one of P1 … P7. `38-VALIDATION.md` carries the LIVE-05
"open the night, watch N climb, tap it, N returns to 0" check as a **D** row of
its own, one-handed at minimum brightness, and it is tracked here so it cannot
fall between the procedures and the requirement map.

| Check | Requirement | State | Why |
|---|---|---|---|
| **P1** | LIVE-02, LIVE-04, LIVE-05 | **pending** | needs a browser with the socket blocked, a scan, and five minutes of watching |
| **P2** | LIVE-02, LIVE-03, LIVE-05 | **pending** | needs a real network cut and restored; the load-bearing half is "nobody touched the screen" |
| **P3** | LIVE-03, assumption **A1** | **pending** | needs the staff phone locked in a pocket ≥ 65 min; cannot be simulated from a desk |
| **P4** | LIVE-02, Pitfall 6 | **pending** | a latency comparison at a device; the structural green is the misleading one |
| **P5** | LIVE-01, Pitfall 2 | **pending** | needs two devices and two `door.operate` accounts on one night |
| **P6** | LIVE-01, Pitfall 1, D-38-24 | **pending — and refused** | writes to production; the 2026-08-11 authorisation was scoped to plan 38-04 and is spent |
| **P7** | LIVE-06, Pitfall 5 | **pending** | needs a real approved `member` session; every probe here bypasses RLS |
| the LIVE-05 tap check | LIVE-05 | **pending** | a question about a thumb, in the dark, at minimum brightness |

**Still open, and open is the honest word for each:** assumption **A1** (P3),
assumption **A6** — the band staying hidden while the channel is down (P1 (c) and
P2 (b)), assumption **A5** — the mid-night revocation exposure, which
`38-VALIDATION.md` records as accepted rather than closed, and the P4 divergence
above.

**What plan 38-07 did settle** is in `38-07-SUMMARY.md`: the build, nine **G**
structural checks and eight **S** probes, each pasted with its output and its
before-figure. None of that reaches a requirement on its own. It is the floor
these procedures stand on, not a substitute for them.
