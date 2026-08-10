---
phase: 37-manual-venue-reveal
plan: 12
subsystem: access-gating
tags: [redirect, allow-list, open-redirect, login, auth]
requires:
  - "src/app/api/auth/callback/route.ts — la allow-list che gia' esisteva"
provides:
  - "src/lib/routes/next-redirect.ts — una sola allow-list, due lettori"
  - "La destinazione post-login validata prima di raggiungere il browser"
affects:
  - "src/app/api/auth/callback/route.ts"
  - "src/app/(auth)/login/page.tsx"
tech-stack:
  added: []
  patterns:
    - "un modulo, piu' chiamanti — la convenzione di src/lib/routes/"
    - "allow-list che rifiuta per default, pattern ancorati a entrambi i capi"
    - "sostituzione non silenziosa via ?link=refused, la forma gia' usata dal callback"
key-files:
  created:
    - src/lib/routes/next-redirect.ts
  modified:
    - src/app/api/auth/callback/route.ts
    - src/app/(auth)/login/page.tsx
decisions:
  - "D-37-12-A: la allow-list e' stata SPOSTATA, non copiata — due liste scritte a mano divergono al primo indirizzo nuovo"
  - "D-37-12-B: il nome del parametro NON e' stato allineato — allineare senza la guardia avrebbe attivato l'apertura; D7 resta aperto"
  - "D-37-12-C: un valore rifiutato non viene propagato verso /register; un valore assente non diventa un ?next=/dashboard esplicito"
  - "D-37-12-D: la sostituzione porta ?link=refused, come il callback — l'URL e' l'effetto osservabile, perche' un log non raggiunge nessuno"
metrics:
  tasks: 2
  commits: 2
  duration: ~50 min
  completed: 2026-08-10
---

# Fase 37 Piano 12: Allow-list del redirect dopo il login — Summary

Il valore di `?next=` letto dalla pagina di login passa ora dalla stessa
allow-list che protegge il callback, e non raggiunge piu' il browser senza
essere stato validato.

## Il perimetro, dichiarato per primo

**Questo piano non tocca il venue.** Viaggia con la fase 37 per scelta del
proprietario, non perche' sia la stessa materia. Nessun file legato alla
rivelazione — `event_parties`, `venues`, il cron, `venue-secrecy.md` — e' stato
aperto. I due commit contengono solo il lavoro sul redirect.

Il campo `requirements: [VENUE-01]` nel frontmatter del piano e' una convenzione
dello schema, **non una copertura**: questo piano non chiude VENUE-01 ne'
VENUE-02.

## Cosa e' stato fatto

### Task 1 — una sola allow-list (`84f684f`)

`NEXT_ALLOW_LIST`, `DEFAULT_NEXT` e `resolveNext` sono usciti da
`src/app/api/auth/callback/route.ts` e vivono in
`src/lib/routes/next-redirect.ts`.

**Spostati, non riscritti.** Il diff fra il codice originale e quello estratto
porta due sole differenze, entrambe strutturali:

```
2c2
< const DEFAULT_NEXT = "/dashboard";
---
> export const DEFAULT_NEXT = "/dashboard";
9c9,12
< function resolveNext(raw: string | null): { path: string; refused: boolean } {
---
> export function resolveNext(raw: string | null): {
>   path: string;
>   refused: boolean;
> } {
```

I quattro pattern ancorati (`next-redirect.ts:82-87`), i cinque rifiuti nominati
uno per uno (`:98-108`) e le quattro guardie di forma (`:121-130`) sono
**byte-identici**.

Prova indipendente dell'identita': `npx eslint` sul file **pre-modifica**
(`git show 1d21e9f:…/callback/route.ts`) produce lo stesso identico warning —
*«Unused eslint-disable directive (no-control-regex)»* — alla riga 83, che e' la
riga 129 del modulo nuovo. Il warning e' **ereditato**, non introdotto, e la sua
sopravvivenza intatta dice che il blocco e' passato senza essere toccato.

Il modulo **non e' `"use server"`** e **non importa `server-only"`**: e' una
funzione pura su una stringa, e il suo secondo lettore e' un componente client.

### Task 2 — la pagina di login smette di fidarsi (`ddc3e9f`)

- `login/page.tsx:33-34` — `searchParams.get("next")` passa da `resolveNext`
  **prima** di qualunque altra cosa. Il valore grezzo e quello seguibile sono ora
  due variabili diverse (`rawNext`, `nextPath`).
- `login/page.tsx:105-107` — `window.location.href` riceve `nextPath`. Il
  `|| "/dashboard"` e' sparito: il ripiego vive in un posto solo (`DEFAULT_NEXT`).
- `login/page.tsx:170` — verso `/register` viaggia solo un valore che era
  **presente e accettato**.

