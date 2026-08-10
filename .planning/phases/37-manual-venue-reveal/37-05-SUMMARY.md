---
phase: 37-manual-venue-reveal
plan: 05
subsystem: public-surface
tags: [rsc-payload, venue-secrecy, postgrest, rpc, nextjs, silent-failure, force-dynamic]

requires:
  - phase: 37-manual-venue-reveal
    provides: "37-02 — public.venue_for_parties(uuid[]), la funzione di titolo che questa pagina chiama"
  - phase: 37-manual-venue-reveal
    provides: "37-03 — la misura di cosa e' vivo in produzione, e cosa no"
provides:
  - "La lista eventi che risolve i nomi dei locali per titolo, con una sola chiamata per pagina"
  - "Il payload RSC di /events senza indirizzo e senza link Maps, per nessuna serata"
  - "events.venue_names_refused — una categoria d'errore distinta, che raggiunge l'error boundary"
  - "La dinamicita' di /events dichiarata invece che derivata"
affects: [37-13]

tech-stack:
  added: []
  patterns:
    - "Una rpc set-returning si restringe con .select() sulle colonne: cio' che non attraversa il filo non si puo' perdere"
    - "Un campo dichiarato in un componente client e' gia' pubblicato, anche se nessuno lo rende"
    - "Due cause d'errore diverse portano due categorie diverse, mai una fusa"

key-files:
  created: []
  modified:
    - src/app/(public)/events/page.tsx
    - src/app/(public)/events/EventTabs.tsx

key-decisions:
  - "L'ordine dei commit e' invertito rispetto al piano: il Task 1 da solo non compila, e un commit rosso in mezzo e' una trappola per chi bisecta"
  - "La forma della riga della rpc e' dichiarata al call site e NON in src/types/database.ts: la funzione non esiste nello schema vivo, e un tipo che la nominasse mentirebbe"
  - "Il rifiuto della rpc si lancia, non si degrada: una lista sana con tutti i nomi spariti e' peggio di una pagina che si ferma"
  - "Scoperto e NON riparato: su un evento non pubblicato lo staff perde il nome del locale su questa lista — la funzione filtra e.is_published"

requirements-completed: []

duration: ~35min
completed: 2026-08-10
---

# Fase 37 Piano 05: la fuga nel payload, e la strada nuova verso il nome Summary

**L'indirizzo e il link Maps non vengono piu' selezionati, ne' costruiti, ne' dichiarati — tre punti e non uno — e il nome del locale arriva ora da `venue_for_parties`, con una chiamata per pagina il cui rifiuto e' rumoroso invece che silenzioso.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2 di 2
- **Commit:** 2, uno per task
- **File modificati:** 2 — `+176 / −12`
- **Righe scritte in produzione:** **zero**. Nessuna migration applicata, nessuna DML, nessuna chiamata a un database vivo.

---

## Il difetto, e perche' il rimedio RLS da solo non lo chiudeva

La fuga misurata da `37-RESEARCH.md § B.2` non era nel database: era **nel
payload**. `EventTabs.tsx` e' `"use client"`, e Next serializza **ogni** prop di
un componente client nel payload RSC. L'interfaccia dichiarava due campi —
l'indirizzo del locale e il link Maps — che la pagina costruiva per **ogni**
serata, **senza guardare `venue_secret`**, e che **nessuna superficie in `src/`
rendeva**: l'unica altra occorrenza in tutto il codice era la loro dichiarazione
di tipo.

Prop morte che viaggiavano comunque, leggibili da chiunque aprisse `/events` e
guardasse il **documento** invece della **pagina**.

La parte che si sbaglia e che vale scrivere: **il rimedio RLS del piano 37-02
non la chiude.** D-37-24 pretende che una serata **non** segreta continui a
mostrare il locale a un lettore senza login, quindi la strada verso l'indirizzo
resta aperta per costruzione — e la query non discriminava. Chiudere la porta
del database e lasciare questa aperta avrebbe prodotto un rimedio che **sembra**
completo.

---

## Cosa e' cambiato, nei tre punti

| Punto | Prima | Adesso |
|---|---|---|
| **La `select`** | embed annidato `venues(...)` con tre colonne, per ogni serata | l'embed non c'e' piu' |
| **La costruzione** | sei campi in `VenueInfo`, due mai renderizzati | quattro campi, tutti e quattro usati |
| **La dichiarazione client** | l'interfaccia in `EventTabs.tsx` prometteva i due campi | quattro campi, con la ragione scritta accanto |

