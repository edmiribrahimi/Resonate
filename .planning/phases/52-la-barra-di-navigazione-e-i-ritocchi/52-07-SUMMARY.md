---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 07
subsystem: navigazione, accesso (visibilita')
tags: [nav-01, nav-02, nav-03, appnav, rbac, pannello, css]
requires:
  - "52-06: CAP.GALLERY_VIEW in keys.ts e la voce /gallery in capability-routes.ts"
provides:
  - "getNavigation(role, capabilities, liveAssignmentCapabilities) → { bar, panel } in src/lib/rbac/roles.ts"
  - "BarEntry a tre forme (link, disabled, panel) e PanelEntry"
  - "sortTabsByLabel in staff-tabs.ts: l'unica implementazione dell'ordine alfabetico (D-52-27)"
  - "AppNav a quattro voci, TASK spenta, foglio Management da telefono, lista in colonna"
  - "globals.css: keyframe del foglio e barra nascosta al fuoco sotto pointer: coarse"
affects:
  - "52-11: toglie workNav e la colonna Work da AppNav, usa sortTabsByLabel nella striscia"
  - "52-14: percorre P-52-A sul laboratorio"
  - "52-15: fino all'applicazione di M1 in produzione, lo staff in produzione vede Events · TASK · Account (nessun pannello)"
tech-stack:
  added: []
  patterns:
    - "tipo discriminato per le voci di barra: una voce che non e' un link non ha il campo href"
    - "due disclosure, due pulsanti, due stati scelti da CSS: nessuna lettura del viewport"
    - "stato corretto durante il render al cambio di pathname (niente effetto)"
    - "regola :has(:focus) sotto @media (pointer: coarse), solo CSS"
key-files:
  created: []
  modified:
    - src/lib/rbac/roles.ts
    - src/lib/routes/staff-tabs.ts
    - src/components/layout/AppNav.tsx
    - src/app/globals.css
    - src/app/(members)/account/page.tsx
  deleted:
    - src/components/account/ManagementSection.tsx
decisions:
  - "Voce Gallery del pannello con DUE guardie: un tipo sulla mappa (garanzia di build, come DoorAddress) e l'asserzione a caricamento chiesta dal piano (scatta al primo render, non al build — dichiarato nel codice)"
  - "Il pannello contiene Account solo se c'e' almeno un'altra voce; la presenza di Management in barra discende da questo, non da un quarto criterio (D-52-04)"
  - "Il foglio nella forma phone (la porta) ridichiara l'altezza della barra da md in su, perche' --nav-inset-block-end vale 0 da md ma la barra della porta resta in basso (T-52-30)"
  - "La correzione degli stati al cambio di indirizzo e' fatta durante il render (pattern React) invece che con useEffect: nessun fotogramma col foglio aperto sulla pagina nuova"
  - "Il glifo home e' uscito dal dizionario icons: Home non torna (D-52-02)"
metrics:
  duration: "~50 min"
  completed: 2026-09-23
---

# Fase 52 Piano 07: la barra a quattro voci e il pannello Management — Summary

Una funzione pura in `roles.ts` decide barra e pannello da sessione, ruolo e
capability; `AppNav` disegna quattro voci per chi lavora (Events · Check-in ·
TASK spenta · Management) e due per gli altri (Events · Account), con il
pannello come foglio da telefono e come lista nella colonna da tablet. La
sezione degli strumenti della pagina Account e il suo componente non esistono
piu'.

## Cosa e' stato fatto

### Task 1 — la funzione pura (`acbbe3d`)

- `src/lib/rbac/roles.ts`: `BarEntry` con tre forme — `link` (con `href`),
  `disabled` (TASK, senza `href` per costruzione), `panel` (Management, senza
  `href`) — e `getNavigation` che restituisce `{ bar, panel }`.
  - Check-in: predicato **identico** a prima (`admits`): `door.operate` per
    ruolo **o** per assegnazione viva, `null` che rifiuta. Assente, non spenta
    (D-52-05).
  - TASK: solo `master`, `organizer`, `staff` (`TASK_ROLES`, D-52-24).
  - Pannello: `visibleStaffTabs` + Gallery (se `gallery.view`) + Account,
    ordinato con `sortTabsByLabel`; vuoto se non c'e' altro che Account.
  - Barra: Management se il pannello non e' vuoto, altrimenti Account (→
    `/login` senza sessione).
  - Gallery esce dalla barra; il suo commento dice dove e' andata.
  - Voce Gallery: tipo `Extract<GalleryAddress, Route>` sulla voce
    `gallery.view` della mappa **piu'** l'asserzione a caricamento
    `resolveRoute("/gallery")?.key === CAP.GALLERY_VIEW` con due messaggi.
  - La docblock degli esiti riporta i sette casi di UI-SPEC §A.1 (quarta
    riscrittura), piu' la conseguenza «staff senza `gallery.view` → Events ·
    TASK · Account».
