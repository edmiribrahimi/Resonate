# Fase 36: Formats & Series Numbering — Ricerca

**Ricercato:** 2026-08-10
**Dominio:** catalogo dei format e delle serie (schema + RLS) · numerazione memorizzata ·
filtro pubblico nell'indirizzo (Next 16 / React 19) · superficie di catalogo sotto `/admin`
**Confidenza complessiva:** ALTA su tutto ciò che è stato misurato (repo e database di
produzione, letti oggi); MEDIA sulle due raccomandazioni di forma che portano un
compromesso (il watermark del progressivo, il flag di pubblicazione di un format)

> **Lingua.** La prosa è in italiano. Nomi di file, tabelle, colonne, funzioni, chiavi di
> capability e identificatori restano in inglese: sono il contenuto del repository, non
> una traduzione.
>
> **QUESTO REPOSITORY È PUBBLICO** e `.planning/` è tracciato: questo file è una
> **pubblicazione**. Qui si nominano **ruoli**, mai persone. Nessuna sede in trattativa,
> nessuna data non annunciata, nessuna line-up, nessun indirizzo. Dove una misura ha
> toccato dati di produzione è riportato **il conteggio e il meccanismo**, mai il
> contenuto.
>
> **Questa fase non scrive l'identità sonora di nessun format.** Nessun genere, nessun
> BPM, nessun aggettivo che suoni come una promessa (`sound-manifesto.md`; il precedente
> è già registrato a `20260809003000_party_credits.sql:77-81`).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

Il testo integrale delle sedici decisioni, con la ragione di ciascuna, sta in
`36-CONTEXT.md` `<decisions>` e **non viene riscritto qui**: duplicarlo creerebbe una
seconda copia di una decisione, che è esattamente il difetto che
`20260809003000_party_credits.sql` sezione 4 chiama *«due sorgenti per un fatto»*. Sotto
c'è l'enunciato di ciascuna, verbatim, come indice vincolante. **Nessuna è riaperta da
questa ricerca.** Dove una misura le tocca, è riportata **sotto** di essa, mai contro.

### Locked Decisions

- **D-36-01: il format sta sulla serata, mai sull'evento.**
- **D-36-02: la lista pubblica resta una card per evento.**
- **D-36-03: il secondo tempo di una serata SunSet è una notte re:sonate, con nome e
  numero propri.**
- **D-36-04: il format è obbligatorio su ogni serata.** Le tre serate già in archivio si
  assegnano esplicitamente **dentro la migration**.
- **D-36-05: il numero corre dentro una SERIE, e la serie è una riga di catalogo che una
  persona crea, con nome e codice.**
- **D-36-06: il numero lo propone il prodotto e lo conferma una persona.** Il numero
  **resta scritto e non viene mai ricalcolato da un conteggio**.
- **D-36-07: per MotionLab il progressivo RIPARTE a ogni sede.**
- **D-36-08: FMT-03 è un vincolo del database, non un controllo applicativo.** Il vincolo
  va **nominato**.
- **D-36-09: un visitatore legge SOLO IL NOME.** Il numero e il codice secco restano
  interni.
- **D-36-10: ritirare una sigla blocca le assegnazioni nuove; l'archivio resta com'era.**
- **D-36-11: il colore è obbligatorio alla creazione di un format — e obbligatorio non
  vuol dire preso in prestito.** I quattro colori di identificazione **esistono già**:
  `SunSet #FFB25E` · `RamaDub #FF7A2F` · `MotionLab #FF5C93` · `re:sonate #A874E8`.
- **D-36-12: etichette e colori vengono dai dati, non dal codice** (FMT-05).
- **D-36-13: i chip del filtro nascono dal CATALOGO, non dai dati.**
- **D-36-14: nessun conteggio, da nessuna parte, su nessuna superficie pubblica.**
- **D-36-15: il filtro vive nell'indirizzo — `/events?format=<slug>`.** La scelta
  upcoming/past si sposta nell'indirizzo insieme.
- **D-36-16: chi vede le bozze vede LA STESSA IDENTICA riga di filtri.**

### Claude's Discretion

- **La forma del catalogo** (una tabella dei format più una delle serie, oppure una sola
  con un auto-riferimento) è scelta del piano, purché regga D-36-05 e D-36-07.
- **Come il campo del numero arriva precompilato** — server action, valore di default
  calcolato al render, o altro — è scelta del piano, purché il valore **memorizzato** non
  sia mai ricalcolato (D-36-06).
- **Dove vive la superficie di gestione del catalogo** dentro `/admin` e con quale
  capability. Vincolo non negoziabile: **entra nella mappa rotta↔capability**
  (D-34-10/D-34-11).
- **Il nome pubblico composto** («RamaDub x <venue>») — se derivato dalla coppia
  format+serie o scritto sulla serie — è scelta del piano.

*Questa ricerca esercita tutte e quattro le discrezioni con una raccomandazione motivata,
sezione `## Architecture Patterns`. Una raccomandazione non è una decisione: il piano può
divergere, purché dichiari perché.*

### Deferred Ideas (OUT OF SCOPE)

- **Il colore dei format come token** — fase 40 (DS-02, DS-03). Qui il colore è **un dato
  del catalogo**.
- **L'identità sonora dei format** — non è scritta, e questa fase **non la scrive**.
- **Aggiornare `production-calendar.md`** (D-36-07 chiude un gate aperto) — quando la fase
  chiude, non prima.
- **Un percorso di filtro sull'archivio passato** (per anno, per locale) — altra fase.
- I tre todo rivisti (`postgrest-details-leaks-the-row`, `profiles-email-not-unique`,
  `login-client-redirect-not-allow-listed`) **non sono ripiegati**. Il primo è trattato
  sotto, § *Pitfall 4*, con una misura che ne restringe la portata qui.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Descrizione (`REQUIREMENTS.md:95-100`) | Cosa di questa ricerca lo abilita |
|----|---------------------------------------|-----------------------------------|
| **FMT-01** | Ogni serata porta il suo format, così un evento può tenere due serate di format diversi | § *La struttura c'è già*: `UNIQUE (event_id, type)` e la colonna `type` sono state eliminate il 26/02 (`20260226300000:11-17`). Manca solo la colonna. Forma raccomandata: `event_parties.format_id NOT NULL` + `series_id NOT NULL`, § *Pattern 1* |
| **FMT-02** | Codice di serie e numero compongono la sigla; il numero è memorizzato, mai ricalcolato da un conteggio | § *Pattern 2* — la colonna `number` e il **watermark monotono** sulla serie, che è ciò che impedisce a una cancellazione di riproporre un numero già stampato |
| **FMT-03** | Il database rifiuta due serate con lo stesso format, serie e numero | § *Pattern 1*, e la risposta alla domanda 3: `UNIQUE (format_id, series_id, number)` **più** la chiave composta `(series_id, format_id) → party_series (id, format_id)`, che è ciò che rende i tre assi non-contraddittori. Il precedente in casa è `profiles_id_role_unique` (`20260809000000:228-240`) |
| **FMT-04** | Un visitatore può vedere tutti gli eventi o filtrare a un format; la scelta sopravvive alla navigazione ed è condivisibile come link | § *Next 16: `searchParams` è una Promise* — la forma è già in uso in tre punti del repo; `typedRoutes` accetta `` `/events?format=${slug}` `` (**misurato con `tsc` del repo**, § *Code Examples*) |
| **FMT-05** | Etichette e colori vengono dai dati, quindi una sigla ritirata non può comparire e un colore cambia senza deploy | § *Pattern 3* — catalogo con `retired_at`, letto a ogni render; nessuna costante di format nel codice. Il conflitto apparente con D-36-10 è risolto dalla matrice di disclosure del `36-UI-SPEC.md` |
| **FMT-06** | Nessun conteggio, etichetta o codice su una superficie pubblica rivela una serata non annunciata o un venue segreto | § *La risposta alla domanda 2* — la policy di lettura del catalogo delle **serie** non può essere `USING (true)`, e il perché è misurato. Più il **reperto V1**, § *Findings outside scope*, che riguarda un percorso di rivelazione già aperto oggi |

</phase_requirements>

---

## Summary

Questa fase non ha un problema di libreria: **non installa nulla.** Ha tre problemi di
struttura, e tutti e tre hanno già un precedente scritto in questo repository.

Il primo è **dove vive il format**. `event_parties` è già la serata, e la struttura che
FMT-01 chiede esiste dal 26 febbraio: `20260226300000_multi_sub_events.sql:11-17` ha
eliminato `UNIQUE (event_id, type)`, il `CHECK` su `type` e la colonna stessa, dando a
ogni serata la propria `date`. Il format è una colonna che manca, non un'architettura da
inventare. La domanda vera è la seconda: **come si tengono coerenti tre assi** (format,
serie, numero) quando il secondo implica già il primo. La risposta misurata è che la
chiave a tre colonne di FMT-03 è **corretta ma insufficiente da sola** — senza una chiave
esterna composta verso `(party_series.id, party_series.format_id)`, `format_id` sulla
serata e il format della sua serie possono divergere, e la card e il filtro
risponderebbero due cose diverse alla stessa domanda. Il repository ha già inventato la
soluzione per un caso identico: `profiles_id_role_unique`
(`20260809000000_party_assignments.sql:228-240`) esiste **solo** per fare da bersaglio a
una chiave composta, e porta un `COMMENT ON CONSTRAINT` che dice di non rimuoverlo come
pulizia.

Il terzo problema è il solo davvero critico, ed è di dominio, non di schema: **quale
policy di lettura dà il catalogo a un visitatore anonimo.** I due vicini più prossimi —
`public.venues` e `public.artists` — hanno entrambi `USING (true)`, misurato oggi in
produzione. Copiarlo per i **format** è corretto: i quattro nomi sono già pubblici, sono
scritti in `.claude/rules/brand-visual-system.md`, che è un file tracciato di un repo
pubblico. Copiarlo per le **serie** sarebbe un difetto: il nome pubblico di una serie
porta una sede (`RamaDub x <venue>`), e una serie creata per una sede non ancora
acquisita diventerebbe pubblica **all'insert**, prima di qualunque annuncio — la stessa
irreversibilità che `20260809003000_party_credits.sql:184-195` descrive per la line-up.
Le serie devono ereditare il cancello attraverso la serata, esattamente come
`party_credits`.

**Raccomandazione primaria:** due tabelle di catalogo (`public.formats`,
`public.party_series`), due colonne `NOT NULL` su `event_parties` legate da una chiave
composta, il vincolo a tre colonne **nominato**, `USING (true)` sui format e il cancello
di pubblicazione ereditato sulle serie — e il backfill delle tre serate esistenti dentro
la stessa transazione, in tre passaggi (nullable → backfill → `SET NOT NULL`), perché
`ADD COLUMN NOT NULL` con un default costante scriverebbe lo stesso format su tutte e tre.

**Tre cose che il piano scoprirebbe troppo tardi se questa ricerca non le dicesse:**

1. **`CAP.CATALOGUE_MANAGE` oggi è dichiarata `scope: "table"`**
   (`src/lib/routes/capability-routes.ts:321-325`), cioè *non apre nessun indirizzo*.
   Legare una rotta di catalogo a quella chiave non è aggiungere una stringa a una lista:
   è **cambiare ramo dell'unione `Binding`**.
2. **`updateEvent` ingoia ogni errore di scrittura per-serata**
   (`src/app/(admin)/admin/events/actions.ts:373-410`): i risultati di `update` e `insert`
   non sono nemmeno destrutturati. Il rifiuto nominato che D-36-08 chiede **non
   arriverebbe a nessuno** sul percorso di modifica.
3. **La sonda di scrittura del baseline RLS per `event_parties`**
   (`scripts/rls-baseline.mjs:1226-1229`) fornisce solo `event_id, title, time`: una
   colonna `NOT NULL` senza default la fa fallire `23502` **per ogni persona**, e l'intera
   riga di quella matrice smetterebbe di misurare una policy.

---

## Architectural Responsibility Map

| Capability | Tier primario | Tier secondario | Perché quel tier possiede la responsabilità |
|------------|---------------|-----------------|---------------------------------------------|
| Rifiutare due serate con la stessa terna (FMT-03) | Database (vincolo) | — | D-36-08 lo dice: è un vincolo, non un controllo applicativo. Un controllo nel codice è una race condition con due persone e due schede aperte |
| Impedire che format e serie divergano | Database (chiave composta) | — | La struttura porta la decisione, perché un commento si ignora (`20260809003000:141-147`) |
| Decidere cosa un visitatore anonimo può leggere del catalogo | Database (RLS) | — | *La RLS è il confine, il resto è UX* (`CLAUDE.md`, principio 2). Il middleware e la pagina non impediscono a nessuno di leggere una riga |
| Comporre la sigla (`RMDB-BZ-018`) | Server (render/action) | — | È una concatenazione di dati letti; non è un dato da memorizzare una terza volta |
| Proporre il prossimo numero | Server (lettura del watermark) | Database (il watermark) | La proposta è UX; **la monotonia del watermark è un fatto del database**, e va lì o una cancellazione la annulla |
| Decidere quali chip esistono | Server Component (`/events`) | Database (catalogo) | D-36-13/D-36-16: un solo percorso di costruzione, server-rendered, identico per chiunque |
| Tenere il filtro nell'indirizzo | Browser (anchor) + Server (`searchParams`) | — | FMT-04 chiede un link condivisibile: è **navigazione**, non uno stato di componente |
| Impedire che un conteggio raggiunga una superficie pubblica | Server (query e render) | — | Non c'è un meccanismo di database per «non contare»: è una disciplina della query, e per questo va scritta in una procedura manuale |
| Nascondere il numero e il codice al pubblico | Server (selezione delle colonne) | Database (grant di colonna, opzionale) | § *Open Question 2* |

---

## Il punto di partenza, **misurato oggi** (2026-08-10)

Ogni riga qui viene da un comando eseguito in questa sessione. Le misure sul database sono
letture `read_only` attraverso la Management API e la chiave anonima; **nessuna
scrittura**.

### Nel repository

