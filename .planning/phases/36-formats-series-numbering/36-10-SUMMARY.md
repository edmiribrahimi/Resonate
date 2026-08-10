---
phase: 36-formats-series-numbering
plan: 10
subsystem: work-surfaces
tags: [server-actions, form, refusal-as-value, silent-failure-closed, catalogue, public-repo]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: "lo schema applicato in produzione, versione 20260810144239, con i quattro vincoli nominati (36-05)"
  - phase: 36-formats-series-numbering
    provides: "Format, PartySeries e i tre campi su EventParty, con number typed `number | null` (36-06)"
  - phase: 35-per-night-assignments
    provides: "AssignmentRefusal — l'unione di rifiuti su cui NightRefusal e' modellata"
provides:
  - "Ogni scrittura per-serata di updateEvent destruttura { error } e si ferma: la fine del rifiuto ingoiato"
  - "NightRefusal — la categoria del rifiuto come VALORE di ritorno, non come messaggio lanciato"
  - "Format, serie e numero sulle due superfici che creano e modificano una serata"
  - "La proposta del numero letta dalla filigrana `highest_assigned`, mai da un conteggio"
affects: [36-12, 36-13, 36-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Una prop obbligatoria e la pagina che la fornisce non si separano in due commit: il primo non compilerebbe"
    - "Una riga di catalogo che il chiamante non puo' LEGGERE resta nel select come opzione con il proprio id, cosi' il valore fa andata e ritorno invece di essere riassegnato al salvataggio"
    - "Un gate a grep che troverebbe solo la frase che vieta la cosa non e' un gate: la prosa si riscrive senza il token, il divieto resta"

key-files:
  created:
    - .planning/phases/36-formats-series-numbering/36-10-SUMMARY.md
  modified:
    - src/app/(admin)/admin/events/actions.ts
    - src/components/events/EventForm.tsx
    - src/app/(admin)/admin/(work)/events/new/page.tsx
    - src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx
    - .planning/phases/36-formats-series-numbering/deferred-items.md

key-decisions:
  - "I tre campi vanno anche sul blocco a serata singola: anche quello scrive una riga di event_parties, e format_id/series_id sono NOT NULL"
  - "Il testo di aiuto vive in una costante e non in due copie — due copie possono divergere sulla stessa regola"
  - "Il controllo delle terne duplicate DENTRO il payload non e' il pre-check che D-36-08 vieta: non interroga il database e non ha una seconda parte che corre"
  - "Task 2 e Task 3 in un commit solo, dichiarato: `formats` e `series` sono prop obbligatorie"
  - "Nessun FMT-* spuntato in REQUIREMENTS.md — D-36-19"

patterns-established:
  - "Il rifiuto porta il `sortOrder` della serata, ed e' cosi' che la superficie sa a quale campo attaccare la frase"

requirements-completed: []  # deliberatamente vuoto — D-36-19

# Metrics
duration: 55min
completed: 2026-08-10
---

# Phase 36 Plan 10: Tre campi, una frase che si legge, e un'azione che smette di mentire — Summary

**`updateEvent` non poteva piu' dire che un salvataggio e' riuscito quando il database l'ha rifiutato: le due scritture per-serata, la delete, la lettura delle serate esistenti e il conteggio dei biglietti destrutturano tutte `{ error }`, e la categoria del rifiuto torna come valore invece che come messaggio — perche' Next redige i messaggi lanciati da una Server Action in produzione, e un client che si ramifica sul testo funziona in `next dev` e smette dove conta.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3 di 3
- **Commits:** 2 di task (+1 di documentazione)
- **Build verdi:** 5 · `verify:routes` verde: 3

---

## Il difetto misurato, e cosa e' stato fatto

Il piano lo nomina per riga: `src/app/(admin)/admin/events/actions.ts:375-420`, dove nessuna delle due scritture per-serata destrutturava il proprio risultato, mentre `createEvent` lo faceva a `:296-302`. Con il vincolo nominato che questa fase aggiunge, quel silenzio sarebbe diventato il percorso quotidiano: l'organizzatore salva, il salvataggio non fa nulla, e il numero digitato non e' il numero memorizzato.

**Criterio di accettazione, misurato per riga e non per intenzione:**

```
grep -Ec 'await (client|supabase)\.from\("event_parties"\)\.(update|insert)'  →  0
```

Zero, perche' non resta **nessuna** chiamata nuda: ogni `update` e ogni `insert` su `event_parties` sta ora dietro un `const { error: … } = await …`. Le forme destrutturate lette una per una:

| Riga | Cosa scrive | Destrutturata in |
|---|---|---|
| 662 | `createEvent` — l'insert bulk delle serate | `{ error: partyError }` (era gia' cosi') |
| 739 | `updateEvent` — la lettura delle serate esistenti | `{ data, error: existingError }` — **nuova** |
| 798 | `updateEvent` — il conteggio dei biglietti | `{ count, error: countError }` — **nuova** |
| 828 | `updateEvent` — la delete di una serata rimossa | `{ error: deleteError }` — **nuova** |
| 895 | `updateEvent` — l'update per-serata | `{ error: updateError }` — **la deliverable** |
| 901 | `updateEvent` — l'insert per-serata | `{ error: insertError }` — **la deliverable** |

Le tre righe marcate «nuova» non sono nel testo del piano e sono documentate come deviazioni sotto: sono lo stesso difetto, nella stessa funzione, su percorsi che valgono quanto quello nominato.

### Il ciclo si ferma alla prima serata rifiutata

Dichiarato nel codice, perche' e' una scelta e non un'ottimizzazione: un salvataggio applicato a meta' e' peggio di uno rifiutato. Le serate prima del guasto sarebbero scritte, lo schermo e l'archivio direbbero cose diverse, e l'unica persona in grado di distinguerli sarebbe quella a cui e' appena stato detto che ha salvato.

### La categoria viaggia come valore

`NightRefusal` e' un'unione di sette membri, modellata su `AssignmentRefusal` (`[id]/assignments/actions.ts:106-166`), e ognuno porta il proprio docblock:

| Membro | Da dove arriva |
|---|---|
| `duplicate_number` | `23505` + `event_parties_format_series_number_unique` |
| `series_format_mismatch` | `23503` + `event_parties_series_format_fk` |
| `number_not_positive` | `23514` + `event_parties_number_positive` |
| `catalogue_missing` | `23502` — il form ha smesso di mandare i campi |
| `format_retired` | la guardia applicativa di T-36-10-04 |
| `format_unknown` | un format che questo chiamante non puo' leggere |
| `write_failed` | qualunque altro guasto, con il suo `code` |

Per la coppia che esiste **in due posti** — `number_not_positive` e la sua guardia applicativa — il docblock dice perche' non si sostituiscono: *«il `CHECK` e' la REGOLA, la guardia e' la FRASE CHE UNA PERSONA LEGGE — uno impedisce alla riga di esistere, l'altra dice all'operatore cos'e' successo invece di consegnargli il nome di un vincolo»*. E dice anche che il giorno in cui `number_not_positive` torna davvero, la guardia applicativa ha smesso di funzionare, e questo valore lo dichiara invece di nasconderlo dentro `write_failed`.

Il rifiuto porta il **`sortOrder`** della serata. E' cio' che permette alla superficie di attaccare la frase al campo giusto, ed e' `null` in un solo caso — l'insert bulk di `createEvent`, dove il database non nomina alcuna riga. Li' la frase dice *«una di queste serate»*, che e' onesto; indovinare quale non lo sarebbe.

### Cosa NON e' stato fatto, e apposta

- **Nessun pre-check applicativo** che interroghi il database per un numero gia' preso prima di scrivere. Due persone con due schede aperte battono ogni controllo applicativo; il database e' l'unico posto dove due richieste concorrenti si incontrano, ed e' esattamente per questo che D-36-08 mette la regola li'.
- **Nessun `error.details`, mai.** Il file legge `code` e `message` e nient'altro. `grep -c "error.details"` → **0**, e i due punti di prosa che spiegavano perche' non si legge sono stati riscritti senza il token: un gate che trova solo la frase che vieta la cosa e' un gate che si ignora la terza volta che diventa rosso (`[id]/assignments/actions.ts:60-62` lo dice gia' di se stesso).
- **`grep -Ec "console\.error\([^)]*, *(err|error)\)"` → 0.** Nessun oggetto errore intero raggiunge un log su questo percorso, che dopo questa fase fallisce **di routine**: un numero gia' in uso e' un errore ordinario di chi lavora, non una rarita'.
- **`grep -c "Something went wrong"` → 0.**

