---
status: partial
phase: 43-role-model-account-creation
source: [43-01…43-14 SUMMARY.md, 43-VALIDATION.md]
started: 2026-08-08
updated: 2026-08-08
---

# Fase 43 — le prove da fare a mano

> **A cosa serve questo file.** In questo progetto **non esistono test
> automatici del prodotto**: nessuna macchina puo' dire se una cosa funziona
> davvero. L'unica prova che esistera' e' una persona che guarda uno schermo e
> scrive cosa ha visto. Questo file e' quella lista.
>
> **Come si legge.** Ogni prova dice: **chi** la fa, **cosa serve prima**, i
> **passi** uno per uno, **cosa deve succedere**, e **cosa significa se non
> succede**. Dove serve qualcuno che sappia usare strumenti tecnici, e' scritto
> a lettere piene: **[serve una mano tecnica]**. Quei passi non sono per il
> proprietario.
>
> **Ruoli, mai persone.** Questo repository e' pubblico. Qui non compare nessun
> indirizzo, nessun nome e nessun codice: si scrive *«l'account di prova»*,
> *«il valore configurato»*, *«un account master»*.

---

## Prima di tutto: l'ordine del deploy

**Niente di questa fase e' in produzione oggi.** Sono state scritte cinque
modifiche al database (le *migration*) e sono state committate, ma **nessuna e'
stata applicata**. Il codice nuovo esiste ma non e' deployato.

Quasi tutte le prove qui sotto sono impossibili finche' questo non succede.

### Le sei migration, in quest'ordine esatto

L'ordine **non e' un suggerimento**: sbagliarlo fa fallire l'applicazione nel
momento peggiore, cioe' mentre la si sta facendo.

| # | File | Perche' deve stare qui |
|---|---|---|
| 1 | `20260808000500_staff_role.sql` | crea il quarto ruolo `staff` |
| 2 | `20260808001000_role_implies_approved.sql` | la sua regola **nomina** `staff`: prima del punto 1 non avrebbe senso |
| 3 | `20260808002000_membership_register.sql` | il registro degli atti |
| 4 | `20260808003000_attendances_entry_role.sql` | la colonna che segna com'e' stato un ingresso |
| 5 | `20260808004000_master_reconcile.sql` | la riconciliazione dell'account proprietario |
| 6 | `20260808005000_membership_acts_append_only.sql` | toglie a chi scrive nel registro il potere di riscriverlo |

> **La sesta e' arrivata dopo**, dalla revisione del codice del 2026-08-08
> (finding WR-01): il registro degli atti era modificabile e cancellabile dallo
> stesso client che compie gli atti, e un registro che il suo autore puo'
> cancellare non e' un registro. Va applicata **dopo** la numero 3, che crea la
> tabella su cui agisce. Se non venisse applicata, tutto il resto funziona lo
> stesso — ma la garanzia di tracciabilita' che questa fase esiste per dare
> resterebbe scoperta, e nessun messaggio d'errore lo direbbe.

### Poi il codice — e non prima

**Le migration vanno applicate per prime, il codice dopo. Mai il contrario.**

Il motivo e' misurato, non prudenziale. Il piano 43-12 ha registrato un
accoppiamento duro: **se il codice viene deployato senza la migration numero 5,
ogni singolo login finisce con `master=unavailable` nella barra degli
indirizzi**, per tutti, ogni volta. Nella stessa direzione: senza la migration
numero 3 la pagina del registro mostra il proprio messaggio di lettura fallita,
e ogni approvazione o cambio di ruolo dalla pagina membri fallisce con *«The
write failed»*.

Il verso opposto invece e' sicuro: **le migration applicate con il codice
ancora vecchio non rompono niente.** E' stato verificato percorso per percorso
dal piano 43-06 — tutti e dieci i punti del prodotto che scrivono ruolo o stato
restano compatibili con la nuova regola. Il codice vecchio semplicemente non usa
le cose nuove.

### La prova piu' economica che esista, subito dopo

**[serve una mano tecnica]** Un solo comando:

```
npm run verify:capabilities
```

Oggi questo comando e' **rosso in produzione**, ed e' giusto che lo sia: sta
dicendo che il database di produzione non conosce ancora il quarto ruolo ne' la
nona chiave. **Dopo il deploy deve diventare verde (`5/5 green`). Se resta
rosso, il deploy e' andato a meta'** — e questa e' la maniera piu' rapida e piu'
economica di scoprirlo, prima che lo scopra qualcuno alla porta.

Sullo stesso comando, girato sul database usa e getta di prova
(`npm run verify:capabilities -- --target=container`), il risultato e' **gia'
verde oggi, 5/5**: il modello e' giusto, e' solo non deployato.

---

## Due finestre che si chiudono, e una che si e' gia' chiusa

Alcune di queste prove **non si possono rimandare**, perche' dopo un certo
momento non c'e' piu' niente da guardare. Vanno lette prima di programmare il
lavoro, non dopo.

### 1. Si e' gia' chiusa: la seconda meta' di M-12

`32-HUMAN-UAT.md` porta una prova chiamata **M-12**: un account organizer il cui
accesso non e' mai stato approvato deve poter aprire la pagina dello scanner.

- La meta' che riguarda i **permessi** e' stata chiusa il **2026-08-08**, sul
  database di prova, con esito **PASS**.
- La meta' che riguarda il **browser** — che la pagina si disegni davvero — **non
  e' mai stata osservata**: e' stata *dedotta leggendo il codice*, ed e' scritto
  cosi' nel file di quella fase.
- **Da quando la migration numero 2 e' applicata, quella meta' non e' piu'
  osservabile da nessuno, per sempre**: la regola nuova rende quello stato
  impossibile da creare.

Non e' un lavoro rimasto indietro: e' un lavoro che **non esiste piu'**. Va
saputo, perche' il giorno in cui qualcuno proponesse di togliere il
permesso che tiene aperta la porta agli organizer non approvati, l'unica prova
che quel permesso serve e' la meta' che abbiamo, non quella che manca.

### 2. Si chiude quando il telefono si aggiorna: M-43-11

La prova numero **1** qui sotto vuole leggere il telefono della porta **mentre
ha ancora la versione vecchia dell'app**, con dentro una scansione in coda. Nel
momento in cui quel telefono carica il codice nuovo, **quella lettura non e' piu'
possibile** e non si potra' piu' sapere se l'aggiornamento ha perso qualcosa.

**Quindi la prova 1 si fa prima del deploy del codice, non dopo.**

### 3. Si chiude a ogni serata: le prove alla porta

Le prove 8, 9 e 10 hanno bisogno di **una serata vera con una porta vera**. Non
si possono fare a una scrivania, e chi le fa deve farle **quel giorno, su quel
telefono** — non «ha funzionato l'ultima volta».

---

## Il conto dei conti automatici

**[serve una mano tecnica, tutti]** Sette comandi che si possono rilanciare come
insieme. Non provano che il prodotto funzioni — provano che i file concordano
fra loro e che il database ha la forma dichiarata.

| Comando | Cosa deve dire |
|---|---|
| `npm run build` | `✓ Compiled successfully`. **Dice solo che il codice compila**: non dice che una migration esiste, non dice che un nome di colonna e' giusto |
| `npm run verify:capabilities` | `5/5 green` — **oggi rosso in produzione, verde dopo il deploy** |
| `npm run verify:capabilities -- --target=container` | `5/5 green` — verde gia' oggi |
| `npm run verify:no-header-identity` | zero lettori di header fuori dal middleware |
| `npm run verify:persona` | verde (copre la persona, non il prodotto) |
| `npm run baseline:container -- --seed-only --report` | **12 celle** nella griglia e **sei** scritture vietate rifiutate |
| `grep -rn "role: 'master'" src/` e il ruolo passato per il filo | nessun percorso del prodotto scrive `master` |
| `grep -icE "password" src/emails/account-invitation.tsx` (come valore) | **0** — il messaggio d'invito non contiene nessuna password |

