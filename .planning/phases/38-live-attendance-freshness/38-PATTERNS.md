# Phase 38: Live Attendance Freshness - Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 3 (1 new migration, 1 modified client component, 1 conditional new client module)
**Analogs found:** 2 exact / 1 partial / 3 declared gaps

> This file is a **publication** — `.planning/` is tracked and the repository is
> public. It names roles ("a staff account assigned to that night"), never
> people; it carries no venue, no unannounced date, no line-up.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/202608XXXXXX_live_attendance_channel.sql` (NEW) | migration — RLS policy + `SECURITY DEFINER` helper + 4 `AFTER` triggers | event-driven / pub-sub | **policy:** `supabase/migrations/20260809004600_event_media_quarantine_bucket.sql` (policy on a Supabase-managed, non-`public` schema) + `supabase/migrations/20260809004000_door_scan_events_by_assignment.sql` (the `private.has_capability('door.operate', <party>)` predicate) · **trigger:** `supabase/migrations/20260810120000_formats_and_series.sql:590-614` | **exact** (both halves) |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` (MODIFIED) | client component — lifecycle effects, timers, freshness display, notice band, counter row | event-driven (channel) + request-response (reload) | **itself** — every sub-pattern has an in-file precedent; the one exception is the channel subscription | **exact for 7 of 8 sub-patterns; gap on the 8th** |
| `src/app/(admin)/admin/scanner/useDoorChannel.ts` (NEW, **conditional** — only if `ScannerClient.tsx` size forces the split; RESEARCH § Recommended Project Structure) | client module / hook, door-scoped | event-driven | none — see § No Analog Found | **gap** |

### Files deliberately NOT touched — verify no plan step edits them

| File | Why it must stay untouched |
|------|---------------------------|
| `src/lib/supabase/client.ts` | RESEARCH Open Question 2 recommends **against** `worker: true` this phase. It is a module-level singleton governed by `access-gating.md`; editing it is a product-wide, cross-domain change. Verified today it is 8 lines and unchanged since creation |
| `src/lib/offline/checkin-store.ts` | LIVE-07 / D-38-12: nothing is extracted, nothing is generalised. Verified today: imported by `ScannerClient.tsx` and by nothing else |
| `src/lib/offline/sync-manager.ts` | The offline drain already replays through the check-in route, so the `door_scan_events` trigger covers it for free (RESEARCH § Where the Signal Is Emitted, path 4) |
| `src/app/api/tickets/attendance/route.ts` | D-38-01/D-38-02: the redaction is unchanged, and the reload reuses this endpoint as-is |

---

## Pattern Assignments

### A. `supabase/migrations/202608XXXXXX_live_attendance_channel.sql` (migration, event-driven)

Three distinct things live in this one file and each has its own analog.

#### A1 — the RLS policy on a Supabase-managed, non-`public` schema

**Analog:** `supabase/migrations/20260809004600_event_media_quarantine_bucket.sql:129-151`
This is the repository's precedent for writing a policy on a table the project
does not own (`storage.objects`). `realtime.messages` is the same situation.

**Naming convention** (lines 129-133) — copy this, and note it **contradicts the
name RESEARCH proposes**:

```sql
-- The policy name follows this phase's convention — `<subject>_<verb>_<question>`
-- — rather than the quoted prose names phase 7 gave its storage policies. The
-- divergence is deliberate: an unquoted identifier is greppable, and every
-- policy written since `20260805120000_door_scan_events.sql` uses this form.
```

> **Planner decision required.** RESEARCH § Pattern 5 proposes
> `door_attendance_broadcast_read` — verb last, question in the middle. The house
> form is `<subject>_<verb>_<question>`: `door_scan_events_select_admin`,
> `event_media_quarantine_insert_approved`. A conforming name would be
> `realtime_messages_select_door_assigned` or `door_broadcast_select_assigned`.
> Pick one and state the choice; do not let the two forms coexist.

**Policy shape** (lines 135-143) — `DROP … IF EXISTS` first, unquoted name,
explicit `TO authenticated`:

```sql
DROP POLICY IF EXISTS event_media_quarantine_insert_approved ON storage.objects;

CREATE POLICY event_media_quarantine_insert_approved
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-media-quarantine'
    AND (SELECT public.get_user_status()) = 'approved'
  );
```