---

## I tre campi, e il blocco che il piano non nominava

`format_id`, `series_id` e `number` sono stati aggiunti a tutte e tre le forme parallele — `SubEventFormState` e il suo default, `PartyInitialData`, `subEventFromInitial` — nello stesso commit, con `number` tenuto come stringa secondo la convenzione `?.toString() ?? ""` che il file gia' usa.

**E anche al blocco *Event Details*.** Il piano parla del «blocco per-serata», ma leggendo `handleSubmit` ci sono **due** percorsi che producono una riga di `event_parties`: i sub-event, e il percorso a serata singola quando `mainTime` e' valorizzato. Aggiungere i campi solo al primo avrebbe fatto arrivare al database una serata senza `format_id` — colonna `NOT NULL` — e il rifiuto sarebbe stato un `23502` con niente sullo schermo a spiegarlo: esattamente il guasto silenzioso che questo piano esiste per chiudere. I due blocchi condividono **una** funzione di rendering, `renderCatalogueFields`, cosi' che non possano divergere.

Un dettaglio di quel percorso: sul blocco a serata singola i due select sono `required` **solo quando esiste un orario di inizio**, perche' e' esattamente quando quel blocco produce una serata. Un evento salvato senza orario non scrive alcuna riga di `event_parties`, e pretendere un format per una serata che non esistera' sarebbe un rifiuto a vuoto.

