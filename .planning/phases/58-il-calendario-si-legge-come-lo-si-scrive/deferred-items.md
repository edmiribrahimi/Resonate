# Fase 58 — voci differite

Cose trovate durante l'esecuzione, **fuori dal perimetro del piano che le ha
trovate**, e non riparate. Ognuna porta chi l'ha vista e quando.

---

## 1. Le regole di pipeline: sedici nel file, quattordici nella tabella

- **Trovata:** piano 58-06, task 3, 2026-08-20, leggendo il catalogo vivo con
  `read_only: true`
- **Il fatto:** `public.production_pipeline_rule` contiene **14 righe**. Il
  controllo **D** di `verify-ics-import.mjs` riporta *«16 rules read from the
  migration»* — e le legge dal **file** della migration, mai dal database. I due
  numeri non sono mai stati confrontati da nessun controllo.
- **Perche' potrebbe non essere niente:** il seed puo' essere condizionato a
  format o serie che non esistono tutti in produzione, e due righe in meno
  sarebbero allora la conseguenza corretta di quel filtro, non una perdita.
- **Perche' potrebbe essere qualcosa:** se due regole mancano davvero, i pezzi di
  quei tipi non hanno un'ancora contro cui essere misurati — e l'assenza di una
  regola, per dottrina di questo modulo, non e' un errore ma un **orfano
  silenzioso**. Nessun conteggio oggi distingue *«regola assente per decisione»*
  da *«regola assente per riga mancante»*.
- **Non riparata perche':** il piano 58-06 tocca due `CHECK`, non il seed, e la
  regola di perimetro vieta di riparare cio' che non si e' rotto qui. Una riga
  inserita a mano in produzione sarebbe anche uno stato che nessuna migration
  ricostruisce.
- **Come si chiude:** confrontare, riga per riga, cio' che il seed inserisce con
  cio' che la tabella tiene, e poi decidere se la differenza e' una decisione o
  una perdita. Se e' una perdita, si corregge **in avanti**, con una migration.

---

## 2. `information_schema.table_constraints` e' vuota per il ruolo della Management API

- **Trovata:** piano 58-06, task 3, 2026-08-20
- **Il fatto:** la stessa interrogazione che restituisce dodici vincoli da
  `pg_constraint` restituisce **zero righe** da
  `information_schema.table_constraints`. Quella vista filtra per privilegio, e
  il ruolo con cui l'endpoint esegue non li ha.
- **Perche' conta:** un controllo scritto su `information_schema` da qui
  passerebbe **sempre**, misurando il vuoto. E' un falso verde per costruzione,
  ed e' esattamente la forma di rifiuto che questo progetto pretende sia
  distinguibile da un passaggio.
- **Non riparata perche':** nessuno script del repo interroga oggi quella vista;
  il piano 58-06 l'ha solo tentata e ha usato `pg_constraint` al suo posto.
- **Come si chiude:** se un controllo futuro avra' bisogno dei vincoli dal
  catalogo, usare `pg_constraint` — ed e' anche la fonte da cui `M4` aveva letto
  i dodici nomi.

---

## 3. `P-58-C` passo 5 non ha ancora uno strumento: il ripristino DALL'ISTANTANEA

- **Trovata:** piano 58-09, task 2, 2026-08-20
- **Il fatto:** il piano 58-09 costruisce due cose che sembrano la stessa e non
  lo sono. **(a)** L'istantanea su disco, scritta prima della cancellazione,
  nella directory ignorata. **(b)** Il riaggancio dentro la corsa, che rimette
  spunte e legami **letti dal database prima di cancellare** e tenuti in memoria.
- **Perche' conta:** `P-58-C` esiste per la corsa che **muore a meta'**. In quel
  caso la memoria del processo e' andata, e le righe non ci sono piu': una
  seconda corsa riscrive il contenuto del file — che e' il passo 4 della
  procedura, e funziona — ma le sue liste di riaggancio sono **vuote**, perche'
  legge un calendario appena svuotato. Il passo 5 dice *«ripristinare spunte e
  legami dall'istantanea del passo 3, con il percorso di ripristino dedicato»*, e
  **quel percorso oggi non esiste**: nessun argomento dell'importatore legge un
  file di istantanea.
- **Quanto e' grave oggi:** misurato il 2026-08-20 il caso e' vuoto — **0 spunte
  e 0 legami** in produzione — quindi un rientro non perderebbe niente. Diventa
  grave alla prima spunta.
- **Non riparata perche':** il piano 58-09 elenca tre file e nessun argomento di
  ripristino; costruirlo qui sarebbe uno strumento che **scrive in produzione**
  aggiunto senza che nessun piano lo abbia dichiarato — ed e' esattamente il tipo
  di percorso che questa fase pretende sia deciso prima di esistere.
