---
phase: 41-shared-primitives-three-tier-layout
reviewed: 2026-08-12T13:15:30Z
depth: standard
files_reviewed: 51
files_reviewed_list:
  - scripts/conversion-manifest.mjs
  - scripts/verify-all.mjs
  - scripts/verify-breakpoints.mjs
  - scripts/verify-conversion.mjs
  - scripts/verify-dialogs.mjs
  - scripts/verify-no-viewport-read.mjs
  - scripts/verify-tables.mjs
  - scripts/verify-tokens.mjs
  - scripts/verify-touch-targets.mjs
  - src/app/(admin)/admin/(work)/formats/page.tsx
  - src/app/(admin)/admin/(work)/layout.tsx
  - src/app/(admin)/admin/(work)/members/loading.tsx
  - src/app/(admin)/admin/(work)/members/page.tsx
  - src/app/(admin)/admin/(work)/members/register/page.tsx
  - src/app/(admin)/admin/formats/ColorSwatchPicker.tsx
  - src/app/(admin)/admin/formats/CreateFormatModal.tsx
  - src/app/(admin)/admin/formats/CreateSeriesModal.tsx
  - src/app/(admin)/admin/formats/FormatsCatalogue.tsx
  - src/app/(admin)/admin/formats/RetireFormatDialog.tsx
  - src/app/(admin)/admin/members/CreateAccountForm.tsx
  - src/app/(admin)/admin/members/MemberActionNotice.tsx
  - src/app/(auth)/login/page.tsx
  - src/app/(auth)/register/page.tsx
  - src/app/(auth)/set-password/SetPasswordForm.tsx
  - src/app/(auth)/set-password/page.tsx
  - src/app/(public)/gallery/GalleryClient.tsx
  - src/app/(public)/gallery/loading.tsx
  - src/app/(public)/gallery/page.tsx
  - src/app/(public)/payment/callback/page.tsx
  - src/app/globals.css
  - src/app/layout.tsx
  - src/components/admin/MemberTable.tsx
  - src/components/formats/FormatMarker.tsx
  - src/components/layout/AppNav.tsx
  - src/components/layout/MobileNav.tsx
  - src/components/media/Lightbox.tsx
  - src/components/media/MediaGrid.tsx
  - src/components/staff/StaffNav.tsx
  - src/components/toast/Toast.tsx
  - src/components/toast/ToastContainer.tsx
  - src/components/toast/ToastContext.tsx
  - src/components/ui/Button.tsx
  - src/components/ui/Card.tsx
  - src/components/ui/Checkbox.tsx
  - src/components/ui/Chip.tsx
  - src/components/ui/DataTable.tsx
  - src/components/ui/Dialog.tsx
  - src/components/ui/Input.tsx
  - src/components/ui/PageShell.tsx
  - src/components/ui/Skeleton.tsx
  - src/components/ui/Typography.tsx
findings:
  critical: 1
  warning: 13
  info: 4
  total: 18
status: issues_found
---

# Phase 41: Code Review Report

**Reviewed:** 2026-08-12T13:15:30Z
**Depth:** standard
**Files Reviewed:** 51
**Status:** issues_found

## Summary

Phase 41 extracted eleven primitives, converted eight surfaces and shipped six new
`verify-*.mjs` gates plus an aggregate runner. All six gates were executed during this
review and **all six exit 0** — which is the context for the finding below rather than a
reassurance about it.

The one blocker is a layout regression delivered by the phase's own core primitive.
`PageShell width="focus"` reserves the side-column inset for a navigation column, and the
four surfaces on §4's closed focus list — `/login`, `/register`, `/set-password`,
`/payment/callback` — mount **no navigation at all**. There is no `(auth)` layout and no
nav import in any of the four (verified: `find src/app -name layout.tsx` returns exactly
two, and `grep -rln "AppNav\|MobileNav" src/app/(auth) src/app/(public)/payment` returns
nothing). The result is 224px of leading padding and 96px of bottom clearance on pages
that have nothing occupying either. Before the conversion `/login` was
`flex min-h-dvh flex-col items-center justify-center px-6` — centred. This is a behaviour
change on the front door and on the money surface, delivered by a phase whose own charter
says behaviour changes are out of scope, and **no gate in the phase can see it**: G4
(check D) asserts only that the shell declares three maxima and that a page writes none of
its own. Nothing asserts that the clearance matches the nav a surface actually mounts.