### La proposta e' una lettura della filigrana

Alla scelta della serie il campo arriva riempito con `highest_assigned + 1`. `grep -c "highest_assigned"` → **3**; `grep -Ec 'max\(|\.length \+ 1'` → **0**. La differenza e' il punto, ed e' scritta nel codice: `updateEvent` cancella davvero le serate rimosse dal form, quindi una proposta derivata dal massimo memorizzato ri-proporrebbe un numero **gia' su una locandina**. La filigrana sale con `GREATEST` e non scende mai.

E resta **modificabile**: il prodotto propone, una persona conferma (D-36-06).

Il commento dice anche che l'affordance di tipo conteggio e' **permessa qui** — la superficie sta dietro una capability, e la regola del non-conteggio governa le superfici pubbliche. Applicarla troppo avrebbe tolto l'unica cosa che rende il campo usabile.

### Il testo di aiuto, verbatim e una volta sola

```
Suggested from the last number in this series. What you save is stored as written
and never recalculated — moving or deleting a night does not renumber the others.
```

`grep -c "never recalculated"` → **1**, ed e' 1 perche' vive in una costante (`SERIES_NUMBER_HELP`) resa da entrambi i blocchi. Due copie della stessa regola possono divergere; questa non puo'. E' l'unico posto in cui il contratto *memorizzato-non-ricalcolato* viene detto alla persona che sta digitando, quindi non e' decorazione e non e' stato trattato come tale. Il testo di aiuto sotto un campo e' **nuovo** in questo file — `EventForm` usa i placeholder — quindi e' stato introdotto con la sua ragione accanto.

### Il rifiuto attaccato al campo

`aria-invalid` → **1**, e `aria-describedby` punta all'errore **e** all'aiuto quando c'e' un rifiuto. Il valore digitato **non viene mai azzerato**: la persona e' arrivata con un numero preso da una locandina, e cancellarlo perderebbe l'unica copia sullo schermo. La frase viene arricchita nel form con il **nome** della serie, che l'azione non ha (l'azione ha un id, e rileggerne il nome solo per formulare un errore sarebbe un round trip su un percorso che sta gia' rifiutando).

Un guasto di rete, un rifiuto di permesso e un numero duplicato producono tre frasi diverse su questo form.

### Nessun `uppercase` su cio' che rende un nome

