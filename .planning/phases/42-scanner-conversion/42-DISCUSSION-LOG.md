# Phase 42: Scanner Conversion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-18
**Phase:** 42-scanner-conversion
**Areas discussed:** i colori dei tre esiti · la navigazione alla porta · il perimetro dentro le 3449 righe · la prova che il comportamento e' invariato

---

## Come e' andata la discussione, prima delle aree

Sono state proposte quattro aree grigie. Il proprietario ha risposto **due volte
riportando la delega all'esperto**, ed entrambe le risposte hanno cambiato il
modo di lavorare, non solo il contenuto:

1. *«expert persona decide basandosi su ricerca approfondita. non vedo cosa
   c'entra il colore di SunSet nella domanda 1, il checkin, compresi i colori
   dei funzionamento e i flash dovrebbero funzionare come sulle app dei
   concorrenti (ra, shotgun, dice, eventbrite, xceed) prendiamo il meglio da
   ognuno.»*

   **Correzione accolta, ed era giusta.** La domanda 1 era stata inquadrata
   citando la collisione fra `--sem-warn` e l'ambra identificativa di SunSet.
   Quel gate viene da `brand-visual-system.md` e riguarda **i materiali**, dove
   un segno ambra puo' essere letto come identita' di format. **Uno schermo
   pieno alla porta non e' un materiale**: nessuno legge l'identita' di un
   format da un flash di 2,5 secondi. La collisione reale dentro lo scanner e'
   un'altra — ambra contro la pillola gialla dell'*Offline* — ed e' quella che
   la misura ha poi confermato rotta.

2. *«expertpersona agisce in autonomia su argomenti tecnico informatico. fermami
   solo per dubbi veri»* — in risposta alla domanda sulla linea di base del
   door pass.

**Conseguenza operativa:** nessuna delle quattro aree e' stata chiusa da una
scelta del proprietario. Tutte e quattro sono state chiuse dall'esperto, su
ricerca e su misura, e la delega e' registrata in CONTEXT sotto *Claude's
Discretion* con il perimetro di cio' che torna comunque al proprietario.

---

## Area 1 — I colori dei tre esiti

**Metodo richiesto dal proprietario:** guardare RA, Shotgun, DICE, Eventbrite e
Xceed, e prendere il meglio da ognuna.

**Cosa la ricerca ha trovato.** Tutte e cinque, di fatto, il semaforo:
verde = valido, giallo = gia' scansionato, rosso = non valido. Xceed lo dichiara
esplicitamente (banner verde `CORRECT`, banner giallo *Ticket Already Scanned*,
messaggio rosso); Shotgun usa verde contro **nero e rosso**; ThunderTix lo
schermo pieno verde con un suono; RA una spunta verde con lo storico.

**Cosa la misura ha trovato.** Simulazione Vienot-Brettel-Mollon 1999 in sRGB
lineare + distanza CIEDE2000 sui colori reali del prodotto:

| Coppia | normale | deuteranopia | protanopia | tritanopia |
|---|---|---|---|---|
| accetta vs rifiuta (oggi) | 76,2 | 48,7 | 28,1 | 52,6 |
| rifiuta vs gia' registrato (oggi) | 34,5 | **4,3** | 26,6 | **9,6** |
| accetta vs gia' registrato (oggi) | 45,8 | 50,3 | **7,9** | 50,8 |
| gia' registrato vs pillola *Offline* | **9,9** | **2,0** | **4,4** | **3,9** |
| rifiuta con `--sem-crit` vs `--accent` | **4,0** | **0,6** | **7,3** | **0,5** |
| gia' registrato con `--sem-warn` vs accetta | 44,8 | 50,0 | **0,5** | 57,2 |

| Opzione | Descrizione | Scelta |
|---|---|---|
| Tutti e tre ai token del brand | Coerenza visiva piena | |
| Tutti e tre restano grezzi | Nessun cambiamento | |
| **Verde e rosso grezzi, terzo stato su `--sem-done`** | La coppia che regge non si tocca; quella rotta si ripara | ✓ |
| Il semaforo dei concorrenti, replicato | Convenzione nota alla porta | |

