---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 17
subsystem: persona + verifica di fase
tags: [persona, media, gallery, verification, cache, snapshots, checkpoint]
requires:
  - phase: 52-15
    provides: "M2 in produzione alle 18:29:08Z — il bucket dei media chiuso, l'inizio della finestra di cache"
  - phase: 52-16
    provides: "atto 2 ESAURITO a zero soggetti (R 0 · O 0 · P 0 · V 0); le 15 istantanee del laboratorio lasciate a questo piano"
provides:
  - "persona 1.26.0 — media-and-storage e access-gating rilette dal codice, con data"
  - "52-VERIFICATION.md, status passed, approvata dal proprietario alle 19:13:29Z"
  - "52-ESITI.md — sezione «La sonda di cache dopo la finestra (piano 52-17)»"
  - "le 9 voci d'istantanea locale del laboratorio cancellate per nome"
affects: [chiusura della fase 52]
tech-stack:
  added: []
  patterns:
    - "una sonda senza soggetto non si esegue e non si simula: si dichiara, con la lettura che prova l'assenza del soggetto"
    - "una rimozione locale si fa per nome, una voce per comando, e si rilegge"
key-files:
  created:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-VERIFICATION.md
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-17-SUMMARY.md
  modified:
    - .claude/rules/media-and-storage.md
    - .claude/rules/access-gating.md
    - .claude/CHANGELOG.md
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md
decisions:
  - "Persona 1.26.0: ogni riga corretta in media-and-storage.md porta la data 2026-09-23 e la frase di prima; access-gating.md nomina /gallery sotto gallery.view e dice che riaprirla al pubblico e' anche una migration (D-52-14)"
  - "La sonda anonima dopo la finestra di cache non e' stata eseguita in produzione perche' non ha soggetto: residuo zero per costruzione, l'unico residuo misurato resta quello del laboratorio (62 min oltre M2)"
  - "Verifica di fase approvata dal proprietario (`approvata`, 19:13:29Z); le 9 istantanee locali del laboratorio cancellate alla stessa ora, per suo atto"
metrics:
  duration: "~30 min di esecuzione (sonda 18:48:05Z → approvazione registrata 19:13:29Z), piu' l'attesa al checkpoint"
  completed: 2026-09-23
---

# Phase 52 Plan 17: la persona riletta, la sonda dopo la finestra, la verifica approvata Summary

La persona smette di descrivere una gallery pubblica che non c'e' piu' (1.26.0,
`verify:persona` verde **dopo** le modifiche), la sonda di cache dopo la
finestra si chiude **dichiarando che non ha soggetto** invece di simularne uno,
e `52-VERIFICATION.md` — sette requisiti chiusi, trentuno decisioni senza
contraddizioni — e' stata **approvata dal proprietario** (`approvata`,
19:13:29Z). Alla stessa ora sono state cancellate, per nome, le nove voci
d'istantanea locale del laboratorio.

## Tasks

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | La persona riletta dal codice, CHANGELOG 1.26.0, `verify:persona` dopo | a33e40ec | `.claude/rules/media-and-storage.md`, `.claude/rules/access-gating.md`, `.claude/CHANGELOG.md` |
| 2 | La sonda dopo la finestra, e `52-VERIFICATION.md` con le prove | 25248cc0 | `52-ESITI.md`, `52-VERIFICATION.md` |
| 3 | Checkpoint: verifica approvata, istantanee locali cancellate a ora scritta | d7531634 | `52-VERIFICATION.md` |

## Cosa e' stato fatto

**Task 1 — la persona.** `media-and-storage.md` diceva tre cose false dal
2026-09-23: bucket dei media pubblico letto con l'indirizzo pubblico, nessuna
sanitizzazione dei metadati, upload per un utente approvato. Ora dice: bucket
privato (citando la migration che lo chiude), righe approvate visibili solo con
`gallery.view`, firma dalla sessione; lo stripper delle foto esiste, quello dei
video no; la moderazione e' rimozione, con la funzione di cancellazione ancora
senza chiamanti; chi carica e' chi ha `staff.manage` o `media.upload` sulla
serata. Ogni correzione porta la data e la frase che sostituisce.
`access-gating.md` nomina la navigazione per capability al posto della lista
fissa, e `/gallery` sotto `gallery.view`.

**Context budget, rimisurato dopo:** caso peggiore `DoorSurface.tsx`
**13.812 / 15.000** token (margine 1.188); pagina di moderazione dei media
**13.280** (margine 1.720). `verify:persona` exit 0, 7/7.