E in piu', due cose che il piano chiedeva e che non sono cosmetiche:

**La strada nuova.** Una sola `rpc("venue_for_parties", { p_party_ids })` per
l'**intera** pagina — gli id raccolti dalla query precedente, il risultato
indicizzato in una `Map<party_id, name>` — e non una chiamata per serata su
quella che e' la pagina pubblica piu' visitata del sito. La chiamata e'
ristretta con `.select("party_id, name")`: delle sei colonne che la funzione
restituisce ne attraversano il filo **due**, e l'indirizzo non lascia il
database nemmeno verso il processo server. E' lo stesso ragionamento che gia'
teneva `code` e `number` fuori dalla query.

**L'errore che si lancia.** Il rifiuto della `rpc` ha la **sua** categoria —
`events.venue_names_refused`, mai fusa con `events.query_refused` — e un
rifiuto **con codice** viene lanciato oltre il `catch`, verso l'error boundary.
Le due cause dicono cose diverse a chi legge: la prima significa *la lista e'
fallita*, la seconda *la lista c'e' e ogni nome di locale su di essa manca*.

Il perche' del lancio invece del degrado e' il punto di tutto il piano: **il
guasto qui e' un vuoto silenzioso, non un errore.** Un embed che il lettore non
e' titolato a fare non solleva nulla — PostgREST lo restituisce vuoto, per
elemento — quindi non passa dal ramo su `error.code` che entrambe le pagine
avevano gia' costruito, e in questo progetto non esiste error tracking: nessuno
lo saprebbe. Una lista completa e dall'aria sana con il locale tolto a tutte le
serate e' *«una bugia dall'aria sana, sulla vetrina»*, ed e' esattamente il
precedente che il commento gia' presente nel file descrive.

**La dinamicita' dichiarata.** `export const dynamic = "force-dynamic"`. La
pagina e' gia' `ƒ` oggi — misurato nell'output del build, prima e dopo — perche'
`getAccessContext()` e `createClient()` leggono entrambi il cookie store. La
riga **non cambia nulla di misurabile**: cambia la ragione. Il predicato del
venue ha ora una componente temporale che scatta **da sola**, a un istante
preciso, senza che nessuno deployi niente; una copia servita attraverso quell'
istante mostrerebbe il lato sbagliato di un interruttore a senso unico. Dopo
questa riga, toglierla e' visibile in un diff invece che accadere per distrazione.

---

## Task Commits

| # | Task | Commit | Tipo |
|---|---|---|---|
| 2 | L'interfaccia client perde i due campi che non rendeva | `96573d4` | fix |
| 1 | La lista risolve i nomi per titolo invece che per embed | `d45a9f8` | feat |

**L'ordine e' invertito, ed e' una correzione, non una svista.** Vedi le
deviazioni.

---

## Cosa deve cambiare quando la seconda migration viene applicata

> Questa e' la sezione da leggere prima di deployare. Il resto e' contesto.

**`supabase/migrations/20260810161000_venues_read_narrowed.sql` non e' applicata
in produzione** — decisione del proprietario al checkpoint del piano 37-03,
*«solo la prima»*, misurata dai cataloghi e non assunta. Quindi oggi, nel
database vivo, **`public.venue_for_parties` non esiste.**

Conseguenze che vincolano chi deploya:

1. **Questo codice non e' deployabile da solo.** Senza la funzione, PostgREST
   risponde `PGRST202`, il codice c'e', e la pagina **si ferma** invece di
   degradare. E' il comportamento voluto — rumoroso invece che silenzioso — ma
   significa che `/events` sarebbe **giu'**, non impoverita. **Codice e
   migration sono un atto solo**, ed e' scritto anche nel file, accanto alla
   chiamata, perche' chi deploya non deve dedurlo da qui.
2. **`src/types/database.ts` non e' stato toccato, ed e' corretto.** La funzione
   non esiste nello schema vivo; un tipo che la nominasse sarebbe un tipo che
   mente, che `supabase-data.md` dichiara peggiore di un tipo assente — ed e' la
   scelta gia' presa e motivata dal piano 37-03. La forma della riga e' quindi
   dichiarata **al call site**, come una narrowing cast locale su
   `{ party_id: string; name: string | null }`.