- `src/lib/routes/staff-tabs.ts`: `label: "Manage events"` (D-52-10);
  `sortTabsByLabel` generica, senza mutazione; `DECLARED` non riordinato, e il
  paragrafo sulla contiguita' dice che la dichiarazione tiene il gruppo e il
  rendering l'alfabeto. Due commenti che nominavano il componente cancellato
  nel task 3 sono stati riscritti senza il suo nome.
- Un ponte temporaneo `getVisibleNavItems` ha tenuto il commit compilabile; e'
  uscito nel task 2.

### Task 2 — `AppNav` e `globals.css` (`894a726`)

- Un solo `Link` con `isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE`; ogni altro
  elemento nuovo scrive `min-h-11` letterale. Pozzetto dell'icona su tutte le
  voci.
- TASK: `<button type="button" aria-disabled="true">`, nessun `onClick`,
  `href` o `title`, `text-faint`, pozzetto `border-dashed border-faint`,
  `cursor-default`, niente `active:`; la geometria del badge di TASK-04 e' un
  commento accanto al pozzetto, nessun elemento disegnato.
- Management: pulsante in barra (`md:hidden` nel form responsive) col proprio
  `sheetOpen`, pulsante in colonna (`hidden md:flex`) col proprio
  `columnOpen`; icona `squares-2x2` → `x-mark` da aperto, chevron che ruota in
  colonna. Corrente se il `pathname` comincia con l'`href` di una riga del
  pannello, senza `aria-current`.
- Foglio e scrim **fratelli** del `<nav>`, `z-50`, `bg-black/80`, niente
  `inset-0`, niente `<dialog>`, niente `Dialog.tsx`, tutto dichiarato nel
  codice. Chiusura su scrim, stessa voce, `Escape` (fuoco al pulsante), riga
  (anche la corrente), cambio di indirizzo.
- Lista in colonna chiusa con l'attributo `hidden`; aperta dentro una voce del
  pannello, si riapre entrando in una di esse, non si chiude da sola.
- La docblock rovescia «It does not collapse» con la ragione RESP-04 e cita
  «hiding a nav item is not protecting a route».
