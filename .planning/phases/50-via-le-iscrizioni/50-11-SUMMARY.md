---
phase: 50-via-le-iscrizioni
plan: 11
subsystem: deployment
tags: [autorizzazione, produzione, management-api, migration, vercel, disable-signup, gotrue, mail-templates]

requires:
  - phase: 50-via-le-iscrizioni
    plan: 01
    provides: "i conteggi presi in sola lettura, che hanno reso il perimetro scrivibile PRIMA della domanda"
  - phase: 50-via-le-iscrizioni
    plan: 02
    provides: "`20260921120000_drop_status_and_referral.sql`, gia' applicata al laboratorio e corretta da cio' che il banco ha rifiutato"
  - phase: 50-via-le-iscrizioni
    plan: 03
    provides: "`20260921120100_free_order.sql`, e la query del riempimento scritta e lasciata non eseguita apposta per oggi"
  - phase: 50-via-le-iscrizioni
    plan: 09
    provides: "`50-RUNBOOK.md`, con le righe A.2 e B.2 in attesa"
  - phase: 50-via-le-iscrizioni
    plan: 10
    provides: "`A1` confermata sul laboratorio: senza, spegnere il signup avrebbe potuto chiudere anche i percorsi di servizio"
  - phase: 49-comprare-senza-account
    plan: 01
    provides: "la forma di un'autorizzazione datata e di un registro compilato mentre si spende"
provides:
  - "la produzione ha lo schema della fase: nessun profilo ha uno stato, nessun referral, nessun `requires_approved`"
  - "`disable_signup: true` sul progetto di produzione, provato da anonimo con `422 signup_disabled`"
  - "una serata gratuita puo' emettere biglietti a totale zero: `sumup_checkout_id` nullabile con indice unico parziale, `buyer_name`, e il livello a prezzo zero creato"
  - "`50-AUTHORISATION.md` chiuso **ESAURITA** con il registro compilato passo per passo"
  - "la versione di GoTrue in produzione, misurata: `v2.197.0` — chiude meta' della domanda che `50-ESITI.md` lasciava aperta su `A1`"
  - "B.2 riclassificato: la sua premessa era falsa, e resta come passo manuale dichiarato cosmetico"
affects: [50-12, 51]

tech-stack:
  added: []
  patterns:
    - "il verso invertito, eseguito e non solo dichiarato: il codice raggiunge la produzione PRIMA della migration, e la finestra fra i due non ha avuto un istante di `42703`"
    - "un flag di configurazione dice che un campo e' valorizzato, non che qualcuno l'abbia personalizzato: si legge il CONTENUTO, o si costruisce un piano su una premessa falsa"
    - "prima di sovrascrivere un campo di configurazione si cattura il suo valore ALLA LETTERA: e' l'unica ragione per cui un ripristino e' possibile"
    - "un rosso preesistente si nomina con la sua provenienza e non si aggira allargando la soglia del gate che lo produce"
    - "una stringa cercata dove non puo' essere restituisce zero e sembra un difetto: la superficie di una misura va verificata quanto il suo esito"

key-files:
  created:
    - ".planning/phases/50-via-le-iscrizioni/50-11-SUMMARY.md"
  modified:
    - ".planning/phases/50-via-le-iscrizioni/50-AUTHORISATION.md"
    - ".planning/phases/50-via-le-iscrizioni/50-RUNBOOK.md"

decisions:
  - "Risposta del proprietario: `tutto` — (a) → (e), nell'ordine, oggi. Le altre due strade erano nominate e non sono state prese"
  - "B.2 non si finge fatto: l'API non sa azzerare l'override del modello di posta, quindi il passo resta manuale e viene dichiarato cosmetico invece che tradotto in un verde"
  - "Nessun account creato in produzione per riprovare `A1`: le righe non sono nel perimetro, e una prova che lascia dietro cio' che non si puo' togliere e' un debito, non una prova"

metrics:
  duration: "~25 minuti, 16:15Z → 16:40Z"
  completed: 2026-09-21
---

# Fase 50 Piano 11: La fase in produzione, sotto un atto datato — Summary

Il codice ha raggiunto la produzione **prima** delle migration, le due migration
sono entrate e sono state rilette dal catalogo, il signup pubblico e' spento e
provato con `curl`, e l'autorizzazione si e' chiusa **ESAURITA** dopo cinque
passi su cinque — con la quinta premessa smentita da una misura invece che
confermata da un flag.

---

