# Phase 41: Shared Primitives & Three-Tier Layout — Pattern Map

**Mapped:** 2026-08-11
**Tree measured:** working tree on `gsd/phase-32-capability-model-in-the-database`, 2026-08-11
**Files analysed:** 22 targets (12 primitives, 7 scripts + 1 manifest + 1 npm script, 4 in-place modifications)
**Analogs found:** 20 / 22 — **and 14 of those analogs are the incumbent implementation itself, not a cousin**

---

## 0. Why this map reads differently from a normal one

A pattern map usually answers *"what distant file does this new file resemble?"*.
Here that question is mostly wrong. `41-RESEARCH.md` measured — and every figure
below was **re-measured against the tree today** — that the primitives are
already written, many times, byte-identically. So for fourteen of the
twenty-two targets the closest analog is **the incumbent the primitive is
extracted from**, and the useful question becomes:

> **Which of the N copies is the best specimen, and why that one?**

That is what §2 answers, per primitive, with the excerpt to copy from.

**Two consequences a planner must carry:**

1. **"Same class string" ≠ "correct class string."** The incumbent is the shape;
   `41-UI-SPEC.md` §8 is the destination. Every assignment below states the
   delta explicitly, because a plan that copies the specimen faithfully and
   stops has shipped the accessibility defect (`--card-border` on a control
   boundary, §5.2) into a brand-new file.
2. **The best specimen is sometimes not the best first consumer.** The dialog's
   ancestor is `CreateVenueModal.tsx`; the dialog carrying the most rules is
   `RevealVenueDialog.tsx` — and that one is `venue-secrecy` primary and
   monotone-guarded, so it is the *last* one converted, not the first.

---

## 1. File Classification

**Role** and **data flow** are stated for each target. "Data flow" for a
presentational primitive means *what moves through it*, which is what decides
whether it can be CSS-only.

### 1a. Primitives — extracted, not invented

| Target file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `src/components/ui/Dialog.tsx` | component (overlay) | event-driven (open/close), **platform-owned** | the **7** byte-identical `<dialog>`+`showModal()` shells — best specimen `src/components/venues/CreateVenueModal.tsx` | **incumbent, exact** |
| `src/components/ui/PageShell.tsx` | layout wrapper | none — pure container | the **47** `min-h-dvh pb-24` + **44** `px-6 pt-12` pages — best specimen `src/app/(public)/gallery/page.tsx:60-80` | **incumbent, exact** |
| `src/components/layout/AppNav.tsx` (rename of `MobileNav.tsx`) | navigation | server-resolved capability array → client render | `src/components/layout/MobileNav.tsx` **itself** | **incumbent, identity** |
| `src/components/staff/StaffNav.tsx` (modified) | navigation | same | itself, + `FormatFilterRow.tsx:109-127` for the chip construction | **incumbent + prior art** |
| `src/components/ui/Card.tsx` | component | none | the **88** exact `rounded-2xl border border-card-border bg-card` sites in 51 files | **incumbent, exact** |
| `src/components/ui/Button.tsx` · `IconButton` · `Chip` · `Badge` | component | request-response (actions) | **divergent**: `StaffNav.tsx:71-82` is the incumbent pill (~32px); `FormatFilterRow.tsx:112-118` is the only 44px prior art | **incumbent divergent + one correct specimen** |
| `src/components/ui/Input.tsx` · `Textarea` · `Select` · `Checkbox` · `Switch` | component (form) | request-response | **divergent**: 9 variants; plurality `rounded-xl border border-card-border bg-background px-4 py-3` (38 sites); best specimen `CreateVenueModal.tsx:176-200` | **incumbent divergent** |
| `src/components/ui/PageTitle.tsx` | component (typography) | none | the **52** `<h1>` in 38 files; **47** carry `text-3xl font-bold tracking-tight` | **incumbent, exact** |
| `SectionHeading` (class contract, D-41-11) | convention | none | 4 measured strings; plurality `mb-3 text-sm font-semibold uppercase tracking-widest text-muted` (15) | **incumbent divergent** |
| `src/components/ui/Wordmark.tsx` | component (typography) | none | **none as text** — `src/app/page.tsx:40` is an `<img>` | **no analog** |
| `src/components/ui/DataTable.tsx` | component | **one server array → two branches** | the 6 dual-render tables — best specimen `src/components/analytics/MemberSpendTable.tsx:19-70` (79 lines, the cleanest) | **incumbent, exact** |
| `src/components/ui/Skeleton.tsx` (modified) | component | none | **itself** — correct API, zero importers, wrong class strings | **incumbent + recorded adoption failure** |
| `src/components/toast/ToastContainer.tsx` (modified) | component | pub-sub (context) | itself | **incumbent, identity** |

### 1b. Gates — new files, one strong analog

| Target file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `scripts/verify-conversion.mjs` (G1) | script (gate) | batch file-scan | `scripts/verify-tokens.mjs` | **role + flow, exact** |
| `scripts/verify-dialogs.mjs` (G2) | script (gate) | batch file-scan | `verify-tokens.mjs` + `verify-media-strip.mjs:51-62` (the prefix trap) | **role + flow, exact** |
| `scripts/verify-tables.mjs` (G3) | script (gate) | batch file-scan | `verify-semantic-separation.mjs:194-201` (`EXEMPT_PATHS`) | **role + flow, exact** |
| `scripts/verify-touch-targets.mjs` (G5) | script (gate) | batch file-scan | `verify-tokens.mjs` `consumerPattern()` boundary guards | **role + flow, exact** |
| `scripts/verify-breakpoints.mjs` (G6) | script (gate) | batch file-scan | `verify-sunset-gradient.mjs` (the smallest complete gate) | **role + flow, exact** |
| `scripts/verify-no-viewport-read.mjs` (G7) | script (gate) | batch file-scan | idem — an **absence** check, same shape as check D | **role + flow, exact** |
| **the conversion manifest** | config (declared list) | read by G1 **and** G4 | `verify-sunset-gradient.mjs:141-149` `ALLOW_LIST` for the *form*; `verify-capabilities.mjs:145` for the *cross-script import* | **partial — see §4** |
| `npm run verify` (aggregate) | config (npm script) | orchestration | **none** — nothing in this repo runs another script | **no analog** |

### 1c. Modified in place — the analog is the file's own precedent