`grep -Ec 'uppercase|text-transform'` → **1**, e quell'uno e' l'intestazione preesistente *Aggregated View (read-only)* in `renderAggregatedView`, che non e' antenato di nessuno dei due select. Entrambi i select portano `normal-case` esplicito. La e rovesciata del logo: **0 occorrenze**.

**`FormatMarker` non e' stato montato**, e la ragione e' scritta nel file: un `<option>` nativo rende testo e nient'altro, quindi il componente non ci puo' stare dentro. Il nome da solo e' il contenuto accessibile (§S4), e **nessuna costante di colore e' stata introdotta per compensare** (D-36-12): `color` viaggia comunque nella prop, cosi' che le superfici che sanno disegnarlo lo prendano dalla stessa riga di database. Il debito che 36-06 lascia — *«il primo piano che lo monta dovrebbe guardarlo»* — resta aperto e non e' stato consumato qui.

---

## Il catalogo, e la lettura che non deve fallire in silenzio

Entrambe le pagine leggono `formats` e `party_series` con il **client dei cookie**, cosi' che siano le capability del chiamante a decidere cosa torna.

**Nessuna delle due filtra su `listed`, e ognuna dice perche'.** Sono due assi diversi: `retired_at` dice *nessuna serata nuova puo' essere assegnata a questo*, `listed` dice *una persona ha deciso che questo si puo' vedere*. Un format dev'essere assegnabile **prima** di essere annunciato — che e' l'intero senso della separazione introdotta da D-36-17 — quindi filtrare il select su `listed` lo renderebbe inutilizzabile fino al momento in cui diventa pubblico.

`retired_at` invece e' filtrato **solo sulla pagina di creazione**: li' ogni serata e' nuova e nessuna puo' gia' portare un format ritirato. Sulla pagina di modifica il fetch non lo filtra affatto e decide il form, che tiene nel select l'eventuale ritirato **che quella serata gia' porta**, etichettato `(retired)` e preselezionato. Ometterlo significherebbe che il semplice aprire il form e salvare riassegna in silenzio una serata archiviata, e le serate archiviate non si riscrivono (D-36-10).

**Una lettura fallita del catalogo non rende select vuote.** Rende un guasto con il suo nome, e `/events` e' citato come la forma da non ripetere: quel `catch` trasforma una lettura fallita in una lista vuota (`page.tsx:135-139`), e una tendina vuota e una sana si assomigliano. Sulla pagina di modifica il danno sarebbe anche peggiore di una pagina vuota — i select si aprirebbero in bianco su serate che **hanno** gia' un format, e salvare le riscriverebbe.

La proiezione di `initialData` della pagina di modifica porta ora `format_id`, `series_id` e `number`, e la `SELECT` li chiede. Nessun compilatore lo verifica: **nessun client Supabase di questo repository e' parametrizzato con `Database`**, quindi un nome di colonna sbagliato compila, gira e restituisce `undefined`. E' scritto sopra la query.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 2 — Missing critical] I tre campi anche sul blocco a serata singola**

- **Trovato in:** Task 2, leggendo `handleSubmit`.
- **Problema:** il piano nomina «il blocco per-serata», ma il percorso `mainTime` scrive anch'esso una riga di `event_parties`. Senza i campi, quel percorso avrebbe prodotto un `23502` su `format_id`.
- **Fix:** una sola `renderCatalogueFields` usata da entrambi i blocchi, con `required` condizionato a `mainTime` sul secondo.
- **Commit:** `5443dc4`

**2. [Rule 1 — Bug] La lettura delle serate esistenti non era controllata**

- **Trovato in:** Task 1.
- **Problema:** `const { data: existingParties } = await client.from("event_parties").select("id")` — se quella lettura fallisce, `existingIds` resta vuoto, **ogni** serata in arrivo con un id cade sul ramo INSERT, e l'evento finisce con le serate duplicate.
- **Fix:** `{ error }` destrutturato, rifiuto con la sua frase, niente scritto.
- **Commit:** `c264c4f`

**3. [Rule 2 — Missing critical] Il conteggio dei biglietti non era controllato**