Due di questi comandi **non sono eseguibili in questo momento e la ragione e'
dichiarata**, non aggirata:

- `npm run baseline:rls --target=production` **rifiuta di girare**, per due
  motivi entrambi veri: la tabella del registro non e' applicata, e la griglia
  delle prove ha tre figure che la produzione non sa risolvere. Tornera'
  possibile dopo il deploy.
- `npm run verify:capabilities` senza opzioni **e' prevedibilmente rosso** finche'
  non si deploya, per la stessa ragione.

---

## Una regola che vale per tutte le prove: gli account di prova

Quasi tutte queste prove chiedono di creare un account finto.

**Ogni account di prova va cancellato alla fine, e la cancellazione va
verificata.** Non e' pignoleria: ogni account di questo prodotto nasce con un
**codice di membership**, e quel codice e' **l'unica credenziale della porta**.
La lista che il telefono scarica alla porta non filtra ne' per ruolo ne' per
stato: **un account di prova lasciato in vita entra a una serata vera.**

E c'e' una seconda cosa da sapere, che nessuno indovinerebbe:

> **Cancellare un account di prova NON cancella le sue righe nel registro.**
> Il registro tiene, di proposito, un'etichetta che sopravvive alla persona: e'
> stato costruito cosi' perche' la storia resti leggibile. Quindi ogni account di
> prova lascia **per sempre** qualche riga dentro il registro che questa fase
> esiste per rendere affidabile.

**Conseguenza pratica: usa UN SOLO account di prova per tutto il giro, non uno
per prova.** Il registro guadagnera' una manciata di righe invece di una
cinquantina, e quelle righe si riconoscono a colpo d'occhio come una sessione di
collaudo.

---

## Le prove, nell'ordine in cui si possono davvero fare

Sono **diciotto**, raggruppate in sette sessioni. Fra una sessione e l'altra
ci si puo' fermare senza lasciare niente a meta'.

Undici portano i nomi `M-43-01 … M-43-11` e sono le prove che i requisiti della
fase chiedono. Cinque portano i nomi `W-43-14-A … W-43-14-F` e sono le
camminate sull'interfaccia scritte dal piano 43-14. Una prova — la numero 16 —
e' **la stessa cosa** vista da due piani diversi, e per questo porta due nomi.

Le ultime due, `CR-01/3` e `CR-01/4`, sono arrivate dopo: verificano la
**decisione del proprietario del 2026-08-08** — riammissione e ritiro — nelle
due direzioni, con la conferma che le protegge. **Sostituiscono** due versioni
precedenti dello stesso controllo: la prima verificava due rifiuti poi abrogati,
la seconda li verificava «a mano» perche' il pulsante non esisteva ancora. Ora
il pulsante esiste, e **la sua assenza e' essa stessa un fallimento della
prova**. Una prova in attesa che verifica una regola che non esiste piu' e'
peggio di nessuna prova.

---

## Sessione 1 — il telefono della porta, PRIMA che si aggiorni

### 1. M-43-11 — l'aggiornamento del telefono non deve perdere nessuna scansione