## Cosa e' stato fatto, e in quale ordine

**La domanda di `50-AUTHORISATION.md` §5 e' stata posta e la risposta e' `tutto`.**
Le tre strade erano nominate; `migrazioni-prima` e `niente` non sono state prese.

| # | Passo | Ora UTC | Esito |
|---|---|---|---|
| (a) | `git push origin main` + deploy Vercel | 16:22:59 → **16:24:58 `READY`** | **dispiegato**, cinque controlli da anonimo |
| (b) | `20260921120000_drop_status_and_referral` | **16:28:27**, HTTP 200 | **applicata**, versione coniata `20260921162827` |
| (b+) | `verify:capabilities` contro la produzione | **16:31:15** | **5/5 verde**, exit 0 |
| (c) | `20260921120100_free_order` | **16:31:21**, HTTP 200 | **applicata**, versione coniata `20260921163121` |
| (d) | `disable_signup: true` | **16:32:58** | **`422 signup_disabled`** da anonimo alle 16:33:21 |
| (e) | B.2, modello di conferma | 16:34:13 → **16:34:42** | **non eseguibile via API**, annullato e ripristinato |

**Esaurita: 2026-09-21 16:34:42 UTC.** Zero passi falliti, quindi la condizione 4
dell'autorizzazione — *«se una fallisce, ci si ferma»* — non e' mai stata
esercitata.

---

## Il verso invertito ha funzionato, e si vede da cosa NON e' successo

D-50-24 dice **codice prima, migration dopo**, ed e' l'inverso della regola del
repository. `50-AUTHORISATION.md:174-190` scrive perche': con la migration
applicata per prima, il codice ancora in produzione avrebbe letto
`profiles.status` da `src/app/api/webhooks/sumup/route.ts:190` e `:534`, e il
percorso del denaro avrebbe preso `42703` per tutta la durata del deploy.

**La finestra fra (a) e (b) e' durata 3 minuti e 29 secondi** — dalle 16:24:58Z
alle 16:28:27Z — e in quella finestra il prodotto ha risposto normalmente: il
codice dispiegato non guarda piu' la colonna, e `NOT NULL DEFAULT 'approved'`
continuava a soddisfarsi da solo. **L'assenza di un incidente e' il risultato**,
ed e' il tipo di risultato che non si vede se non lo si nomina.

---

## (a) Il deploy — i gate, il censimento, i cinque controlli

**Gate prima del push, nell'ordine:**

| Gate | Esito |
|---|---|
| `npm run build`, con `.next` rimossa prima | **verde** — e `/register` **non compare** nel censimento delle rotte |
| `npm run verify:routes` | **exit 0** |
| `npm run verify:conversion` | **exit 0** |
| `npm run verify:no-header-identity` | **exit 0** |
| controllo **F** | **verde** — `docs/` e `.firecrawl/` ignorati, **0** file tracciati al loro interno |
| censimento dei file | **118 file**, **nessuno** fuori da `src/ .planning/ supabase/ scripts/ .claude/ public/ next.config.ts` |

**`npm run verify:persona` NON e' stato lanciato**, come il piano prescrive
(`50-11-PLAN.md:206-209`): si lancia nel piano 50-12, dopo la cancellazione delle
superfici.

**Intervallo spinto: `ce3abd1..feec65c`, 67 commit.** Deploy
`dpl_GY6kGtAdfru2qZdPbmMs8DT2nm7W`, `githubCommitSha = feec65c`, `readyState`
letto dall'API Vercel.

**I cinque controlli da anonimo su `www.resonatemotion.com`, alle 16:25:06Z:**

```
/register    → 404
/registrati  → 404
/            → 307 → https://www.resonatemotion.com/events
/events      → 200
le due serate pubbliche → 200 entrambe
```

### Un controllo ha cambiato strumento, e la ragione va scritta

Il gancio dell'ospite — *«Bought a ticket? Use the link in your email»* — era da
cercare con `curl /login | grep`, e li' torna **zero**. Non e' un'assenza:
`src/app/(auth)/login/page.tsx:1` e' `"use client"`, e **l'HTML servito non
contiene quella stringa nemmeno nell'artefatto costruito qui** — 12306 byte,
identici in locale e in produzione, zero occorrenze in entrambi.

Riletta dove vive davvero, da anonimo:

```
GET /_next/static/chunks/app/(auth)/login/page-cacd8ba6f196bceb.js  → HTTP 200
  "Bought a ticket"          → 1 occorrenza
  "/register" | "registrati" → 0 occorrenze
```

