---
phase: 37-manual-venue-reveal
plan: 02
subsystem: database
tags: [postgres, rls, postgrest, supabase, security-definer, venue-secrecy, timezone]

requires:
  - phase: 32-capability-model-in-the-database
    provides: private.has_capability, il wrapper (select …) per l'InitPlan, requires_approved
  - phase: 35-per-night-assignments
    provides: public.party_end_instant, il precedente di una regola temporale duplicata in SQL e dichiarata
  - phase: 37-manual-venue-reveal
    provides: "37-01 — event_parties.venue_revealed_at, che il ramo del livello 2 legge"
provides:
  - "public.party_start_instant(date, time) — l'istante di inizio di una serata, in SQL, in Europe/Rome"
  - "La revoca della lettura anonima di public.venues: venues_select_public droppata, nessuna policy SELECT per anon"
  - "public.venues_select_staff — la lettura di lavoro, su staff.manage"
  - "public.venue_for_parties(uuid[]) — l'unica strada pubblica verso un indirizzo, che decide per serata e porta i cinque rami di D-37-02"
affects: [37-03, 37-04, 37-05, 37-06, 37-13]

tech-stack:
  added: []
  patterns:
    - "La concessione di un indirizzo si esprime per SERATA, mai per sede"
    - "Una funzione SECURITY DEFINER senza argomento-soggetto: risolve il chiamante da se' e non puo' essere interrogata su nessun altro"
    - "Una costante duplicata fra SQL e TypeScript si dichiara nei COMMENT di entrambi i lati"

key-files:
  created:
    - supabase/migrations/20260810161000_venues_read_narrowed.sql
  modified: []

key-decisions:
  - "venues_select_staff porta TO authenticated, piu' stretto del minimo del piano: per anon il predicato puo' solo rispondere false, quindi la clausola non toglie nulla e nomina il fatto"
  - "Verificato leggendo capability_model.sql:390-423 che i ruoli con organizer.access siano gli stessi con staff.manage: nessuna seconda chiave da aggiungere in OR"
  - "Il residuo di T-37-08 (sede condivisa fra una serata pubblica e una segreta) resta aperto e viene dichiarato: chiuderlo contraddirebbe D-37-24, che e' decisione del proprietario"
  - "Il SQL e' stato verificato su un container Postgres 16 usa-e-getta con schema minimo e dati finti, non solo per lettura"

patterns-established:
  - "Verifica di una migration prima dell'applicazione: harness usa-e-getta, doppia corsa per l'idempotenza, lettura degli attributi dai cataloghi e non dalla risposta del comando"
  - "Prova discriminante di una costante: un caso al confine che risponde diversamente sotto il vecchio valore e sotto il nuovo"

requirements-completed: [VENUE-01]

duration: 42min
completed: 2026-08-10
---

# Fase 37 Piano 02: la lettura anonima degli indirizzi, chiusa Summary

**`public.venues` non concede piu' nulla ad `anon`, e al suo posto c'e' una funzione che decide per serata e porta i cinque rami di titolo di D-37-02 — scritti una volta, nel tier che `CLAUDE.md` principio 2 dichiara essere il confine.**

## Performance

- **Duration:** ~42 min
- **Tasks:** 2
- **Files modified:** 1 (una migration nuova, nessun file TypeScript)

## Cosa e' cambiato

Il difetto che questo piano chiude era misurato in produzione: la policy di
lettura di `public.venues` aveva un predicato incondizionato, e composta con
`event_parties_select_published` restituiva nome, **indirizzo** e link Maps
delle serate segrete **con la sola chiave anonima, senza sessione**.

La precondizione dichiarata dal todo era gia' stata eseguita dalla ricerca: il
muro ha **una sola porta RLS**. Restringerla pero' non bastava, e la ragione e'
la parte che si sbaglia: un lettore anonimo legge gia' `event_parties.venue_id`
per ogni serata di un evento pubblicato, serate segrete comprese. Qualunque
riga di `venues` raggiungibile da un anonimo e' quindi unibile alla serata
segreta che la nomina. Una policy «solo le sedi non segrete» sarebbe sembrata
la scelta generosa e sarebbe stata la stessa fuga con un passaggio in piu':
ragiona **per sede** su un segreto che e' **per serata**.

L'unica forma che regge — ed e' quella costruita — e' togliere del tutto `anon`
dalla tabella e servire il pubblico da una funzione che decide per serata.

### I tre oggetti

