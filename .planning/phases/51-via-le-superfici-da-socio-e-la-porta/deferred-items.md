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

> **CHIUSA il 2026-09-23** — commit `482c450` (IN-02 del review): il commento
> di `src/middleware.ts` dice ora che i due indirizzi sono stati cancellati e
> rispondono 404, e che il matcher resta identico per le prime due ragioni.

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

## D-51-REVIEW — Cio' che la code review del 2026-09-22 ha trovato e che NON e' stato corretto in fase

`51-REVIEW.md` (commit `51f32aa`): 1 blocker, 10 avvertenze, 7 note. Corretti
in coda alla fase, con un commit ciascuno: **CR-01** (i valori dell'`INSERT`
nel banco del container), **WR-01** (rapporto guest in coda da account mai
assegnato: ritirato con la sua ragione, non piu' «trattenuto»), **WR-02**
(`checked_in_at` = `scannedAt` per un rapporto in coda), **WR-07**, **WR-09**,
**WR-10**. Restano aperti, e stanno qui perche' nessun piano li possiede:

> **Riletto il 2026-09-23.** Di quanto segue restano aperti **solo WR-05** e la
> ricognizione lessicale completa della fase 57. **WR-04** e' stato deciso dal
> proprietario (sempre acceso offline, frase corretta — `514c497`); **WR-03**
> chiuso con `7c6c859` — non serviva una colonna: il flag viaggia nella risposta
> e il drain gia' lo leggeva; **WR-06** con `c730b1d`; **WR-08** con `778af39`;
> le **sette note** con `778af39` (IN-01), `482c450` (IN-02..05) e `514c497`
> (IN-06, IN-07). Le voci sotto restano come registrazione della misura del
> 2026-09-22.

- **WR-04 — l'avviso della guest list si accende appena la radio e' spenta**
  (`listIsStale = !channelLive || …`). Dice il vero, ma la procedura chiedeva
  «spento a lista fresca». **Decisione del proprietario**, aperta in
  `51-VERIFICATION.md`; non si chiude d'ufficio in nessuna direzione.
- **WR-03 — `revoked_after_scan` su un rapporto guest e' solo un `console.warn`**:
  `guest_list_entries` non ha una colonna per marcarlo, il biglietto si'
  (`door_scan_events.cause`). Chiuderlo significa dare al percorso guest una
  riga di registro alla porta: e' una decisione di schema, non un fix.
- **WR-05 — il `COMMENT ON TABLE private.role_capabilities` della migration
  `20260922120000` dice «16 a master, 14 a organizer»: i numeri veri sono 15 e
  13.** La migration e' applicata su lab e produzione: **non si edita** un file
  applicato. Si corregge con una migration di solo `COMMENT` quando ce ne sara'
  una da applicare comunque; fino ad allora, il numero giusto sta in
  `51-VERIFICATION.md` e in `verify-capabilities.mjs`.
- **WR-06 — `scripts/probe-forged-identity.sh:165,436` cita `middleware.ts:697-699`
  come «rimisurato»: oggi sono `726-728`.** Il numero di riga in una procedura
  e' un dato che scade; la sonda va riletta al prossimo uso e la citazione
  sostituita da un `grep` sull'istruzione, come 51-04 aveva gia' fatto per
  l'altra meta' del file.
- **WR-08 — `src/types/database.ts:404`, `interface Attendance` sopravvive alla
  tabella**, zero importatori. Uscira' con la prossima rigenerazione dei tipi.
- **Note (7)** — `ROLES` senza consumatori; quattro citazioni datate di
  `api/membership/verify` (fra cui `src/middleware.ts:38-40`, che dice ancora
  che `/membership-card` e `/attendance` «are still judged downstream»); la
  prova per mutazione di `verify-capabilities` non piu' eseguibile con
  `('member', …)`; l'hint sul ruolo in `CreateAccountForm`; `/dashboard` in
  `PROTECTED_PREFIXES` con la ragione scritta sbagliata; il `catch` di
  `handleGuestCheckIn` con perimetro largo; chiave ricalcolata invece di
  `result.key`. Tutte prosa o pulizia: **fase 52 (ritocchi) o 57 (documenti)**,
  nessuna cambia un comportamento.
