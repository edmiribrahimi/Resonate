# Phase 42: Scanner Conversion - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Lo scanner e' l'ultima superficie a prendere il sistema visivo, e prende
**colore, contrasto e tipo soltanto**. Il comportamento e' una superficie di
sicurezza e non si tocca: nessun cambio agli esiti, ai tempi, agli aptici, alla
coda offline, all'annullamento, alla torcia o al ritorno automatico.

Requisiti: **DS-04** (i colori di feedback restano saturi e inequivocabili, e il
colore non e' mai l'unico canale) e **RESP-05** (il mirino si centra invece di
stirarsi, e il comportamento non cambia per effetto del lavoro visivo).

**Perimetro dei file** — sono esattamente quelli oggi recintati da
`PHASE_42_PATHS` in `scripts/conversion-manifest.mjs:226-239`:

- `src/app/(admin)/**/scanner/**` — `ScannerClient.tsx` (3449 righe, **56
  utility di palette grezza**), `DoorSurface.tsx` (0), `page.tsx` (0)
- `src/components/scanner/**` — `ScanFlash.tsx` (3)
- `src/app/(admin)/door/**` — `page.tsx` (0)

Piu' `src/components/layout/MobileNav.tsx`, che questa fase cancella (D-42-03).

**Fuori perimetro:** ogni file non elencato sopra; qualunque modifica al
comportamento; qualunque ristrutturazione di `ScannerClient.tsx`.

</domain>

<decisions>
## Implementation Decisions

### I colori dei tre esiti — decisi su misura, non su convenzione

Il proprietario ha chiesto di guardare come funzionano le app dei concorrenti
(RA, Shotgun, DICE, Eventbrite, Xceed) e di prendere il meglio da ognuna. La
ricerca e' stata fatta il 2026-08-18 e ha prodotto un risultato che ribalta la
domanda: **la convenzione condivisa da tutti e cinque e' proprio la parte
misurabilmente rotta.**

**Cosa fanno i cinque**

| App | Accetta | Gia' scansionato | Rifiuta |
|---|---|---|---|
| Xceed | banner verde `CORRECT` | banner **giallo** *Ticket Already Scanned* | messaggio rosso |
| Shotgun | messaggio verde | dentro *invalid*, ma dice **quando e da chi** | **nero e rosso**, non un rosso pieno |
| RA | spunta verde accanto al nome | storico dello scan | *refunded / resold / cancelled* |
| DICE | — (dichiara *«works in almost any light»* e un backup mode senza rete) | | |
| ThunderTix | **schermo pieno verde** + suono | *Already Scanned* | avviso |

Tutti e cinque, di fatto, il semaforo verde/giallo/rosso.

**La misura.** Simulazione delle tre cecita' ai colori (Vienot-Brettel-Mollon
1999, applicata in sRGB lineare) sui colori reali del prodotto, distanza
**CIEDE2000**. Soglia pratica: sotto 10 = due schermi che una persona di fretta
puo' scambiare. Script in `scripts/verify-scan-legibility.mjs` (da scrivere in
questa fase — vedi D-42-05).

| Coppia | normale | deuteranopia | protanopia | tritanopia |
|---|---|---|---|---|
| accetta vs rifiuta (`green-500`/`red-500`, oggi) | 76,2 | 48,7 | **28,1** | 52,6 |
| rifiuta vs gia' registrato (`red-500`/`amber-500`, oggi) | 34,5 | **4,3** | 26,6 | **9,6** |
| accetta vs gia' registrato (`green-500`/`amber-500`, oggi) | 45,8 | 50,3 | **7,9** | 50,8 |
| gia' registrato vs pillola *Offline* (`amber-500`/`yellow-500`) | **9,9** | **2,0** | **4,4** | **3,9** |
| rifiuta se prendesse `--sem-crit` vs `--accent` | **4,0** | **0,6** | **7,3** | **0,5** |
| gia' registrato se prendesse `--sem-warn` vs accetta | 44,8 | 50,0 | **0,5** | 57,2 |

Luminanze relative: `green-500` 0,411 · `red-500` 0,229 · `amber-500` 0,439 ·
`yellow-500` 0,498 · `--sem-done` 0,265 · `--sem-crit` 0,337 · `--accent` 0,310.

### D-42-01 — Il flash e' un vocabolario di sicurezza, non superficie di brand: verde e rosso restano grezzi

`green-500` e `red-500` **non prendono i token**, e la deroga si dichiara nel
codice e nel gate invece di essere subita.

