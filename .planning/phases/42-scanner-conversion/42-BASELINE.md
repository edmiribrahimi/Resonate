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

---

# AFTER — the same record, taken on the converted tree

- **Commit:** `fd3bf46e40e9e11c2ae10df1dcd2ff8fc3371f86`
- **Captured:** 2026-08-18
- **Command:** `node scripts/capture-scanner-baseline.mjs` — exit **0**

At this commit the scanner is **converted**. Plans 42-06 to 42-11 have shipped: the three outcomes carry their measured colours in both places they are drawn, the connectivity pill is readable by a gate, the raw palette of the door is down to its declared derogations, the forty-two legacy aliases are gone, both roots and the viewfinder carry a maximum, and the phase's fence is down in all three of the places it lived.

> **The capture script prints a fixed header, and that header now says the opposite of what is true.** `scripts/capture-scanner-baseline.mjs` writes *«At this commit the scanner is unconverted»* as a literal string on every run, because it was written when only one run was foreseen. The sentence sits **above** `AFTER-DIFFABLE-BEGIN`, so it never enters a comparison and it has moved nothing — but a reader who pipes the script to a file today gets a document that lies in its fourth line. It is recorded as **DEF-42-07** rather than repaired here: this plan changes no file under `scripts/`, and a record that edits the instrument it is measuring with is not a record.

## What was embedded, and the one thing that was changed doing it

The region below is the capture's own output, byte for byte, with **two exceptions and no others**: the opening and closing marker comments are renamed from `BASELINE-DIFFABLE-…` to `AFTER-DIFFABLE-…`. Without the rename this file would hold two identically named regions, and no extraction could tell a reader which of the two it had returned.

That the rename is the *only* change is not asserted, it is checked: re-extracting this region from this file, renaming the two markers back, and diffing against the raw capture is silent. The command is in the comparison block below.

<!-- AFTER-DIFFABLE-BEGIN -->

## Block 1 — the three dwells · `src/components/scanner/ScanFlash.tsx:95`

| outcome | key | `bg` | `delay` (ms) | line |
|---|---|---|---|---|
| success | `success` | `bg-green-500/90` | **1500** | 96 |
| already_recorded | `already_recorded` | `bg-sem-done/90` | **2500** | 109 |
| error | `error` | `bg-red-600/90` | **2000** | 124 |

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

## Block 3 — the outcome → haptic mapping · `src/app/(admin)/admin/scanner/ScannerClient.tsx:1621`

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
| 1760 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1775 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1784 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1809 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1818 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1861 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1885 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1892 | `handleUndoCheckIn` | `error` | yes | 3 |
| 1929 | `refuse` | `error` | yes | 3 |
| 1962 | `reportServerFault` | `error` | yes | 3 |
| 1977 | `reportStoreFault` | `error` | yes | 3 |
| 2058 | `ticketOnline` | `already_recorded` / `success` | yes | 3 |
| 2097 | `ticketOnline` | `already_recorded` | yes | 3 |
| 2114 | `ticketOnline` | `error` | yes | 3 |
| 2153 | `ticketOffline` | `already_recorded` | yes | 3 |
| 2186 | `ticketOffline` | `already_recorded` / `success` | yes | 3 |
| 2226 | `ticketOffline` | `already_recorded` | yes | 3 |
| 2287 | `membershipOnline` | `success` | yes | 3 |
| 2302 | `membershipOnline` | `already_recorded` | yes | 3 |
| 2317 | `membershipOnline` | `error` | yes | 2 |
| 2375 | `membershipOffline` | `already_recorded` | yes | 3 |
| 2388 | `membershipOffline` | `success` | yes | 3 |
| 2462 | `handleVerify` | `error` | yes | 3 |
| 2496 | `handleGuestCheckIn` | `success` | yes | 3 |
| 2515 | `handleGuestCheckIn` | `already_recorded` | yes | 3 |
| 2533 | `handleGuestCheckIn` | `error` | yes | 3 |

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
| the flash | `success` | `m4.5 12.75 6 6 9-13.5` | `src/components/scanner/ScanFlash.tsx:104` |
| the flash | `already_recorded` | `M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z` | `src/components/scanner/ScanFlash.tsx:119` |
| the flash | `error` | `M6 18 18 6M6 6l12 12` | `src/components/scanner/ScanFlash.tsx:132` |
| the scan history | `isSuccess` | `m4.5 12.75 6 6 9-13.5` | `src/app/(admin)/admin/scanner/ScannerClient.tsx:3332` |
| the scan history | `isFlagged` | `M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z` | `src/app/(admin)/admin/scanner/ScannerClient.tsx:3346` |
| the scan history | `isError` | `M6 18 18 6M6 6l12 12` | `src/app/(admin)/admin/scanner/ScannerClient.tsx:3360` |

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
| 2058 | `already_recorded` / `success` | yes |
| 2097 | `already_recorded` | yes |
| 2114 | `error` | yes |

