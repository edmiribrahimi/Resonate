# Fase 35 — voci fuori perimetro, aperte

> Cose accertate durante l'esecuzione di un piano che **non appartengono a quel
> piano** e che quindi non sono state corrette dove sono state trovate. Ognuna
> porta chi l'ha trovata, come, e cosa deve succedere.
>
> Ruoli, mai persone. Questo repository e' pubblico.

---

## 1. [CHIUSA il 2026-08-08 dal piano 35-04] `ends_at` va letto da `event_parties.date`, non da `events.date`

> **Esito.** Il piano 35-04 ha applicato la correzione e l'ha **misurata invece
> di accettarla**: su una serata costruita apposta con la sub-serata il giorno
> dopo il genitore — `events.date = 2026-10-09`, `event_parties.date =
> 2026-10-10` — le due espressioni divergono di ventiquattro ore esatte, e la
> riga che il writer scrive prende `2026-10-12T04:00:00Z`, quello della serata.
> Registrata come deviazione in `35-04-SUMMARY.md`.
>
> **Come ci e' arrivata.** Non da questo file: l'orchestratore l'ha portata
> **dentro il prompt** dell'esecutore di 35-04, con la misura e la ragione. Vale
> la pena scriverlo, perche' una voce affidata a un documento presuppone che
> qualcuno lo apra, e chi esegue un piano legge il piano. La voce resta il
> registro; il prompt e' stato il veicolo.
>
> Il testo originale resta sotto, invariato.

---

**Trovata da:** piano 35-02, task 2, provando la migration contro un container
`postgres:17.6` costruito con lo shim, lo schema base e tutte e 45 le migration.

**Il fatto, misurato.** `public.event_parties` ha una **propria** colonna `date`
dal 26 febbraio 2026 — `20260226300000_multi_sub_events.sql:20-27` la aggiunge e
la riempie dal genitore — **proprio perche' una sub-serata puo' stare su un
giorno solare diverso dall'evento che la contiene**. Su una serata con la
sub-serata il giorno dopo, le due letture divergono di **ventiquattro ore
esatte**:

| Espressione | Risultato |
|---|---|
| `party_end_instant(ep.date, coalesce(ep.end_time,'06:00'))` | `2026-10-12 04:00:00+00` |
| `party_end_instant(e.date,  coalesce(ep.end_time,'06:00'))` | `2026-10-11 04:00:00+00` |

**Perche' e' bloccante e non un dettaglio.** La direzione dell'errore e' quella
**insicura**: `ends_at` un giorno in anticipo e' un'assegnazione che **scade
prima della serata**, cioe' un membro dello staff rifiutato alla porta davanti a
una fila. E' l'asimmetria che `CLAUDE.md`, principio operativo 3, chiama la
peggiore delle due.

**Cosa dice il prodotto oggi, senza eccezioni.** Ogni call site TypeScript passa
la data della **serata**, mai quella dell'evento:
`src/app/(organizer)/organizer/events/[id]/review/page.tsx:164`,
`src/app/api/tickets/checkin/route.ts:438`,
`src/app/api/cron/venue-reveal/route.ts:40`,
`src/app/api/cron/event-reminders/route.ts:40`, e ogni chiamata a
`menuCloseInstant`. `public.party_end_instant` e' la meta' SQL della **stessa**
regola: nutrita con un'altra colonna, le due meta' rispondono a domande diverse
sembrando identiche — che e' esattamente il fallimento silenzioso per cui
`src/utils/datetime.ts` esiste.

**Dov'e' gia' corretto:** `supabase/migrations/20260809000000_party_assignments.sql`,
sezione 3d, con la ragione scritta accanto.

**Dov'e' ancora sbagliato:** `.planning/phases/35-per-night-assignments/35-04-PLAN.md:207`,
che istruisce il writer atomico a leggere
`public.party_end_instant(e.date, …)` con un join a `public.events`.

**Cosa deve succedere.** Chi esegue il piano 35-04 usa

```sql
public.party_end_instant(ep.date, coalesce(ep.end_time, '06:00'::time))
```

leggendo `public.event_parties ep where ep.id = p_party_id`, **senza join a
`public.events`**, e registra la correzione come deviazione nel proprio SUMMARY.

