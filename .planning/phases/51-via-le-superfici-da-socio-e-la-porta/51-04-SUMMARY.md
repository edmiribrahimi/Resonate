---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 04
subsystem: ui
tags: [next.js, typedRoutes, routing, access-list, redirect-308, conversion-gate]

requires:
  - phase: 50-via-le-iscrizioni
    provides: "la forma della rimozione di una superficie — voce del manifest e alias italiano tolti nello stesso commit della pagina, aritmetica del censimento riscritta con la data (74a577f), e T-50-28 per il costo di un 308 memorizzato"
provides:
  - "MEM-01 lato superficie: /membership-card non esiste — pagina, loading, componente e rotta"
  - "MEM-02 lato superficie: /attendance non esiste, e nemmeno il suo alias /presenze"
  - "NEXT_ALLOW_LIST e PROTECTED_PREFIXES senza i due indirizzi, cambiati nello stesso commit"
  - "il censimento della conversione misura 44 pagine su disco, senza voci che puntino a file cancellati"
  - "src/utils/qr.ts senza la funzione che costruiva il QR della card"
affects: [51-06 (/account e il 308 da /dashboard), 51-08 (la chiave capability e le sue rotte), 51-12 (profiles.membership_code)]

tech-stack:
  added: []
  patterns:
    - "In un file che E' un elenco d'accesso, un indirizzo rimosso non resta scritto nemmeno in un commento: un grep su quel file deve rispondere «questo indirizzo e' ammesso?», non trovare un necrologio"
    - "Una prosa datata si corregge aggiungendo una riga datata sotto, non sovrascrivendo quella di prima"

key-files:
  created: []
  modified:
    - "src/app/(members)/dashboard/page.tsx"
    - "src/utils/qr.ts"
    - "src/lib/routes/next-redirect.ts"
    - "next.config.ts"
    - "scripts/conversion-manifest.mjs"
    - "scripts/probe-forged-identity.sh"
  deleted:
    - "src/app/(members)/membership-card/page.tsx"
    - "src/app/(members)/membership-card/loading.tsx"
    - "src/app/(members)/attendance/page.tsx"
    - "src/components/membership/MembershipCardView.tsx"

key-decisions:
  - "Un indirizzo cancellato non resta scritto nei due file che sono elenchi — next-redirect.ts e la funzione redirects() di next.config.ts — nemmeno come commento; e' anche la forma che la fase 50 aveva gia' usato qui"
  - "Il docblock del blocco Wave 3 del manifest resta a dire «these four»: e' il verbale di cio' che il piano 41.2-19 misuro', e sopra c'e' la nota datata che lo corregge"
  - "Le tre righe di strip degli header nella sonda erano a un numero di riga sbagliato di quasi 500 righe: corrette, e la procedura ora dice di cercare le istruzioni invece dei numeri"

patterns-established:
  - "Grep-igiene sugli elenchi d'accesso: il nome di un indirizzo rimosso esce anche dai commenti, e la ragione si scrive descrivendolo"
  - "Prosa datata additiva: la riga vecchia resta come prova che il numero era giusto e poi ha smesso di esserlo"

requirements-completed: [MEM-01, MEM-02]

duration: 38min
completed: 2026-09-22
---

# Phase 51 Plan 04: Via le due superfici da socio Summary

**Le due superfici che esistevano perche' c'erano i soci — la card e lo storico presenze — non hanno piu' pagina, rotta, alias italiano, voce nelle liste d'accesso ne' riga nel censimento; e nessuna pagina prova ad aprirle.**

## Performance

- **Duration:** ~38 min
- **Tasks:** 3/3
- **Files:** 6 modificati, 4 cancellati

## Accomplishments

### Task 1 — le quattro superfici e l'unico link che le apriva (`3477889`)

Cancellati `membership-card/page.tsx`, il suo `loading.tsx`, `MembershipCardView.tsx` (unico importatore: la pagina) e `attendance/page.tsx`.

Dal dashboard e' uscito il blocco «My Stuff», che era l'unico posto del prodotto a linkare i due indirizzi. Con `typedRoutes` il gate e' meccanico e non richiede disciplina: un `<Link>` verso una pagina cancellata non compila, quindi link e pagina **non possono** uscire in due commit diversi. Il resto della pagina non e' stato toccato — «My Tickets», «My Drinks», «Settings» e `ManagementSection` sono del piano 51-06, che la sposta.

Da `src/utils/qr.ts` e' uscita la funzione che costruiva il QR della card. Il QR del biglietto non e' stato sfiorato: e' il percorso della porta, ed e' firmato HMAC mentre quello della card non lo era mai stato.