**The predicate to call, byte-for-byte the same question** — analog
`supabase/migrations/20260809004000_door_scan_events_by_assignment.sql:170-180`:

```sql
DROP POLICY IF EXISTS door_scan_events_select_admin ON public.door_scan_events;

CREATE POLICY door_scan_events_select_admin ON public.door_scan_events
  FOR SELECT USING (
    -- The whole register, for whoever manages the staff surfaces. Unchanged.
    (SELECT private.has_capability('staff.manage'))
    -- This night, for whoever worked its door.
    OR (SELECT private.has_capability('door.operate', door_scan_events.party_id))
    -- This night, for whoever runs it.
    OR (SELECT private.has_capability('party.manage', door_scan_events.party_id))
  );
```

Three things to carry across and one **not** to:

- **Carry:** the `(SELECT …)` wrapper on every capability call. It is load-bearing
  — it makes Postgres evaluate the call once per statement as an `InitPlan`, and
  it is *not* `STABLE` that produces that (stated at `:125-131` of the same file,
  proved by `EXPLAIN`).
- **Carry:** `private.has_capability('door.operate', <party>)` verbatim. No new
  predicate, no `is_assigned_to_party()`. The resolver is
  `20260809001000_assignment_resolver.sql:320-357`, `SECURITY DEFINER`, `STABLE`,
  `SET search_path = ''`, with arm 2 testing `pa.revoked_at is null` and
  `now() < pa.ends_at`.
- **Carry:** **no new grant.** `20260809001000_assignment_resolver.sql:368` already
  reads `GRANT EXECUTE ON FUNCTION private.has_capability(text, uuid) TO
  authenticated, anon;` — and the comment above it (`:359-367`) explains why `anon`
  is included: a policy predicate runs with the querying role's privileges, and
  for `anon` `auth.uid()` is null so both arms return a correct `false`.
- **Do NOT carry:** the three-arm `OR`. This phase's policy takes **one** arm
  (`door.operate`), and the party comes from `realtime.topic()` — untrusted client
  text — not from a column of the row. That inverts the `CASE`-vs-`AND` question:
  see RESEARCH § Pitfall 4.

**The "policies this file does NOT create" paragraph** — mandatory, and there are
three precedents to point at. From `20260809004600:145-151`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 3. The two policies this file does NOT create, and the omission IS the design
--
-- There is no read policy and no deletion policy on this bucket, for anybody.
-- Only two other places in this repository omit a policy on purpose
-- (`20260805120000_door_scan_events.sql:158-163` and
-- `20260808002000_membership_register.sql:345-349`), so without this paragraph
```

and the fuller version at `20260809004000:198-210`:

```sql
-- ── STILL NO INSERT, UPDATE OR DELETE POLICY, AND THE OMISSION IS STILL
--    DELIBERATE ────────────────────────────────────────────────────────────
--
-- Repeated rather than assumed inherited, because this file re-creates the only
-- policy the table has and a later reader will read THIS file to learn the
-- table's rules. […] The table is append-only BY
-- CONSTRUCTION — not by a convention its writers observe, but by the absence of
-- any granted path to a write. Two tables in this repository omit their write
-- policies on purpose, and this is one of them […]; without this
-- paragraph the next reader takes the gap for a bug and repairs it.
```

The new migration needs the same paragraph for `realtime.messages`, with the
sharper reason RESEARCH found: `authenticated` and `anon` already hold
**table-level `INSERT`** on `realtime.messages`, so RLS-with-no-`INSERT`-policy is
the only thing standing between a signed-in member and the ability to broadcast on
the door's topic.

#### A2 — the `SECURITY DEFINER` trigger function

**Analog:** `supabase/migrations/20260810120000_formats_and_series.sql:579-614` —
the most recent trigger function in the repository, and the closest in intent (a
function that exists only to be fired by a trigger, writing outside the caller's
RLS reach).

Conventions to copy exactly (lines 590-614):

```sql
CREATE OR REPLACE FUNCTION public.bump_series_watermark()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.party_series
     SET highest_assigned = GREATEST(highest_assigned, NEW.number)
   WHERE id = NEW.series_id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bump_series_watermark() IS
  'Raises party_series.highest_assigned to the number just written on a night. GREATEST, never an '
  'assignment: a deleted night or a downward correction must not lower a level that has already '
  'been handed out and printed. SECURITY DEFINER because party_series carries no write policy.';

