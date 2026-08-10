---
phase: 37-manual-venue-reveal
plan: 06
subsystem: public-event-page
tags: [venue-secrecy, access-gating, nextjs-architecture, monotone-guard, cache, persona]

requires:
  - phase: 37-manual-venue-reveal
    provides: "37-02 — public.venue_for_parties, la firma che questa pagina chiama"
  - phase: 37-manual-venue-reveal
    provides: "37-03 — event_parties.venue_revealed_at vivo nello schema e nei tipi"
  - phase: 37-manual-venue-reveal
    provides: "37-04 — venueRevealHours(stored), che sostituisce il fallback scritto a mano"
provides:
  - "Il predicato a tre livelli di D-37-02, dove decide: isVenueVisible"
  - "L'RSVP nel livello 1, fuori dalla guardia venue_reveal_on_purchase (D-37-10)"
  - "Il ramo del livello 2, aggiunto in coda, che rende osservabile il bottone manuale (D-37-04)"
  - "L'indirizzo dalla sola funzione di titolo, e non piu' da un embed annidato"
  - "Il gate *autorizzazione per destinatario* riscritto, con la mail ancora per-destinatario (D-37-03)"
  - "force-dynamic dichiarato con la sua ragione (D-37-09)"
affects: [37-07, 37-09, 37-11, 37-13]

tech-stack:
  added: []
  patterns:
    - "Due verdetti su un indirizzo si combinano in AND, mai si fondono: UX e confine restano separati"
    - "Un ramo che allarga si aggiunge in coda e non nomina i termini dei rami che lo precedono"
    - "Un fallback temporale si chiede a una funzione, non si riscrive con `??` al sito di chiamata"

key-files:
  created: []
  modified:
    - src/app/(public)/events/[slug]/page.tsx
    - .claude/rules/venue-secrecy.md
    - .claude/CHANGELOG.md

key-decisions:
  - "Il ramo del livello 2 testa `revealedByHand` con un parse, non con `!== null`: `undefined !== null` e' vero e aprirebbe ogni serata segreta in silenzio"
  - "Il ramo `:111` e' ora logicamente assorbito dal livello 2 e NON e' stato rimosso: toglierlo sarebbe un cambio di verdetto travestito da semplificazione"
  - "La condizione di rendering e' `venueVisible && venueRow` e non un verdetto solo: il piu' stretto dei due vince sempre"
  - "L'identificatore della funzione di metadata non e' scritto nel file, cosi' che il controllo meccanico misuri la proprieta' invece di fallire sul paragrafo che la vieta"
  - "La prima stesura del gate riscritto e' stata accorciata perche' spostava il context budget a 11.225 token: si taglia la descrizione, non la regola"

requirements-completed: []

metrics:
  duration: ~50min
  tasks: 3
  commits: 3
  files-created: 0
  files-modified: 3
  completed: 2026-08-10
---

# Fase 37 Piano 06: il modello a tre livelli, dove decide — Summary

**Il predicato della pagina pubblica conosce ora l'RSVP e l'atto manuale, l'indirizzo arriva solo dalla funzione che decide per serata, e il gate di casa che avrebbe chiamato violazione tutto questo e' stato riscritto nello stesso commit che lo introduce.**

## Perche' questo piano andava letto due volte

E' **la sola modifica della fase che allarga chi vede un indirizzo**. Tutto il resto della fase 37 sposta permessi, aggiunge tracce o stringe letture: qui un membro approvato che oggi non vedrebbe mai l'indirizzo prima della serata comincia a vederlo all'apertura della finestra. Un errore in questo file non si scopre da un test che diventa rosso — si scopre quando qualcuno racconta di aver visto un indirizzo che non doveva.

## I tre livelli, come si comportano adesso

| Chi | Cosa vede | Da quando |
|---|---|---|
| Chi ha **un biglietto o un RSVP** | l'indirizzo | subito, alla conferma |
| Membro **approvato** senza nessuno dei due | l'indizio, poi l'indirizzo | all'apertura della finestra, **o appena qualcuno rivela a mano** |
| Senza login, o non approvato | solo l'indizio | mai |
| Stato di rivelazione **non determinabile** | l'indizio | mai — il default e' negare |

## Il predicato, e la prova che i rami preesistenti non si sono mossi

Il criterio di accettazione chiedeva il diff riga per riga. Filtrando il diff `4e878a7..HEAD` sulle sole righe di ramo, **i rami che non compaiono nel diff sono byte-invariati**:

