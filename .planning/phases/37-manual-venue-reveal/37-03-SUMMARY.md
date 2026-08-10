---
phase: 37-manual-venue-reveal
plan: 03
subsystem: schema-applied-to-production
tags: [migration, produzione, capability, venue-secrecy, tipi, istantanea, autorizzazione]

requires:
  - phase: 37-manual-venue-reveal
    provides: "37-01 — il file 20260810160000_manual_venue_reveal.sql, mai eseguito prima di questo piano"
  - phase: 37-manual-venue-reveal
    provides: "37-02 — il file 20260810161000_venues_read_narrowed.sql, che questo piano NON ha applicato"
provides:
  - "La capability venue.reveal VIVA in private.capabilities — la tredicesima"
  - "public.event_parties.venue_revealed_at, colonna viva, nullable, zero righe valorizzate"
  - "public.venue_reveal_acts viva, RLS attiva, una sola policy, nessun percorso di scrittura"
  - "public.record_venue_reveal_act viva, SECURITY DEFINER, EXECUTE al solo service_role"
  - "src/types/database.ts allineato allo schema VIVO, non al file di migration"
  - "L'istantanea pre-push su 20 tabelle, con la copertura derivata da pg_constraint"
affects: [37-05, 37-06, 37-08, 37-10, 37-11, 37-13]

tech-stack:
  added: []
  patterns:
    - "I rifiuti di un applicatore stanno nel codice, non nell'attenzione di chi lo esegue"
    - "Un hash di baseline va scelto INVARIANTE rispetto al cambiamento che deve misurare, o produce un falso allarme sul proprio strumento"
    - "L'ambito di un'autorizzazione si verifica contro il CONTENUTO del file prima di inviarlo: l'autorizzazione copre la descrizione data, non il file"

key-files:
  created:
    - .planning/phases/37-manual-venue-reveal/deferred-items.md
  modified:
    - src/types/database.ts

key-decisions:
  - "Opzione C del proprietario: una migration su due. La seconda resta applicata a zero"
  - "VenueRevealAct dichiara TRE atti e non due: il CHECK vivo ammette anche 'completed', e il piano diceva due"
  - "venue_for_parties e party_start_instant NON sono nei tipi: non esistono nello schema vivo, e un tipo che li nominasse mentirebbe"
  - "L'inventario delle cascate della ricerca corretto da 17 a 18 tabelle senza riscrivere 37-RESEARCH.md"

# NESSUN requisito e' completato da questo piano, e il frontmatter del piano
# elenca [VENUE-01, VENUE-02] come i requisiti a cui CONTRIBUISCE, non come
# quelli che chiude.
#   VENUE-01 — «la rivelazione programmata resta il percorso normale»: e' una
#     proprieta' di fase, e il cron non e' stato toccato qui.
#   VENUE-02 — «un master o un organizer PUO' far scattare la rivelazione a mano,
#     dietro conferma esplicita, registrando chi e quando»: il database sa
#     registrarla, e NESSUNO PUO' PREMERLA. Non c'e' server action (37-10) ne'
#     bottone (37-11). Spuntarlo qui sarebbe un verde falso su un requisito di
#     rivelazione, che e' la categoria peggiore in cui averne uno.
requirements-completed: []

duration: ~55min
completed: 2026-08-10
---

# Fase 37 Piano 03: lo schema in produzione, metà per scelta — Summary

**La prima delle due migration è viva in produzione come versione `20260810210214`, `verify:capabilities` è verde per la prima volta da quando la tredicesima chiave esiste, e la seconda — quella che revoca la lettura anonima degli indirizzi — resta un file, per decisione del proprietario presa dopo che il costo di applicarla oggi era stato misurato invece che descritto.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3 di 3
- **Commit:** 1 di task + 1 di documentazione
- **Righe scritte in produzione:** 32 698 byte, 618 righe, **una transazione, una chiamata**
- **Righe di dati mosse:** **zero**

