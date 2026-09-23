---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 01
subsystem: media-and-storage
tags: [NAV-07, censimento, laboratorio, event-media, stripper, venue-secrecy]
requires: []
provides:
  - "52-ESITI.md §Censimento di NAV-07 — i numeri di partenza su laboratorio e produzione"
  - "scripts/seed-lab-media.mjs — orfano e foto pre-stripper con GPS sul laboratorio"
  - "un laboratorio con media di ogni forma che NAV-07, D-52-30 e D-52-31 devono provare"
affects: [52-06, 52-10, 52-12, 52-13, 52-15, 52-16]
tech-stack:
  added: []
  patterns: ["script di solo laboratorio con rifiuto del ref di produzione (exit 2) prima di ogni lettura", "censimento read_only a soli conteggi aggregati"]
key-files:
  created:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md
    - scripts/seed-lab-media.mjs
  modified: []
decisions:
  - "La foto pre-stripper del banco sta sulla serata SEGRETA: e' il caso peggiore di venue-secrecy (GPS nei byte di una sede segreta), quello che 52-10 deve provare"
  - "Le tre decisioni di moderazione applicate sul laboratorio per chiave primaria, stesso effetto di updateMediaStatus, perche' la coda del prodotto e' vuota per PGRST200"
  - "L'account del banco usato e' il master (il banco non ha un organizer); ha staff.manage, quindi gli stessi due arm di mayUploadToParty"
metrics:
  duration: "~35 min"
  completed: 2026-09-23
  tasks: 3
  files: 2
---

# Fase 52 Piano 01: censimento di NAV-07 e banco dei media Summary

