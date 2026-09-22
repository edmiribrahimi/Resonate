# Fase 51 — voci differite

Cose incontrate durante l'esecuzione che **non appartengono al piano che le ha
trovate**. Si scrivono qui invece di essere riparate di straforo: una riparazione
fuori perimetro e' una modifica che nessun piano ha dichiarato.

---

## D-51-08-A — L'etichetta del bersaglio dice `production` anche quando legge il laboratorio

**Trovata dal piano 51-08, 2026-09-22.**

`scripts/rls-baseline.mjs` conosce due bersagli: `container` e `production`.
`production` non significa *il progetto di produzione*: significa *il progetto
ospitato, raggiunto dal Management API*, e il ref lo ricava da
`NEXT_PUBLIC_SUPABASE_URL`. Caricando `.env.lab.local` sopra `.env.local` — la
forma di `scripts/dev-lab.sh` — quel ref e' il **laboratorio**, e l'intestazione
stampa comunque:

    measured against: production (Management API, read_only)

Il numero e' giusto, l'etichetta no. Chi incolla quella riga in un
VERIFICATION.md documenta una misura sul progetto sbagliato, e non se ne accorge.

**Perche' non e' riparata qui.** Rinominare i bersagli tocca il vocabolario che
`rls-baseline-compare.mjs` usa per confrontare due artefatti su disco, e quel
file e' **esplicitamente fuori dal perimetro del piano 51-08** (D-50-02). E' un
lavoro con la sua decisione, non un ritocco.

**Precedente.** La condizione esiste dal 2026-09-07, da quando esiste il
laboratorio: non e' una regressione di questa fase.

---

## D-51-08-B — `verify:refusal` non puo' essere verde contro il laboratorio

**Trovata dal piano 51-08, 2026-09-22.**

Le undici tabelle dichiarate da `scripts/verify-refusal.mjs` sono tutte
`production_*` — il calendario di produzione. Sul **laboratorio** dieci di esse
hanno zero righe, quindi il controllo positivo tace e ogni riga **RIFIUTA** con
uscita 2: *«su una tabella con zero righe la risposta dell'abilitato e quella del
non abilitato sono identiche»*. E' l'esito onesto che lo strumento dichiara nella
propria intestazione, non un difetto.

L'unica riga misurabile — `production_pipeline_rule`, 16 righe — **ha tenuto**:
l'abilitato legge 16, il non abilitato legge 0.

**Perche' non si ripara.** Renderlo verde significherebbe importare il calendario
di produzione nel laboratorio — materiale che `production-calendar.md` e il
Guardrail 5 tengono fuori dal repo e che non si duplica per far passare un gate.
Lo strumento e' scritto per la produzione, e contro la produzione va verde quando
il piano **51-13** avra' applicato
`20260922120000_role_attendee_and_capability_keys.sql`.

---

## D-51-08-C — Il commento del middleware nomina due indirizzi che non esistono piu'

**Trovata dal piano 51-08, 2026-09-22.**

`src/lib/supabase/middleware.ts:665` dice *«`/membership-card` and `/attendance`
ARE in it [la mappa], and are now judged through the same lookup as everything
else»*. Dal piano 51-04 le due pagine non sono piu' su disco, e dal piano 51-08
la loro voce e' uscita da `capability-routes.ts` con la chiave
`membership.card.view` (D-51-07). Il commento descrive un routing che non esiste.

**Perche' non e' riparata qui.** `src/lib/supabase/middleware.ts` e' del piano
**51-06** in questa onda e del **51-10** nell'onda 3: due agenti sullo stesso
file vanno sequenziati, non parallelizzati (`ai-engineering.md`, gate
*multi-agent*). La riga e' di chi tiene quel file.

---

## D-51-12-A — `PROBE_PAYLOADS` copre 24 tabelle RLS su 40, e non e' colpa di questa fase

**Trovata dal piano 51-12, 2026-09-22.**

`npm run baseline:rls` non puo' andare a fondo contro il laboratorio, e la
ragione **non** e' il rinomina del registro. Isolando il controllo a due vie di
`scripts/rls-baseline.mjs:2238-2251` e interrogandolo contro il laboratorio:

    tabelle RLS sul laboratorio : 40   (pavimento del banco: 20)
    voci in PROBE_PAYLOADS      : 24
    «has no entry for»          : 16
    «not RLS-enabled tables»    : nessuna

**Il lato che questa fase governa e' pulito**: `account_acts` e' fra le tabelle
RLS, `membership_acts` e `attendances` non ci sono piu', e `PROBE_PAYLOADS` non
nomina nemmeno una tabella che non esista — cioe' il rinomina del piano 51-11 e
la migration del 51-12 concordano con lo schema.

Le sedici mancanti sono **tutte precedenti alla fase 51**: le quattordici
`production_*` (fasi 44-48), `email_deliveries`, `ticket_orders` (fase 49),
`drink_refund_request` e `venue_reveal_acts`. La tabella dei payload non e' stata
estesa quando quelle tabelle sono nate, e il banco rifiuta invece di misurare a
meta' — **che e' il comportamento giusto**, ed e' scritto accanto a se' stesso:
*«a write matrix that silently skips a table is a matrix that cannot fail»*.

**Perche' non e' riparata qui.** Sedici payload di scrittura vanno scritti uno
per uno, ognuno con la propria riga di matrice attesa: e' il lavoro di un piano,
non il ritocco di un altro. E riguarda ogni bersaglio, non solo il laboratorio.

**Nota per chi la prende in mano.** Il pavimento del banco ospitato resta a 20 ed
e' abbondantemente superato (40). Quello del **container** e' passato a 19 con il
piano 51-12, perche' la tabella delle presenze esce dalla replica delle
migration: la ragione e' scritta accanto al numero.

---

## D-51-12-B — Due prose che nominano ancora la credenziale della porta

**Trovata dal piano 51-12, 2026-09-22.**

- `src/utils/qr.ts:52-58` — dice che il conio *«e' in uscita»* e che la colonna
  *«esce con il piano 51-12»*. Da oggi e' in uscita **solo in produzione**: sul
  laboratorio e' gia' uscita. La frase diventa falsa del tutto quando il piano
  51-13 applica la migration in produzione.
- `src/types/database.ts:968` — nomina la colonna al passato, come origine di
  un'etichetta.

**Perche' non sono riparate qui.** `files_modified` del piano 51-12 non le
contiene, e il piano 51-11 aveva gia' classificato la prima come *«una citazione
corretta del piano che la chiude, non un lettore rimasto indietro»*. **La
citazione e' corretta finche' il piano non ha chiuso.** Chiude con il 51-13:
quel piano, o la VERIFICATION della fase, deve riscrivere le due frasi al
passato. Nessun piano le possiede oggi, ed e' per questo che sono scritte qui.

`supabase/schema.sql:58` nomina anche lui la colonna, e **resta com'e'**: e' lo
schema di base, non la fonte di verita' dello schema (`CLAUDE.md`, guardrail 3),
e il banco del container lo legge nella versione del commit iniziale, non in
questa.
