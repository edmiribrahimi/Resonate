---
phase: 53-meno-strumenti-la-porta-dentro-management-inserted
document: procedure manuali — Prima di cominciare e P-53-A..G
written: 2026-10-14
written_by: piano 53-03
walked: —
walked_by: piano 53-10 (laboratorio); il passo di produzione di P-53-G e' del piano 53-11
environment: laboratorio
production: nessuna — la produzione e' il piano 53-11
procedures: 7
status: SCRITTA, NON PERCORSA — gli esiti vanno in 53-ESITI.md
requirements: [CUT-01, CUT-02, CUT-03, CUT-05]
decisions: [D-53-01, D-53-02, D-53-03, D-53-04, D-53-06, D-53-07, D-53-09]
---

# Fase 53 — Le procedure

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un
> repository pubblico. Qui si nominano **ruoli** — *un `organizer`*, *un
> `master`*, *uno `staff` assegnato alla porta*, *uno `staff` non assegnato*,
> *un `attendee`*, *un visitatore anonimo* — e **indirizzi di pagina**, mai
> persone. Nessun riferimento di progetto (si scrivono i NOMI
> `LAB_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `CRON_SECRET`, mai i valori),
> nessun indirizzo di posta, nessun identificativo di riga, nessuna sede reale,
> nessuna data non annunciata. L'unico UUID che compare e' quello **nullo**,
> usato apposta per chiedere una pagina di dettaglio che non puo' esistere.
>
> **Scritte PRIMA di essere percorse.** Questo documento e' del piano 53-03,
> scritto dopo che i piani 53-01 e 53-02 hanno tolto Calendar, Location e
> Visual dal codice e messo «New venue» in Venues, ma **prima** del cambio
> della barra (53-04/53-06), della migration (53-07/53-08) e di `vercel.json`
> (53-13). La colonna «cosa si e' visto» sta in `53-ESITI.md`, accanto al passo,
> con l'ora UTC e lo sha servito. Riempirla in anticipo, o con una lettura del
> codice al posto di uno schermo, e' una prova falsa.
>
> **Si percorrono sul laboratorio, mai in produzione** (`meta-gates.md`, *il
> gate della verifica*). Non esiste un test runner per il prodotto: accesso,
> porta e sede segreta si verificano solo cosi'. Ogni passo dice **chi** lo fa,
> **dove** e **cosa si deve osservare**.
>
> **Un passo che non si puo' percorrere si scrive NON PERCORSO, con la
> ragione** — mai «passato», mai sostituito da una lettura del codice senza
> dirlo.
>
> **Chi percorre.** Tutto cio' che si fa con il laboratorio, una sessione
> headless e l'emulatore Android lo fa l'assistente. Al proprietario resta solo
> cio' che e' fisico (un telefono vero alla porta, se l'emulatore non basta) e
> le decisioni.

---

## Prima di cominciare

1. **Il laboratorio e' sveglio.** Il progetto di laboratorio va in pausa dopo
   una settimana senza uso. Sintomo: `NXDOMAIN` sul suo host Supabase — non e'
   la rete, e' il progetto `INACTIVE`. Si legge lo stato dal Management API con
   `SUPABASE_ACCESS_TOKEN` e `LAB_PROJECT_REF` (da `.env.lab.local`, ignorato da
   git) e, se in pausa, si chiede il restore dallo stesso API; si aspetta lo
   stato `ACTIVE_HEALTHY` prima di ogni passo. **Prima riga di ogni script di
   laboratorio: il rifiuto del ref di produzione** (`v1.6-LAB-DESIGN.md`).
2. **Il codice servito e' quello del ramo.** Il ramo `lab` porta il commit da
   provare ed e' deployato su `lab.resonatemotion.com`; si annota lo sha
   servito. In alternativa, dev server locale con `npm run dev:lab` **sulla
   porta 3100** (la 3000 e' occupata da Docker), con `rm -rf .next/dev` a ogni
   cambio di ramo: la cache di sviluppo puo' servire rotte che non esistono
   piu' (Pitfall 10 della ricerca) — su P-53-A darebbe un falso 200.
3. **Account per ruolo, dal seme.** Dai semi `scripts/seed-lab-door.mjs` e del
   piano 52.3-06: un `attendee`; uno `staff` **assegnato alla porta** di una
   serata di prova in corso; uno `staff` **non assegnato**; un `organizer`; un
   `master`. Nessuna credenziale si scrive qui ne' in `53-ESITI.md`: gli
   account si nominano per ruolo.
4. **Login headless senza password.** `generateLink` (tipo magic link) con la
   chiave di servizio del laboratorio, poi `verifyOtp` con il token ricevuto,
   poi il cookie `sb-<ref>-auth-token` sul dominio servito. Prima di inviare un
   form si **aspetta l'idratazione** della pagina: un submit prima
   dell'idratazione e' un POST HTML che non chiama la server action.
5. **Browser.** Chrome headless via CDP, profilo isolato, porta letta dal log.
   Per le misure del telefono: `mobile: true`, DPR 2.
6. **Gli esiti.** Ogni passo in `53-ESITI.md`: identificativo del passo
   (`P-53-B.4`), ora UTC, sha servito, cosa si e' visto, esito. Gli id di riga
   creati durante la prova vanno **solo nello scratchpad della sessione**, mai
   nel repo.

---

## P-53-A — Superfici tolte

**Requisito:** CUT-01 (D-53-02, D-53-04). **Ruolo:** `master`.
**Scopo:** le tre superfici di produzione e lo specchio non esistono piu', e
Manifesto e' rimasto.

1. Da `master`, aprire `/admin/calendar`. **Osservare:** 404 **oppure** redirect
   del middleware (la rotta non esiste e `resolveRoute` risolve `null`).
   Annotare **quale** dei due, con lo status HTTP e l'URL finale.
2. Stessa cosa per `/admin/calendar/00000000-0000-0000-0000-000000000000`.
3. Stessa cosa per `/admin/location`.
4. Stessa cosa per `/admin/location/00000000-0000-0000-0000-000000000000`.
5. Stessa cosa per `/admin/visual`.
6. `GET /api/cron/production-mirror` con intestazione
   `Authorization: Bearer $CRON_SECRET` del laboratorio. **Osservare:** 404. Un
   401 vorrebbe dire che la route esiste ancora e rifiuta il segreto: e' un
   esito **rosso**, non un passo superato.
7. Da `master`, aprire `/admin/manifesto`. **Osservare:** 200, la pagina mostra
   le sue sezioni (D-53-04: Manifesto resta).
8. Da `master`, aprire il pannello **Management** (foglio a 375, colonna a
   1280). **Osservare:** nessuna riga Calendar, Location, Visual ne' TASK.
9. Stessi passi 1 e 5 da `organizer`: stesso esito (la rotta non esiste per
   nessuno, non e' una questione di ruolo).

**In `53-ESITI.md`:** per ogni indirizzo, status e URL finale; l'elenco delle
righe del pannello come lette dal DOM.

---

## P-53-B — La barra per ruolo

**Requisito:** CUT-02 (D-53-01, D-53-06). **Ruoli:** anonimo, `attendee`,
`staff` non assegnato, `staff` assegnato, `organizer`, `master`.
**Scopo:** misurare la barra in basso e il pannello dopo il cambio, con il
metodo del piano 52.3-19 (`52.3-19-SUMMARY.md`, sezione «Task 2 — la misura»).

**Cosa NON cambia, dichiarato prima di misurare.** Check-in nella barra dello
staff assegnato e Check-in nel pannello di `organizer`/`master` sono una
**scelta di visibilita'**, non di accesso. Il predicato della porta — *ruolo
**o** assegnazione viva*, con `null` che rifiuta, lo stesso nel middleware,
in `DoorSurface.tsx` e nella barra (D-53-01) — **non cambia**; la striscia in
alto dello staff, `StaffNav` (`STAFF_TABS`), **non riceve** Check-in (D-53-06).
Una procedura che trovasse la porta chiusa a qualcuno che prima entrava ha
trovato un difetto, non una conseguenza della scelta.

**Metodo.** Chrome headless via CDP, `mobile: true`, DPR 2, larghezze **360** e
**375**. Pillola = riquadro di `ROW_PHONE`; disponibile = `innerWidth - 2rem`;
contenuto = `scrollWidth` / `clientWidth` della riga. Interruttore Music
**acceso**; poi **spento** (riavvio del dev server con
`env -u NEXT_PUBLIC_MUSIC_PAGE_ENABLED`, `GET /music` → 404) se il laboratorio
lo permette — altrimenti la seconda tabella si scrive NON PERCORSA con la
ragione. Superficie `/events` per tutti; anche `/door` per `staff` assegnato,
`organizer`, `master`.

**Passi.**

1. Anonimo, `/events`, 360 e 375.
2. `attendee`, `/events`, 360 e 375.
3. `staff` non assegnato, `/events`, 360 e 375.
4. `staff` assegnato, `/events` e `/door`, 360 e 375.
5. `organizer`, `/events` e `/door`, 360 e 375; poi apertura del pannello
   Management: **foglio a 375** e **colonna a 1280**.
6. `master`, come `organizer`.

**Tabella da compilare in `53-ESITI.md`** (una riga per soggetto × superficie ×
larghezza):

| Soggetto | Superficie | Larghezza | Ora UTC | Pillola / disponibile (px) | scrollW / clientW | Barra (voci in ordine) | Indice di Check-in in barra | Densita' (`px-5` / densa) | Larghezza delle voci (px) | Check-in nel pannello (si'/no, posizione) |
|---|---|---|---|---|---|---|---|---|---|---|

**Atteso (interruttore acceso):**

| Soggetto | Barra | Check-in in barra | Check-in nel pannello |
|---|---|---|---|
| anonimo | Events · Music · Account | — | no (nessun pannello) |
| `attendee` | Events · Music · Account | — | no (nessun pannello) |
| `staff` non assegnato | Events · Music · Account | — | no (nessun pannello) |
| `staff` assegnato | Events · Check-in · Music · Account — **invariata** | indice **1** | no (lo staff non ha il pannello e non lo riceve, D-53-01) |
| `organizer` | Events · Music · Management | — | **si'** — pannello `Account, Artists, Check-in, Formats, Manage events, Manifesto, Members, Venues` (8 righe, ordine per etichetta), Check-in in posizione 3 |
| `master` | Events · Music · Management | — | **si'** — come `organizer` piu' `Newsletter` (9 righe), Check-in in posizione 3 |

**Criteri.**

- Nessuna riga con `scrollWidth > clientWidth`, a nessuna larghezza.
- Le barre a tre voci (anonimo, `attendee`, `staff` non assegnato,
  `organizer`, `master`) tornano a `px-5`; la barra a quattro voci dello staff
  assegnato resta densa. **Si misura, non si deduce.**
- Su `/door`, per `organizer` e `master`, dal `md:` il bottone Management
  risulta **corrente** (la colonna si apre da sola sulla porta). Annotarlo a
  1280.
- Zero `TASK` in ogni barra e in ogni pannello.

**Nota dichiarata.** Lo staff assegnato a una serata **futura** vede gia'
Check-in: le assegnazioni vive sono quelle con `now() < ends_at`, quindi
comprese quelle di domani. E' cosi' oggi e D-53-01 non lo cambia; non e' un
esito rosso.

---

## P-53-C — Check-in da Management

**Requisito:** CUT-02 (D-53-01, D-53-06). **Ruoli:** `organizer`, poi `master`,
poi `staff` assegnato.

1. `organizer`, a 375: barra → **Management** → **Check-in**. **Osservare:** si
   apre `/door`; la lista della serata di prova si scarica (contatore della
   lista > 0); uno scan **online** di un biglietto di prova della serata passa
   (esito di ammissione).
2. `organizer`, a 1280, su `/door`: **osservare** che il bottone Management
   risulta corrente e la colonna e' aperta (dal `md:`).
3. `master`: passi 1 e 2.
4. `staff` assegnato, a 375: Check-in **in barra** → `/door` si apre come prima,
   lista scaricata.
5. `staff` assegnato, su una superficie di lavoro con la striscia `StaffNav`
   visibile (se lo staff ne raggiunge una): **osservare** che la striscia **non**
   ha Check-in (D-53-06). Se lo staff non raggiunge alcuna superficie con
   `StaffNav`, annotarlo: e' l'esito atteso per costruzione.
6. `organizer` e `master` aprono anche `/admin/scanner` (indirizzo permanente,
   D-39-02): la porta si apre; nessuna riga del pannello risulta evidenziata
   (com'era gia' per la voce di barra).

**In `53-ESITI.md`:** per ogni ruolo, l'URL aperto dal tocco, il contatore
della lista, l'esito dello scan (senza il codice del biglietto).

---

## P-53-D — La porta offline come prima

**Requisito:** CUT-02 visto da `checkin-offline.md` (D-53-01: il predicato
della porta non cambia). **Ruolo:** `staff` assegnato.
**Scopo:** la fase non ha toccato l'offline, e la porta funziona senza rete
come prima. L'asimmetria vale qui: rifiutare un ospite valido e' peggio che
ammetterne uno doppio.

**Prova statica** (da `<commit d'inizio fase>` = il genitore del primo commit
della fase 53 sul ramo, annotato in `53-ESITI.md`):

