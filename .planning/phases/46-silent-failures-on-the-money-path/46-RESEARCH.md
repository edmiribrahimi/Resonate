# Phase 46: Silent Failures on the Money Path — Research

**Researched:** 2026-08-14
**Domain:** Ticketing & Payments · Check-in-adjacent (the bar) · Access & Gating (approval copy) · Next.js Architecture
**Confidence:** HIGH on the tree (every coordinate below was re-read this session). MEDIUM on the product decisions, which are the owner's and are listed as such.

> `.planning/` is public. Roles, never people. No venue under negotiation, no
> unannounced date, no line-up, no contact. Nothing below names one.

---

## Summary

Nine failures on paths that carry money produce **a confident, well-formatted, wrong statement** instead of an effect somebody can see. This is not a discovery phase: Phase 41.2 found all nine, recorded each with a site and a consequence, and deliberately repaired none — repairing them is *new copy on a money path* or *a payload change*, which was that phase's stop condition 2. **This phase is where that stop condition is lifted, and it is the only thing that changes.**

The nine are not one defect nine times. They are **four distinct shapes**: (a) a `catch` that swallows every cause, (b) *no handler at all*, so a rejected transition simply never reaches a person, (c) a failed read coalesced into a **legitimate value** — `[]`, `0`, `null` — which is the worst, because it is indistinguishable downstream, and (d) a value written and **never read back**, which is the one that charges the wrong amount. The repository has **no error tracking** — `package.json` declares no monitoring dependency — so `meta-gates.md`'s rule binds every fix: *logging the error is not sufficient; the log is a place nobody looks.*

The good news is that this codebase already **owns the pattern** the fix needs, in three converted places: a refusal that travels as a **returned constant** rather than a thrown sentence (`/api/media/finalize`, fourteen categories plus a shared union), rendered from a **total `Record`** so a category added upstream turns the file red at `npm run build` (`DOOR_NIGHT_ERROR`, `src/lib/door/outcome.ts:295`). Nothing has to be invented. What has to be **decided** is the wording, and that is a product decision before it is a visual one.

**Primary recommendation:** four waves. Wave 1 fixes the one that takes money that was not owed (`DI-41.2-09`) and disarms the trap sitting on the exact line the repair must touch (`DEF-41.2-C`). Wave 2 is copy — one sitting with the owner producing every sentence, written once and used always. Wave 3 applies the refusal-category shape to the four that need a payload or type change. Wave 4 adds the observable effect where none exists. Scope `DI-41.2-10` and `-11` **in** (same file, same edit, ~4 lines); scope `DI-41.2-12` **in as a one-line deletion**; the reasons are in §7.

---

<user_constraints>

## User Constraints

**No `46-CONTEXT.md` exists** at research time — `/gsd:discuss-phase` has not run for this phase. The constraints below are inherited from `41.2-CONTEXT.md` (whose stop conditions were written to be *carried forward*), from `CLAUDE.md`, and from the roadmap's five success criteria. **They are not a substitute for a discuss-phase sitting**, and §9 lists what only the owner can decide.

### Locked (inherited, and this phase does not reopen them)

1. **The venue reveal is monotone.** `venue_reveal_sent` is one-way. On `/events/[slug]`: the three-branch ternary stays three branches; the reveal test stays written **positively** (`undefined !== null` is TRUE — a negated null test plus a dropped column opens every secret night); `export const dynamic = "force-dynamic"` stays present; **no plan adds a `generateMetadata`** to that route. *(`41.2-CONTEXT.md:255-268`)*
2. **Money does not trust its announcer.** The SumUp webhook verifies status via a **GET to the checkout API** and never trusts the body (`src/app/api/webhooks/sumup/route.ts:21-24`), and is idempotent on both branches. That rule does not relax and every new path that moves money inherits it.
3. **A payment reaching completion corrects forward.** Nothing makes an amount that was taken look like it was not.
4. **A progressivo assigned is never renumbered.** Phase 46 runs *before* Phase 42 by execution order; the number stays 46.
5. **No test runner exists.** Verification is `npm run build`, the gate scripts, and **written manual procedures with `Result: pending`**. Never write that something is verified because tests pass.
6. **`.planning/` is public.**

### Lifted, and this is the whole point of the phase

**`41.2-CONTEXT.md` stop condition 2 — "no plan here touches money's code… if a plan finds it must open a server action, halt"** — is **lifted for Phase 46**. Several of the nine cannot be fixed without it. §6 draws the new boundary precisely.

### Claude's discretion

Mechanism selection per finding (§2), the shape of the refusal union and its `Record`, wave decomposition, the manual-procedure text.

### Not this phase

Adding error tracking (`OBS-01`, deliberately Future). Group C findings `DI-41.2-14`…`-20` are the same *class* on paths that do **not** carry money — except `DI-41.2-20`, which criterion 2 names explicitly; see §7.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

`ROADMAP.md:1052` reads *"TBD at planning — none of the existing DS/RESP requirements covers this."* That is accurate: `.planning/REQUIREMENTS.md` has no requirement about a failure being visible. The nearest is **`OBS-01`**, in *Future Requirements* — *"A production failure reaches a human without someone noticing the effect first"* — deliberately deferred because no error tracking exists.

**The relationship is the argument for the ID.** `OBS-01` is the *automatic* channel and it is not being built. Phase 46 builds the **human-visible** channel that exists *because* `OBS-01` does not. Same family, adjacent numbers, and the deferral of `OBS-01` becomes legible instead of looking like an oversight.

**Collision check** (`LC_ALL=C /usr/bin/grep -oE '\*\*[A-Z]{2,6}-[0-9]+[a-z]?\*\*' .planning/REQUIREMENTS.md | sort -u`): 78 IDs across 17 prefixes; `OBS-` has exactly one member, `OBS-01`. **`OBS-02` … `OBS-05` are free.**

### Proposed — a new section in `## v1.5 Requirements`, in the file's own house style

```markdown
### Observable Failure on the Money Path

- [ ] **OBS-02**: On a path that carries money, a failure produces an effect the
      person affected can see — or, where only staff can act on it, an effect
      staff can see. No failure on these paths is discharged by a log line: there
      is no error tracking (OBS-01), so a log is a place nobody looks
- [ ] **OBS-03**: A failed read is never rendered as a legitimate value. *We could
      not read your drinks* is distinguishable from *you have no drinks*, *we could
      not count* from *none sold*, and a night whose count failed does not render
      as open with the control that takes money beside it
- [ ] **OBS-04**: A refusal with distinguishable causes says which one, wherever
      the next step differs. The wording for each cause is written once and used
      always, and it travels as a **returned value**, never as a thrown message —
      Next redacts the message of an error thrown out of a Server Action in a
      production build
- [ ] **OBS-05**: A discount applied before signing up survives the trip through
      registration: the resumed purchase is charged the same price the guest was
      shown, or it refuses and says why. Nobody is charged an amount they were not
      shown
```

**Traceability rows** (`REQUIREMENTS.md` §Traceability, same table shape as `DS-07`):

```
| OBS-02 | Phase 46 | Pending — nine sites, Group M of 41.2's deferred-items |
| OBS-03 | Phase 46 | Pending — DI-41.2-03, -07, -08 |
| OBS-04 | Phase 46 | Pending — DEF-41.2-A, DI-41.2-12, and DI-41.2-20 if scoped in |
| OBS-05 | Phase 46 | Pending — DI-41.2-09; criterion 3, fixed first |
```

