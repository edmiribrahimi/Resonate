# Phase 36 — La sorgente visiva, distillata dal tracker di produzione

**Letto:** 2026-08-10 — artifact `re:sonate — Production`, sezione *Visual
System*, piu' il suo foglio di stile.
**Perche' esiste questo file:** l'artifact **non e' e non deve diventare parte
del repo** (Guardrail 5 — il repository e' pubblico, l'artifact contiene sedi in
trattativa, date e line-up). Qui sta solo cio' che e' **gia' pubblico o gia'
committato**, e i **criteri**, mai il materiale.

---

## Il fatto che cambia l'approccio

**Il tracker di produzione non e' un moodboard: e' gia' un design system
implementato.** Il suo foglio di stile dichiara un set di token completo — fondi,
inchiostri, linee, una scala di accenti, **un colore per format**, e semantici
tenuti separati dal brand. Non c'e' niente da inventare per la fase 36: c'e' da
**adottare**.

Il set e' scritto per uno strumento interno, non per il prodotto. La differenza
governa cosa passa e cosa no — vedi *Cosa NON attraversa*.

## La distinzione che risolve la questione del colore

L'artifact tiene separate due cose che a parole si chiamano entrambe "colore":

| | Cos'e' | MotionLab ce l'ha? |
|---|---|---|
| **Colore di identificazione** | Il colore con cui un format si **riconosce** in uno strumento: il pallino su un chip, la sottolineatura di una scheda, il punto su una riga di calendario | **Si'** — assegnato |
| **Palette dei materiali** | Come si vede una **locandina** di quel format: fondo, gradiente, tipografia, costruzione | **No** — dichiarata *«palette da definire»*, e *«il tramonto resta a SunSet»* |

**E' esattamente DS-02** della fase 40: *«Format colours appear only where a
format is identified, and semantic colours are separate from brand colours.»*

**Conseguenza per la fase 36:** il colore che il catalogo dei format memorizza e'
il **colore di identificazione**, ed **esiste gia' per tutti e quattro**. La
decisione D-36-11 (*colore obbligatorio, con un neutro fra le scelte*) non e' piu'
in tensione con `brand-visual-system.md`: quel gate parla della palette dei
materiali, e questa fase non la tocca.

## I token, come sono dichiarati oggi

### Fondi e inchiostri

| Ruolo | Valore |
|---|---|
| ground | `#0A0712` |
| surface | `#140D20` |
| raised | `#1D1430` |
| sunk | `#0D0917` |
| ink | `#F3ECFA` |
| ink-2 | `#D6CBE8` |
| muted | `#A493C0` |
| faint | `#6E6188` |
| line / line-soft / line-strong | `rgba(234,217,255, .13 / .07 / .26)` |

### La scala tramonto — *«l'ordine delle tinte segue l'arco della serata»*

`amber #FFB25E` · `orange #FF7A2F` · `pink #FF5C93` · `pink-soft #F6B6D2` ·
`violet #A874E8` · `violet-deep #5B2A9E` · `grey #8C82A6`

Le prime sei sono **le stesse sei** gia' committate in
`.claude/rules/brand-visual-system.md`. Nulla di nuovo diventa pubblico qui.

### Il colore di identificazione, format per format

| Format | Token | Valore |
|---|---|---|
| SunSet | `--snst` → amber | `#FFB25E` |
| RamaDub | `--rmdb` → orange | `#FF7A2F` |
| MotionLab | `--mtnlb` → pink | `#FF5C93` |
| Resonate | `--rsnt` → violet | `#A874E8` |

Esiste un quinto token, `--soy`, mappato su `grey #8C82A6`. **Non sono riuscito a
determinarne il significato dal solo foglio di stile** e non lo deduco: va
chiesto prima di usarlo. Il grigio e' comunque il candidato naturale per il
**neutro** che D-36-11 richiede fra le scelte.

### Semantici — **separati** dal brand

`crit #FF6B8E` · `warn #FFB25E` · `info #A493C0` · `done #9B7BE0`

Il fatto che siano dichiarati in un blocco a parte, e non riusati dagli accenti
di format, e' la meta' di DS-02 che si perde piu' facilmente.

### Il gradiente

`linear-gradient(94deg, #FFB25E 0%, #FF7A2F 30%, #FF5C93 62%, #A874E8 100%)`

**Firma esclusiva di SunSet.** L'artifact lo ripete due volte con parole diverse
— *«il colore non si eredita»*, *«il tramonto resta a SunSet»* — e mostra il
wireframe di un format senza palette **deliberatamente neutro**, con la
motivazione scritta accanto: *dichiara il vuoto invece di riempirlo con il
gradiente di SunSet*.

