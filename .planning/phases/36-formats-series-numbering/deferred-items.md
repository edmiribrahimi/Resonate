# Phase 36 — deferred items

> Work discovered during execution that belongs to this phase but not to the
> plan that found it. Each entry names the plan that must close it.

---

## D1 — The `Formats` staff tab — **CHIUSA il 2026-08-10**

> **Chiusa dal piano 36-09, task 4.** Il task 1 dello stesso piano ha creato
> `src/app/(admin)/admin/(work)/formats/page.tsx`, l'indirizzo e' entrato
> nell'unione generata, e la riga e' stata riaccesa **senza cast e senza
> allargare il tipo**: `StaffTab.href` e' ancora `Route`, e
> `grep -c "as Route" src/lib/routes/staff-tabs.ts` restituisce 0.
>
> La prova non e' un'affermazione: `npm run build` esce 0, ed e' esattamente il
> controllo che in 36-06 falliva con
> `Type error: Type '"/admin/formats"' is not assignable to type 'Route'`.
> `npm run verify:routes` conta ora 24 pagine sotto `(admin)` e 24 pattern nella
> mappa, entrambi verdi.
>
> **La terza opzione della tabella qui sotto e' quella presa, e ha funzionato.**
> Le altre due restano scartate, e la ragione e' scritta accanto alla riga in
> `staff-tabs.ts` — non nel commento di lavoro che e' stato rimosso, ma nella
> prosa permanente: il tipo `Route` e' la ragione per cui un menu non puo'
> promettere un indirizzo che nessuno serve, ed e' lui ad aver avuto ragione.

**Found by:** plan 36-06, task 2.
**Closed by:** plan 36-09, task 4, il 2026-08-10.
**File:** `src/lib/routes/staff-tabs.ts` — the line is written out, commented,
next to `Venues`.

**What is done.** `/admin/formats` is bound to `CAP.CATALOGUE_MANAGE` in
`src/lib/routes/capability-routes.ts`, on the branch that opens addresses, with
`alsoGatesTables: true`. The middleware and the page guard both read that entry,
so the address is reachable for the key that opens it and refused for everyone
else the moment a page serves it.

**What is not done, and why.** The tab itself. `StaffTab.href` is typed `Route`,
and a static address enters the generated union only after a `page.tsx` serves
it — so the line fails the build today:

```
Type error: Type '"/admin/formats"' is not assignable to type 'Route'.
src/lib/routes/staff-tabs.ts:92:5
```

Three ways out were weighed and two rejected:

| Option | Cost | Verdict |
|---|---|---|
| Widen `StaffTab.href` to `Route \| (string & {})` | `typedRoutes` stops checking all seven existing tabs, and both consumers (`StaffNav.tsx:68-73`, `ManagementSection.tsx:51`) pass `tab.href` into `<Link href>`, so the loosening spreads to two more files | rejected |
| `"/admin/formats" as Route` on the one entry | Compiles; becomes dead weight the day the page lands and a permanent hole for a future typo, on the one file whose job is that a menu cannot promise an address nobody serves | rejected |
| Add the tab in the plan that creates the page | The tab is absent between wave 3 and wave 7 | **taken** |

**Nothing is unprotected by the wait.** Hiding a nav entry was never protection
(`access-gating.md`, gate *coerenza navigazione/permessi*); the refusal is the
middleware's and it is already in place. What the wait avoids is the opposite
failure — a staff member drawn a link to a 404.

---

## D2 — Every validation message of `admin/events/actions.ts` is redacted in production

**Found by:** plan 36-10, task 1.
**Must be closed by:** a later plan — it is **not** phase 36's, and phase 36 made
it neither better nor worse.
**File:** `src/app/(admin)/admin/events/actions.ts`, `validateEventData` and the
`throw new Error` sites around it.