| Ramo | Cosa fa | Nel diff? |
|---|---|---|
| `!venueSecret` | serata non segreta → visibile | **no — invariato** |
| `isMasterRole \|\| isOrganizer` | → visibile | **no — invariato** |
| `venueRevealOnPurchase && (biglietto \|\| master)` | livello 1 | **si'** — riformattato su piu' righe e con **un disgiunto aggiunto** |
| `now > partyStart && isApproved` | serata passata | **no — invariato** |
| `isApproved && (biglietto \|\| master)` + finestra | ramo temporale di oggi | **no — invariato** nella condizione; il calcolo di `hours`/`hoursUntil` e' salito di qualche riga |
| `return { visible: false, hint }` | livello 3 | **no — invariato** |

Le due modifiche, entrambe volute e nessuna delle quali toglie un verdetto a chi lo aveva:

1. **`|| opts.hasRsvpForParty` sul ramo del livello 1.** E' un **disgiunto aggiunto**: una condizione `A` diventa `A || B`, quindi chi passava continua a passare. E' fuori dalla guardia `venue_reveal_on_purchase` di proposito — un RSVP non e' un acquisto, e legarlo a quel flag toglierebbe l'indirizzo a chi ha detto che viene **mentre il cron continua a mandarglielo** (`api/cron/venue-reveal/route.ts:63-68` non consulta il flag). Su una serata a RSVP nessuno ha un biglietto: senza questo ramo non vedrebbe subito **nessuno**.
2. **`hours` e `hoursUntil` calcolati una volta sola per la funzione**, e `hours` da `venueRevealHours(...)` invece che da un letterale. Pura estrazione: nessun effetto collaterale, stesso valore agli stessi punti — con la differenza che il valore adesso e' **25 e non 24**.

Il ramo nuovo, in coda e prima del `return` finale:

```ts
if (opts.isApproved && (revealedByHand || hoursUntil <= hours)) {
  return { visible: true, hint: null };
}
```

**Non nomina `hasTicketForParty` ne' `hasMasterTicket`** — il vincolo di D-37-04 e' rispettato alla lettera, ed e' verificabile con un `grep` sul corpo del ramo.

### Il ramo `:111` e' ora ridondante, e resta

Il livello 2 e' `isApproved && (… || hoursUntil <= hours)`; il ramo preesistente e' `isApproved && (biglietto || master)` con la stessa condizione temporale. Il primo **assorbe** il secondo per ogni ingresso possibile: il ramo `:111` non puo' piu' essere l'unico a rispondere `visible`.

**Non e' stato rimosso, e la ragione non e' pigrizia.** Toglierlo sarebbe stato un cambio di verdetto travestito da semplificazione su un percorso di rivelazione, esattamente il tipo di modifica che 37-02 si e' rifiutata di fare sul terzo termine del ramo 5 in SQL. La ridondanza si registra; non si risolve dentro il commit che allarga.

### Il default chiuso, scritto come test positivo

Il ramo del livello 2 non usa `opts.revealedAt !== null`. Usa:

```ts
const revealedByHand =
  typeof opts.revealedAt === "string" && !Number.isNaN(Date.parse(opts.revealedAt));
```

`undefined !== null` e' **vero**. Con la forma ingenua, il giorno in cui qualcuno togliesse `venue_revealed_at` dalla `select` — o rinominasse la colonna — il ramo si aprirebbe su **ogni serata segreta**, per ogni approvato, **senza un errore e senza un log**. La forma positiva fallisce nella direzione opposta: se il dato non arriva, l'indirizzo non esce. T-37-23, e il gate *default chiuso*.

Per la stessa ragione `venue_revealed_at` e' stato aggiunto alla `select` — senza, il ramo sarebbe **morto senza errore** e il bottone manuale non avrebbe alcun effetto osservabile in pagina, cioe' precisamente il difetto che questa fase esiste per non produrre.

### E la colonna che il predicato NON legge

`venue_reveal_email_sent` non compare, e non e' un'omissione: il cron la alza **anche con zero destinatari** e **senza filtrare su `is_published`**, quindi una bozza dentro la propria finestra la porta gia' alzata. Usarla come predicato di pagina aprirebbe l'indirizzo su una serata che e' stata solo spazzata (pitfall P1 della ricerca).

## L'indirizzo: da dove arriva adesso

L'embed annidato della tabella delle sedi e' **fuori** dalla `select`, e al suo posto c'e' **una** chiamata a `public.venue_for_parties`, indicizzata per `party_id`.

Non e' un refactoring: dopo 37-02 quella tabella non concede piu' nulla a chi non ha `staff.manage`, e **un embed rifiutato restituisce vuoto senza errore** (D-37-25). Lasciato dov'era avrebbe tolto il nome del locale a ogni serata, in silenzio, su una superficie pubblica, in un progetto senza error tracking — e nessuno dei due rami su `error.code` lo avrebbe intercettato, perche' non e' un errore di query.

