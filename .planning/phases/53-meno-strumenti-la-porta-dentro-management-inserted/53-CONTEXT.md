# Phase 53: Meno strumenti, la porta dentro Management — Context

**Gathered:** 2026-10-14
**Status:** Ready for planning
**Source:** sezione «Phase 53» di `.planning/ROADMAP.md` (parole del proprietario alla lettera, CUT-01..06, D-53-01..03) + tre domande chiuse dal proprietario il 2026-10-14 dopo la ricerca (`53-RESEARCH.md`). Non c'e' stata una discuss-phase: la ROADMAP era gia' il contesto.

<domain>
## Phase Boundary

Quattro sezioni di lavoro — TASK, Location, Visual, Calendar — escono dalla piattaforma con tutto cio' che le tiene in piedi (rotte, pagine, pannello, server action, componenti, cron `production-mirror` e sue variabili, tipi, tabelle e colonne, script `verify:*`, voci del manifesto di conversione). Check-in entra nel pannello Management per `organizer` e `master`; per lo `staff` assegnato a una serata in corso resta in barra. In Venues si crea una sede dalla sezione, come in Artists. La persona segue la cancellazione, e i documenti che ancora difendono la community si riscrivono in fondo (CUT-06).

Fuori perimetro: `src/lib/offline/` e `DoorSurface` non si toccano; `/door` resta; nessuna superficie pubblica cambia (`venue-secrecy.md`).
</domain>

<decisions>
## Implementation Decisions

### Decise dal proprietario nella ROADMAP (non si riaprono)
- **D-53-01** — `staff` assegnato a una serata in corso: Check-in resta in barra (`Events · Check-in · Music · Account`). `organizer`/`master`: Check-in e' una voce del pannello Management con la stessa guardia `assignmentOpenable`/`door.operate`; la barra perde una voce. Lo staff non ha il pannello e non lo riceve.
- **D-53-02** — Il calendario di produzione non entra piu' nel prodotto: la fase 58 (specchio ICS) viene disfatta — cron `production-mirror`, voce in `vercel.json`, tre variabili `PRODUCTION_CALENDAR_FEED_*` su Vercel. I feed restano fuori dal repo.
- **D-53-03** — Cancellare e' per chiave e con riconteggio, mai `DROP` a cascata senza lettura prima; le migration passano dall'endpoint che annota il registro (`/database/migrations` della Management API, mai `/database/query`), prima sul laboratorio.

### Chiuse dal proprietario il 2026-10-14, dopo la ricerca
- **D-53-04 — Manifesto resta.** La sezione Manifesto (`/admin/manifesto`, chiave `production.manifesto.manage`, tabella `production_section`) non e' fra le quattro nominate e **non si cancella**. Visual ne importa sei moduli: si cancella solo Visual e cio' che e' solo suo. La policy `production_open_question_select_brandwide`, che oggi legge quattro chiavi, va riscritta per leggere solo quella di Manifesto **prima** di togliere le altre chiavi, altrimenti diventa un rifiuto permanente e silenzioso. `verify:section-surface` e `verify:section-export` restano, ristretti a Manifesto. `manifesto/actions.ts` smette di rivalidare `/admin/visual`.
- **D-53-05 — Nessuna copia prima di buttare.** Le foto del bucket `visual-archive` e le spunte delle checklist di TASK **non si esportano**: cadono con la cancellazione per chiave. Decisione irreversibile presa dal proprietario con la domanda posta in chiaro («Cancellati, non si recuperano»). Il piano non aggiunge un passo di esportazione; registra nel SUMMARY e nella VERIFICATION che la copia non e' stata chiesta.
- **D-53-06 — Check-in dello staff solo nella barra in basso.** La striscia in alto dello staff (`StaffNav`, `STAFF_TABS`) **non** riceve Check-in. Nessuna superficie nuova per lo staff: la porta si raggiunge come oggi.

