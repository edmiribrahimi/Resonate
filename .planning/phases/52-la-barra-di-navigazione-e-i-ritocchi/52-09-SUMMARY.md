---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 09
subsystem: media-and-storage
tags: [NAV-07, D-52-30, rimozione-per-chiave, laboratorio, event-media, autorizzazione]
requires:
  - "52-01: banco dei media sul laboratorio (una rifiutata con oggetto, un orfano, una foto pre-stripper)"
  - "52-06: M1 — event_media.storage_path popolata sul laboratorio"
provides:
  - "scripts/purge-media-orphans.mjs — rimozione per chiave di oggetti rifiutati (oggetto + riga) e orfani (solo oggetto), due popolazioni separate, istantanea di soli metadati, riconteggio da fonte diversa, atto di produzione consumato dallo strumento"
  - "il contratto del blocco <!-- purge-media-orphans: grant --> che il piano 52-16 deve scrivere in 52-AUTHORISATION-MEDIA.md"
  - "un laboratorio senza oggetti rifiutati ne' orfani"
affects: [52-10, 52-15, 52-16]
tech-stack:
  added: []
  patterns:
    - "strumento irreversibile nella forma di purge-attendances.mjs: laboratorio per default, produzione solo sotto atto datato letto FRA I MARCATORI del proprio blocco"
    - "una rimozione Storage per chiamata, un nome per chiamata; riverifica per chiave prima dell'atto"
    - "orfano definito in modo STRETTO: un oggetto nominato da una riga per storage_path O per coda dell'url non e' orfano"
key-files:
  created:
    - scripts/purge-media-orphans.mjs
  modified: []
decisions:
  - "Orfano = oggetto che nessuna riga nomina ne' per storage_path ne' per coda dell'url: le righe scritte dal codice anteriore a 52-08 portano solo l'url, e un orfano definito largo cancellerebbe la foto di una di esse"
  - "Righe rejected senza storage_path o gia' senza oggetto: contate a parte e NON toccate (chiave ignota / fuori da R); i numeri concessi riguardano solo R e O"
  - "La riga R si cancella solo se il suo oggetto e' stato tolto (oggetto prima, riga dopo, come deleteMedia)"
  - "Se una tabella pende da event_media (pg_constraint), lo strumento si ferma con cascade_unhandled prima di scrivere"
  - "In produzione la soglia in volo non scende sotto 60 minuti (rifiuto, exit 2)"
  - "Prima di contare lo strumento verifica che storage_path esista (schema_missing): oggi in produzione M1 non c'e' e lo strumento si ferma in sola lettura"
metrics:
  duration: "~25 min"
  completed: 2026-09-23
  tasks: 2
  files: 1
---

# Fase 52 Piano 09: rimozione per chiave degli oggetti rifiutati e orfani (D-52-30) Summary

`scripts/purge-media-orphans.mjs` toglie dal bucket `event-media` gli oggetti
delle foto rifiutate (oggetto e riga) e gli oggetti orfani (solo oggetto), per
chiave, su una lista catturata dalla stessa interrogazione che ha contato, dopo
un'istantanea di soli metadati, e riconta da una fonte diversa. Provato **per
intero sul laboratorio**: la rifiutata e l'orfano del banco non esistono piu',
la foto pre-stripper di 52-10 e' intatta.

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | Scrivere lo strumento | 3667854 | `scripts/purge-media-orphans.mjs` |
| 2 | Eseguirlo sul laboratorio (dry-run, atto, riconteggio, idempotenza) | (questo SUMMARY) | — nessuna modifica al codice |

### Lo strumento (task 1)

- Struttura di `purge-attendances.mjs`: testata «NON PUNTA MAI ALLA PRODUZIONE
  PER DEFAULT», sei regole della rimozione, «una decisione senza soggetti non si
  esegue», `refuse()` → exit 2, `fail(categoria)` → exit 1, `sql(…, { readOnly })`
  con `read_only: false` solo sul `DELETE` delle righe R.
- **Due popolazioni** separate in conteggio, istantanea, cattura, atto e
  riconteggio: R (oggetti di righe `rejected`, oggetto + riga) e O (oggetti senza
  riga). Contate a parte e mai toccate: oggetti «in volo» (piu' giovani di
  `--older-than-minutes`, default 60), righe `rejected` senza `storage_path`,
  righe `rejected` il cui oggetto non c'e' gia' piu'.
