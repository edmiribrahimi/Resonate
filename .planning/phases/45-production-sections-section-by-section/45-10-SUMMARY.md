---
phase: 45-production-sections-section-by-section
plan: 10
subsystem: supabase-data / production-location
tags: [seed, production-write, location-section, venue-acquisition, idempotence, transcript-audit]

requires:
  - "45-08 — le cinque migration in produzione: uno schema vuoto dove atterrare"
  - "45-01 — le due tabelle della sezione location e i vocabolari chiusi"
  - "45-05 — vocabulary.ts, i cui dieci insiemi sono lo specchio della mappatura"
provides:
  - "184 righe in public.production_space, tutte al livello piu' basso, tutte con un indirizzo"
  - "1840 righe in public.production_space_attribute, tutte con provenienza derived"
  - "scripts/seed-production-spaces.mjs e la voce npm seed:spaces, fuori dal prefisso verify:"
  - "la prima tabella di sezione con righe dentro — verify:refusal puo' finalmente misurare una coppia"
affects:
  - "45-11 e a valle — la superficie della sezione location ha finalmente qualcosa da mostrare"
  - "45-02 / verify:refusal — dieci tabelle su undici erano vuote, ora due non lo sono"
  - "45-07 — il calcolo del punteggio ha finalmente gli attributi da cui calcolare"

tech-stack:
  added: []
  patterns:
    - "un writer sta FUORI dal prefisso verify:, che verify-all.mjs:401 usa per raccogliere i gate"
    - "ON CONFLICT DO NOTHING quando il seed possiede la creazione e la pagina possiede la modifica"
    - "ogni lettura di stato e' paginata: PostgREST tronca al tetto di righe SENZA errore"
    - "l'audit del transcript legge nome E indirizzo, piu' anni, piu' parole di strada"

key-files:
  created:
    - "scripts/seed-production-spaces.mjs"
    - ".planning/phases/45-production-sections-section-by-section/45-10-SUMMARY.md"
  modified:
    - "package.json"
    - ".planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md"
    - ".planning/phases/45-production-sections-section-by-section/deferred-items.md"

decisions:
  - "A3 chiesta, concessa e SPESA il 2026-08-17: UN run con --apply. Il secondo run che il piano chiedeva NON e' stato eseguito, perche' l'atto ne copriva uno solo"
  - "L'idempotenza e' provata da un DRY RUN dopo l'applicazione — 0 da inserire, 184 e 1840 presenti — che non spende nessuna autorizzazione perche' non scrive"
  - "ON CONFLICT DO NOTHING invece di DO UPDATE: il seed possiede la creazione, la pagina possiede la modifica, e un re-run non deve poter disfare in silenzio la correzione di una persona"
  - "35 note trattenute intere invece che ripulite: una redazione che fallisce in silenzio e' peggio di un rifiuto contato"
  - "forse mappa VERSO IL BASSO, a limited: gonfiare un input derivato e' il modo di sbagliare che costa denaro"

metrics:
  duration: "~50 minuti, 2026-08-17"
  completed: 2026-08-17
  tasks: 3
  commits: 4
---

# Fase 45 Piano 10: Il seed della sezione location — Summary

Le 184 righe dell'archivio a tavolino sono in produzione, **tutte al livello piu'
basso perche' lo script non scrive quella colonna affatto**, con 1840 attributi
tutti `derived` perche' nessuno e' stato chiamato; **35 tabelle su 37 dello
snapshot sono identiche prima e dopo**, e le due che si sono mosse si sono mosse
esattamente dei numeri dichiarati; l'autorizzazione A3 e' **spesa**, con un run e
non due, e il transcript di ogni run ha superato l'audit di se stesso — zero
nomi, zero parole di strada, zero anni.

---

## Task 1 — Lo strumento, e le cinque cose che non puo' fare

`scripts/seed-production-spaces.mjs`, `seed:spaces` in `package.json`. Commit
`4b933c1`.

### Le cinque assenze, e perche' un'assenza e' l'unica guardia che un CHECK non da'