### `ticketOffline` — 3 site(s)

| line | outcome | title? |
|---|---|---|
| 2153 | `already_recorded` | yes |
| 2186 | `already_recorded` / `success` | yes |
| 2226 | `already_recorded` | yes |

### `membershipOnline` — 3 site(s)

| line | outcome | title? |
|---|---|---|
| 2287 | `success` | yes |
| 2302 | `already_recorded` | yes |
| 2317 | `error` | yes |

### `membershipOffline` — 2 site(s)

| line | outcome | title? |
|---|---|---|
| 2375 | `already_recorded` | yes |
| 2388 | `success` | yes |

### every other function that flashes

| function | sites | lines |
|---|---|---|
| `handleGuestCheckIn` | 3 | 2496, 2515, 2533 |
| `handleUndoCheckIn` | 8 | 1760, 1775, 1784, 1809, 1818, 1861, 1885, 1892 |
| `handleVerify` | 1 | 2462 |
| `refuse` | 1 | 1929 |
| `reportServerFault` | 1 | 1962 |
| `reportStoreFault` | 1 | 1977 |

- functions that flash: **10** · of them the four roads: **4**

## Block 9 — the route manifest gate · `scripts/verify-routes.mjs`

```
verify-routes — the map against the disk
  patterns parsed from CAPABILITY_ROUTES: 30 (27 under /admin)
  public allow-list entries: 4

[1/2] revalidatePath arguments
  files scanned:                 305
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
| `fps` | `15` | 1555 |
| `qrbox.width` | `280` | 1555 |
| `qrbox.height` | `280` | 1555 |
| `facingMode` | `environment` | 1554 |

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

<!-- AFTER-DIFFABLE-END -->

---

# The comparison

## The rule, written before the run

Plan 42-12 fixed both verdicts in advance so that neither could be argued into shape afterwards:

- **Silent** — say so, quote the silence, and list the validation rows it closes.
- **Not silent** — **do not touch the BEFORE record.** Quote every differing line, name the plan and the commit that produced it, say what behaviour that constant governs, and then either argue the change is correct in writing here or record it as a defect with its repair and stop.

**The run was not silent.** What follows is the second branch, taken in full.

## Step 1 — the raw comparison, and why it is not the answer

```sh
# cut(BEGIN, END, file) — WHOLE-LINE equality, first BEGIN to the first END after it, then stop
cut() { awk -v b="$1" -v e="$2" '$0 == b {f=1} f {print} f && $0 == e {exit}' "$3"; }