---

## L'autorizzazione: quando è stata chiesta, per cosa, e quando si è esaurita

`.claude/rules/ai-engineering.md` chiede che un'autorizzazione a scrivere in produzione si consumi una volta e che chi la riceve dichiari quando l'ha esaurita. Questo è quel paragrafo, e non è una formalità.

| | |
|---|---|
| **Chiesta** | 2026-08-10, al checkpoint bloccante del Task 1, **dopo** aver preso l'istantanea |
| **Per cosa** | applicare le due migration in ordine, con l'endpoint migrations, una chiamata per file |
| **Cosa è stato presentato** | la regressione temporanea sulle pagine pubbliche, l'assenza di scritture di dati, l'istantanea in sola lettura, l'assenza di PITR — più tre misure che il checkpoint richiedeva e che sono riportate sotto |
| **Risposta del proprietario, verbatim** | **«solo la prima»** — opzione C, quella che l'esecutore aveva aggiunto alle due previste dal piano |
| **Ambito concesso** | `20260810160000_manual_venue_reveal.sql`, **una migration su due**, una sola chiamata a `POST /v1/projects/{ref}/database/migrations` |
| **Usata** | una volta, alle condizioni descritte |
| **Esaurita** | all'`HTTP 200` di quella chiamata |

**Non è stata usata per nient'altro.** Nessuna correzione di dati, nessuna seconda modifica di schema, nessun «già che ci siamo», nessuna riparazione della deriva della history — che resta una chiamata del proprietario.

### Perché una su due, e perché è stata la scelta giusta

La seconda migration revoca ad `anon` ogni lettura di `public.venues`. Le tre misure prese al checkpoint hanno mostrato che quella revoca **non è simmetrica alla sua riparazione**:

1. **La rottura non ha bisogno di un deploy.** Misurato dall'output di `npm run build`: `/events`, `/events/[slug]` e `/venues/[slug]` sono tutte `ƒ (Dynamic) — server-rendered on demand`, perché `createClient()` chiama `cookies()` e questo esclude il rendering statico. Interrogano il database a ogni richiesta. La policy cade e l'effetto è immediato sul sito già online.
2. **La riparazione, sì.** I piani 37-05 e 37-06 spostano le due pagine su `public.venue_for_parties`, ma quel codice deve arrivare in produzione per contare — e il ramo di lavoro è **181 commit avanti a `origin/main`**, che è fermo al 2026-08-09. Non è «l'onda successiva»: è l'onda successiva più un deploy di quell'arretrato.
3. **La prima migration, da sola, non tocca niente di tutto questo.** È puramente additiva — non nomina mai `public.venues`, non revoca alcun privilegio pre-esistente, non modifica una riga. Applicarla da sola sblocca `verify:capabilities`, fa passare la sintassi PL/pgSQL da un parser per la prima volta, e apre 37-10 e 37-11, **a costo zero sul negozio**.

Lo scambio vero è stato messo per iscritto e deciso dal proprietario: *un indirizzo di serata segreta leggibile con la sola chiave anonima, che resta leggibile più a lungo* contro *il nome del locale che sparisce dalle serate pubbliche, adesso*. Il primo è invisibile quando accade; il secondo è visibile e si ripara con un deploy. Ha scelto di tenere aperta la fuga e non rompere la vetrina.

### Quello che i piani a valle devono sapere, e non dedurre

> **`supabase/migrations/20260810161000_venues_read_narrowed.sql` è applicata a zero.**

Non esiste in produzione nulla di ciò che quel file crea. Misurato dai cataloghi **dopo** l'applicazione della prima:

| Oggetto della seconda migration | In produzione |
|---|---|
| `public.venue_for_parties(uuid[])` | **0** |
| `public.party_start_instant(date, time)` | **0** |
| policy `venues_select_staff` | **0** |
| policy `venues_select_public` (quella che il file droppa) | **1 — ancora lì** |
| policy su `public.venues`, in totale | **4 — come prima** |