**Perche' non e' stato corretto qui.** `35-04-PLAN.md` appartiene a un'altra
onda. `ai-engineering.md`, gate *multi-agent*: due agenti che toccherebbero lo
stesso file si **sequenziano**, non si parallelizzano. La correzione e' quindi
scritta nei tre posti che chi esegue 35-04 attraversa comunque — la migration
che deve leggere, questo file, e il `35-02-SUMMARY.md`.

---

## 2. [RITIRATA — l'affermazione era falsa] «Un path morto nell'indice della persona»

**Affermata da:** `35-PATTERNS.md` (sezione correzioni a RESEARCH.md), ripetuta
qui in buona fede senza essere verificata.

**Il contenuto dell'affermazione:** che il glob `src/components/scanner/**`,
presente nell'indice di `CLAUDE.md` e nella tabella di `meta-gates.md`, puntasse
a una directory inesistente.

**Verificato il 2026-08-08, e l'affermazione non regge:**

```
$ ls -d src/components/scanner && ls src/components/scanner
src/components/scanner
ScanFlash.tsx

$ npm run verify:persona
  ✓ A · nessun path dichiarato e' morto
      58 glob su 1339 file
```

La directory **esiste** e contiene `ScanFlash.tsx`. Il controllo **A** —
esattamente il controllo che avrebbe dovuto fallire se la voce fosse stata vera —
e' verde su tutti e 58 i glob. Nessun path morto esiste. E' vero, e non
contraddittorio, che `ScannerClient.tsx` viva altrove
(`src/app/(admin)/admin/scanner/`): entrambi i glob dell'indice sono vivi, e
coprono due file diversi.

**Nessuna azione da aprire. Non aprire una voce «sanare il path morto»:
sanerebbe qualcosa che funziona.**

**Perche' questa riga resta invece di essere cancellata.** L'affermazione ha
attraversato tre documenti — RESEARCH, PATTERNS, e questo — senza che nessuno la
provasse, ed e' arrivata dentro `.planning/`, che e' **tracciato e pubblicato**.
Cancellarla lascerebbe le altre due copie in circolazione senza smentita.
E' il `Gate hallucination` di `ai-engineering.md` nella sua forma tipica: un
fatto plausibile, ereditato per citazione, che nessuno ha misurato. La riga
resta come smentita, con il comando che chiunque puo' rieseguire.

---

## 3. [APERTA] Cancellare un artista accreditato ora fallisce, e il rifiuto non raggiunge nessuno

**Trovata da:** piano 35-05, task 1, confrontando le catture di baseline in
container — non ragionando, misurando.

**Il fatto.** `20260809003000_party_credits.sql` dichiara
`artist_id uuid NOT NULL REFERENCES public.artists ON DELETE RESTRICT`. Da quel
momento **un artista accreditato su una serata non e' piu' cancellabile**.
`npm run baseline:compare --target=container --before-point=35-02
--after-point=35-05` riporta tre celle che si muovono:

| Cella | Prima | Dopo |
|---|---|---|
| `master/approved × artists × delete` | `ok:1` | `23503` |
| `master/pending × artists × delete` | `ok:1` | `23503` |
| `master/rejected × artists × delete` | `ok:1` | `23503` |

**Nessuna policy e' cambiata.** `artists_delete_master` e' byte-identica fra le
due catture: e' un vincolo, non un permesso. Nell'harness ogni artista seminato
e' accreditato, quindi ogni delete incontra la chiave; in produzione solo un
artista **accreditato** e' protetto.

**Perche' il vincolo resta com'e'.** Le alternative sono peggiori in modo non
recuperabile: `CASCADE` lascerebbe che una cancellazione riscriva in silenzio
cosa e' stata una serata, e `SET NULL` non esiste su una colonna `NOT NULL`. Un
rifiuto si annulla staccando il credito; una serata riscritta no.