3. **Quando i tipi verranno rigenerati** (dopo l'applicazione), quella cast
   locale diventa ridondante e va **rimossa**, non lasciata: una cast che
   sopravvive a un tipo vero e' il posto dove i due possono divergere in
   silenzio. Nessun'altra riga di questi due file cambia.
4. **`.rpc()` e' non tipizzato in questo repository** — nessuno dei client
   Supabase e' parametrizzato con `Database`, ed e' gia' scritto in tre punti del
   codice. Il build **non verifica** che il nome della funzione o quello
   dell'argomento esistano. Un `p_party_ids` rinominato nella migration non
   fallirebbe la compilazione: si risolverebbe a nulla.

**La finestra di regressione descritta in fondo a `37-02-SUMMARY.md` resta
chiusa** finche' quella migration resta un file. Questo piano non la apre e non
la chiude: la **paga in anticipo**.

---

## Deviazioni dal piano

### 1. [Rule 3 — blocco] L'ordine dei due commit e' invertito

- **Trovato durante:** il Task 1, al primo build.
- **Il fatto:** i due file condividono una forma. Se `page.tsx` cambia per primo,
  smette di fornire i due campi che l'interfaccia di `EventTabs.tsx` **pretende
  ancora**, e il typecheck fallisce. Nella direzione opposta il problema non
  esiste: assegnare un tipo con proprieta' **in piu'** a uno che ne ha meno e'
  lecito in TypeScript, perche' il controllo sulle proprieta' in eccesso vale
  solo per i literal, non per le variabili.
- **Fix:** committato prima `EventTabs.tsx` (Task 2), poi `page.tsx` (Task 1).
- **Perche' non e' un dettaglio:** **entrambi i commit sono stati costruiti
  verdi**, uno alla volta, con un `npm run build` ciascuno sul proprio stato —
  non un build solo alla fine con il commit di mezzo dichiarato sano per
  deduzione. Un commit che non compila in mezzo a una serie e' una trappola per
  chiunque bisechi, e in un repo senza test il bisect e' uno dei pochi
  strumenti diagnostici rimasti.

### 2. [Rule 1 — il controllo si soddisfa cambiando le parole] La prosa non spella piu' i due identificatori

- **Trovato durante:** entrambi i task, verificando i criteri d'accettazione.
- **Il fatto:** i docblock che spiegano **perche'** i due campi sono spariti li
  nominavano per esteso, e il criterio meccanico pretende **zero** occorrenze nel
  file. Il `grep` non distingue una prosa da una dichiarazione.
- **Fix:** riformulati — *«l'indirizzo e il link Maps»* al posto degli
  identificatori — con accanto **la ragione della riformulazione**, cosi' che
  chi vorra' riscriverli sappia che c'e' un controllo e non li rimetta credendo
  di migliorare la documentazione. **Il controllo non e' stato indebolito.**
  E' lo stesso precedente registrato dal piano 37-02.

### 3. [criterio letterale vs intento] `venue_for_parties` compare quattro volte, ma la chiamata e' una

Il criterio dice *«una sola occorrenza … (una chiamata, non una per serata)»*, e
la parentesi dichiara cosa si sta misurando. Nel file il nome compare **4**
volte: **una** e' la chiamata, **tre** sono prosa nei docblock che spiegano da
dove arriva il nome del locale. La forma che misura l'intento:

```
grep -c '\.rpc("venue_for_parties"' 'src/app/(public)/events/page.tsx'   → 1
```

Le tre menzioni in prosa non sono state tolte: togliere la spiegazione per
soddisfare un conteggio sarebbe stato indebolire il file per compiacere lo
strumento — l'opposto della deviazione 2, dove la prosa **poteva** dire la
stessa cosa con altre parole.

### 4. [scoperto, NON riparato] Su un evento non pubblicato lo staff perde il nome del locale

- **Trovato durante:** il Task 1, leggendo il `WHERE` della funzione invece di
  fidarsi della sua firma.
- **Il fatto:** `venue_for_parties` filtra `AND e.is_published` **prima** dei
  cinque rami, quindi non restituisce nulla per le serate di un evento in bozza —
  **nemmeno a chi ha `staff.manage`**. Su questa lista lo staff vede le bozze
  (`canSeeDrafts`), e da oggi le vedra' **senza il nome del locale**, con il
  ripiego sul testo libero della serata o senza marker se non c'e' ne' testo ne'
  segreto. E' registrato anche in `37-02-SUMMARY.md` (*«Evento non pubblicato:
  assente per tutti, `staff.manage` compreso — lo staff legge `venues`
  direttamente»*) — vero altrove, **non su questa pagina**, che dopo questo piano
  legge solo dalla funzione.