1. ```
   git diff --stat <commit d'inizio fase>..HEAD -- src/lib/offline src/app/sw.ts 'src/app/(admin)/admin/scanner/DoorSurface.tsx' src/middleware.ts
   ```
   **Osservare:** output vuoto.
2. `src/lib/supabase/middleware.ts` e' toccato dal piano 53-06 **nei soli
   commenti**. Prova: «middleware: solo commenti, zero righe non-commento nel
   diff»:
   ```
   git diff -U0 <commit d'inizio fase>..HEAD -- src/lib/supabase/middleware.ts | /usr/bin/grep -E '^[+-][^+-]' | /usr/bin/grep -vcE '^[+-]\s*(//|\*|/\*)'
   ```
   **Osservare:** `0`.

**Prova sul dispositivo** (emulatore Android `pixel_lab` via CDP; se non
basta, telefono — passo del proprietario, nominato come tale):

3. `/door` aperta **online** come `staff` assegnato; la lista si scarica.
4. Rete spenta. Uno scan di un biglietto di prova. **Osservare:** l'esito porta
   «· Offline» e lo scan e' **in coda** (contatore della coda = 1).
5. Rete accesa. **Osservare:** la coda si svuota (drain a zero) e la riga
   risulta sincronizzata.
6. Dalla revisione della porta, un **annullamento** di quell'ingresso.
   **Osservare:** l'annullamento e' registrato, il biglietto torna ammissibile.