**The fact.** `validateEventData` refuses with fifteen-odd distinct sentences
(*"Title must be between 3 and 100 characters"*, and now *"Pick a format. A night
cannot be saved without one."*). Next **redacts** the message of an error thrown
out of a Server Action in a production build
(`src/lib/capabilities/server.ts:59-63`), so every one of them reaches a person
in `next dev` and none of them reaches a person in production, where the form
shows Next's generic replacement instead.

**Why plan 36-10 did not fix it.** It is pre-existing and file-wide: converting
three of the fifteen throws to returned values would leave one function speaking
two languages, and converting all fifteen is a rewrite of the whole validation
contract plus every caller. The three causes this plan added follow the loop's
existing form on purpose, and the gap is compensated where a person actually
meets it: `format` and `series` are `required` in the browser, so those two
refusals happen before the action is called at all. The **database** refusals —
duplicate number, series/format mismatch — do travel as returned values, which
is the half that could not be compensated any other way.

**What would close it.** A `ValidationRefusal` union alongside `NightRefusal`,
returned rather than thrown, and `EventForm` rendering it per field.

---

## D3 — A refused create still costs a slug

**Found by:** plan 36-10, task 1.
**Must be closed by:** a later plan.
**File:** `src/app/(admin)/admin/events/actions.ts`, `createEvent`.

`createEvent` inserts the event row first and its nights second. When the nights
are refused, plan 36-10 now deletes the event row it just created — otherwise a
mistyped number would leave an empty draft behind every time, and after phase 36
a mistyped number is an ordinary outcome rather than a rarity.

**What is still true.** The slug uniqueness probe runs before the insert, so a
retried save after a refusal may produce a `-<suffix>` slug where the first
attempt would have had a clean one, if anything else claimed the name in between.
Small, cosmetic, and named here so it is not rediscovered as a bug.

---

## D4 — The current chip is not scrolled into view on mount

**Found by:** plan 36-11, task 3.
**Must be closed by:** a later plan, or accepted — it is a nicety, not a gate.
**File:** `src/app/(public)/events/FormatFilterRow.tsx`.

`36-UI-SPEC.md` §S1 asks that the current chip be scrolled into view on mount.
That needs JavaScript, and the same section requires this component to be a
**server** component so the filter works without any. The two asks meet here and
the second wins, because it is the one FMT-04 depends on.

**What is done instead.** The current chip carries `scroll-margin-inline: 24px`,
so any scroll the browser performs on its own — the one it does when a chip
receives keyboard focus — lands it on the page gutter rather than flush against
the edge.

**What is not done.** Nothing scrolls the row on first paint. With four chips
plus `All` the current one is reachable on a phone without scrolling, so the gap
is invisible today; it becomes visible the day the catalogue grows, which
`36-UI-SPEC.md` already names as the signal to revisit this surface rather than
let the row wrap.

---

## D5 — `npm run lint` fails on `EventTabs.tsx`, and did before this phase

**Found by:** plan 36-12, task 1.
**Must be closed by:** a later plan, or accepted deliberately.
**File:** `src/app/(public)/events/EventTabs.tsx`, the swipe machinery.

Four `react-hooks/refs` errors — *"Cannot access refs during render"* — on the
two lines that read a ref while rendering: the viewport width used to convert a
drag in pixels into a percentage, and the `touchAction` style that depends on
which axis the gesture locked onto.

**Why it was not fixed here.** Both lines are **older than this phase** and
untouched by it (`git diff` for this plan contains neither). The scope-boundary
rule says a plan repairs what its own changes broke; repairing the drag maths
means changing how the gesture measures itself, which is the one behaviour this
plan was written to conserve.

**What it costs today.** `npm run lint` is red on this file, so it cannot be used
as a gate for the surface — `npm run build` and `npx tsc --noEmit` were used
instead, and both are green. Whoever closes it should move the two reads into
state or into the handlers, and check the swipe by hand afterwards: the rule is
about correctness under concurrent rendering, so a green lint here proves less
than a finger on a phone.

## D6 — Sei componenti di questa fase non sono mai stati renderizzati

> **Rinumerata da D5 a D6 dal piano 36-12.** Questa voce e l'altra sono state
> scritte a pochi minuti di distanza da due esecutori in parallelo, ed erano
> arrivate allo stesso numero. In un elenco di debito due voci con lo stesso
> identificativo sono una voce che qualcuno chiudera' credendo di aver chiuso
> l'altra.

**Rilevato da:** l'orchestratore, alla chiusura dell'onda 6, consolidando tre
dichiarazioni separate che stavano per disperdersi in tre SUMMARY diversi.
**Va chiuso da:** i piani 36-09 (che monta i componenti del catalogo) e 36-13
(la procedura V3), o resta debito dichiarato alla chiusura della fase.

Tre piani hanno dichiarato — ognuno per conto proprio, ognuno correttamente —
che il proprio lavoro visivo **non e' stato guardato da nessuno**. Prese una alla
volta sono note oneste; prese insieme sono un elenco, e un elenco si verifica in
una sessione sola invece che tre volte a caso.

| Componente | Scritto da | Montato? | Guardato? |
|---|---|---|---|
| `FormatMarker` | 36-06 | si', da 36-11 e 36-12 | **si'** — 36-12, vedi sotto |
| `FormatFilterRow` | 36-11 | si', su `/events` | **si'** — 36-12, vedi sotto |
| `ColorSwatchPicker` | 36-08 | **no** — lo monta 36-09 | **no** |
| `CreateFormatModal` | 36-08 | **no** — lo monta 36-09 | **no** |
| `CreateSeriesModal` | 36-08 | **no** — lo monta 36-09 | **no** |
| `RetireFormatDialog` | 36-09 | 36-09 | **no** |

**Perche' non e' pedanteria.** Le affermazioni che restano non verificate non
sono estetiche: sono le frecce che spostano il fuoco dentro un gruppo di scelta,
la leggibilita' di un segno di spunta sul grigio, i 44 px sotto un pollice, e il
casing di un nome di format sotto un antenato che potrebbe maiuscolare. L'ultima
e' quella che si pubblica a ogni visitatore.

**Il caso specifico che nessuno strumento qui intercetterebbe**, segnalato da
36-08: se la mappa dei colori gia' presi includesse per errore anche i format
ritirati, il selettore rifiuterebbe un colore che in realta' e' libero. Il build
e' verde in entrambi i casi. Si vede solo aprendo la pagina e provando a
riprendere il colore di un format ritirato — che e' anche il caso di D-36-10 e
dell'asimmetria del ripristino.

**Le sei procedure manuali** che 36-08 ha scritto nel proprio SUMMARY sono il
punto di partenza: non vanno riscritte, vanno eseguite.

**Le prime due righe sono state chiuse dopo che questa voce e' stata scritta**
(36-12, `36-12-SUMMARY.md`, sezione *What was seen*). `/events` e' stato reso a
390x844 e guardato: la riga dei chip scorre con un chip parziale al bordo, il
chip corrente si distingue per fondo e inchiostro, i quadratini spenti sono
leggibili come decorazione ridondante — e soprattutto **il casing tiene**:
`re:sonate` e `SunSet` restano se stessi a otto pixel da due elementi che li
avrebbero appiattiti. Era l'affermazione che si pubblica a ogni visitatore, ed
e' l'unica di questo elenco che non aspetta piu' nessuno.

**Cosa resta aperto anche su quelle due righe.** Il render e' headless e sul
server di sviluppo: non dice niente su un dispositivo vero, e **lo swipe non e'
stato fatto da un dito.** Le quattro righe del catalogo non sono state toccate:
nessuno ha ancora aperto quelle superfici.

### Aggiornamento del 2026-08-10 — le quattro righe rimanenti sono state guardate

Il piano 36-09 ha montato i tre componenti di 36-08 piu' il proprio
`RetireFormatDialog`, ha aperto `/admin/formats` a 390x844 con una sessione
reale, e ha **eseguito le sei procedure manuali** invece di riscriverle. Le
prove stanno in `36-09-SUMMARY.md`, sezione *Cosa e' stato guardato*.

**Il caso specifico e' chiuso, e l'esito e' quello giusto.** La mappa dei colori
presi **esclude** i format ritirati: nel selettore la tinta neutra risulta
libera e senza barra, mentre le quattro tenute da format attivi portano la barra
e il nome di chi le tiene. Se la mappa fosse stata costruita sull'elenco
completo, quella sesta tinta sarebbe stata rifiutata pur essendo libera — ed e'
esattamente cio' che nessuno strumento qui avrebbe intercettato.

**Restano tre affermazioni non provate**, elencate nel SUMMARY: il render e'
headless e sul server di sviluppo, **nessun dito ha toccato un bersaglio da
44 px su un telefono vero**, e il rifiuto `color_taken` sul ripristino non e'
stato **prodotto** — vedi D8, che ne spiega la ragione strutturale.

---

## D7 — Il middleware scrive `?redirect=`, la pagina di login legge `?next=`

**Rilevato da:** il piano 36-09, camminando il rifiuto del proprio indirizzo.
**Va chiuso da:** un piano successivo — **non e' della fase 36**, che non lo ha
ne' introdotto ne' peggiorato.
**File:** `src/lib/supabase/middleware.ts:466` e
`src/app/(auth)/login/page.tsx:11`.

**Il fatto, misurato.** Una richiesta non autenticata a `/admin/formats`
risponde `307` verso
`/login?redirect=%2Fadmin%2Fformats`. La pagina di login legge invece
`searchParams.get("next")`. I due nomi non coincidono, quindi la destinazione
viaggia e **non viene raccolta**: dopo il login si finisce sul default, non
sull'indirizzo che si stava cercando.

**Cosa NON e'.** Non e' un buco d'accesso: il rifiuto avviene e avviene
correttamente. Si perde il ritorno, non la guardia.

**Perche' non e' stato riparato qui.** Le due righe sono **piu' vecchie di
questa fase** e valgono per **ogni** indirizzo protetto, non solo per quello che
questo piano ha aggiunto. E il parametro con cui si torna dopo un login e' un
percorso di redirect parametrico: `access-gating.md`, gate *redirect validato*,
lo tratta come materia d'accesso, e la allow-list in
`src/app/api/auth/callback/route.ts` e' scritta attorno a `next`. Cambiare il
nome da una parte sola sposta il difetto invece di chiuderlo.

---

## D8 — Il rifiuto `color_taken` sul ripristino non e' producibile oggi

**Rilevato da:** il piano 36-09, provando a produrlo.
**Va chiuso da:** chiunque crei un secondo format ritirato, o resta debito
dichiarato.
**File:** `src/app/(admin)/admin/formats/RetireFormatDialog.tsx`, il ramo
`color_taken`.

**Il fatto.** L'unico format ritirato esistente porta il colore `#262626`, che
**non e' fra i sei offerti** dal selettore. Quindi nessun format creato o
modificato da questa superficie puo' prenderlo, e `restoreFormat` su quella riga
non puo' essere rifiutata per collisione di colore: riuscirebbe.

**Cosa e' provato lo stesso.** Che la superficie **legge** correttamente la
condizione: la riga ritirata non mostra la frase *"Its colour is now held by …"*
proprio perche' quella tinta e' libera, ed e' la stessa mappa che il selettore
usa e che e' stata verificata dall'altro lato.

**Cosa non e' provato.** Che la frase del rifiuto compaia. Produrla avrebbe
richiesto di creare un format su una delle sei tinte, ritirarlo e prendergli il
colore — cioe' **tre scritture su produzione**, una delle quali crea una riga
che questa superficie, per costruzione, non puo' rimuovere. Il piano si e'
fermato prima: un verde fabbricato costa piu' di un debito dichiarato.

**Nota di contorno, dallo stesso giro.** `#262626` non e' fra i sei anche in un
secondo senso: sul fondo della card e' praticamente invisibile. La riga resta
leggibile **perche' porta la parola `Retired` come testo** — cioe' e' la regola
4 che funziona, osservata mentre serviva.

---

## D9 — Il cron della rivelazione raggiunge le bozze, e su una bozza senza destinatari alza comunque la bandiera

**Rilevato da:** il piano 36-13, mentre decideva cosa fosse sicuro seminare.
**Va chiuso da:** la fase 37, che possiede il dominio del venue. **Non e' un
difetto di questa fase e non e' stato riparato qui** (invariante 3 del piano:
un difetto riparato in silenzio durante la propria verifica non e' stato
verificato).
**File:** `src/app/api/cron/venue-reveal/route.ts:25-29` e `:108-115`.