- **Trovato in:** Task 1.
- **Problema:** `const { count } = await client.from("tickets")…` — un conteggio fallito torna `count === null`, la guardia *«Cannot remove a sub-event that has sold tickets»* passa, e una serata con biglietti venduti viene cancellata. E' denaro e una lista alla porta.
- **Fix:** un conteggio illeggibile e' un rifiuto, non uno zero.
- **Commit:** `c264c4f`

**4. [Rule 1 — Bug] La delete delle serate rimosse non era controllata**

- **Trovato in:** Task 1.
- **Problema:** una delete che fallisce in silenzio lascia sulla pagina pubblica una serata che all'operatore e' stato detto che non c'e' piu'.
- **Fix:** `{ error }` destrutturato, rifiuto.
- **Commit:** `c264c4f`

**5. [Rule 2 — Missing critical] T-36-10-04 non aveva una meta' applicativa**

- **Trovato in:** Task 1, leggendo il registro delle minacce del piano.
- **Problema:** il registro assegna a T-36-10-04 disposizione `mitigate` con il piano *«il format ritirato che la serata gia' porta resta nel select e preselezionato; l'azione rifiuta un *cambio verso* un format ritirato»*. La seconda meta' non esisteva.
- **Fix:** `refuseUnassignableFormats` legge `formats` **con lo stesso client che scrive**, e rifiuta un format ritirato su una serata che non lo portava gia'. Un id che non torna con alcuna riga e' rifiutato anch'esso: sconosciuto significa rifiutato, mai supposto (`venue-secrecy.md`, gate *default chiuso*, applicato a un catalogo). Anche una lettura **fallita** del catalogo e' un rifiuto: *«il controllo non ha potuto girare»* e *«il controllo e' passato»* sono fatti diversi.
- **Commit:** `c264c4f`

**6. [Rule 2 — Missing critical] La riga di catalogo che il chiamante non puo' leggere**

- **Trovato in:** Task 3, ragionando sulla RLS del catalogo contro il select.
- **Problema:** il catalogo arriva con il client dei cookie, quindi un organizzatore senza `catalogue.manage` vede solo i format `listed`. Una serata registrata sotto un format **non elencato** raggiungerebbe un select che non lo contiene, il controllo ripiegherebbe sul segnaposto, e salvare la riassegnerebbe. E' la stessa perdita di dati che l'eccezione sul ritirato esiste per impedire, arrivata da un'altra strada.
- **Fix:** l'id resta come opzione propria, etichettata *«This night's format (not one you can see)»*, cosi' il valore fa andata e ritorno immutato — e `updateEvent` lo ammette proprio perche' la serata lo porta gia'. Nessun nome viene inventato: il form non ne conosce uno. Stessa cosa per la serie.
- **Commit:** `5443dc4`

**7. [Rule 2 — Missing critical] La bozza orfana di `createEvent`**

- **Trovato in:** Task 1.
- **Problema:** `createEvent` inserisce l'evento e poi le serate. Prima di questa fase l'insert delle serate non falliva praticamente mai; un numero duplicato lo rende un esito ordinario, quindi ogni numero digitato male avrebbe lasciato dietro una bozza vuota.
- **Fix:** la riga evento appena creata viene rimossa quando le sue serate sono rifiutate, e un fallimento della rimozione viene detto ad alta voce invece di essere ingoiato. Il residuo cosmetico (uno slug consumato) e' in `deferred-items.md` come **D3**.
- **Commit:** `c264c4f`

**8. [Rule 2 — Missing critical] Il controllo delle terne duplicate dentro il payload**

- **Trovato in:** Task 1.
- **Problema:** `createEvent` scrive le serate in **un** insert bulk, quindi un `23505` non nomina alcuna riga. Due sub-event dello stesso form con lo stesso numero nella stessa serie producevano un rifiuto senza attribuzione.
- **Fix:** un confronto delle righe **di un solo payload fra loro**, in `validateEventData`. **Non e' il pre-check che D-36-08 vieta:** quello chiede al database se un numero e' libero, e due schede lo battono; questo non interroga nulla e non ha una seconda parte che corre. Il suo unico compito e' l'attribuzione.
- **Commit:** `c264c4f`

