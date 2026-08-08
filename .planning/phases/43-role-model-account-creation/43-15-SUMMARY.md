---
phase: 43-role-model-account-creation
plan: 15
subsystem: access-gating
tags: [uat, validation, baseline, comparison, coverage, phase-close]

requires:
  - "43-01 … 43-14 — le procedure manuali che ognuno ha scritto e non ha potuto eseguire"
  - "43-08 — il punto di cattura e la previsione sull'impronta portata avanti qui"
provides:
  - "43-HUMAN-UAT.md — sedici procedure scritte, ordinate per come una persona puo' davvero eseguirle"
  - "l'ordine di deploy delle cinque migration, con l'accoppiamento duro del piano 43-12"
  - "il confronto di chiusura 33-final → 43-final: 308 previste, 308 osservate"
  - "43-VALIDATION.md riconciliato con cio' che e' stato davvero osservato"
affects:
  - "/gsd:verify-work — legge questo file per primo"
  - "le fasi 34 e 35, che sono costruite sopra questa e ne ereditano il prezzo"

tech-stack:
  added: []
  patterns:
    - "l'attesa committata PRIMA della cattura, cosi' che l'ordine sia verificabile da terzi in un repository senza test"
    - "una procedura manuale dichiara chi la esegue, cosa serve prima, e quali passi NON sono per il proprietario"

key-files:
  created:
    - ".planning/phases/43-role-model-account-creation/43-HUMAN-UAT.md"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.43-final.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.43-final.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.43-final.json"
  modified:
    - ".planning/phases/43-role-model-account-creation/43-VALIDATION.md"

decisions:
  - "sedici procedure invece di undici: le undici che i requisiti chiedono piu' le sei camminate d'interfaccia del piano 43-14, che nessun altro documento raccoglieva"
  - "ordinate per sessione invece che per numero, con i passi che richiedono strumenti tecnici marcati uno per uno — il proprietario ha dichiarato di non poterli eseguire"
  - "wave_0_complete: true, con l'ottava voce spuntata come META' chiusa: la gamba browser di M-12 non e' lavoro arretrato, e' lavoro che non esiste piu'"
  - "nyquist_compliant lasciato false: sedici procedure su sedici sono [pending]"
  - "nessuna migration applicata, nessuna mail inviata, nessuna sonda su produzione"

requirements-completed: [ROLE-01, ROLE-02, ROLE-03, ROLE-04, ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05]

metrics:
  tasks: 3
  duration: ~2h
  completed: 2026-08-08
---

<!--
  LA SEZIONE "L'attesa, scritta prima" E' STATA COMMITTATA PRIMA DELLA CATTURA.
  Commit `8009f2a`, precedente a `a9c1ecc` che porta gli artefatti di `43-final`.
  Un'attesa letta dal proprio risultato non puo' fallire, e questo e' l'unico
  modo di renderlo verificabile da terzi in un repository senza test.
-->

# Phase 43 Plan 15: Il conto della fase — Summary

**Le sedici prove che questa fase deve ancora a una persona esistono adesso in
un documento solo, in italiano, ordinate per come si possono davvero fare — e
l'impronta complessiva della fase sulla matrice di scrittura e' una lista
dichiarata in anticipo che coincide: 308 previste, 308 osservate.**

---

## L'attesa, scritta prima di leggere qualunque risultato

Confronto `33-final` → `43-final` sul container, `--only=B1,B2,B3`.

### La regola che governa l'attesa

Questa fase ha dichiarato ogni movimento **piano per piano, prima di
misurarlo**. Il confronto di chiusura non e' quindi la prima occhiata: e' la
verifica che la somma dei movimenti dichiarati sia **tutto** il movimento
avvenuto. I punti intermedi `43-05`, `43-06`, `43-10` e `43-12` hanno riportato
`CAP-03: clean`; solo `43-07` e `43-08` hanno mosso qualcosa, e ognuno ha
scritto la propria attesa prima della propria cattura.

### I numeri, derivati e non digitati

