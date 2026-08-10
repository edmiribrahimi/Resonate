# Phase 37: Manual Venue Reveal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 37-manual-venue-reveal
**Areas discussed:** perimetro dei difetti, cosa fa «rivela adesso», chi puo'
premerlo, la conferma e la traccia, il secondo tentativo, la lettura anonima
degli indirizzi

---

## Perimetro — quali difetti in coda entrano nella fase

| Option | Description | Selected |
|--------|-------------|----------|
| L'indirizzo leggibile senza sessione | Critico. Con la sola chiave pubblica una richiesta restituisce nome, indirizzo e link Maps delle serate segrete. Gia' assegnato a questa fase dal proprietario | ✓ |
| L'errore che restituisce la riga intera | Moderato. Su violazione di CHECK, PostgREST riporta la riga completa — che qui porta l'indirizzo | ✓ |
| Il redirect dopo il login senza allow-list | Moderato. Gemello di D7. Non tocca il venue | ✓ |
| Nessuno — solo quelli che scelgo dopo | La fase 37 fa solo il percorso manuale | |

**User's choice:** i primi tre.
**Notes:** il redirect del login viaggia con la fase per scelta, non perche' sia
la stessa materia — segnalato e registrato come tale in CONTEXT.md, da tenere
separato nei piani e nei commit.

---

## Cosa fa «rivela adesso»

| Option | Description | Selected |
|--------|-------------|----------|
| Entrambe, come il cron | Un solo atto: mail + apertura. Il manuale non inventa un terzo stato | ✓ |
| Solo la mail | La pagina apre all'orario previsto. Chi riceve la mail ha l'indirizzo comunque | |
| Due bottoni separati | Massimo controllo, raddoppia gli stati irreversibili possibili | |

**User's choice:** entrambe, come il cron.
**Notes:** conseguenza scoperta leggendo il codice e riportata subito: la pagina
pubblica **non guarda affatto** se la mail e' partita (`isVenueVisible` decide
con orario, biglietto e ruolo). «Entrambe» richiede quindi un predicato nuovo
che la pagina legga — diventato D-37-02.

---

## Chi arriva dopo la rivelazione

| Option | Description | Selected |
|--------|-------------|----------|
| Lo vede in pagina, senza mail | Nessuna mail in piu'. Il piu' semplice da spiegare e verificare | ✓ |
| Riceve la sua mail all'acquisto | La colonna esiste ma nessun codice manda quella mail: da costruire, non da riattivare | |
| Decidi tu | | |

**User's choice:** lo vede in pagina.
**Notes:** approfondito dopo, leggendo il codice: la colonna
`venue_reveal_on_purchase` **e' letta** — non per mandare mail, ma dentro
`isVenueVisible`, dove col default acceso fa vedere l'indirizzo al titolare di
biglietto **subito all'acquisto**. Registrato come D-37-03.1 perche' cambia cosa
la rivelazione manuale rende osservabile in pagina.

---

## Invio parziale

| Option | Description | Selected |
|--------|-------------|----------|
| Il numero, e il bottone che resta premibile | «20 su 50 inviate.» La serata resta rivelata, il rinvio ai mancanti resta possibile | ✓ |
| Un errore, e la serata resta non rivelata | Venti persone avrebbero l'indirizzo mentre il registro dice di no | |
| Solo una conferma generica | Il pattern gia' registrato come difetto sul form newsletter | |

**User's choice:** il numero, e il bottone che resta.

---

## Anticipo della rivelazione manuale

| Option | Description | Selected |
|--------|-------------|----------|
| Nessun limite — se lo conferma, si fa | Il freno e' la conferma, non un orario | ✓ |
| Solo dentro le 48 ore prima | Il manuale copre un cron caduto o un cambio dell'ultimo minuto | |
| Solo se la finestra automatica e' gia' aperta | Lettura piu' stretta della guardia monotona, ma rende il bottone inutile nel caso per cui esiste | |

**User's choice:** nessun limite.

---

## Chi vede l'indirizzo in pagina dopo la rivelazione

| Option | Description | Selected |
|--------|-------------|----------|
| Solo chi ha biglietto o RSVP | Esattamente chi riceve la mail. Gate *autorizzazione per destinatario* | ✓ |
| Ogni membro approvato | Allargamento reale, sull'unico interruttore che non torna indietro | |
| Chiunque, anche senza login | Cancella la distinzione fra un ospite e un passante | |

**User's choice:** solo biglietto o RSVP.
**Notes:** misurato subito dopo: oggi `isVenueVisible` **non ha alcun ingresso
per l'RSVP**, mentre il cron manda l'indirizzo anche agli RSVP. Allineare i due
e' quindi dentro il perimetro per conseguenza diretta di questa scelta —
D-37-03.2.

---

## Chi puo' premere il bottone