- **Come si chiude:** un argomento esplicito che legge un'istantanea per
  percorso, ne verifica l'ora contro la corsa interrotta, e riscrive **solo** le
  due eccezioni di stato conservando `ticked_by` e `ticked_at` originali — mai
  da `record_checklist_tick`. Va dichiarato in 58-11 o 58-12, insieme alla
  decisione se `P-58-C` puo' chiudersi senza di esso.

### ⇢ Decisione presa il 2026-08-20, nella seduta del piano 58-11

**`P-58-C` chiude SENZA lo strumento di ripristino dall'istantanea.** Decisione
del proprietario, con il caso misurato davanti: **0 spunte e 0 legami**, quindi
un rientro eseguito oggi non perderebbe nulla e il passo 5 non avrebbe niente da
rimettere.

**Il limite e' dichiarato, non chiuso.** E il momento in cui lo strumento diventa
necessario **non e' la prima corsa del cron**: e' **la prima spunta o il primo
legame**. Da li' in avanti una corsa morta a meta' perde una riga che esiste
**solo** nel database — non nel file, non nell'istantanea leggibile da nessun
argomento — con la cascata su `production_checklist_item` e senza PITR.

**Assegnato al piano 58-12**, e sono due cose, non una:
1. lo strumento del passo 5 — l'argomento che legge un'istantanea per percorso,
   ne verifica l'ora contro la corsa interrotta, e riscrive **solo** le due
   eccezioni di stato conservando `ticked_by` e `ticked_at`;
2. **la guardia che rifiuta la corsa non presidiata** quando spunte o legami
   sono `> 0` e lo strumento del punto 1 non esiste ancora.

Nessuna delle due si costruisce nel piano 58-11.

---

## 4. Lo specchio non ha una sorgente registrata: la prima corsa non e' potuta partire

- **Trovata:** piano 58-11, task 2, 2026-08-20, lanciando la prova a vuoto
- **Il fatto, alla lettera.** `node scripts/import-production-calendar.mjs
  --dry-run --calendar rsnt` **rifiuta al gate 2**, uscita `2`, categoria
  `missing_feed_source`, e chiude con *NOTHING WAS WRITTEN. The import did not
  happen; this is not an empty plan.* Non esiste alcun referto da leggere per
  intero: la corsa si ferma **prima** di leggere una voce, prima di contare una
  riga e prima di stampare un solo conteggio.
- **Perche'.** Il piano 58-10 ha chiuso `--file` e `--docs-dir` (`ICS-09`) e ha
  reso la variabile `PRODUCTION_CALENDAR_FEED_<CHIAVE>` **l'unica** via per cui
  dei byte raggiungono la corsa: `readFileSync` e' uscito dagli import di
  `node:fs`, e l'unica sorgente e' la lettura remota. Quella variabile **non e'
  registrata**: zero occorrenze nell'ambiente di processo, e il gate 2 non
  guarda `.env.local` per costruzione — deliberatamente, perche' una sorgente
  risolta da un file su disco trasformerebbe un controllo in un sondaggio.
- **Non e' un difetto di 58-10.** E' una **lacuna d'ordine della fase**: l'onda 6
  ha chiuso la strada del file, l'onda 7 doveva percorrere quella nuova, e
  nessuna delle due ha registrato l'indirizzo. Il codice si comporta esattamente
  come dichiarato.
- **Perche' non e' stata aggirata.** Le tre scorciatoie disponibili sono tutte
  vietate, e ognuna da una regola gia' scritta: reintrodurre `--file`
  riaprirebbe la seconda strada che `ICS-09` ha chiuso; puntare la variabile a un
  servizio locale non ha uno schema accettato — la corsa rifiuta tutto cio' che
  non e' `https:` o `webcal:`, e rifiuta `file:` per nome; pubblicare
  l'istantanea a un indirizzo raggiungibile sarebbe **pubblicare il calendario
  di produzione**, con dentro date non annunciate, sedi in trattativa e line-up.
- **Chi puo' chiuderla — e non e' un passaggio tecnico.** Solo il proprietario:
  il calendario va **pubblicato dal suo Mac** e il suo indirizzo registrato nella
  variabile d'ambiente, sulla piattaforma di deploy e nell'ambiente di chi lancia
  la corsa a mano. **La pubblicazione e' essa stessa un atto di dominio**, non
  una configurazione: `D-58-05` punto 1 scrive che un link pubblicato e'
  leggibile da chiunque lo abbia, e che ri-pubblicare invalida il vecchio
  indirizzo ma non lo toglie dagli occhi di chi l'ha gia' visto.
- **Conseguenza a valle, misurata.** Senza il primo specchio, il passaggio una
  tantum sulle righe senza chiave non avviene, quindi la stretta a `NOT NULL`
  del task 3 **non ha la sua precondizione** — vedi il numero nella voce 5.

---