**La condizione di rendering e' `venueVisible && venueRow`, e i due verdetti restano due.** Il predicato e' UX, la funzione e' il confine (`CLAUDE.md` principio 2). In `AND` vince sempre il piu' stretto — che e' il gate *default chiuso* scritto come congiunzione invece che promesso.

L'errore della chiamata **non e' scartato**, e le due cause hanno risposte opposte, con la stessa forma che la pagina applica gia' alla query delle serate: un rifiuto con codice viene lanciato e raggiunge l'error boundary; un guasto di trasporto viene loggato e la pagina resta senza indirizzo.

### I percorsi di uscita, rienumerati leggendo il codice

Il gate *percorsi enumerati* chiede di rifare la lista invece di ricordarla. Per questa pagina, oggi:

| # | Percorso | Cosa esce |
|---|---|---|
| 1 | il blocco del venue | nome, indirizzo e link Maps — **doppio verdetto** |
| 2 | `SecretVenueDialog` | **l'indizio, mai l'indirizzo**, e solo a chi ha una sessione |
| 3 | `party.venue_text` | testo libero sulla serata, **non filtrato dalla funzione**, invariato da prima di questa fase |

**Non sono piu' percorsi di uscita:** l'embed annidato delle sedi (rimosso) e il link alla scheda pubblica della sede (rimosso — quella pagina esce dal pubblico con D-37-23, e dopo lo spostamento il link avrebbe portato un visitatore su un indirizzo che il middleware rifiuta). Nessuna funzione di metadata su questa rotta, quindi nessuna uscita via anteprima social.

Il numero 3 e' un residuo **dichiarato, non chiuso**: chi scrive un indirizzo in quel campo lo ha pubblicato, ed e' una decisione di contenuto che questo codice non puo' presidiare.

## La cache, che e' diventata il rischio principale

`export const dynamic = "force-dynamic";` con la ragione scritta accanto. La rotta era gia' `ƒ` **per derivazione** da `cookies()`, e nessuna riga dichiarava l'intenzione: una modifica futura che spostasse la lettura della sessione la renderebbe statica **senza un errore**.

Il rischio e' nuovo perche' il predicato ha ora una componente temporale che **scatta da sola a un istante preciso**. Una pagina in cache attraversa quell'istante: servita stale prima mostra l'indizio a chi avrebbe titolo (fastidio); servita stale dopo, a un lettore diverso, mostra **l'indirizzo a chi non deve** — e qui non c'e' rimedio.

Restano fuori di proposito: la regola del service worker (37-07) e la prova che nessuna delle due cache serva questa pagina stale (37-13).

## Il gate di casa, riscritto nello stesso commit

D-37-03 chiedeva **lo stesso commit**, e la ragione e' concreta: un gate lasciato a segnalare come violazione il comportamento voluto viene «riparato» fra sei mesi, e la riparazione e' una regressione su un percorso irreversibile.

Il gate diceva: *«la rivelazione e' per-biglietto e per-RSVP, mai per-evento»*. **Il livello 2 e' per-evento.** Riscritto nella forma di `20260809002000_assignment_acts.sql:110-203`: il paragrafo superato **resta citato** e il testo nuovo dice quale dei due governa.

La sostanza della riscrittura e' la **separazione di due canali** che il testo vecchio fondeva:

| Canale | Criterio | Cambiato? |
|---|---|---|
| La **mail** | per-destinatario, sempre | **no** |
| La **pagina** | tre livelli, il secondo per-evento | **si'** |

Piu' quattro divieti espliciti che restano (serve `approved`; non esiste livello 2 senza finestra; la finestra non scende sotto le 25 ore; senza login solo l'indizio) e tre `Imperative Behaviors` al posto di uno — quello vecchio era ambiguo fra i due canali.

**L'allargamento della guardia monotona e' dichiarato nel messaggio di `7b3d009`**, come `meta-gates.md` pretende: e' autorizzato da D-37-02, decisione del proprietario del 2026-08-10, presa dopo che il costo era per iscritto — piu' persone conoscono l'indirizzo di quante ne entrano, su sedi da 150–300 posti in spazi privati senza licenza di pubblico spettacolo.

Riscritto nello stesso commit anche il docblock a `page.tsx:154`, che dichiarava fuori perimetro **qualunque** cambio di verdetto su `isApproved`. Anche li' il paragrafo superato e' citato, non cancellato, e cio' che sopravvive e' scritto: i due valori restano non presentazionali, `isApproved` regge **piu'** rami di prima, e ogni ulteriore modifica resta un cambio di verdetto che vuole la sua autorizzazione scritta.