| Origine | Classe | n | Che cosa |
|---|---|---|---|
| 43-07 | `policy_added` | 1 | `membership_acts_select_register_read` |
| 43-07 | `supporting_count_changed` | 2 | `policy_count` 67 → 68 · `rls_enabled_tables` 20 → 21 |
| 43-07 | `b2_cell_added` | 11 | `membership_acts` × le 11 personas preesistenti |
| 43-07 | `b3_cell_added` | 33 | `membership_acts` × 11 personas × 3 verbi |
| 43-08 | `b2_persona_added` | 3 | `staff/approved`, `staff/pending`, `staff/rejected` |
| 43-08 | `b2_cell_added` | 63 | 3 personas × 21 tabelle |
| 43-08 | `b3_cell_added` | 189 | 3 personas × 21 tabelle × 3 verbi |
| 43-08 | `b2_count_changed` | 6 | `master/{approved,pending,rejected}` e `organizer/{approved,pending,rejected}` × `profiles`, da 9 a 12 righe visibili |

**Totale atteso: 308 differenze.**

Controprova aritmetica, presa dagli artefatti gia' su disco invece che dalla
somma: B2 passa da 220 celle (11 personas × 20 tabelle) a 294 (14 × 21), cioe'
**+74**, che e' `11 + 63`. B3 passa da 660 (11 × 20 × 3) a 882 (14 × 21 × 3),
cioe' **+222**, che e' `33 + 189`. `1 + 2 + 3 + 74 + 6 + 222 = 308`.

### Le classi che devono valere **zero**

Sono queste, non il totale, a decidere se la fase ha mosso qualcosa che non
aveva dichiarato:

- `b3_cell_changed` — **0**. Nessuna cella di scrittura preesistente puo' aver
  cambiato verdetto. Un solo movimento qui e' un allargamento o una perdita di
  permesso su una tabella che questa fase non doveva toccare.
- `b2_fingerprint_changed` — **0** al di fuori delle sei celle `profiles` gia'
  contate come `b2_count_changed`.
- `b2_cell_missing`, `b2_persona_missing`, `policy_removed`, `policy_changed` —
  **0**.
- B1 `unexplained` — **0**.

### La previsione falsificabile sull'impronta

Le sei celle `b2_count_changed` devono portare
`pk_md5 = ff5c062e45c840688c0796ae43bf22dd` — le **dodici** personas seminate e
nient'altro. Il valore e' quello che il piano 43-08 aveva calcolato prima della
propria cattura e poi osservato; se una policy si fosse allargata dopo, il
conteggio salirebbe e **l'impronta no**.

### Le quattro conferme, dichiarate prima di cercarle

1. le **sedici celle** di `organizer/pending`, `organizer/rejected`,
   `master/pending` e `master/rejected` portano ancora **evidenza**, non
   `absent` — e' l'intero scopo di ROLE-03;
2. `insert`, `update` e `delete` su `membership_acts` **rifiutano per ogni
   persona**, `master/approved` compresa;
3. `staff/approved` e' cella per cella identica a `member/approved`, nella sola
   forma in cui quella misura puo' riuscire (le differenze di **proprieta' delle
   righe** enumerate dal piano 43-08), e **nessuna cella** mostra `staff`
   superare `member`;
4. **nessuna** cella `profiles × update` legge una violazione di constraint
   (`23514`) al posto di un verdetto RLS.

### Il target produzione

Atteso: **non misurabile**, e per due ragioni gia' dichiarate da questa fase —
`membership_acts` non e' applicata (l'harness rifiuta di girare) e la griglia
delle personas ha tre etichette che la produzione non puo' risolvere. Se ne
scrive il perche', non lo si aggira.

### La disciplina

Ogni differenza fuori da questa lista viene **riportata, non riparata**. Un
difetto trovato qui e' un risultato della verifica della fase, non qualcosa da
sistemare in silenzio nell'ultimo piano.

---

## Il risultato, letto contro l'attesa

```
CAP-03: 308 defects — b2_cell_added · b2_count_changed · b2_persona_added
                    · b3_cell_added · policy_added · supporting_count_changed
```

