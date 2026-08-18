# 42-06 — La lettura del cancello d'ordine, prima di convertire

**Piano:** 42-06 · **Onda:** 3 · **Data:** 2026-08-18
**Cosa e':** il Task 1 del piano 42-06 e' un `checkpoint:human-verify` bloccante.
Non produce codice: **legge** lo stato della riga 3m di `42-PROCEDURES.md` e lo
riporta alla lettera. Questo file e' quella lettura, scritta invece che evocata.

**Cosa NON e':** non e' un'osservazione della riga 3m, non la sostituisce e non
la chiude. La riga 3m resta `pending` e questo documento non la tocca.

---

## 1. Le righe, lette alla lettera

| Riga | Cosa misura | `Result:` alla lettera |
|---|---|---|
| **3m** | il door pass sullo scanner **NON convertito** | `pending — e non e' piu' riempibile. Vedi la deroga qui sopra: la riga non e' stata eseguita finche' lo scanner era non convertito, e da quel momento non ha piu' un oggetto da misurare.` |
| **3o** | l'aptica sentita, i tre esiti distinti al tatto | `pending` |
| **3p** | la coda offline sopravvive a chiusura app e riavvio | `pending` |
| **3q** | la torcia, e l'auto-return ai tre dwell | `pending` |
| **3r** | la porta con la radio spenta, all'indirizzo giusto | `pending` |
| **3s** | l'annullamento offline, e la sua attribuzione | `pending` |

**Nessuna delle sei porta un'osservazione con un orario.** Cinque sono `pending`
nudo; la sesta e' `pending` **piu' la ragione per cui non e' piu' riempibile**.

Il frontmatter del documento dice la stessa cosa dall'alto: *«ten procedures, ten
`Result: pending`. Nothing below has been run»*, con la riga 3m segnata come
eccezione **non perche' sia stata eseguita**, ma perche' il suo cancello e' stato
scavalcato.

---

## 2. Perche' questo piano gira lo stesso

**Per una deroga del proprietario, datata 2026-08-18, registrata nel commit
`5e85d6b`** in tre posti che dicono la stessa cosa: `DEF-42-04` in
`deferred-items.md`, il blocco di deroga alla riga 3m di `42-PROCEDURES.md`, e la
sezione Blockers di `STATE.md`.

**Cosa la deroga concede:** che le onde 3-8 partano con la riga 3m a `pending`.

**Cosa la deroga costa, alla lettera del suo stesso testo:**

1. **Il criterio 3 — *ogni comportamento dello scanner e' invariato rispetto a
   prima della conversione* — non e' piu' chiudibile.** Non e' aperto: e' privo
   di un termine di paragone, in modo permanente. Il *prima* andava misurato su
   codice che dopo questo piano non esiste piu'.
2. **La riga 3n perde il proprio oggetto.** Chiedeva un confronto fra due
   osservazioni umane; la prima non esiste e non puo' piu' esistere. Eseguirla da
   sola produce una descrizione, non un confronto.
3. **Il secondo motivo del vincolo d'ordine resta intatto e non e' coperto dalla
   deroga:** alla prima porta reale, correzioni di comportamento mai esercitate
   (fasi 31 e 39) e una superficie ridipinta girano **insieme**, e questo
   repository non ha error tracking. Se qualcosa cede davanti a una fila, nessuno
   potra' dire quale delle due l'ha causata. **Rischio accettato, non rimosso.**

**L'alternativa disponibile e non presa**, registrata perche' la decisione sia
leggibile per intero: una seduta di laboratorio su ambiente usa-e-getta, con 3m e
3n appaiate nelle stesse condizioni, che avrebbe chiuso il criterio 3 nei suoi
termini senza toccare la produzione.

---

## 3. Cosa questo file vieta a chi lo rilegge

- **Nessuna osservazione va inventata per la riga 3m.** Non un test locale, non
  uno screenshot, non un'aspettativa ragionata. Il punto della riga e' che
  **nulla in questo repository disegna un pixel o fa vibrare un telefono**: un
  `pending` travestito da chiuso sarebbe il fallimento silenzioso esatto contro
  cui questo progetto ha scritto le proprie regole.
- **Le altre nove righe restano `pending` e restano eseguibili.** Nessuna e'
  chiusa da questa deroga, e nessuna va marcata `skipped` o `n/a` per coerenza
  con essa.
- **Ogni documento che dichiari la fase 42 verificata deve dire che il criterio 3
  non e' chiudibile**, invece di contarlo fra i criteri chiusi.