**Il fatto, letto riga per riga.** La query che sceglie le serate da rivelare
e' filtrata su `venue_secret = true` e `venue_reveal_email_sent = false`, e su
**nient'altro**: `events.is_published` non compare, ne' come filtro ne' come
condizione sull'embed. Una serata su un evento **non pubblicato** e' quindi
dentro l'insieme che il cron considera ogni notte.

Piu' avanti, quando per quella serata non esiste alcun destinatario:

```
if (emailMap.size === 0) {
  // No recipients but still mark as sent to avoid re-processing
  await supabase.from("event_parties")
    .update({ venue_reveal_email_sent: true }).eq("id", party.id);
  continue;
}
```

**Perche' conta.** `venue_reveal_email_sent` e' una **guardia monotona**
(`meta-gates.md`): dice *la mail e' partita*. Su una bozza la mail non e'
partita — non c'era nessuno a cui mandarla — ma la bandiera si alza lo stesso.
Se quell'evento viene pubblicato **dopo** che la sua finestra di rivelazione si
e' aperta, e poi vende biglietti, **la rivelazione non partira' mai**: il cron
salta la serata perche' la considera gia' fatta. Nessun errore, nessun log,
nessun tracking degli errori in questo progetto — il guasto si manifesta come
una fila davanti a una porta di cui nessuno ha ricevuto l'indirizzo.

