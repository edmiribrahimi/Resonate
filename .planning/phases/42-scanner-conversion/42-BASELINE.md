# Phase 42 — the scanner's mechanical record, taken before the conversion

- **Commit:** `d3ae238b60cfa214d8681d8b7576dda45eb78a7d`
- **Captured:** 2026-08-18
- **Command:** `node scripts/capture-scanner-baseline.mjs`

At this commit the scanner is **unconverted**: no class string in its perimeter has been rewritten, and every constant below is the one the first real door will run on.

Everything between the two markers is the diffable region. The comparison after the conversion cuts on them, so the commit and the date above never appear in a diff.

<!-- BASELINE-DIFFABLE-BEGIN -->

## Block 1 — the three dwells · `src/components/scanner/ScanFlash.tsx:76`

| outcome | key | `bg` | `delay` (ms) | line |
|---|---|---|---|---|
| success | `success` | `bg-green-500/90` | **1500** | 77 |
| already_recorded | `already_recorded` | `bg-amber-500/90` | **2500** | 90 |
| error | `error` | `bg-red-500/90` | **2000** | 105 |

- entries: **3**
- dwells distinct across the three outcomes: **yes**
- dwell is information, not decoration: the third state sits longer because it carries a time and an operator to read.

## Block 2 — the three haptic literals · `src/utils/haptics.ts`

| function | pattern | line |
|---|---|---|
| `vibrateSuccess` | `200` | 19 |
| `vibrateError` | `[100, 50, 100]` | 25 |
| `vibrateAlreadyRecorded` | `[300, 80, 120]` | 38 |

- calls: **3**
- patterns distinct across the three outcomes: **yes**
- this channel is the one that works when the screen is not being looked at, and the one that does nothing at all on iOS.

## Block 3 — the outcome → haptic mapping · `src/app/(admin)/admin/scanner/ScannerClient.tsx:1595`

```tsx
  const showFlash = useCallback(
    (type: ScanFlashType, title: string, subtitle?: string) => {
      if (type === "success") {
        vibrateSuccess();
      } else if (type === "already_recorded") {
        vibrateAlreadyRecorded();
      } else {
        vibrateError();
      }
      setStatus(type);
      setFlash({ type, title, subtitle });
    },
    []
  );
```

- lines: **14**

## Block 4 — every `showFlash` call site · `src/app/(admin)/admin/scanner/ScannerClient.tsx`

| line | enclosing function | outcome passed | title? | args |
|---|---|---|---|---|
| 1734 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1749 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1758 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1783 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1792 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1835 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1859 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1866 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1903 | `refuse` | `error` | yes | 3 |
| 1936 | `reportServerFault` | `error` | yes | 3 |
| 1951 | `reportStoreFault` | `error` | yes | 3 |
| 2032 | `ticketOnline` | `already_recorded` / `success` | yes | 3 |
| 2067 | `ticketOnline` | `already_recorded` | yes | 3 |
| 2084 | `ticketOnline` | `error` | yes | 3 |
| 2123 | `ticketOffline` | `already_recorded` | yes | 3 |
| 2156 | `ticketOffline` | `already_recorded` / `success` | yes | 3 |
| 2196 | `ticketOffline` | `already_recorded` | yes | 3 |
| 2257 | `membershipOnline` | `success` | yes | 3 |
| 2272 | `membershipOnline` | `already_recorded` | yes | 3 |
| 2287 | `membershipOnline` | `error` | yes | 2 |
| 2345 | `membershipOffline` | `already_recorded` | yes | 3 |
| 2358 | `membershipOffline` | `success` | yes | 3 |
| 2432 | `handleVerify` | `error` | yes | 3 |
| 2466 | `handleGuestCheckIn` | `success` | yes | 3 |
| 2485 | `handleGuestCheckIn` | `already_recorded` | yes | 3 |
| 2503 | `handleGuestCheckIn` | `error` | yes | 3 |