| Classe | Prevista | Osservata |
|---|---|---|
| `b3_cell_added` | 222 | **222** |
| `b2_cell_added` | 74 | **74** |
| `b2_count_changed` | 6 | **6** |
| `b2_persona_added` | 3 | **3** |
| `supporting_count_changed` | 2 | **2** |
| `policy_added` | 1 | **1** |
| **totale** | **308** | **308** |

**Nessuna settima classe.** E le classi che dovevano leggere zero leggono zero:
nessun `b3_cell_changed`, nessun `b2_fingerprint_changed`, nessuna cella e
nessuna persona mancante, nessuna policy rimossa o cambiata. B1:
`67 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained`.

Le sei celle mosse sono **esattamente** le sei previste — `master/{approved,
pending,rejected}` e `organizer/{approved,pending,rejected}` × `profiles`, tutte
da 9 a 12 righe visibili — e non ce n'e' una settima.

### La previsione falsificabile

|  | Prevista | Osservata |
|---|---|---|
| `pk_md5` delle sei celle mosse | `ff5c062e45c840688c0796ae43bf22dd` | **`ff5c062e45c840688c0796ae43bf22dd`** |

E' la distinzione fra *aritmetica* e *allargamento*, e vale la pena isolarla: le
righe che quelle sei personas vedono adesso sono **le dodici personas seminate e
nient'altro**. Se una policy si fosse allargata da qualche parte in questa fase,
il conteggio sarebbe salito lo stesso e **l'impronta no**.

## Le quattro conferme

Tutte e quattro dichiarate prima di essere cercate, tutte e quattro con la loro
evidenza.

### 1 · Le celle delle quattro personas vietate portano ancora evidenza

E' l'intero scopo di ROLE-03: quelle quattro figure — `organizer/pending`,
`organizer/rejected`, `master/pending`, `master/rejected` — sono l'unica ragione
per cui la matrice di scrittura della fase 32 ha colto il suo difetto peggiore, e
la regola aggiunta da questa fase le rende irrappresentabili.

```
celle per le quattro personas: 252 | con evidenza: 252 | absent: 0
conclusive_for_rls = true fra queste: 244
```

**Zero `absent`.** Il seam del piano 43-03 — droppare la regola attorno al ciclo
delle personas e ripristinarla `NOT VALID` — ha pagato il suo prezzo in anticipo
e la rete non e' mai stata persa.

### 2 · `membership_acts` rifiuta tutte e tre le operazioni, per ogni persona

```
insert -> 42501  ×14 personas
update -> ok:0   ×14 personas
delete -> ok:0   ×14 personas

master/approved:  insert 42501 · update ok:0 · delete ok:0   (tutte conclusive)
celle in cui una scrittura e' atterrata: 0
```

`master/approved` compresa, che e' la cella che conta. **Precisione dovuta,
ripresa dal piano 43-07 perche' resti vera qui:** `update` e `delete` non
sollevano `42501` — **toccano zero righe**. E' cosi' che la RLS si comporta su
UPDATE/DELETE quando nessuna policy le concede: le righe semplicemente non
esistono per quel comando. Non e' un rifiuto piu' debole, e' un *meccanismo*
diverso, e scrivere «rifiutano tutte e tre con 42501» sarebbe stato falso.

### 3 · `staff/approved` e' ancora `member/approved`

| coppia | read `count` ≠ | read `md5` ≠ | write ≠ | **staff supera member** |
|---|---|---|---|---|
| `staff/pending` vs `member/pending` | **0** | 1 (`profiles`) | **0** | **0** |
| `staff/rejected` vs `member/rejected` | **0** | 1 (`profiles`) | **0** | **0** |
| `staff/approved` vs `member/approved` | 8 | 1 (`profiles`) | 1 | 1 → spiegata |

