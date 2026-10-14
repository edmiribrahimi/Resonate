---
phase: 53-meno-strumenti-la-porta-dentro-management-inserted
plan: 03
subsystem: verification-procedures, lab-tooling
tags: [procedures, lab, management-api, migrations-registry, CUT-05, D-53-07]
requires:
  - phase: 53-01
    provides: Calendar, Location, Visual fuori dal codice (P-53-A le misura)
  - phase: 53-02
    provides: «New venue» e rifiuto tipizzato (P-53-E li misura)
provides:
  - "53-PROCEDURES.md — Prima di cominciare + P-53-A..G, da percorrere nel piano 53-10"
  - "scripts/lab-apply-migration.mjs — applica da /database/migrations e rilegge il registro prima e dopo"
affects: [53-08, 53-10, 53-11]
tech-stack:
  added: []
  patterns:
    - "read_only fisso a true nella funzione di lettura: /database/query non puo' piu' scrivere da questo script"
    - "registro letto prima (rifiuta se annotato) e dopo (rifiuta se assente)"
key-files:
  created:
    - .planning/phases/53-meno-strumenti-la-porta-dentro-management-inserted/53-PROCEDURES.md
  modified:
    - scripts/lab-apply-migration.mjs
key-decisions:
  - "Fase 53-03: lab-apply-migration applica solo da POST /database/migrations; /database/query resta per le riletture con read_only fisso a true (D-53-03, D-53-07)"
  - "Fase 53-03: un nome gia' annotato nel registro del lab rifiuta con exit 2 senza applicare; un nome fuori forma (14 cifre + minuscole) rifiuta prima della rete"
requirements-completed: []  # CUT-05 si chiude quando il piano 53-10 percorre le procedure
duration: ~10min
completed: 2026-10-14
---

# Fase 53 Piano 03: le procedure prima dell'esecuzione, e lo script del lab che annota il registro — Summary

**`53-PROCEDURES.md` con P-53-A..G passo per passo (ruolo, indirizzo, cosa si osserva) e `lab-apply-migration.mjs` che applica da `/database/migrations`, rilegge il registro prima e dopo, e rifiuta ancora la produzione come prima cosa.**

## Cosa e' stato fatto

