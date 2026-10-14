---
phase: 53-meno-strumenti-la-porta-dentro-management-inserted
plan: 02
subsystem: venues-catalogue
tags: [venues, catalogue, server-action, typed-refusal, venue-secrecy, CUT-03]
requires: []
provides:
  - "NewVenueButton — secondo montaggio di CreateVenueModal in /admin/venues"
  - "CreateVenueRefusal / CreateVenueResult — createVenue restituisce il rifiuto invece di lanciarlo"
affects:
  - src/components/events/EventForm.tsx (non modificato: passa sempre `name`, quindi resta sul ramo in sola lettura)
  - piano 53-10 (P-53-E sul laboratorio prova il comportamento)
tech-stack:
  added: []
  patterns:
    - "rifiuto tipizzato da server action (stessa forma di UpdateVenueResult)"
    - "modal a nome opzionale con due montaggi (analogo di 31baf149, Artists)"
key-files:
  created:
    - src/components/venues/NewVenueButton.tsx
  modified:
    - src/components/venues/CreateVenueModal.tsx
    - src/app/(admin)/admin/(work)/venues/page.tsx
    - src/app/(admin)/admin/venues/actions.ts
decisions:
  - "createVenue restituisce CreateVenueResult con cinque cause (not_permitted, identity_missing, name_missing, name_taken, write_failed); la guardia resta assertCatalogueManage (catalogue.manage) sotto il client cookie (D-53-09)"
  - "Il modal azzera tutti i campi all'apertura: col secondo montaggio l'indirizzo della sede precedente sarebbe rimasto precompilato nella successiva"
metrics:
  duration: "~15 min"
  completed: 2026-10-14
  tasks: 2
  files: 4
---

# Phase 53 Plan 02: «New venue» in Venues e rifiuto tipizzato di createVenue — Summary

In `/admin/venues` c'e' ora un bottone «New venue» che apre lo stesso `CreateVenueModal` del form della serata, senza nome (il modal lo chiede); `createVenue` non lancia piu' e restituisce `CreateVenueResult`, cosi' entrambi i punti d'ingresso mostrano una frase propria per ognuna delle cinque cause di rifiuto.

## Cosa e' stato fatto

**Task 1 — «New venue» in Venues** (commit `783bf922`, unico commit con il Task 2 come prescritto dal piano)
- `src/components/venues/NewVenueButton.tsx` (nuovo, `"use client"`): copia di `NewArtistButton`; `Button size="sm"` «New venue», `CreateVenueModal` senza `name`, a successo `setOpen(false)` + `router.refresh()`. Docblock: raggiungibilita' = pagina (`organizer.access`), scrittura = `createVenue` sotto `catalogue.manage` + client cookie (RLS `venues_insert_organizer`), flag di segretezza della serata non raggiungibile.
- `CreateVenueModal.tsx`: `name?: string`; `nameIsEditable = name === undefined`; `typedName` azzerato all'apertura e in `resetAndClose`; payload `name ?? typedName.trim()`; submit disabilitato con nome vuoto sul ramo editabile; ramo editabile con `required`, `maxLength={120}`, `data-initial-focus`; ramo da serata identico a prima (`readOnly`, `opacity-70`, nessun marker → fuoco sul controllo di chiusura come prima). Docblock del fuoco iniziale riscritto.
- `(work)/venues/page.tsx`: header `flex items-center justify-between gap-4` con `<NewVenueButton />`; stato vuoto «Create one with “New venue” above, or from the venue field of the event form.»; commento «exactly one importer» → «two importers» con la ragione. Guardia `CAP.ORGANIZER_ACCESS` invariata.