- **Accetta e rifiuta non sono rotti**: distanza minima **28,1** su tutte e
  quattro le simulazioni. Il consiglio generico *«non usare rosso-verde»* non si
  applica a queste due tinte, perche' hanno luminanze molto diverse (0,411
  contro 0,229) e la differenza sopravvive alla perdita di un canale.
- Il set semantico **non ha un colore di accettazione** e la fase 40 ha gia'
  deciso di non inventarne uno (`src/app/globals.css:169-173`: *«Phase 42
  inherits a semantic set with no accept colour, and the scanner keeps its
  current green unchanged»*). Questa decisione **estende la stessa regola al
  rosso**, per simmetria.
- Portare il rifiuto su `--sem-crit` lo metterebbe a **4,0** dal colore dei
  pulsanti primari (`--accent`), **0,6** in deuteranopia: un rifiuto dipinto
  della tinta che ovunque nel prodotto significa *premi qui*.

### D-42-02 — Il terzo stato lascia l'ambra e prende `--sem-done` (`#9B7BE0`)

`already_recorded` passa da `bg-amber-500/90` a `bg-sem-done/90`. **Qui si
rompe deliberatamente la convenzione dei cinque**, e il motivo e' misurato.

- **L'ambra e' rotta oggi, non dalla conversione**: a **4,3** dal rifiuto per un
  deuteranope, a **7,9** dall'accettazione per un protanope. E' schiacciata fra
  gli altri due.
- **Ed e' a 2,0 dalla pillola gialla dell'*Offline***. Il docblock di
  `ScanFlash.tsx:65-72` dichiara per iscritto di aver evitato quella collisione
  *scegliendo ambra invece di giallo*. **Non l'ha evitata**: 9,9 gia' a vista
  normale. Quel commento va corretto nello stesso commit che cambia il colore —
  e' un'affermazione falsa nel codice, non una nota di stile.
