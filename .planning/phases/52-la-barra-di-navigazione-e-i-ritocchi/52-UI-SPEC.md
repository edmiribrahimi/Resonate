---
phase: 52
slug: la-barra-di-navigazione-e-i-ritocchi
status: draft
shadcn_initialized: false
preset: none
created: 2026-09-23
extends: 41-UI-SPEC.md
sources:
  - 52-CONTEXT.md (D-52-01 … D-52-28, bloccate — nessuna richiesta di nuovo)
  - 52-RESEARCH.md (§A barra, §A.4 gate, §B pannello, §G linguette, §H viewport)
  - 41-UI-SPEC.md (token, primitivi, §6 «tutto e' 44 px», §10 scala z, §5 colore)
  - .claude/rules/brand-visual-system.md, nextjs-architecture.md (gate accessibilita' al buio), checkin-offline.md
  - albero di oggi: AppNav.tsx, StaffNav.tsx, Chip.tsx, Button.tsx, globals.css, ScannerClient.tsx (letti il 2026-09-23)
---

# Phase 52 — UI Design Contract

> Contratto visivo e d'interazione per la barra a quattro voci, il pannello
> Management (foglio da telefono, lista in colonna da `md:`), la striscia degli
> strumenti appesa, le cinque linguette della porta e la barra che si nasconde
> al fuoco. **Estende `41-UI-SPEC.md` e non lo contraddice**: token, scala,
> tipografia, raggi, focus e scala z sono ereditati interi e qui non si
> riscrivono. Ogni rapporto di contrasto qui sotto e' stato **calcolato il
> 2026-09-23** con la formula WCAG 2.x sui valori di `globals.css`.
>
> Prosa in italiano; classi, identificatori e testi d'interfaccia in inglese
> come l'app (decisione del proprietario, nessun lavoro di traduzione).

---

## 0. Le regole che vengono prima di tutto il resto

1. **Nessun token nuovo, nessun gradino nuovo.** Nessun colore, nessuna misura
   di spaziatura, nessun rango z, nessuna dimensione di testo che `41-UI-SPEC.md`
   non nomini gia'. Dove questo documento sceglie, sceglie fra gradini esistenti.
2. **La larghezza cambia la disposizione, mai l'appartenenza** (41 §0.5). Chi
   compare in barra e nel pannello lo decide la funzione pura in `roles.ts` sul
   server; il CSS decide come sta. Nessun filtro, taglio o `slice` in `AppNav`.
3. **Il viewport non si legge in JavaScript** (41 §0.6, `verify:no-viewport-read`).
   Foglio (telefono) e lista (colonna) sono **due alberi**, due pulsanti, due
   stati, scelti da `md:hidden` / `hidden md:block`. La barra nascosta al fuoco
   e' **solo CSS** (`:has()`).
4. **Ogni elemento interattivo nuovo scrive `min-h-11` letterale** nella propria
   stringa di classe (`verify:touch-targets`). Il frammento
   `isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE` resta **su un solo `Link`**: i nuovi
   elementi (pulsante Management, TASK spenta, righe del pannello) **non**
   riusano quel ternario.
5. **Il foglio non e' un dialog.** Niente `<dialog>`, niente `Dialog.tsx`, niente
   `inset-0` (`verify:dialogs` lo leggerebbe come guscio di dialog). E' una
   disclosure non modale, e il codice lo dichiara (Escape, ritorno del fuoco,
   perche' non `Dialog`).
6. **Il colore non e' mai l'unico canale** (`nextjs-architecture.md`, gate
   *accessibilita' al buio*). Ogni stato di questo documento — corrente, aperto,
   spento, evidenziato — ha **almeno un canale non cromatico**, nominato nella
   sua riga.
7. **Il debito della porta puo' solo scendere.** `DOOR_TARGET_DEBT` e' a 14; le
   linguette diventano `min-h-11` e la riga `setActiveFilter(tab.key)` esce dal
   debito **nello stesso commit** (14 → 13). Nessun quindicesimo.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **none** — nessun `components.json`, nessuno shadcn (D-40-01, D-41-20). Gate shadcn: non applicabile, rifiutato per decisione |
| Preset | not applicable |
| Component library | none — primitivi scritti a mano in `src/components/ui/` (`Chip`, `Badge`, `Button` con `FOCUS_RING`, `Typography`) |
| Styling | Tailwind CSS 4.2.1, config CSS-first in `src/app/globals.css` |
| Icon library | Heroicons v2 **outline**, 24 px, `strokeWidth={1.5}`, incollati come SVG nel dizionario `icons` di `AppNav.tsx` (forma di oggi). Nuovi: `squares-2x2` (Management), `clipboard-document-check` (TASK), `x-mark` (Management aperto, telefono), `chevron-down` (Management in colonna) |
| Font | display Orbitron (solo `PageTitle`), interfaccia Inter, dati mono di sistema — ereditati da 41 §7 |
| Theme | solo scuro |
| Pacchetti nuovi | **nessuno** |

---

## Spacing Scale

Ereditata intera da 41 §3.1 (scala Tailwind a 4 px). **Nessun gradino nuovo.**

| Token | Value | Uso in questa fase |
|-------|-------|--------------------|
| xs | 4px | gap icona↔etichetta nella voce di barra (`gap-1`), gap etichetta↔conteggio nella linguetta, distanza del badge dall'icona |
| sm | 8px | padding verticale della striscia appesa (`py-2`), padding verticale del foglio (`py-2`), gap fra i chip della striscia |
| md | 16px | padding orizzontale di voce e riga in colonna (`px-4`), margine sotto la riga delle linguette |
| lg | 24px | gutter di pagina (`px-6`), padding orizzontale delle righe del foglio |
| xl | 32px | padding verticale degli stati vuoti della porta (`py-8`) |
| 2xl | 48px | — |
| 3xl | 64px | rientro delle voci del pannello in colonna (`ps-16`); striscia di scrim sempre visibile sopra il foglio (`4rem`) |

**Eccezioni dichiarate (tutte dentro la scala):**

1. `min-h-11` = 44 px su **ogni** bersaglio nuovo (41 §6.1).
2. `h-7 w-10` = 28 × 40 px, il **pozzetto dell'icona** in barra e in colonna (§A.2): 7 × 4 e 10 × 4.
3. `h-4` = 16 px, l'altezza del **posto del badge** di TASK (§A.4), pari all'interlinea di `text-xs`.
4. **Gli stati vuoti della porta usano `py-8`, non il `py-12` di 41 §8.11.** Ragione: la porta si usa con la tastiera aperta e la lista sotto le linguette; 48 px sopra e sotto una frase spingerebbero fuori vista proprio la zona che D-52-28 vuole contigua alla ricerca.

---

## Typography

Ereditata da 41 §7: **quattro dimensioni, due pesi (400 e 600) e nient'altro.**
Nessun elemento toccato da questa fase usa `font-medium` (500), `font-bold`
(700), `text-[10px]` o `text-[11px]`: dove la porta li ha oggi **sulle righe che
questa fase riscrive** (le linguette, l'intestazione «Recent scans» che sparisce)
passano ai valori del sistema.

| Role | Size | Weight | Line Height | Dove in questa fase |
|------|------|--------|-------------|---------------------|
| Body | 14px (`text-sm`) | 400 | 20px (1.43) | etichette delle voci in colonna, righe del foglio, righe del pannello in colonna, corpo degli stati vuoti |
| Label / Data | 12px (`text-xs`) | 600 | 16px (1.33) | etichette della barra da telefono, etichette delle linguette; **conteggi delle linguette e numeri del badge in `font-mono`** (cifre tabulari, `globals.css`) |
| Heading | 16px (`text-base`) | 600 | 24px (1.5) | titolo degli stati vuoti della porta |
| Display | 30px (`text-3xl`) | 600 | 36px (1.2) | **non usato** da questa fase (solo `PageTitle`) |

- **`TASK` si scrive in maiuscolo nel testo**, non con `uppercase`: e' il nome
  che il proprietario ha dato alla sezione. Tutte le altre etichette restano come
  in `roles.ts` / `staff-tabs.ts`, `normal-case` sull'elemento.
- Le etichette di barra non vanno mai a capo e non si troncano: la piu' lunga,
  `Management`, misura ~68 px a 12 px su una voce di ~90 px (360 px / 4).

---

## Color

Ereditato da 41 §5.1. **Nessun colore nuovo.**

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--ground` `#0A0712` | fondo pagina, barra (`bg-ground/80` + blur, invariata), colonna, **striscia appesa (opaca, `bg-ground`)** |
| Secondary (30%) | `--surface` `#140D20`, `--raised` `#1D1430` | pannello del foglio (`bg-surface`), pozzo delle linguette (`bg-surface`), linguetta attiva (`bg-raised`) |
| Accent (10%) | `--accent` `#FF5C93` | solo gli elementi elencati sotto |
| Destructive | `--sem-crit` `#FF6B8E` | nessun uso nuovo; gli avvisi `error` di `cacheNotices` restano com'erano |
| Semantica | `--sem-warn` `#FFB25E` | **il pallino «nuovo» della linguetta Alerts** (§D.3) — stesso colore dei pallini delle pastiglie della porta |
| Scrim | `bg-black/80` | dietro il foglio da telefono; stessa forma del primitivo `Dialog`, tollerata da `verify:conversion` check A |

**Accent riservato a, in questa fase:** l'etichetta e l'indicatore di 2 px
della voce di barra corrente (`Events`, `Check-in`, `Account`, e `Management`
quando si e' dentro una voce del pannello); l'etichetta e l'indicatore della
riga corrente nel foglio e nella lista in colonna; il chip selezionato della
striscia (`Chip` selezionato: fondo `--accent`, inchiostro `--ground`, 6.85:1);
l'indicatore di 2 px sotto la linguetta attiva della porta. **Mai** lo stato
aperto del pannello, mai TASK, mai il pallino degli avvisi, mai un conteggio.

### Contrasti calcolati il 2026-09-23

| Coppia | Rapporto | Contro |
|---|---|---|
| etichetta a riposo `--muted` su `--ground` | 7.14 | 1.4.3, 4.5:1 |
| etichetta corrente `--accent` su `--ground` | 6.85 | 1.4.3 |
| riga del foglio a riposo `--ink-2` su `--surface` | 12.24 | 1.4.3 |
| riga corrente `--accent` su `--surface` | 6.50 | 1.4.3 |
| linguetta attiva `--ink` su `--raised` | 15.22 | 1.4.3 |
| linguetta a riposo `--muted` su `--surface` | 6.78 | 1.4.3 |
| pallino `--sem-warn` su `--surface` | 10.63 | 1.4.11, 3:1 |
| **TASK spenta: `--faint` su `--ground`** | **3.54** | vedi sotto |

**L'unico uso di `--faint` come colore di testo, dichiarato e chiuso a uno.**
41 §12 dice che `--faint` non e' un colore per il testo piccolo, e resta vero
ovunque tranne qui: WCAG 1.4.3 esenta esplicitamente *il testo di un componente
d'interfaccia inattivo*, e TASK spenta e' esattamente quello. Il grigio e' la
richiesta del proprietario (D-52-03, «voce grigia»), ma **non e' il canale che
porta lo stato**: lo porta il bordo tratteggiato del pozzetto (§A.3), e
`aria-disabled` per chi non vede. Lista delle eccezioni: **una**, questa. Il
bordo tratteggiato `--faint` su `--ground` misura 3.54, sopra il 3:1 di 1.4.11.

---

## §A — La barra (NAV-01, D-52-01..06, D-52-24)

### A.1 Voci per soggetto (da `52-RESEARCH.md` §A, dopo D-52-24)

| Soggetto | Barra, in quest'ordine | Larghezza voce a 360 px |
|---|---|---|
| anonimo | Events · Account (→ `/login`) | 180 px |
| `attendee` | Events · Account | 180 px |
| `staff` non assegnato | Events · TASK · Management | 120 px |
| `staff` assegnato stasera | Events · Check-in · TASK · Management | 90 px |
| `organizer`, `master` | Events · Check-in · TASK · Management | 90 px |
| `my_access_context` fallito | Events · Account | 180 px (fail closed) |

La riga resta `mx-auto flex h-20 max-w-lg` (5 rem, invariata: da essa dipende
`--nav-inset-block-end`). Nessuna voce cambia larghezza a seconda dello stato.

### A.2 Anatomia di una voce (telefono)

```
┌──────────── ~90 px ────────────┐
│          ┌──────────┐ [badge]  │  ← pozzetto 28×40, rounded-full, border 1px
│          │   icon   │          │     (trasparente sulle voci normali)
│          └──────────┘          │
│             4 px               │
│           Management           │  ← text-xs 600, una riga, mai troncata
│  ════════ indicatore 2px ════  │  ← solo se corrente (inset-x-3, bottom-0)
└────────────────── h-20 ────────┘
```

- **Tutte le voci portano il pozzetto** `inline-flex h-7 w-10 items-center justify-center rounded-full border border-transparent`, con l'icona `h-6 w-6` al centro. Sulle voci normali il bordo e' trasparente e non si vede; esiste perche' le quattro icone stiano alla **stessa quota** di TASK, che il bordo lo mostra. Senza, l'icona di TASK sarebbe 2 px piu' bassa delle vicine.
- Il pozzetto e' `relative`: e' l'ancora del posto del badge (§A.4).
- La voce-link (`Events`, `Check-in`, `Account`) resta **l'unico** `Link` con `isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE`.

### A.3 Stati della voce

| Stato | Chi | Etichetta + icona | Canale non cromatico | ARIA | Feedback al tocco |
|---|---|---|---|---|---|
| riposo | link, Management | `text-muted` | — | — | `active:scale-95 active:opacity-80` (invariato) |
| corrente | link sulla sua rotta; **Management quando `pathname` inizia con l'`href` di una voce del pannello** | `text-accent` | indicatore di 2 px (sotto in barra, a sinistra in colonna) | link: `aria-current="page"` · Management: nessun `aria-current` (e' un pulsante; la pagina corrente e' dichiarata dalla riga del pannello) | invariato |
| aperto (solo Management) | foglio aperto | `text-ink` | **l'icona cambia da `squares-2x2` a `x-mark`**: si vede come si chiude | `aria-expanded="true"`, `aria-controls` → id del foglio | invariato |
| aperto **e** corrente | foglio aperto dentro uno strumento | `text-accent` | `x-mark` + indicatore | `aria-expanded="true"` | invariato |
| focus | tutte | — | `FOCUS_RING` (`outline-2 outline-offset-2 outline-ink`, 41 §5.4) | — | — |
| **spenta (TASK)** | `organizer`, `staff`, `master` (D-52-03, D-52-24) | `text-faint` (3.54, §Color) | **pozzetto con bordo tratteggiato** `border-dashed border-faint` — nell'albero «tratteggiato» vuol dire *non finito* (`PieceDate.tsx:32`, `ScoreCell.tsx:60`, badge `staff` in `MemberTable.tsx:150`) | `<button type="button" aria-disabled="true">`, **nessun `onClick`**, nessun `href`, raggiungibile col Tab | **nessuno**: niente `active:scale`, niente hover, `cursor-default`. Un tocco non fa nulla e non deve sembrare che faccia qualcosa |

TASK spenta **porta `min-h-11` letterale** nella propria classe (e' un `button`
per il gate). Nessun tooltip, nessun `title`, nessuna pagina segnaposto, nessun
testo «Soon» (D-52-03).

### A.4 Il posto del badge (TASK-04, costruito nella 53)

La 52 **non disegna nessun elemento** nel posto del badge: niente `span` vuoto,
niente zero. Fissa solo la geometria, scritta in un commento accanto al pozzetto
di TASK, perche' la 53 la trovi invece di inventarla:

| Proprieta' | Valore |
|---|---|
| Ancora | il pozzetto dell'icona (`relative`) |
| Posizione | `absolute -top-1 start-[calc(100%-0.5rem)]` — sporge 8 px oltre il bordo destro del pozzetto, 4 px sopra |
| Altezza | `h-4` (16 px), `min-w-4`, `px-1`, `rounded-full` |
| Testo | `font-mono text-xs font-semibold` (cifre tabulari), due numeri separati da `·` (es. `3·1`) |
| Ingombro massimo | `12·12` ≈ 44 px: dal centro della voce arriva a ~+48 px, dentro la meta' di una voce da 90 px |
| Vincolo | `absolute`: **non cambia mai l'altezza della riga** (5 rem) ne' la larghezza della voce |
| Colore | deciso dalla 53, dentro la palette di 41; **non** `--accent` (non e' uno stato di navigazione) |

### A.5 La barra si nasconde al fuoco (D-52-06, D-52-28)

- **Meccanismo:** una regola in `globals.css`, dentro `@media (pointer: coarse)`, che mette `display: none` sulla barra quando `body:has(:is(input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=hidden]), textarea, select):focus)`. La barra porta `data-nav-form="phone"` o `"responsive"`; il form responsive si nasconde **solo sotto 48rem** (da `md:` in su e' la colonna, e farla sparire sposterebbe il contenuto).
- **Anche il foglio e il suo scrim** si nascondono con la stessa regola (un campo non puo' avere il fuoco dentro il foglio, che non ne contiene; e' una difesa, non un caso d'uso).
- **Movimento:** nessuno. Scompare e ricompare istantaneamente al blur. Un'animazione sulla barra mentre sale la tastiera sarebbe un secondo movimento sopra quello del sistema.
- `--nav-inset-block-end` **non si azzera**: la pagina tiene il suo padding e non salta mentre si scrive.
- Il login **non monta la barra**: questa regola non lo riguarda.

---

## §B — Il pannello Management (NAV-03, D-52-07..10, D-52-27)

### B.1 Contenuto e ordine

`visibleStaffTabs(capabilities)` + `Gallery` (se `gallery.view`) + `Account`,
**ordinati per etichetta** (`localeCompare(…, "en")`) al rendering. Per il
`master`, oggi:

`Account · Artists · Calendar · Formats · Gallery · Location · Manage events · Manifesto · Members · Newsletter · Venues · Visual`

Un ordine solo per foglio, lista in colonna e striscia appesa (D-52-27). Una
voce per riga, nessuna icona sulle righe, nessuna intestazione, nessun
separatore di gruppo: `Account` e `Gallery` non si distinguono dagli strumenti.

### B.2 Il foglio da telefono (D-52-07)

**Struttura nel DOM.** Foglio e scrim sono **fratelli** del `<nav>` della barra,
resi **subito dopo** di esso, **mai figli**: il `<nav>` porta
`[transform:translate3d(0,0,0)]`, e un elemento `fixed` dentro un antenato
trasformato si posiziona rispetto all'antenato, non al viewport — lo scrim
coprirebbe la barra e basta. Resi dopo, il Tab dal pulsante Management entra
direttamente nella prima riga.

| Parte | Classi / valore |
|---|---|
| Scrim | `fixed inset-x-0 top-0 bottom-[var(--nav-inset-block-end)] z-50 bg-black/80` — **non** `inset-0`; non e' un `button`, `aria-hidden="true"`, fuori dal tab order; un tocco chiude |
| Pannello | `<nav aria-label="Management" id="management-sheet">`, `fixed inset-x-0 bottom-[var(--nav-inset-block-end)] z-50 mx-auto max-w-lg rounded-t-2xl border-t border-line bg-surface py-2` |
| Altezza massima | `max-h-[calc(100dvh-var(--nav-inset-block-end)-4rem)] overflow-y-auto` — restano **sempre almeno 64 px di scrim** sopra il foglio da toccare per chiudere, anche con 12 righe su un telefono basso |
| Riga | `Link`, `relative flex min-h-11 items-center px-6 text-sm text-ink-2` + `FOCUS_RING`; `active:bg-raised` come feedback al tocco |
| Riga corrente | `text-accent` + indicatore `absolute inset-y-2 start-0 w-0.5 rounded-full bg-accent` + `aria-current="page"` |
| Maniglia, titolo, pulsante Close | **nessuno** (D-52-07). Senza maniglia non si promette il trascinamento, che non esiste |
| Form `phone` (la porta) | il foglio compare a **ogni larghezza** (niente `md:hidden`), come la barra; nel form `responsive` porta `md:hidden` |

**z-50, non `z-[45]`.** Il foglio fa parte della navigazione e sta sul suo
rango (41 §10): non si sovrappone alla barra (finisce dove comincia
`--nav-inset-block-end`), copre `StickyBuyBar` (`z-40`) e la striscia appesa
(`z-10`), resta sotto dialog (strato superiore) e toast (`z-[70]`). Nessun
rango nuovo.

**Apertura e chiusura.**

| Evento | Effetto |
|---|---|
| tocco su Management chiuso | apre; il fuoco **resta** sul pulsante (disclosure, non modale) |
| tocco su Management aperto | chiude |
| tocco sullo scrim | chiude, fuoco al pulsante |
| `Escape` | chiude, fuoco al pulsante |
| tocco su una riga | naviga **e chiude** (anche se la riga e' la pagina corrente: il `pathname` non cambia e da solo non chiuderebbe) |
| cambio di `pathname` | chiude (dentro `(work)` `AppNav` non si smonta: Pitfall 4) |
| tocco su un'altra voce di barra | naviga; il cambio di `pathname` chiude |
| campo con fuoco | foglio e scrim nascosti con la barra (§A.5) |

**Movimento.** Apertura: il pannello sale con una keyframe dichiarata in
`globals.css` — `translateY(1rem)` + `opacity: 0` → `0` + `1`, **160 ms
`ease-out`**; lo scrim entra in dissolvenza negli stessi 160 ms. Entrambi portano
`motion-reduce:animate-none` (41 §12: `MotionConfig` non copre le keyframe CSS).
**Chiusura: istantanea**, nessuna animazione d'uscita — chiudere non deve mai
ritardare il tocco successivo, e alla porta il tocco successivo e' un ospite.

### B.3 La lista in colonna (tablet e desktop, D-52-08)

Sostituisce la sezione «Work» e il suo `SectionHeading`: **una lista sola**.

| Parte | Classi / valore |
|---|---|
| Voce Management | `<button type="button" aria-expanded aria-controls="management-column">`, stessa forma delle altre voci di colonna (`flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm`, pozzetto dell'icona) + **`chevron-down` in coda** (`ms-auto h-4 w-4`) che ruota di 180° da aperta (`transition-transform duration-150 motion-reduce:transition-none`) |
| Lista | `<nav aria-label="Management" id="management-column">` **subito sotto** la voce, `flex flex-col gap-1`; chiusa = attributo **`hidden`** (fuori dal tab order e dall'albero di accessibilita' — non `CollapsibleSection`, che lascia i link nel tab order a opacita' zero, Pitfall 9) |
| Riga | `Link`, `relative flex min-h-11 items-center rounded-xl ps-16 pe-4 text-sm text-muted hover:text-ink` + `FOCUS_RING` |
| Riga corrente | `text-accent` + indicatore di 2 px al bordo iniziale (`absolute inset-y-1 start-0 w-0.5 rounded-full bg-accent`) + `aria-current="page"` |
| Stato iniziale | **aperta** se `pathname` inizia con l'`href` di una voce del pannello; **chiusa** altrove (Events, Check-in) |
| Entrando in una voce del pannello dopo averla chiusa | si **riapre** (effetto sul `pathname`); non si chiude **mai** da sola |
| Movimento | nessuno sull'apertura della lista: appare e scompare. Solo il chevron ruota |

`ps-16` (64 px) porta il testo delle righe a 4 px dall'etichetta
`Management` (che parte a 16 + 40 + 12 = 68 px) e 48 px dentro rispetto al
bordo delle voci di colonna: si legge come contenuto di quella voce.

**Il pozzetto dell'icona (§A.2) vale anche in colonna**, per tutte le voci:
le etichette di `Events`, `Check-in`, `TASK`, `Management` partono a 68 px invece
di 52. E' un cambiamento visibile su ogni pagina da tablet in su, ed e' il
prezzo di avere il bordo tratteggiato di TASK alla stessa quota delle vicine.

---

## §C — La striscia degli strumenti appesa (NAV-04, D-52-11)

| Proprieta' | Valore |
|---|---|
| Dove | `StaffNav` in forma striscia, dentro `(work)/layout.tsx`, **solo sotto `md`** (`md:hidden`, invariato) |
| Aggancio | `sticky top-0 z-10` — lo stesso rango della barra fissa della porta (`ScannerClient.tsx:2928`), nessun rango nuovo |
| Fondo | **`bg-ground` opaco**, non `bg-ground/80 backdrop-blur`: il blur su un elemento che scorre e' la causa documentata del difetto iOS in `AppNav.tsx` (2026-08-14) |
| Bordo | `border-b border-line` sempre acceso (non si puo' sapere senza JavaScript quando e' agganciata; da ferma e' un filetto che non disturba) |
| Padding | `py-2` (8 px) sopra e sotto i chip: altezza totale **60 px** (44 + 16) |
| Margine sotto | `mb-6` resta sulla striscia (24 px fra striscia e contenuto) |
| Chip | `Chip` invariato (`min-h-11`, `aria-current="page"`, `scrollMarginInline: 24px`), **in ordine alfabetico** come il pannello; la prima voce e' ora `Artists` o `Calendar`, non `Events` |
| Etichetta | `Manage events` (D-52-10) — il chip piu' largo della striscia |
| `viewportFit` | **non** si aggiunge `cover`: `top-0` finirebbe sotto la barra di stato in standalone |

---

## §D — La porta: cinque linguette (D-52-19..22, D-52-26)

### D.1 Geometria a 360 px

```
 px-6 │◄──────────────────── 312 px ────────────────────►│ px-6
      ┌──────────┬──────────┬──────────┬──────────┬──────────┐
      │ All 142  │ Out 97   │ In 45    │ Recent 5 │ ● Alerts 2│   min-h-11
      └──────────┴──────────┴──────────┴──────────┴──────────┘
         62.4 px ciascuna, nessun gap, nessun padding del pozzo
```

| Proprieta' | Valore |
|---|---|
| Contenitore | `grid grid-cols-5 overflow-hidden rounded-xl bg-surface`, `role="group" aria-label="Guest list view"`. **Niente `p-1`, niente `gap-1`**: oggi rubano 24 px e portano la linguetta da 62.4 a 57.6 px, cioe' sotto «Recent 5» |
| Linguetta | `button`, `relative flex min-h-11 flex-wrap items-center justify-center gap-x-1 px-1 text-xs font-semibold` + `FOCUS_RING`, `aria-pressed` |
| Contenuto | etichetta + conteggio **accanto** (D-52-26), **senza parentesi**: il conteggio e' separato dall'etichetta dal carattere (`font-mono`), non da due glifi in piu' che non ci stanno |
| Ingombro misurato | «Recent 5» ≈ 51 px + 8 di padding = 59 su 62.4. «All 142», «Out 142», «In 142» ≤ 50 |
| Sotto i 360 px | `flex-wrap`: se una linguetta non ci sta, **il conteggio va a capo sotto l'etichetta** dentro gli stessi 44 px (due righe da 16). Mai troncata, mai scorrimento orizzontale, mai un'etichetta che cambia |
| Posizioni | fisse per tutta la serata, sempre cinque, anche vuote (D-52-19, D-52-26) |
| Linguetta di default | `Out` (oggi `not_arrived`, invariato) |
| Debito | `setActiveFilter(tab.key)` compare **una volta**, porta `min-h-11`, e la sua riga esce da `DOOR_TARGET_DEBT` nello stesso commit (14 → 13) |

### D.2 Stati della linguetta

| Stato | Fondo | Etichetta | Conteggio | Canale non cromatico | ARIA |
|---|---|---|---|---|---|
| riposo | — (`bg-surface` del gruppo) | `text-muted` | `font-mono text-muted` | — | `aria-pressed="false"` |
| attiva | `bg-raised` | `text-ink` | `font-mono text-ink-2` | indicatore di 2 px sotto: `absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent` | `aria-pressed="true"` |
| Alerts con avvisi non visti | come sopra | come sopra | come sopra | **pallino** `h-2 w-2 rounded-full bg-sem-warn` prima dell'etichetta | nome accessibile «Alerts, 2, new» |
| Alerts a zero | come riposo/attiva | `Alerts` | **nessun numero** (D-52-19) | — | «Alerts» |

**Nomi accessibili completi.** Le etichette corte sono per l'occhio; ogni
linguetta porta un `aria-label` con il nome intero e il numero:
`All guests, 142` · `Not arrived, 97` · `Checked in, 45` · `Recent scans, 5` ·
`Alerts, 2` (piu' `, new` quando il pallino e' acceso).

**Evidenziare, non aprire (D-52-20).** Un avviso nuovo accende il pallino e
alza il conteggio; **`activeFilter` non cambia mai da solo**. Il pallino si
spegne quando si apre Alerts (le chiavi correnti diventano «viste»), e si
riaccende solo per una chiave nuova. Nessuna animazione del pallino (niente
`animate-pulse`: sulla porta pulsano gia' le pastiglie Pending e Offline, e un
terzo pulsare le renderebbe indistinguibili).

### D.3 Cosa sta dove

| Blocco | Posto |
|---|---|
| titolo, Online/Offline, «QR Scan» | barra fissa di 51-07, **invariata e non allungata** |
| pastiglie Offline / Pending (n) / Sign in again… e il loro pannello `failedEntries` | testata, sempre visibili (D-52-21) |
| **avviso guest list a radio spenta** («do not refuse them… let them in») | testata, **sopra la ricerca**, testo e forma invariati (WR-04) |
| «This night is over» + «Scan anyway» | fuori dalle linguette, dov'e' oggi (contiene un'azione della porta) |
| contatore, ricerca | invariati |
| linguette | subito sotto la ricerca, `mb-4` sotto |
| lista (All · Out · In) | subito sotto le linguette: **ricerca → linguette → lista contigue** (D-52-28) |
| **Recent** | la cronologia (ultimi 5, righe toccabili per annullare, conferma e ramo di supervisione invariati, D-52-22). L'intestazione «Recent scans» in `text-[10px]` **sparisce**: la linguetta e' gia' il titolo |
| **Alerts** | in quest'ordine: banda d'eta' con «tap to reload», esito del drenaggio (`blockedResult`), `cacheNotices`, deriva dell'orologio. Forme e colori degli avvisi invariati; `space-y-2` fra l'uno e l'altro. La banda **non** entra in `cacheNotices` |
| `cameraFault`, camera | sopra, dove sono oggi |

### D.4 Stati vuoti della porta

Forma: `px-6 py-8 text-center` (eccezione dichiarata in §Spacing), titolo
`text-base font-semibold text-ink`, corpo `text-sm text-muted` (6.78:1 su
`--surface`, 7.14 su `--ground`). **Nessun pulsante** negli stati vuoti: un
elemento interattivo nuovo nella porta dovrebbe pagare `min-h-11` e non ce n'e'
bisogno.

| Linguetta | Titolo | Corpo |
|---|---|---|
| Recent | `No scans yet` | `The last five check-ins appear here. Tap one to undo it.` |
| Alerts | `Nothing to report` | `List and queue warnings appear here and light up this tab.` |
| All / Out / In | invariati (i testi di oggi) | invariati |

---

## §E — Superfici senza contratto visivo nuovo

| Requisito | Cosa si vede | Contratto |
|---|---|---|
| NAV-02 / D-52-13 — `/gallery` senza `gallery.view` | **nessuna UI nuova**: il loggato riceve il 307 standard verso `/account`, l'anonimo va a `/login?next=/gallery`. Nessun 404, nessuna pagina di rifiuto, nessun messaggio | nessuno da disegnare |
| NAV-07 — immagini con URL firmati | la galleria appare **identica** a chi la puo' vedere | **un'immagine che non si carica non resta un rettangolo muto** (zero fallimenti silenziosi): la miniatura mostra, nel suo riquadro, `text-xs text-muted` «This image could not be loaded. Reload the page.» Il meccanismo (scadenza, rigenerazione) e' del piano NAV-07, non di questo documento |
| NAV-05 — la cifra `staff` in `MemberTable` | uno `span` con la **stessa forma esatta** delle altre tre cifre; perde hover, cursore e `min-h` del pulsante | la legenda staff si riscrive nello stesso piano della migration (ricerca §F.2) |
| NAV-06 — chip dei format | chip invariati nella forma; ordine dal catalogo (`sort_order`, poi nome); **con zero serate visibili la riga non si monta affatto** (niente «All» da solo) e lo stato vuoto della lista resta quello di `EventTabs` | nome e colore del chip **dal catalogo**, mai da `CardFormat` (puo' portare il nome di una serie, e una serie quello di una sede) |
| D-52-23 — viewport | nessuna differenza visiva voluta; `60vh` → `60dvh` in `EventTabs.tsx` | la prova su iPhone registra **separatamente**: barra nascosta, lista contigua alla ricerca, ricerca portata in cima al fuoco, ridimensionamento del viewport (**atteso assente** su Safari di oggi) |

**La ricerca della porta al fuoco** sale sotto la barra fissa
(`scrollIntoView({ block: "start" })` dopo l'evento di fuoco) con uno
`scroll-margin-top` pari all'altezza della barra fissa di 51-07, **misurata
sul telefono di laboratorio e scritta come gradino della scala** (es.
`scroll-mt-24`), con la misura citata nel commento. Nessuna lettura del viewport.

---

## Copywriting Contract

Tutto in inglese, come l'interfaccia. **Nessuna stringa di questa fase allude a
un suono o a un genere** (`sound-manifesto.md`), e il brand si scrive
`re:sonate` con la e normale se compare.

| Element | Copy |
|---------|------|
| Voci di barra | `Events` · `Check-in` · `TASK` · `Management` · `Account` (da `roles.ts`) |
| Voci del pannello | `Account` · `Artists` · `Calendar` · `Formats` · `Gallery` · `Location` · `Manage events` · `Manifesto` · `Members` · `Newsletter` · `Venues` · `Visual` |
| Rinomino | `/admin/events` si chiama **`Manage events`** nel pannello, nella lista in colonna e nella striscia (D-52-10); la voce di barra `Events` resta la pagina pubblica |
| Etichette ARIA | pannello e lista: `aria-label="Management"`; striscia: `aria-label="Work surfaces"` (invariata); gruppo linguette: `aria-label="Guest list view"` |
| Linguette (visibili) | `All` · `Out` · `In` · `Recent` · `Alerts`, numero accanto senza parentesi; Alerts senza numero a zero |
| Linguette (nome accessibile) | `All guests, n` · `Not arrived, n` · `Checked in, n` · `Recent scans, n` · `Alerts, n[, new]` |
| Primary CTA | **nessuna nuova.** Questa fase sposta e ordina voci, non introduce azioni |
| Empty state — Recent | `No scans yet` / `The last five check-ins appear here. Tap one to undo it.` |
| Empty state — Alerts | `Nothing to report` / `List and queue warnings appear here and light up this tab.` |
| Error state — immagine della galleria | `This image could not be loaded. Reload the page.` |
| Error state — rifiuto `/gallery` | nessun testo: redirect standard del middleware (D-52-13) |
| Avviso guest list | **invariato**, parola per parola (WR-04, 2026-09-23) |
| Destructive confirmation | **nessuna nuova.** L'annullamento alla porta conserva conferma e supervisione di oggi (D-52-22) |
| TASK spenta | **nessun testo**: niente tooltip, `title`, «Soon», «Coming soon» (D-52-03) |

---

## Accessibility Contract (in aggiunta a 41 §12)

- Ogni bersaglio nuovo: `min-h-11` letterale; nessuna eccezione nuova in `PRIMITIVE_RAW_ELEMENTS`.
- Stato corrente: colore **+** indicatore di 2 px **+** `aria-current="page"` sul link.
- Stato aperto: `aria-expanded` **+** icona che cambia (`x-mark` in barra, chevron ruotato in colonna).
- Stato spento: `aria-disabled="true"` **+** bordo tratteggiato **+** assenza di feedback al tocco.
- Avviso nuovo: pallino **+** conteggio **+** `, new` nel nome accessibile.
- Ordine del fuoco: la barra, poi (se aperto) il foglio; `Escape` chiude e riporta il fuoco a Management.
- Movimento: una sola animazione (entrata del foglio, 160 ms) e una rotazione (chevron, 150 ms), entrambe con `motion-reduce:`.
- Nessun `outline-none` senza sostituto; il fuoco e' sempre `FOCUS_RING`.

---

## Gate che questo contratto muove (da `52-RESEARCH.md` §A.4, §G)

| Gate | Effetto |
|---|---|
| `verify:touch-targets` | un solo `Link` col ternario `ENTRY_*`; ogni altro elemento nuovo con `min-h-11`; `DOOR_TARGET_DEBT` 14 → 13 (linguette). Le espressioni `requestReload("band")`, `handleUndoCheckIn(record)` restano identiche e compaiono una volta se si spostano nel ramo Recent/Alerts |
| `verify:dialogs` | nessun `inset-0`, nessun `<dialog>` nel foglio |
| `verify:no-viewport-read` | nessun `matchMedia` / `innerWidth` / `useSyncExternalStore`; nemmeno `visualViewport` senza decisione |
| `verify:conversion` A / E | colori solo da token, scrim `bg-black/80`; `PageShell.tsx` **non si tocca** in questa fase (digest) |
| `verify:scan-legibility` | `CONNECTIVITY_PILL` e le tinte della pastiglia offline non si spostano ne' si rinominano |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | nessuno — shadcn non inizializzato per decisione (D-40-01, D-41-20) | not applicable |
| third-party | nessuno | not applicable |

Nessun pacchetto installato; le icone sono SVG Heroicons (MIT) incollati come
quelli gia' presenti.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