## Il context budget, e una decisione presa sul numero

`npm run verify:persona`: **7/7 verde**. Ma il caso peggiore **ha cambiato file**, e non per un `paths:` allargato — nessuno lo e' — bensi' per la prosa aggiunta a `venue-secrecy.md`:

| | prima | dopo |
|---|---|---|
| File peggiore | `admin/scanner/ScannerClient.tsx` | **`(public)/events/EventTabs.tsx`** |
| Token | 10.622 | **11.043** |
| Margine su 12.000 | 1.378 | **957** |

La prima stesura misurava **11.225** (margine 775) ed e' stata **accorciata**, non accettata: il gate dice che quando il budget stringe si taglia la **descrizione**, non la regola. Nessuno dei quattro divieti, nessuna riga della tabella e nessun `Imperative Behavior` e' stato tolto.

**Il piano 37-09 tocca lo stesso file dopo di me: i 957 token restanti sono il suo budget, e vanno pesati prima di scrivere.**

## Task Commits

1. **I due ingressi nuovi, il ramo in coda, e i due paragrafi che diventano falsi** — `7b3d009` (feat)
2. **Il blocco del venue — l'indirizzo dalla funzione di titolo** — `33af29a` (feat)
3. **La finestra effettiva al dialogo, e la dinamicita' dichiarata** — `16479a9` (feat)

## Verifica — e cosa significa in un repo senza test runner

> **Non esiste un test runner per il prodotto.** Nulla qui e' verificato perche' «i test passano». `npm run build` **e' anche il typecheck**, e non prova che una colonna esista: nessun client Supabase di questa pagina e' parametrizzato con i tipi generati.

| Controllo | Esito |
|---|---|
| `npm run build` dopo ogni task | **exit 0**, `Compiled successfully` |
| `/events/[slug]` nella tabella delle rotte | **`ƒ (Dynamic)`**, come prima e ora per dichiarazione |
| `npm run verify:persona` | **7/7 verde**, 56 glob su 1039 file |
| `grep -c "?? 24"` nel file | **0** |
| `grep -c "venues("` nel file | **0** |
| `grep -c 'href={\`/venues/'` nel file | **0** |
| identificatore della funzione di metadata | **0 occorrenze** |
| `venue_revealed_at` nella `select` | presente |
| firma di `isVenueVisible` | contiene `hasRsvpForParty` e `revealedAt` |
| rami preesistenti | **assenti dal diff** — tabella sopra |

### Cosa NON e' verificato, e va detto

- **Nessun verdetto e' stato osservato su una pagina vera.** I tre livelli si provano con tre sessioni — nessuna, membro approvato senza titolo, titolare — e in produzione **non esistono sessioni `organizer` ne' `staff`**: nessuno strumento di questo repository puo' autenticarsi come un ruolo. Debito dichiarato, raccolto dal 37-13.
- **La chiamata alla funzione non e' esercitabile.** `public.venue_for_parties` **non esiste nel database vivo**: la migration che la crea non e' stata applicata, per decisione del proprietario (37-03). Il codice si scrive, non si prova.
- **Nessuna scrittura in produzione, nessuna migration applicata, nessun `db push`.** Nessuna riga di dati letta o mossa da questo piano.

## Il vincolo che chi deploya deve sapere, e non dedurre

> **Questo file e `supabase/migrations/20260810161000_venues_read_narrowed.sql` vanno in produzione come UN ATTO SOLO.**

Nei due versi la finestra di rottura e' diversa, e nessuno dei due e' accettabile:

| Ordine | Cosa succede |
|---|---|
| **Codice prima della migration** | la chiamata risponde `PGRST202`, il lancio scatta, e **la pagina pubblica dell'evento va in errore** — visibile, rumorosa, ma su una superficie d'acquisto |
| **Migration prima del codice** | l'embed non esiste piu' in questo file, quindi non c'e' regressione qui; la resta pero' su `events/page.tsx`, che appartiene al piano 37-05 e va deployato insieme |

Il verso «codice prima» e' quello **rumoroso**, e va detto che e' il meno pericoloso dei due: un 500 si vede, un indirizzo che sparisce in silenzio no. Ma nessuno dei due va scelto per default: **si deploya insieme.**

Quando la migration verra' applicata e i tipi rigenerati, l'interfaccia locale `VenueForParty` in questo file e' cio' che va **sostituito** dalla firma generata, non modificato: `src/types/database.ts` oggi non dichiara quella funzione di proposito, perche' non esiste nello schema vivo e un tipo che la nominasse mentirebbe.