**Quanto e' raggiungibile.** Serve una bozza che resti non pubblicata fin
**dentro** la propria finestra di rivelazione. E' il caso ordinario di un evento
preparato in anticipo e annunciato tardi, non un caso di laboratorio.

**Cosa questo piano ha fatto invece di ripararlo.** Ha seminato la propria
serata con `venue_secret = false` e una data lontana, cosi' che **nessuno dei
due predicati del cron possa selezionarla**. La misura di FMT-06 non doveva
introdurre un effetto collaterale in un dominio che non stava misurando.

---

## D10 — La e rovesciata e' nel `<title>` del sito, ed e' l'unico posto che questa fase non ha grepato

**Rilevato da:** il piano 36-13, leggendo il sorgente reso di `/events` per V3.
**Va deciso da:** il proprietario del brand. **Non riparato qui**: non e' un
percorso di divulgazione, e questo piano non ripara cio' che trova.
**File:** `src/app/layout.tsx:15,19,25,32`.

**Il fatto.** I quattro titoli dei metadati — `title`, e i titoli OpenGraph,
Twitter e web-app — portano `re:sonatɘ` **con la e rovesciata**. Il sorgente
reso di ogni pagina pubblica lo conferma: `<title>re:sonatɘ</title>`.

**Perche' e' notevole proprio qui.** Ogni piano di questa fase porta nel proprio
riepilogo una riga *«la e rovesciata → 0»*, misurata sui file che tocca. Il
conteggio e' vero e non serve a niente se l'unico posto in cui quel carattere
**viene effettivamente spedito** non e' fra i file toccati da nessuno. Un gate
misurato ovunque tranne dove il difetto vive e' un gate che si autocertifica.

