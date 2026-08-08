---
phase: 43-role-model-account-creation
plan: 14
subsystem: access-gating
tags: [interface, staff-role, failure-notice, register-read, rls, seat-cost]
requires:
  - "43-05 — il quarto ruolo nell'unione `UserRole` e il colore provvisorio lasciato a questo piano"
  - "43-07 — `public.membership_acts`, la capability `register.read` e la policy che è il confine vero"
  - "43-09 — `MemberActResult`, le sei cause, e le sei frasi provvisorie lasciate in `MemberTable.tsx`"
  - "43-11 — `createAccount` e le dodici cause del form, che questo piano non tocca e non duplica"
provides:
  - "MemberActionNotice — sette cause, nessuna stringa di ripiego condivisa"
  - "il filtro a quattro ruoli e il conteggio degli account staff, con la frase che dice cosa il ruolo NON concede"
  - "i controlli di ruolo per il quarto ruolo, in entrambe le direzioni, offerti anche a un organizer"
  - "/admin/members/register — la lettura del registro, capability-gated e bounded dalla RLS"
  - "i tre flag d'arrivo su /dashboard resi visibili — WR-04 chiuso, `link=refused` chiuso, `master=` visibile per presenza"
affects:
  - "43-15 — le procedure manuali M-43-08 · M-43-09 · M-43-10 atterrano su queste superfici"
  - "fase 34 — la collassatura degli alberi admin e organizer possiede l'indirizzo raggiungibile da un organizer"
tech-stack:
  added: []
  patterns:
    - "la causa di un fallimento viaggia come VALORE, e il `detail` raffina la causa invece di essere solo stampato"
    - "un conteggio mostrato è misurato dagli outcome, mai dalla lunghezza della selezione"
    - "un colore non si eredita: un ruolo che non concede potere non prende il vocabolario cromatico del potere"
    - "la lettura di un registro append-only passa dal client normale, così la policy resta il confine"
key-files:
  created:
    - "src/app/(admin)/admin/members/MemberActionNotice.tsx"
    - "src/app/(admin)/admin/members/register/page.tsx"
  modified:
    - "src/components/admin/MemberTable.tsx"
    - "src/app/(admin)/admin/members/page.tsx"
    - "src/app/(members)/dashboard/page.tsx"
decisions:
  - "il colore di `staff` resta nella famiglia neutra di `member` e si distingue per il BORDO TRATTEGGIATO — trovabile senza suggerire un potere che il ruolo non ha"
  - "`forbidden` è raffinato in sette rifiuti distinti e `nothing_to_do` in due: una sola frase per sette situazioni sarebbe stato il difetto che il piano esiste per rimuovere"
  - "i cambi di ruolo sono offerti solo su righe già `approved`: promuovere un `pending` lo approverebbe da un pulsante che dice «promuovi»"
  - "i controlli di ruolo sono offerti anche a un organizer, perché 43-09 ha allargato l'atto e la superficie non aveva seguito"
  - "`isStaff` rinominato in `canReachManagementTools` — il predicato è corretto e vale `false` per il ruolo che ora si chiama `staff`"
  - "il registro si intitola «Membership acts», mai «libro soci»: il titolo deciderebbe una domanda che il proprietario ha lasciato aperta"
  - "`master=` è disegnato per PRESENZA con il valore grezzo stampato, perché il suo vocabolario non era leggibile da questo worktree e inventarlo sarebbe stato peggio che non gestirlo"
  - "nessuna migration applicata, nessuna mail inviata, nessuna misura presa contro un database"
metrics:
  tasks: 3
  duration: ~2h
  completed: 2026-08-08
---

# Phase 43 Plan 14: L'interfaccia della fase — Summary

Tutto quello che questa fase ha costruito era invisibile fino a questo piano. Il
quarto ruolo esisteva nel database, nell'unione TypeScript e nella firma di
`updateMemberRole`, e **non aveva un solo controllo su nessuna superficie**: non
si poteva filtrare, non si poteva contare, non si poteva concedere. Un atto
rifiutato non disegnava niente. Il registro non aveva un lettore.

Adesso: un account `staff` si trova, si conta, si concede e si toglie; un
rifiuto è una frase che dice **chi** ha rifiutato e **cosa è cambiato**; e il
registro si legge da chi ha titolo a controllare il proprio lavoro, con la RLS
come confine.

---

## Task 1 — la tabella impara il quarto ruolo e smette di ingoiare i rifiuti (`a790bf3`)

### Le sei frasi provvisorie, finite

Il piano 43-09 aveva lasciato in `MemberTable.tsx` una mappa `FAILURE_NOTICE`
marcata **provvisoria** e dichiarata di proprietà di questo piano. Aveva dovuto
toccare quel file per due ragioni entrambe vincolanti: il build lo imponeva, e
— più importante — gli atti avevano smesso di lanciare, il che aveva reso
irraggiungibili i due `catch` di quel file. Senza intervento un atto rifiutato
avrebbe disegnato **niente**, che è il caso peggiore perché si legge come
successo.

La mappa non è più provvisoria e **non è più in quel file**: vive in
`src/app/(admin)/admin/members/MemberActionNotice.tsx`, un componente per la
stessa ragione per cui esiste `newsletter/FailureNotice.tsx`, ed è l'unico
precedente del repository per «un componente, una notifica per causa».

### Le sette cause, e la loro copy

Sei vengono dal server (`MemberActFailure`). La settima è solo-client: l'azione
non è mai tornata, quindi non c'è alcuna etichetta da leggere — ed è l'unica che
**non può dire se la scrittura sia atterrata**, e lo dice.

| Causa | Tono | Titolo che l'operatore legge |
|---|---|---|
| `capabilities_unavailable` | fault | *Permission check failed — this is not a refusal* |
| `forbidden` | refusal | *The server refused this act* (raffinato, sotto) |
| `constraint_refused` | refusal | *This account holds a staff role, and a staff role must be approved — the write was refused by the database, not by this screen* |
| `subject_not_found` | refusal | *This account no longer exists* |
| `write_failed` | fault | *The write failed — nothing was changed* |
| `nothing_to_do` | noop | *Nothing to do — the request asked for no change* (raffinato, sotto) |
| `transport_unavailable` | fault | *The server did not answer* |