- **Istantanea** in `.env.media-purge-snapshot.<stamp>.json`: nome, size,
  mimetype, `created_at` dell'oggetto; per R anche `id`, `status`, `created_at`
  della riga. **Zero byte**, con il paragrafo del perche' (`legal-compliance.md`,
  immagini delle persone): l'istantanea dice cosa e' stato tolto, non lo rimette.
- **Per chiave**: `remove([nome])` un nome per chiamata; `DELETE … WHERE id =
  any(<id catturati>) AND status = 'rejected'`; riverifica per chiave subito
  prima dell'atto (`key_changed` → nessuna scrittura).
- **Riconteggio da fonte diversa**: oggetti via Management API su
  `storage.objects` (ha tolto l'API Storage), righe via PostgREST col service
  role (ha cancellato il Management API); piu' approvate, in attesa e i loro
  oggetti prima/dopo (`untouched_changed`).
- **Produzione**: `--authorised` + `--dated`; il blocco si legge e si marca **solo
  fra** `<!-- purge-media-orphans: grant -->` e `<!-- /purge-media-orphans: grant
  -->`; campi `act: event_media.purge`, `target: production`, `granted: yes`,
  `granted_on`, `spent: no`, `rejected_objects`, `orphan_objects`; `count_drift`
  (exit 1) se i numeri di oggi differiscono; `spent: yes` + `spent_at` scritti
  dallo strumento dentro il blocco.
- **Stdout**: solo numeri, categorie, ore UTC e nome del file d'istantanea.
  Osservato su tutte le corse qui sotto: nessun nome di oggetto, path, URL o id.
  I corpi d'errore HTTP non si stampano (potrebbero ripetere la query, che porta
  chiavi): solo lo stato.

### I rifiuti, provati (nessuna lettura prima)

| Invocazione | Esito |
|---|---|
| nessun modo | exit 2 |
| `--dry-run --apply` | exit 2 |
| `--project <ref di produzione>` senza `--authorised`/`--dated` | exit 2 |
| blocco con i campi giusti FUORI dai marcatori e `spent: yes` DENTRO | exit 2 (`spent = yes`) — i campi fuori dal blocco non contano |
| `--dated` diverso da `granted_on` | exit 2 |
| documento senza il blocco | exit 2 |
| produzione con `--older-than-minutes 5` | exit 2 |

Le fixture d'autorizzazione stavano nello scratchpad della sessione, con un nome
diverso da `52-AUTHORISATION-MEDIA.md`, che **non e' stato creato**.

## La corsa sul laboratorio (task 2)

Laboratorio `ACTIVE_HEALTHY` (13:38Z). Variabili caricate dallo strumento da
`.env.local` + `.env.lab.local` (lab su URL e chiave di servizio).

| Passo | Ora (UTC) | R oggetti | O orfani | in volo | approvate / in attesa | oggetti nel bucket | oggetti di approvate+attesa |
|---|---|---|---|---|---|---|---|
| dry-run, soglia 60 | 13:42:18 | 1 | **0** | **1** | 3 / 1 | 6 | 4 |
| dry-run, soglia 15 | 13:42:34 | 1 | 1 | 0 | 3 / 1 | 6 | 4 |
| `--apply`, soglia 15 — conteggio | 13:42:51 | 1 | 1 | 0 | 3 / 1 | 6 | 4 |
| `--apply` — atto R | 13:42:52 | 1/1 oggetti rimossi, 1/1 righe cancellate | | | | | |
| `--apply` — atto O | 13:42:52 | | 1/1 oggetti rimossi | | | | |
| riconteggio, fonte diversa | 13:42:53 | residui 0 (oggetti, Mgmt API) · 0 (righe, PostgREST) | residui 0 | — | **3 / 1** (PostgREST) | **4** | **4** |
| rilettura manuale read_only | 13:43:02 | 0 oggetti di rifiutate, 0 righe rejected | 0 orfani | 0 | 3 / 1 | 4 | — |
| secondo dry-run (idempotenza) | 13:43:03 | 0 | 0 | 0 | 3 / 1 | 4 | 4 |

- **Soglia abbassata a 15 minuti, e va detto.** L'orfano del banco era nato 24
  minuti prima (seminato da 52-01): con la soglia di 60 risultava **in volo** e lo
  strumento non lo toccava — il comportamento corretto. Per provare l'atto O si e'
  rilanciato con `--older-than-minutes 15`. **La soglia di produzione resta 60**,
  e lo strumento rifiuta un valore minore in produzione.
- **Le chiavi catturate erano quelle del banco**, controllato contro
  `.env.lab.seed.json` senza stamparle: O = `media.orphanPath`; R =
  `media.uploaded.normalRejected`; la foto pre-stripper (`media.prestripPath` /
  `prestripRowId`) fuori da entrambe.