**Avviso di runbook (non un passo):** dopo il deploy di questa fase il service
worker cambia. Il telefono della porta va **aperto online prima della serata**,
perche' la versione nuova si installi con la rete; aperto la prima volta
offline servirebbe la versione precedente.

---

## P-53-E — Una sede da Venues

**Requisito:** CUT-03 (D-53-09). **Ruoli:** `organizer`, anonimo, `staff`.
**Dati di prova:** nome e indirizzo **inventati e generici** (es. «Sede di
prova 53», «Via di Prova 1»), **mai una sede reale** — su un repo pubblico, un
nome reale in una procedura e' una trattativa resa pubblica
(`venue-acquisition.md`).

1. `organizer`: `/admin/venues` → **New venue**. **Osservare:** il modal si apre
   con il campo nome **editabile** e vuoto, e il fuoco sul nome.
2. A nome vuoto: **osservare** il submit disabilitato.
3. Nome e indirizzo di prova → invio. **Osservare:** il modal si chiude e la
   lista si aggiorna con la sede nuova.
4. Ripetere con lo **stesso nome**. **Osservare:** la frase
   «A venue with this name already exists.» nel modal, che resta aperto.
5. `organizer`: una **serata nuova di prova** sceglie quella sede dal campo
   venue del form e la marca **segreta**; si salva.
