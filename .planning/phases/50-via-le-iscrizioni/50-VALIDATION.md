---
phase: 50
slug: via-le-iscrizioni
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-21
updated: 2026-09-21
---

# Phase 50 — Validation Strategy

> Il contratto di verifica di questa fase, derivato da `50-RESEARCH.md`
> §Validation Architecture. **La prima riga e' un fatto d'ambiente che domina
> tutto il resto.**

---

## Il fatto che viene prima di ogni tabella

**Non esiste un test runner per il prodotto.** `package.json:5-45` non ha
script `test` e non esiste alcun file `*.test.*` o `*.spec.*` (riverificato il
2026-09-21). **Nessun task di questa fase puo' chiudersi perche' «i test
passano»**, e nessun piano ne dichiara uno.

| Proprieta' | Valore |
|---|---|
| Framework di test | **nessuno** |
| Typecheck | `npm run build` — `next build` **e'** il gate dei tipi (`package.json:8`) |
| Gate strutturali | `npm run verify` (`scripts/verify-all.mjs`) |
| Gate delle rotte | `npm run verify:routes` — censisce `page.tsx` dal disco |
| Gate delle capability | `npm run verify:capabilities` — si rompe se `ROLE_GRANTS` / `EXPECTED_PAIR_COUNT` (`:645`, oggi 68) non sono aggiornati nel commit della migration |
| Gate della conversione | `npm run verify:conversion` — si rompe se `/register` resta in `conversion-manifest.mjs:574` |
| Gate della persona | `npm run verify:persona` — **dopo** la cancellazione delle superfici, mai prima |
| Gate dell'identita' negli header | `npm run verify:no-header-identity` — pinna la `delete` di `x-user-status` |
| Ambiente di prova | **laboratorio permanente** (`lab.resonatemotion.com`, `npm run dev:lab`). Ogni script rifiuta il ref di produzione come prima riga eseguita. **Il lab va in pausa dopo una settimana senza traffico: riattivarlo dal Management API prima delle prove** (successo il 2026-09-21) |
| Durata | `npm run build` domina (~1-2 min); i grep e le query di catalogo sono istantanei |

**Un verde non dice «e' corretto»: dice «e' coerente».**

---

## Frequenza di campionamento

- **Dopo ogni task:** `npm run build` + i grep dichiarati negli
  `acceptance_criteria` del task.
- **Dopo ogni onda:** `npm run build` + `npm run verify`. Sull'onda che tocca
  le capability anche `npm run verify:capabilities`; su quella che cancella
  superfici anche `npm run verify:routes` e `npm run verify:conversion`; se si
  tocca `.claude/**`, `npm run verify:persona` **dopo** la cancellazione.
- **Prima della chiusura:** tutti verdi **piu' le otto procedure percorse sul
  laboratorio** e riportate in `50-VERIFICATION.md` con evidenza `file:riga`.
- **Latenza massima di feedback:** la durata di `npm run build`.

---

## Mappa requisito → verifica

| Req | Comportamento | Tipo | Comando / procedura |
|---|---|---|---|
| REG-01 | `/register` risponde 404 da anonimo e da loggato; nessun link vi rimanda (sei rimandi + `next.config.ts:66` + `manifest.json`) | manuale + statico | `P-50-1`; grep + `verify:routes` + `verify:conversion` |
| REG-02 | nessun oggetto di database nomina `profiles.status` | **catalogo** | le tre query di `50-RESEARCH.md` §1.5(a) su laboratorio e produzione, risultato incollato nel VERIFICATION |
| REG-02 | nessun sorgente nomina i suoi simboli | statico | il grep di §1.5(b), **con il perimetro scritto accanto** (`status` resta il nome di colonne su altre sette tabelle) |
| REG-03 | `referred_by` e `approved_via` non esistono; nessuna superficie mostra un referral | catalogo + statico | `information_schema.columns` + grep su `CopyReferralLink`, `referred_by`, `approved_via` |
| REG-04 | un anonimo non crea un account **nemmeno con la chiave anonima** | **manuale** | `P-50-5` |
| REG-04 | i tre percorsi di servizio creano ancora account | **manuale** | `P-50-6`, `P-50-2`, `P-50-7` |
| REG-05 | la lista del debito e' vuota | catalogo | §1.5(a), risultato nel VERIFICATION |
| REG-06 | una prenotazione gratuita produce N biglietti, una mail, un account e passa la porta | **manuale** | `P-50-7`, `P-50-8` |
| REG-06 | rigiocare la stessa azione non conia biglietti nuovi | **manuale** | `P-50-7` passo 4 |
| D-50-02 | gli account cancellati non esistono piu' e il registro li ricorda | catalogo | conteggi prima/dopo di §4.3 + `select * from membership_acts where act = 'deleted'` |
| D-50-03 | un `member` non carica media, un organizer si' | **manuale** | `P-50-4` |
| D-50-12 | `/` rimanda a `/events` per tutti | **manuale** | `P-50-1` |
| D-50-16 | cancellare un account con biglietti o tracce di lavoro **rifiuta con la causa** | **manuale** | `P-50-3` |
| D-50-18b | `Full name` e mail su entrambi i moduli; il nome sta nell'account, mai su `holder_label` | manuale + catalogo | `P-50-7` + lettura di `profiles.full_name` e `tickets.holder_label` |

