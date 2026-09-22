---
phase: 51-via-le-superfici-da-socio-e-la-porta
document: le procedure manuali della fase — oggi una sola, `P-51-1`
written: 2026-09-22
written_by: piano 51-01, task 1
walked: —
procedures: 1
status: SCRITTA, NON PERCORSA — gli esiti vanno in `51-ESITI.md`
requirements: [MEM-03, MEM-04]
---

# Fase 51 — Le procedure

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Qui si nominano **ruoli** — *chi ha il ruolo master*, *un membro
> dello staff assegnato alla serata di prova* — **mai persone**. Il riferimento
> del progetto di laboratorio non si scrive qui: sta in `.env.lab.local`, che e'
> ignorato da git. Nessuna chiave, nessun indirizzo di posta reale.
>
> **Questa procedura e' stata scritta PRIMA di essere percorsa.** E' la ragione
> per cui la colonna «cosa si e' visto» e' altrove — in `51-ESITI.md` — e i due
> riquadri d'esito, qui in fondo, sono entrambi aperti. Un `Result` non-`pending`
> **afferma** che qualcuno ha percorso: riempirlo in anticipo, o con una lettura
> dal catalogo al posto di uno schermo, e' una prova falsa (`T-51-01`).

---

## Procedura `P-51-1` — la porta, con la radio spenta, prima e dopo

**Chi la percorre:** il **proprietario**, su un telefono vero, con l'account di
staff del banco che ha `door.operate` sulla serata di prova (D-51-12).
**Contro cosa:** il **laboratorio**, mai la produzione.
**Quanto costa:** circa dieci minuti per corsa.

### Perche' due corse, e cosa significa «prima»

`MEM-04` non chiede che la porta funzioni: chiede che si sappia **cosa faceva
prima** e **cosa fa dopo**, sulla stessa serata, sullo stesso dispositivo, con lo
stesso biglietto o uno coniato allo stesso modo.

- **Corsa «prima»** = sul **codice attuale**, prima che questa fase tocchi un
  file di prodotto. Non e' recuperabile: se la fase spedisce e poi si prova, la
  linea di partenza e' andata. E' la perdita gia' registrata da `DEF-42-04`,
  quando il criterio 3 della fase 42 e' diventato **impossibile** invece che
  difficile.
- **Corsa «dopo»** = sul codice della fase, percorrendo **tutti e nove** i passi.

### `PRE-LAB` — la precondizione che viene prima di ogni altra cosa

| Condizione | Come si accerta | Se non e' vera |
|---|---|---|
| Il progetto di laboratorio e' `ACTIVE_HEALTHY` | lettura dallo stato del progetto via Management API, **prima** di aprire il telefono | il laboratorio va in pausa dopo una settimana: un **NXDOMAIN** sul suo host significa progetto `INACTIVE`, **non** un guasto di rete. Si fa il restore e si riattende |
| `lab.resonatemotion.com` serve il commit dichiarato | il commit (sha corto + data) e' scritto in `51-ESITI.md` **prima** della corsa | percorrere una procedura contro il codice vecchio non misura nulla |
| La serata di prova esiste, con la lista e almeno un invitato di guest list **senza email** | dalla superficie della porta, con la rete accesa | senza quell'invitato il passo 5 non ha soggetto, e il passo 5 e' quello che il «prima» deve davvero percorrere |

### La modalita' aereo era vera — e la prova e' **propria**, non ereditata

> **La dichiarazione non e' una parola data.** La prova di questa procedura e'
> **la barra di stato nella schermata**: vi si deve vedere **l'icona
> dell'aeroplano**, e **non** si deve vedere **nessun indicatore di rete dati
> ne' di wi-fi**. Si conserva una schermata per corsa, e quella schermata e'
> l'unica prova ammessa.
>
> **Il solo wi-fi spento rende la prova inutile**, e non e' un cavillo: con la
> rete dati accesa la coda offline non si esercita affatto e lo scanner risponde
> dal server come sempre. Si misurerebbe un percorso che alla porta non esiste.
>
> **Perche' la prova interna di `P-50-8` non si puo' ereditare.** `P-50-8`
> (`50-ESITI.md:463-471`) usava come seconda prova l'avviso della lista che il
> prodotto mostra da solo quando il dispositivo non raggiunge la rete. **D-51-10
> riscrive quel testo e ne cambia la condizione di accensione** — da questa fase
> in poi parla di guest list e si accende **solo quando e' vero**. Un avviso che
> la stessa fase sta modificando non puo' testimoniare per la fase: sulla corsa
> «dopo» proverebbe se stesso. Qui la prova e' **solo** la barra di stato.

