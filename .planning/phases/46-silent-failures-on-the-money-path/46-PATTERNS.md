# Phase 46: Silent Failures on the Money Path — Pattern Map

**Mapped:** 2026-08-14
**Files analyzed:** 7 (6 named in the perimeter + 1 caller the perimeter implies)
**Analogs found:** 7 / 7 — every file has an in-tree analog. Nothing has to be invented.
**Perimeter source:** `46-CONTEXT.md` `<domain>`. `46-RESEARCH.md`'s wave shape is superseded;
its measurements are not.

> `.planning/` is public. Roles, never people. No unannounced date, no venue under
> negotiation, no line-up below.

---

## 0 · Three corrections to the coordinates, before anything is planned

Every line number below was re-read on **2026-08-14** with `LC_ALL=C /usr/bin/grep -n` and
`Read`. Three of the coordinates handed to this mapper do **not** match the tree. Anchor on
the **predicate text**, never on the number — a number that moved matches nothing, and
matching nothing reads like a green.

| Cited in the task brief | Actually in the tree | Predicate to anchor on |
|---|---|---|
| `GuestTokenDisplay.tsx:20-31` (custody write) | **`:107-120`**, `catch` at `:117-119` | `function storeGuestOrder` … `catch { /* localStorage unavailable */ }` |
| `GuestTokenDisplay.tsx:34-40` (custody read) | **`:122-129`**, `return []` at `:127` | `function getGuestOrderIds` … `catch { return []; }` |
| `GuestTokenDisplay.tsx:403-410` / poll `:485-488` | **`:506` and `:512`** (`orderStatus: "unknown"`), poll **`:559-590`**, silent bound at **`:581`** | `if (!res.ok) return { tokens: [], orderStatus: "unknown" }` / `pollCountRef.current >= 10` |
| `admin/events/actions.ts:1228-1233` = DI-TODO-A | **`:1412-1416`**. `:1228-1233` is the **profile read**, an unrelated (and correctly destructured) read | `if (code.max_uses !== null) { const { count } = …` |
| `admin/events/actions.ts:1271`, `:1279` = F-46-01 | **`:1271`** (tier list) and **`:1278`** (sold count) — the second is off by one | `const { data: allTiers } = await tierQuery;` / `const { data: soldCounts } = await supabase` |
| Reveal three-branch ternary "`:1075-1119`" (41.2-CONTEXT) | **`page.tsx:1124-1166`** | `venueVisible && venueRow ? … : venueVisible && party.venue_text ? … : party.venue_secret ? <SecretVenueDialog/> : null` |
| Reveal positive test "`:206-207`" | **`page.tsx:206-207`** — unchanged, still correct | `typeof opts.revealedAt === "string" && !Number.isNaN(Date.parse(...))` |
| `export const dynamic` "`:243`" | **`page.tsx:254`** | `export const dynamic = "force-dynamic";` |

**One perimeter gap, raised rather than silently resolved.** `DI-41.2-06` is listed as
`menu/actions.ts` only, and **D-46-10b requires two distinguishable outcomes**. An outcome a
caller never renders is not an outcome. `updateMenuClosesAt` has exactly one caller —
`PartyDrinkMenu.tsx:146` and `:156`, both inside `MenuCloseControl` — and that file has **no
`catch` at all** today (`:144-161`). It is not in the OUT list and it cannot be avoided: the
action's returned category and the component that draws it are one change. It is mapped below
as **implied by D-46-10b**, and the planner should scope it explicitly rather than discover it.

---

## 1 · File Classification

| File | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx` | component (client) | file-I/O (browser storage) + polled request-response | `src/app/(admin)/admin/scanner/ScannerClient.tsx:83-99` (+ `src/lib/door/outcome.ts:283-302`) | **exact** — client component rendering a refusal category from a total `Record`, offline-shaped, no server round trip |
| `src/app/(public)/events/[slug]/menu/actions.ts` — `updateMenuClosesAt` **only** | service (Server Action) | request-response (command write) | `src/app/(admin)/admin/events/actions.ts:124-282, 327-370, 382-387` | **exact** — a Server Action in this repo already converted from thrown sentences to a returned refusal union + sentence map + safe log |
| `src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx` — `MenuCloseControl` **only** *(implied)* | component (client) | request-response | `src/components/events/EventForm.tsx:414, 610-630, 1316-1323` | **exact** — the caller half of the same conversion: category into state, sentence into an announced region |
| `src/app/(public)/events/[slug]/page.tsx` | route / Server Component | CRUD read (three counts) | `src/app/(admin)/admin/events/actions.ts:933-963` | **exact** — same repository, same table (`tickets`), same question: *an unreadable count is a refusal and not a zero* |
| `src/app/(admin)/admin/events/actions.ts` — `purchaseTicket` **only** | service (Server Action) | request-response + CRUD read | `src/app/(admin)/admin/events/actions.ts:933-963` — **same file, 300 lines up** | **exact** |
| `src/app/api/cron/refund-expired-tokens/route.ts` | route (cron) | batch | `src/app/api/media/finalize/route.ts:414-421` (`refuse()`), for the *returned-status* shape | **role-match** — no converted cron exists; the shape is borrowed, the transport is different |
| `src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx` | component (client) | file-I/O | **read-only — no analog wanted** | preserve, do not edit |

---

## 2 · Shared Patterns

These bind more than one plan. Copy them by reference, not by paraphrase.

### S1 — The refusal as a returned constant, rendered from a **total `Record`**

**Source:** `src/lib/door/outcome.ts:278-302`
**Apply to:** every new refusal category in this phase (`menu/actions.ts`, `purchaseTicket`,
`GuestTokenDisplay.tsx`)

```ts
export const DOOR_NIGHT_NOT_ASSIGNED = "door_night_not_assigned";
export const DOOR_NIGHT_OTHER_NIGHT  = "door_night_other_night";
export const DOOR_NIGHT_UNRESOLVED   = "door_night_unresolved";