La frase di `constraint_refused` è **quella scritta da 43-09, verbatim, non
riformulata**. È l'unica causa del vocabolario che può arrivare da una REGOLA
invece che da un difetto — `profiles_role_implies_approved` scatta il giorno in
cui scatta, su un percorso che nessuno ha provato, per definizione — e nomina di
proposito **dove** è nato il rifiuto: perché il giorno in cui il vincolo scatta
non sia il giorno in cui qualcuno impara la parola «redatto».

### Il raffinamento sul `detail`, che è la parte che il piano non chiedeva

`forbidden` è **una** etichetta che copre **sette** rifiuti diversi. Disegnarli
tutti come *«non hai i permessi»* sarebbe stato esattamente il difetto
registrato del newsletter — *«Qualcosa è andato storto»* — riprodotto con parole
migliori. Il `detail` che le azioni restituiscono è un **valore** scelto da un
insieme chiuso, mai un messaggio, quindi è sicuro sia da ramificare sia da
mostrare:

| `detail` | Cosa dice, e cosa fare dopo |
|---|---|
| `staff_manage_required` | la sessione non può approvare, rifiutare o cambiare ruoli — niente è stato tentato |
| `master_manage_required` | disattivare e riattivare è riservato al master: un confine del modello, non un guasto |
| `subject_is_master` | il ruolo del master non si cambia da qui, da nessuno — e il rifiuto viene dal server, non dallo schermo |
| `self_role_change` | non puoi cambiare il tuo stesso ruolo: un atto in cui autore e soggetto coincidono è la forma che l'attribuzione non può rendere sicura |
| `self_deactivate` | non puoi disattivare te stesso — così un clic sbagliato non chiude fuori l'unica persona che potrebbe rimediarvi |
| `self_reactivate` | l'altra metà della stessa coppia, tenuta in entrambe le direzioni |
| `role_not_writable` | `master` non è scrivibile da questa superficie: il soffitto sta nell'azione e nel ri-test sul corpo della richiesta, non nel menu |

E `nothing_to_do` copre due situazioni con due passi successivi diversi:
`role_unchanged` (*l'account ha già quel ruolo, e non è stato registrato alcun
atto perché il registro non ha un valore per «non è successo niente»*) e
`no_subjects_selected` (*non è stato selezionato niente*).

Un `detail` non riconosciuto **ricade sulla frase della CAUSA e mostra comunque
il valore grezzo**. Non è una stringa di ripiego condivisa: il lettore sa a
quale categoria appartiene il rifiuto e vede la parola esatta usata dal server.

**Nel file non esiste alcuna stringa di ripiego condivisa, e non deve
esistere.** Il commento in testa al componente lo dice a lettere piene.

### `staff`: colore, forma, conteggio

Il piano 43-05 aveva lasciato `staff` in zinc, **identico a `member`**, e aveva
dichiarato la decisione d'interfaccia di questo piano. Le due metà del suo
ragionamento tirano in direzioni opposte, ed entrambe sono state tenute:

- **non deve prendere in prestito il vocabolario cromatico del potere.**
  Misurato cella per cella dal piano 43-08 su 21 tabelle × 3 verbi: `staff` non
  concede **nulla** che un `member` non abbia già, e non ha alcuna riga
  `door.operate`. Viola e blu dicono «questo account può di più»; per `staff`
  sarebbe una bugia che l'interfaccia racconta prima che qualcuno legga una
  parola.
- **deve però essere trovabile a colpo d'occhio.** Il costo in posti di D-13 è
  visibile solo se una riga staff si distingue in una lista.

**Decisione:** stessa famiglia neutra, **bordo tratteggiato** invece che pieno.
Il tratteggio si legge come *condizionale*, non come *elevato* — che è esattamente
cosa è il ruolo: la metà permanente è l'ingresso gratuito tramite la tessera, e i
permessi di lavoro vengono dall'assegnazione della singola serata e scadono con
la serata.

**Il conteggio**, accanto agli altri e cliccabile (imposta il filtro su `staff`),
contato su `members` e mai su `filtered` — un totale che si muovesse con la
casella di ricerca risponderebbe a una domanda diversa da quella che sembra
rispondere, e si leggerebbe come un calo del costo in posti ogni volta che
qualcuno digita un nome. Gli organizer sono contati **a parte** e non sommati:
entrano gratis anche loro, ma sono una decisione diversa con una ragione diversa,
e una cifra unica nasconderebbe quale delle due sta crescendo.

**E la legenda, che non è decorazione.** Un bordo non può dire *perché*, quindi
lo dice una frase, sulla superficie dove gli account staff si creano:

> *A **staff** account can do nothing a member cannot. What it holds is free
> entry to every night through the membership card, permanently and without
> expiry — so each one is a standing seat at a venue that holds 150–300 people.
> Working the door or a gallery comes from the night's own assignment and ends
> with the night.*

Nessuna parola di quella frase suggerisce che `staff` possa lavorare alla porta.

### I controlli che mancavano

Prima di questo piano il quarto ruolo **non si poteva concedere da nessuna
superficie della tabella**: `Promote` andava solo `member → organizer`, `Demote`
solo `organizer → member`. Adesso, e in entrambe le direzioni:

| Riga | Controlli |
|---|---|
| `member` approved | *Make staff* · *Make organizer* |
| `staff` approved | *Make organizer* · *Remove staff* |
| `organizer` approved | *Make staff* · *Make member* |

*Make staff* da un organizer e *Make member* sono due esiti diversi, non due
gradini della stessa scala: il primo mantiene l'ingresso gratuito, il secondo lo
toglie — ed è togliere `staff` che libera il posto permanente che il conteggio
misura.

**I cambi di ruolo sono offerti solo su righe già `approved`, ed è una decisione.**
Concedere `staff` o `organizer` scrive il ruolo **e** `approved` in una sola
istruzione (43-09): offrirlo su una riga `pending` approverebbe qualcuno da un
pulsante che dice «promuovi», e il registro conterrebbe `promoted` dove la storia
ha bisogno di `approved`. `community-membership.md`, gate *nessuna corsia
grigia*: ogni via d'ingresso che salta l'approvazione è un'eccezione, e
un'eccezione non deve essere il pulsante comodo.