| Target file | Role | Data flow | In-file precedent |
|---|---|---|---|
| `src/app/globals.css` | config (token layer) | none | the whole file: `:root` declaration → `@theme inline` one-to-one mapping (`:225-250`) |
| `scripts/verify-tokens.mjs` | script (gate) | — | `KNOWN_TOKEN_NAMES` and the discipline written above it, `:286-305` |
| `src/app/layout.tsx` | config (root layout) | — | `viewport` block `:81-92` |
| `src/components/toast/ToastContainer.tsx` | component | — | its own `style={{ bottom: … }}`, **line 25** |

---

## 2. Pattern Assignments

### 2.1 `Dialog` — analog: the seven incumbents. **Best specimen: `src/components/venues/CreateVenueModal.tsx`**

**Why that one of the seven.** It is the **ancestor of the copy tree**, and the
repository says so itself. `RetireFormatDialog.tsx:22-25` names it as its
source; `RevealVenueDialog.tsx:18-19` names `RetireFormatDialog` as *its*
source. The lineage is `CreateVenueModal` → `RetireFormatDialog` →
`RevealVenueDialog`. Extracting from the ancestor means the extraction's
provenance is already written in two other files' docblocks — which is exactly
what D-41-09 wants recorded. It is also the smallest of the four form dialogs
(312 lines vs 320 / 350 / 465).

**The seven, verified present today:**

| File | `<dialog>` line | Backdrop |
|---|---|---|
| `src/app/(admin)/admin/formats/CreateFormatModal.tsx` | 357 | `bg-black/80` |
| `src/app/(admin)/admin/formats/CreateSeriesModal.tsx` | 289 | `bg-black/80` |
| `src/app/(admin)/admin/formats/RetireFormatDialog.tsx` | 282 | `bg-black/80` |
| `src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx` | 364 | `bg-black/80` |
| **`src/components/venues/CreateVenueModal.tsx`** | **143** | `bg-black/80` |
| `src/components/artists/CreateArtistModal.tsx` | 153 | `bg-black/80` |
| `src/components/media/Lightbox.tsx` | 50 | **`bg-black/90`** — the G2 exception |

