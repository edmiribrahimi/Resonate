---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 12
subsystem: access-gating
tags: [review-list, classification, serialisation, rls, empty-state, pii]
requires:
  - "31-04 migration: public.door_scan_events with its single policy door_scan_events_select_admin"
  - "31-04 types: DoorScanEvent in src/types/database.ts"
  - "31-02 contract: DoorScanCause, DoorSubjectType, DoorScanSource in src/lib/door/outcome.ts"
  - "31-07: the check-in route writes the rows, with cause NULL except the two refund causes"
  - "src/utils/datetime.ts: partyStartInstant / partyEndInstant"
provides:
  - "src/lib/door/classify.ts — classifyNight(), a pure read-time classifier, and DOUBLE_READ_WINDOW_SECONDS"
  - "/organizer/events/[id]/review — the per-night review surface, empty by design on a normal night"
  - "A master-only technical view whose copied TSV carries identifiers and nothing else"
affects:
  - "Phase 34 (collapsing the duplicated admin and organizer trees) moves this route with its siblings"
  - "Phase 35 (per-night organizer scoping) is what narrows door_scan_events_select_admin; until then the page check is the only per-event boundary"
  - "The finance surface owns refunded_after_night — this list filters it out and finance queries the complement"
tech-stack:
  added: []
  patterns:
    - "Classification at read time, in a pure module, so a rule is correctable after a night without redeploying to a phone"
    - "Counters and list computed in one pass and deliberately not the same set"
    - "Hiding a row requires certainty; showing one does not"
    - "The safe-export guarantee is a function signature, not a rule somebody remembers"
    - "A designed empty state that cannot be confused with a failed read"
key-files:
  created:
    - "src/lib/door/classify.ts"
    - "src/app/(organizer)/organizer/events/[id]/review/page.tsx"
    - "src/app/(organizer)/organizer/events/[id]/review/ReviewListClient.tsx"
  modified: []
decisions:
  - "No door_scan_events_select_master policy: FIX-12 is a serialisation rule, and the separation is achieved by what each view puts on the wire"
  - "The label map resolves operators only, never subjects — naming the member whose ticket conflicted would turn a list of tickets into a list of people"
  - "The night's window is used for rendering and for marking a late row, NOT as a query filter: a filter on recorded_at would drop the offline-synced rows this surface exists to reveal"
  - "A device id of \"unknown\" never reaches double_read, because double_read is the one classification that hides a row"
  - "invalid_signature and unknown_code are indistinguishable once stored; both are bucketed as invalid_signature and the sentence declines the certainty rather than inventing it"
  - "The entry-point link is NOT added: EventList.tsx is shared with the admin tree via basePath and an unconditional link would 404 for a master"
metrics:
  duration: "~50 min"
  completed: 2026-08-06
  tasks: 3
  commits: 3
---

# Phase 31 Plan 12: The night has a list, and on a normal night it is empty — Summary

A night's conflicts are now classified **after** the fact, over
`door_scan_events`, by one pure function — so the rule that decides what a
supervisor reads can be corrected after a real night without redeploying anything
to a phone holding a cached bundle, and it cannot carry a member's name because
it has nowhere to put one.

## What was built

| Task | File | What it does | Commit |
|---|---|---|---|
| 1 | `src/lib/door/classify.ts` (353 lines) | `classifyNight()` — derives a `DoorScanCause` per row; counters and list from one pass, not the same set | `951246f` |
| 3 | `.../review/ReviewListClient.tsx` (416 lines) | Prose for the supervisor, a master-only technical view that joins nothing | `e15f2e3` |
| 2 | `.../review/page.tsx` (253 lines) | The guarded per-night surface under the organizer tree | `eaebc1e` |

## Evidence per requirement

### FIX-11 — empty on a normal night, classified by cause, double read counted but not listed

- **Empty state is the designed default** — `ReviewListClient.tsx:322-337`. It
  renders "Nothing needed attention on this night." with the neutral
  `border-card-border bg-card` card vocabulary. **No badge, no alert colour, no
  call to action.** The alarm styling (`border-red-500/30 bg-red-500/10`) exists
  only in the read-failure block at `:303-312`, which is the point: the two must
  never look alike.
- **No notification path** — `page.tsx:19-30` carries the prohibition in a
  comment, in the file, so a later reader does not "improve" it. There is no
  `sendEmail`, no `NAV_ITEMS` entry and no badge anywhere in this plan's files.
- **Classified by cause, not a generic error** — `classify.ts:190-247`
  (`deriveCause`), and the prose table at `ReviewListClient.tsx:93-113`, which is
  a **total** `Record<DoorScanCause, …>` so a ninth cause becomes a build error
  rather than a row rendering as nothing.