- **`--sem-done` e' l'unico candidato con ogni distanza sopra 10 in ogni
  simulazione** (peggiore 15,9). Alternative misurate e scartate: `--sem-warn`
  (0,5 dall'accettazione in protanopia), `--sem-info` (14,8, regge ma e' l'inchiostro
  terziario), `--violet` (17,2, regge ma **non ha utility esposta** — vedi sotto),
  `--violet-deep` (11,2, e non e' mai un primo piano, `globals.css`).
- **Non inventa nessun colore nuovo**, quindi non tocca la regola della fase 40
  per cui aggiungere un colore al vocabolario semantico e' del proprietario:
  `--sem-done` e' gia' dichiarato e gia' esposto come `--color-sem-done`
  (`globals.css:394`), gia' consumato da 22 file sotto `src/`.
- **Perche' `--sem-done` e non `--violet`**, che pure regge: `--violet` fa parte
  della scala sunset, **dichiarata ed esposta a nessuno** per decisione
  (`globals.css:185-196`), e `verify-tokens.mjs` check D pretende che un nome
  dichiarato senza utility abbia **zero consumatori** sotto `src/`. Usarlo
  richiederebbe di esporre un'utility, cioe' di riaprire una decisione della
  fase 36.
- **Conseguenza sull'inchiostro del glifo, da risolvere in piano:** la regola in
  `globals.css:176-178` dice *«A SEMANTIC USED AS A FILL CARRIES --ground AS ITS
  INK. Never --ink, never white»*. Il glifo oggi e' `text-white` per tutti e tre
  gli stati (`ScanFlash.tsx:35`, e ancora a 144, 150, 156). Bianco su `#9B7BE0` da' 3,33:1 — passa AA come
  grafica larga, non come testo. `--ground` su `#9B7BE0` da' ~5,5:1. Il piano
  deve scegliere, e la scelta cambia la simmetria dei tre stati.

### D-42-03 — `MobileNav.tsx` si cancella, ma la porta resta bloccata sulla forma telefono

`DoorSurface.tsx` monta **`AppNav` con `form="phone"` direttamente**, e
`src/components/layout/MobileNav.tsx` viene rimosso.

- Il wrapper ha **un solo consumatore rimasto** — `DoorSurface.tsx:4`,
  verificato su tutto `src/` — dopo che D-41.2-01 ha portato le altre dieci
  superfici alla forma responsive.
- Esiste solo perche' precedeva la prop `form` di `AppNav`
  (`AppNav.tsx:89-94`). Passare `form="phone"` fa la stessa identica cosa con un
  livello in meno.
- **La porta NON prende la colonna da 224px.** E' la ragione per cui il wrapper
  fu creato (D-41-21), e vale ancora: quello schermo si legge a un ingresso, con
  una mano, al buio, con una fila davanti.
- **Il gate si sposta nello stesso commit.**
  `scripts/verify-conversion.mjs:2839` dichiara
  `PHONE_LOCKED_NAV_WRAPPER = 'src/components/layout/MobileNav.tsx'` e i
  docblock alle righe 1110-1123 e 2723-2726 lo descrivono. E' la regola che il
  repo si e' gia' dato: *«either the surface moved and this entry moves with it
  in the same commit, or the entry is a claim about a file that does not
  exist»*.

### D-42-04 — Linea di base meccanica prima della conversione; una sola serata

**Il criterio 3 come e' scritto nel roadmap non e' soddisfacibile alla lettera,
e questo va dichiarato invece di farlo passare.** Dice *«verified by running the
door pass again on a device»*, ma **non esiste una prima esecuzione**:
`39-VERIFICATION.md` e' `human_needed`, e `39-DOOR-PASS.md` §8 e' rimandato per
progetto alla serata di fine v1.5 (D-39-07), insieme al lotto della fase 38.

Come si chiude davvero:

1. **Prima della conversione**, un reperto meccanico datato sul codice attuale:
   i tre `delay` di `FLASH_STATES`, la sequenza degli aptici per esito, la forma
   della coda offline, i tre esiti su entrambe le strade (rete accesa e spenta),
   il manifest delle route. Committato come evidenza.
2. **Dopo la conversione**, lo stesso reperto rifatto e confrontato riga per
   riga. Una differenza e' un difetto della conversione, non un dettaglio.
3. **La serata di fine v1.5 esegue UN door pass**, sul codice convertito, e
   chiude in un colpo il lotto di 38, 39 e la meta' umana della 42. Il criterio 3
   si chiude come *reperto meccanico invariato + door pass sul convertito*, e
   il VERIFICATION lo scrive in quei termini.
4. **Si spedisce in un giorno senza serata e la prima richiesta la fa chi
   spedisce** — regola §0.6 di `39-DOOR-PASS.md`, gia' scritta e gia' pagata.

Non c'e' conflitto con il lotto 38/39: quelle procedure misurano realtime e
offline, e questa fase non tocca il comportamento.

### D-42-05 — Il gate della leggibilita' e' uno script, non un'opinione

La misura sopra non e' un ragionamento di questa conversazione: diventa
`scripts/verify-scan-legibility.mjs`, che rilegge i colori **dai file sorgente**
e rifiuta se una qualunque coppia fra i tre esiti — piu' la pillola *Offline* —
scende sotto la soglia in una qualunque delle tre simulazioni. Motivi:

- In un repo senza test runner l'unica prova che esistera' e' quella scritta.
- Il difetto che questa fase ripara **era gia' in produzione e nessuno lo
  vedeva**, con un commento accanto che dichiarava il contrario. Un gate lo
  rende impossibile da reintrodurre.
- Va provato **per mutazione** prima di essere creduto (`ai-engineering.md`,
  gate prova per mutazione): si rimette l'ambra, si verifica che scatti, si
  ripristina — e si asserisce che la mutazione sia stata applicata.

### D-42-06 — DEF-45-01 e' un prerequisito, non un fastidio ereditato

**`npm run verify:conversion` oggi esce 2 con *«Nothing was measured»***,
verificato il 2026-08-18. La lista `CONVERTED` nomina quattro pagine
Finance/Analytics che non sono piu' su disco (`/admin/analytics`,
`/admin/analytics/compare`, `/admin/analytics/members`, `/admin/finance`),
rimosse per decisione dichiarata. Lo stesso vale per `verify:touch-targets`, che
legge la stessa lista.

**Conseguenza diretta su questa fase:** il gate che dovrebbe provare la
conversione della porta **non misura nulla**, quindi la fase 42 non puo'
chiudere il proprio criterio con esso finche' resta cosi'. La rimozione delle
quattro voci sta in **wave 0**, prima di qualunque conversione, ed e' la
riparazione che DEF-45-01 gia' descrive: *«la riparazione e' la rimozione delle
quattro voci dalla lista CONVERTED, non un allargamento del matcher»*.

### D-42-07 — Il recinto si apre, non si aggira

`PHASE_42_PATHS` e' il recinto che ha tenuto la porta fuori dalle fasi 41.x. E'
**questa** la fase che lo rimuove, e i tre percorsi entrano in `CONVERTED` come
superfici dichiarate — con la loro larghezza — nello stesso commit in cui il
recinto sparisce. Tre consumatori leggono quella lista e vanno aggiornati
insieme: `verify-conversion.mjs`, `verify-dialogs.mjs`, `verify-touch-targets.mjs`.

### Claude's Discretion