E' **esattamente** la forma che il piano 43-08 aveva misurato e spiegato, ancora
in piedi sei plan dopo. Le due coppie pulite sono la vera misura di D-02:
nessuna delle quattro possiede righe, quindi la proprieta' non le separa e resta
solo la capability, che e' la stessa. L'unica differenza di `md5` su `profiles`
e' costruttiva — ciascuna vede **la propria** riga.

Le otto differenze di lettura sulla coppia `approved` hanno tutte la stessa
forma — `member 1 vs staff 0` — e nascono dalla **proprieta' delle righe**, non
da un permesso: il seed assegna la proprieta' a due sole personas e
`staff/approved` non possiede nulla.

L'unico verdetto di scrittura diverso e' `rsvps × insert`:

```
member/approved  23505   conclusive_for_rls = false   (preesistente)
staff/approved   ok:1    conclusive_for_rls = true
controllo negativo: staff/pending, staff/rejected, member/pending,
                    member/rejected  ->  42501 tutte e quattro
```

`23505` e' una violazione di unicita': `member/approved` **possiede gia'** la
riga 1 di `rsvps` e collide con se stessa. Il controllo negativo e' quello che
decide: le quattro personas non approvate prendono un rifiuto RLS vero.
`requires_approved` lavora sul ruolo nuovo esattamente come sul vecchio.

**Zero celle, su tutte e tre le coppie, in cui `staff` legge piu' di `member` o
scrive dove `member` e' rifiutata.**

### 4 · Nessuna cella `profiles × update` e' diventata una violazione di constraint

```
33-final: {"42P17": 11}   (11 celle)
43-final: {"42P17": 14}   (14 celle)
celle che leggono 23514:  0
```

E' il pericolo che `43-RESEARCH.md` § B.3 aveva nominato e che l'asserzione del
piano 43-03 sorveglia a ogni run: un CHECK `NOT VALID` rifiuta **ogni** update a
una riga gia' in violazione, anche su una colonna che la regola non nomina.
Se la riga sonda `min(pk)` fosse finita su una coppia vietata, quattordici celle
avrebbero smesso di essere un verdetto RLS senza causa visibile. Le tre celle in
piu' sono le tre personas `staff`, e il verdetto e' **identico** a quello di
prima della fase — coerente con lo zero `b3_cell_changed`.

## Il target produzione — non misurabile, e le tre ragioni

Il piano chiedeva di girare anche il target produzione. **Non e' stato
possibile**, e le ragioni sono tre, tutte dichiarate e nessuna aggirata:

1. **misurata qui:** `.env.local` non esiste in questo worktree, quindi
   `baseline:rls` esce prima di leggere qualunque cosa —
   `FATAL: missing environment variable(s) … Nothing was measured.`
2. **portata dal piano 43-07:** anche con le credenziali, l'harness rifiuta —
   `PROBE_PAYLOADS names tables that are not RLS-enabled tables of this target:
   membership_acts`, perche' quella migration non e' applicata;
3. **portata dal piano 43-08:** superato anche quello, la griglia delle personas
   ha **tre etichette** che la produzione non puo' risolvere.

Tutte e tre si chiudono lo stesso giorno: quando le migration vengono applicate.
Nel frattempo, la riga onesta e' *«non misurato»*, non *«pulito»*.

---

## Le sedici procedure — e perche' sedici e non undici

Il piano ne chiedeva undici, `M-43-01 … M-43-11`. Ce ne sono **sedici**, e le
cinque in piu' non sono un allargamento di perimetro: sono le camminate
d'interfaccia `W-43-14-A … W-43-14-F` che il piano 43-14 ha scritto e che
**nessun altro documento raccoglieva**. Lasciarle nel proprio riassunto avrebbe
significato che il documento che dice *«ecco tutto il lavoro manuale dovuto»* ne
ometteva un terzo.

`M-43-09` e `W-43-14-E` sono **la stessa prova** scritta da due piani con due
nomi — il piano 43-14 lo dice esplicitamente — e stanno in una sezione sola che
porta entrambi i nomi, invece di essere contate due volte.

### Cosa il documento fa, che i quattordici riassunti non facevano