**Cosa dice la regola.** `brand-visual-system.md`, gate *grafia del brand*: la
`ɘ` **esiste solo dentro il logo**, perche' e' un segno disegnato e non un
carattere da digitare — incollarla in un testo produce una parola che i motori
di ricerca e i lettori di schermo non riconoscono. Un `<title>` e' la scheda del
browser, il risultato di ricerca e cio' che uno screen reader annuncia: e'
testo, non logo.

**Perche' e' scritto come una domanda e non come un verdetto.** Puo' essere una
scelta deliberata di chi possiede il brand. Ma allora e' la **regola** a dover
cambiare, non il file a restare in silenzio in disaccordo con essa: oggi i due
dicono cose diverse e nessuno dei due sa dell'altro.

---

## D11 — Ritirare un format non lo toglie da `/events`; ripristinarlo ce lo rimette senza che nessuno lo decida

**Rilevato da:** il piano 36-14, eseguendo V5.
**Va deciso da:** il proprietario, o una fase successiva. **Non riparato qui**:
un difetto riparato in silenzio durante la propria verifica non e' stato
verificato.
**File:** `src/app/(admin)/admin/formats/actions.ts`, `retireFormat`
(`:645-683`) e `restoreFormat` (`:686-…`); `src/app/(public)/events/page.tsx`,
il filtro del catalogo.

