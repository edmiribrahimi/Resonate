# Phase 36: Formats & Series Numbering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 36-formats-series-numbering
**Areas discussed:** Formato e serata doppia · Serie, numero e chi lo assegna ·
Catalogo, ritiro e visibilita' della sigla · Il filtro pubblico

---

## Formato e serata doppia

### L'unita' della lista pubblica

| Opzione | Descrizione | Scelta |
|---|---|---|
| Resta l'evento | Una card per evento, badge dei format delle serate in ordine di `sort_order`. Rispetta come la serata doppia viene comunicata: un pezzo solo | ✓ |
| Diventa la serata | Una card per notte; filtro banale, ma spezza la card doppia e moltiplica l'archivio | |
| Evento, ma il filtro la riduce | Card intera senza filtro, ridotta alla serata corrispondente con filtro attivo | |

**Risposta del proprietario:** *«sunset sara' il format unico. all'interno ci
saranno 2 party, il primo sunset e il secondo after party. sono stato esaustivo?
o manca qualcosa?»*

**Note:** la risposta conferma l'unita'-evento ma introduce una divergenza col
calendario di produzione — il secondo tempo chiamato *after party* invece che
*notte re:sonate*. Sollevata prima di procedere, perche' decide se quella notte
prende un numero di serie, e un numero non assegnato non si recupera.

### Il format e' obbligatorio su ogni serata?

| Opzione | Descrizione | Scelta |
|---|---|---|
| Sempre obbligatorio | Backfill esplicito delle 3 serate in archivio dentro la migration | ✓ |
| Puo' restare vuoto | Richiede una decisione su cosa mostra il filtro per le serate senza format | |

**Note:** la prima formulazione di questa domanda usava il vocabolario dello
schema (`NOT NULL`, migration, backfill). Risposta del proprietario: *«non ho
capito niente. parli troppo tecnico.»* Domanda riformulata in termini di serate
e di cosa si puo' salvare; risposta immediata alla seconda formulazione.

### L'evento porta un format proprio?

| Opzione | Descrizione | Scelta |
|---|---|---|
| No — solo le serate | FMT-01 alla lettera; `events.title` resta testo libero | ✓ (discrezione delegata) |
| Si' — un format primario | Per titolo e anteprima social; rischio di due fonti di verita' | |
| Decidi tu | | ✓ |

**Risposta del proprietario:** *«Decidi tu»* → deciso: nessun format
sull'evento. Ragione registrata in D-36-01.

---

## Il secondo tempo di una serata SunSet

**Raccomandazione data prima della domanda**, su richiesta esplicita del
proprietario (*«cosa consiglia expert persona?»*): **e' una notte re:sonate**,
per quattro ragioni in ordine di peso — due indirizzi diversi e quindi due
segreti separati; il numero che non si recupera; la pipeline editoriale diversa
(timetable a −1, un podcast per dj, after movie ancorato al listing successivo);
ed e' cio' che il calendario dice gia'. Dichiarato anche cosa avrebbe ribaltato
la raccomandazione: stesso posto, stessa line-up che continua, nessun podcast
proprio.

| Opzione | Descrizione | Scelta |
|---|---|---|
| E' re:sonate, la notte | Nome e numero propri, entra nella sequenza delle notti | ✓ |
| E' l'after di SunSet | Nessun numero; la sequenza delle notti non avanza | |
| Non e' ancora deciso | Modello che regge entrambe, nessun materiale implica una risposta | |

---

## Serie, numero e chi lo assegna

### Chi decide il numero

| Opzione | Descrizione | Scelta |
|---|---|---|
| Lo propone il prodotto, lo confermi tu | Campo precompilato col successivo, modificabile; numero scritto, mai ricalcolato | ✓ |
| Lo scrivi sempre tu | Nessun suggerimento; piu' attrito, nessun automatismo | |
| Lo assegna il prodotto da solo | Sconsigliato: le locandine escono prima che la serata esista nell'app | |

### La numerazione MotionLab

| Opzione | Descrizione | Scelta |
|---|---|---|
| Continua a salire | Per format, indipendentemente dalla sede | |
| Riparte a ogni sede | Come RamaDub (Booze e Muro hanno numerazioni separate) | ✓ |
| Non e' deciso — tienilo aperto | Lo stato in cui il calendario lo tiene oggi | |

**Note:** questa risposta **chiude** il gate *progressivo per sede o per format,
ancora aperto* di `production-calendar.md`. Il modulo va aggiornato a chiusura
di fase.