**E i controlli di ruolo sono offerti anche a un organizer.** Il piano 43-09 ha
allargato `updateMemberRole` a `verifyAdminOrOrganizer` (D-21) e la superficie
non aveva seguito: un organizer vedeva approva e rifiuta e nient'altro, quindi
ACCT-01 — *un organizer può promuovere uno staff a organizer* — non aveva un
controllo da nessuna parte. Disattivazione e riattivazione **restano al master**,
perché 43-09 ha allargato quell'atto soltanto.

### Il batch, per soggetto

`BulkSubjectOutcome` esisteva dal piano 43-09 e la superficie ne collassava gli
esiti in una riga di testo con le cause distinte messe in fila. Adesso:

- **entrambi i numeri**, e il primo è **misurato** dagli outcome — `ids.length`
  compare solo come denominatore;
- **una riga per soggetto rifiutato, con il nome**. Chi sa *quale* ha fallito può
  agire; chi sente dire «il batch è fallito» può solo ricominciare;
- i soggetti rifiutati **restano selezionati**, così il secondo tentativo è un
  clic;
- un batch rifiutato **nel suo insieme** (capability, permesso, selezione vuota)
  prende la notifica della causa e non una riga in una lista per soggetto: sono
  due eventi diversi con due passi successivi diversi.

**Il soggetto è nominato con il nome o con l'indirizzo che la tabella già mostra
accanto, mai con il codice di membership.** Quel codice è l'unica credenziale
della porta, questa tabella non lo disegna altrove, e un rapporto di batch è
esattamente il tipo di cosa che finisce in uno screenshot. Nulla in questo
rapporto mostra un valore che la riga sopra non mostri già.

### Due difetti silenziosi, riparati mentre ero nel file

`ActionButton` dichiarava `onClick: () => void` mentre **ogni** call site gli
passava `() => handleAction(...)`, che è `async`. La promise veniva quindi
scartata: il `startTransition` finiva prima che l'atto cominciasse, lo spinner
lampeggiava per un frame e il pulsante si riabilitava mentre una scrittura era
ancora in volo — che è un invito al secondo clic su un atto già in corso. Il tipo
è ora `() => Promise<void>` e la chiamata è **attesa** dentro la transizione.

La stessa promise scartata rendeva **codice morto** il `try/catch` interno di quel
componente (un reject non poteva raggiungerlo) e con esso la riga d'errore locale
che disegnava il messaggio dell'errore catturato. Entrambi rimossi: il genitore
possiede la notifica, perché un rifiuto ha bisogno di più spazio di una cella e
perché quel messaggio è **redatto** in un build di produzione.

---

## La camminata sui ventuno siti di § G.1

È l'unico artefatto che dimostri che la camminata è avvenuta, **perché il build
non può**: dei ventuno siti che enumerano ruoli, esattamente **uno** produce un
errore di compilazione, dato che diciassette fanno il cast `role as UserRole` e
un cast smette di far guardare il compilatore.

| # | Sito | Verdetto | Azione |
|---|---|---|---|
| 1 | `types/database.ts:38` — l'unione `UserRole` | già allargata dal piano 43-05; verificata presente | nessuna |
| 2 | `rbac/roles.ts:6-15` — la costante `ROLES` | già allargata dal piano 43-05, con la ragione accanto | nessuna |
| 3 | `rbac/roles.ts` — `NAV_ITEMS`, `/admin/scanner` → `["master","organizer"]` | **corretto così**: `staff` non deve vedere la scheda scanner, D-02 gli rifiuta `door.operate` | **lasciato stare** |
| 4 | `rbac/roles.ts` — `getVisibleNavItems` | **sicuro per costruzione**: le voci `roles: null` si mostrano a tutti, l'unica ristretta esclude `staff`. Un account `staff/approved` vede Events, Gallery, Account | **lasciato stare** |
| 5 | `staff/StaffNav.tsx` — `roles: ["master"]` | corretto così | **lasciato stare** |
| 6 | `account/ManagementSection.tsx` — `"master" \| "organizer"` | mai raggiunto da un account `staff`, ed è il sito 7 a garantirlo | **lasciato stare**, e il suo cancello è stato reso onesto nel nome |
| 7 | `dashboard/page.tsx:190` — `const isStaff = …` | **DIFETTO nel nome, non nella logica**: una variabile chiamata `isStaff` che vale `false` per il ruolo `staff` | **corretto** — rinominata `canReachManagementTools`, con il commento che dice perché il predicato è giusto e perché la logica appartiene alla fase 34 |
| 8 | `dashboard/page.tsx:409` — `role as "master" \| "organizer"` | guardato dal sito 7, sicuro | **lasciato stare** |
| 9 | `MemberTable.tsx` — `if (member.role === "master") return "--"` | corretto: una riga `staff` **riceve** i pulsanti, e deve, perché va promossa e disattivata | **lasciato stare**, con il commento che dice che nascondere non è rifiutare e nomina il rifiuto lato server |
| 10 | `MemberTable.tsx` — il `<select>` del filtro ruolo | **DIFETTO reale**: un account staff non si poteva filtrare, e il conteggio di D-13 non si poteva leggere | **corretto** — quarta opzione, più il conteggio, più la legenda |
| 11 | `MemberTable.tsx` → `updateMemberRole(id, …)` | l'unico sito che il compilatore aiuta; la firma è stata allargata da 43-09 | **usato**: la superficie ora la chiama con `"staff"` in entrambe le direzioni |
| 12 | `venues/[slug]/page.tsx`, `artists/[slug]/page.tsx` — affordance di modifica | corretto così | **lasciato stare** |
| 13 | `events/[slug]/actions.ts:38` — `profile.role === …` | corretto così. **Ma legge `role` direttamente**: una domanda di capability travestita da controllo di ruolo. Debito **preesistente**, fuori perimetro | **lasciato stare**, registrato |
| 14 | `review/ReviewListClient.tsx:411` — `role === "master"` | corretto così | **lasciato stare** |
| 15 | `admin/members/page.tsx` — `callerRole="master"` | corretto: l'albero `(admin)` è `admin.access`, master soltanto | **lasciato stare** |
| 16 | `private.role_capabilities` CHECK | migration, piano 43-05 | fuori perimetro |
| 17 | `public.profiles` role CHECK | migration, piano 43-05 | fuori perimetro |
| 18 | `scripts/rls-baseline.mjs:638` — `PERSONA_ROLES` | piano 43-08 | fuori perimetro |
| 19 | `scripts/rls-baseline.mjs:692` — `PERSONA_SQL` | piano 43-08 | fuori perimetro |
| 20 | `public.is_admin_or_organizer()` | restituisce `false` per `staff` — **corretto** | fuori perimetro |
| 21 | il literal di ruolo superstite dentro una policy viva (`event_parties`) | `staff` → false. Corretto, e vale sapere che esiste | fuori perimetro |