| Fatto | Evidenza |
|---|---|
| Next **16.1.6**, React **19.2.3**, `typedRoutes: true`, build `next build --webpack` | `package.json:32,38-39`; `next.config.ts` |
| Nessuno dei quattro client Supabase è parametrizzato con `Database` | `src/lib/supabase/client.ts:1-8`, `server.ts:1-4`, `service.ts:1-8`, `middleware.ts:1-4` — nessuno passa un generico a `createClient`/`createServerClient`. **Ancora vero.** Un nome di colonna nuovo scritto male non produce alcun errore di build |
| Nessun test runner per il prodotto | `package.json` `scripts`: `dev, build, start, lint, verify:persona, verify:capabilities, verify:no-header-identity, verify:no-credit-account, verify:media-strip, verify:redirects, verify:routes, baseline:rls, baseline:container, baseline:compare`. **Nessuno `test`** |
| `catalogue.manage` esiste, con `requires_approved = true` per `master` e `organizer` | `20260807000000_capability_model.sql:399-400`; descrizione a `:361-362`; `src/lib/capabilities/keys.ts:98-99,149-150` |
| `CAP.CATALOGUE_MANAGE` **non apre nessuna rotta** | `src/lib/routes/capability-routes.ts:321-325` — ramo `{ scope: "table", reason: "Gates rows, not addresses; the enforcement is the four `artists` / `venues` organizer policies in the migrations." }` |
| `searchParams` come `Promise` è già la forma di casa, in tre pagine | `src/app/(public)/events/[slug]/menu/page.tsx:40-46`; `src/app/(admin)/admin/(work)/members/growth/page.tsx:28-46`; `src/app/(admin)/admin/(work)/events/[id]/review/page.tsx:83-92`; `src/app/(members)/dashboard/page.tsx:20-36` |
| Lo stato del tab è client-side | `src/app/(public)/events/EventTabs.tsx:3,117` — `useState<"upcoming" \| "past">` |
| `transformEvent` aggrega già venue e lineup per `sort_order` | `src/app/(public)/events/page.tsx:70-124`, con l'ordinamento a `:88` |
| `updateEvent` **non controlla nessun errore** sulle scritture per-serata | `src/app/(admin)/admin/events/actions.ts:373-410` — `await client.from("event_parties").update({...})` e `.insert({...})` senza destrutturare `{ error }`. Per contrasto, `createEvent` **lo controlla** (`:295-303`) |
| La sonda di scrittura RLS per `event_parties` fornisce tre colonne | `scripts/rls-baseline.mjs:1226-1229` |
| Il container applica **tutte** le migration della cartella, in ordine | `scripts/rls-baseline-container.mjs:230-262` — nessuna lista da aggiornare |
| Il container concede i privilegi di default alle nuove tabelle | `scripts/container/auth-shim.sql:160-163` (`alter default privileges in schema public`), e `assertGrants` (`rls-baseline-container.mjs:299-321`) fallisce se una tabella con RLS non li ha |
| La CLI Supabase **non è installata** | `command -v supabase` → nessun risultato. `SUPABASE_ACCESS_TOKEN` è presente in `.env.local` |
| Nessuno script di `package.json` avvolge l'applicazione di una migration | I 14 script sono elencati sopra: nessuno tocca `/database/migrations` |

### Nel database di produzione

| Misura | Valore |
|---|---|
| Eventi · serate · venue | **2 · 3 · 5** — conferma `.planning/STATE.md:93` |
| Eventi pubblicati | **2 su 2.** Oggi **non esiste alcuna serata non pubblicata** |
| `event_parties`, colonne | 21 |
| `event_parties_select_published`, testo applicato | `EXISTS (SELECT 1 FROM events e WHERE e.id = event_parties.event_id AND e.is_published = true)` — **integro**, mai riscritto |
| Le altre quattro policy di `event_parties` | `select_admin`, `insert_admin`, `update_own`, `delete_own`, tutte su `private.has_capability('staff.manage')` |
| `venues_select_public` · `artists_select_public` | `qual = true` entrambe. **Lettura pubblica incondizionata** |
| `party_credits` | due policy SELECT: il cancello ereditato attraverso `event_parties`, più `catalogue.manage` |
| Storia delle migration, ultime versioni | `20260806161753` (`20260807020000_wrap_auth_uid`), `20260806154724`, `20260806151221`, `20260806150550`, `20260806111113` — poi si torna a marzo |

---

## 1. Come le migration RECENTI di questo repo scrivono una tabella e le sue policy

La lettura ravvicinata è `supabase/migrations/20260809003000_party_credits.sql` (361
righe), che è l'analogo più stretto: una tabella di catalogo/relazione agganciata a
`event_parties`, con la sua RLS e il suo paragrafo su *quale sorgente vince per cosa*.

**Le convenzioni di casa, estratte e ognuna con la sua riga:**

1. **Un'intestazione che elenca i cambiamenti e dice perché stanno nella stessa
   transazione** (`:1-45`). La forma è: *n cambiamenti, UNA transazione, e ogni metà è
   cattiva a modo suo* — con la descrizione concreta del danno di ciascuna metà. Non è
   retorica: è ciò che impedisce a un lettore successivo di spezzare il file.
2. **`BEGIN; … COMMIT;`** attorno a tutto (`:47`, `:361`).
3. **Idempotenza dichiarata, non presunta** (`:31-45`): `CREATE TABLE IF NOT EXISTS` con i
   vincoli **dentro** la definizione, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF
   EXISTS` prima di ogni `CREATE POLICY`. E la regola che ne consegue, scritta:
   *«un insieme di vincoli CAMBIATO è una migration NUOVA, mai una modifica a questa»*.
4. **Ogni vincolo è NOMINATO** (`:73-75`, `:100-107`): `party_credits_credit_check`,
   `party_credits_unique`. La ragione è testuale: *«così che un rifiuto arrivi come
   `party_credits_credit_check` e non come un `23514` anonimo che qualcuno deve andare a
   cercare»*. **Questo è il precedente esatto che D-36-08 chiede.**
5. **Ogni `ON DELETE` porta la sua motivazione, in prima persona.** `CASCADE` su
   `party_id` perché *«un credito su una serata che non esiste più non è prova di
   niente»* (`:60-64`); `RESTRICT` su `artist_id` perché *«cancellare un artista
   accreditato riscriverebbe in silenzio che cosa quella serata è stata»* (`:66-71`);
   `SET NULL` su `created_by` perché *«nessun vincolo lo legge, quindi perderlo costa
   attribuzione e non disarma niente»* (`:89-95`).
6. **`(select private.has_capability('…'))` con il wrapper `(select …)`**, e il wrapper è
   dichiarato **load-bearing** (`:234-239`): fa valutare la chiamata **una volta per
   statement** come InitPlan invece di una volta per riga
   (`20260807000000_capability_model.sql:177-184`). La forma vecchia
   `public.is_admin_or_organizer()` è dichiarata sbagliata due volte.
7. **L'assenza di una policy di scrittura è un paragrafo, non un buco** (`:251-275`).
   Tre tabelle in questo repository omettono le policy di scrittura di proposito, e
   ognuna lo dice, *«perché altrimenti il lettore successivo prende il buco per un bug e
   lo ripara — e la riparazione è un `CREATE POLICY` dal far scrivere la line-up di una
   serata a una sessione autenticata»*.
8. **Un indice si aggiunge solo se serve una lettura che la chiave unica non copre già**
   (`:158-167`): `party_credits_unique` guida con `party_id`, quindi non c'è un secondo
   indice su quella colonna; ce n'è uno sull'altra direzione, che è anche ciò che rende
   economico il `RESTRICT`.
9. **Una nuova via di rifiuto si dichiara e si MISURA** (`:323-359`): la sezione 5 riporta
   tre celle del `baseline:compare` che si spostano, dice che il comparatore etichetta la
   cosa come *narrowing* e **perché il comparatore non può sapere che è un vincolo e non
   una policy**, e chiude nominando ciò che **non** è stato fatto.

**Il secondo pattern, da `20260809000000_party_assignments.sql:200-245`** — come si
aggiunge un vincolo *referenziato* in modo idempotente. `DROP CONSTRAINT IF EXISTS` +
`ADD CONSTRAINT` è **sbagliato** e il file lo prova: l'`IF EXISTS` sopprime *«non
esiste»*, non *«qualcos'altro dipende da essa»*, e alla seconda esecuzione Postgres
rifiuta con `2BP01`. La forma corretta è un blocco `DO` che interroga `pg_constraint` e
crea solo se manca — **e Postgres non ha `ADD CONSTRAINT IF NOT EXISTS`**, quindi il `DO`
non è preferenza. Segue un `COMMENT ON CONSTRAINT` che dice **di non rimuoverlo come
pulizia**. Questa fase ne ha bisogno letteralmente, per la chiave `UNIQUE (id, format_id)`
su `party_series`.

**Il terzo, da `20260226400000_party_lineup_venue_secret.sql:1-14`** — la forma minima
del backfill già usata su `event_parties`: `ADD COLUMN IF NOT EXISTS … NOT NULL DEFAULT`
seguito da un `UPDATE … FROM` che riempie dal genitore. Funziona lì perché il valore
*deriva* dall'evento. **Non funziona qui**, e il perché è la risposta alla domanda 6.

---

## 2. La forma esatta del cancello pubblico oggi, e quale policy serve al catalogo

### Cosa c'è, misurato in produzione

`event_parties_select_published` è viva e non è mai stata riscritta. Le altre quattro
policy della stessa tabella sono state convertite a capability da
`20260807010000_policies_to_capabilities.sql:220-246`; questa **non è stata toccata**, e
`20260809003000_party_credits.sql:201` la nomina esplicitamente *«the gate»*.

I due vicini di catalogo hanno entrambi la lettura pubblica incondizionata, `qual = true`:
`venues_select_public` (`20260226200000_venues.sql:25-27`) e `artists_select_public`
(`20260226100000_artist_profiles.sql:25-27`). `20260807010000` ha riscritto solo le loro
`INSERT`/`UPDATE`/`DELETE` a `catalogue.manage` / `master.manage`
(`:70-85`, `:405-417`); le `SELECT` sono rimaste com'erano.

`party_credits` è il precedente che ha **rifiutato** quella simmetria, con un paragrafo di
25 righe (`:169-209`) che spiega perché è falsa: `artists` tiene un **catalogo** — un
nome, una bio, link che un artista pubblica di sé; `party_credits` tiene una **relazione
fra un artista e una SERATA**, ed è la serata, non l'artista, a portare il segreto.

### Cosa serve alla fase 36

**Due tabelle, due risposte opposte, e la differenza è la stessa che `party_credits` ha
già argomentato.**

**`public.formats` → `USING (true)`.** Motivi, in ordine di peso:

1. **D-36-13 e D-36-16 lo richiedono strutturalmente.** I chip nascono dal catalogo, sono
   sempre gli stessi, e chi vede le bozze vede *la stessa identica riga*. Un solo percorso
   di costruzione, per un visitatore anonimo compreso: la lettura deve riuscire senza
   sessione.
2. **I quattro nomi sono già pubblici.** `SunSet`, `RamaDub`, `MotionLab`, `re:sonate`
   sono scritti in `.claude/rules/brand-visual-system.md` e in
   `.claude/rules/production-calendar.md`, file **tracciati** di un repository pubblico.
   Nessuna riga nuova diventa pubblica.
3. **Un chip dice *«questo format esiste»*, non *«quando»***, che è precisamente
   l'argomento di D-36-13.

*Con un limite che va detto, § Open Question 1: quel `true` pubblica un format **nel
momento in cui la riga viene creata**. Oggi non è un problema — i quattro esistono — ma un
quinto format creato in preparazione sarebbe annunciato dal prodotto.*

**`public.party_series` → NON `USING (true)`. Le due policy di `party_credits`,
copiate.** Motivi:

1. **Il nome pubblico di una serie porta una sede.** `RamaDub x <venue>` è una stringa
   memorizzata che il `36-UI-SPEC.md` rende su ogni superficie che le sue serate toccano
   (S2, S3). Una policy `true` la pubblicherebbe **attraverso PostgREST** a chiunque abbia
   la chiave anonima, indipendentemente da cosa la UI decide di disegnare. `venue-secrecy.md`,
   gate *percorsi enumerati*: PostgREST è un punto d'uscita, e non è nell'elenco datato di
   quel modulo.
2. **Una serie si crea prima della prima serata.** Il flusso di lavoro è: creo la serie,
   poi assegno la prima serata. Con `true`, la serie di una sede **non ancora acquisita**
   diventerebbe pubblica all'insert — `venue-acquisition.md`, gate *uno spazio non
   acquisito non si nomina*, e `brand-visual-system.md` lo ripete. È esattamente il danno
   che `20260809003000:184-195` descrive: *«non quando la serata è annunciata — all'insert,
   e chi ha inserito la riga non avrebbe modo di saperlo»*.
3. **È irreversibile.** Un `DELETE` successivo non ri-nasconde niente.

Forma raccomandata, copiata da `20260809003000:211-249` con la sola sostituzione della
colonna del join:

```sql
ALTER TABLE public.party_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS party_series_select_published ON public.party_series;
CREATE POLICY party_series_select_published ON public.party_series
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.event_parties ep
        JOIN public.events e ON e.id = ep.event_id
       WHERE ep.series_id = party_series.id
         AND e.is_published = true
    )
  );

DROP POLICY IF EXISTS party_series_select_catalogue_manage ON public.party_series;
CREATE POLICY party_series_select_catalogue_manage ON public.party_series
  FOR SELECT USING ((SELECT private.has_capability('catalogue.manage')));