### Come nasce una serie

| Opzione | Descrizione | Scelta |
|---|---|---|
| La crei tu, con nome e codice | Lista gestita: `BZ`, `MR`, `PRLN`, … Il codice della sigla e' una decisione umana | ✓ |
| Nasce da sola: format + sede | Meno lavoro, ma un locale scritto due volte crea due serie che ripartono da 1 | |

---

## Catalogo, ritiro e visibilita' della sigla

### Cosa legge un visitatore

| Opzione | Descrizione | Scelta |
|---|---|---|
| Nome e numero | «RamaDub x Booze — 018» | |
| Solo il nome | «RamaDub x Booze»; il numero resta interno alla produzione | ✓ |
| La sigla intera | «RMDB-BZ-018»; codice interno, indecifrabile per un visitatore | |

### Il ritiro di una sigla

| Opzione | Descrizione | Scelta |
|---|---|---|
| Le serate restano come erano | Ritirare blocca solo le assegnazioni nuove | ✓ |
| Spariscono dalle superfici pubbliche | La regola dei materiali portata dentro l'app | |
| Passano alla sigla nuova | Sconsigliato: riscrive cosa e' stata quella serata | |

### Il colore di un format senza palette

| Opzione | Descrizione | Scelta |
|---|---|---|
| Resta neutro | Grigio d'interfaccia finche' non si sceglie | |
| Il colore e' obbligatorio | Non si crea un format senza sceglierne uno | ✓ |
| Decidi tu | | |

**Note:** sollevata subito la tensione col gate *il colore non si eredita* di
`brand-visual-system.md` (MotionLab non ha palette; il gradiente tramonto e'
esclusivo di SunSet). Risolta senza cambiare la scelta: **obbligatorio non
significa preso in prestito** — fra le opzioni deve esistere un neutro
deliberato, e il gradiente di SunSet non e' selezionabile per altri format.
Registrata come D-36-11.

---

## Il filtro pubblico

Quest'area **non era stata selezionata** dal proprietario nella scelta iniziale.
Riproposta esplicitamente, con la ragione: e' l'unica parte della fase che puo'
far uscire un indirizzo, e due delle sue domande sono irreversibili se sbagliate.
Il proprietario ha scelto di discuterla.

### Da dove nascono i chip

| Opzione | Descrizione | Scelta |
|---|---|---|
| Tutti quelli del catalogo | Chip stabili; un chip dice che il format esiste, non quando c'e' una data | ✓ |
| Solo quelli con serate annunciate | La lista cambia da sola: l'apparizione di un chip e' essa stessa un annuncio | |
| Catalogo tranne i ritirati | Come il primo, ma le serate in archivio diventano irraggiungibili dal filtro | |

### I conteggi

| Opzione | Descrizione | Scelta |
|---|---|---|
| Nessun numero | Un conteggio rivela senza mostrare: basta che una query dimentichi le bozze | ✓ |
| Solo le serate annunciate | Canale da ri-verificare a ogni modifica futura della query | |

### La forma del link

| Opzione | Descrizione | Scelta |
|---|---|---|
| `/events?format=<slug>` | Nessuna rotta nuova; upcoming/past si sposta nell'indirizzo insieme | ✓ |
| `/events/<slug>` | Piu' leggibile, ma e' una rotta pubblica nuova da gestire al ritiro | |

### Cosa vede chi puo' vedere le bozze

| Opzione | Descrizione | Scelta |
|---|---|---|
| La stessa identica riga di tutti | Un solo percorso da costruire e da verificare; i risultati includono le bozze, i chip no | ✓ |
| Una riga piu' ricca, marcata | Due percorsi; quello pubblico eredita il codice dell'altro alla prima modifica distratta | |

---

## Claude's Discretion

- **Format sull'evento** — chiesto esplicitamente («Decidi tu»): deciso **no**,
  solo sulle serate.
- La forma del catalogo (una tabella o due), il meccanismo di precompilazione del
  numero, la collocazione della superficie di gestione dentro `/admin` e la
  composizione del nome pubblico — lasciati al piano dentro i vincoli scritti in
  CONTEXT.md.

## Deferred Ideas

- Il colore dei format come **token** — fase 40 (DS-02, DS-03)
- L'identita' **sonora** dei format — non scritta, e questa fase non la scrive
- Aggiornare `production-calendar.md` per il gate chiuso da D-36-07 — a chiusura
  di fase, con versione e changelog
- Un filtro sull'archivio passato per anno o per locale — nuova capacita', altra
  fase