**Due difetti su ventuno, ed erano entrambi di questo task.** Gli altri
diciannove sono corretti così, e diciotto di loro il compilatore non li avrebbe
nominati mai.

---

## Task 2 — il registro, letto da chi ha titolo e da nessun altro (`14156f0`)

**Rotta: `/admin/members/register`.** Server Component, sul modello di
`organizer/events/[id]/review/page.tsx` — l'unica altra lettura capability-gated
di un registro append-only del repository — seguito riga per riga invece che
ri-derivato.

| Requisito | Come è tenuto |
|---|---|
| opt-out dalla cache | `export const dynamic = "force-dynamic"`, con la ragione ripetuta: l'opt-out avverrebbe comunque, implicito via `cookies()` dentro `getAccessContext()`, ed è per questo che è facile perderlo in un refactor |
| il cancello d'interfaccia | `CAP.REGISTER_READ` da `getAccessContext()`, altrimenti `redirect("/dashboard")` |
| il confine vero | il **client server normale**. Quello che bypassa la RLS non compare da nessuna parte: leggere il registro con quello sposterebbe il confine dentro la pagina e lascerebbe `membership_acts_select_register_read` decorativa |
| colonne | nominate una volta sola in `MEMBERSHIP_ACT_COLUMNS`, come `SCAN_EVENT_COLUMNS` |
| ordine | più recenti prima, con un tetto di 200 e la ragione del tetto scritta: la tabella ha indici su `(subject_id, at DESC)` e `(actor_id, at DESC)`, quindi una lettura non qualificata è una scansione più un sort |
| un atto `system` | disegnato come **la riconciliazione che lo ha prodotto**, mai come autore vuoto. È D-22, e una cella vuota lo disferebbe: sarebbe indistinguibile da un atto non attribuito |
| il soggetto | **codice di membership**, sempre; il nome accanto solo finché l'account esiste. **Nessun indirizzo email è disegnato né letto** — il registro non ne conserva uno e questa pagina non ne chiede |
| lettura fallita | messaggio dichiarato invece di una lista vuota: un registro **vuoto** e un registro **illeggibile** significano cose opposte, e disegnarli uguali sarebbe il guasto che si legge come rassicurazione |

**La frase delle due assi è scritta nella pagina**, perché è il punto: questo è
il livello d'**interfaccia** e decide dove qualcuno può *andare*; cosa può
*leggere* lo decide la policy, e la superficie ha bisogno di entrambi — il solo
redirect lascerebbe il registro, rifiuti compresi, leggibile via PostgREST da
chiunque abbia la chiave anonima.

**Il titolo dice «Membership acts», e non è una sfumatura.** Il registro è un
registro di **atti**, non il libro soci dell'associazione — 43-07 lo ha detto di
proposito costruendo la tabella. Intitolarlo «libro soci» deciderebbe **per
via di un titolo** una domanda che il proprietario ha esplicitamente lasciato
aperta (`legal-compliance.md`; `ACCESS-MODEL-DECISIONS.md` §9, registrata il
2026-08-06 e da riaprire, non da ereditare). Nessuna parola della pagina dice
«soci», «membership book» o «libro soci».

**Nessuna lettura della propria riga, e nessuna rotta per farla**, scritta come
decisione con la sua ragione: il registro contiene rifiuti, e
`community-membership.md` dice che il testo di un rifiuto si scrive una volta,
con cura, e si usa sempre lo stesso — **è una comunicazione, non una tabella che
una persona legge su di sé**. Una vista self-service consegnerebbe quel giudizio
come un valore di database, spogliato della frase che qualcuno ha scritto per
portarlo. La policy è d'accordo, e la fa rispettare lei: `register.read` e basta,
quindi non c'è alcuna clausola own-row da allargare e nessun endpoint da
raggiungere.

**Il collegamento** è in cima a `/admin/members`, disegnato incondizionatamente e
per la stessa ragione già scritta sopra il form di creazione: la pagina ha già
rifiutato chi non ha `admin.access`, la pagina del registro richiede
`register.read` per conto suo, e cosa si può davvero **leggere** lo decide la
policy. Nascondere un link non protegge nulla.

---

## Task 3 — i tre flag d'arrivo su `/dashboard` smettono di essere muti (`ebea4d3`)

**Non era nel piano.** È arrivato dall'orchestratore mentre il task 2 era in
corso, e sta dentro il mandato invece di essere scope creep per una ragione
precisa: il criterio d'accettazione di questo piano dice che **ogni causa
distinta deve rendere una frase distinguibile**, e un flag che nessuna pagina
disegna è un fallimento silenzioso *con un URL* — la persona viene rimbalzata, la
ragione sta nella barra degli indirizzi, e lo schermo non dice niente. È il
difetto registrato del newsletter con una query string addosso, e per certi versi
peggiore: qui la diagnosi **esiste già** e semplicemente non viene disegnata.

`dashboard/page.tsx` è uno dei miei cinque file, ed è l'ultimo piano della fase
ad aprirlo.

### Il primo flag era già chiuso, e la premessa va corretta

**`?access=unavailable` (WR-04) è renderizzato su questa pagina, e lo è da quando
è stato introdotto.** Il pannello ambra *«We couldn't check your permissions just
now»* esisteva già, gated su `accessUnavailable`.

Due piani hanno riportato in avanti la nota *«nulla renderizza
`?access=unavailable`»*, e la nota **non è vera per questa superficie**. È
`ai-engineering.md`, gate *documentazione datata*: una nota ereditata senza
verificarla contro il codice corrente è un Gate hallucination con un passaggio in
più, e la citazione eredita l'errore senza portarne la responsabilità. Corretta
nel file, non solo qui. **WR-04 è chiuso su `/dashboard`.**

### Il secondo, chiuso

**`?link=refused`** (piano 43-04) è impostato dal callback quando il `next` di un
link non è nell'allow-list e viene sostituito con il default — e il default **è
questa pagina**, quindi atterra sempre qui.