- **Perche' non e' stato riparato qui:** le due strade possibili escono entrambe
  dal perimetro. Modificare la funzione significa toccare la migration, che e'
  fuori dai file di questo piano e **non si modifica dopo essere stata scritta
  per l'applicazione**. Rimettere un embed `venues(name)` condizionato a
  `canSeeDrafts` significa **due strade di costruzione per lo stesso valore** —
  che questo file, nei suoi stessi commenti, dichiara essere il difetto che
  produce la deriva (*«due percorsi di costruzione diventano uno alla prima
  modifica distratta, e quello che sopravvive e' sempre il piu' ricco»*).
- **Verso dell'errore:** si **perde** un nome, non se ne mostra uno che non si
  doveva. Per `venue-secrecy.md`, gate *default chiuso*, e' la direzione sicura;
  e riguarda solo una superficie di lavoro guardata da chi ha gia' accesso ai
  dati per altre strade. **Va deciso, non scoperto:** se lo staff deve vedere il
  locale sulle bozze in questa lista, e' un ramo da aggiungere alla funzione in
  una migration nuova, non una toppa in pagina.
- **Non registrato in `deferred-items.md`:** quel file e' condiviso e altri agenti
  della stessa onda ci scrivono in parallelo. Sta qui, e chi chiude la fase lo
  sposta.

**Totale deviazioni: 4.** Una di ordine (1), una di forma della prosa (2), una
di lettura di un criterio (3), una **scoperta dichiarata e non riparata** (4).
Nessun cambio di comportamento rispetto a quanto il piano chiedeva. Nessuno
scope creep.

---

## Verifica — cosa e' stato misurato, e cosa NON prova

> **Non esiste un test runner per il prodotto.** Nessuna riga qui e' verificata
> perche' «i test passano». `npm run build` **e'** il typecheck.

| Controllo | Esito | Cosa prova davvero |
|---|---|---|
| `npm run build` sullo stato del Task 2 | **exit 0**, `✓ Compiled successfully` | il commit `96573d4` compila **da solo** |
| `npm run build` sullo stato del Task 1 | **exit 0**, `✓ Compiled successfully` | il commit `d45a9f8` compila. **Non** prova che la funzione esista: `.rpc()` e' non tipizzato |
| `npm run verify:routes` | **exit 0**, PASS | nessuna rotta aggiunta o persa |
| `grep -c "google_maps_url"` su `page.tsx` | **0** | l'identificatore e' sparito dal file, prosa compresa |
| `grep -c "venue_address"` su `page.tsx` | **0** | idem |
| `grep -c "venue_address\|venue_google_maps_url"` su `EventTabs.tsx` | **0** | idem |
| `grep -rn` dei due nomi su tutto `src/` | **0 occorrenze** | non sono rimasti altrove: erano solo in questi due file |
| `grep -c '\.rpc("venue_for_parties"'` | **1** | una chiamata per l'intera pagina |
| `/events` nell'output del build | **`ƒ` prima e dopo** | la dichiarazione non ha cambiato il comportamento misurato, come previsto |

**Il blocco di rendering del venue e' invariato riga per riga**, e la prova e' il
diff: l'intero cambio a `EventTabs.tsx` e' **+28 / −2** confinato all'interfaccia
`VenueInfo` e al suo docblock. Le righe che rendono
(`venue_secret ? "Secret Venue" : venue_name ?? venue_text`) **non compaiono nel
diff**. Nessun pixel cambia.

### Cosa NON e' stato verificato, e va detto

- **Nessuna verifica contro un database vivo.** La funzione non esiste in
  produzione; chiamarla la' oggi risponderebbe `PGRST202`, che confermerebbe
  soltanto cio' che gia' sappiamo. Nessuna scrittura, nessuna migration, nessun
  `db push`.
- **Nessuna verifica del payload RSC su una pagina servita.** E' **la prova che
  conta**, ed e' del piano 37-13: `curl` senza sessione e ricerca degli aghi
  sull'**intero documento**, payload compreso. Nessuno sguardo al rendering
  avrebbe visto questa fuga, e **nessun build la vede**.