DROP TRIGGER IF EXISTS event_parties_bump_series_watermark ON public.event_parties;

CREATE TRIGGER event_parties_bump_series_watermark
  AFTER INSERT OR UPDATE OF number ON public.event_parties
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_series_watermark();
```

Extracted rules:

- `SET search_path = ''` **with every reference fully qualified**. The reason is
  written at `:582-584`: *"without it the caller chooses which `party_series` the
  definer writes, and Supabase's advisor reports `function_search_path_mutable`."*
  The new helper must fully qualify `public.event_parties` and `realtime.send`.
- `SECURITY DEFINER` must be **justified in a comment naming the reason**
  (`:579-581`). For this phase the reason is different and must be written out:
  the emit inserts into `realtime.messages`, and no client session may.
- `COMMENT ON FUNCTION` in the same block, prose, saying what it does *and what it
  refuses to do*.
- `DROP TRIGGER IF EXISTS` immediately before `CREATE TRIGGER` — idempotence
  (`supabase-data.md`, gate *idempotenza DDL*).
- `AFTER … FOR EACH ROW`.

**Second analog, for the grant/revoke question** —
`supabase/migrations/20260809004500_event_media_party_id.sql:253-262`. Read this
before deciding whether the four small trigger wrappers need a `REVOKE`/`GRANT`
pair:

```sql
-- No REVOKE/GRANT pair, and that is a decision rather than an oversight. Every
-- other function this phase family adds is `SECURITY DEFINER` and writes, so each
-- carries `REVOKE ... FROM public, anon, authenticated` and a grant to
-- `service_role`. This one is `SECURITY INVOKER`, writes nothing, and cannot be
-- called usefully at all outside a trigger — Postgres refuses a direct call with
-- `0A000`. Postgres checks EXECUTE on a trigger function when the TRIGGER is
-- created, not when it fires, so the default `EXECUTE` to `PUBLIC` grants nobody
-- anything here. Said out loud so the missing pair is not "repaired" into a
-- permission nobody needs […]
```

> **Applies with a twist.** The four `RETURNS trigger` wrappers are unreachable
> outside their triggers, so the paragraph above transfers verbatim. But
> `public.notify_attendance_changed(uuid, uuid)` is **not** a trigger function —
> it takes two `uuid` arguments and is therefore directly callable via
> `/rest/v1/rpc/notify_attendance_changed` by anyone holding `EXECUTE`. A
> signed-in member calling it would forge "the list changed" messages on any
> night whose id they know. **The `REVOKE ALL … FROM public, anon, authenticated`
> pair is mandatory on that one.** The revoke-then-grant precedent is
> `20260809001000_assignment_resolver.sql:483-485`:
>
> ```sql
> REVOKE ALL ON FUNCTION public.my_access_context(uuid) FROM public, anon, authenticated;
>
> GRANT EXECUTE ON FUNCTION public.my_access_context(uuid) TO authenticated;
> ```
>
> — here with **no** re-grant at all, since the only caller is a trigger running
> as the definer. Alternatively place the helper in the `private` schema, which is
> what `private.event_media_require_party` does.

#### A3 — the migration header and the single transaction

**Analog:** `supabase/migrations/20260809004000_door_scan_events_by_assignment.sql:1-22`

```sql
-- The door register, narrowed BY ASSIGNMENT and not by role
-- Phase 35, Plan 09: ASSIGN-01
--
-- Changes:
-- 1. public.door_scan_events_select_admin — dropped and re-created on THREE arms
--    of `private.has_capability`, in place of the single unconditional call it
--    carries today. […]
--
-- ONE change, ONE transaction. A `DROP POLICY` that committed without its
-- `CREATE POLICY` would leave `public.door_scan_events` with RLS enabled and no
-- SELECT policy at all: […] so the two statements are inside the same
-- `BEGIN`/`COMMIT` and the interrupted state cannot survive.
--
-- IDEMPOTENT, for the same reason: `DROP POLICY IF EXISTS` before the `CREATE`,
-- so re-running this file against a database that already holds the new policy
-- reproduces it rather than raising `42710` and stopping the queue behind it.