/** The three literals as a union, so the `Record` below can be total over them. */
export type DoorNightRefusal =
  | typeof DOOR_NIGHT_NOT_ASSIGNED
  | typeof DOOR_NIGHT_OTHER_NIGHT
  | typeof DOOR_NIGHT_UNRESOLVED;

export const DOOR_NIGHT_ERROR: Record<DoorNightRefusal, string> = {
  [DOOR_NIGHT_NOT_ASSIGNED]:
    "This account is not on the door for any night — an organizer has to assign it.",
  [DOOR_NIGHT_OTHER_NIGHT]:
    "This account is on the door, but not for the night selected on this device — select the right night.",
  [DOOR_NIGHT_UNRESOLVED]:
    "This account's assignment for that night could not be checked — the refusal above stands on the role check alone.",
};
```

**The three properties to imitate, exactly:**

1. **Constants first, union from `typeof`, `Record` over the union.** Not a bare string union
   with a `switch` — the `Record` is what makes a missing sentence a build error.
2. **The totality is the requirement.** `outcome.ts:44-48` states the same construction for
   `DOOR_HTTP`: `as const satisfies Record<DoorScanOutcomeKind, number>`. Use `satisfies` where
   the values must stay literal (statuses), plain `Record<X, string>` for sentences.
3. **The third member is the *could-not-answer* category, and it is never merged with *no*.**
   `DOOR_NIGHT_UNRESOLVED` is the template for **every** finding in this phase whose defect is
   a failed read rendered as a legitimate value. `/api/media/finalize` gives it its own HTTP
   code with an explicit meaning (`route.ts:229-234`): *`503` = the question could not be
   answered, this is not a refusal of you.*

**Four `satisfies Record<…>` totality maps exist tree-wide** — `finalize/route.ts:254` and
`:294`, `capability-routes.ts:477`, `outcome.ts:48`. Any new one joins a family, it does not
start one.

### S2 — Why a category may never travel as a thrown message

**Source:** `src/lib/capabilities/server.ts:58-63`
**Apply to:** `menu/actions.ts`, `purchaseTicket`, and any Server Action this phase reshapes

```
 * There is also a boundary that no message can cross on its own: Next **redacts**
 * the message of an error thrown out of a Server Action in a production build.
 * A client that branches on `err.message.startsWith("capabilities.resolve_failed")`
 * works in `next dev` and stops working where it matters. A caller that needs the
 * category on the client must carry it as a **value**, not as a message.
```

The same statement, restated where the conversion was actually performed —
`src/app/(admin)/admin/events/actions.ts:127-139`:

```
 * ── Why a returned value and not a thrown message ────────────────────────────
 * Next **redacts** the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`). … The category
 * therefore travels as a value, modelled on `AssignmentRefusal`.
 * There is no shared "something went wrong": the recorded precedent in this
 * repository is the newsletter form collapsing three causes into one sentence …
```

**Consequence for the planner:** rewording a `throw` is not a fix. `menu/actions.ts:48/51/60`
throw three distinct sentences today and **all three arrive identical in production**.

### S3 — The safe log line: `code` and `message`, never the object, never `details`

**Source:** `src/app/(admin)/admin/events/actions.ts:372-387`
**Apply to:** every `catch` and every error branch this phase writes or touches — all seven files

```ts
/** The only shape of a PostgREST error this file reads. `details` is not in it, on purpose. */
type WriteError = { code?: string | null; message?: string | null };

function logNightRefusal(refusal: NightRefusal, error: WriteError | null) {
  console.error(
    `[event_parties.${refusal.kind}] sort_order=${refusal.sortOrder ?? "unknown"} ` +
      `code=${error?.code ?? "none"} message=${error?.message ?? "none"}`
  );
}
```

Its docblock carries the reason and it is not optional:

```
 * Never the whole error object and never its `details` field: on a violation
 * PostgREST returns the entire rejected row, and roughly twenty sites in this
 * repository already pass the whole object to `console.error`
 * (`.planning/todos/pending/postgrest-details-leaks-the-row.md`). This path now
 * fails routinely … so it must not become the twenty-first.
```

A rejected `profiles` or `tickets` row carries `membership_code`, and a membership code is the
**door credential**. A log on this project reaches a screenshot. **Application branching stays
on `error.code`.** Note the counter-example already in the perimeter:
`refund-expired-tokens/route.ts:127` does `console.error(\`Refund failed for order ${orderId}:\`, err)`
— the whole object. This phase opens that file; it inherits S3.

### S4 — Where a refusal is drawn on a client surface, and where it may **not** be

**Source:** `src/components/toast/ToastContext.tsx:28-56`

```
 * ── A DIALOG NEVER RAISES A TOAST (41-UI-SPEC §8.3, threat T-41-11) ──────────
 * A native `<dialog>` opened with `showModal()` paints in the **top layer**,
 * which sits above every `z-index` … So a dialog that reported success by calling
 * `useToast` would report it **invisibly** …
 * > **A dialog reports its own outcome inside its own panel** — a status region
 * > at the foot of the body: `role="status"` for success, `role="alert"` for
 * > failure …
```

**This is a mechanical gate, not advice.** `scripts/verify-dialogs.mjs:1737` holds
`const TOAST_HOOK = 'useToast'` and refuses any file that renders `Dialog` and imports
`useToast`. **`GuestTokenDisplay.tsx` renders `Dialog` at `:337`** — so a toast is *forbidden by
build gate* in the very file that holds three of this phase's five guest findings. Its refusal
region must be in-place. Two shapes already exist inside that same file:

- `GuestTokenDisplay.tsx:341` — the primitive's own region:
  `status={error ? { tone: "crit", message: error } : null}`
- `GuestTokenDisplay.tsx:310-314` — an announced region on a non-dialog surface:
  ```tsx
  {error && (
    <span role="alert" className="mt-6 text-sm text-sem-crit">
      {error}
    </span>
  )}
  ```

Run `npm run verify:dialogs` individually after any diff in that file. **Never `npm run verify`**
— it reaches the Supabase Management API against production (`scripts/rls-baseline.mjs:205-215`).

### S5 — An unreadable count is a refusal, not a zero

**Source:** `src/app/(admin)/admin/events/actions.ts:933-963` — same file as `purchaseTicket`,
same table, already converted

```ts
// Check if parties to delete have sold tickets.
//
// `{ error }` too: a failed count returns `count === null`, the guard passes,
// and a night that has sold tickets is deleted. That is money and a door
// list, so an unreadable count is a refusal and not a zero.
for (const partyId of idsToDelete) {
  const { count, error: countError } = await client
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("party_id", partyId);
  if (countError) {
    const refusal: NightRefusal = {
      kind: "write_failed", sortOrder: null, nightTitle: null,
      code: countError.code ?? null,
    };
    logNightRefusal(refusal, countError);
    return {
      success: false,
      error:
        "Whether a removed sub-event has sold tickets could not be checked, so nothing was changed.",
      refusal,
    };
  }
  if (count && count > 0) { … }
}
```

**Direction warning, and it is the whole subtlety of this phase.** S5's site *refuses*, because
there the permissive direction destroys data. **D-46-05 forbids copying that direction into
`purchaseTicket`**: the real capacity guard is `reserve_ticket`
(`supabase/migrations/20260310100000_discount_codes.sql:90`), which locks the tier row
`FOR UPDATE`, counts, and raises — a plpgsql read cannot coalesce to zero, so it **fails
closed** already. What is copied from S5 is the **destructuring, the classification and the
safe log**, not the refusal. D-46-08 states it: *observability, not a new refusal.*

### S6 — The four reveal assertions, re-measured

**Source:** `src/app/(public)/events/[slug]/page.tsx`. Assert **after every diff** that opens it.

| # | Assertion | Re-measured site | Check |
|---|---|---|---|
| 1 | the three-branch ternary stays **three** | `:1124-1166` — `venueVisible && venueRow` → `venueVisible && party.venue_text` → `party.venue_secret` → `null` | read the block; count the arms |
| 2 | the reveal test stays written **positively** | `:206-207` `typeof opts.revealedAt === "string" && !Number.isNaN(Date.parse(opts.revealedAt))` | `undefined !== null` is TRUE — a negated null test plus a dropped column opens every secret night |
| 3 | `export const dynamic = "force-dynamic"` stays | `:254` | `LC_ALL=C /usr/bin/grep -c 'dynamic = "force-dynamic"'` → 1 |
| 4 | **no `generateMetadata` is added** | absent, by decision (T-37-25), argued at `:244-252` | `LC_ALL=C /usr/bin/grep -c generateMetadata` → 0 |

The file states the reason for 4 in place and deliberately avoids spelling the identifier in its
own prose so a mechanical check measures the property rather than tripping on the paragraph
forbidding it. **A plan that quotes that paragraph into the file breaks its own check.**