**Task 2 — la sonda e la verifica.** La sonda anonima su un oggetto approvato
di produzione, dopo la finestra, **non ha soggetto**: lettura in sola lettura
alle 18:48:05Z, zero righe, zero oggetti, bucket privato. Il residuo di cache in
produzione e' zero per costruzione — il bucket non ha mai contenuto un oggetto
mentre era pubblico. L'unico residuo misurato resta quello del laboratorio:
servito senza firma 62 minuti dopo M2, oltre il `max-age` — il bordo della CDN
non segue il `max-age` e chiudere il bucket non lo invalida. E' debito
dichiarato per **la prossima volta** che si chiude un bucket con contenuto.
`52-VERIFICATION.md`: NAV-01..07 chiusi, D-52-01..31 senza contraddizioni,
69 citazioni `file:riga` rilette il giorno stesso, debito e cinque passi di
procedura non percorsi dichiarati (fra cui l'annullamento alla porta con un QR
vero, identico nel codice ma non toccato dopo lo spostamento).

**Task 3 — il checkpoint.** Risposta letterale del proprietario: `approvata`,
registrata alle 2026-09-23T19:13:29Z. Frontmatter di `52-VERIFICATION.md`:
`status: passed`, `approval: approvata — il proprietario, 2026-09-23T19:13:29Z`.

## I gate e le loro uscite

| Gate | Uscita |
|---|---|
| `npm run build` | exit 0 (registrato in `52-VERIFICATION.md`) |
| `npm run verify:persona` | exit 0, 7/7, lanciato **dopo** le modifiche alla persona |
| `VERIFY_OK` | 24 |
| `verify:capabilities` contro la produzione | 5/5 |
| `verify:refusal` | RIFIUTATO, su 0 media — un rifiuto senza soggetto, dichiarato come tale |
| Cancellazione istantanee | 9 voci / 15 file prima, rilettura vuota dopo |

**Non esiste un test runner per il prodotto**: nessuna di queste righe e'
«i test passano».

## Deviations from Plan

### 1. [Esito a zero soggetti] La sonda di cache dopo la finestra non e' stata eseguita
- **Found during:** Task 2
- **Issue:** la verità del piano chiedeva che «la sonda anonima su un oggetto
  approvato di produzione non risponde 200». In produzione non esiste alcun
  oggetto approvato, ne' ne e' mai esistito uno mentre il bucket era pubblico.
- **Cosa si e' fatto:** la lettura che prova l'assenza del soggetto (18:48:05Z),
  scritta in `52-ESITI.md`; il residuo e' dichiarato «zero per costruzione», e
  il solo residuo misurato resta quello del laboratorio. Non si e' creato un
  oggetto in produzione per avere qualcosa da sondare: sarebbe una scrittura
  fuori da ogni atto.
- **Commit:** 25248cc0

### 2. [Per costruzione] `spent: no` nei due blocchi dell'atto 2
- Ereditato dal piano 52-16 e riportato in `52-VERIFICATION.md`: con zero
  soggetti gli strumenti escono 0 senza consumare il blocco, e il campo non si
  scrive a mano. L'atto e' esaurito per data.

### 3. [Atto del proprietario] La cancellazione delle istantanee locali
- Non e' una scelta dell'esecutore: e' la seconda meta' della risposta
  `approvata`. Cancellate **per nome**, un `rm` (o `rm -r`) per voce, nessun glob.
- **Precondizione riletta:** il controllo «nessun `.env.*` tracciato» restituiva
  **1**, non 0. Il file tracciato e' `.env.local.example`, il modello delle
  variabili presente dalla fase 17, non un'istantanea; il controllo ristretto
  alle due famiglie d'istantanea restituisce **0**. Registrato in
  `52-VERIFICATION.md`, non arrotondato.
- **Fuori perimetro, non toccate:** sei `.env.attendances-snapshot.*` del
  2026-09-22 (fase 51) stanno ancora nella radice. La risposta del proprietario
  copriva le nove di questa fase: le altre restano, ed e' una decisione ancora
  da prendere.
- `.env.local`, `.env.lab.local`, `.env.lab.seed.json` intatti.
- **Commit:** d7531634

## Known Stubs

Nessuno: il piano tocca solo persona e documenti di verifica.

## Self-Check: PASSED

- FOUND: `.planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-VERIFICATION.md` (status: passed)
- FOUND: `.claude/CHANGELOG.md`, `.claude/rules/media-and-storage.md`, `.claude/rules/access-gating.md`
- FOUND: commit a33e40ec, 25248cc0, d7531634
- MISSING (atteso): le nove voci d'istantanea, rilette assenti alle 19:13:29Z