| Oggetto | Cosa fa |
|---|---|
| `public.party_start_instant(date, time)` | l'istante di inizio di una serata, `IMMUTABLE`, `Europe/Rome` per nome e mai un offset numerico |
| `venues_select_staff` | la lettura di lavoro, su `staff.manage`, `TO authenticated` |
| `public.venue_for_parties(uuid[])` | l'unica strada pubblica verso un indirizzo |

### I cinque rami di titolo

| # | Ramo | Stato |
|---|---|---|
| 1 | la serata non e' segreta | oggi (D-37-24) — vale anche senza sessione |
| 2 | `staff.manage` | oggi, ramo `:101` |
| 3 | biglietto per la serata, **o** master ticket dell'evento (`party_id IS NULL`) | oggi, ramo `:103` |
| 4 | RSVP per la serata | **nuovo** (D-37-10) |
| 5 | approvato **e** (rivelato a mano **o** finestra aperta **o** serata iniziata) | **nuovo** (D-37-04) — l'unico allargamento della fase |

Il ramo 4 e' deliberatamente **fuori** dalla guardia `venue_reveal_on_purchase`:
un RSVP non e' un acquisto, e legarlo a quel flag significherebbe che
spegnendolo su una serata a RSVP si toglie l'indirizzo a chi ha detto che viene
**mentre il cron continua a mandarglielo** — cioe' l'asimmetria che D-37-10
esiste per eliminare.

La funzione **non restituisce mai una riga parziale**: o i quattro campi, o la
serata e' assente. Assente significa *nessun titolo*, e la pagina rende
l'indizio, mai un ripiego.

## Task Commits

1. **Task 1: l'istante di inizio in SQL, e la revoca della lettura anonima** — `1d8cc09` (feat)
2. **Task 2: la funzione che concede per titolo, e i tre livelli scritti una volta** — `69d3457` (feat)

## Files Created/Modified

