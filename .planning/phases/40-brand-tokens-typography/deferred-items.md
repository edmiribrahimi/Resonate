# Phase 40 — Deferred Items

Out-of-scope discoveries made while executing a plan in this phase. Each is
recorded rather than fixed: fixing it would take another domain's work and
another domain's risk.

> `.planning/` is tracked and this repository is PUBLIC. Nothing below names a
> venue, an unannounced date, a line-up or a person. Every hex quoted was
> already public in this tree before today.

---

## DI-40-01 — a SECOND palette lives in `src/emails/`, and no phase owns it

**Found during:** plan 40-02, task 1, while checking the plan's own acceptance
criterion `grep -rni "e5484d" src` → *no hit anywhere under `src/`*.
**Date:** 2026-08-11.
**Status:** open, unowned.

### What was measured

The retired accent survives in **three places under `src/`, none of them the
token layer**:

| `file:line` | Form |
|---|---|
| `src/emails/components/email-layout.tsx:17` | `accent: "#e5484d"`, inside `export const BRAND = { … }` |
| `src/emails/templates/registration-confirmation.html:46` | `fillcolor="#e5484d"` (VML button, Outlook) |
| `src/emails/templates/registration-confirmation.html:55` | `background-color: #e5484d` (inline style) |

`email-layout.tsx:14-21` is not one stray value. It is a **complete mirror of
the previous token generation**, hand-maintained:

```
background "#0a0a0a" · foreground "#ededed" · accent "#e5484d"
card "#141414" · cardBorder "#262626" · muted "#a1a1aa"
```

Six names, six values — the exact set `globals.css:3-11` declared before plan
40-02 retargeted it. So from this commit forward **the product and its
transactional email render two different generations of the brand**, and the
divergence is invisible to `npm run build` and to `npm run verify:tokens`
(check E and check D both read CSS tokens and Tailwind utilities; a TypeScript
string literal is neither).

### Why it was not fixed here

1. **Scope fence.** Plan 40-02 declares `files_modified: [src/app/globals.css]`
   and its own verification step 4 requires `git diff --name-only` to list
   **exactly** that file. Editing `src/emails/**` would have broken the
   verification the same plan asks for.
2. **Different domain, and it is not a typography decision.** `src/emails/**`
   is `comms-analytics`. `40-UI-SPEC.md` §6.4 already lists the email surfaces
   as **unowned — "comms-analytics domain, no phase in v1.5"**, and plan 40-03
   fences them out explicitly (`40-03-PLAN.md:363`).
3. **A CSS token cannot reach it, so this is not a conversion — it is a second
   source.** Mail clients do not resolve CSS custom properties; an email
   palette must be literal by construction. The fix is therefore not "use the
   token", it is a decision about **which literal**, taken by whoever owns what
   leaves the perimeter. `comms-analytics.md`: *una mail non si richiama*.
4. **One of the three files does not deploy from this repository.**
   `registration-confirmation.html` is a Supabase Auth template — it is pasted
   into the Supabase dashboard. Editing it here changes nothing in production
   until a human performs that step, which is the "looks done, isn't" shape
   `meta-gates.md` warns about.

### What this means for the phase's own criteria

Plan 40-02's criterion *"`#e5484d` appears nowhere in the repository"* is
**true of the token layer and false of the repository**. It is recorded here
rather than silently ticked, and rather than satisfied by an edit that would
have taken another domain's decision without asking for it.

### What closing it needs

- A decision by the owner on the email palette (adopt the four grounds/inks, or
  keep the current one deliberately) — it is a change every member sees.
- Then three edits: `email-layout.tsx:14-21`, and the two lines in
  `registration-confirmation.html`.
- Then the manual step for the Supabase template, or it does not ship.
- Worth considering with it: a check that asserts the email `BRAND` constant
  and the token layer agree. Two hand-maintained copies of a palette is how a
  palette acquires a colour nobody decided — `40-UI-SPEC.md` §3.2 already makes
  that argument about the catalogue's hexes.

---

## DI-40-02 — `--font-inter` is referenced one plan before it exists

**Found during:** plan 40-02, task 2.
**Date:** 2026-08-11.
**Status:** open **by design**, closed by plan 40-03 in the same release.

`@theme inline` declares the interface role as `var(--font-inter), system-ui,
…` and **plan 40-03 is what creates `--font-inter`** in `src/app/layout.tsx`.
Measured consequence in the emitted bundle after 40-02:

```
--default-font-family:var(--font-inter),system-ui,-apple-system,"Segoe UI",Roboto,sans-serif
```

`--font-inter` is undefined, so that custom property is invalid at
computed-value time and Tailwind's preflight `font-family: var(--default-font-family, …)`
falls to its own fallback tail on `html`. **Nothing visible regresses**,
because `body` still carries an explicit `font-family` (that line is 40-03's
and was deliberately not moved). Recorded so the state is a known interval and
not a discovery: **40-02 and 40-03 must ship in the same release.**

---

## DI-40-03 — two stray tool markers at the foot of `40-03-SUMMARY.md`

**Found during:** plan 40-05, while reading Wave 3's output as required context.
**Date:** 2026-08-11.
**Status:** open, cosmetic, and deliberately not fixed here.

`.planning/phases/40-brand-tokens-typography/40-03-SUMMARY.md` ends with two
closing tags that belong to a tool call and not to the document — they follow
the file's own final line. They render as literal text and change no meaning.

**Why it was not fixed here.** It is another plan's committed artifact, and this
plan declares `files_modified` as three files, none of them a summary written by
somebody else. Rewriting a completed plan's record to tidy two lines is the kind
of edit that makes a later reader doubt what else was changed. **Closing it is
one deletion of the last two lines**, by whoever next revises that document — or
by the verifier, who is already reading it.