- **L'ordine di deploy sta in cima, in chiaro.** Cinque migration in un ordine
  fisso che fallisce *al momento dell'apply*, piu' l'accoppiamento duro del
  piano 43-12: codice senza `20260808004000` mette `master=unavailable` su
  **ogni** login. Nessun singolo riassunto poteva dirlo, perche' nessun piano
  vedeva tutti e cinque i file.
- **E il verso opposto e' dichiarato sicuro**, con la sua evidenza: le migration
  applicate con il codice ancora vecchio non rompono niente, verificato percorso
  per percorso dal piano 43-06 su tutti e dieci i punti che scrivono `role` o
  `status`. Quindi la sequenza raccomandata e' **migration prima, codice dopo**,
  ed e' un fatto che nessuno avrebbe derivato leggendo i piani in fila.
- **Tre finestre che si chiudono**, che sono la ragione per cui l'ordine conta:
  la gamba browser di M-12 e' **gia'** irrecuperabile; i primi due passi di
  M-43-11 vanno fatti **prima** che il telefono della porta carichi il codice
  nuovo, o non si potra' piu' sapere se l'aggiornamento ha perso qualcosa; e le
  prove alla porta hanno bisogno di una serata vera.
- **Ogni passo tecnico e' marcato `[serve una mano tecnica]`.** Il proprietario
  ha dichiarato di non poter compiere operazioni tecniche: un documento che gli
  consegna SQL, pannelli di deploy e strumenti per sviluppatori senza dirlo non
  e' una procedura, e' un runbook indirizzato alla persona sbagliata.
- **I risultati gia' misurati sono portati avanti con la loro data**, invece di
  essere richiesti di nuovo: i cinque casi di 43-12 sul container, la guardia
  provata per mutazione, i due percorsi di aggiornamento IndexedDB di 43-13 con
  i conteggi prima e dopo. Tre procedure su sedici sono **parziali**, non
  pendenti — e la differenza e' scritta.
- **Un avvertimento che vale piu' di una procedura:** una serata intera senza
  rete produce **legittimamente** un blocco di ingressi senza marchio, su righe
  scritte dopo l'apply. Chi legge quei numeri deve sapere che vuoto significa
  *«non si sa»* e **mai** *«erano dei member»*, o leggera' un dato falso da una
  colonna corretta.
- **Un solo account di prova per tutto il giro.** Cancellare un account non
  cancella le sue righe nel registro — e' `ON DELETE SET NULL` con l'etichetta
  denormalizzata, la ragione per cui i piani 43-11 e 43-12 hanno rifiutato di
  sondare la produzione. Sette account di prova lascerebbero per sempre sette
  serie di righe dentro la tabella che questa fase esiste per rendere
  affidabile.

### Lo stato, procedura per procedura

**Tutte e sedici sono `[pending]`.** Tre portano una meta' gia' misurata:

| Procedura | La meta' che c'e' | La meta' che manca |
|---|---|---|
| **M-43-11** | i due percorsi di aggiornamento su Chromium reale, nessuna riga persa (43-13, 2026-08-08) | un telefono dello staff, il build deployato, la riga letta dal database |
| **M-43-05** | il caso completo sul container: 1 promosso, 2 retrocessi, tre righe di sistema (43-12, 2026-08-08) | il ponte fra codice e database in produzione |
| **M-43-06** | cinque casi sul container, conteggi identici, guardia provata per mutazione (43-12, 2026-08-08) | il pannello di deploy e un login vero |

Le altre tredici non hanno nessuna meta' misurata, e tre di esse — `M-43-01`,
`M-43-02`, `M-43-03` — **non possono averne**: nessuno strumento di questo
repository le raggiunge.

---

## Deviazioni dal piano

Tutte decise dall'esecutore. **Nessuna approvazione dell'utente e' stata chiesta
e nessuna e' stata data, per nulla di questo piano.**

### 1. [decisione dell'esecutore] Sedici procedure invece di undici