**Il fatto, misurato.** `retireFormat` scrive **solo** `retired_at` e non tocca
`listed`. Un format **elencato** che viene ritirato conserva quindi
`listed = true`: il suo chip sparisce da `/events` unicamente perche' la pagina
filtra anche `retired_at`, non perche' qualcuno lo abbia spubblicato. Al
ripristino, il chip **torna immediatamente** — misurato: da 5 chip a 6, con la
chiave anonima, subito dopo `Restore format`.

**Perche' conta.** D-36-17 esiste precisamente perche' *«l'annuncio di un format
nuovo non lo faccia il prodotto nel momento in cui qualcuno salva, ma una
persona quando decide»*. Un ripristino che ripubblica un chip senza un secondo
gesto e' quella stessa cosa che rientra dalla porta di servizio: chi ripristina
sta decidendo *«nuove serate possono di nuovo essere assegnate»*, e si ritrova
ad aver deciso anche *«ogni visitatore lo vede»*.

**Le due letture, e nessuna delle due e' stata applicata:**

1. **Il codice e' coerente e la procedura scritta e' imprecisa.** Ritiro e
   elenco sono due assi ortogonali per disegno — la superficie lo dice a parole
   (*«Nights under it are unaffected either way»*) — e l'asimmetria *«il chip
   torna solo dopo averlo elencato»* riguarda la **creazione** (un format nasce
   `listed = false`), che e' stata misurata e regge. In questa lettura si
   corregge la frase di V5, non il codice.
2. **Il ritiro dovrebbe spegnere anche `listed`**, cosi' che il ripristino sia
   davvero un atto solo sull'assegnabilita' e la ripubblicazione resti un
   secondo gesto deliberato. In questa lettura si cambia `retireFormat`, e la
   copia della conferma va riscritta di conseguenza.

**Cosa e' provato in entrambe le letture:** il ritiro toglie il chip da
`/events` (6 → 5), toglie la voce dal selettore per un'assegnazione nuova
(5 → 4), e **lascia intatta la serata che gia' portava quel format**, che
continua a rendere il proprio marker. FMT-05 come e' scritto e' soddisfatto.

---

## D12 — 63 righe di produzione cancellate durante la verifica, in sette tabelle, e non recuperate

> **Questa e' la voce piu' importante di questo elenco.** Non e' debito
> scoperto: e' danno prodotto.

**Causato da:** il piano 36-14, task 1, il 2026-08-10 alle ~16:56 UTC.
**Va deciso da:** il proprietario, **subito**.
**Recuperato:** in parte. Vedi sotto.

