---
phase: 50-via-le-iscrizioni
plan: 12
subsystem: persona
tags: [persona, access-gating, community-membership, meta-gates, changelog, verify-persona, verification, chiusura-fase]

requires:
  - phase: 50-via-le-iscrizioni
    plan: 02
    provides: "`20260921120000_drop_status_and_referral.sql` — la migration da cui i moduli citano `has_capability` e `profiles_update_own` ricreate"
  - phase: 50-via-le-iscrizioni
    plan: 09
    provides: "la prova di REG-05 in due forme, con il perimetro del grep scritto accanto al comando"
  - phase: 50-via-le-iscrizioni
    plan: 10
    provides: "`50-ESITI.md` — le otto procedure percorse, da cui il VERIFICATION cita l'osservato"
  - phase: 50-via-le-iscrizioni
    plan: 11
    provides: "la cancellazione in produzione: senza, `verify:persona` misurerebbe un albero che non esiste piu'"
  - phase: 49-comprare-senza-account
    plan: 11
    provides: "`49-VERIFICATION.md` — la forma che questo progetto si e' dato: requisito, evidenza `file:riga`, anti-pattern cercati, debito dichiarato"
provides:
  - "nessun gate della persona ordina piu' un controllo su una colonna che non esiste"
  - "`access-gating.md` descrive UN asse, il ruolo, con `private.has_capability` come predicato autoritativo e `member` dichiarato come account leggero"
  - "`community-membership.md` perde il meccanismo e conserva la politica, che la fase 57 riprende"
  - "`.claude/CHANGELOG.md` 1.22.0 con i quattro pezzi che `ai-engineering.md` pretende, piu' il caso peggiore rimisurato"
  - "`npm run verify:persona` 7/7, lanciato DOPO la cancellazione e dopo la scrittura in produzione"
  - "`50-VERIFICATION.md` — sei requisiti chiusi da prove eseguite, 32 citazioni `file:riga`, e le tre cose che restano aperte dichiarate invece che scoperte"
affects: [51, 52, 57]

tech-stack:
  added: []
  patterns:
    - "un modulo della persona si corregge DOPO la cancellazione: aggiornato prima descrive un futuro, aggiornato molto dopo difende un morto"
    - "quando due gate del progetto si contraddicono, la contraddizione si risolve nel piano e si scrive perche' — non si assorbe"
    - "su un modulo che si carica su OGNI risposta la correzione e' minima e misurata: le guardie monotone contate prima e dopo, 3 e 3"
    - "un gate rimosso lascia la sua ragione come storia: perche' i due assi erano distinti resta scritto, marcato come storia"
    - "nessun `paths:` allargato non significa budget invariato: se la prosa cresce su un file del caso peggiore, il numero si rimisura e si riporta"
    - "un falso positivo di grep si nomina in anticipo, o il primo che greppera' concludera' il contrario"

key-files:
  created:
    - ".planning/phases/50-via-le-iscrizioni/50-VERIFICATION.md"
    - ".planning/phases/50-via-le-iscrizioni/50-12-SUMMARY.md"
  modified:
    - "CLAUDE.md"
    - ".claude/CHANGELOG.md"
    - ".claude/rules/access-gating.md"
    - ".claude/rules/community-membership.md"
    - ".claude/rules/meta-gates.md"
    - ".claude/rules/production-calendar.md"

decisions:
  - "Il pendente 1.21.1 si committa per primo e da solo: era una correzione del 2026-09-09 mai committata, e mescolarla al 1.22.0 avrebbe attribuito a questa fase un lavoro di un'altra"
  - "`CLAUDE.md` entra nel perimetro benche' non sia nei `files_modified` del piano: i principi 1 e 8 dicevano che il referral entra subito e che `member` non e' `approved`, e si caricano su ogni risposta"
  - "`50-VERIFICATION.md` chiude `passed` e non `gaps_found`: il criterio del piano e' per REQUISITO, e tutti e sei sono chiusi da prove eseguite. La decisione contraddetta (D-50-18b) sta in frontmatter come `decisions_contradicted: 1` e in una sezione sua, non in fondo"
  - "`verify:venue-surfaces` e `verify:touch-targets` restano rossi: entrambi anteriori alla fase, ed entrambi ripararli avrebbe richiesto di toccare superfici fuori perimetro. Nessuna soglia allargata"

metrics:
  duration: "~35 minuti"
  completed: 2026-09-21
---