- **Three different entries, not one generic error** — a second unused ticket
  (`second_ticket_same_holder`, `classify.ts:246`), two devices minutes apart
  (`two_devices`, `classify.ts:224`) and a code this system could not honour
  (`invalid_signature`, `classify.ts:200`) take three separate branches and three
  separate sentences.
- **A double read is counted and is NOT listed** — counted at
  `classify.ts:318-320` (`counters[cause] += 1`, before any exclusion), excluded
  from the list at `classify.ts:344-349` (`entry.cause !== "double_read"`).
  Rendered with its own sentence and its own explanation at
  `ReviewListClient.tsx:358-374`: a rising number means the scanner's feedback
  was not visible at the door — about the phone and the light, never about a
  guest.
- **A refund issued after the night does not appear at all** — excluded at
  `classify.ts:348` (`entry.cause !== "refunded_after_night"`). It stays in
  `counters`, labelled "(accounting)" at `ReviewListClient.tsx:126`, because
  finance queries the complement.
- **A failed read is distinguishable from a quiet night** —
  `page.tsx:163-181` logs `review:scan_events_read` with a distinct category and
  sets `readError`; `ReviewListClient.tsx:297-312` renders it in red and says in
  as many words that the list is empty because nothing loaded. Two further
  distinct categories exist: `review:parties_read` (`page.tsx:125-131`) and
  `review:operator_labels_read` (`page.tsx:207-213`), the latter deliberately
  non-fatal — losing a whole night because a label lookup failed would be the
  worse failure.

### FIX-12 — two audiences, one table, and no second policy

- **No `door_scan_events_select_master` was added.**
  `grep -rn "door_scan_events_select_master" src/ supabase/` returns exactly one
  hit — `src/lib/door/classify.ts:28`, a comment saying such a policy would be an
  interface affordance dressed up as a boundary. No migration was written or
  changed by this plan.
- **The technical view cannot leak a name, by signature** —
  `ReviewListClient.tsx:135` — `function TechnicalView({ entries }: { entries:
  ClassifiedEntry[] })`. It takes `entries` and **nothing else**: it does not
  receive `operatorLabels` and has no parameter one could arrive through.
- **`ClassifiedEntry` has no field for personal data** — `classify.ts:66-115`.
  `grep -icE "full_name|email|from\("profiles\")" src/lib/door/classify.ts`
  returns **0**.
- **The copied text is columns, joined to nothing** —
  `ReviewListClient.tsx:145-172`: nine columns (`id`, `subject_type`,
  `subject_id`, `cause`, `scanned_at`, `recorded_at`, `operator_id`, `device_id`,
  `source`) assembled as TSV and handed to `navigator.clipboard.writeText`
  (`:170`). Every value is an identifier or a timestamp; the table it comes from
  has no column for a name (`20260805120000_door_scan_events.sql:28-34`).
- **The trap in the analog was not copied** — `grep -c "email"` over
  `page.tsx` returns **0**. `sales/page.tsx:88-99` selects `full_name` **and** an
  address into its client component; `page.tsx:196-204` selects `id, full_name`
  only, and it is passed as its own prop (`page.tsx:238`, `operatorLabels`)
  structurally separate from the classified rows.

### FIX-13 — recorded against the ticket, never as a judgement on a person

- **The negative check, recorded in full.**
  `grep -rn 'from("profiles")' src/lib/door/ "src/app/(organizer)/organizer/events/[id]/review/"` →
  one line: `src/app/(organizer)/organizer/events/[id]/review/page.tsx:201: .from("profiles")`.
  It is a **read** — `.select("id, full_name")` at `page.tsx:200`. **Zero
  writes.** `grep -icE 'from\("profiles"\)|\.update\(|\.insert\(|\.delete\('`
  over `ReviewListClient.tsx` returns **0**. No code path added by this plan
  writes to `public.profiles`, or to anything else.
- **No per-member aggregate, no grouping by person** — the list is sorted by time
  (`classify.ts:353`), never by person; `counters` is keyed by
  `DoorScanCause`, never by a user id (`classify.ts:129-140`); there is no
  `groupBy`, no per-subject tally and no "N conflicts" anywhere.
- **The subject of a row is a thing** — `classify.ts:74-83`: `subjectId` is the
  ticket, the guest-list entry, or the holder's user id on the membership path
  where there is neither. It is rendered as `ticket 3f2a1c9d`
  (`ReviewListClient.tsx:341-347`), truncated to eight characters — enough to
  compare two rows by eye, never a person.