Quella riga `venues_select_public = 1` è la **prova negativa** che la seconda migration non è partita, ed è per questo che è stata misurata invece che assunta.

- **37-05 e 37-06** chiamano `public.venue_for_parties`. **Non esiste.** Il loro codice si può scrivere, non si può esercitare contro un database vivo, e non si può deployare prima che quella migration sia applicata. Il deploy delle due cose è **un atto solo**, e va pianificato come tale.
- **37-08** eredita lo stesso vincolo.
- La finestra di regressione descritta in fondo a `37-02-SUMMARY.md` **non si è aperta**, e non si aprirà finché quella migration resta un file.

---

## Task 1 — l'istantanea, e una cosa che la ricerca non aveva visto

Presa **prima** di chiedere l'autorizzazione, così che la risposta non ne ritardasse la cattura. Ogni query è passata da `/database/query` con `read_only: true`: sotto quel flag la sessione gira come `supabase_read_only_user` e un `INSERT` fallisce `25006`. **Nessun `INSERT`, `UPDATE`, `DELETE`. Nessun controllo di cancellazione premuto.**

### La copertura viene dai vincoli, non dall'elenco già scritto

`ai-engineering.md` chiede che un'istantanea copra ogni tabella raggiungibile per `ON DELETE CASCADE` dalle righe toccate, **enumerata leggendo i vincoli**. La chiusura transitiva su `pg_constraint` dai semi `{venues, events, event_parties}` dà **18 tabelle**.

> **`37-RESEARCH.md` § Runtime State Inventory ne elencava 17, e la mancante è `discount_code_tiers`.**
>
> Non è figlia diretta di `event_parties`: ci arriva **a due salti**, sia via `discount_codes` sia via `ticket_tiers`, entrambi `CASCADE`. La ricerca aveva enumerato le chiavi esterne **dirette** e le aveva chiamate «le cascate» — che è, con un livello di profondità in più, esattamente l'errore che ha prodotto l'incidente della fase 36. La tabella è vuota, quindi non c'era nulla in gioco; l'elenco però era incompleto, e chi lo rileggerà dopo deve leggere 18. `37-RESEARCH.md` **non è stato riscritto** — una ricerca è un documento datato, e si corregge dichiarando dove sta la correzione. Sta qui e in `deferred-items.md`, voce 2.

Due tabelle in più sono state incluse nel baseline pur **non** essendo nella cascata di cancellazione: `membership_acts` e `ticket_refunds`, raggiunte da `ON DELETE SET NULL`. Una cascata le **modifica** senza cancellarle, e un baseline che le omette non vedrebbe quel cambiamento.

### L'istantanea, pre-push

| tabella | righe | md5 |
|---|---|---|
| `attendances` | 0 | *(vuota)* |
| `discount_code_tiers` | 0 | *(vuota)* |
| `discount_codes` | 0 | *(vuota)* |
| `door_scan_events` | 0 | *(vuota)* |
| `drink_items` | 7 | `02380750364b7ebde811e5a348dd5446` |
| `drink_orders` | 0 | *(vuota)* |
| `drink_tokens` | 0 | *(vuota)* |
| `event_media` | 0 | *(vuota)* |
| `event_parties` | 3 | `6d3275e3b99f27c3bfc9c2d3f6a183bb` |
| `events` | 2 | `b833beb16a5becdd24a4af2778fbfca3` |
| `guest_list_entries` | 0 | *(vuota)* |
| `party_assignments` | 0 | *(vuota)* |
| `party_credits` | 0 | *(vuota)* |
| `pending_purchases` | 0 | *(vuota)* |
| `rsvps` | 0 | *(vuota)* |
| `ticket_tiers` | 1 | `d8e8a9898f3a839cb6b450d53c4510fd` |
| `tickets` | 0 | *(vuota)* |
| `venues` | 5 | `6a005509cafd0552e5abf3fbfcad98a8` |
| `membership_acts` *(SET NULL)* | 0 | *(vuota)* |
| `ticket_refunds` *(SET NULL)* | 0 | *(vuota)* |

