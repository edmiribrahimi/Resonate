---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 05
subsystem: porta (check-in) e viewport
tags: [scanner, door, tabs, viewport, touch-targets, NAV-01]
requires: []
provides:
  - "La porta a cinque linguette fisse: All · Out · In · Recent · Alerts"
  - "DOOR_TARGET_DEBT a 13 (tetto invariato a 14)"
  - "interactiveWidget: resizes-content nel viewport, con l'aspettativa iOS scritta"
affects:
  - src/app/(admin)/admin/scanner/ScannerClient.tsx
  - scripts/verify-touch-targets.mjs
  - src/app/layout.tsx
  - src/app/(public)/events/EventTabs.tsx
tech-stack:
  added: []
  patterns:
    - "chiavi d'avviso derivate al render + insieme delle viste, per accendere una linguetta senza aprirla"
key-files:
  created: []
  modified:
    - src/app/(admin)/admin/scanner/ScannerClient.tsx
    - scripts/verify-touch-targets.mjs
    - src/app/layout.tsx
    - src/app/(public)/events/EventTabs.tsx
decisions:
  - "Il pallino di Alerts si spegne all'apertura della linguetta; una chiave che sparisce viene dimenticata, cosi' lo stesso avviso che torna e' di nuovo una notizia"
  - "La camera e cameraFault restano dove erano: fra le linguette e il loro contenuto (dichiarato sotto, da misurare in P-52-F)"
  - "scroll-mt-20 (80 px) come gradino: la barra fissa misurata dal markup e' 64 px senza sottotitolo, 80 con"
metrics:
  duration: "~35 min"
  completed: 2026-09-23
  tasks: 3
  files: 4
---

# Fase 52 Piano 05: la porta a cinque linguette e il viewport — Summary

La porta ha cinque linguette fisse (All · Out · In · Recent · Alerts) a `min-h-11`,
gli avvisi della lista e della coda accendono Alerts senza mai aprirla, l'avviso
della guest list a radio spenta sta in testata sopra la ricerca, e il viewport
dichiara `interactiveWidget: "resizes-content"` scrivendo che Safari iOS lo ignora.

## Cosa e' stato fatto