**Esito:** D-42-01 e D-42-02. Si adotta il pieno schermo (ThunderTix, Shotgun) e
lo stato scritto a parole (Xceed), e **si rompe deliberatamente la convenzione
dei cinque sul terzo stato**, perche' e' la parte misurabilmente fragile.

**Reperto collaterale, e non era cercato:** il commento a
`ScanFlash.tsx:65-72` dichiara di aver evitato la collisione con la pillola
*Offline* scegliendo ambra invece di giallo. Non l'ha evitata — 9,9 gia' a vista
normale, 2,0 in deuteranopia. E' un'affermazione falsa dentro il codice, e va
corretta nello stesso commit del colore.

---

## Area 2 — La navigazione alla porta

| Opzione | Descrizione | Scelta |
|---|---|---|
| `MobileNav` resta com'e' | Nessun rischio, ma il docblock che ne annuncia la morte resta falso | |
| Si cancella e la porta prende la forma responsive | Colonna da 224px a un ingresso | |
| **Si cancella, e `DoorSurface` monta `AppNav form="phone"`** | Il file sparisce, la porta resta identica | ✓ |

**Esito:** D-42-03. Il wrapper ha un solo consumatore rimasto ed esiste solo
perche' precedeva la prop `form` di `AppNav`. Il gate che lo nomina per path
(`verify-conversion.mjs:2839`) si sposta nello stesso commit.

---

## Area 3 — Il perimetro dentro le 3449 righe

**Esito:** conversione **meccanica e in loco**, nessuna ristrutturazione di
`ScannerClient.tsx`. Il file possiede la coda offline, la torcia, il ritorno
automatico e i contatori: un refactoring dentro una fase che dichiara di non
toccare il comportamento e' il modo tipico in cui il comportamento cambia.

Scoperto durante l'analisi: **`npm run verify:conversion` esce 2 con *«Nothing
was measured»*** per le quattro voci Finance/Analytics di DEF-45-01. Il gate che
dovrebbe provare questa conversione oggi non misura nulla — quindi la
riparazione entra in wave 0 (D-42-06).

---

## Area 4 — La prova che il comportamento e' invariato

| Opzione | Descrizione | Scelta |
|---|---|---|
| Door pass sul non convertito, poi conversione | Una serata di ritardo, confronto pieno | |
| Conversione subito, un solo pass dopo | Nessun confronto, criterio da riscrivere | |
| **Reperto meccanico prima, un solo door pass dopo** | Copre la classe di difetti che questa fase puo' introdurre, senza una serata in piu' | ✓ |
| Congelare la fase | Rimanda tutto al lotto umano | |

**Esito:** D-42-04. Il criterio 3 del roadmap **non e' soddisfacibile alla
lettera** — chiede di *rieseguire* un door pass che non e' mai stato eseguito — e
questo si dichiara invece di farlo passare.

---

## Claude's Discretion

Delega dichiarata dal proprietario il 2026-08-18: *«agisce in autonomia su
argomenti tecnico informatico, fermami solo per dubbi veri»*. Restano
all'esperto: larghezza di arresto del mirino, inchiostro del glifo sul terzo
stato, ordine delle onde, forma del reperto meccanico, soglia del gate di
leggibilita'.

Tornano al proprietario: un colore **nuovo** nel vocabolario del brand, un
cambio di comportamento alla porta, la decisione di spedire in una settimana con
una serata.

## Deferred Ideas

- Forzare la luminosita' dello schermo durante la scansione (promessa di DICE) — e' comportamento
- Il rifiuto su fondo scuro invece che rosso pieno (modello Shotgun) — misurabile, non necessario ora
- Un suono per esito (ThunderTix) — considerato e scartato: alla porta il volume in sala lo annulla
- `tabular-nums` sui contatori — se fuori perimetro, va detto e rimandato
- DS-05 sullo scanner — non e' fra i requisiti di questa fase