**Also fix while in the file:** `REQUIREMENTS.md:252` carries a stale traceability note the 41.2 verification already corrected in prose but not in the table — it is named at `41.2-VERIFICATION.md:554`. One line; not this phase's requirement, but this phase is the next one to open the file.

| ID | Description | Research Support |
|----|-------------|------------------|
| OBS-02 | Every failure has an observable effect | §2 mechanism inventory, mapped per finding |
| OBS-03 | A failed read is not a legitimate value | §1 rows 03, 07, 08 — the *third state* |
| OBS-04 | Distinguishable causes say which one | §3 the refusal-category pattern, with converted examples |
| OBS-05 | The discount survives registration | §4 the full trace |

</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Directive | Where it binds this phase |
|---|---|
| **Response Gate + classification** | This phase is **Critical** throughout: money, and one item takes money that was not owed. Impact analysis + owner validation **before** acting, per finding. |
| **Il denaro non si fida di chi lo annuncia** | The webhook's GET-verify rule is inherited by anything new that touches the money path. §6. |
| **Il segreto del venue è monotono** | `/events/[slug]` is one of the files this phase must open (`DI-41.2-08`). Four assertions must hold after every diff — §6. |
| **Zero fallimenti silenziosi** | The phase's entire subject. And the reinforcement measured 2026-08-05: **no error tracking**, so an effect must be *observable*, not logged. |
| **Precisione lessicale** | `member` ≠ `approved`. `DI-41.2-20`'s sharpest cause — *your account is not approved yet* — is a statement about someone's standing, delivered today as a generic failure. |
| **Il gate della verifica, in un repo senza test** | `npm run build` + written manual procedures. No test claim. |
| **`.planning/` è pubblico** | Roles, never people. |
| **⚠ `npm run verify` is forbidden here** | It runs `verify:capabilities`, which loads `.env.local` and reaches the Supabase **Management API against production** (`scripts/rls-baseline.mjs:205-215`). Run offline gates individually. |
| **⚠ `scripts/verify-conversion.mjs` is invisible to default `grep`** | Two literal NUL bytes; default `grep` is `ugrep -I`, which skips binary files **silently**. Use `LC_ALL=C /usr/bin/grep` or Read. |
| **macOS/BSD** | `grep -E`, `sed -i ''`. |

---

## 1 · The nine, re-measured on today's tree

Every coordinate below was re-read on **2026-08-14** in this session with `LC_ALL=C /usr/bin/grep -n` and `sed -n`. The instruction from `deferred-items.md:24-26` holds and is why this table is trustworthy: **anchor on the predicate text, not the line number** — a number that moved does not fail loudly, it matches nothing, which reads like a green.

| # | Shape | Current `file:line` (**re-measured**) | Exact code | What a person sees now | **Who** |
|---|---|---|---|---|---|
| `DI-41.2-01` | swallowing catch | `menu/GuestDrinkMenu.tsx:119-121`, inside a `try` whose own `catch` is at `:122` | `claimGuestOrders(orderIds).then(…).catch(() => {})` | Nothing. The drinks they **already paid for** silently stay attached to nobody | **Guest** who bought without an account and then signed in — at the bar, in front of a queue |
| `DI-41.2-02` | swallowing catch | `menu/GuestTokenDisplay.tsx:107` (`storeGuestOrder`), catch at `:117`, comment at `:118` | `} catch { /* localStorage unavailable */ }` | Nothing. For an account-less guest that `localStorage` entry **is the receipt**; the money moved, the entitlement did not become visible | **Guest**, immediately, with no alternative route |
| `DI-41.2-03` | failed read → legitimate value | `menu/GuestTokenDisplay.tsx:122` (`getGuestOrderIds`), `return [];` at `:127` | `} catch { return []; }` | *You bought nothing* — indistinguishable from the truth. The sharpest of the four: `[]` is not an error value here | **Guest**. And every caller downstream, which is why the fix is a **third state**, not a wider catch |
| `DI-41.2-04` | failed fetch → ambiguous status | `menu/GuestTokenDisplay.tsx:506` and `:512` (`orderStatus: "unknown"`); the 3 s poll at `:559-590`, its `catch` comment at `:588` | `if (!res.ok) return { tokens: [], orderStatus: "unknown" }` / `} catch { return { tokens: [], orderStatus: "unknown" } }` | The same spinner for a token that is **on its way** and one that will **never** arrive | **Guest**, and **staff at the bar** — a token endpoint failing at a party is a bar problem before it is a software problem |
| `DEF-41.2-A` | thrown sentence, three causes | `tickets/[id]/RefundRequestButton.tsx:112-113`; causes in `tickets/refund-actions.ts:100` (not authenticated), `:114` (not yours / not found), `:127` (already pending) | `setError(err instanceof Error ? err.message : "Something went wrong")` | One sentence — **and in production not even that**: Next redacts the message. The third cause is the only one where the right advice is *wait* | **Ticket holder**, who presses again on a request that is already pending |
| `DI-41.2-06` | **no handler at all** | `menu/PartyDrinkMenu.tsx:144-150` (`handleSave`), `:152-160` (`handleClear`) — neither has a `catch`; the file's own docblock names it at `:39` | `startTransition(async () => { await updateMenuClosesAt(…); … setSaved(true); })` | **Nothing at all.** The transition rejects, `setSaved(true)` is never reached, the confirmation never appears | **Organizer**, who believes the menu closes at midnight and has a bar still selling tokens at two |
| `DI-41.2-07` | failed read → legitimate value | `(members)/dashboard/page.tsx:173` (profile), `:200` (tickets), `:214` (**drink tokens**), `:256` (uploads) — `const { data } = …`, error never destructured. **All four hold exactly** | `const { data: allTokens } = await supabase.from("drink_tokens")…` → `null` → grouped to `[]` → section not drawn | A dashboard identical to one belonging to somebody who bought nothing. Not a blank screen a person distrusts — a **confident, well-formatted, wrong statement about what they own** | **Member**, in their own account |
| `DI-41.2-08` | failed count → legitimate zero, **wrong direction** | `(public)/events/[slug]/page.tsx:489-494` (per-party tier sold), `:532-536` (`rsvpCount \|\| 0`), `:637-642` (event-level tier sold). All three re-read: error object **never destructured**, `count ?? 0` | `const { count } = await serviceClient…; const sold = count ?? 0;` | **A full night renders as open, with the control that takes money beside it.** Nothing refuses, nothing warns | **Guest / member about to buy** — the page sells what is not there |
| `DI-41.2-09` | value written, never read back | `TierSelection.tsx:291-293` writes it · `PendingIntentHandler.tsx:42-47` type omits it · `:84` calls with **two arguments** | see §4 | Nothing. **No refusal, because nothing refused.** The struck-through price they were shown is not the price they pay | **A first-time guest** — and only that path; the signed-in path passes all three arguments (`TierSelection.tsx:301`) |

### Three corrections to the record, made by this re-measurement

1. **`DI-41.2-04`'s poll *is* bounded.** `GuestTokenDisplay.tsx:581` stops after `pollCountRef.current >= 10` — 30 seconds, not "forever". The entry's *"refreshed every three seconds"* is right; *"forever"* is not. **This makes the finding worse, not better**: the poll stops **silently**, with the same spinner still on screen and no state change at all. There is no elapsed-time message and no terminal state. The 30-second bound is where the observable effect belongs.
2. **`DI-41.2-04`'s two `"unknown"` returns and the poll are two different functions.** `:506`/`:512` are the initial per-order load; the interval at `:559-590` has its own `if (!res.ok) return;` at `:565` and its own bare `catch` at `:587-588`. That is **three** discard sites, not two.
3. **`DI-41.2-08`'s coordinates drifted by ±2 lines** (the entry cites `:489-493`, `:532-536`, `:637-641`; the tree reads `:489-494`, `:532-536`, `:637-642`). All three predicates are present verbatim. `DI-41.2-06` cites `:144-146`/`:153-156`; the tree reads `:144-150`/`:152-160` — the *function bodies* moved, the predicate did not.