## Deviazioni dal piano

### 1. [Rule 2 — default chiuso] Il ramo testa un parse, non `!== null`

Il piano scriveva `opts.revealedAt !== null`. Applicato alla lettera, un `undefined` — cioe' la colonna non selezionata, o rinominata — avrebbe **aperto** ogni serata segreta a ogni approvato, in silenzio. Il threat model dello stesso piano lo vieta esplicitamente (T-37-23: *«un valore assente o non parsabile vale `null` e produce l'indizio, mai l'indirizzo»*), quindi la forma applicata e' quella che soddisfa il registro, non quella che soddisfa la lettera dell'azione. Costo: due righe.

### 2. [correzione di forma] L'identificatore della funzione di metadata non e' scritto nel file

Il criterio di accettazione chiedeva `grep` a zero su quell'identificatore, e il piano chiedeva **anche** di dichiarare che l'assenza e' una scelta. I due si contraddicono: la prosa che vieta contiene la parola vietata. Riformulata la prosa, con accanto la ragione — stessa correzione di `37-02-SUMMARY.md`. **Un controllo meccanico si soddisfa cambiando le parole, mai indebolendo il controllo.**

### 3. [scoperta, dichiarata] Il gate riscritto ha spostato il caso peggiore del context budget

Nessun `paths:` allargato, quindi la lettera del gate non chiedeva la rimisurazione — ma il numero si e' mosso lo stesso, e di 421 token. Misurato, accorciato, e registrato nel changelog con entrambe le misure (11.225 → 11.043). Vale come precedente: **la prosa in un modulo di regole pesa quanto un glob allargato**, e il gate oggi nomina solo il secondo.

### 4. [costo dichiarato, non riparato] Una bozza segreta mostra l'indizio anche allo staff

`venue_for_parties` filtra su `e.is_published`, quindi su un evento non pubblicato non restituisce nulla **a nessuno**, `staff.manage` compreso. Con la condizione in `AND`, chi prepara una bozza segreta vede l'indizio invece dell'indirizzo su questa pagina. Non e' riparabile da qui — la funzione appartiene a una migration gia' scritta e non applicata — e le superfici di lavoro leggono le sedi direttamente. Registrato perche' e' il tipo di cosa che si scopre alle 19 del giorno prima.

**Totale: 4 deviazioni, nessuna che allarghi un accesso oltre quanto il piano prevede. Nessuno scope creep, nessun file fuori dai `files_modified`.**

## Note di sicurezza

| Threat | Esito |
|---|---|
| **T-37-22** — il ramo concede piu' di quanto D-37-02 dice | mitigato: il ramo aggiunge e non modifica (tabella dei rami sopra), e la condizione di rendering e' in `AND` con la riga della funzione |
| **T-37-23** — `revealedAt` non selezionato o non parsabile | mitigato: colonna nella `select`, **e** test positivo con parse — due difese, perche' la prima puo' essere rimossa da un'altra mano |
| **T-37-24** — pagina servita stale attraverso l'istante | mitigato **qui**: `force-dynamic` dichiarato. Il service worker e' del 37-07, la prova del 37-13 |
| **T-37-25** — anteprima social che cachea l'indirizzo | mitigato: nessuna funzione di metadata su questa rotta, e l'assenza dichiarata |
| **T-37-SC** — installazioni di pacchetti | nessun pacchetto nuovo, nessun `npm install` |

### Threat Flags

Nessuna superficie nuova oltre a quelle gia' nel registro. La sola superficie di rete nuova che questo piano rende raggiungibile — `public.venue_for_parties` via PostgREST — e' **gia' nel registro** ed e' stata progettata dal piano 37-02 come l'unica strada pubblica verso un indirizzo.

## Known Stubs

Nessuno. `public.venue_for_parties` non e' uno stub: e' un oggetto **deliberatamente non applicato** al database vivo, e la sua assenza e' una decisione del proprietario, non un residuo. Il codice che la chiama e' completo.

## Self-Check: PASSED

- `src/app/(public)/events/[slug]/page.tsx` — modificato, presente
- `.claude/rules/venue-secrecy.md` — modificato, presente
- `.claude/CHANGELOG.md` — modificato, presente, v1.9.0
- commit `7b3d009` — presente
- commit `33af29a` — presente
- commit `16479a9` — presente
- `STATE.md` e `ROADMAP.md` — **non toccati**, come richiesto all'esecutore in worktree
- nessuna scrittura su database vivo, nessuna migration applicata
- nessun indirizzo, nome di sede, id di serata o data non annunciata in questo file

---
*Phase: 37-manual-venue-reveal*
*Completed: 2026-08-10*