### S7 — What must not be touched

- **No migration.** `reserve_ticket` (`supabase/migrations/20260310100000_discount_codes.sql:90`)
  is **read-only**: it is the real atomic guard, it locks `FOR UPDATE`, refuses a duplicate
  ticket for the same holder and the same night, and validates `max_uses` in the same
  transaction. Where the application and the database disagree, the database is right.
- **`src/app/api/webhooks/sumup/**` is not opened.** Derivation after the phase:
  `git diff --stat src/app/api/webhooks/` → empty.
- **`TierSelection.tsx`, `PendingIntentHandler.tsx`, `RsvpButton.tsx`, `rsvp-actions.ts`, the
  member dashboard, any guest-facing refund surface** — OUT (D-46-11, D-46-09). This constrains
  the *mechanism* for `DI-41.2-08`: see §3.4.
- **`scripts/verify-conversion.mjs` is invisible to the shell's default `grep`** (two NUL bytes;
  the default `grep` is `ugrep -I`, which skips binary files silently). Use
  `LC_ALL=C /usr/bin/grep` or `Read`. A zero-hit grep there is not evidence of absence.

---

## 3 · Pattern Assignments

### 3.1 `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx` — component (client), file-I/O + polled request-response

**Findings:** `DI-41.2-02` (write, swallowed), `DI-41.2-03` (read → `[]`), `DI-41.2-04`
(fetch → `"unknown"`, and a bound that fires silently). **One question, not three**
(`46-CONTEXT.md` Integration Points): *what does a guest see when the browser cannot hold their
receipt.*

**Analog:** `src/app/(admin)/admin/scanner/ScannerClient.tsx:83-99` — the only client-side total
`Record` of sentences in the tree, and the one written for a surface with no server to ask.

**Total-`Record` pattern to copy** (`ScannerClient.tsx:83-99`):

```ts
const NOT_VALID_MESSAGE: Record<DoorNotValidReason, string> = {
  invalid_signature: "This code was not issued by us",
  unknown_code: "No ticket or member matches this code",
  wrong_night: "This code is for another night",
  no_party_selected: "Choose the party first — a scan needs a night",
  // The one member of the union no live scan can produce … The sentence exists
  // because the `Record` is total, and a total `Record` with a hole would be a
  // member silently falling to UNRECOGNISED_REASON_MESSAGE.
  no_assignment_at_scan:
    "This device had no door assignment for that night — recorded, not admitted",
};

/** A reason from a bundle this one does not know. Its own sentence, not one of the four. */
const UNRECOGNISED_REASON_MESSAGE = "This code could not be validated";
```

and the lookup that never trusts the prototype chain (`ScannerClient.tsx:271-273`):

```ts
Object.prototype.hasOwnProperty.call(NOT_VALID_MESSAGE, reason)
  ? NOT_VALID_MESSAGE[reason as DoorNotValidReason]
  : UNRECOGNISED_REASON_MESSAGE;
```

**The three sites, verbatim as they stand today.**

*(a) the custody write, `:107-120` — swallows every cause; the entry it fails to write **is the
receipt**:*

```ts
function storeGuestOrder(eventId: string, orderId: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    if (!existing.includes(orderId)) {
      existing.push(orderId);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch {
    /* localStorage unavailable */
  }
}
```

*(b) the custody read, `:122-129` — `[]` is also the legitimate answer:*

```ts
function getGuestOrderIds(eventId: string): string[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
    return JSON.parse(localStorage.getItem(key) || "[]") as string[];
  } catch {
    return [];
  }
}
```

Both are `void`/`string[]` helpers in **module scope** — there is no component to render into,
so the mechanism is downstream of a **contract change**: a discriminated result
(`{ ok: true; ids } | { ok: false; reason }`), read by the two call sites at **`:528`** and
**`:532`** (initial load) and **`:553`** (the new-order listener).

*(c) the fetch, `:500-519`, and the poll, `:559-590`:*

```ts
const res = await fetch(`/api/drinks/tokens?order_id=${oid}`);
if (!res.ok) return { tokens: [], orderStatus: "unknown" };   // :506
…
} catch {
  return { tokens: [] as TokenData[], orderStatus: "unknown" }; // :512
}
```

```ts
// :581 — the bound. `clearInterval` and NOTHING else: no state change, same
// spinner, no terminal message. This is the commonest terminal state.
if (data.orderStatus === "completed" || pollCountRef.current >= 10) {
  if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
}
} catch {
  // keep polling                                               // :587-588
}
```

`"unknown"` is a **string, not a union** — replace it with a union that separates *arriving*,
*could not reach the server*, *the server refused*, and *the bound was reached*. Three discard
sites, not two: `:506`, `:512`, and the poll's own `if (!res.ok) return;` at `:564`.

**The render site that completes the defect — `:632-635`:**