The rest are quality and gate-integrity defects. Three findings are about the gates
themselves and match the highest-value shapes the brief named: a reconciliation branch in
`verify-all.mjs` that cannot fail, a file-wide exemption in `verify-touch-targets.mjs`
whose premise check is satisfied by a single occurrence anywhere in the file, and an
overlay matcher in `verify-dialogs.mjs` keyed on one literal z rung.

Two things were checked against the **emitted stylesheet** rather than argued, because
this phase leans on Tailwind emission order in three separate places:
`.next/static/css/fde72cb772a72a35.css` puts `.ps-[…]` after `.px-6`, `.py-12` after
`.p-6`, `.rounded-xl` after `.rounded-full`, and `.pointer-fine-only\:min-h-9` after
`.min-h-11`. Three of those four confirm the code's claims. The fourth (`p-6`/`py-12`)
contradicts a comment in `DataTable.tsx` and produced WR-05.

The two findings the brief listed as already known and deliberately unfixed — the
collapsed login error and the payment callback's `catch` — are **not** repeated here.

## Critical Issues

### CR-01: `PageShell width="focus"` reserves a navigation column that these four surfaces never mount

**File:** `src/components/ui/PageShell.tsx:77-83`
**Also affects:** `src/app/(auth)/login/page.tsx:142`, `src/app/(auth)/register/page.tsx:108,130`, `src/app/(auth)/set-password/page.tsx:50`, `src/app/(public)/payment/callback/page.tsx:108,193`

**Issue:**

The focus branch writes both insets onto one element:

```
className="flex min-h-dvh items-center justify-center px-6
           ps-[calc(var(--nav-inset-inline-start)+1.5rem)]
           pb-[calc(var(--nav-inset-block-end)+1rem)]"
```

`globals.css:284-305` declares `--nav-inset-inline-start: 0px` at `:root` and `14rem`
(224px) inside `@media (min-width: 48rem)`, and `--nav-inset-block-end:
calc(5rem + env(safe-area-inset-bottom))` falling to `0px` at the same boundary. The only
override anywhere in the tree is `(work)/layout.tsx:143-147`, which zeroes the inline
variable for its own subtree.

**None of the four focus surfaces is under that layout, and none of them mounts a
navigation.** `src/app/(auth)/` contains three directories and no `layout.tsx`;
`src/app/(public)/payment/` has none either; the root layout mounts only `MotionProvider`
and `ToastProvider`. So the variables resolve to the *global* values on surfaces that have
nothing to clear:

- **≥768px:** `padding-inline-start` = 248px, `padding-inline-end` = 24px. The `max-w-sm`
  card inside `justify-center` therefore sits **112px to the right of the viewport
  centre** — the exact number `PageShell`'s own docblock (`:42-46`) cites as the failure
  mode of putting the inset in the wrong place.
- **<768px:** `padding-bottom` = 80px + safe-area + 16px ≈ **96px** on a page with no
  bottom bar. With `min-h-dvh items-center` the card sits ~48px above true centre.

This is a regression, not an inherited state. At `a3f61ad`, `/login` was
`flex min-h-dvh flex-col items-center justify-center px-6` and `/payment/callback` was
`flex min-h-dvh items-center justify-center p-4` — both correctly centred.

It reaches the two most exposed unauthenticated surfaces in the product: the front door,
and the screen that reports the outcome of a payment. `verify-conversion.mjs` check D is
green on all four because it only asks whether the shell declares §4's three maxima and
whether the page wrote a maximum of its own.

**Fix:** the clearance belongs to the surfaces that mount the navigation, and `focus`
surfaces do not. Either make the inset explicit at the shell:

```tsx
interface PageShellProps {
  width?: PageShellWidth;
  /**
   * Whether this surface mounts the product navigation. `focus` surfaces
   * (/login, /register, /set-password, /payment/callback) mount none, so they
   * reserve neither the side column nor the bottom bar.
   */
  nav?: boolean;
  children: ReactNode;
  className?: string;
}

export function PageShell({ width = "default", nav = true, children, className = "" }: PageShellProps) {
  if (width === "focus") {
    // A focus screen is a single card on an empty page. No column, no bar.
    return (
      <div className={`flex min-h-dvh items-center justify-center p-6 ${nav ? "ps-[calc(var(--nav-inset-inline-start)+1.5rem)] pb-[calc(var(--nav-inset-block-end)+1rem)]" : ""}`.trimEnd()}>
        <div className={`w-full max-w-sm ${className}`.trimEnd()}>{children}</div>
      </div>
    );
  }
  …
}
```