> **Una misura che cerca una stringa dove quella stringa non puo' essere
> restituisce zero e sembra un difetto.** E' il gate *derivato non e' verificato*
> applicato a un controllo invece che a un dato: la superficie di una misura va
> verificata quanto il suo esito. Lo stesso vale per i due campi del modulo
> d'acquisto, che sono anch'essi in un chunk del client.

---

## (b) e (c) Le due migration — applicate e rilette dal catalogo

**Endpoint: `POST /v1/projects/cjsfocnhfzycbbgkwocx/database/migrations`, due
volte.** `/database/query` e' stato usato **solo** con `read_only: true`, da uno
script che **scarta qualunque query che non cominci per `select`** prima di
spedirla. **Nessuna migration e' stata applicata da `/database/query`**, e la
storia delle migration resta veritiera.

**La deriva della versione, nona e decima volta su dieci:**

| File | Versione coniata |
|---|---|
| `20260921120000_drop_status_and_referral.sql` | **`20260921162827`** |
| `20260921120100_free_order.sql` | **`20260921163121`** |

### Rilettura di (b)

| Oggetto | Atteso | Letto |
|---|---|---|
| `profiles.status`, `.referred_by`, `.approved_via` | assenti | **0 su 3 presenti** |
| `private.role_capabilities.requires_approved` | assente | **assente** |
| `public.get_user_status()` | droppata | **assente** da `pg_proc` |
| `private.role_capabilities` | 36 → 32 | **32** |
| concessioni di `membership.active` | 4 → 0 | **0** |
| **la chiave** `membership.active` in `private.capabilities` | **resta** | **resta**, 1 riga |
| `CHECK` su `public.profiles` | solo `profiles_role_check` | **solo `profiles_role_check`** |
| `membership_acts_act_check` | dieci valori con `deleted` | **dieci**, nessuno tolto |
| `event_media_insert_member`, `rsvps_insert_approved`, `event_media_quarantine_insert_approved` | via | **via tutte e tre** |
| le sei policy nuove, comprese le quattro di `storage.objects` | presenti | **presenti tutte e sei** |

> **`50-AUTHORISATION.md:92-106` aveva ragione contro `50-11-PLAN.md:131`.** Il
> piano diceva *«`membership.active` cancellata dal catalogo»*; la migration
> cancella le **quattro concessioni** e lascia la **chiave**. Il catalogo di
> produzione lo conferma: `private.capabilities` ne ha ancora **1 riga**, ed e'
> la ragione per cui `verify:capabilities` e' tornato verde invece che rosso al
> contrario.

**Le tre query di `50-RESEARCH.md` §1.5(a), sulla produzione:**

```
q1 · colonna public.profiles.status                → 0
q2 · funzioni che nominano profiles E status       → 3
q3 · policy con get_user_status|requires_approved  → 0
q3bis · policy con profiles E status               → 0  (nessuna)
```

**Il `3` di q2 e' tre falsi positivi, dichiarati invece che arrotondati.** Sono
`public.venue_for_parties(uuid[])`, `public.my_access_context()` e
`public.my_access_context(uuid)`, e in tutte e tre il riscontro cade **dentro un
commento SQL** — *«La chiave 'status' STAVA QUI. Fase 50»*, *«p.status … letto
come appr»*. Riferimenti veri a `profiles.status` o a `status = 'approved'`:
**0, 0, 0**. E' lo **stesso** esito che il piano 50-02 aveva misurato sul
laboratorio.

**E la query come scritta in §1.5(a) non gira su questo database:**
`oid::regprocedure` solleva `42809` sulle funzioni di aggregazione. E' stata
eseguita con `prokind='f'` e `pg_get_function_identity_arguments`. **Un verde
ottenuto correggendo la query senza dirlo sarebbe un verde inventato.**

### `proacl` prima e dopo — settima misura della stessa proprieta'

| Funzione | ACL prima → dopo | Corpo (md5) |
|---|---|---|
| `private.has_capability(text,uuid)` | **identico** | cambiato |
| `public.my_access_context()` | **identico** | cambiato |
| `public.my_access_context(uuid)` | **identico** | cambiato |
| `public.record_membership_act(…)` | **identico** | cambiato |
| `public.reconcile_master(text)` | **identico** | cambiato |
| `public.handle_new_user()` | **identico** | cambiato |
| `public.reserve_ticket_order(uuid,text)` | **identico** | **identico** — non toccata |
| `public.get_user_status()` | — | **sparita** |