### Departures dal testo del piano, deliberate e dichiarate

1. **Task 2 e Task 3 in un commit solo (`5443dc4`).** `formats` e `series` sono prop **obbligatorie** di `EventForm`: un commit con il componente ma senza le pagine che le passano — o viceversa — non compila, e passare una prop sconosciuta a un componente e' anch'esso un errore di tipo. La granularita' e' stata sacrificata a un albero che compila a ogni commit.

2. **La prosa e' stata riscritta per non far scattare i propri gate.** Due criteri di accettazione (`grep -c "error.details"` → 0, e nessun numero derivato da `max(`/`count`) trovavano solo i commenti che vietano la cosa. Il piano chiede **anche** quei commenti (*«Say so in a comment»*), quindi il conflitto e' stato risolto riscrivendo la prosa senza i token di codice — `il campo details`, `la lunghezza della lista piu' uno` — invece di togliere le spiegazioni. Resta un `count` in prosa, perche' quella frase e' esplicitamente richiesta dal piano. Risultato misurato: `error.details` → 0, `max(`/`.length + 1` → 0.

3. **Le serie ritirate non sono filtrate.** Il Task 3 elenca le quattro colonne da leggere (`id`, `format_id`, `name`, `highest_assigned`) e `retired_at` non e' fra queste. Non e' stato aggiunto di iniziativa: se una serie ritirata debba sparire dal select e' una decisione, non un dettaglio, e inventarla qui sarebbe stato scrivere una regola al posto di chi la possiede.