**Nessun dato perso su MEM-02 lato superficie, ed e' misurato non assunto:** `attendance/page.tsx:67` era un `TODO` con un array vuoto **costante**, quindi l'unico ramo che un membro poteva raggiungere era «No attendance recorded yet». Il lato dati di MEM-02 e' dei piani 51-05 e 51-12.

### Task 2 — le liste d'accesso e l'alias italiano (`09a4e7a`)

`NEXT_ALLOW_LIST` e `PROTECTED_PREFIXES` hanno perso i due indirizzi **nello stesso commit**, che e' la regola meccanica che la ricerca aveva gia' misurato: toglierli dai soli prefissi lascia l'elenco sporco, toglierli dal solo elenco rende rosso il controllo `[3/3]` di `verify:routes`.

La ragione e' scritta accanto, e **non e' quella che la fase 50 scrisse per `/events/<slug>`**: li' era finito il traffico e la permissione restava, perche' l'indirizzo esisteva ancora e qualcuno poteva esservi mandato. Qui e' l'indirizzo a non esistere: una permissione con niente dall'altra parte non e' prudenza, e il prossimo lettore dovrebbe andare a scoprire che non c'e' nulla.

`next.config.ts` ha perso l'alias italiano dello storico, che puntava a una pagina cancellata. Il costo e' **dichiarato, non scoperto**: chi l'ha gia' seguito continuera' a essere mandato sulla pagina cancellata dalla propria cache e ricevera' un 404 — proprieta' di un 308, disposizione `accept` (`T-51-17`), esattamente come `T-50-28`.

Nessuna voce nuova: `/account` lo aggiunge il piano 51-06, con la pagina che servira' quell'indirizzo.

### Task 3 — il censimento e la sonda (`bcd6949`)

Le due voci del manifest sono uscite. **Il gate si era gia' fermato su entrambe** prima della modifica, con il suo messaggio proprio (*«CONVERTED names … which is not on disk under that exact name»*): e' il comportamento corretto, ed e' la prova osservabile che l'invariante «una entry non punta a un file cancellato» e' viva e non decorativa.

L'aritmetica del censimento porta una riga nuova con la sua data — e con una cosa che il gate non puo' dire. Le cifre di oggi, **44 = 36 + 6 + 2**, sono **le stesse** della riga del 2026-09-21, ma non perche' nulla si sia mosso: misurato al commit `e05d098`, un istante prima di questo piano, il censimento diceva **46 = 38 + 6 + 2**. Quella riga era diventata falsa per due su entrambi i lati, e togliendo due pagine dichiarate si e' tornati alle cifre di prima per un'altra strada. Un numero esatto per coincidenza e' indistinguibile a occhio da uno riletto: l'unica differenza e' la data accanto, e per questo la riga vecchia **resta** e quella nuova le si mette sotto.

## Deviations from Plan

### `[Rule 2 — documentazione datata]` La sonda dell'identita' contraffatta mandava a commentare tre righe sbagliate

**Trovato durante:** Task 3, leggendo `scripts/probe-forged-identity.sh` per togliere i due indirizzi.

**Il problema:** il file dichiarava **due** fatti sul middleware, ed erano **entrambi** datati.