```tsx
// Don't render anything if no tokens and not loading
if (!loading && tokens.length === 0) {
  return null;
}
```

A failed custody read reaches here as `tokens.length === 0` and the component **renders
nothing at all**. Whatever union is added is inert unless this early return learns the third
state.

**Mechanism (S4):** in-place, inside this file. **No toast** — `verify-dialogs.mjs` forbids it
here. Copy the announced region already in the file at `:310-314`, or the primitive's own
`status` prop at `:341`.

**Scope limit — D-46-10c:** guest-facing half only. The bar-side lookup is deferred. Do not
build a staff surface in this file.

---

### 3.2 `src/app/(public)/events/[slug]/menu/actions.ts` — `updateMenuClosesAt`, service (Server Action), request-response

**Finding:** `DI-41.2-06`, and **L9** is the trap: two causes, one silence.

**Current state, `:39-62` — three throws, all invisible in production (S2):**

```ts
export async function updateMenuClosesAt(
  partyId: string,
  menuClosesAt: string | null
): Promise<{ success: boolean }> {
  const ctx = await getAccessContext();

  // Two causes, kept distinguishable (`meta-gates.md`, zero silent failures).
  if (!ctx.userId) throw new Error("Not authenticated");                     // :48

  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    throw new Error("forbidden.staff_manage_required");                      // :51
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("event_parties")
    .update({ menu_closes_at: menuClosesAt || null })
    .eq("id", partyId);

  if (error) throw new Error("Failed to update menu closing time");          // :60
  return { success: true };
}
```

The action **already keeps its causes apart at `:45-48`** — the work is carrying them across
the production boundary as values, and rendering them. **D-46-10b** requires at least *you may
not* and *it did not save* to stay separate; `:48` (nobody is here) is a third the docblock
already argues for.

**Analog:** `src/app/(admin)/admin/events/actions.ts:124-282` + `:287-316` + `:327-370` + `:382-387`.
Same repository, same kind of module, already converted. Four pieces, copied in order:

**(i) the union, one member per cause, each carrying what the surface needs**
(`admin/events/actions.ts:145-274`, abridged):

```ts
export type NightRefusal =
  | { kind: "duplicate_number"; sortOrder: number | null; nightTitle: string | null;
      seriesId: string | null; number: number | null }
  | { kind: "series_format_mismatch"; sortOrder: number | null; nightTitle: string | null }
  …
  /** Any other database failure. That night was not written. */
  | { kind: "write_failed"; sortOrder: number | null; nightTitle: string | null; code: string | null };
```

**(ii) the return envelope** (`:276-282`):

```ts
/** What every event write returns. `refusal` is present only when `success` is false. */
export type EventWriteResult = {
  success: boolean;
  id?: string;
  error?: string;
  refusal?: NightRefusal;
};
```

`updateMenuClosesAt` returns `{ success: boolean }` today, so widening it to
`{ success: boolean; error?: string; refusal?: MenuCloseRefusal }` is **additive** — the single
caller keeps compiling while it is being taught to read the new fields.

**(iii) the sentence map — one sentence per cause, written once** (`:327-370`), e.g.:

```ts
    case "write_failed":
      return `${where}saving this night failed (${refusal.code ?? "no code"}). Nothing was written for it.`;
```

**(iv) the safe log** — S3, `:382-387`, verbatim in shape.

**Boundary (46-RESEARCH §6, still binding):** a plan may change what this action **returns**; it
may **not** change what it **decides**. `CAP.STAFF_MANAGE` stays the predicate, the gate stays
**before** the service-client write (the docblock at `:24-31` explains why: `partyId` is
untrusted and the service client bypasses every row-level policy — on this path the code *is*
the security boundary), and `menu_closes_at` is money-adjacent, so neither the value written,
nor the `end_time` fallback, nor the one-hour grace changes.

---

### 3.3 `src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx` — `MenuCloseControl`, component (client) — **implied by D-46-10b**

**Current state, `:144-161` — no `catch` anywhere; the transition rejects and `setSaved(true)`
is simply never reached:**

```ts
function handleSave() {
  startTransition(async () => {
    await updateMenuClosesAt(party.id, time || null);
    onUpdate(party.id, time || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  });
}

function handleClear() {
  setTime("");
  startTransition(async () => {
    await updateMenuClosesAt(party.id, null);
    onUpdate(party.id, null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  });
}
```

Note the second-order defect the planner must not reproduce: `handleClear` calls `setTime("")`
**before** the await, so a failed clear leaves the field showing empty while the stored value
is unchanged — the screen and the database disagree, silently.

**The success region already exists, `:211-215`** — the failure region goes beside it:

```tsx
{saved && (
  <span role="status" className="text-xs text-sem-done">
    Saved
  </span>
)}
```

**Analog for the caller half:** `src/components/events/EventForm.tsx`.

*category into state, `:414`:*
```ts
const [refusal, setRefusal] = useState<NightRefusal | null>(null);
```