or — simpler, and closer to §4's intent — drop both insets from the `focus` branch
outright, since §4's focus list is closed at four routes and all four are navigation-free.
Whichever is chosen, add the assertion to G4 so the next `focus` route cannot reintroduce
it: a converted page whose closure contains no `AppNav`/`MobileNav` import must not read
`--nav-inset-*`. Re-verify by observing `/login` and `/payment/callback` at 390 / 768 /
1440 (H41-1 already asks for exactly this and would have caught it).

## Warnings

### WR-01: `CreateSeriesModal` reports a transport failure as a permissions problem — and diverges from its three siblings

**File:** `src/app/(admin)/admin/formats/CreateSeriesModal.tsx:271-283`

**Issue:** The `catch` decides between "never reached the server" and "the server refused"
using `navigator.onLine` alone:

```ts
} catch {
  const unreachable =
    typeof navigator !== "undefined" && navigator.onLine === false;
```

The three files converted alongside it in the same plan all test the *shape* of the thrown
value first — `CreateFormatModal.tsx:344-346`, `RetireFormatDialog.tsx:229-231`,
`FormatsCatalogue.tsx:228-230` all read:

```ts
const unreachable =
  err instanceof TypeError ||
  (typeof navigator !== "undefined" && navigator.onLine === false);
```

`navigator.onLine === true` only means a link-layer connection exists. A dropped tunnel, a
DNS failure, a 502 from the edge or a Server Action fetch that rejects with
`TypeError: Failed to fetch` all leave `onLine` true. The operator is then told:

> "The server refused the request. This account may no longer hold permission to manage
> the catalogue; reload the page and check. Nothing was stored."

— a permission diagnosis for a network fault, on a surface whose own docblock (`:67-77`)
claims "each branch names a different cause". This project has no error tracking
(`meta-gates.md`, verified 2026-08-05), so the rendered sentence is the only place the
failure exists for a human, and here it points at the wrong thing.

**Fix:** name the caught value and restore the shape test, byte-identical to the three
siblings:

```ts
} catch (err) {
  const unreachable =
    err instanceof TypeError ||
    (typeof navigator !== "undefined" && navigator.onLine === false);
```

### WR-02: `Dialog` invokes `onClose` twice on every programmatic close

**File:** `src/components/ui/Dialog.tsx:246-266`

**Issue:** The effect closes the element when `open` goes false:

```ts
} else {
  if (dialog.open) dialog.close();
}
```

`HTMLDialogElement.close()` fires the native `close` event, which React routes to
`onClose={handleDialogClose}` (`:273`) → `onClose()`. So the ordinary path runs the
caller's handler twice:

1. user presses Cancel → `close()` → `onClose()` → parent sets `open=false`
2. re-render → effect sees `open=false`, `dialog.open` still true → `dialog.close()`
3. native `close` event → `handleDialogClose` → `onClose()` **again**

The prop's own contract (`:198-203`) says *"Called when the dialog closes by any route …
A caller that resets state on close puts it here and nowhere else"* — which invites a
handler with side effects. Today's three consumers are all idempotent (`setAddingFormat(false)`,
`setEditingFormat(null)`, `setSeriesTarget(null)`), so nothing is broken **yet**. The
fourteen dialogs still on `verify-dialogs.mjs`'s `REMAINING` are not all idempotent, and
the list includes `RevealVenueDialog.tsx` — the UI of a monotone, irreversible guard — and
two refund paths. A double `onClose` that fires a `router.refresh()`, a re-fetch or an
analytics event twice on those surfaces is not cosmetic.

**Fix:** guard the effect-driven close so the handler runs once:

```ts
const closingRef = useRef(false);

useEffect(() => {
  const dialog = dialogRef.current;
  if (!dialog) return;

  if (open) {
    if (!dialog.open) dialog.showModal();
    const declared = dialog.querySelector<HTMLElement>("[data-initial-focus]");
    const fallback = dialog.querySelector<HTMLElement>(`[${CLOSE_MARKER}]`);
    (declared ?? fallback)?.focus();
  } else if (dialog.open) {
    // The caller already knows: it is what set `open` to false. Suppress the
    // close event this call is about to raise, so `onClose` runs exactly once
    // per close whichever route took it.
    closingRef.current = true;
    dialog.close();
  }
}, [open]);

const handleDialogClose = useCallback(() => {
  if (closingRef.current) {
    closingRef.current = false;
    return;
  }
  onClose();
}, [onClose]);
```