BEGIN;
…
COMMIT;
```

The new header must additionally carry, because the triggers are invisible from
TypeScript and two of them sit on money tables:

- every table it puts a trigger on, and why that table (RESEARCH § Where the
  Signal Is Emitted names four);
- the sentence for `ticketing-payments.md`'s reader: the triggers on `tickets` and
  `ticket_refunds` are `AFTER` triggers that write nothing of their own, and
  `realtime.send` wraps its insert in `EXCEPTION WHEN OTHERS THEN RAISE WARNING`,
  so they cannot alter, delay or fail a payment path;
- `meta-gates.md`: none of the three monotone guards is touched.

**Filename:** the newest migration on disk is
`20260810161000_venues_read_narrowed.sql`. The new file must sort after it —
`20260811……_live_attendance_channel.sql`.

---

### B. `src/app/(admin)/admin/scanner/ScannerClient.tsx` (client component, event-driven + request-response)

**Analog: the file itself.** Seven of the eight things this phase adds already
exist in it, in a form that must be extended rather than paralleled.

#### B1 — the listener block to extend, not duplicate (`:529-577`)

D-38-06 and RESEARCH § Pattern 3 both say the resume listeners join **this** block:

```typescript
  // Track online/offline status + the queue counters
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Setup sync listeners (online event, visibility change)
    const cleanupSync = setupSyncListeners();
    …
    // The counters already refreshed on a 5 s interval regardless of
    // connectivity; only the rendering was gated on being offline.
    refreshQueueCounts();
    const interval = setInterval(refreshQueueCounts, 5000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      cleanupSync();
      clearInterval(interval);
    };
  }, [refreshQueueCounts]);