6. Anonimo: la pagina pubblica della serata. **Osservare:** l'indirizzo
   **non** compare (ne' nel testo ne' nei metadati); poi
   `npm run verify:venue-surfaces` **verde**.
7. Dal form della serata, «crea al volo» una sede con un nome nuovo di prova.
   **Osservare:** il modal si apre con il nome **in sola lettura**, come prima
   della fase.
8. `staff` (assegnato e non): `/admin/venues`. **Osservare:** non la raggiunge
   (redirect o rifiuto del middleware; annotare quale).
9. **Pulizia:** le righe di prova (sedi e serata) si tolgono per chiave a fine
   prova, **oppure** si dichiarano lasciate nel laboratorio in `53-ESITI.md`.
   Gli id restano nello scratchpad.

---

## P-53-F — Lo schema

**Requisito:** CUT-01 (D-53-03, D-53-04, D-53-07). **Ruolo:** l'assistente, con
`SUPABASE_ACCESS_TOKEN` e `LAB_PROJECT_REF`.
**Quando:** dopo l'applicazione della migration al laboratorio (piano 53-08,
con `scripts/lab-apply-migration.mjs`, che passa da `/database/migrations` e
annota il registro — **mai** `/database/query` per applicare).
**Come:** solo letture `read_only: true` dal Management API.