# Fase 50 Piano 12: I gate che ordinavano un controllo impossibile, e la chiusura della fase — Summary

**`access-gating.md` chiedeva di verificare uno stato che il database non sa piu' scrivere. Adesso chiede ruolo e capability. `verify:persona` e' 7/7 su un albero che esiste davvero, e `50-VERIFICATION.md` chiude sei requisiti con 32 citazioni `file:riga` — dichiarando, invece di lasciar scoprire, la decisione che questa fase ha contraddetto.**

## Performance

| Metrica | Valore |
|---|---|
| Commit | **3** (`66aca0f`, `f711034`, `cc28124`) + il metadato |
| File di persona toccati | 4 (`CLAUDE.md` + 3 moduli), piu' il pendente |
| Righe di prodotto toccate | **0** |
| `npm run verify:persona` | **7/7 verdi**, due volte |
| Citazioni `file:riga` nel VERIFICATION | **32** (soglia del piano: 6) |

---

## Commit 0 — il pendente del 2026-09-09, committato per primo e da solo

`66aca0f`. Due file erano modificati e non committati all'inizio di questa
sessione: `.claude/CHANGELOG.md` con una voce `[1.21.1] - 2026-09-09` gia'
scritta, e `.claude/rules/production-calendar.md` con la correzione che quella
voce descrive — **la `003` del 10 ottobre non e' piu' in due atti**, rimisurata
sullo specchio importato dal feed corrente, modificata nel feed il 27 agosto,
sette giorni dopo la conferma che il modulo registrava.

**Perche' da solo e per primo.** Mescolarlo al `1.22.0` avrebbe attribuito a
questa fase un lavoro di un'altra e reso illeggibile la voce di changelog di
entrambi. Il diff e' stato riletto prima di aggiungerlo: nessuna sede nominata,
nessuna data non annunciata, nessun contatto — `venue-acquisition.md`, gate *uno
spazio non acquisito non si nomina*, rispettato.

---

## Task 1 + 2 — i tre moduli, `CLAUDE.md`, e la versione, in un commit solo

`f711034`. **Sono un commit solo perche' `ai-engineering.md` lo impone**:
*«When modifying CLAUDE.md or any rules module: bump the version and write the
changelog entry in the same commit»*.

### `access-gating.md` — la correzione principale

Il difetto, alla lettera: `access-gating.md:22-36` portava *«Le due assi, che non
vanno confuse»* e il **gate due assi** — *«`role === 'member'` senza
`status === 'approved'` e' un buco, non una scorciatoia»*. Dal momento in cui la
colonna e' sparita, **quel gate ordinava di controllare un valore che non
esiste**, e si carica su ogni risposta che tocchi `src/lib/rbac/**`,
`src/middleware.ts`, `src/app/(admin)/**`.

| Cosa | Prima | Adesso |
|---|---|---|
| la sezione | *Le due assi, che non vanno confuse* — ruolo `master · organizer · member`, stato `pending · approved · rejected` | **Un asse solo: il ruolo** — `master · organizer · staff · member`, letto da `src/types/database.ts:99` |
| il predicato | una lettura a mano di due colonne | **`private.has_capability`**, citato a `20260921120000_drop_status_and_referral.sql:397-420` |
| il gate | **Gate due assi** | **Gate ruolo e capability**, con il `42703` nominato come conseguenza |
| escalation | *«il proprio `role` o `status`»* | *«il proprio `role`»*, con `profiles_update_own` citata a `:146-155` — **ricreata** mantenendo il termine sul ruolo |
| *Before Touching* | *«cosa vede un utente `pending`»* | *«cosa vede un **account leggero senza ruolo di lavoro**»* |

**Due aggiunte che il piano chiedeva e senza cui il modulo mentirebbe per
omissione:**

1. **`member` non significa «socio».** L'account di chi compra o e' invitato
   nasce leggero con ruolo `member` (D-50-05); il ruolo dedicato a chi compra e'
   **differito alla fase 51**. Senza questa riga il modulo lascia credere che
   `member` significhi ancora appartenenza — ed e' esattamente il malinteso che
   la fase crea.
2. **La ragione per cui i due assi erano distinti resta, marcata come storia.**
   Un `member` `pending` era una persona che aveva chiesto di entrare senza aver
   ricevuto risposta. **Oggi nessuno si iscrive**, quindi la domanda a cui il
   secondo asse rispondeva non esiste piu'. Se tornasse, tornerebbe come
   **politica scritta**, non come colonna riesumata.