Conta più di quanto sembri. La persona ha seguito un link che prometteva di
portarla da qualche parte — spesso la pagina dove un account nuovo imposta la
password — ed è arrivata su una dashboard. Senza la notifica l'unica conclusione
possibile è *«il link non ha funzionato»*, che è **falso**: il link ha
funzionato, ed è la destinazione a essere stata rifiutata. Chi ha appena ricevuto
un account e non trova il campo password chiederà un secondo invito, e il secondo
farà esattamente la stessa cosa. La frase lo dice.

### Il terzo, visibile ma non inventato

**`?master=`** è aggiunto dal piano 43-12, che gira in parallelo **in un altro
worktree**: il file che lo imposta non è nel mio, e il suo vocabolario di valori
**non era leggibile da qui**.

Gli altri due sono confrontati con un valore letto dal codice che lo imposta.
Questo no. Quindi la decisione, e la ragione:

- **inventare i valori sarebbe stato peggio che non gestire il flag.** Un
  renderer agganciato a stringhe indovinate resta **muto** e allo stesso tempo
  **sembra gestito**, quindi il prossimo lettore smette di guardare. È
  `ai-engineering.md`, gate *hallucination*, e `ai-engineering.md`, gate *un gate
  deve poter fallire*;
- quindi il flag è disegnato **per presenza**: la **categoria** è nominata —
  quella è nota, la riconciliazione del master al login — e il **valore esatto è
  stampato verbatim** in monospazio.

È esattamente la regola che questo stesso piano applica a un `detail` non
riconosciuto in `MemberActionNotice`: nomina la categoria, mostra la parola che
il server ha usato, **non inventare una frase per essa**. Quando il vocabolario
di 43-12 sarà agli atti, questo guadagna una frase per valore — e nel frattempo
il flag è **visibile invece che muto**, che era il punto.

La copy dice anche a chi non è il proprietario che non deve fare nulla: la
maggioranza di chi lo vedrà non è la persona che quel flag riguarda.

**Nessun file di 43-12 o di 43-13 è stato toccato.**

### Il secondo fatto: `profiles.email` non ha vincolo di unicità

Registrato dall'orchestratore, misurato da 43-12 (`supabase/schema.sql:56`).
**Non è lavoro di questo piano risolverlo**, ed è già debito tracciato.

Cosa cambia qui: **nessuna copy scritta da questo piano tratta un indirizzo come
se identificasse una persona sola.** L'unico punto in cui questo piano usa un
indirizzo è l'etichetta di un soggetto rifiutato in un batch, dove ricade sul
nome e poi sull'indirizzo — ed è un'**etichetta**, non un'affermazione di
unicità. Le righe della lista sono comunque chiavate su `subjectId`, non
sull'etichetta, quindi due profili con lo stesso indirizzo restano due righe.
Detto invece che sottinteso: se accadesse, le due righe porterebbero la stessa
etichetta e sarebbero distinguibili solo dalla causa. È una conseguenza del
vincolo mancante, non di questa superficie.

---

## Deviazioni dal piano

Tutte le decisioni sotto sono dell'**esecutore**. **Nessuna approvazione
dell'utente è stata chiesta e nessuna è stata data.**

### 1. [Rule 1 — bug] La promise scartata di `ActionButton`

- **Trovata durante:** task 1, cambiando la firma di `handleAction`.
- **Problema:** `onClick: () => void` con call site `async` — la transizione
  finiva prima dell'atto, il pulsante si riabilitava a scrittura in corso, e il
  `try/catch` del componente era codice morto.
- **Fix:** tipo `() => Promise<void>`, chiamata attesa dentro la transizione,
  `catch` morto e riga d'errore locale rimossi.
- **File:** `src/components/admin/MemberTable.tsx` · **Commit:** `a790bf3`

### 2. [Rule 2 — zero fallimenti silenziosi] Il raffinamento sul `detail`

- **Trovato durante:** task 1, scrivendo la copy di `forbidden`.
- **Problema:** il piano chiede «una notifica per causa». `forbidden` è **una**
  causa e **sette** rifiuti, e `nothing_to_do` è una causa e due situazioni.
  Rispettare il piano alla lettera avrebbe riprodotto il difetto del newsletter
  con parole migliori.
- **Fix:** `FORBIDDEN_BY_DETAIL` e `NOTHING_TO_DO_BY_DETAIL`, e un `detail` non
  riconosciuto ricade sulla causa **mostrando comunque il valore grezzo**.
- **Commit:** `a790bf3`

### 3. [decisione dell'esecutore] I controlli di ruolo offerti anche agli organizer

- **Problema:** 43-09 ha allargato `updateMemberRole` agli organizer (D-21), ma
  `MemberTable` disegnava per un organizer solo approva/rifiuta su righe
  `pending`. ACCT-01 non aveva un controllo da nessuna parte.
- **Fix:** i cambi di ruolo sono disegnati per entrambi i chiamanti; disattivare
  e riattivare restano al master, perché 43-09 ha allargato **solo**
  `updateMemberRole`.
- **Alternativa scartata:** lasciare l'organizer senza controlli e considerare
  ACCT-01 soddisfatto dalla firma dell'azione. Una capacità raggiungibile solo
  costruendo una richiesta a mano non è un'interfaccia.

### 4. [decisione dell'esecutore] Cambi di ruolo solo su righe `approved`

Il piano non lo chiede. Senza, un `pending` promosso verrebbe **approvato** da un
pulsante che dice «promuovi», e il registro conterrebbe `promoted` dove la storia
ha bisogno di `approved`. `community-membership.md`, gate *nessuna corsia
grigia*.

### 5. [decisione dell'esecutore] Il soggetto di un batch è nominato senza il codice

Il piano non lo tratta. Il codice di membership è l'unica credenziale della porta
e questa tabella non lo disegna altrove: un rapporto di batch lo introdurrebbe in
una superficie nuova. Nome, o l'indirizzo che la tabella già mostra.

Sulla **pagina del registro** vale il contrario, ed è il piano a dirlo: lì il
codice è l'etichetta **durevole**, scelta dalla migration proprio perché nomina
una riga senza pubblicare una persona, e su una riga il cui account è stato
cancellato è l'unico identificatore rimasto.

### 6. [scostamento dai comandi di verifica del piano, non dai criteri]

Lo dico invece di lasciarlo trovare:

| grep del piano | atteso | osservato | perché |
|---|---|---|---|
| `grep -c "e.message"` su `MemberTable.tsx` == 0 | 0 | **0**, dopo un intervento | le tre occorrenze rimaste erano **prosa nei commenti** che spiega l'assenza. Un grep che conta le proprie spiegazioni non asserisce nulla, quindi la proprietà è ora descritta a parole. È lo stesso baratto — leggibilità contro verificabilità — che il piano 43-11 ha dichiarato per tre stringhe |
| `grep -c "isStaff"` su `dashboard/page.tsx` | non dichiarato | **2** | entrambe dentro il commento che spiega la rinomina. È deliberato: chi cercasse il vecchio identificatore atterra sulla ragione per cui non c'è più. Il criterio d'accettazione chiede «rinominata **o** con un commento»; qui sono state fatte entrambe |
| `grep -c "staff"` su `MemberTable.tsx` | non dichiarato | **21** | filtro, conteggio, legenda, badge, tre transizioni di ruolo e i commenti che le spiegano |

### 7. [istruzione dell'orchestratore, fuori dal piano] I tre flag d'arrivo su `/dashboard`

Sezione **Task 3** sopra. In sintesi, e nominandoli uno per uno come richiesto:

| Flag | Esito | Perché |
|---|---|---|
| `?access=unavailable` | **già chiuso, premessa corretta** | era renderizzato da prima; due piani avevano riportato in avanti una nota non verificata |
| `?link=refused` | **chiuso** | il valore è leggibile nel codice che lo imposta, e atterra sempre qui |
| `?master=` | **visibile, ma non per valore** | il vocabolario non era leggibile da questo worktree; categoria nominata, valore stampato verbatim, nessuna frase inventata. Chi possiede il vocabolario lo raffina in una frase per valore |

Nessuno dei tre resta muto, e nessuno dei tre resta senza una decisione scritta.

### 8. [registrato, non corretto] `register.read` è concesso a un organizer che non può raggiungere l'indirizzo

`register.read` è concesso a **master e organizer** (43-07). `/admin/*` è gated
su `admin.access`, che è **il solo master**
(`src/lib/supabase/middleware.ts`). A questo indirizzo un organizer che possiede
la capability viene rimbalzato **dal routing, prima che la pagina giri**.

È il verdetto della rotta, non della pagina, ed è scritto come commento nel file.
**Nulla è stato allentato per aggirarlo**: la fase 34 collassa gli alberi admin e
organizer, e un indirizzo raggiungibile da un organizer appartiene a quella
collassatura. Il piano colloca la pagina lì esplicitamente, e l'albero organizer
non è tra i file di questo piano.

---

## Verifica — e ciò che il verde NON prova

**Eseguito, dopo l'ultimo commit di codice:**

| comando | esito |
|---|---|
| `npm run build` | **`✓ Compiled successfully`**, typecheck di Next incluso, zero errori. `/admin/members/register` compare nella tabella delle rotte come **ƒ (dinamica)** |
| `grep -ci "getServiceClient"` su `register/page.tsx` | **0** — nessun client che bypassa la RLS su una superficie di lettura |
| `grep -c "force-dynamic"` su `register/page.tsx` | **1** |
| `grep -c "REGISTER_READ"` su `register/page.tsx` | **1** |
| `grep -nE "email\|@"` su `register/page.tsx` | 7 righe, **tutte** percorsi di import tranne una: il commento che dichiara l'assenza. Nessuna colonna `email` è selezionata |
| `grep -c "e.message"` su `MemberTable.tsx` | **0** |
| `git diff --name-only` sulla base | esattamente i **cinque** file dichiarati |
| `git diff --diff-filter=D` sui due commit | **nessuna cancellazione** |

### Cosa quel verde prova, e cosa no

**Prova che questo compila. Non prova altro, e in questo repository è la parte
che conta.**

`CLAUDE.md` Guardrail 1: **non esiste alcun test runner per il prodotto**, e
nessuno è stato aggiunto. Nessuna affermazione qui è «verificata perché i test
passano». In più, nessun client Supabase di questo repository è parametrizzato
con `Database`, quindi il build verde **non** prova:

1. che la tabella `public.membership_acts` esista sul database — **la migration
   di 43-07 non è applicata a produzione**, e questa fase non applica migration a
   produzione. Finché non lo è, la pagina del registro disegnerà il suo messaggio
   di lettura fallita, che è **vero, visibile e non silenzioso** — ma è il deploy
   della migration a rendere la pagina funzionante, non questo commit;
2. che i tredici nomi di colonna di `MEMBERSHIP_ACT_COLUMNS` siano scritti
   giusti;
3. che la policy `membership_acts_select_register_read` rifiuti davvero un
   `member` — la Management API bypassa la RLS, quindi serve una **sessione
   vera**: è M-43-09;
4. che un `23514` arrivi al client come `error.code` **su questi percorsi**
   (misurato altrove in 43-01, non qui), quindi che sia davvero la frase di
   `constraint_refused` a comparire e non quella di `write_failed`;
5. che i controlli di ruolo nuovi scrivano il ruolo che dicono di scrivere.

**Nessuna migration è stata applicata. Nessuna mail è stata inviata. Nessun
account è stato creato. Nessuna misura è stata presa contro un database**, né di
produzione né in container.

---

## La procedura manuale, scritta e non eseguita

È l'unica evidenza comportamentale che esisterà, quindi è scritta passo per
passo invece che evocata. **Precondizione per tutte: le migration della fase 43
devono essere deployate**, nell'ordine `staff_role` → `role_implies_approved` →
`membership_register`. Nessun passo qui va eseguito in produzione prima di quel
deploy.