| # | Cosa non puo' fare | Come |
|---|---|---|
| 1 | scrivere senza flag | il dry run e' il default; `--apply` va passato |
| 2 | rimuovere, sotto qualunque flag | nessuna istruzione di rimozione nel file, e nessuna lista che potrebbe portarne una |
| 3 | scrivere il livello d'ingresso | **la colonna non compare in nessun payload**: il `DEFAULT` la decide |
| 4 | scrivere un punteggio | non esiste nella sorgente e non esiste come colonna |
| 5 | scrivere le due colonne-telefonata (D-45-24) | nessuna riga di codice le nomina |

E una sesta: **la provenienza e' `derived` e basta.** L'altro membro di quella
coppia — quello che significa *verificato sul posto, per quel format* — **non e'
scritto da nessuna parte in quel file, nemmeno nella frase che lo vieta.** Un
`grep` su quel nome restituisce **zero**, e lo zero e' l'asserzione: un valore
che la sorgente non puo' produrre e' piu' sicuro di un valore protetto da un
ramo che qualcuno puo' modificare.

**Misurato sul file, con i grep del piano:**

| controllo | atteso | misurato |
|---|---|---|
| istruzioni di rimozione fuori dai commenti | 0 | **0** |
| le tre colonne vietate fuori dai commenti | 0 | **0** — *e zero righe da elencare* |
| il nome dell'altra provenienza | 0 fuori dalla frase | **0, ovunque** |
| il campo dello stato giuridico | 1 riga | **1** — la frase che lo esclude |
| `seed:spaces` in `package.json` | 1 | **1** |
| `verify:spaces` in `package.json` | 0 | **0** |

### La mappatura e' dichiarata, e la sorgente e' stata misurata prima di scriverla

27 campi, tutti classificati. Nulla e' stato dedotto a run time.

| Gruppo | Campi | Destinazione |
|---|---|---|
| identita' | nome, descrizione breve, **indirizzo**, categoria, fonte | cinque colonne dello spazio |
| format | format di casa | riferimento risolto **dal catalogo**, per codice, mai inventato qui |
| capienza | banda, numero | banda su quattro valori; il numero dove c'e' |
| bandiere | gia' usato, in uso | due booleani |
| attributi | dieci campi | dieci righe per spazio, tutte `derived` |
| prosa | una nota | una colonna, **quando e' scrivibile** — vedi sotto |
| esclusi per dichiarazione | stato giuridico, prontezza, guida ai vini, **tre campi di evidenza** | contati e riportati, mai scartati in silenzio |

**Le undici categorie sono state contate nella sorgente e sono undici**, e
ognuna ha una destinazione: nessun valore e' finito in un default. Lo stesso per
i quattro codici di format e per le quattro lettere della banda.

**Dieci mappature di valore, non due.** La sorgente porta due scale di superficie
— una a quattro passi sugli attributi che un profilo pubblico lascia leggere, una
piu' corta su quelli che chiude una telefonata — e piegarle con una tabella
condivisa avrebbe nascosto che **due dei sei non hanno la stessa forma degli
altri quattro**: il campo della vita musicale distingue *musica gia' attiva* da
*locale aperto a ospitarla*, che sono due passi reali e finiscono su due valori
diversi;
quello dell'audio no, e fingere che lo facesse avrebbe inventato una distinzione
che nessuno ha fatto.

*(Le due parole della sorgente sono state descritte qui e non citate: una di esse
e' anche un tipo di strada urbana, e questo documento e' tracciato su un repo
pubblico. E' la stessa disciplina che lo script applica al proprio transcript —
dire meno, mai allargare la regola.)*

> **`forse` mappa VERSO IL BASSO, a `limited`, e mai verso l'alto.** Significa
> *forse* — un'ipotesi di adattamento parziale letta da un profilo pubblico.
> Questi valori alimentano un punteggio calcolato, e **gonfiare un input derivato
> e' il modo di sbagliare che costa denaro**: una cifra alta accanto a un nome
> dice *questo posto e' possibile*, e lo dice a proposito di lavoro a tavolino.