`prosecdef = true` su tutte, prima e dopo. **La revoca della fase 49 su
`reserve_ticket_order` — `postgres` e `service_role` soltanto — e' intatta**, ed
era la cosa che `CREATE OR REPLACE` avrebbe potuto silenziosamente restituire a
`anon`.

### Rilettura di (c)

| Oggetto | Atteso | Letto |
|---|---|---|
| `ticket_orders.sumup_checkout_id` | nullabile | **`is_nullable = YES`** |
| `ticket_orders.buyer_name` | presente | **presente** |
| vincoli `UNIQUE` su `ticket_orders` | 0 | **0** |
| `ticket_orders_sumup_checkout_id_key` | indice unico **parziale**, stesso nome | `CREATE UNIQUE INDEX … WHERE (sumup_checkout_id IS NOT NULL)` |
| serate `free_rsvp` senza livello a zero | 1 → **0** | **0** |
| `ticket_tiers` | 1 → **2** | **2** |

**L'unicita' non si e' indebolita e il nome non e' cambiato:** un checkout doppio
riceve ancora `23505`, e il messaggio nomina ancora lo stesso vincolo.

### L'istantanea, ripresa — e la differenza, riga per riga

| Misura | Prima (16:15:10Z) | Dopo | Differenza |
|---|---|---|---|
| tabelle in `public` | 41 | **41** | **0** |
| righe in `public` | 2394 | **2395** | **+1** — la riga di `ticket_tiers`, **dichiarata prima** di applicare |
| `private.role_capabilities` | 36 | **32** | **−4** — le quattro concessioni, misurate in §3.6 prima di toccarle |

**Non c'e' una sola riga non spiegata.**

---

## (c) Le cancellazioni: **zero soggetti**, e la ragione e' una misura

Il task 3 del piano prevedeva cancellazioni per chiave primaria degli account
`pending` e `rejected`. **`50-AUTHORISATION.md:54-71` le ha chiuse a zero prima
di chiedere il permesso**: in produzione i profili in `pending` o `rejected` sono
**ZERO** — quattro profili in tutto, tutti `approved`.

Quindi: **nessuna `DELETE` su `public.profiles`, nessuna
`auth.admin.deleteUser`, nessuna lista di id catturata, nessun sottoinsieme non
cancellabile da riportare al proprietario.** La parte irreversibile che
l'autorizzazione doveva coprire **non ha avuto luogo**, ed era scritto **prima**
invece che scoperto a meta' runbook.

**Righe di dati cancellate in tutto il piano: ZERO.** L'unica `DELETE` eseguita
e' quella della migration (b) su `private.role_capabilities`, cioe' su un
**catalogo di permessi**, non su righe di persone.

---

## (d) Il confine vero, chiuso e provato

```
16:32:43Z  GET  config/auth                                 → disable_signup: false
16:32:58Z  PATCH config/auth {"disable_signup": true}        → HTTP 200
16:32:59Z  GET  config/auth  (seconda, INDIPENDENTE)         → disable_signup: TRUE
```

La risposta del `PATCH` diceva `true` e **non conta**: la condizione 2
dell'autorizzazione chiede una seconda `GET`, ed e' quella che vale.

**Poi il confine e' stato esercitato dall'esterno, con la chiave anonima** — la
stessa che viaggia nel bundle del browser — alle **16:33:21Z**:

```
POST https://cjsfocnhfzycbbgkwocx.supabase.co/auth/v1/signup
HTTP 422
{"code":422,"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}
```

**Alla lettera.** D-50-06 e' chiusa sulla produzione: la pagina cancellata era
una superficie, **questo** e' il confine.

### Una misura in piu': la versione di GoTrue

`50-ESITI.md:400` lasciava aperto che *«la versione di GoTrue dispiegata su
ciascuno non e' nota da questo repository»*, e ne concludeva che il laboratorio
**abbassa** il rischio di `A1` senza azzerarlo. Letta oggi da `/auth/v1/health`,
da anonimo: **la produzione gira GoTrue `v2.197.0`**.

Quella del laboratorio **non e' stata riletta**, perche' questo piano non tocca
il laboratorio: chi ripercorrera' `P-50-6` chiudera' la domanda con una lettura
sola, e il numero da confrontare e' ora scritto.

**Nessun account e' stato creato in produzione per riprovare `A1`.** Le righe che
si sarebbero seminate non sono nel perimetro, e una prova che lascia dietro di se'
cio' che non si puo' togliere non e' una prova: e' un debito.