> **W-43-14-A — il quarto ruolo si trova, si conta e si concede.** Ruolo: master.
> 1. Aprire `/admin/members`. **Atteso:** sotto il titolo c'è il link *Membership
>    acts →*; sopra la tabella ci sono quattro cifre — totale, organizers,
>    **staff**, pending — e sotto di esse il paragrafo che dice che uno staff non
>    può fare nulla che un member non possa.
> 2. Aprire il menu *All roles*. **Atteso:** quattro opzioni in ordine di rango —
>    Master, Organizer, **Staff**, Member. Se ce ne sono tre, questo piano non è
>    deployato.
> 3. Scegliere *Staff*. **Atteso:** la lista mostra solo righe staff, e il loro
>    numero coincide con la cifra del passo 1.
> 4. Cliccare la cifra **staff** stessa. **Atteso:** imposta lo stesso filtro.
> 5. Tornare su *All roles*, trovare una riga `member` con stato `approved`.
>    **Atteso:** due pulsanti, *Make staff* e *Make organizer*.
> 6. Premere *Make staff*. **Atteso:** il pulsante mostra lo spinner **finché la
>    scrittura non è finita** (non un lampo), poi la riga si ricarica con il badge
>    `staff` — grigio come `member`, **con il bordo tratteggiato** — e la cifra
>    staff del passo 1 è salita di uno.
> 7. Sulla stessa riga premere *Remove staff*. **Atteso:** torna `member`, la
>    cifra staff scende di uno, e lo **stato resta `approved`**: togliere lo staff
>    non ritira un'approvazione.
>
> Data: ______   Esito ai passi 2, 3, 6, 7: ______

> **W-43-14-B — un rifiuto ha una frase sua, in build di produzione.** Ruolo:
> master, su un deploy Vercel (**non** `next dev`: in sviluppo i messaggi non
> sono redatti e la prova non varrebbe).
> 1. Trovare la propria riga nella tabella. **Atteso:** la cella azioni mostra
>    `--`. Questo è il caso soppresso in interfaccia, non un rifiuto.
> 2. Trovare la riga del master, da un'altra sessione con ruolo master. **Atteso:**
>    `--`, di nuovo. Nascondere non è rifiutare: il rifiuto è al passo 3.
> 3. La parte che conta, e va fatta da chi sa usare gli strumenti del browser:
>    rieseguire una richiesta di `updateMemberRole` puntandola **all'account
>    master**. **Atteso:** compare un riquadro ambra che dice *«The master's role
>    cannot be changed from here, by anybody»*, e sotto, in monospazio,
>    `subject_is_master`. **Se compare una frase generica, o non compare nulla,
>    questo piano non regge e va segnalato.**
> 4. Ripetere puntando la richiesta a `role: "master"`. **Atteso:** *«That role
>    cannot be granted from here»* con `role_not_writable`.
> 5. Su una riga `staff`, premere due volte *Make organizer* in fretta. **Atteso:**
>    la seconda volta *«This account already holds that role»* con
>    `role_unchanged`, e **nessuna riga nuova nel registro** per il secondo clic.
>
> Data: ______   Esito ai passi 3, 4, 5: ______

> **W-43-14-C — un batch dice quale soggetto ha fallito.** Ruolo: master.
> 1. Aprire la scheda *Pending*, selezionare almeno tre righe, premere *Approve
>    selected*.
> 2. **Atteso, batch pulito:** una riga *«Approve: 3 of 3 recorded.»* e la
>    selezione si svuota.
> 3. **Atteso, batch parziale** (se una riga fallisce): *«Approve: 2 of 3
>    recorded, 1 refused. The refused rows are still selected.»*, **più un
>    riquadro per il soggetto rifiutato, con il suo nome** e la frase della sua
>    causa. Il soggetto rifiutato è **ancora selezionato**.
> 4. Verificare che il nome mostrato **non** sia un codice di membership.
> 5. Non selezionare nulla — impossibile dalla toolbar, che appare solo con una
>    selezione. Se ci si arriva in altro modo: *«Nothing was selected»*.
>
> Data: ______   Esito ai passi 3 e 4: ______

> **W-43-14-D — il registro si legge, e dice chi.** Ruolo: master.
> 1. Da `/admin/members`, premere *Membership acts →*.
> 2. **Atteso:** titolo *Membership acts*. **Verificare che da nessuna parte
>    compaia la parola «soci», «libro soci» o «membership book»** — se compare,
>    è un errore di questo piano ed è da segnalare.
> 3. **Atteso:** gli atti del passo W-43-14-A compaiono in cima, più recenti
>    prima, con: l'atto in parole (*Promoted*, *Demoted*, …), il **codice di
>    membership** del soggetto, il nome accanto, la transizione `role
>    member → staff`, l'autore e l'orario.
> 4. **Verificare che nessun indirizzo email compaia in alcun punto della
>    pagina.**
> 5. Gli atti che ammettono qualcuno — *Account created*, *Approved*,
>    *Reactivated* — hanno il bordo rosa dell'accento. Gli altri no.
> 6. Se esiste una riga scritta dalla riconciliazione automatica, **atteso:** *By
>    **Automatic reconciliation***, con la frase che spiega che nessuna persona
>    l'ha compiuta. **Una cella autore vuota è un difetto e va segnalato.**
> 7. Con il registro vuoto, **atteso:** *«No acts recorded yet»* e la frase che
>    dice che una lettura fallita si dichiara in rosso, sopra. **Se compare il
>    riquadro rosso, la lettura è fallita e la lista vuota non significa
>    "stagione tranquilla".**
>
> Data: ______   Esito ai passi 2, 4, 6, 7: ______

> **W-43-14-E — chi non ha titolo non legge.** (È M-43-09, e ha bisogno di una
> **sessione vera**: la Management API bypassa la RLS e non prova nulla.)
> 1. Con una sessione **member approved**, aprire `/admin/members/register`.
>    **Atteso:** si finisce su `/dashboard`. Questo è il middleware.
> 2. La parte che conta: con la stessa sessione, interrogare
>    `public.membership_acts` **attraverso l'API**, con il token di quella
>    sessione. **Atteso: zero righe.** Se ne torna anche una sola, la policy non
>    è il confine e va segnalato — il redirect del passo 1 non protegge nulla.
> 3. Con una sessione **organizer**, aprire lo stesso indirizzo. **Atteso: si
>    finisce su `/dashboard`**, ed è corretto oggi: `/admin/*` chiede
>    `admin.access`. Vedi la deviazione 7.
>
> Data: ______   Esito al passo 2: ______