`searchParams.get` viene passato **non modificato**, senza `|| ""`:
`resolveNext(null)` significa «nessuna destinazione richiesta» e non e' un
rifiuto, mentre `resolveNext("")` lo sarebbe. Atterrano nello stesso posto, ma
solo uno dei due e' una sostituzione — e il flag viene letto.

## La verifica, e cosa vale davvero

> **In questo repo non esiste alcun test runner per il prodotto.** Nessuno script
> `test`, nessun file `*.test.*`. Niente qui e' verificato perche' «i test
> passano»: non ci sono test.

### `npm run build`

Esce con **0** su entrambi i task (il build e' anche il typecheck di Next).
`npm run lint` non riporta alcun errore nuovo sui tre file toccati — solo il
warning ereditato di cui sopra.

### Le richieste reali, prima e dopo — che il todo pretendeva

Il todo chiedeva: *«chi chiude questo todo lo provi con una richiesta reale prima
di dichiararlo risolto, e lo provi anche dopo il rimedio»*, e registrava come
**non misurato** se un `?next=` assoluto fosse davvero eseguito dal browser.

**Ora e' misurato.** Banco di prova: `next dev` in locale, un backend di
autenticazione **fittizio** su `127.0.0.1:54321` che fa riuscire
`signInWithPassword`, e un Chrome headless guidato via CDP che compila e invia il
form vero. **Nessun contatto con la produzione, nessun comando sul database,
nessuna credenziale reale.** Il banco e' stato smontato a fine lavoro.

| `?next=` | prima del rimedio | dopo il rimedio |
|---|---|---|
| `https://example.org` | **`https://example.org/`** | `/dashboard?link=refused` |
| `//example.org` | **`https://example.org/`** | `/dashboard?link=refused` |
| `/admin` | *(non misurato prima)* | `/dashboard?link=refused` |
| `/dashboard` | `/dashboard` | `/dashboard` |
| `/events/<slug>/menu` | *(non misurato prima)* | `/events/<slug>/menu` |

E il link «Sign Up» nella pagina renderizzata:

| `?next=` | prima | dopo |
|---|---|---|
| `https://example.org` | `/register?next=https%3A%2F%2Fexample.org` | `/register` |
| `/dashboard` | `/register?next=%2Fdashboard` | `/register?next=%2Fdashboard` |

**L'apertura era reale e ora e' chiusa, osservata in entrambe le direzioni.** Un
membro che avesse inserito la password su un link costruito a mano finiva su un
altro host un istante dopo — il momento peggiore possibile, perche' e' quello in
cui si aspetta di essere al sicuro.

### I verdetti della funzione condivisa, sedici casi

`resolveNext` eseguita direttamente sul modulo compilato:

| Input | Esito | `refused` |
|---|---|---|
| `null` | `/dashboard` | `false` |
| `""` | `/dashboard` | `true` |
| `/dashboard`, `/set-password`, `/events/<slug>`, `/events/<slug>/menu` | invariati | `false` |
| `https://example.com` | `/dashboard` | `true` |
| `//example.com` | `/dashboard` | `true` |
| `/\example.com` | `/dashboard` | `true` |
| `javascript:alert(1)` | `/dashboard` | `true` |
| `/admin` | `/dashboard` | `true` |
| `/dashboard\r\nSet-Cookie: x=1` | `/dashboard` | `true` |
| `/events/UPPERCASE` | `/dashboard` | `true` |
| slug di 81 caratteri | `/dashboard` | `true` |
| `/dashboard/../admin` | `/dashboard` | `true` |
| `/dashboardX` | `/dashboard` | `true` |

L'ultimo e' quello che conta piu' di tutti: e' la prova che i pattern sono
**ancorati a entrambi i capi**, cioe' la cosa che il docblock avverte di non
rompere.

### Il callback: cosa e' stato accertato e cosa no

Il piano chiedeva anche *«un giro di login dal callback, per accertare che
l'estrazione non abbia cambiato un verdetto»*.

**Non e' stato eseguito come giro completo, e va detto invece che lasciato
intendere.** `exchangeCodeForSession` richiede il code verifier PKCE dal cookie,
che il banco fittizio non produce: le richieste al callback cadono sul ramo
`?error=auth` **prima** che `resolveNext` venga raggiunta. Il verdetto sul `next`
non e' quindi osservabile con questo banco.

Quello che c'e' al suo posto e' una prova **piu' forte di una sonda a due
input**: il diff byte-identico sopra, piu' il warning eslint sopravvissuto alla
riga corrispondente, piu' la tabella dei sedici verdetti sulla funzione che il
callback ora importa. Il codice che decide e' letteralmente lo stesso codice.

**Passo manuale che resta al proprietario** (un solo giro, in staging o in
produzione, senza scrivere nulla):

1. Fare logout, poi richiedere un magic link / reset password.
2. Aprire il link ricevuto e osservare dove si atterra: deve essere la stessa
   destinazione di prima del deploy.
3. Ripetere aggiungendo `&next=/admin` all'URL del callback: deve atterrare su
   `/dashboard?link=refused`, non su `/admin`.

## Deviazioni dal piano

### 1. [Rule 1 — Bug] Byte di controllo letterali al posto degli escape

- **Trovato durante:** Task 1, subito dopo la creazione del modulo.
- **Problema:** nello scrivere il file, la sequenza ` -` della
  regex anti-response-splitting e' stata materializzata in **byte di controllo
  letterali**, NUL compreso. E' precisamente cio' che il commento accanto a
  quella riga vieta: *«Written as escapes, never as literal control bytes in this
  source file.»* Il comportamento a runtime sarebbe stato equivalente; un file
  sorgente con un NUL dentro non lo e'.
- **Rimedio:** sostituzione a livello di byte, poi conteggio dei byte di
  controllo residui nel file: **0**.
- **File:** `src/lib/routes/next-redirect.ts:130`
- **Commit:** `84f684f`

Vale la pena registrarlo: la riga che si e' corrotta e' esattamente la riga che
esiste per impedire a un byte di controllo di finire in un header `Location`.

### 2. [Rule 2 — Funzionalita' critica mancante] `?link=refused` anche lato client

Il piano chiedeva soltanto il ripiego su `/dashboard`. Un ripiego silenzioso
avrebbe pero' lasciato una persona con un link rotto senza **nessun** segnale, e
in questo repo non esiste error tracking: un log non raggiunge nessuno
(`meta-gates.md`). Il callback risolve gia' lo stesso problema con
`?link=refused`, quindi la pagina di login usa la stessa forma. Il limite onesto
e' dichiarato accanto al codice: **nulla renderizza `?link=refused` oggi** — l'URL
e' l'effetto osservabile, ed e' piu' di un log e meno di un avviso.

### 3. Una parola nel docblock spostato

`«Concatenating with origin (what stood here)»` e' diventato `«(what stood in the
callback)»`. In un modulo condiviso `here` avrebbe indicato il modulo stesso, che
non concatena nulla — una frase corretta nel vecchio posto e falsa nel nuovo. E'
l'unico intervento sulla prosa spostata, e non tocca il codice.

## D7 resta aperto — per iscritto, nel codice

`src/lib/supabase/middleware.ts:466` scrive `?redirect=`; `login/page.tsx:33`
legge `?next=`. I nomi non coincidono, quindi **ogni indirizzo protetto perde la
propria destinazione dopo il login**. Non e' stato corretto qui.

Non per dimenticanza: **allineare i nomi senza la guardia avrebbe attivato
l'apertura invece di chiuderla.** Oggi nulla nel prodotto popola `?next=`, quindi
la riga non validata era raggiungibile solo da un link costruito a mano. Un
`?next=` improvvisamente scritto dal middleware avrebbe reso quel percorso
normale, atteso e frequentato — e la riga che lo eseguiva senza validarlo sarebbe
diventata un open redirect su un flusso che usano tutti.

**Adesso la guardia c'e' prima.** Chi chiudera' D7 trova il terreno pronto. Cosa
gli resta da fare, e che il todo registra come **non verificato**: il censimento
di quali percorsi costruiscono un URL di login, e la decisione su quale dei due
nomi tenere. La dichiarazione sta a `login/page.tsx:36-56`.

## Known Stubs

Nessuno. Nessun valore vuoto codificato a mano, nessun segnaposto, nessun TODO
lasciato nei tre file.

## Threat Flags

Nessuna superficie nuova. Il piano **rimuove** superficie: T-37-50 (open redirect
post-login), T-37-51 (due allow-list divergenti) e T-37-52 (allineare i nomi senza
la guardia) sono tutte e tre mitigate come previsto, e la prima con una misura
prima-e-dopo invece che con un ragionamento.

## Self-Check: PASSED

| Verifica | Esito |
|---|---|
| `src/lib/routes/next-redirect.ts` esiste | FOUND |
| `src/app/api/auth/callback/route.ts` modificato | FOUND |
| `src/app/(auth)/login/page.tsx` modificato | FOUND |
| commit `84f684f` | FOUND |
| commit `ddc3e9f` | FOUND |
| `npm run build` | exit 0 |
| nessun file del venue toccato | confermato — `git show --stat` su entrambi i commit elenca solo i tre file |
| `STATE.md` / `ROADMAP.md` non toccati | confermato |
