---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
written: 2026-08-20
status: 7 pending su 24 — dal 2026-08-22 P-58-A e P-58-B sono ESEGUITE per intero (passi 8-24) e i sette pendenti sono tutti e soli quelli di P-58-C, che e' un rientro e si esegue se e quando serve. Due dei diciassette Result compilati portano un ritrovamento invece di un passaggio: il passo 10 (la spunta non era piu' viva) e il passo 9 (la cascata raggiunge due tabelle, non una)
closes: ICS-01 (l'ordine di cancellazione, osservato), ICS-03 (le due eccezioni di stato), ICS-03b (D-58-02, l'eccezione di sopravvivenza), e il piano di rientro che D-58-05 punto 3 pretende prima del primo `--apply`
no-longer-closes: ICS-01b (D-58-01) — dal 2026-08-20 NON e' chiuso da questo file. La sua prova e' nel piano 58-09, per mutazione del codice contro un giro a vuoto; cio' che i passi 21-23 smettono di provare e' dichiarato per esteso nel blocco che precede il passo 21 di P-58-B
carries: la forma di `44-PROCEDURES.md` — frontmatter-contratto, regole di lettura, passi numerati con il ruolo, un `Result` pendente per passo
accounts: tre — il ruolo che possiede la chiave di sezione del calendario, il ruolo che possiede la chiave di annuncio, e chi esegue la procedura; ruoli, mai nomi
authorisation: P-58-C **legge soltanto**. P-58-A e P-58-B **SCRIVONO IN PRODUZIONE** e ognuna porta la propria autorizzazione datata, che non copre l'altra e non viaggia con essa
phase_closes: non prima che ogni `Result` qui sotto porti un'osservazione
---

# Fase 58 — Le procedure

> **(a) Ogni `Result` qui sotto dice `pending`, e un Result pendente e' una
> procedura NON ESEGUITA** — mai un verificato-per-ispezione travestito. Una
> tabella di spunte che nessuno si e' guadagnato e' peggio di una tabella vuota,
> perche' chiude una fase.
>
> **(b) Ruoli, mai nomi.** `.planning/` e' tracciato e questo repository e'
> **PUBBLICO**. Una persona qui e' *il ruolo che possiede la chiave di sezione
> del calendario*, *il ruolo che possiede la chiave di annuncio*, *chi esegue la
> procedura*. Mai un nome. E **nessuna sede, nessuna data di serata e nessuna
> line-up compare in questo file**: un passo dice *apri il calendario e leggi la
> prima riga*, mai cosa dice quella riga.
>
> **(c) `ticked_by_name` e' un nome di persona, e non entra qui.** La migration
> del calendario di produzione lo vieta esplicitamente per qualunque cosa stia
> sotto `.planning/` (`production_calendar.sql:706-713`). Dove una procedura
> deve dimostrare che l'autore di una spunta non e' cambiato, **si annota
> l'identificativo, non il nome**, e si scrive *l'autore e' invariato*.
>
> **(d) Nessuna data di serata compare in questo file, e la regola e' quella —
> non il conteggio delle cifre.** Le quattro cifre di un anno compaiono qui solo
> dove dicono **quando qualcuno ha deciso o eseguito qualcosa**, mai *quando si
> suona*: `written:` nel frontmatter; le date delle autorizzazioni, scritte **il
> giorno in cui si spendono**; le date delle decisioni registrate nel documento,
> perche' una decisione senza la sua data e' una decisione che nessuno puo'
> collocare; e — dal 2026-08-22 — **gli istanti dentro i `Result`**, che sono
> l'ora di orologio di un passo eseguito e sono cio' che rende un'osservazione
> confermabile da una seconda persona. Le migration restano nominate **senza il
> loro prefisso numerico**, perche' quel prefisso e' una data e non ha niente da
> collocare.
>
> ⚠ **Questa regola e' stata riscritta due volte, e la seconda per la stessa
> ragione della prima.** Diceva *«l'unica riga con quattro cifre e' `written:`»*
> e il documento non la rispettava piu' dal momento in cui la prima
> autorizzazione e' stata datata; corretta il 2026-08-20, e' diventata *«in tre
> posti soli»* — un **conteggio**, che ha smesso di essere vero il giorno in cui
> i `Result` si sono riempiti di istanti. Riscritta il 2026-08-22 come
> **criterio** invece che come conteggio: un criterio non invecchia quando il
> documento cresce. Una regola che descrive un documento diverso da quello che ha
> sotto e' peggio di nessuna regola, perche' fa credere che qualcuno stia
> controllando.
>
> **(e) Perche' queste tre e non altre.** Tutto il resto di questa fase ha un
> comando. Queste tre sono le cose che **nessun comando di questo repository
> puo' chiudere**, e la ragione e' la stessa per tutte: nessuna apre una
> sessione, e nessuna puo' far morire un processo a meta' per vedere cosa
> succede. Chi le esegue e' l'unico strumento che esista.
>
> **(f) `P-58-C` sta in testa al file, e non e' un ordine di comodo.** E'
> l'unica delle tre che **deve esistere prima che chiunque lanci un `--apply`**.
> Il client Supabase non apre transazioni; non c'e' point-in-time recovery; e con
> il cron di `ICS-10` un processo puo' morire fra la cancellazione e la
> riscrittura **di notte, senza nessuno che guardi** — questo progetto non ha
> error tracking, quindi nessun fallimento raggiunge un essere umano da solo. Chi
> scorre questo file deve incontrare il piano di rientro **prima** delle due
> procedure che scrivono.

---

## Come si legge un passo

- I passi sono numerati e si eseguono **nell'ordine scritto**. La numerazione
  corre continua attraverso le tre procedure: *passo 11* e' univoco nel file.
- Ogni passo nomina **il ruolo con cui viene eseguito**. Dove il ruolo cambia, il
  cambio e' un passo a se', perche' un passo eseguito con l'account sbagliato
  produce un'osservazione sulla domanda sbagliata.
- Ogni passo si chiude con una riga `Result:` che dice `pending`. Va riempita con cio' che
  e' stato **osservato** — un fatto che una seconda persona guardando lo stesso
  schermo potrebbe confermare o smentire. *«Ha funzionato»* non e'
  un'osservazione. *«Il referto ha stampato `plans: 2, pieces: 46` e i conteggi
  riletti dal catalogo dicono gli stessi due numeri»* lo e'.
- Dove un passo dice **se non e' andata cosi', quello e' il ritrovamento**, si
  scrive cosa e' successo invece, testualmente. **Non si riprova finche' passa.**
- **P-58-C non crea e non cancella niente in produzione: legge.** P-58-A e
  P-58-B scrivono, e lo dicono a ogni passo.
- **Il conteggio di controllo non si chiede allo strumento che ha causato
  l'effetto.** Una rimozione fatta sul database si conferma dall'interfaccia; una
  fatta dall'interfaccia si conferma dal catalogo. Una misura presa con lo
  strumento che ha prodotto l'effetto e' un'eco (`ai-engineering.md`, *gate il
  contatore di controllo non legge la superficie che sta muovendo*).

---

# P-58-C — Il ripristino dopo uno specchio interrotto

> **Questa procedura esiste prima delle altre due perche' deve.** Un import che
> muore fra la cancellazione e la riscrittura lascia il calendario **vuoto per
> quella chiave**, e non esiste nessun altro piano di rientro: niente PITR,
> nessuna transazione, e — dal cron di `ICS-10` in poi — nessuno che guardi.
>
> **Precondizione.** Lo specchio e' morto fra la cancellazione e la riscrittura.
> Il segnale e' `failPartway`, oppure un referto che si interrompe dopo la riga
> della cancellazione, oppure una superficie del calendario che mostra meno
> righe di quante il file ne porti.
>
> **Questa procedura non scrive in produzione con le proprie mani.** Rilancia lo
> strumento che ci scrive gia' e legge il catalogo. Non ha bisogno di
> un'autorizzazione propria, e **non ne concede una** a P-58-A o P-58-B.

### Passo 1 — Non rilanciare, e non premere niente

**Come:** chi esegue la procedura.

- **Non rilanciare l'import.** Il primo gesto sbagliato e' un secondo giro
  automatico che cancella cio' che il primo aveva scritto a meta'.
- **Non premere nulla sulla superficie del calendario** — nessuna spunta, nessun
  legame, nessun annuncio. Uno stato umano messo adesso su una riga che sta per
  essere riscritta si perde al passo 4 e non compare in nessuna istantanea.
- Se il cron di `ICS-10` puo' scattare prima che la procedura sia finita,
  **fermarlo o disattivarlo adesso**, e annotare l'ora in cui e' stato fermato.
  Un rientro corso contro un processo automatico e' un rientro che perde.
- Annotare l'ora di orologio.

Result: **ESEGUITO IN LABORATORIO il 2026-08-26**, ora di orologio `01:21:17Z`. Non
rilanciato e non premuto nulla. Nessun cron da fermare: nessuno punta al
laboratorio, e in produzione lo specchio non ha ancora girato. ⚠ **Questo
esercizio e' avvenuto su un laboratorio, non sulla produzione** — vedi il
referto del passo 7 per cosa questo prova e cosa non prova.

### Passo 2 — I conteggi, chiesti al catalogo

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Leggere, **per la chiave di calendario coinvolta**, il numero di righe delle
  tre tabelle specchiate — piani, pezzi, impegni — **piu'** le voci di checklist.
- Leggere anche: quante voci di checklist portano una spunta, e quante righe di
  piano portano un legame con una serata.
- **Il catalogo e' la fonte giusta perche' e' diversa dallo strumento che ha
  causato l'effetto.** L'effetto e' stato prodotto dall'import; la misura si
  prende altrove.
- Registrare i numeri, **mai una riga**. Nessun titolo, nessun identificativo,
  nessuna data.

Result: **ESEGUITO.** Catalogo interrogato con `read_only: true`, chiave `rsnt`:
**piani 0 · pezzi 0 · impegni 0 · voci 0 · spuntate 0 · annullate 0 · legami 0**.
Il calendario e' vuoto per quella chiave, che e' esattamente lo stato che questa
procedura descrive. La riga di registro della corsa interrotta e' **aperta**,
`finished_at` nullo, aperta alle `01:20:53.115Z`. ⚠ **Le spunte contate qui sono
0 perche' sono state cancellate**: cio' che c'era — 1 spunta e 1 annullamento —
esiste ormai solo nell'istantanea, ed e' la ragione per cui l'istantanea esiste.

### Passo 3 — L'istantanea, cercata prima di sperarci

**Come:** chi esegue la procedura.

- Localizzare l'istantanea che l'importatore ha scritto **prima** della
  cancellazione, nella directory ignorata dal repo.
- Verificarne **l'ora rispetto all'ora della corsa interrotta**. Un'istantanea
  piu' vecchia della corsa e' l'istantanea di un altro giro, e ripristinare da
  quella riporta indietro spunte che nel frattempo erano state tolte.