Il piano ne nomina undici. Le sei camminate d'interfaccia del piano 43-14 sono
state raccolte qui perche' altrimenti l'unico documento che raccoglie il lavoro
manuale ne avrebbe omesso un terzo. Nessun contenuto inventato: sono riportate
dal riassunto che le ha scritte, riscritte in italiano e con i passi tecnici
marcati.

### 2. [decisione dell'esecutore] Ordinate per sessione, non per numero

Il piano chiede undici procedure con la loro forma. Il prompt di esecuzione
chiede che siano ordinate *per quello che una persona puo' fare in una seduta*.
Le due cose sono compatibili e la seconda e' piu' utile: sei sessioni, con
scritto dove ci si puo' fermare. La forma di `32-HUMAN-UAT.md` — `role:`,
`steps:`, `expected:`, `result:` — e' conservata, tradotta, e allargata con
`serve prima:`, `se non succede:` e `pulizia:`, perche' un documento che dice
solo *cosa deve succedere* non dice a chi lo legge **cosa significa** se non
succede.

### 3. [decisione dell'esecutore] `wave_0_complete: true`, con l'ottava voce spuntata a meta'

Il piano chiede di impostarlo *«truthfully»*. Ogni **rilevatore** che Wave 0
chiedeva esiste ed era verde prima della cosa che deve rilevare. L'ottava voce —
M-12 — e' invece per meta' impossibile: la gamba browser non e' lavoro arretrato,
e' **lavoro che non esiste piu'**, e lasciarla non spuntata avrebbe suggerito
che qualcuno un giorno la fara'. E' spuntata con la parola *«META' chiusa»* e la
ragione accanto, e il paragrafo sotto la lista dice di leggere il flag con quel
residuo.

### 4. [scostamento dal comando di verifica del piano, non dai criteri]

Il `<verify>` del task 2 scrive
`npm run baseline:compare -- --target=container --before-point=33-final --after-point=43-final`
senza `--only=B1,B2,B3`. Cosi' com'e' **esce FATAL**, perche' B5 e' l'advisor
Supabase e sul container non esiste — lo stesso scoglio che i piani 43-08 e
43-10 hanno gia' incontrato. Il flag e' stato aggiunto, che e' cio' che il
messaggio stesso chiede. **Nessuna soglia toccata.**

### 5. [dichiarato] Il task 2 chiedeva anche il target produzione

Non e' stato possibile, per le tre ragioni misurate sopra. Riportato, non
aggirato.

---

## Cosa NON e' stato verificato

- **Non esiste alcun test runner per il prodotto** (`CLAUDE.md`, Guardrail 1), e
  **nessuno e' stato aggiunto da questo piano ne' da questa fase**. Nulla qui e'
  dichiarato verificato perche' «i test passano».
- **Nessuna migration e' stata applicata alla produzione. Nessuna mail e' stata
  inviata. Nessun account e' stato creato. Nessuna sonda di scrittura ha toccato
  la produzione.** Nessuna riga di `profiles` e' stata letta in nessun database.