**Cosa manca, ed e' il debito vero.** Il percorso di cancellazione in
`src/app/(organizer)/organizer/artists` oggi mostrerebbe l'errore grezzo di
PostgREST. **Non esiste error tracking in questo prodotto** (`meta-gates.md`):
un fallimento inspiegato su quel bottone raggiunge una persona solo se quella
persona lo sta guardando. Il rifiuto deve **nominare le serate che lo bloccano**
e offrire di staccarle — la stessa forma che `20260809000000_party_assignments.sql`
sezione 3c pretende per una demozione bloccata da un'assegnazione viva, e lo
stesso gate: un fallimento che conta ha bisogno di un **effetto osservabile**,
non di una riga di log.

**Perche' non e' stato fatto nel piano 35-05.** Quel percorso non e' fra i
`files_modified` del piano, che copre la migration, il tipo di riga e lo script
di verifica. Correggerlo li' sarebbe stato uno sconfinamento su una superficie
che nessun piano di questa fase ha ancora aperto.

**Cosa deve succedere.** Chi apre la superficie di catalogo dei crediti — o il
piano che tocca `organizer/artists` — intercetta `23503` sulla cancellazione di
un artista, elenca le serate che lo accreditano, e non lascia arrivare all'utente
un messaggio generico. E' il precedente del form newsletter registrato in
`.planning/codebase/CONCERNS.md`, da non ripetere.

---

## 4. [APERTA] L'uscita dalla demozione bloccata esiste, ma non ha un pulsante

**Trovata da:** piano 35-08, che l'ha dichiarata invece di lasciarla scoprire.

`revokeAssignmentsAndDemote` e' scritta, esportata, e la frase del rifiuto la
nomina. Ma il controllo che la invoca vivrebbe su `MemberTable.tsx`, che non e'
fra i `files_modified` di quel piano.

**Conseguenza operativa oggi:** il rifiuto `23503` **nomina** le serate che
bloccano — quello funziona — ma l'azione singola richiede una mano tecnica. La
strada manuale (revocare dalla pagina assegnazioni, poi cambiare il ruolo) resta
aperta ed e' descritta nella notice.

**Cosa deve succedere.** Il piano che apre `MemberTable.tsx` collega il pulsante.
Finche' non e' collegato, **non si puo' dire che il percorso d'uscita e'
spedito**: e' scritto, non raggiungibile.

---

## 5. [DA VERIFICARE — dedotta, non osservata] `validUntil` sara' `null` su un evento non pubblicato

**Trovata da:** piano 35-07, leggendo la policy — **non misurandola**. La
distinzione e' il punto della voce.

`event_parties_select_admin` chiede `staff.manage`, che un assegnatario a una
sola notte **non ha**. Su un evento **non pubblicato**, quindi, la lettura di
`event_parties` fallisce e `validUntil` esce `null`.

La direzione della conseguenza e' quella sicura, ed e' scritta nel codice come
limite dichiarato. Ma **e' una deduzione**, e questa fase ha gia' visto tre
deduzioni plausibili smentite dal container (l'ordine `CHECK`/`WITH CHECK`, la
semantica `NULL` del registro, `ends_at` sul seed).

**Cosa deve succedere.** Chi esegue il piano 35-10 — che risolve il verdetto
all'apertura dello scanner — **misura** questo caso invece di ereditarlo: una
persona assegnata a una notte di un evento non pubblicato, e cosa vede.

---

## 6. [APERTA, fuori fase] La semantica `NULL` documentata sul registro non e' quella che il suo writer produce

**Trovata da:** piano 35-04, contro il container.

`20260808002000_membership_register.sql:244-246` documenta *«NULL significa:
questo atto non ha toccato quell'asse»*. Ma `record_membership_act` calcola i
quattro assi da se', e **non lo ha mai fatto per nessun atto**: su
un'assegnazione escono `["staff","staff","approved","approved"]`, non `NULL`.

**Perche' non e' stata corretta.** Quella migration e' **applicata in produzione
dal 2026-08-08**, e il gate *migration in avanti* la protegge: si corregge con
una migration nuova, non riscrivendo un file gia' applicato.

**Chi la incontrera' per primo:** la prima superficie che **legge** il registro
— 35-14, o il piano che mostra la storia di un membro. Un lettore che si fidi
del commento interpretera' un valore presente come «asse toccato» quando non lo
e'.