Il proprietario ha dichiarato il 2026-08-18: *«expert persona agisce in autonomia
su argomenti tecnico informatico, fermami solo per dubbi veri»*. Restano quindi
all'esperto, senza checkpoint: la larghezza esatta a cui il mirino si ferma e
cosa gli sta intorno (criterio 2 / RESP-05), l'inchiostro del glifo sul terzo
stato, l'ordine delle onde, la forma del reperto meccanico, la soglia numerica
del gate di leggibilita'.

**Torna al proprietario solo:** un colore **nuovo** nel vocabolario del brand
(nessuno e' previsto), un cambio di comportamento alla porta, o la decisione di
spedire in una settimana con una serata.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Il perimetro e i gate che lo tengono
- `scripts/conversion-manifest.mjs` §`PHASE_42_PATHS` (righe 202-239) — il recinto che questa fase rimuove, e la ragione per cui esiste
- `scripts/verify-conversion.mjs` — il gate della conversione; righe 1110-1123 e 2723-2726 e 2839 descrivono `MobileNav` per nome, riga 2904 stampa l'esclusione della fase 42
- `scripts/verify-tokens.mjs` check D — un nome dichiarato senza utility deve avere zero consumatori sotto `src/`
- `scripts/verify-touch-targets.mjs`, `scripts/verify-dialogs.mjs` — gli altri due consumatori di `PHASE_42_PATHS`
- `.planning/phases/45-production-sections-section-by-section/deferred-items.md` §DEF-45-01 — perche' due gate su diciassette non misurano nulla oggi

### I colori, e chi li ha decisi prima
- `src/app/globals.css:145-183` — il set semantico, la regola *fill porta `--ground` come inchiostro*, e la frase che vincola questa fase: **il set non contiene verde e la fase 40 non ne inventa uno**
- `src/app/globals.css:185-197` — la scala sunset e' dichiarata ed esposta a nessuno, deliberatamente
- `.planning/phases/40-brand-tokens-typography/40-02-SUMMARY.md:190` — *«Phase 42 inherits… no accept colour»*
- `src/components/scanner/ScanFlash.tsx:1-80` — i tre stati e i quattro canali; il commento alle righe **65-72** dichiara di aver evitato la collisione ambra/giallo, **e la misura lo smentisce**

### La porta, e perche' non e' una superficie come le altre
- `.claude/rules/checkin-offline.md` — i gate del dominio; si carica su `scanner/**`, ed e' la ragione per cui `DoorSurface.tsx` non si sposta da li'
- `.planning/phases/39-the-door-s-own-address/39-DOOR-PASS.md` §0.6 e §8 — la regola di deploy e la stanza buia
- `.planning/phases/39-the-door-s-own-address/39-VERIFICATION.md` — `human_needed`: perche' non esiste un *prima*
- `.planning/phases/41.2-public-member-and-money-surfaces/41.2-CONTEXT.md` §D-41.2-01 — perche' `MobileNav` e' rimasto con un solo consumatore
- `src/components/layout/AppNav.tsx:89-94` — la prop `form`, che rende il wrapper superfluo

### Il metodo di misura
- Vienot, Brettel & Mollon (1999) — simulazione dicromatica applicata in sRGB lineare
- CIE, CIEDE2000 — distanza percettiva; soglia pratica sotto 10 per due schermi confondibili di sfuggita
- Concorrenti consultati il 2026-08-18: `support-pro.shotgun.live` (guida Shotgun Scan), `support.ra.co/article/270`, `support.xceed.me/en/articles/9172610`, `eventbrite.com/help/…/741083`, `apps.apple.com/us/app/dice-access/id1461778861`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`AppNav` con `form="phone"`** — rende `MobileNav` superfluo senza cambiare cio' che la porta mostra (D-42-03)
- **`--sem-done` / `bg-sem-done`** — token gia' dichiarato, gia' esposto, gia' consumato da 22 file sotto `src/`: il terzo stato non inventa nulla
- **`ScanFlash.FLASH_STATES`** — una sola tabella di lookup governa colore, durata e glifo dei tre stati. Il cambio di D-42-02 e' **una riga**, e il file lo dice: *«One lookup, and the only place any of this changes»*

### Established Patterns
- **Il colore non e' mai l'unico canale, ed e' gia' vero**: colore, glifo, permanenza e vibrazione. La seconda meta' di DS-04 e' soddisfatta prima che questa fase cominci; il piano lo verifica, non lo costruisce
- **La prop e' semantica, mai visiva**: `ScanFlash` non ha `variant`, non ha `className`, non ha prop di colore — deliberatamente, *«a style escape hatch here would have to be unpicked there, one call site at a time»*. Non introdurne uno
- **Un semantico usato come riempimento porta `--ground` come inchiostro**, mai `--ink`, mai bianco (`globals.css:176-178`)

### Integration Points
- `DoorSurface.tsx` e' montato da **due** pagine — `/admin/scanner` e `/door` — e la guardia vive li' perche' non possa divergere. Il cambio di navigazione si fa in quel file solo, e serve entrambe
- `ScannerClient.tsx` e' **3449 righe** e possiede la coda offline, la torcia, il ritorno automatico e i contatori. **56 utility di palette grezza** dentro, fra cui `bg-yellow-500` dieci volte per la pillola *Offline*. Nessuna ristrutturazione: la conversione e' meccanica e in loco
- La tipografia dello scanner e' **ereditata** — nessun `font-display`/`font-sans`/`font-mono` dichiarato nel file, solo 22 pesi. I contatori alla porta sono cifre che si confrontano: il piano valuti `tabular-nums`, che e' tipografia e non comportamento

</code_context>

<specifics>
## Specific Ideas

**Cosa si prende dai concorrenti, esplicitamente**

- **Da ThunderTix e Shotgun — lo schermo pieno.** Xceed usa un banner; a distanza di braccio, al buio, il pieno schermo vince. Il nostro e' gia' pieno: si conferma, non si cambia.
- **Da Xceed — lo stato scritto a parole.** *Ticket Already Scanned* e' testo, non solo colore. `ScanFlash` ha gia' `title` e `subtitle`: il piano verifica che il terzo stato sia nominato in parole e non solo dipinto.
- **Da Shotgun e RA — il rifiuto e il gia'-registrato nominano la causa** (rivenduto, trasferito, rimborsato, e *quando e da chi*). Il prodotto ha gia' la classificazione (`src/lib/door/classify.ts`, `outcome.ts`) e la fase 31 ha costruito la lista di revisione: qui si verifica che arrivi allo schermo, non si costruisce.
- **Da DICE — *«works in almost any light»*.** E' una promessa di luminosita', ed e' comportamento: **fuori da questa fase**, vedi Deferred.
- **Da Shotgun — il rifiuto su nero, non su rosso pieno.** Ridurrebbe l'abbagliamento al buio. Misurabile, ma abbassa la luminanza del segnale (`red-500` e' gia' il piu' scuro dei tre a 0,229) e non e' necessario: **non adottato ora**, registrato in Deferred con la sua misura.