1. *«`protectedPrefixes` (src/lib/supabase/middleware.ts:136) is /dashboard /membership-card /attendance /admin /organizer»*. Tre errori in una riga: la costante non sta piu' li' (dalla fase 37 e' dichiarata in `src/lib/routes/next-redirect.ts` e il middleware la **legge** a `:584`), `/organizer` e' uscito con la fase 34, e i due di questa fase sarebbero rimasti.
2. **Il piu' grave:** il controllo positivo — la procedura che rende significativo ogni verde di questa sonda — diceva di commentare le tre righe di strip a **`middleware.ts:210-212`**. Stanno a **`697-699`**. Chi eseguisse quella procedura commenterebbe tre righe che non sono lo strip, rieseguirebbe la sonda, la vedrebbe **restare zitta** e concluderebbe che e' insensibile — oppure, peggio, registrerebbe il verde successivo come provato. E' un falso negativo vestito di verde, cioe' proprio il `Gate prova per mutazione` di `ai-engineering.md` fatto fallire dal documento che lo invoca due righe piu' sotto.

**Il fix:** entrambe le affermazioni rimisurate dal codice e riscritte con la data; il riferimento `210-212` corretto anche nel messaggio d'errore della sonda (`:404` della versione precedente); e la procedura ora **dice di cercare le tre istruzioni invece di fidarsi dei numeri**, perche' un numero di riga in una procedura e' la parte che marcisce per prima.

**Perche' Rule 2 e non fuori perimetro:** il file e' fra i `files_modified` del piano, e una sonda di sicurezza la cui procedura di controllo positivo non funziona non e' una svista di prosa — e' il gate che non puo' fallire quando dovrebbe.

**Commit:** `bcd6949`

---

### `[deviazione dichiarata]` I gate del piano chiedevano zero occorrenze, la prosa del piano chiedeva di nominare cio' che usciva

**Dove:** i `<verify><automated>` dei task 1, 2 e 3 pretendono `grep -c` a zero su `generateMembershipQR` in `src/`, su `membership-card` in `next-redirect.ts`, su `presenze` in `next.config.ts` e su `membership-card` nella sonda. Le `<action>` degli stessi task chiedevano invece di **scrivere accanto la ragione** — e una ragione scritta nominando cio' che e' uscito viola il grep.

**Come e' stato sciolto, e perche' in questa direzione.** Ha vinto il grep, per una ragione di dominio e non di obbedienza: `next-redirect.ts` e la `redirects()` di `next.config.ts` **sono elenchi d'accesso**. Un `grep` su di essi e' il modo in cui si risponde alla domanda *«questo indirizzo e' ammesso / e' rimandato?»*, e un necrologio in un commento risponde **«si'»** a chi legge di fretta, per sempre. Stesso argomento su `src/utils/qr.ts`, dove cercare il nome di una funzione e' il modo in cui si chiede *«e' ancora usata?»*.

**E la forma non e' inventata qui: e' gia' della casa.** Il paragrafo della fase 50 subito sopra il mio, in `next.config.ts`, descrive l'alias che aveva rimosso — *«La quarta era la coppia italiano → inglese della pagina d'iscrizione»* — **senza scriverne il letterale**. Ho seguito quello.

Le ragioni ci sono tutte, per intero, e in ogni punto dicono **perche'** il nome non e' ripetuto, cosi' che il prossimo lettore non lo rimetta credendo di migliorare la documentazione. `git log -S` ha i due nomi per chiunque serva.

**Un'eccezione, dichiarata:** in `dashboard/page.tsx:501` i due indirizzi **sono** nominati. Quella non e' una lista, e' una pagina, e il commento e' la lapide che il piano chiedeva; nessun gate del piano vi si applica.

---

### `[Rule 2 — documentazione datata]` Due righe minori corrette nei file gia' aperti

- `next-redirect.ts`: il docblock di `PROTECTED_PREFIXES` diceva *«a sixth prefix added to this list»* sopra un elenco che adesso ne ha **tre**. Corretto in «a fourth», e il conteggio e' ora scritto per esteso invece che lasciato implicito — e' lo stesso tipo di riga che quel file ha gia' dovuto correggere una volta.
- `src/utils/qr.ts`: la lapide descriveva il conio del codice socio in `handle_new_user` come una regola **viva**. Lo e' ancora oggi, ma e' in uscita (`D-51-02`, piano 51-12): il paragrafo ora lo dichiara, cosi' nessuno ci costruisce sopra.

## File cancellati

Quattro file, tutti cancellati di proposito e tutti previsti dal piano. Con essi spariscono due directory rimaste vuote (`src/app/(members)/membership-card/` e `src/components/membership/`).

| Path | Perche' |
|---|---|
| `src/app/(members)/membership-card/page.tsx` | MEM-01 — la superficie che rendeva a schermo il codice socio |
| `src/app/(members)/membership-card/loading.tsx` | MEM-01 — il segnaposto della stessa rotta |
| `src/components/membership/MembershipCardView.tsx` | MEM-01 — il componente della card; unico importatore la pagina qui sopra, unico chiamante della funzione QR rimossa |
| `src/app/(members)/attendance/page.tsx` | MEM-02 lato superficie — lo storico presenze, che non ha mai letto nulla (`:67`, `TODO` + array vuoto costante) |

Nessuna cancellazione e' collaterale: ogni file era nominato nei `files_modified` del piano, e il `git status` dopo ogni commit non ha mostrato altre `D`.

## Note d'ordine per i piani a valle

1. **`src/lib/routes/capability-routes.ts:411-413`** — la voce `[CAP.MEMBERSHIP_CARD_VIEW]` continua a nominare i due indirizzi, ed **e' corretto che resti fino al piano 51-08**. Non rompe alcun gate: `verify-routes.mjs:51-63` dichiara che *«a pattern with no page is NOT an error»*, e il censimento del manifest vede solo `src/app/(admin)`. Verificato: `npm run verify:routes` e `npm run verify:conversion` sono verdi con la voce in piedi. **Esce insieme alla chiave**, perche' la mappa e' un `Record` totale sulle chiavi: toglierle le rotte lasciando la chiave produrrebbe un'entry che mente.

2. **Prosa datata che nomina i due indirizzi, fuori dai miei `files_modified`** — `src/middleware.ts:39`, `src/lib/supabase/middleware.ts:665`, `src/lib/capabilities/keys.ts:315`, `src/lib/routes/capability-routes.ts:277`, `scripts/verify-routes.mjs:96`. Tutte dicono che i due indirizzi *sono giudicati* dai prefissi protetti, cosa che da oggi non e' piu' vera. Non toccate di proposito: appartengono al piano 51-08, che apre quei file per la chiave.

3. **`src/lib/routes/organizer-redirects.ts:41`** — un docblock elenca `/galleria`, `/presenze`, `/registrati`, `/eventi/[[...path]]` come i `source` che entrano nell'union dei tipi di rotta. **Era gia' datato prima di questo piano** (`/registrati` e' uscito con la fase 50) e adesso lo e' per due. Il file non e' nei miei `files_modified` ne' in quelli di 51-02 e 51-03: **non l'ho toccato**. E' prosa illustrativa, nessun gate la legge.

4. **`src/app/(members)/dashboard/page.tsx:69`** — un docblock della conversione 41.2 cita `/membership-card` per spiegare perche' quella superficie e questa restarono due piani. E' un verbale storico, e riguarda anche un controllo (il referral) gia' cancellato dalla fase 50. Lasciato come storia; se un piano futuro riscrive quel docblock, e' li' che va corretto.

## Verifica

**Non esiste alcun test runner per il prodotto** (`CLAUDE.md`, Guardrail 1): niente qui e' stato dichiarato verificato «perche' i test passano». Cio' che e' stato eseguito, e il suo esito:

| Comando | Esito | Cosa prova |
|---|---|---|
| `npm run build` | 0, dopo ogni task | Il typecheck di Next. Con `typedRoutes` e' **il** gate di questo piano: un `<Link>` o un `redirect()` residuo verso le pagine cancellate sarebbe un errore di tipo. Nell'elenco delle rotte del build `/membership-card` e `/attendance` non compaiono piu' |
| `npm run verify:routes` | PASS, tre controlli su tre | In particolare `[3/3]`: tutti e 28 gli indirizzi protetti tornano se stessi via `resolveNext` senza sostituzione, con le due liste ridotte |
| `npm run verify:conversion` | `CONVERSION_OK`, sei controlli su 36 superfici, 209 file | Il censimento: 44 `page.tsx` su disco = 36 dichiarate + 0 recintate + 6 in attesa + 2 non dichiarabili, **0 non contate** |
| `sh -n scripts/probe-forged-identity.sh` | 0 | Sintassi della sonda dopo le correzioni |
| `scripts/probe-forged-identity.sh --help` | 0 | Il percorso d'uso risponde |

**Osservabile rosso → verde, che vale piu' di un verde solo:** `npm run verify:conversion` si e' fermato con `FATAL … 2 reason(s)` subito dopo la cancellazione delle pagine, nominando entrambe le entry orfane, ed e' tornato verde dopo averle tolte. Il gate ha fatto il suo mestiere sotto misura, non per ipotesi.

**Non eseguito, e perche':** `curl -s -o /dev/null -w '%{http_code}' https://lab.resonatemotion.com/membership-card` → 404. La verifica del piano lo registra come *«dopo il deploy del ramo di fase sul laboratorio»*, e l'invariante dell'onda 1 e' che **nulla di questo lavoro raggiunga il laboratorio** mentre il proprietario percorre la corsa «prima» di `P-51-1` contro il codice di oggi (`D-51-16`). Nessun push, nessun deploy, nessuna scrittura sul lab.

## Note d'accesso

**Togliere una superficie toglie una pagina, non una policy.** Il middleware e' UX; il confine di sicurezza e' la RLS. Questo piano non ha toccato alcuna policy e non ne aveva da toccare: la card leggeva `profiles.membership_code` con il client dell'utente, e **la colonna resta** — la toglie il piano 51-12 (`D-51-02`), con la sua migration provata prima sul laboratorio. Fino ad allora il dato esiste ancora nel database; cio' che non esiste piu' e' la superficie che lo rendeva a schermo, che e' esattamente la disposizione `mitigate (in sottrazione)` di `T-51-15`.

## Self-Check: PASSED

File cancellati, verificati assenti dal disco:

- `src/app/(members)/membership-card/page.tsx` — assente
- `src/app/(members)/membership-card/loading.tsx` — assente
- `src/app/(members)/attendance/page.tsx` — assente
- `src/components/membership/MembershipCardView.tsx` — assente
- directory `src/app/(members)/membership-card/` — assente
- directory `src/components/membership/` — assente

Commit verificati esistenti su questo ramo:

- `3477889` — Task 1
- `09a4e7a` — Task 2
- `bcd6949` — Task 3