- **An entry that was admitted counts as admitted** —
  `refunded_before_night` reads "admitted; this ticket had been refunded before
  the night" (`ReviewListClient.tsx:104-105`), and `not_in_cache` reads
  "admitted while offline" (`:102-103`). Neither implies a verdict.
- **Names are resolved for operators only, never for subjects** —
  `page.tsx:184-215`. This is a deliberate tightening (see Deviations).
- **The comment that anticipates the wrong feature request** —
  `ReviewListClient.tsx:29-42`: the natural next request is "could we see who does
  this most often?", and the answer is no, because a list that answers it has
  decided something about a person without anybody choosing to.

## The trust boundary, stated honestly

`page.tsx:63-73` records that the middleware headers decide where somebody may
**go**, and `door_scan_events_select_admin` decides what they may **read**. The
read goes through `@/lib/supabase/server` — `grep -c "getServiceClient"` over the
page returns **0** — so the policy is the boundary rather than a decoration.

`page.tsx:93-99` records the limit rather than implying it is not there: the
policy is `is_admin_or_organizer()` and is **not** per-event. Until Phase 35
narrows it, the ownership check at `page.tsx:100-102` is the only per-event
boundary, and a member querying the table directly gets zero rows from the policy
alone.

## Turin time

`page.tsx:141-152`: `partyStartInstant(date, time)` and
`partyEndInstant(date, end_time ?? "06:00")`. A stored `date` + `time` is never
handed to `new Date()` — `grep -c 'new Date(`'` over the page returns **0**.
Rendering is `Intl.DateTimeFormat` pinned to `EVENT_TIME_ZONE`
(`ReviewListClient.tsx:64-70`), so a time reads the same on the server and in a
browser in another zone.

## Deviations from Plan

### 1. [Rule 1 — Bug] The night's window is not used as a query filter

- **Found during:** Task 2.
- **Issue:** The plan asked to scope the query by `party_id` **and** by the
  night's window. On the offline path `recorded_at` is when the queue drained,
  which can be the next morning — so a `recorded_at` window would drop precisely
  the offline-synced rows this surface exists to reveal. It is the same failure
  shape the plan itself warns about for double reads (Pitfall N7): the obvious
  implementation destroys the evidence.
- **Fix:** the query is scoped by `party_id`, which **is** the night — the
  migration makes the party the unit of the review list and every writer sets it.
  The window is still computed with `partyStartInstant` / `partyEndInstant` and is
  used for two real purposes: rendering the night in its own terms, and marking a
  row that landed after it ("recorded at 09:14 — after the night had ended",
  `ReviewListClient.tsx:352-354`). Information rather than a silent deletion.
- **Files:** `page.tsx:141-181`. **Commit:** `eaebc1e`.

### 2. [Rule 2 — Missing critical functionality] The party id from the query string is validated against this event's parties

- **Found during:** Task 2.
- **Issue:** The plan said to select a party from a search param, defaulting to
  the first. Taken literally, an unchecked id would let an organizer read
  **another event's night** by editing the address — and since the RLS policy is
  not per-event until Phase 35, nothing downstream would stop it.
- **Fix:** `page.tsx:113-119` resolves the requested id against the parties of
  this event and falls back to the first. Commented as an access check, not
  tidiness.
- **Commit:** `eaebc1e`.

### 3. [Rule 2] The label map resolves operators only, never subjects

- **Found during:** Task 2.
- **Issue:** The plan said to build the map from `operator_id` **and**
  `subject_user_id`. Resolving subject names would put the member whose ticket
  conflicted, by name, on a list of conflicts — which is FIX-13's prohibition
  arriving through the prose door, and it would also ship those names into the
  client bundle where nothing renders them.
- **Fix:** `page.tsx:184-215` fetches operators only. Naming the member of staff
  who performed a recorded action is the opposite requirement —
  `community-membership.md` gate *chi decide e' tracciato* asks for exactly that.
  The subject stays an identifier.
- **Commit:** `eaebc1e`.

### 4. [Rule 2] `double_read` is never reached on a guess

- **Found during:** Task 1.
- **Issue:** `device_id` is `"unknown"` when a queued scan arrives from a bundle
  that had no device id (`checkin/route.ts:251-258`). Two rows both reading
  `"unknown"` would compare equal and could be classified `double_read` — which
  **hides** the row. A genuine two-device conflict would disappear.
- **Fix:** `classify.ts:230-234` — an `"unknown"` device never reaches
  `double_read`. Hiding a row requires certainty; showing one does not.
- **Commit:** `951246f`.