| Option | Description | Selected |
|--------|-------------|----------|
| Ogni organizer approvato | Quello deciso in roadmap. Chi ha creato la serata non ha titolo speciale | ✓ |
| Solo l'organizer che ha creato la serata | Il piu' stretto, ma lascia scoperto proprio il venerdi' per cui il bottone esiste | |
| Anche chi e' assegnato a quella notte | `party.manage` e' pensato per il lavoro della sera; la rivelazione avviene prima | |

**User's choice:** ogni organizer approvato.

---

## Un organizer non ancora approvato

| Option | Description | Selected |
|--------|-------------|----------|
| No — serve lo stato approvato | `staff.manage` ignora lo stato perche' nessuno va respinto davanti a una fila: ragione assente qui | ✓ |
| Si' — basta il ruolo | Coerente con le altre superfici di lavoro, ma un account non approvato potrebbe far uscire un indirizzo | |

**User's choice:** no, serve approvato — e quindi una chiave nuova.

---

## La conferma

| Option | Description | Selected |
|--------|-------------|----------|
| Il posto, il numero, e che non si torna indietro | Il numero trasforma un'astrazione in gente | ✓ |
| Lo stesso, piu' il nome della serata da digitare | Impedisce il clic per inerzia, ma l'attrito sbagliato produce il rinvio | |
| Solo si'/no | Non e' una conferma: e' un secondo clic | |

**User's choice:** posto, numero, irreversibilita'.

---

## Dove si legge la traccia

| Option | Description | Selected |
|--------|-------------|----------|
| Sulla serata, nella superficie di lavoro | E' anche il posto dove il secondo tentativo trova la sua risposta | ✓ |
| In un registro a parte | Si legge bene a stagione finita, male il venerdi' sera | |
| Tutte e due | Una seconda superficie e' comunque un elenco di indirizzi con una data | |

**User's choice:** sulla serata.

---

## Chi legge la traccia

| Option | Description | Selected |
|--------|-------------|----------|
| Chi gia' vede quella serata al lavoro | Nessuna chiave nuova, nessuna superficie in piu' da proteggere | ✓ |
| Chi legge il registro dei soci | Riuso di `register.read` | |
| Solo il master | Una traccia che quasi nessuno legge smette di essere un deterrente | |

**User's choice:** chi gia' vede quella serata.

---

## Con quale nome

| Option | Description | Selected |
|--------|-------------|----------|
| Nome e cognome della persona | Superficie di staff; la responsabilita' e' il punto dell'atto | ✓ |
| Il codice tessera, come il registro esistente | Coerenza col registro che non nomina nessuno; prezzo: tradurre un codice proprio quando vuoi sapere chi e' stato | |

**User's choice:** nome e cognome — deliberatamente diverso da `membership_acts`.

---

## Il secondo tentativo, a serata gia' rivelata

| Option | Description | Selected |
|--------|-------------|----------|
| Il bottone resta, spento, e dice quando e chi | Il rifiuto e' visibile invece che assente | ✓ |
| Il bottone sparisce del tutto | Lo spazio dove stava e' il posto dove la traccia si legge meglio | |
| Resta premibile e risponde «gia' fatto» | Dimostrabile a mano, ma invita a premere per vedere | |

**User's choice:** spento, con data e nome.

---

## I destinatari mancanti

| Option | Description | Selected |
|--------|-------------|----------|
| Cambia testo: «manda ai 12 che mancano» | Stessa posizione, numero esplicito, non rimanda ai raggiunti | ✓ |
| Resta «rivela adesso» col numero accanto | Il testo mentirebbe su cosa fa | |
| Niente — li prende il cron di stanotte | «Stanotte» puo' voler dire dopo l'apertura delle porte | |

**User's choice:** cambia testo.

---

## Il cron su una serata gia' rivelata a mano

| Option | Description | Selected |
|--------|-------------|----------|
| Completa cio' che manca, non rimanda il resto | Il cron diventa la rete sotto il percorso manuale | ✓ |
| Non tocca piu' quella serata | Comportamento di oggi; se il manuale lascia indietro dodici persone, restano senza indirizzo | |

**User's choice:** completa cio' che manca. Cambio di comportamento del cron,
dentro il perimetro.

---

## Ri-nascondere una serata gia' rivelata

| Option | Description | Selected |
|--------|-------------|----------|
| No, e il form deve impedirlo | Ri-nascondere e' una finzione che fa credere protetto cio' che non lo e' | |
| Si', ma solo il master | Una via d'uscita per l'errore di battitura — e la stessa porta serve l'illusione | ✓ |
| Fuori perimetro | Resterebbe possibile rivelare e poi rimettere segreto, con traccia e pagina che si contraddicono | |

**User's choice:** si', solo il master.
**Notes:** l'alternativa piu' stretta era stata presentata come raccomandata; la
scelta e' stata riaffermata e presa. Costruita con un vincolo che ne toglie
l'illusione: traccia append-only che non si cancella, e la serata continua a
dire «rivelato il … da …» anche dopo essere tornata segreta (D-37-17).

