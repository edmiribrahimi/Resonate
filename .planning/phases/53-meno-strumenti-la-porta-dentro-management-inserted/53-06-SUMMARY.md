---
phase: 53-meno-strumenti-la-porta-dentro-management-inserted
plan: 06
subsystem: prose, manifesto, media, access, venue-reveal
tags: [CUT-01, D-53-04, prose-only, comments]
requires:
  - phase: 53-01
    provides: superfici Calendar/Location/Visual e archivio del visual tolti dal codice
provides:
  - "grep CUT-01 (P1 + P2) a zero su tutto src/, anche la prosa"
  - "Manifesto descritto come sezione sola, con una chiave e un documento"
  - "finalize.ts descrive la cover come unico chiamante di quarantena e stripper"
affects: [53-07, 53-13]
tech-stack:
  added: []
  patterns:
    - "lapide con data e decisione, mai l'identificatore tolto ricopiato"
    - "precedente di forma citato solo se vivo (strip-metadata.ts, write-contract.ts)"
key-files:
  created: []
  modified:
    - src/app/(admin)/admin/manifesto/SectionForm.tsx
    - src/app/(admin)/admin/manifesto/SectionStateBadge.tsx
    - src/app/(admin)/admin/manifesto/SectionVoid.tsx
    - src/app/(admin)/admin/manifesto/ExportPanel.tsx
    - src/app/(admin)/admin/manifesto/OpenQuestionNotice.tsx
    - src/app/(admin)/admin/manifesto/refusals.tsx
    - src/app/(admin)/admin/manifesto/actions.ts
    - src/app/(admin)/admin/manifesto/export-actions.ts
    - src/lib/production/sections/export-contract.ts
    - src/lib/production/sections/write-contract.ts
    - src/lib/production/export/manifesto.ts
    - src/lib/media/finalize.ts
    - src/lib/media/strip-metadata.ts
    - src/lib/media/upload-limits.ts
    - src/app/api/media/finalize-cover/route.ts
    - src/lib/venue-reveal/reveal-party-venue.ts
    - src/lib/supabase/middleware.ts
    - src/lib/routes/next-redirect.ts
key-decisions:
  - "53-06: solo prosa; nessun tipo ristretto in export-contract.ts perche' ExportRefusal/ExportResult non nominavano l'esportazione tolta"
  - "53-06: PERIMETER_NOTICE (testo del documento consegnato) lasciato invariato: e' contenuto prodotto, non commento; il plurale «these documents» e' debito dichiarato"
  - "53-06: same-format resta nell'unione StripEncoding e upload-limits.ts resta senza importatori: restringere/togliere e' codice, differito"
requirements-completed: [CUT-01]
duration: ~25min
completed: 2026-10-14
---

# Phase 53 Plan 06: la prosa dei sopravvissuti Summary

**Diciotto file che restano smettono di descrivere come vivi un secondo montaggio, una seconda chiave, un'esportazione gemella e un secondo chiamante di finalize: grep CUT-01 a zero su `src/`, build verde, zero righe di logica toccate.**

## Performance

- Durata: ~25 min
- Completato: 2026-10-14
- Task: 2/2 (commit unico, come prescritto dal piano)
- File modificati: 18 (16 del piano + 2 della stessa directory, vedi deviazioni)

## Accomplishments

- Manifesto: `SectionForm`, `SectionStateBadge`, `SectionVoid`, `ExportPanel`, `OpenQuestionNotice`, `refusals` descrivono una sezione sola con una chiave (D-53-04, con data 2026-10-14). «one form, two keys» non esiste piu'; la regola del renderer unico dello stato indeciso e quella del controllo che parte vuoto sono enunciate senza nominare i file usciti.
- `export-contract.ts` dichiara un'esportazione sola (il manifesto); il capitolato e' descritto come materiale di produzione esterno (`brand-visual-system.md`, gate *capitolato, non file*), non come esportazione del prodotto. `write-contract.ts` e `export/manifesto.ts` allineati.
- Media: `finalize.ts` dichiara la cover come unico chiamante dal 2026-10-14; la ragione dello stripper (JPEG di Safari iOS con GPS) intatta in `strip-metadata.ts` e `finalize-cover/route.ts`. Nessuna costante, limite o funzione cambiata.
- File Critical: solo commenti (diff sotto).

## Task Commits

1. **Task 1 + Task 2** (commit unico per piano) — `09ab2d68` `docs(53-06): la prosa dei sopravvissuti smette di citare le sezioni tolte`

## Prove

**Build:** `npm run build` → `build=0` (sul working tree del commit).

**Grep CUT-01 su tutto `src/`** (P1 + P2 + `one form, two keys` + `export/capitolato`): `0`. `\bTASK\b` su `src/`: `0`.