**Cosa e' successo.** Per rimuovere i due eventi creati apposta per V1 e V2,
l'esecutore ha guidato la superficie `/admin/events` con uno snippet che
cercava i pulsanti `Delete` e li abbinava alla card giusta risalendo l'albero
del DOM in cerca del titolo usa-e-getta. **La risalita arriva a un antenato che
contiene l'intera lista**, quindi dopo i primi due passaggi il criterio
corrispondeva a **qualunque** pulsante `Delete`. Il ciclo ha premuto quattro
volte. I due eventi reali sono stati cancellati, e con loro — in cascata — le
righe che li referenziavano.

**Cosa e' tornato, ed e' verificato riga per riga.** `events` (2 righe) e
`event_parties` (3 righe) sono state **ripristinate da un'istantanea presa prima
di toccare qualsiasi cosa**, con gli id, gli slug, i `created_at` e ogni colonna
originali. Confronto riga per riga contro l'istantanea di partenza **e** contro
quella che il piano 36-13 aveva lasciato: **0 aggiunte, 0 rimosse, 0 cambiate**,
md5 identici. Anche `formats` e `party_series` sono byte-identiche.

**Cosa NON e' tornato.** Nessuna istantanea copriva queste tabelle, e il
progetto **non ha PITR** (`pitr_enabled: false`, nessun backup elencato
dall'API di gestione il 2026-08-10 alle 17:00 UTC):

| Tabella | Righe alle 16:43 UTC | Righe dopo |
|---|---|---|
| `drink_orders` | **28** | 0 |
| `drink_tokens` | **16** | 0 |
| `drink_items` | **10** | 0 |
| `pending_purchases` | **6** | 0 |
| `tickets` | **1** | 0 |
| `ticket_tiers` | **1** | 0 |
| `guest_list_entries` | **1** | 0 |

**63 righe.** Il conteggio del *prima* non e' una stima: viene da
`32-BASELINE-reads.post-36.json`, catturato **oggi alle 16:43 UTC**, che porta
`table_row_counts` per venticinque tabelle. Ogni altra tabella — `profiles` 4,
`venues` 5, `artists` 7, `drink_items`… — e' stata riconfrontata una per una:
**si sono mosse solo quelle sette**.

**Cosa significa, in concreto.** I due eventi sono **passati** (febbraio e
maggio 2026): nessuna porta di stasera e nessuna vendita in corso dipendono da
queste righe. Quello che si e' perso e' **il registro applicativo** di
consumazioni acquistate, token, un biglietto e una voce di guest list. **La
verita' finanziaria non e' persa**: le transazioni stanno su SumUp, e
`drink_orders.sumup_transaction_code` era il ponte fra le due — e' il ponte che
e' andato.

**Le opzioni, e sono del proprietario:**

1. **Backup lato Supabase.** L'API di gestione risponde `pitr_enabled: false` e
   non elenca backup, ma `walg_enabled: true`: **la dashboard va guardata di
   persona** prima di dare la perdita per definitiva. Se un backup fisico
   giornaliero esiste, un ripristino riporterebbe tutto — e riporterebbe anche
   ogni altra cosa allo stesso istante, che oggi non e' un costo perche' nulla
   d'altro si e' mosso.
2. **Ricostruzione parziale da SumUp.** Gli ordini possono essere riletti
   dall'estratto delle transazioni; token, biglietto e guest list no.
3. **Accettare la perdita e dichiararla**, con la data e questo elenco.

**Cosa e' cambiato nel modo di lavorare, gia' adesso.** Le cancellazioni
successive nella stessa sessione sono state fatte **per chiave primaria, con una
guardia che rilegge la riga e rifiuta se il codice non e' quello atteso**, e la
rimozione e' stata riletta dal database. **Nessun atto distruttivo va guidato
per corrispondenza di testo su una superficie**: e' il modo in cui un ciclo
scritto per due righe ne colpisce quattro senza che nulla protesti.