The class string is **byte-identical across six**; `Lightbox` differs in exactly
one character (`/90`). *(Research's line numbers were off by ±2 throughout —
the table above is today's.)*

**The open/close effect to copy** — `CreateVenueModal.tsx:37-50`:

```tsx
useEffect(() => {
  const dialog = dialogRef.current;
  if (!dialog) return;

  if (open) {
    if (!dialog.open) dialog.showModal();
  } else {
    if (dialog.open) dialog.close();
  }
}, [open]);

const handleDialogClose = useCallback(() => {
  onClose();
}, [onClose]);
```

**The shell to copy** — `CreateVenueModal.tsx:140-166`, in full:

```tsx
return (
  <dialog
    ref={dialogRef}
    className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none bg-black/80 backdrop:bg-transparent p-0"
    onClose={handleDialogClose}
    onClick={(e) => {
      if (e.target === e.currentTarget) resetAndClose();
    }}
  >
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-card-border bg-background p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Create Venue Profile</h2>
          <button
            type="button"
            onClick={resetAndClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            {/* 16px svg */}
          </button>
        </div>
```

**The sheet half to graft on** — `src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx:167-168`,
byte-identical in `SumUpCheckoutModal.tsx:50-51`, `GuestLoginBanner.tsx:71,76`,
`GuestTokenDisplay.tsx:222-223`:

```tsx
<div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
  <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6
                  pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))] sm:pb-6">
```

**The initial-focus rule to copy** — `RevealVenueDialog.tsx:243-249`. It is the
one behaviour in the family that §8.3 promotes from a habit to a rule, and its
comment is the argument:

```tsx
// `Cancel` takes the default focus. A confirmation whose Enter key
// performs the act is a confirmation that did not ask — and on this
// surface the act publishes an address.
//
// `showModal()` also traps focus while the dialog is open — the rest of
// the document is inert — so no key handler is needed to keep it inside.
cancelRef.current?.focus();
```

*(Note for the planner: two of the seven use `autoFocus` as an attribute
instead — `RetireFormatDialog.tsx:319`, `RevealVenueDialog.tsx:426`. There are
therefore two mechanisms in the tree for one intent. §8.3 names `autofocus`;
pick one and delete the other, do not carry both into the primitive.)*

**Delta from the specimen to §8.3, complete:**

| Specimen | Becomes | Reason |
|---|---|---|
| `bg-black/80` on the `<dialog>` | unchanged | §8.3 keeps the scrim; G1's raw-colour regex must not flag it |
| *(no `z-`)* | `z-[60]` added | §8.3 — meaningful *among* top-layer elements |
| `items-center` on the wrapper | `items-end … md:items-center` | the sheet form |
| `rounded-2xl border border-card-border bg-background` on the panel | `rounded-t-2xl md:rounded-2xl bg-surface`, **no border** | §8.3 + §5.2 |
| `max-h-[90vh]` | `max-h-[85dvh]`, unprefixed | §2.3 |
| `p-6` on the panel | three regions: header / body (`overflow-y-auto`) / actions | §8.3 |
| `h-8 w-8` close button (32px) | `IconButton`, `min-h-11 min-w-11` | §6.4 |
| `text-lg font-bold` title | heading role, `text-base font-semibold` | §7 — 700 does not exist |
| *(sheet's)* `pb-[calc(1.5rem+5rem+env(…))] sm:pb-6` | `pb-[calc(1.5rem+var(--nav-inset-block-end))]`, no `md:` half | §3.2 — value-identical |

**The eleven overlays that go away**, verified at these exact lines today:
`RefundRequestButton.tsx:51` · `RedeemConfirmationModal.tsx:167` ·
`SumUpCheckoutModal.tsx:50` · `SecretVenueDialog.tsx:70` ·
`GuestTokenDisplay.tsx:222` · `GuestLoginBanner.tsx:71` ·
`RefundActions.tsx:40` · `RefundDialog.tsx:60` · `EditVenueButton.tsx:155` ·
`EditArtistButton.tsx:87` · `MyMediaSection.tsx:182`.

`MyMediaSection.tsx:184` carries `role="dialog"` and is **the only one in the
tree** — confirmed, one hit. It is a hand-rolled overlay, not a `<dialog>`, so
a G2 signature keyed on `role="dialog"` would find one file and miss seven.

**First-consumer recommendation.** `CreateArtistModal.tsx` or
`CreateVenueModal.tsx` — the primitive's own ancestor, in the smallest unit.
**Not `RevealVenueDialog.tsx`:** it is `venue-secrecy` primary, it is the UI of a
monotone guard, and D-41-19's "prove it on the hardest correct file" is not the
same as "convert the most dangerous surface first."

---

### 2.2 `PageShell` — analog: the incumbents. **Best specimen: `src/app/(public)/gallery/page.tsx:60-80`**

**Why that one of the 47.** It is the only place in the tree where all four
incumbent patterns appear inside twenty lines: the page root, the header block,
the `<h1>`, and the nav mount with its four props. Converting it exercises the
whole shell in one file, and its unit is small (6 `.tsx`, 2 dirty).

```tsx
return (
  <div className="min-h-dvh pb-24">
    <AnimatedSection>
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
        <p className="mt-1 text-muted">Moments from our events</p>
      </header>
    </AnimatedSection>

    <AnimatedSection delay={0.1} className="px-6">
      <GalleryClient groups={groups} />
    </AnimatedSection>

    <MobileNav
      role={role as UserRole | null}
      status={status as UserStatus | null}
      capabilities={[...capabilities]}
      liveAssignmentCapabilities={
        liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
      }
    />
```

**Measured today, all four figures reproduce:**

| Incumbent | Occurrences | Files |
|---|---|---|
| `min-h-dvh pb-24` (page root) | **47** | — |
| `pb-24` anywhere | **54** | **49** |
| `px-6 pt-12` (header) | **44** | — |
| `<h1>` | **52** | **38** |
| `text-3xl font-bold tracking-tight` | **47** *(research said 34 — see §5)* | — |

**The `focus` variant's analog** — four screens, and three already use the
container `41-UI-SPEC.md` §4 names, so `max-w-sm` is adoption:

```
src/app/(auth)/login/page.tsx:111        flex min-h-dvh flex-col items-center justify-center px-6
src/app/(auth)/register/page.tsx:81      flex min-h-dvh flex-col items-center justify-center px-6
src/app/(auth)/set-password/page.tsx:41  flex min-h-dvh flex-col items-center justify-center px-6
src/app/(public)/payment/callback/page.tsx:73  flex min-h-dvh items-center justify-center p-4
                                        :74  w-full max-w-sm rounded-2xl border border-card-border bg-card p-6
```

*(`payment/callback` is the odd one — `p-4`, not `px-6`, and it writes the card
shell itself at two sites, `:74` and `:168`. It is one of the four single-file
units and therefore a cheap first conversion.)*

**Delta to §8.1:** `min-h-dvh pb-24` → `min-h-dvh ps-[var(--nav-inset-inline-start)]`
+ inner `mx-auto w-full max-w-5xl px-6 pt-12 pb-[calc(var(--nav-inset-block-end)+1rem)]`.
On a phone with no inset this computes to **96px — the value `pb-24` already
produces**, so the migration is value-preserving on the device it was written for.

---

### 2.3 `AppNav` / `StaffNav` — analog: themselves

**`MobileNav.tsx` in full is the analog** (122 lines). The load-bearing parts:

```tsx
// MobileNav.tsx:96-97 — the bar, and the z-rung every modal is written against
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-card-border bg-background/80 backdrop-blur-xl">
  <div className="mx-auto flex max-w-lg items-center justify-around px-4 pb-[env(safe-area-inset-bottom)] pt-2">

// :110-112 — the entry. No min-h; py-2 + text-xs + a 24px icon
className={`flex flex-col items-center gap-1 px-3 py-2 text-xs transition-all active:scale-95 active:opacity-80 ${
  isActive ? "text-accent" : "text-muted"
}`}
```

**Two things in this file are *contract*, not style, and must survive the rename
verbatim** — `MobileNav.tsx:32-49`:

```tsx
/**
 * Held by role. Empty for an anonymous visitor — `ANONYMOUS_CONTEXT`.
 *
 * **Required, deliberately.** All 13 mount sites pass it, so a fourteenth
 * that forgets is a build error naming the file rather than a surface that
 * compiles, renders, and draws a plausible but wrong navigation — which this
 * repository has no error tracking to notice.
 */
capabilities: readonly CapabilityKey[];
```

**`StaffNav.tsx:59-88` is the incumbent strip.** Its two defects are both named
by the UI-SPEC, and its docblock is the rule Pitfall 6 protects:

```tsx
<style>{`
  .admin-nav-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  .admin-nav-scroll::-webkit-scrollbar { display: none; }
`}</style>
<div className="admin-nav-scroll mb-6 overflow-x-auto">
  <div className="flex gap-2 px-6" style={{ width: "max-content" }}>
    ...
    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all active:scale-95 active:opacity-80 ${
      isActive
        ? "bg-accent text-white"          // ← §5.3: a fill carries --ground, never white
        : "bg-card border border-card-border text-muted hover:text-foreground"
    }`}
```

Four defects in five lines: **~32px** target (§6.4), `text-white` on an accent
fill (**2.91:1**, §5.3), `font-medium` = 500 (§7, does not exist), and
`border-card-border` on a control boundary (§5.2). **No `aria-current`.**

**The construction to copy instead** — `FormatFilterRow.tsx:109-118`, the tree's
only 44px prior art (`min-h-11` has exactly **2** occurrences tree-wide, both in
this file, at `:115` and `:162`):

```tsx
<nav aria-label="Filter events by format" className="mb-4 px-6">
  <div className="format-filter-scroll -mx-6 flex gap-4 overflow-x-auto px-6">
    <Link
      href={isPast ? "/events?tab=past" : "/events"}
      aria-current={allIsCurrent ? "true" : undefined}
      style={allIsCurrent ? { scrollMarginInline: "24px" } : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap
                  rounded-full border border-card-border px-4 text-xs font-semibold
                  tracking-wide normal-case transition-colors ${…}`}
    >
```

Its own comment at `:150-156` explains the fallback discipline — an inline
`color-mix` border with the neutral class kept underneath, *"so there is no
state in which a chip loses its border"*. That pattern survives the `--control`
migration unchanged; only the class name moves.

> **A constraint discovered while mapping, and it decides a conversion unit —
> see §6.1.** `src/app/(admin)/admin/scanner/DoorSurface.tsx:4` imports
> `MobileNav`. The rename cannot be done without editing a Phase 42 file.

---

### 2.4 `Card` — analog: 88 identical sites

The exact string `rounded-2xl border border-card-border bg-card` — **88
occurrences across 51 files**, reproduced today. There is no "best specimen"
worth naming because every site is the same string; what matters is the two
sites that show the two shapes:

```tsx
// with padding — src/app/(admin)/admin/(work)/members/growth/page.tsx:89
<div className="rounded-2xl border border-card-border bg-card p-6">

// as a focus card — src/app/(public)/payment/callback/page.tsx:74
<div className="w-full max-w-sm rounded-2xl border border-card-border bg-card p-6 text-center">
```

**Delta to §8.4:** `border-card-border` → `border-line`, `bg-card` →
`bg-surface`, `p-6` folded in. This is the *card-edge* half of D-41-13's 406-site
triage; the *control-boundary* half becomes `border-control`. The two
destinations exist so the triage can be checked; a single destination would be a
rule kept only by memory.

---

### 2.5 `Button` / `IconButton` / `Chip` / `Badge` — analog: divergent incumbent

**Measured today, and it reproduces the research's per-value counts exactly:**

| `py-` on a `rounded-full` | Occurrences |
|---|---|
| `py-0.5` | 36 |
| `py-3` | 33 |
| `py-2` | 33 |
| `py-1.5` | 31 |
| `py-2.5` | 24 |
| `py-1` | 15 |
| **sum** | **172** |
| `rounded-full` anywhere | **268** |

*(The headline "133 pill sites" in the research and in §8.5 counts something
narrower than these six values sum to. Both figures are in the documents; the
planner should quote **the per-value distribution**, which is stable and
reproducible, not the total.)*

**The `py-0.5` cohort (36) is the largest and is mostly `Badge`, not `Button`** —
which is why §8.5's sentence *"a badge that is a `<Link>` or a `<button>` is a
Chip, not a Badge"* is the single line that decides whether G5 goes red on
correct files. The known counter-example is `(public)/events/[slug]/page.tsx:1136`,
a `px-2.5 py-0.5` lineup pill that **is** a `<Link>` — 20px, and a Chip.

**Analog for the correct form:** `FormatFilterRow.tsx:115` (quoted in §2.3).
**Analog for the incumbent form:** `StaffNav.tsx:74`.

---

### 2.6 `Input` / `Textarea` / `Select` / `Checkbox` / `Switch` — analog: divergent incumbent

**Re-measured today. Nine variants, not six** (the research's "6 near-variants"
counted radius×ground×padding families; this is the byte-exact string count):

| Class string | Occurrences |
|---|---|
| **`rounded-xl border border-card-border bg-background px-4 py-3`** | **38** ← plurality |
| `rounded-lg border border-card-border bg-background px-3 py-2` | 25 |
| `rounded-xl border border-card-border bg-card px-4 py-3` | 13 |
| `rounded-xl border border-card-border bg-background px-4 py-2.5` | 10 |
| `rounded-lg border border-card-border bg-card px-3 py-2` | 8 |
| `rounded-lg border border-card-border bg-card px-4 py-2` | 3 |
| `rounded-xl border border-card-border bg-card px-3 py-2` | 2 |
| `rounded-xl border border-card-border bg-background px-3 py-2.5` | 2 |
| `rounded-lg border border-card-border bg-card px-3 py-1.5` | 1 |
| **total** | **102** |

`w-full rounded-(xl|lg) border border-card-border` — **83** sites.

**Best specimen — `CreateVenueModal.tsx:176-200`**, because it shows the whole
unit (label + control + the readOnly variant + the textarea) in one block:

```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-foreground">Name</label>
  <input
    type="text"
    value={name}
    readOnly
    className="w-full rounded-xl border border-card-border bg-card px-4 py-3 text-foreground text-sm opacity-70"
  />
</div>

<div className="space-y-2">
  <label htmlFor="venue-bio" className="block text-sm font-medium text-foreground">Bio</label>
  <textarea id="venue-bio" … />
</div>
```

**Delta to §8.6 — and this is the one delta that is an accessibility fix, not a
tidy:** `border-card-border` (**1.39:1**, fails WCAG 1.4.11's 3:1) →
`border-control` (**7.03** on `--sunk`, **6.78** on `--surface`). Plus
`bg-background`/`bg-card` → `bg-sunk`, `py-3` → `min-h-11`, `font-medium` on the
label → `text-xs font-semibold text-ink-2`, and a `focus-visible` ring that the
specimen does not have at all.

**Note the specimen's own error box** — `CreateVenueModal.tsx:169-171` uses
`border-red-500/30 bg-red-500/10 text-red-400`, a raw Tailwind palette colour.
Every form dialog in the family does. That is G1's subject, and it is why the
form dialogs are not the cheapest first conversions.

---

### 2.7 `SectionHeading` — analog: divergent incumbent

**Measured today. The research's "9 vs 9" is stale:**

| String | Occurrences |
|---|---|
| `mb-3 text-sm font-semibold uppercase tracking-widest text-muted` | **15** |
| `mb-4 text-sm font-medium uppercase tracking-wider text-muted` | 9 |
| `mb-4 text-sm font-semibold uppercase tracking-widest text-muted` | 2 |
| `mb-3 text-sm font-semibold uppercase tracking-wider text-muted` | 2 |

§7.3 collapses all four to `mb-4 font-mono text-xs font-semibold uppercase
tracking-widest text-muted` — so **no incumbent string survives**: the plurality
loses on `mb-3`, and every one of them loses on `text-sm` and on the missing
`font-mono`. D-41-11 keeps it a convention, not a required component, which
means the gate for it is a grep, not an import count.

---

### 2.8 `DataTable` — analog: the six dual-renders. **Best specimen: `MemberSpendTable.tsx`**

**Why that one of the six.** 79 lines, seven columns, both branches visible in a
single screen, no interleaved business logic. It is the pattern with nothing
else attached to it.

```tsx
// MemberSpendTable.tsx:19-22 and :53-58
<>
  {/* Desktop table */}
  <div className="hidden sm:block overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-card-border text-left text-xs uppercase tracking-wider text-muted">
      …
  {/* Mobile cards */}
  <div className="space-y-3 sm:hidden">
    {members.map((m, i) => (
      <div className="rounded-xl border border-card-border/50 bg-card/50 p-4">
```

**All seven tables, verified at today's lines:**

| File | `<table>` | Phone form | Breakpoint |
|---|---|---|---|
| `components/analytics/MemberSpendTable.tsx` | 22 | cards | `sm` |
| `components/analytics/DrinkSalesBreakdown.tsx` | 22 | cards | `sm` |
| `components/analytics/ReferralChainTable.tsx` | 22 | cards | `sm` |
| `components/events/SalesDashboard.tsx` | 176 | cards | `sm` |
| `components/admin/TransactionList.tsx` | 612 | cards | **`lg`** |
| `components/admin/MemberTable.tsx` | 1177 | cards | **`lg`** |
| `(admin)/admin/events/[id]/review/ReviewListClient.tsx` | **205** | **none** — `text-[11px]`, scrolls | **none** |

`ReviewListClient.tsx:205` is `<table className="min-w-full text-left text-[11px]">`
— confirmed, and D-41-16 exempts it. **Its exemption belongs in G3 as a named
constant before G3's first run**, in the shape `verify-semantic-separation.mjs`
already uses (§3.3).

**Delta to §8.8:** `sm:` / `lg:` → **`md:`** everywhere; the card branch's
`border-card-border/50 bg-card/50` → the Card contract; figures take the data
role. Row actions in the desktop branch are the **only** site in the product
permitted `pointer-fine-only:min-h-9`.

---

### 2.9 `Skeleton` — analog: itself, and this is the phase's most important analog

`src/components/ui/Skeleton.tsx`, 45 lines, three exports, **zero importers**
(re-verified: `grep -rn "ui/Skeleton" src --include="*.tsx"` returns **0**), while
`animate-pulse` appears **102 times in 20 files**.

```tsx
// src/components/ui/Skeleton.tsx:5-27 — correct API, obsolete class strings
export function SkeletonLine({ className = "" }: SkeletonLineProps) {
  return <div className={`animate-pulse rounded-lg bg-card-border/50 h-4 w-full ${className}`} />;
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div className={`animate-pulse rounded-2xl border border-card-border bg-card p-5 ${className}`}>
      <SkeletonLine className="h-5 w-3/4 mb-3" />
```

> **"Adoption, not creation" is true of the API and false of the class strings,
> and a plan that reads §8.9 literally will ship the wrong ones.** Three of the
> four strings above are retired by this phase: `rounded-lg` does not survive
> §9; `bg-card-border/50` is a legacy token and a *line* colour used as a
> *ground*; `p-5` (20px) is not a named step of §3.1. §8.9's contract is
> `animate-pulse rounded-xl bg-raised`. **The file is modified, then adopted.**

**The first proof, named by `41-CONTEXT.md`** — `TransactionList.tsx:83-93`, a
local re-implementation sitting eight lines below imports that could have
brought the real one:

```tsx
function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse h-12 bg-card/50 rounded-lg" />
      ))}
    </div>
  );
}
```

---

### 2.10 `ToastContainer` — analog: itself

```tsx
// src/components/toast/ToastContainer.tsx:23-26 — note the line numbers
<div
  className="fixed left-0 right-0 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none"
  style={{ bottom: "calc(5rem + env(safe-area-inset-bottom) + 1rem)" }}
>
```

**Correction to the brief and to `41-RESEARCH.md`:** the hard-coded offset is at
**line 25**, not 26; `z-[70]` is at line 24. The `5rem` is `AppNav`'s height,
written here independently of the 47 `pb-24`s and of the four sheets' identical
`5rem` — **three authors of one number**, which §3.2 reduces to one.

**Delta to §8.10:** `bottom: calc(var(--nav-inset-block-end) + 1rem)` and
`left: var(--nav-inset-inline-start)`. Value-identical on a phone. Layer
`z-[70]` unchanged — and `src/components/scanner/ScanFlash.tsx:135` shares that
rung, which is Phase 42's and must not be disturbed.

---

### 2.11 The gates — analog: `scripts/verify-tokens.mjs`

**Why that one of the ten.** Newest (`Aug 11 22:07`), largest (1 058 lines),
and the only one carrying every convention the others carry singly. Read it in
full before writing any of the six new gates.

**(a) The five-part header.** Every gate opens with, in order: *WHAT IT
ASSERTS, in one sentence* → *WHY A STRUCTURAL CHECK AND NOT A TEST* → **`──
WHAT A GREEN DOES NOT MEAN ──`** → the enumerated checks → *Exit codes*. The
third is the load-bearing one:

```js
/* verify-tokens.mjs:37-56 */
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - A grep reads DECLARATIONS, NOT INTENT. It cannot see a colour written as
 *     a raw hex in a component, a token reached through a variable renamed on
 *     the way, or a utility assembled by string concatenation
 *     (`` `bg-${name}` ``). This script cannot follow a value; it reads text.
 *   - It does NOT say a colour is RIGHT. Contrast is arithmetic
 *     (`40-UI-SPEC.md` §4) and legibility at a dark door is an observation, not
 *     a regular expression.
```

**(b) `refuse()` → exit 2, and the refusals taken together, before any tick:**

```js
/* verify-tokens.mjs:406-410 */
/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log(`\nFATAL: ${message}\n`);
  process.exit(2);
}

/* :581-584 — the vacuous-green refusal G1 and G4 need verbatim */
const files = listScannableFiles(SRC_DIR);
if (files.length === 0) {
  refuse('the walk of `src/` found no scannable file. A vacuous green is not a green.');
}
```

`:586-590` states *why* the refusals sit at the top: *"a refusal means the
measurement DID NOT HAPPEN, and that reads better before any tick has been
printed than after four of them."*

**(c) `consumerPattern()` — longest-first alternation with both boundary
guards.** This is the exact machinery G5's class-string parser and G6's
breakpoint scan need, and §5.2 of the UI-SPEC already cites it by name:

```js
/* verify-tokens.mjs:535-554 */
/**
 * Leading guard: the prefix must not be preceded by `[a-zA-Z0-9-]`, so
 * `auto-rows-min` is not a consumer of a token named `rows-min` through the
 * prefix `to`.
 * Trailing guard: the name must not be followed by `[a-z0-9-]`, so
 * `bg-amber-500` is Tailwind's default scale and not the token `amber`.
 * Names sorted longest-first so `line-soft` is offered before `line`.
 */
export function consumerPattern(names) {
  const sorted = [...names].sort((a, b) => b.length - a.length);
  return new RegExp(
    `(?<![a-zA-Z0-9-])(?:${UTILITY_PREFIXES.join('|')})-(${sorted.join('|')})(?![a-z0-9-])`,
    'g'
  );
}
```

**(d) Print what was counted, not just the verdict** — `:707-717`:

```js
console.log('\nverify-tokens — a token a utility reads is a token that exists');
console.log(`  token file: ${TOKEN_FILE}`);
console.log(`  scanned ${files.length} file(s) under src/`);
console.log(
  `  known names: ${KNOWN_TOKEN_NAMES.length} · currently UNEXPOSED and therefore under check D: ` +
    `${unexposed.length}\n`
);
```

**(e) The vacuous-check confession** — the shape G7 (*zero viewport reads*) will
land in immediately, because its subject may legitimately be empty:

```js
/* verify-tokens.mjs:818-822 */
if (unexposed.length === 0) {
  console.log(
    '  ✓ D  vacuously: every known name is exposed as a utility, so there is no unexposed\n' +
      '       name for a consumer to read. Nothing was measured by this check.'
  );
```

**(f) The verdict block** — `:1041-1058`: `TOKENS_OK` + a restatement of the
limits + `process.exit(0)`; `TOKENS_FAIL — N check(s) failed: A, D` +
`process.exit(1)`.

**(g) `liveLines()` — comment blanking before any counting** (`:442-450`), with
its rationale at `:203-219`: the stripper is a **line-shape heuristic**, not a
tokeniser, because `32-REVIEW.md` WR-07 records that a real parser written here
was unsound. **Every new gate must use it**, and G2/G6 need it most: the dialog
files' docblocks quote their own class strings, so a gate that counts comments
counts its own documentation.

**(h) The false-red trap, from `verify-media-strip.mjs:51-62`** — the paragraph
D-41-19 exists to honour:

```js
 * `event-media-quarantine` STARTS WITH `event-media`. A naive
 * `line.includes('event-media')` therefore flags every correct file — the
 * rewritten upload component above all — and a check that fails on a correct
 * file gets switched off, after which it guards nothing.
```

**Per-gate assignment of the above:**

| Gate | Takes from `verify-tokens.mjs` | Plus |
|---|---|---|
| G1 conversion | header, `refuse()` on empty manifest, `listScannableFiles`, print-the-count | `EXEMPT_PATHS` form (§3.3) for `globals.css` + `ColorSwatchPicker.tsx` |
| G2 dialogs | `liveLines()` **(essential — the shells document themselves)**, count-equals-expected | `Lightbox.tsx` exemption as a named constant |
| G3 tables | `<table` literal count printed | `EXEMPT_PATHS` = `[REVIEW_GRID_FILE]` with the reason inline |
| G5 touch targets | `consumerPattern()`'s boundary guards, scoped to the manifest | the six-item exemption list of §13, as six named constants |
| G6 breakpoints | `consumerPattern()` shape over `sm:`/`xl:`/`2xl:` | no exemptions — which is what makes it worth writing |
| G7 no viewport read | check D's **absence** shape + the vacuous confession at `:818` | none |

---

### 2.12 `src/app/globals.css` — analog: the file's own two-edit discipline

**The declaration pattern to copy** — a name is declared in `:root` and mapped
one-to-one in `@theme inline`, `:225-250`:

```css
@theme inline {
  /* lines — decorative only; a control's boundary is --muted or lighter */
  --color-line-soft: var(--line-soft);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
```

So `--control` is three edits in one commit: `--control: #A493C0;` in `:root`,
`--color-control: var(--control);` in `@theme inline`, `'control'` in
`KNOWN_TOKEN_NAMES`.

**The precedent for a token that is deliberately NOT mapped** — `globals.css:146`
already carries one (*"The @theme inline block gives these no --color-\* mapping,
deliberately"*). The two layout variables `--nav-inset-block-end` /
`--nav-inset-inline-start` take that same shape: declared, unmapped, reached only
through arbitrary values.

**The legacy-alias block to leave alone** — `globals.css:180-208`, whose comment
assigns this phase its work and its limit:

```css
 * Each keeps its name and points at its new role, so those files render in
 * the NEW colours with NO COMPONENT EDITED. Exit route: PHASE 41 empties
 * them of consumers, one whole surface at a time; only then may a name be
 * removed, and only in the same commit as its entry in KNOWN_TOKEN_NAMES
```

**The `KNOWN_TOKEN_NAMES` edit** — `verify-tokens.mjs:286-305`, and the
discipline above the constant is the reason the edit is not optional:

```js
 *   - ADDING a name here is part of DECLARING a token. Until the name is in
 *     this list, check D cannot see a consumer of it, and a half-rename passes.
 *   - REMOVING a name here is part of PROVING it has no readers. Take it out
 *     while a file still reads it and the gate goes quiet about exactly the
 *     failure it was written for.
```

---

### 2.13 `src/app/layout.tsx` — analog: its own `viewport` block

```tsx
// src/app/layout.tsx:81-92 — D-41-08 removes two of these five lines
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,        // ← removed
  userScalable: false,    // ← removed
  // Il colore della cornice del browser, dipinto PRIMA che qualunque foglio di
  // stile sia caricato …
  themeColor: "#0A0712",
};
```

**Do not touch `themeColor`.** It is check F's subject in `verify-tokens.mjs`
(`GROUND_HEX = '#0A0712'`, `RETIRED_BLACK = '#0a0a0a'`), and the reversed-glyph
check reads a comment line in this same file. An edit here runs
`npm run verify:tokens` before it is committed.

---

## 3. Shared Patterns

### 3.1 The capability boundary — applies to `AppNav`, `StaffNav`, and every plan touching them

**Source:** `src/components/staff/StaffNav.tsx:11-32`

```tsx
 * ── Hiding a nav item is not protecting a route ──────────────────────────────
 *
 * It does **not** hold in the other [direction], and this component does not
 * claim it does. **Hiding a nav item is not protecting a route.** A tab that is
 * absent has not been refused by anything; the refusal is the middleware's, and
 * the boundary on the data is the RLS policy in the migrations.
 *
 * This is a `"use client"` component and it resolves nothing. It receives the
 * capability keys the server already resolved and filters on them. It must never
 * import the resolver … a capability check that moved from the server to the
 * browser would be a check the viewer can edit.
```

**Apply to:** every layout and navigation plan. Width changes **layout**, never
**membership** (Pitfall 6). The server side of this is
`src/app/(admin)/admin/(work)/layout.tsx`, which resolves `getAccessContext()`
once and passes serialisable arrays to both navs — **and it is the layout that
should own the container width and the nav clearance**, since it is the only
layout below the root and it wraps 24 of 41 pages.

### 3.2 The docblock that records a copy — applies to every extracted primitive

**Source:** `src/app/(admin)/admin/formats/RetireFormatDialog.tsx:18-27`

```tsx
 * ── It has no analog, so its shape is designed rather than copied ────────────
 *
 * Measured before writing: there is **no confirmation dialog for a destructive
 * action anywhere in `src/`** (`36-PATTERNS.md`, *No Analog Found*, first row).
 * The `<dialog>` shell, the backdrop click and the open/close effect are copied
 * from `CreateVenueModal.tsx:37-50` and `:140-152`, which is the shape this
 * repository already uses. The two-button confirm, the default focus and the
 * refusal box are new here, and are stated as new.
```

**Apply to:** every new primitive. This repository's house style is that a file
states **where its shape came from, with line numbers, and which parts are new**.
Two of the seven dialogs already do it, and it is the reason this map could
reconstruct the copy lineage at all. The new primitives must record the reverse
direction: *which N sites this replaces*.

### 3.3 The exemption as a named, exported constant — applies to all six gates

**Source:** `scripts/verify-semantic-separation.mjs:194-201`

```js
/** Exemption 1 — format identification colours are data on a row. See the header. */
export const CATALOGUE_FILE = 'src/app/(admin)/admin/formats/ColorSwatchPicker.tsx';

/** Exemption 2 — the browser paints themeColor before any stylesheet loads. */
export const THEME_COLOR_FILE = 'src/app/layout.tsx';

/** The two exemptions, as a set, so the report can count what it applied. */
export const EXEMPT_PATHS = [CATALOGUE_FILE, THEME_COLOR_FILE];
```

and the report prints them (`:499-500`), so a green states what it forgave.
`verify-sunset-gradient.mjs:141-149` shows the same form when the list is
**empty**, with the discipline for growing it:

```js
 * **Explicit, and empty today** … Adding the first one is a DECISION that edits
 * this constant — not a diff nobody reads. An entry here is an exact path, and
 * it should arrive with a comment saying which surface it is and why.
```

**Apply to:** G1's `globals.css` + `ColorSwatchPicker.tsx`; G2's `Lightbox.tsx`;
G3's `ReviewListClient.tsx`; G5's six-item list including Phase 42's three paths.

### 3.4 The two-tree table mechanism — applies to `DataTable` and to Phases 44/45

**Source:** `src/components/analytics/MemberSpendTable.tsx:21` and `:55` — quoted
in §2.8. Two trees, one hidden by `display: none`, **neither ever transformed**.
Explicitly not a `display: block/grid` override, because WebKit is this
product's primary engine.

---

## 4. No Analog Found

| Target | Role | Data flow | Why nothing matches |
|---|---|---|---|
| **`npm run verify` (aggregate)** | config | orchestration | **Nothing in this repository runs another script.** Ten `verify:*` entries in `package.json`, each a bare `node scripts/…` or `bash scripts/…`, and no `&&` chain, no runner, no `.github/workflows/` (absent). The form to match is the ten existing entries; the composition has no precedent to copy. |
| **`Wordmark` as text** | component | none | `src/app/page.tsx:40` renders it as `<img alt="re:sonate">`. Artwork, not type. §7.2's composed `re:` + `sonate` in the data face has **no** implementation anywhere in the tree. The three surfaces rendering the brand as prose all render it *wrongly* (`tickets/[id]/page.tsx:127`, `MembershipCardView.tsx:28`, `register/page.tsx:85`), so they are counter-examples, not analogs. |
| **`@custom-variant pointer-fine-only`** | config | none | **Zero pointer variants exist in `src` today** (re-verified). Tailwind 4.2.1 carries them; nothing here uses one. §6.2's requirement — *"must be proven to emit by `npm run build` before any consumer is written"* — exists because this is the first of its kind. |
| **The responsive layer itself** | — | — | `md:` **0** occurrences · `lg:` **5** · `sm:` **44** in 22 files · `matchMedia` / `innerWidth` / `useSyncExternalStore` **0** across all of `src`. There is nothing to copy and nothing to un-decide. |

### 4.1 The conversion manifest — partial analog, and the honest answer

**There is no analog for a list read by two scripts. There *is* an analog for
each half:**

- **The form** — an exported constant with a comment saying an entry is a
  decision: `verify-sunset-gradient.mjs:141-149` (`ALLOW_LIST`),
  `verify-routes.mjs:140-152` (`PUBLIC_ALLOW`, entries as `[value, reason]`
  pairs — *the best shape for a manifest*, because the reason travels with the
  entry), `verify-tokens.mjs:305-340` (`KNOWN_TOKEN_NAMES`).
- **The sharing** — cross-script ESM import is already house style:
  `scripts/verify-capabilities.mjs:145` does
  `import { createManagementApiTarget, loadEnvironment, say } from './rls-baseline.mjs';`
  and `rls-baseline-container.mjs:69` imports from the same module.
  `verify-tokens.mjs` already `export`s `KNOWN_TOKEN_NAMES`, `consumerPattern`,
  `listScannableFiles` and `liveLines` although nothing imports them yet.

> **`RECOMMENDATION`:** the manifest is an exported constant in one `.mjs`
> module under `scripts/`, in `PUBLIC_ALLOW`'s `[path, reason]` shape, imported
> by G1 and G4. That is two existing patterns composed, not a new one — and it
> keeps the manifest greppable, reviewable in a diff, and impossible to update
> without saying why.
>
> **`refuse()` on an empty manifest is mandatory** (`41-VALIDATION.md`, and
> `verify-tokens.mjs:582` is the sentence to copy: *"A vacuous green is not a
> green."*). It is also the reason the manifest cannot be a JSON file nobody
> reviews.

---

## 5. Corrections to the target list, measured today

Every row was re-run against the working tree. **Correct as stated:** the seven
byte-identical shells; the four sheets; the eleven `z-[60]` overlays;
`Lightbox`'s `/90`; `MyMediaSection`'s sole `role="dialog"`; `min-h-dvh pb-24` =
**47**; `px-6 pt-12` = **44**; the card shell = **88** in **51** files;
`Skeleton` importers = **0**; `animate-pulse` = **102** in **20**; the six `py-`
values with their exact counts; `min-h-11` = **2**, both in `FormatFilterRow`;
`md:` = 0, `sm:` = 44 in 22, viewport reads = 0.

| # | The brief / research says | Measured today | Consequence |
|---|---|---|---|
| 1 | *"six of the seven existing scripts are `.mjs` and one is `.sh` — `.mjs` is house style, six to one"* | **Ten** `verify:*` npm scripts. **Nine `.mjs`, one `.sh`** (`verify-organizer-redirects.sh`). Fourteen `scripts/*.mjs` in total including the three `baseline:*` and `probe-forged-identity.sh` | House style is `.mjs`, **nine to one**. `npm run verify` composes **ten** existing entries, and this phase takes the count to **sixteen** |
| 2 | `ToastContainer.tsx:26` hard-codes the offset | **Line 25.** `z-[70]` is line 24 | Any acceptance criterion pinned to `:26` is already wrong. Assert the **string**, not the line — `verify-tokens.mjs:140-145` states this rule explicitly |
| 3 | `text-3xl font-bold tracking-tight` — 34 sites | **47** | Re-measure before quoting. The 700 → 600 bill is bigger than the research's figure |
| 4 | form input shell — 75 sites, 6 near-variants | **102** byte-exact occurrences across **9** variants; plurality `rounded-xl border border-card-border bg-background px-4 py-3` at **38**; `w-full rounded-(xl\|lg) border border-card-border` = **83** | The 75 is an *element* count and the 102 a *class-string* count. Both are true of different subjects; a plan must say which it means |
| 5 | section headings — "9 vs 9" | `mb-3 …semibold …widest` = **15**; `mb-4 …medium …wider` = **9**; plus 2 + 2 | The plurality is `mb-3`, and §3.1 rejects it. Say so in the plan, or somebody will "fix" the heading back to the plurality |
| 6 | "133 pill sites across six `py-` values" | The six values sum to **172**; `rounded-full` = **268** | Quote the distribution, not the total |
| 7 | `font-display` has 0 occurrences | **1** — but it is the declaration at `globals.css:285`. **Zero utility consumers in `.tsx`** | The claim holds; the grep needs `--include="*.tsx"` or it reports its own declaration |
| 8 | Dialog line numbers (`CreateVenueModal.tsx:141`, `Lightbox:48`, …) | All shifted +2 | Use §2.1's table |
| 9 | *"`Skeleton.tsx` already exists and is correct"* | The **API** is correct. The **class strings** are not: `rounded-lg` (retired by §9), `bg-card-border/50` (a legacy line-token used as a ground), `p-5` (not a named step) | "Adoption, not creation" must not be read as "no edit". See §2.9 |

---

## 6. Constraints this map found, which change what a plan may scope

### 6.1 The `AppNav` rename reaches into Phase 42 — and there is no clean way around it

`src/app/(admin)/admin/scanner/DoorSurface.tsx:4`:

```tsx
import MobileNav from "@/components/layout/MobileNav";
```

`src/app/(admin)/door/page.tsx` is a 25-line shell that renders `DoorSurface`
(`:1`, `:24`). Both files match Phase 42's declared paths
(`src/app/(admin)/**/scanner/**`, `src/app/(admin)/door/**`), which
`41-CONTEXT.md` says *"are not opened by this phase for anything beyond a read."*

**So the §8.2 rename `MobileNav.tsx` → `AppNav.tsx` cannot be completed without
editing a Phase 42 file.** Two ways out, and the plan must pick one out loud:

- **(a)** Leave `src/components/layout/MobileNav.tsx` as a one-line re-export of
  `AppNav` until Phase 42. Zero Phase 42 files touched; one file in the tree
  asserts a tier it no longer has — the exact defect §8.2 names.
- **(b)** Edit one import line in `DoorSurface.tsx` and record it as a declared,
  reasoned exception in the plan. One line, no behaviour, no class string.

**(b) is the smaller lie**, but it is a decision, not a detail: `DoorSurface.tsx`
is the door, its docblock (`:74-86`) explains the nav's prop shape at length, and
`checkin-offline.md` governs it. Whichever is chosen, note that the door page
**mounts the nav**, so D-41-02's side column is visible on a Phase 42 surface
either way — a layout consequence Phase 42 inherits without having chosen it.

### 6.2 `verify-tokens.mjs` check A and the media-query `:root` — resolved, with evidence

§3.2 of the UI-SPEC flags this as *"a note the plan must act on, not discover."*
It is resolved here:

`findBlock()` (`verify-tokens.mjs:460-479`) returns **the first** block matching
`/^\s*:root\s*\{/` and stops. So a second `:root` inside
`@media (min-width: 48rem)` is invisible to checks A, B and C.

- **Check A** (`:719-726`) scans **every** `var(--x)` in the whole token file and
  requires the name to be in the first `:root` **or** in `@theme`. So the two
  layout variables **must be declared at top level** — which §3.2 already
  specifies. If a plan declares them only inside the media query and then
  references one anywhere in `globals.css`, **check A goes red on a correct
  file** — WR-02's exact failure mode.
- **Check C** (duplicates) does **not** see the second block, so the
  redeclaration produces no false duplicate.

**Verdict: the §3.2 shape is safe as written, and no change to `verify-tokens.mjs`
is needed beyond adding `'control'`.** Run `npm run verify:tokens` in the same
commit anyway — the file is check F's subject too.

### 6.3 The largest components dominate the effort regardless of primitive design

`EventForm.tsx` **1 668** · `MemberTable.tsx` **1 395** · `TransactionList.tsx`
**835** · `MediaUpload.tsx` 715 · `ReviewListClient.tsx` **423** ·
`RevealVenueDialog.tsx` **465**. The whole spine — the six motion files, `Icons`,
`Skeleton`, `FormatMarker`, the three toast files, both navs — is **~800 lines
total**, less than half of `EventForm` alone. **Budget by line count, not by file
count.**

### 6.4 The spine, confirmed present and small

```
src/components/motion/   AnimatedSection 46 · CountUp 57 · MotionProvider 15 ·
                         PressableButton 34 · PressableCard 30 · StaggeredList 56
src/components/ui/       AutocompleteInput 140 · Icons 50 · Skeleton 45
src/components/toast/    Toast 100 · ToastContainer 48 · ToastContext 71
src/components/formats/  FormatMarker 123
src/components/layout/   MobileNav 122
src/components/staff/    StaffNav 88
```

`MobileNav` is referenced by **17** files — the component, 13 mount sites, and
`DoorSurface.tsx` + `admin/scanner/page.tsx` (§6.1). `src/components/ui/` holds
**three** files today and is the folder that grows.

---

## Metadata

**Analog search scope:** `src/**` (181 `.tsx`), `scripts/**` (14 `.mjs`, 2 `.sh`),
`package.json`, `src/app/globals.css`.
**Method:** BSD `grep -r --include="*.tsx"` for byte-exact class strings; targeted
`Read` per specimen; no figure quoted from `41-RESEARCH.md` without re-running it.
**Pattern extraction date:** 2026-08-11.
**Validity:** every count above is valid **only until the next commit that touches
`src/`**. Re-measure before quoting a figure in an acceptance criterion — and
prefer asserting a **string** over a **line number** (§5, row 2).

**Repository safety:** this document names roles, files and class strings only.
No venue, date, line-up, contact or production material appears in it.