**Solo commenti, su tutti i 18 file:**
`git diff -U0 HEAD~1 -- src | grep -E '^[+-][^+-]' | grep -vE '^[+-]\s*(//|\*|/\*)'` → nessuna riga.

**Tre file Critical**, conteggio righe non-commento cambiate: `0`. `git diff --stat HEAD~1 -- src/middleware.ts`: vuoto.

Diff integrale dei file Critical:

```diff
--- a/src/lib/routes/next-redirect.ts
@@ -143 +143 @@
-  // it stood, a caller bounced off `/admin/calendar` would have arrived with a
+  // it stood, a caller bounced off `/admin/artists` would have arrived with a
@@ -148 +148 @@
-  // most here. Landing on `/admin/calendar` does not mean being admitted to it:
+  // most here. Landing on `/admin/artists` does not mean being admitted to it:
--- a/src/lib/supabase/middleware.ts
@@ -590 +590 @@
-  // caller bounced off `/admin/calendar` would have arrived with a `next` the
+  // caller bounced off `/admin/artists` would have arrived with a `next` the
--- a/src/lib/venue-reveal/reveal-party-venue.ts
@@ -21 +21 @@
- * discipline, and the same reason, as `src/lib/media/may-upload.ts:7-15`.
+ * discipline, and the same reason, as `src/lib/media/strip-metadata.ts:1-15`.
@@ -27,4 +27,4 @@
- * it. `may-upload.ts:28-34` is the repository's only precedent for this shape
- * and it carries the same paragraph — with one difference worth naming: that
- * one is a **predicate**, this one is an **executor with an irreversible
- * external effect**. The argument for a single definition is therefore
+ * it. `src/lib/production/sections/write-contract.ts` is a living precedent
+ * for this shape and carries the same paragraph — with one difference worth
+ * naming: that one holds **checks**, this one is an **executor with an
+ * irreversible external effect**. The argument for a single definition is therefore
```

`/admin/artists` e' ammesso dall'allow-list (`/^\/admin(?:\/[a-z0-9-]{1,64}){0,4}$/`), quindi l'esempio resta vero.

**Gate di persona collegati (non vietati):** `verify:section-surface` 0, `verify:section-export` 0, `verify:media-strip` 0. `verify:refusal` NON eseguito (vietato).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Documentazione falsa] Due file di Manifesto fuori dal frontmatter citavano file tolti**
- **Trovato durante:** Task 1
- **Problema:** `manifesto/actions.ts` citava `calendar/actions.ts:78-82`, `location/actions.ts:170-188` e un «sibling one directory over»; `manifesto/export-actions.ts` citava `calendar/actions.ts:78-82`. Non accendono il grep CUT-01 (il pattern e' `admin/calendar`), ma sono percorsi morti nella stessa directory che il verify del piano copre.
- **Fix:** ragione scritta in linea (un predicato esportato e' un oracolo) e lapide datata al posto dei percorsi. Solo commenti.
- **Commit:** `09ab2d68`

**2. [Rule 1 - Documentazione falsa] Citazioni morte dentro i blocchi media gia' in riscrittura**
- `finalize.ts`, `upload-limits.ts`, `finalize-cover/route.ts` citavano `src/app/api/media/finalize/route.ts` (route della gallery, uscita il 2026-10-02) e `MediaUpload.tsx` (non esiste). Riscritte nello stesso passaggio; i due numeri (4.5 MB del body, limite della cover) restano scritti in `finalize-cover/route.ts`.

## Deferred Issues

- **`PERIMETER_NOTICE` in `export-contract.ts`** dice ancora *«Neither of these documents can reach an address»* e *«either of these documents»*: e' **testo del documento consegnato al selector**, non commento. Cambiarlo cambia cio' che il proprietario consegna, quindi fuori da un piano solo-prosa. Annotato anche in un commento sopra la costante.
- **`upload-limits.ts` non ha importatori** dal 2026-10-14 (verificato: zero riferimenti in `src/` e `scripts/`). Candidato alla rimozione: e' codice.
- **`"same-format"` in `StripEncoding`** non ha piu' chiamanti; restringere l'unione e' codice (e `verify:media-strip` va riletto prima).

## Known Stubs

Nessuno.

## Next Phase Readiness

Il grep CUT-01 e' a zero su `src/`; il criterio su `src/ scripts/` resta del piano 53-07, come da piano.

## Self-Check: PASSED

- `09ab2d68` presente in `git log`.
- I 18 file modificati esistono; nessuna cancellazione nel commit (`git diff --diff-filter=D HEAD~1 HEAD` vuoto).