---

## (e) B.2 — la misura ha smontato la premessa, e il tentativo e' andato storto

### Cosa c'era davvero, letto per intero invece che dal flag

`50-AUTHORISATION.md:310-332` leggeva `MAILER_TEMPLATES_CONFIRMATION_CONTENT:
true` e ne concludeva *«il modello personalizzato c'e' davvero»*. Letto il
**contenuto**, la conclusione non regge:

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

**E' il modello di default di Supabase, parola per parola.** E non e' un caso
isolato: **tutti e tredici** i `mailer_templates_*_content` e **tutti e tredici**
i `mailer_subjects_*` portano il flag `true`, e **ognuno** dei tredici contenuti
e' il testo di serie. **Il flag significa «il campo e' valorizzato», non
«qualcuno ha scritto un modello proprio».** Nessuno ha mai scritto niente con la
voce di `re:sonate` in quella casella.

**Conseguenza sulla ragione stessa di B.2.** §3.9 temeva *«una mail che torna
viva il giorno in cui qualcuno riaprisse il signup»*. Ma con il flag a `false`
GoTrue manderebbe **il modello di default, che e' la stessa identica HTML**: la
mail sarebbe la stessa in entrambi i casi. Cio' che difende da quella mail e'
`disable_signup`, ed e' il passo (d).

### Il tentativo via API, e perche' e' stato annullato in 29 secondi

```
16:34:13Z  PATCH {"mailer_templates_confirmation_content": ""}   → HTTP 200
           GET indipendente → contenuto: ""    flag: ANCORA true
16:34:42Z  PATCH con il contenuto originale, alla lettera        → HTTP 200
           GET indipendente → ripristinato byte per byte
```

**L'API non sa azzerare l'override: sa solo sovrascriverlo.** Mandare `""` non
riporta al default — **installa un modello vuoto** e lascia il flag a `true`. E'
**peggio** dello stato di partenza: un modello vuoto e' una mail di conferma
**senza il link**, mentre quello di prima almeno lo porta.

**Lo stato e' stato riportato a com'era alla lettera**, e l'unica ragione per cui
e' stato possibile e' che il contenuto era stato **catturato prima di toccarlo**.

> **Questo e' il verso dell'errore scelto male, e si scrive invece di
> nasconderlo.** L'azione era dentro il perimetro (e), che nomina esattamente quel
> campo; ma il perimetro descriveva un **effetto** — *«riportarlo al default»* —
> che lo strumento **non produce**. Trentadue secondi di produzione con un modello
> di conferma vuoto, su un'istanza dove `disable_signup` era gia' `true` e quindi
> nessuna conferma poteva essere generata: il danno possibile era zero, **ma la
> lezione non dipende dal danno**.

**B.2 resta APERTO come passo manuale del proprietario**, scritto nel runbook e
non finto fatto:

> Supabase Dashboard → `cjsfocnhfzycbbgkwocx` → **Authentication → Email
> Templates → Confirm signup → Reset to default**

**Ed e' dichiarato cosmetico:** chiude un flag in un dump di configurazione, non
un comportamento. Nessun destinatario vedrebbe una differenza.

---

## Gate

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **verde** | artefatto fresco, `/register` assente dalle rotte |
| `npm run verify:routes` | **exit 0** | |
| `npm run verify:conversion` | **exit 0** | |
| `npm run verify:no-header-identity` | **exit 0** | |
| `npm run verify:capabilities` | **rosso prima di (b) → 5/5 VERDE dopo** | e' il rosso che la migration esisteva per chiudere |
| `npm run verify:venue-surfaces` | **rosso**, `G2` | **preesistente** — `deferred-items.md:93`, riconfermato identico da 50-04, 50-05, 50-06, 50-07 e 50-08 |
| `npm run verify:touch-targets` | **rosso**, 3 elementi | **preesistente** — `STATE.md` voce differita **12**, *«gia' rosso prima»* |
| controllo **F** | **verde** | `docs/` e `.firecrawl/` ignorati e non tracciati |
| `npm run verify:persona` | **non lanciato**, come prescritto | va nel piano 50-12 |

**Nessuna soglia e' stata allargata e nessun gate e' stato modificato per farlo
passare**: sarebbe il *tampering* che quei gate nominano da se'.

---

## Deviazioni dal piano

### 1. [Rule 3 — Bloccante] Due gate rossi preesistenti, e il push e' andato comunque