### Tipografia dell'**interfaccia**

- **mono** — `SF Mono` / `JetBrains Mono` / `IBM Plex Mono` / Menlo / Consolas:
  etichette, sigle, orari, numeri, tutto cio' che e' maiuscolo con
  `letter-spacing` largo
- **sans** — `Avenir Next` / Helvetica Neue / system-ui: prosa e titoli
- I numeri portano `font-variant-numeric: tabular-nums` **ovunque** — date,
  progressivi, conteggi

E' gia' la forma di DS-05: *display, dati e interfaccia hanno ciascuno un
carattere, e le cifre si allineano in colonna*.

### Il tema

`:root { color-scheme: dark }` e `:root[data-theme="light"] { color-scheme: dark }`
— **niente tema chiaro, per scelta dichiarata**: *«commit deliberato al mondo
notturno»*. Non e' un'omissione da colmare.

### Il wordmark

Composto `re:` + `sonate`, in mono, con la seconda meta' in peso 600. E porta una
regola esplicita: `text-transform: none !important` — **il wordmark non si
maiuscola mai**, nemmeno dentro un blocco che maiuscola tutto il resto. E' DS-06
in una riga di CSS.

---

## Il precedente diretto: la riga di chip esiste gia'

Il calendario dell'artifact **ha gia' la riga di filtri per format** che la fase
36 deve costruire, ed e' costruita cosi':

- un chip per format, `border-radius: 999px`, bordo sottile
- dentro il chip un **quadratino di colore** del format, `opacity .4` quando il
  chip e' spento e `1` quando e' acceso
- lo stato e' `aria-pressed`, non una classe: **premuto, non selezionato**
- acceso: inchiostro pieno, bordo `line-strong`, fondo `raised`
- la scheda attiva prende la **sottolineatura del colore del format**

**Da adottare cosi' com'e'.** E' gia' provata su uno strumento che usi ogni
giorno, ed e' gia' coerente col resto.

**Con una sola differenza, che e' il cuore della fase.** I chip dell'artifact
portano **un conteggio** (`.fchip .n`). Il prodotto **non deve portarlo**
(D-36-14). Non e' un'incoerenza: l'artifact e' uno strumento interno dove il
conteggio e' informazione utile; `/events` e' una superficie pubblica dove il
conteggio e' un canale che rivela senza mostrare. **Stesso componente, regola
opposta, perche' cambia chi guarda.**

---

## Cosa NON attraversa

**Regole che valgono solo per i materiali** — non hanno un equivalente in
un'interfaccia e non vanno tradotte a forza:

- zona grid-safe, taglio nella griglia del profilo, copertina dell'evidenza
- la costruzione a scrim (foto a tutto campo + due fasce in gradiente)
- l'ordine di pubblicazione e la sua inversione nel grid
- i formati di consegna (1080×1920, 4:5, 2000×2000)
- **Anton** e **Space Mono** — sono i caratteri delle **locandine**, non
  dell'interfaccia, che usa mono + Avenir Next. Confonderli e' l'errore piu'
  facile di tutta questa lettura.

**Contenuto che non puo' entrare in `.planning/` in nessun caso** (Guardrail 5 —
il repository e' pubblico): i mockup dell'artifact contengono **nomi di sede,
line-up con nomi propri e date**. Non sono stati riportati qui, non vanno
riportati nell'UI-SPEC, e non vanno chiesti a un agente di riprodurre.

---

## Le domande che l'artifact tiene aperte, e che la fase 36 non deve chiudere per sbaglio

- **Che cosa suona** RamaDub, MotionLab, Resonate — non e' scritto, e *«la
  grafica non puo' alludervi»*. Nessuna etichetta, nessun aggettivo, nessun
  ordinamento che suggerisca un genere.
- **Il giorno di MotionLab** e' un segnaposto, non un fatto. Ogni superficie che
  lo dichiara e' provvisoria.
- **La palette dei materiali** di RamaDub e MotionLab — da disegnare. Il
  colore di identificazione **non e'** quella palette e non la anticipa.
- **Il progressivo di MotionLab** era aperto nell'artifact (*«unico per MotionLab
  o si aggancia alla sede?»*). **D-36-07 lo ha chiuso: riparte a ogni sede.**
  L'artifact va aggiornato — e' la stessa correzione dovuta a
  `production-calendar.md`.

---

*Distillato il 2026-08-10 da `re:sonate — Production`. I criteri stanno qui; il
materiale resta nell'artifact, dove il repository pubblico non lo raggiunge.*