### D-51-16 — cosa la corsa «prima» percorre davvero, e cosa cita

**Decisione del proprietario, 2026-09-22.** `P-50-8` e' stata percorsa **dal
proprietario** il 2026-09-21 fra le 16:01:27Z e le 16:02:19Z, sul laboratorio,
in modalita' aereo vera, **sullo stesso codice** che la corsa «prima»
misurerebbe. Ripercorrere cio' che quella corsa ha gia' misurato non aggiunge
una misura: aggiunge un'occasione di sbagliarla.

Quindi la corsa «prima» si percorre **in forma ridotta**, e ogni passo dichiara
il proprio trattamento nella colonna *Corsa «prima»* della tabella qui sotto:

- **percorsa** — si fa davvero, al telefono, adesso;
- **citata `P-50-8`** — la colonna «cosa si e' visto» rimanda a quella corsa con
  la sua ora. **Vale solo se `51-ESITI.md` dichiara che il laboratorio serve un
  commit senza modifiche alla porta rispetto al 2026-09-21 16:01Z.** Se quella
  condizione non regge, la citazione decade e il passo torna **percorsa**;
- **baseline** — il passo descrive un comportamento che **questa fase deve
  ancora costruire**: nella corsa «prima» non esiste, e si registra **cio' che
  il codice fa oggi**. E' quella la linea di partenza, non un passo fallito.

**La procedura resta scritta per intero, con tutti e nove i passi, perche' la
corsa «dopo» li percorre tutti.**

### L'istruzione che solo la corsa «prima» puo' eseguire

**Si legge come passo 1 della corsa «prima», non come nota in fondo.**

Il passo 9 pretende un telefono che porti **gia'** una voce `membership` in coda
quando arrivera' l'aggiornamento. Quella voce **la lascia la corsa «prima»**:
con la radio ancora spenta si scansiona un **codice socio**, e **la coda non si
drena** — non si riaccende la rete su quel dispositivo prima di chiudere la
corsa.

Se la corsa «prima» non la lascia, dopo l'aggiornamento **quella voce non e' piu'
fabbricabile** su quel telefono senza reinstallare la versione vecchia: `MEM-03`
perderebbe la sua unica prova su dispositivo, nello stesso modo in cui
`DEF-42-04` ha perso il criterio 3 della fase 42.

### I nove passi