4. **Le tre frasi di validazione nuove sono `throw new Error`, come il piano chiede — e in produzione non arrivano a nessuno.** E' una proprieta' preesistente di **tutte** le quindici uscite di `validateEventData`, non di queste tre: Next redige il messaggio di un errore lanciato da una Server Action in una build di produzione. Detto invece di lasciato scoprire, compensato dove una persona lo incontra davvero (`required` in browser sui due select, quindi quel rifiuto avviene prima che l'azione venga chiamata), e registrato come **D2** in `deferred-items.md` con la forma che lo chiuderebbe. I rifiuti del **database** — quelli che non si potevano compensare in altro modo — viaggiano come valori.

### Non fatto, apposta

- **Nessun `FMT-*` spuntato in `REQUIREMENTS.md`** — D-36-19. Le spunte le mette la verifica di fase, una volta, con l'evidenza accanto.
- **`FormatMarker` non e' stato montato.** Un `<option>` nativo non lo puo' contenere; il debito di 36-06 resta aperto per il primo piano che ha una superficie capace di disegnarlo.
- **Nessun file dei piani 36-07 e 36-11 e' stato toccato.** `src/app/(admin)/admin/formats/actions.ts` e `src/app/(public)/events/page.tsx` girano in parallelo: comparivano modificati nel working tree e sono stati **esclusi dallo staging riga per riga**, mai con `git add .`.
- **Nessun pacchetto installato** (T-36-10-SC resta `accept` a costo zero).

## Issues Encountered

Nessun errore in esecuzione. La sola frizione e' stata la coppia di criteri di accettazione che i propri commenti facevano scattare — risolta riscrivendo la prosa, non togliendola.

## Verification — cosa e' stato eseguito

| Gate | Esito |
|---|---|
| `npm run build` dopo il Task 1 | verde |
| `npm run build` dopo i Task 2+3 | verde (exit 0, misurato separatamente) |
| `npm run verify:routes` | **PASS** — 26 pattern, 56 letterali `revalidatePath`, 23 pagine contro 24 pattern `/admin` |
| `npm run lint` sui quattro file toccati | nessun errore nuovo; i tre warning di `EventForm` sono preesistenti (`handleVenueNameBlur`, `setMainVenueText`, `<img>`) |

**Cosa questo NON prova.** Questo repository **non ha un test runner per il prodotto**, e `npm run build` non verifica un solo nome di colonna: nessun client Supabase e' parametrizzato con `Database`, quindi `format_id` scritto male compilerebbe. Nessuna delle superfici e' stata aperta in un browser, nessun rifiuto e' stato provocato contro un database reale, e la proposta del numero non e' stata vista arrivare in un campo. Quello che c'e' e' scritto, tipizzato e verificato per grep — non osservato.

### La procedura manuale che manca, scritta perche' esista

Con un account che tiene `organizer.access`:

1. `/admin/events/new` → il blocco *Event Details* mostra **Format**, **Series**, **Number**. Scegliere un format: la serie si popola solo con le serie di quel format. Scegliere la serie: **il numero arriva riempito**. Cambiare il format: serie e numero si azzerano.
2. Salvare senza scegliere un format, con un orario di inizio valorizzato → il browser rifiuta prima che l'azione parta.
3. Salvare con un numero **gia' assegnato** in quella serie → la frase *«Number N is already assigned in {Serie}. Pick another.»* compare **sotto il campo del numero**, il valore digitato **resta**, e nessun evento nuovo appare in `/admin/events`.
4. `/admin/events/{id}/edit` su una serata che ha gia' format e serie → i due select si aprono **su quei valori**, non in bianco. Salvare senza toccarli non cambia nulla.

## Known Stubs

Nessuno. I due select rendono righe di database vere; `formats ?? []` e `series ?? []` sono raggiunti solo dopo il ramo che rifiuta una lettura fallita, quindi non c'e' percorso in cui una lista vuota per guasto arrivi a un controllo.

## Threat Flags

Nessuna superficie di sicurezza nuova oltre a quelle gia' nel registro del piano. Le sei disposizioni:

- **T-36-10-01** (`updateEvent` che dichiara successo su una scrittura fallita) — **mitigata**, ed e' la deliverable: sei scritture e letture destrutturate, un rifiuto nominato per serata.
- **T-36-10-02** (un numero derivato da un conteggio) — **mitigata**: `highest_assigned`, misurato `grep -Ec 'max\(|\.length \+ 1'` → 0.
- **T-36-10-03** (due operatori in corsa per un numero) — **mitigata dal vincolo del database**, e nessun pre-check applicativo e' stato aggiunto.
- **T-36-10-04** (una serata archiviata riassegnata in silenzio) — **mitigata su entrambe le meta'**: il select tiene il ritirato che la serata gia' porta, e `refuseUnassignableFormats` rifiuta un cambio verso un ritirato. Estesa alla riga illeggibile (deviazione 6).
- **T-36-10-05** (un errore PostgREST grezzo su uno schermo condiviso) — **mitigata**: ramo su `code`, log di `code` e `message` soltanto, zero letture del campo `details`.
- **T-36-10-06** (un format non elencato mostrato nel select) — **accettata**, deliberatamente, e la ragione e' scritta in entrambe le pagine.

**Controllo di segretezza prima del commit** (il repository e' **pubblico**): sui quattro file toccati, un `grep -oiE` sull'alternanza dei quattro nomi di format piu' le tre sedi in rotazione e il nome del brand → **0 occorrenze**; `grep -ciE "bpm|techno|house|downtempo|genre"` → **0**; nessun uuid, nessun indirizzo, nessuna data non annunciata, nessun nome di persona; la e rovesciata del logo → **0**. Lo stesso controllo e' stato eseguito su questo file: gli unici riscontri erano le espressioni di grep citate nel testo, che sono state riscritte in prosa — un controllo di segretezza che trova solo se stesso non e' un controllo.

## Self-Check: PASSED

- `src/app/(admin)/admin/events/actions.ts` — presente
- `src/components/events/EventForm.tsx` — presente
- `src/app/(admin)/admin/(work)/events/new/page.tsx` — presente
- `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx` — presente
- `c264c4f` — presente in `git log --all`
- `5443dc4` — presente in `git log --all`
- Nessun file tracciato cancellato dai due commit (`git diff --diff-filter=D HEAD~2 HEAD` vuoto)
- Nessun file dei piani paralleli 36-07 / 36-11 in nessuno dei due commit

---
*Phase: 36-formats-series-numbering*
*Scritto e verificato: 2026-08-10. Cinque build verdi, tre `verify:routes` verdi, e una frase che una persona puo' leggere al posto del nome di un vincolo.*