- **Nessun file sorgente e' stato toccato da questo piano**, quindi `npm run
  build` non aveva niente da sorvegliare: questo piano produce due artefatti di
  pianificazione e tre file di evidenza.
- **Il container non e' la produzione.** Tutto cio' che e' misurato sopra dice
  che il modello e' giusto; non dice che il modello sia dove i membri possono
  arrivarci.
- **Le sedici procedure sono scritte, non eseguite.** E' esattamente la
  distinzione che il proprietario ha chiesto di mantenere: *differito non e'
  verificato*.

## La verifica di questo piano

| Controllo | Esito |
|---|---|
| `grep -c '^### '` su `43-HUMAN-UAT.md` | **22** — sei di contesto piu' le sedici procedure |
| procedure distinte presenti | **`M-43-01 … M-43-11`** e **`W-43-14-A … W-43-14-F`**, tutte |
| `grep -c 'result:'` su `43-HUMAN-UAT.md` | **16** — una per procedura |
| stringhe a forma di indirizzo, in entrambi i documenti | **0** |
| stringhe a forma di uuid, in entrambi i documenti | **0** |
| `grep -cE '^\| 43-'` su `43-VALIDATION.md` | **44** — una riga per task sui quindici piani |
| `npm run baseline:container -- --seed-only --report` | exit 0, **12/12 celle**, **6/6** scritture vietate rifiutate con `23514` sotto il nome dichiarato, sonda `master/approved` |
| `npm run verify:capabilities -- --target=container` | **`5/5 green, 0 warnings`** |
| `baseline:compare` container `33-final → 43-final` | **308 difetti, 308 previsti**, sei classi, nessuna settima |
| `baseline:rls --target=production` | **rifiuta di girare** — riportato, non aggirato |

## Known Stubs

Nessuno. Questo piano non produce codice: due documenti di pianificazione e tre
artefatti di evidenza. Nessun valore vuoto, nessun segnaposto, nessun TODO
lasciato. Le sedici procedure `[pending]` **non sono stub**: sono lavoro
dichiarato che appartiene a una persona, con lo stato scritto accanto a ognuna.

## Threat Flags

Nessuna superficie di sicurezza nuova. Il register della fase e' coperto:

| Threat | Come e' coperto |
|---|---|
| T-43-15-01 — una fase che si dichiara verificata su due requisiti su nove | il paragrafo della copertura e' aggiornato nei fatti (**quattro** su nove) e **invariato nella durezza**, con una frase in piu' che il piano non prevedeva: tutto e' misurato su un container e niente e' deployato. `nyquist_compliant` resta `false` |
| T-43-15-02 — un controllo differito registrato come superato | ogni procedura porta `result:`; tre portano una meta' con la data e una meta' mancante, e la differenza e' scritta. La regola *differito non e' verificato* e' citata in `43-VALIDATION.md` |
| T-43-15-03 — un indirizzo o un nome dentro una procedura | solo ruoli e account di prova; grep a forma di indirizzo su entrambi i documenti → **0**, e a forma di uuid → **0** |
| T-43-15-04 — un account di prova lasciato vivo con un codice di membership | ogni procedura che ne crea uno finisce cancellandolo e verificandolo, piu' un paragrafo dedicato in cima che spiega **perche'** e raccomanda un account solo per tutto il giro |
| T-43-15-05 — un difetto trovato nel confronto finale riparato in silenzio | non ce n'e' stato nessuno da riparare; la disciplina *riportare, mai riparare* era scritta nell'attesa committata **prima** della cattura |
| T-43-15-SC — install di pacchetti | **nessun pacchetto aggiunto**, nessun test runner aggiunto, `package.json` invariato |

## Self-Check: PASSED

File dichiarati, verificati presenti sul disco:

- `.planning/phases/43-role-model-account-creation/43-HUMAN-UAT.md` — FOUND
- `.planning/phases/43-role-model-account-creation/43-VALIDATION.md` — FOUND, modificato
- `.planning/…/baseline/32-BASELINE-policies.container.43-final.json` — FOUND
- `.planning/…/baseline/32-BASELINE-reads.container.43-final.json` — FOUND
- `.planning/…/baseline/32-BASELINE-writes.container.43-final.json` — FOUND

Commit dichiarati, verificati in `git log`:

- `8009f2a` — l'attesa, **prima** della cattura — FOUND
- `01c2cd7` — le sedici procedure — FOUND
- `a9c1ecc` — la cattura `43-final` e il confronto — FOUND
- `27eedd8` — il contratto di validazione riconciliato — FOUND

Perimetro:

- `git diff --name-only` sulla base della fase (`30142ed`) elenca **esattamente
  sei** file: i cinque dichiarati piu' questo riassunto. **`STATE.md` e
  `ROADMAP.md` non sono stati toccati**: li possiede l'orchestratore.
- Nessun indirizzo, nessun uuid, nessun nome di persona e nessun nome di sede
  compare in questo documento.
- `re:sonate`, dove compare, ha la **e normale**.

---
*Phase: 43-role-model-account-creation*
*Completed: 2026-08-08*