*both set, category first, and a sentence for the refusal that arrived with no reason,
`:619-630`:*
```ts
} else {
  // The category first, so the sentence can be attached to the night and
  // the field that caused it; the top-of-form sentence second. A refused
  // save that arrived with no reason at all says exactly that instead of
  // collapsing into a shared "something went wrong" — the newsletter form
  // is the recorded precedent not to repeat (`meta-gates.md`).
  setRefusal(result.refusal ?? null);
  setError(
    result.error ??
      "The save was refused and no reason travelled back. Reload the page and try again."
  );
}
```

*the announced region, `:1316-1323`, with `role="alert"` stated as contract rather than
decoration (`:1305-1307`):*
```tsx
{error && (
  <div role="alert" className="rounded-2xl border border-sem-crit/30 bg-sem-crit/10 p-4">
    <p className="text-sm text-sem-crit">{error}</p>
  </div>
)}
```

`MenuCloseControl` renders no `Dialog`, so a toast is *not* gate-forbidden here — but the
in-place region is the better fit and keeps the refusal next to the control that produced it
(the success sentence is already there). Prefer `role="alert"` beside `:211-215`.

---

### 3.4 `src/app/(public)/events/[slug]/page.tsx` — route / Server Component, CRUD read. **Reveal-critical.**

**Finding:** `DI-41.2-08` — three counts, error never destructured, `count ?? 0`, so **a full
night renders as open with the control that takes money beside it**.

**The three sites, re-measured:**

```ts
// :489-494 — per-party tier sold
const { count } = await serviceClient
  .from("tickets")
  .select("*", { count: "exact", head: true })
  .eq("tier_id", tier.id);
const sold = count ?? 0;
return { ...tier, sold, available: tier.quantity !== null ? tier.quantity - sold : null };
```

```ts
// :532-536 — RSVP count for spotsLeft
const { count: rsvpCount } = await serviceClient
  .from("rsvps")
  .select("*", { count: "exact", head: true })
  .eq("party_id", party.id);
spotsLeft = party.capacity - (rsvpCount || 0);
```

```ts
// :637-642 — event-level tier sold. Byte-identical to :489-494 except the filter.
const { count } = await serviceClient
  .from("tickets")
  .select("*", { count: "exact", head: true })
  .eq("tier_id", tier.id);
const sold = count ?? 0;
```

**Analog:** S5 (`admin/events/actions.ts:933-963`) — same table, same failure mode, and this
time the **direction is right**: an unreadable count on a public sales page must not sell.

**Mechanism: M5 only.** A message beside a live purchase control is the wrong answer here,
because the failure direction is *sells what is not there*. And the mechanism has a hard
structural constraint:

> **`TierSelection.tsx` is OUT of perimeter (D-46-11).** The fix therefore lives entirely at the
> **call sites in this file**, by not rendering the control. Two call sites, re-measured:
> **`:971-979`** (event-level, inside a three-arm ternary of its own) and **`:1234-1248`**
> (per-party, a conjunction chain). Both already gate on a chain of booleans — a third state on
> the tier's count joins that chain; no prop of `TierSelection` changes, no client file is
> opened.

The shape of the third state: `sold` and `available` currently collapse the failure into a
number. Carry it instead — e.g. `soldKnown: boolean` alongside `sold`, or `sold: number | null`
with `available` following — and make the render condition require it. Whichever shape, the
type on `PartyWithTiers` at **`:110-111`** (`sold: number; available: number | null`) is what
propagates the change and is where `npm run build` will find every reader.

**Before any diff, and after every diff: assert S6's four properties.** This is the file where
a wrong edit publishes an address, and the publication has no remedy. `venue-secrecy.md` gate
*default chiuso*: if reveal state is not determinable, the address does not render — the same
principle this finding applies to a count. Owner in the loop (`46-CONTEXT.md`
`<canonical_refs>`).

---

### 3.5 `src/app/(admin)/admin/events/actions.ts` — `purchaseTicket` **only**, service (Server Action)

**Findings:** `F-46-01` (two permissive reads) + `DI-TODO-A` (the discount usage-limit read).
All three inside one function. **D-46-08: observability, not a new refusal. D-46-05: the
direction does not change.**

**Read 1 — the tier list, `:1259-1273`. `{ data }` only; a failed read makes the whole
chain-validation block vanish:**

```ts
const tierQuery = supabase
  .from("ticket_tiers")
  .select("id, price, quantity, starts_at, expires_at")
  .eq("event_id", eventId)
  .order("price", { ascending: true });
…
const { data: allTiers } = await tierQuery;      // :1271

if (allTiers && allTiers.length > 0) {           // :1273 — false ⇒ no check happens at all
```

**Read 2 — the sold count, `:1278-1286`. A failed read yields an empty map, so every tier
counts as zero sold and therefore available:**

