---
status: partial
phase: 35-per-night-assignments
source: [35-01-PLAN.md, 35-VALIDATION.md, 43-HUMAN-UAT.md, ACCESS-MODEL-DECISIONS.md]
started: 2026-08-08
updated: 2026-08-08
---

# Fase 35 — le prove da fare a mano

> **A cosa serve questo file.** In questo progetto **non esistono test
> automatici del prodotto**: nessuna macchina puo' dire se una cosa funziona
> davvero. L'unica prova che esistera' e' una persona che guarda uno schermo e
> scrive cosa ha visto. Questo file e' quella lista — e, prima ancora, **l'unico
> posto in cui l'ordine di applicazione delle migration e' scritto per intero**.
> Nessun piano successivo della fase 35 lo ricostruisce: lo legge da qui.
>
> **Cosa c'e' oggi e cosa arriva dopo.** Questa e' la versione di Wave 0: porta
> la coda di applicazione, il falso verde del build e i segnaposto delle prove.
> **Le procedure passo-per-passo per requisito arrivano con il piano 35-14**, e
> fino ad allora ogni voce dell'elenco in fondo e' `pending` senza istruzioni.
>
> **Ruoli, mai persone.** Questo repository e' pubblico. Qui non compare nessun
> nome, nessun indirizzo di posta e nessun codice di membership: si scrive
> *«l'account di prova»*, *«una sessione staff»*, *«il valore configurato»*.

---

## Prima di tutto: l'ordine di applicazione

**Niente di quello che questa fase costruisce esiste in produzione oggi, e non
esiste nemmeno cio' su cui si appoggia.** `43-VERIFICATION.md` lo dice con due
numeri: `migrations_applied: 0`, `deployed: false`. Quindi il ruolo `staff`, la
regola *«un ruolo di staff implica approvato»* e il registro degli atti **non
esistono nel database di produzione**. Ogni riga della fase 35 li presuppone.

La coda e' di **quindici** migration: **sei** della fase 43, **otto** della fase
35, e **una** che sta in un blocco a se' perche' e' l'unica che si applica
**dopo** il deploy del codice.

L'ordine **non e' un suggerimento**: sbagliarlo fa fallire l'applicazione nel
momento peggiore, cioe' mentre la si sta facendo.

### Blocco A — le righe 1–14, PRIMA del deploy del codice di questa fase

| # | File | Perche' deve stare qui |
|---|---|---|
| 1 | `20260808000500_staff_role.sql` | crea il quarto ruolo `staff`. Tutto il resto lo nomina |
| 2 | `20260808001000_role_implies_approved.sql` | la regola **nomina** `staff`: prima della riga 1 non avrebbe senso |
| 3 | `20260808002000_membership_register.sql` | crea `membership_acts`, il registro degli atti |
| 4 | `20260808003000_attendances_entry_role.sql` | la colonna che segna com'e' stato un ingresso |
| 5 | `20260808004000_master_reconcile.sql` | la riconciliazione dell'account proprietario |
| 6 | `20260808005000_membership_acts_append_only.sql` | toglie a chi scrive nel registro il potere di riscriverlo. Agisce sulla tabella della riga 3 |
| 7 | `20260809000000_party_assignments.sql` | crea la tabella delle assegnazioni per serata: ha bisogno del ruolo `staff` (riga 1) e del vincolo `role ⇒ approved` (riga 2) |
| 8 | `20260809001000_assignment_resolver.sql` | modifica il corpo del resolver e **legge la tabella della riga 7** |
| 9 | `20260809002000_assignment_acts.sql` | allarga il `CHECK` di `membership_acts`, che nasce alla riga 3 |
| 10 | `20260809003000_party_credits.sql` | indipendente dalle altre quattro; sta qui per non spezzare la lettura, non per una dipendenza |
| 11 | `20260809004000_door_scan_events_by_assignment.sql` | riscrive una policy di `door_scan_events` usando il predicato che la riga 8 ha appena esteso |
| 12 | `20260809004500_event_media_party_id.sql` | aggiunge `party_id` a `event_media`; ha bisogno del resolver della riga 8, perche' la policy di inserimento che riscrive chiama `private.has_capability` con la serata |
| 13 | `20260809004600_event_media_quarantine_bucket.sql` | crea il bucket **privato** di quarantena. E' puramente additiva: non rompe niente in nessun ordine |
| 14 | `20260809005000_live_assignment_flag.sql` | aggiunge **una chiave** al payload di `public.my_access_context()` leggendo la tabella della riga 7. Chiude il blocco perche' quella funzione e' chiamata dal middleware a **ogni richiesta**: si applica quando tutto il resto e' gia' in piedi. Se resta non applicata, la chiave semplicemente non arriva e il gate grossolano si comporta come oggi |