- Verificare che copra **le due eccezioni di stato di `ICS-03`**: le spunte, per
  la chiave stabile `(source_uid, kind, label)`, e i legami, per `source_uid`.
- ⚠ **Se l'istantanea non c'e', o e' della corsa sbagliata, la procedura non
  prosegue oltre il passo 4.** Si va al passo 7 e si scrive il ritrovamento per
  esteso. E' il ritrovamento peggiore che questa procedura possa fare, e va
  scritto — non aggirato con un secondo tentativo.

Result: **ESEGUITO.** Istantanea trovata nella directory che `git check-ignore`
conferma ignorata. Marcatore **`mirror-state-2`**, chiave `rsnt`, istante proprio
`01:20:53.020Z` — **95 millisecondi PRIMA** dell'apertura della corsa interrotta,
quindi e' l'istantanea di quella corsa e non di un giro precedente. Copre
entrambe le eccezioni di `ICS-03`: **2 decisioni** (di cui 1 annullamento) e **0
legami**, ognuna con la chiave stabile `planSourceUid + kind + label` e le tre
colonne di traccia. ⚠ **Ritrovamento positivo:** al primo tentativo del passo 5 e'
stata passata l'istantanea SBAGLIATA — la piu' recente, che era quella del passo
4 — e lo strumento ha **rifiutato** con `snapshot_after_run`, uscita `2`, nulla
scritto. La guardia che questo passo pretende ha funzionato su un errore vero di
chi eseguiva, non su uno simulato.

### Passo 4 — Il secondo giro, con la stessa chiave e la stessa sorgente

**Come:** chi esegue la procedura.

- Rilanciare l'import con **la stessa chiave di calendario** e **la stessa
  sorgente** della corsa interrotta. Una chiave diversa specchia un altro
  calendario e lascia questo vuoto; una sorgente diversa riscrive un contenuto
  diverso da quello che era stato cancellato.
- **Lo specchio e' idempotente per costruzione.** Cancella cio' che sta nello
  scopo e riscrive l'intero contenuto del file: una seconda corsa **completa**
  ripristina tutto cio' che il file porta. Cio' che il file **non** porta non
  torna, e non deve tornare — e' esattamente cosa significa specchio.
- Osservare che la corsa arriva in fondo. Se muore di nuovo nello stesso punto,
  **il problema non e' la corsa**: scriverlo al passo 7 e fermarsi.

Result: **ESEGUITO.** Rilanciato con la stessa chiave e la stessa sorgente:
uscita `0`, **38 passi di scrittura**, `IMPORT_APPLIED_OK`. Ha rimosso 0 righe —
lo scopo era gia' vuoto — e riscritto l'intero contenuto del file. ⚠ **`put back:
0 checklist decision(s)`**: la seconda corsa NON rimette le spunte, perche' la
sua istantanea e' quella di un calendario gia' vuoto. E' il fatto che rende il
passo 5 necessario invece che ridondante, ed e' stato osservato invece che
dedotto.

### Passo 5 — Le spunte e i legami, rimessi senza riattribuirli

**Come:** chi esegue la procedura, dallo script con il client di servizio.

- Ripristinare spunte e legami **dall'istantanea del passo 3**, con il percorso
  di ripristino dedicato.
- ⚠ **Non con `record_checklist_tick`.** Quella funzione **ri-registra
  l'autore a ogni chiamata**, per decisione dichiarata nella migration di accesso
  al calendario di produzione (`production_calendar_access.sql:395-400`).
  Usarla qui attribuirebbe la spunta **a chi ha lanciato l'import** — che e'
  Pitfall 8 della ricerca, e che e' il modo esatto in cui un rientro cancella la
  cosa che stava salvando. **Un ripristino non e' un atto.**
- Il percorso corretto conserva `ticked_by` e `ticked_at` originali, e li
  riscrive per la chiave stabile `(source_uid, kind, label)`, non per `plan_id`
  — che e' un identificativo generato, quindi cambiato.
- I legami si rimettono per `source_uid`.
- **Il referto non stampa il contenuto dell'istantanea**, che e' materiale:
  contiene un nome di persona.

> **⇢ Lo strumento esiste dal 2026-08-22** (riparazione 58-14, voce 3 delle
> differite): `npm run restore:mirror-snapshot -- --from <percorso> --calendar
> <chiave>`, che **e' un giro a vuoto finche' non gli si passa `--apply`**.
> Legge l'istantanea per percorso, ne verifica l'istante contro la riga di
> registro rimasta aperta, e riscrive **solo** le due eccezioni di stato con
> l'attore e l'istante originali, **per chiave primaria**.
>
> **Questo non trasforma il passo in un passo eseguito.** Nessuna corsa di quello
> strumento ha mai rimesso una spunta vera: e' un atto, scrive righe di
> produzione, e pretende un'autorizzazione datata propria che non esiste. Il
> `Result` qui sotto resta pendente per quello, e non per assenza di strumento.
>
> **⚠ Due condizioni che il passo 3 deve verificare prima di arrivare qui.** Lo
> strumento **rifiuta** un'istantanea che non porta il proprio istante — quelle
> scritte prima del 2026-08-22 non ce l'hanno — e **rifiuta** un percorso che git
> non conferma ignorato. Entrambi i rifiuti escono `2`, cioe' *nulla e' stato
> scritto*, con una categoria propria.

Result: **ESEGUITO — e questa e' la prima volta che il rientro rimette davvero una
riga.** Giro a vuoto per primo: istantanea riconosciuta come quella della corsa
(`precede l'apertura di 0 secondi`, finestra ammessa 600), **2 su 2**
identificativi con una riga davanti. Poi `--apply`: **rimesso 2 + 0, con l'attore
e l'istante ORIGINALI, di cui 1 ANNULLAMENTO** · gia' a posto 0 · in conflitto 0
· senza voce davanti 0. Uscita `0`, `RESTORE_APPLIED_OK`. Nessuna riga
dell'istantanea e' stata stampata.

### Passo 6 — La riconferma, dalla stessa fonte del passo 2

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Rileggere **gli stessi conteggi del passo 2**, con la stessa query, per la
  stessa chiave di calendario.
- Confrontarli riga per riga. **Le spunte e i legami devono coincidere con
  quelli del passo 2**; i conteggi delle tre tabelle specchiate devono
  corrispondere a cio' che il file porta, che puo' essere legittimamente diverso
  da prima.
- Se le spunte sono meno di quante ne diceva il passo 2, **la differenza e' il
  ritrovamento**, e va scritta come numero. Non si rilancia il passo 5 sperando
  che si sistemi.
- Riaccendere il cron fermato al passo 1, e annotare l'ora.

Result: **ESEGUITO**, stessa query e stessa fonte del passo 2. **piani 9 · pezzi
47 · impegni 48 · voci 71 · spuntate 1 · annullate 1 · legami 0.** Le spunte e i
legami **coincidono** con quelli che l'istantanea portava; i conteggi delle tre
tabelle corrispondono a cio' che il file porta. **Differenza: zero.** Confronto
campo per campo contro l'istantanea: attore **IDENTICO**, nome **IDENTICO**,
direzione dell'istante **IDENTICA**, su entrambe le decisioni. ⚠ L'istante
ripristinato e' quello **originale**, non l'ora del rientro — che e' la prova
osservabile che il percorso NON passa da `record_checklist_tick` e non
riattribuisce. Nessun cron da riaccendere.

### Passo 7 — Il referto del rientro

**Come:** chi esegue la procedura.

- Scrivere qui, per esteso, **cosa e' stato osservato**: i conteggi del passo 2,
  quelli del passo 6, la differenza fra i due, l'ora della corsa interrotta e
  l'ora dell'istantanea.
- **Se l'istantanea non esisteva, scriverlo qui a lettere intere**, con quante
  spunte e quanti legami il passo 2 diceva che c'erano. Quel numero e' la misura
  di cio' che e' andato perso, ed e' l'unica traccia che ne restera'.
- Numeri e categorie soltanto. Nessun titolo, nessun identificativo grezzo,
  nessuna data di serata.

Result: **ESEGUITO.** Vedi il referto per esteso nella sezione *«Il rientro
esercitato»* qui sotto.

## Il rientro esercitato — referto del passo 7, 2026-08-26

**Dove.** In un **laboratorio**, non in produzione. Progetto Supabase separato,
costruito con `lab-bootstrap.mjs` e misurato con `lab-fidelity.mjs`: **10
cataloghi su 10 identici** alla produzione — 40 tabelle, 482 colonne, 96 policy,
32 funzioni **confrontate per firma**, 260 vincoli, 139 indici, 46 enum, 6
bucket. Il catalogo di configurazione — formati, serie con i loro alias, regole
di pipeline — e' stato copiato dalla produzione in **sola lettura**. Gli spazi in
trattativa non sono stati copiati: non servivano.

**Cosa e' stato osservato, in numeri.**

| | passo 2 (dopo lo schianto) | passo 6 (dopo il rientro) |
|---|---|---|
| piani | 0 | 9 |
| pezzi | 0 | 47 |
| impegni | 0 | 48 |
| voci di checklist | 0 | 71 |
| **spuntate** | **0** | **1** |
| **annullate** | **0** | **1** |
| legami | 0 | 0 |

**Differenza fra cio' che l'istantanea portava e cio' che e' tornato: zero.**
Attore, nome e direzione dell'istante **identici** su entrambe le decisioni,
confrontati campo per campo. L'istante ripristinato e' l'**originale**, non l'ora
del rientro: la prova osservabile che il percorso non passa da
`record_checklist_tick` e non riattribuisce a chi ha lanciato la corsa.

**Le ore.** Corsa interrotta aperta alle `01:20:53.115Z`; istantanea presa alle
`01:20:53.020Z`, cioe' **95 millisecondi prima**. Lo scrittore la prende prima,
per costruzione, e il verso e' l'unica cosa che identifica l'istantanea di quella
corsa — cosa che lo strumento ha dimostrato rifiutando quella sbagliata.

**Come e' stata prodotta la precondizione.** Uno specchio morto fra la
cancellazione e la riscrittura non si aspetta: e' stato **provocato**, iniettando
una interruzione nell'importatore subito dopo la cancellazione. La mutazione e'
stata **asserita applicata sul disco** con lo `sha` prima di lanciarla, e
**ripristinata dai byte salvati** con lo `sha` riconfrontato subito dopo — mai
`git checkout`. Il primo tentativo di mutazione **non era andato a segno**, e
l'assert l'ha preso: leggerne l'esito avrebbe certificato uno schianto che non
era avvenuto.

### ⚠ Cosa questo prova, e cosa NON prova

**Prova** che il percorso di rientro funziona: legge l'istantanea giusta, rifiuta
quella sbagliata, rimette entrambe le direzioni — spunta e annullamento — con
l'attore e l'istante originali, e i conteggi riconfermati da uno strumento
diverso da quello che ha prodotto l'effetto coincidono.