```

Rules extracted: every `addEventListener` has its `removeEventListener` in the
returned cleanup; the interval is cleared in the same cleanup; the effect's dep
array holds only the stable `useCallback`.

**`visibilitychange` goes on `document`, never on `window`** — house precedent
`src/lib/offline/sync-manager.ts:653-671`:

```typescript
export function setupSyncListeners(): () => void {
  const onOnline = () => {
    syncPendingCheckins();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      syncPendingCheckins();
    }
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
```

Its docblock (`:643-652`) also states the rule this phase must respect:
*"Two triggers, and deliberately no timer: a parallel trigger set is two
schedulers fighting over one queue."* The 5-minute safety timer is a third
trigger on a **different** subject (the attendee list, not the queue) — say so in
a comment, or the next reader reads it as the contradiction it looks like.

#### B2 — the per-night effect with cleanup (`:593-622`) — the shape for channel subscribe/unsubscribe

D-38-05 ("one night at a time") is exactly this effect's discipline, already
written:

```typescript
  useEffect(() => {
    // Cleared FIRST, on every change of night, and this line is the whole of the
    // per-night discipline on the device: a verdict left over from the night
    // last opened would decide the night now open. […]
    setDoorAuth(null);
    setClockDriftMs(null);
    setScanPastEnd(false);

    if (!selectedPartyId) return;

    let cancelled = false;
    readDoorAuth(selectedPartyId)
      .then((cached) => { … })
      .catch((error) => {
        console.error("scanner:door_auth_unreadable", error);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartyId]);
```

Copy: state cleared **first** on every party change; early `return` when no party;
the `cancelled` flag guarding an async resolution against a stale effect — which
is precisely what RESEARCH § Pattern 1 needs for `await supabase.realtime.setAuth()`
followed by `channel(...).subscribe()`.

The sibling that fetches is `:884-890`, the one this effect must sit beside:

```typescript
  // Fetch attendance when party selected or search changes
  useEffect(() => {
    if (!selectedPartyId) return;
    const timer = setTimeout(() => {
      fetchAttendance(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedPartyId, searchQuery, fetchAttendance]);
```

**Note for the planner:** the channel effect must key on `selectedPartyId` **only**
— not on `searchQuery` — or a keystroke tears down and rebuilds the WebSocket.

#### B3 — the interval ticker with a guard (`:624-635`) — the shape for the 5-min safety timer and the 5 s freshness tick

```typescript
  /**
   * A 30-second tick, and ONLY while the server declared an end for this night.
   *
   * When `validUntil` is `null` no interval is created and nothing is watched:
   * an absent end is not an end at midnight, and no expiry is invented from it.
   */
  useEffect(() => {
    if (!doorAuth?.validUntil) return;
    setNowMs(Date.now());
    const tick = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, [doorAuth?.validUntil]);
```

RESEARCH § Freshness Display names this exact block: *"There is already a 30 s
ticker of exactly this shape at `ScannerClient.tsx:630-635`; follow its
structure."* Copy: the early `return` that creates no interval at all when the
precondition is absent; the immediate first computation before the interval; the
numeric separator `30_000`; the cleanup.

#### B4 — the one fetch site, and its notice accumulation (`:654-876`)

D-38-02 forbids a sibling. The relevant contract of `fetchAttendance`:

- signature `async (search?: string)`, `useCallback` with deps
  `[selectedPartyId, refreshQueueCounts]` (`:875`);
- every failure branch **returns early** and sets a notice — network unreachable
  (`:664-679`), non-ok (`:681-703`), unparseable (`:725-735`);
- notices accumulate into a local `const notices: CacheNotice[] = []` (`:705`) and
  are committed once at `:863` with `setCacheNotices(notices)`;
- the merge into IndexedDB is skipped on a search-filtered fetch — `if (eventData
  && !search)` (`:786`). RESEARCH Open Question 3 says accept this and write the
  sentence beside the call so nobody "fixes" it into a cache-clobbering merge of a
  filtered list;
- the queue drain is piggybacked on success (`:865-873`).

**Where `lastFetchAt` must be recorded:** RESEARCH says *after* `setCacheNotices`
— i.e. immediately after `:863` — so a fetch that failed and surfaced a notice does
not count as fresh. Every early `return` above it therefore correctly leaves the
age climbing.

**The refusal-surfacing block to preserve (`:786-808`)** — the FIX-06 fix, and the
thing a second fetch site would break:

```typescript
      // Cache attendees in IndexedDB for offline (only full list, not search-filtered)
      if (eventData && !search) {
        // FIX-06 becomes observable here. `mergeAttendees` returns its refusal
        // as a **value** (checkin-store.ts:429-438); this call site used to drop
        // it, so the guard protected the cache and said nothing to the person
        // holding the phone.
        try {
          const result = await mergeAttendees(selectedPartyId, eventData.attendees);
          if (!result.applied) {
            notices.push({ key: "merge", tone: "error", text: mergeRefusalSentence(result) });
          }
        } catch (error) {
          console.error("scanner:merge_failed", error);
          notices.push({
            key: "merge",
            tone: "error",
            text: "This device could not update its offline list. Scanning continues from what it already holds.",
          });
        }
      }
```

#### B5 — the deferral lock (`:917-918` taken, `:996-1004` released)

D-38-08 / RESEARCH § Pattern 2 hang the reload deferral off this exact pair.

Taken, inside the camera decode callback (`:916-918`):

```typescript
        (decodedText: string) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
```

Released, in `dismissFlash` (`:996-1004`):

```typescript
  const dismissFlash = useCallback(() => {
    setFlash(null);
    isProcessingRef.current = false;
    // Resume scanner decoding
    const scanner = scannerInstanceRef.current as { resume: () => void } | null;
    if (scanner) {
      try { scanner.resume(); } catch { /* ignore if already running */ }
    }
  }, []);
```

The drain of `pendingReloadRef` goes immediately after
`isProcessingRef.current = false`, before the scanner resume. The reset path at
`:1893` (`setCacheNotices([])`) is the second release point RESEARCH names — check
it too.

#### B6 — the typed refusal, returned as a value (`checkin-store.ts:648-667`)

The house style for anything the channel layer refuses. Copy the shape, not just
the idea:

```typescript
/** Why a refresh declined to apply a payload. */
export type MergeRefusalReason = "empty_payload" | "payload_smaller_than_cache";

/**
 * The result of a refresh — a **value**, not an exception and not a log line.
 *
 * There is no error tracking in this project, so the person holding the phone is
 * the only observer there is. A refusal that nothing renders is a refusal nobody
 * knows about.
 */
export type MergeResult =
  | { applied: true; merged: number }
  | {
      applied: false;
      reason: MergeRefusalReason;
      /** How many rows the device already held for this party. */
      cached: number;
      /** How many the payload offered. */
      received: number;
    };
```

and its exhaustive rendering, `ScannerClient.tsx:267-277` — a `switch` over the
reason union with **one sentence per reason**, never a shared "Invalid":

```typescript
/** Why a refresh was declined, in plain words, one sentence per reason. */
function mergeRefusalSentence(
  refusal: Extract<MergeResult, { applied: false }>
): string {
  switch (refusal.reason) {
    case "empty_payload":
      return `The attendee list was NOT refreshed: the server returned an empty list while this device holds ${refusal.cached}. The list on this device was kept.`;
    case "payload_smaller_than_cache":
      return `The attendee list was NOT refreshed: the server returned ${refusal.received} people while this device holds ${refusal.cached} and still has entries to report. The list on this device was kept.`;
  }
}
```

**Where it applies in this phase:** the `REALTIME_SUBSCRIBE_STATES` union
(`SUBSCRIBED | TIMED_OUT | CLOSED | CHANNEL_ERROR`) is the same shape of
discriminated union, and RESEARCH § What a Green Build Proves says the build does
prove exhaustiveness **if written as a `switch`**. Write it as one. Note the
constraint from D-38-04: those branches may write `setChannelLive` and a
categorised `console.warn` and **nothing else** — never a sentence about the
operator's permission.

#### B7 — the tone-tagged notice, for the staleness band (`:281-292` and `:2431-2446`)

CONTEXT § Reusable Assets is explicit that the band joins this family rather than
inventing a parallel one.

Type (`:281-292`):

```typescript
/**
 * A line that stays on the screen until the next successful refresh.
 *
 * Not a toast. The person holding the phone may be looking at a queue rather
 * than at the screen, and with no error tracking anywhere in this project that
 * screen is the only observer a failed refresh has.
 */
interface CacheNotice {
  key: string;
  tone: "warn" | "error";
  text: string;
}
```

Render (`:2431-2446`):

```tsx
        {cacheNotices.length > 0 && (
          <div className="mb-4 space-y-2" role="status" aria-live="polite">
            {cacheNotices.map((notice) => (
              <div
                key={notice.key}
                className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${
                  notice.tone === "error"
                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                    : "border-yellow-500/40 bg-yellow-500/10 text-yellow-500"
                }`}
              >
                {notice.text}
              </div>
            ))}
          </div>
        )}
```

> **Structural conflict the planner must resolve, not paper over.** `cacheNotices`
> is **replaced wholesale** on every fetch (`setCacheNotices(notices)`, `:863`), so
> a staleness band pushed into that array would be erased by the next successful
> refresh — which is fine — but also by any *failed* one that returns early with
> its own `setCacheNotices([...])`, which is not. The staleness band is **derived
> state** (`!channelLive || age > 5 min`), not an accumulated event. Two honest
> options: (a) render it as its own element **using the same tone classes and the
> same `role="status" aria-live="polite"` container**, immediately above the
> notices block; or (b) compute it into the array at render time rather than
> storing it. (a) is the smaller change and keeps `setCacheNotices` as the single
> writer of its own array. Whichever is chosen, the visual family must match —
> that is what "belongs to the same family" means here.

#### B8 — the counter row that becomes the reload control (`:2311-2341`)

D-38-10. Today it is a `<div>`; RESEARCH says it must become a real `<button>`
with an accessible name, under `nextjs-architecture.md`'s dark-venue gate.

```tsx
        {/* Progress bar for selected party */}
        {attendance && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">Checked in</span>
              <span className="text-xs font-semibold text-foreground">
                {totalCheckedIn} / {totalAttendees}
                {(attendance.guestListCount ?? 0) > 0 && (
                  <span className="text-purple-400 font-normal">
                    {" "}
                    (+{attendance.guestListCount} guest list)
                  </span>
                )}
                {totalAttendees > 0 && (
                  <span className="text-muted font-normal">
                    {" "}
                    ({Math.round((totalCheckedIn / totalAttendees) * 100)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 rounded-full bg-card-border overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${totalAttendees > 0 ? Math.round((totalCheckedIn / totalAttendees) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        )}
```

**Button styling analog in the same file** — the torch toggle (`:2455-2463`), the
nearest existing full-width tap target:

```tsx
              <button
                onClick={toggleTorch}
                className={`mt-3 w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium transition-colors ${
                  torchOn
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-card-border/30 text-muted hover:text-foreground"
                }`}
              >
```

Note `w-full` and `py-2.5`: the house size for a one-handed target on this screen.
Wrapping the counter row means `type="button"`, `w-full`, `text-left`, and an
`aria-label` that says what tapping does (the visible text says "updated 12s ago",
which is not the same sentence).

#### B9 — the Supabase browser client, created the way this project creates it

**Factory:** `src/lib/supabase/client.ts` (all 8 lines):

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Call-site convention in a client component** —
`src/components/media/MediaUpload.tsx:61` and `:342`, `src/components/events/EventForm.tsx:5`
and `:463`. Both import the factory at module top and call it **inside** the
function that needs it, never at module scope:

```typescript
import { createClient } from "@/lib/supabase/client";
…
    const supabase = createClient();
```

RESEARCH § Pitfall 7 explains why this is safe and why no second factory may be
added: `@supabase/ssr` 0.8.0 caches a module-level singleton in the browser, so
`createClient()` returns the same client every time — which is also why per-call
`realtime` options would be silently ignored.

**Logging category convention across the whole file** — `scanner:<snake_case>` as
the first argument, the error object second, never a bare string:

```typescript
console.error("scanner:queue_counts_unavailable", error);   // :524
console.error("scanner:device_id_unavailable", error);      // :549
console.error("scanner:door_auth_unreadable", error);       // :617
console.error("scanner:attendance_unreachable", error);     // :669
console.error("scanner:attendance_failed", { status: res.status, detail }); // :692
console.error("scanner:merge_failed", error);               // :801
console.error("scanner:member_roster_failed", error);       // :839
console.error("scanner:sync_failed", error);                // :871
```

RESEARCH's proposed `scanner:channel_not_listening` and `scanner:reload` fit this
convention exactly. `meta-gates.md` requires each error path to carry a category
that distinguishes it from the others — no collapsed generic message.

---

## Shared Patterns

### S1 — Every capability question goes to `private.has_capability`
**Source:** `supabase/migrations/20260809001000_assignment_resolver.sql:320-368`
**Apply to:** the new migration's policy, and nowhere else in this phase.

```sql
CREATE OR REPLACE FUNCTION private.has_capability(
  p_capability text,
  p_party_id   uuid default null
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  select exists ( … role grant … )
  or exists (
    select 1
    from public.party_assignments pa
    where p_party_id is not null
      and pa.party_id = p_party_id
      and pa.user_id = (select auth.uid())
      and pa.capability = p_capability
      and pa.revoked_at is null
      and now() < pa.ends_at
  );
$$;

GRANT EXECUTE ON FUNCTION private.has_capability(text, uuid) TO authenticated, anon;
```

No second predicate. The client never re-derives the answer (D-38-03, D-38-04).

### S2 — A refusal is a **value**, never a thrown message
**Source:** `src/lib/offline/checkin-store.ts:648-667` + `ScannerClient.tsx:267-277`
**Apply to:** every new refusal path in this phase — the channel status union, the
deferred-reload outcome, anything the freshness layer declines to do.

### S3 — One notice mechanism, tone-tagged, never a toast
**Source:** `ScannerClient.tsx:281-292` (type), `:2431-2446` (render)
**Apply to:** the staleness band. Same container semantics
(`role="status" aria-live="polite"`), same red/yellow tone classes.

### S4 — Every listener and every timer is torn down in the same cleanup
**Source:** `ScannerClient.tsx:529-577`, `:624-635`; `sync-manager.ts:653-671`
**Apply to:** the resume listener set, the safety interval, the freshness tick, and
`supabase.removeChannel(channel)`.

### S5 — One transaction, idempotent DDL, and the omission written down
**Source:** `supabase/migrations/20260809004000_…:1-22, 198-210`;
`20260809004600_…:129-151`
**Apply to:** the whole new migration.

### S6 — The device clock is evidence, never authority
**Source:** `ScannerClient.tsx:740-745`

```typescript
        // The drift, measured at the only moment both clocks are comparable, and
        // measured to be SHOWN. Nothing branches on it. Any use of the device
        // clock to decide a refusal is the alarm signal of this plan — the
        // lexicon is `checkin-store.ts`: evidence, never authority.
        const serverMs = Date.parse(verdict.resolvedAt);
        setClockDriftMs(Number.isNaN(serverMs) ? null : Date.now() - serverMs);
```

**Apply to:** "updated Ns ago". It is a display of local elapsed time; the only
branch it may drive is *show the band / do not show the band*. No verdict, no
refusal, no admission reads it.

---

## No Analog Found

Files and sub-patterns with no close match in the codebase. The planner should
work from RESEARCH.md's verified code blocks instead, and treat these as the
places where "copy the house pattern" gives no cover.

| Item | Role | Data Flow | Reason |
|------|------|-----------|--------|
| **The Realtime channel subscription** (`supabase.channel()`, `.on('broadcast', …)`, `.subscribe()`, `removeChannel`, `realtime.setAuth()`, `realtime.onHeartbeat()`) inside `ScannerClient.tsx` | client lifecycle | event-driven / pub-sub | **Verified today: zero occurrences of `.channel(`, `removeChannel` or `realtime.` anywhere under `src/`.** This is the first Realtime use in the product. Source of truth: RESEARCH § Pattern 1, 3, 4 — all verified against `@supabase/supabase-js` 2.97.0 in `node_modules`. The only house patterns that transfer are the *shells* (B2 effect shape, B4 single-fetch rule, S4 teardown), not the API |
| **`realtime.send()` emitted from a trigger** | migration | pub-sub | No migration in this repository has ever written to a Supabase-managed schema other than `storage` (a policy, not an insert). The `SECURITY DEFINER` / `search_path` / `COMMENT` / `DROP TRIGGER IF EXISTS` conventions transfer from A2; the emit itself has no precedent. RESEARCH § Where the Signal Is Emitted carries the verified `realtime.send` signature and body |
| `src/app/(admin)/admin/scanner/useDoorChannel.ts` (only if the split is taken) | client module / hook | event-driven | The scanner directory holds exactly two files today — `ScannerClient.tsx` and `page.tsx`. **No custom hook exists anywhere in this codebase** to copy a shape from. Structural rule that does apply: `nextjs-architecture.md` R-WORK-ROUTES — a non-route module stays at `src/app/(admin)/admin/…`, beside its only caller, and **not** under `src/lib/`, because a `src/lib/realtime/useLiveList.ts` is the exact shape the bar imports in six months (LIVE-07 / D-38-12) |

**Partial match, worth naming:** `performance.now()` appears once in the codebase
— `src/components/motion/CountUp.tsx:27` (`const startTime = performance.now();`)
— but as an animation clock, not as a monotonic freshness measure. It establishes
only that the API is used here; the reasoning for choosing it over `Date.now()` is
RESEARCH § Freshness Display, reinforced by S6 above.

---

## Metadata

**Analog search scope:** `supabase/migrations/` (41 files), `src/app/(admin)/admin/scanner/`,
`src/lib/offline/`, `src/lib/supabase/`, `src/lib/door/`, `src/components/` (client-component
call sites for `createClient`), plus repo-wide greps for `.channel(`, `removeChannel`,
`realtime.`, `performance.now()`, `RETURNS trigger`, `CREATE TRIGGER`, `CREATE POLICY`.

**Files read in full or in targeted ranges:**
`supabase/migrations/20260809004000_door_scan_events_by_assignment.sql` (all 228),
`20260809001000_assignment_resolver.sql:300-369, 482-486`,
`20260810120000_formats_and_series.sql:556-617`,
`20260809004500_event_media_party_id.sql:222-273`,
`20260809004600_event_media_quarantine_bucket.sql:129-151`,
`src/lib/supabase/client.ts` (all 8),
`src/lib/offline/checkin-store.ts:630-719`,
`src/lib/offline/sync-manager.ts:630-671`,
`src/app/(admin)/admin/scanner/ScannerClient.tsx:1-70, 262-301, 500-719, 700-919, 960-1009, 2270-2359, 2425-2464`.

**Pattern extraction date:** 2026-08-11
</content>
</invoke>