## 5. `P-58-B` passi 21-23 non hanno piu' un veicolo: il file di prova non entra — **CHIUSA PER DECISIONE il 2026-08-20**

- **Trovata:** piano 58-11, task 2, 2026-08-20, leggendo la procedura contro il
  codice invece che contro il piano che l'aveva scritta
- **Il fatto:** `P-58-B` e' stata scritta nell'onda 0, quando l'importatore
  accettava `--file`. Tre dei suoi passi lo pretendono testualmente —
  *«costruire un file di prova identico al file vero tranne una cosa»*, *«lanciare
  l'import con `--apply` su quel file»*: il passo 21 per `ICS-03b`, i passi 22 e
  23 per `ICS-01b`. **Quell'argomento non esiste piu'** dall'onda 6.
- **Perche' conta, e perche' non si chiude registrando l'indirizzo.** Anche il
  giorno in cui la voce 4 sara' chiusa, questi tre passi **restano ineseguibili**
  come scritti: l'unica sorgente e' l'indirizzo remoto, e mutare cio' che quel
  indirizzo serve significa **mutare il calendario di produzione** — cambiare un
  progressivo su una serata vera per vedere se il rifiuto scatta. Il progressivo
  e' la terza guardia monotona del progetto, e la procedura stessa vieta di
  spenderlo.
- **Cosa esiste gia' al loro posto, e cosa non copre.** Il piano 58-09 ha provato
  `ICS-01b` **per mutazione del codice** — uscita `2`, `renumber_refused`, zero
  scritture, e la riautorizzazione scritta nel referto. E' una prova vera, ma e'
  una prova **contro un giro a vuoto**: non dice che il rifiuto arriva **prima**
  della cancellazione in una corsa che avrebbe cancellato davvero, che e'
  esattamente l'osservazione che il passo 22 dichiara *la piu' pesante di tutta
  la procedura*.
- **Non riparata perche':** ridare all'importatore una seconda sorgente e' la
  reversione di una decisione spedita in questa stessa fase, e non si prende
  d'iniziativa dentro il piano che la incontra.
- **Come si chiude — tre strade, e nessuna e' gratis:** (a) una seconda chiave di
  calendario registrata verso un indirizzo di prova, che pero' fa esistere un
  secondo calendario pubblicato; (b) un argomento di sola prova che accetta una
  sorgente locale **e rifiuta `--apply`**, che pero' non eserciterebbe il caso
  che il passo 22 vuole; (c) riscrivere i passi 21-23 di `P-58-B` in una forma
  che il codice di oggi ammetta, dichiarando cosa smettono di provare. **La
  scelta e' del proprietario**, e va fatta prima di dichiarare chiusi `ICS-01b`
  e `ICS-03b` sull'evidenza di una procedura.

### ⇢ Decisione presa il 2026-08-20, nella seduta del piano 58-11

**Strada scelta: (c) — RISCRIVERE i passi 21-23 dichiarando cosa smettono di
provare.** Decisione del proprietario. I passi sono stati riscritti lo stesso
giorno in `58-PROCEDURES.md`, e la dichiarazione sta nel blocco che li precede,
scritto per essere leggibile da chi non conosce questa voce.

**Le altre due sono state scartate, e la ragione dello scarto si scrive perche'
non vengano riproposte come se fossero nuove:**

- **(a) una seconda chiave di calendario verso un indirizzo di prova** —
  scartata: farebbe esistere un **secondo calendario pubblicato**, con la stessa
  esposizione del primo. `D-58-05` punto 1 dice che un link pubblicato e'
  leggibile da chiunque lo abbia, e che ri-pubblicare invalida il vecchio
  indirizzo ma non lo toglie dagli occhi di chi l'ha gia' visto. Un secondo
  indirizzo raddoppia quella superficie per guadagnare una prova.
- **(b) un argomento di sola prova che accetti una sorgente locale e rifiuti
  `--apply`** — scartata: **non eserciterebbe il caso**. Il caso che il passo 22
  chiamava *il piu' pesante di tutta la procedura* e' il rifiuto che arriva
  **prima della cancellazione**, e la cancellazione vive dentro un `--apply`. Un
  argomento che rifiuta `--apply` produce l'ennesimo giro a vuoto, che e'
  esattamente cio' che il piano 58-09 ha gia' fatto.

**Cosa la riscrittura ha prodotto, in una riga per passo:**
- **21** — l'assenza si crea dal lato del **database** (una riga sonda che la
  sorgente non ha mai portato), non dal lato del calendario. `ICS-03b` resta
  esercitabile per intero, e con un'assenza **vera** invece che simulata.
- **22** — non fa piu' scattare il rifiuto; osserva che la guardia gira **dentro
  la corsa che scrive**, su una popolazione contata dal catalogo e dichiarata.
