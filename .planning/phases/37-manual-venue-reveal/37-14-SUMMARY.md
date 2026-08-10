---
phase: 37-manual-venue-reveal
plan: 14
subsystem: database
tags: [postgres, rls, security-definer, server-actions, next, supabase]

# Dependency graph
requires:
  - phase: 37-02
    provides: "la migration `venues_read_narrowed` — i cinque rami di `venue_for_parties` e la policy `venues_select_staff`"
  - phase: 37-05
    provides: "la lista eventi spostata su `venue_for_parties`, che ha misurato il pavimento `is_published`"
  - phase: 37-06
    provides: "il dettaglio evento spostato su `venue_for_parties`, e il predicato di pagina che il ramo 3 rispecchia"
  - phase: 37-10
    provides: "`revealVenueNow` e l'unione dei rifiuti tipizzati"
  - phase: 37-13
    provides: "la misura su container che ha reso decidibile la voce 4 di deferred-items"
provides:
  - "La precondizione lato server sulla sede: una serata senza `venue_id` non si rivela"
  - "`venue_id` fra i campi che una serata gia' rivelata non puo' cambiare dal form"
  - "Il ramo 3 di `venue_for_parties` allineato al predicato di pagina su `venue_reveal_on_purchase`"
  - "`is_published` dentro i rami: su una bozza risponde solo `staff.manage`"
  - "Il docblock di `party_not_in_event` riscritto su cio' che il controllo fa davvero"
  - "`eventQuery.single()` che non scarta piu' il proprio errore"