---

## Le otto procedure manuali — laboratorio, mai produzione

| # | Procedura | Ruolo | Cosa si deve osservare |
|---|---|---|---|
| **P-50-1** | superfici | anonimo, poi `member`, poi organizer | `/register` → **404** su tutti e tre, anche da un browser che aveva seguito `/registrati`. `/` → `/events` su tutti e tre, **compreso chi e' loggato**. `/login` raggiungibile dalla voce Account. Nessun «Sign up» su `/login`, `SecretVenueDialog`, `GuestLoginBanner` |
| **P-50-2** | la migration, sul laboratorio | — | conteggi di §4.3 **prima**; applicazione via Management API; rilettura **dal catalogo** (`information_schema.columns`, `pg_policies`, `pg_proc`, `pg_constraint`); le tre query di §1.5(a) a zero; `rsvps` contate |
| **P-50-3** | cancellazione di un account seminato `pending` | master | utente Auth e profilo spariscono; la riga di `membership_acts` resta con `act = 'deleted'` e `subject_id` nullo; un account con una scansione della porta o un biglietto **rifiuta con la sua causa**, non con un messaggio generico |
| **P-50-4** | media | `member` leggero, poi organizer, poi staff con assegnazione | il membro non vede il controllo e, forzando l'azione, riceve un rifiuto nominato. L'organizer carica. Lo staff assegnato carica sulla sua serata e non su un'altra |
| **P-50-5** | signup spento | anonimo, `curl` con la chiave anonima | `POST /auth/v1/signup` → **422 `signup_disabled`**. E' la prova che il prodotto non puo' dare da solo |
| **P-50-6** | creazione in-app | master | `createAccount` crea, manda l'invito e restituisce il codice di membership **con il signup spento** |
| **P-50-7** | l'ordine gratuito, dal principio | anonimo su una serata `free_rsvp` seminata con tier a zero | ordine a totale zero, N biglietti, **una** mail con QR e link firmato, un account leggero con `full_name`; rigiocare non conia biglietti nuovi; il tetto rifiuta; la capienza rifiuta; `sumup_checkout_id` **nullo**; `holder_label` senza nome |
| **P-50-8** | la porta, **con la radio spenta** | staff, telefono in modalita' aereo | un biglietto gratuito passa lo scanner come uno pagato; la coda offline lo accetta e lo sincronizza |

---

## Lacune dell'onda 0

- [ ] `scripts/seed-lab-door.mjs:176-180` — le persone `pending`/`rejected`
      vanno tolte **prima** di riseminare.
- [ ] `scripts/seed-lab-door.mjs` — serve una serata `free_rsvp` **con il suo
      tier a zero**: senza, `P-50-7` non e' eseguibile.
- [ ] `scripts/container/seed.mjs` — quattro delle nove persone diventano
      irrappresentabili: aggiornare nella stessa onda della migration.
- [ ] `scripts/verify-capabilities.mjs` — `ROLE_GRANTS` e `EXPECTED_PAIR_COUNT`
      nel commit della migration.
- [ ] `scripts/conversion-manifest.mjs:574` — la riga `/register`.
- [ ] Nessun conteggio di riga e' mai stato preso: **`P-50-2` e' anche la
      prima misura**, e i suoi numeri vanno nell'autorizzazione prima di
      toccare la produzione.

---

## Validation Sign-Off

- [ ] Ogni task ha un `acceptance_criteria` verificabile (build, grep, query di
      catalogo, o procedura manuale nominata)
- [ ] Nessuna sequenza di tre task senza un gate automatico eseguito
- [ ] L'onda 0 copre le sei lacune
- [ ] Nessun flag watch-mode
- [ ] `nyquist_compliant: true` in frontmatter

**Approvazione:** pending