> **W-43-14-F — i tre flag d'arrivo dicono qualcosa.** Ruolo: qualsiasi account
> con una sessione. Non serve provocare i guasti veri: i tre flag si leggono
> dalla query string, quindi si aprono a mano.
> 1. Aprire `/dashboard?access=unavailable`. **Atteso:** pannello ambra *«We
>    couldn't check your permissions just now»*.
> 2. Aprire `/dashboard?link=refused`. **Atteso:** pannello ambra *«Your link
>    worked — but it could not send you where it said»*, con la frase che dice di
>    **non riusare lo stesso link** ma di farsene mandare un altro.
> 3. Aprire `/dashboard?master=qualsiasi-valore`. **Atteso:** pannello ambra *«A
>    check on the owner account did not complete at sign-in»*, e sotto, in
>    monospazio, **esattamente** `qualsiasi-valore`.
> 4. Aprire `/dashboard` senza parametri. **Atteso: nessuno dei tre pannelli.**
>    Questo passo è quello che conta: un pannello che comparisse sempre sarebbe
>    rumore, e il rumore addestra a non leggere.
> 5. Aprire `/dashboard?access=unavailable&link=refused`. **Atteso: entrambi i
>    pannelli**, distinti, uno sopra l'altro. Nessuna delle due frasi sostituisce
>    l'altra.
>
> Data: ______   Esito ai passi 3, 4, 5: ______

---

## Criteri di successo

| # | Criterio | Stato |
|---|---|---|
| 1 | un account staff si filtra e si conta dove si gestiscono i membri (D-01, D-13, ACCT-05) | **soddisfatto nel codice**: quarta opzione, conteggio su `members`, legenda che dice cosa il ruolo non concede. Osservabile: W-43-14-A |
| 2 | una scrittura rifiutata è una frase sua in build di produzione (D-04, ROLE-02) | **soddisfatto per costruzione**: sette cause più il raffinamento sul `detail`, nessuna stringa condivisa, nessun messaggio letto. Osservabile: W-43-14-B |
| 3 | il registro è leggibile da un ruolo approvato con titolo, bounded dalla RLS, e un atto di sistema è nominato (D-19, D-22, ACCT-04) | **costruito**: cancello su `register.read`, client normale, `actor_kind` reso esplicito. Che la policy sia il confine è W-43-14-E, non un build verde |
| 4 | tutti e ventuno i siti hanno un verdetto registrato | **soddisfatto** — la tabella sopra, due difetti corretti e diciannove lasciati stare con la ragione |
| 5 | *(fuori piano, dall'orchestratore)* nessuno dei tre flag d'arrivo resta muto o senza decisione | **soddisfatto**: uno era già chiuso, uno è chiuso adesso, il terzo è visibile per presenza con il valore grezzo e la ragione per cui non è per valore. Osservabile: W-43-14-F |

## Esiti del threat model

| ID | Disposizione | Esito |
|---|---|---|
| T-43-14-01 registro leggibile via API con la chiave anonima | mitigate | la pagina legge dal client normale, la policy è il confine, ed è scritto nel file che il cancello è il livello d'interfaccia. La prova è W-43-14-E passo 2 |
| T-43-14-02 il soggetto di un rifiuto legge la propria riga | mitigate | nessuna policy own-row e nessuna rotta; l'assenza è scritta come decisione, citando `community-membership.md` |
| T-43-14-03 un indirizzo email sulla superficie del registro | mitigate | il soggetto è codice + nome; nessuna colonna `email` è selezionata; asserito da grep |
| T-43-14-04 il `<select>` preso per il soffitto | mitigate | il commento sul filtro dice che il confine è `WritableRole` e il suo ri-test sul corpo della richiesta; aggiungere `master` aggiungerebbe un'opzione rifiutata, non una capacità |
| T-43-14-05 un atto di sistema con autore vuoto | mitigate | `actor_kind` è reso esplicito in `actorOf`, con la frase che dice che nessuna persona l'ha compiuto |
| T-43-14-06 un rifiuto come messaggio redatto | mitigate | `MemberActionNotice` disegna una causa per notifica; il messaggio dell'errore catturato non è letto in nessun punto dei due file, asserito da grep |
| T-43-14-07 `isStaff` "corretto" per includere `staff` | mitigate | **rinominata** `canReachManagementTools`, **e** commentata con la ragione esatta e con l'appartenenza alla fase 34 |
| T-43-14-SC installazioni di pacchetti | accept | **nessun pacchetto aggiunto**, `package.json` invariato |

## Known Stubs

Nessuno. Nessun valore vuoto codificato, nessun componente non cablato, nessun
TODO, nessuna copy segnaposto. **Le sei frasi che il piano 43-09 aveva marcato
provvisorie non lo sono più**, e il colore provvisorio lasciato da 43-05 è stato
deciso.

Due dipendenze esterne, che non sono stub ma vanno dette:

1. **Finché la migration di 43-07 non è deployata**, la pagina del registro
   disegna il proprio messaggio di lettura fallita. È vero, visibile e non
   silenzioso — ed è il deploy a renderla funzionante, non questo commit.
2. **Il flag `master=` ha una notifica per la categoria e non una per valore.**
   È dichiarato nel codice e sopra, con la ragione: il vocabolario dei valori
   non era leggibile da questo worktree e inventarlo sarebbe stato peggio che
   non gestire il flag. Chi possiede quel vocabolario aggiunge una frase per
   valore; nel frattempo il flag è visibile e il valore esatto è stampato. **Non
   è un segnaposto**: la frase mostrata è vera per qualunque valore.

## Threat Flags

Nessuna superficie di sicurezza nuova oltre a quelle già nel threat model del
piano. La rotta aggiunta, `/admin/members/register`, è dentro T-43-14-01.

## Self-Check: PASSED

File dichiarati, verificati presenti:

- `src/app/(admin)/admin/members/MemberActionNotice.tsx` — FOUND
- `src/app/(admin)/admin/members/register/page.tsx` — FOUND
- `src/components/admin/MemberTable.tsx` — FOUND, modificato
- `src/app/(admin)/admin/members/page.tsx` — FOUND, modificato
- `src/app/(members)/dashboard/page.tsx` — FOUND, modificato

Commit dichiarati, verificati nel log:

- `a790bf3` — FOUND
- `14156f0` — FOUND
- `ebea4d3` — FOUND

Perimetro:

- `git diff --name-only` sulla base elenca **esattamente** i cinque file
  dichiarati. I file dei piani 43-12 e 43-13 **non sono stati toccati**.
- Nessun indirizzo, nessun uuid, nessun nome di persona e nessun nome di sede
  compare in questo documento.
- `re:sonate` non compare in alcuna copy scritta da questo piano; dove compare in
  prosa, ha la **e normale**.