### La chiave naturale, e la conseguenza che appartiene a chi rinomina

**La sorgente non ha alcuna identita' stabile per record.** E' stata letta: non
c'e' un id, non c'e' uno slug, non c'e' una chiave di nessun tipo — i 27 campi
sono tutti descrittivi. La chiave e' quindi un **nome normalizzato**, e la sua
unicita' e' stata **misurata prima** di scrivere il file: **184 chiavi distinte
su 184 record, zero collisioni, zero chiavi vuote**.

**La conseguenza e' scritta nell'header a voce alta, perche' appartiene a chi
rinominera' uno spazio: un nome cambiato arriva come una riga NUOVA.** La vecchia
non viene rimossa — qui non si rimuove nulla — e qualcuno dovra' decidere cosa
sia. La riparazione, se un giorno servira', e' un id stabile nella sorgente:
**non** un confronto approssimato qui, perche' un algoritmo che indovina quando
due nomi sono lo stesso posto e' un algoritmo che un giorno fondera' due posti
diversi.

### La scrittura e' `ON CONFLICT DO NOTHING`, ed e' una decisione

D-45-07 dice che la sezione **si semina una volta e poi si modifica dalla
pagina**. Quindi il seed possiede la creazione e la pagina possiede la modifica.
Un upsert che sovrascrivesse sul conflitto lascerebbe a un re-run la facolta' di
**disfare in silenzio** la modifica di una persona — un attributo che qualcuno ha
verificato sul posto, una nota che ha corretto — e una rimozione silenziosa di
lavoro e' il modo di fallire che questo progetto ha gia' pagato una volta.

Resta **una sola istruzione atomica per lotto**, agganciata a un vincolo unico:
mai una lettura seguita da un inserimento, che sarebbe una corsa.

### L'audit del transcript e' andato ROSSO al primo run, e la riparazione e' stata dire meno

Il primo dry run e' uscito **1**, con `SEED_DRY_RUN_WITH_LEAKED_OUTPUT`. Tre
token su 531 corrispondevano: **due articoli e una parola-numerale**. Non
portavano nessuna informazione — hanno corrisposto perche' un locale ha un
articolo inglese nel nome e una strada contiene una parola-numerale — e la
riparazione comoda era una lista di esenzioni grammaticali.

**E' stata rifiutata**, per la ragione che `import-production-calendar.mjs`
scrive a proposito del proprio rosso: una lista di esenzioni e' una regola che
cresce ogni volta che e' scomoda, e la quarta voce che qualcuno aggiunge sotto
scadenza e' quella che nasconde una fuga vera. **L'output e' stato riscritto**, e
la prosa che portava e' finita nell'header, dove non viene stampata. Il fatto e'
registrato dentro il file, accanto alla riparazione, cosi' che il prossimo lettore
non lo riscopra.

**Dopo la riscrittura, su ogni run successivo:**

```
✓ output audit: 531 residual token(s) from names, locations · 0 printed by this run · 0 four-digit years · 0 street words
```

E il grep esterno che il piano chiede, sul transcript catturato:

```
grep -cE "[Vv]ia |[Cc]orso |[Pp]iazza |20[0-9]{2}"  →  0
```

---

## Task 2 — L'autorizzazione, con la sua data e il suo perimetro

**Concessa il 2026-08-17.** Le parole del proprietario: **«Autorizzato, un run
con `--apply`».**

### Cosa copre, e cosa no — e l'elenco del "no" e' la meta' che conta

| Coperto | Non coperto, e ognuno chiede il proprio atto |
|---|---|
| **UN** run di `scripts/seed-production-spaces.mjs` **con `--apply`** | **un secondo run con `--apply`** |
| scritture in `public.production_space` e nella sua tabella di attributi, e in nessun'altra | qualsiasi rimozione, sotto qualsiasi flag |
| ogni riga al livello piu' basso, perche' lo script non scrive quella colonna | qualsiasi scrittura fuori dalla sezione location |
| ogni attributo `derived`, perche' nessuno e' stato chiamato | la migration di ritiro — e' il piano 45-09 |