| Task | Commit | Cosa |
|---|---|---|
| 1 | `40c1103` | `FilterTab` a cinque valori; Recent (cronologia + annullamento, identici) e Alerts (banda d'eta', drenaggio, `cacheNotices`, deriva dell'orologio); pallino senza `animate-pulse`; stati vuoti senza pulsanti; voce `setActiveFilter(tab.key)` fuori da `DOOR_TARGET_DEBT` (14 → 13) nello stesso commit |
| 2 | `22051bf` | Avviso guest list spostato sopra la ricerca, testo e condizione invariati; `onFocus` con `scrollIntoView({ block: "start" })` differito di un `requestAnimationFrame`; `scroll-mt-20` con la misura nel commento |
| 3 | `efcc8af` | `interactiveWidget: "resizes-content"` con il commento su Safari iOS; nessun adattamento alla safe area; `EventTabs.tsx` `60vh` → `60dvh` |

### L'ordine della porta, com'e' adesso (dall'alto)

1. barra fissa di 51-07 — **invariata**: zero righe cambiate fra il docblock della barra e la sua chiusura (`git diff -U0` non ha alcun hunk nell'intervallo che era 2888-3027; gli unici hunk vicini sono lo spostamento di `driftMinutes` *prima* del `return` e la rimozione del blocco della deriva *dopo* la barra)
2. «This night is over» + «Scan anyway» — dov'era
3. pastiglie della coda (Pending / Could not be recorded / Sign in again / Undone / unreadable) e il pannello `failedEntries` — dov'erano
4. **avviso guest list a radio spenta** — `ScannerClient.tsx:3264` (`guestListWarningText(listAgeMs, channelLive)`), prima dell'input `ref={searchRef}` a `:3359`
5. contatore (ricarica manuale)
6. ricerca
7. linguette (`role="group"` a `:3401`)
8. **`cameraFault` (`:3460`) e camera (`:3471`)** — rimaste dove erano, cioe' **fra le linguette e il loro contenuto**. Lo dichiaro come chiede il piano: con la camera aperta la contiguita' ricerca → linguette → lista (D-52-28, P-52-F) **non vale**. Con la camera chiusa (lo stato in cui si cerca un nome) la contiguita' vale, salvo il riquadro `cameraFault`, che compare solo se la camera ha fallito. UI-SPEC §D.3 diceva «sopra, dove sono oggi»: oggi non erano sopra. Non le ho spostate perche' il piano dice «restano dove sono» e la porta e' il file dove ogni spostamento va misurato; e' una misura da fare sull'iPhone in 52-14.
9. contenuto della linguetta: Recent (`:3511`), Alerts, oppure la lista (All · Out · In)

### Cosa NON e' stato toccato (T-52-19)

- `src/lib/offline/**`: zero modifiche (`git diff --name-only HEAD~3 HEAD` elenca solo i quattro file del piano)
- `handleUndoCheckIn`, `handleRetryBlocked`, `syncPendingCheckins`, `requestReload`, `fetchAttendance`, `handleGuestCheckIn`, la decisione dello scan, la coda e il drenaggio: identici; `handleUndoCheckIn(record)` compare **una** volta, con la stessa conferma e lo stesso ramo di supervisione
- `CONNECTIVITY_PILL` e le sue tinte: non spostate (verify:scan-legibility verde)
- `setActiveFilter`: compare solo nell'`onClick` della linguetta e nel reset di `handleChangeParty` (preesistente, `"not_arrived"`, al cambio di serata); `setActiveFilter("alerts")` ha zero occorrenze
- `PageShell.tsx`: non toccato

## Verifica

**Nessun test runner esiste: nulla qui e' "verificato perche' i test passano".**

| Controllo | Esito |
|---|---|
| `npm run build` (typecheck incluso) | exit 0, dopo ogni task |
| `npm run verify:touch-targets` | exit 0 — «13 MORE — every one of them on the door», tetto 14 invariato |
| `npm run verify:scan-legibility` | exit 0 |
| `npm run verify:no-viewport-read` | exit 0; zero `visualViewport` / `matchMedia` / `innerWidth` nel file |
| `npm run verify:conversion` | exit 0 |
| persona, tokens, dialogs, tables, breakpoints, routes, semantic-separation, sunset-gradient, no-header-identity, no-credit-account, media-strip, comment-stripper, venue-surfaces | exit 0 |
| `verify:capabilities`, `verify:refusal` | **non eseguibili qui**: il worktree non ha file env (`FATAL: missing environment variable(s)… Nothing was measured`) |
| `verify:redirects` | **non eseguibile qui**: chiede un server su `localhost:3000` (tutte le righe 404) |
| grep | `setActiveFilter(tab.key)` = 1, `handleUndoCheckIn(record)` = 1, `ref={searchRef}` = 1, `No scans yet` e `Nothing to report` presenti, `'setActiveFilter(tab.key)'` nel verificatore = 0, `count: 14` presente, `viewportFit` in layout = 0, `"60vh"` in EventTabs = 0 |

## Procedura manuale della porta (da percorrere in laboratorio, `npm run dev:lab`, mai in produzione)

Ruolo: `staff` assegnato alla serata (o `organizer`). Telefono vero; la seconda
meta' con la radio spenta.

1. Online, apri `/door`, scegli la serata. **Si osserva:** cinque linguette in una riga, `Out` attiva con l'indicatore sotto, numeri accanto senza parentesi, `Alerts` senza numero se non c'e' nulla da dire. A 360 px nessuna etichetta troncata; sotto i 360 il numero va a capo dentro la stessa linguetta.
2. Tocca `Recent` senza aver scansionato. **Si osserva:** «No scans yet» + la riga di spiegazione, nessun pulsante.
3. Scansiona un biglietto valido. **Si osserva:** il flash verde con esito e tipo di biglietto, senza nome (D-51), **prima** di ogni altra cosa; poi `Recent 1`. Apri Recent, tocca la riga: la conferma d'annullamento e il ramo di supervisione sono quelli di prima.
4. Resta su `Out` e spegni la radio. **Si osserva:** la pastiglia Offline, e **sopra la ricerca** l'avviso «…do not refuse them… let them in» (WR-04) — sempre visibile, senza toccare nulla. Sulla linguetta Alerts compaiono il pallino e il numero; **la linguetta attiva resta `Out`** (D-52-20).
5. Apri Alerts. **Si osserva:** la banda d'eta' (toccabile, ricarica), gli eventuali avvisi di cache e la deriva dell'orologio, in quest'ordine; il pallino si spegne. Torna su `Out`: il pallino resta spento finche' non arriva una chiave nuova.
6. Scansiona offline, poi riaccendi la radio. **Si osserva:** Pending (n) in testata durante l'attesa; se il drenaggio chiede una nuova sessione, «Sign in again…» in testata e l'esito del drenaggio sotto Alerts (pallino acceso).
7. Tocca la ricerca con la tastiera. **Si osserva:** il campo sale sotto la barra fissa; linguette e lista stanno subito sotto, **con la camera chiusa**. Ripeti con la camera aperta e registra cosa si vede: la camera sta fra linguette e lista (vedi sopra).

## L'aspettativa sull'iPhone, scritta prima della prova (D-52-28)

- **Atteso che NON funzioni su Safari iOS:** `interactiveWidget: "resizes-content"`. Safari al 2026-09 ignora la chiave; il layout non si ridimensiona sotto la tastiera. Il commento in `src/app/layout.tsx` lo dice accanto alla riga.
- **Atteso che funzioni su iPhone:** la ricerca che sale sotto la barra al fuoco (`scrollIntoView` + `scroll-mt-20`), perche' non dipende dal viewport. **Rischio dichiarato (assunzione A3):** un solo `requestAnimationFrame` puo' arrivare prima che la tastiera iOS abbia finito di salire, e Safari puo' poi ri-scorrere per mostrare il campo. Se in 52-14 il campo non resta in cima, la correzione e' il ritardo, non una lettura del viewport.
- **Atteso su Android (Chrome 108+, Firefox 132+):** il layout si ridimensiona e la barra in basso non copre la lista.
- `60dvh` in `EventTabs.tsx`: nessuna differenza visiva voluta.

## Deviazioni dal piano

Nessuna deviazione di codice. Due cose da sapere:

1. **La camera fra linguette e lista** — non spostata, dichiarata sopra (il piano lo prevedeva come dichiarazione).
2. **L'anello di fuoco delle linguette puo' essere tagliato.** Il gruppo e' `overflow-hidden` (UI-SPEC §D.1) e `FOCUS_RING` disegna l'anello *fuori* dal bottone (`outline-offset-2`): sui bordi esterni del gruppo l'anello da tastiera viene ritagliato. Alla porta si usa il tocco, non la tastiera, quindi l'impatto e' basso, ma e' un conflitto fra due regole della spec e lo lascio scritto invece di sceglierne una in silenzio.

## Rischio residuo per la porta

- **Cercare stando su Recent o Alerts non mostra risultati**: la ricerca filtra la lista, e la lista si vede solo su All · Out · In. La linguetta non cambia da sola (D-52-20, voluto): chi cerca deve toccare `Out`. Da osservare in 52-14 davanti a una finta fila.
- La banda d'eta' con «tap to reload» non e' piu' sempre visibile: sta sotto Alerts. Resta sempre visibile l'istruzione (avviso guest list) che si accende con la stessa condizione.
- Nessun error tracking: i nuovi elementi non aggiungono percorsi d'errore; quelli spostati restano visibili allo staff (in testata o dietro il pallino).

## Known Stubs

Nessuno.

## Self-Check: PASSED

- FOUND: src/app/(admin)/admin/scanner/ScannerClient.tsx, scripts/verify-touch-targets.mjs, src/app/layout.tsx, src/app/(public)/events/EventTabs.tsx
- FOUND commit: 40c1103, 22051bf, efcc8af