**Cosa NON e' stato toccato, di proposito:** i gate *RLS-e'-il-confine*, *service
role*, *redirect validato*, *entropia degli identificatori*, *nessun rate
limiting* e *coerenza navigazione/permessi*. Nessuno dipende dallo stato, e una
modifica non necessaria a un gate di accesso e' un modo di allargarlo per
sbaglio. Il frontmatter `paths:` e' **byte-identico**: `git diff | grep -c '^[-+] *- "src/'` → **0**.

Due gate che nominavano il gate rimosso sono stati aggiornati come conseguenza,
non come iniziativa: *la porta ha due credenziali* (ammette *«senza leggere il
ruolo»*, non piu' *«ne' ruolo ne' stato»*) e i due imperativi corrispondenti.

### `meta-gates.md` — **una riga sola**, e misurata

*«e su cosa vede un utente `pending`»* → *«e su cosa vede un **account
leggero**»*. Nient'altro: questo modulo si carica su **ogni** risposta, e una
modifica piu' larga del necessario e' il rischio che il modulo stesso descrive.

| Misura | Prima | Dopo |
|---|---|---|
| `/usr/bin/grep -ci "pending"` | 1 | **0** |
| `/usr/bin/grep -cE "venue_reveal_sent\|completed\|numerazione di serie"` | **3** | **3** |

**Le tre guardie monotone sono intatte**, contate prima e dopo come il piano
pretendeva (`T-50-60`), e questa fase non ne ha resa nessuna piu' facile da far
scattare.

### `community-membership.md` — solo la parte meccanica

Cade il **meccanismo**: la coda `pending`, il rifiuto come riga di tabella, il
referral come canale, e ogni riga che dice che il prodotto esegue oggi un
percorso di approvazione. Al loro posto: **nessuno si iscrive**, gli account di
lavoro li crea un admin o un organizer dentro l'app, chi compra o e' invitato
ottiene un account leggero.

**Sopravvive la politica**, ed e' il punto del modulo:

| Gate | Esito |
|---|---|
| *un criterio scritto, o nessun criterio* | **resta**, riformulato su chi riceve un invito, chi entra in guest list, a chi si vende |
| *nessuna corsia grigia* | **resta** — *«prima aggirava l'approvazione; dal 2026-09-21 aggira la cassa, ed e' la stessa cosa vista dall'altro lato»* |
| *la capienza e' finita* | **intatto** |
| *chi decide e' tracciato* | **rafforzato**: nomina l'atto `deleted` e la riga che **sopravvive alla persona** — `subject_id` nullo (D-50-16) |
| *stessa regola per tutti* | **resta**, con l'invito al posto del referral e la nota che il referral e' stato rimosso |

Due gate sono stati **convertiti in vincoli su cio' che si costruira'** invece
che cancellati: *una richiesta senza risposta non esiste piu', e non va
reintrodotta di nascosto* (se una fase futura rimette una lista d'attesa, nasce
con il suo tempo di risposta dichiarato) e *un no si comunica, e oggi si comunica
tacendo* — **un dominio senza `rejected` non e' un dominio senza rifiuti: e' un
dominio dove i rifiuti non lasciano traccia.**

Il modulo **continua a dire che la politica non e' scritta**: la riprende la 57,
e toglierla qui significherebbe rispondere al posto del proprietario.

### `CLAUDE.md` — due principi, ed erano falsi entrambi

Non era nei `files_modified` del piano. E' stato incluso perche' portava due
affermazioni che questa fase rende false **e che si caricano su ogni risposta**:

- **principio 1** diceva *«referral immediato, non-referred in approvazione»*.
  Adesso: **nessuno si iscrive**, si entra col biglietto o con l'invito, gli
  account di lavoro li crea un admin o un organizer, e *«la politica di chi entra
  resta da scrivere — la riprende la fase 57»*.
- **principio 8** diceva *«`member` non e' `approved`: sono due assi diversi»*.
  Adesso: **`member` non e' «socio»** — l'asse dello stato non esiste piu', e
  `member` e' il ruolo dell'account leggero.

### La voce di changelog — `[1.22.0] - 2026-09-21`

**Minore, non di patch:** non e' una correzione di fatto, e' la rimozione di un
asse concettuale dal modulo primario d'accesso. Porta le quattro parti che il
piano chiede — cosa e' caduto, **perche' adesso e non nella 57**, cosa fa
scattare il gate, cosa **non** e' cambiato — piu' i **quattro scenari di carico**
che `ai-engineering.md` pretende in assenza di un test runner (uno per modulo
modificato: `src/lib/rbac/roles.ts`, `src/middleware.ts`,
`community-membership.md` manuale, `CLAUDE.md`).

**Perche' adesso e non nella 57**, scritto per esteso perche' era una
contraddizione vera fra due gate del progetto: l'*Ordering Constraint* dice *«i
documenti in fondo»* e la 57 possiede `DOC`; `meta-gates.md` dice che **una riga
che descrive male il prodotto e' peggio di una riga assente**, con un precedente
datato **2026-08-25**. La 57 riscrive i **documenti**; un **gate operativo che
ordina un controllo impossibile** e' un difetto vivo.

### Il budget, che non e' «invariato» solo perche' i glob non si sono mossi

**Nessun `paths:` e' cambiato**, in nessun modulo. Ma la prosa e' cresciuta su
**due dei cinque file del caso peggiore**, quindi il numero e' stato rimisurato e
riportato nel changelog — che e' cio' che il gate *context budget* chiede quando
il caso peggiore si muove:

| | Prima | Dopo | Δ |
|---|---|---|---|
| `CLAUDE.md` | 13.600 B | 14.173 B | +573 |
| `access-gating.md` | 5.772 B | 7.780 B | +2.008 |
| `meta-gates.md` | 10.084 B | 10.087 B | +3 |
| `nextjs-architecture.md`, `venue-secrecy.md` | invariati | invariati | 0 |
| **totale caso peggiore** | **45.534 B ≈ 12.648 tok** | **48.118 B ≈ 13.366 tok** | **+2.584 B, +718 tok** |

Tetto **15.000**, margine **1.634**. Il caso peggiore oggi e'
`src/app/(admin)/admin/(work)/venues/[slug]/page.tsx`.

### `npm run verify:persona` — **DOPO**, e il perche' non e' una formalita'

Lanciato dopo la cancellazione delle superfici (onde 2–8) **e dopo la scrittura
in produzione** (onda 8), mai prima. Il build non conosce i glob della persona, e
lanciarlo prima avrebbe misurato un albero che non esiste piu'.

```
  ✓ A · nessun path dichiarato e' morto              58 glob su 2423 file
  ✓ B · indice CLAUDE.md e frontmatter dichiarano gli stessi glob
  ✓ C · ogni modulo ha una riga nell'indice          16 moduli, 16 righe
  ✓ D · il set di moduli senza paths e' quello dichiarato
        manuali: brand-visual-system, community-membership, legal-compliance,
                 production-calendar, sound-manifesto, venue-acquisition
  ✓ E · context budget entro il tetto pre-registrato
  ✓ F · il materiale di produzione resta fuori dal repo pubblico
        presenti e ignorati: docs, .firecrawl, .claude/settings.local.json
  ✓ G · la tabella di meta-gates descrive il routing reale   26 righe verificate

  caso peggiore: src/app/(admin)/admin/(work)/venues/[slug]/page.tsx
  48118 byte ~ 13366 token · tetto 15000

7/7 verdi.
```

**Sette controlli su sette, controllo F compreso.** Nessun path morto: la
cancellazione di 16 file — fra cui `src/app/(auth)/register/page.tsx` — **non ha
lasciato un solo glob senza corrispondenze**, quindi non c'e' stato niente da
riparare nei frontmatter ne' nell'indice.

> **E vale ricordare cosa quel verde NON dice**, perche' `ai-engineering.md` lo
> scrive da se': *«un verde non significa "la persona e' corretta": significa "la
> persona e' coerente"»*. I punti 1 (coerenza cross-dominio) e 4 (semantic
> versioning) restano **umani**: sono stati fatti a mano, e questo SUMMARY e' la
> loro unica traccia.

