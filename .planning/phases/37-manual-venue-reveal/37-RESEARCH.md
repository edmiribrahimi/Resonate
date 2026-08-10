# Fase 37: Manual Venue Reveal — Ricerca

**Ricercato:** 2026-08-10
**Dominio primario:** Venue Secrecy — con Access & Gating, Supabase & Data,
Time & Scheduling, Next.js Architecture come domini secondari obbligatori
**Confidenza complessiva:** ALTA sulla misura del codice · MEDIA sulle forme
raccomandate (sono raccomandazioni, non decisioni) · ALTA sui limiti Vercel
(ri-verificati alla fonte oggi)

> **Questo file e' una pubblicazione.** `.planning/` e' tracciato e il repo e'
> pubblico. Qui non compaiono nomi di persone, indirizzi reali, sedi in
> trattativa, date non annunciate. Si parla di **ruoli**.

---

<user_constraints>
## User Constraints (da 37-CONTEXT.md)

### Decisioni bloccate — copiate verbatim

- **D-37-01 — Un solo atto, non tre.** «Rivela adesso» fa **entrambe** le cose
  che fa il cron: manda la mail con l'indirizzo ai titolari e apre l'indirizzo
  in pagina a chi ha titolo. Non esistono un bottone-solo-mail e un
  bottone-solo-pagina: due interruttori irreversibili producono stati che
  nessuno si aspetta, e non si tornano indietro per definizione.

- **D-37-02 — Tre livelli, un criterio ciascuno.**

  | Chi | Cosa vede | Da quando |
  |---|---|---|
  | Chi ha **un biglietto o un RSVP** | l'indirizzo | **subito, alla conferma** |
  | Membro approvato senza nessuno dei due | l'indizio, poi l'indirizzo | **all'apertura della finestra** |
  | Esterno, senza login o non approvato | solo l'indizio | mai |

  Il primo livello e' **gia' il comportamento di oggi per il biglietto**
  (`venue_reveal_on_purchase`, default `true`, letto da `isVenueVisible:103`).
  Il terzo pure. Due cose sono nuove:
  1. **Il livello 2 e' un allargamento** — oggi un approvato senza biglietto non
     vede l'indirizzo mai, prima della serata.
  2. **L'RSVP entra nel livello 1**, e oggi non c'e': `isVenueVisible` **non ha
     alcun ingresso per l'RSVP** — `party.userRsvp` e' recuperato e mai passato
     (sito di chiamata, `page.tsx:682-696`) — mentre il cron gli manda
     l'indirizzo come a un titolare (`api/cron/venue-reveal/route.ts:63-68`). Il
     ramo del livello 1 diventa «ha un biglietto **oppure** un RSVP».

- **D-37-03 — Un gate di casa va riscritto nello stesso commit.**
  `venue-secrecy.md`, gate *autorizzazione per destinatario*, dice: «la
  rivelazione e' per-biglietto e per-RSVP, mai per-evento; un percorso che
  rivela a tutti quelli dell'evento salta il controllo su chi ha effettivamente
  titolo». **Il livello 2 e' per-evento.** E' una decisione del proprietario,
  presa dopo che il costo era stato messo per iscritto. Il gate va aggiornato, o
  restera' a segnalare come violazione il comportamento voluto, e qualcuno lo
  «riparera'» fra sei mesi.

- **D-37-04 — Il predicato della pagina e' un OR: finestra aperta OPPURE
  rivelato a mano.** `isVenueVisible` **non legge mai**
  `event_parties.venue_reveal_email_sent`. Il ramo del livello 2 e' nuovo, e ha
  due ingressi: l'istante della finestra (che scatta da solo) e il fatto della
  rivelazione manuale (che scatta quando qualcuno preme). Vincolo: il ramo puo'
  solo **aggiungere** una concessione, mai modificare i rami esistenti.

- **D-37-05 — La mail e' una notifica, non la rivelazione.** La piattaforma
  rivela all'istante della finestra, la mail arriva alla prima corsa utile del
  cron. L'oggetto della mail resta `Venue Revealed`.

- **D-37-06 — La finestra non puo' essere piu' stretta dell'intervallo del
  cron. Minimo 25 ore, e il default diventa 25.** Quattro conseguenze: (1) la
  costante va in un posto solo, `src/utils/datetime.ts`; (2) il pavimento di
  validazione va da 1 a 25 con un messaggio che dice **perche'**; (3) alzare il
  fallback e' un allargamento autorizzato, da dichiarare nel commit; (4) le
  righe con un valore esplicito sotto 25 **non si sanano in silenzio** — si
  elencano e si portano al proprietario una per una; (5) il dialogo dell'indizio
  deve mostrare **la finestra effettiva**, non quella memorizzata.

- **D-37-07 — Il piano e' Hobby, e il cron non si puo' infittire.** Cron
  giornaliero, precisione ±59 min. **Non ri-dedurre il piano dai file.**
  Conseguenza di prodotto: il bottone manuale **non e' un'eccezione, e' il
  percorso affidabile**.

- **D-37-08 — Chi acquista dopo la rivelazione lo vede in pagina, senza mail.**
  Nessun invio all'acquisto viene costruito in questa fase.

- **D-37-09 — La cache diventa il rischio principale, e non lo era.**
  **Requisito di verifica di fase**, non solo di implementazione.

- **D-37-10 — L'RSVP conta come un biglietto: vede subito.**

- **D-37-11 — Nessun limite di anticipo.** Il freno e' la conferma.

- **D-37-12 — Invio parziale: il numero, e il bottone che resta.** Chi ha
  premuto legge **quanti su quanti**. La serata resta segnata come rivelata, il
  bottone resta raggiungibile per i mancanti. Non replicare il `console.error`
  del cron.

- **D-37-13 — Master e ogni organizer approvato.** Non solo chi ha creato la
  serata.

- **D-37-14 — Serve lo stato approvato, e quindi una chiave nuova**, con
  `requires_approved = true`, sul modello di `catalogue.manage`.

- **D-37-15 — L'assegnazione per-serata non basta.** `party.manage` governa il
  lavoro della sera; la rivelazione avviene prima e non si annulla.

- **D-37-16 — La conferma nomina tre cose:** il posto, **quante persone**
  riceveranno l'indirizzo, e che non si torna indietro. Nessuna digitazione.

- **D-37-17 — La traccia sta sulla serata**, nella superficie di lavoro.

- **D-37-18 — Nome e cognome, e chi gestisce la serata la legge.**
  Deliberatamente diversa da `membership_acts`. Nessuna chiave di lettura nuova.

- **D-37-19 — Bottone spento che dice quando e chi**, non bottone sparito.

- **D-37-20 — Con destinatari mancanti il bottone cambia testo**, non stato:
  «manda ai N che mancano». Il conteggio e' per destinatario.

- **D-37-21 — Il cron diventa la rete sotto il percorso manuale.** Passando su
  una serata gia' rivelata a mano, **completa cio' che manca**. Cambio di
  comportamento del cron — dentro il perimetro, ed e' Critical.

- **D-37-22 — Ri-nascondere e' possibile, solo per il master, e non produce
  l'illusione.** Vincolo: **la traccia e' append-only e non si cancella**.

- **D-37-23 — `/venues` esce dal pubblico.**

- **D-37-24 — Sulla pagina pubblica di un evento, nome e indirizzo del locale
  restano visibili per le serate NON segrete**, anche senza login.

- **D-37-25 — Il guasto da evitare ha una forma nota.** L'embed annidato
  `venues(...)` per un lettore anonimo **non da' errore: restituisce vuoto**.
  **La verifica di questa fase deve guardare la pagina con la chiave anonima.**

### Claude's Discretion (deciso da chi pianifica)

- La **forma** del predicato di D-37-04. Vincolo: solo-aggiunge.
- **Nome e riga** della capability di D-37-14, in `capability-routes.ts` e in
  `keys.ts`.
- **Dove vive la traccia** di D-37-17/18. Vincolo: riga e traccia in **una
  transazione**, come `public.record_party_assignment_act`.
- La **forma del rimedio** alla lettura anonima (D-37-23/24). **Precondizione:**
  misurare **prima** se lo stesso percorso esista anche via `events` o
  `event_media`.
- Se le tre correzioni piegate vanno in un piano proprio o dentro i piani.

### Deferred (FUORI PERIMETRO)

- Invio della mail al momento dell'acquisto (D-37-08).
- Registro cronologico separato di tutte le rivelazioni manuali.
- Uno scheduler diverso da Vercel Cron (`pg_cron`, pinger esterno).
- `profiles-email-not-unique.md`, `unchecked-count-reads-decide-money-paths.md`.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Descrizione (REQUIREMENTS.md) | Cosa di questa ricerca lo abilita |
|---|---|---|
| **VENUE-01** | *The scheduled reveal remains the normal path* | § E (finestra 25h, costante unica in `datetime.ts`), § D.3 (il cron resta il percorso normale e diventa la rete), § F (la pagina non puo' essere servita stale attraverso l'istante) |
| **VENUE-02** | *A master or an organizer can trigger the reveal by hand, behind an explicit confirmation, recording who did it and when* | § C (la 13ª capability, forma esatta), § D.1 (estrazione del cuore del cron), § D.4 (lo scrittore atomico riga+atto), § D.5 (la guardia del secondo tentativo e del ri-nascondere) |

</phase_requirements>

---

## Project Constraints (da CLAUDE.md e dai gate di dominio)

> Direttive **non negoziabili**. Un piano che le contraddice e' sbagliato anche
> se funziona.

| # | Direttiva | Fonte | Conseguenza per questa fase |
|---|---|---|---|
| 1 | `venue_reveal_sent` e' una **guardia monotona** — un intervento puo' solo renderla piu' difficile da far scattare, salvo autorizzazione documentata nel commit | `meta-gates.md`, `venue-secrecy.md` | Il default 24→25h e il livello 2 sono **due allargamenti autorizzati**: entrambi vanno dichiarati nel commit, uno per uno |
| 2 | **Il middleware e' UX, la RLS e' sicurezza** | `CLAUDE.md` principio 2, `access-gating.md` gate *RLS-e'-il-confine* | Il rimedio a D-37-23/24 **deve** essere una policy. Spostare `/venues` sotto `(admin)` **non chiude** la lettura anonima di `public.venues` |
| 3 | **Nessun test runner per il prodotto.** `package.json` non ha `test` (verificato oggi, riga 5-19) | `CLAUDE.md` guardrail 1 | «Verificato» = `npm run build` + procedura manuale scritta. Nessun piano puo' promettere test |
| 4 | **Nessun error tracking.** Un errore loggato non raggiunge nessuno | `meta-gates.md` | Ogni fallimento di questa fase (invio parziale, rifiuto della guardia, embed vuoto) deve avere un **effetto osservabile**, non un `console.error` |
| 5 | **Default chiuso** — se lo stato di rivelazione non e' determinabile, il venue **non si mostra** | `venue-secrecy.md` | Il nuovo ramo OR deve fallire verso il segreto, non verso l'indirizzo |
| 6 | **Rimozione per chiave primaria, mai per interfaccia**; il contatore non legge la superficie che ha mosso; l'istantanea copre le cascate; l'autorizzazione a scrivere in produzione si consuma una volta | `ai-engineering.md`, quattro gate post-incidente fase 36 | Vincola tutta la § Validation Architecture |
| 7 | **`.planning/` e' pubblico**: si nominano ruoli, mai persone; mai sedi in trattativa, date non annunciate, indirizzi | `ai-engineering.md`, gate *la pianificazione e' pubblica* | Vale per PLAN, SUMMARY, VERIFICATION di questa fase. **La traccia D-37-18 nomina la persona nel DATABASE, mai in un documento di pianificazione** |
| 8 | Una migration gia' applicata **non si modifica**; DDL idempotente; policy `PERMISSIVE` sono in **OR**; tipi allineati in `src/types/database.ts` nello stesso commit | `supabase-data.md` | Il rimedio a `venues_select_public` e' `DROP POLICY` + `CREATE POLICY` in una migration **nuova** |
| 9 | Un valore `date`+`time` **non si passa mai a `new Date()`** | `time-and-scheduling.md` | Vale per ogni nuovo calcolo di finestra |
| 10 | Ogni superficie che mostra il venue va marcata **dinamica e non cacheabile** | `venue-secrecy.md` gate *cache e pre-render*, `nextjs-architecture.md` gate *service worker* | § F |
| 11 | Una server action e' un **endpoint pubblico**: ri-chiede la capability al proprio interno | `nextjs-architecture.md` gate *server action autorizzata* | L'action di rivelazione ri-chiede la 13ª chiave dentro se stessa |
| 12 | La categoria di un rifiuto viaggia come **valore di ritorno**, mai come messaggio lanciato (Next redige i messaggi delle Server Action in produzione) | D-36-10, `src/lib/capabilities/server.ts:59-63` | Il `catch` ramifica su `error.code`, mai sul testo |

---

## Summary

La fase ha **quattro corpi distinti** che il piano deve tenere separati perche'
falliscono in modi diversi, e uno di essi e' la vera novita' del perimetro.

**Il primo e' il modello a tre livelli (§ A).** E' l'unica cosa che *allarga*
chi vede un indirizzo, e va costruita come un ramo che **si aggiunge in coda** a
`isVenueVisible` — non come una riscrittura del predicato. La misura ha
confermato punto per punto quello che CONTEXT.md dichiara: `isVenueVisible`
(`src/app/(public)/events/[slug]/page.tsx:87-117`) non legge mai lo stato di
rivelazione della serata, e l'RSVP non arriva mai fino a li' — e non solo non
viene passato, **non viene nemmeno recuperato** su una serata a pagamento
(`page.tsx:303-322`: `userRsvp` si popola solo se `access_type === "free_rsvp"`).