- `globals.css`: `@keyframes management-sheet-in` (160 ms, `translateY(1rem)`
  + opacita') e `management-scrim-in`; la regola `:has(:focus)` sotto
  `@media (pointer: coarse)` per `[data-nav-form="phone"]` e
  `[data-nav-sheet]`, e sotto `(width < 48rem)` per `[data-nav-form="responsive"]`.
  `--nav-inset-block-end` non cambia.

### Task 3 — la pagina Account (`15ad92f`)

- Tolti import, predicato, `managementCapabilities` e mount; la docblock dice
  che NAV-03 ha tolto la sezione il 2026-09-23, fase 52.
- `src/components/account/ManagementSection.tsx` cancellato: zero file in
  `src/` lo nominano. La pagina non contiene piu' la stringa della sezione,
  nemmeno nei commenti. Email, password, Sign out invariati.

## Verifica

Non esiste un test runner: nessuna affermazione qui dice che «i test passano».

| Controllo | Esito |
|---|---|
| `npm run build` (typecheck incluso), dopo ogni task | exit 0 |
| `verify:touch-targets` | exit 0 — `AppNav.tsx`: 6 elementi, 5 dichiarano il minimo, 1 esenzione primitiva (il `Link` col ternario, applicata 1×) |
| `verify:dialogs` | exit 0 |
| `verify:no-viewport-read` | exit 0 |
| `verify:conversion` | exit 0 (dopo il task 2 e dopo il task 3) |
| `verify:breakpoints` | exit 0 |
| `verify:tokens` | exit 0 |
| `verify:routes` | exit 0 |
| grep del piano (task 1, 2, 3) | tutti verdi |
| `verify:capabilities` | **non eseguito**: dichiarato rosso contro la produzione fino al 52-15 |

**Procedura manuale:** P-52-A in `52-PROCEDURES.md` (non riscritta). Si
percorre sul laboratorio nel piano 52-14; qui non e' stata percorsa, e nessun
render nel browser e' stato osservato in questo piano (il worktree non ha file
d'ambiente).

## Porta (`checkin-offline.md`)

La porta monta `AppNav form="phone"`. Cosa cambia per un telefono di staff:
la voce Check-in resta la stessa (`/door`, stesso predicato, seconda
posizione); la barra ha Events · Check-in · TASK · Management invece di
Events · Gallery · Check-in · Account — stesso numero di voci. Il foglio alla
porta finisce sopra la barra a ogni larghezza, quindi non copre il pulsante
che l'ha aperto; si chiude cambiando indirizzo. Nulla della superficie di
check-in, della coda offline o dello scanner e' stato toccato.

## Deviazioni dal piano

### Auto-corrette

**1. [Regola 3 — Bloccante] Ponte temporaneo fra task 1 e task 2**
- **Trovato durante:** task 1
- **Problema:** togliere `getVisibleNavItems` rompeva il build del commit del
  task 1, perche' `AppNav` lo importava fino al task 2.
- **Soluzione:** una funzione ponte dichiarata come tale nel task 1, tolta nel
  task 2. Nessun commit del piano e' rosso al build.
- **Commit:** `acbbe3d` (aggiunta), `894a726` (rimozione)

**2. [Regola 1 — Bug] Il foglio alla porta, da tablet, avrebbe coperto la barra**
- **Trovato durante:** task 2
- **Problema:** `--nav-inset-block-end` vale `0px` da `md` in su, ma la barra
  della porta (`form="phone"`) resta in basso a ogni larghezza: un foglio
  ancorato alla variabile avrebbe raggiunto il bordo e coperto il pulsante
  Management (T-52-30).
- **Soluzione:** nel solo form `phone`, `md:bottom-[calc(5rem+env(safe-area-inset-bottom))]`
  e il `max-h` corrispondente, con la ragione accanto.
- **Commit:** `894a726`

**3. [Regola 3 — Bloccante] Righe del pannello in linea, non in un componente**
- **Trovato durante:** task 2
- **Problema:** un componente `PanelRow` con la classe passata per prop sarebbe
  stato letto da `verify:touch-targets` come «nessuna dichiarazione».
- **Soluzione:** i due `Link` delle righe sono scritti in linea, ciascuno con
  `min-h-11` letterale.
- **Commit:** `894a726`

**4. Riapertura della lista: correzione durante il render invece di `useEffect`**
- Il piano chiedeva «un `useEffect` sul `pathname`». L'effetto e' lo stesso
  (si riapre entrando in una voce del pannello, non si chiude mai da sola, e il
  foglio si chiude al cambio di indirizzo), ma la correzione avviene nel render
  che riceve il nuovo indirizzo: nessun fotogramma col foglio ancora aperto
  sopra la pagina appena aperta. `Escape` usa invece un effetto (e' un listener).

## Da sapere a valle

- **Duplicazione fino al 52-11.** Da tablet, su una superficie di lavoro, gli
  strumenti compaiono due volte — nella lista Management e sotto «Work» — finche'
  il 52-11 non toglie `workNav`. Dichiarato nella docblock della prop.
- **Staff in produzione fino al 52-15.** Senza `gallery.view` in produzione, uno
  `staff` non ha voci nel pannello: la sua barra e' Events · (Check-in se
  assegnato) · TASK · Account. E' la derivazione corretta, scritta nella
  docblock di `getNavigation`.
- **Due commenti nominano ancora `getVisibleNavItems` come storia**, fuori dal
  perimetro di questo piano e non toccati: `src/lib/capabilities/server.ts:203`
  e `src/lib/supabase/middleware.ts:351`. Riferimenti a un nome uscito, per la
  fase 57.
- **La persona cita un nome uscito.** `.claude/rules/access-gating.md`, gate
  *coerenza navigazione/permessi*, parla di «la lista `NAV_ITEMS` in
  `src/lib/rbac/roles.ts`»: quella costante non esiste piu' (le voci sono
  `EVENTS`, `CHECK_IN`, `ACCOUNT` piu' `getNavigation`). La regola resta vera;
  il riferimento va aggiornato da chi tocca la persona (con changelog e
  `verify:persona`), non da questo piano.
- **`:has()` sul telefono** e' l'assunzione A2: da provare con P-52-F.

## Known Stubs

- TASK e' spenta per decisione (D-52-03): nessun dato, nessun contatore, il posto
  del badge e' solo un commento. La accende la fase 53.

## Threat Flags

Nessuna superficie nuova oltre il `threat_model` del piano: nessuna rotta,
nessuna lettura di dati, nessuna policy. T-52-27..31 sono mitigati come scritto
(asserzione Gallery, funzione pura server-fed, TASK senza dati, foglio sopra la
barra, Check-in assente e non spento).

## Self-Check: PASSED

- `src/lib/rbac/roles.ts`, `src/lib/routes/staff-tabs.ts`,
  `src/components/layout/AppNav.tsx`, `src/app/globals.css`,
  `src/app/(members)/account/page.tsx`: presenti e modificati.
- `src/components/account/ManagementSection.tsx`: assente, come richiesto.
- Commit `acbbe3d`, `894a726`, `15ad92f`: presenti nel log del ramo.