---

## Task 3 — `50-VERIFICATION.md`

`cc28124`. Nella forma del registro che il progetto si e' dato con
`49-VERIFICATION.md`: requisito, evidenza `file:riga`, comportamento osservabile,
passo manuale eseguito, anti-pattern cercati, debito dichiarato.

| Criterio del piano | Misurato |
|---|---|
| almeno una citazione `file:riga` per requisito (≥ 6) | **32** |
| `grep -ciE "i test passano\|test pass"` | **0** |
| i sei requisiti coperti | **6 sezioni `### REG-0x`** |
| il falso positivo di `venue_for_parties` nominato | **si**, 2 occorrenze |
| nessun riferimento di progetto, nessun indirizzo, nessuna persona | **0 occorrenze** di ref o mail |

### `status: passed`, e perche' non `gaps_found`

Il criterio del piano e' **per requisito**: *«`passed` solo se ogni REG-01…06 e'
chiuso da prove eseguite con `file:riga`»*. Tutti e sei lo sono. Ma `passed` da
solo avrebbe nascosto tre cose, quindi stanno **nel frontmatter** e in sezioni
proprie, non in fondo:

```
decisions_contradicted: 1     gates_red: 2     manual_steps_open: 1
```

**La decisione contraddetta e' `D-50-18b`: lo schermo della porta mostra il
`full_name` dell'acquirente.** La fase **non ha aggiunto** quel comportamento —
lo scanner ha sempre etichettato i biglietti dei membri con il nome del profilo
(`attendance/route.ts:814-864`, `checkin-store.ts:786-789`,
`ScannerClient.tsx:2186`) — **l'ha reso universale**, perche' ora il modulo
gratuito raccoglie il nome. `holder_label` resta **privo di nome**, verificato.
**Decisione del proprietario: si toglie nella fase 51**, che possiede porta,
scanner e coda offline, e si riverifica con la radio spenta.

