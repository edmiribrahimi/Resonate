# Milestones

Registro storico delle versioni spedite. Ogni voce rimanda al proprio archivio.

| Versione | Nome | Chiusa | Come è stata chiusa |
|---|---|---|---|
| v1.0 | fondazioni | — | [roadmap](milestones/v1.0-ROADMAP.md) · [requisiti](milestones/v1.0-REQUIREMENTS.md) |
| v1.1 | — | — | [roadmap](milestones/v1.1-ROADMAP.md) · [requisiti](milestones/v1.1-REQUIREMENTS.md) |
| v1.2 | — | — | [roadmap](milestones/v1.2-ROADMAP.md) · [requisiti](milestones/v1.2-REQUIREMENTS.md) |
| v1.3 | — | — | [roadmap](milestones/v1.3-ROADMAP.md) · [audit](v1.3-MILESTONE-AUDIT.md) |
| v1.4 | Check-in Overhaul | 2026-03-11 | audit **passed**, 16 requisiti su 16 — [audit](v1.4-MILESTONE-AUDIT.md) |
| **v1.5** | **Platform Layout, Access Model & Door Fixes** | **2026-08-19** | **audit `gaps_found`, chiusa accettando il debito** — vedi sotto |
| **v1.6** | **Piattaforma, non community** | *aperta 2026-08-19* | in corso — 10 fasi, [roadmap](ROADMAP.md) |

---

## v1.5 — chiusa con il debito dichiarato

**18 fasi, 261 piani, tutti con SUMMARY. Ogni gate automatico verde.** E
nonostante questo: **nessuna delle diciotto verifiche di fase è `passed`** —
tredici `human_needed`, una `gaps_found`, tre con verdetto in prosa.

**Non è una milestone chiusa male: è una milestone chiusa onestamente.** Ciò che
manca non è codice, è **osservazione** — e la ragione è strutturale, scritta in
dodici documenti di verifica: *nessuno strumento di questo repository può
autenticarsi come un ruolo*.

| | |
|---|---|
| requisiti chiusi | **14 su 76** |
| requisiti in attesa di un'osservazione umana | **62** |
| requisiti contraddetti dal codice | **0** |
| requisiti orfani | **0** |
| voci `human_needed` | **88** su dodici file |
| voci differite riconosciute alla chiusura | **30** (vedi `STATE.md` → Deferred Items) |
| **criteri persi in modo permanente** | **1** |

### Il criterio perso

**Il criterio 3 della fase 42** — *ogni comportamento dello scanner è invariato
rispetto a prima della conversione* — **non è chiudibile e non lo sarà mai**. La
riga 3m doveva misurare lo scanner **non convertito**; è stata scavalcata per
deroga esplicita del proprietario il 2026-08-18, dopo che il costo era stato
enunciato e con un'alternativa disponibile e declinata. Quel codice non esiste
più, quindi la misura non è rimandata: è impossibile. `DEF-42-04`.

**Nessun documento futuro deve contarlo fra i criteri chiusi.**

### Cosa è stato fatto per ridurre il debito prima di chiudere

- **Un ambiente usa-e-getta**, provato fedele alla produzione su nove cataloghi
  (`42-LAB.md`), che rompe il muro delle sessioni di ruolo.
- **Due sedute di laboratorio** (`v1.5-LAB-SITTING.md`): §1 e §7 della door pass,
  il confine di ruolo su 14 indirizzi × 2 account, §3, §4, §5, e la prova che il
  canale realtime **consegna in 432 ms** — cioè che il difetto peggiore che la
  fase 38 temeva non c'è.
- **B-1 e B-2 percorsi** (`v1.5-B1-B2-FINDINGS.md`): il ramo delle assegnazioni,
  le tre garanzie di revoca/scadenza/serata sbagliata, i quattro trigger sul
  percorso del denaro, e l'import del calendario che scrive.
- **Due riparazioni di gate**, provate per mutazione, perché un percorso critico
  era indifeso da ogni strumento.

### Cosa resta dovuto

La **stanza buia**, la **tasca da 65 minuti**, i **due dispositivi**, il **door
pass alla prima porta reale**, e l'**import del calendario in produzione**. In
produzione la porta non è mai stata esercitata: zero account `staff`, zero
assegnazioni, zero scansioni.

**Non spedita.** Alla chiusura `main` è avanti a `origin/main`, e la regola di
deploy della fase 39 vale ancora: si spedisce in un giorno **senza serata**, e la
prima richiesta la fa chi spedisce.