**Task 2 — rifiuto tipizzato (D-53-09)**
- `actions.ts`: `export type CreateVenueRefusal` (cinque valori, un docblock ciascuno) e `export type CreateVenueResult`. `createVenue(formData): Promise<CreateVenueResult>`: client cookie e commento «Do not swap it» intatti; i due throw di `assertCatalogueManage()` tradotti in `not_permitted` / `identity_missing` con lo stesso meccanismo di `updateVenue`; nome vuoto → `name_missing`; `23505` → `name_taken`; altro → `write_failed` con `console.error("[venues.create_failed] insert refused: <code>")` — solo il codice, mai nome, indirizzo, message o details. Slug, campi e insert invariati.
- `CreateVenueModal.tsx`: `REFUSAL_SENTENCES: Record<CreateVenueRefusal, string>`, una frase per causa nella regione `status` del `Dialog`; `onCreated` solo su `ok: true`. Lo stage `photo` resta com'era. Il docblock «The fourth distinction is not available from this file … recorded as owed» e' riscritto come debito pagato il 2026-10-14.
- `rg -n "createVenue\(" src` → una sola chiamata (il modal) piu' la definizione; nessuno leggeva `success`.

## Verifica

Nessun test runner nel repo: la verifica e' `npm run build` piu' i grep del piano. La prova di comportamento (crea da Venues, usa la sede in una serata nuova, pagina pubblica senza indirizzo, rifiuti) e' P-53-E nel piano 53-10, sul laboratorio.

```
$ npm run build
✓ Compiled successfully in 3.0s
├ ƒ /admin/venues
├ ƒ /admin/venues/[slug]
build=0
```

Grep del piano (all'HEAD `783bf922`):
- frase «No `data-initial-focus` marker is declared» → 0
- `name?: string|data-initial-focus|typedName` nel modal → 7
- nomi delle cinque cause nel modal → 5
- `CreateVenueRefusal|CreateVenueResult` in `actions.ts` → 5
- `throw new Error("A venue with this name already exists")` → 0
- `EventForm.tsx` non modificato (assente da `git diff --stat`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Effetto di azzeramento all'apertura aggiunto al modal**
- **Found during:** Task 1
- **Issue:** il piano diceva di azzerare `typedName` «nell'effetto di apertura», ma `CreateVenueModal` non ne aveva uno (lo aveva `CreateArtistModal`). Un successo chiude il modal tramite `onCreated`, non tramite `resetAndClose`: col secondo montaggio, creando due sedi di fila da Venues, l'indirizzo (e gli altri campi) della prima sarebbero rimasti precompilati nella seconda — un indirizzo sbagliato scritto su una sede e' un errore di dominio, non cosmetico.
- **Fix:** `useEffect` su `open` che azzera tutti i campi, stessa forma di `CreateArtistModal`. Nessun campo, validazione o condizione sull'indirizzo cambia.
- **Files modified:** src/components/venues/CreateVenueModal.tsx
- **Commit:** 783bf922

**2. [Rule 1 - Precisione] Frase del ramo `create` non anticipato riscritta**
- Il vecchio testo suggeriva «controlla il nome duplicato o il permesso»: quelle cause arrivano ora come valori con la loro frase, quindi il ramo `catch` copre solo un guasto che l'azione non prevede («The server failed before it could answer … try again»). Il ramo rete resta com'era.

## Venue secrecy / accesso

- Nessuna superficie pubblica toccata; nessuna lettura o scrittura di `venue_reveal_sent`, `venue_reveal_on_purchase`, `venue_secret_hint_reveal_hours`.
- `/admin/venues` resta dietro `organizer.access`; la scrittura resta `catalogue.manage` + client cookie + RLS: il bottone allarga dove il form si raggiunge, non chi scrive (T-53-06).
- Nessun log con nome o indirizzo (T-53-07); rifiuti distinti per causa (T-53-08).
- Nessun nome di sede, indirizzo o dato reale nei file (repo pubblico).

## Known Stubs

Nessuno.

## Threat Flags

Nessuna superficie nuova oltre a quelle del `<threat_model>` del piano.

## Self-Check: PASSED

- FOUND: src/components/venues/NewVenueButton.tsx
- FOUND: src/components/venues/CreateVenueModal.tsx (modificato)
- FOUND: src/app/(admin)/admin/(work)/venues/page.tsx (modificato)
- FOUND: src/app/(admin)/admin/venues/actions.ts (modificato)
- FOUND: commit 783bf922