### Le tre cose che il documento dice perche' non si leggano male

1. **Il caricamento media dei membri era GIA' morto** per il difetto del
   2026-08-08 (`may-upload.ts:265-281`, tabella `attendance` inesistente):
   rifiutava sempre, per chiunque. **D-50-03 formalizza, non restringe** — il
   `403` di `P-50-4` e' una porta murata da sei settimane che adesso lo dice.
2. **`membership.card.view` e' allargata per UNA fase** e la chiude la 51,
   insieme alla chiave `membership.active` rimasta inerte nel catalogo (le
   quattro concessioni cancellate, la riga no, perche' se ne va con
   `CAP.MEMBERSHIP_ACTIVE` nello stesso commit).
3. **La prenotazione che diventa biglietto sposta quelle persone SOTTO
   `venue_reveal_on_purchase`**: e' un **restringimento**, consentito dalla
   guardia monotona, e **dichiarato** — una guardia a senso unico si controlla
   ogni volta che il percorso che la attraversa cambia.

### REG-05, la forma della prova

Chiusa a **zero dal catalogo su entrambi i database**: laboratorio (50-09, otto
query tutte a zero) **e** produzione (50-11, `q1 0 · q2 3 · q3 0 · q3bis 0`, con
**i tre di q2 dichiarati falsi positivi** dentro commenti SQL). Il grep sui file
porta **il suo perimetro accanto al comando** con le tre ragioni per cui non e'
un allentamento, e **il falso positivo e' nominato in anticipo**:
`20260810161000:534` ha `AND p.status = 'approved'` dentro `venue_for_parties`, e
**quella definizione e' superata** da `20260905131000:116`, il cui `COMMENT`
(`:279`) lo dichiara. Chi greppasse le migration concluderebbe il contrario.

Dichiarate anche **le due correzioni alle query**: la forma di §1.5(a) **non gira
su questo database** (`42809` su `oid::regprocedure`), e la forma sulle policy era
**gia' cieca prima della migration**. *«Un verde ottenuto correggendo la query
senza dirlo sarebbe un verde inventato.»*

### Anti-pattern cercati — con il comando e il perimetro

Perimetro: i **64 file** di `src/`, `supabase/` e `scripts/` toccati dalla fase e
ancora esistenti (16 cancellati).

| Cercato | Trovato | Verdetto |
|---|---|---|
| `TODO\|FIXME\|XXX\|HACK` | **3 righe** | tutte **anteriori**: `attendance/page.tsx:44,:67` datate dal `git log -S` al **2026-02-24** (`24b511e`, fase 01-02); `conversion-manifest.mjs:1023` e' prosa della fase 41.2 |
| righe `TODO` **aggiunte dalla fase** | **0** | `git diff <fase> \| grep -c '^+.*TODO'` |
| `stub\|mock` | **1**, la stessa voce di manifesto, che **dichiara** uno stub ereditato | non introdotto qui |

`/usr/bin/grep` e non `grep` nudo, per il difetto sui file con byte NUL gia'
registrato in memoria.

---

## Deviazioni dal piano

### 1. `[Regola 2 — Correttezza]` `CLAUDE.md` aggiunto al perimetro