ruolo: chi tiene il telefono alla porta (un account che puo' fare il check-in)
serve prima: le sei migration applicate. **I passi 1 e 2 vanno fatti PRIMA che il telefono carichi il codice nuovo**
serve una mano tecnica: **si**, per leggere i numeri dentro il telefono e per il passo 9
perche' non si puo' rimandare: `.planning/STATE.md` lo dice da mesi — l'aggiornamento del magazzino dentro il telefono va provato **prima della prima serata vera**, perche' se sbaglia distrugge dei dati, e i dati sono ammissioni di persone che hanno pagato

passi:
1. **Il telefono com'e' oggi.** Aprire lo scanner dalla versione attualmente
   online, scegliere una serata di prova, lasciare che la lista dei membri si
   scarichi. **[serve una mano tecnica]** Leggere e **scrivere su un foglio**:
   il numero di versione del magazzino interno (atteso: **3**) e quante righe ci
   sono in ognuno dei tre elenchi (`attendees`, `pendingCheckins`, `members`).
2. **Mettere in coda una scansione con la rete spenta.** Modalita' aereo.
   Scansionare una tessera che sta nella lista, contro la serata di prova. Lo
   schermo deve dare **verde con il nome della persona**. Scrivere il nuovo
   numero di righe in coda: deve essere quello del passo 1 **piu' uno**.
3. **Aggiornare.** Caricare il codice nuovo sullo **stesso** telefono. Se l'app
   e' installata come applicazione, chiuderla e riaprirla finche' non parte la
   versione nuova — altrimenti si sta provando ancora quella vecchia, e la prova
   non vale niente.
4. **L'osservazione che decide.** **[serve una mano tecnica]** Rileggere gli
   stessi numeri. La versione deve essere **4**. Le righe in coda e quelle degli
   ingressi devono essere **esattamente le stesse del passo 2**.
5. **Il segnale.** Fra le impostazioni interne deve essere comparsa una voce
   nuova che dice che la lista dei membri e' piu' vecchia del campo nuovo.
6. **Il ricarico forzato.** Riaprire lo scanner **con la rete**. Dopo il primo
   caricamento della lista, quella voce deve essere **sparita**, e i membri in
   memoria devono portare il proprio ruolo. Scrivere quanti su quanti.
7. **Una scansione nuova, offline, con il marchio.** Modalita' aereo. Scansionare
   la tessera di **un account staff** contro la serata di prova. Verde. La nuova
   riga in coda deve portare il ruolo `staff`.
8. **Lo svuotamento.** Riaccendere la rete, riaprire lo scanner, aspettare che il
   contatore della coda torni a zero.
9. **[serve una mano tecnica]** Sul database, per la serata di prova, contare gli
   ingressi raggruppati per tipo. Devono comparire almeno due gruppi: **`staff`**
   (la scansione del passo 7) e **vuoto** (la scansione del passo 2, messa in coda
   prima che il marchio esistesse).
10. **Il telefono mai aggiornato**, se se ne trova uno che non ha mai avuto la
    versione 3: ripetere dal passo 1. **Se non se ne trova, scriverlo** invece di
    lasciar credere che quel percorso sia stato provato su un telefono vero.

cosa deve succedere: nessuna riga sparisce fra il passo 2 e il passo 4, e la
scansione nuova porta il marchio `staff` mentre quella vecchia non lo porta e non
finge di portarlo.

quando fermarsi: **se anche una sola riga e' sparita al passo 4, fermarsi qui e
segnalarlo.** Una riga persa e' una persona che verra' rifiutata a una porta.

se non succede: al passo 4, righe mancanti significa che l'aggiornamento ha
distrutto la coda — e' il difetto peggiore di tutta la fase. Al passo 6, se la
voce non sparisce, il telefono continuera' a marcare come *sconosciuti* tutti gli
ingressi. Al passo 9, un gruppo vuoto **non significa «erano dei member»**: vedi
il riquadro subito sotto.

> **Il vuoto non vuol dire «member».** Un ingresso senza marchio significa
> *«non si sa»*, e i modi in cui capita sono tre: la riga e' stata scritta prima
> che la colonna esistesse; la scansione era in coda da una versione precedente;
> il telefono non e' riuscito a rinfrescare la lista. **Una serata intera senza
> rete produce legittimamente un blocco di righe senza marchio** — e' la
> degradazione voluta, non un difetto. Chi legge i numeri della serata deve
> saperlo, altrimenti leggera' «erano tutti member» dove c'era scritto «non si
> sa».

cosa e' gia' stato osservato: il piano 43-13 ha esercitato **entrambi** i
percorsi di aggiornamento (dalla versione 3 e dalla versione 2) su un browser
vero con un magazzino vero, e **nessuna riga e' andata persa**: 3 ingressi e 2
scansioni in coda prima, 3 e 2 dopo, versione da 3 a 4. Ha anche letto cosa manda
davvero ogni voce della coda: le due voci vecchie **non** portano il marchio e non
fingono di portarlo, la voce nuova porta `staff`. **Quello che non e' stato
provato** e' proprio quello che questa procedura chiede: un telefono vero,
attraverso il codice deployato, con l'app installata e il suo aggiornamento — e
la riga scritta davvero nel database.

pulizia: nessun account creato.
result: [pending] — la meta' in laboratorio e' PASS (2026-08-08, piano 43-13); la meta' sul telefono non e' mai stata fatta

---

## Sessione 2 — cinque minuti al computer, subito dopo il deploy del codice

### 2. W-43-14-F — i tre avvisi in arrivo sulla dashboard dicono qualcosa

ruolo: un account qualsiasi con una sessione aperta
serve prima: **solo il deploy del codice.** Non servono le migration
serve una mano tecnica: no
perche' e' la prima: costa cinque minuti, non ha precondizioni, e se fallisce si scopre subito che il deploy del codice non e' andato

passi:
1. Nella barra degli indirizzi, aprire la dashboard aggiungendo in fondo
   `?access=unavailable`.
2. Poi la dashboard con `?link=refused`.
3. Poi la dashboard con `?master=` seguito da una parola qualsiasi inventata.
4. Poi la dashboard **senza** aggiungere niente.
5. Poi la dashboard con `?access=unavailable&link=refused` insieme.

cosa deve succedere:
1. un riquadro ambra che dice che il controllo dei permessi non e' riuscito;
2. un riquadro ambra che dice che il link **ha funzionato** ma non poteva
   portare dove diceva, e che conviene farsene mandare un altro invece di
   riusare lo stesso;
3. un riquadro ambra che nomina il controllo sull'account proprietario, con
   **stampata sotto, in carattere da macchina da scrivere, esattamente la parola
   inventata al passo 3**;
4. **nessuno dei tre riquadri.** Questo passo e' quello che conta di piu': un
   avviso che compare sempre e' rumore, e il rumore insegna a non leggere;
5. **tutti e due** i riquadri, uno sopra l'altro, distinti. Nessuno dei due
   sostituisce l'altro.

se non succede: al passo 4, se un riquadro compare comunque, la condizione e'
scritta male e l'avviso perde ogni valore. Al passo 3, se la parola inventata
non compare stampata, l'avviso e' cieco: sara' li' anche il giorno in cui c'e'
un problema vero e non dira' quale.

perche' esiste: prima di questa fase quei tre avvisi **non venivano disegnati
affatto**. La persona veniva rimbalzata, la ragione stava nella barra degli
indirizzi, e lo schermo non diceva niente.

pulizia: nessun account creato.
result: [pending]

---

## Sessione 3 — mezz'ora al computer, dopo le sei migration

Tutta questa sessione si fa da soli, con un browser, senza telefono e senza
posta. **Usare un solo account di prova per tutte e quattro.**

### 3. W-43-14-A — il quarto ruolo si trova, si conta e si concede

ruolo: master
serve prima: le sei migration applicate e il codice deployato
serve una mano tecnica: no

passi:
1. Aprire la pagina dei membri. Guardare in alto.
2. Aprire il menu che filtra per ruolo.
3. Scegliere **Staff**.
4. Cliccare direttamente sulla **cifra** degli staff.
5. Tornare a tutti i ruoli e trovare una riga `member` il cui stato e'
   `approved`.
6. Premere **Make staff**.
7. Sulla stessa riga premere **Remove staff**.

cosa deve succedere:
1. sotto il titolo c'e' un collegamento **Membership acts →**; sopra la tabella
   ci sono **quattro cifre** — totale, organizer, **staff**, in attesa — e sotto
   di esse un paragrafo che spiega che uno staff **non puo' fare niente che un
   member non possa gia' fare**;
2. **quattro** opzioni: Master, Organizer, **Staff**, Member. Se ce ne sono tre,
   questa fase non e' deployata e si puo' fermare qui tutta la sessione;
3. la lista mostra solo righe staff, e il loro numero coincide con la cifra del
   passo 1;
4. imposta lo stesso filtro;
5. due pulsanti: **Make staff** e **Make organizer**;
6. il pulsante mostra la rotellina **finche' la scrittura non e' finita** — non
   un lampo — poi la riga si ricarica con l'etichetta `staff`, **grigia come
   `member` ma con il bordo tratteggiato**, e la cifra degli staff e' salita di
   uno;
7. torna `member`, la cifra scende di uno, e **lo stato resta `approved`**:
   togliere lo staff non ritira un'approvazione.

se non succede: al passo 2, tre opzioni significa deploy incompleto. Al passo 6,
un lampo invece della rotellina significa che il pulsante si riabilita mentre la
scrittura e' ancora in volo — invito al doppio clic su un atto gia' in corso. Al
passo 7, se lo stato diventa `pending` o `rejected`, ruolo e approvazione sono
stati confusi: sono due assi diversi e questa e' la conferma che restano tali.

perche' il colore e' grigio: e' una decisione, non una svista. E' stato misurato
cella per cella su 21 tabelle e 3 operazioni che **`staff` non raggiunge niente
che `member` non raggiunga gia'**. Un colore da «ruolo potente» sarebbe una
bugia che l'interfaccia racconta prima che qualcuno legga una parola. Il bordo
tratteggiato serve a **trovarlo**, non a promettere potere.

pulizia: se e' stato usato un account di prova, cancellarlo alla fine della
sessione e verificare che sparisca dalla lista.
result: [pending]

### 4. M-43-08 — cinque atti, un registro

ruolo: master
serve prima: le sei migration applicate e il codice deployato
serve una mano tecnica: no
perche' esiste: nessuno strumento di questo progetto puo' vedere questa cosa. Gli
strumenti sanno dire **chi ha il diritto di scrivere** nel registro; non sanno
dire **se un atto e' stato davvero registrato**. E' scritto in
`43-VALIDATION.md` che questo e' il rischio vero del requisito

passi: compiere in fila, sull'account di prova, cinque atti diversi —
**approvare**, **rifiutare**, **promuovere**, **disattivare**, **riattivare** —
e poi aprire la pagina **Membership acts**.

cosa deve succedere: cinque righe, in cima, la piu' recente per prima. Ognuna
con **chi** l'ha compiuta e **quando**. Non quattro, non sei.

se non succede: se un atto e' andato a buon fine sullo schermo ma **manca** dal
registro, il registro non e' una traccia affidabile — ed e' esattamente la cosa
che l'intera fase esiste per costruire. Se compaiono righe in piu' rispetto agli
atti compiuti, qualcosa sta scrivendo due volte.

quando fermarsi: se anche un solo atto manca, fermarsi e segnalarlo prima di
compiere altri atti: continuare rende piu' difficile capire quale percorso non
scrive.

una cosa da sapere: `rifiutato` e `disattivato` scrivono la stessa cosa sul
profilo ma restano **due atti diversi** nel registro. Uno rifiuta una domanda,
l'altro ritira un accesso gia' concesso, e il registro e' l'unico posto dove
quella differenza sopravvive.

e una seconda, dal 2026-08-08: **il nome dell'atto non viene dal pulsante che hai
premuto, viene dalla transizione che hai compiuto.** Quindi in questa prova, se
si segue l'ordine indicato — approvare (da `pending`), rifiutare (da `approved`),
promuovere, disattivare, riattivare — il registro non scrive necessariamente il
nome del pulsante: **rifiutare un account gia' approvato si registra come
`deactivated`**, non come `rejected`. Le cinque righe restano cinque; e' il
secondo nome a essere diverso da quello che ci si aspetterebbe, ed e' corretto
cosi'. Se invece si vuole vedere un `rejected` vero, bisogna rifiutare un account
che e' ancora `pending`.

pulizia: l'account di prova va cancellato a fine sessione. Le sue righe nel
registro **restano**, per progetto.
result: [pending]

### 5. W-43-14-D — il registro si legge, e dice chi

ruolo: master
serve prima: le sei migration applicate. Da fare **subito dopo** la prova 4, cosi' le righe da guardare ci sono gia'
serve una mano tecnica: no

passi:
1. Dalla pagina dei membri, premere **Membership acts →**.
2. Leggere il titolo e scorrere tutta la pagina.
3. Guardare le righe prodotte dalla prova 4.
4. Cercare, in tutta la pagina, un indirizzo di posta.
5. Guardare i bordi delle righe.
6. Se esiste una riga scritta dalla riconciliazione automatica, guardare la
   colonna dell'autore.
7. Se il registro fosse vuoto, guardare cosa dice la pagina.

cosa deve succedere:
1. si arriva alla pagina;
2. il titolo e' **Membership acts**. **In nessun punto della pagina devono
   comparire le parole «soci», «libro soci» o «membership book»**;
3. gli atti della prova 4, dal piu' recente, ognuno con: l'atto in parole, il
   **codice di membership** del soggetto, il nome accanto, il passaggio di ruolo
   (`member → staff`), l'autore e l'ora;
4. **nessun indirizzo, da nessuna parte**;
5. gli atti che **fanno entrare** qualcuno — creato, approvato, riattivato —
   hanno il bordo rosa dell'accento. Gli altri no;
6. **By Automatic reconciliation**, con la frase che spiega che nessuna persona
   l'ha compiuto. **Una casella autore vuota e' un difetto e va segnalata**;
7. *«No acts recorded yet»* piu' la frase che spiega che una lettura fallita si
   dichiara in rosso.

se non succede: al passo 2, la parola «soci» deciderebbe **per via di un titolo**
una domanda giuridica che e' stata lasciata deliberatamente aperta: questo e' un
registro di **atti compiuti nel prodotto**, non il libro soci di
un'associazione, e confondere le due cose aggiunge un obbligo di legge, non una
colonna. Al passo 6, un autore vuoto sarebbe indistinguibile da un atto senza
autore — che e' proprio la cosa che il registro esiste per rendere impossibile.
Al passo 7, se la pagina mostra un **riquadro rosso**, la lettura e' fallita: una
lista vuota e una lista illeggibile significano cose opposte, e **una lista
vuota per errore si legge come «stagione tranquilla»**.

nota: finche' la migration numero 3 non e' applicata, questa pagina mostra il suo
messaggio di lettura fallita. E' vero, e' visibile, e non e' un difetto: e' il
deploy a farla funzionare.

pulizia: nessun account creato qui.
result: [pending]

### 6. W-43-14-C — un'operazione su piu' persone dice **quale** ha fallito

ruolo: master
serve prima: le sei migration applicate e almeno tre richieste in attesa
serve una mano tecnica: no

passi:
1. Aprire la scheda delle richieste in attesa, selezionare almeno tre righe,
   premere **Approve selected**.
2. Guardare cosa compare.
3. Guardare il nome con cui viene chiamato un eventuale soggetto rifiutato.

cosa deve succedere:
- se va tutto bene: una riga sola, *«Approve: 3 of 3 recorded»*, e la selezione
  si svuota;
- se qualcuna fallisce: **tutti e due i numeri** — quante sono andate e quante
  no — **piu' un riquadro per ogni soggetto rifiutato, con il suo nome** e la
  frase della sua causa. **I rifiutati restano selezionati**, cosi' il secondo
  tentativo e' un clic e non una caccia nella lista;
- il soggetto e' chiamato per **nome**, **mai con il codice di membership**.

se non succede: il difetto che questa prova cerca e' quello vecchio, ed era
subdolo — il numero mostrato era **il numero delle righe selezionate**, non
quante ne erano andate a buon fine. Non sembrava un errore: sembrava una
ricevuta. Se il numero coincide sempre con quante ne hai selezionate anche
quando qualcosa e' andato storto, il difetto e' tornato.

perche' il codice non deve comparire: il codice di membership e' **l'unica
credenziale della porta**, e un rapporto di questo tipo e' esattamente il genere
di cosa che finisce in uno screenshot.

pulizia: nessun account creato qui.
result: [pending]

---

## Sessione 4 — la posta e la password

Questa sessione ha bisogno di **una casella di posta che si controlla**. Basta
mezz'ora, e produce l'account di prova che le sessioni 5 e 6 riusano.

### 7. M-43-03 — il link della mail imposta davvero una password

ruolo: master (per creare), poi la persona che riceve il messaggio
serve prima: le sei migration applicate e il codice deployato. **Da fare sul sito vero, non su un computer di sviluppo**: le due cose si comportano diversamente proprio sul punto che conta
serve una mano tecnica: **solo per il passo 7**
perche' esiste: prima di questa fase quel link **non aveva un posto dove
atterrare**. Portava a una dashboard che non ha nessun campo per la password, e
il pulsante «Reset Password» rimandava allo stesso posto: un giro chiuso

passi:
1. Dalla pagina dei membri, aprire **Create an account**. Mettere un indirizzo di
   prova che **si controlla davvero**, un nome, ruolo `member`. Premere **Create
   and invite**.
2. **Scrivere il codice di membership** che compare nel pannello verde: serve
   nelle sessioni successive.
3. Aprire il messaggio arrivato. **Prima di tutto: verificare che non contenga
   nessuna password, nessun codice temporaneo, nessun indirizzo di una sede.**
4. Premere il pulsante per impostare la password.
5. Sulla pagina che si apre, mettere una password nuova due volte e confermare.
6. Uscire, e rientrare con la password appena impostata.
7. **[serve una mano tecnica]** Nella barra degli indirizzi, sostituire tutto
   quello che segue il nome del sito con l'indirizzo del callback seguito da
   `?next=` e da un sito esterno qualsiasi, e premere invio.

cosa deve succedere:
1. un pannello **verde** che dice che l'account e' stato creato come `member`,
   approvato e invitato, con il codice di membership in carattere da macchina da
   scrivere;
3. il messaggio e' **in italiano** e dice che l'ingresso e' gia' attivo, anche
   prima di aver impostato la password;
4. si arriva su una pagina intitolata **Set your password**, con **due campi**;
5. un pannello verde che dice che la password e' impostata, con un pulsante
   verso la dashboard;
6. funziona;
7. **si resta su questo sito**, si atterra sulla dashboard, e in fondo
   all'indirizzo compare `link=refused` — con il riquadro della prova 2 che lo
   spiega.

se non succede:
- al passo 3, **se compare una password nel messaggio, fermare tutto e
  segnalarlo**: una password mandata per mail resta in quella casella per
  sempre. E' il requisito centrale di questa parte della fase;
- al passo 4, se si arriva alla dashboard invece che alla pagina della password,
  il link non ha portato dove doveva — e in quel caso il pannello del passo 1
  **avrebbe dovuto** rifiutarsi di inviare il messaggio, quindi c'e' una
  contraddizione da segnalare, non solo un link storto;
- **al passo 7, se si finisce sul sito esterno, e' un difetto grave.** Quel
  percorso porta una sessione appena creata: chi lo sfrutta manda le persone che
  hanno piu' accesso su un sito che non e' nostro, con un link che si aspettavano
  di ricevere.

cosa e' gia' stato chiuso: il piano 43-04 ha **letto** la configurazione dei
redirect ammessi e ha verificato che ogni indirizzo del sito vero li ammetta
entrambi: **non serve cambiare niente prima**. E il piano 43-11 ha **eseguito**
il confronto che rifiuta l'invio se il link puntasse altrove — undici casi, i
cinque cosmetici passano e i sei veri vengono rifiutati. **Quello che non e' mai
stato fatto e' esattamente questa procedura**: nessuno ha seguito un link vero
da una casella vera.

pulizia: **non ancora** — questo account serve alle sessioni 5 e 6. Va cancellato
alla fine di tutto, verificando che sparisca dalla lista membri.
result: [pending]

---

## Sessione 5 — alla porta, a una serata vera

Queste tre si fanno con **un telefono e una serata aperta**. Si possono fare in
fila, la stessa sera. Usano l'account di prova della sessione 4.

### 8. M-43-01 — un account nuovo entra prima ancora di aver fatto il primo accesso

ruolo: master (per creare), poi chi tiene il telefono
serve prima: le sei migration applicate, il codice deployato, una serata aperta, il telefono **con la rete**
serve una mano tecnica: no
perche' e' importante: e' la promessa che il messaggio d'invito fa — *«sei tra i
membri in lista all'entrata da subito, anche prima di impostare la password»*.
Nessuno strumento automatico puo' verificarla

passi:
1. Creare un account di prova nuovo (o riusare quello della sessione 4 **se non
   ha ancora mai fatto accesso**).
2. Verificare nella tabella che la riga esista, con stato `approved` e ruolo
   `member`.
3. **Senza aprire il messaggio e senza fare accesso**, dallo scanner **con la
   rete attiva**, scansionare o digitare quel codice di membership contro la
   serata aperta.

cosa deve succedere: l'ingresso viene registrato, e sullo schermo compare il
nome della persona.

se non succede: se viene rifiutato, la promessa scritta nel messaggio d'invito e'
falsa, e le persone si presenteranno a una porta con un invito in mano e
verranno respinte. Va segnalato subito.

pulizia: se e' stato creato un account nuovo, cancellarlo a fine serata e
verificare che sparisca dalla lista.
result: [pending]

### 9. M-43-02 — lo stesso, con la rete spenta, nei due ordini

ruolo: chi tiene il telefono alla porta
serve prima: come la prova 8
serve una mano tecnica: no
perche' ci sono due ordini: e' l'unico modo di distinguere un difetto da un
limite

passi:
- **Ordine A:** creare l'account **prima**, poi far scaricare la lista al
  telefono, **poi** mettere il telefono in modalita' aereo, poi scansionare.
- **Ordine B:** far scaricare la lista, mettere il telefono in modalita' aereo,
  **poi** creare l'account, poi scansionare.

cosa deve succedere:
- **Ordine A: ammesso.**
- **Ordine B: rifiutato**, con un messaggio che dice che la persona non e' nella
  lista su questo dispositivo e che conviene farla entrare dall'elenco invece di
  riscansionare.

> **L'ordine B che rifiuta NON e' un difetto: e' il limite onesto di una porta
> senza rete, ed e' previsto.** Un telefono che ha gia' scaricato la sua lista e
> ha perso la rete **non puo' sapere** di un account creato dopo. E non puo'
> fidarsi di un codice sconosciuto: un codice di membership non porta una firma,
> quindi ammettere alla cieca uno sconosciuto aprirebbe un buco senza limiti
> invece di uno limitato.
>
> **La risposta operativa, che va conosciuta prima della serata e non durante:**
> far entrare la persona **dall'elenco**, invece di riscansionare.
>
> **E la regola che lo previene:** gli account staff si creano **prima della
> serata, non durante.** La frase e' scritta fissa accanto al campo del ruolo
> nella schermata di creazione, proprio per questo.

se non succede: se l'ordine **A** viene rifiutato, c'e' un difetto vero e va
segnalato. Se l'ordine **B** venisse **ammesso**, sarebbe peggio: significherebbe
che il telefono ammette codici che non conosce.

pulizia: come la prova 8.
result: [pending]

### 10. M-43-10 — un ingresso staff si vede nei numeri della serata, e si capisce

ruolo: chi tiene il telefono, poi il master che legge i numeri
serve prima: le sei migration applicate, il codice deployato, una serata vera, un account con ruolo `staff`
serve una mano tecnica: **si, per il primo passo**
perche' esiste: un conteggio **non e' una prova di leggibilita'**. La domanda non
e' «esiste la riga» ma «si riesce a rispondere alla domanda». Per questo
l'osservazione e' la **risposta**, non la riga

passi:
1. **[serve una mano tecnica] — e va fatto UNA VOLTA SOLA, subito dopo aver
   applicato la migration numero 4.** Contare quanti ingressi gia' esistenti
   restano senza marchio, e **scrivere quel numero accanto alla frase che dice
   cosa significa**: *«sono le presenze registrate prima che la colonna
   esistesse, non delle persone che erano member»*. Se questo numero non viene
   preso adesso, dopo non si distinguera' piu' dai vuoti nuovi.
2. Scansionare la tessera di un account **staff** a una serata vera.
3. Dalla superficie che mostra i numeri della serata, **rispondere a questa
   domanda: quanti degli ingressi di stasera erano ingressi staff gratuiti?**

cosa deve succedere: al passo 3 si riesce a **dare la risposta**, e il numero
comprende la scansione del passo 2.

se non succede: se la risposta non si riesce a dare, il requisito non e'
soddisfatto anche se la riga nel database e' giusta. Il senso di questo requisito
e' rendere **leggibile** il costo in posti di un ingresso gratuito permanente: se
non si legge, il costo resta invisibile e la serata sembra piu' piena di quanto
sia.

due cose gia' misurate: l'ingresso staff era **gia' contato** prima di questa
fase — l'inserimento non ha mai avuto un ramo sul ruolo. Questa fase non ha
cambiato **chi entra**: ha aggiunto **un campo per riga**. E' scritto nel codice
della lista che il filtro d'ingresso e' rimasto identico: chi era nella lista
prima c'e' anche dopo.

pulizia: nessun account creato se si usa uno staff esistente.
result: [pending] — due criteri dichiarati **non misurati** dal piano 43-10: il conteggio dei vuoti preesistenti in produzione, e una scansione vera attraverso il codice deployato

---

## Sessione 6 — quelle che chiedono una mano tecnica

**Nessuna di queste e' per il proprietario da solo.** Chiedono gli strumenti per
sviluppatori del browser, il pannello di configurazione del sito, o una lettura
diretta del database. Vanno fatte da chi sa farle, con il proprietario che legge
il risultato.

### 11. M-43-04 — un rifiuto del database dice una frase sua, non «qualcosa e' andato storto»

ruolo: master, sul sito deployato
serve prima: le sei migration applicate
serve una mano tecnica: **si**
perche' il computer di sviluppo non basta: e' il punto centrale. Su un computer
di sviluppo i messaggi di errore arrivano interi; **sul sito vero vengono
oscurati**. Quindi una prova fatta in sviluppo non dice assolutamente niente su
cosa vedra' una persona in produzione

passi: provocare una scrittura che la regola del database rifiuta — un ruolo di
staff su un account non approvato — e **guardare la frase che compare sullo
schermo**.

cosa deve succedere: compare una frase che dice, in sostanza, *«questo account
tiene un ruolo di staff, e un ruolo di staff dev'essere approvato — la scrittura
e' stata rifiutata dal database, non da questa schermata»*.

se non succede: se compare una frase generica, o se **non compare niente**, il
giorno in cui la regola scatta davvero sara' il giorno in cui qualcuno non
capira' perche'. E il caso peggiore non e' la frase sbagliata: e' **il nulla**,
perche' il nulla si legge come un successo.

un limite dichiarato, e va detto: la categoria del fallimento e' decisa da un
**codice** che il database restituisce, mai da un testo. Per un codice — quello
delle violazioni di regola — questo e' stato **misurato**. Per un secondo codice
— quello del soggetto inesistente — **e' un'assunzione, non una misura**: se non
regge, il fallimento resta comunque visibile e distinguibile da un successo, ma
**la frase mostrata sarebbe quella sbagliata**. Questa procedura e' l'unico modo
di saperlo.

pulizia: nessun account creato, se si usa quello di prova esistente.
result: [pending]

### 12. W-43-14-B — ogni rifiuto ha la **sua** frase

ruolo: master, sul sito deployato (**non** su un computer di sviluppo, per la ragione della prova 11)
serve prima: le sei migration applicate
serve una mano tecnica: **si, dal passo 3**

passi:
1. Trovare la propria riga nella tabella dei membri.
2. Trovare la riga di un account master, da un'altra sessione master.
3. **[serve una mano tecnica]** Rieseguire una richiesta di cambio ruolo
   puntandola **all'account master**.
4. **[serve una mano tecnica]** Rieseguire la stessa richiesta chiedendo il ruolo
   `master`.
5. Su una riga `staff`, premere **Make organizer** due volte di fila, in fretta.

cosa deve succedere:
1. la cella delle azioni mostra `--`. E' un caso **nascosto dall'interfaccia**,
   non un rifiuto;
2. `--` di nuovo. **Nascondere non e' rifiutare**: il rifiuto vero e' al passo 3;
3. un riquadro ambra che dice che il ruolo del master non si cambia da qui, da
   nessuno, e sotto, in carattere da macchina da scrivere, `subject_is_master`;
4. *«That role cannot be granted from here»* con `role_not_writable`;
5. la seconda volta *«This account already holds that role»* con
   `role_unchanged`, e **nessuna riga nuova nel registro** per il secondo clic.

se non succede: **se ai passi 3 o 4 compare una frase generica, o non compare
niente, questa parte della fase non regge e va segnalata.** Il punto e'
esattamente questo: l'interfaccia **nasconde** quei pulsanti, ma nascondere non
protegge — la richiesta si puo' costruire a mano. Il rifiuto deve venire dal
server. Al passo 5, se compare una riga nuova nel registro per il secondo clic,
il registro sta scrivendo un cambiamento che non e' avvenuto.

pulizia: nessun account creato.
result: [pending]

### 13. M-43-07 — un organizer non arriva a `master`

ruolo: **organizer** (serve una sessione con quel ruolo)
serve prima: le sei migration applicate e il codice deployato
serve una mano tecnica: **si, dal passo 3**
perche' esiste: e' il soffitto della fase. Un organizer puo' promuovere — e'
voluto, altrimenti una persona sola diventa il collo di bottiglia della propria
community — ma **non deve poter arrivare in cima**, perche' quello sarebbe un
potere che si auto-replica

passi:
1. Con una sessione **organizer**, aprire il form di creazione account e
   guardare il menu del ruolo.
2. Creare un account di prova come `organizer`.
3. **[serve una mano tecnica]** Rieseguire la stessa richiesta sostituendo il
   ruolo con `master`.
4. **[serve una mano tecnica]** Stessa prova su un **cambio** di ruolo dalla
   tabella membri, verso `master`.

cosa deve succedere:
1. il menu offre **Member, Staff, Organizer** e **non** Master;
2. riesce;
3. l'operazione **fallisce**, con *«The server refused the details»*, e
   **nessun account master nuovo compare** nella tabella;
4. **rifiutato.**

se non succede: se ai passi 3 o 4 nasce un master, il soffitto non c'e'. Il menu
del passo 1 **non e' il confine** — e' comodita': i confini stanno nel server,
e questa prova serve a verificare che ci siano davvero.

cosa e' gia' stato fatto: il controllo esiste **due volte**, e la seconda meta'
e' stata aggiunta apposta perche' la prima non basta. La prima e' nel codice
sorgente — `master` semplicemente non e' fra i valori scrivibili. La seconda e' un
controllo che gira **quando arriva la richiesta**, perche' i tipi del linguaggio
spariscono prima che il server legga il contenuto di una richiesta costruita a
mano. Lo stesso buco e' stato chiuso anche sul cambio di ruolo, perche' questa
fase ha allargato quel percorso agli organizer.

pulizia: **cancellare l'account organizer creato al passo 2** e verificare che
sparisca. Un account organizer di prova lasciato in vita e' un account che puo'
approvare persone.
result: [pending]

### 14. M-43-05 — la riconciliazione del proprietario, da un login vero

ruolo: qualsiasi account, piu' una mano tecnica per i passi 1, 3 e 4
serve prima: **la migration numero 5 applicata**, e il codice deployato
serve una mano tecnica: **si**

passi:
1. **[serve una mano tecnica]** Nel pannello di configurazione del sito,
   verificare che il valore configurato per l'account proprietario **non abbia
   spazi ne' un a-capo in coda**. Precedente registrato su una variabile sorella
   che ruppe il flusso dei pagamenti.
2. Fare accesso con un account qualsiasi.
3. **[serve una mano tecnica]** Contare quanti account hanno il ruolo `master`.
4. **[serve una mano tecnica]** Guardare gli ultimi atti del registro.

cosa deve succedere:
2. si atterra sulla dashboard e la barra degli indirizzi **non** contiene
   `master=`;
3. **uno**, ed e' l'account che il valore configurato nomina;
4. **nessuna riga nuova** rispetto a prima del login.

se non succede: al passo 2, `master=unavailable` significa quasi sempre **codice
deployato senza la migration numero 5** — e' l'accoppiamento descritto in cima a
questo file. Al passo 4, **se compare una riga nuova a ogni login, la
riconciliazione sta scrivendo a vuoto e va fermata**: un registro che guadagna
due righe al giorno per sempre diventa illeggibile, che e' lo stesso fallimento
dell'essere vuoto.

cosa e' gia' stato misurato: sul database di prova, il **2026-08-08**, il piano
43-12 ha eseguito il caso completo: una promozione e **due** retrocessioni in una
sola chiamata, tre righe di registro, tutte segnate come **atto di sistema senza
autore umano** — che e' l'unica forma senza autore che la regola permette — e lo
stato **non si e' mosso** sulle retrocessioni (`approved` → `approved`): togliere
il ruolo non ritira l'approvazione. Poi la stessa chiamata ripetuta due volte ha
dato **zero** righe nuove. **Quello che non e' stato provato e' il ponte fra il
codice e il database in produzione**, che e' quello che questa procedura fa.

pulizia: nessun account creato.
result: [pending] — la meta' sul database di prova e' PASS (2026-08-08, piano 43-12, caso D e idempotenza)

### 15. M-43-06 — un valore sbagliato non deve svuotare il prodotto

ruolo: una mano tecnica, con il proprietario presente
serve prima: **la migration numero 5 applicata**, e il codice deployato
serve una mano tecnica: **si, tutta**

> **QUESTA E' LA PROVA PIU' CONSEGUENTE DELL'INTERA FASE.** `43-VALIDATION.md`
> la chiama cosi' per una ragione precisa: sbagliarla non produce un errore, ne'
> un messaggio, ne' una pagina rotta. Produce **un prodotto senza nessun
> amministratore**, cioe' nessuno che possa rimediare. Va fatta **in una finestra
> in cui qualcuno puo' rimettere subito a posto il valore.**

passi:
1. Annotare quanti account hanno il ruolo `master`.
2. **Svuotare** il valore configurato per l'account proprietario, e aspettare che
   il sito si riavvii.
3. Fare accesso.
4. Rimettere un valore **ben formato ma che non corrisponde a nessun account**,
   aspettare il riavvio, fare accesso.
5. **Rimettere subito il valore giusto**, aspettare il riavvio, fare accesso.

cosa deve succedere:
3. la barra degli indirizzi finisce con `master=unconfigured`, e il conteggio del
   passo 1 **non e' cambiato**;
4. `master=unknown`, e il conteggio **ancora non e' cambiato**. **Questo e' il
   caso che conta davvero: il titolare tiene il ruolo anche quando la
   configurazione nomina qualcuno che non esiste;**
5. nessun `master=` nell'indirizzo, conteggio invariato.

**quando fermarsi: se in un qualunque punto il conteggio del passo 1 scende,
fermarsi e rimettere subito il valore giusto.** E' esattamente la condizione che
tutta questa parte esiste per impedire.

cosa e' gia' stato misurato: sul database di prova, il **2026-08-08**, i quattro
casi — valore assente, valore di soli spazi, valore malformato, valore che non
corrisponde a nessuno — hanno lasciato il conteggio dei master e le righe del
registro **identici allo stato iniziale**, verificato con una sola asserzione. E'
stato provato anche un quinto caso che il piano non prevedeva: un valore che
corrisponde a **piu' di un account** rifiuta di agire invece di sceglierne uno a
caso — perche' scegliere avrebbe potuto retrocedere il titolare in carica. E la
protezione contro lo zero-master e' stata **provata rompendola apposta**: si
solleva, e **annulla anche le scritture gia' fatte**, senza lasciare uno stato a
meta'.

pulizia: **rimettere il valore giusto.** Non e' pulizia: e' la fine della prova.
result: [pending] — la meta' sul database di prova e' PASS (2026-08-08, piano 43-12, casi A, B, C1, C2, ambiguo e la guardia provata per mutazione)

### 16. M-43-09 · W-43-14-E — un member non legge **nessuna** riga del registro

> Due piani hanno scritto la stessa prova con due nomi. E' una sola cosa da
> fare, e vale per entrambi.

ruolo: un account **member approved**, e un account **organizer**
serve prima: le sei migration applicate e il codice deployato
serve una mano tecnica: **si, per il passo 2 — che e' l'unico che conta**
perche' nessuno strumento di questo progetto puo' rispondere: gli strumenti
amministrativi con cui e' stato misurato tutto il resto **scavalcano le regole di
accesso per costruzione**. Solo una **sessione vera** puo' dire cosa una persona
vera riesce a leggere

passi:
1. Con una sessione **member approved**, aprire l'indirizzo della pagina del
   registro.
2. **[serve una mano tecnica]** Con la **stessa sessione**, interrogare il
   registro **attraverso l'interfaccia dati**, con il token di quella sessione.
3. Con una sessione **organizer**, aprire lo stesso indirizzo.

cosa deve succedere:
1. si finisce sulla dashboard. **Questo e' il livello di comodita', non la
   sicurezza**;
2. **zero righe.** Nessuna;
3. si finisce sulla dashboard, **ed e' corretto oggi**: quella parte del sito
   chiede un permesso che solo il master ha. Vedi la nota sotto.

se non succede: **se al passo 2 torna anche una sola riga, il redirect del passo
1 non protegge niente** — significa che chiunque abbia la chiave pubblica del
sito puo' leggere il registro, rifiuti compresi. E' la differenza fra le due meta'
del sistema: la prima decide **dove una persona puo' andare**, la seconda decide
**cosa puo' leggere**, e solo la seconda e' sicurezza.

perche' il passo 3 finisce sulla dashboard, ed e' voluto: il permesso di leggere
il registro e' concesso a master **e** organizer, ma l'indirizzo dove vive la
pagina e' riservato al master. Un organizer che ha il permesso viene fermato
**dal percorso, prima che la pagina giri**. E' un debito gia' registrato in
`.planning/todos/pending/register-read-unreachable-for-organizers.md`, e si
chiude nella fase 34 che unisce i due alberi. **Nulla e' stato allentato per
aggirarlo.**

un precedente identico, ancora aperto: `.planning/STATE.md` porta esattamente lo
stesso lavoro dovuto per un'altra tabella — confermare che un member connesso
legga **zero righe** dagli eventi della porta. Stessa ragione, stessa
impossibilita' di risolverlo con uno strumento. **Conviene fare le due cose nella
stessa sessione.**

pulizia: nessun account creato, se si usano account esistenti.
result: [pending]

---

## Sessione 7 — la decisione del proprietario del 2026-08-08

> Due prove, e sono **l'unica decisione di questa fase presa dal proprietario**
> e non da un agente. Alla domanda *chi puo' ribaltare una decisione gia' presa
> su una persona — riammettere un rifiutato, escludere un approvato* la risposta
> scelta e' stata: **gli organizer possono fare tutto.**
>
> **Nessuna delle due richiede piu' una mano tecnica.** Fino al 2026-08-08 la
> decisione viveva solo nel server e i passi si costruivano a mano; ora i gate
> di `deactivateMember` e `reactivateMember` sono allargati e i controlli sono
> disegnati, quindi **entrambe si eseguono con il mouse, da una sessione
> organizer vera.** Se una di queste prove richiede ancora di costruire una
> richiesta a mano, l'allargamento non e' arrivato in produzione.

### 17. CR-01/3 — un organizer **riammette**, con la conferma, e il registro dice **riammesso**

ruolo: **organizer** (serve una sessione con quel ruolo), piu' un master per
preparare i soggetti e per leggere il registro
serve prima: le sei migration applicate e il codice deployato
serve una mano tecnica: **no** — e questo e' esso stesso un controllo

perche' esiste: il rischio che la decisione riapre non e' il permesso, e' il
**nome** di cio' che finisce nel registro. Se un organizer riammette qualcuno e
la storia lo chiama `approved`, il registro dice che una domanda aperta e' stata
decisa dove invece una decisione chiusa e' stata ribaltata — e una storia che si
nomina male viene letta come vera. Insieme al nome si prova la **conferma**: e'
l'unica cosa che sta fra un clic sbagliato e una persona che perde o riacquista
un accesso.

questa prova **sostituisce** due controlli precedenti che verificavano regole
**che non esistono piu'** — prima i due rifiuti *«riservato al master»*, poi la
loro versione «costruita a mano perche' il pulsante non c'e'». **Una prova in
attesa che verifica una regola abrogata e' peggio di nessuna prova.**

passi:
1. Con una sessione **master**, portare un account di prova nello stato
   `rejected` (Reject su una richiesta in attesa, oppure Withdraw access su un
   account approvato).
2. Con una sessione **organizer**, aprire **Members** e la scheda **Rejected**.
   Trovare la riga di quell'account.
3. Premere **Readmit** sulla riga. **Non confermare ancora**: leggere il
   riquadro che compare.
4. Premere **Cancel**. Guardare la riga.
5. Premere di nuovo **Readmit** e poi confermare.
6. Premere **Readmit** una seconda volta sullo stesso account — che ora e'
   `approved`, quindi va cercato nella scheda **Approved**, dove il pulsante e'
   diventato **Withdraw access**. Serve quindi il percorso opposto: tornare su
   **Rejected** e verificare che l'account non ci sia piu'.
7. Sulla scheda **Rejected**, selezionare con le caselle **tre** account di
   prova rifiutati e premere **Readmit selected**. Leggere il riquadro **prima**
   di confermare, poi confermare.
8. Aprire la pagina **Membership acts** e guardare le righe nuove.
9. Guardare la casella di posta degli account di prova.
10. Con la sessione organizer, provare **Make staff** su un account che si trova
    in stato `rejected`. *(Il pulsante non e' disegnato li': i cambi di ruolo
    stanno solo sulle righe approvate. Il controllo e' che **non ci sia**.)*

cosa deve succedere:
1. l'account risulta `rejected` nella tabella;
2. **il pulsante «Readmit» c'e'**, su una sessione organizer. Prima del
   2026-08-08 non c'era: se manca, l'allargamento non e' arrivato in produzione
   e la decisione del proprietario e' di nuovo inerte;
3. compare un riquadro **verde** che dice, in questo ordine: *«Readmit
   &lt;nome&gt;?»*, che **rifa' entrare 1 persona**, che potra' accedere e che la
   **tessera torna a funzionare alla porta**, che l'atto sara' registrato come
   **`reactivated`** con il nome di chi lo fa e l'ora, che **riceve un
   messaggio**, e che **il ruolo non viene ripristinato**. **Non deve dire «are
   you sure»** e non deve essere generico: se non nomina l'atto e il numero di
   persone, la conferma non serve a nulla e va segnalata;
4. **non e' successo niente.** La riga e' ancora `rejected` e nel registro non
   c'e' alcuna riga nuova;
5. l'account passa ad `approved` e sparisce dalla scheda Rejected;
6. non e' piu' fra i rifiutati; sulla sua riga in **Approved** il pulsante ora
   dice **Withdraw access**;
7. il riquadro dice *«Readmit 3 accounts?»* e *«This lets **3 people** back into
   the community»* — **il numero, non «these accounts»**. Dopo la conferma la
   riga di esito dice *«Readmit: 3 of 3 recorded»*;
8. **una riga per ogni riammissione**, e l'atto e' **`reactivated`** — mai
   `approved`. Il passo 6 non ha aggiunto nulla. Ogni riga porta il nome
   dell'organizer come autore, l'ora, e il passaggio `rejected → approved`;
9. **arriva una mail nuova, in italiano**, oggetto *«Il tuo accesso a re:sonate
   e' di nuovo attivo»*. **Non** deve essere *«You're In»* / *«You're
   Approved!»*: quella e' scritta per un primo benvenuto e mandarla a chi
   rientra sono parole sbagliate. Il testo non deve promettere un ruolo;
10. **il pulsante non esiste** su una riga rifiutata. Se qualcuno riesce
    comunque a raggiungere un cambio di ruolo su un account `rejected`, il
    server risponde *«This account was refused — readmit it first, then set the
    role»* con `readmission_before_role_change`, e **nessuna riga nel registro**.

se non succede:
- al passo 8, se l'atto e' `approved` invece di `reactivated`, il registro sta
  prendendo il nome dalla **funzione chiamata** invece che dalla **transizione
  avvenuta**. **Fermarsi e segnalarlo**: ogni riammissione successiva aggiunge
  una riga sbagliata a una tabella che non si puo' correggere — il registro e'
  append-only per costruzione;
- al passo 4, se compare una riga nel registro, la conferma non sta trattenendo
  nulla ed e' peggio che non averla: da' l'impressione di un freno che non c'e';
- al passo 3 o 7, se il riquadro non nomina il numero di persone, **e' l'«are
  you sure» che questa conferma esiste per non essere**. Una conferma letta male
  allena il riflesso a scartare la successiva;
- al passo 9, se non arriva nulla, la riammissione e' di nuovo muta: la persona
  non ha motivo di riprovare ad accedere, e la decisione del proprietario si
  ferma un passo prima di raggiungerla.

pulizia: **cancellare gli account di prova** a fine sessione. Le loro righe nel
registro **restano**, per progetto — ed e' anche il motivo per cui questa prova
non si esegue su un account vero di un membro.
result: [pending]

---

### 18. CR-01/4 — un organizer **ritira** un accesso concesso, e nessuno lo dice al diretto interessato

ruolo: **organizer**, piu' un master per leggere il registro
serve prima: le sei migration applicate e il codice deployato
serve una mano tecnica: **no**

perche' esiste: e' la meta' della decisione del proprietario con la conseguenza
piu' pesante. Un ritiro toglie a una persona l'accesso a una community il cui
valore **e'** il cancello, **e questo prodotto non ha alcun messaggio scritto per
un ritiro** — quindi chi lo subisce lo scopre **alla porta**, davanti alla fila,
con una tessera che non funziona. E' una scelta dichiarata, non una dimenticanza
(il testo di un ritiro e' un giudizio su una persona e lo scrive chi possiede la
voce della community). La prova serve a verificare **tre** cose insieme: che
l'atto riesca, che si chiami `deactivated` e non `rejected`, e che la conferma
avvisi l'operatore del silenzio — perche' l'operatore e' l'unica persona nella
catena che puo' avvisare il membro.

passi:
1. Con una sessione **organizer**, aprire **Members** e la scheda **Approved**.
2. Guardare la riga del **master** e la propria riga.
3. Premere **Withdraw access** su un account di prova approvato. **Non
   confermare**: leggere il riquadro.
4. Confermare.
5. Sulla scheda **Approved**, selezionare **due** account di prova con le
   caselle, premere **Withdraw access from selected**, leggere il riquadro e
   confermare.
6. Aprire **Membership acts**.
7. Guardare la casella di posta degli account di prova.
8. Guardare il **ruolo** di un account di prova che prima del ritiro era
   `staff` o `organizer`.
9. Provare a ripetere il ritiro su un account gia' rifiutato.

cosa deve succedere:
1. **il pulsante «Withdraw access» c'e'**, su una sessione organizer. Se manca,
   la decisione e' di nuovo inerte;
2. la riga del master e la propria riga **non hanno casella di selezione** e non
   hanno pulsanti: e' l'interfaccia che rispecchia due rifiuti che il server
   tiene comunque (nessun atto raggiunge un `master`, nessun atto raggiunge il
   proprio autore). **Se un «seleziona tutto» includesse il master, fermarsi**:
   quel rifiuto e' la riparazione del finding Critical di questa fase;
3. compare un riquadro **rosso** che dice: *«Withdraw access from &lt;nome&gt;?»*,
   che **rimuove 1 persona** dalla community, che smettera' di poter accedere e
   che **la tessera smettera' di funzionare alla porta**, che **ogni ruolo staff
   o organizer viene tolto**, che sara' registrato come **`deactivated`** con
   nome e ora e che **il registro e' append-only**, e — la frase che conta —
   **«Nobody is told … a withdrawn member finds out at the door»**;
4. l'account passa a `rejected`;
5. il riquadro dice *«Withdraw access from 2 accounts?»* e *«removes **2
   people**»*. Dopo la conferma: *«Withdraw access: 2 of 2 recorded»*;
6. **una riga per ogni ritiro, e l'atto e' `deactivated`** — mai `rejected`. Le
   due cose sono la stessa scrittura e due atti diversi: uno respinge una
   domanda, l'altro toglie un accesso concesso, e il registro e' l'unico posto
   dove quella differenza sopravvive;
7. **nessuna mail.** E' il comportamento voluto **e** la lacuna nota: va
   riportata come lavoro da fare per il proprietario — *scrivere, o decidere di
   non scrivere, il testo di un ritiro* — non come difetto di questa prova;
8. il ruolo e' tornato **`member`**. Un ritiro demolisce il ruolo nella stessa
   istruzione: senza, resterebbe un account con ruolo di staff e stato rifiutato,
   che il database non ammette;
9. **non riesce, e non e' un guasto**: *«This account already holds that
   status»*, `status_unchanged`, riquadro **grigio** e non rosso. **Nessuna riga
   nel registro**: non e' successo niente e non c'era niente da fare.

se non succede:
- al passo 6, se l'atto e' `rejected` invece di `deactivated`, il registro e'
  tornato a prendere il nome dal pulsante. Stesso allarme del passo 8 della
  prova 17, e stessa irreversibilita';
- al passo 3, se il riquadro **non** dice che nessuno viene avvisato, allora
  l'unica persona che poteva dirlo al membro non lo sa: il silenzio smette di
  essere una scelta dichiarata e torna a essere un guasto silenzioso;
- al passo 2, se il master compare fra i selezionabili, **fermarsi subito e
  segnalarlo**: e' il finding Critical di questa fase che ritorna, e il suo esito
  e' un prodotto senza alcun master, non recuperabile dall'interno;
- al passo 8, se il ruolo resta `organizer` o `staff`, il database dovrebbe aver
  rifiutato la scrittura con la frase *«this account holds a staff role, and a
  staff role must be approved»*: se invece la scrittura e' passata, e' il
  vincolo del 43-06 a non essere applicato.

pulizia: **cancellare gli account di prova**. Le righe del registro restano.
result: [pending]

---

## Riepilogo

totale: 18
passate: 0
parziali: 3 — le prove **1**, **14** e **15** portano una meta' gia' misurata in
laboratorio, con la data, e una meta' che richiede una persona
in attesa: 15
bloccate dal deploy: 17 su 18 (la sola prova **2** funziona con il solo codice)

## Quello che questo file non copre

- **La meta' browser di M-12** — non e' in attesa: **non e' piu' osservabile**,
  per sempre, da quando la migration numero 2 e' applicata. E' scritto sopra.
- **Tre debiti registrati e non risolti**, gia' committati e non riscritti qui:
  `.planning/todos/pending/postgrest-details-leaks-the-row.md`,
  `.planning/todos/pending/profiles-email-not-unique.md`,
  `.planning/todos/pending/register-read-unreachable-for-organizers.md`.
- **Nessuna di queste prove e' un test automatico**, e nessun test automatico
  esiste in questo prodotto. Se un giorno qualcuno scrivesse che questa fase e'
  verificata «perche' i test passano», sarebbe falso: non ci sono test.