- **Foto pre-stripper di 52-10 intatta**: oggetto presente e riga `approved` prima
  (13:42:33) e dopo (13:43:02).
- **Cascata**: zero vincoli pendono da `event_media` (`pg_constraint.confrelid`).
- **Secondo dry-run**: «zero soggetti», zero righe rejected confermato da due
  fonti (Management API 0 · PostgREST 0), exit 0, nessuna istantanea scritta.
- **Istantanee** (solo metadati): `.env.media-purge-snapshot.2026-09-23T13-42-17-219Z.json`,
  `…T13-42-33-895Z.json` (i due dry-run), `…T13-42-49-908Z.json` (quella
  dell'atto). Tutte e tre `git check-ignore` → ignorate; `git status` non le
  mostra.
- **Registro del banco**: in `.env.lab.seed.json` (copia principale riletta subito
  prima e riunita, non sovrascritta, poi ricopiata nel worktree) e' entrata
  `media.purged` con ora e chiavi rimosse, perche' `media.orphanPath` e
  `media.uploaded.normalRejected` ora non puntano piu' a nulla.

## Produzione: zero scritture, e oggi lo strumento si ferma prima di contare

Due corse `--dry-run` contro il ref di produzione, con una fixture
d'autorizzazione valida nella forma: entrambe si sono fermate con
**`[purge-media-orphans.schema_missing]`**, exit 1 — `event_media.storage_path`
**non esiste in produzione**, perche' M1 e' applicata solo al laboratorio (52-06;
in produzione la applica 52-15). La prima corsa, prima di aggiungere il
controllo di schema, era fallita con un `Management API HTTP 400` muto: e' da li'
che e' nato il controllo (deviazione 1). Letture solo `read_only: true`, nessuna
istantanea scritta, nessuna scrittura su oggetti o righe di produzione.

**Conseguenza per 52-16:** il ramo `count_drift` e la marcatura `spent` in
produzione **non sono stati eseguiti dal vivo** — non potevano, prima di M1 e
senza un atto reale. Il 52-01 ha contato zero righe e zero oggetti in
produzione: il giorno dell'atto lo strumento dovrebbe dire «zero soggetti» e non
consumare l'autorizzazione. Il dry-run di 52-16 va lanciato **dopo** 52-15.

## Verifica

- `node --check scripts/purge-media-orphans.mjs` → 0.
- `npm run build` → exit 0.
- Comandi di verifica del piano, task 1 e task 2: superati.
- **Non esiste un test runner**: nessuna affermazione su test. La prova e' la
  corsa sul laboratorio qui sopra, con i numeri presi da due fonti.

## Deviazioni dal piano

### Auto-fixed

**1. [Regola 2 - fallimento silenzioso] Controllo di schema prima del conteggio**
- **Trovato durante:** task 1, dry-run di sola lettura contro la produzione.
- **Problema:** senza `storage_path` l'interrogazione del conteggio falliva con
  `[purge-media-orphans.sql] Management API HTTP 400`, indistinguibile da un
  errore di sintassi o di permessi.
- **Correzione:** passo (0) che legge `information_schema.columns` e
  `to_regclass('storage.objects')` e fallisce con `schema_missing` e la ragione
  (M1 non applicata).
- **File:** `scripts/purge-media-orphans.mjs` · **Commit:** 3667854

### Aggiunte rispetto al testo del piano (restringono, non allargano)

- Orfano definito anche sulla coda dell'`url`, non solo su `storage_path`.
- Riverifica per chiave prima dell'atto (`key_changed`).
- `cascade_unhandled` se il catalogo mostra dipendenti di `event_media`.
- Righe rejected senza `storage_path` o gia' senza oggetto: contate, non toccate.
- `untouched_changed` su approvate, in attesa e loro oggetti.

## Known Stubs

Nessuno.

## Threat Flags

Nessuna superficie nuova oltre al `<threat_model>` del piano: T-52-39..44
mitigati come descritto (lista catturata + `AND status = 'rejected'` +
riconteggio approvate; soglia in volo; exit 2 prima di ogni lettura, `count_drift`,
`spent`; stdout senza chiavi; istantanea senza byte; riconteggio da fonte
diversa).

## Self-Check: PASSED

- `scripts/purge-media-orphans.mjs` — presente
- commit 3667854 — presente nel log del ramo
- `52-AUTHORISATION-MEDIA.md` — non creato; nessun file `.env*` in stage; STATE/ROADMAP non toccati