L'md5 è calcolato sull'intera riga serializzata, ordinata: rileva un cambio di **contenuto**, non solo di conteggio. Non è un oracolo di conferma praticabile su nessuno di quei valori — riprodurlo richiederebbe indovinare uuid e timestamp al microsecondo di ogni riga.

**Stato pre-push degli oggetti attesi:** `venue.reveal` 0, `venue_revealed_at` 0, `venue_reveal_acts` 0, `venues_select_public` **1**, le tre funzioni 0, `private.capabilities` **12** righe, `private.role_capabilities` **26**.

### D-37-06 punto 4 è chiuso, e senza doverne parlare al proprietario

Il punto 4 di D-37-06 chiede di **elencare** le serate con un valore esplicito di `venue_reveal_hours` sotto 25 e portarle al proprietario **una per una**, mai con un `UPDATE`. Misurata la forma (nessun id, nessuna data, nessun nome):

- serate con `venue_secret = true`: **2**
- di queste, con finestra a `NULL`: **1**
- di queste, con un valore **esplicito sotto 25**: **0**

**Non c'è nessuna riga da portare.** L'elenco che D-37-06 chiedeva è vuoto, quindi il gate è soddisfatto senza una decisione: nessuna serata subirà lo spostamento di diciannove ore che quel punto esisteva per impedire. Una serata resta sul fallback, e per lei vale l'allargamento di un'ora già autorizzato al punto 3.

---

## Task 2 — l'applicazione

**Endpoint:** `POST /v1/projects/{ref}/database/migrations`. **Mai** `/database/query` per scrivere. Il ref è derivato da `NEXT_PUBLIC_SUPABASE_URL` e il token letto da `.env.local` dentro il processo: nessuno dei due è mai stato stampato, e nessuno dei due entra in questo file o in un messaggio di commit.

| | |
|---|---|
| **Risposta** | `HTTP 200`, corpo `[]` |
| **Versione assegnata** | **`20260810210214`**, nome `manual_venue_reveal` |
| **History** | 37 voci → **38** |

**La versione non è il timestamp del nome del file.** È l'ora dell'applicazione, come già per `20260810144239` (fase 36) e `20260806111113` (fase 31). Chi cercherà `20260810160000` nella history non lo troverà e **non deve concluderne uno scarto**.

**La deriva della history non è stata toccata.** Era 18 file applicati e non registrati prima di questa chiamata, ed è 18 dopo: questa fase non ha aggiunto la diciannovesima, e ripararla resta una decisione del proprietario, con `PUT` sullo stesso endpoint che fa upsert **senza applicare**.

### I rifiuti stanno nel codice, non nell'attenzione

L'applicatore ha il nome del file fissato dentro, e ispeziona il **contenuto** prima di inviarlo: rifiuta se il file nomina `public.venues`, se nomina una policy di quella tabella, se droppa una policy che non sia la propria, se revoca qualcosa che non sia la funzione che crea, se esegue una DML fuori dal corpo della funzione, o se non è una transazione unica. La ragione è che **l'autorizzazione copre la descrizione che è stata data**, non il file: se i due divergono, l'autorizzazione non si applica, e accorgersene deve essere meccanico.

**Ha morso una volta, ed era un falso positivo istruttivo.** Il controllo sul `DROP POLICY` ha fermato la corsa: la causa era la **riga 69 del file, un commento** che cita `DROP POLICY IF EXISTS` come pattern da seguire. Il controllo è stato corretto — l'ispezione ora salta le righe che *cominciano* con `--`, mai una porzione di riga, così non può perdere uno statement, che non inizia mai così — **e non rimosso**. Un controllo che si spegne al primo fastidio è un controllo che non c'era.