**Le otto della fase 35 vengono dopo tutte e sei quelle della fase 43, senza
eccezioni.** Non c'e' un caso in cui convenga anticiparne una: le righe 7, 9 e
14 nominano oggetti che le righe 1, 2 e 3 creano.

### Blocco B — «Dopo il deploy», e la sua eccezione scritta a lettere piene

| # | File | Quando | Perche' proprio qui |
|---|---|---|---|
| 15 | `20260809006000_event_media_server_upload_only.sql` | **dopo** il deploy del codice di questa fase | toglie al browser il permesso di scrivere nel bucket `event-media` |

Questa e' **l'unica riga della coda che rompe la regola migration→codice**, e la
rompe in una sola direzione. Da quando e' applicata, `event-media` accetta
scritture **solo dal service role**, cioe' solo dalla rotta che spoglia i
metadati.

- **Applicarla prima del deploy** lascerebbe i caricamenti dei membri **rotti**
  fino al deploy, perche' il codice vecchio scrive ancora dal browser — ed e' il
  comportamento di oggi: la policy in vigore permette a un membro approvato di
  caricare direttamente nel bucket.
- **Applicarla dopo** lascia aperta, per la durata del deploy, **la stessa porta
  che e' aperta oggi**. Non peggiora nulla rispetto allo stato attuale.

Fra un peggioramento e uno stato invariato si sceglie lo stato invariato, e **lo
si dichiara invece di scoprirlo**.

> **Finche' la riga 15 non e' applicata, il gate EXIF e' aggirabile.** Chiunque
> abbia una sessione di membro approvato puo' scrivere nel bucket `event-media`
> **saltando la rotta che spoglia i metadati**, e quindi caricare un file con
> dentro le coordinate GPS di dove e' stato scattato. Sta scritto qui, in cima, e
> non in fondo: e' una finestra aperta, con una data di chiusura che dipende da
> un'operazione manuale.

### La riga zero, da accertare prima di cominciare

C'e' **una migration della fase 33, datata `20260808000000`** — quella che porta
`user_id` dentro il payload di `public.my_access_context()` — la cui
applicazione in produzione **non risulta registrata da nessuna parte**: non in
`43-VERIFICATION.md`, non in `.planning/STATE.md`, e non nelle catture di
baseline di produzione, che sono tutte anteriori al giorno in cui quel file e'
stato scritto.

**Va accertato prima di applicare la riga 1**, per due ragioni:

1. se non e' applicata, in produzione ogni percorso che crea un artista, una
   venue o una guest list fallisce gia' oggi con `capabilities.identity_missing`
   — e `33-REVIEW.md` avverte che i sintomi sono tre e la causa una sola;
2. la **riga 14** ridefinisce `public.my_access_context()`. Applicarla sopra una
   definizione piu' vecchia di quella che il repository contiene e' il modo piu'
   rapido per far sparire una chiave senza che nessun messaggio lo dica.

**Come si accerta:** con una sessione autenticata, chiamare
`public.my_access_context()` e guardare se il payload porta `user_id`. Se non lo
porta, quella migration entra in coda **come riga 0**, prima di tutto il resto.

---

## Il falso verde: quello che `npm run build` non prova

**`npm run build` sara' verde per tutta questa fase senza che nessuna migration
sia applicata.** Il typecheck di Next legge i tipi da `src/types/database.ts`, un
file del repository, **non dal database vivo**: nessuna riga di quel file sa se
una tabella esiste davvero da qualche parte.

Quindi un build verde qui e' **uno stato di verifica falso-positivo**, non una
prova. Dire *«compila, quindi funziona»* in questa fase e' esattamente
l'affermazione che il progetto non puo' permettersi, perche' non ci sono test a
smentirla.

L'unico posto in cui la DDL di questa fase viene **davvero esercitata** prima che
una persona la applichi a mano e' `npm run baseline:container`: costruisce un
`postgres:17.6` usa e getta, applica lo schema e **tutta** la coda di migration,
semina, cattura e distrugge il container. Se una migration di questa fase e'
sintatticamente rotta o fuori ordine, e' li' che si vede — e in nessun altro
posto.

---