**Il commento che va corretto.** `ScanFlash.tsx:65-72` afferma di aver evitato la
collisione con la pillola *Offline* scegliendo ambra invece di giallo. La misura
dice 9,9 a vista normale e 2,0 in deuteranopia. Quel paragrafo si riscrive nello
stesso commit del colore: e' un'affermazione falsa nel codice, ed e' esattamente
il tipo di frase che il prossimo lettore crede.

</specifics>

<deferred>
## Deferred Ideas

- **Forzare la luminosita' dello schermo durante la scansione** — la promessa di
  DICE (*works in almost any light*). E' comportamento, non colore: fuori da
  DS-04 e fuori da questa fase. Vale una voce di roadmap a se'.
- **Il rifiuto su fondo scuro invece che rosso pieno** (modello Shotgun). Ridurrebbe
  l'abbagliamento a un ingresso al buio; cambia la luminanza del segnale e va
  misurato prima, non deciso a occhio.
- **Un suono per esito** — ThunderTix ne ha uno. Alla porta di una serata il suono
  e' inutile per costruzione (il volume in sala), ma vale registrarlo come
  considerato e scartato per una ragione, non dimenticato.
- **`tabular-nums` sui contatori** — se il piano lo giudica fuori dal perimetro
  *colore, contrasto e tipo*, va detto e rimandato invece che fatto di straforo.
- **DS-05 sullo scanner** (una tipografia per display, dati e interfaccia) non e'
  fra i requisiti di questa fase: solo DS-04 e RESP-05. Se la conversione lo
  tocca, e' scope creep.

### Reviewed Todos (not folded)

`gsd-sdk query todo.match-phase 42` ha restituito tre voci con punteggio 0,4-0,6
— `module-load-throws-500-the-whole-middleware-surface`,
`profiles-email-not-unique`, `form-untick-venue-secret-leaves-no-trace`. **Nessuna
e' folded:** tutte e tre hanno corrisposto su parole generiche (*phase*, *fase*,
*non*, *rule*), nessuna riguarda lo scanner, la porta o il sistema visivo.

</deferred>

---

*Phase: 42-scanner-conversion*
*Context gathered: 2026-08-18*