**Non prova** che funzioni contro il catalogo di produzione, che ha una storia di
migration propria, 184 spazi e 85 voci di checklist. La fedelta' misurata e'
quella dello **schema**, non quella dei **dati**.

**Per questo `MIRROR_RESTORE_PATH_VERIFIED` resta `false`.** Metterlo a `true`
disarma `unattendedMirrorGuard`, cioe' rende **piu' facile** far scattare un
percorso che cancella — e `meta-gates.md` dice che una guardia si puo' solo
rendere piu' difficile da far scattare, salvo autorizzazione esplicita
documentata. Un esercizio in laboratorio aggiunge evidenza; non e'
l'autorizzazione. **La decisione di disarmare la guardia resta del proprietario,
e questa sezione e' cio' che gli va messo davanti quando la prendera'.**

---

## La riga che questa procedura sostituisce

Oggi `failPartway` chiude con due righe di consiglio:

> *«Re-run with `--dry-run` first: the reconciler is keyed on the file's own
> UIDs, so a second pass plans only what the first did not finish.»*

**Con lo specchio quelle due righe diventano false.** Descrivevano un
aggiornamento campo per campo, dove «a meta' strada» significava *alcune righe
aggiornate*. Con lo specchio significa **il calendario cancellato e non
riscritto**, e un `--dry-run` che «pianifica solo cio' che il primo giro non ha
finito» pianifica, in quel caso, l'intero calendario — cioe' non dice niente.

Il piano 58-09 sostituira' quelle due righe con un rimando a questa procedura.
**Questa procedura e' quel rimando**, e questa riga e' la dichiarazione che
esiste prima del codice che la citera'.

---

# P-58-A — Una spunta sopravvive a un import