**Task 1 — `53-PROCEDURES.md`** (commit `5e2fb389`)
- «Prima di cominciare»: lab sveglio (NXDOMAIN = progetto in pausa, restore dal Management API), ramo `lab` su `lab.resonatemotion.com` o `dev:lab` sulla porta 3100 con `rm -rf .next/dev`, account del seme per ruolo, login headless (`generateLink` + `verifyOtp` + cookie, attendere l'idratazione), esiti in `53-ESITI.md`.
- P-53-A superfici tolte (cinque indirizzi, 404 o redirect da annotare; `production-mirror` → 404, un 401 e' rosso; `/admin/manifesto` 200; pannello senza Calendar/Location/Visual/TASK).
- P-53-B la barra per sei soggetti, con la tabella delle colonne di `52.3-19-SUMMARY.md` piu' «Check-in nel pannello»; dichiarazione esplicita che si tratta di visibilita': predicato della porta (D-53-01) e `StaffNav` (D-53-06) invariati. Nota sullo staff assegnato a una serata futura.
- P-53-C Check-in da Management (organizer, master, staff assegnato, `/admin/scanner`).
- P-53-D prova statica (`git diff --stat` sul perimetro offline vuoto; middleware «solo commenti» = `0`) piu' corsa offline su `pixel_lab` (coda, drain, annullamento) e avviso di runbook sul service worker.
- P-53-E sede da Venues con dati inventati, rifiuti, pagina pubblica senza indirizzo, `verify:venue-surfaces`, pulizia o dichiarazione.
- P-53-F schema in sola lettura (dieci tabelle, 11 chiavi, 20 concessioni, brandwide sulla sola chiave del manifesto, bucket, registro).
- P-53-G Vercel (sette cron; il passo `vercel env ls` di produzione e' del 53-11).
- Chiusura: cosa non provano, divieti (niente produzione, niente `verify:refusal`, niente `/database/query` per applicare).

**Task 2 — `scripts/lab-apply-migration.mjs`** (commit `c81587b1`)
- Applicazione: `api("/database/migrations", { method: "POST", body: JSON.stringify({ name, query: sql }) })`.
- Registro prima e dopo con `select name, version from supabase_migrations.schema_migrations where name = '<name>'`, `read_only: true`; nome validato da `/^[0-9]{14}_[a-z0-9_]+$/`.
- Sette categorie d'errore distinte, ognuna con exit non zero: `bad_name`, `registry_read_failed`, `already_registered`, `apply_failed`, `not_registered`, `bad_column`, `catalogue_read_failed`.
- Docblock riscritto: perche' l'endpoint (D-53-03, D-53-07, la 52.4 in produzione passata da `/database/query`), e che in produzione la POST la fa il piano 53-11, mai questo script.

## Il rifiuto della produzione e' ancora la prima riga eseguita

```js
const PRODUCTION_REF = "<ref di produzione, non ricopiato qui>";   // riga 53
const REF = process.env.LAB_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!REF || !TOKEN) { ...; process.exit(2); }
if (REF.trim() === PRODUCTION_REF) { console.error("RIFIUTO: ..."); process.exit(2); }
```

`awk` del piano: `ref=53 argv=58 fetch=72` — il rifiuto precede la lettura degli argomenti e ogni `fetch`. (Il ref di produzione era gia' nel file prima di questo piano; non e' un'aggiunta.)

## Verifica

Nessun test runner nel repo. Nessuna chiamata di rete eseguita: tutte le prove sotto escono prima di ogni `fetch`.

- `node --check scripts/lab-apply-migration.mjs` → `sintassi`.
- `/database/query` compare una sola volta nel codice (riga 79), con `read_only: true` fisso (riga 81); `/database/migrations` alla riga 109.
- Senza variabili d'ambiente → «LAB_PROJECT_REF o SUPABASE_ACCESS_TOKEN assenti.», `exit=2`.
- Con il ref di produzione (anche con un a capo finale) → «RIFIUTO: …», `exit=2`.
- Con un ref fittizio e `x.sql` → `[lab-apply-migration.bad_name]`, `exit=2`, prima della rete.
- Grep del Task 1: P-53-A..G `3 2 1 2 1 1 2` (tutti ≥ 1); `D-53-0x` = 17 righe; email/UUID → solo le due righe con l'UUID nullo.

## Deviazioni dal piano

**1. [Commit] Due commit invece di uno.** Il piano chiedeva un solo commit `chore(53-03)` con documento e script; l'orchestratore chiede un commit per task. Ho seguito l'orchestratore: `5e2fb389` (docs, procedure) e `c81587b1` (chore, script, con il messaggio del piano).

**2. [Rule 2 - Sicurezza] Rifiuto del ref con `.trim()`.** Il confronto ora e' `REF.trim() === PRODUCTION_REF`: una variabile con a capo finale (precedente registrato il 2026-10-13 su `NEXT_PUBLIC_SUPABASE_URL`) avrebbe aggirato l'uguaglianza esatta. Rafforza la guardia, non la sposta.

**3. [Rule 2 - Zero fallimenti silenziosi] Due categorie in piu'.** Oltre alle quattro richieste: `registry_read_failed` (lettura del registro rifiutata, exit 1 — altrimenti un HTTP d'errore sarebbe stato letto come «non annotata» e si sarebbe applicato alla cieca) e `catalogue_read_failed`; la colonna malformata ha ora la categoria `bad_column`.

## Note per i piani successivi

- **Una migration storica non passa la regex del nome:** `20260224_rbac_migration` (8 cifre). Irrilevante per la 53-08 (migration nuova, nome a 14 cifre), ma lo script non puo' riapplicarla: e' voluto.
- Lo script non e' mai stato eseguito contro un progetto: la prima corsa vera e' del piano 53-08.

## Known Stubs

Nessuno.

## Self-Check: PASSED

- FOUND: `.planning/phases/53-meno-strumenti-la-porta-dentro-management-inserted/53-PROCEDURES.md`
- FOUND: `scripts/lab-apply-migration.mjs`
- FOUND: `5e2fb389`, `c81587b1`