### La conferma viene dai cataloghi, non dalla risposta della chiamata

`ai-engineering.md`: la misura non si prende con lo strumento che ha causato l'effetto. Il corpo della risposta era `[]` e non dice nulla. Letto da `pg_proc`, `pg_policies`, `pg_class`, `pg_constraint` e `information_schema`:

| Oggetto | Misura |
|---|---|
| `private.capabilities` | 12 → **13**, `venue.reveal` presente |
| `private.role_capabilities` | 26 → **28**, entrambi i grant con `requires_approved = true` |
| `event_parties.venue_revealed_at` | `timestamp with time zone`, **nullable**, **nessun default**, in coda |
| righe con `venue_revealed_at` valorizzato | **0** |
| `public.venue_reveal_acts` | esiste, **RLS attiva**, **una** policy (`SELECT`) |
| `public.record_venue_reveal_act` | `prosecdef = true`, `search_path=""`, ACL `{postgres, service_role}` — **`public`, `anon` e `authenticated` assenti** |
| `venues_select_public` | **1, ancora lì** |
| `venue_for_parties`, `party_start_instant`, `venues_select_staff` | **0** |

L'ACL è la parte che conta di più: la funzione è `SECURITY DEFINER` e pubblica indirizzi. `REVOKE` prima e `GRANT` dopo hanno morso, e nessuna sessione autenticata può chiamarla via PostgREST.

### L'istantanea riletta, e il falso allarme che il mio strumento si è procurato da solo

Conteggi: **identici su tutte e 20 le tabelle**. Ma l'md5 di `event_parties` era **diverso**, e il controllo è uscito 1.

**Non era un dato mosso: era il mio strumento.** L'hash è calcolato su `(riga)::text`, e aggiungere una colonna cambia la serializzazione di **ogni** riga — compare un campo vuoto in coda — anche se nessun valore si è spostato di un byte. Avevo scelto un hash **non invariante rispetto al cambiamento che doveva misurare**, che è il difetto classico di un baseline.

Misurato invece che dedotto, con una prova discriminante: rifatto l'hash sulle **sole 24 colonne pre-esistenti**, nello stesso ordine e con la stessa serializzazione.

```
md5 sulle sole colonne pre-esistenti:  6d3275e3b99f27c3bfc9c2d3f6a183bb
md5 registrato PRIMA della push:       6d3275e3b99f27c3bfc9c2d3f6a183bb
```

**Byte-identico. Nessun valore si è mosso.** Le altre 19 tabelle hanno md5 identico senza bisogno di correzione, perché nessuna ha cambiato forma. Chi rileggerà questo baseline in 37-13 deve sapere che il valore di `event_parties` va confrontato **sulle 24 colonne pre-esistenti**, o troverà una divergenza che non c'è.

---

## Task 3 — i tipi

`src/types/database.ts` **non è un file generato**: porta prosa e tre import a direzione invertita, e si modifica a mano. Allineato allo schema **vivo**, letto dai cataloghi, non al file di migration.

- **`EventParty.venue_revealed_at: string | null`**, con accanto la distinzione che porta la migration: **non è `venue_reveal_email_sent` con un nome nuovo.** Il primo dice *la pagina è aperta* e il ramo `re_hidden` lo azzera; il secondo dice *le mail sono partite*, è a senso unico, e nessun ramo dello scrittore lo tocca. L'asimmetria è il punto: una serata può tornare segreta in pagina mentre le mail restano partite, che è l'unica coppia di stati onesta dopo che un indirizzo è uscito.
- **`VenueRevealActRow`**, con le sue otto colonne e il perché di ognuna.
- **`VenueRevealAct`**, e qui il piano era sbagliato.

### Il piano diceva due atti, il `CHECK` vivo ne ammette tre

Il Task 3 chiedeva `'revealed' | 're_hidden'`. Letto dal vincolo applicato:

```
CHECK (act = ANY (ARRAY['revealed'::text, 'completed'::text, 're_hidden'::text]))
```

**`'completed'` è D-37-20** — *«manda ai N che mancano»*. Non tocca la serata, e viene registrato **lo stesso**, perché manda l'indirizzo ad altre N persone ed è quindi attribuibile esattamente quanto il primo atto. Un vocabolario a due valori renderebbe **invisibili il secondo, il terzo e il quarto invio**, e ognuno di quelli è una pubblicazione.

Ha vinto lo schema. Un tipo che dichiarasse due valori dove il database ne ammette tre è un tipo che mente, e `supabase-data.md` è esplicito sul fatto che sia peggio di un tipo assente.

**Dove vive il vocabolario.** Il piano chiede una sola definizione, esportata dal modulo che i chiamanti leggeranno — e quel modulo (37-10) non esiste ancora. Dichiarato quindi qui, con scritto accanto che **il prossimo lettore lo sposta e ri-esporta, non lo ri-dichiara**: una seconda copia di quelle tre stringhe è esattamente la deriva che gli altri tre import invertiti del file esistono per impedire.

**Cosa NON è stato scritto, ed è corretto così:** nessuna firma di `venue_for_parties` né di `party_start_instant`. Non esistono nello schema vivo. Un tipo che le nominasse sarebbe un tipo che mente sull'esistenza di una funzione — e il piano 37-05, che ne ha bisogno, deve trovarsele assenti invece che promesse.

---

## Deviazioni dal piano

### 1. [decisione del proprietario] Una migration su due

Il piano prevedeva due esiti al checkpoint: applicare entrambe, o rimandare entrambe. L'esecutore ne ha presentato un terzo — applicare solo l'additiva — perché le due previste condividevano un costo che nessuna delle due pagava. Il proprietario ha scelto quello. **Non è una deviazione dell'esecutore: è il checkpoint che ha funzionato.**

Conseguenza sul piano: il suo criterio *«due versioni nella history, nell'ordine giusto»* **non è soddisfatto e non doveva esserlo**. Una versione, e la seconda ha ancora il suo ordine davanti.

### 2. [Rule 1 — il piano era sbagliato] Tre atti e non due

Descritto sopra. Trovato leggendo il `CHECK` vivo invece di fidarsi del testo del piano.

### 3. [Rule 2 — copertura] L'istantanea estesa a 20 tabelle

Il piano chiedeva conteggi e hash su cinque tabelle: `venues`, `event_parties`, `events`, `tickets`, `rsvps`. `ai-engineering.md` chiede la copertura delle cascate, ed è la regola più restrittiva delle due — quindi vince, come chiede `meta-gates.md`. Sono 18 dalla chiusura sui vincoli, più due raggiunte da `SET NULL`.

### 4. [fuori perimetro, non riparato] Due colonne che l'interfaccia non dichiara

`EventParty` non dichiara `venue_reveal_on_purchase` né `venue_reveal_email_sent`, che esistono sulla tabella. È deriva **pre-esistente**, non un effetto di questa migration, e allargare il diff di un piano che scrive in produzione avrebbe reso più difficile verificare l'unica domanda che quel diff deve reggere. Registrata in `deferred-items.md` voce 1, e nominata **anche** nel docblock di `venue_revealed_at`, così che chi cerca quelle colonne non ne concluda che non esistono sulla tabella. La prende 37-10 o 37-11.

---

## Verifica — e cosa significa in un repo senza test runner

> **Non esiste un test runner per il prodotto.** Nessuna riga di questo piano è verificata perché «i test passano».