Censimento `read_only` di `event_media` e del bucket `event-media` su laboratorio e produzione (la produzione e' **vuota**: zero righe, zero oggetti), piu' uno script di solo laboratorio che semina l'orfano e la foto pre-stripper con GPS in mare aperto, e un laboratorio seminato dal percorso vero di caricamento.

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | Censimento di NAV-07, read_only, due progetti | f491c61 | `52-ESITI.md` |
| 2 | Script del banco dei media sul laboratorio | 3b79757 | `scripts/seed-lab-media.mjs` |
| 3 | Seminare il laboratorio (percorso vero + script) | 3c659e0 | `52-ESITI.md` (sezione del banco) |

## Il censimento (task 1) — tutte le letture con `read_only: true`

| Lettura | Laboratorio (13:08:04Z) | Produzione (13:08:07Z) |
|---|---|---|
| righe `event_media` | 0 | **0** |
| `url` di altra forma | 0 | **0** |
| approvate / in attesa / rifiutate | 0/0/0 | 0/0/0 |
| righe di serate segrete | 0 | 0 |
| soglia dello stripper (history) | `20260907094330` | **non registrata** (effetto presente nel catalogo) |
| righe pre-soglia | 0 | 0 (non calcolabile dalla history; righe totali 0) |
| oggetti / orfani / oggetti di rifiutate | 0/0/0 | 0/0/0 |
| bucket `public` | true | true |

**`url` di altra forma = 0 su entrambi i progetti: M1 (piano 52-06) NON e' bloccata dal censimento.** D-52-30 e D-52-31 in produzione oggi non hanno soggetti. Da rileggere il giorno dell'atto (52-15/52-16).

## Il laboratorio, prima e dopo (task 3)

| Lettura | Prima (13:08:04Z) | Dopo (13:18:40Z) | Delta |
|---|---|---|---|
| approvate | 0 | 3 | **+3** (1 serata non segreta, 1 serata segreta, 1 pre-stripper su serata segreta) |
| in attesa | 0 | 1 | **+1** (serata segreta) |
| rifiutate | 0 | 1 | **+1**, con oggetto presente (oggetti di righe rifiutate: 1) |
| righe di serate segrete | 0 | 3 | +3 |
| foto pre-soglia (di serata segreta) | 0 (0) | 1 (1) | +1 |
| oggetti nel bucket | 0 | 6 | +6 |
| orfani | 0 | 1 | **+1** |
| righe senza oggetto | 0 | 0 | — |

- Le quattro foto (JPEG generati, colore pieno, nessuna persona, nessuna sede) sono passate dal **percorso vero**: `MediaUpload` → quarantena → `POST /api/media/finalize` (4 risposte 200 nel log del dev server) → `registerMedia`. Driver: Chrome headless via CDP, profilo isolato, porta 9333, dev server `npm run dev:lab` sulla 3001; entrambi chiusi a fine lavoro.
- **Rilettura dal bucket della foto pre-stripper: EXIF 354 byte, sottodirectory GPS (tag 0x8825) presente** — `sharp(buffer).metadata()` dentro lo script.
- Idempotenza osservata: una seconda `--apply` non ha creato nulla.
- `seed-lab-media.mjs` con `LAB_PROJECT_REF` = ref di produzione esce **2** prima di ogni lettura (comando di verifica del piano eseguito); rifiuta anche nessun modo e i due modi insieme (exit 2).
- **Zero scritture in produzione.** In produzione solo `SELECT` con `read_only: true`.
- `npm run build` verde (exit 0). Non esiste un test runner: nessuna affermazione su test.

**Chiavi nel registro del banco.** In `.env.lab.seed.json` (ignorato da git) sono entrati `media.orphanPath`, `media.prestripPath`, `media.prestripRowId` e `media.uploaded` (le quattro righe del percorso vero: approvata/rifiutata della serata non segreta, approvata/in attesa della serata segreta). **Il file e' stato ricopiato in `/Users/etiesse/Resonate/.env.lab.seed.json`** sovrascrivendo la copia del checkout principale; se un altro esecutore dell'onda l'ha modificato fra le 13:05Z e le 13:20Z, le sue chiavi vanno riunite a mano.

## Deviazioni dal piano

### Trovato, non corretto (fuori perimetro) — la coda di moderazione e' vuota per costruzione

- **Trovato durante:** task 3.
- **Problema:** `src/app/(admin)/admin/(work)/events/[id]/media/page.tsx:181-186` legge la coda con `profiles!event_media_uploaded_by_fkey(full_name)`, ma quel vincolo punta a `auth.users` (letto da `pg_constraint`, identico su laboratorio e produzione). PostgREST risponde **400 PGRST200** (riprodotto con la chiave di servizio del laboratorio); la pagina non controlla `error` e mostra «Nothing has been uploaded» accanto a un censimento che dice «2 Pending». **Fallimento silenzioso preesistente, anche in produzione**: nessun media puo' essere moderato dall'interfaccia.
- **Perche' non corretto qui:** il file non e' nei `files_modified` di 52-01, altri quattro esecutori lavorano in parallelo e la pagina appartiene al piano 52-12. **Va corretto prima che la moderazione serva** (52-12 o un fix dedicato) — ed e' anche il posto in cui il gate *zero fallimenti silenziosi* chiede di controllare `error`.
- **Come si e' proceduto:** le tre decisioni di moderazione applicate sul laboratorio per chiave primaria, con lo stesso effetto di `updateMediaStatus` (`actions.ts:227-259`, un solo `update ... set status`), con id letti dalle righe appena create dal percorso vero e registrati in `.env.lab.seed.json`.

### Altre differenze

1. **Account organizer → master.** Il banco (`.env.lab.seed.json`) non ha un account `organizer`; si e' usato il `master`, che porta `staff.manage` come l'organizer (stessi due arm di `mayUploadToParty`).
2. **Il laboratorio non era in pausa** (`ACTIVE_HEALTHY`): nessun restore necessario.
3. **Soglia della produzione non nella history.** Il piano chiedeva la versione con cui `20260809006000` e' registrata su ciascun progetto: in produzione non c'e'. Scritto in `52-ESITI.md` come differenza dall'atteso; con zero righe non cambia alcun numero, ma 52-15/52-16 non possono presumerla.

## Known Stubs

Nessuno.

## Threat Flags

Nessuna superficie nuova: lo script scrive solo sul laboratorio e rifiuta la produzione (T-52-03, provato); `52-ESITI.md` porta solo numeri aggregati (verificato: zero UUID, zero URL di media, zero ref).

## Self-Check: PASSED

- `.planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md` — presente
- `scripts/seed-lab-media.mjs` — presente
- commit f491c61, 3b79757, 3c659e0 — presenti nel log del ramo