- `supabase/migrations/20260810161000_venues_read_narrowed.sql` — creata. Tre
  cambi, una sola transazione: mezzo file applicato sarebbe peggio di nessuno, e
  ognuna delle due meta' e' sbagliata in una direzione diversa (la revoca senza
  la funzione chiude l'indirizzo anche a chi D-37-24 dice debba vederlo; la
  funzione senza la revoca e' una seconda strada accanto a una porta ancora
  aperta, perche' le `PERMISSIVE` sono in OR).

Le tre policy di **scrittura** di `public.venues` non sono state toccate:
questa fase cambia chi **legge** un indirizzo, e muovere un predicato di
scrittura nello stesso file renderebbe il diff impossibile da verificare contro
quella domanda.

## Verifica — cosa e' stato misurato, e cosa no

> **Non esiste un test runner per il prodotto**, e nulla qui va letto come «i
> test passano». Quello che segue e' `npm run build` piu' una prova costruita
> per questa occasione su un database vero e usa-e-getta, con dati finti.

**`npm run build`: verde** (`Compiled successfully`). Nessun file TypeScript
toccato, quindi l'esito non poteva cambiare — eseguito perche' e' il gate
minimo dichiarato, non perche' provasse il SQL.

**Harness Postgres 16 in container, con lo schema minimo che la migration
nomina e dati finti** (nessuna sede reale, nessun indirizzo reale, nessuna data
reale). Misurato:

| Prova | Esito |
|---|---|
| Il file applica su un harness pulito | ok |
| Seconda corsa dello stesso file | ok — idempotente |
| `party_start_instant` | `provolatile = i`, `search_path=""`; 22:00 di Torino risolve a 20:00Z in ottobre e 21:00Z in dicembre — l'ora legale la gestisce il nome della zona |
| `pg_policies` su `venues` | **una sola** riga: `venues_select_staff`, `SELECT`, `{authenticated}`, predicato `(SELECT private.has_capability('staff.manage'))`. `venues_select_public` assente |
| `pg_proc` su `venue_for_parties` | `provolatile = s`, `prosecdef = t`, `search_path=""` |
| `proacl` di `venue_for_parties` | `{owner, anon, authenticated}` — **PUBLIC assente**, la revoca ha morso |
| Chiamante **anonimo** | indirizzo **solo** sulla serata non segreta; assente su tutte le segrete, compresa quella rivelata a mano e quella in finestra |
| Membro **approvato senza biglietto** per quella serata | vede la serata rivelata a mano e quella con la finestra aperta — il livello 2 |
| Membro **pending** con master ticket | vede le serate segrete dell'evento — ramo `:103`, che oggi non guarda lo stato: comportamento invariato, non un allargamento |
| Evento **non pubblicato** | assente per tutti, `staff.manage` compreso — lo staff legge `venues` direttamente |
| Argomento `NULL`, e id sconosciuto | zero righe — il default chiuso regge per costruzione |

**La prova discriminante sui 25.** Tre serate segrete identiche a **24 ore e 30
minuti** dall'inizio, che differiscono solo per `venue_reveal_hours`:

| `venue_reveal_hours` | concessa a un approvato senza biglietto |
|---|---|
| `NULL` (si applica il default) | **si'** |
| `24` esplicito | **no** |
| `25` esplicito | **si'** |

Il default in vigore e' quindi **25 e non 24**, e la colonna esplicita viene
letta. Un controllo che non discriminasse fra i due valori non avrebbe provato
nulla.

**Cosa questa prova NON e'.** L'harness ha lo schema minimo, non quello vero, e
gira come superuser — quindi conferma la **logica dei rami**, la sintassi e gli
attributi degli oggetti, non il comportamento sotto RLS con una sessione vera.
La prova vera di questo piano e' la **procedura anonima del piano 37-13**, che
chiede le righe con la sola chiave anonima e legge il **sorgente** delle pagine.
Fino ad allora questo piano ha prodotto SQL verificato, non evidenza di
prodotto.

## Decisioni prese

1. **`TO authenticated` su `venues_select_staff`**, che e' piu' stretto del
   minimo chiesto dal piano. Per `anon` il predicato puo' solo rispondere
   `false` (nessun profilo, `auth.uid()` nullo), quindi la clausola non toglie
   accesso a nessuno: nomina un fatto invece di lasciarlo dedurre. Stessa forma
   di `tickets_select_admin`.

2. **`staff.manage` e nessuna seconda chiave in OR.** Il piano chiedeva di
   verificarlo invece di assumerlo: letto `capability_model.sql:390-423`, i
   ruoli con `organizer.access` (master, organizer) sono **esattamente** quelli
   con `staff.manage`. Nessuna superficie di lavoro perde l'elenco delle sedi.

3. **`requires_approved = false` di `staff.manage` non e' stato toccato**, e il
   fatto che un organizer in attesa legga le sedi e' scritto accanto alla
   policy: accade gia' oggi — oggi accade perche' la policy rimossa concedeva a
   chiunque — e questa migration **restringe**, non allarga.

4. **Il terzo termine del ramo 5 non e' stato eliminato come ridondante.**
   `now() > start` sembra assorbito da `now() >= start - 25h`, e lo e' per ogni
   valore positivo. Non lo e' per un valore **negativo**: `venue_reveal_hours` e'
   un `integer` senza `CHECK`, e su un negativo il termine della finestra
   aprirebbe **dopo** l'inizio mentre questo apre all'inizio. E' anche il ramo
   `:109` di oggi, quindi toglierlo sarebbe stato un cambio di verdetto
   travestito da semplificazione.

## Deviations from Plan

Nessuna deviazione di sostanza: i due task sono stati eseguiti come scritti.
Due aggiunte, entrambe dentro il perimetro e nessuna delle quali cambia un
verdetto d'accesso:

**1. [Rule 2 — completezza dichiarativa] Il residuo di T-37-08 e' scritto nel file**
- **Trovato durante:** Task 2, eseguendo la prova comportamentale.
- **Cosa:** il threat model del piano segna T-37-08 come `mitigate` con la
  motivazione «la concessione e' per serata, mai per sede». La mitigazione e'
  **parziale**, e la parte che resta e' stata misurata: una sede che ospita
  **sia** una serata pubblicata non segreta **sia** una segreta restituisce il
  proprio indirizzo a un chiamante anonimo per la prima — `venue_id` compreso —
  e quello stesso `venue_id` sta sulla riga della serata segreta, che `anon`
  legge gia'. La deduzione e' a una richiesta di distanza.
- **Perche' non e' stato chiuso:** chiuderlo significa **trattenere** l'indirizzo
  della serata aperta, che e' la lettura gia' applicata dalla pagina pubblica di
  una sede e quella che il gate *default chiuso* preferisce — ma contraddice
  **D-37-24**, che e' una decisione del proprietario e non si rovescia dentro una
  migration.
- **Non e' una regressione:** oggi un chiamante anonimo legge ogni riga di
  `venues` senza dover dedurre alcunche'.
- **Fix applicato:** un paragrafo accanto ai rami che nomina il residuo, la
  misura e la ragione per cui resta aperto. Un registro che dice «mitigato»
  dove vale «parzialmente mitigato» e' il modo in cui la meta' che resta smette
  di essere cercata.

**2. [Rule 2 — verifica] Harness Postgres usa-e-getta**
- **Trovato durante:** entrambi i task.
- **Cosa:** il piano prevedeva come verifica automatica due `grep`. Un `grep`
  non dice se una funzione `IMMUTABLE` con `AT TIME ZONE` viene accettata, se
  `make_interval(hours => …)` risolve sotto `search_path = ''`, ne' se la
  revoca ha davvero tolto `PUBLIC`. Con questa migration destinata a essere
  applicata alla **produzione** dal piano 37-03 — dove un errore rollbacka la
  transazione e lascia inapplicata ogni voce successiva della coda — un errore
  di sintassi scoperto li' sarebbe stato scoperto nel posto peggiore.
- **Fix applicato:** container Postgres 16, schema minimo stub, doppia corsa,
  attributi letti dai **cataloghi** e non dalla risposta del comando, e la prova
  comportamentale sui cinque rami. Il container e' stato rimosso a fine corsa.
- **Nessuna scrittura sulla produzione:** l'harness e' un container locale
  effimero. Nessun `supabase db push`, nessuna chiamata a un database vivo.

Correzioni minori durante la scrittura, senza impatto sul comportamento: quattro
occorrenze di prosa contenevano la stringa che il criterio di accettazione
vietava nel file (il predicato incondizionato citato per nome) e una nominava un
offset numerico come esempio di cio' che non si deve usare. Riformulate: un
controllo meccanico si soddisfa cambiando le parole, mai indebolendo il
controllo.

**Total deviations:** 2, entrambe additive (documentazione e verifica). Nessun
cambio al comportamento rispetto al piano. Nessuno scope creep.

## Da portare al piano 37-03 — e va guardato prima di applicare

**C'e' una finestra di regressione fra l'onda 2 e l'onda 3, ed e' visibile in
produzione.**

Il piano 37-03 (onda 2) **applica** questa migration al database vivo. I piani
37-05 e 37-06 (onda **3**) sono quelli che spostano le due pagine pubbliche su
`venue_for_parties`. Fra i due momenti:

- `events/page.tsx:212` e `events/[slug]/page.tsx:223` leggono la sede con un
  **embed annidato** `venues(...)`;
- un embed che il lettore non e' titolato a fare **non da' errore: restituisce
  vuoto** (D-37-25, ed e' la stessa specie di guasto che la fase 36 ha misurato);
- quindi, dall'istante dell'applicazione, un lettore **senza login** perde nome
  e indirizzo del locale su **ogni** serata, comprese quelle **non segrete** —
  che e' esattamente cio' che D-37-24 vieta.

Nessuno se ne accorgerebbe da solo: non c'e' error tracking, e il guasto e'
localizzato («serata senza nome del locale»), non rumoroso. Entrambe le pagine
ramificano su `error.code`, e **questo caso non passa di li'**, perche' non e'
un errore di query.

Non e' un difetto di questo piano — e' la conseguenza strutturale della forma
scelta, e i piani 37-05/37-06 esistono per pagarla. Ma **l'ordine di deploy
conta**, e la finestra non e' visibile da nessuno dei due lati: va decisa
esplicitamente, non scoperta.

## Note per chi arriva dopo

- **La costante 25 vive in due posti.** Qui, in
  `coalesce(ep.venue_reveal_hours, 25)`, e in `DEFAULT_VENUE_REVEAL_HOURS` in
  `src/utils/datetime.ts` (piano 37-04). Postgres non importa TypeScript: la
  duplicazione e' inevitabile, quindi e' **dichiarata** nel `COMMENT ON
  FUNCTION`. Cambiarne una sola non fallisce rumorosamente — sposta una
  finestra, e dietro questa finestra c'e' un indirizzo.
- **Stessa cosa per `party_start_instant`**, seconda implementazione di
  `partyStartInstant`/`zonedInstant`. Il `COMMENT` nomina il file TypeScript.
- **`party_start_instant` non ha la regola della mezzanotte**, e l'asimmetria
  con `party_end_instant` e' voluta: un'ora di **chiusura** prima di mezzogiorno
  appartiene al giorno dopo, un'ora di **apertura** mai.
- **La firma e' un contratto**: i piani 37-05 e 37-06 chiamano
  `venue_for_parties(p_party_ids uuid[])` e si aspettano
  `(party_id, venue_id, name, slug, address, google_maps_url)`.
- **Questo piano non ha applicato nulla al database.** La migration e' un file.

## Self-Check: PASSED

- `supabase/migrations/20260810161000_venues_read_narrowed.sql` — presente
- commit `1d8cc09` — presente
- commit `69d3457` — presente
- nessuna modifica a `STATE.md` o `ROADMAP.md`
- nessun `supabase db push`, nessuna scrittura su database vivo

---
*Phase: 37-manual-venue-reveal*
*Completed: 2026-08-10*