**L'autorizzazione e' SPESA.** E' stata usata per **un** run, e non resta nulla
da spendere. `45-PROCEDURES.md` porta la stessa cosa sulla riga A3 del registro,
con la stessa data. Commit `a7b7397`.

**Ne' rifiutata ne' differita.** Il piano chiedeva di dire quale delle due in
caso contrario: non e' il caso, e la distinzione resta scritta perche' la
prossima volta potrebbe esserlo.

### Lo snapshot, preso PRIMA che il flag partisse

L'insieme di cascata **non e' stato ricordato: e' stato camminato**, con la stessa
query ricorsiva su `pg_constraint` del piano 45-08 — dalle tre tabelle che le
nuove referenziano, risalendo ogni `contype = 'f'` fino a profondita' 12, unita
alle sei del calendario, alle due di `private` e a `storage.buckets`.

**37 tabelle contate. Identiche, riga per riga, al post-snapshot del piano
45-08** — che e' l'unico modo in cui due misure prese in due sessioni diverse si
possono confrontare: non "mi ricordo che era cosi'", ma la stessa query, gli
stessi 37 nomi, gli stessi 37 numeri.

*(La query e' stata corretta in un punto rispetto a quella del piano 45-08: senza
un filtro su `relkind`, il ramo che pesca le tabelle per prefisso pescava anche
gli **indici**, e contare le righe di un indice e' un errore `42809`. La
correzione e' un filtro, non un allargamento: l'insieme contato e' lo stesso.)*

---

## Task 3 — Il run, la rilettura, e la prova che un secondo run non serviva

### Il run, uno solo

```
  APPLY — this run writes. It removes nothing; no flag would let it.

    records in snapshot               184
    records planned                   184
    with a location                   184
    with a headcount                  38
    with a usable remark              149

    rows to insert                    184
    rows already present              0
    qualities to insert               1840
    qualities already present         0

    absent_name                       0
    empty_natural_key                 0
    duplicate_natural_key             0
    unmapped_category                 0
    unmapped_home_format              0
    unresolved_home_format            0
    unmapped_size_band                0
    capacity_not_positive             0
    unmapped_attribute_value          0
    note_withheld_contact             35
    evidence_field_has_no_column      357
    flag_field_has_no_column          22

    write steps completed             9
    rows offered                      184
    qualities offered                 1840

  ✓ output audit: 531 residual token(s) from names, locations · 0 printed by this run · 0 four-digit years · 0 street words

  SEED_APPLIED_OK
```

**Exit code: `0`.** Nove passi di scrittura: un lotto di spazi, otto di attributi.

**Nessun rifiuto di mappatura.** I nove reason code che riguardano la
corrispondenza fra sorgente e vocabolario sono tutti a zero: le undici categorie,
i quattro codici di format, le quattro bande e tutti i valori dei dieci attributi
avevano una destinazione dichiarata. I tre che non sono a zero non sono
fallimenti di mappatura — sono **materiale che non ha una colonna**, e ognuno ha
la sua voce in `deferred-items.md`.

### La rilettura, che legge il CATALOGO e non lo script

Un conteggio riportato da chi ha scritto e' un referto; il catalogo e' il fatto.
Tutto quanto segue e' stato chiesto all'API di gestione, in sola lettura.

| Domanda | Risposta dal catalogo |
|---|---|
| righe negli spazi | **184** |
| righe negli attributi | **1840** |
| gruppi del livello d'acquisizione | **uno solo**, ed e' il piu' basso, su 184 |
| gruppi della provenienza | **uno solo**, ed e' `derived`, su 1840 |
| gruppi della colonna sulle ore prolungate | **uno solo**, al default `not_asked` |
| gruppi della colonna sulle ore pubblicate | **uno solo**, al default `not_asked` |
| gruppi della colonna sull'origine delle risposte | **uno solo**, al default `not_asked` |
| righe promosse a una sede | **0 su 184** — la colonna e' nulla ovunque |
| righe con una prova d'accordo | **0 su 184** |
| righe uscite dalla corsa | **0 su 184**, e nessuna ragione d'uscita |
| le tre risposte-telefonata (impianto, dj ospite, orario di chiusura) | **nulle su 184** ciascuna |
| attributi per spazio | **min 10, max 10** — nessuno spazio a meta' |
| chiavi naturali distinte | **184**, su 184 righe |

**Nessuna riga e' al livello `acquired`**, e non e' perche' il vincolo l'avrebbe
rifiutata senza una prova scritta: e' perche' **il gruppo e' uno solo**, ed e' il
piu' basso. Il vincolo `production_space_acquired_needs_evidence` non ha avuto
nulla da fare, ed e' il verso giusto — una guardia che non scatta perche' non c'e'
niente da fermare.

**Cosa e' arrivato, come forma e mai come valore:**

| | conteggio |
|---|---|
| con un indirizzo | 184 |
| con una categoria | 184 |
| con una banda di capienza | 184 |
| con un format di casa risolto | 184 |
| **con una capienza numerica** | **38** |
| con una nota | 149 |

> **Le 38 sono la riga che il contesto di fase dava per impossibile.**
> `45-CONTEXT.md` afferma due volte che la capienza numerica e' nulla su tutti i
> 184. Ne portano un numero **38**, e sono entrate. Presa per buona, quella frase
> avrebbe portato a **non importare il campo**, e la seconda delle quattro
> domande — *quanta gente ci sta davvero* — sarebbe rimasta senza risposta su 38
> spazi che l'avevano gia'. Vedi `DEF-45-06`.

**La banda, distribuita** — e il quarto valore **non e' una taglia**:

| banda | conteggio |
|---|---|
| piccola | 55 |
| media | 73 |
| grande | 39 |
| **non chiesta** | **17** |

Diciassette spazi non hanno una taglia: hanno una **domanda non fatta**, ed e'
uno stato distinto perche' una cella vuota e una domanda non posta sono lo stesso
pixel finche' il dato non le distingue.

**I valori degli attributi, distribuiti** — e 392 su 1840 sono la stessa cosa,
sull'altro asse:

| valore | conteggio |
|---|---|
| top | 438 |
| buono | 322 |
| limitato | 446 |
| no | 242 |
| **non chiesto** | **392** |

### ⚠ IL SECONDO RUN CON `--apply` NON E' STATO ESEGUITO, ED E' UNA SCELTA

Il piano, al task 3, chiede di *«eseguirlo una seconda volta, con `--apply`, e
provare che nulla e' cambiato»*. **L'autorizzazione dice l'opposto**, ed elenca
*un secondo run con `--apply`* fra le cose che **non** copre.

`meta-gates.md` risolve il caso: dove due gate producono richieste
contraddittorie **vince il piu' restrittivo, e il conflitto si scrive invece di
sceglierlo in silenzio**. E `ai-engineering.md` dice che un'autorizzazione copre
esattamente cio' che e' stato descritto quando e' stata chiesta.

**Quindi l'idempotenza e' stata provata con lo strumento che non spende niente:
un DRY RUN dopo l'applicazione**, che non scrive e non chiede nessun atto.

```
  DRY RUN — nothing will be written. Pass --apply to write.

    rows to insert                    0
    rows already present              184
    qualities to insert               0
    qualities already present         1840

  ✓ output audit: 531 residual token(s) from names, locations · 0 printed by this run · 0 four-digit years · 0 street words

  SEED_DRY_RUN_OK
```

**Exit code: `0`.** Zero righe e zero attributi da scrivere; 184 e 1840 gia'
presenti — **gli stessi due numeri che il catalogo aveva dato**, letti da due
strade diverse. Un secondo `--apply` avrebbe aggiunto rischio senza aggiungere
una misura: le uniche istruzioni che avrebbe emesso sarebbero state
`DO NOTHING` su 2024 righe gia' presenti.

### Il post-snapshot

Stessa query, 37 tabelle.

| | pre | post | Δ |
|---|---|---|---|
| `public.production_space` | 0 | **184** | **+184, dichiarato** |
| `public.production_space_attribute` | 0 | **1840** | **+1840, dichiarato** |
| **le altre 35** | — | — | **identiche, tutte** |

`private.capabilities` 18 → 18. `private.role_capabilities` 38 → 38.
`storage.buckets` 6 → 6. Le sei tabelle del calendario ferme, con
`production_pipeline_rule` a 16 prima e dopo. `venues` 5 → 5, `formats` 5 → 5,
`profiles` 4 → 4, `event_parties` 3 → 3, `drink_items` 7 → 7,
`membership_acts` 2 → 2, `ticket_tiers` 1 → 1, `party_series` 6 → 6, e tutte le
altre a zero prima e a zero dopo.

**Nessuna terza differenza.** E' la meta' che risponde a D12: non "credo di aver
toccato solo due tabelle", ma **35 conteggi su 35 identici**, presi con la stessa
query prima e dopo.

---

## Verifiche meccaniche

| comando | esito | letto come |
|---|---|---|
| `seed-production-spaces.mjs` (dry, prima) | **exit 1**, poi **exit 0** | l'audit ha fatto il suo lavoro, e la riparazione e' stata dire meno |
| `seed-production-spaces.mjs --apply` | **exit 0** | il run autorizzato, `SEED_APPLIED_OK` |
| `seed-production-spaces.mjs` (dry, dopo) | **exit 0** | 0 da scrivere: l'idempotenza, senza spendere un atto |
| `seed-production-spaces.mjs --help` | **exit 0** | forma a secco, nessuna credenziale letta, niente contattato |
| `npm run build` | **exit 0** | il typecheck passa, prima e dopo la riparazione |
| `npm run verify` | **exit 2** | vedi sotto |

### `npm run verify` non esce 0, e la ragione non e' questo piano

Il criterio 8 del piano chiede `exit 0`. **Misurato: `exit 2`, con 5 gate
`REFUSED` e ZERO `FAILED`.** I cinque sono `verify:capabilities`,
`verify:conversion`, `verify:section-surface`, `verify:section-export`,
`verify:touch-targets` — tutti registrati in `deferred-items.md` come
pre-esistenti (`DEF-45-01`, `DEF-45-02`), piu' i due moduli d'esportazione che
sono del piano 45-16 e non esistono ancora su disco.

**Zero `FAILED` e' il numero che riguarda questo piano**, ed e' il numero giusto:
nulla e' rotto. E la meta' del criterio che era davvero sua e' verificata:

> **`seed:spaces` non compare da nessuna parte nell'aggregato.**
> `scripts/verify-all.mjs:401` raccoglie i gate con
> `Object.keys(scripts).filter((name) => name.startsWith("verify:"))`, e questa
> voce sta fuori da quel prefisso di proposito. Un writer dentro un aggregato che
> una build, un hook o un'abitudine invocano e' il modo in cui una decisione
> diventa un incidente.

*(E `verify:refusal` **non** e' stato eseguito, e non lo sarebbe stato neanche
dall'aggregato: sta in `NEEDS_AUTHORISATION`, che l'aggregato dichiara e non
lancia. Coniare una sessione sull'identita' di una persona vera e' un atto, e
questo piano non ne aveva uno da spendere per quello.)*

---

## Deviazioni dal piano

### 1. [Regola 1 — bug] Una lettura non paginata mentiva sul proprio conteggio

- **Trovata durante:** task 3, leggendo il dry run subito dopo l'applicazione.
- **Il problema:** il dry run dichiarava **1000 attributi presenti e 840 da
  scrivere**; il catalogo ne contava **1840, tutti gia' scritti**. PostgREST
  tronca una risposta al tetto di righe configurato e **non restituisce un
  errore**: una pagina corta e una tabella piccola sono indistinguibili se chi
  legge non conta. Il numero 1000 non era un conteggio, era il tetto.
- **Cosa NON e' successo, ed e' la meta' che rassicura:** nulla e' stato scritto
  di sbagliato. La scrittura offre ogni riga pianificata e lascia decidere il
  vincolo unico, quindi **le righe erano giuste mentre il REFERTO era falso**.
- **Perche' e' comunque grave:** il referto e' **la prova della
  ri-eseguibilita'**, ed e' esattamente la frase su cui qualcuno agirebbe. Un
  troncamento silenzioso e' peggio di un fallimento rumoroso, perche' niente in
  esso sembra sbagliato.
- **La correzione:** le tre letture di stato — il catalogo dei format, gli spazi
  esistenti, le coppie di attributi esistenti — piu' la rilettura degli
  identificatori dopo la scrittura, ora chiedono a fette e si fermano **solo
  quando una fetta torna piu' corta di quanto chiesto**.
- **File:** `scripts/seed-production-spaces.mjs`
- **Commit:** `6c37000`
- **Verificata:** dopo la riparazione il dry run dice **0 da inserire, 184 e 1840
  presenti** — gli stessi due numeri che il catalogo aveva gia' dato per una
  strada diversa.

### 2. [Regola 2 — funzionalita' critica mancante] 35 note portavano un contatto

- **Trovata durante:** task 1, misurando la sorgente **prima** di scriverla.
- **Il problema:** `45-CONTEXT.md` registra la sorgente come priva di *contact
  field, phone, email*. E' vero dei **campi** ed e' **falso della prosa**: 15
  record portano un indirizzo di posta dentro la nota libera, 20 un numero di
  cellulare italiano, quattro nominano una persona a cui chiedere. Il commento
  della colonna di destinazione dichiara *nessun contatto, nessuna persona,
  nessun prezzo*.
- **Perche' e' Regola 2 e non una preferenza:** scrivere quelle note verbatim
  avrebbe rotto un contratto dichiarato della colonna **e** messo il numero di
  telefono di una persona fisica in una tabella di produzione, per una finalita'
  che nessuno ha dichiarato — `legal-compliance.md`, *ogni dato in piu' ha una
  ragione dichiarata o non si raccoglie*.
- **La correzione:** un rilevatore **deliberatamente largo** (posta, numeri,
  prezzo, e le parole che introducono un referente) e il **campo trattenuto
  intero**, mai mascherato: una redazione che fallisce in silenzio e' peggio di
  un rifiuto contato. Lo spazio viene scritto comunque — perdere un posto perde
  la memoria di una scelta. Contati come `note_withheld_contact`, **35**.
- **Differita, non risolta:** `DEF-45-05`. Il materiale non e' perso: vive
  nell'archivio locale, gitignored.

### 3. [Lettura, non deviazione] Il secondo `--apply` non e' stato eseguito

Documentato per esteso nel task 3. Il piano lo chiede, l'autorizzazione lo
esclude per nome, e il piu' restrittivo vince. L'idempotenza e' provata da un dry
run che non scrive.

### 4. [Lettura, non deviazione] `npm run verify` esce 2, con zero FAILED

Documentato sopra. Cinque rifiuti pre-esistenti; il numero che riguarda questo
piano e' lo zero dei fallimenti, e la meta' del criterio che era davvero sua —
`seed:spaces` fuori dall'aggregato — e' verificata leggendo la riga che raccoglie.

### 5. [Nota d'ambiente] Gli script sono stati lanciati con `--env-file`

Un worktree non ha un `.env.local` proprio. Le credenziali sono state lette dal
checkout primario **senza essere copiate in nessun file, senza essere stampate e
senza essere committate**. Lo stesso caso, con la stessa forma, del piano 45-08.

### Nessun'altra deviazione

Nessuna riga e' stata cancellata. Nessuna tabella fuori dalla sezione location e'
stata scritta. Nessuna costante e' stata modificata per far tornare un verde.
Nessuna migration e' stata toccata. **L'audit del transcript e' andato rosso una
volta e non e' stato allentato.**

---

## Cosa questo piano lascia aperto, nominato invece che sottinteso

1. **L'evidenza per attributo non ha una colonna** — 357 valori rifiutati e
   contati. `DEF-45-04`. Chiuderla e' una migration, e questa fase ne ha una sola
   ancora aperta, che e' il ritiro.
2. **I contatti dentro le note** — 35 campi trattenuti. `DEF-45-05`. Chiuderla e'
   una decisione di `legal-compliance.md`, non un dettaglio di schema.
3. **`45-CONTEXT.md` sbaglia sulla capienza** — dice nulla su 184, ne portano un
   numero 38. `DEF-45-06`.
4. **La sezione non ha ancora una superficie.** Le righe ci sono; la pagina che le
   mostra e' a valle. Un utente non vede ancora niente, e questo e' lo stato
   previsto.
5. **`verify:refusal` puo' finalmente misurare qualcosa.** Fino a oggi dieci
   tabelle su undici erano vuote e lo strumento rifiutava onestamente: su una
   tabella a zero righe la risposta di chi ha titolo e quella di chi non ce l'ha
   sono identiche. **Adesso due di quelle tabelle portano righe.** Il run e'
   pero' un **atto**, e questo piano non aveva un'autorizzazione da spendere per
   coniare una sessione.
6. **A3 e' spesa.** Qualsiasi ulteriore scrittura chiede il proprio atto.

---

## Known Stubs

Nessuno. Questo piano non tocca alcun file di prodotto: aggiunge uno script sotto
`scripts/`, una voce in `package.json` e tre documenti di pianificazione. Le
colonne lasciate vuote — il livello, le due risposte-telefonata, l'origine delle
risposte, l'impianto, il dj ospite, l'orario di chiusura, la prova d'accordo, la
promozione, l'uscita — **non sono stub**: sono lo stato reale di un archivio in
cui **nessuno e' stato chiamato**, e ognuna e' vuota per una ragione scritta nel
file che l'ha creata.

## Threat Flags

Nessuna superficie di sicurezza nuova fuori dal `<threat_model>` del piano. Le sei
voci del registro erano dichiarate `mitigate` (o `accept`) e ognuna ha la propria
misura qui sopra: **T-45-03** (l'audit del transcript, andato rosso una volta e
verde su ogni run successivo, piu' il grep esterno a zero), **T-45-01**
(l'indirizzo scritto solo nella sua colonna; l'assenza di archi verso la strada
pubblica e' del piano 45-06), **T-45-08** (dry run di default, nessuna istruzione
di rimozione, due snapshot sull'insieme di cascata letto da `pg_constraint`, e
l'idempotenza provata invece che assunta), **T-45-13** (quattro omissioni
strutturali piu' una assenza totale del nome dell'altra provenienza), **T-45-02**
(`code` e `message`, mai l'oggetto d'errore), **T-45-SC** (nessun pacchetto
installato).

---

## Self-Check: PASSED

| affermazione | come e' stata controllata | esito |
|---|---|---|
| `scripts/seed-production-spaces.mjs` esiste | `test -f` | FOUND |
| `45-10-SUMMARY.md` esiste | `test -f` | FOUND |
| i quattro commit esistono | `git log --oneline --all` | FOUND |
| **184 righe sono in produzione** | conteggio dal **catalogo**, non dallo script | **184 / 1840** |
| **un solo gruppo di livello, e un solo gruppo di provenienza** | `GROUP BY` sul catalogo | **1 e 1** |
| **35 tabelle su 37 identiche prima e dopo** | la stessa query, due volte | **35 / 35** |

Le ultime tre righe sono quelle che contano, e sono state chieste **al
database** — non ai nove `write steps completed` che le avevano annunciate. Una
misura presa con lo strumento che ha causato l'effetto e' un'eco.

---

*Fase 45, piano 10 — scritto il 2026-08-17. Non contiene nessuno spazio, nessun
indirizzo, nessuna data non annunciata, nessuna line-up e nessun nome di persona:
solo conteggi, nomi di colonna e reason code. `re:sonate` si scrive con la e
normale.*