affects: [deploy della migration 20260810161000, la prova sull'atto vero della rivelazione manuale]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Una guardia che vive solo nel componente e' UX: la stessa regola si scrive anche lato server"
    - "Due estremita' di uno stesso percorso si chiudono insieme, o il buco si sposta"
    - "Un rifiuto nuovo e' un membro dell'unione con la sua frase nel Record totale"
    - "Un predicato SQL che dichiara di rispecchiare un predicato TypeScript si legge dalla fonte"
    - "Prova comportamentale del SQL su container usa-e-getta, mai in produzione"

key-files:
  created: []
  modified:
    - "supabase/migrations/20260810161000_venues_read_narrowed.sql"
    - "src/app/(admin)/admin/events/[id]/reveal/actions.ts"
    - "src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx"
    - "src/app/(admin)/admin/events/actions.ts"
    - "src/app/(public)/events/[slug]/page.tsx"
    - ".planning/phases/37-manual-venue-reveal/deferred-items.md"

key-decisions:
  - "D-37-26: su una bozza chi ha `staff.manage` vede il nome del locale — non e' un allargamento, quella chiave legge gia' `public.venues` per `venues_select_staff`"
  - "D-37-27: la precondizione della rivelazione e' la SEDE COLLEGATA, non il testo libero — la strada pubblica verso un indirizzo passa da `venue_id`"
  - "D-37-28: cambiare la sede di una serata rivelata e' rifiutato con una categoria propria, non sotto la frase gia' esistente"
  - "D-37-29: sulla lettura dell'evento anche il fallimento di trasporto viene lanciato, perche' li' l'unica alternativa alla verita' e' dichiarare che l'evento non esiste"

patterns-established:
  - "Rifiuto per categoria propria: due cause che mandano la persona in due posti diversi non condividono una frase"
  - "Prova per mutazione su container: un rifiuto atteso si conferma accendendo la condizione e vedendolo diventare un permesso"

# NESSUNO — e' deliberato, non un'omissione. Il piano dichiara
# `requirements: [VENUE-01, VENUE-02]`, ma nessuno dei due si spunta qui:
#   * VENUE-02, per la voce 5 di `deferred-items.md` — l'atto vero non e' mai
#     stato compiuto, e un verde su un requisito di rivelazione mai esercitato
#     e' la categoria peggiore in cui averne uno;
#   * VENUE-01, perche' chiede che la rivelazione programmata resti il percorso
#     normale **mentre la lettura anonima e' chiusa**, e la migration che la
#     chiude non e' applicata. 37-13 lo ha lasciato aperto per questa ragione, e
#     questo piano non la cambia: rende quella migration migliore, non applicata.
requirements-completed: []

# Metrics
duration: 55min
completed: 2026-08-11
---

# Fase 37 Piano 14: chiusura dei reperti del review — Summary

**Chiuso il percorso che pubblicava un indirizzo senza lasciare traccia, e riallineati i rami di `venue_for_parties` al predicato di pagina che dichiaravano di rispecchiare — tutto dentro una migration mai applicata, quindi al costo della modifica di un file.**

## Performance

- **Durata:** ~55 min
- **Task:** 4 su 4
- **File modificati:** 6
- **Migration nuove:** 0 — 57 file prima, 57 dopo, timestamp invariato

## Accomplishments

- **CR-01 chiuso alle due estremita'.** Una serata senza sede collegata non si
  rivela piu' (rifiuto lato server, non solo bottone spento), e una sede non si
  collega piu' a una serata gia' rivelata. Chiuderne una sola avrebbe spostato
  il buco: la prima da sola lascia passare il passo 3 dello scenario, la seconda
  da sola lascia scrivere un atto che nomina un segnaposto.
- **WR-01 chiuso.** Il ramo 3 applica `venue_reveal_on_purchase`, letto dal ramo
  di pagina come fonte, con la stessa semantica — `coalesce(…, true)`, che e' il
  `?? true` della pagina e non una scelta fatta qui.
- **Voce 4 di `deferred-items.md` chiusa.** `is_published` e' dentro i rami: i
  quattro del pubblico lo richiedono, quello dello staff no.
- **WR-07 e WR-05 chiusi**, uno correggendo il codice, l'altro correggendo il
  commento — e la scelta di quale correggere e' il contenuto del reperto.
- **Undici sonde verdi su container Postgres usa-e-getta**, mutazione compresa.
  Zero scritture in produzione, zero migration applicate.

## Task Commits

1. **Task 1: CR-01, le due estremita'** — `ad41b84` (fix)
2. **Task 2: WR-01, il ramo 3 e la bandiera** — `8497b35` (fix)
3. **Task 3: `is_published` dentro i rami** — `2d1c2fc` (fix)
4. **Task 4: WR-07 e WR-05** — `ae64c8d` (fix)

## Files Created/Modified

- `supabase/migrations/20260810161000_venues_read_narrowed.sql` — ramo 3 con il
  congiunto della bandiera; `is_published` spostato dentro i rami, con la
  ragione scritta accanto; `COMMENT ON FUNCTION` allineato a entrambe.
- `src/app/(admin)/admin/events/[id]/reveal/actions.ts` — il rifiuto
  `venue_not_set`, `venue_id` letto come colonna in `resolveNight`, la
  precondizione prima dell'atto, e il docblock di `party_not_in_event`
  riscritto.
- `src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx` — la frase
  del rifiuto nuovo nel `Record` totale.
- `src/app/(admin)/admin/events/actions.ts` — `venue_link_locked`: `venue_id`
  fra i campi bloccati su una serata rivelata, con la sua frase.
- `src/app/(public)/events/[slug]/page.tsx` — `eventQuery.single()` che
  ramifica sull'errore invece di scartarlo.
- `.planning/phases/37-manual-venue-reveal/deferred-items.md` — voce 4 chiusa,
  con data e ragione.

## Decisions Made

**D-37-26 — su una bozza, chi ha `staff.manage` vede il nome del locale.**
E' la risposta alla domanda non tecnica che la voce 4 teneva aperta. Non e' un
allargamento: quella chiave legge gia' `public.venues` per intero dalla policy
`venues_select_staff`, creata dalla stessa migration. La funzione che gli negava
il nome su una bozza non lo proteggeva da niente — gli chiudeva una strada
mentre un'altra era aperta. 37-13 lo aveva misurato: stesso master, 0 righe
dalla funzione, 2 righe leggendo `public.venues` diretto. La premessa e' stata
riverificata leggendo la policy prima di agire, come il piano pretendeva.

**D-37-27 — la precondizione e' la sede collegata, non il testo libero.**
`revealVenueNow` rifiuta su `venue_id === null` anche quando `venue_text` e'
valorizzato. La ragione e' architetturale, non prudenziale: l'unica strada
pubblica verso un indirizzo, `public.venue_for_parties`, fa `JOIN public.venues
ON v.id = ep.venue_id`. Una serata con solo testo libero non pubblica nessun
indirizzo attraverso quella strada, e rivelarla spenderebbe l'interruttore a
senso unico su un segnaposto.

**D-37-28 — `venue_link_locked` e' un rifiuto suo, non una seconda causa sotto
`venue_secret_locked`.** Le due frasi mandano la persona in due posti diversi:
la prima al pannello della rivelazione, la seconda a un master che deve
ri-nascondere per primo. Un unico messaggio sarebbe il precedente del newsletter
raggiunto da una porta costruita in questa fase.

**D-37-29 — sulla lettura dell'evento, anche il trasporto viene lanciato.**
E' una differenza deliberata rispetto alla lettura delle serate poco sotto, che
lascia degradare il caso senza codice. Quella ha una via di mezzo — un evento
reso senza serate e' piu' povero, non falso. La lettura dell'evento non ne ha:
la sua unica alternativa alla verita' e' dichiarare a un visitatore, e a un
crawler, che l'evento non esiste.

## Prova comportamentale del SQL

Non esiste un test runner per il prodotto: `npm run build` e' il typecheck, e
nient'altro puo' dire cosa fa una funzione SQL. La prova e' stata fatta su un
**container Postgres usa-e-getta** con lo shim, lo schema base e tutte le
migration applicate — **compresa la 20260810161000 come e' oggi sul disco** —
sul modello di 37-02 e 37-13. Il container e' stato distrutto a fine corsa; la
produzione non e' stata toccata.

| Sonda | Chi, su cosa | Atteso | Ottenuto |
|---|---|---|---|
| W1 | biglietto, serata segreta, bandiera **false** | 0 | 0 |
| W2 | biglietto, serata segreta, bandiera **true** | 1 | 1 |
| W3 | **mutazione**: accesa la bandiera sulla stessa serata, stesso titolare | 1 | 1 |
| W4 | bandiera **NULL** → `coalesce(…, true)`, come il `?? true` della pagina | 1 | 1 |
| P1 | `staff.manage` su una **bozza** | 1 | 1 |
| P2 | membro approvato senza titolo, bozza non segreta | 0 | 0 |
| P3 | anonimo, bozza | 0 | 0 |
| P4 | anonimo, serata **pubblicata** non segreta (D-37-24) | 1 | 1 |
| P5 | anonimo, serata pubblicata **segreta** | 0 | 0 |
| P6 | `staff.manage`, serata pubblicata segreta (ramo 2) | 1 | 1 |
| P7 | membro approvato, serata segreta lontana dalla finestra (ramo 5) | 0 | 0 |

**W3 e' la sonda che conta oltre il proprio esito.** Un rifiuto atteso su un
fixture puo' essere prodotto da un errore del fixture invece che dalla regola:
accendere la bandiera su quella stessa riga e vedere lo stesso titolare passare
prova che W1 misurava la bandiera e non un difetto del setup. E' il gate *prova
per mutazione* di `ai-engineering.md` applicato a una sonda invece che a uno
script di verifica.

**P2 e P3 sono la controprova di P1**: il pavimento della pubblicazione regge
ancora per i quattro rami del pubblico. Se fosse stato tolto del tutto invece
che spostato, P2 sarebbe tornata 1.

Lo script della sonda **non e' stato committato**: e' vissuto nella scratchpad
di sessione, come il lavoro di 37-13. Chi lo rifara' parte da
`withContainer(…, { seed: false })` in `scripts/rls-baseline-container.mjs`, e
trovera' le stesse quattro insidie di fixture che sono costate quattro giri —
`events` non ha piu' `time`, `event_parties` non ha piu' `type`, `formats`
pretende `code` e un `color` non gia' preso, `party_series` pretende `code`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Il Task 4 nominava il file sbagliato per WR-07**

- **Trovata durante:** Task 4
- **Cosa:** il blocco `<files>` del Task 4 dichiara
  `src/app/(admin)/admin/events/[id]/reveal/actions.ts`, ma
  `eventQuery.single()` non esiste in quel file: WR-07 vive in
  `src/app/(public)/events/[slug]/page.tsx:337`, dove il review lo colloca con
  la sua riga. Il piano riassume, il rapporto ha i numeri di riga, e
  l'istruzione di sessione dice quale dei due vince.
- **Fix:** WR-07 corretto in `page.tsx`, WR-05 in `reveal/actions.ts`. Il Task 4
  tocca quindi due file invece di uno.
- **Verifica:** `grep -rn "eventQuery" src/` restituisce solo `page.tsx`.
- **Committed in:** `ae64c8d`

**2. [Rule 2 - Missing Critical] `RevealVenueDialog.tsx` non e' in `files_modified`**

- **Trovata durante:** Task 1
- **Cosa:** il frontmatter del piano elenca tre file; il `Record` totale dei
  rifiuti vive in un quarto. Un membro nuovo dell'unione senza la sua frase e'
  un errore di compilazione — che e' il punto di quel `Record` — quindi il file
  andava toccato per forza.
- **Fix:** aggiunta la frase di `venue_not_set`.
- **Verifica:** `npm run build` esce 0, che e' esattamente il criterio di
  accettazione scritto nel Task 1.
- **Committed in:** `ad41b84`

---

**Totale deviazioni:** 2 auto-fix (1 blocking, 1 missing critical).
**Impatto:** nessun allargamento di perimetro. Entrambe erano necessarie per
soddisfare i criteri di accettazione scritti nel piano stesso.

## Issues Encountered

**Una asimmetria deliberata fra il pannello e il server, dichiarata invece che
taciuta.** Il pannello arma il bottone su `venueName ?? venue_text`
(`edit/page.tsx:294`); il server ora rifiuta su `venue_id === null`. Su una
serata segreta con solo testo libero il bottone risulta quindi armato e la
pressione riceve il rifiuto tipizzato, che nomina la causa e dice cosa fare.

Il verso e' quello sicuro — si spreca un clic, non si pubblica un indirizzo — e
il piano chiede esplicitamente che la guardia del pannello **resti** senza
chiedere di estenderla, su una superficie fuori da `files_modified`. Nessun
commento del codice dichiara una proprieta' che non ha: il paragrafo del
pannello parla del caso «nessun nome e nessun testo», che resta vero. Chi
vorra' chiudere anche quel seam deve passare `venue_id` al pannello, ed e' una
modifica a due file di superficie, non alla regola.

**Un vincolo che rende irraggiungibile un caso che la migration descrive.** Il
container ha rifiutato un profilo `organizer` + `pending` con il CHECK
`profiles_role_implies_approved`. La sezione 2 della migration spiega a lungo
che «un organizer pending puo' leggere la lista delle sedi» perche'
`staff.manage` porta `requires_approved = false`: e' vero della capability e
**non realizzabile nei dati**, finche' quel CHECK esiste. Non e' un difetto e
non e' stato toccato — il paragrafo resta corretto su cio' che dice, e questa
riga esiste perche' chi lo legge non deduca che quel caso esista in produzione.

## User Setup Required

Nessuna. **E soprattutto: niente e' stato applicato.**
`supabase/migrations/20260810161000_venues_read_narrowed.sql` resta **non
applicata**, come era all'inizio di questo piano — ed e' l'unica ragione per cui
tre dei quattro reperti sono costati la modifica di un file. Quando verra'
applicata, verranno applicate le correzioni insieme al resto, in una sola
transazione.

## Next Phase Readiness

- I quattro reperti del review indirizzati a questo piano sono chiusi. Restano
  aperti gli altri del rapporto — WR-02, WR-03, WR-04, WR-06, WR-08 e i tre
  Info — che non erano in perimetro qui.
- La voce 5 di `deferred-items.md` resta aperta: la prova sull'atto vero della
  rivelazione manuale non e' stata compiuta, e **`VENUE-02` non si spunta**. Il
  momento e' dopo il deploy della migration e dell'arretrato del ramo, e serve
  una autorizzazione nuova a scrivere in produzione, che nessuno ha chiesto qui.
- Restano aperte anche le voci 6 e 7 (l'harness dei baseline e la variabile che
  non nomina il sito).

---
*Fase: 37-manual-venue-reveal*
*Completato: 2026-08-11*

## Self-Check: PASSED

Tutti i sei file dichiarati esistono su disco; tutti e quattro gli hash di
commit esistono nella history. I criteri meccanici del piano rispondono: il
`Record` dei rifiuti porta `venue_not_set`, `venue_link_locked` e' in
`(admin)/admin/events/actions.ts`, `venue_reveal_on_purchase` compare 7 volte
nella migration, `is_published` non e' piu' un congiunto davanti ai rami, la
voce 4 di `deferred-items.md` e' marcata chiusa, e
`supabase/migrations/` contiene 57 file come prima.