---

## La lettura anonima degli indirizzi

| Option | Description | Selected |
|--------|-------------|----------|
| Ne parliamo adesso | La decisione che puo' rompere qualcosa di visibile | |
| Lo decide chi pianifica | Vincolo in CONTEXT.md, forma del rimedio alla ricerca di fase | |
| Fuori dalla fase 37 | Torna in coda come todo | |
| **(risposta libera del proprietario)** | «La pagina delle venue puo' solo vederla la produzione (admin/organizer/staff). La pagina delle venue non e' pubblica» | ✓ |

**User's choice:** risposta libera — `/venues` esce dal pubblico e diventa
superficie di produzione.
**Notes:** sollevato subito che la decisione non copre il nome del locale sulla
pagina **evento**, che legge dalla stessa tabella con un embed annidato: se la
lettura si chiude senza costruire quella strada, l'embed per un anonimo non da'
errore, **restituisce vuoto**, e la serata perde il nome del locale in silenzio.

---

## Il locale sulla pagina pubblica di un evento

| Option | Description | Selected |
|--------|-------------|----------|
| Nome e indirizzo | Comportamento di oggi, coerente con le locandine che il locale lo nominano per esteso | ✓ |
| Solo il nome, mai l'indirizzo | Attrito senza guadagno per un bar pubblico | |
| Niente senza login | Contraddice una locandina gia' uscita | |

**User's choice:** nome e indirizzo, per le serate non segrete.

---

## Claude's Discretion

- La forma del predicato che collega la rivelazione manuale alla pagina
- Nome della capability nuova, sua riga in `capability-routes.ts` e in `keys.ts`
- Dove vive la traccia (colonne sulla serata / tabella append-only / riuso dello
  scrittore atomico), col vincolo della transazione unica
- La forma del rimedio alla lettura anonima, dopo aver misurato se lo stesso
  percorso esista via `events` o `event_media`
- Se le tre correzioni piegate vanno in piani propri o dentro i piani di fase

## Deferred Ideas

- Invio della mail al momento dell'acquisto per chi compra dopo la rivelazione —
  non e' mai esistito, sarebbe una fase sua
- Registro cronologico di tutte le rivelazioni manuali — scartato a favore della
  traccia sulla serata
- `profiles-email-not-unique` — nessun legame con la rivelazione
- `unchecked-count-reads-decide-money-paths` — alto, merita una fase propria:
  materia di `ticketing-payments.md`

---

## Ripensamento sul modello di visibilita' (stessa sessione, 2026-08-10)

Il proprietario ha **riaperto e rovesciato** la decisione «solo chi ha biglietto
o RSVP», in tre passaggi successivi. La versione finale e' in CONTEXT.md,
D-37-02. Qui la traccia del percorso, perche' la prima decisione era stata presa
esplicitamente e va detto perche' non vale piu'.

| Passaggio | Cosa ha chiesto | Cosa e' stato risposto |
|---|---|---|
| 1 | «chi compra vede subito; membro approvato vede solo al reveal» | Meta' era gia' il comportamento di oggi; l'altra meta' e' un allargamento che contraddice il gate *autorizzazione per destinatario* |
| 2 | tre livelli espliciti: ticket / approvato senza ticket / esterno | Funziona; resta da fissare **quale istante** e' «il reveal», perche' finestra e cron distano ore |
| 3 | «il cron non puo' girare esattamente quando si apre la finestra?» | No: la finestra e' un istante diverso per ogni serata, un cron ha orario fisso. Puo' solo passare piu' spesso — e la frequenza dipende dal piano Vercel |
| 4 | «la piattaforma rivela alla finestra, la mail e' una notifica che arriva dopo» | Scioglie l'obiezione: lo scarto non e' un'incoerenza. Il predicato della pagina diventa un **OR** — finestra aperta **oppure** rivelato a mano |

**Costo messo per iscritto e accettato:** piu' persone conoscono l'indirizzo di
quante ne entrano — vicinato, capienza 150–300, spazi privati senza licenza di
pubblico spettacolo. Il gate `venue-secrecy.md` *autorizzazione per destinatario*
va riscritto nello stesso commit (D-37-03).

**Proposte respinte dal proprietario, registrate perche' non tornino:**

| Proposta | Esito |
|---|---|
| Riscrivere l'oggetto della mail da `Venue Revealed` a promemoria | **Respinta** — resta `Venue Revealed` |
| Legare il livello 2 al fatto della rivelazione invece che alla finestra | **Respinta** — vince la finestra, con il ramo manuale in OR |

**Aperto alla chiusura della discussione:** l'RSVP conta come biglietto o come
membro senza biglietto (D-37-10). Domanda posta, non ancora chiusa.

**Non ancora noto:** il piano Vercel, che decide se la finestra puo' scendere
sotto le 24 ore (D-37-06, D-37-07).