### WR-03: `verify-all.mjs`'s reconciliation check cannot fail, and would not change the exit code if it could

**File:** `scripts/verify-all.mjs:352,367-372`

**Issue:** This is the file's stated *"whole point"* (`:86-91`) — that every registered
`verify:*` entry is accounted for. As written the comparison is an identity:

```js
const accounted = results.length + NEEDS_SERVER.length + absentOptional.length + absentRequired.length;
…
if (accounted !== declared.length + absentOptional.filter((p) => p.state === "unregistered").length) {
```

`plan` is built one entry per `OFFLINE` row and is partitioned exhaustively into
`runnable` / `absentOptional` / `absentRequired`, so the left side is always
`OFFLINE.length + NEEDS_SERVER.length`. The refusals at `:208` and `:221` have already
guaranteed `declared ⊆ knownNames` and that every non-optional known name is declared, so
`declared.length === OFFLINE.length + NEEDS_SERVER.length − unregisteredCount`, making the
right side the same number. The branch is unreachable on every input the earlier refusals
permit.

And even if it were reachable it only `console.log`s: the verdict block at `:411-448`
never reads it, so a run whose count did not reconcile would still print `VERIFY_OK` and
exit 0. Both halves are the failure this file exists to prevent.

**Fix:** reconcile against the thing that can actually drift — the number of gates whose
verdict was obtained — and make a mismatch a refusal:

```js
const measuredOrExplained = new Set([
  ...results.map((r) => r.name),
  ...NEEDS_SERVER.map(([n]) => n),
  ...absentOptional.map((p) => p.name),
  ...absentRequired.map((p) => p.name),
]);
const unaccounted = declared.filter((name) => !measuredOrExplained.has(name));
if (unaccounted.length > 0) {
  refuse(
    `${unaccounted.length} registered verify:* entr(y/ies) got no verdict from this run:\n` +
      `       ${unaccounted.join(", ")}\n` +
      "       This run cannot claim to account for every registered gate. Nothing about\n" +
      "       them was measured."
  );
}
```

### WR-04: `verify-touch-targets` exemption 2a is file-wide, and its premise check passes on a single occurrence anywhere in the file

**File:** `scripts/verify-touch-targets.mjs:1028-1052,1092-1097`

**Issue:** Two mechanisms compound.

`isPrimitiveFile` is true for any file listed in `PRIMITIVE_COMPONENTS`, and **every** raw
`<button>`, `<a>`, `<Link>` and `<input>` in such a file is exempted unconditionally:

```js
if (isPrimitiveFile) {
  row.e2a += 1;
  applied.e2a += 1;
  continue;
}
```

The premise that justifies it — "the size lives in the primitive" — is asserted with
`liveLines(path).some(line => …)`: **one** unprefixed `min-h-*`/`h-*` ≥ 44px anywhere in
the file satisfies it for the whole file.

Two of the six exempted files are not single-control primitives. `AppNav.tsx` renders a
`<Link>` per navigation entry across two tiers (`:211-228`) and `StaffNav.tsx` renders a
`<Link>` per work tab in the column form (`:121-137`); both would satisfy the premise from
`ENTRY_PHONE`/`COLUMN_ENTRY` alone even if a later edit shrank the other. So the phase's
touch-target gate is structurally blind to every navigation target in the product — and
navigation entries are exactly the class of element §6.1's floor exists for.

The gate already measures only 9 elements in total across the eight converted surfaces, so
this is a large fraction of what it *could* be measuring.

**Fix:** narrow 2a from "any raw element in a primitive file" to "a raw element whose class
attribute is an interpolation the parser cannot resolve", and assert the premise per
element rather than per file:

```js
// A raw tag inside a primitive's own file is exempt ONLY where its class
// attribute interpolates — that is the case §13 describes ("the size lives in
// the size map"). A literal class string in a primitive file is readable and
// is read, so AppNav's and StaffNav's entries are measured like any other.
if (isPrimitiveFile && /class(Name)?=\{`/.test(el.text)) {
  row.e2a += 1;
  applied.e2a += 1;
  continue;
}
```

Expect this to raise the measured count and to require a run before merging; if it reddens,
fix the element.

### WR-05: `DataTable`'s card-branch empty state diverges from its table branch on a premise the emitted stylesheet contradicts

**File:** `src/components/ui/DataTable.tsx:476-487`, cf. `:201`

**Issue:** The table branch renders the empty state with
`EMPTY_BLOCK = "px-6 py-12 text-center text-sm text-muted"` (48px vertical). The card
branch renders `<Card className="text-center text-sm text-muted">` — 24px — with this
justification:

> A caller cannot override a primitive's padding by appending a second padding utility:
> both are the same property at the same specificity, so the winner is whichever Tailwind
> emits last

Measured in the emitted stylesheet (`.next/static/css/fde72cb772a72a35.css`): `.p-6` is at
byte 45555 and `.py-12` at 46428. Same layer, so document order decides and **`py-12`
wins**. Two files in this same phase rely on that and are correct to:
`src/app/(public)/gallery/GalleryClient.tsx:38` and
`src/app/(admin)/admin/(work)/members/register/page.tsx:394` both write
`<Card className="px-6 py-12 text-center">`.

So one primitive shows §8.11's empty contract above 768px and the card shell's own padding
below it, for a reason that is not true, on a component whose thesis is that the two
branches cannot disagree.

**Fix:**

```tsx
{rows.length === 0 ? (
  <Card className="px-6 py-12 text-center text-sm text-muted">{empty}</Card>
) : null}
```

and delete the paragraph at `:476-484`, or rewrite it to record the measured order —
`padding` is emitted before `padding-block`, so a caller's `py-*` does override a
primitive's `p-*`, and the collision `Skeleton.tsx:59-81` records is a different one
(`w-full` vs `w-3/4`, the *same* property).

### WR-06: two links on declared-converted surfaces gained the 44px floor but not the shared focus expression

**File:** `src/app/(public)/gallery/GalleryClient.tsx:54-57`, `src/app/(admin)/admin/(work)/members/register/page.tsx:323-328`

**Issue:** Both links were edited by this phase — the diff against `a3f61ad` shows
`mb-3 block hover:text-accent transition-colors` → `mb-3 flex min-h-11 flex-col justify-center …`
and `text-sm text-muted …` → `inline-flex min-h-11 items-center …`. Both gained `min-h-11`;
neither gained `FOCUS_RING`, and neither file imports it.

§5.4 fixes one focus expression for the product, and every other link this phase touched
took it: `login/page.tsx:220`, `register/page.tsx:209`, `members/page.tsx:204`,
`MemberTable.tsx:1115`, `MediaGrid.tsx:74`. `/gallery` and `/admin/members/register` are
both declared **converted whole** in `scripts/conversion-manifest.mjs`, so this is an
inconsistency inside the phase's own claim, not deferred work.

`verify-touch-targets` measures both elements and passes them, because it reads height and
nothing else — the gate cannot see this.

**Fix:**

```tsx
// GalleryClient.tsx
import { FOCUS_RING } from "@/components/ui/Button";
…
className={`mb-3 flex min-h-11 flex-col justify-center transition-colors hover:text-accent ${FOCUS_RING}`}