1. Le **dieci** tabelle uscenti assenti: `to_regclass('public.<tabella>')` nullo
   per ognuna (la ricerca diceva undici; le migration ne creano dieci —
   ricontato il 2026-10-14).
2. `party_series.ics_alias` assente in `information_schema.columns`.
3. `select count(*) from private.capabilities` = **11**.
4. `select count(*) from private.role_capabilities` = **20**; per ruolo:
   `master` 11, `organizer` 9, `staff` 0, `attendee` 0.
5. `pg_policies`: nessuna policy che nomini le tre chiavi tolte
   (`production.calendar.manage`, `production.location.manage`,
   `production.visual.manage`).
6. `production_open_question_select_brandwide` **presente**, e il suo testo
   nomina **la sola** chiave del manifesto (D-53-04: riscritta prima di
   togliere le altre, o sarebbe un rifiuto permanente e silenzioso).
7. Il `CHECK` di `production_section.section` non ammette piu' `visual`.
8. Bucket `visual-archive` assente: lettura dall'API Storage → «Bucket not
   found».
9. `event-media-quarantine` **presente** con la sua policy; `event-images`
   **pubblico**.
10. La migration della fase **annotata** in
    `supabase_migrations.schema_migrations` (nome e versione), come la stampa
    lo script dopo l'applicazione.

---

## P-53-G — Vercel

**Requisito:** CUT-01 (D-53-02).

1. **Statico, sul ramo:** `vercel.json` ha **sette** voci in `crons`, e nessuna
   punta a `/api/cron/production-mirror`.
2. **Dopo il deploy del laboratorio:** la pagina *Cron Jobs* del progetto non
   elenca lo specchio. (Un cron si toglie da `vercel.json` **e** con un
   redeploy; un Instant Rollback a un deploy precedente lo **rimette**: dopo la
   migration non si fa rollback, si va in avanti.)
3. **Variabili:** sul laboratorio si annota solo che le tre
   `PRODUCTION_CALENDAR_FEED_*` non sono mai state su Preview/Development.
   La lettura di `vercel env ls` (CLI loggata, `unset VERCEL_TOKEN`) che prova
   la loro assenza in **Production** e' un passo **di produzione**: lo esegue
   il piano 53-11, dopo l'autorizzazione, non questa procedura.

---

## Cosa queste procedure non provano

- **Nessuna serata vera.** La porta si prova su una serata di prova del seme,
  sull'emulatore o su un telefono di prova: non con la fila, non alle due di
  notte, non con la rete di una sede.
- **Nessun telefono di produzione.** Il service worker nuovo arriva sul
  telefono della porta solo quando quel telefono lo apre online dopo il deploy
  di produzione (avviso di runbook in P-53-D).
- **Nessuna lettura del registro di produzione.** Se le due migration della
  52.4 siano annotate nel registro di produzione (passate da `/database/query`)
  lo legge in sola lettura il piano 53-11, prima della migration di produzione
  (D-53-07).

## Divieti

- **Nessuna di queste procedure gira in produzione.** Ne' le letture del
  catalogo, ne' i login headless, ne' le righe di prova.
- **`npm run verify:refusal` non si lancia** in questa fase: conia sessioni
  vere.
- **Nessun `/database/query` per applicare** una migration, su nessun progetto
  (D-53-03): solo letture `read_only: true`.