## La regola: le migration prima, il codice dopo. Mai il contrario

Vale per le righe 1–14 senza eccezioni. La riga 15 e' l'unica eccezione, ed e'
dichiarata sopra.

Il motivo non e' prudenziale, e' **misurato**. Il piano 43-12 ha registrato un
accoppiamento duro: se il codice viene deployato senza la migration numero 5,
**ogni singolo login finisce con `master=unavailable` nella barra degli
indirizzi**, per tutti, ogni volta. Senza la numero 3, la pagina del registro
mostra il proprio messaggio di lettura fallita e ogni approvazione o cambio di
ruolo fallisce con *«The write failed»*.

**Il verso opposto e' sicuro**: le migration applicate con il codice ancora
vecchio non rompono niente. E' stato verificato percorso per percorso dal piano
43-06 — dieci punti del prodotto che scrivono ruolo o stato restano compatibili
con la regola nuova. Il codice vecchio semplicemente non usa le cose nuove.

**E le migration di questa fase vanno scritte idempotenti** — `DROP … IF EXISTS`
prima di ogni `ADD` — perche' si applicano a mano, e una coda che si applica a
mano si riapplica a mano. La fase 43 ha registrato la mancanza come difetto
(WR-04): non e' una preferenza di stile, e' cio' che rende ripetibile un'operazione
che qualcuno fara' di sera, una volta sola, senza rete di sicurezza.

---

## La prova piu' economica, subito dopo l'applicazione

**[serve una mano tecnica]** Un solo comando:

```
npm run verify:capabilities
```

Deve diventare **verde**. Se resta rosso, l'applicazione e' andata a meta' — ed
e' la maniera piu' rapida e piu' economica di scoprirlo, prima che lo scopra
qualcuno alla porta.

**Attenzione: in questa fase i conteggi attesi cambiano, ed e' voluto.** Lo
script pre-registra la propria aritmetica accanto alla dichiarazione che conta
(`scripts/verify-capabilities.mjs:347-349`):

| | oggi | dopo la fase 35 |
|---|---|---|
| coppie ruolo × capability | **36** | **48** |
| grant dichiarati | **20** | **26** |
| rifiuti dichiarati | **16** | **22** |

La fase 35 conia **tre chiavi nuove**: 4 ruoli × 3 chiavi = 12 coppie in piu',
che si dividono in 6 grant e 6 rifiuti. **Abbassare un totale per far passare una
esecuzione e' il fallimento che quelle costanti esistono per intercettare**, ed
e' gia' successo una volta (mutazione C del piano 43-02). I numeri si muovono
solo quando si muove il **modello**, e in questa fase si muove.

Gli altri conti automatici della fase, tutti `[serve una mano tecnica]`:

| Comando | Cosa deve dire |
|---|---|
| `npm run build` | `✓ Compiled successfully` — **e nient'altro**: vedi il falso verde |
| `npm run verify:capabilities -- --target=container` | verde, con i totali nuovi |
| `npm run verify:no-header-identity` | zero lettori di header fuori dal middleware |
| `npm run verify:no-credit-account` | il percorso del credito non importa l'admin API |
| `npm run verify:media-strip` | i cinque controlli, ognuno provato per mutazione |
| `npm run baseline:container` + `npm run baseline:compare` | il confronto contro la cattura **pre-fase** `35-pre` |

La cattura di riferimento e' stata presa **prima della prima riga di DDL di
questa fase**, il 2026-08-08:
`.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-pre.json`
e le due sorelle — **68 policy, 21 tabelle con RLS, 294 celle di lettura, 882
sonde di scrittura**. Ogni confronto di questa fase si misura contro quei numeri.

---

## Le prove da fare a mano

Sono **dieci**, prese da `35-VALIDATION.md § Manual-Only Verifications`. **Qui
ci sono i segnaposto, non le procedure**: i passi, il ruolo, le precondizioni e
cosa deve succedere arrivano con il **piano 35-14**.

Nessuna di queste e' rimandabile a uno strumento. Ognuna esiste perche' un
comando di questo repository **non puo'** rispondere alla domanda che pone.

