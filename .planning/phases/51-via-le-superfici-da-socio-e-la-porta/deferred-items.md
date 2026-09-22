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