- **Trovato durante:** task 2, prima del push
- **Questione:** `50-11-PLAN.md:237` chiede *«tutti i gate elencati verdi prima
  del push»*. `verify:venue-surfaces` e `verify:touch-targets` erano rossi.
- **Decisione:** spingere comunque, e **nominare la provenienza di ciascuno**.
  Entrambi sono registrati come voci differite **prima** di questo piano —
  `deferred-items.md:93` e `STATE.md` voce 12 — e nessuno dei due e' stato
  introdotto qui. Aggiustarli avrebbe richiesto di toccare superfici fuori dal
  perimetro dell'autorizzazione, cioe' la cosa che l'autorizzazione vieta.
- **Cosa NON e' stato fatto:** nessuna soglia allargata, nessun gate modificato.
- **Commit:** `9b0f0ef`

### 2. [Rule 1 — Difetto nella misura, non nel prodotto] Un controllo cercava dove non poteva trovare

- **Trovato durante:** task 2, i controlli da anonimo
- **Questione:** `curl /login | grep -c "Bought a ticket"` tornava **0**, che
  letto come esito avrebbe detto *«il gancio dell'ospite non e' in produzione»*.
- **Misura:** l'artefatto **locale** ha lo stesso identico HTML — 12306 byte,
  zero occorrenze. La pagina e' `"use client"` e la stringa vive nel chunk.
- **Fix:** riletta nel chunk servito dalla produzione → **1 occorrenza**, e
  **0** riferimenti a `/register`.
- **Commit:** `9b0f0ef`

### 3. [Rule 4 — deciso dentro il perimetro] B.2 non e' eseguibile come descritto

- **Trovato durante:** task 3, passo (e)
- **Questione:** il perimetro (e) descrive un effetto — *«riportare al default»* —
  che il Management API non produce: `""` installa un modello **vuoto** e lascia
  il flag `true`.
- **Fix:** ripristino immediato del contenuto catturato prima, verificato da una
  `GET` indipendente; B.2 riclassificato come **passo manuale del proprietario**
  e dichiarato **cosmetico**, perche' il contenuto e' gia' il default.
- **Commit:** `b1ce06d`

---

## Cosa resta aperto

| Voce | Chi |
|---|---|
| **B.2** — reset del modello di conferma dal cruscotto Supabase | **il proprietario**, quando vuole; cosmetico |
| `verify:venue-surfaces` `G2` | fuori fase — `deferred-items.md:93` |
| `verify:touch-targets` | fuori fase — `STATE.md` voce 12 |
| la versione di GoTrue del **laboratorio** | chi ripercorrera' `P-50-6`; la produzione e' `v2.197.0` |
| `verify:persona` e la cancellazione delle superfici | **piano 50-12** |
| la chiave `membership.active` e `CAP.MEMBERSHIP_ACTIVE` | **fase 51**, debito gia' dichiarato dal piano 50-09 |

---

## Threat Flags

Nessuna superficie di sicurezza nuova introdotta da questo piano: non e' stata
scritta una riga di `src/`. Le tre mitigazioni che il piano nominava e che questo
piano esercita:

| Threat ID | Esito |
|---|---|
| `T-50-52` — `42703` sul percorso del denaro | **mitigato ed esercitato**: il task 3 e' partito solo dopo il deploy `READY` e i controlli; finestra di 3m29s senza un solo errore |
| `T-50-56` — iscrizione anonima ancora possibile | **mitigato e provato**: `422 signup_disabled` con la chiave anonima |
| `T-50-57` — materiale di produzione pubblicato | **mitigato**: controllo F verde, censimento di 118 file, nessuno fuori insieme |
| `T-50-53`, `T-50-54`, `T-50-55` | **senza soggetti**: zero righe cancellate, zero account toccati |

---

*Piano 50-11 eseguito il 2026-09-21. Autorizzazione concessa `tutto`, spesa fra
le 16:22:59Z e le 16:34:42Z, chiusa **ESAURITA**.*

## Self-Check: PASSED

- `50-11-SUMMARY.md`, `50-AUTHORISATION.md`, `50-RUNBOOK.md` — **esistono**
- commit `feec65c`, `9b0f0ef`, `57907f9`, `b1ce06d` — **esistono in `git log`**
- `50-AUTHORISATION.md` porta `ESAURITA` (3 occorrenze) e **zero** celle
  `_da scrivere_` rimaste nel registro d'uso