- call sites: **26**
- sites passing a title: **26** of 26
- a title on every site is the half of DS-04 that says the state is written in **words** and not only painted. A site passing none is recorded here as a finding; it is not repaired by this capture.

| outcome | sites |
|---|---|
| `already_recorded` | 8 |
| `error` | 15 |
| `success` | 5 |

## Block 5 — the three outcomes, as a type · `src/lib/door/outcome.ts:116`

```ts
export type DoorOutcome =
  | {
      outcome: "recorded";
      subject: DoorSubject;
      /** ISO. When the entry was recorded. */
      at: string;
      flags?: DoorFlag[];
    }
  | {
      outcome: "already_recorded";
      subject: DoorSubject;
      /** ISO. When the **first** record was made — not the current read. */
      at: string;
      /** FIX-04a: who and when, and nothing that resembles a verdict. */
      by: { operatorId: string; operatorLabel: string };
    }
  | {
      outcome: "not_valid";
      reason: DoorNotValidReason;
    };
```

- discriminants: **3** — `recorded`, `already_recorded`, `not_valid`
- there are three, and an undo is not a fourth: it is a flagged record.

## Block 6 — the six glyph path literals

| where | state | path | line |
|---|---|---|---|
| the flash | `success` | `m4.5 12.75 6 6 9-13.5` | `src/components/scanner/ScanFlash.tsx:85` |
| the flash | `already_recorded` | `M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z` | `src/components/scanner/ScanFlash.tsx:100` |
| the flash | `error` | `M6 18 18 6M6 6l12 12` | `src/components/scanner/ScanFlash.tsx:113` |
| the scan history | `isSuccess` | `m4.5 12.75 6 6 9-13.5` | `src/app/(admin)/admin/scanner/ScannerClient.tsx:3291` |
| the scan history | `isFlagged` | `M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z` | `src/app/(admin)/admin/scanner/ScannerClient.tsx:3305` |
| the scan history | `isError` | `M6 18 18 6M6 6l12 12` | `src/app/(admin)/admin/scanner/ScannerClient.tsx:3319` |

- literals: **6**
- **six and not three, and the reason matters:** the same three states are drawn **twice** — once full-screen in the flash, once again as a small mark in the scan history. A conversion that repaints one copy and forgets the other leaves the door saying two different things about one scan.
- glyphs distinct within the flash: **yes** · within the scan history: **yes**

## Block 7 — the offline queue's shape · `src/lib/offline/checkin-store.ts`

| constant | value | line |
|---|---|---|
| `DB_NAME` | `"resonate-checkin"` | 56 |
| `DB_VERSION` | `5` | 57 |
| `MAX_SYNC_ATTEMPTS` | `8` | 99 |

| type | declaration | line |
|---|---|---|
| `QueuedSubjectType` | `export type QueuedSubjectType = "ticket" \| "guest" \| "membership";` | 105 |
| `PendingCheckin` | `export interface PendingCheckin {` | 182 |
| `FailedCheckin` | `export interface FailedCheckin extends Omit<PendingCheckin, "state"> {` | 244 |

- constants: **3** · types: **3**
- **`DB_VERSION` must not move.** A database version that rises inside a colour phase is a defect by definition: nothing here asks the store to change shape.

## Block 8 — the two roads: ticket and membership, online and offline

### `ticketOnline` — 3 site(s)

| line | outcome | title? |
|---|---|---|
| 2032 | `already_recorded` / `success` | yes |
| 2067 | `already_recorded` | yes |
| 2084 | `error` | yes |

### `ticketOffline` — 3 site(s)

| line | outcome | title? |
|---|---|---|
| 2123 | `already_recorded` | yes |
| 2156 | `already_recorded` / `success` | yes |
| 2196 | `already_recorded` | yes |

### `membershipOnline` — 3 site(s)

| line | outcome | title? |
|---|---|---|
| 2257 | `success` | yes |
| 2272 | `already_recorded` | yes |
| 2287 | `error` | yes |

### `membershipOffline` — 2 site(s)

| line | outcome | title? |
|---|---|---|
| 2345 | `already_recorded` | yes |
| 2358 | `success` | yes |

