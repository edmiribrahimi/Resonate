---
phase: 53
slug: meno-strumenti-la-porta-dentro-management-inserted
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-14
revised: 2026-10-14
---

# Phase 53 — Validation Strategy

> Contratto di validazione della fase, derivato da `53-RESEARCH.md` § *Validation Architecture* e dai `<verify>` dei 13 piani (revisione 1).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **Nessuno — nessun test runner nel repo.** `package.json` non ha uno script `test`, non esiste alcun `*.test.*`/`*.spec.*`. Nessuna modifica si dichiara verificata perche' «i test passano» |
| **Config file** | `scripts/verify-all.mjs` (aggregatore dei gate `verify:*`, con riconciliazione in due direzioni contro `package.json`) |
| **Quick run command** | `npm run build` (include il typecheck di Next) |
| **Full suite command** | `npm run build && npm run verify && npm run verify:persona` + procedure manuali P-53-A..G percorse sul laboratorio (`53-PROCEDURES.md`) |
| **Estimated runtime** | build ~2-4 min; `npm run verify` ~1-3 min (alcuni gate leggono il database del laboratorio); `verify:persona` < 10 s; grep di CUT-01 < 5 s |

---

## Sampling Rate

- **Dopo ogni commit di codice:** `npm run build` (eccezione dichiarata: il commit «1/2» del piano 53-01 e' rosso per costruzione; il «2/2» lo porta a verde).
- **Dopo ogni onda:** `npm run verify`. Dal piano 53-05 al piano 53-11 `verify:capabilities` e' **rosso per costruzione** (database a 14/26, codice a 11/20) e riconosciuto per forma con la riga `DECLARED RED INTERVAL (phase 53`; ogni altro rosso e' un difetto.
- **Nelle onde che toccano la persona (53-13, 53-09, 53-12):** `npm run verify:persona`, **dopo** le cancellazioni, con il caso peggiore riportato e il saldo in byte <= 0 sulla BASE DELLA FASE (`53-13-SUMMARY.md`).
- **Prima di `/gsd:verify-work`:** suite completa verde (con `verify:capabilities` verde solo dopo la migration di produzione) + P-53-A..G percorse e scritte in `53-ESITI.md`.
- **Latenza massima del feedback:** quella di `npm run build`; i task con solo grep/`node --check` rispondono in secondi.

---

## Per-Task Verification Map

Pattern del grep di CUT-01: P1 e P2 in `53-01-PLAN.md` (contesto), con P2 allargato in revisione ai nomi dei componenti uscenti; i nomi degli script in `53-05-PLAN.md`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 53-01-01 | 01 | 1 | CUT-01 | T-53-03 | lapidi senza identificatori, nessun dato di Location | statico | dieci percorsi assenti + grep P2 su `database.ts`, `sections/vocabulary.ts` = 0 | ✅ | ⬜ pending |
| 53-01-02 | 01 | 1 | CUT-01 | T-53-53 | commit «1/2» rosso dichiarato, mai spinto | statico | grep `revalidatePath("/admin/visual")` = 0, `outputFileTracingIncludes` = 0, `cacheOnNavigation: false` = 1 | ✅ | ⬜ pending |
| 53-01-03 | 01 | 1 | CUT-01 | T-53-01, T-53-02 | voce `door.operate` intatta; diff vuoto su offline/sw/middleware/scanner | build + statico | `npm run build` = 0; grep P1 sui tre file = 0; `alsoGatesTables` = 5 | ✅ | ⬜ pending |
| 53-02-01 | 02 | 1 | CUT-03 | T-53-06 | nessuna superficie pubblica cambia | statico | `NewVenueButton.tsx` esiste ed e' montato in Venues | ✅ | ⬜ pending |
| 53-02-02 | 02 | 1 | CUT-03 | T-53-07..09 | guardia `catalogue.manage` riusata (D-53-09); un rifiuto per causa | build + statico | `npm run build` = 0; `CreateVenueResult`/`CreateVenueRefusal` presenti | ✅ | ⬜ pending |
| 53-03-01 | 03 | 1 | CUT-05 | T-53-10 | procedure senza persone, sedi o id | documento | `P-53-A..G` presenti in `53-PROCEDURES.md` (sette conteggi >= 1) | ❌ W0 | ⬜ pending |
| 53-03-02 | 03 | 1 | CUT-05, CUT-01 | T-53-11, T-53-12 | lo script rifiuta il ref di produzione; migration annotata | statico | `node --check scripts/lab-apply-migration.mjs`; `database/migrations` presente | ✅ | ⬜ pending |
| 53-04-01 | 04 | 2 | CUT-02 | T-53-13, T-53-14 | solo visibilita': nessun controllo d'accesso nuovo o tolto | statico | grep `TASK`/`disabled` in `roles.ts` = 0; `label: "Check-in"` nel pannello | ✅ | ⬜ pending |
| 53-04-02 | 04 | 2 | CUT-02 | T-53-15, T-53-16 | `inPanel` vero sulla porta solo per ruolo | build + statico | `npm run build` = 0; grep `TASK`/`disabled` in `AppNav.tsx` = 0 | ✅ | ⬜ pending |
| 53-05-01 | 05 | 2 | CUT-01 | T-53-17 | riconciliazione `verify-all.mjs` intatta | statico | `rg -c '"verify:' package.json` = 24; nove script assenti | ✅ | ⬜ pending |
| 53-05-02 | 05 | 2 | CUT-01 | T-53-17 | controlli tolti solo con la superficie | gate | `verify-section-surface`, `verify-section-export`, `verify:conversion` = 0 | ✅ | ⬜ pending |
| 53-05-03 | 05 | 2 | CUT-01, CUT-05 | T-53-18, T-53-19 | `verify:refusal` mai eseguito; rosso riconosciuto per forma senza nominare le chiavi | gate | `EXPECTED_KEY_COUNT = 11`; `DECLARED RED INTERVAL (phase 53`; `npm run verify` con il solo rosso dichiarato | ✅ | ⬜ pending |
| 53-06-01 | 06 | 2 | CUT-01 | T-53-21 | solo prosa | build + statico | `npm run build` = 0; grep P1+P2 su Manifesto = 0 | ✅ | ⬜ pending |
| 53-06-02 | 06 | 2 | CUT-01 | T-53-20, T-53-22 | middleware: solo commenti, zero righe non-commento nel diff; rivelazione identica | build + statico | righe non-commento nel diff dei tre file Critical = 0 | ✅ | ⬜ pending |
| 53-13-01 | 13 | 2 | CUT-04, CUT-01 | T-53-51 | nessun cron senza route | statico | `rg -c '"path"' vercel.json` = 7 = `ls src/app/api/cron \| wc -l` | ✅ | ⬜ pending |
| 53-13-02 | 13 | 2 | CUT-04 | T-53-05, T-53-52 | persona e `vercel.json` nello stesso commit | persona | `npm run verify:persona` = 0; «Scenario di carico e scatto» >= 2 nella voce 1.33.1 | ✅ | ⬜ pending |
| 53-07-01 | 07 | 3 | CUT-01 | T-53-23..25 | precondizioni a zero, nessuna `CASCADE`, policy prima delle chiavi | statico | `BEGIN;` presente, `cascade` = 0 nella migration | ✅ | ⬜ pending |
| 53-07-02 | 07 | 3 | CUT-01 | T-53-26, T-53-27 | atto per chiave, solo conteggi, grant consumabile | statico | `node --check scripts/purge-production-tools.mjs`; rifiuto senza env | ✅ | ⬜ pending |
| 53-07-03 | 07 | 3 | CUT-01 | T-53-28 | zero riferimenti residui | statico + build | grep P1+P2 su `src scripts vercel.json package.json next.config.ts` → solo lo script di rimozione; `npm run build` = 0 | ✅ | ⬜ pending |
| 53-08-01 | 08 | 4 | CUT-01, CUT-05 | T-53-29 | codice prima dello schema; `main` invariato; ritorno al ramo feat | piattaforma | `git merge-base --is-ancestor feat/53-meno-strumenti lab`; deploy `READY` in `53-ESITI.md` | ✅ | ⬜ pending |
| 53-08-02 | 08 | 4 | CUT-01 | T-53-30, T-53-31 | nessun id o path nel documento pubblico | database (lab) | `dry-run`/`--apply`/`Bucket not found` in `53-ESITI.md`; zero UUID | ✅ | ⬜ pending |
| 53-08-03 | 08 | 4 | CUT-01 | T-53-32 | **[BLOCKING]** migration annotata nel registro del lab | database (lab) | nome della migration in `53-ESITI.md`; P-53-F | ✅ | ⬜ pending |
| 53-09-01 | 09 | 5 | CUT-04 | T-53-33, T-53-35 | criteri, mai candidati | persona | «14 chiavi e 26 concessioni» = 0; `Sei moduli sono senza` = 1; meta-gates/checkin-offline non modificati | ✅ | ⬜ pending |
| 53-09-02 | 09 | 5 | CUT-04 | T-53-34 | budget <= base | persona | `npm run verify:persona` = 0; «Scenario di carico e scatto» >= 4 nella voce 1.34.0 | ✅ | ⬜ pending |
| 53-10-01 | 10 | 6 | CUT-01..03, CUT-05 | T-53-36, T-53-37 | prove solo sul laboratorio | manuale (CDP) | P-53-A/B/C/E in `53-ESITI.md` | ✅ | ⬜ pending |
| 53-10-02 | 10 | 6 | CUT-02, CUT-05 | T-53-38 | la porta offline invariata | manuale (emulatore) + statico | diff vuoto su offline/sw/DoorSurface/`src/middleware.ts`; middleware Supabase solo commenti; P-53-D | ✅ | ⬜ pending |
| 53-10-03 | 10 | 6 | CUT-02, CUT-03 | T-53-39 | revisione del proprietario dal telefono | checkpoint | risposta del proprietario in `53-ESITI.md` | ✅ | ⬜ pending |
| 53-11-01 | 11 | 7 | CUT-01, CUT-05 | T-53-40, T-53-41 | numeri di produzione in sola lettura, prima della domanda | documento | blocco `purge-production-tools: grant` in `53-AUTHORISATION.md` | ✅ | ⬜ pending |
| 53-11-02 | 11 | 7 | CUT-01 | T-53-42 | «vai» datato di prima mano | checkpoint | `granted`/`granted_on` coincidono con la risposta | ✅ | ⬜ pending |
| 53-11-03 | 11 | 7 | CUT-01, CUT-05 | T-53-43..45 | NON DELEGABILE; solo il perimetro concesso; niente Instant Rollback | produzione | `npm run verify:capabilities` = 0 dopo la migration; `ESAURITA` | ✅ | ⬜ pending |
| 53-12-01 | 12 | 8 | CUT-06 | T-53-46, T-53-47 | nessuna politica d'ammissione inventata | persona + documento | `fase 57` = 0; frase del vecchio Core Value = 0 in PROJECT/STATE | ✅ | ⬜ pending |
| 53-12-02 | 12 | 8 | CUT-01, CUT-06 | T-53-48 | lo strumento di cancellazione esce dopo l'atto | statico + suite | grep CUT-01 = 0; `build`, `verify`, `verify:persona` = 0 | ✅ | ⬜ pending |
| 53-12-03 | 12 | 8 | CUT-05 | T-53-49, T-53-50 | evidenza `file:riga`, nessun dato privato | documento | CUT-01..06 e D-53-01..09 presenti; citazioni `file:riga` >= 12 | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Nessun framework da installare: l'onda 0 e' **documentale e di strumento**, ed e' coperta dal piano 53-03 (onda 1) piu' il pattern fissato nel 53-01.

- [ ] `53-PROCEDURES.md` con P-53-A..G passo per passo (ruolo, indirizzo, cosa si osserva) — piano 53-03, Task 1
- [ ] `scripts/lab-apply-migration.mjs` su `POST /database/migrations` con lettura del registro (D-53-07) — piano 53-03, Task 2
- [ ] Pattern del grep di CUT-01 (P1 + P2 con i nomi dei componenti uscenti) fissato in `53-01-PLAN.md` — gia' scritto in revisione 1
- [ ] Risposte del proprietario Q1–Q3 — chiuse in `53-CONTEXT.md` (D-53-04..06)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Superfici tolte non raggiungibili, Manifesto vivo | CUT-01 | serve una sessione `master` vera sul laboratorio | P-53-A in `53-PROCEDURES.md` |
| Barra per ruolo a 360/375 senza traboccamento | CUT-02 | misura di layout in un browser mobile | P-53-B (Chrome headless via CDP, DPR 2) |
| Check-in raggiunto da Management | CUT-02 | navigazione con ruolo | P-53-C |
| La porta offline come prima | CUT-02 | rete spenta su un dispositivo | P-53-D (emulatore Android) + diff statico |
| Sede creata da Venues, segretezza per serata intatta | CUT-03 | scrittura e rilettura da anonimo | P-53-E + `npm run verify:venue-surfaces` |
| Schema e storage tolti | CUT-01 | catalogo del database vivo | P-53-F (lab nel 53-08, produzione nel 53-11) |
| Cron ed env tolti | CUT-01 | piattaforma Vercel | P-53-G (produzione, piano 53-11) |
| Barra e Venues guardate dal proprietario | CUT-02, CUT-03 | decisione visiva del proprietario | piano 53-10, Task 3, dal telefono sul laboratorio |

---

## Validation Sign-Off

- [x] Ogni task ha un `<automated>` (anche i checkpoint: grep sul documento che registra la risposta)
- [x] Continuita' del campionamento: nessuna sequenza di 3 task consecutivi senza verifica automatica
- [x] L'onda 0 copre ogni riferimento mancante (procedure, script del lab, pattern del grep)
- [x] Nessun flag watch-mode
- [x] Latenza del feedback: quella di `npm run build`, la piu' lunga della suite rapida
- [x] `nyquist_compliant: true` nel frontmatter

**Approval:** pending — il piano si convalida con l'esecuzione; la prova e' `53-VERIFICATION.md` (piano 53-12).