### 5. [Ordering] Task 3 was committed before Task 2

- Committing `page.tsx` first would have left a commit that does not build: the
  page imports `ReviewListClient`. In a repository whose only automatic gate is
  `npm run build`, a non-building commit is worse than a reordered one. The client
  component builds standalone, so it went first. Both commits build.

### 6. [Scope] Three fields added to the returned shape, one requirement not linked

- `classifyNight` returns `unclassified` alongside `{ listed, counters, total }`,
  so the arithmetic closes: `total === unclassified + sum(counters)`. Without it a
  reader cannot tell where the missing rows went. The two required exports —
  `classifyNight`, `DOUBLE_READ_WINDOW_SECONDS` — are unchanged.
- **The entry-point link was not added.** See Known Gaps.

## Known Gaps

Recorded in full in `deferred-items.md` in this directory.

1. **Nothing links to the route yet.** The plan said to link it "the same way
   `sales` and `guest-list` are linked from `organizer/events/page.tsx`" — but
   reading the code, both live in `src/components/events/EventList.tsx:176-188`,
   which is shared by **two** trees: the organizer page renders it with the
   default `basePath`, the admin page with `basePath="/admin/events"`
   (`(admin)/admin/events/page.tsx:72`). An unconditional link would produce
   `/admin/events/{id}/review`, which does not exist, and a master would land on
   a 404. `EventList.tsx` is also outside this plan's `files_modified`. **Phase 34
   collapses the two trees and is where this belongs.** The route works by
   address in the meantime.
2. **`not_in_cache` has no writer.** It is a `DoorFlag` and flags are not a
   stored column, so its counter reads zero until a writer sets the cause. The
   sentence for it is already written.
3. **`invalid_signature` and `unknown_code` cannot be told apart** from a stored
   row. Both are bucketed as `invalid_signature` and the sentence says both
   possibilities rather than accusing anyone. Recovering the distinction needs a
   column, and 31-04's migration is applied and is a historical fact.

## Verification

**There is no test runner for this product.** Nothing below is claimed on the
basis of tests.

**Automatic:**

- `npm run build` — passes; `/organizer/events/[id]/review` is registered as `ƒ`
  (server-rendered on demand), which is what `export const dynamic =
  "force-dynamic"` (`page.tsx:41`) asks for.
- `grep -icE "full_name|email|from\("profiles\")" src/lib/door/classify.ts` → `0`
- `grep -c "getServiceClient" .../review/page.tsx` → `0`
- `grep -c "email" .../review/page.tsx` → `0`
- ``grep -c 'new Date(`' .../review/page.tsx`` → `0`
- `grep -icE 'from\("profiles"\)|\.update\(|\.insert\(|\.delete\(' .../review/ReviewListClient.tsx` → `0`
- `grep -rn 'from("profiles")' src/lib/door/ .../review/` → one line, `page.tsx:201`, a `.select`

**Not yet observable, and the reason is upstream:** the 31-04 migration is
written but **not applied to the live database**, so no query on this surface can
run against real rows yet. The four Supabase clients in `src/lib/supabase/` are
not parameterised with `Database`, so no column name in a `.select()` string is
checked by the build either — every column in `SCAN_EVENT_COLUMNS`
(`page.tsx:48-50`) was read off the migration rather than recalled.

**Manual steps to run once the migration is applied** (written, not evoked —
they are the only proof that will exist):

1. Sign in as a `member` and request `/organizer/events/{id}/review` → expect a
   redirect to `/dashboard`.
2. Sign in as an `organizer` who does **not** own the event → expect a redirect
   to `/organizer/events`.
3. As that same member session, query `door_scan_events` directly through the
   PostgREST API with the anonymous key → expect **zero rows**, from the policy
   alone. This is the one that matters: it is the boundary, and the redirect is
   not.
4. As an organizer who owns an event with a night that had no conflicts → expect
   the empty state, no badge, no colour.
5. As a `master`, open a night with at least one conflict, press **Copy as TSV**,
   paste into a plain editor → expect no `@` and no full name. Record the pasted
   text with each identifier truncated to its first segment.
6. Edit `?party=` to a party id belonging to a **different** event → expect the
   page to fall back to this event's first party, not to render the other night.

## Self-Check: PASSED

- `src/lib/door/classify.ts` — FOUND
- `src/app/(organizer)/organizer/events/[id]/review/page.tsx` — FOUND
- `src/app/(organizer)/organizer/events/[id]/review/ReviewListClient.tsx` — FOUND
- `951246f` — FOUND
- `e15f2e3` — FOUND
- `eaebc1e` — FOUND