- **23** — non scrive: due giri a vuoto, con e senza l'argomento di
  riautorizzazione, per osservare che l'argomento **non inventa** la traccia di
  una decisione che nessuno ha preso.

**Cosa resta perso, e non e' un dettaglio:** che il rifiuto arrivi **prima**
della cancellazione in una corsa che avrebbe cancellato davvero. Le due
condizioni che lo riaprirebbero sono nominate nel blocco della procedura — la
prima e' **il giorno in cui una rinumerazione la si vuole per davvero**, quando
quell'osservazione sara' disponibile a costo zero e andra' colta.

⚠ **Una conseguenza va portata al proprietario prima che l'autorizzazione sia
spesa:** la riscrittura **cambia cosa `P-58-B` scrive** — il passo 21 ora
inserisce una riga sonda, e il passo 24 la rimuove. L'autorizzazione del
2026-08-20 e' stata data su una descrizione che non la conteneva, e
un'autorizzazione data su una descrizione non copre una descrizione diversa. E'
scritto anche nel preambolo della procedura.

**Questa voce e' chiusa.** Non e' piu' un blocco per la fase: quello che resta
aperto e' la **voce 4**, e non e' questa.

---

## 6. `M1` e' invecchiata di una corsa: i numeri messi davanti all'autorizzazione non sono piu' quelli — **la corsa e' SPIEGATA, la prescrizione resta**

- **Trovata:** piano 58-11, task 2, 2026-08-20, rileggendo il catalogo con
  `read_only: true` alle **18:08:54Z** prima di dichiarare bloccato il task 3
- **Il fatto.** `M1` e' stata letta alle **14:52:43Z** e diceva: 2 piani, **46**
  pezzi, **79** impegni, 14 voci di checklist, **5** corse di import. Il catalogo
  alle 18:08:54Z dice: 2 piani, **63** pezzi, **85** impegni, 14 voci di
  checklist, **6** corse di import.
- **La causa, letta dal registro delle corse invece che dedotta.** Esiste una
  sesta riga in `production_import_run`, **`dry_run = false`**, iniziata alle
  **2026-08-20T15:30:23Z** e finita 11 secondi dopo, con `calendar_key` **nullo**
  — cioe' scritta dal **vecchio riconciliatore**, prima che il piano 58-07
  aggiungesse la colonna di scopo alle 16:00. La riga di pezzo piu' recente in
  produzione porta l'orologio di quella corsa. Fra `M1` e oggi, quindi, **una
  scrittura in produzione e' avvenuta**, e non e' quella di questo piano.
- **Cosa NON e' cambiato, ed e' la meta' che decideva.** Spunte: **0**. Legami:
  **0**. Rimisurati nella stessa lettura delle 18:08:54Z. Il rischio che
  l'autorizzazione pesava — *cosa perde una persona se lo specchio cancella* —
  e' identico a quello che le era stato descritto.
- **Perche' va scritto lo stesso.** L'autorizzazione del 2026-08-20 e' stata
  chiesta *«con davanti i numeri di M1»*, e due di quei numeri erano piu' piccoli
  del vero di 17 pezzi e 6 impegni. **L'autorizzazione non e' stata spesa** —
  nessun `--apply` e' partito, per la voce 4 — quindi la correzione arriva
  **prima** dell'atto e non dopo: i numeri veri si rimettono davanti al
  proprietario quando la voce 4 sara' chiusa.
- **Come si chiude:** rileggere i conteggi dal catalogo **il giorno in cui il
  primo specchio parte davvero**, e non riusare `M1`. Una misura d'apertura vale
  fino alla prima scrittura che non l'ha attraversata.

### ⇢ La corsa e' spiegata — dichiarazione del proprietario, 2026-08-20

**Chi ha scritto quella sesta riga: il proprietario, dal proprio Mac, con il
vecchio importatore, mentre questa fase era in esecuzione.** Dichiarato da lui
nella seduta del piano 58-11.

**Cosa questo chiude.** La domanda *«esiste una scrittura in produzione che
nessuno ha autorizzato?»*. La risposta e' **no**: la corsa ha un autore, un
mezzo e una ragione, ed e' coerente con il fatto letto dal registro — chiave di
calendario nulla, perche' quella colonna non esisteva ancora quando la corsa e'
partita. **Non va indagata oltre.**

**Cosa questo NON chiude, ed e' la meta' che conta.** La prescrizione qui sopra
resta **intera**: i conteggi si rileggono dal catalogo **il giorno in cui lo
specchio parte davvero**, e **`M1` non si riusa**. Una misura d'apertura vale
fino alla prima scrittura che non l'ha attraversata — e non importa se quella
scrittura era legittima: una scrittura autorizzata invecchia una misura
esattamente quanto una che non lo era. I numeri veri si rimettono davanti al
proprietario quando la **voce 4** sara' chiusa, insieme alla conseguenza
registrata nella **voce 5**.
