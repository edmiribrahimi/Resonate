---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 18
subsystem: accesso (pagina Account, creazione account)
tags: [nav-05, gap-closure, lessico-ruoli, zero-fallimenti-silenziosi, laboratorio]
requires:
  - "52-14: i difetti 2 e 3 con evidenza in 52-ESITI.md"
provides:
  - "Account: ROLE_LABEL Record<UserRole, string>, esaustivo sui quattro ruoli; riga «{ruolo} since …»"
  - "createAccount: etichetta address_refused dai codici validation_failed / email_address_invalid, con voce propria in NOTICES"
affects:
  - "52-19 e poi 52-15: il difetto 2 e il difetto 3 non bloccano piu' la strada della produzione"
tech-stack:
  added: []
  patterns:
    - "mappa Record<Union, …> come prova di esaustivita' al typecheck (gia' usata da NOTICES, ora anche per l'etichetta del ruolo)"
key-files:
  created:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-18-SUMMARY.md
  modified:
    - src/app/(members)/account/page.tsx
    - src/app/(admin)/admin/members/actions.ts
    - src/app/(admin)/admin/members/CreateAccountForm.tsx
decisions:
  - "Nessun controllo stringa sul punto finale nei controlli d'ingresso: l'autenticazione resta l'autorita' sull'indirizzo, la risposta si traduce in address_refused invece che in un secondo validatore"
  - "Il fallback su «Attendee» senza riga di profilo resta, coerente con isAttendeeRole, che non e' stato toccato"
metrics:
  duration: "~20 min"
  completed: 2026-09-23
  tasks: 3
  files: 3
---

# Fase 52 Piano 18: l'etichetta dello staff e l'avviso sull'indirizzo, Summary

Uno `staff` che apre Account ora legge **«Staff»** nel badge e **«Staff since
September 2026»** sotto, non più «Attendee». Un indirizzo che l'autenticazione
rifiuta come malformato (il punto finale lasciato dalla tastiera iOS) ora produce
**«That address was refused as not valid»**, non più «The write failed». Nulla
viene creato e nulla viene inviato. Entrambe le cose sono state provate sul
laboratorio.

## Task

| Task | Cosa | Commit |
|---|---|---|
| 1 | `ROLE_LABEL: Record<UserRole, string>` (master «Admin», organizer «Organizer», staff «Staff», attendee «Attendee»); `attendeeSince` diventa `accountSince`; la riga dice `{roleLabel} since …`; il fallback del nome segue il ruolo | `9aa3c4f1` |
| 2 | `address_refused` nell'unione `CreateAccountFailure` (docblock «Twelve causes»), ramo `validation_failed` / `email_address_invalid` con log `[members.address_refused]` che registra solo codice e status; voce `NOTICES.address_refused`; `write_failed` invariato | `b227f054` |
| 3 | Prova sul laboratorio (nessun file del repo) | — |

## Verifica

Il prodotto non ha test automatici, quindi non si dichiara nessun «i test
passano». Sono stati eseguiti questi controlli:

- `npm run build`: exit 0 dopo ciascun task. Il typecheck conferma che `NOTICES`
  ha una voce per ogni etichetta e che `ROLE_LABEL` copre ogni `UserRole`.
- `npm run verify:touch-targets`: exit 0. `npm run verify:conversion`: exit 0.
- Grep del piano, tutti verdi:
  - `Record<UserRole, string>` = 1;
  - le quattro chiavi sono presenti;
  - zero `Attendee since` e zero `attendeeSince`;
  - `isAttendeeRole` è byte-identico;
  - il ternario `: "Attendee";` non esiste più;
  - `"address_refused"` compare 2 volte o più in `actions.ts`;
  - `validation_failed` e `email_address_invalid` sono nel ramo `authError`;
  - `address_refused:` compare 1 volta in `CreateAccountForm.tsx`;
  - `title: "The write failed"` è ancora presente e il diff non tocca la sua voce;
  - nessuna riga contiene insieme `address_refused` e `${email}`;
  - il controllo d'ingresso `if (!email || !email.includes("@") || email.includes(" "))` è invariato.

### Prova sul laboratorio: 2026-09-23, `npm run dev:lab`, Chrome headless via CDP a 390 px

Il dev server ha rifiutato la produzione per costruzione ed è partito sulla 3001,
letta dal log. La password del banco è stata passata al browser dall'ambiente e
non compare in nessun file.

**Prova 1 (difetto 2):** per ogni account del banco, accesso e poi apertura di
`/account`. Il testo è stato letto da `document.body.innerText`.

| Ora UTC | Ruolo | Badge | Riga «since» | «Attendee» nella pagina |
|---|---|---|---|---|
| 17:48:38 | staff | «Staff» | «Staff since September 2026» | **0** |
| 17:48:51 | master | «Admin» | «Admin since September 2026» | 0 |
| 17:49:04 | attendee | «Attendee» | «Attendee since September 2026» | 3 (badge e riga, più una terza occorrenza non attribuita: per questo ruolo la parola è giusta) |

**Prova 2 (difetto 3):** come master su `/admin/members`, «Create an account»,
indirizzo del banco con il **punto finale**, un nome, ruolo `staff`, «Create and
invite» (invio alle 17:49:27Z).

- Sullo schermo compare il titolo **«That address was refused as not valid»**
  con il corpo «… No account was created and no message was sent …». «The write
  failed» non compare.
- Nel log del dev server c'è questa riga, senza l'indirizzo:
  `[members.address_refused] createAccount: auth code=validation_failed status=400`.
  Il prefisso dell'indirizzo di prova compare **0** volte nel log. Il codice
  misurato (`validation_failed`) è uno dei due riconosciuti, quindi non serve
  un'altra correzione.
- Account contati prima e dopo, con la chiave di servizio del laboratorio e con
  il rifiuto del ref di produzione come prima istruzione:

| Ora UTC | Profili | Utenti auth | Per ruolo | Account con l'indirizzo di prova |
|---|---|---|---|---|
| 17:47:47 (prima) | 11 | 11 | master 1 · organizer 1 · staff 3 · attendee 6 | 0 |
| 17:49:30 (dopo) | 11 | 11 | master 1 · organizer 1 · staff 3 · attendee 6 | 0 |

Il numero di account è identico prima e dopo: il tentativo non ha creato nulla.
Il dev server e Chrome sono stati chiusi alla fine.

## Deviazioni dal piano

**1. [Regola 3, bloccante] Cast di `profile.role` per indicizzare `ROLE_LABEL`**
- **Trovato durante:** Task 1
- **Problema:** `profile` torna non tipizzato (`any`) dalla `select`, quindi
  `ROLE_LABEL[profile?.role ?? "attendee"]` falliva il typecheck («implicitly has
  an 'any' type»).
- **Correzione:** `ROLE_LABEL[(profile?.role as UserRole | null | undefined) ?? "attendee"]`,
  lo stesso cast che la pagina usa già più in basso (`role as UserRole | null`).
  I valori a runtime sono vincolati dal database agli stessi quattro ruoli.
- **Commit:** `9aa3c4f1`

**Attribuzione nei commit:** i commit portano la riga `Co-Authored-By` indicata
dall'ambiente di esecuzione, non quella indicata nel prompt dell'orchestratore.

## Known Stubs

Nessuno.

## Threat Flags

Nessuna superficie nuova. T-52-80: il log registra solo codice e status,
verificato sul log vero. T-52-82: `isAttendeeRole`, le query e le policy non
sono toccati.

## Self-Check: PASSED

- I tre file di prodotto e questo SUMMARY esistono.
- I commit `9aa3c4f1` e `b227f054` sono presenti in `git log`.