| Controllo | Esito | Cosa prova davvero |
|---|---|---|
| `npm run build` | **exit 0**, `✓ Compiled successfully` | il typecheck. **Non** prova che un nome di colonna esista: nessuno dei quattro client Supabase è parametrizzato con `Database` |
| `npm run verify:routes` | **exit 0**, PASS | 61 letterali, 24 pagine, 24 pattern — **identico a prima**, ed è il risultato atteso: questo piano non aggiunge rotte |
| `npm run verify:capabilities` | **exit 0 — 5/5 VERDE** | **l'unico anello che vede la produzione.** TS 13 · DB 13 · POLICY 7 · SRC 13 · GRANT 28 righe, 28 grant e 24 rifiuti su 4 ruoli × 13 chiavi, in entrambe le direzioni |
| `npm run verify:persona` | **exit 0** | la persona non è stata toccata; eseguito come controllo di non-regressione |
| conferma dai cataloghi | 13 righe misurate | letta con uno strumento diverso da quello che ha agito |
| istantanea riletta | 20/20 conteggi identici, 20/20 md5 identici a metodo corretto | nessuna riga mossa |

**Il rosso di `verify:capabilities` era esattamente quello previsto, ed è diventato verde per la ragione prevista.** Non è rimasto rosso per una ragione diversa: le cinque prove passano tutte, e la tredicesima chiave è ora presente su entrambi i lati.

### Cosa NON è stato verificato, e va detto

- **La logica di `record_venue_reveal_act` non è stata eseguita.** L'applicazione prova che il PL/pgSQL **compila** — Postgres analizza il corpo alla creazione — non che i cinque codici di rifiuto si comportino come scritto. La procedura manuale in sei passi di `37-01-SUMMARY.md` § *Procedura manuale* è ancora **dovuta per intero**, e non è eseguibile da qui: quattro dei suoi sei passi chiedono una sessione `organizer` o `staff`, e in produzione quei ruoli non esistono e nessuno strumento di questo repository può autenticarsi come uno. È il debito di 32 voci `human_needed` già registrato; **questa fase non lo consuma e non lo peggiora.**
- **Nessuna verifica con la chiave anonima contro le pagine vere.** È il lavoro di 37-13, e con la seconda migration non applicata la sua domanda principale — cosa vede un anonimo dopo la revoca — **non è ancora rispondibile**.
- **Nessun percorso applicativo chiama ancora la funzione.** La server action arriva in 37-10.

---

## Note di sicurezza

- **T-37-13** (DDL con lo strumento sbagliato): mitigato — endpoint migrations, una chiamata, `[]` e history 37 → 38. Nessun uso di `/database/query` per scrivere.
- **T-37-14** (la finestra fra la push e 37-05/37-06): **non si è aperta.** La migration che la causava non è stata applicata, per decisione del proprietario presa al checkpoint con la misura davanti.
- **T-37-15** (autorizzazione riusata per altro): mitigato — dichiarata sopra, con l'istante in cui si è esaurita, e i rifiuti dell'applicatore scritti nel codice.
- **T-37-SC**: nessun pacchetto installato. Nessun checkpoint di legittimità dovuto.

### Threat Flags

Nessuna superficie nuova oltre a quelle già nel registro. La sola superficie che questa applicazione rende raggiungibile — `public.record_venue_reveal_act` via PostgREST — è stata misurata come **non** raggiungibile: `EXECUTE` è revocato da `public`, `anon` e `authenticated`.

## Known Stubs

Nessuno. Ciò che manca — la funzione di titolo, la server action, il bottone — appartiene a piani successivi che li possiedono. `venue_for_parties` non è uno stub: è un oggetto **deliberatamente non applicato**, e la sua assenza è la decisione, non un residuo.

---

## Self-Check: PASSED

- `src/types/database.ts` — modificato, presente
- `.planning/phases/37-manual-venue-reveal/deferred-items.md` — creato, presente
- commit `0ee2db0` — presente
- migration `20260810210214` — presente nella history di produzione, letta con `GET`
- `20260810161000_venues_read_narrowed.sql` — **applicata a zero**, verificato dai cataloghi
- nessuna riga di dati creata, modificata o rimossa

---
*Phase: 37-manual-venue-reveal*
*Completed: 2026-08-10*