---

## 2 · What "an observable effect" can mean here, mechanically

`meta-gates.md`: *"Finché resta così, «loggare l'errore» **non è sufficiente**: il log è un posto dove nessuno guarda. Un fallimento che conta deve avere un **effetto osservabile**."* Five mechanisms exist in this tree today. Each is listed with a worked example **from converted code**.

| # | Mechanism | Worked example in the tree | Reaches | Fits |
|---|---|---|---|---|
| **M1** | **Toast** — `useToast()` from `src/components/toast/ToastContext.tsx:95`; `ToastProvider` is mounted in the **root layout** (`src/app/layout.tsx:120`), so it is available on every client surface without a new provider | `ToastContext.tsx:1` region carries `role="status"` | The person at the screen, **transiently** | `DI-41.2-01`, `DI-41.2-06` |
| **M2** | **The primitive's `status` region** — `Dialog.tsx` renders one (`role="status"`); the pattern is recorded in `41.2-PATTERNS.md:326-332`: *"the refusal is the primitive's `status`, never a toast"*, because a native `<dialog>` paints in the top layer and a toast under it is invisible | `RefundRequestButton.tsx:127`, `PartyDrinkMenu.tsx` (4 regions), `dashboard/page.tsx` (5) | The person, **persistently, in place** | `DEF-41.2-A`, `DI-41.2-06`, `DI-41.2-07` |
| **M3** | **An announced `role="alert"` region** — 20+ files carry one; on the money path already: `TierSelection.tsx` (2), `PendingIntentHandler.tsx`, `GuestDrinkMenu.tsx`, `GuestTokenDisplay.tsx`, `RsvpButton.tsx` | `TierSelection.tsx:315-320` and its in-place comment: *"it was a tinted box with no role, which said nothing at all to a person not looking straight at it"* | The person, **interrupting** — for a refusal they must act on | `DI-41.2-03`, `DI-41.2-04`, `DI-41.2-09` |
| **M4** | **A returned refusal value from a Server Action** — a tagged constant, never a thrown sentence, because Next **redacts** Server Action error messages in production | `/api/media/finalize/route.ts:414-419`: `const refuse = (reason: FinalizeRefusal, …) => NextResponse.json({ ok: false, reason }, { status: FINALIZE_HTTP[reason] })` | Every caller, **surviving the production boundary** | `DEF-41.2-A`, `DI-41.2-09`, `DI-41.2-12`, and `DI-41.2-20` if scoped in |
| **M5** | **A disabled control with a stated reason** — the purchase control is not drawn, or is drawn inert with the reason beside it | `PendingIntentHandler.tsx:104` `if (!processing && !isPending && !error && !checkoutId) return null;` — the same lever, used for the opposite purpose | The person, **before** they can act wrongly | `DI-41.2-08` — the only mechanism whose direction is right |

### Mapping, per finding

| Finding | Mechanism | Note |
|---|---|---|
| `DI-41.2-01` | **M1** (guest signed in, page persists) + a durable trace | A toast alone is transient and this is a *paid* entitlement. Pair it: the claim failure must also leave the `localStorage` key **in place** — which it accidentally already does, because `removeItem` is in the `.then`. **Make that deliberate and comment it**, or the next reader deletes the mercy. |
| `DI-41.2-02` | **none fits directly** | It is a `void` helper in module scope with no component to render into. **The mechanism must be created**: change the return type to a discriminated result and let the caller (`:528`, `:553`) render it. This is a contract change, same class as `-03`. |
| `DI-41.2-03` | **M3**, after a **third state** | `[]` cannot be distinguished from `[]`. `getGuestOrderIds` must return `{ ok: true, ids } \| { ok: false, reason }`. The mechanism is downstream of a type change, not instead of one. |
| `DI-41.2-04` | **M3** for the guest + a **terminal state** at the bound | Two distinct sentences: *still arriving* (before the bound) and *we could not confirm this — show this screen at the bar* (at `:581`). The staff-facing half is a product decision, §9. |
| `DEF-41.2-A` | **M2** (region already exists at `:127`) + **M4** | The region is built. What is missing is a category to put in it. |
| `DI-41.2-06` | **M2** — the file already has four `role="status"` regions | The cheapest of the nine: `handleSave`/`handleClear` gain a `catch` that writes into a region beside the confirmation the success path already uses. **No payload change, no server edit.** |
| `DI-41.2-07` | **M2** per read | The finding is explicit that it needs *"the same treatment on all four reads or it is an inconsistency instead of a fix"*. Destructure `error` on all four; render a distinct sentence per section. |
| `DI-41.2-08` | **M5** — and **only** M5 | A message beside a purchase control that still works is not a fix here: the failure direction is *sells what is not there*. When a count cannot be read the control must not be purchasable. **This is the one place a message is the wrong answer.** |
| `DI-41.2-09` | **M4** + **M3** | Pass the third argument; the action already refuses by throwing on all four discount causes. Convert those to returned categories or separate by position. §4. |

**Where none fits:** `DI-41.2-02`, and **the operator half of `DI-41.2-04`**. There is no staff-facing channel for *"the token endpoint is failing at this party"* — no admin surface polls it, no dashboard shows it, and `OBS-01` (error tracking) is deferred. §9 records this as the owner's decision; §8 records it as a landmine, because a repair that only tells the *guest* leaves the bar blind.

---

## 3 · The refusal-category pattern this project already uses

**The rule, stated in the tree**, at `src/app/(public)/events/[slug]/actions.ts:66-73`:

> *"this action signals by THROWING, and **Next redacts the message of an error thrown out of a Server Action in a production build** (`guards.ts:73-79`). So the categories above are distinguishable in `next dev` and in a log, and **NOT on the client**, where they arrive as one redacted message. Carrying a category to the client requires a **tagged value decided by position** — a discriminated result — and that is a change to this function's return type."*

This is the single most load-bearing sentence for Phase 46. It means **five of the nine cannot be fixed by rewording a `throw`.** A better sentence thrown out of a Server Action is not visible in production.

### The three converted examples

**(a) The union — refusals as constants** (`src/app/api/media/finalize/route.ts:207-222`)

```ts
type FinalizeRefusal =
  | typeof MEDIA_FINALIZE_UNAUTHENTICATED
  | typeof MEDIA_FINALIZE_MALFORMED_REQUEST
  | …                                    // fourteen locally declared
  | MediaStripRefusalReason;             // plus a shared union, imported
```

**(b) The total `Record` — the build-time trip-wire** (`route.ts:224-254`)

```ts
/**
 * The status each refusal answers with, as a **total** `Record` over the union:
 * a category added without a status is an `npm run build` error and not a
 * silent 500. Same construction, and the same reason, as `DOOR_HTTP`
 * (`src/lib/door/outcome.ts:44-48`).
 */
const FINALIZE_HTTP = { … } as const satisfies Record<FinalizeRefusal, number>;
```

Four `satisfies Record<…>` totality maps exist tree-wide: `route.ts:254`, `route.ts:294`, `capability-routes.ts:477`, `outcome.ts:48`.

**(c) The copy map — sentences, one per cause, written once** (`src/lib/door/outcome.ts:283-303`)