### Vincoli tecnici fissati dall'orchestratore (dalla ricerca)
- **D-53-07** — `scripts/lab-apply-migration.mjs` oggi usa `/database/query`. Per D-53-03 la migration di questa fase passa da **`/database/migrations`** sia sul laboratorio sia in produzione: il piano adegua lo script (o ne aggiunge un percorso) **prima** di applicare, mantenendo il rifiuto del ref di produzione come prima riga eseguita. Prima della migration di produzione si **rilegge in sola lettura** il registro delle migration di produzione, per sapere se le precedenti vi sono annotate (la ricerca non l'ha verificato).
- **D-53-08** — Budget della persona: `verify:persona` misura oggi 14.943 token su 15.000 (caso peggiore `DoorSurface.tsx`). CUT-04 e CUT-06 modificano file caricati su quel caso peggiore (`CLAUDE.md`, `access-gating.md`, `meta-gates.md`): il saldo netto in byte di quelle modifiche deve essere **≤ 0**, e il numero rimisurato va nel changelog. Si taglia descrizione, mai regola.
- **D-53-09** — La guardia reale di `createVenue` e' `catalogue.manage` (la ROADMAP diceva `staff.manage`): CUT-03 riusa la guardia **che esiste**, senza allargarla. Il rifiuto tipizzato di `createVenue` (Q4 della ricerca) e' a discrezione del planner: si fa se costa un task, altrimenti si dichiara come debito nel SUMMARY.

### Claude's Discretion
- Ordine dei piani e delle onde dentro i vincoli: codice prima della migration, laboratorio prima della produzione, `verify:persona` **dopo** la cancellazione, CUT-06 nell'ultima onda.
- Forma del pezzo «Check-in» nel pannello Management (stessa primitiva delle altre voci del pannello della fase 52).
- Come riscrivere `conversion-manifest.mjs` e `verify-capabilities.mjs` ai nuovi conteggi (misurati, non ricordati).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Fase e ricerca
- `.planning/ROADMAP.md` — sezione `### Phase 53` (CUT-01..06, D-53-01..06, parole del proprietario)
- `.planning/phases/53-meno-strumenti-la-porta-dentro-management-inserted/53-RESEARCH.md` — inventario di cancellazione misurato (46 file, 11 tabelle, bucket, cron, env, script), barra e pannello, Venues/Artists, persona, Validation Architecture

### Cio' che si disfa
- `.planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/` — lo specchio ICS (58-VERIFICATION.md, 58-PROCEDURES.md)
- `.planning/phases/44-the-production-calendar-comes-inside/` — il calendario che entro' e ora esce

### Cio' che resta e si riusa
- `.planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-UI-SPEC.md` — contratto della barra (pillola, 360/375, pannello che scende)
- `.planning/phases/41-shared-primitives-three-tier-layout/41-UI-SPEC.md` — primitive condivise
- `.planning/phases/39-the-door-s-own-address/` — `/door`
- commit `31baf149` — creazione di un artista dalla pagina Artists (analogo esatto di CUT-03)
- `supabase/migrations/20261001120200_gallery_removal.sql` — modello di migration di sola rimozione con precondizioni a zero
- `.planning/phases/52.4-tier-misti-gratis-pagamento-nella-stessa-serata-e-ora-limite/52.4-VERIFICATION.md` — modello per CUT-05

### Persona
- `CLAUDE.md`, `.claude/rules/*.md`, `.claude/CHANGELOG.md`, `scripts/verify-persona.mjs`
</canonical_refs>

<specifics>
## Specific Ideas

- La ricerca ha misurato: 46 file tracciati escono interi; 11 tabelle + colonna `party_series.ics_alias`; nessuna tabella superstite ha FK verso quelle che escono; 3 chiavi e 6 concessioni cadono (restano 11 chiavi, 20 concessioni); `vercel.json` da 8 a 7 cron; `package.json` perde 8 voci (5 `verify:*`, da 29 a 24); 9 script escono; `seed-lab-door.mjs:547,551` dopo il `DROP` fallisce con `42P01` e va adeguato.
- Righe di persona che la ROADMAP non nominava e che vanno toccate: `ticketing-payments.md:45` («otto» cron con `production-mirror` nell'elenco), `media-and-storage.md` (archivio visual), `time-and-scheduling.md` (non nomina lo specchio: nulla da togliere li', ma il conteggio dei cron si rilegge).
- Dopo la migration di produzione niente Instant Rollback su Vercel: riporterebbe in vita il cron contro uno schema che non ha piu' le sue tabelle.
- Il service worker non precachea nessuna rotta che esce; `src/lib/offline/` a zero riferimenti: la porta non e' toccata, e il piano lo dichiara.
</specifics>

<deferred>
## Deferred Ideas

- Rifiuto tipizzato di `createVenue` se non entra in un task (D-53-09).
- Eventuale «chiedi un invito» o altra politica di community: resta da scrivere, non qui (`community-membership.md`).
</deferred>

---

*Phase: 53-meno-strumenti-la-porta-dentro-management-inserted*
*Context gathered: 2026-10-14 — ROADMAP + tre risposte del proprietario dopo la ricerca*
