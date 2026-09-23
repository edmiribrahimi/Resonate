---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 08
subsystem: access-gating, media-and-storage
tags: [NAV-02, NAV-07, gallery, signed-urls, rls]
requires: ["52-06 (CAP.GALLERY_VIEW, voce di mappa, M1 sul laboratorio)"]
provides:
  - "/gallery in PROTECTED_PREFIXES e /^\\/gallery$/ in NEXT_ALLOW_LIST"
  - "guardia gallery.view in pagina prima di ogni lettura"
  - "src/lib/media/sign-event-media.ts — signEventMedia(rows, seconds), EVENT_MEDIA_SIGNATURE_SECONDS, EVENT_MEDIA_REVIEW_SIGNATURE_SECONDS"
  - "MediaGrid / Lightbox con il caricamento fallito dichiarato"
affects: ["52-12 (sposta evento, moderazione e MediaReviewGrid sul firmatario)", "52-13 (M2, curl anonimo sul lab)", "52-14", "52-15"]
tech-stack:
  added: []
  patterns: ["firma con il client di sessione, mai service role (analogo signVisualAssets)", "onError su <img>/<video> — primo nel prodotto"]
key-files:
  created:
    - src/lib/media/sign-event-media.ts
  modified:
    - src/lib/routes/next-redirect.ts
    - src/app/(public)/gallery/page.tsx
    - src/components/media/MediaGrid.tsx
    - src/components/media/Lightbox.tsx
decisions:
  - "Il firmatario prende righe, non percorsi: nessun parametro attraverso cui arrivi una chiave digitata"
  - "Righe con storage_path nullo: niente fallback su url, si contano con [gallery.unsigned_row] e si disegnano come non caricate"
  - "Dopo una lettura fallita non si disegna lo stato vuoto: sarebbe una frase falsa sotto l'avviso"
metrics:
  duration: "~25 min"
  completed: 2026-09-23
---

# Fase 52 Piano 08: il cancello della gallery e il primo lettore che firma — Summary

`/gallery` ha il cancello in tre pezzi (mappa di 52-06, prefisso protetto con ritorno `?next=/gallery`, guardia `gallery.view` in pagina prima della lettura) e smette di disegnare `url` pubblici: legge `storage_path` e firma con il client della **sessione** di chi guarda, cosi' il confine resta la policy sull'oggetto e non un `if`.

## Cosa e' stato fatto

| Task | Commit | Cosa |
|---|---|---|
| 1 — Il cancello | `8aa1aa9` | `next-redirect.ts:139` pattern `/^\/gallery$/` con blocco «Added 2026-09-23, phase 52, D-52-13»; `PROTECTED_PREFIXES` con `"/gallery"` e docblock che conta **cinque** prefissi per esteso (`:235-241`); `gallery/page.tsx:93` guardia `capabilities.has(CAP.GALLERY_VIEW)` → `redirect("/dashboard")` prima di `createClient()`, con la nota D-52-14 accanto |
| 2 — Firmatario e lettura | `57b1df3` | `sign-event-media.ts`: `import "server-only"`, nessuna direttiva server-action, `createClient()` di sessione (`:121`), **una** `createSignedUrls` (`:128`), mappa per posizione, costanti `3600` (`:58`) e `300` (`:78`) con le due direzioni; `gallery/page.tsx:103` seleziona `storage_path` e mai `url`, `:112` `[gallery.read_failed]`, `:125` firma; due avvisi `role="alert"` distinti (lettura / firma) |
| 3 — Caricamento fallito dichiarato | `fe5b355` | `MediaGrid.tsx:108` e `Lightbox.tsx:122,130` `onError`; `url` vuoto o errore → «This image could not be loaded. Reload the page.»; il commento sull'alt vuoto resta invariato; nessun `next/image` |

## Verifica

Non esiste un test runner: niente di questo e' «verificato perche' i test passano».

- `npm run build` — exit 0 (dopo ciascun task)
- `npm run verify:routes` — PASS, tre controlli verdi (il [3/3] lega il nuovo prefisso al nuovo pattern)
- `npm run verify:media-strip` — exit 0 (`createSignedUrls` non e' una scrittura; nessun `createSignedUploadUrl`)
- `npm run verify:conversion` — exit 0 (il wrapper `md:[--nav-inset-inline-start:14rem]` resta)
- `npm run verify:touch-targets` — exit 0
- Controlli per grep del piano: guardia prima di `.from("event_media")` per posizione; zero `"use server"`, zero service role, zero `createSignedUploadUrl` nel firmatario; zero `select("id, url` nella pagina
- **Non preteso qui:** il `curl -sI` anonimo su `/gallery` del laboratorio (→ `/login?next=%2Fgallery`) lo registra il piano 52-13 dopo il deploy; le sonde P-52-B / P-52-G di `52-PROCEDURES.md` si percorrono sul laboratorio nei piani 52-13 / 52-14.

## Deviazioni dal piano

**1. [Rule 1 - Bug] Il nome della policy di riga nella nota D-52-14 non esiste ancora**
- **Trovato durante:** Task 1/2
- **Problema:** la nota chiesta dal piano nomina `event_media_select_gallery`, ma nessuna migration la crea oggi: la scrive M2 (piano 52-13). Una nota che la presentasse come esistente manderebbe chi riapre la gallery a cercare una policy che non c'e'.
- **Fix:** la nota dice «(written by M2, plan 52-13)».
- **Commit:** `57b1df3`

**2. [Rule 1 - Bug] Il docblock nominava letteralmente la direttiva server-action**
- Il controllo del piano pretende zero occorrenze del letterale nel firmatario; la frase che spiegava *perche'* manca la conteneva. Riformulata come «the server-action directive». Commit `57b1df3`.

**3. [Rule 2 - Correttezza] Lo stato vuoto non si disegna dopo una lettura fallita**
- Senza questo, sotto l'avviso «could not be read» comparirebbe «No photos or videos yet» — due frasi contraddittorie, e la seconda falsa. `GalleryClient` si monta solo se la lettura e' riuscita. Commit `57b1df3`.

**4. Docblock di pagina:** la frase «The read is untouched, byte for byte» era diventata falsa (cambia una colonna). Corretta in «was untouched … until phase 52», con il paragrafo NAV-07 che dice cosa e' cambiato: stesse righe, stesso filtro, stesso ordine, stesso tetto.

## Note per i piani successivi

- `MediaGrid`/`Lightbox` sono condivisi con la pagina evento e con la moderazione (52-12): il testo di caricamento fallito vale anche li', gia' oggi con `url` pubblici. `EVENT_MEDIA_REVIEW_SIGNATURE_SECONDS = 300` e' pronto per la moderazione.
- Il firmatario, su errore di Storage, logga `code` e `message` di Storage; non logga chiavi ne' indirizzi. Nessun error tracking esiste: l'effetto visibile (avviso in pagina, testo per miniatura) e' l'unico che raggiunge qualcuno.
- Ordine di spedizione invariato M1 → codice → M2: con il bucket ancora pubblico la firma passa dal braccio `EXISTS` di M1 (`event_media_objects_select_by_row`); dopo M2 continua a passare da li'. Nessuna revoca nel bucket in questo piano.

## Threat Flags

Nessuna superficie nuova fuori dal threat model: nessun endpoint, nessuna scrittura, nessun service role.

## Known Stubs

Nessuno.

## Self-Check: PASSED

- FOUND: src/lib/media/sign-event-media.ts
- FOUND: commit 8aa1aa9, 57b1df3, fe5b355