```ts
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

Its docblock carries the argument Phase 46 should reuse verbatim: *"«you are on the door, but this device has the wrong night selected» is a refusal somebody can act on in five seconds, where «not allowed» sends them to find an organizer."*

**And the third sentence is the template for every one of the nine.** `DOOR_NIGHT_UNRESOLVED` is the *we could not answer* category — distinct from *no*. `/api/media/finalize` gives it its own HTTP code with the meaning `require-operator.ts` established: **`503` = the question could not be answered, this is not a refusal of you** (`route.ts:230-234`). That distinction is exactly what `DI-41.2-03`, `-07` and `-08` are missing.

### Which of the nine can adopt it, and which cannot without a payload change

| Finding | Adopts as-is? | What it costs |
|---|---|---|
| `DEF-41.2-A` | **Needs a payload change** | `requestRefund` throws on all three (`refund-actions.ts:100,114,127`) and returns `{ success: true }`. Convert to `{ ok: true } \| { ok: false, reason: RefundRefusal }` + a `Record<RefundRefusal, string>`. **One caller** (`RefundRequestButton.tsx:109`). Cheap and total. |
| `DI-41.2-09` | **Needs a payload change** | `purchaseTicket` throws on four discount causes (`actions.ts:1390,1391,1392,1408`) and returns `{ success, checkoutId, purchaseId }` (`:1478`). Two callers (`TierSelection.tsx:301`, `PendingIntentHandler.tsx:84`). §4. |
| `DI-41.2-12` | **Yes — by deletion** | `PendingIntentHandler.tsx:96`'s first arm already relays the action's own distinct sentences; the second arm fires only for a **non-`Error` throw**. Once `DI-41.2-09` converts the action to a returned result, the generic arm becomes unreachable and should be **removed**, not reworded. |
| `DI-41.2-03`, `-02` | **Yes, locally** | Not Server Actions — module-scope helpers. Same construction, no server edit: change the return type, add a `Record<…, string>`, render via M3. |
| `DI-41.2-04` | **Yes, locally** | Replace the `"unknown"` string with a union that separates *arriving*, *could not reach the server*, *the server refused*, and *the bound was reached*. |
| `DI-41.2-01` | **Needs a payload change** | `claimGuestOrders` is a Server Action; its causes reach the client redacted. Convert to a returned result. |
| `DI-41.2-06` | **No — none needed** | `updateMenuClosesAt` (`menu/actions.ts:48,51,60`) already throws distinct sentences, and the *absence of a handler* is the defect. A `catch` writing into an existing `role="status"` region closes it. If the categories are wanted at the client, that is a payload change — **and it may not be worth it**; see §9. |
| `DI-41.2-07`, `-08` | **Not applicable** | Server Components reading Supabase directly. No action to convert. The fix is destructuring `error` and branching — the *third state* at the render site. |

---

## 4 · `DI-41.2-09` — the one that charges the wrong amount, traced whole

Criterion 3. **The only one of the nine that takes money that was not owed**, and it is the fix that goes first.

### Where the intent is written — `TierSelection.tsx:285-296`

```ts
function handlePurchase() {
  if (!selectedTierId) return;
  setError(null);

  // Anonymous user: save intent and redirect to register
  if (!isAuthenticated) {
    localStorage.setItem(
      "resonate_intent",
      JSON.stringify({ type: "purchase", tierId: selectedTierId, partyId, eventSlug,
                      discountCodeId: discount?.id ?? null })   // ← :293, written
    );
    window.location.href = `/register?next=/events/${eventSlug}`;
    return;
  }
```

### Where it is read — `PendingIntentHandler.tsx:42-47` and `:84`

```ts
interface PurchaseIntent {
  type: "purchase";
  tierId: string;
  partyId: string | null;
  eventSlug: string;
}                                    // ← :47. No discount identifier. The field
                                     //   written at TierSelection:293 has no
                                     //   declaration to be read out of.
…
const result = await purchaseTicket(intent.partyId, intent.tierId);   // ← :84
```

### The action's signature — `(admin)/admin/events/actions.ts:1217`

```ts
export async function purchaseTicket(
  partyId: string | null,
  tierId: string,
  discountCodeId?: string | null,   // ← optional. This is why nothing fails.
)
```

**Why nothing catches it, exactly.** The third parameter is optional, so `purchaseTicket(a, b)` typechecks. The field is written into `localStorage` as JSON, which has no type at the boundary, and read back as `Intent` — a type that does not declare it — so `JSON.parse` neither strips it nor complains: **the value is present in the object at run time and unreachable through the type.** `npm run build` is green, no exception is thrown, no branch is taken. **The defect has no failure mode at all**, which is why it is the hardest of the nine to have found and the easiest to reintroduce.

### What the server re-validates — `actions.ts:1381-1419`

```ts
let finalPrice = tier.price;
let validatedDiscountCodeId: string | null = null;

if (discountCodeId && partyId) {            // ← :1386. undefined ⇒ the whole
                                            //   block is skipped, in silence
  … if (codeError || !code) throw new Error("Invalid discount code");
    if (!code.is_active)     throw new Error("Discount code is no longer active");
    if (code.party_id !== partyId) throw new Error("Code not valid for this event");
    …                        throw new Error("Code not valid for this tier");
    …                        throw new Error("Code usage limit reached");
```

**The server is correct and complete.** It re-validates independently — active, right night, tier applicability via `discount_code_tiers`, usage limit against `tickets`. It never trusts the client's price. It simply **is never asked**, because the third argument arrives `undefined`, and the `if` guard turns "no code" and "a code that was dropped" into the same branch.

### What a guest is actually charged

`finalPrice` stays `tier.price` (`:1382`), `validatedDiscountCodeId` stays `null`, and the checkout is created for the full amount. **The struck-through price the guest was shown at `TierSelection.tsx:379-382` is not the price they pay, and no message appears anywhere on the path.** There is no refusal, because nothing refused.

### The five-line repair, and the two decisions inside it

1. `PurchaseIntent` gains `discountCodeId: string | null` (`PendingIntentHandler.tsx:42-47`).
2. `:84` becomes `purchaseTicket(intent.partyId, intent.tierId, intent.discountCodeId ?? null)`.
3. `purchaseTicket`'s four discount throws become returned categories (§3) — otherwise the refusal reaches the guest **redacted**, and the repair swaps a wrong price for an opaque sentence.
4. The stored-intent JSON must be **validated**, not cast (`:70` is a bare `JSON.parse` assigned to `Intent`). An intent written by an older build has no `discountCodeId`; `?? null` covers it, but the cast is what let this defect exist and it should stop being a cast.
5. **Move `localStorage.removeItem` to after the success test** — that is `DI-41.2-11`, in the same four lines. §7.

**The decision that is not Claude's** (§9): a code that has since been deactivated, exhausted, or restricted to another tier. The action refuses all three. *Refuse and say why* is almost certainly right — it is the only answer consistent with `community-membership.md`'s *un rifiuto è una comunicazione, non uno stato* — but the finder's own words apply: *"'probably' is not a thing to settle inside a visual conversion"*, and it is not a thing to settle inside a research document either.

### ⚠ `DEF-41.2-C` — the trap armed in the exact place the repair must touch

`TierSelection.tsx:242`, **added by Phase 41.2**:

```ts
const discountCodeId = useId();          // a DOM id for the discount input's label
```

`:293`, **same component scope**, writes the money-bearing key:

```ts
JSON.stringify({ type: "purchase", tierId: selectedTierId, partyId, eventSlug,
                 discountCodeId: discount?.id ?? null })
```

The explicit `key: value` form is **correct today** and its value is `discount?.id`, not the React id. But the key now **shadows a live in-scope variable of an entirely different meaning**, and its two neighbours — `partyId`, `eventSlug` — are already written in the **shorthand** form, three tokens away. Shorten `discountCodeId: discount?.id ?? null` to `discountCodeId` and the stored intent silently carries a React-generated DOM id where a discount identifier belongs.

**Blast radius today is zero**, because `DI-41.2-09` records that the field is never read. **The repair for `DI-41.2-09` is to start reading it.** The 41.2 verification scanned tree-wide: three `useId()` variables were added by that phase and **this is the only one whose name also appears as an object key in its own file** (`41.2-VERIFICATION.md:438-460`).

**Rename the local to `discountCodeInputId` in the same task, before the read is wired.** One line, no behaviour. If it is left for later, the trap outlives the only window in which it is cheap.

---

## 5 · Architecture

### Where the failure paths live

```
GUEST, no account                        MEMBER, signed in
      │                                        │
      ▼                                        ▼
TierSelection.tsx                        dashboard/page.tsx
  :291 write intent ──┐                    :173 :200 :214 :256
  :301 direct call    │                      four reads, error dropped
  (3 args — correct)  │                            │  DI-41.2-07
      │               │                            ▼
      │        localStorage                  renders "you own nothing"
      │      "resonate_intent"
      ▼               │
  /register           │
      │               ▼
      └────► PendingIntentHandler.tsx
               :70  JSON.parse, bare catch    ← DI-41.2-10
               :84  purchaseTicket(a, b)      ← DI-41.2-09  ⚠ money
               :85  removeItem BEFORE test    ← DI-41.2-11
               :96  generic second arm        ← DI-41.2-12
                        │
                        ▼
         actions.ts:1217 purchaseTicket(a, b, discountCodeId?)
               :1386 if (discountCodeId && partyId)  ← never entered
               :1390-1408 four throws  → REDACTED in production
               :1478 return { success, checkoutId }
                        │
                        ▼  SumUp hosted checkout
              webhooks/sumup/route.ts:21-24
              GET-verify, idempotent  ── MONOTONE, DO NOT TOUCH

PUBLIC EVENT PAGE                        THE BAR
events/[slug]/page.tsx                   menu/GuestDrinkMenu.tsx:119  ← DI-41.2-01
  :489 :532 :637 counts                  menu/GuestTokenDisplay.tsx
  error never destructured                 :107 write   ← DI-41.2-02
  DI-41.2-08 → sells what is not there     :122 read    ← DI-41.2-03
                                           :506 :512 :565 :587 fetch ← DI-41.2-04
                                         menu/PartyDrinkMenu.tsx
                                           :144 :152 no handler ← DI-41.2-06

THE TICKET                               tickets/[id]/RefundRequestButton.tsx:112
                                           refund-actions.ts :100 :114 :127 ← DEF-41.2-A
```

### Pattern 1 — the third state (`DI-41.2-02`, `-03`, `-04`, `-07`, `-08`)

**What:** a read that can fail returns three answers, not two: *value*, *legitimately empty*, *could not be read*.
**When:** whenever the empty value is itself legitimate — `[]`, `0`, `null`, `"unknown"`.
**Precedent in the tree:** `/api/media/finalize` gives *could not be answered* its own code, `503`, with the meaning `require-operator.ts` established (`route.ts:230-234`); `DOOR_NIGHT_UNRESOLVED` gives it its own sentence.

### Pattern 2 — the refusal as a returned constant, rendered from a total `Record`

§3. `type X = …` union → `as const satisfies Record<X, …>` → `Record<X, string>` of sentences.

### Anti-patterns

- **`console.error` as a fix.** No error tracking. `meta-gates.md`: the log is a place nobody looks. Every one of the nine must produce an effect **outside the console**.
- **A better sentence in a `throw` out of a Server Action.** Redacted in production. `actions.ts:67-70`.
- **A message beside a still-live purchase control** for `DI-41.2-08`. The direction is *sells what is not there*; the answer is M5, not M3.
- **Fixing one of `dashboard/page.tsx`'s four reads.** The finding says it: all four, or it is an inconsistency instead of a fix.
- **Shortening `discountCodeId:` to shorthand.** §4.

---

## 6 · What must NOT change — the boundary, redrawn

### Monotone guards — assert after every diff

| Guard | Assertion | Where |
|---|---|---|
| The reveal is one-way | three-branch ternary stays three; reveal test stays **positive**; `export const dynamic = "force-dynamic"` present; **no `generateMetadata` added** | `events/[slug]/page.tsx` — the file `DI-41.2-08` must open |
| A completed payment corrects forward | the webhook's GET-verify is untouched; both branches stay idempotent | `api/webhooks/sumup/route.ts:21-24` |
| An amount taken never looks untaken | no fix renders a smaller number, hides a charge, or suppresses a refund record | `dashboard/page.tsx`, `tickets/[id]/**` |
| A progressivo appends | not touched by this phase | — |

### Files a fix MAY open

| File | Finding | Why it is now allowed |
|---|---|---|
| `menu/GuestDrinkMenu.tsx` | `-01` | client |
| `menu/GuestTokenDisplay.tsx` | `-02` `-03` `-04` | client |
| `menu/PartyDrinkMenu.tsx` | `-06` | client, **no payload change needed** |
| `(members)/dashboard/page.tsx` | `-07` | Server Component read; destructure `error` |
| `(public)/events/[slug]/page.tsx` | `-08` | Server Component read — **under the four reveal assertions above** |
| `TierSelection.tsx` | `-09`, `DEF-41.2-C` | client |
| `PendingIntentHandler.tsx` | `-09` `-10` `-11` `-12` | client |
| `tickets/[id]/RefundRequestButton.tsx` | `DEF-41.2-A` | client |
| **`(admin)/admin/events/actions.ts`** — `purchaseTicket` **only** | `-09` | **The boundary moves here.** §below |
| **`(public)/tickets/refund-actions.ts`** — `requestRefund` **only** | `DEF-41.2-A` | same |
| **`menu/actions.ts`** — `claimGuestOrders` **only** | `-01` | same |
| `src/lib/…` — a new refusal-category module | all | additive; see below |

### Where the boundary now sits, precisely

Phase 41.2's stop condition 2 was *"no server action is in the visual perimeter; if a plan finds it must open one, halt."* **That condition existed because the mandate was visual.** Phase 46's mandate is exactly the thing 41.2 refused to do. The condition is therefore **replaced**, not deleted, by a narrower one:

> **A plan may change a Server Action's return type and add a returned refusal category. A plan may not change what a Server Action *decides*.**

Concretely, for the three actions in scope:

- **Allowed:** convert `throw new Error(...)` into `return { ok: false, reason: <constant> }`; add a return-type union; add a parameter that is already declared (`purchaseTicket`'s third argument is **already in the signature** — passing it is not a signature change).
- **Allowed:** add a `Record<Reason, string>` copy map, in `src/lib/` or beside the action.
- **Forbidden:** removing or weakening any predicate. Every one of `purchaseTicket`'s four discount checks (`:1390`, `:1391`, `:1392`, `:1408`) and `requestRefund`'s three (`:100`, `:114`, `:127`) must still refuse the same inputs. A conversion from `throw` to `return` that drops a check is a **capability regression wearing a refactor's clothes**.
- **Forbidden:** any change to the SumUp webhook, `getCheckout`, the price computation (`actions.ts:1419-1440`), or the `pending_purchases` insert (`:1472-1478`).
- **Forbidden:** any migration, any RLS policy, any Supabase write. `DI-41.2-07` and `-08` are **read-side render fixes**; if a plan concludes it needs a schema change, that is a halt.

### Files a fix may NOT open

`api/webhooks/**` · `api/cron/**` · `supabase/migrations/**` · `src/lib/rbac/**` · `src/middleware.ts`, `src/lib/supabase/middleware.ts` · `src/lib/offline/**` · `src/lib/venue-reveal/**` · `src/utils/qr.ts` · `src/lib/sumup.ts` · the four Phase-42 spine files (41.2 stop condition 3 — **still binding**; needing to edit one is a halt) · `scripts/*.mjs` gates and their thresholds.

---

## 7 · The three adjacent cases — scope decision, with reasons

The roadmap asks for this to be deliberate rather than accidental.

| # | Site | **Decision** | Reason |
|---|---|---|---|
| `DI-41.2-10` — a malformed stored intent is discarded in silence | `PendingIntentHandler.tsx:69-74` | **IN** | It is *the same file, the same `useEffect`, the same four lines* as `DI-41.2-09`. A guest whose intent cannot be parsed loses a purchase they began, indistinguishably from never having pressed buy. And §4 item 4 requires the parse to become a validation anyway — the fix for `-09` **cannot be done without touching this code**. Leaving it out means opening the file twice and deciding the copy twice. |
| `DI-41.2-11` — the intent is removed on the wrong side of the test | `PendingIntentHandler.tsx:85-90` | **IN** | Currently **not reachable** — the finder measured it honestly: `purchaseTicket`'s only `return` is a success (`actions.ts:1478`); every other exit throws, and a throw lands in the `catch` and *does* produce a visible refusal. **But `DI-41.2-09`'s repair converts those throws into returns** (§3), which is precisely the *"future change to what that action returns"* the finder named. **This phase is the change that arms it.** Fixing `-09` without `-11` creates a live silent drop. One line: move `removeItem` below the success test. |
| `DI-41.2-12` — the generic fallback at its narrower form | `PendingIntentHandler.tsx:96` | **IN, as a deletion** | The first arm relays the action's distinct sentences; the second fires only for a non-`Error` throw. Once `-09` converts the action to a returned result the arm is unreachable dead code that still *looks* like the banned newsletter shape to every future reader. Removing it costs one line and closes `OBS-04` on this file. **Do not reword it** — that would keep the shape and add a sentence to maintain. |

**And one from Group C, promoted:** `DI-41.2-20` — **five RSVP refusals arriving as one opaque sentence** (`RsvpButton.tsx`, causes in `rsvp-actions.ts`). Group C is defined as *off the money path*, and RSVP is free. **But `ROADMAP.md:1061` names it inside criterion 2 explicitly**, and its sharpest cause — *your account is not approved yet* — is a statement about someone's **standing in the community** delivered as a generic failure, which `community-membership.md` (*un rifiuto è una comunicazione, non uno stato*) and `CLAUDE.md`'s *precisione lessicale* both make load-bearing. It is also the **same file family** as `DI-41.2-09`: `rsvpToParty` is called from `PendingIntentHandler.tsx:92`, in the branch beside the one being repaired.

> **Recommendation: scope `DI-41.2-20` IN, and say so in the plan.** If the owner scopes it out, `OBS-04` in §Phase Requirements must drop its reference and criterion 2's *"five RSVP refusals"* becomes unmet — which would need saying out loud rather than discovering at verification. **This is an owner decision (§9, O4).**

---

## 8 · Landmines

| # | `file:line` | The landmine |
|---|---|---|
| **L1** | `TierSelection.tsx:242` vs `:293` | `DEF-41.2-C`. A `useId()` local named `discountCodeId` shadows the money-bearing object key three tokens from two shorthand neighbours. **Rename to `discountCodeInputId` in the same task that starts reading the field.** |
| **L2** | `actions.ts:1217` | The third parameter is **optional**. Nothing about the two-argument call fails to compile or at run time. Removing the `?` would surface the bug at build time — **but it is a public signature with two callers**, and making it required is a bigger change than passing it. Decide deliberately, don't drift. |
| **L3** | `PendingIntentHandler.tsx:70` | `intent = JSON.parse(raw)` is a **cast, not a validation**. It is the mechanism that let a written-and-never-read field exist. If the repair adds a field without adding validation, the next field does the same thing. |
| **L4** | `events/[slug]/page.tsx` — the whole file | The four reveal assertions (§6) bind every diff. `DI-41.2-08` is three small edits in a file where a wrong edit publishes an address. **Critical, owner in the loop.** |
| **L5** | `GuestTokenDisplay.tsx:581` | The poll's bound (`>= 10`) fires **silently** — `clearInterval` and nothing else. A fix that only handles `catch` at `:587` misses the commonest terminal state. |
| **L6** | `GuestDrinkMenu.tsx:119-121` | `localStorage.removeItem(key)` sits in the `.then`, so the failing branch keeps the fallback alive. `deferred-items.md:51-53` calls this *"the one mercy here, and it is accidental rather than designed."* **A fix that tidies the promise chain can delete it.** Comment it in place. |
| **L7** | `dashboard/page.tsx:173,200,214,256` | Four reads. Fixing fewer than four is *an inconsistency instead of a fix* — the finder's words. Two are inside `if (isMemberRole)` blocks (`:198`, `:212`), so the branch structure differs and a uniform edit will not apply cleanly. |
| **L8** | `refund-actions.ts:85-92` | Its docblock states it was *deliberately not converted* in an earlier phase because its `auth.getUser()` anchors an **ownership** check, not a staff gate. **A refusal-category conversion must not be mistaken for the capability conversion that docblock declines.** Leave the docblock's claim intact and true. |
| **L9** | `menu/actions.ts:48,51,60` | `updateMenuClosesAt` throws on a **refused capability** and on a **failed write**. Those are different sentences to an organizer (*you may not* vs *it did not save*), and today both produce **nothing at all**. If `DI-41.2-06` is fixed with a single `catch` and one sentence, the phase has replaced a silent failure with a collapsed one — the newsletter defect, on the money path. |
| **L10** | `scripts/verify-conversion.mjs` | Invisible to the shell's default `grep` (two NUL bytes; default `grep` is `ugrep -I`, which skips binary files **silently**). A zero-hit grep there is **not** evidence of absence. |
| **L11** | `npm run verify` | Runs `verify:capabilities`, which loads `.env.local` and reaches the Supabase **Management API against production** (`scripts/rls-baseline.mjs:205-215`). **Never run it in this phase.** Run offline gates individually. |
| **L12** | Prose about this phase | Naming the word whose absence is being asserted destroys the measurement — four instances in Phase 41.2, the sharpest a docblock explaining a count was zero and making it five. **Describe the needle; never spell it.** |

---

## 9 · Sequencing, and what is genuinely the owner's

### Proposed wave shape

| Wave | Contents | Character | Parallel? |
|---|---|---|---|
| **0** | **The copy sitting.** Every sentence for every category, written once, agreed, recorded. Plus the scope call on `DI-41.2-20`. Plus the three owner decisions below. | **Product decision.** Blocks waves 2–4; does **not** block wave 1's mechanics. | no — one sitting |
| **1** | `DI-41.2-09` + `DEF-41.2-C` + `DI-41.2-10` + `DI-41.2-11` + `DI-41.2-12`. One file plus `purchaseTicket`. **Criterion 3: this goes first.** | Payload + type change. Critical. | no — single file, single decision |
| **2** | `DEF-41.2-A` (refund) and `DI-41.2-20` (RSVP, if in). Both are *action → returned category → `Record` of sentences*. | Payload + copy. Same shape twice. | yes — different files |
| **3** | `DI-41.2-02` `-03` `-04` (the guest custody trio, **one decision** — *what does a guest see when the browser cannot hold their receipt*, and splitting them produces half an answer) and `DI-41.2-01`. | Type change, client-local + one action. | `-01` may run beside the trio |
| **4** | `DI-41.2-06` (add the missing handler), `DI-41.2-07` (four reads), `DI-41.2-08` (disable the control). | Pure addition of an observable effect. No payload change. `-08` is Critical (reveal file). | yes — three files |
| **5** | Verification: `npm run build`, offline gates individually, and the **written manual procedures** with `Result: pending`. | | no |

**Why `DI-41.2-09` is not last despite being hardest:** criterion 3 says so, and `DEF-41.2-C` and `DI-41.2-11` are traps that this phase *arms* — the longer wave 1 waits, the more chances another plan has to trip them.

**Why the copy sitting is wave 0 and not distributed:** `community-membership.md`, *un rifiuto è una comunicazione, non uno stato* — *"il testo del rifiuto va scritto una volta, con cura, e usato sempre lo stesso."* Sentences decided per-plan produce four registers on one product.

### Classified by kind, as the brief asks

- **Copy a person reads (product before visual):** `DEF-41.2-A`, `DI-41.2-20`, and the sentences for `-03`, `-04`, `-06`, `-07`, `-08`, `-09`.
- **Payload or type changes:** `DI-41.2-01`, `-02`, `-03`, `-04`, `-09`, `DEF-41.2-A`, `DI-41.2-20`.
- **Pure additions of an observable effect (no payload change):** `DI-41.2-06`, `-07`, `-08`, `DEF-41.2-C`, `DI-41.2-11`, `-12`.

### The owner's decisions — none of these is Claude's

| # | Decision | Why it is the owner's |
|---|---|---|
| **O1** | **A discount code that no longer applies when the purchase resumes: refuse, or proceed at full price with a stated reason?** | This is *what a guest is charged*, and both answers are defensible. The action already refuses. `DI-41.2-09`'s finder wrote *"probably let it refuse — but 'probably' is not a thing to settle inside a conversion."* |
| **O2** | **The staff-facing half of `DI-41.2-04`.** A token endpoint failing at a party is a bar problem before it is a software problem. **No staff channel exists** — no admin surface polls it, nothing shows it, `OBS-01` is deferred. Is a guest-only fix acceptable, or does the bar need a screen? | It is an operational cost decision at the counter, and *"la porta non ha rete"* thinking applies: the person behind the bar has a queue. |
| **O3** | **Every sentence.** Especially: *your account is not approved yet* (a statement about standing — `community-membership.md`), *a refund request is already pending* (the only *wait*), *we could not read your drinks* (must not manufacture alarm about money that is safe). | `un rifiuto è una comunicazione, non uno stato`. |
| **O4** | **Is `DI-41.2-20` (RSVP) in scope?** §7 recommends yes; criterion 2 names it; it is off the money path by Group C's own definition. | Scope, and it changes whether criterion 2 can be met. |
| **O5** | **`DI-41.2-08`: when a count cannot be read, does the purchase control disappear or go inert with a reason?** Disappearing is safer; inert-with-reason is honest. Both refuse the sale. | It is what a buyer sees on the product's most public money surface. |
| **O6** | **Does `updateMenuClosesAt` get returned categories, or one `catch` with two sentences separated by position?** (L9.) The cheap fix risks collapsing *you may not* into *it did not save*. | Cost/benefit on an organizer-only surface. |

---

## 10 · Validation Architecture

### Test framework

| Property | Value |
|---|---|
| Framework | **None.** `package.json` declares no `test` script; there is no `*.test.*` or `*.spec.*` in the tree |
| Config file | none |
| Quick run command | `npm run build` — `next build` is also the typecheck gate; a type error blocks the Vercel deploy |
| Full suite command | `npm run build`, then the offline gate scripts **individually** |
| ⚠ Forbidden | **`npm run verify`** — runs `verify:capabilities`, which loads `.env.local` and reaches the Supabase Management API **against production** (`scripts/rls-baseline.mjs:205-215`) |

**Do not propose adding a test runner as this phase's verification strategy.** Introducing one is its own milestone-sized decision and it is not on this roadmap.

### Requirements → proof map

| Req | Behaviour | Type | Command / procedure | Exists? |
|---|---|---|---|---|
| OBS-05 | the resumed purchase carries the discount | **compile-time** | after wave 1, `LC_ALL=C /usr/bin/grep -n "purchaseTicket(intent" PendingIntentHandler.tsx` shows **three** arguments; `npm run build` green | ✅ |
| OBS-05 | the trap is disarmed | **compile-time** | `LC_ALL=C /usr/bin/grep -c "const discountCodeId = useId" TierSelection.tsx` → **0** | ✅ |
| OBS-04 | a category added without a sentence fails the build | **asserted mutation** | add a member to the refusal union without a `Record` entry → `npm run build` **must fail**; revert. *(The totality property is the requirement; the mutation is the only proof.)* | ✅ after wave 2 |
| OBS-04 | no refusal on the money path reaches the client as a thrown message | **derivation** | per converted action, `grep -c "throw new Error"` in the refusal region → 0 | ✅ |
| OBS-03 | the four dashboard reads all destructure `error` | **derivation** | `LC_ALL=C /usr/bin/grep -c "const { data" dashboard/page.tsx` vs `"error"` on the same four lines | ✅ |
| OBS-03 | a failed count does not render a purchasable control | **manual, needs a running app** | ❌ **not mechanically testable** — `Result: pending` | ❌ Wave 5 |
| OBS-02 | each of the nine produces an effect | **manual per finding** | written procedure: role, steps, what must be observed | ❌ Wave 5 |
| all | the reveal guards still hold | **derivation, after every diff on `events/[slug]/page.tsx`** | three-branch ternary present; reveal test positive; `force-dynamic` present; `grep -c generateMetadata` → 0 | ✅ |
| all | monotone: the webhook is untouched | **derivation** | `git diff --stat src/app/api/webhooks/` → empty | ✅ |

### Sampling rate

- **Per task commit:** `npm run build`.
- **Per wave merge:** `npm run build` + the offline gate scripts individually + the reveal-guard derivations if `events/[slug]/page.tsx` was opened.
- **Phase gate:** `46-VERIFICATION.md` with a `file:line` citation per requirement, the asserted-mutation result for the totality property, and every manual procedure written out with `Result: pending`.

### Wave 5 gaps — what cannot be measured, and what would measure it

| Gap | What would measure it |
|---|---|
| Nine observable effects, seen by a person | Nine written manual procedures: role (guest / member / organizer / staff), steps, the fault to induce, what must appear. Each carries `Result: pending` until a human runs it. |
| A failed Supabase count | Fault injection needs a running app against a database. **D-41.2-04 forbids a worktree running against `.env.local`**, and incident D12 forbids production. Deferred to the owner's own environment. |
| Whether the bar can see a failing token endpoint | **Nothing in this repository can measure it** — no staff surface exists (O2). |
| Whether the sentences are the right sentences | Only the owner. |

### The verification gate this phase must satisfy

`CLAUDE.md`: *"un VERIFICATION.md senza una sola citazione `file:riga` non soddisfa il gate. In un repo senza test, l'evidenza osservabile è l'unica prova che esista — e va scritta, non evocata."*

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node + `npm run build` | typecheck & compile gate | ✓ | per `package.json` | — |
| Offline gate scripts (`verify-dialogs`, `verify-touch-targets`, `verify-conversion`) | ratchets | ✓ | — | run individually |
| `npm run verify` | — | ✓ but **forbidden** | — | run sub-gates individually |
| Test runner | — | ✗ | — | `npm run build` + written manual procedures |
| Error tracking / monitoring | making failures reach a human automatically | ✗ | — | **This phase *is* the fallback.** `OBS-01` stays Future |
| A running app / device | fault injection, three-width checks | ✗ (D-41.2-04; incident D12) | — | written procedure, `Result: pending` |
| Supabase (read or write) | — | **forbidden** | — | — |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | Next redacts Server Action error messages in production | §3 | **LOW risk of being wrong** — asserted in-tree twice (`events/[slug]/actions.ts:67-70` citing `guards.ts:73-79`; `DI-41.2-20`'s finding). But it was **not re-verified against Next 16 documentation this session**. If a Next release changed it, several fixes get cheaper, not wronger. Worth one Context7 lookup at planning. |
| A2 | `OBS-02`…`OBS-05` are the right IDs and section placement | §Phase Requirements | Renaming after plans cite them is churn. Confirm at plan time. |
| A3 | `purchaseTicket` has exactly two callers | §3, §6 | Measured via grep of `purchaseTicket(` — `TierSelection.tsx:301` and `PendingIntentHandler.tsx:84`, plus the declaration. A third caller would widen wave 1. |
| A4 | `requestRefund` has exactly one caller | §3 | Same method. |
| A5 | `DI-41.2-08`'s three counts are the only failed-read-as-zero sites on that page | §1 | The file is ~1100 lines; three were re-read. A fourth would be a new finding, not a contradiction. |
| A6 | Scoping `DI-41.2-20` in is right | §7 | It is a recommendation, marked O4 as the owner's. |

---

## Open Questions (RESOLVED 2026-08-14, at discuss-phase)

> Q1 and Q3 are answered below. **Q2 was carried into `46-CONTEXT.md` `<deferred>`** rather
> than decided, exactly as this section recommended — the reasoning survives there.

1. **RESOLVED — `D-46-10c`.** No staff-facing surface is built in this phase: the guest-facing
   half ships alone, and the bar-side lookup is deferred. Grounds recorded in
   `46-CONTEXT.md`. Criterion 1 therefore **does** mean *guest-only* here, and it is said out
   loud rather than left to be discovered.
2. **DEFERRED — see `46-CONTEXT.md` `<deferred>`.** Making `purchaseTicket`'s third parameter
   required is moot for now: the caller that dropped the argument (`PendingIntentHandler.tsx`)
   is out of perimeter under D-46-11. The idea is recorded so that whoever repairs
   `DI-41.2-09` inherits the reasoning instead of rediscovering it.
3. **RESOLVED — one shared module**, `src/lib/failure/money-path.ts`, per plan `46-02`. Note
   the reason changed: the research argued for a shared module because `DI-41.2-01`'s claim
   path needed the same vocabulary, and `DI-41.2-01` is now out of perimeter. The module is
   still right, for a different reason — three surfaces in this phase need one construction —
   and it deliberately carries the **construction**, not a single god-union.

---

### The questions as originally written

1. **Is there a staff-facing surface where a failing token endpoint could show?** — Known: none polls it today. Unclear: whether the bartender's screen (`PartyDrinkMenu`, and the two declared-exempt overlays from D-41.2-06/07) is the right home. Recommendation: **O2, ask the owner**; if no, say so in the plan rather than letting criterion 1 quietly mean *guest-only*.
2. **Does making `purchaseTicket`'s third parameter required buy more than it costs?** — Known: it is optional and that is why nothing failed. Unclear: whether a required parameter is worth the signature change with two callers. Recommendation: **pass the argument now; record the required-parameter idea as a deferred item**, so the reasoning survives.
3. **Should the guest-custody trio's third state be a shared module or three local types?** — Recommendation: one small module beside `GuestTokenDisplay.tsx`, because `DI-41.2-01`'s claim path in a *different* file needs the same vocabulary.

---

## Sources

### Primary (HIGH — measured in this session)

- The tree itself: every `file:line` in §1, §3, §4, §6 re-read with `LC_ALL=C /usr/bin/grep -n` / `sed -n` on 2026-08-14.
- `src/app/api/media/finalize/route.ts:207-294, 414-419` — the refusal-union + total-`Record` construction.
- `src/lib/door/outcome.ts:44-48, 283-303` — `DOOR_HTTP`, `DoorNightRefusal`, `DOOR_NIGHT_ERROR`.
- `src/app/(public)/events/[slug]/actions.ts:59-90` — the redaction statement and its consequence.
- `src/app/(admin)/admin/events/actions.ts:1217, 1381-1419, 1470-1478` — `purchaseTicket`.
- `src/app/(public)/tickets/refund-actions.ts:85-147` — `requestRefund`'s three refusals.
- `src/app/api/webhooks/sumup/route.ts:16-60` — GET-verify, idempotent.
- `src/components/toast/ToastContext.tsx:95`, `src/app/layout.tsx:120` — toast availability.

### Primary (HIGH — project documents)

- `.planning/ROADMAP.md:1047-1069` — Phase 46, five criteria, the identifiers.
- `.planning/phases/41.2-.../deferred-items.md` — Group M (`:30-227`, `:257-292`, `:461-723`), Group C `DI-41.2-20` (`:844-869`).
- `.planning/phases/41.2-.../41.2-VERIFICATION.md:378-410` (the nine re-derived), `:438-460` (`DEF-41.2-C`), `:551-554`.
- `.planning/phases/41.2-.../41.2-CONTEXT.md:255-300` — the eight stop conditions.
- `.planning/phases/41.2-.../41.2-PATTERNS.md:326-332` — the refusal-in-the-primitive's-`status` rule.
- `.planning/REQUIREMENTS.md:22-44, 150-163, 245-259`.
- `CLAUDE.md`, `.claude/rules/meta-gates.md`, `.claude/rules/community-membership.md`.

### Not consulted

No web search, no Context7, no external documentation. **This phase's domain is this repository**, and every claim above is measurable in it. The one exception is **A1** (Next's production redaction of Server Action messages), which is asserted in-tree but not verified against Next 16's own docs this session — flagged in the Assumptions Log and worth one lookup at plan time.

---

## Metadata

**Confidence breakdown:**

- The nine, re-measured: **HIGH** — every coordinate re-read; three corrections to the record found and stated.
- The mechanism inventory: **HIGH** — each mechanism has a worked example from converted code in this tree.
- The refusal-category pattern: **HIGH** — three converted examples, quoted.
- `DI-41.2-09`'s full trace: **HIGH** — write, read, signature, server re-validation and charged amount all read end-to-end.
- The proposed requirements: **MEDIUM** — IDs are collision-checked and the house style is matched, but wording is a proposal the owner ratifies.
- The scope call on the three adjacent cases: **MEDIUM-HIGH** — the *technical* argument for `-10` and `-11` is measured and strong (the phase arms `-11`); `DI-41.2-20` is a recommendation flagged as the owner's.
- The wave shape: **MEDIUM** — sound against the dependencies, but wave 0's copy sitting is an availability question, not a technical one.

**Research date:** 2026-08-14
**Valid until:** ~7 days. Every coordinate is a line number in a tree under active work; the *predicates* are durable, the *numbers* are not. Anchor on predicate text.