### every other function that flashes

| function | sites | lines |
|---|---|---|
| `handleGuestCheckIn` | 3 | 2466, 2485, 2503 |
| `handleUndoCheckIn` | 8 | 1734, 1749, 1758, 1783, 1792, 1835, 1859, 1866 |
| `handleVerify` | 1 | 2432 |
| `refuse` | 1 | 1903 |
| `reportServerFault` | 1 | 1936 |
| `reportStoreFault` | 1 | 1951 |

- functions that flash: **10** · of them the four roads: **4**

## Block 9 — the route manifest gate · `scripts/verify-routes.mjs`

```
verify-routes — the map against the disk
  patterns parsed from CAPABILITY_ROUTES: 30 (27 under /admin)
  public allow-list entries: 4

[1/2] revalidatePath arguments
  files scanned:                 306
  literal arguments read:        75
  non-literal arguments skipped: 0  (invisible to this parse)
  ok — every statically visible literal names a declared address.

[2/2] route census — src/app/(admin)
  pages found:                   28
  patterns under /admin:         27  (a pattern with no page is not an error)
  ok — every page resolves to a pattern in the map.

PASS — both checks green.
  This means every statically visible literal names a declared address, not that every
  revalidatePath in this repository is correct. See the docblock.
```

- exit code: **0**
- invoked, never re-implemented: this block is that gate's own verdict, committed.

## Block 10 — the double-read window · `src/lib/door/classify.ts:64`

- `DOUBLE_READ_WINDOW_SECONDS` = **20**
- it is the number that decides whether a second read of one code is *already recorded* or a fresh scan. Tuning it is a decision about a real night, never a side effect of a colour change.

## Block 11 — the camera configuration · `src/app/(admin)/admin/scanner/ScannerClient.tsx`

| literal | value | line |
|---|---|---|
| `fps` | `15` | 1529 |
| `qrbox.width` | `280` | 1529 |
| `qrbox.height` | `280` | 1529 |
| `facingMode` | `environment` | 1528 |

- literals: **4**
- **criterion 2 touches the container, never this line.** A viewfinder that centres itself is a layout change; a decode box that changes size is a change to what the camera can read at the door.

## Block 12 — the build

- command: `npm run build`
- exit code: **0**
- there is no test runner in this repository: `next build` **is** the typecheck, and this integer is the whole of what it proves. Its output is deliberately not reproduced — it carries timings and byte sizes, and a record that moves on its own is a record nobody can diff.

## Block 13 — the four error-message tables, byte for byte · `src/app/(admin)/admin/scanner/ScannerClient.tsx`

### `NOT_VALID_MESSAGE` · line 83

```ts
const NOT_VALID_MESSAGE: Record<DoorNotValidReason, string> = {
  invalid_signature: "This code was not issued by us",
  unknown_code: "No ticket or member matches this code",
  wrong_night: "This code is for another night",
  no_party_selected: "Choose the party first — a scan needs a night",
  // The one member of the union no live scan can produce: the check-in route
  // answers it only for a report arriving from the drain (plan 35-12). The
  // sentence exists because the `Record` is total, and a total `Record` with a
  // hole would be a member silently falling to UNRECOGNISED_REASON_MESSAGE. If
  // it ever does reach this screen, it is not about the person in front of it —
  // it is about this device's authorisation for that night.
  no_assignment_at_scan:
    "This device had no door assignment for that night — recorded, not admitted",
};
```

### `UNRECOGNISED_REASON_MESSAGE` · line 99

```ts
const UNRECOGNISED_REASON_MESSAGE = "This code could not be validated";
```

### `FLAG_MESSAGE` · line 105

```ts
const FLAG_MESSAGE: Record<DoorFlag, string> = {
  refunded_before_night: "Refunded before tonight — admitted, flagged for review",
  not_in_cache: "Not in the list on this device — admitted, flagged for review",
};
```

### `FAILURE_REASON_MESSAGE` · line 232