BEG='<!-- BASELINE-DIFFABLE-BEGIN -->'; END='<!-- BASELINE-DIFFABLE-END -->'
cut "$BEG" "$END" 42-BASELINE.md > before-region.md
node scripts/capture-scanner-baseline.mjs > after-12.md
cut "$BEG" "$END" after-12.md    > after-region.md
diff before-region.md after-region.md
```

Exit **1**. **118** differing lines out of a 295-line region.

> **Why whole-line equality, and not the obvious `sed -n '/BEGIN/,/END/p'` that was reached for first.** This document **names its own markers in prose**, in the paragraphs around and below the region. A `sed` range re-opens at every later line matching the opening pattern, so the moment those paragraphs existed the range stopped returning one region and started returning the region *plus* the sentences describing it — silently, exit 0. A substring-matching `awk` was the first repair and it was **not enough**: one sentence names the opening marker inside a clause, and the extraction opened there, eight lines early. Only equality against the entire marker line is out of reach of prose, because a sentence that mentions a marker always carries something else on the line with it.
>
> Both failures were caught by the assertions in step 6, not by reading the commands. **A record whose extraction can be broken by editing the record is not a record** — and this one broke twice in the writing of this section, which is the reason the check is run rather than reasoned about.

Almost all of them are one thing: the record cites **line positions**, and the conversion added lines above nearly every citation. `ScanFlash.tsx:76` became `:95`; the twenty-six `showFlash` sites moved from `1734…2503` to `1760…2533`; the decode configuration moved from `1528-1529` to `1554-1555`. **A line that moved is not a behaviour that moved**, and a comparison that cannot tell those apart cannot answer the question the criterion asks.

## Step 2 — the normalisation, and the exact promise it makes

Four rules, each anchored so that it cannot reach a value, a count, a colour token or a message:

| rule | what it rewrites | example |
|---|---|---|
| A | a line anchor that follows a source file name | `ScanFlash.tsx:76` → `ScanFlash.tsx:L` |
| B | a table row whose **first** column is a line number | `\| 1734 \|` → `\| L \|` |
| C | a table row whose **last** column is a line number of **two or more digits** | `… \| 105 \|` → `… \| L \|` |
| D | a table row whose last column is a comma list of line numbers | `\| 2466, 2485, 2503 \|` → `\| L \|` |

```sh
normalise() {
  sed -E \
    -e 's#(\.(tsx|ts|mjs|css)):[0-9]+#\1:L#g' \
    -e 's/^\| [0-9]+ \|/| L |/' \
    -e 's/\| [0-9]{2,} \|$/| L |/' \
    -e 's/\| [0-9]+(, [0-9]+)+ \|$/| L |/' \
    "$1"
}
normalise before-region.md > before-norm.md
normalise after-region.md  > after-norm.md
diff before-norm.md after-norm.md
```

**Rule C's two-digit floor is the one detail that is load-bearing.** Block 4's rows end in the *argument count* — `3` on twenty-five sites and `2` on one — and a rule that swallowed a single digit would have erased the one site that passes two arguments instead of three. The floor is what keeps that column readable.

**The normaliser touches nothing that decides anything at a door:** not a dwell, not a haptic pattern, not `DB_VERSION`, not `MAX_SYNC_ATTEMPTS`, not `fps`, not `qrbox`, not a glyph path, not a message table, not a fill.

## Step 3 — the normaliser proved by mutation, in four directions

A normaliser is a filter placed between a measurement and its reader, so it is exactly the thing that could make this whole apparatus report a comfortable silence. It was mutated four times on the AFTER region — **and each mutation was asserted to have landed before its verdict was read**, because a substitution that failed to match produces a green that means nothing (`ai-engineering.md`, gate *prova per mutazione*).

| mutation | what it simulates | landed | caught |
|---|---|---|---|
| dwell `1500` → `1600` | acceptance's flash re-timed | yes | **yes** — the row is quoted in the diff |
| `DB_VERSION` `5` → `6` | the offline store's shape moved inside a colour phase | yes | **yes** |
| `[100, 50, 100]` → `[100, 50, 150]` | refusal's haptic pattern re-cut | yes | **yes** |
| `qrbox.width` `280` → `240` | the decode box shrunk | yes | **yes** |

Each mutated run reported **8** differing lines against the honest run's **6** — the mutation's own pair on top of the three the tree really carries. A normaliser that hid any of the four would have reported 6 again.

## Step 4 — the three differences, each one named

The normalised diff, verbatim and entire:

```
8,9c8,9
< | already_recorded | `already_recorded` | `bg-amber-500/90` | **2500** | L |
< | error | `error` | `bg-red-500/90` | **2000** | L |
---
> | already_recorded | `already_recorded` | `bg-sem-done/90` | **2500** | L |
> | error | `error` | `bg-red-600/90` | **2000** | L |
203c203
<   files scanned:                 306
---
>   files scanned:                 305
```

Three lines. **Every one of them is argued below; none is dismissed.**

### Difference 1 and 2 — the two outcome fills

| | before | after |
|---|---|---|
| `already_recorded` | `bg-amber-500/90` | `bg-sem-done/90` |
| `error` | `bg-red-500/90` | `bg-red-600/90` |

- **Who:** plan **42-06**, commit `f5ae994`, in `src/components/scanner/ScanFlash.tsx` — today at `:110` and `:125` inside `FLASH_STATES` (`ScanFlash.tsx:95`).
- **What the constant governs:** the full-screen fill of the third outcome and of a refusal. It governs **what a member of staff sees**, and nothing else — the fill is read by `ScanFlash.tsx:154`, which composes it into the overlay's class string. It does not reach a verdict, a queue entry, a haptic call or a dwell.
- **The argument that this is correct, and not a regression:** this is the phase's mandate arriving where it was aimed. DS-04 asks that scanner feedback colours stay saturated and unmistakable; `verify:scan-legibility` measured the previous pair and found the third state sitting **4.5** from the connectivity pill in deuteranopia and **7.0** from acceptance in protanopia, against a threshold of 10. The paragraph beside the lookup had asserted the opposite in prose, twice in two files, and the measurement is what retired it — the retracted claim is kept visible at `ScanFlash.tsx:65-78` beside the numbers that contradict it. The gate that produced those numbers now runs on every invocation of `npm run verify` and passed on this tree.
- **What it does not touch, and this is why the row beside it matters:** the **dwells are on the same lines** and did not move — `1500`, `2500`, `2000`. The colour changed; the time the screen holds it did not.

### Difference 3 — one fewer file scanned

| | before | after |
|---|---|---|
| `verify-routes`, files scanned | 306 | 305 |

- **Who:** plan **42-07**, commit `47933c4`, which **deleted** `src/components/layout/MobileNav.tsx`. The door now mounts the navigation directly in its phone form, and the reason the wrapper existed was moved into the two places a reader looks for it rather than disappearing with the file.
- **What the number governs:** nothing at the door. It is the size of the census `verify-routes.mjs` walks looking for `revalidatePath` literals. One file fewer in the tree is one file fewer scanned.
- **The argument:** the deletion is the plan's declared output, the file it removed rendered nothing on the door, and the gate's own verdict is unchanged on both halves — **75** literal arguments read (the same 75), **0** non-literal skipped, 28 pages resolving to 27 patterns, exit **0**. A deletion that had taken a route with it would have moved the second half of that block; it did not.
- **This is also the one number in the record that will move again**, for any commit that adds or removes a file anywhere in the tree. It is a property of the repository's size, not of the scanner.

## Step 5 — what the comparison closes, and what it does not

**Closed by this comparison** — five rows of `42-VALIDATION.md`, each in its own terms:

| row | claim | verdict |
|---|---|---|
| **3i** | the three dwells (1500 / 2500 / 2000) and the three haptic patterns are unchanged | **closed** — blocks 1 and 2, values identical, mutation-proved detectable |
| **3j** | the 26 `showFlash` sites are still 26, each with the same outcome | **closed** — block 4: 26 sites, 26 with a title, `already_recorded` 8 · `error` 15 · `success` 5, identical |
| **3k** | `DB_VERSION` and `MAX_SYNC_ATTEMPTS` unchanged | **closed** — block 7: `5` and `8`, and `DB_NAME` with them |
| **3l** | the four error-message tables are byte for byte | **closed** — block 13 is identical **including its line anchors**: 83, 99, 105, 232 in both records. The causes stay told apart |
| **2c** | `qrbox`, `fps` and `facingMode` unchanged — criterion 2 touches the container, never the decode | **closed** — block 11: 15, 280×280, `environment` |

**Row 3h asked for something this run did not produce, and the honest word is not *closed*.** It reads *«il reperto meccanico rifatto è **identico riga per riga** al blocco pre-conversione»*. Line by line it is **not** identical: 118 lines differ raw, and after line positions are normalised three still do. Two of those three are this phase's own mandate landing where it was aimed and one is a file count. **The row closes in the sense it was written to protect — no constant and no road moved — and it fails in the sense it was literally worded.** That gap is written here rather than resolved by calling the run silent.

**And the sentence that this record has carried since the day it was taken, which nothing above changes:** it proves the **constants** and the **roads** did not move. It does not prove the **behaviour** did not. That is `42-PROCEDURES.md`, and it is a person at a door.

## Step 6 — the assertion that the BEFORE region was not edited

The whole apparatus is worthless if the earlier record can be quietly brought into agreement with the later one. So:

```sh
git diff --numstat -- .planning/phases/42-scanner-conversion/42-BASELINE.md
cut "$BEG" "$END" 42-BASELINE.md | diff - before-region.md
```

`git diff --numstat` reports **519 added, 0 removed**: not one line anywhere in this file was deleted or rewritten, so nothing inside the earlier region could have been. The second command is silent — the region re-extracted after this file was edited is byte-identical to the one extracted before it was.

**These are the assertions that caught the extraction defect described in step 2, twice**, which is the whole argument for running a check instead of reasoning about it. The first run printed eleven lines of this document's own prose that a `sed` range had swept into the region; the second, after the first repair, printed eight more. Nothing in the record had moved — the instrument had. An assertion that only ever confirms what was expected is not being asked a question.

The same check runs on the region embedded above:

```sh
cut '<!-- AFTER-DIFFABLE-BEGIN -->' '<!-- AFTER-DIFFABLE-END -->' 42-BASELINE.md \
  | sed -e 's/AFTER-DIFFABLE-BEGIN/BASELINE-DIFFABLE-BEGIN/' \
        -e 's/AFTER-DIFFABLE-END/BASELINE-DIFFABLE-END/' \
  | diff - after-region.md