```

> **Nota sulla qualificazione del riferimento.** `party_credits` scrive `ep.id = party_id`
> e spiega (`:215-218`) che il riferimento non è ambiguo perché `event_parties` non ha una
> colonna con quel nome. Qui **non vale**: la colonna della serata si chiamerà `series_id`
> e vive su `event_parties`, quindi il riferimento va **qualificato con il nome della
> tabella della policy** — `party_series.id` — o il predicato confronta la colonna
> sbagliata. È un errore che compila e non fallisce mai: la policy diventerebbe
> `ep.series_id = ep.series_id`, cioè vera per ogni serata pubblicata, cioè **`USING
> (true)` travestito**. Va scritto nel piano, non lasciato all'attenzione.

**Nessuna policy di scrittura su nessuna delle due**, con il paragrafo che lo dichiara
(`20260809003000:251-275`): le scritture arrivano dalla superficie di catalogo con il
client di servizio, che bypassa ogni policy — una policy di scrittura non vincolerebbe
nulla sul solo percorso che scrive, leggendo però al lettore successivo come se il confine
fosse coperto. Quello che decide **chi** può scrivere è la guardia dell'azione, ed è
`catalogue.manage` (il modello è `src/app/(admin)/admin/venues/actions.ts:1-60`).

---

## 3. Il vincolo di unicità di FMT-03 — dove vive ogni asse, e quale forma scegliere

### Il fatto che decide

D-36-05 dice che la serie è **un'entità di catalogo**, non una stringa digitata sulla
serata. Una serie appartiene a un format (`RMDB-BZ` è una serie di `RamaDub`), quindi
`party_series.format_id NOT NULL`. **La serie implica già il format.**

### Le tre forme possibili, con il modo di fallire di ciascuna

| Forma | Cosa la serata porta | Vincolo | Come fallisce |
|---|---|---|---|
| **A** | solo `series_id` | `UNIQUE (series_id, number)` | *Corretto e insufficiente per il resto.* Il format non è sulla serata, quindi FMT-01 è vero solo transitivamente e **il filtro pubblico diventa un join a due salti** (`formats ← party_series ← event_parties`), che in PostgREST richiede un `!inner` annidato — una query fragile su un percorso di sicurezza. E se qualcuno ri-punta una serie a un altro format, **ogni serata passata cambia format in silenzio**: è una riscrittura dell'archivio, contro lo spirito di D-36-10 |
| **B** | `format_id` **e** `series_id`, senza chiave composta | `UNIQUE (format_id, series_id, number)` | *È FMT-03 alla lettera e non tiene.* Nulla impedisce a `event_parties.format_id` di divergere dal format della sua serie. Sono **due sorgenti per un fatto senza una frase che dica quale vince** — il difetto che `20260809003000` sezione 4 nomina e che `production-calendar.md` chiama *«il calendario batte il tracker»*. Card e filtro possono rispondere due cose diverse |
| **C — RACCOMANDATA** | `format_id` **e** `series_id` | `UNIQUE (format_id, series_id, number)` **più** `FOREIGN KEY (series_id, format_id) REFERENCES public.party_series (id, format_id)` | La divergenza di B **non è scrivibile**: Postgres rifiuta la riga. La ridondanza smette di essere una seconda sorgente e diventa una **copia verificata dal database** |

**Perché C e non A**, in una riga: il filtro pubblico è il percorso su cui FMT-06 vive, e
un `eq` su una colonna della serata è ispezionabile da un essere umano in una riga, mentre
un `!inner` a due salti no.

**È la chiave a tre colonne ridondante, allora?** Data la chiave composta, `UNIQUE
(series_id, number)` e `UNIQUE (format_id, series_id, number)` **rifiutano esattamente lo
stesso insieme di righe**: `format_id` è funzionalmente determinato da `series_id`. La
scelta fra le due non è di correttezza, è di **messaggio**: D-36-08 chiede che il rifiuto
si presenti come un nome leggibile, e un nome che porta tutti e tre gli assi è ciò che un
essere umano deve leggere. Quindi:

```sql
CONSTRAINT event_parties_format_series_number_unique
  UNIQUE (format_id, series_id, number)
```

Il costo è un indice a tre colonne invece che a due — su una tabella che oggi ha **3
righe**. Non è un compromesso.

**Il bersaglio della chiave composta.** Postgres rifiuta con `42830` una chiave esterna le
cui colonne di destinazione non portano un vincolo unico. Serve quindi:

```sql
-- Ridondante come regola sui dati (id è la chiave primaria);
-- NON ridondante come chiave REFERENZIATA. Vedi 20260809000000:228-245.
ALTER TABLE public.party_series
  ADD CONSTRAINT party_series_id_format_unique UNIQUE (id, format_id);
```

…con il `COMMENT ON CONSTRAINT` che dice di non rimuoverlo come pulizia, esattamente come
`profiles_id_role_unique` (`20260809000000:243-245`).

**La nuova via di rifiuto che C introduce, e va dichiarata** (`20260809003000` § 5):
`ON UPDATE NO ACTION` (il default) sulla chiave composta significa che **cambiare il
format di una serie che ha già serate viene rifiutato**. È il comportamento voluto — una
serie non cambia format, e se lo facesse riscriverebbe l'archivio — ma è un rifiuto nuovo
su un percorso esistente, e questo repository dichiara quelli invece di lasciarli
scoprire. La superficie di catalogo deve dire *«questa serie ha già delle serate: il suo
format non si cambia»*, non lasciar arrivare un errore grezzo.

**`ON DELETE` sulle due colonne della serata: `RESTRICT` su entrambe.** La ragione è
letteralmente quella di `party_credits.artist_id` (`:66-71`): cancellare un format o una
serie sotto cui delle serate sono andate in scena **riscriverebbe in silenzio che cosa
quelle serate sono state**, e D-36-10 dice che l'archivio resta com'è. `RESTRICT` rende
strutturale la scelta che il `36-UI-SPEC.md` § S5 ha già preso — *«nessuna cancellazione
esiste in questa superficie, solo il ritiro»*. Serve un indice su `series_id` per rendere
economico il `RESTRICT`; su `format_id` no, perché la chiave unica a tre colonne guida
proprio con quella (§ 1, convenzione 8).

### Che errore vede il client JS, e il todo si applica?

**Codice:** `23505`. **`message`:** `duplicate key value violates unique constraint
"event_parties_format_series_number_unique"` — porta il nome del vincolo, che è il punto
di D-36-08. **`details`:** la forma di Postgres per una violazione di unicità è
`Key (format_id, series_id, number)=(…, …, 18) already exists.`

**`postgrest-details-leaks-the-row.md` NON si applica qui, e la differenza è misurabile.**
Quel todo riguarda la violazione di un **`CHECK`**, per cui Postgres emette `Failing row
contains (…)` — **la riga intera**, `membership_code` compreso. Una violazione di
**unicità** emette solo **le colonne della chiave**, che qui sono tre uuid/interi che il
`36-UI-SPEC.md` classifica comunque come interni. La fuga specifica del todo non c'è.

**Ma la disciplina resta, e per due ragioni indipendenti dal todo:**

1. Il todo osserva che **~20 siti fanno `console.error("<categoria>", error)` passando
   l'oggetto intero**. Aggiungerne un ventunesimo su un percorso che ora fallisce
   *normalmente* (un numero già usato è un errore quotidiano di un operatore, non una
   rarità) è peggiorare un difetto aperto. Il ramo d'errore di questa fase logga
   `error.code` e `error.message`, **mai** `error` intero e mai `error.details`.
2. **Il branching applicativo sta sul `code`, non sul `message`.** Il todo lo dice e
   `src/lib/capabilities/server.ts:59-63` ne porta la ragione: **Next redige il messaggio
   di un errore lanciato da una Server Action in build di produzione.** Un client che
   ramifica su `err.message.includes("event_parties_format_series")` funziona in
   `next dev` e smette dove conta. La categoria deve viaggiare come **valore di ritorno**,
   non come messaggio.

Il modello corretto in casa esiste: `src/app/api/membership/verify/route.ts:124-147`
separa `23505` da tutto il resto e restituisce uno stato distinto per causa
(`32-PATTERNS.md:552-560`).

---

## 4. Next 16 + React 19: `searchParams` su una pagina server

### L'API corrente, verificata alla fonte

`searchParams` **è una Promise** e va attesa. Fonte: la documentazione ufficiale di
Next.js, `app/api-reference/file-conventions/page`, letta oggi via Firecrawl (la pagina si
dichiara *Latest Version 16.3.0*; questo repo è su 16.1.6, e la Promise è arrivata in
`v15.0.0-RC`, quindi la forma è la stessa):

> *«Since the `searchParams` prop is a promise. You must use `async/await` or React's
> `use` function to access the values.»*
> *«`searchParams` is a **Request-time API** whose values cannot be known ahead of time.
> Using it will opt the page into **dynamic rendering** at request time.»*
> *«`searchParams` is a plain JavaScript object, not a `URLSearchParams` instance.»*
> — `https://nextjs.org/docs/app/api-reference/file-conventions/page`, § *searchParams (optional)*

Tabella di forma, dalla stessa fonte: `/shop?a=1&a=2` → `Promise<{ a: ['1','2'] }>`. **Un
parametro ripetuto arriva come array**, non come stringa — quindi `?format=a&format=b`
consegna `string[]` e il codice deve trattarlo, non assumerlo stringa. Con la regola già
decisa (valore non riconosciuto ⇒ nessun filtro) un array è semplicemente non
riconosciuto: **nessun ramo speciale, nessun errore, nessun redirect.**

**La forma è già in casa, quattro volte** — `menu/page.tsx:40-46`, `members/growth/page.tsx:28-46`,
`events/[id]/review/page.tsx:83-92`, `dashboard/page.tsx:20-36`. Tutte e quattro
dichiarano `searchParams: Promise<…>` in un'interfaccia locale e fanno `await`. **Il piano
segua quella forma**, non l'helper globale `PageProps<'/events'>` che Next 16 offre: in
questo repository `PageProps` è già il nome di quattro interfacce locali
(`events/[id]/tickets/page.tsx:90`, `assignments/page.tsx:51`, `guest-list/page.tsx:35`,
`review/page.tsx`), e introdurre l'omonimo globale in un quinto file rende il codice
ambiguo alla lettura senza guadagnare niente.

### Sul caching: **non cambia nulla**, ed è un risultato, non un'omissione

`/events` è **già** reso dinamicamente: `getAccessContext()` (`page.tsx:33`) chiama
`createClient()` di `@/lib/supabase/server`, che chiama `cookies()` da `next/headers`
(`server.ts:5`). Una pagina che legge i cookie è già Request-time. Aggiungere
`searchParams` non toglie una prerenderizzazione che non c'era. `revalidateEventPaths()`
(`actions.ts:211-217`, che chiama `revalidatePath("/events")`) resta com'è.

*Nessuna Cache Component è attiva in questo progetto* — `next.config.ts` non ha
`cacheComponents` né `dynamicIO` — quindi il paragrafo della documentazione sulla *static
shell* non si applica.

### La riga di filtri come anchor, e `typedRoutes`

`typedRoutes: true` è attivo. La domanda vera è se `` <Link href={`/events?format=${slug}`}> ``
compila. **Misurato oggi con il `tsc` del repository** (`node_modules/.bin/tsc --noEmit
--strict`) contro la forma di `RouteImpl` già documentata in
`src/lib/routes/capability-routes.ts:355-366` — l'arm `` `${StaticRoutes}${SearchOrHash}` ``:

- `` `/events?format=${slug}` `` con `slug: string` → **compila**
- `` `/events?tab=past&format=${slug}` `` → **compila**
- una variabile di tipo `string` nudo → **rifiutata** (l'`@ts-expect-error` scatta)

Il file di prova è in scratchpad, non nel repository. **La conseguenza operativa: l'href
va costruito come template literal, mai assemblato in una variabile `string` intermedia**
— la seconda forma non compila, e la tentazione (`const href = base + params.toString()`)
è quella naturale.

### `EventTabs.tsx`: cosa succede allo swipe

Oggi `activeTab` è `useState` (`:117`), `baseOffset` ne deriva (`:125`), e i due handler
`switchTab`/`handleTouchEnd` lo impostano con un `isAnimating` a 300 ms attorno
(`:151-185`).

Spostando la scelta nell'indirizzo, **il rischio è che la traslazione del pannello aspetti
un round-trip al server**: `router.replace` su una pagina Request-time è una navigazione
vera. Uno swipe che aspetta la rete è uno swipe rotto — e la pagina `/events` è la vetrina.

La forma che regge, e che non è una decisione nuova ma la conservazione di una esistente:

- `activeTab` **resta uno stato locale**, ma **inizializzato dalla prop** che la pagina
  server deriva da `?tab=`. Continua a governare `baseOffset`, cioè l'animazione.
- Ogni cambio (tap o swipe) fa **entrambe** le cose: `setActiveTab` per l'animazione
  immediata, e `router.replace(href, { scroll: false })` dentro un `useTransition` per
  l'indirizzo. Il `replace` è ciò che D-36-15 chiede; il `useTransition` è ciò che
  impedisce alla navigazione di bloccare il gesto.
- Un `useEffect` risincronizza `activeTab` quando la prop cambia — cioè quando qualcuno
  apre un link condiviso o preme Indietro.
- **Entrambi gli array (`upcoming`, `past`) restano props**, quindi la navigazione non
  cambia quello che il componente ha in mano: la re-render è a costo zero sul contenuto.

`replace` e non `push` per il tab, `push` per il format: è già la scelta del
`36-UI-SPEC.md` § *The URL contract*, e la sua ragione — *«il gesto di swipe inonderebbe
la history»* — è confermata dal codice: `handleTouchEnd` può scattare a ogni gesto.

**Nessun `useSearchParams`.** Il valore arriva come prop dal Server Component. Usare
`useSearchParams` obbligherebbe a un confine `<Suspense>` e sposterebbe la lettura nel
client, cioè fuori dal *«un solo percorso di costruzione»* di D-36-16.

---

## 5. La superficie di catalogo e la mappa rotta↔capability

### Il modulo, il suo path e la sua forma

**`src/lib/routes/capability-routes.ts`** — 573 righe, un docblock di 110. Esporta
`CAPABILITY_ROUTES`, `RouteResolution`, `resolveRoute`. Tre lettori: il middleware, le
guardie di pagina, la navigazione (D-34-09).

La forma di una voce è un'unione a due rami (`:129-160`):

```ts
type Binding =
  | { routes: readonly RoutePattern[]; assignmentOpenable?: true; alsoGatesTables?: true }
  | { scope: "table"; reason: string };
```

e l'oggetto è chiuso da `} as const satisfies Record<CapabilityKey, Binding>` (`:344`).
Il docblock (`:162-171`) spiega che **`satisfies` e non un'annotazione**, e **`as const`**,
sono entrambi load-bearing: senza `as const` l'unione delle rotte elencate si allarga a
`string` e l'asserzione `_everyStaffRouteIsBound` (`:394-397`) diventa una decorazione —
*provato per mutazione B2, piano 34-01*.

### Cosa deve aggiungere esattamente una rotta nuova

**Il fatto che cambia il piano:** oggi `CAP.CATALOGUE_MANAGE` sta sul **secondo** ramo.

```ts
// src/lib/routes/capability-routes.ts:321-325 — com'è OGGI
[CAP.CATALOGUE_MANAGE]: {
  scope: "table",
  reason:
    "Gates rows, not addresses; the enforcement is the four `artists` / `venues` organizer policies in the migrations.",
},
```

Legare `/admin/formats` (o qualunque indirizzo il piano scelga) a quella chiave significa
**riscrivere la voce nell'altro ramo**, e portarsi dietro il flag che dice che la chiave
governa *anche* delle righe:

```ts
[CAP.CATALOGUE_MANAGE]: {
  routes: ["/admin/formats"],
  alsoGatesTables: true,   // le quattro policy artists/venues restano quello che sono
},
```

Il `reason` non ha un posto nel primo ramo: la frase che ne resta va nel commento sopra la
voce, che è la forma che ogni altra voce usa. **Se il piano dimenticasse
`alsoGatesTables`, non ci sarebbe alcun errore di build** — è opzionale — ma la
dichiarazione mentirebbe per omissione, ed è la bugia che D-34-11 esiste per prevenire.

**La checklist completa per la rotta nuova:**

| # | Cosa | Dove | Chi lo verifica |
|---|---|---|---|
| 1 | La voce nel primo ramo, con `alsoGatesTables: true` | `capability-routes.ts:321-325` | Il ramo `{scope}` non ha `routes`: senza questa modifica `resolveRoute` restituisce `null` e **il middleware fallisce chiuso** — la pagina è irraggiungibile per chiunque |
| 2 | Il `page.tsx` sotto `src/app/(admin)/admin/(work)/…` | `nextjs-architecture.md`, R-WORK-ROUTES: **solo file di rotta** in `(work)`; azioni e componenti client un livello fuori, a `src/app/(admin)/admin/…`, importati con `@/app/(admin)/admin/…` | `npm run verify:routes` (check 2, censimento dei `page.tsx`) |
| 3 | La guardia nella pagina, che ripete la stessa chiave | modello: `(work)/venues/page.tsx:54-58` | Nessuno strumento. È la disciplina D-34-09 |
| 4 | La guardia dentro **ogni** server action | modello: `assertCatalogueManage` in `admin/venues/actions.ts:1-60` | Nessuno strumento. `nextjs-architecture.md`: *una server action è un endpoint pubblico con una firma comoda* |
| 5 | Ogni `revalidatePath` che nomina la nuova rotta | — | `npm run verify:routes` (check 1): un path non dichiarato fa fallire lo script |
| 6 | La voce nella navigazione staff, se la superficie deve comparire | `src/lib/routes/staff-tabs.ts` | Nessuno strumento; ma la nav legge le stesse chiavi (STAFF-03) |

**`_everyStaffRouteIsBound` non coprirà la rotta nuova finché la pagina non esiste su
disco** — l'asserzione legge il tipo `Route` generato, e una rotta statica ci entra solo
dopo un `next dev`/`next build`/`next typegen`. Il docblock lo dice (`:96-99`): una voce
di mappa senza pagina non è un errore, è un piano non ancora eseguito. La direzione utile
è l'altra, e quella è coperta.

### La capability giusta

**`catalogue.manage`, e la verifica è tripla:**

- **Esiste**: `private.capabilities` la porta dal 2026-08-07
  (`20260807000000_capability_model.sql:360-363`), e `verify:capabilities` asserisce che
  il catalogo del database e l'oggetto `CAP` siano le stesse dodici stringhe.
- **`requires_approved = true`**, per entrambi i ruoli che la ricevono:
  `('master','catalogue.manage', true)` e `('organizer','catalogue.manage', true)`
  (`:399-400`). È l'**altra** definizione di organizer, la più stretta, ed è la ragione per
  cui la colonna `requires_approved` esiste (`:361-362`, `keys.ts:98-99`).
- **`staff` non ce l'ha**: il ruolo `staff` è stato aggiunto da
  `20260808000500_staff_role.sql` e `catalogue.manage` è uno dei suoi rifiuti dichiarati
  (`:143-152`, citato da `20260809003000:243-247`). Conferma D-02 della fase 43.

**È anche la chiave giusta nel merito**, e l'argomento è già scritto:
`20260809003000:241-247` — *«`catalogue.manage` e non una chiave nuova: è la chiave che
governa già `public.artists` e `public.venues` … coniarne una nona creerebbe un permesso
che nessuno ha e una decisione che nessuno ha preso.»* Un format e una serie sono lavoro
di catalogo nello stesso senso di un artista e di una sede.

**Attenzione a una divergenza che esiste già e che il piano erediterà:** le pagine
`(work)/venues/page.tsx` e `(work)/artists/page.tsx` sono legate a **`organizer.access`**
nella mappa (`capability-routes.ts:248-264`), mentre le loro **azioni** chiedono
`catalogue.manage`. Il docblock di `venues/page.tsx:38-40` lo dichiara esplicitamente:
*«`catalogue.manage` è ancora la chiave che le azioni ri-chiedono al proprio interno — una
domanda diversa da quella della raggiungibilità, e una che `requires_approved` dove questa
no.»* Il piano ha quindi **due opzioni difendibili** e deve sceglierne una dichiarandola:

- **legare la rotta a `organizer.access`** (coerenza con le due superfici di catalogo
  gemelle; l'azione resta `catalogue.manage`), oppure
- **legarla a `catalogue.manage`** (un organizer non approvato non arriva nemmeno alla
  pagina, cioè il rifiuto si sposta prima — l'unica direzione che `meta-gates.md` permette
  senza autorizzazione).

La seconda è più stretta ed è quella che il `36-CONTEXT.md` § *Claude's Discretion*
suggerisce nominando `catalogue.manage`; ma è anche l'unica delle due che **cambia il
ramo dell'unione**, con tutto ciò che comporta sopra. Raccomandazione: **`catalogue.manage`**,
perché un organizer non approvato che vede la superficie e poi viene rifiutato da ogni
bottone è un fallimento silenzioso con una faccia neutra.

---

## 6. Il backfill delle tre serate esistenti

**Il dato, misurato oggi:** 2 eventi, **3 serate**, 5 venue, entrambi gli eventi
pubblicati. `.planning/STATE.md:93` è confermato.

### Perché `ADD COLUMN … NOT NULL DEFAULT` non basta

La forma minima che `20260226400000_party_lineup_venue_secret.sql:4-6` usa —
`ADD COLUMN IF NOT EXISTS … NOT NULL DEFAULT` seguito da `UPDATE … FROM` — **funziona lì
perché il valore deriva dal genitore**: `lineup` e `venue_secret` si copiano dall'evento.

Qui non c'è niente da cui derivare. Un `DEFAULT` costante assegnerebbe **lo stesso format a
tutte e tre le serate**, e D-36-04 dice che le tre si assegnano **esplicitamente**. Peggio:
un default sopravvivrebbe alla migration, e una serata salvata da un percorso che dimentica
la colonna prenderebbe quel format in silenzio — che è la forma esatta del fallimento
silenzioso che `meta-gates.md` vieta.

### L'ordine sicuro, in una sola transazione

```
1. CREATE TABLE public.formats           (+ RLS + policy, nella stessa migration)
2. CREATE TABLE public.party_series      (+ UNIQUE (id, format_id) + RLS + policy)
3. INSERT dei quattro format e delle serie necessarie  (ON CONFLICT DO NOTHING)
4. ALTER TABLE public.event_parties ADD COLUMN IF NOT EXISTS format_id uuid,
                                    ADD COLUMN IF NOT EXISTS series_id uuid,
                                    ADD COLUMN IF NOT EXISTS number integer;
   -- NULLABLE, senza default: nessuna riga prende un valore per caso
5. UPDATE public.event_parties SET … WHERE id = '<uuid>';   -- una per serata, esplicita
6. Il GUARDIANO:  se resta anche una sola riga con format_id IS NULL, ALZA.
7. ALTER TABLE … ALTER COLUMN format_id SET NOT NULL;  (idem series_id, number)
8. Le chiavi esterne, il vincolo unico nominato, il CHECK sul numero, gli indici
```

**Il passaggio 6 è il deliverable, non una cortesia.** Senza, il `SET NOT NULL` del passo 7
fallisce comunque — ma con `23502` su una tabella, senza dire **quale riga** e senza dire
**perché**. Con un blocco `DO` che conta le righe rimaste e `RAISE EXCEPTION` con il
conteggio, chi applica la migration legge una frase. Il repository ha già questa disciplina
(`rls-baseline-container.mjs:243-251`: *«"una migration è fallita" senza il nome del file è
il fallimento silenzioso che `meta-gates.md` vieta»*).

### Le righe che potrebbero esistere in locale e non in produzione

**Questa è la parte che la domanda 6 chiede e che l'ordine sopra non risolve da solo.**
Gli `UPDATE` del passo 5 riferiti a uuid espliciti coprono **solo** le tre righe di
produzione. Il container del baseline semina le proprie serate
(`scripts/container/seed.mjs:92`, `SEED_ORDER` comincia con `events, event_parties`), e
qualunque database di sviluppo ne ha altre. Su quelle il passo 5 non tocca niente, il passo
6 alza, e **il container non costruisce più lo schema** — cioè `baseline:container` smette
di funzionare, che è uno dei quattro strumenti di verifica del progetto.

Tre forme possibili, e solo una è coerente con le regole di casa:

| Forma | Cosa fa | Giudizio |
|---|---|---|
| `UPDATE` per uuid, e basta | copre le tre righe note | **Rompe il container.** Rifiutata |
| `UPDATE … WHERE format_id IS NULL SET format_id = <un format qualunque>` | riempie tutto | **Rifiutata**: è il default costante travestito. Assegna un format a serate che nessuno ha classificato, e D-36-04 dice *esplicitamente* |
| **`UPDATE` per uuid per le tre righe note, poi un secondo `UPDATE` che assegna un format `unclassified` *dichiarato tale* alle righe residue, e il guardiano che conta e STAMPA quante ne ha trovate** | copre entrambi i mondi | **Raccomandata** |

La terza forma è quella onesta, purché il format di ripiego sia una riga di catalogo
**ritirata alla nascita** (`retired_at = now()`), così che non compaia in nessun chip e
non sia selezionabile per nessuna assegnazione nuova (FMT-05, D-36-10). In produzione quel
format resterà **con zero serate**, e il conteggio stampato dalla migration lo prova.

*Un'alternativa più semplice, che il piano può preferire:* seminare i format nel container
(`scripts/container/seed.mjs`) **prima** che le migration girino non è possibile — il seed
gira dopo. Ma il seed **può** essere esteso ad assegnare il format alle serate che semina,
il che rende il ripiego non necessario **solo se** l'ordine di `SEED_ORDER` lo permette; e
non lo permette per le righe che le migration stesse hanno già dovuto rendere `NOT NULL`.
Da qui la raccomandazione.

### Come si applica la migration su questa macchina

**`supabase db push` è ineseguibile qui.** `command -v supabase` non restituisce niente.

La forma corretta, ricavata da `.planning/STATE.md:154-159` e confermata dalla presenza di
`SUPABASE_ACCESS_TOKEN` in `.env.local`:

```
POST https://api.supabase.com/v1/projects/{ref}/database/migrations
Authorization: Bearer $SUPABASE_ACCESS_TOKEN
Content-Type: application/json

{ "query": "<il contenuto del file .sql>", "name": "<nome_della_migration>" }
```

**L'endpoint delle migration, NON `/database/query`.** Il secondo applica il DDL e non
scrive nulla nella storia.

**Nessuno script di `package.json` lo avvolge.** I quattordici script sono elencati in
§ *Il punto di partenza*; nessuno tocca quell'endpoint. `scripts/rls-baseline.mjs` parla
con la Management API ma solo con `/database/query`, in `read_only`, e per catturare
artefatti. **Un task di piano che scrive `supabase db push` non è eseguibile qui**, e uno
che scrive «applica la migration» senza il verbo, l'endpoint e la variabile d'ambiente
lascia il lavoro a chi esegue.

### La deriva della storia delle migration è **molto più grande** di quanto STATE.md registri

`.planning/STATE.md:156-159` registra **una** anomalia: `20260508000000_drink_token_active_state.sql`
applicato ma assente dalla storia. **Misurato oggi, ce ne sono almeno diciotto.**

`supabase_migrations.schema_migrations` si ferma a `20260806161753`
(nome `20260807020000_wrap_auth_uid`). Ma le tabelle e le funzioni delle fasi 43 e 35
**esistono in produzione** — verificato con `to_regclass` / `to_regprocedure`:
`private.capabilities` ✓ · `public.party_assignments` ✓ · `public.party_credits` ✓ ·
`public.membership_acts` ✓ · `public.door_scan_events` ✓ ·
`public.release_expired_assignee_roles(uuid)` ✓ (che viene da `20260809007000`, l'ultimo
file della cartella) · `public.my_access_context(uuid)` ✓ · `event_media.party_id` ✓.

Quindi **tutti i file `20260808*` e `20260809*` sono applicati e nessuno è registrato**:
sono stati applicati attraverso `/database/query`. La storia dice agosto 6, il database è
ad agosto 9.

**Cosa significa per questa fase, concretamente:**

1. **Non blocca l'applicazione di una migration nuova.** L'endpoint delle migration
   registra una versione con il timestamp del momento; non confronta la storia con il
   disco e non rifiuta un buco. La fase 31 lo ha già dimostrato (`STATE.md:137-144`).
2. **Ma rende la storia inutilizzabile per rispondere a *«questo schema è aggiornato?»***
   — e questa fase costruisce sopra `event_parties` e sopra `private.has_capability`.
   La domanda va risolta interrogando gli oggetti, come è stato fatto qui, non la storia.
3. **Vale la pena dirlo al proprietario**, perché è una scelta sua
   (`STATE.md:158-159`: *«ripararla è decisione del proprietario; `PUT` sullo stesso
   endpoint fa upsert senza applicare»*). Diciotto voci sono un `PUT` per file, e il
   momento in cui costa meno è adesso — la stessa logica del backfill.

---

## Standard Stack

**Questa fase non installa nulla.** Nessun pacchetto nuovo, in nessun ecosistema.

| Necessità | Cosa si usa | Perché non serve una libreria |
|---|---|---|
| Catalogo dei format e delle serie | Postgres + RLS | Il confine è la RLS; una libreria non lo sposta |
| Unicità della terna | Vincolo Postgres nominato | D-36-08 lo richiede al database |
| Filtro nell'indirizzo | `searchParams` di Next 16 + `<Link>` | La piattaforma lo fa; un router di stato lo sposterebbe nel client, contro D-36-16 |
| Colore di identificazione | Stringa hex su una riga + `style` inline | Tailwind non genera una classe da un valore runtime (`36-UI-SPEC.md` § *token divergence*) |
| Selezione del colore | `radiogroup` scritto a mano | Il repo non ha component library — `36-UI-SPEC.md` § *Registry Safety* |
| Modale del catalogo | `<dialog>` nativo, come `CreateVenueModal.tsx:143-152` | Precedente in casa |

### Alternative considerate

| Invece di | Si potrebbe | Compromesso |
|---|---|---|
| Due tabelle di catalogo | Una tabella con auto-riferimento (`parent_id`) | Espressa D-36-05/D-36-07, ma **non può portare la chiave composta** che risolve la domanda 3: una riga sarebbe format o serie a seconda di `parent_id IS NULL`, e nessun vincolo lo dice al database. Le policy poi sarebbero *una sola* per due popolazioni con requisiti di segretezza **opposti** (§ domanda 2) — la ragione decisiva per rifiutarla |
| Colonna `number` + watermark | Solo `number`, con la proposta da `max(number)` | Vedi § *Pattern 2*: una cancellazione riproporrebbe un numero già stampato |
| `format_id` sulla serata | Solo `series_id` | § domanda 3, forma A |

## Package Legitimacy Audit

**Non applicabile: questa fase non installa alcun pacchetto esterno.**

Verificato: `package.json` non cambia. Il gate di legittimità non è stato eseguito perché
non c'è nulla da verificare — dichiararlo esplicitamente è il punto, così che il piano non
introduca una dipendenza «già che ci siamo» senza passare da qui.

---

## Architecture Patterns

### Diagramma: da dove entra una richiesta a `/events?format=…` a cosa esce

```
  Visitatore (anonimo o autenticato)
        │
        │  GET /events?format=<slug>&tab=past
        ▼
  ┌───────────────────────────────────────────────┐
  │ middleware (src/lib/supabase/middleware.ts)   │
  │  · rinfresca la sessione · risolve il contesto│
  │  · resolveRoute("/events") → null → NON è una │
  │    rotta staff: passa. Il gate qui è UX       │
  └───────────────────┬───────────────────────────┘
                      ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ (public)/events/page.tsx   — Server Component, Request-time    │
  │                                                                │
  │  await searchParams  ──►  format?: string|string[]             │
  │                           tab?:    string|string[]             │
  │                                                                │
  │  getAccessContext()  ──►  capabilities  (cookies ⇒ dinamica)   │
  │                                                                │
  │  ┌── QUERY A: il CATALOGO ───────────────────────────────┐     │
  │  │ formats: id, slug, name, color  WHERE retired_at NULL │     │
  │  │  · identica per chiunque (D-36-16)                    │     │
  │  │  · NESSUN conteggio, nessun join alle serate (D-36-14)│     │
  │  └───────────────────────────────────────────────────────┘     │
  │                                                                │
  │  ┌── risoluzione del filtro ─────────────────────────────┐     │
  │  │ slug ∈ catalogo attivo ?  → filtro                    │     │
  │  │ altrimenti (ignoto/ritirato/array/assente) → nessuno  │     │
  │  │  NESSUN redirect: un redirect sarebbe un oracolo      │     │
  │  └───────────────────────────────────────────────────────┘     │
  │                                                                │
  │  ┌── QUERY B: gli EVENTI ────────────────────────────────┐     │
  │  │ events + event_parties(… , format_id, series_id,      │     │
  │  │                        formats(name,color,slug),      │     │
  │  │                        party_series(public_name))     │     │
  │  │  canSeeDrafts ? tutto : .eq("is_published", true)     │     │
  │  └───────────────────────────────────────────────────────┘     │
  └───────────────────┬────────────────────────────────────────────┘
                      │   ⇩ SOTTO OGNI COSA, e non negoziabile:
                      │   events_select_published  (public.events)
                      │   event_parties_select_published (20260225150000:31-37)
                      │   party_series_select_published  (NUOVA, eredita il gate)
                      │   formats_select_public          (NUOVA, USING true)
                      ▼
  ┌───────────────────────────────────────────────┐
  │ transformEvent()  (page.tsx:70-124)           │
  │  · raccoglie i format per sort_order          │
  │  · deduplica  · applica il gate del venue:    │
  │    QUALCHE serata segreta ⇒ solo nome format  │
  │  · il filtro si applica QUI, sull'array reso  │
  └───────────────────┬───────────────────────────┘
                      ▼
  ┌───────────────────────────────────────────────┐
  │ <FormatFilterRow>  ← anchor, aria-current     │
  │ <EventTabs>        ← activeTab da prop        │
  │      swipe → setActiveTab (animazione)        │
  │             + router.replace (indirizzo)      │
  └───────────────────────────────────────────────┘

  Percorso di scrittura, separato:
  EventForm ──► server action ──► assertCatalogueManage / assertStaffManage
                    │
                    └─► INSERT/UPDATE event_parties
                         └─► 23505 su event_parties_format_series_number_unique
                              └─► ramo d'errore NOMINATO, per campo,
                                  mai l'oggetto PostgREST grezzo
```

Il filtro **si applica sull'array già reso**, mai come una seconda query. È la regola del
`36-UI-SPEC.md` § *The four states of the list* e la sua ragione vale identica qui: una
seconda interrogazione *«questo format ha qualcosa?»* è esattamente la forma che vedrebbe
una bozza e la trasformerebbe in una differenza osservabile — FMT-06 che fallisce nel solo
punto in cui nessuno andrebbe a cercarla.

### Struttura dei file

```
supabase/migrations/
└── 202608XXXXXXXX_formats_and_series.sql        # UNA transazione, tutto dentro

src/
├── types/database.ts                            # Format, PartySeries, +3 campi su EventParty
├── lib/routes/capability-routes.ts              # la voce CATALOGUE_MANAGE cambia RAMO
├── components/
│   ├── formats/FormatMarker.tsx                 # swatch + nome, `normal-case` esplicito
│   └── formats/ColorSwatchPicker.tsx            # radiogroup, sei scelte piatte
├── app/(public)/events/
│   ├── page.tsx                                 # searchParams, query del catalogo, filtro
│   ├── FormatFilterRow.tsx                      # anchor + aria-current (server-rendered)
│   ├── EventTabs.tsx                            # tab da prop, replace nello swipe
│   └── [slug]/page.tsx                          # marker per serata (:628-639)
└── app/(admin)/admin/
    ├── formats/actions.ts                       # NON in (work) — R-WORK-ROUTES
    ├── formats/CreateFormatModal.tsx            # idem
    ├── (work)/formats/page.tsx                  # solo la rotta
    └── events/actions.ts                        # i tre campi + il ramo d'errore
```

### Pattern 1 — Il format sulla serata, non falsificabile

**Che cos'è:** due colonne `NOT NULL` sulla serata, legate alla loro coerenza da una
chiave esterna composta invece che da una convenzione.

**Quando si usa:** ogni volta che un dato denormalizzato deve restare vero. È il pattern
che `20260809000000_party_assignments.sql:200-245` ha già inventato in questo repository
per la coppia `(user_id, role)`.

```sql
-- Il bersaglio. Ridondante come regola sui dati, NON come chiave referenziata.
-- La forma DO, e non DROP+ADD, per la ragione misurata a 20260809000000:200-226:
-- `IF EXISTS` sopprime «non esiste», non «qualcosa dipende da essa» → 2BP01.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'party_series_id_format_unique'
       AND conrelid = 'public.party_series'::regclass
  ) THEN
    ALTER TABLE public.party_series
      ADD CONSTRAINT party_series_id_format_unique UNIQUE (id, format_id);
  END IF;
END;
$$;

COMMENT ON CONSTRAINT party_series_id_format_unique ON public.party_series IS
  'Redundant against the primary key as a rule about data; NOT redundant as a referenced key. '
  'event_parties_series_format_fk REFERENCES public.party_series (id, format_id) and Postgres '
  'refuses a foreign key whose referenced columns carry no unique constraint (42830). '
  'Do not remove as tidying.';

-- La chiave composta: rende NON SCRIVIBILE una serata il cui format contraddice
-- il format della propria serie. Vedi 36-RESEARCH.md § domanda 3, forma B.
ALTER TABLE public.event_parties
  ADD CONSTRAINT event_parties_series_format_fk
  FOREIGN KEY (series_id, format_id)
  REFERENCES public.party_series (id, format_id);

-- FMT-03. NOMINATO, così che il rifiuto arrivi come una frase e non come un
-- 23505 anonimo — la stessa disciplina di 20260809003000:73-75.
ALTER TABLE public.event_parties
  ADD CONSTRAINT event_parties_format_series_number_unique
  UNIQUE (format_id, series_id, number);
```

### Pattern 2 — Il numero memorizzato, e il watermark che lo rende monotono

**Che cos'è:** la colonna `number` è la verità (FMT-02); la **proposta** viene da un
watermark sulla serie che **non scende mai**.

**Perché non basta `max(number)`.** `updateEvent` cancella davvero le serate rimosse dal
form (`actions.ts:363-372`). Se la serata numero 18 viene cancellata, `max(number)`
diventa 17 e la proposta successiva è di nuovo **18** — un numero che è già su una
locandina. `meta-gates.md` elenca *«la numerazione di serie di un format»* fra le tre
guardie monotone: *«un progressivo assegnato è già su una locandina. Si aggiunge in coda,
non si rinumera.»* Riproporre 18 è rinumerare con un altro nome.

```sql
-- Sul catalogo delle serie: il livello dell'acqua, che sale e non scende.
ALTER TABLE public.party_series
  ADD COLUMN IF NOT EXISTS highest_assigned integer NOT NULL DEFAULT 0;

-- Il trigger che lo alza. GREATEST, mai un assegnamento: una cancellazione o
-- una correzione all'ingiù non possono abbassarlo.
CREATE OR REPLACE FUNCTION public.bump_series_watermark()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.party_series
     SET highest_assigned = GREATEST(highest_assigned, NEW.number)
   WHERE id = NEW.series_id;
  RETURN NEW;
END;
$$;
```

La proposta è allora `highest_assigned + 1`, e **non è un conteggio**: è la lettura di un
livello. Il campo resta modificabile (D-36-06), e ciò che viene salvato è ciò che è stato
scritto.

**Il caso di gara, e perché è già risolto:** due persone con due schede aperte ricevono la
stessa proposta; la seconda `INSERT` viola
`event_parties_format_series_number_unique` e riceve un rifiuto nominato. È precisamente il
motivo per cui D-36-08 mette il vincolo nel database e non nell'applicazione.

*`SET search_path = ''` e i riferimenti qualificati per intero: è il pattern di ogni
funzione recente di questo repo (`32-PATTERNS.md` § *Pattern 1*), e l'advisor di Supabase
segnala `function_search_path_mutable` senza.*

### Pattern 3 — Il ritiro, che non è una cancellazione

`retired_at timestamptz` su entrambe le tabelle di catalogo (nullable; `NULL` = attivo).

- **Le superfici che guardano avanti** (la riga di chip, il `<select>` per un'assegnazione
  nuova) filtrano `retired_at IS NULL`.
- **L'archivio rende ciò che una serata portava davvero** — nessuna riscrittura (D-36-10).
- **Nessun `DELETE` da nessuna parte**: `ON DELETE RESTRICT` sulle due chiavi lo rende
  strutturale, non una disciplina.
- `retired_at` è un timestamp e non un booleano perché *quando* una sigla è stata ritirata
  è un fatto che serve, e il repository ha già il precedente della sigla ritirata il
  2026-08-04 (`production-calendar.md`).

**Il conflitto apparente fra FMT-05 e D-36-10** — *una sigla ritirata non può comparire* /
*l'archivio non viene riscritto* — è già risolto dalla matrice di disclosure del
`36-UI-SPEC.md`, e oggi il secondo ramo è **irraggiungibile**: la sigla ritirata non ha
coda aperta, quindi nessuna serata in archivio la porta. Va implementato lo stesso, per il
prossimo ritiro.

### Anti-pattern da evitare

- **Una costante di format in un componente.** Vietata da D-36-12/FMT-05: cambiare un
  colore richiederebbe un deploy. Il colore viaggia come `style` inline, perché Tailwind
  non genera una classe da un valore runtime.
- **Costruire i chip dai dati.** D-36-13. La comparsa di un chip sarebbe essa stessa un
  annuncio, fatto dal prodotto, nel momento sbagliato.
- **Un secondo percorso di costruzione dei chip per chi vede le bozze.** D-36-16: due
  percorsi ne diventano uno solo alla prima modifica distratta, e quello che sopravvive è
  sempre il più ricco.
- **`redirect()` su uno slug ignoto.** Se gli slug ignoti reindirizzassero e quelli noti
  no, il redirect stesso risponderebbe *«questo format esiste?»* una sonda alla volta.
- **`USING (true)` sul catalogo delle serie.** § domanda 2.
- **Ripiegare `format_id` dentro il `select` senza aggiornare `EventCard`.** Nessun errore
  di tipo lo intercetta: nessun client è parametrizzato con `Database`.
- **Un `console.error(err)` sul ramo del duplicato.** § *Pitfall 4*.

---

## Don't Hand-Roll

| Problema | Non costruire | Usa invece | Perché |
|---|---|---|---|
| Rifiutare la terna duplicata | un `select … where` prima dell'insert | `UNIQUE` nominato | Due schede aperte battono ogni controllo applicativo. D-36-08 |
| Tenere format e serie coerenti | un `CHECK` con una sotto-query (illegale in Postgres) o un trigger | chiave esterna composta | Postgres rifiuta le sotto-query in un `CHECK`; un trigger è codice che qualcuno può disabilitare |
| Il prossimo numero | `count(*)` sulle serate della serie | watermark monotono | Un conteggio è ciò che FMT-02 vieta espressamente, e una cancellazione lo abbassa |
| Lo stato del filtro | context, Zustand, `useState` con `useEffect` sull'URL | `searchParams` + `<Link>` | FMT-04 chiede un link condivisibile: è navigazione |
| Il gate della bozza sul filtro | un `if` nella pagina | `event_parties_select_published`, già viva | *La RLS è il confine, il resto è UX* |
| Il rapporto di contrasto di un colore | ricalcolarlo | le misure del `36-UI-SPEC.md` § *Color* | Sono state misurate il 2026-08-10, con il fondo di composizione dichiarato |

**L'intuizione:** in questo dominio ogni soluzione applicativa a un problema di integrità è
**una race condition con una faccia rassicurante**. Il database è l'unico punto in cui due
richieste concorrenti si incontrano.

---

## Runtime State Inventory

Questa fase aggiunge colonne e tabelle: la domanda *«dopo che ogni file del repo è
aggiornato, quali sistemi a runtime hanno ancora il vecchio stato?»* si applica.

| Categoria | Trovato | Azione richiesta |
|---|---|---|
| **Dati memorizzati** | **3 righe in `public.event_parties`**, misurate oggi, che dopo la migration devono portare `format_id`, `series_id`, `number`. Nessun'altra tabella tiene un format oggi: `grep -rniE "ramadub\|sunset\|motionlab\|RMDB\|SNST\|MTNLB\|RSNT" src supabase` restituisce **tre righe, tutte commenti** (`36-CONTEXT.md`, verificato: `src/app/api/membership/verify/route.ts:397`, `20260809003000:78-79`) | **Migrazione dei dati** dentro la stessa migration (D-36-04), § domanda 6 |
| **Configurazione di servizi vivi** | **Nessuna.** Nessun servizio esterno di questo progetto porta il concetto di format: né SumUp, né Resend, né i cron di `vercel.json`. Verificato con `grep` sull'albero | Nessuna |
| **Stato registrato dall'OS** | **Nessuno.** Il progetto gira su Vercel; non ci sono task scheduler locali né processi pm2 | Nessuna |
| **Segreti e variabili d'ambiente** | **Nessuna variabile nuova.** `.env.local` porta 9 nomi (`SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `NEXT_PUBLIC_APP_URL`, `MASTER_EMAIL`, `TICKET_SIGNING_SECRET`); nessuno cambia | Nessuna |
| **Artefatti di build e strumenti** | **Tre, e sono la parte che si dimentica.** (1) `scripts/rls-baseline.mjs:1226-1229` — la sonda di scrittura di `event_parties` non fornisce le colonne nuove; (2) `scripts/rls-baseline.mjs:1467-1474` `PROBE_REFERENCE_TABLES` e `scripts/container/seed.mjs:100-109` `REFERENCEABLE` — non conoscono le tabelle nuove, quindi un `{{formats}}` non si risolverebbe; (3) `src/types/database.ts` — `EventParty` (`:71-91`) e i tipi nuovi | **Aggiornare i tre nello stesso commit della migration.** Il gate *tipi allineati* di `supabase-data.md` copre il terzo; i primi due non hanno un gate e per questo stanno qui |

**Ciò che il container fa da solo, e non va toccato:** applica **tutte** le migration della
cartella in ordine (`rls-baseline-container.mjs:253-262`) e concede i privilegi di default
alle tabelle nuove (`auth-shim.sql:160-163`), quindi `assertGrants` continuerà a passare
senza modifiche. `FLOOR_RLS_ENABLED_TABLES = 20` è un **minimo**: due tabelle in più lo
soddisfano meglio.

---

## Common Pitfalls

### Pitfall 1 — La sonda di scrittura del baseline smette di misurare una policy

**Cosa va storto:** `scripts/rls-baseline.mjs:1226-1229` inserisce in `event_parties` con
`event_id, title, time`. Una colonna `NOT NULL` senza default fa fallire ogni tentativo
con **`23502`, per tutte le personas**.

**Perché succede:** il comparatore confronta *esiti*. Vedrebbe quattordici celle passare da
`ok:1`/`42501` a `23502` e le etichetterebbe come un movimento della matrice — quando in
realtà la matrice ha semplicemente **smesso di misurare**. È lo stesso equivoco che
`20260809003000:335-343` descrive per il `RESTRICT` su `artists`, ma peggiore: lì il
rifiuto era reale, qui il payload è rotto.

**Come evitarlo:** aggiornare il payload **nello stesso piano** della migration —
`{{formats}}` e `{{party_series}}` fra i valori, e le due tabelle in
`PROBE_REFERENCE_TABLES` (`rls-baseline.mjs:1467-1474`) e in `REFERENCEABLE`
(`seed.mjs:100-109`). Ordine: `formats` ordina prima di `party_series`, che ordina prima di
`event_parties`… **ma `event_parties` sta in `SEED_ORDER` (`seed.mjs:92`), che gira prima
del `rest` ordinato.** Quindi le due tabelle nuove vanno **dentro `SEED_ORDER`, prima di
`event_parties`**, o le loro righe non esisteranno quando la serata le referenzia.

**Segnale d'allarme:** una riga della matrice interamente `23502`.

### Pitfall 2 — Il rifiuto nominato che nessuno vede mai

**Cosa va storto:** l'operatore digita un numero già assegnato, preme salva, e la pagina
dice che è andato tutto bene.

**Perché succede:** `updateEvent` (`actions.ts:373-410`) non destruttura `{ error }` da
nessuna delle scritture per-serata. La `UPDATE` fallisce, il codice prosegue, `revalidateEventPaths()`
gira e l'azione ritorna `{ success: true }`. **Il vincolo funziona; è il percorso a
ingoiarlo.** `createEvent`, per contrasto, controlla (`:295-303`) — quindi il difetto è sul
solo percorso di modifica, che è quello quotidiano.

**Come evitarlo:** questa fase **deve** convertire quel ciclo a controllare l'errore per
serata e a distinguere `23505` da tutto il resto. Non è un extra: senza, D-36-08 non
produce alcun effetto osservabile, e `meta-gates.md` è esplicito — *«finché non c'è error
tracking, "loggare l'errore" non è sufficiente: un fallimento che conta deve avere un
effetto osservabile»*.

**Segnale d'allarme:** qualunque `await client.from(…).update(…)` il cui risultato non
viene destrutturato.

### Pitfall 3 — La policy della serie che è `USING (true)` travestita

**Cosa va storto:** la policy si scrive `WHERE ep.series_id = series_id` copiando la forma
di `party_credits` (`:225`, `WHERE ep.id = party_id`).

**Perché succede:** in `party_credits` il riferimento non qualificato è **non ambiguo**
perché `event_parties` non ha una colonna `party_id`. Qui `event_parties` **ha** una
colonna `series_id`, quindi entrambi i lati si risolvono all'alias interno e il predicato
diventa una tautologia: **vero per ogni serata pubblicata, quindi vero per ogni serie**.
Compila, non fallisce mai, e pubblica tutto il catalogo delle serie.

**Come evitarlo:** qualificare con il nome della tabella della policy —
`WHERE ep.series_id = party_series.id`. E **verificarlo con una misura**, non con una
rilettura: `select policyname, qual from pg_policies where tablename = 'party_series'` dopo
l'applicazione, e leggere la resa di Postgres.

**Segnale d'allarme:** un `qual` che, riletto, non nomina `party_series`.

### Pitfall 4 — L'oggetto d'errore che finisce in un log

**Cosa va storto:** il ramo del duplicato fa `console.error("format duplicate", err)`.

**Perché succede:** è la forma che ~20 siti di questo repository usano già
(`postgrest-details-leaks-the-row.md`).

**Come evitarlo:** loggare `err.code` e `err.message`, **mai** l'oggetto e **mai**
`err.details`. Il branching sta sul `code`, perché **Next redige il messaggio di un errore
lanciato da una Server Action in produzione** (`src/lib/capabilities/server.ts:59-63`) — un
client che ramifica sul messaggio funziona in `next dev` e smette dove conta.

**Segnale d'allarme:** un `console.error` a due argomenti dove il secondo è l'errore intero.

### Pitfall 5 — Il chip che si spegne perché il format non ha serate visibili

**Cosa va storto:** qualcuno «migliora» la riga disabilitando o attenuando un chip senza
risultati.

**Perché succede:** sembra una cortesia verso il visitatore.

**Come evitarlo:** il `36-UI-SPEC.md` § 0 regola 2 lo vieta con la ragione giusta —
*«è un conteggio con un bit di risoluzione, e rivela lo stesso fatto»*. Se il chip di un
format si spegnesse quando quel format non ha niente di pubblicato, **accendersi** sarebbe
l'annuncio.

**Segnale d'allarme:** qualunque proprietà del chip che dipenda dall'array dei risultati.

### Pitfall 6 — La verifica fatta su `/events`, che non prova niente

**Cosa va storto:** si apre `/events?format=x`, non si vede nessuna bozza, si dichiara
FMT-06 verificato.

**Perché succede:** il commento a `page.tsx:42-57` lo ha già registrato con la misura per
le capability — la pagina risponde *«nessuna differenza»* **perché non può vederne una**:
la RLS rifiuta le righe non pubblicate a `anon` a prescindere da cosa la pagina decide.

**Come evitarlo:** § *Validation Architecture*, procedura V3. E c'è un fatto misurato oggi
che la rende obbligatoria: **entrambi gli eventi di produzione sono pubblicati.** Non esiste
oggi una serata non annunciata contro cui la sonda possa girare: **va seminata di
proposito**, e senza quello il filtro non è stato messo alla prova nemmeno una volta.

---

## Code Examples

### La colonna, il backfill e il guardiano — la forma della migration

```sql
-- Nullable, senza default: nessuna riga prende un valore per caso.
ALTER TABLE public.event_parties
  ADD COLUMN IF NOT EXISTS format_id uuid REFERENCES public.formats      ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.party_series ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS number    integer;

-- Le tre serate di produzione, una per una, per uuid. D-36-04: esplicitamente.
-- (Gli uuid li scrive il piano dopo averli letti; non stanno in questo file,
--  che è pubblico.)

-- Le righe che esistono altrove — container, sviluppo — prendono un format
-- RITIRATO ALLA NASCITA: non compare in nessun chip e non è assegnabile.
UPDATE public.event_parties
   SET format_id = (SELECT id FROM public.formats WHERE slug = 'unclassified'),
       series_id = (SELECT id FROM public.party_series WHERE code = 'UNCL'),
       number    = 0
 WHERE format_id IS NULL;

-- IL GUARDIANO. Senza, il SET NOT NULL fallisce con 23502 su una tabella e
-- nessuna frase. Con, chi applica la migration legge un numero.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.event_parties WHERE format_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION
      'formats backfill left % event_parties rows without a format. '
      'Nothing is set NOT NULL and this transaction rolls back.', n;
  END IF;
  RAISE NOTICE 'formats backfill: every event_parties row carries a format.';
END;
$$;

ALTER TABLE public.event_parties
  ALTER COLUMN format_id SET NOT NULL,
  ALTER COLUMN series_id SET NOT NULL,
  ALTER COLUMN number    SET NOT NULL;

ALTER TABLE public.event_parties
  ADD CONSTRAINT event_parties_number_positive CHECK (number > 0);
```

> **Attenzione al `CHECK (number > 0)` insieme al `number = 0` del ripiego.** Le due righe
> sopra si contraddicono: il ripiego assegna `0` e il `CHECK` lo rifiuta. È deliberato che
> siano vicine in questo esempio — è l'errore che un piano scriverebbe. Il piano scelga
> **una** delle due: o il ripiego assegna un progressivo reale (`row_number()` dentro la
> serie di ripiego), o il `CHECK` è `>= 0`. La prima è preferibile: `0` come valore
> speciale è un `null` travestito.

### `searchParams` sulla pagina, nella forma di casa

```tsx
// src/app/(public)/events/page.tsx
interface EventsPageProps {
  // La forma già usata a menu/page.tsx:43, growth/page.tsx:30, review/page.tsx:83.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;

  // Un parametro ripetuto arriva come array (docs Next, § searchParams):
  // `?format=a&format=b` ⇒ string[]. Non è un caso da gestire: è un valore
  // non riconosciuto, e un valore non riconosciuto significa NESSUN FILTRO —
  // non lista vuota, non errore, non redirect.
  const rawFormat = typeof params.format === "string" ? params.format : null;
  const rawTab    = typeof params.tab    === "string" ? params.tab    : null;
  const activeTab = rawTab === "past" ? "past" : "upcoming";
  // …
}
```

### L'href tipizzato — misurato, non assunto

```tsx
// Compila sotto `typedRoutes: true`, verificato con il tsc del repository
// il 2026-08-10 contro la forma di RouteImpl documentata a
// src/lib/routes/capability-routes.ts:355-366.
<Link href={`/events?format=${format.slug}`} aria-current={isCurrent ? "true" : undefined}>

// NON compila: una variabile `string` nuda non è un Route.
const href = "/events?" + params.toString();
<Link href={href}>   // ✗
```

---

## State of the Art

| Approccio vecchio | Approccio corrente | Quando è cambiato | Cosa significa qui |
|---|---|---|---|
| `searchParams` sincrono | `Promise`, da attendere | Next `15.0.0-RC` | Nessun impatto: il repo è già sulla forma nuova in quattro pagine |
| `params`/`searchParams` tipizzati a mano | helper globale `PageProps<'/route'>` | Next 16 | **Deliberatamente non adottato**: `PageProps` è già il nome di quattro interfacce locali in questo repo |
| Cache di default aggressiva su `fetch` | `no-store` di default | Next 15 | Nessun impatto: la pagina è già Request-time via `cookies()` |
| `public.is_admin_or_organizer()` nelle policy | `(select private.has_capability('…'))` | 2026-08-07, fase 32 | Ogni policy nuova usa la forma nuova, con il wrapper `(select …)` |
| Verifica delle policy per lettura del diff | `baseline:rls` / `baseline:container` / `baseline:compare` | fase 32 | Una policy nuova entra nella matrice, o non è misurata |

**Deprecato / da non copiare:** `public.is_admin_or_organizer()`; le policy in stile
`exists (select 1 from public.profiles where id = auth.uid() and role in (…))`
(`20260226200000_venues.sql:30-39`); `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` su un
vincolo referenziato.

---

## Environment Availability

| Dipendenza | Serve a | Disponibile | Versione | Ripiego |
|---|---|---|---|---|
| Node + npm | build, script di verifica | ✓ | — | — |
| `next build --webpack` | typecheck e gate dei tipi | ✓ | next 16.1.6 | — |
| Supabase Management API + `SUPABASE_ACCESS_TOKEN` | applicare la migration | ✓ | token presente in `.env.local` | — |
| **Supabase CLI** | `supabase db push` | **✗** | — | **L'endpoint `/v1/projects/{ref}/database/migrations`.** Nessuno script lo avvolge: il piano deve scrivere la chiamata per intero |
| Docker + `postgres:17.6` | `baseline:container` | **non verificato in questa sessione** | — | Se manca, resta `baseline:rls` sulla produzione (che però non può misurare la matrice di scrittura senza `--i-know-this-writes`) |
| `npm run verify:capabilities` | catalogo ↔ `CAP` | ✓ (richiede il database) | — | — |
| Un secondo account per provare un rifiuto | provare che il gate rifiuta qualcuno | **✗** | — | **Nessuno.** È il debito aperto: 32 voci `human_needed` fra le fasi 43, 35 e 34 |

**Dipendenze mancanti senza ripiego:** la capacità di **autenticarsi come un ruolo** da uno
strumento di questo repository. Ogni prova che riguarda *chi vede cosa* è una procedura
manuale con account reali.

**Dipendenze mancanti con ripiego:** la CLI Supabase (l'endpoint della Management API la
sostituisce interamente per questo uso).

---

## Validation Architecture

> `.planning/config.json` non disabilita la validazione. Questa sezione dice **che cosa si
> può davvero validare qui**, e — con altrettanta precisione — che cosa no.

### Il framework di test

| Proprietà | Valore |
|---|---|
| Framework | **NESSUNO.** `package.json` non ha uno script `test`; nessun file `*.test.*` o `*.spec.*` esiste nel repository |
| File di configurazione | nessuno, e non ne va introdotto uno in questa fase |
| Comando rapido | `npm run build` — che **è** il typecheck (`next build` esegue il controllo dei tipi) |
| Suite completa | non esiste |

**Nessun criterio di accettazione di questa fase può essere «i test passano».** Dirlo è
obbligatorio; fingere una copertura che non c'è è peggio che non averla
(`CLAUDE.md`, Environment Guardrail 1).

### Quello che gli strumenti di questo repository possono davvero asserire

| Comando | Che cosa asserisce **davvero** | Che cosa NON asserisce |
|---|---|---|
| `npm run build` | I tipi TypeScript compilano; l'unione `Record<CapabilityKey, Binding>` è totale; ogni rotta staff **statica** del tipo generato ha un binding | **Nessun nome di colonna**: nessun client Supabase è parametrizzato con `Database`. Un `format_id` scritto `fomat_id` in una query compila |
| `npm run verify:capabilities` | Le dodici chiavi in `CAP`, le righe di `private.capabilities`, le stringhe nei corpi delle policy applicate e i siti di chiamata in `src/` sono lo stesso insieme | Che una chiave sia legata alla rotta giusta; che una policy sia **corretta** |
| `npm run verify:routes` | Ogni `revalidatePath` visibile staticamente nomina un indirizzo dichiarato; ogni `page.tsx` sotto `(admin)` ha un pattern nella mappa | Le rotte dinamiche viste dal compilatore (non ce ne sono nel tipo generato) |
| `npm run baseline:container` + `baseline:compare` | La matrice lettura/scrittura per persona **prima e dopo**, su `postgres:17.6`, contro lo schema costruito da tutte le migration | Che un movimento sia voluto. Il comparatore confronta esiti e **non sa distinguere una policy da un vincolo** (`20260809003000:335-343`) |
| `npm run verify:persona` | Coerenza della persona (path morti, indice ↔ frontmatter, materiale di produzione fuori dal repo) | Nulla sul prodotto |

### Requisiti → prova disponibile

| Req | Comportamento | Tipo di prova | Comando o procedura | Esiste? |
|---|---|---|---|---|
| FMT-01 | Un evento tiene due serate di format diversi | manuale | **V1** | ❌ da scrivere |
| FMT-02 | Il numero è memorizzato e non si ricalcola | manuale | **V2** | ❌ da scrivere |
| FMT-03 | Il database rifiuta la terna duplicata | **automatica** | sonda di vincolo sul percorso privilegiato, come `20260809000000` § *constraint probes*, aggiunta a `rls-baseline.mjs` | ❌ da scrivere |
| FMT-03 (bis) | Format e serie non possono divergere | **automatica** | seconda sonda di vincolo: `INSERT` con `format_id` di un format e `series_id` di una serie di un altro ⇒ `23503` | ❌ da scrivere |
| FMT-04 | Il filtro sopravvive alla navigazione e si condivide | manuale | **V4** | ❌ da scrivere |
| FMT-05 | Colore ed etichetta cambiano senza deploy; una sigla ritirata sparisce dalle superfici in avanti | manuale | **V5** | ❌ da scrivere |
| FMT-06 | Nessun conteggio/etichetta/codice rivela una serata non annunciata | **manuale, e non c'è alternativa** | **V3** | ❌ da scrivere |
| — | Nessuna policy si è mossa senza che qualcuno lo abbia deciso | **automatica** | `baseline:container` prima/dopo + `baseline:compare` | ✓ esiste, va **esteso** alle due tabelle nuove |
| — | Il catalogo non ha rotto la mappa rotta↔capability | **automatica** | `npm run build` + `npm run verify:routes` | ✓ esiste |

### Frequenza di campionamento

- **A ogni commit del piano:** `npm run build`
- **Al commit che tocca la mappa o una rotta:** `npm run build && npm run verify:routes`
- **Al commit che applica la migration:** `npm run verify:capabilities` (il catalogo delle
  capability non cambia, ma un errore di applicazione lo si vede lì per primo) +
  `baseline:container` con un punto di fase nuovo
- **Prima della chiusura della fase:** `baseline:compare` fra il punto pre-36 e il punto
  post-36, **con una frase per ogni cella che si muove**; poi le cinque procedure manuali

### Wave 0 — che cosa manca prima di implementare

- [ ] **Nessuna installazione di framework.** Non ce n'è uno e non se ne introduce uno qui.
- [ ] `scripts/rls-baseline.mjs:1226-1229` — payload di `event_parties` aggiornato con le
      colonne nuove
- [ ] `scripts/rls-baseline.mjs:1467-1474` `PROBE_REFERENCE_TABLES` — `formats`,
      `party_series`
- [ ] `scripts/container/seed.mjs:92` `SEED_ORDER` e `:100-109` `REFERENCEABLE` — le due
      tabelle **prima** di `event_parties`
- [ ] Due celle nuove nella matrice di lettura, per `formats` e `party_series` — senza,
      le loro policy non sono misurate da niente
- [ ] Le due sonde di vincolo (FMT-03 e la chiave composta), sul percorso privilegiato
- [ ] Un punto di baseline `pre-36` catturato **prima** che la migration parta — *«un
      baseline preso dopo il cambiamento non è un baseline»* (`rls-baseline.mjs:6-11`)

### Le cinque procedure manuali, in forma

**V1 — la serata doppia.** Con un account che ha `catalogue.manage`: creare un evento con
due serate di format diversi, salvare, aprire `/events` e verificare che **una sola card**
mostri **due marker** nell'ordine di `sort_order`; aprire il dettaglio e verificare che
ogni serata mostri il proprio.

**V2 — il numero non si ricalcola.** Assegnare i numeri *n* e *n+1* a due serate della
stessa serie. Cancellare quella con *n*. Osservare che l'altra porta **ancora** *n+1* e non
è diventata *n*. Riaprire il form di una serata nuova nella stessa serie e osservare che
la proposta è **almeno** *n+2* — cioè che la cancellazione non ha abbassato il livello.

**V3 — FMT-06, e questa è la procedura che decide la fase.** Con un account
`catalogue.manage`: seminare una serata **su un evento NON pubblicato**, sotto un format
scelto. *Oggi entrambi gli eventi di produzione sono pubblicati: questa serata va creata
apposta.* Poi, **in una finestra privata, senza sessione**:

1. `/events` — la riga di chip è **identica** a quella che vede uno staff (D-36-16)?
2. `/events?format=<quel format>` — la lista è vuota, e la stringa vuota è **la stessa**
   che compare per ogni altro format (nessuna informazione su quale ha del nascosto)?
3. **Il sorgente della pagina**, non il rendering: `view-source` o `curl`. Nessun
   conteggio, nessun `aria-label`, nessun `title`, nessuna chiave JSON che nomini la
   serata seminata?
4. Il link condiviso, aperto da un dispositivo diverso, dà lo stesso risultato?
5. **La chiave anonima direttamente**, che è il punto in cui la UI smette di contare:
   `GET /rest/v1/party_series?select=*` — quante righe? Solo quelle che una serata
   pubblicata referenzia?

Poi pubblicare l'evento e ripetere il punto 2: **ora deve comparire**. Un rifiuto che non
si è mai visto diventare un'ammissione non è stato provato.

**V4 — il filtro nell'indirizzo.** Scegliere un format, navigare a un evento, tornare
indietro: il filtro è ancora quello? Copiare l'indirizzo, aprirlo in una finestra nuova: si
apre sullo stesso filtro? Scegliere `Past` e poi un format: **il tab è ancora `Past`**?
Digitare `?format=qualcosa-che-non-esiste`: la lista è **completa** e il chip `All` è
corrente — non una lista vuota, non un errore, non un redirect.

**V5 — dati e non codice.** Cambiare il colore di un format dal catalogo e ricaricare
`/events` **senza deploy**: il pallino è cambiato. Ritirare un format: il suo chip
scompare, la sua voce sparisce dal `<select>` per un'assegnazione nuova, **e una serata
d'archivio che lo portava continua a mostrarlo**.

### Che cosa questa fase **non** può validare, e va scritto invece che aggirato

1. **Che il gate rifiuti qualcuno.** Nessuno strumento di questo repository può
   autenticarsi come un ruolo. È il debito di 32 voci `human_needed` (`STATE.md:50-56`).
   Questa fase **non lo consuma e non lo peggiora**, e costruisce superfici pubbliche
   sopra un modello dei permessi che nessuno ha ancora visto rifiutare qualcuno.
2. **Che un nome di colonna nuovo sia scritto giusto ovunque.** Nessun client è
   parametrizzato con `Database`. Un `select("format_id")` scritto male restituisce un
   errore PostgREST a runtime, non un errore di build.
3. **Che nessuna superficie pubblica porti un conteggio.** Non c'è un meccanismo che lo
   asserisca. La cosa più vicina a una prova è **la lettura del sorgente reso** nel punto 3
   di V3 — e va fatta, non evocata.

---

## Security Domain

`security_enforcement` non è disabilitato in `.planning/config.json`.

### Categorie ASVS applicabili

| Categoria ASVS | Si applica | Controllo di casa |
|---|---|---|
| V2 Authentication | no | Nessun percorso di autenticazione cambia |
| V3 Session Management | no | Nessun cookie, nessun token toccato |
| **V4 Access Control** | **sì** | RLS in migration (il confine) + `capability-routes.ts` (il redirect) + la guardia dentro ogni server action. `catalogue.manage`, `requires_approved = true` |
| **V5 Input Validation** | **sì** | `?format=` è **input non fidato**. Nessuna libreria di validazione nel repo: la validazione è **l'appartenenza al catalogo attivo**, che è la forma più stretta possibile (un allow-list dai dati). Valore ignoto ⇒ nessun filtro |
| V6 Cryptography | no | Nulla da cifrare o firmare |
| V7 Error Handling | **sì** | `meta-gates.md` *zero fallimenti silenziosi* + il todo `postgrest-details-leaks-the-row`: `code` e `message`, mai l'oggetto |

### Pattern di minaccia per questo stack

| Pattern | STRIDE | Mitigazione |
|---|---|---|
| **Enumerazione via redirect** — reindirizzare uno slug ignoto e non uno noto risponde *«questo format esiste?»* una sonda alla volta | Information Disclosure | Comportamento **uniforme**: nessun redirect, mai. `36-UI-SPEC.md` § *The URL contract* |
| **Il conteggio come canale** — un numero rivela senza mostrare, quindi nessuna ispezione visiva lo scopre | Information Disclosure | D-36-14; la stringa di stato vuoto calcolata dall'array già reso, mai da una seconda query |
| **Il catalogo come sorgente di rivelazione** — una serie che porta il nome di una sede, leggibile con la chiave anonima | Information Disclosure | Il cancello ereditato su `party_series` (§ domanda 2), più il ripiego al solo nome del format quando una serata è segreta (`36-UI-SPEC.md` § S2) |
| **PostgREST come percorso non enumerato** — la UI non lo disegna, la chiave anonima lo legge lo stesso | Information Disclosure | Le colonne interne (`code`, `number`) non hanno una difesa a livello di riga: § *Open Question 2* |
| **SQL injection** | Tampering | Nessuna SQL costruita a mano: `supabase-js` parametrizza. `?format=` non entra mai in una stringa SQL |
| **Race sul progressivo** | Tampering | Il vincolo unico nominato, nel database (D-36-08) |
| **La server action come endpoint pubblico** | Elevation of Privilege | Ogni azione ri-chiede `catalogue.manage` al proprio interno (`nextjs-architecture.md`), sul modello di `admin/venues/actions.ts` |

---

## Findings outside scope

> Registrati perché `CLAUDE.md`, Operational Discipline 5, lo impone: *«se sai che una
> modifica può anticipare la rivelazione di un venue, DEVI dirlo, anche se non ti è stato
> chiesto.»* **Nessuno dei due è compito della fase 36.**

### V1 — Un venue segreto è a un join di distanza dalla chiave anonima

**Misurato il 2026-08-10** con la sola `NEXT_PUBLIC_SUPABASE_ANON_KEY`, senza sessione:

- `GET /rest/v1/event_parties?select=id,venue_secret,venue_id` restituisce **3 righe**, di
  cui **2 con `venue_secret = true`**, ed **entrambe portano un `venue_id` non nullo**.
- `GET /rest/v1/venues?select=id,name` restituisce **5 righe**: `venues_select_public` ha
  `qual = true`.
- `GET /rest/v1/event_parties?select=venue_secret,venues(address,google_maps_url)&venue_secret=eq.true`
  restituisce **2 righe su 2** con un indirizzo o un link mappa **non nullo**.

Cioè: **l'indirizzo di entrambe le serate marcate segrete oggi è leggibile da chiunque
abbia la chiave anonima**, in una sola richiesta. `venue_secret` governa il **rendering**
(`isVenueVisible` in `events/[slug]/page.tsx`, `SecretVenueDialog`), non l'**accesso ai
dati**.

*Nessun nome, nessun indirizzo è riportato qui: questo file è pubblico.*

**È `venue-secrecy.md`, gate *percorsi enumerati*, e PostgREST non è nella lista datata di
quel modulo.** È anche il principio 2 di `CLAUDE.md` alla lettera: *«una feature protetta
solo dal middleware è esposta»* — qui è protetta solo dal componente.

**Perché riguarda la fase 36 senza esserne compito:** si potrebbe concludere *«tanto le
sedi sono già pubbliche, quindi il catalogo delle serie può essere `USING (true)`»*.
**Non regge.** Aggiungere una seconda porta a una porta già aperta è comunque allargare, e
`meta-gates.md` permette solo la direzione opposta. La raccomandazione della domanda 2 non
cambia.

**Rimedio, per la fase che lo prenderà** (37 è la candidata naturale — è la fase della
rivelazione): la lettura di `venue_id` su una serata segreta va gated, o l'indirizzo va
spostato dietro una funzione che valuta il titolo per-biglietto/per-RSVP. **Non è un
cambiamento di componente.**

### V2 — La storia delle migration ha diciotto voci di deriva, non una

§ domanda 6, ultima parte. `STATE.md:156-159` ne registra una. Ripararla è decisione del
proprietario e costa un `PUT` per file, sullo stesso endpoint, senza applicare nulla.

---

## Assumptions Log

| # | Affermazione | Sezione | Rischio se sbagliata |
|---|---|---|---|
| A1 | Il testo di `DETAIL` di Postgres per una violazione di unicità è `Key (cols)=(vals) already exists.` — **non misurato in questa sessione**, dedotto dal comportamento noto di Postgres e per contrasto con il `Failing row contains (…)` misurato dal todo per i `CHECK` | § domanda 3 | Se anche l'unicità emettesse la riga intera, il ramo d'errore dovrebbe essere più stretto. **Mitigazione: il ramo raccomandato non legge mai `details`, quindi la conclusione operativa non cambia**; cambia solo l'argomento sul perché il todo non si applica. Misurabile con una sonda di vincolo nel container |
| A2 | I quattro colori di identificazione sono *da adottare*, non da inventare | D-36-11, `36-VISUAL-SOURCE.md` | Sono già committati in `.claude/rules/brand-visual-system.md`: rischio nullo. Riportato per completezza |
| A3 | Docker con `postgres:17.6` è disponibile su questa macchina | § *Environment Availability* | Se non lo fosse, `baseline:container` non gira e la matrice non si cattura — cioè metà della validazione automatica di questa fase sparisce. **Va verificato prima di pianificare le onde**, perché decide quali task esistono |
| A4 | La struttura del catalogo a due tabelle è compatibile con ogni decisione bloccata | § *Architecture Patterns* | D-36-05 e D-36-07 la richiedono; il `36-CONTEXT.md` § *Discretion* la lascia aperta. Se il proprietario preferisse un'altra forma, la chiave composta della domanda 3 va ripensata |
| A5 | Il format di ripiego (`unclassified`, ritirato alla nascita) è accettabile per le righe non di produzione | § domanda 6 | Introduce una riga di catalogo che nessuno ha deciso. È **visibile solo nel catalogo**, mai in un chip. Un piano che preferisca farne a meno deve risolvere altrimenti il problema del container |

---

## Open Questions (TUTTE RISOLTE — chiuse il 2026-08-10, dopo la pianificazione)

> Aggiornato dopo il plan-checker, che ha giustamente segnalato che questa
> sezione si leggeva ancora come aperta mentre tutte e quattro avevano una
> risposta. **Una domanda risolta lasciata scritta come aperta e' un invito a
> ri-deciderla**, e chi la ri-decide non ha il contesto di chi l'ha chiusa.

| # | Esito | Chiusa da |
|---|---|---|
| 1 | **RISOLTA — accolta, e portata piu' in profondita'** | D-36-17 (proprietario) + piano 36-03 |
| 2 | **RISOLTA — accettata come raccomandato** | piano 36-03 (la frase va nella migration) |
| 3 | **RISOLTA — `catalogue.manage` sulla rotta** | piano 36-06, con la divergenza dichiarata |
| 4 | **NON PERTINENTE** — resta aperta fuori da questa fase | — |

**Su (1), la differenza vale la pena di essere scritta.** La raccomandazione qui
sotto proponeva l'interruttore come criterio per *costruire la riga di chip*,
lasciando la lettura della tabella incondizionata. Il proprietario ha deciso la
separazione (D-36-17) e il piano 36-03 l'ha portata **dentro la policy**:
`formats_select_listed USING (listed = true)`. La ragione e' che con la lettura
incondizionata il nome di un format preparato in anticipo resta leggibile con la
chiave anonima — **annunciato lo stesso, solo per un'altra porta**. La UI che non
disegna un chip non e' un cancello.

---

1. **Un format nuovo diventa pubblico nel momento in cui la riga viene creata.**
   **→ RISOLTA.** Vedi la tabella sopra: D-36-17 e piano 36-03.
   - *Quello che sappiamo:* `formats_select_public USING (true)` è ciò che D-36-13 e
     D-36-16 richiedono, ed è sicuro per i quattro format esistenti, che sono già
     pubblici in file tracciati.
   - *Quello che non è chiaro:* un quinto format, creato in preparazione, avrebbe il suo
     chip su `/events` **immediatamente**, cioè verrebbe annunciato dal prodotto invece che
     da una persona. È lo stesso difetto di D-36-13, spostato di un livello.
   - *Raccomandazione:* aggiungere `listed boolean NOT NULL DEFAULT false` alla tabella dei
     format, e costruire la riga di chip da `listed = true AND retired_at IS NULL`. Non
     contraddice D-36-13 — la riga continua a non cambiare **con i dati**, cambia solo
     quando **una persona** decide, che è la stessa forma di `events.is_published`.
     **È una colonna che il proprietario non ha deciso: va portata a lui in fase di
     pianificazione**, con questa frase e non con il vocabolario dello schema.

2. **`code` e `number` non hanno una difesa a livello di riga, solo a livello di query.**
   **→ RISOLTA — accettata come raccomandato**, con la frase scritta nella migration (piano 36-03).
   - *Quello che sappiamo:* il `36-UI-SPEC.md` § *Surface Disclosure Matrix* dice **mai**
     per il codice di format, il codice di serie, il numero e la sigla composta su una
     superficie pubblica. La pagina rispetterà la regola selezionando le colonne che le
     servono.
   - *Quello che non è chiaro:* la RLS è **per riga**, non per colonna. Chiunque abbia la
     chiave anonima può chiedere `?select=*` sulle righe che gli sono concesse. Per i
     format questo espone `code` (`RMDB`, `SNST`, …) — che è interno per convenzione, non
     per necessità, e **non è un segreto**: sta in `production-calendar.md`, tracciato. Per
     `party_series` e per `event_parties.number` l'esposizione è limitata alle serate già
     pubblicate, cioè a serate già annunciate.
   - *Raccomandazione:* **accettare, e scriverlo nella migration.** Un `REVOKE SELECT
     (code) ON public.formats FROM anon` funziona, ma trasforma un innocuo `?select=*` in
     un `42501` per il codice dell'applicazione stesso, e non c'è un precedente di grant di
     colonna in questo repository (l'unico `REVOKE` su colonne è
     `20260808005000_membership_acts_append_only.sql:139`, ed è per verbo, non per colonna).
     Il rapporto costo/beneficio non lo giustifica per un dato già pubblicato altrove. **La
     frase va nella migration**, o il prossimo lettore lo prende per una svista.

3. **Quale capability apre la superficie di catalogo.**
   **→ RISOLTA — `catalogue.manage` sulla rotta** (piano 36-06), con la divergenza
   dalle gemelle dichiarata: sposta il rifiuto **prima**, che e' l'unica direzione
   permessa da `access-gating.md`.
   - Le due gemelle (`/admin/venues`, `/admin/artists`) sono legate a `organizer.access`,
     con le azioni su `catalogue.manage`. Raccomandazione: **`catalogue.manage` per la
     rotta**, § domanda 5 — ma è una divergenza dalle gemelle, e va dichiarata nel piano.

4. **`--soy`**, il quinto token del foglio di stile del tracker, mappato su grigio.
   - Rimane com'era: **non usato da questa fase** (`36-UI-SPEC.md` § *Open Questions* 1).
     Il grigio è offerto come neutro per meriti propri.

---

## Sources

### Primarie (confidenza ALTA — misurate in questa sessione)

- **Il repository, letto file per riga.** `supabase/migrations/20260225150000_party_architecture.sql`,
  `20260226100000_artist_profiles.sql`, `20260226200000_venues.sql`,
  `20260226300000_multi_sub_events.sql`, `20260226400000_party_lineup_venue_secret.sql`,
  `20260807000000_capability_model.sql`, `20260807010000_policies_to_capabilities.sql`,
  `20260809000000_party_assignments.sql`, `20260809003000_party_credits.sql`;
  `src/lib/routes/capability-routes.ts`, `src/lib/capabilities/keys.ts`,
  `src/lib/capabilities/server.ts`, `src/lib/supabase/{client,server,service,middleware}.ts`;
  `src/app/(public)/events/{page.tsx,EventTabs.tsx,[slug]/page.tsx}`;
  `src/app/(admin)/admin/events/actions.ts`, `src/app/(admin)/admin/venues/actions.ts`,
  `src/app/(admin)/admin/(work)/venues/page.tsx`; `scripts/rls-baseline.mjs`,
  `scripts/rls-baseline-container.mjs`, `scripts/container/{seed.mjs,auth-shim.sql}`,
  `scripts/verify-routes.mjs`, `scripts/verify-capabilities.mjs`; `package.json`,
  `next.config.ts`, `src/app/globals.css`, `src/types/database.ts`
- **Il database di produzione**, letture `read_only` via Management API
  (`/v1/projects/{ref}/database/query`) e via chiave anonima su `/rest/v1/…`: conteggi,
  `pg_policies` per `event_parties`/`venues`/`artists`/`party_credits`,
  `supabase_migrations.schema_migrations`, `to_regclass`/`to_regprocedure` per otto oggetti
- **Il compilatore del repository** (`node_modules/.bin/tsc --noEmit --strict`) per
  l'assegnabilità degli href template-literal a `RouteImpl`
- `.planning/phases/36-formats-series-numbering/36-CONTEXT.md`, `36-UI-SPEC.md`,
  `36-VISUAL-SOURCE.md`; `.planning/REQUIREMENTS.md:95-100`; `.planning/ROADMAP.md:410-424`;
  `.planning/STATE.md`; `.planning/todos/pending/postgrest-details-leaks-the-row.md`;
  `.planning/phases/32-capability-model-in-the-database/32-PATTERNS.md`
- `CLAUDE.md` e `.claude/rules/{meta-gates,supabase-data,nextjs-architecture,venue-secrecy,production-calendar,brand-visual-system,sound-manifesto,venue-acquisition}.md`

### Secondarie (confidenza ALTA — documentazione ufficiale)

- `https://nextjs.org/docs/app/api-reference/file-conventions/page` — § *searchParams
  (optional)*, § *Page Props Helper*, § *Version History*. Letta il 2026-08-10 via
  Firecrawl Cloud. La pagina si dichiara *Latest Version 16.3.0*; questo repository è su
  16.1.6 e la semantica della Promise è invariata da `v15.0.0-RC`

### Terziarie (confidenza MEDIA — da validare)

- Il testo esatto del `DETAIL` di Postgres per una violazione di unicità (A1). Nessuna
  fonte consultata in questa sessione; validabile con una sonda nel container

---

## Metadata

**Ripartizione della confidenza:**

| Area | Livello | Ragione |
|---|---|---|
| Lo stato attuale del codice e del database | **ALTA** | Ogni riga porta un `file:riga` o una misura eseguita oggi |
| Convenzioni delle migration | **ALTA** | Estratte da un file di 361 righe che le documenta esplicitamente |
| La policy di lettura da dare al catalogo | **ALTA** | Il precedente e la sua argomentazione esistono già in `party_credits` |
| La forma del vincolo (domanda 3) | **ALTA** sull'analisi, **MEDIA** sulla raccomandazione | I tre modi di fallire sono derivati dalla semantica di Postgres; la scelta fra A e C porta un compromesso reale, e il piano può divergere |
| Next 16 / `searchParams` / `typedRoutes` | **ALTA** | Documentazione ufficiale + quattro precedenti in casa + una prova col `tsc` del repo |
| Il watermark del progressivo | **MEDIA** | La forma è raccomandata, non imposta: `36-CONTEXT.md` la lascia esplicitamente al piano. Il **problema** che risolve, invece, è certo |
| Backfill e ordine della migration | **ALTA** sull'ordine, **MEDIA** sul ripiego per il container | Il ripiego introduce una riga di catalogo che nessuno ha deciso (A5) |
| Validazione | **ALTA** | I quattordici script sono stati letti; l'assenza di test runner è verificata |

**Data della ricerca:** 2026-08-10
**Valido fino a:** 2026-09-09 per le convenzioni del repository e per Next 16.
**Le misure sul database di produzione scadono al primo cambiamento del dato:** i conteggi
(2 eventi, 3 serate) e il fatto che entrambi gli eventi siano pubblicati sono veri
**al 2026-08-10** e vanno rimisurati prima di scrivere gli uuid del backfill.

---

*Fase 36 — ricerca del 2026-08-10. Ogni affermazione porta la sua misura o il suo gate.
Non contiene sedi in trattativa, date non annunciate, line-up, indirizzi o nomi di
persona: `.planning/` è tracciato e questo repository è pubblico.*