- **Trovato durante:** task 1, leggendo i moduli che D-50-25 nomina.
- **Questione:** `50-12-PLAN.md:7-12` elenca tre moduli e il changelog.
  `CLAUDE.md` non c'e', ma i suoi principi 1 e 8 dicevano *«referral immediato,
  non-referred in approvazione»* e *«`member` non e' `approved`: sono due assi
  diversi»*. **`CLAUDE.md` si carica su OGNI risposta**, quindi la sua riga falsa
  e' esattamente il difetto che il piano esiste per chiudere, moltiplicato.
- **Fix:** due paragrafi riscritti, nessun altro. **La tabella del Domain Module
  Index non e' stata toccata** — l'indice deve restare coerente coi frontmatter,
  e il controllo B di `verify:persona` lo misura: verde.
- **Commit:** `f711034`

### 2. `[Nessuna deviazione]` Il pendente del 2026-09-09

Due file modificati e non committati trovati all'inizio: erano lavoro di
un'altra data con la sua voce di changelog gia' scritta. Committati **per primi e
da soli** (`66aca0f`), come il perimetro di questa esecuzione prescriveva.

### 3. `[Regola 2 — Correttezza]` Due gate di politica convertiti invece che cancellati

- **Questione:** *il tempo di attesa e' una promessa* e *un rifiuto e' una
  comunicazione, non uno stato* nominavano entrambi meccanismi che non esistono
  piu'. Cancellarli sarebbe stata la lettura letterale del piano (*«cadono le
  righe che descrivono come il prodotto esegue oggi»*); ma il **ragionamento** dei
  due gate non e' meccanico, e sopravvive.
- **Fix:** convertiti in **vincoli su cio' che si costruira'**. Un dominio senza
  `rejected` non e' un dominio senza rifiuti.
- **Commit:** `f711034`

---

## Known Stubs

Nessuno. Questo piano non ha scritto una riga di `src/`: `git diff --stat` sui
tre commit tocca solo `CLAUDE.md`, `.claude/**` e `.planning/**`.

## Threat Flags

Nessuna superficie di sicurezza nuova. Le mitigazioni che il piano nominava,
esercitate:

| Threat ID | Esito |
|---|---|
| `T-50-59` — un gate che ordina un controllo su una colonna inesistente | **mitigato**: gate due assi sostituito, `verify:persona` dopo e non prima |
| `T-50-60` — una correzione piu' larga del necessario su `meta-gates.md` | **mitigato**: una riga; guardie monotone 3 → 3, riportate |
| `T-50-61` — un VERIFICATION che dichiara verificato cio' che non e' stato eseguito | **mitigato**: 32 citazioni `file:riga`, zero *«i test passano»*, esiti citati da `50-ESITI.md` |
| `T-50-62` — REG-05 chiusa da un grep allargato fino a essere vuoto | **mitigato**: perimetro **accanto** al comando, catalogo su due database come prova autorevole, falso positivo nominato in anticipo |
| `T-50-63` — materiale di produzione pubblicato | **mitigato**: controllo F verde |
| `T-50-SC` — install di pacchetti | **senza soggetti**: nessun pacchetto installato |

## Gate

| Gate | Esito |
|---|---|
| `npm run verify:persona` | **7/7 verdi**, lanciato dopo la cancellazione e dopo la produzione |
| controllo **F** | **verde** — `docs/`, `.firecrawl/` ignorati e non tracciati |
| `npm run verify` | **`VERIFY_FAIL — 2`**, rilanciato oggi: `verify:venue-surfaces` (`G2`) e `verify:touch-targets`, **entrambi preesistenti**, entrambi con la loro voce differita, **nessuna soglia allargata** |
| `npm run build` | **non rilanciato**: zero righe di `src/` toccate da questo piano |

## Self-Check: PASSED

- `.claude/rules/access-gating.md` — FOUND · `gate due assi` 0 · `has_capability` 3 · `2026-09-21` 2 · `paths:` byte-identico
- `.claude/rules/meta-gates.md` — FOUND · `pending` 0 · guardie monotone 3 = 3
- `.claude/rules/community-membership.md` — FOUND · `deleted` 1 · gate di politica 3
- `.claude/CHANGELOG.md` — FOUND · `[1.22.0] - 2026-09-21` in testa
- `.planning/phases/50-via-le-iscrizioni/50-VERIFICATION.md` — FOUND · 32 citazioni · 6 requisiti
- commit `66aca0f`, `f711034`, `cc28124` — tutti e tre FOUND in `git log`
