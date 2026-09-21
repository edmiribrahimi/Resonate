# Phase 50: Via le iscrizioni - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-21
**Phase:** 50-via-le-iscrizioni
**Areas discussed:** Lo stato nel database, Chi entra ancora, Referral e trigger, Cosa vede chi cerca di iscriversi, Revoca, RSVP, Produzione, Newsletter

---

## Lo stato nel database

| Option | Description | Selected |
|--------|-------------|----------|
| Via del tutto | Colonna, get_user_status, requires_approved e policy in una migration provata sul laboratorio | ✓ |
| Resta, solo approved | Vincolo ristretto, colonna come debito REG-05 | |

**User's choice:** Via del tutto.

| Option | Description | Selected |
|--------|-------------|----------|
| Diventano account normali | Un account serve solo a comprare | |
| Pending e rejected cancellati | Utenti Auth e profili via, dopo conteggio | ✓ |
| Contiamo prima, poi decidi | | |

**User's choice:** cancellati.

| Option | Description | Selected |
|--------|-------------|----------|
| Ogni account loggato, come oggi meno lo stato | auth.uid() non nullo | |
| Solo organizer e staff | Il caricamento dei membri sparisce ora | ✓ |

**User's choice:** solo organizer e staff.

---

## Chi entra ancora

| Option | Description | Selected |
|--------|-------------|----------|
| Quattro ruoli piu' l'account leggero, ruolo member | REG-04 riscritto, nessun ruolo nuovo | ✓ |
| Un ruolo nuovo per chi compra | Backlog | |

| Option | Description | Selected |
|--------|-------------|----------|
| Signup pubblico spento su produzione e laboratorio | Passo manuale datato nel runbook | ✓ |
| Solo la pagina | Il percorso resta aperto via API | |

| Option | Description | Selected |
|--------|-------------|----------|
| Resta: account leggero, come chi compra | | ✓ |
| Solo il biglietto, nessun account | | |

---

## Referral e trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Via colonna e logica | Trigger solo per il profilo; membership_code resta alla 51 | ✓ |
| Via la logica, la colonna resta come storico | | |

| Option | Description | Selected |
|--------|-------------|----------|
| approved_via via con lo stato | | ✓ |
| Resta | | |

| Option | Description | Selected |
|--------|-------------|----------|
| members/growth via in questa fase | | ✓ |
| Resta, senza referral e stato | | |

---

## Cosa vede chi cerca di iscriversi

| Option | Description | Selected |
|--------|-------------|----------|
| 404 | La pagina non esiste | ✓ (con nota) |
| Rimando al login | | |
| Rimando alla lista delle serate | | |

**User's choice (testuale):** «possiamo togliere del tutto la pagina register e tutto cio' che rimanda a quella pagina? la home page attuale non deve piu' esistere, la nuova home page dovra' essere la pagina degli eventi. dove mettiamo il login di staff organizer master e admin?»

| Option | Description | Selected |
|--------|-------------|----------|
| Home: See events / Login: «Bought a ticket? Use the link in your email» | | ✓ |
| Home: pulsante via / Login: riga via | | |
| Decidi tu | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Via tutte e quattro le mail | | ✓ |
| Resta member-reactivated | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard: solo biglietti e token drink | | ✓ |
| Decidi tu | | |

Follow-up sulla home:

| Option | Description | Selected |
|--------|-------------|----------|
| / rimanda a /events, la pagina attuale sparisce | Anche per chi e' loggato; impatto su NAV-01 | ✓ |
| Le serate si spostano su /, /events rimanda a / | | |

| Option | Description | Selected |
|--------|-------------|----------|
| /login resta, dalla voce Account della barra | | ✓ |
| /login solo per indirizzo | | |
| Link «Staff» a fondo pagina | | |

---

## Revoca dell'accesso

| Option | Description | Selected |
|--------|-------------|----------|
| Si cancella l'account | Nessun nuovo interruttore | (scelta di Claude) |
| Ban in Supabase Auth, profilo resta | Cancello nuovo su un altro asse | |
| Decidi tu | | ✓ |

**User's choice:** «Decidi tu». Claude ha scelto la cancellazione dell'account (D-50-16).

---

## RSVP

| Option | Description | Selected |
|--------|-------------|----------|
| RSVP solo per chi ha un account; l'anonimo senza pulsante | | |
| Via il tipo free_rsvp | | |
| Un RSVP con la sola mail, come l'acquisto | Capacita' nuova | |

**User's choice (testuale):** «rsvp dev'essere come comprare un ticket, utente mette nome e cognome e mail (come su compra ticket), gli arriva una mail con qr code per accedere alla serata. insomma dev'essere uguale a comprare un ticket ma senza acquisto».

| Option | Description | Selected |
|--------|-------------|----------|
| Fase propria, subito dopo la 50 | | |
| Dentro la 50, oggi | | ✓ |

**Notes:** aggiunto come REG-06 al ROADMAP.

---

## Produzione

| Option | Description | Selected |
|--------|-------------|----------|
| Oggi, dopo la prova sul laboratorio, con autorizzazione datata | | ✓ |
| Codice oggi, migration dopo il listing | | |

## Newsletter

| Option | Description | Selected |
|--------|-------------|----------|
| Resta | Mailing list, non account | ✓ |
| Via anche lei | | |

---

## Claude's Discretion

- Revoca dell'accesso → cancellazione dell'account.
- Forma tecnica dell'ordine gratuito (`sumup_checkout_id`), storico di `rsvps`, testi in inglese, ordine dei piani.

## Deferred Ideas

- Ruolo `customer` per chi compra.
- NAV-01 (fase 52): la voce Home della barra.
- Strumento per correggere la mail di un ordine fallito e rigiocarlo.