```ts
const { data: soldCounts } = await supabase
  .from("tickets")
  .select("tier_id")
  .in("tier_id", tierIds);

const soldMap = new Map<string, number>();
for (const s of soldCounts ?? []) {
  soldMap.set(s.tier_id, (soldMap.get(s.tier_id) ?? 0) + 1);
}
```

…feeding `:1294-1295` `const sold = soldMap.get(t.id) ?? 0;` → `available = quantity - sold`, and
the refusal at `:1320-1325` that consequently never fires.

**Read 3 — `DI-TODO-A`, the discount usage limit, `:1410-1417`:**

```ts
// Check usage limits
if (code.max_uses !== null) {
  const { count } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("discount_code_id", code.id);
  if ((count ?? 0) >= code.max_uses) throw new Error("Code usage limit reached");
}
```

`count ?? 0` on a failed read = *this code has never been used* = the limit opens.

**Analog: `:933-963`, in this same file, 300 lines above `purchaseTicket`.** Copy from it
exactly three things and **not** the fourth:

| Copy | Do not copy |
|---|---|
| `error: countError` destructured on every one of the three reads | the **refusal** — D-46-05 keeps the pre-check permissive |
| a named category distinguishing *counted zero* from *could not count* (`{ kind: "write_failed", …, code }` is the shape) | |
| `logNightRefusal`'s S3 form — `code=` and `message=`, never the object, never `details` | |

**Why the direction must not flip, recorded so a later reader does not "finish the job":** the
real guard is `reserve_ticket` (`supabase/migrations/20260310100000_discount_codes.sql:90`),
which locks the tier row `FOR UPDATE`, refuses a duplicate ticket for the same holder and the
same night, counts sold, and validates `max_uses` — atomically, in plpgsql, where a failed read
**raises** and cannot coalesce to zero. Closing the application pre-check on a transient read
error would refuse a buyer the database would have accepted. **That migration is read-only for
this phase.**

**Also inside the perimeter and easy to miss:** all four discount throws
(`:1393`, `:1394`, `:1395`, `:1406`, plus `:1416` and `:1428`) are redacted in production (S2).
They are **not** this phase's to convert — the caller that would read them
(`PendingIntentHandler.tsx`) is OUT — so leave them, and do not weaken any predicate while
touching the reads beside them. A conversion that drops a check is a capability regression
wearing a refactor's clothes.

---

### 3.6 `src/app/api/cron/refund-expired-tokens/route.ts` — route (cron), batch

**Finding:** `DI-TODO-B`. **D-46-06:** tell the truth *and* terminate as failed, so the run shows
red in the platform's cron dashboard. This is the only observable effect in the phase that costs
nothing to build; the accepted cost is that frequent red becomes wallpaper.

**The site, `:161-174`:**

```ts
let deletedCount = 0;
if (tokenIdsToDelete.length > 0) {
  const { count } = await supabase
    .from("drink_tokens")
    .delete()
    .in("id", tokenIdsToDelete);
  deletedCount = count ?? tokenIdsToDelete.length;   // :167 — the defect
}

return NextResponse.json({
  refunded: refundedCount,
  refundErrors,
  deleted: deletedCount,
});                                                   // :170-174 — always 200
```

Two separate wrongs, and the planner should treat them as two:

1. **`error` is never destructured.** A refused delete reports as a full success.
2. **The coalesce is backwards.** `.delete()` without `{ count: "exact" }` returns `count === null`
   on the *success* path too, so `?? tokenIdsToDelete.length` reports the **intended** length
   essentially always — the rows that remain are counted as deleted. Either ask for the count
   (`.delete({ count: "exact" })`) or stop claiming a number.

**Analog:** no converted cron exists in this tree — this is the one **role-match** rather than
exact. Borrow the *returned-status* shape from `src/app/api/media/finalize/route.ts:414-421`,
where the category, the status and the log line are produced by one function so they cannot
drift apart:

```ts
const refuse = (reason: FinalizeRefusal, partyId: string | null = null) => {
  decided = reason;
  console.error(`[${reason}] media finalize refused`, { partyId });
  return NextResponse.json(
    { ok: false, reason },
    { status: FINALIZE_HTTP[reason] }
  );
};
```

with `FINALIZE_HTTP` as the total `Record` (`:236-254`, S1) and `503` carrying the meaning
`require-operator.ts` established: *the question could not be answered, this is not a refusal of
you* (`:229-234`).

**Domain gates that bind this file specifically:**

- `ticketing-payments.md`, gate *cron non atomico*: **progress is marked per item, never at the
  end of the batch.** The refund loop already does this (`:125` increments inside the loop); the
  deletion step must not undo the principle by being reported as one number.
- `ticketing-payments.md`, gate *stato terminale monotono* and `meta-gates.md`'s second monotone
  guard: nothing here may make an amount that was taken look untaken. The refund side of this
  route is **not** in scope — only the truthfulness of the report and the exit status.
- S3: `:127`'s `console.error(…, err)` passes the whole object. Inherit S3 while in the file.
- `time-and-scheduling.md`: the window arithmetic at `:41-44` and `:152-157` goes through
  `menuCloseInstant` (Europe/Rome). **Do not touch it** — this phase reports a failure, it does
  not re-time a cron.