```ts
const FAILURE_REASON_MESSAGE: Record<string, string> = {
  invalid_signature: "the code was not issued by us",
  unknown_code: "nothing matched this code",
  wrong_night: "the code was for another night",
  no_party_selected: "no party was selected when it was scanned",
  unexpected_response: "the server never accepted it",
};
```

- tables: **4**
- captured verbatim because the causes must stay told apart. `meta-gates.md` forbids a handler that collapses distinct causes into one message, and this project has the recorded precedent — the newsletter form's single sentence for every failure. At the door the sentence on the screen is the only observer that exists: there is **no error tracking anywhere in this repository**.

<!-- BASELINE-DIFFABLE-END -->

---

## Context at capture — outside the diffable region, and deliberately so

This section describes the **state of the gate suite at this moment**, not an
invariant. It is expected to move in wave 0, and it is **not part of the
invariance diff**: the comparison after the conversion cuts on the two markers
above, so a repair made here can never be reported as a regression.

`npm run verify` **exits 2** on this tree, and 2 means *refused*, not *failed*.
Fifteen gates reached a verdict and none of them reported a failure; four could
not measure anything at all:

| gate | why it refused |
|---|---|
| `verify:capabilities` | missing `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL`. Its honest state on any machine that does not hold them |
| `verify:conversion` | `checkManifest()` refuses on **four dead entries** — the analytics and finance surfaces named in `CONVERTED` at paths that are not on disk. This is DEF-45-01, and wave 0 removes those four entries |
| `verify:section-export` | half of it needs the same credentials; the offline half — the import-closure walk — runs and reports its refusal **by cause**, which is why a missing entry file and a missing credential send a reader to two different places |
| `verify:touch-targets` | the same manifest refusal reaches it |

`verify:ics` is not run by the aggregate at all: it reads the production
calendar out of `docs/`, which git ignores, so it exists on one machine and
nowhere else.

**Two of these four are wave 0's own work**, and the record says so here rather
than leaving the later diff to discover it: the manifest repair is the removal
of the four dead entries, never a widening of the matcher.

---

## What this record does not prove

The nine rows of `42-RESEARCH.md` §6.2, one line each. Every one of them is a
procedure in `42-PROCEDURES.md`, and every one of those reads `Result: pending`.

1. **That the flash is readable at arm's length in a dark room.** Nothing in this
   repository renders a pixel — `verify-conversion.mjs` says it of its own green:
   *«it reads a class string and an import graph, renders nothing and measures no
   pixel»*.
2. **That the haptic is felt.** iOS degrades `navigator.vibrate` to nothing. A
   grep proves the call is there, never that a phone moved.
3. **That auto-return actually fires after the dwell.** The `setTimeout` is a
   runtime fact, and that dismissing the flash **re-enables decoding** is more of
   one.
4. **That the torch lights.** `getCapabilities().torch` depends on the device in
   the hand, not on the tree.
5. **That the offline queue survives closing the app and restarting the device.**
   It is IndexedDB on a real phone. *«Una coda in memoria non è una coda: è una
   speranza.»*
6. **That undo works offline.** The path is offline and per device, and its
   attribution — who and when — is the reason the gate exists.
7. **That the door renders with the radio off.** The runtime cache's keys are
   URLs, so the door's **two** addresses are two independent entries and warming
   one does not warm the other.
8. **That the three outcomes read the same online and offline.** That is phase
   31's second criterion, and it is human.
9. **That no error was swallowed.** There is **no error tracking anywhere in this
   repository**: the four crons run at night and the payment webhook runs when it
   runs, and if they fail nobody learns of it until somebody notices the effect.

**The sentence this phase depends on:** the record proves that the **constants**
and the **roads** did not move. It does not prove that the **behaviour** did not.
Criterion 3 closes by *running the door pass again on a device*, and
`39-VERIFICATION.md` is still `human_needed` for the reason that decides this
phase's order — **there is no *before*.** The door pass on the unconverted
scanner is the first baseline this project will ever have, and this record does
not substitute for it: it accompanies it.