| # | Cosa deve essere vero | Req | Perche' nessuno strumento ci arriva | status |
|---|---|---|---|---|
| 1 | L'accesso a una notte finita non funziona su un dispositivo che non vede la rete da ore | ASSIGN-02 | nessuno strumento del repository raggiunge un telefono con la radio spenta, e l'orologio del telefono e' **evidenza, mai autorita'** | `pending` |
| 2 | Una scansione gia' in coda non resta appesa quando l'assegnazione viene revocata | ASSIGN-03 | la coda vive in IndexedDB, sul dispositivo | `pending` |
| 3 | Il rifiuto dell'undo arriva come **frase distinguibile**, non come «qualcosa e' andato storto» | ASSIGN-05 | Next redige i messaggi delle Server Action **solo in produzione**: una prova in sviluppo non dice niente | `pending` |
| 4 | L'undo locale con la radio spenta non aggira la supervisione | ASSIGN-05 | il ramo vive nel client dello scanner, sul dispositivo | `pending` |
| 5 | L'autorizzazione si risolve **una volta sola**, all'apertura | ASSIGN-08 | «quante volte una chiamata parte» e' comportamento del client: N scansioni ⇒ N check-in e **zero** chiamate d'autorizzazione | `pending` |
| 6 | La superficie di assegnazione fa quello che dice, e l'atto finisce nel registro con autore e ora | ASSIGN-01, ASSIGN-06 | interfaccia | `pending` |
| 7 | Una persona `staff` assegnata alla porta **RAGGIUNGE** lo scanner | ASSIGN-01 | il rimbalzo avviene nel middleware, prima che qualunque pagina esista: nessuna matrice e nessun typecheck lo vede. **Senza la riga 14 applicata la prova e' falsa-negativa per configurazione** | `pending` |
| 8 | L'assegnazione «photo» sblocca il caricamento, e senza non lo sblocca | ASSIGN-01 | il gate vive in due Server Action e l'esito si vede solo dall'interfaccia pubblica dell'evento | `pending` |
| 9 | L'organizer di una notte vede quella notte e non l'altra | ASSIGN-01 | e' un gate che **deve poter fallire**, e il fallimento si osserva cambiando la serata nell'indirizzo a mano | `pending` |
| 10 | I metadati escono davvero dal file, e il video verso una notte segreta e' rifiutato | ASSIGN-01 | nessuno strumento del repository apre un file e ne legge l'EXIF: la spoglia e' una proprieta' **a tempo d'esecuzione**. Vale **solo con la riga 15 applicata** | `pending` |

**Due dipendenze dalla coda, dichiarate qui perche' cambiano l'esito e non solo
il calendario.** La prova **7** e' falsa-negativa finche' la riga 14 non e'
applicata: la sessione `staff` verrebbe rimbalzata per una ragione diversa da
quella che la prova cerca. La prova **10** e' falsa-positiva finche' la riga 15
non e' applicata: si puo' osservare un file spogliato dalla rotta **mentre** la
porta del browser resta aperta accanto.

---

## La dichiarazione di copertura, onesta

**Quattro requisiti su otto sono chiudibili automaticamente** — ASSIGN-01
(limitatamente al **permesso**), ASSIGN-04, ASSIGN-06, ASSIGN-07. **Gli altri
quattro — ASSIGN-02, ASSIGN-03, ASSIGN-05, ASSIGN-08 — hanno una meta' che
nessuno strumento di questo repository puo' raggiungere**, perche' vive su un
telefono, con la radio spenta, in un build di produzione.

E ASSIGN-01 porta la propria: la matrice di scrittura prova che il **permesso**
e' per-notte; non prova che la persona assegnata **arrivi** allo strumento.
Quella meta' si osserva solo aprendo l'applicazione.

---

## La decisione che governa quando si fa tutto questo

**Non e' riaperta qui.** `ACCESS-MODEL-DECISIONS.md § 12`, decisione del
proprietario del 2026-08-06: tutta la verifica manuale — le quattordici prove
della fase 32, le diciotto della 43 e le dieci di questa — si esegue **alla fine
della costruzione**, non fase per fase.

**Il prezzo e' dichiarato, e si scrive una volta sola cosi' che nessuno lo
riscopra con sorpresa:** le fasi 33, 43, 35 e 34 poggiano tutte sul modello di
capability della fase 32. Se una di quelle prove e' rossa, cio' che le e' stato
costruito sopra e' costruito su una fondazione sbagliata, e **il rifacimento e'
proporzionale a quanto e' stato costruito**.

**Rimandato non significa verificato.** Finche' questo file resta
`status: partial`, la fase 35 non ha una sola prova manuale chiusa, e nessun
`35-VERIFICATION.md` puo' scrivere «verificato» su un requisito la cui meta'
osservabile e' ancora in questo elenco.