---

### 3.7 `src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx` — **READ-ONLY. The mercy that must survive.**

**Landmine L6.** Not a finding — a thing this phase can destroy by tidying.

`:110-125`, re-measured (the brief cites `:119-121`, and that is the `.then`/`.catch` pair
inside it):

```ts
// Claim guest tokens after login/register
useEffect(() => {
  if (!isAuthenticated) return;
  try {
    const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return;
    const orderIds = JSON.parse(stored) as string[];
    if (orderIds.length === 0) return;
    claimGuestOrders(orderIds)
      .then(() => localStorage.removeItem(key))   // :120  ← THE MERCY
      .catch(() => {});                           // :121
  } catch {
    /* localStorage unavailable */
  }
}, [isAuthenticated, eventId]);
```

**`localStorage.removeItem(key)` sits inside the `.then`.** So when the claim fails, the key
survives and the guest keeps a fallback route to the drinks they paid for.
`deferred-items.md:51-53` calls it *"the one mercy here, and it is accidental rather than
designed."* Flattening this chain — `await` + `finally`, or hoisting `removeItem` out — deletes
it silently.

**Instruction for every plan:** do not edit this file's logic. **Comment the ordering in place**
so the next reader cannot mistake it for an oversight — the same disposition
`admin/events/actions.ts:965-967` takes on its own delete loop. Note also that `storeGuestOrder`
at `:76-89` is a **byte-identical duplicate** of `GuestTokenDisplay.tsx:107-120`: if §3.1 changes
the custody helper's contract, this second copy is where the divergence will hide. Two
vocabularies, each internally consistent, that agree until they do not — the defect
`src/lib/door/outcome.ts:1-15` was written to prevent.

`DI-41.2-01` itself (the swallowed `.catch` at `:121`) is **OUT** — `claimGuestOrders` claims a
guest's orders *after login*, and login is under review (D-46-11). Leave the empty catch; only
the comment is added.

---

## 4 · No Analog Found

| File | Role | Data flow | Reason |
|---|---|---|---|
| — | — | — | none |

Every in-perimeter file has an in-tree analog. The weakest match is §3.6 (cron), where the shape
is borrowed from an HTTP route rather than from a converted cron: **no cron in this repository
has been converted yet**, so `refund-expired-tokens` will be the first, and it should be written
so the next one can copy it.

**What no analog exists for, and is deliberately not being built:** a **staff-facing** channel
for a failure at the bar. No admin surface polls the token endpoint, nothing shows it, and error
tracking is deferred (`OBS-01`, Future). D-46-10c scopes this phase to the guest-facing half.
The planner should state this limit in the plan rather than let the criterion quietly mean
*guest-only*.

---

## 5 · Verification patterns the planner inherits

No test runner exists (`package.json` has no `test` script; no `*.test.*` / `*.spec.*` in the
tree). Never write that something is verified because tests pass.

| What | How |
|---|---|
| typecheck + compile | `npm run build` (`next build` is the typecheck gate) |
| the dialog/toast gate (§3.1) | `npm run verify:dialogs` — **individually** |
| **forbidden** | `npm run verify` — reaches the Supabase Management API against production |
| the totality property (S1) | **asserted mutation**: add a member to a refusal union without a `Record` entry → `npm run build` **must fail** → revert. The property is the requirement; the mutation is the only proof |
| no thrown category on a converted path | per converted action, `LC_ALL=C /usr/bin/grep -c "throw new Error"` in the refusal region → 0 |
| the reveal guards (S6) | the four derivations, after **every** diff on `events/[slug]/page.tsx` |
| the webhook untouched | `git diff --stat src/app/api/webhooks/` → empty |
| everything a person must *see* | a written manual procedure per finding — role, steps, the fault to induce, what must appear — each carrying `Result: pending`. A `VERIFICATION.md` with no `file:line` citation does not satisfy the gate |

---

## Metadata

**Analog search scope:** `src/lib/door/**`, `src/lib/capabilities/**`, `src/app/api/media/**`,
`src/app/api/cron/**`, `src/app/(admin)/admin/events/**`, `src/app/(admin)/admin/scanner/**`,
`src/app/(public)/events/[slug]/**`, `src/components/events/**`, `src/components/toast/**`,
`supabase/migrations/20260310100000_discount_codes.sql`, `scripts/verify-dialogs.mjs`.
**Files read:** 14. **Analogs selected:** 5 strong (`outcome.ts`, `finalize/route.ts`,
`admin/events/actions.ts` §nights, `ScannerClient.tsx`, `EventForm.tsx`) — search stopped there.
**Every coordinate re-measured:** 2026-08-14, with `LC_ALL=C /usr/bin/grep -n` and `Read`.
**Validity:** the *predicates* are durable, the *numbers* are not. Anchor on predicate text.