| # | Passo | Ruolo | Cosa si deve osservare | Corsa «prima» (D-51-16) |
|---|---|---|---|---|
| 1 | aprire la porta **con la rete accesa** all'indirizzo a cui quel telefono sara' mandato, e lasciar scaricare la lista della serata | proprietario, con l'account di staff del banco | la lista risulta **scaricata**, e contiene **anche gli invitati di guest list senza email**: si cercano **per nome** e ci sono | **percorsa** — e' il passo che il «prima» deve misurare per primo |
| 2 | **modalita' aereo**, poi leggere l'avviso della lista | proprietario | l'avviso dice **«guest list»** e **non e' acceso** se la lista e' fresca (D-51-10) | **baseline** — oggi l'avviso parla di lista dei soci e resta acceso anche col badge «Online»: si registra cosa dice e quando si accende |
| 3 | scansionare un **biglietto valido**, radio spenta | proprietario | **accettato**; schermo **opaco**; titolo = esito, sottotitolo = **tipo di biglietto**; **nessun nome** (D-51-05) | **citata `P-50-8`** (passo 4, 2026-09-21 16:01Z) per l'accettazione offline; il **nome sullo schermo** e' gia' registrato li' come non conformita' ed **e' la linea di partenza** di D-51-05 |
| 4 | scansionare **lo stesso** codice una seconda volta, sempre in aereo | proprietario | **non rifiutato e non contato due volte**; il **fatto** (ora + «by this device») presente; il **nome** no | **citata `P-50-8`** (passo 5, 2026-09-21 16:01Z) |
| 5 | far entrare **un invitato di guest list senza email**, cercandolo **per nome** nella lista scaricata, sempre a radio spenta | proprietario | **accettato** e messo **in coda**; la pastiglia dei pendenti sale | **percorsa** — `P-50-8` non l'ha toccato, ed e' il percorso che D-51-10 tiene in vita |
| 6 | **scorrere la lista** fino in fondo | proprietario | l'intestazione e il pulsante **«QR Scan» restano in vista** | **baseline** — oggi la testata scorre via: si registra a quale punto sparisce |
| 7 | **riaccendere la rete** sul dispositivo della corsa | proprietario | la coda si **drena**, i contatori si muovono, la pastiglia «Pending» **sparisce** | **citata `P-50-8`** (passo 6, 2026-09-21 16:02Z). **Attenzione:** non su un dispositivo che porti la voce `membership` dell'istruzione qui sopra |
| 8 | **la rilettura dal catalogo** (sotto) | chi esegue il piano, con la chiave di servizio del laboratorio | `door_scan_events` per il biglietto del passo 3: **una riga e una sola**; la voce di guest list del passo 5: **`checked_in`** | **citata `P-50-8`** per la riga unica (`50-ESITI.md:511-529`); la meta' sulla **guest list** e' nuova e si rilegge davvero |
| 9 | **l'aggiornamento della coda** su un dispositivo che portava **gia'** una voce `membership` (D-51-11) | proprietario | dopo l'aggiornamento quella voce **non c'e' piu'**; le voci **`ticket` e `guest` ci sono ancora**; nella console **una riga sola**, con **categoria e conteggio** | **non percorribile nel «prima»** — il codice che scarta non esiste ancora. La corsa «prima» ne produce la **precondizione**, e questo e' tutto cio' che puo' fare |

### La rilettura dal catalogo, che e' la meta' che lo schermo non da'

Si fa **dopo** la sincronizzazione, con la chiave di servizio **del
laboratorio**, su PostgREST. **In sola lettura.**

1. **Il biglietto del passo 3** — `door_scan_events` filtrato sul suo
   `ticket_id`, ordinato per `scanned_at`: deve avere **una riga e una sola**,
   con `outcome = recorded`, `source = offline_sync`, `is_undo = false`, e
   `scanned_at` **precedente** a `recorded_at` — la distanza fra i due e' la
   finestra offline misurata.
2. **L'invitato del passo 5** — la sua voce in `guest_list_entries` deve
   risultare **`checked_in`**, con `checked_in_at` valorizzato.
3. **Cosa NON si deve trovare, e non e' un difetto:** il percorso del biglietto
   scrive `tickets.checked_in_at` e una riga in `door_scan_events`, **mai** una
   presenza. Chi cercasse in `attendances` la prova dell'ingresso di un biglietto
   la troverebbe assente e ne dedurrebbe un guasto. *(Dalla corsa «dopo» la
   domanda non si pone piu': D-51-14 toglie quella tabella.)*

**La rilettura conferma, non sostituisce.** Una cella della colonna «cosa si e'
visto» riempita con una lettura dal catalogo al posto di uno schermo e' un esito
inventato: il catalogo dice cosa e' stato **registrato**, non cosa lo staff ha
**visto** davanti alla fila.

### Se la corsa si ferma

Si registra **il passo** in cui si e' fermata e **cosa si e' visto invece** — e
il `Result` resta `pending`. Una corsa interrotta e' un'informazione; una corsa
interrotta e arrotondata a «percorsa» e' una prova falsa.

---

## Gli esiti

Vanno in **`51-ESITI.md`**, con data, **ora UTC e ora locale**, e il ruolo che ha
percorso. Qui restano solo i due riquadri, e restano aperti finche' qualcuno non
percorre.

> **Corsa «prima»** — sul codice attuale, prima che la fase tocchi un file di
> prodotto. Forma ridotta secondo D-51-16.
> `Result: pending`

> **Corsa «dopo»** — sul codice della fase, tutti e nove i passi, stessa serata,
> stesso dispositivo.
> `Result: pending`