```

Silent — the embedded region is the capture's own bytes, marker rename apart.

---

# The state of the gates and the build at this capture

**Outside the diffable region, deliberately**, for the same reason the BEFORE record kept its own context section outside it: this is a state, not an invariant, and a record that moves on its own is a record nobody can diff.

## `npm run verify` — exit **2** in a worktree, and 2 means *refused*

**Twenty gates ran. Eighteen passed. Zero failed. Two refused.**

```
    total gates                   20
      of which passed             18
      of which FAILED              0
      of which REFUSED             2  — nothing was measured by these

  VERIFY_REFUSED — 2 gate(s) could not measure: verify:capabilities, verify:section-export
```

Both refusals name the same missing input and neither is about this tree:

```
    ⊘ missing credentials
         SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL are not set, so NOTHING ABOUT
         REACHABILITY WAS MEASURED. That is this half's honest state on any machine that
         does not hold the credentials — a worktree has no `.env.local`, which is
         gitignored and lives in the main checkout — and IT IS NOT A PASS.
```

**A refusal is not a pass and it is not a failure**, and this document repeats the aggregate's own words rather than rounding them: *«no gate that reached a verdict reported a failure. That is a narrower statement than "nothing failed".»* On the main checkout, where the credentials live, the same suite was measured at **20 run, 20 passed, exit 0**.

`verify:ics` is not in the aggregate at all: it reads the production calendar out of `docs/`, which git ignores.

**Two of the eighteen are this phase's own**, and they are green for the first time on this tree:

- `verify:scan-legibility` — **passed**. Written in wave 0, mutation-proved four ways, deliberately left unregistered until the code that makes it green existed (D-42-09), and registered in wave 7 in both halves at once.
- `verify:conversion` — **passed** with the door **inside** the perimeter. Until wave 7 the door sat behind a fence and this gate's green said nothing about it. It now says the same thing about the door that it says about every other surface.

## `npm run build` — exit **0**

```
✓ Compiled successfully in 2.5s
✓ Generating static pages using 9 workers (36/36) in 144.7ms
```

There is no test runner in this repository. `next build` **is** the typecheck, and that integer is the whole of what it proves. Its full output carries timings and byte sizes and is deliberately not reproduced: a record that moves on its own is a record nobody can diff.