> ## ⚠ QUESTA PROCEDURA SCRIVE IN PRODUZIONE
>
> Mette una spunta su una voce di checklist reale e lancia un import con
> `--apply` su una chiave di calendario reale. L'import **cancella e riscrive**:
> non aggiorna. La cascata dichiarata dalla migration del calendario di
> produzione (`production_calendar.sql:648-661`) porta via le voci di checklist
> **e le loro spunte** insieme al piano.
>
> **Autorizzazione (data): 2026-08-20 — CONCESSA — vale SOLO per P-58-A.**
> Chiesta ed ottenuta dal proprietario nella seduta del piano 58-11, opzione
> **`autorizza-tutte-e-tre`**: le tre scritture sono state presentate una per
> una — **(a)** il primo specchio con `--apply` e il passaggio una tantum sulle
> righe senza chiave, **(b)** questa procedura, **(c)** `P-58-B` — con davanti i
> numeri di `M1` (2 piani, 46 pezzi, 79 impegni, 14 voci di checklist; **zero
> spunte e zero legami**) e il costo dichiarato: **nessun PITR, nessuna
> transazione, cascata su `production_checklist_item`**. Il proprietario ha
> risposto con quei numeri davanti.
> ⚠ **Il cron non e' autorizzato da questa riga** e non lo e' da nessuna delle
> altre due: gira per la prima volta nel piano 58-12.
>
> ⚠ **SPESA il 2026-08-22 alle 20:09:24Z**, e per una scrittura sola: il
> ripristino del passo 15, che rimette la traccia d'autore che il primo `--apply`
> del passo 20 aveva portato via. **Il `--apply` che porta l'evidenza dei passi
> 13 e 14 non e' di questa procedura**: e' quello delle 17:55:07Z dello stesso
> giorno, girato sotto l'autorizzazione della riparazione 58-15. Il paragrafo qui
> sotto descrive lo stato del 2026-08-20 e resta come storia.
>
> ⚠ **NON SPESA, al 2026-08-20 — e questa volta non per la sorgente.** I numeri
> veri (63 pezzi, 85 impegni, e **0 spunte, 0 legami**) sono stati rimessi
> davanti al proprietario prima dell'atto, come questa riga pretendeva, e la
> risposta e' stata *procedi*. La scrittura **(a)** — il primo specchio — e'
> stata **eseguita e spesa** quel giorno. Questa procedura **no**, e la ragione
> e' nel blocco qui sotto: nessuno dei tre conti che possiedono la chiave di
> sezione era disponibile a chi eseguiva.
> Si chiede il giorno in cui si esegue, nominando questa procedura. Un permesso
> a eseguire P-58-B **non copre questa**, e questa non copre quella: sono due
> atti, non un permesso (`ai-engineering.md`, *gate l'autorizzazione a scrivere
> in produzione e' un atto, non un permesso*). Si dichiara qui quando e' stata
> data e, al passo 15, quando e' stata esaurita.
>
> **Il ripristino alla fine e' per CHIAVE PRIMARIA**, dalla lista catturata al
> passo 10, e **mai premendo un controllo su una pagina**. Il verso dell'errore
> e' il punto: un selettore per chiave primaria sbagliato **non trova nulla**;
> un selettore per interfaccia sbagliato **li trova tutti**. Questo repository ha
> gia' pagato quella differenza — due eventi reali e 63 righe in sette tabelle,
> non recuperabili, perche' non c'e' PITR.

### ⚠ Perche' i passi 8-15 ERANO `pending` — misurato il 2026-08-20, superato il 2026-08-22

> **SUPERATO. Questo blocco resta perche' e' la storia di come il blocco si e'
> sciolto, non perche' descriva lo stato: al 2026-08-22 i passi 8-15 sono
> ESEGUITI e i loro `Result` portano un'osservazione.** Si e' sciolto per la
> **strada (1)** delle due che questo blocco stesso metteva sul tavolo — il ruolo
> che possiede la chiave di sezione ha premuto la casella e ha riferito le due
> osservazioni — e **non** per la strada (2): nessuna sessione e' stata coniata
> su un'identita' vera, e la superficie **resta irraggiungibile da chi esegue**,
> rimisurata il 2026-08-22 alle 19:58Z e alle 20:03Z. Cio' che quella strada
> avrebbe sbloccato in piu' — le **seconde letture** dei passi 14, 19 e 24, che
> il contatore di controllo vorrebbe prendere da una superficie invece che da un
> secondo strumento — e' esattamente cio' che quei tre `Result` dichiarano di non
> aver preso.
>
> Questo blocco si legge **senza** conoscere la seduta che l'ha prodotto.
>
> **Cosa e' successo, alla lettera.** Il primo specchio e' stato applicato quel
> giorno, sotto autorizzazione, su due chiavi di calendario, e i conteggi sono
> stati riconfermati dal catalogo. Questa procedura **non e' partita**, e si e'
> fermata al passo 11 — *la spunta, messa dalla superficie*.
>
> **Perche', e non e' un'opinione.** Il passo 11 e' l'unico di P-58-A che non si
> esegue con la Management API: pretende che una casella venga premuta **sulla
> superficie**, da *il ruolo che possiede la chiave di sezione del calendario*.
> Misurato dal catalogo con `read_only: true`: la capacita' che apre quella
> superficie e' tenuta da **due ruoli**, con **un conto ciascuno**, ed entrambi
> quei conti sono di **persone**. Non esiste un conto non umano che la porti.
> Misurato dal browser: la superficie di produzione risponde **`/login`**, quindi
> nessuna sessione aperta esiste su questa macchina.
>
> **Perche' non e' stata aggirata, ed e' la meta' che conta.** L'unico modo per
> arrivare alla superficie sarebbe **coniare una sessione sull'identita' di una
> persona vera**. Questo repository ha gia' scritto, per un altro strumento, cosa
> significa: `scripts/verify-all.mjs` dichiara che un controllo che firma come un
> ruolo reale *«e' un ATTO e ha bisogno dell'autorizzazione datata del
> proprietario per quella seduta — non di una variabile d'ambiente»*. **La stessa
> regola vale qui.** L'autorizzazione del 2026-08-20 nomina **tre scritture**, e
> nessuna delle tre e' una sessione: un'autorizzazione data su una descrizione
> non copre una descrizione diversa, ed e' la stessa frase che ha gia' fatto
> ripresentare quella di P-58-B.
>
> **Cosa NON e' stato fatto**, perche' sarebbe stato peggio del blocco:
> nessuna spunta e' stata scritta dal catalogo attribuendola a una persona che
> non l'ha premuta. Sarebbe una riga d'autore che afferma un gesto mai avvenuto,
> nella colonna che esiste per rispondere a *chi ha deciso questo* — cioe' il
> danno esatto che il passo 14 e' scritto per intercettare, prodotto di
> proposito invece che scoperto.
>
> **Cosa lo sblocca, e sono due strade, non una.** **(1)** Il ruolo che possiede
> la chiave di sezione preme la casella dalla superficie, e chi esegue riprende
> dal passo 12. **(2)** Il proprietario autorizza, con la data e per quella
> seduta, che chi esegue conii una sessione su un'identita' reale — nella forma
> che `npm run verify:refusal` gia' pretende per se'. **Nessuna delle due si
> prende d'iniziativa dentro il piano che le incontra.**

**Cosa chiude.** `ICS-03`, prima eccezione: *la spunta e' una delle due cose che
una persona ha messo li' e che il calendario non sa*. La chiave stabile esiste —
`(production_plan.source_uid, kind, label)` — perche' `source_uid` e' identita'
dichiarata dalla migration (`production_calendar.sql:168-183`). Questa procedura
osserva che quella chiave regge **attraverso una cancellazione**, che e' l'unica
cosa che nessuna lettura di codice puo' dire.

**Perche' il piano di rientro viene prima.** Fra la cancellazione e il
ripristino del passo 5 di `P-58-C` non c'e' transazione. Se questa procedura
muore in mezzo, il rientro e' `P-58-C`, e va letto **prima** di cominciare.

### Passo 8 — L'autorizzazione, scritta prima di toccare qualcosa

**Come:** chi esegue la procedura.

- Scrivere qui l'autorizzazione del proprietario **per questa procedura**, con la
  sua data. Se manca, **fermarsi**: a questo passo non c'e' altro da fare che
  ottenerla.
- Confermare che il deploy sotto prova porta i commit di questa fase — cioe' che
  l'import e' gia' lo specchio e non piu' il riconciliatore. Provare la
  sopravvivenza di una spunta contro il vecchio import non risponde a niente.
- Annotare l'ora di orologio. Una precondizione letta ieri e' un ricordo.

Result: **ESEGUITO il 2026-08-22, alle 20:05:35Z.** L'autorizzazione del 2026-08-20, opzione `autorizza-tutte-e-tre`, e' scritta nel preambolo qui sopra e **nomina questa procedura**. ⚠ **Non e' stata spesa PER INTERO da questa procedura, e va detto invece che arrotondato:** il `--apply` che porta l'evidenza dei passi 13 e 14 e' quello delle **17:55:07Z del 2026-08-22**, girato sotto l'autorizzazione della riparazione 58-15 (*«procedi e basta»*), non sotto questa. Cio' che questa seduta ha eseguito con le proprie mani sono i passi 9, 10, 12, 14 e 15, e l'unica scrittura e' il ripristino del passo 15. **Il deploy sotto prova porta i commit di questa fase**, verificato adesso e non ricordato: l'ultimo commit che tocca l'importatore e il riconciliatore e' `6e2ee19`, l'argomento di riautorizzazione compare **4** volte nell'importatore, e il rifiuto sul progressivo esiste nel catalogo come trigger `production_plan_refuse_renumber`, `BEFORE UPDATE OF number ... FOR EACH ROW`, letto da `pg_trigger` con `read_only: true`. Ora di orologio: **2026-08-22T20:05:35Z**.

### Passo 9 — La cascata, enumerata rileggendo i vincoli

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- **Enumerare la cascata leggendo i vincoli adesso**, da `pg_constraint`: ogni
  tabella raggiungibile dalle tre tabelle specchiate per una chiave esterna
  dichiarata `ON DELETE CASCADE`. **Non copiarla da questo file** e non
  ricordarla: una cascata e' un percorso di scrittura che nessuno ha dichiarato,
  e l'incidente registrato in `ai-engineering.md` e' nato esattamente da
  un'istantanea che copriva cio' che l'agente intendeva toccare e non cio' che la
  cascata avrebbe portato via.
- Prendere l'istantanea **su tutte** le tabelle enumerate, non solo su quelle che
  si intende toccare. L'istantanea va nella directory ignorata dal repo: contiene
  un nome di persona e non puo' entrare in `.planning/`.
- Annotare **quante** tabelle sono risultate raggiungibili. Se il numero e'
  diverso da quello che questa fase si aspetta, **quello e' il ritrovamento** e
  va scritto prima di procedere.

Result: **ESEGUITO il 2026-08-22, alle 20:05:35Z**, rileggendo `pg_constraint` con `read_only: true` invece di copiare l'elenco da questo file. Dalle tre tabelle specchiate sono raggiungibili per `ON DELETE CASCADE` **due** tabelle: le voci di checklist e gli **slot di line-up**. ⚠ **Due e non una, ed e' il ritrovamento che questo passo chiede di scrivere prima di procedere:** la fase si aspettava la sola checklist, e la seconda tabella e' entrata **oggi**, con la migration della line-up applicata alle 17:49:24Z. Il numero e' spiegato e non e' un buco — l'importatore la rimuove **esplicitamente** invece di lasciarla alla cascata, *«cosi' il numero e' uno che qualcuno ha contato invece di un effetto collaterale che nessuno ha visto»* — ma e' **cambiato** da quando questo file e' stato scritto, e questo `Result` e' il posto dove si registra. Le altre chiavi esterne che partono dalle tre tabelle **escono** e non cascano: verso le serie, i format, le sedi e le serate, tutte `NO ACTION`. Istantanea presa su **tutte e cinque** le tabelle enumerate — le tre specchiate piu' le due della cascata — nella directory ignorata dal repo, e `git check-ignore` conferma che lo e'. Il suo contenuto non e' stampato da nessuna parte: una colonna e' il nome di una persona.

### Passo 10 — Gli identificativi, catturati al momento

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Catturare, **prima di qualunque scrittura**: la lista completa degli `id` delle
  voci di checklist della chiave di calendario sotto prova, e lo stato di spunta
  di ognuna.
- Questa lista e' **l'unica** che il ripristino del passo 15 potra' consultare.
  Catturarla dopo la scrittura significa non poter piu' distinguere cio' che
  c'era da cio' che si e' aggiunto.
- Registrare **il conteggio** nel `Result`; gli identificativi restano fuori dal
  repo.

Result: **ESEGUITO il 2026-08-22, alle 20:03:54Z**, con la Management API e `read_only: true`, **prima** di qualunque scrittura di questa seduta. Catturate **85** voci di checklist con il loro stato di spunta: **0 spuntate**, e **1 che porta un autore senza istante**. Gli identificativi restano fuori dal repo; qui c'e' solo il conteggio. ⚠ **Quello 0 e' il ritrovamento del passo, e si scrive qui invece di essere aggirato: la spunta del passo 11 non era piu' viva quando questa seduta e' cominciata.** E' stata **tolta dalla superficie alle 19:49:47.944Z**, dieci minuti prima, e l'annullamento e' un atto registrato per costruzione: la funzione della spunta **ri-registra l'autore in entrambe le direzioni**, quindi la riga resta con l'autore pieno e l'istante vuoto. Conseguenza operativa, dichiarata prima di agire e non scoperta dopo: un `--apply` lanciato oggi avrebbe provato la sopravvivenza di una spunta su una popolazione **zero**, che e' un verde falso **per costruzione** — la stessa forma che il passo 22 vieta a se' stesso. Per questo i passi 13 e 14 riportano la corsa in cui la spunta **era** viva, invece di fabbricarne una nuova.

### Passo 11 — La spunta, messa dalla superficie

**Come:** il ruolo che possiede la chiave di sezione del calendario.

- Aprire la superficie del calendario e una serata che porta almeno una voce di
  checklist. **Non registrare cosa dice quella voce.**
- Spuntare una voce. Osservare: la casella **resta** spuntata, e compare la riga
  d'autore.
- Osservare che la riga d'autore nomina **questo account** e non un altro.
  Registrare l'osservazione come *l'autore e' l'account che ha premuto*, **senza
  scrivere il nome**.

Result: **ESEGUITO dal ruolo che possiede la chiave di sezione del calendario, e riferito a chi esegue il 2026-08-22.** Le due osservazioni sono **sue**, non una lettura del catalogo: **la casella e' rimasta spuntata**, e **e' comparsa una riga d'autore che nominava il proprio account**. Si registra come il passo prescrive — *l'autore e' l'account che ha premuto* — e **il nome non si scrive**. La spunta e' quella premuta il **2026-08-20 alle 21:36:38Z**, su una voce di tipo `piece` di un piano dentro il perimetro della chiave in prova. ⚠ **Corroborazione indipendente dell'ISTANTE, e non della pressione:** l'istantanea che l'importatore ha scritto **prima** della cancellazione, alle 17:55:07.512Z del 2026-08-22, porta un'unica spunta con istante **2026-08-20T21:36:38.7315Z** — lo stesso istante, arrivato per un'altra strada. Il **comportamento della superficie** resta osservabile solo da chi ha premuto: chi esegue non ha una sessione, ed e' misurato ai passi 14 e 19.

### Passo 12 — La spunta, letta dal catalogo

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Leggere `ticked_by` e `ticked_at` di quella voce.
- **Annotare l'identificativo, non il nome.** `ticked_by_name` non entra in
  questo file, in un SUMMARY o in qualunque cosa stia sotto `.planning/`.
- Annotare anche la chiave stabile della voce — `(source_uid, kind, label)` —
  **come fatto di esistenza**, non come valore: *la voce e' identificabile per
  la sua chiave stabile*, senza riportarne il contenuto.

Result: **OSSERVAZIONE DEL 2026-08-22, e la sua fonte va dichiarata perche' non e' quella che il passo prescrive.** La lettura *prima* della corsa e' stata presa dal catalogo con `read_only: true` da chi eseguiva la riparazione 58-15 quel giorno, ed e' registrata nel secondo poscritto del SUMMARY del piano 58-11. ⚠ **Oggi non e' piu' ri-eseguibile:** l'annullamento delle 19:49:47.944Z ha azzerato l'istante, e l'istante originale **non e' piu' nel catalogo**. Cio' che resta ri-derivabile, e che questa seduta ha ri-derivato: l'istantanea pre-cancellazione delle 17:55:07.512Z porta quella voce con il suo istante e il suo attore. **L'attore e' annotato per digest — `7bd93c60` — e mai per nome**, come il contratto (c) di questo file impone. La chiave stabile della voce esiste **come fatto**: la voce e' identificabile per `(source_uid del piano, kind, label)`, dove `kind` e' `piece` e gli altri due sono annotati per digest — `54c26daa` e `e02ad6e5` — e mai per valore.

### Passo 13 — L'import, con `--apply`

**Come:** chi esegue la procedura.

- Lanciare l'import con `--apply` per la chiave di calendario sotto prova.
- Osservare che il referto dichiara **quante righe ha cancellato** e **quante ne
  ha riscritte**, e che dichiara **quante spunte ha riagganciato**.
- Osservare che il referto **non stampa nessun identificativo grezzo** — ne'
  della corsa, ne' delle righe. E' la regola che `ICS-07` stabilisce una volta
  per tutte, e questo passo e' la prima occasione in cui la si vede applicata a
  righe nuove.
- Se la corsa muore, **andare a `P-58-C`** e scrivere qui che ci si e' andati.

Result: **ESEGUITO il 2026-08-22 alle 17:55:07Z — e non da questa seduta:** la corsa e' quella della riparazione 58-15, ed e' l'unica in cui la spunta era viva. Letta **dal catalogo** e non dal referto: la riga del registro delle corse dice `dry_run = false`, chiave in prova, aperta alle **17:55:07.612Z** e **chiusa** alle 17:55:11.406Z, 45 voci lette, **0 non classificate**. La riga e' chiusa, quindi la corsa non e' morta e `P-58-C` non e' stata imboccata. ⚠ **Perche' questa seduta non ne ha lanciata una propria:** al passo 10 la popolazione delle spunte era **0**, e una corsa lanciata oggi non avrebbe avuto niente da riagganciare. I due `--apply` che questa seduta **ha** lanciato sono quelli dei passi 20 e 21, che esercitano lo stesso percorso sull'altra eccezione di stato. ⚠ **E il primo dei due ha prodotto un ritrovamento che riguarda proprio questo passo:** le voci che portano un autore sono passate da **1 a 0**. La traccia dell'annullamento — autore **senza** istante — e' stata portata via dalla rimozione e **non** rimessa dal riaggancio, che raccoglie solo le voci con un istante. La migration dichiara l'annullamento un atto *«in entrambe le direzioni»*; per lo specchio **non e' un'eccezione di stato**. Voce 21 delle differite; rimessa a mano al passo 15.

### Passo 14 — La rilettura, per la chiave stabile

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Rileggere la stessa voce **per la chiave stabile** `(production_plan.source_uid,
  kind, label)` — **non** per `plan_id`, che e' un identificativo generato e che
  la cancellazione ha certamente cambiato.
- Osservare che `ticked_at` e `ticked_by` sono **gli stessi del passo 12**.
- ⚠ **Se `ticked_by` e' diventato l'account che ha lanciato l'import, quello e'
  il ritrovamento**, ed e' Pitfall 8 avvenuto in produzione: il ripristino ha
  usato `record_checklist_tick`. Scriverlo e fermarsi.
- Osservare inoltre che la casella e' ancora spuntata **sulla superficie**, non
  solo nel catalogo: sono due letture e vanno registrate separatamente.

Result: **ESEGUITO il 2026-08-22 alle 20:03Z, e ri-derivato da questa seduta invece che ereditato.** Letto dal catalogo con `read_only: true`: la voce che oggi porta l'autore e' una riga **creata alle 17:55:11.182634Z**, cioe' **dentro** la corsa del passo 13 — e porta **lo stesso attore** dell'istantanea presa *prima* della cancellazione: digest `7bd93c60` da entrambe le parti, che sono due artefatti indipendenti. Stessa `kind` (`piece`), stessa etichetta (digest `e02ad6e5`), stesso `source_uid` di piano (digest `54c26daa`), `sort_order` 0, `due_date` presente. **L'unica cosa cambiata e' l'identificativo della riga**: `b1c21dd3…` nell'istantanea, `e0726300…` nel catalogo dopo — generato, e non sopravvive alla rimozione. E' esattamente cio' che rende il riaggancio **per chiave stabile** l'unica strada, e il motivo per cui questo passo vieta `plan_id`. ⚠ `ticked_by` **non** e' diventato l'account che ha lanciato l'import: e' rimasto quello di chi ha premuto. **Pitfall 8 non e' avvenuto.** ⚠ **La seconda lettura, quella sulla superficie, NON e' stata presa, e questo e' cio' che e' successo invece:** la pagina del calendario di produzione risponde `307 → /login` a una richiesta anonima, misurato alle 20:03Z, e l'unico browser su questa macchina — aperto su quella pagina alle 19:58Z con la propria sessione, non con una coniata — e' atterrato su `/login`. E' la voce 11 delle differite, **rimisurata oggi** e non ricordata. L'istante che questa lettura avrebbe confrontato non e' comunque piu' nel catalogo, per l'annullamento delle 19:49:47.944Z.

### Passo 15 — Il ripristino, per chiave primaria

**Come:** chi esegue la procedura.

- Riportare le voci di checklist allo stato registrato al passo 10, **per le
  chiavi primarie di quella lista**, calcolando la differenza fra la lista di
  allora e quella di adesso. Mai per titolo, mai da un controllo su una pagina,
  mai risalendo il DOM.
- ⚠ Gli `id` sono cambiati: lo specchio ha cancellato e riscritto. Il ripristino
  si fa quindi **per la chiave stabile**, e la lista del passo 10 serve a dire
  **quali** voci vanno riportate a non spuntate — non a indirizzarle.
- Confermare il conteggio **da una fonte diversa da quella su cui si e' agito**:
  se il ripristino e' passato dal catalogo, il controllo si legge dalla
  superficie.
- Dichiarare l'autorizzazione del passo 8 **esaurita**, con l'ora.

Result: **ESEGUITO il 2026-08-22 alle 20:09:24Z.** Lo stato registrato al passo 10 era **0 voci spuntate** e **1 voce che porta un autore senza istante**. Dopo il primo `--apply` di questa seduta il catalogo diceva **0 e 0**: la traccia dell'annullamento era stata portata via, **come dichiarato prima di lanciare**. E' stata **rimessa**, non ri-registrata: istante, attore e nome riscritti con i valori **originali** catturati al passo 10. ⚠ **Mai con `record_checklist_tick`**, che ri-registra l'autore a ogni chiamata e avrebbe attribuito l'annullamento a chi ha lanciato l'import — Pitfall 8 prodotto dal rientro. Il bersaglio e' stato trovato **per la chiave stabile** — `source_uid` del piano piu' `kind` piu' `label` — perche' gli `id` erano cambiati: 1 riga di piano trovata, 1 voce aggiornata, e l'identificativo della voce risulta **CAMBIATO** rispetto a quello del passo 10, che e' la conferma di aver cercato la cosa giusta nel posto giusto. Attore identico per digest (`7bd93c60`). **Conteggio di controllo da uno strumento diverso da quello su cui si e' agito:** si e' scritto con il client di servizio via PostgREST, si e' letto con la Management API e `read_only: true` — voci di checklist **85**, spuntate **0**, con un autore **1**, cioe' esattamente lo stato del passo 10. ⚠ La lettura dalla superficie, che il passo preferirebbe come terza fonte, non e' disponibile: vedi il passo 14. **L'autorizzazione del passo 8 e' ESAURITA alle 20:09:24Z**: questo ripristino e' l'unica scrittura che questa procedura ha fatto con le proprie mani.

---

# P-58-B — Un legame con una serata pubblicata sopravvive a un import

> ## ⚠ QUESTA PROCEDURA SCRIVE IN PRODUZIONE
>
> Crea un legame fra una riga di calendario e una serata reale, mette in piedi
> **una riga sonda che la sorgente vera non ha mai portato**, e lancia due
> import con `--apply` sulla **sorgente vera** — mai su una sua copia alterata.
>
> ⚠ **I passi 21, 22 e 23 sono stati RISCRITTI il 2026-08-20**, per decisione
> del proprietario: strada **(c)** delle tre che `deferred-items.md` voce 5
> metteva sul tavolo. Come erano scritti pretendevano un file di prova
> costruito per l'occasione, e l'argomento che faceva entrare un file e' uscito
> dall'importatore nell'onda 6 (`ICS-09`): l'unica sorgente e' l'indirizzo
> remoto. **Cosa i tre passi smettono di provare e' dichiarato per esteso nel
> blocco che li precede**, e non e' una nota a margine: e' l'osservazione che il
> passo 22 chiamava *la piu' pesante di tutta la procedura*.
>
> **Autorizzazione (data): 2026-08-20 — CONCESSA — vale SOLO per P-58-B.**
> Chiesta ed ottenuta dal proprietario nella seduta del piano 58-11, opzione
> **`autorizza-tutte-e-tre`**, e **nominata separatamente da quella di P-58-A**:
> le tre scritture — **(a)** il primo specchio, **(b)** `P-58-A`, **(c)** questa
> procedura — sono state presentate una per una, con davanti i numeri di `M1`
> (2 piani, 46 pezzi, 79 impegni, 14 voci di checklist; **zero spunte e zero
> legami**) e il costo dichiarato: **nessun PITR, nessuna transazione, cascata su
> `production_checklist_item`**.
> ⚠ **Il cron non e' autorizzato da questa riga**: gira per la prima volta nel
> piano 58-12.
>
> ⚠ **SPESA il 2026-08-22, fra le 20:07:30Z e le 20:09:12Z**, e dichiarata
> **esaurita** al passo 24 con quell'ora. Le scritture che ha coperto sono
> quattro e tutte annotate nei rispettivi `Result`: il legame creato (passo 19),
> i due `--apply` sulla sorgente registrata (passi 20 e 21), la riga sonda
> inserita e poi rimossa per chiave primaria (passi 21 e 24). ⚠ **Lo scarto che
> il paragrafo piu' sotto pretendeva fosse ripresentato lo E' STATO**: che questa
> procedura riscritta *inserisca* una riga sonda invece di cambiarne una
> esistente e' stato dichiarato al proprietario **prima** che desse il via, e la
> risposta e' stata *procedi*. I due paragrafi qui sotto descrivono lo stato del
> 2026-08-20 e restano come storia.
>
> ⚠ **NON SPESA, al 2026-08-20**, e la ragione e' la stessa di P-58-A: non la
> sorgente — quella e' registrata e lo specchio ha girato — ma **la superficie**.
> Vedi il blocco *Perche' i passi 8-15 sono ancora `pending`* dentro P-58-A: si
> applica identico ai passi 19, 21 e 24, che pretendono una lettura o una pressione
> sulla superficie di produzione. Il secondo blocco che questa procedura portava
> — i passi 21, 22 e 23 senza un veicolo — e' stato **sciolto riscrivendoli**
> (voce 5, chiusa per decisione il 2026-08-20). ⚠ **Riscritti non e' eseguiti**:
> i loro `Result` restano `pending`, **tranne il 23**, che e' l'unico passo di
> questa procedura che non tocca ne' la superficie ne' una scrittura, ed e' stato
> **eseguito il 2026-08-20**.
>
> ⚠ **E l'autorizzazione va RIPRESENTATA prima di essere spesa, per due ragioni
> distinte.** La prima: i numeri messi davanti al proprietario erano quelli di
> `M1`, e fra quella misura e oggi **una scrittura in produzione e' avvenuta**
> che non l'ha attraversata (voce 6) — i conteggi si rileggono dal catalogo il
> giorno in cui lo specchio parte, e `M1` non si riusa. La seconda: **la
> riscrittura cambia cosa questa procedura scrive**. Come era, cambiava una
> colonna di una riga che esisteva gia'; come e', **inserisce anche una riga
> sonda** in `production_plan`, che il passo 24 rimuove. E' una scrittura in
> piu' rispetto a quelle descritte quando l'autorizzazione e' stata chiesta, e
> un'autorizzazione data su una descrizione non copre una descrizione diversa —
> e' la stessa regola per cui quella di P-58-A non copre questa.
> E' **un'autorizzazione diversa** da quella di P-58-A e non ne eredita nulla:
> P-58-A mette e toglie una spunta su una voce che esiste gia'; **questa crea un
> legame verso una serata pubblicata** e mette alla prova il rifiuto che
> protegge un progressivo. Il progressivo e' la terza guardia monotona del
> progetto. Si dichiara qui quando l'autorizzazione e' stata data e, al passo 24,
> quando e' stata esaurita.
>
> ⚠ **Nessun passo di questa procedura spende un progressivo nuovo, e nessuno
> annuncia una serata.** Il legame si crea su una serata **gia' esistente**. Se
> per eseguirla servisse annunciare qualcosa, la procedura si ferma: quella e'
> un'autorizzazione diversa ancora.
>
> **La rimozione finale e' per CHIAVE PRIMARIA**, dalla lista del passo 18, e
> mai da un controllo su una pagina.

**Cosa chiude.** `ICS-03` seconda eccezione (il legame **si riaggancia**) e
`ICS-03b` / D-58-02 (una riga di piano con un legame **non se ne va**, ed e'
un'eccezione di **sopravvivenza**, distinta dalle due di **stato**).

**Cosa NON chiude piu', dal 2026-08-20.** `ICS-01b` / D-58-01 — il rifiuto che
sostituisce la guardia del database sul progressivo, perche' uno specchio non fa
mai `UPDATE` e il trigger `BEFORE UPDATE OF number` smette di scattare. Quel
requisito **e' provato altrove** e non da questa procedura: piano 58-09, per
mutazione del codice, uscita `2`, categoria `renumber_refused`, zero scritture,
riautorizzazione registrata nel referto. Quello che questa procedura aggiunge
sono due osservazioni piu' piccole e vere — che la guardia gira **dentro la
corsa che scrive** (passo 22) e che l'argomento di riautorizzazione **non
inventa** una decisione quando non c'e' niente da riautorizzare (passo 23) — e
una che **non aggiunge piu'**, dichiarata nel blocco qui sotto.

### Passo 16 — L'autorizzazione, propria e non ereditata

**Come:** chi esegue la procedura.

- Scrivere qui l'autorizzazione del proprietario **per questa procedura**, con la
  sua data, e confermare per iscritto che **non e' quella di P-58-A**.
- Confermare che il deploy sotto prova porta i commit di questa fase, compreso il
  rifiuto sul progressivo e l'argomento di riautorizzazione.
- Annotare l'ora di orologio.

Result: **ESEGUITO il 2026-08-22, alle 20:05:35Z.** L'autorizzazione e' quella del 2026-08-20, opzione `autorizza-tutte-e-tre`, scritta nel preambolo qui sopra, ed e' **diversa da quella di `P-58-A`**: non ne eredita nulla e non la copre. L'una mette e toglie una spunta su una voce che esiste gia'; questa **crea un legame** verso una serata pubblicata e mette alla prova il rifiuto che protegge un progressivo. ⚠ **Lo scarto che il preambolo pretendeva fosse ripresentato lo E' STATO:** che questa procedura riscritta **INSERISCA una riga sonda** invece di cambiarne una esistente e' stato dichiarato al proprietario **prima** che desse il via alla seduta del 2026-08-22, e la risposta e' stata *procedi*. Si scrive qui invece di darlo per scontato in silenzio: un'autorizzazione data su una descrizione non copre una descrizione diversa, ed e' la stessa regola per cui quella di `P-58-A` non copre questa. ⚠ **Il cron non e' autorizzato da questa riga e non e' stato toccato**: e' il piano 58-12. Deploy sotto prova: come al passo 8 — `6e2ee19` sull'importatore e sul riconciliatore, il rifiuto sul progressivo presente nel catalogo come trigger `BEFORE UPDATE OF number`, l'argomento di riautorizzazione presente **4** volte nell'importatore. Ora di orologio: **2026-08-22T20:05:35Z**.

### Passo 17 — La cascata, enumerata rileggendo i vincoli

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- **Enumerare di nuovo la cascata leggendo i vincoli adesso**, da
  `pg_constraint`. Non riusare l'elenco del passo 9: fra le due esecuzioni puo'
  essere passata una migration, e un elenco copiato e' un elenco che smette di
  essere vero senza dirlo.
- Enumerare **anche** le chiavi esterne che puntano **verso l'esterno** —
  `production_plan.linked_party_id → event_parties(id)`, `NO ACTION` — e
  osservare che cancellare la riga di piano **non tocca la serata**: la lascia
  senza nessuno che la indichi. E' la ragione per cui esiste D-58-02.
- Prendere l'istantanea su **tutte** le tabelle enumerate, nella directory
  ignorata dal repo.

Result: **ESEGUITO il 2026-08-22, alle 20:05:35Z**, rileggendo `pg_constraint` **da capo** e non riusando l'elenco del passo 9 — che pero' e' della stessa seduta, e questo si dichiara invece di lasciarlo dedurre: le due letture distano minuti e non ha potuto passarci una migration in mezzo. **Due** tabelle raggiungibili per `ON DELETE CASCADE`, le stesse del passo 9. **Le chiavi esterne che puntano VERSO L'ESTERNO, enumerate:** dalla riga di piano partono il legame verso la serata, il format, la serie e la sede, e **tutte e quattro sono `NO ACTION`**. Osservazione: cancellare la riga di piano **non tocca la serata** — la lascia senza nessuno che la indichi, ed e' esattamente la ragione per cui esiste D-58-02. Misurato di nuovo al passo 24: rimossa la riga sonda che portava un legame, le serate restano **3**, cioe' il numero del passo 18. Istantanea presa su **tutte e cinque** le tabelle enumerate, nella directory ignorata dal repo — `git check-ignore` lo conferma — con i conteggi **11 · 59 · 60 · 85 · 11**.

### Passo 18 — Gli identificativi, catturati al momento della creazione

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Catturare, **prima di qualunque scrittura**: gli `id` e i `source_uid` delle
  righe di piano della chiave sotto prova, con il valore corrente di
  `linked_party_id` e di `number` per ognuna.
- Catturare l'`id` della serata a cui il legame verra' fatto, e il progressivo
  corrente della sua serie.
- Questa lista e' **l'unica** che il passo 24 potra' consultare.
- Registrare i **conteggi** nel `Result`; gli identificativi restano fuori dal
  repo.

Result: **ESEGUITO il 2026-08-22, alle 20:03:54Z**, con la Management API e `read_only: true`, **prima** di qualunque scrittura. Catturate **11** righe di piano — **9** sotto la chiave in prova, **2** sotto l'altra — con identificativo, identificativo di sorgente, progressivo e legame di ognuna. **Tutte e 11 portano un progressivo; nessuna porta un legame (`0`).** Catturati anche l'identificativo della serata a cui il legame verra' fatto e il progressivo corrente della sua serie: **le serate esistenti sono 3**, tutte nella stessa serie, e **il progressivo massimo di quella serie e' 2**. Gli identificativi restano fuori dal repo: qui ci sono solo i conteggi.

### Passo 19 — Il legame, creato

**Come:** il ruolo che possiede la chiave di annuncio.

- Creare il legame fra **una** riga di piano e **una** serata gia' esistente.
- Annotare gli identificativi delle due righe **nella lista fuori dal repo**, non
  qui.
- Osservare dalla superficie che il legame e' mostrato, e dal catalogo che
  `linked_party_id` e' quello atteso. Due letture, due osservazioni.
- Osservare che **nessun progressivo e' stato speso**: rileggere il progressivo
  della serie e confrontarlo con quello del passo 18. Se e' salito, **fermarsi**:
  questa procedura non doveva spenderlo, e un progressivo non si restituisce.

Result: **ESEGUITO il 2026-08-22 alle 20:07:30Z.** Il legame e' stato creato fra **una** riga di piano sotto la chiave in prova e **una serata gia' esistente** fra le 3 del passo 18 — **per chiave primaria**, con un predicato che pretendeva che il legame fosse ancora vuoto: 1 riga toccata, mai piu' di una, mai per titolo. Gli identificativi delle due righe stanno nella lista fuori dal repo. ⚠ **La riga di piano scelta NON e' quella che porta la traccia d'autore del passo 10**, cosi' che le due osservazioni restino indipendenti. **Dal catalogo**, con `read_only: true`: le righe di piano con un legame passano da **0 a 1**, e il legame e' esattamente quello atteso. ⚠ **La seconda lettura, quella dalla superficie, non e' stata presa, e questo e' cio' che e' successo invece:** la pagina del calendario di produzione risponde `307 → /login` a una richiesta anonima, e l'unico browser disponibile su questa macchina — con la propria sessione, non con una coniata — e' atterrato su `/login` alle 19:58Z. Voce 11 delle differite, rimisurata oggi. **Nessun progressivo e' stato speso:** il massimo della serie era **2** al passo 18 ed e' **2** dopo il legame, e le serate restano **3**. Il progressivo della riga di piano toccata e' rimasto quello di prima, verificato dentro la stessa scrittura.

### Passo 20 — Il primo import, con il file vero

**Come:** chi esegue la procedura.

- Lanciare l'import con `--apply` per la chiave sotto prova, con **il file vero**
  — quello che porta ancora quel `source_uid`.
- Rileggere dal catalogo: `linked_party_id` e' **ancora li'**, sulla riga di
  piano identificata per `source_uid`.
- Osservare che il referto dichiara **quanti legami ha riagganciato**, come
  conteggio.
- ⚠ Se il legame e' sparito, **quello e' il ritrovamento** e la serata e' rimasta
  senza nessuno che la indichi: scriverlo, andare a `P-58-C`, e trattarlo come un
  blocco della fase — non come un'osservazione da annotare e proseguire.

Result: **ESEGUITO il 2026-08-22, dalle 20:07:47Z alle 20:07:52Z**, con `--apply` sulla chiave in prova e sulla **sorgente registrata** — l'unica che l'importatore accetta da `ICS-09`, quindi *il file vero* per costruzione e non per scelta. Uscita **`0`**, **42** passi di scrittura, riga del registro **chiusa**. **Dal catalogo**, con `read_only: true`: il legame e' **ancora li'**, sulla riga di piano identificata per `source_uid` — e **l'identificativo della riga non e' cambiato**, perche' `ICS-03b` l'ha tenuta **fuori** dalla rimozione invece di cancellarla e riscriverla. Il referto **conta** i legami e non li nomina: *«puts back 0 tick(s) and 1 link(s), with their ORIGINAL actor and instant»*, e in fondo *«put back: 0 tick(s) and 1 link(s)»*. Le righe che non entrano affatto nella rimozione passano da **0 a 1**; le sopravvissute a un'ASSENZA restano **0**, che e' corretto — la sorgente porta ancora quella voce. ⚠ **E qui e' avvenuto il ritrovamento dichiarato PRIMA della corsa, non scoperto dopo:** le voci di checklist che portano un autore sono passate da **1 a 0**. La traccia dell'annullamento e' stata portata via dalla rimozione e **non** rimessa dal riaggancio, che raccoglie solo cio' che ha un istante. Rimessa a mano al passo 15, con i valori originali. Voce 21 delle differite.

### ⚠ Cosa i passi 21-23 NON provano piu' — dichiarato il 2026-08-20

> Questo blocco si legge **senza** conoscere la storia che l'ha prodotto, ed e'
> scritto perche' chi arriva qui fra un anno sappia cosa ha in mano e cosa no.
>
> **Cosa resta provato.** `ICS-01b` — il rifiuto di rinumerare — e' provato, e
> lo e' **per mutazione del codice contro un giro a vuoto**: piano 58-09, la
> mutazione confermata prima di leggerne l'esito, uscita `2`, categoria
> `renumber_refused`, *nothing was written*, e la riautorizzazione esplicita
> scritta per esteso nel referto della corsa successiva. E' una prova vera, e
> nessuno la sta ridimensionando.
>
> **Cosa NON e' provato, e non lo sara' da questa procedura.** Che il rifiuto
> arrivi **prima della cancellazione**, in una corsa che **avrebbe cancellato
> davvero**. Un giro a vuoto non cancella niente, quindi non puo' dire in quale
> ordine sarebbero avvenute due cose di cui una non avviene. Era esattamente
> l'osservazione che il passo 22 dichiarava *la piu' pesante di tutta la
> procedura*, e **non c'e' piu'**.
>
> **Perche' non c'e' piu'.** L'unica sorgente dell'importatore e' l'indirizzo
> remoto (`ICS-09`, onda 6): l'argomento che faceva entrare un file costruito
> per l'occasione e' stato tolto, e quella e' una decisione spedita in questa
> stessa fase, non un difetto. Per far tornare una voce gia' nota con un
> progressivo diverso bisognerebbe quindi **cambiare un progressivo su una
> serata vera** — la terza guardia monotona del progetto, quella che questa
> stessa procedura vieta di spendere, e che non si restituisce: un progressivo
> assegnato e' gia' su una locandina. **Spendere la cosa che si sta proteggendo
> per dimostrare che e' protetta non e' una prova: e' il danno.**
>
> **Cosa lo riaprirebbe, e sono due condizioni concrete.**
>
> 1. **Il giorno in cui una rinumerazione la si vuole davvero.** Prima o poi il
>    proprietario decidera' di cambiare un progressivo per una ragione sua. In
>    quel momento la corsa che scrive incontrera' la divergenza **senza che
>    nessuno l'abbia fabbricata**: il rifiuto scattera' sulla strada vera, prima
>    della cancellazione, in una corsa che avrebbe cancellato — e l'osservazione
>    sara' li', a costo zero. **Va colta quel giorno**, annotando il referto
>    prima di passare l'argomento di riautorizzazione, perche' e' l'unica
>    occasione in cui questa prova non costa niente. Chi esegue quella
>    rinumerazione torni qui e riempia il `Result` del passo 22.
> 2. **Un bersaglio che non sia la produzione.** Una copia dello schema fuori
>    dalla produzione, e una sorgente che possa divergere **senza pubblicare
>    nulla**, renderebbero la cancellazione vera su righe che non lo sono. Sono
>    **due** cose, e servono insieme: un bersaglio finto con la sorgente vera non
>    puo' divergere, e una sorgente finta contro la produzione cancellerebbe
>    righe vere. Oggi non esiste ne' l'uno ne' l'altra, e costruirli e' un lavoro
>    dichiarato, non un ripiego di una seduta.
>
> **Due strade sono state guardate e scartate il 2026-08-20**, e si scrivono
> perche' non vengano riproposte come se fossero nuove. **(a)** Una seconda
> chiave di calendario verso un indirizzo di prova: farebbe esistere un
> **secondo calendario pubblicato**, con la stessa esposizione del primo — e un
> link pubblicato e' leggibile da chiunque lo abbia. **(b)** Un argomento di
> sola prova che accetti una sorgente locale e rifiuti `--apply`: non
> eserciterebbe il caso, perche' il caso vive **dentro** un `--apply`.

### Passo 21 — `ICS-03b` — la riga che la sorgente non ha mai portato

**Come:** chi esegue la procedura.

- ⚠ **Non si costruisce nessun file di prova, e la sorgente vera non si tocca.**
  L'assenza che questo passo mette alla prova si crea **dal lato del database**,
  non da quello del calendario: si aggiunge una riga che la sorgente non ha mai
  portato, invece di togliere dalla sorgente una voce che c'e'. L'assenza che ne
  risulta e' **vera** e non simulata — il codice incontra la stessa condizione
  che incontrerebbe se una voce sparisse davvero, e la incontra sullo stesso
  ramo.
- Creare **una** riga sonda nella tabella dei piani, con tre proprieta' che non
  sono di comodo:
  - la **chiave di calendario sotto prova**. Senza, lo specchio non la vede
    nemmeno — legge per chiave — e il passo misurerebbe il vuoto;
  - un identificativo di sorgente che il calendario **non porta e non
    portera'**: un marcatore riconoscibile a colpo d'occhio, mai qualcosa che
    somigli a un identificativo vero;
  - **il progressivo lasciato vuoto**. ⚠ Non e' pigrizia: una riga sonda con un
    numero entrerebbe nella popolazione della guardia del passo 22 e ne
    falserebbe la misura. La colonna e' nullabile apposta, e qui la nullabilita'
    serve.
  Le colonne obbligatorie che restano si riempiono con valori che **si vedono
  essere una sonda**.
- Legare la riga sonda alla **stessa serata gia' esistente** del passo 19.
  Nessun progressivo si spende, nessuna serata si annuncia, e la serata non
  viene toccata: il legame vive sul lato del piano, e la chiave esterna verso
  la serata e' `NO ACTION`.
- ⚠ **Dichiarare l'artefatto invece di nasconderlo.** Finche' la riga sonda
  esiste, **compare sulle superfici di produzione del calendario** come una
  riga in piu'. E' una finestra che si apre qui e si chiude al passo 24, e chi
  altro potrebbe guardare quelle superfici in questa finestra va avvisato
  prima, non dopo.
- Annotare l'identificativo primario e quello di sorgente della riga sonda
  **nella lista fuori dal repo** del passo 18: e' cio' che il passo 24 rimuovera'
  per chiave primaria.
- Lanciare l'import con `--apply` per la chiave sotto prova, **sulla sorgente
  vera** — la stessa del passo 20, invariata.
- Osservare che **la riga sonda c'e' ancora**, letta dal catalogo per
  l'identificativo di sorgente, e che porta ancora il suo legame.
- Osservare che il referto conta **due** numeri distinti: quante righe non
  entrano affatto nella rimozione, e — **di quelle** — quante sono
  *sopravvissute a un'ASSENZA*. Rispetto al referto del passo 20 il primo deve
  essere salito di uno, e il secondo deve essere passato da `0` a `1`. ⚠ Se il
  secondo e' rimasto `0`, la riga sonda non porta la chiave di calendario oppure
  non porta il legame: **quello e' il ritrovamento**, e va scritto invece di
  riprovare.
- Osservare che il referto le **conta** e non le **nomina**: nessun
  identificativo grezzo, nessun titolo.
- ⚠ Se la riga sonda e' sparita, l'eccezione di sopravvivenza non ha retto e una
  serata puo' restare senza nessuno che la indichi: scriverlo, andare a
  `P-58-C`, e trattarlo come un **blocco della fase** — non come
  un'osservazione da annotare proseguendo.

Result: **ESEGUITO il 2026-08-22.** **Riga sonda inserita alle 20:08:20Z**, con le tre proprieta' che il passo pretende, nessuna delle quali di comodo: la **chiave di calendario sotto prova**, senza la quale lo specchio non la vedrebbe nemmeno; un **identificativo di sorgente che il calendario non porta e non portera'**, riconoscibile a colpo d'occhio come una sonda e mai somigliante a un identificativo vero; e **il progressivo lasciato vuoto** — verificato dentro la stessa scrittura — cosi' che non entri nella popolazione della guardia del passo 22 e non ne falsi la misura. Le colonne obbligatorie rimaste sono state riempite con valori che **si vedono** essere una sonda. La sonda e' stata legata alla **stessa serata gia' esistente** del passo 19: nessun progressivo speso, nessuna serata annunciata, la serata non toccata — il legame vive sul lato del piano e la chiave esterna verso la serata e' `NO ACTION`. ⚠ **L'artefatto e' stato dichiarato invece che nascosto:** fra le 20:08:20Z e le 20:09:12Z una riga in piu' compariva sulle superfici di produzione del calendario. La finestra e' durata **52 secondi**, ed e' l'unica persona che tiene una sessione su quelle superfici a poterla aver vista. Identificativo primario e identificativo di sorgente annotati nella lista fuori dal repo. **Import lanciato con `--apply` sulla stessa sorgente invariata del passo 20**, dalle 20:08:26Z alle 20:08:31Z, uscita **`0`**, **43** passi di scrittura. **Dal catalogo**: la riga sonda **c'e' ancora**, cercata per il suo identificativo di sorgente, **con lo stesso identificativo primario** con cui era stata inserita — quindi non riscritta, ma tenuta fuori — e **porta ancora il suo legame**. I due numeri del referto, confrontati con quelli del passo 20: le righe che non entrano nella rimozione **1 → 2**, e — **di quelle** — le sopravvissute a un'ASSENZA **0 → 1**. Il referto le **conta e non le nomina**: la stringa marcatore della sonda non compare da nessuna parte nel testo, e l'unico identificativo stampato e' un **digest** della corsa (`uid#…`).

### Passo 22 — `ICS-01b` — la guardia esercitata dove scrive, e la popolazione su cui gira

**Come:** chi esegue la procedura, con la Management API e `read_only: true` per
la prima meta'.

- ⚠ **Questo passo non fa piu' scattare il rifiuto**, e la ragione sta nel
  blocco che precede il passo 21. Far tornare una voce gia' nota con un
  progressivo diverso significherebbe cambiarlo su una **serata vera**.
- Contare **prima** della corsa, dal catalogo: quante righe di piano della
  chiave sotto prova portano un progressivo **non vuoto**. E' il limite
  superiore della **popolazione** su cui la guardia gira; quella effettiva sono
  quelle di esse che la sorgente porta ancora, e dopo lo specchio del passo 20
  le due coincidono salvo le sopravvissute a un'assenza. Scrivere **entrambi** i
  numeri.
- ⚠ Se la popolazione e' `0`, questo passo **non prova niente**: una guardia
  valutata su un insieme vuoto e' un falso verde per costruzione, ed e'
  esattamente la forma che questo progetto pretende sia distinguibile da un
  passaggio. In quel caso **fermarsi e scriverlo**, invece di riempire il
  `Result` con un esito che nessuno si e' guadagnato.
- Riprendere il referto della corsa del passo 21 — quella con `--apply`, che ha
  cancellato e riscritto **davvero** — e osservare che non porta ne' un rifiuto
  ne' la riga di riautorizzazione, e che si e' chiusa con uscita `0`.
- Scrivere cosa quelle due osservazioni, **insieme**, significano: la guardia ha
  confrontato la popolazione dei progressivi conservati con quelli arrivati
  dalla sorgente **dentro la corsa che scrive**, e li ha trovati tutti uguali.
  Il rifiuto rifiuta la corsa **intera**, quindi una corsa arrivata in fondo e'
  una corsa in cui **nessuno** di quelli divergeva. Il numero della popolazione
  e' cio' che rende questa un'osservazione invece di un *non e' successo
  niente*.
- ⚠ **Cosa questo passo NON osserva piu':** che il rifiuto arrivi **prima** della
  cancellazione in una corsa che avrebbe cancellato davvero. Vedi il blocco che
  precede il passo 21, compreso il giorno in cui quell'osservazione tornera'
  disponibile a costo zero.

Result: **ESEGUITO il 2026-08-22.** **Popolazione, contata dal catalogo PRIMA della corsa del passo 21, con `read_only: true`:** righe di piano sotto la chiave in prova **10**, di cui **9 portano un progressivo non vuoto** — la sonda no, per costruzione. **Nove** e' il limite superiore; la popolazione **effettiva** e' anch'essa **9**, perche' dopo lo specchio del passo 20 la sorgente porta ancora tutte e nove quelle voci: il referto riscrive **8** righe di piano piu' la sopravvissuta di `ICS-03b`, che e' una delle nove. ⚠ **La popolazione non e' `0`**, quindi questo passo non e' un verde falso per costruzione, e i due numeri sono scritti entrambi come il passo pretende. Ripreso il referto della corsa del passo 21 — quella con `--apply`, che ha **cancellato e riscritto davvero** —: **non porta ne' un rifiuto ne' la riga di riautorizzazione**. L'unica occorrenza di *refus* in tutto il testo e' il contatore `0 refused propert(y/ies)`, che e' una conta e non un rifiuto; di *renumber* e di *reauthoris* non ce n'e' **nessuna**. La corsa e' uscita **`0`**. **Cosa le due osservazioni significano insieme:** il rifiuto rifiuta la corsa **intera**, quindi una corsa arrivata in fondo e' una corsa in cui **nessuno** dei nove progressivi conservati divergeva da quello arrivato dalla sorgente — e il confronto e' avvenuto **dentro la corsa che scrive**, non in un giro a vuoto. Il numero **nove** e' cio' che rende questa un'osservazione invece di un *non e' successo niente*. ⚠ **Cosa questo passo NON osserva:** che il rifiuto arrivi **prima** della cancellazione in una corsa che avrebbe cancellato davvero. Vedi il blocco che precede il passo 21.

### Passo 23 — `ICS-01b` — la riautorizzazione, e la prova che NON inventa una decisione

**Come:** chi esegue la procedura.

- ⚠ **Questo passo non scrive niente, e non e' un modo di dire.** Entrambe le
  corse qui sotto sono **a vuoto**, e un giro a vuoto di questo strumento si
  ferma prima di aprire qualunque scrittura: **non tocca le tabelle specchiate e
  non apre nemmeno una riga nel registro delle corse**, e il suo referto lo
  dichiara. Senza una divergenza da riautorizzare l'argomento non ha niente da
  autorizzare, e un `--apply` in piu' sarebbe rischio speso per niente — senza
  transazione e senza PITR.
- Lanciare l'import **senza** `--apply` per la chiave sotto prova, sulla
  sorgente vera, e conservare il referto.
- Rilanciarlo identico, **con l'argomento esplicito di riautorizzazione**, e
  conservare il secondo referto.
- Confrontare i due e osservare che **nessuno dei due porta la riga di
  riautorizzazione** e che i conteggi sono gli stessi.
- ⚠ Se il secondo referto dichiarasse una rinumerazione dove il primo non ne
  dichiara nessuna, **quello e' il ritrovamento**, ed e' grave in un modo
  particolare. Quella riga e' scritta per essere *l'unica traccia che ci sara'*
  di una decisione presa da qualcuno: una traccia che compare **senza la
  decisione sotto** avvelena la sola fonte diagnostica di questo dominio — lo
  stesso registro che ha permesso di datare i timbri falsi confrontandoli con
  l'ora degli import.
- Scrivere nel `Result` **entrambi** i fatti, perche' il secondo senza il primo
  si legge come una prova piu' grande di quella che e': **(i)** l'argomento e'
  inerte quando non c'e' niente da riautorizzare; **(ii)** questo **non** e' la
  prova che la riautorizzazione funzioni. Quella e' altrove, ed e' una prova per
  **mutazione del codice** — piano 58-09, mutazione confermata prima di
  leggerne l'esito, uscita `0`, e la riga di riautorizzazione scritta per esteso
  nel referto.
- ⚠ **Cosa questo passo non fa piu':** riportare indietro un numero. Non c'e'
  nessun numero da riportare indietro, perche' nessuno viene cambiato.

Result: **ESEGUITO il 2026-08-20, dopo il primo specchio.** Due giri a vuoto
sulla stessa chiave e sulla stessa sorgente, il secondo con l'argomento esplicito
di riautorizzazione. **I due referti sono identici byte per byte** — `diff` ha
restituito zero righe di differenza — ed entrambi escono `0`. **(i) L'argomento
e' inerte quando non c'e' niente da riautorizzare:** nessuno dei due referti
porta la riga di riautorizzazione, e una ricerca insensibile alle maiuscole su
entrambi i testi non trova nessuna occorrenza ne' di *riautorizzazione* ne' di
*rinumerazione*. **(ii) Questo NON e' la prova che la riautorizzazione
funzioni** — quella e' altrove, nel piano 58-09, ed e' per mutazione del codice.
Che i due giri non abbiano scritto e' confermato **dal catalogo e non dal
referto**: il registro delle corse contava **8** righe prima dei due lanci e
**8** dopo, di cui **0** a vuoto — cioe' nessuna riga e' stata aperta, come i
referti dichiarano.

> Un'osservazione in piu', non chiesta da questo passo ma disponibile perche' il
> passo l'ha prodotta: il primo dei due referti e' la prova di **idempotenza
> dello specchio**. Dice *cio' che questo calendario gia' tiene: piani 2 · pezzi
> 25 · impegni 55 · voci di checklist 14* e, quattro righe sotto, *riscrive:
> piani 2 · pezzi 25 · impegni 55 · voci di checklist 14*. Gli stessi quattro
> numeri, letti dallo strumento **e** dal catalogo. E la guardia del feed, che
> alla prima corsa non aveva un precedente, ora ne ha uno: *precedenti 45 ·
> in arrivo 45 · soglia 34*.

### Passo 24 — La rimozione, per chiave primaria

**Come:** chi esegue la procedura.

- Rimuovere **solo** cio' che questa procedura ha creato o cambiato, **per le
  chiavi primarie della lista catturata al passo 18** e per `source_uid` dove
  gli identificativi sono stati riscritti dallo specchio. Mai da un controllo su
  una pagina, mai per titolo, mai risalendo da un elemento.
- ⚠ **La riga sonda del passo 21 e' una di quelle**, ed e' l'unica riga che
  questa procedura ha **creato** invece che cambiato: si rimuove per chiave
  primaria, dalla stessa lista. Finche' e' li', compare sulle superfici di
  produzione del calendario. Rileggere dal catalogo che l'identificativo di
  sorgente della sonda non restituisce piu' nessuna riga, e osservare che il
  conteggio delle righe di piano della chiave e' tornato a quello del passo 18.
- Riportare `linked_party_id` al valore registrato al passo 18 — che per la riga
  usata era vuoto.
- Confermare **da una fonte diversa da quella su cui si e' agito**: se si e'
  agito sul catalogo, il conteggio di controllo si legge dalla superficie.
- Rileggere il progressivo della serie e confermare che e' quello del passo 18.
  **Se e' salito, non si riporta indietro**: e' una guardia monotona, si aggiunge
  in coda e non si rinumera. Si scrive che e' salito e perche'.
- Dichiarare l'autorizzazione del passo 16 **esaurita**, con l'ora.

Result: **ESEGUITO il 2026-08-22 alle 20:09:12Z.** Rimosso **solo** cio' che questa procedura ha creato o cambiato. **La riga sonda del passo 21** — l'unica che questa procedura abbia **creato** invece che cambiato — rimossa **per chiave primaria**, dalla lista catturata fuori dal repo: **1 riga**. Mai da un controllo su una pagina, mai per titolo, mai risalendo da un elemento. **Dal catalogo**: l'identificativo di sorgente della sonda **non restituisce piu' nessuna riga** (`0`), e le righe di piano sono tornate a **11** — il numero del passo 18 — di cui **9** sotto la chiave in prova. Il legame riportato al valore registrato al passo 18, che per la riga usata era **vuoto**: 1 riga, per chiave primaria, con il progressivo di quella riga non toccato; le righe con un legame sono tornate a **0**. **Conferma da uno strumento diverso da quello su cui si e' agito:** si e' scritto con il client di servizio via PostgREST e si e' letto con la Management API e `read_only: true` — due credenziali, due percorsi e due endpoint. ⚠ La lettura dalla superficie, che il passo preferirebbe, **non e' disponibile**: vedi il passo 19. **Il progressivo della serie e' quello del passo 18 — `2` — e non e' salito**, e le serate restano **3**: nessuna e' stata annunciata e nessun progressivo speso, quindi non c'e' niente che questa procedura debba dichiarare di non poter riportare indietro. **Conteggi di chiusura, letti alle 20:09:33Z:** piani **11**, pezzi **59**, impegni **60**, voci di checklist **85**, slot di line-up **11** — identici a quelli dell'istantanea del passo 17. Il registro delle corse e' passato da **10 a 12** e **non torna indietro**: non si cancella mai, ed e' la ragione per cui la sua colonna di scopo resta nullabile. **L'autorizzazione del passo 16 e' ESAURITA alle 20:09:12Z.**

---

## Blocco di chiusura

- **Ventiquattro passi, e al 2026-08-22 sette righe `Result:` a `pending`.**
  La numerazione corre continua: P-58-C tiene i passi da 1 a 7, P-58-A da 8 a 15,
  P-58-B da 16 a 24. Un `Result` che dica altro da `pending` significa che
  **quel passo** e' stato eseguito e che l'osservazione e' scritta accanto. I
  sette pendenti sono **tutti e soli** quelli di `P-58-C`, e devono esserlo: e'
  un **rientro**, e un `Result` compilato senza che l'incidente sia avvenuto
  sarebbe una spunta che nessuno si e' guadagnato.
- **Due dei diciassette `Result` compilati portano un RITROVAMENTO invece di un
  passaggio, ed e' il modo giusto di leggerli.** Il passo 10 dice che la spunta
  del passo 11 **non era piu' viva** quando la seduta e' cominciata — tolta dalla
  superficie dieci minuti prima — e che per questo i passi 13 e 14 riportano la
  corsa in cui **era** viva invece di fabbricarne una nuova su una popolazione
  zero. Il passo 9 dice che la cascata raggiunge **due** tabelle e non una,
  perche' una migration del giorno stesso ne ha aggiunta una. Nessuno dei due e'
  stato aggirato riprovando finche' passasse.
- **Tre `Result` dichiarano una lettura CHE NON E' STATA PRESA** — i passi 14, 19
  e 24, dove il contatore di controllo vorrebbe una seconda fonte che sia la
  **superficie**. La superficie risponde `/login` a chi esegue, e l'unica strada
  per aprirla sarebbe coniare una sessione su un'identita' vera, che e' un atto
  con un'autorizzazione propria che nessuno ha dato. In tutti e tre i casi la
  conferma e' stata presa da uno **strumento diverso** — si scrive con il client
  di servizio, si legge con la Management API in sola lettura — e cio' che manca
  e' scritto invece di essere arrotondato.
- **P-58-C non scrive in produzione con le proprie mani.** P-58-A e P-58-B si',
  ognuna sotto la propria autorizzazione, e ognuna rimuove cio' che ha creato per
  chiave primaria.
- **Cosa questo documento non chiude.** Non dice niente su cosa succede quando il
  cron di `ICS-10` gira senza nessuno che guardi — dice solo cosa fare **dopo**.
  Non dice niente sul contenuto di nessuna serata, per costruzione: quel
  contenuto e' esattamente cio' che non puo' viaggiare dentro un file tracciato
  di un repository pubblico.
- **Un `Result` pendente non e' un `Result` superato.** Dove una procedura viene
  rimandata, il VERIFICATION.md della fase deve dire *rimandata*, e deve dire che
  rimandata non e' verificata. La `[x]` su una casella di roadmap e'
  un'affermazione sull'evidenza, e l'evidenza per queste tre sono le righe
  `Result:` qui sopra.

*Fase 58 — le tre procedure. Non contiene nessuna sede, nessuna data di serata,
nessuna line-up e nessun nome di persona. `re:sonate` si scrive con la e
normale.*