- **Un grep sui chunk del bundle non e' stato fatto, e non sarebbe stata una
  prova.** I due campi erano dichiarati in un'`interface` TypeScript, che
  sparisce alla compilazione: non erano nel bundle nemmeno prima. La fuga era nel
  **payload a runtime**, non nel codice del client. Un verde su quel grep sarebbe
  stato un'eco.
- **Il rimedio pero' e' alla sorgente, non al bordo:** i due valori non vengono
  piu' **costruiti**, quindi non esiste un percorso che possa serializzarli. E'
  strutturalmente piu' forte di un filtro sull'uscita, e non dipende da chi
  ricorda di applicarlo.
- **`npm run lint` esce 1**, con 129 problemi **preesistenti** sull'intero repo.
  Su `EventTabs.tsx` ne segnala quattro, tutti nel blocco dello swipe
  (`containerRef.current` letto durante il render), **fuori dal diff di questo
  piano**: le righe sono le stesse, spostate di +26 dal docblock. Su `page.tsx`
  nessuna segnalazione. Fuori perimetro: non riparati, dichiarati.

---

## Note di sicurezza

| Threat ID | Disposizione | Esito |
|---|---|---|
| **T-37-19** — i due campi nel payload RSC di `/events` | mitigate | **chiuso in tre punti**: non selezionati, non costruiti, non dichiarati |
| **T-37-20** — l'embed rifiutato che fa sparire i nomi in silenzio | mitigate | l'embed e' rimosso; la `rpc` che lo sostituisce ha il suo `error` controllato, con categoria propria, e lanciato |
| **T-37-21** — una copia statica servita attraverso l'istante di rivelazione | mitigate | `force-dynamic` dichiarato invece che derivato |
| **T-37-SC** — installazioni di pacchetti | accept | **nessun pacchetto installato.** Nessun checkpoint di legittimita' dovuto |

### Threat Flags

Nessuna superficie nuova. La sola strada aggiunta —
`public.venue_for_parties` via PostgREST — e' quella che il piano 37-02 ha
progettato come **l'unica strada pubblica** verso un indirizzo, e la decisione su
chi ha titolo vive **in SQL, una volta sola**: questa pagina non ne ri-deriva
nessun ramo, e il commento accanto alla chiamata dice esplicitamente che non deve
cominciare.

## Known Stubs

Nessuno. Cio' che manca — la funzione nel database vivo — non e' uno stub di
questo piano: e' un oggetto **deliberatamente non applicato** da una decisione
del proprietario, e la sua assenza e' documentata sopra come vincolo di deploy.

---

## Note per chi arriva dopo

- **La finestra di rivelazione e' una costante duplicata in tre posti** — nel SQL
  della funzione, in `DEFAULT_VENUE_REVEAL_HOURS`, e nella testa di chi legge.
  Questa pagina **non ne ha una quarta copia** e non deve averla: chiede alla
  funzione e rende la risposta.
- **`venue_secret` sul marker resta la bandiera memorizzata**, con `!== false`,
  non un verdetto calcolato: e' la scelta gia' presa (D-36-11), e una serata
  rivelata a mano continua quindi a mostrare `Secret Venue` in **lista** mentre
  l'indirizzo e' visibile nel **dettaglio**. E' voluto — il piu' stretto dei due
  vince sulla vetrina — e non e' un difetto da uniformare senza deciderlo.
- **Una serata assente dal risultato della funzione non e' un errore.** Significa
  *nessun titolo*, ed e' la risposta normale per la maggior parte dei lettori su
  una serata segreta. Solo un `error` **con codice** e' un guasto.
- **Il piano 37-06 fa lo stesso lavoro sulla pagina di dettaglio** e **37-08**
  sulle pagine delle sedi: i tre condividono lo stesso vincolo di deploy.

## Self-Check: PASSED

- `src/app/(public)/events/page.tsx` — modificato, presente
- `src/app/(public)/events/EventTabs.tsx` — modificato, presente
- `.planning/phases/37-manual-venue-reveal/37-05-SUMMARY.md` — creato, presente
- commit `96573d4` — presente
- commit `d45a9f8` — presente
- nessun file fuori da `files_modified` toccato
- nessuna modifica a `STATE.md` o `ROADMAP.md`
- nessuna scrittura su database vivo, nessuna migration applicata

---
*Phase: 37-manual-venue-reveal*
*Completed: 2026-08-10*