**Il secondo e' la lettura anonima (§ B),** e la precondizione dichiarata dal
todo e' stata eseguita: `events` **non ha piu' alcuna colonna di indirizzo** —
`location`, `preparty_location` e `afterparty_location` furono eliminate da
`20260225150000_party_architecture.sql:164-171` — e `event_media` **non e'
leggibile da `anon`**, perche' tutte le sue policy `SELECT` sono `TO
authenticated`. Quindi la porta anonima e' **una sola** a livello di RLS:
`venues_select_public` composta con `event_parties_select_published`. Ma la
misura ne ha trovata **una seconda, che non e' RLS**: la lista eventi costruisce
`venue_address` e `venue_google_maps_url` per **ogni** serata, segrete comprese,
e li passa a `EventTabs.tsx`, che e' `"use client"` — quindi finiscono nel
**payload RSC** di ogni visitatore, anonimi inclusi, senza essere renderizzati
da nessuna parte. E' una fuga nel bundle, non nel database, e chiuderla costa
due righe.

**Il terzo e' il percorso manuale (§ C, § D).** Il vincolo che decide la forma
non e' di stile: `event_parties_update_own` richiede `staff.manage` **e**
(master **oppure** proprietario dell'evento)
(`20260807020000_wrap_auth_uid.sql:145-155`). Un organizer approvato che **non**
ha creato quella serata — cioe' esattamente il caso per cui D-37-13 esiste — non
puo' scrivere quella riga con la propria sessione. La scrittura deve quindi
passare da una funzione `SECURITY DEFINER` eseguibile dal solo `service_role`,
che e' precisamente la forma di `public.record_party_assignment_act`. Non e' una
scelta architettonica: e' l'unica forma compatibile con D-37-13 e con la RLS
esistente.

**Il quarto e' la finestra e il tempo (§ E, § F).** I limiti Vercel sono stati
ri-verificati alla fonte oggi e confermano D-37-07 alla lettera. Il default 25
ore e' aritmeticamente giusto: due corse consecutive di `0 6 * * *` con ±59
minuti possono distare **24h59m**, quindi 24 ore non contengono garantitamente
una corsa e 25 si'. E il build misurato oggi dice che `/events`, `/events/[slug]`
e `/venues/[slug]` sono **tutte e tre ƒ (Dynamic)** — ma per *derivazione* da
`cookies()`, non per dichiarazione: nessuna delle tre ha `export const dynamic`.

**Raccomandazione primaria:** una **colonna dedicata `venue_revealed_at
timestamptz`** su `event_parties` come ingresso manuale dell'OR, **piu'** una
tabella append-only propria per la traccia, scritte insieme da una funzione
`SECURITY DEFINER` sul modello di `record_party_assignment_act`. Il riuso di
`venue_reveal_email_sent` come predicato di pagina e' da respingere, e la
ragione e' misurata: quel flag viene alzato dal cron **anche quando i
destinatari sono zero** (`route.ts:108-115`), quindi aprirebbe la pagina su una
serata che il cron ha solo spazzato.

---

## Architectural Responsibility Map

| Capability | Tier primario | Tier secondario | Perche' quel tier la possiede |
|---|---|---|---|
| Decidere **chi vede un indirizzo** | **Database (RLS)** | Frontend Server (rendering) | `CLAUDE.md` principio 2. Oggi e' invertito — decide un `if` in una pagina — ed e' il difetto critico che la fase chiude |
| Rendere l'indirizzo o l'indizio | Frontend Server (RSC) | — | `isVenueVisible` gira sul server; nessun dato di venue deve attraversare il confine client |
| Innescare la rivelazione manuale | Frontend Server (Server Action) | Database (`SECURITY DEFINER`) | L'action autentica e conta; **la scrittura e la sua traccia stanno nel database**, in una transazione, perche' due chiamate PostgREST non sono atomiche |
| Scrivere `venue_revealed_at` + traccia | **Database (funzione)** | — | D-37-13 richiede un organizer non proprietario; la RLS di `event_parties` non lo permette. Vedi § D.4 |
| Spedire le mail | Frontend Server (route handler / modulo condiviso) | — | Resend e' un servizio esterno; il cron e il percorso manuale devono condividere **un solo** modulo |
| Programmare la rivelazione | **Vercel Cron** | Database | Vincolo di piano: giornaliero, ±59 min. Non spostabile in fase 37 |
| Non servire una pagina stale attraverso l'istante | Frontend Server (Next) | Browser (Serwist) | Due cache diverse, due rimedi diversi: § F |
| Raggiungibilita' di `/venues` | Frontend Server (`capability-routes.ts`) | — | **Non e' un confine di dati.** Chiude l'indirizzo *in pagina*, non *nel database* |

---

## A. Il modello di visibilita' a tre livelli

### A.1 — Il predicato di oggi, ramo per ramo (misurato)

`src/app/(public)/events/[slug]/page.tsx:87-117`. Riportato integralmente
perche' ogni riga e' un ramo che il piano non deve toccare:

| Riga | Ramo | Verdetto | Nota |
|---|---|---|---|
| **100** | `if (!opts.venueSecret) return { visible: true, hint: null }` | visibile | serata non segreta: § D-37-24 vive qui |
| **101** | `if (opts.isMasterRole \|\| opts.isOrganizer)` | visibile | `isOrganizer` **non e' il ruolo**: e' `event.created_by === user.id` (`page.tsx:192`). Un organizer che non ha creato l'evento **non** passa da qui |
| **103-105** | `if (opts.venueRevealOnPurchase && (hasTicketForParty \|\| hasMasterTicket))` | visibile | **il livello 1 di oggi**, per il solo biglietto |
| **106-107** | `partyStart = partyStartInstant(date, time)`; `now = new Date()` | — | conversione corretta, passa da `datetime.ts` |
| **109** | `if (now > partyStart && opts.isApproved)` | visibile | serata passata + approvato |
| **111-115** | `if (isApproved && (hasTicketForParty \|\| hasMasterTicket))` con `hours = venueRevealHours ?? 24` | visibile se `hoursUntil <= hours` | **il ramo temporale di oggi**, e richiede comunque il biglietto |
| **116** | `return { visible: false, hint: venueSecretHint }` | indizio | **il livello 3 di oggi** |

**Verifica delle citazioni di CONTEXT.md** — tutte confermate:
`venue_reveal_on_purchase` a `:103` ✓; `?? 24` a `:112` ✓; assenza totale di
`venue_reveal_email_sent` nel predicato ✓ (e la colonna **non e' nemmeno
selezionata** dalla query, `page.tsx:223`).

**Una sola deriva, minima:** CONTEXT dice sito di chiamata `682-696`; l'espressione
`isVenueVisible({` comincia a **683** e chiude a **696**; `682` e'
`const hasTicketForParty = !!party.userTicket;`, che ne fa parte a tutti gli
effetti. Nessuna correzione necessaria.

### A.2 — Come `userRsvp` arriva (o non arriva) al predicato

Misurato, e il difetto e' piu' profondo di «non e' passato»:

1. `PartyWithTiers` dichiara `userRsvp: { id: string } | null` (`page.tsx:83`).
2. Il popolamento e' **condizionato al tipo di accesso** (`page.tsx:303-322`):
   `userTicket` si legge **solo se** `party.access_type === "paid"`;
   `userRsvp` **solo se** `party.access_type === "free_rsvp"`.
3. Il campo arriva nell'oggetto restituito (`page.tsx:360`) e **non viene mai
   letto** dal sito di chiamata di `isVenueVisible` (`page.tsx:683-696`).

**Il cablaggio minimo corretto** e' quindi una riga sola, e una riga sola:

```
hasRsvpForParty: !!party.userRsvp
```
aggiunta alla firma di `isVenueVisible` e al sito di chiamata, con il ramo `103`
che diventa `(hasTicketForParty || hasMasterTicket || hasRsvpForParty)`.

**Non serve una nuova query** — il dato e' gia' recuperato — e non serve toccare
la condizione `access_type`, perche' una serata a RSVP non ha biglietti e una a
pagamento non ha RSVP. **Ma va scritto nel piano che quella condizione esiste**,
o il prossimo lettore concludera' che `userRsvp` e' `null` per un bug.

⚠️ **Una nota di correttezza sul ramo 103.** Il ramo 1 e' oggi guardato da
`venueRevealOnPurchase`. Un RSVP non e' un acquisto: legare l'RSVP a
`venue_reveal_on_purchase` significa che spegnere quel flag su una serata a RSVP
toglierebbe l'indirizzo a chi ha dichiarato che viene, **mentre il cron
continuerebbe a mandarglielo** (`route.ts:63-68` non consulta quel flag). Questo
ricrea esattamente l'asimmetria che D-37-10 esiste per eliminare.
**Raccomandazione:** l'RSVP entra nel livello 1 **incondizionatamente**, fuori
dalla guardia `venueRevealOnPurchase`. Costo: una riga in piu'. Alternativa:
metterlo dentro la guardia e accettare l'asimmetria — sconsigliata, perche'
riapre il difetto che la decisione chiude.

### A.3 — Cosa porta la sessione a quel punto della pagina

Risolto **server-side, una volta per richiesta**, prima della query delle serate:

- `page.tsx:152` — `const { capabilities, role, status } = await getAccessContext();`
- `page.tsx:167-168` — `const isApproved = status === "approved"` e
  `const isMasterRole = role === "master"`
- `getAccessContext` e' `cache()`-scoped (`src/lib/capabilities/server.ts:338`) e
  usa il **client anon legato ai cookie**, mai il service client
  (`server.ts` docblock, righe 21-31)

**Conclusione: il ramo del livello 2 non richiede alcuna lettura nuova.**
`isApproved` e' gia' li' e gia' passato al predicato (`page.tsx:689`).

Il docblock a `page.tsx:154-166` e' un vincolo scritto di casa e va letto prima
di toccare quelle due righe: dichiara che `isApproved`/`isMasterRole` **non sono
presentazionali** perche' entrano in `isVenueVisible`, e che la conversione a
capability sarebbe «un cambio di VERDETTO su un percorso di rivelazione». La
fase 37 **e' autorizzata a cambiare quel verdetto** (D-37-02), ma il docblock
va aggiornato nello stesso commit — stessa regola di D-37-03 per il gate.

### A.4 — La forma dell'ingresso «rivelato a mano» — tre opzioni, una raccomandata

| Opzione | Cosa e' | Pro | Contro misurato |
|---|---|---|---|
| **A. Colonna dedicata `venue_revealed_at timestamptz`** su `event_parties` | l'**istante** dell'atto manuale, `NULL` = mai rivelato a mano | Porta il *quando* di D-37-17 gratis · distingue «qualcuno ha premuto» da «il cron ha finito di spedire» · e' `NULL`-abile, quindi D-37-22 la azzera mentre la traccia sopravvive · limita il braccio di completamento del cron (§ D.3) | Una colonna nuova su tabella popolata → `supabase-data.md` gate *default sulle righe esistenti*: nullable senza `DEFAULT`, le righe esistenti restano `NULL`, che e' il valore giusto |
| **B. Riuso di `venue_reveal_email_sent`** | il booleano che il cron gia' alza | Zero migration | **Da respingere.** Il cron lo alza **anche con zero destinatari** (`route.ts:108-115`): aprirebbe la pagina su una serata solo spazzata. E' un booleano: non dice *quando*, quindi D-37-17 avrebbe comunque bisogno di altro. E D-37-22 dovrebbe abbassarlo — cioe' far **retrocedere** la guardia monotona sull'unico campo che la rappresenta oggi |
| **C. Ricavarlo dalla traccia** (`EXISTS` sulla tabella degli atti) | nessuna colonna | Una sola fonte di verita' | Una join per serata sulla pagina pubblica piu' calda del sito; e D-37-22 dovrebbe essere rappresentata come un *atto di ri-nascondere* da interpretare in ordine — cioe' ricostruire uno stato leggendo una storia, ogni richiesta |

**Raccomandata: A.** Con questa nota di correttezza, perche' e' la parte che si
sbaglia: **la colonna non e' `venue_reveal_email_sent` con un nome nuovo.** Sono
due fatti distinti — *l'atto e' avvenuto* e *le mail sono partite* — e la fase
esiste proprio perche' possono divergere (D-37-05, D-37-12). Vanno tenute
separate anche quando coincidono.

Il ramo nuovo, in coda ai rami esistenti e senza toccarne nessuno:

```
// dopo il ramo 111-115, prima del return finale
if (opts.isApproved && (opts.revealedAt !== null || hoursUntil <= hours)) {
  return { visible: true, hint: null };
}
```

Vincoli che il piano deve far rispettare, tutti da `venue-secrecy.md`:
- il ramo si **aggiunge**, non modifica: `hasTicketForParty` non compare
- un `revealedAt` non parsabile o una query rifiutata → **indizio**, non
  indirizzo (gate *default chiuso*)
- `revealedAt` va **aggiunto alla `select` di `page.tsx:223`**, altrimenti
  arriva `undefined` e il ramo e' morto senza errore

---

## B. La lettura anonima degli indirizzi

### B.1 — La precondizione del todo, eseguita: `events` e `event_media`

> *«misurare prima se lo stesso percorso esista anche via `events` o
> `event_media`, o si chiude una porta su un muro che ne ha due»*

**Enumerazione completa delle policy `SELECT` che compongono una lettura anonima
di un nome/indirizzo/link Maps** — letta dalle migration, non dedotta:

| Tabella | Policy `SELECT` | Predicato | Raggiungibile da `anon`? | Porta un indirizzo? |
|---|---|---|---|---|
| `public.venues` | `venues_select_public` (`20260226200000_venues.sql:25-27`) | **`using (true)`** | **SI'** | **SI'** — `address`, `google_maps_url` |
| `public.event_parties` | `event_parties_select_published` (`20260225150000_party_architecture.sql:31-37`) | evento con `is_published = true` | **SI'** | **`venue_text`** — testo libero. Se qualcuno vi scrive un indirizzo, e' pubblico oggi |
| `public.event_parties` | `event_parties_select_admin` (`20260807010000:236`) | `staff.manage` | no | — |
| `public.events` | `events_select_published` (`schema.sql:168-169`) | `is_published = true` | SI' | **NO** — `location`, `preparty_location`, `afterparty_location` **eliminate** da `20260225150000_party_architecture.sql:164-171`; `location_secret` rinominata `venue_secret` da `20260226300000:38`. Restano `title, slug, description, date, time, lineup, cover_image, …` |
| `public.event_media` | `event_media_select_approved` (`20260225120000_phase7_media.sql:25-28`) | **`TO authenticated`** + `status='approved'` | **NO** | `caption` — testo libero |
| `public.event_media` | `event_media_select_own` / `_admin` (`:30-38`) | `TO authenticated` | **NO** | — |
| `storage.objects` | `venue_photos_select_public` (`20260226200000:70-72`) | `bucket_id = 'venue-photos'` | SI' | una **foto** puo' identificare un luogo — `venue-secrecy.md` gate *indizio non equivalente all'indirizzo* |

**Risposta alla precondizione, in una riga: no, il muro ha una sola porta RLS**
— `venues`. `events` non ha piu' colonne di indirizzo; `event_media` non e'
leggibile da `anon` (le vecchie policy larghe `event_media_select_all`
`using (true)` e `event_media_all_admin` sono state **droppate** da
`20260225120000_phase7_media.sql:19-20`).

**Ma due percorsi non-RLS restano aperti, e vanno detti:**

1. **`event_parties.venue_text`** e' leggibile da `anon` per ogni serata di un
   evento pubblicato, **anche segreta**. E' un campo libero: nulla impedisce che
   qualcuno vi scriva un indirizzo. Le due serate segrete misurate dal todo non
   lo usano — ma questo e' un fatto sui dati di oggi, non una garanzia.
   *Fuori dal perimetro dichiarato; da registrare, non da riparare qui.*
2. **`event_media` e' leggibile da OGNI account autenticato**, `pending` e
   `rejected` compresi, se lo stato del media e' `approved`. Su una serata
   segreta questo significa che una foto della sede raggiunge chiunque abbia un
   account. *Fuori perimetro; materia di `media-and-storage.md`.*

### B.2 — La seconda fuga, misurata oggi, che nessun todo aveva registrato

**`venue_address` e `venue_google_maps_url` finiscono nel payload RSC della
lista eventi per ogni visitatore, serate segrete comprese.**

La catena, riga per riga:

1. `src/app/(public)/events/page.tsx:212` seleziona
   `venues(name, address, google_maps_url)` per **ogni** serata.
2. `page.tsx:268-275` costruisce `VenueInfo` con `venue_address` e
   `venue_google_maps_url` **senza guardare `venue_secret`** — il flag e'
   affiancato come dato, non usato come filtro.
3. `page.tsx:350` mette l'array `venues` nella `EventCard`.
4. `EventTabs.tsx:1` e' **`"use client"`**, e riceve quelle card come prop.
5. `EventTabs.tsx:246-259` rende **solo** `venue_secret ? "Secret Venue" :
   venue_name ?? venue_text`. **`venue_address` e `venue_google_maps_url` non
   sono renderizzati da nessuna parte** — l'unica altra occorrenza in tutto
   `src/` e' la loro dichiarazione di tipo (`EventTabs.tsx:13-14`).

Sono quindi **prop morte che viaggiano comunque**: Next serializza ogni prop di
un componente client nel payload RSC, letto da chiunque apra `/events`.
`nextjs-architecture.md`, gate *segreti nel bundle*: «tutto cio' che sta in un
componente client finisce nel browser».

**Perche' conta anche dopo il rimedio RLS:** se la policy si stringe, questi due
campi arriveranno `null` e la fuga si chiude per caso. Se invece il rimedio
scelto e' una **vista/RPC che continua a servire l'indirizzo delle serate non
segrete** (che e' cio' che D-37-24 impone), la fuga **resta**, perche' la query
non discrimina. **Vanno tolti a mano**, e il modo piu' stretto e' non
selezionarli affatto: `EventTabs` non li usa, quindi si possono eliminare dalla
`select` di `page.tsx:212`, dall'interfaccia `VenueInfo` e da `EventTabs.tsx`,
senza cambiare un pixel.

**La pagina di dettaglio e' pulita, misurato.** `venues(id, name, slug, address)`
(`events/[slug]/page.tsx:223`) resta lato server: nessuno dei sei componenti
client della pagina (`TierSelection`, `RsvpButton`, `MyDrinks`,
`PendingIntentHandler`, `ShareButton`, `MediaGallerySection`) riceve l'oggetto
`party` o il venue. `SecretVenueDialog` riceve solo `hint`, due booleani e due
scalari (`page.tsx:779-785`).

### B.3 — Le forme del rimedio a `venues_select_public`

`venues_select_public` non e' mai stata ridefinita: le tre migration successive
che toccano `public.venues` riscrivono solo `insert`, `update` e `delete`
(`20260807010000:401-417`). Le policy `PERMISSIVE` sono in **OR**
(`supabase-data.md`), quindi **finche' quella riga esiste, nessuna policy
aggiunta puo' restringere**: va `DROP`-ata in una migration nuova.

| Opzione | Forma | Cosa succede al lettore anonimo di una serata NON segreta (D-37-24) | Cosa succede all'embed `venues(...)` a `events/page.tsx:212` e `events/[slug]/page.tsx:223` |
|---|---|---|---|
| **R1 — Policy condizionata sulla serata** | `DROP venues_select_public` + `CREATE POLICY venues_select_non_secret ... USING (EXISTS (SELECT 1 FROM event_parties ep JOIN events e ON e.id=ep.event_id WHERE ep.venue_id = venues.id AND e.is_published AND ep.venue_secret = false))` + una policy per lo staff | **Funziona** — la sede appare perche' almeno una serata pubblicata non segreta la nomina | **Funziona.** L'embed torna la riga per le sedi «sdoganate», `null` per le altre |
| **R2 — Revoca totale ad `anon` + RPC dedicata** | `DROP venues_select_public`; una funzione `SECURITY DEFINER` `public.public_venue_for_party(party_id)` | Funziona, ma **riscrive le due pagine**: l'embed sparisce, arriva una `rpc()` per serata | **Rompe entrambi gli embed** — e li rompe in modo silenzioso finche' non si riscrivono |
| **R3 — Nessuna policy per `anon`, lettura solo autenticata** | `CREATE POLICY ... TO authenticated` | **Rompe D-37-24**: un visitatore senza login perde il nome del locale di ogni serata | idem |
| **R4 — Colonne separate** (`REVOKE SELECT (address, google_maps_url)`) | revoca a livello di colonna | Funziona per il nome, **rompe D-37-24 sull'indirizzo** | **Trasforma un innocuo `select=*` in `42501`** — precedente gia' rifiutato dal progetto con la sua ragione scritta (`20260810120000_formats_and_series.sql:1018-1023`) |

**Raccomandata: R1.** E' l'unica che soddisfa D-37-24 **senza** riscrivere due
pagine pubbliche, e vive dove il progetto dice che deve vivere. Il costo va
detto: e' un `EXISTS` su due tabelle dentro una policy, quindi va scritto nella
forma `(select …)` che il progetto ha gia' adottato per gli InitPlan
(`20260807000000_capability_model.sql:177-184`) e va guardato sul piano
delle prestazioni con `EXPLAIN`, perche' `/events` la esegue per ogni sede
dell'elenco.

**Il caso di bordo che R1 apre, e che va deciso esplicitamente:** una sede che
ospita **sia** una serata pubblica **sia** una segreta diventa leggibile per la
prima e quindi anche per la seconda — l'`EXISTS` e' per-sede, non per-serata.
E' lo stesso caso che la pagina pubblica delle sedi tratta gia' oggi
**scegliendo di nascondere** (`(public)/venues/[slug]/page.tsx:65-70`: «due
serate alla stessa sede, una ancora segreta e una rivelata: **l'evento viene
trattenuto**»). Il piano deve scegliere consapevolmente fra le due letture, e la
piu' coerente col gate *default chiuso* e' quella gia' scritta li'.

### B.4 — Il guasto silenzioso di D-37-25, e come si rileva

La forma e' documentata **due volte nel codice corrente**, con la misura
accanto: `events/page.tsx:196-204` e `events/[slug]/page.tsx:201-215`. La
misura originale sta in `.planning/phases/36-formats-series-numbering/36-11-SUMMARY.md:159-170`:

```
A: HTTP 300 — code=PGRST201
   message="Could not embed because more than one relationship was found for
            'event_parties' and 'party_series'"
B: HTTP 200 — (con !event_parties_series_id_fkey)
```

e la conseguenza, citata da `36-11-SUMMARY.md:25-27`: *«PostgREST risponde a un
embed malformato o rifiutato con `data: null` e nessuna eccezione»* — la pagina
rende «nessun evento» e nulla protesta.

**Quali rimedi producono il guasto silenzioso:**

| Rimedio | Guasto |
|---|---|
| **R1** | **Nessun `data: null`.** L'embed resta valido; le righe rifiutate arrivano `null` **per elemento** — la serata c'e', il suo `venues` e' `null`. Silenzioso lo stesso, ma **localizzato**: si vede come «serata senza nome del locale», non come «nessun evento» |
| **R2** | L'embed diventa **inesistente** → `PGRST200`/`PGRST201`, `data: null`, **tutta la lista sparisce** |
| **R3** | come R1, ma su **tutte** le sedi per un lettore anonimo |

**Come un piano lo rileva** — e' gia' costruito, e va usato invece che
reinventato: entrambe le pagine **ramificano su `error.code`**
(`events/page.tsx:280-285`, `events/[slug]/page.tsx:237-243`): un rifiuto del
database porta un codice ed e' **lanciato** verso l'error boundary; un guasto di
trasporto no. Un piano che introduce R1 deve verificare che il `venues` `null`
**per elemento** non passi da quel controllo — perche' non e' un errore di
query — e quindi va rilevato **dalla verifica anonima contro la pagina vera**,
non dal codice.

### B.5 — Dove va `/venues`, e cosa chiede `capability-routes.ts`

Misurato: esistono **due** pagine venue, e solo una e' pubblica.

- `src/app/(admin)/admin/(work)/venues/page.tsx` — la superficie di lavoro, gia'
  legata a `organizer.access` (`capability-routes.ts:252`)
- `src/app/(public)/venues/[slug]/page.tsx` — la scheda pubblica, **quella che
  esce** (D-37-23)

**Cosa serve per spostarla,** letto dai tre lettori della dichiarazione:

1. **Il file** va sotto `(admin)/admin/(work)/venues/[slug]/page.tsx`.
   `nextjs-architecture.md`, regola **R-WORK-ROUTES**: dentro `(work)` **solo
   `page.tsx` e `loading.tsx`**. `EditVenueButton` e ogni componente co-locato
   restano a `src/app/(admin)/admin/venues/…`.
2. **Una riga in `capability-routes.ts`** per `/admin/venues/[slug]`. La chiave
   coerente con la sorella `/admin/venues` e' `CAP.ORGANIZER_ACCESS`
   (`capability-routes.ts:252`). ⚠️ **Attenzione all'ambiguita' di pattern:**
   `COMPILED_PATTERNS` **lancia al primo import** se due pattern con lo stesso
   numero di segmenti e di segmenti dinamici possono combaciare
   (`capability-routes.ts:543-572`). `/admin/venues/[slug]` (3 segmenti, 1
   dinamico) **non collide** con nulla di esistente — verificato: nessun altro
   pattern a 3 segmenti con un dinamico in terza posizione.
3. **`_everyStaffRouteIsBound` non lo vedra'** — l'assertion copre solo le rotte
   **statiche** (`capability-routes.ts:60-77`). Il controllo che lo vede e'
   **`npm run verify:routes`**, che censisce i `page.tsx` da disco
   (`scripts/verify-routes.mjs:419`).
4. **`scripts/verify-routes.mjs:144` va modificato**: la voce
   `["/venues/[slug]", "the public venue page — src/app/(public)/venues/[slug]/page.tsx, ungated"]`
   e' nella `PUBLIC_ALLOW`, e il docblock a `:131-137` e' esplicito — *«ogni voce
   nomina il file che la serve, verificato su disco»*. Lasciarla dopo lo
   spostamento e' una allow-list che dichiara pubblico un indirizzo che non
   esiste piu'.
5. **`events/[slug]/page.tsx:770` linka `/venues/${party.venue.slug}`** su una
   serata con venue visibile. Dopo lo spostamento quel link porta un visitatore
   pubblico su un indirizzo che il middleware rifiuta. **E' una conseguenza
   cross-dominio che il piano deve gestire**, non un dettaglio: la scelta e' fra
   rendere il nome come testo semplice per chi non ha la capability, o
   riscrivere il link verso il nuovo indirizzo per chi ce l'ha. La prima e' piu'
   stretta.
6. **`next build` non rifiuta da solo** una superficie nuova senza la sua riga
   se e' **dinamica** — e questa lo e'. La catena e' di **tre** anelli e **non
   c'e' CI** (`capability-routes.ts:33-53`): `verify:capabilities` (serve un
   database vivo), `next build`, `verify:routes`. Il piano deve elencare i tre
   comandi come passi pre-deploy scritti.

---

## C. La capability nuova

### C.1 — Nessuna delle dodici esistenti ha la forma giusta (verificato leggendo)

`src/lib/capabilities/keys.ts:93-126` — **dodici** chiavi. Confrontate una per
una con il requisito di D-37-13/14 («master **e** ogni organizer **approvato**»):

| Chiave | `requires_approved` | Perche' non va |
|---|---|---|
| `staff.manage` | **false** ×2 (`capability_model.sql:392-393`) | Ignora lo stato **di proposito**; ammetterebbe un organizer non approvato |
| `master.manage` | false (`:396`) | Solo master — esclude gli organizer |
| `catalogue.manage` | **true** ×2 (`:399-400`) | **Forma giusta, domanda sbagliata**: *creare un artista o una sede* non e' *far uscire un indirizzo*. Fonderle rende impossibile separarle dopo — e' esattamente il ragionamento con cui `register.read` e' nata separata (`keys.ts:47-56`) |
| `membership.active` | true ×3 (`:403-405`) | Solo stato, ogni ruolo: aprirebbe a ogni membro approvato |
| `admin.access` | false (`:408`) | Solo master |
| `organizer.access` | false ×2 (`:411-412`) | Ignora lo stato |
| `door.operate` | false ×2 (`:416-417`) | «Non devono diventare `true`» — dichiarato nel file |
| `membership.card.view` | true ×3 (`:420-422`) | Ogni ruolo |
| `register.read` | true ×2 (`membership_register.sql` §1) | Stessa forma di `catalogue.manage`, domanda diversa |
| `door.supervise` / `media.upload` / `party.manage` | — | Chiavi per-serata; D-37-15 le esclude esplicitamente |

**Confermato: serve la tredicesima.**

### C.2 — I passi meccanici, sul modello di `register.read` (la nona)

La nona chiave e' il precedente esatto e completo, dentro **una** migration in
**una** transazione (`20260808002000_membership_register.sql:1-32`).

**Nel database — una migration nuova, `BEGIN; … COMMIT;`:**

```sql
INSERT INTO private.capabilities (key, description) VALUES
  ('<chiave>', '<una frase, obbligatoria: description e'' NOT NULL>')
ON CONFLICT (key) DO NOTHING;

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  ('master',    '<chiave>', true),
  ('organizer', '<chiave>', true)
ON CONFLICT (role, capability) DO NOTHING;
```

`private.capabilities` e' `(key text primary key, description text not null)`
(`capability_model.sql:77-80`); `description` e' `NOT NULL` **di proposito**
(`:71-75`). `private.role_capabilities` porta `requires_approved boolean not
null default false` (`:120-124`) e il resolver lo valuta a
`capability_model.sql:215`: `and (not rc.requires_approved or p.status = 'approved')`.

**In TypeScript — due file, stesso commit:**

1. `src/lib/capabilities/keys.ts`: una voce in `CAP` **e** una in
   `CAP_DESCRIPTIONS`. Quest'ultimo e' un `Record` **totale** sull'unione
   (`keys.ts:144`): **una chiave senza descrizione e' un errore di
   `npm run build`**. E' l'unica meta' del contratto che il compilatore tiene
   (`keys.ts:130-143`).
2. `src/lib/routes/capability-routes.ts`: una voce, obbligatoria. `as const
   satisfies Record<CapabilityKey, Binding>` (`:402`) rende la **totalita'** un
   errore di build: **una tredicesima chiave senza entry non compila**.

**Quale ramo del `Binding`.** La chiave **non apre un indirizzo nuovo** — il
bottone vive su `/admin/events/[id]/edit`, gia' legata a `organizer.access`
(`capability-routes.ts:256`). Quindi il ramo corretto e' il secondo:

```ts
[CAP.<CHIAVE>]: {
  scope: "table",
  reason: "<una riga, obbligatoria>",
},
```

`reason` e' obbligatoria per costruzione: *«un gate che non sa dirlo sarebbe
soddisfatto da una bugia»* (`capability-routes.ts:158`).

⚠️ **Attenzione — un `scope: "table"` fa risolvere `resolveRoute` a `null`.**
Se il piano decidesse invece di dare alla rivelazione **un indirizzo proprio**,
la voce deve stare sul **primo** ramo con `routes: [...]`: una pagina legata a
una chiave `table-only` e' **irraggiungibile per tutti**, senza errore di build
e senza niente nei log (`capability-routes.ts:324-331`, dove il progetto ha gia'
inciampato una volta).

**Cosa `next build` verifica e cosa no** — misurato oggi, build verde
(exit 0):

| Anello | Chi lo tiene | Serve un database? |
|---|---|---|
| database ↔ `CAP` | `npm run verify:capabilities` | **si'** |
| `CAP` ↔ `CAP_DESCRIPTIONS` | `next build` (Record totale) | no |
| `CAP` ↔ `capability-routes.ts` | `next build` (`satisfies` totale) | no |
| mappa ↔ pagine su disco | `npm run verify:routes` | no |

**Non c'e' CI.** Tutti e quattro sono passi pre-deploy scritti a mano.

**Sul nome** (discrezione di chi pianifica): deve nominare **la domanda**, non
il predicato — regola di casa a `keys.ts:38-45`, applicata gia' tre volte. La
domanda qui e' *«posso far uscire l'indirizzo di questa serata adesso?»*.
Famiglia coerente col resto (`staff.manage`, `catalogue.manage`,
`party.manage`): `<sostantivo>.<verbo>`.

---

## D. Il percorso manuale

### D.1 — Il cron di oggi, per intero (`src/app/api/cron/venue-reveal/route.ts`)

| Righe | Cosa fa | Nota per il piano |
|---|---|---|
| 11-14 | `Bearer ${CRON_SECRET}` | L'unica autenticazione |
| 16-19 | `getServiceClient()`, Resend, `RESEND_FROM_EMAIL` | **Service client: bypassa ogni RLS** |
| 25-29 | Query serate: `.eq("venue_secret", true).eq("venue_reveal_email_sent", false)` | **Il filtro che D-37-21 cambia.** Nessun filtro su `is_published` — vedi § D.6 |
| 36-46 | Filtro finestra: `partyStartInstant`, poi `:42` esclude le serate iniziate **da piu' di 24h**, poi `:43` `?? 24`, `:44-45` `now >= revealAt` | `:42` e' il **limite superiore** che rende sicuro togliere il filtro di `:29` |
| 57-76 | Tre query destinatari: `tickets` per serata, `rsvps` per serata, **master ticket** di evento (`party_id IS NULL`) — tutte `.eq("venue_reveal_sent", false)` | **Il conteggio di D-37-16 e di D-37-20 si legge qui**, e non serve il service client: `tickets_select_admin` e `rsvps_select_admin` chiedono `staff.manage` (`20260807010000:339-343, 390-395`), che un organizer ha |
| 78-106 | **Deduplicazione per email**, `Map<email, {name, ticketIds[], rsvpIds[]}>` | Una persona con biglietto **e** RSVP riceve **una** mail. **Il numero da mostrare nella conferma e' `emailMap.size`, non la somma delle righe** |
| 108-115 | Zero destinatari → alza comunque `venue_reveal_email_sent = true` e `continue` | **La ragione per cui il flag non puo' essere il predicato di pagina** (§ A.4) e meta' del difetto D9 (§ D.6) |
| 120-153 | Lotti da 100, `render()` per destinatario, `resend.batch.send`, `totalSent += emails.length` | Il conteggio e' **ottimista**: somma la lunghezza del lotto, non le consegne |
| **150-152** | `catch { console.error("Batch send failed for party", party.id, err) }` e **prosegue** | **Il pattern che D-37-12 vieta di replicare.** Nessun error tracking: quel log non raggiunge nessuno |
| **155-171** | Marca `tickets` e `rsvps` `venue_reveal_sent = true` per **tutti** gli id raccolti | ⚠️ **Marca anche i destinatari del lotto fallito.** Un lotto caduto marca comunque le sue righe come inviate. E' il difetto che rende oggi invisibile un invio parziale — e che D-37-12 e D-37-20 non possono risolvere finche' resta |
| **174-177** | Marca la serata `venue_reveal_email_sent = true` | — |

**Tutte le citazioni di CONTEXT.md verificate:** `150-152` ✓, `155-171` ✓,
`174-177` ✓, `63-68` ✓, `:43` `?? 24` ✓.

⚠️ **Un difetto scoperto misurando, che tocca direttamente D-37-12/20 e che
CONTEXT.md non registra.** La marcatura di `:155-171` usa `entries`, cioe'
**tutti** i destinatari, indipendentemente da quali lotti siano andati a buon
fine. Quindi oggi «20 su 50» **non e' rappresentabile**: dopo un lotto caduto, i
30 mancanti risultano gia' inviati e il bottone «manda ai N che mancano» non
troverebbe nessuno. **D-37-12 e D-37-20 richiedono che la marcatura diventi
per-lotto**, dentro il `try`, dopo l'invio riuscito — o restano indicazioni che
il codice non puo' onorare. Da riportare come attivita' del piano, non come nota.

### D.2 — La forma condivisa: un modulo, due chiamanti

**Il cuore da estrarre** e' il corpo del `for` a `:50-178`, parametrizzato sulla
singola serata. Firma raccomandata:

```
revealPartyVenue(client, partyId, opts?) → {
  recipientsTotal: number,      // emailMap.size
  recipientsSent: number,       // somma dei lotti riusciti
  recipientsFailed: number,
  failureKind: "none" | "send_failed" | "no_recipients" | "party_not_found",
}
```

| Chiamante | Cosa tiene per se' |
|---|---|
| **Il cron** (`route.ts`) | l'autenticazione `Bearer`, la query delle serate (`:25-29`), il filtro finestra (`:36-46`), il ciclo, la risposta JSON `{ sent }` |
| **La server action** | la ri-verifica della capability, la risoluzione dell'attore, l'invocazione dello scrittore atomico (§ D.4), la traduzione del risultato in tre stati per la UI |

**Perche' un modulo e non una seconda copia:** i due percorsi divergerebbero
sulla deduplicazione per email — che e' la parte che decide **quante persone**
la conferma di D-37-16 mostra. Due copie significherebbero due numeri diversi
per lo stesso atto irreversibile.

**Dove metterlo.** `src/lib/venue-reveal/` e' la collocazione coerente col resto
(`src/lib/offline/`, `src/lib/guest-list/`, `src/lib/door/`). ⚠️ **Ma i `paths:`
di `venue-secrecy.md` non coprono `src/lib/**`** — verificato,
`.claude/rules/venue-secrecy.md:2-8` elenca `src/app/api/cron/venue-reveal/**`,
`src/emails/venue-reveal.tsx`, `src/app/(public)/events/**`,
`src/app/**/venues/**`, `src/components/venues/**`, `src/components/events/**`.
**Spostare il cuore della rivelazione in `src/lib/` lo porterebbe fuori dal
raggio del suo gate** — che e' esattamente il difetto che `ai-engineering.md`
descrive come gia' avvenuto («fino alla v1.4 i `paths:` erano fermi alla
geografia di v1.0 mentre il prodotto aveva spostato rimborsi, checkout e scanner
altrove»). Il piano deve **allargare i `paths:` nello stesso commit** e
rimisurare il context budget (`ai-engineering.md`, gate *context budget*: caso
peggiore oggi 38.240 byte ≈ 10.622 token su 12.000, margine 1.378).

### D.3 — D-37-21: il cambio di filtro del cron

**Oggi** (`route.ts:25-29`):
```ts
.select("id, title, date, time, venue_secret, venue_reveal_hours, venue_reveal_email_sent, venue_id, venue_text, event_id, events(title, slug), venues(name, address)")
.eq("venue_secret", true)
.eq("venue_reveal_email_sent", false);
```

**Il cambio minimo:** eliminare `.eq("venue_reveal_email_sent", false)`.

**Cosa lo mantiene idempotente,** ed e' la parte che va scritta perche' non e'
ovvia: **l'idempotenza non e' mai stata in quel filtro.** Sta a tre livelli sotto:

1. `.eq("venue_reveal_sent", false)` su `tickets`, `rsvps` e master ticket
   (`:61, :68, :76`) — **il vero filtro per destinatario**. Chi ha gia'
   ricevuto non e' nemmeno nella `emailMap`.
2. `emailMap.size === 0` → nessun invio (`:108-115`).
3. La finestra `:42` limita l'insieme scandito alle serate future o iniziate da
   meno di 24 ore — quindi il cron non ri-scandisce la storia.

Il filtro di `:29` era una **ottimizzazione**, non una garanzia. Toglierlo
allarga l'insieme scandito ma non produce una seconda mail a nessuno.

⚠️ **Una conseguenza che va decisa, e che mette D-37-21 in tensione con
D-37-08.** Con il filtro tolto, una serata gia' rivelata viene ri-scandita ogni
notte. Un biglietto **acquistato dopo la rivelazione** nasce con
`venue_reveal_sent = false` (default della colonna,
`20260305200000:6`) → **la corsa successiva del cron gli manda la mail**. Oggi
non succede, perche' la serata e' marcata e saltata per sempre. Ma D-37-08 dice:
*«chi acquista dopo la rivelazione lo vede in pagina, senza mail»*, e la sezione
Deferred rimanda esplicitamente l'invio all'acquisto a una fase sua.

**Non e' un dettaglio implementativo: e' un percorso di mail nuovo che nasce
come effetto collaterale di un cambio di filtro.** Due letture possibili:

| Lettura | Come si implementa | Costo |
|---|---|---|
| **L1 — il cron completa solo chi c'era** (raccomandata) | il braccio di completamento considera i destinatari **creati prima** dell'istante di rivelazione: `.lte("created_at", party.venue_revealed_at)`. `tickets.created_at` e `rsvps.created_at` esistono entrambi (`schema.sql:358`, `:202`) | Una condizione in piu'. Onora D-37-08 alla lettera e rende **misurabile** cosa significa «i mancanti» di D-37-20 |
| **L2 — chiunque abbia titolo riceve** | nessuna condizione | Contraddice D-37-08 e anticipa una funzione dichiarata differita. **Da non fare in silenzio**: se il piano la sceglie, va portata al proprietario |

L1 e' anche **l'argomento piu' forte a favore della colonna dedicata di § A.4**:
senza un istante memorizzato, «chi c'era al momento della rivelazione» non e'
esprimibile.

### D.4 — Dove vive la traccia, e il pattern transazionale da copiare

**Il modello e' `public.record_party_assignment_act`**
(`supabase/migrations/20260809002000_assignment_acts.sql`). Ne riporto la forma
esatta, misurata, perche' il piano la copi invece di ricostruirla:

```sql
CREATE OR REPLACE FUNCTION public.record_<nome>(
  p_party_id uuid,
  p_actor_id uuid,
  …
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''            -- assignment_acts.sql:253
AS $$
DECLARE … BEGIN
  -- 1. rifiuti argomentali per primi, con il PROPRIO nome
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION '<dominio>.actor_required: %', p_party_id
      USING ERRCODE = 'invalid_parameter_value';       -- :276-280
  END IF;

  -- 2. il soggetto COM'E' ADESSO, sotto lock
  SELECT … INTO v_… FROM public.event_parties WHERE id = p_party_id
    FOR UPDATE;                                        -- :286-296
  IF NOT FOUND THEN
    RAISE EXCEPTION '<dominio>.party_not_found: %', p_party_id
      USING ERRCODE = 'no_data_found';                 -- :342-345
  END IF;

  -- 3. la riga
  UPDATE public.event_parties SET … WHERE id = p_party_id;

  -- 4. l'atto, NELLA STESSA TRANSAZIONE
  INSERT INTO public.<traccia> (…) VALUES (…) RETURNING id INTO v_act_id;

  RETURN v_act_id;
END; $$;

REVOKE ALL ON FUNCTION public.record_<nome>(…) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_<nome>(…) TO service_role;
COMMENT ON FUNCTION … IS '…';
```

**Perche' `REVOKE` **poi** `GRANT`, due statement in quest'ordine:** Postgres
concede `EXECUTE` a `PUBLIC` **di default** su ogni funzione nuova, quindi il
solo `GRANT` lascerebbe il default in piedi
(`membership_register.sql:479-482`). L'esposizione non e' teorica: la lista
degli schemi esposti da PostgREST su questo progetto e' `public, graphql_public`
(verificata 2026-08-06, `capability_model.sql:49-52`), quindi **una funzione in
`public` senza il `REVOKE` e' viva a `/rest/v1/rpc/…`**.

**Perche' `SECURITY DEFINER` invece di un trigger** — la ragione e' misurata e
si applica identica qui: ogni percorso di mutazione usa il **service client**,
sotto il quale `auth.uid()` e' **null** (`membership_register.sql:363-371`,
misurato in `32-06-SUMMARY.md` §F1). Un trigger che leggesse `auth.uid()`
registrerebbe **nessuno**. **L'attore e' un argomento**, risolto server-side da
`getAccessContext()`.

**Perche' non basta il service client dalla server action:** due chiamate
PostgREST non sono atomiche (`membership_register.sql:355-361`). Una rivelazione
riuscita con la sua traccia fallita e' esattamente l'atto non tracciato che
D-37-17 esiste per impedire — e fallirebbe **in silenzio**, perche' nessuno
legge l'errore della seconda chiamata.

**Perche' serve una funzione anche solo per la scrittura** — il vincolo di RLS
misurato: `event_parties_update_own`
(`20260807020000_wrap_auth_uid.sql:145-155`) e'
`staff.manage AND (role='master' OR events.created_by = auth.uid())`. **Un
organizer approvato che non ha creato l'evento non puo' aggiornare quella riga**
con la propria sessione. D-37-13 richiede esattamente quel caso. **Quindi la
funzione non e' un'eleganza: e' l'unico modo.**

**Forma della tabella di traccia — raccomandata: tabella append-only propria.**

| Opzione | Verdetto |
|---|---|
| Colonne sulla serata (`revealed_by`, `revealed_at`) | **No.** Una colonna porta **l'ultimo** atto. D-37-22 (ri-nascondere) produce almeno due atti sulla stessa serata, e la traccia deve sopravvivere al secondo. E' la stessa ragione per cui `membership_acts` e' una tabella e non due colonne (`membership_register.sql:38-42`) |
| Riuso di `membership_acts` | **No.** Quel registro riguarda **role e status di un account**; un `act` nuovo violerebbe il suo `CHECK` a sette valori (`:174-184`), e il suo `subject_label` e' un `membership_code` **mai un nome** (`:196-205`), che e' l'opposto di D-37-18. Due registri con verita' sovrapposte sono peggio di entrambi (`:307-311`) |
| **Tabella propria** | **Si'.** Segue `membership_acts` nella forma e diverge dove D-37-18 lo impone |

Vincoli da riportare nella migration, ognuno con il suo precedente:

- **RLS abilitata, una sola policy `SELECT`, nessuna policy di scrittura.**
  L'omissione **e' il meccanismo**: con RLS attiva e nessuna policy di scrittura,
  **nessuna sessione** puo' inserire, modificare o cancellare
  (`membership_register.sql:337-350`). E' cosi' che si ottiene «append-only per
  costruzione» invece che per convenzione — ed e' **il vincolo che rende onesta
  D-37-22**.
- **La policy `SELECT` non introduce una chiave nuova** (D-37-18): riusa la
  chiave con cui si raggiunge gia' la superficie della serata.
- **`party_id ... ON DELETE SET NULL`**, non `CASCADE`, con un'etichetta
  denormalizzata della serata accanto. `membership_acts.party_id` e' gia' `SET
  NULL` (`:272`); il precedente della denormalizzazione e'
  `ticket_refunds.refunded_ticket_id` (`:190-193`). **Una `CASCADE` significa
  «cancella la serata e sparisce la prova che un indirizzo e' diventato
  pubblico»** — la direzione sbagliata su un atto irreversibile. ⚠️ Sedici
  vincoli puntano oggi a `event_parties` con `ON DELETE CASCADE`
  (elencati in § Runtime State Inventory): la traccia **non** deve diventare il
  diciassettesimo.
- **Nella traccia non entra l'indirizzo.** Entrano *quale serata*, *chi*,
  *quando*, *quante mail*. `venue-secrecy.md`: piu' copie dell'indirizzo sono
  piu' percorsi d'uscita. E il messaggio di un `RAISE EXCEPTION` nomina **un
  identificatore, mai una persona e mai un indirizzo** — un messaggio raggiunge
  un log, e un log raggiunge uno screenshot (`assignment_acts.sql:239-243`).
- **`nome e cognome` e' una divergenza deliberata** da `membership_acts`
  (D-37-18) e va scritta **accanto alla colonna**, con la sua ragione, o il
  prossimo lettore la «riparera'» in `membership_code` per coerenza.

### D.5 — Il secondo tentativo, il ri-nascondere, e la forma della guardia

**Oggi `venue_secret` si scrive in cinque punti,** tutti senza traccia
(misurato):

| Riga | Punto |
|---|---|
| `actions.ts:409-411` | normalizzazione a booleano in `validateEventData` |
| `actions.ts:464` | `venue_secret` a livello **evento**, dal form |
| `actions.ts:625` | `createEvent` → `events.insert` |
| `actions.ts:650-653` | `createEvent` → `event_parties.insert` (le quattro colonne di rivelazione) |
| `actions.ts:722` | `updateEvent` → `events.update` |
| `actions.ts:878-881` | `updateEvent` → upsert per serata |

CONTEXT cita `408-426` (il blocco di validazione, ✓) e `645-655` (le righe di
`createEvent`, ✓). **Il piano deve sapere che i punti sono cinque, non uno**, e
che `updateEvent` **cancella le serate rimosse e fa upsert delle altre per id**
(`actions.ts:827-831` e `:868` in poi): l'id di una serata **sopravvive** a una
modifica, quindi la traccia non si perde per un semplice salvataggio.

**Le tre forme della guardia, e cosa perde ciascuna** (rilevante anche per il
todo `postgrest-details-leaks-the-row.md`):

| Forma | Come rifiuta | Cosa restituisce a chi ha sbagliato | Verdetto |
|---|---|---|---|
| **CHECK constraint** su `event_parties` | `23514` | ⚠️ **`error.details` porta `Failing row contains (…)` — la riga intera, quindi `venue_text` e ogni colonna della serata.** Misurato in `43-01`, e il progetto lo cita gia' due volte nel proprio codice (`membership_register.sql:437-440`, `assignment_acts.sql:360-364`) | **No** |
| **Trigger `BEFORE UPDATE`** con `RAISE EXCEPTION` | il codice che scegli | **Il messaggio, non la riga.** `RAISE EXCEPTION 'venue.already_revealed: %', p_party_id` porta un identificatore e basta | Accettabile |
| **RPC che ritorna un rifiuto tipizzato** | valore di ritorno, non eccezione | **Niente riga, e nessun `error` da loggare per sbaglio** | **Raccomandata** |

**Perche' la RPC vince, in questo dominio specifico:** la riga di
`event_parties` **porta il segreto che stiamo proteggendo**. Un rifiuto che
restituisce cio' che si sta proteggendo e' il difetto che si autoinfligge — la
frase e' del todo stesso. E il rifiuto per **valore** e' anche l'unica forma che
attraversa il confine della Server Action: Next **redige** il messaggio di un
errore lanciato da una Server Action in build di produzione
(`src/lib/capabilities/server.ts:59-63`, D-36-10). Un client che ramifica su
`err.message` funziona in `next dev` e smette dove conta.

**Il ri-nascondere di D-37-22.** La guardia ha due meta', e la seconda e' quella
che toglie l'illusione:

1. `venue_revealed_at IS NOT NULL` **e** l'attore non e' master → rifiuto
   tipizzato. Il ruolo si legge dentro la funzione dal `p_actor_id`, mai da un
   argomento del chiamante (altrimenti chi chiama dichiara il proprio ruolo).
2. Il master passa: `venue_secret` torna `true`, `venue_revealed_at` torna
   `NULL` — **e viene scritto un atto nuovo nella traccia**, che non cancella il
   precedente. La serata continua a dire «rivelato il … da …». Senza questo,
   D-37-22 e' una pagina che dice una cosa e delle mail partite che ne dicono
   un'altra.

⚠️ **`venue_reveal_email_sent` non si abbassa mai.** E' il campo che rappresenta
«le mail sono partite», e le mail sono partite. Abbassarlo farebbe **retrocedere
la guardia monotona** — cosa che `meta-gates.md` vieta e che D-37-22 **non**
autorizza (autorizza il ri-nascondere della pagina, non la finzione che l'invio
non sia avvenuto).

### D.6 — Un difetto gia' registrato, assegnato a questa fase, assente da CONTEXT.md

`.planning/phases/36-formats-series-numbering/36-13-SUMMARY.md:408-416`, registrato
e **deliberatamente non riparato** dalla fase 36:

> **D9 — il cron della rivelazione raggiunge le bozze.** `route.ts:25-29` filtra
> su `venue_secret` e `venue_reveal_email_sent`, **mai su `is_published`**. E a
> `:108-115`, quando per una serata non esiste alcun destinatario, alza comunque
> `venue_reveal_email_sent = true`. Una bozza rimasta non pubblicata fin
> **dentro** la propria finestra di rivelazione si porta la guardia monotona
> gia' alzata: pubblicata dopo e venduta, **la mail dell'indirizzo non partira'
> mai**, senza un errore e senza che nessuno lo sappia. **E' dominio della fase
> 37.**

**D-37-21 lo chiude quasi per intero, gratis:** togliendo
`.eq("venue_reveal_email_sent", false)` la serata torna nell'insieme scandito, e
se nel frattempo ha destinatari la mail parte. Resta scoperto il caso in cui la
serata sia iniziata da piu' di 24 ore (`:42`) — irrilevante, li' e' comunque
tardi. **Va detto nel piano che D-37-21 chiude D9**, o il difetto restera'
aperto in coda a descrivere un comportamento che non esiste piu'.

---

## E. La finestra di 25 ore e l'intervallo del cron

### E.1 — I limiti Vercel, ri-verificati alla fonte

**Verificato oggi, 2026-08-10**, con Firecrawl su
`https://vercel.com/docs/cron-jobs/usage-and-pricing`. La pagina porta
**«Last updated July 15, 2026»**, identica alla verifica registrata in
CONTEXT.md.

| Piano | Cron per progetto | Intervallo minimo | Precisione |
|---|---|---|---|
| **Hobby** ← questo progetto (confermato dal proprietario) | 100 | **Once per day** | **Per-hour (±59 min)** |
| Pro | 100 | Once per minute | Per-minute |
| Enterprise | 100 | Once per minute | Per-minute |

Citazioni testuali dalla pagina:

> *«Daily execution limit: Cron jobs can only run once per day. Expressions like
> `0 * * * *` (per-hour) or `*/30 * * * *` (every 30 minutes) will fail
> deployment with the error: Hobby accounts are limited to daily cron jobs.»*

> *«Timing precision: Vercel cannot assure a timely cron job invocation. For
> example, a cron job configured as `0 1 * * *` (every day at 1 am) will trigger
> anywhere between 1:00 am and 1:59 am.»*

**L'aritmetica di D-37-06, ricontrollata.** Con `0 6 * * *` e ±59 minuti, due
corse consecutive possono distare al massimo da 06:00 del giorno N a 06:59 del
giorno N+1 = **24h59m**. Una finestra di 24 ore non contiene garantitamente una
corsa; **25 si'**, con 1 minuto di margine. Il numero e' corretto e il margine
e' sottile: va scritto accanto alla costante, o qualcuno lo arrotondera' a 24
«perche' e' un giorno».

`vercel.json` (letto oggi): quattro cron, tutti giornalieri; `venue-reveal` a
`0 6 * * *` UTC = **08:00 italiane d'estate, 07:00 d'inverno**
(`time-and-scheduling.md`, gate *l'orario del cron e' una decisione*).

### E.2 — I due `?? 24`, il pavimento, e dove va la costante

| Sito | Riga | Codice |
|---|---|---|
| Pagina | `src/app/(public)/events/[slug]/page.tsx:112` | `const hours = opts.venueRevealHours ?? 24;` |
| Cron | `src/app/api/cron/venue-reveal/route.ts:43` | `const hours = p.venue_reveal_hours ?? 24;` |
| Validazione | `src/app/(admin)/admin/events/actions.ts:419` | `if (isNaN(hours) \|\| hours < 1 \|\| !Number.isInteger(hours))` |
| Colonna | `supabase/migrations/20260226500000_venue_secret_hint_reveal_hours.sql:3` | `ADD COLUMN IF NOT EXISTS venue_reveal_hours integer;` — **nessun `DEFAULT`** ✓ |

**Tutte e quattro le citazioni di CONTEXT.md confermate.**

**Dove va la costante:** `src/utils/datetime.ts`, accanto a
`EVENT_TIME_ZONE = "Europe/Rome"` (`:13`). Il file esporta oggi
`EVENT_TIME_ZONE`, `zonedInstant`, `partyStartInstant`, `partyEndInstant`,
`menuCloseInstant`, `zonedDateString`; `nightBoundaryInstant` e' privato
**di proposito** («le due chiusure che una serata ha sono la stessa aritmetica
sotto due nomi, e non devono tornare a essere due implementazioni», `:69-72`).
E il docblock a `:96-102` dichiara la regola per questa aggiunta:

> *«se un chiamante ha bisogno di un confine che questo file non espone ancora,
> lo si aggiunge qui invece di calcolarlo li'.»*

**Raccomandato:** esportare **la costante** e **una funzione che la applica** —
`DEFAULT_VENUE_REVEAL_HOURS = 25` e `venueRevealHours(stored: number | null)` —
e far chiamare la funzione a entrambi i siti. Esportare la sola costante
lascerebbe due `?? DEFAULT` in due file, cioe' due siti dove si puo' ancora
divergere: e' proprio la forma da cui sono nate le sei varianti di conversione
oraria che quel file racconta.

**Il pavimento di validazione** passa da `< 1` a `< 25`, con un messaggio che
dice **perche'**: *«sotto le 25 ore la mail puo' partire dopo la serata: il cron
gira una volta al giorno.»* `meta-gates.md`, zero fallimenti silenziosi — e
D-37-06 punto 2 e' esplicito sul motivo: senza il perche', al primo rifiuto
qualcuno alzera' il limite invece della finestra.

### E.3 — La query READ-ONLY per D-37-06 punto 4

> ⚠️ **`SELECT`, non `UPDATE`.** D-37-06 punto 4 vieta la sanatoria silenziosa.
> **Non e' stata eseguita da questa ricerca**: nessun accesso al database di
> produzione e' stato aperto.

```sql
-- Serate con una finestra ESPLICITA sotto le 25 ore.
-- Le righe con NULL non compaiono: quelle cambiano per effetto del nuovo
-- fallback (D-37-06 punto 3), non per un valore proprio.
SELECT
  ep.id                                  AS party_id,
  ep.date,
  ep.time,
  ep.venue_reveal_hours                  AS finestra_attuale_ore,
  25 - ep.venue_reveal_hours             AS anticipo_aggiunto_ore,
  ep.venue_secret,
  ep.venue_reveal_email_sent,
  e.slug                                 AS event_slug,
  e.is_published
FROM public.event_parties ep
JOIN public.events e ON e.id = ep.event_id
WHERE ep.venue_reveal_hours IS NOT NULL
  AND ep.venue_reveal_hours < 25
ORDER BY ep.date, ep.time;
```

Forma PostgREST equivalente, **service key, sola lettura**:

```
GET /rest/v1/event_parties
    ?select=id,date,time,venue_reveal_hours,venue_secret,venue_reveal_email_sent,events(slug,is_published)
    &venue_reveal_hours=not.is.null
    &venue_reveal_hours=lt.25
    &order=date.asc
```

**Colonna decisiva per il proprietario:** `anticipo_aggiunto_ore` — di quante
ore **anticiperebbe** la rivelazione di quella serata se il valore venisse
portato a 25. E' il numero che rende la decisione una decisione. Una seconda
query utile e' il complemento, `venue_reveal_hours IS NULL AND venue_secret =
true`: quelle serate anticipano **di un'ora esatta**, ed e' l'allargamento
autorizzato del punto 3.

**Il risultato non va in un documento di pianificazione.** Un elenco di serate
segrete con la loro data e' materiale, e questo repo e' pubblico. Va portato al
proprietario fuori dal repo; nel piano ci va **la query e la procedura**, non le
righe.

### E.4 — Il dialogo dell'indizio (D-37-06 punto 5)

**La catena delle prop, misurata:**

`page.tsx:779-785` → `<SecretVenueDialog hint={venueHint} isAuthenticated={…}
isApproved={…} revealHours={party.venue_reveal_hours} revealOnPurchase={…} />`

`SecretVenueDialog.tsx:11` dichiara `revealHours: number | null`, e a
**`:68-70`**:

```tsx
{revealHours
  ? `${revealHours} hours before the event`
  : "closer to the event"}
```

**Deriva minima rispetto a CONTEXT.md:** la citazione dice `68-69`; il ramo
`else` sta a **`:70`**. Nessuna conseguenza.

Il difetto e' reale ed e' quello descritto: con `NULL` la pagina dice *«closer
to the event»* mentre la logica applica il fallback. **Il rimedio piu' stretto**
e' passare la finestra **gia' risolta** dal server —
`revealHours={venueRevealHours(party.venue_reveal_hours)}` — cosi' il componente
client non conosce piu' il fallback e non puo' divergere. Il tipo diventa
`number`, e il ramo `else` **sparisce**: sparisce anche il modo di sbagliarlo.

⚠️ **Nota su `SecretVenueDialog`.** Il componente lista oggi le condizioni di
sblocco: *«Buy a ticket to unlock immediately»* e *«wait for the reveal N hours
before»*. Con il modello a tre livelli quel testo diventa **falso per un membro
approvato senza biglietto**, che sbloccherebbe alla finestra senza comprare
nulla. E' una superficie pubblica che promette una cosa e il sistema ne fa
un'altra — lo stesso difetto del punto 5, sull'altro asse. **Da aggiornare nello
stesso piano di § A.**

---

## F. Cache e pre-render (requisito di verifica di fase)

### F.1 — La postura di oggi, misurata con `npm run build`

Nessuna delle pagine pubbliche dichiara alcuna direttiva: `export const
dynamic`, `export const revalidate`, `generateStaticParams`, `unstable_noStore`
— **zero occorrenze** in `(public)/events/page.tsx`,
`(public)/events/[slug]/page.tsx`, `(public)/venues/[slug]/page.tsx`,
`(public)/layout.tsx`, `app/layout.tsx`.

**Build eseguita oggi, `next 16.1.6`, exit 0.** Tabella delle rotte:

| Rotta | Modo |
|---|---|
| `/events` | **ƒ (Dynamic)** — server-rendered on demand |
| `/events/[slug]` | **ƒ (Dynamic)** |
| `/venues/[slug]` | **ƒ (Dynamic)** |

**Ma la postura e' derivata, non dichiarata.** Le tre pagine sono dinamiche
perche' `createClient()` (`src/lib/supabase/server.ts:5`) chiama `cookies()` da
`next/headers`. **Nessuna riga dichiara l'intenzione.** Una modifica futura che
sposti la lettura della sessione, o che introduca un ramo senza cookie, le
renderebbe statiche **senza un errore e senza che nessuno lo noti** — e con il
nuovo predicato temporale una pagina statica servita attraverso l'istante di
rivelazione mostra l'indirizzo a chi non deve.

### F.2 — Il service worker: cosa cachea davvero (misurato in `node_modules`)

`src/app/sw.ts:60` — `runtimeCaching: [...doorRuntimeCaching, ...defaultCache]`.
Le quattro regole della porta sono `NetworkOnly` su quattro percorsi `/api/…`
(`sw.ts:32-49`). Tutto il resto e' `defaultCache` di `@serwist/next@9.5.6`,
letto da `node_modules/@serwist/next/dist/index.worker.js`:

| Cache | Handler | Matcher | Scadenza |
|---|---|---|---|
| `pages-rsc-prefetch` | **NetworkFirst** | `RSC: 1` + `Next-Router-Prefetch: 1`, stessa origine, non `/api/` | 32 voci, **24 h** |
| `pages-rsc` | **NetworkFirst** | `RSC: 1`, stessa origine, non `/api/` | 32 voci, **24 h** |
| `pages` | **NetworkFirst** | `Content-Type: text/html`, stessa origine, non `/api/` | 32 voci, **24 h** |
| `others` | NetworkFirst | stessa origine, non `/api/` | 32 voci, 24 h |
| `apis` | NetworkFirst, `networkTimeoutSeconds: 10` | stessa origine, `/api/`, GET | 16 voci, 24 h |

**Quindi `/events/[slug]` viene messa in Cache Storage per 24 ore, in tre forme
(HTML, RSC, RSC-prefetch), su ogni dispositivo che la apre.** `NetworkFirst`
significa che la copia viene servita quando la rete manca o fallisce —
`venue-secrecy.md`, gate *cache e pre-render*, e `nextjs-architecture.md`, gate
*service worker*: *«nessuna superficie che mostra stato di pagamento, validita'
di biglietto o indirizzo di venue deve essere servita da cache stale.»*

### F.3 — Le due direzioni, e perche' sono rischi diversi

| Direzione | Cosa succede | Chi lo subisce | Gravita' |
|---|---|---|---|
| **Stale-prima** (copia fatta prima della finestra, servita dopo) | mostra l'indizio a chi ormai avrebbe titolo all'indirizzo | **lo stesso lettore** | fastidio — e alle 2 di notte davanti a una porta, un fastidio serio |
| **Stale-dopo** (copia fatta dopo, servita a un lettore diverso) | mostra **l'indirizzo a chi non deve** | **un lettore diverso** | **fuga, irreversibile** |

**Distinzione che il piano deve tenere, e che decide dove va il rimedio:**

- **Cache Storage del service worker e' per-origine e per-profilo di browser.**
  Non e' condivisa fra lettori: puo' produrre lo **stale-prima** e puo'
  conservare a un lettore un indirizzo che ha gia' visto, **non** puo' mostrarlo
  a un lettore diverso.
- **Lo stale-dopo verso un lettore diverso richiede una cache condivisa** —
  Full Route Cache di Next, Data Cache, o una CDN. Oggi **non esiste**: le tre
  rotte sono `ƒ`. **Il rischio e' che smetta di essere vero senza che nessuno lo
  noti.**

### F.4 — La postura minima corretta

1. **Dichiarare l'intenzione invece di derivarla.**
   `export const dynamic = "force-dynamic";` su `(public)/events/[slug]/page.tsx`
   e `(public)/events/page.tsx`. Non cambia il comportamento misurato oggi —
   **lo rende una decisione invece che un effetto collaterale di `cookies()`**,
   e lo rende un errore visibile se qualcuno lo rimuove. E' il gate *cache
   esplicita* di `nextjs-architecture.md` applicato alla lettera.
2. **Escludere il dettaglio serata dalle tre cache di pagina del service
   worker.** Una regola `NetworkOnly` in `doorRuntimeCaching` **prima** di
   `defaultCache` — l'ordine e' load-bearing e il file lo dice gia'
   (`sw.ts:28-30`) — su `pathname.startsWith("/events/")`. **Il costo va
   dichiarato:** senza rete, quella pagina non si apre piu' affatto. E' il
   compromesso corretto in questo dominio, ed e' l'**opposto** di quello della
   porta: `checkin-offline.md` vuole che la porta funzioni senza rete;
   `venue-secrecy.md` vuole che il venue non si mostri quando lo stato non e'
   determinabile. `meta-gates.md`: fra due gate in conflitto **vince il piu'
   restrittivo, e il conflitto si documenta nel commit**.
3. **Nessun `generateMetadata` sulle pagine evento.** Non esiste oggi
   (`nextjs-architecture.md`, gate *metadata e Open Graph*) e **non va aggiunto
   in questa fase**: un'anteprima social e' contenuto pubblico cacheato da
   terzi, cioe' una cache condivisa fuori dal nostro controllo.
4. **`revalidatePath` va guardato.** `actions.ts:560-563` invalida
   `/admin/events`, `/events` e `/events/${slug}`. La server action di
   rivelazione deve fare lo stesso, o la pagina resta al valore precedente per
   il tempo che Next decide.

---

## G. I due difetti piegati che non sono il venue

### G.1 — `postgrest-details-leaks-the-row.md`

**Stato ri-misurato oggi:** il todo (2026-08-08) dice che nessun endpoint
rispedisce l'oggetto errore al client e che la fuga arriva ai log del server via
~20 `console.error(categoria, error)`. **Il progetto ha gia' incorporato la
regola in due migration recenti**, che vanno citate come precedente invece che
riscritte:

- `membership_register.sql:437-440` — *«il chiamante ramifica su `error.code =
  '23514'` e mai su un messaggio parsato — Next redige il messaggio di una
  Server Action in una build di produzione — e mai logga `error.details`, che su
  questa tabella porta la RIGA INTERA»*
- `assignment_acts.sql:358-364` — stessa frase, per `party_assignments`

**Dove tocca questa fase.** La guardia di D-37-19/22 rifiuta una scrittura su
`event_parties`, **e quella riga porta `venue_text`, `venue_id`,
`venue_secret_hint` e ogni parametro di rivelazione**. Le tre forme e il loro
verdetto sono in § D.5: **RPC con rifiuto tipizzato**, che non produce nemmeno
un `error` da loggare per sbaglio.

**Vincolo per ogni `catch` nuovo della fase:** si logga `error.code` e
`error.message`, **mai `error` intero, mai `error.details`**.

### G.2 — `login-client-redirect-not-allow-listed.md`

**Verificato oggi sull'albero corrente:**

| Riga | Codice |
|---|---|
| `src/app/(auth)/login/page.tsx:11` | `const nextUrl = searchParams.get("next") \|\| "";` |
| `src/app/(auth)/login/page.tsx:52` | `window.location.href = nextUrl \|\| "/dashboard";` |
| `src/app/(auth)/login/page.tsx:99` | propaga `?next=` verso `/register` |
| `src/lib/supabase/middleware.ts:466` | `url.searchParams.set("redirect", pathname);` |

Fra `:11` e `:52` **nessuna validazione**. La difesa gemella esiste e funziona:
`src/app/api/auth/callback/route.ts:44-49` (`NEXT_ALLOW_LIST`, quattro pattern
ancorati) e `:52-90` (`resolveNext`, con i cinque rifiuti nominati uno per uno).

**L'ordine e' un vincolo, non una preferenza,** e viene dal todo stesso: oggi il
middleware scrive `redirect` mentre la pagina legge `next`, quindi la riga non
validata non e' raggiungibile *da quel percorso*. **Allineare i nomi senza
aggiungere la allow-list attiva l'apertura.** Prima la allow-list, poi
l'allineamento.

**Da tenere separato nei piani e nei commit** (D-37-25 area, decisione del
proprietario): non tocca il venue, e mescolarlo significa che nessuno dei due
viene guardato per quello che e'. **Raccomandazione: un piano proprio**, ultimo
nell'ordine, senza dipendenze verso gli altri.

**Cosa il todo chiede e che il piano deve onorare:** *«chi chiude questo todo lo
provi con una richiesta reale prima di dichiararlo risolto, e lo provi **anche
dopo** il rimedio.»* Il codice letto dice di si'; non e' un'osservazione.

---

## Don't Hand-Roll

| Problema | Non costruire | Usa invece | Perche' |
|---|---|---|---|
| Scrittura + traccia atomiche | due chiamate PostgREST dalla server action | una funzione `SECURITY DEFINER` sul modello di `record_party_assignment_act` | Due chiamate PostgREST non sono atomiche. Un atto senza traccia e' l'unico esito che D-37-17 vieta, e fallisce in silenzio |
| Conversione data+ora → istante | `new Date(\`${date}T${time}\`)` | `partyStartInstant()` da `src/utils/datetime.ts` | Sei varianti gia' nate cosi'. Su un cron giornaliero due ore di scarto valgono un giorno |
| Il default della finestra | un `?? 25` in due file | una costante **e una funzione** in `datetime.ts` | Il difetto attuale e' esattamente due `?? 24` in due file |
| Deduplicazione dei destinatari | un secondo conteggio nella server action | il `Map<email,…>` del cron, estratto (`route.ts:78-106`) | Due implementazioni = due numeri per lo stesso atto irreversibile |
| Risoluzione ruolo/stato | rileggere `profiles` | `getAccessContext()` — `cache()`-scoped | CAP-01: una sola definizione. Un secondo resolver e' un secondo verdetto |
| Convalida di un redirect | una seconda allow-list | estrarre `resolveNext`/`NEXT_ALLOW_LIST` da `api/auth/callback/route.ts` | Una seconda lista diverge al primo indirizzo nuovo |
| Fine della serata in SQL | aritmetica sulle date nella funzione | `public.party_end_instant(date, time)` | Esiste gia' (`20260809000000_party_assignments.sql`) ed e' l'unica variante autorizzata di `partyEndInstant` |
| Ricalcolo del confine notte | rifare la regola «prima di mezzogiorno = giorno dopo» | `nightBoundaryInstant` via `partyEndInstant`/`menuCloseInstant` | Era ripetuta in cinque posti |
| Un registro cronologico separato delle rivelazioni | una seconda superficie | la traccia sulla serata (D-37-17) | Una seconda superficie e' comunque un elenco di indirizzi con una data accanto, da proteggere di suo |

---

## Common Pitfalls

### P1 — Riusare `venue_reveal_email_sent` come predicato di pagina
**Cosa va storto:** la pagina apre l'indirizzo su una serata che il cron ha solo
**spazzato**. **Perche':** `route.ts:108-115` alza il flag anche con zero
destinatari. **Come evitarlo:** colonna dedicata (§ A.4). **Segnale precoce:**
una serata segreta senza biglietti ne' RSVP che mostra l'indirizzo il giorno
dopo l'apertura della finestra.

### P2 — Chiudere `venues_select_public` e rompere in silenzio le due liste
**Cosa va storto:** l'embed annidato per un anonimo restituisce **vuoto**, non
un errore; la serata perde il nome del locale e nessun `catch` scatta.
**Perche':** PostgREST risponde `data: null` (misurato, `36-11-SUMMARY.md:159-170`).
**Come evitarlo:** verifica con la **chiave anonima contro le pagine vere**, non
il build. **Segnale precoce:** una card senza nome di locale in ambiente di
sviluppo con una sessione — che non e' il lettore che conta.

### P3 — Spostare `/venues` e credere di aver chiuso l'indirizzo
**Cosa va storto:** l'indirizzo resta leggibile via PostgREST con la chiave
anonima; e' stato spostato solo l'indirizzo *web*. **Perche':** il route group
sceglie l'indirizzo, la RLS decide i dati (`CLAUDE.md` principio 2). **Come
evitarlo:** trattare D-37-23 e la policy come **due lavori distinti**, in due
task distinti, con due verifiche distinte.

### P4 — Alzare il default a 25 in due file
**Cosa va storto:** i due si separano e la pagina apre a un'ora diversa da
quella per cui il cron spedisce. **Perche':** e' gia' successo sei volte in
questo repo con le conversioni orarie. **Come evitarlo:** § E.2.

### P5 — Scrivere `event_parties` con la sessione dell'organizer
**Cosa va storto:** funziona per chi ha creato la serata e **fallisce
silenziosamente** per chiunque altro — cioe' proprio nel caso per cui il bottone
esiste. **Perche':** `event_parties_update_own` esige master o proprietario.
**Come evitarlo:** § D.4. **Segnale precoce:** «funziona in sviluppo» — dove chi
prova e' quasi sempre il proprietario.

### P6 — Un `CHECK` per la guardia del secondo tentativo
**Cosa va storto:** su violazione, `error.details` porta la **riga intera**, che
contiene i campi del venue, e finisce in un `console.error`. **Come evitarlo:**
rifiuto tipizzato per valore (§ D.5, § G.1).

### P7 — Legare l'RSVP a `venue_reveal_on_purchase`
**Cosa va storto:** spegnere il flag su una serata a RSVP toglie l'indirizzo in
pagina a chi ha dichiarato che viene, **mentre il cron continua a mandarglielo**.
**Perche':** `route.ts:63-68` non consulta quel flag. **Come evitarlo:** § A.2.

### P8 — Il `console.error` che prosegue, ripetuto nella server action
**Cosa va storto:** un invio parziale non raggiunge nessuno. **Perche':** non
esiste error tracking. **Come evitarlo:** il risultato torna **come valore**
(§ D.2) e la UI mostra tre stati. **Segnale precoce:** un `catch` nella nuova
action che non scrive nulla nel valore di ritorno.

### P9 — Il messaggio di un rifiuto letto sul client
**Cosa va storto:** funziona in `next dev`, smette in produzione. **Perche':**
Next redige i messaggi delle Server Action (`server.ts:59-63`, D-36-10). **Come
evitarlo:** ramificare sulla **forma** del fallimento.

### P10 — Legare la traccia a `event_parties` con `ON DELETE CASCADE`
**Cosa va storto:** cancellare una serata cancella la prova che il suo indirizzo
e' diventato pubblico. **Come evitarlo:** `ON DELETE SET NULL` + etichetta
denormalizzata, come `membership_acts.party_id` (`:272`) e
`ticket_refunds.refunded_ticket_id`.

### P11 — Spostare il cuore della rivelazione fuori dal raggio del suo gate
**Cosa va storto:** `venue-secrecy.md` non si carica piu' sul file piu' critico
della fase. **Perche':** i suoi `paths:` non coprono `src/lib/**`. **Come
evitarlo:** allargare i `paths:` **nello stesso commit** e rimisurare il context
budget (`ai-engineering.md`).

### P12 — Dimenticare la voce in `PUBLIC_ALLOW` di `verify-routes.mjs`
**Cosa va storto:** la allow-list dichiara pubblico un indirizzo che non esiste
piu', e il controllo diventa un timbro. **Come evitarlo:** § B.5 punto 4.

---

## Runtime State Inventory

> La fase non e' un rename, ma **muove uno stato che esiste gia' in
> produzione** e aggiunge una migration. Le categorie che si applicano:

| Categoria | Cosa e' stato trovato | Azione richiesta |
|---|---|---|
| **Dati memorizzati** | `event_parties.venue_reveal_hours` — righe con un valore **esplicito** sotto 25 (numero **non misurato**: nessun accesso al database aperto da questa ricerca). Righe a `NULL`: anticipano di **un'ora esatta** col nuovo fallback. Il todo registra **due** serate con `venue_secret = true` in produzione al 2026-08-10 | **Elenco (SELECT) e decisione una per una col proprietario** — mai un `UPDATE` (D-37-06 punto 4) |
| **Configurazione di servizi vivi** | `vercel.json` — quattro cron, tutti giornalieri; `venue-reveal` a `0 6 * * *`. **Nessuna espressione da cambiare in questa fase** (D-37-07) | nessuna |
| **Stato registrato dall'OS** | nessuno — nessuna registrazione a livello di sistema operativo in questo progetto | nessuna |
| **Segreti e variabili d'ambiente** | `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL` — tutti gia' in uso dal cron (`route.ts:12, 16, 19, 118`). **La fase non ne introduce di nuovi** se il percorso manuale riusa il modulo condiviso | nessuna |
| **Artefatti di build / cache client** | **Il service worker ha 24 h di vita.** Un dispositivo che ha aperto `/events/[slug]` prima del deploy continua a poter servire la copia vecchia. **Serwist e' `skipWaiting: true, clientsClaim: true`** (`sw.ts:57-58`), quindi il worker si aggiorna alla prima visita — ma le **voci gia' in Cache Storage** sopravvivono finche' non scadono o non vengono sovrascritte | **Da mettere nella procedura di verifica**: la prima misura si prende in **finestra privata**, o si misura il worker vecchio |
| **Cascate da `event_parties`** (per l'istantanea, `ai-engineering.md`) | **16 vincoli con `ON DELETE CASCADE`**: `ticket_tiers`, `tickets`, `rsvps`, `pending_purchases`, `drink_items`, `drink_orders`, `drink_tokens` (`20260306400000:7,15,21`), `guest_list_entries`, `discount_codes`, `door_scan_events` (×2), `attendances`, `party_credits`, `party_assignments`, `event_media`. Piu' **1 `ON DELETE SET NULL`**: `membership_acts.party_id` | **Ogni procedura di verifica che scrive in produzione prende l'istantanea su tutte e diciassette**, lette dai vincoli — non ricordate. E' esattamente l'elenco che l'incidente della fase 36 non aveva |

---

## Environment Availability

| Dipendenza | Serve per | Disponibile | Versione | Fallback |
|---|---|---|---|---|
| Node / `npm run build` | typecheck + gate dei tipi | **si'** | `next 16.1.6`, `react 19.2.3` — build eseguita oggi, **exit 0** | — |
| `npm run verify:routes` | anello 3 di CAP-02 (mappa ↔ disco) | si' | — | — |
| `npm run verify:capabilities` | anello 1 (database ↔ `CAP`) | **richiede un database vivo** | — | **nessuno.** Va dichiarato come passo pre-deploy manuale |
| `npm run verify:persona` | coerenza della persona | si' | — | — |
| Test runner del prodotto | — | **NO** | — | `npm run build` + procedura manuale scritta |
| Error tracking | osservabilita' | **NO** | — | effetto osservabile nella UI o nei dati |
| CI | esecuzione automatica dei tre anelli | **NO** (D-34-12) | — | passi pre-deploy scritti nel piano |
| Chiave anonima Supabase | verifica di § B e D-37-25 | si' (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) | — | — |
| Sessione `organizer` / `staff` in produzione | provare un **rifiuto per ruolo** | **NO** — *«`organizer` e `staff` non esistono in produzione, e nessuno strumento di questo repository puo' autenticarsi come uno»* (`36-13-SUMMARY.md:434-441`) | — | **Nessuno.** Debito di **32 voci `human_needed`** fra `43-`, `35-` e `34-VERIFICATION.md`. La fase 37 **non lo consuma e non lo peggiora**, ma costruisce sopra il modello dei permessi un percorso irreversibile: **va detto** |
| PITR sul database | recupero da una scrittura sbagliata | **NO** — decisione del proprietario (`STATE.md:164`, blocco D12) | — | istantanea manuale prima di ogni scrittura |

**Dipendenze mancanti senza fallback:** una sessione di ruolo non-master in
produzione; PITR; error tracking; CI.

---

## Validation Architecture

> Non esiste un test runner per il prodotto. Questa sezione definisce come
> ciascuno dei quattro criteri di successo diventa **evidenza osservabile**, con
> i quattro gate dell'incidente della fase 36 davanti.

### Framework di test

| Proprieta' | Valore |
|---|---|
| Framework | **nessuno** — `package.json` non ha script `test`; nessun `*.test.*` / `*.spec.*` |
| Gate dei tipi | `npm run build` (`next build --webpack`) — **e' anche il typecheck** |
| Controlli meccanici disponibili | `npm run verify:routes`, `npm run verify:capabilities` (serve database), `npm run verify:persona`, `npm run baseline:rls` |
| Comando rapido per commit | `npm run build` |
| Gate di fase | `npm run build` + `verify:routes` + `verify:capabilities` verdi, **piu'** la procedura anonima scritta sotto |

### I quattro principi che governano ogni misura

1. **La misura non si prende con lo strumento che ha causato l'effetto.** Una
   rimozione fatta dall'interfaccia si conferma nel database; una modifica fatta
   nel database si conferma nell'interfaccia. *(Nell'incidente il contatore di
   controllo leggeva la stessa lista su cui si stava cliccando e non ha
   protestato.)*
2. **Le righe create per una prova si catturano per chiave primaria alla
   creazione e si rimuovono per chiave primaria.** Mai cliccando un controllo di
   cancellazione, mai risalendo un albero di elementi.
3. **L'istantanea copre le cascate**, tutte e diciassette (§ Runtime State
   Inventory), lette dai vincoli.
4. **L'autorizzazione a scrivere in produzione si consuma una volta**, copre
   esattamente cio' che e' stato descritto, e chi la riceve dichiara quando l'ha
   esaurita.

### Criteri di successo → evidenza

| # | Criterio (ROADMAP) | Cosa si misura | Da quale superficie | Con quale chiave | Tocca la produzione? |
|---|---|---|---|---|---|
| **1** | *Una serata senza azione manuale rivela il venue come oggi, all'istante previsto* | (a) `isVenueVisible` restituisce lo stesso verdetto dei rami 100-115 su una serata con `venue_revealed_at IS NULL`; (b) il cron seleziona la stessa serata di prima del cambio filtro | (a) pagina reale con tre sessioni; (b) **il database**, non il log del cron | (a) anonima + membro approvato + titolare; (b) service key, **sola lettura** | **NO** se si usa una serata gia' esistente e non segreta. **SI'** per il caso «segreta e finestra aperta» |
| **2** | *Master o organizer possono rivelare a mano solo dopo una conferma esplicita che nomina cio' che sta per diventare pubblico* | il testo della conferma nomina il posto, **il numero** e l'irreversibilita'; il numero coincide con `emailMap.size` | superficie di lavoro + **conteggio riletto dal database**, non dalla schermata che l'ha mostrato *(principio 1)* | sessione master | **SI'** — l'atto e' irreversibile per definizione |
| **3** | *Una rivelazione manuale completata registra chi e quando, visibile allo staff che ne ha titolo* | una riga nella traccia con l'attore e l'istante; la serata la mostra; **un secondo atto non cancella il primo** | traccia letta **dal database** dopo un'azione fatta **dall'interfaccia** *(principio 1)* | service key in lettura, poi sessione di lavoro per il rendering | **SI'** |
| **4** | *Un secondo tentativo su una serata gia' rivelata non cambia nulla e lo dice — l'interruttore resta a senso unico* | (a) il bottone e' **spento** e porta data e nome; (b) l'invocazione diretta della server action **rifiuta**; (c) `venue_revealed_at` **non cambia**; (d) il ri-nascondere del master lascia la traccia intatta | (a) pagina; (b) chiamata diretta all'action; (c-d) database | sessione master + sessione organizer approvato | **SI'** |

**Il criterio 2 richiede una misura che oggi non e' producibile:** provare che un
organizer **non** proprietario e **approvato** riesce, e che uno **non**
approvato viene **rifiutato**, richiede due sessioni che in produzione non
esistono. **Va dichiarato `human_needed`**, come le 32 voci gia' aperte, non
aggirato — e va detto che la fase costruisce un percorso irreversibile sopra un
modello di permessi che nessuno ha ancora visto rifiutare qualcuno.

### La procedura anonima obbligatoria (D-37-25) — modellata su V3 della fase 36

Il precedente eseguito e' `.planning/phases/36-formats-series-numbering/36-13-SUMMARY.md`,
e va **ripetuto** invece che ricordato:

1. **Prima:** hash per tabella e conteggi di riferimento su `venues`,
   `event_parties`, `events` con la service key, **in sola lettura**. E'
   l'istantanea del principio 3.
2. **Sonda diretta con la sola `NEXT_PUBLIC_SUPABASE_ANON_KEY`, nessuna
   sessione**, chiedendo **per chiave primaria** — non per conteggio, perche' un
   totale stabile non distingue un rifiuto da una coincidenza
   (`36-13-SUMMARY.md:206`):
   ```
   GET /rest/v1/event_parties?select=id,venue_secret,venues(name,address,google_maps_url)&id=eq.<id serata segreta>
   GET /rest/v1/venues?select=id,name,address,google_maps_url&id=eq.<id sede segreta>
   GET /rest/v1/venues?select=id,name,address&id=eq.<id sede NON segreta>   ← deve rispondere (D-37-24)
   ```
3. **Il sorgente, non il rendering.** `curl` su `/events`, `/events/<slug>` e —
   dopo lo spostamento — `/venues/<slug>`, e ricerca di **aghi dichiarati**
   sull'**intero documento, payload RSC compreso**: l'indirizzo, il link Maps,
   il nome della sede, l'id della sede. E' il passo che intercetta § B.2, che
   nessuno sguardo al rendering avrebbe visto.
4. **La strada positiva di D-37-24**, sulla stessa corsa: una serata **non**
   segreta continua a mostrare nome e indirizzo del locale a un lettore anonimo.
   Senza questa misura il rimedio e' indistinguibile da una rottura.
5. **La prova della cache** (D-37-09): la stessa pagina in **finestra privata**
   (service worker pulito) e in una finestra che l'ha gia' visitata, prima e
   dopo l'istante. Due letture, dichiarate come tali.
6. **Dopo:** ri-lettura degli hash e dei conteggi. Il confronto e' riga per riga
   contro i valori presi al punto 1.

**Cosa la procedura non prova, da scrivere invece che aggirare** — e' la stessa
formulazione che la fase 36 ha usato: prova che *N aghi dichiarati* non
compaiono in *M documenti letti in un momento preciso*, e che righe chieste per
chiave primaria sono state rifiutate. **Nessun meccanismo qui puo' asserire
l'assenza di un canale.**

### Cosa e' verificabile **senza** toccare la produzione

| Verificabile senza scritture | Richiede una scrittura |
|---|---|
| Le policy nuove, contro serate **gia' esistenti** — la lettura anonima e' un `GET` | Il criterio 2 (l'atto e' irreversibile: non c'e' un modo di provarlo senza compierlo) |
| `npm run build`, `verify:routes`, `verify:capabilities` | Il criterio 3 (una traccia esiste solo se un atto e' avvenuto) |
| Il pavimento a 25 ore (il rifiuto della validazione e' una lettura del form) | Il criterio 4 (serve una serata **gia' rivelata**) |
| La postura di cache (`build` + ispezione delle intestazioni) | |
| La query READ-ONLY di § E.3 | |
| L'assenza di `venue_address` dal payload RSC (§ B.2) — `curl` e basta | |

**Preferire, sempre, le procedure che non toccano la produzione.** Per i tre
criteri che la toccano: **una serata di prova, creata e rimossa per chiave
primaria catturata alla creazione**, con l'istantanea sulle diciassette tabelle
prima e il confronto degli hash dopo — e **un solo ciclo**, senza risemina.

---

## Security Domain

`security_enforcement` non e' configurato in `.planning/config.json`: trattato
come attivo.

### Categorie ASVS applicabili

| Categoria | Si applica | Controllo standard in questo progetto |
|---|---|---|
| V1 Architettura | **si'** | `capability-routes.ts` (raggiungibilita') + RLS (dati). **Sono due cose diverse e la fase le tocca entrambe** |
| V2 Autenticazione | no | Nessun cambio ai percorsi di autenticazione (il redirect del login e' G.2, ed e' autorizzazione post-login) |
| V3 Gestione sessione | no | — |
| **V4 Controllo d'accesso** | **si', ed e' il cuore** | `private.has_capability` + policy RLS. **Nessun controllo nuovo che non passi da li'** (CAP-01) |
| **V5 Validazione input** | **si'** | Nessuna libreria di schema in `package.json` — la validazione e' a mano (`actions.ts:395-427`). Il `partyId` che arriva alla server action e' input non fidato e va validato come uuid **prima** di raggiungere la funzione |
| V6 Crittografia | no | Nessun segreto crittografico nuovo |
| V7 Log ed errori | **si'** | § G.1: `error.code` e `error.message`, **mai `error.details`** |
| V8 Protezione dati | **si'** | L'indirizzo di una sede segreta e' il dato protetto della fase. La traccia di D-37-18 porta un nome per esteso: sta nel database, **non in un artefatto** |
| V13 API | **si'** | Il cron e' autenticato dal solo `Bearer CRON_SECRET`; la server action e' un endpoint pubblico che ri-chiede la capability |

### Minacce note per questo stack

| Pattern | STRIDE | Mitigazione |
|---|---|---|
| Lettura diretta di PostgREST che aggira la UI | **Information Disclosure** | Policy RLS — § B.3. **La sola pagina non e' una mitigazione**, e il progetto lo scrive gia' nel proprio codice (`(public)/venues/[slug]/page.tsx:41-47`) |
| Prop non renderizzate nel payload RSC | **Information Disclosure** | § B.2 — non selezionare cio' che non si rende |
| Server action invocata direttamente | **Elevation of Privilege** | La action ri-chiede la capability al proprio interno; la funzione SQL e' `REVOKE`-ata da `anon` e `authenticated` |
| `SECURITY DEFINER` in `public` esposta via PostgREST | **Elevation of Privilege** | `REVOKE` **poi** `GRANT`, due statement, nell'ordine (`membership_register.sql:479-489`) |
| `search_path` mutabile su `SECURITY DEFINER` | **Elevation of Privilege** | `SET search_path = ''` + ogni riferimento qualificato (`capability_model.sql:166-171`) |
| `error.details` che restituisce la riga | **Information Disclosure** | § G.1 |
| Open redirect dopo il login | **Spoofing** | § G.2 — riusare `resolveNext`, non riscriverlo |
| Nessun rate limiting, in tutto il repo | **Denial of Service / oracolo** | Verificato 2026-08-05: nessuna dipendenza, nessuna implementazione. **La fase non deve aggiungere endpoint che rispondano «valido / non valido»** |
| Cache che attraversa l'istante di rivelazione | **Information Disclosure** | § F |
| `venue_text` leggibile da `anon` per una serata segreta | **Information Disclosure** | § B.1 punto 1 — **registrato, fuori perimetro** |
| `event_media` di una serata segreta leggibile da ogni account autenticato | **Information Disclosure** | § B.1 punto 2 — **registrato, fuori perimetro** |

---

## Package Legitimacy Audit

**Nessun pacchetto nuovo.** Ogni forma raccomandata usa dipendenze gia' presenti
(`@supabase/supabase-js`, `@supabase/ssr`, `resend` via `src/lib/email.ts`,
`@react-email/render`, `next`, `react`, `@serwist/next`). Nessuna installazione
→ nessuna verifica di legittimita' richiesta.

Se un piano proponesse una libreria di validazione di schema per V5: **oggi non
ce n'e' nessuna nel repo**, aggiungerne una e' una decisione di architettura e
non appartiene a questa fase.

---

## Assumptions Log

| # | Affermazione | Sezione | Rischio se sbagliata |
|---|---|---|---|
| A1 | La produzione ha **due** serate con `venue_secret = true` | § E.3, Runtime State | Preso dal todo (misurato 2026-08-10) e **non ri-misurato qui**: nessun accesso al database aperto. Se sono di piu', l'elenco di D-37-06 punto 4 e' piu' lungo — non cambia il metodo |
| A2 | Nessuna riga di `event_parties` porta un indirizzo in `venue_text` | § B.1 | Il todo lo dice per le due serate segrete di oggi. **E' un fatto sui dati, non una garanzia**: `venue_text` resta un campo libero leggibile da `anon` |
| A3 | R1 (policy condizionata) regge le prestazioni di `/events` | § B.3 | Da provare con `EXPLAIN` prima di sceglierla. Se non regge, R2 con la riscrittura degli embed |
| A4 | Nessun percorso oltre il middleware costruisce un URL di login con `?next=` o `?redirect=` | § G.2 | Il todo lo dichiara **non verificato**. Va guardato prima di scegliere quale nome tenere |
| A5 | Il caso peggiore del context budget non cambia allargando i `paths:` di `venue-secrecy.md` | § D.2 | Da rimisurare: margine attuale **1.378 token** su 12.000 |
| A6 | `capabilities` risolte in `getAccessContext()` bastano al ramo del livello 2 senza letture nuove | § A.3 | Misurato leggendo `page.tsx:152-168`. Confidenza alta |

---

## Open Questions (RESOLVED — chiuse dai piani il 2026-08-10)

> Tutte e sei sono state chiuse in fase di pianificazione. Ognuna porta sotto il
> piano che la chiude e **come**. Nessuna resta aperta all'esecuzione: se un
> esecutore trova una di queste domande ancora viva nel codice, e' un segnale che
> il piano corrispondente ha deviato, non che la domanda non avesse risposta.

1. **Il cron che completa deve raggiungere chi ha comprato DOPO la rivelazione?**
   - *Cosa sappiamo:* D-37-21 dice «completa cio' che manca»; D-37-08 dice «chi
     acquista dopo lo vede in pagina, **senza mail**»; la sezione Deferred rimanda
     l'invio all'acquisto a una fase sua.
   - *Cosa non e' chiaro:* se «i mancanti» di D-37-20 includa chi non esisteva
     quando qualcuno ha premuto.
   - *Raccomandazione:* **L1** (§ D.3) — il completamento si limita ai
     destinatari creati **prima** di `venue_revealed_at`. E' la lettura che
     onora entrambe le decisioni, ed e' implementabile con una condizione.
     Se chi pianifica sceglie L2, **va portata al proprietario**, perche' crea
     un percorso di mail dichiarato differito.
   - **CHIUSA — piano 37-09:** adottata L1. Il completamento si limita ai
     destinatari creati **prima** di `venue_revealed_at`. D-37-08 resta intatta.

2. **La sede che ospita sia una serata pubblica sia una segreta.**
   - *Cosa sappiamo:* la pagina pubblica delle sedi sceglie gia' oggi di
     **trattenere** (`(public)/venues/[slug]/page.tsx:65-70`).
   - *Cosa non e' chiaro:* se R1 debba replicare quella scelta a livello di
     policy — cioe' rendere la sede invisibile finche' **una** serata segreta la
     nomina.
   - *Raccomandazione:* replicarla. E' il gate *default chiuso*, ed e' gia' la
     scelta di casa. Costo: il nome di un locale pubblico sparisce dalla lista
     finche' una serata segreta lo usa.
   - **CHIUSA — superata da D-37-23, piano 37-02/37-08:** la domanda presupponeva
     una policy che discrimina sede per sede. Il rimedio scelto revoca `anon` su
     `public.venues` **per intero** e concede **per serata** via
     `public.venue_for_parties(uuid[])`, quindi il caso di bordo «una sede, due
     serate di regime diverso» si risolve alla serata e non alla sede: non esiste
     piu' una scelta da replicare.

3. **Il link `/venues/<slug>` sulla pagina evento dopo D-37-23.**
   - *Cosa sappiamo:* `events/[slug]/page.tsx:770` linka li' quando il venue e'
     visibile; dopo lo spostamento l'indirizzo e' rifiutato a un pubblico.
   - *Raccomandazione:* per chi non ha la capability, rendere il **nome come
     testo**, non come link. Piu' stretto, e non richiede di conoscere il nuovo
     indirizzo lato pubblico.
   - **CHIUSA — piano 37-06, Task 2:** nome come testo, link rimosso. E lo stesso
     piano chiude il difetto che la domanda nascondeva: tolta `/venues` dal
     pubblico, un titolare di biglietto non avrebbe piu' avuto **dove** leggere
     l'indirizzo — quindi 37-06 rende nome, indirizzo e link Maps **in pagina**
     per chi ha titolo.

4. **Se la traccia debba essere una tabella nuova o due colonne + `membership_acts`.**
   - *Cosa sappiamo:* D-37-22 richiede almeno due atti sulla stessa serata;
     `membership_acts` non ha parole per questo atto e non nomina mai una
     persona.
   - *Raccomandazione:* tabella propria (§ D.4). Registrato come discrezione di
     chi pianifica, con la raccomandazione motivata.
   - **CHIUSA — piano 37-01:** tabella append-only propria
     `public.venue_reveal_acts`, scritta con la riga dallo stesso
     `SECURITY DEFINER`. **Tre** atti, non due: `revealed`, `completed`,
     `re_hidden` — l'invio ai mancanti di D-37-20 manda indirizzi a N persone ed
     e' attribuibile quanto il primo.

5. **Come si prova un rifiuto per ruolo, senza sessioni di ruolo in produzione.**
   - *Cosa sappiamo:* il debito e' registrato, 32 voci `human_needed`.
   - *Cosa non e' chiaro:* se questa fase debba consumarne una parte, dato che
     costruisce un percorso irreversibile.
   - *Raccomandazione:* **non aggirarlo e non fingerlo.** Dichiararlo nel
     VERIFICATION.md come voce `human_needed` propria, e dire che la fase
     costruisce sopra un modello di permessi mai visto rifiutare qualcuno.
   - **CHIUSA — piani 37-08 / 37-10 / 37-11 / 37-13, piu' `37-VALIDATION.md`:**
     tre voci `human_needed` dichiarate come tali (organizer approvato non
     proprietario che riesce, organizer non approvato respinto, cron che
     completa). Portate avanti, non silenziate.

6. **Se `EventTabs` debba perdere `venue_address`/`venue_google_maps_url` in
   questa fase o in un piano suo.**
   - *Raccomandazione:* **in questa fase.** E' due righe, chiude una fuga
     misurata, e lasciarla aperta significa che il rimedio RLS sembrera'
     completo mentre non lo e'.
   - **CHIUSA — piano 37-05, Task 2:** i due campi escono da `EventTabs`, in
     questa fase.

---

## Sources

### Primarie (confidenza ALTA — codice e migration letti oggi, 2026-08-10)

- `src/app/(public)/events/[slug]/page.tsx` — `isVenueVisible:87-117`, contesto
  d'accesso `:152-168`, query serate `:223`, `userTicket`/`userRsvp` `:301-322`,
  sito di chiamata `:683-696`, blocco venue `:765-787`
- `src/app/(public)/events/page.tsx` — embed `:212`, costruzione `VenueInfo`
  `:257-275`, gate del nome `:287-308`, gestione errori `:280-285`
- `src/app/(public)/events/EventTabs.tsx` — `"use client"` `:1`, prop
  `:11-16`, rendering venue `:246-259`
- `src/app/(public)/events/[slug]/SecretVenueDialog.tsx` — `:11`, `:19`, `:66-70`
- `src/app/(public)/venues/[slug]/page.tsx` — mitigazione di pagina `:38-70`
- `src/app/api/cron/venue-reveal/route.ts` — file intero, 182 righe
- `src/app/(admin)/admin/events/actions.ts` — `:395-427`, `:464`, `:560-563`,
  `:625`, `:650-653`, `:722`, `:827-831`, `:878-881`
- `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx` — docblock `:12-60`
- `src/lib/capabilities/keys.ts`, `src/lib/capabilities/server.ts`,
  `src/lib/capabilities/guards.ts`, `src/lib/routes/capability-routes.ts`
- `src/lib/supabase/server.ts`, `src/lib/supabase/service.ts`,
  `src/lib/supabase/middleware.ts:466`
- `src/app/api/auth/callback/route.ts:44-90`, `src/app/(auth)/login/page.tsx:11,52,99`
- `src/utils/datetime.ts` — file intero
- `src/app/sw.ts` — file intero
- `scripts/verify-routes.mjs:126-146,419`, `scripts/verify-capabilities.mjs`
- `vercel.json`, `package.json`
- `node_modules/@serwist/next/dist/index.worker.js` — `defaultCache` estratto
  (versione **9.5.6**)
- Migration: `20260225150000_party_architecture.sql`,
  `20260226200000_venues.sql`, `20260226300000_multi_sub_events.sql`,
  `20260226400000_party_lineup_venue_secret.sql`,
  `20260226500000_venue_secret_hint_reveal_hours.sql`,
  `20260305200000_venue_reveal_on_purchase.sql`,
  `20260306400000_drinks_party_id.sql`, `20260225120000_phase7_media.sql`,
  `20260224_rbac_migration.sql`, `20260807000000_capability_model.sql`,
  `20260807010000_policies_to_capabilities.sql`,
  `20260807020000_wrap_auth_uid.sql`, `20260808002000_membership_register.sql`,
  `20260809002000_assignment_acts.sql`, `20260810120000_formats_and_series.sql`,
  `supabase/schema.sql`
- **`npm run build` eseguito oggi** — exit 0, tabella delle rotte misurata

### Primarie — documentazione esterna (confidenza ALTA)

- `https://vercel.com/docs/cron-jobs/usage-and-pricing` — **ri-verificata alla
  fonte con Firecrawl il 2026-08-10**; pagina «Last updated July 15, 2026».
  Tabella dei piani e le due restrizioni Hobby citate testualmente in § E.1

### Secondarie (confidenza ALTA — artefatti interni, verificati contro il codice)

- `.planning/phases/36-formats-series-numbering/36-11-SUMMARY.md:25-27,159-170` —
  la misura `PGRST201` / `data: null`
- `.planning/phases/36-formats-series-numbering/36-13-SUMMARY.md:195-270,375-445` —
  la procedura V3 con la chiave anonima; **D9, assegnato alla fase 37**
- `.planning/todos/pending/secret-venue-address-readable-by-anon.md`
- `.planning/todos/pending/postgrest-details-leaks-the-row.md`
- `.planning/todos/pending/login-client-redirect-not-allow-listed.md`
- `.planning/STATE.md:163-164` — blocchi D7 e D12
- `.planning/REQUIREMENTS.md` — VENUE-01, VENUE-02
- `.planning/ROADMAP.md:468-484` — fase 37, i quattro criteri
- Gate di dominio: `venue-secrecy.md`, `meta-gates.md`,
  `time-and-scheduling.md`, `access-gating.md`, `supabase-data.md`,
  `ai-engineering.md`, `nextjs-architecture.md`, `ticketing-payments.md`

### Non usate

- `.planning/codebase/` — datata *2026-02-24*, dichiarata invecchiata da
  `CLAUDE.md` guardrail 4. **Nessuna affermazione ne e' stata presa.**

---

## Metadata

**Confidenza per area:**

| Area | Livello | Ragione |
|---|---|---|
| Misura del codice esistente | **ALTA** | Ogni riga citata e' stata aperta. Le sette citazioni di CONTEXT.md verificate: sei esatte, due con deriva di una riga (call site `682`→`683`, dialogo `68-69`→`68-70`), nessuna sbagliata |
| Enumerazione delle policy RLS | **ALTA** | Lette dalle migration, non dedotte. La precondizione del todo (`events`, `event_media`) e' stata eseguita e ha una risposta |
| Limiti Vercel | **ALTA** | Ri-verificati alla fonte oggi; pagina aggiornata 2026-07-15 |
| Postura di cache | **ALTA** | `npm run build` eseguita; `defaultCache` letto da `node_modules` |
| Forme raccomandate (predicato, traccia, capability, rimedio RLS) | **MEDIA** | Sono raccomandazioni motivate su precedenti misurati del repo, **non decisioni**. Chi pianifica puo' divergere, con la sua ragione |
| Prestazioni della policy R1 | **BASSA** | Non misurata. Da provare con `EXPLAIN` prima di sceglierla (A3) |
| Stato dei dati in produzione | **BASSA** | Nessun accesso aperto. I due numeri citati vengono dal todo (A1, A2) |

**Data della ricerca:** 2026-08-10
**Valida fino al:** 2026-09-09 per il codice e le migration (30 giorni); **7
giorni** per i limiti Vercel, se la fase dovesse cambiare un'espressione cron —
in quel caso **si ri-verifica alla fonte, non si cita a memoria**.

**Scritture in produzione effettuate da questa ricerca: zero.** Nessun `supabase
db push`, nessun `INSERT`/`UPDATE`/`DELETE`, nessun controllo di cancellazione
premuto. L'unico comando che ha prodotto artefatti e' `npm run build`, in locale.