// members/register/page.tsx
import { FOCUS_RING } from "@/components/ui/Button";
…
className={`inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
```

### WR-07: the toast's position now depends on a variable that is only correct on surfaces mounting the responsive nav, and nothing enforces the premise

**File:** `src/components/toast/ToastContainer.tsx:62-65`

**Issue:** The container is mounted at the root (`ToastContext.tsx:90`, inside
`app/layout.tsx`) and positions itself from two globals:

```js
style={{
  bottom: "calc(var(--nav-inset-block-end) + 1rem)",
  left: "var(--nav-inset-inline-start)",
}}
```

At ≥768px those resolve to `0px` and `14rem` — correct only where the bar has left the
bottom edge for the side column. **Twelve surfaces still mount `MobileNav`**, which
`AppNav` renders locked to `form="phone"`: a bottom bar at every width and no side column
(`src/app/page.tsx`, `(public)/events/page.tsx`, `(public)/events/[slug]/page.tsx`,
`(public)/events/[slug]/menu/page.tsx`, `(public)/tickets/[id]/page.tsx`,
`(public)/artists/[slug]/page.tsx`, `(public)/newsletter/page.tsx`,
`(members)/dashboard/page.tsx`, `(members)/attendance/page.tsx`,
`(members)/membership-card/page.tsx`, `(admin)/admin/scanner/DoorSurface.tsx`). On any of
those at tablet width the toast would paint over the navigation bar and be indented 224px
for a column that is not there.

The docblock (`:44-53`) says this is safe because `useToast` has one consumer,
`GuestListClient`, a work surface. That is true today (`grep -rn "useToast" src` returns
exactly one non-provider consumer) — but it is a *runtime* invariant held by nothing.
`verify-dialogs.mjs` check C asserts only that a file rendering `Dialog` does not import
the toast; nothing asserts where the toast may be *raised from*. The second consumer added
on any of those twelve surfaces silently mis-places every notification, and the door is
among them.

**Fix:** hold the premise mechanically. Extend `verify-dialogs.mjs` check C, or add a
check beside it, that asserts every `useToast` importer's closure reaches
`components/layout/AppNav` and not `components/layout/MobileNav` — with the twelve
phone-locked surfaces named as the reason. Alternatively, drive the container from the
navigation form instead of from a global: pass the mounted form down, or declare a second
pair of variables scoped to the phone-locked mount.

### WR-08: `SectionHeading`'s class string is hand-duplicated with no mechanical link between the two copies

**File:** `src/app/(admin)/admin/(work)/formats/page.tsx:179-184`, cf. `src/components/ui/Typography.tsx:127`

**Issue:** The retired-formats heading writes
`"mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted"` — the
`SectionHeading` string, character for character — because the section needs an `id` for
`aria-labelledby`. D-41-11 permits it, but nothing keeps the two in step: §7.3's four axes
were the subject of a whole decision (`Typography.tsx:76-104`) and the file explicitly
warns that the failure mode is somebody "fixing" a converted surface back towards the
plurality. A second copy is where that starts, and no gate compares them.

**Fix:** the component already accepts `as`; give it the one attribute the call site
needed instead of forking the string:

```tsx
export function SectionHeading({
  as: Tag = "h2",
  id,
  children,
  className = "",
}: {
  as?: "h2" | "h3" | "h4";
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag id={id} className={`mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted ${className}`.trimEnd()}>
      {children}
    </Tag>
  );
}
```

then `<SectionHeading id="retired-formats-heading">Retired</SectionHeading>`.

### WR-09: `verify-dialogs`' overlay matcher is keyed on one literal z rung, so a copy at any other rung is invisible

**File:** `scripts/verify-dialogs.mjs:344,349-360`

**Issue:** Check B — *"no second shell, except on the list"* — recognises a hand-rolled
overlay only when all three parts appear on one line:

```js
const OVERLAY_PARTS = ['fixed', 'inset-' + '0', 'z-' + '[60]'];
```

The eleven incumbents happen to carry `z-[60]`, but the rung is not part of what makes
something a dialog. A nineteenth copy written with `z-50`, `z-[70]` or an arbitrary rung —
or one whose class string is split across two lines by a formatter — passes check B
silently, which is exactly the "gate that went quiet while the thing it tracked is still
there" shape the file's own header warns about. The header lists four things a green does
not mean and this is not among them.

Related and cheaper to see: `line.includes('fixed')` also matches the substring inside
words such as `prefixed`, which is the opposite error direction (a false red on a correct
file) and is the one §0 rule 3 says gets a gate switched off.

**Fix:** match the rung as a family and bound the tokens:

```js
const OVERLAY_PARTS = [/(?<![\w-])fixed(?![\w-])/, /(?<![\w-])inset-0(?![\w-])/, /(?<![\w-])z-(?:\d{2,}|\[\d+\])(?![\w-])/];

function shellShapes(relPath) {
  const found = [];
  liveLines(relPath).forEach((line, i) => {
    if (OVERLAY_PARTS.every((re) => re.test(line))) {
      found.push({ line: i + 1, shape: 'hand-rolled overlay', source: line.trim() });
    }
    …
```

Re-run and reconcile: the count must stay at 14, or the delta is a copy the old matcher
was missing and belongs on `REMAINING` with its reason.

### WR-10: `Skeleton`'s caller-override detection does not recognise a variant-prefixed dimension

**File:** `src/components/ui/Skeleton.tsx:82-83`

**Issue:**

```ts
const CALLER_SETS_WIDTH = /(?:^|\s)(?:max-|min-)?w-/;
const CALLER_SETS_HEIGHT = /(?:^|\s)(?:max-|min-)?h-/;
```

The leading `(?:^|\s)` means a caller writing `md:w-1/2` or `lg:h-24` does **not** suppress
the default, so `w-full` / `h-4` is appended and — per the measurement recorded four lines
above, `w-full` is emitted after every numeric and fractional width — the default wins at
the width the caller was targeting. That is the identical defect the constant was written
to close, one variant away, and the file's own docblock says the fix "does not depend on
stylesheet order at all, in either direction".

All five current call sites use unprefixed classes, so nothing is wrong today. The
component is two waves old with two consumers and a third arriving.

**Fix:**

```ts
const CALLER_SETS_WIDTH = /(?:^|\s)(?:[\w[\]().:-]+:)?(?:max-|min-)?w-/;
const CALLER_SETS_HEIGHT = /(?:^|\s)(?:[\w[\]().:-]+:)?(?:max-|min-)?h-/;
```

### WR-11: `AppNav`'s active-route test carries a redundant disjunct and an unguarded icon lookup

**File:** `src/components/layout/AppNav.tsx:203-208,225`

**Issue:** Two small things in one render path:

```ts
const isActive =
  item.href === "/"
    ? pathname === "/"
    : item.href === "/dashboard"
      ? pathname === "/dashboard" || pathname.startsWith("/dashboard")
      : pathname.startsWith(item.href);
```

`pathname === "/dashboard"` is fully subsumed by `pathname.startsWith("/dashboard")`, so
the whole `/dashboard` branch is identical to the default branch. Dead code in the one
expression that decides which navigation entry is marked `aria-current="page"` invites a
later reader to conclude the two cases differ and to "restore" a difference that never
existed.

And `{icons[item.icon]}` (`:225`) indexes a `Record<string, ReactNode>` with a value that
comes from `NAV_ITEMS`. A key with no entry renders nothing at all — the entry keeps its
label and loses its glyph, with no error anywhere, in a repository with no error tracking.

**Fix:**

```ts
const isActive =
  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
```

and make the missing icon loud rather than silent — either type `item.icon` as
`keyof typeof icons` so a new nav entry with an unknown glyph is a build error, or render
a visible fallback.

### WR-12: `verify-tables` prints a line count and calls it an element count

**File:** `scripts/verify-tables.mjs:541-556,582,619-621`

**Issue:** `tableHits()` pushes **one** hit per line containing `<table`, while
`primitiveTables` uses `countNeedle()`, which counts **every occurrence**. The report then
mixes them:

```
literal "<table" occurrences  : ${literalTableCount}
…
✓ A  all ${literalTableCount} table element(s) in ${measuredTables.size} file(s) are accounted for:
     ${primitiveTables} in the primitive, ${REMAINING.length} on REMAINING, 1 exempt
```

Two elements on one line are counted once by the first number and twice by the second. The
tick's arithmetic (`literalTableCount` vs `primitiveTables + REMAINING.length + 1`) is
therefore not a reconciliation even though it reads as one, on a gate whose header says
*"the literal count is printed, so the gate says what it counted rather than only whether
it was happy"*.

**Fix:** count occurrences in both places:

```js
function tableHits(relPath) {
  const hits = [];
  liveLines(relPath).forEach((line, i) => {
    let from = 0;
    for (;;) {
      const at = line.indexOf(TABLE_ELEMENT, from);
      if (at === -1) break;
      hits.push({ line: i + 1, source: line.trim() });
      from = at + TABLE_ELEMENT.length;
    }
  });
  return hits;
}
```

### WR-13: `verify-touch-targets` can pass an element on a height that belongs to a component inside its own attributes

**File:** `scripts/verify-touch-targets.mjs:700-739,812-856`

**Issue:** `scanElements` captures `source.slice(m.index, end + 1)` — the whole opening tag
— and `readHeights` runs `HEIGHT_RE` over that text. A JSX attribute value may itself
contain an element with its own classes, and `endOfOpeningTag` deliberately walks past
braces and quotes to find the tag's real close. So:

```tsx
<button className="px-4" icon={<Icon className="h-12 w-12" />}>
```

resolves to `heights = [h-12 = 48px]` → `verdict: 'pass'`, on a control that declares no
height of its own. There are no such sites in the eight converted closures today (9
measured elements, all clean), but the shape is ordinary React and the gate's scope grows
by one surface per plan.

**Fix:** read heights from the element's own `class`/`className` attribute rather than from
the whole tag text — extract the attribute value first, then run `HEIGHT_RE` over it —
and report `unresolvable` when the attribute is an interpolation the parser cannot flatten,
which is the direction that does not produce a green.

### WR-14: the membership register renders act timestamps in the server's local zone, not the declared event zone

**File:** `src/app/(admin)/admin/(work)/members/register/page.tsx:129-137,424`

**Issue:** *(Pre-existing — not introduced by phase 41. Recorded because it is in a
reviewed file and because the phase's own conversion note claims that "who performed an act
and when both still render".)*

```ts
function formatWhen(iso: string): string {
  const d = new Date(iso);
  …
  return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
```

`getDate`/`getMonth`/`getHours` read the **runtime's** zone. This page is a Server
Component with `export const dynamic = "force-dynamic"`, so it renders on the server — UTC
on Vercel. `src/utils/datetime.ts:13` declares `EVENT_TIME_ZONE = "Europe/Rome"`, and
`src/utils/formatTime.ts` already exports `formatDateTime`. An act performed at 00:30 Rome
time is written into the register as the **previous day** at 23:30. On an append-only
audit surface whose whole contract is *who* and *when*, an off-by-one day is a wrong
answer, not a formatting preference.

**Fix:** format against the declared zone, through the existing helper rather than a fourth
hand-rolled month array:

```ts
import { EVENT_TIME_ZONE } from "@/utils/datetime";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: EVENT_TIME_ZONE,
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}
```

## Info

### IN-01: `MemberActionNotice`'s `compact` prop documents behaviour the code does not have

**File:** `src/app/(admin)/admin/members/MemberActionNotice.tsx:467,477-487`

**Issue:** The prop is documented as *"Inside a table cell the body would break the row;
the title carries it"* — but the compact branch renders `{notice.body}` in full. The
notices are long paragraphs (see `live_assignments_block_demotion`, `:216-230`), so a
compact notice inside a `<td>` is neither compact nor what the comment describes.
Pre-existing; surfaced because `MemberTable.tsx` renders it in three places.

**Fix:** either drop the body in the compact branch, or delete the sentence from the prop
doc so the next reader is not choosing between two contradictory statements.

### IN-02: three hand-rolled date formatters across the phase's own files, beside a shared module that already exports them

**File:** `src/components/admin/MemberTable.tsx:221-229`, `src/app/(admin)/admin/(work)/members/register/page.tsx:129-137`, `src/app/(public)/gallery/GalleryClient.tsx:60`

**Issue:** A short-month array, a second short-month array and a full-month array inlined
in an IIFE, in three files this phase edited, while `src/utils/formatTime.ts` exports
`formatShortDate`, `formatDateTime` and `formatEventDate`. `MemberTable.tsx`'s own docblock
(`:213-220`) argues that duplicating a rendering across two branches is "the drift D-41-17
names" and consolidates it — into a fourth copy.

**Fix:** route all three through `src/utils/formatTime.ts`, extending it once if the
existing signatures do not fit.

### IN-03: `hasActiveFilters` is `string | boolean`, and hides the results count on the three filtered tabs

**File:** `src/components/admin/MemberTable.tsx:1089,1247`

**Issue:** `const hasActiveFilters = search || roleFilter !== "all" || (statusTab === "all" && statusFilter !== "all")`
evaluates to the raw `search` string when it is non-empty. It is only used in a ternary, so
nothing breaks — but the parenthesised clause also means that selecting the Pending,
Approved or Rejected tab with no search text suppresses "Showing N of M members" on a list
that *is* filtered.

**Fix:** `const hasActiveFilters = search !== "" || roleFilter !== "all" || statusFilter !== "all" || statusTab !== "all";`

### IN-04: `verify-all` never checks that a `NEEDS_SERVER` gate exists on disk

**File:** `scripts/verify-all.mjs:156-161,334-336`

**Issue:** `NEEDS_SERVER` entries are printed as "not run: needs a running dev server" on
every run without their script path ever being resolved or stat-ed. `package.json`'s entry
disappearing is caught (`missingRequired`, `:217-228`); the *file* disappearing while the
entry stays is not, so the runner would keep reporting a gate that no longer exists as
merely deferred.

**Fix:** resolve `NEEDS_SERVER` commands the same way as `OFFLINE` (the shape check would
need to admit `bash <path>` alongside `node <path>`) and report an absent file as MISSING
rather than as not-run.

---

_Reviewed: 2026-08-12T13:15:30Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
