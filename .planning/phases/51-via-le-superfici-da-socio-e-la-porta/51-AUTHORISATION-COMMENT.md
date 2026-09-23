---
phase: 51-via-le-superfici-da-socio-e-la-porta
document: autorizzazione a scrivere in produzione — la migration di solo COMMENT di WR-05, la sesta del progetto
written: 2026-09-23
granted: yes
granted_date: 2026-09-23
granted_by: il proprietario
scope: una migration, `20260923120000_role_capabilities_comment.sql`, dall'endpoint migrations, con rilettura del commento e della versione dal catalogo
answer: "Si', applica oggi"
status: ESAURITA
exhausted: "2026-09-23T11:01:44Z"
---

# Autorizzazione a scrivere in produzione — 2026-09-23, il COMMENT di WR-05

`ai-engineering.md`, gate *l'autorizzazione a scrivere in produzione e' un atto,
non un permesso*: si consuma una volta, copre cio' che e' stato descritto, e chi
la riceve dichiara quando l'ha usata e quando l'ha esaurita. Le cinque
precedenti sono ESAURITE e lo dichiarano da se'.

## 1. Il perimetro, e non un byte oltre

| # | Passo | Che cosa tocca, alla lettera |
|---|---|---|
| **(a)** | `POST /v1/projects/{ref}/database/migrations` con il file `20260923120000_role_capabilities_comment.sql` | **un solo** `COMMENT ON TABLE private.role_capabilities` — scrive in `pg_description`. Zero righe di dati, zero privilegi, zero policy, zero colonne |
| **(b)** | la rilettura, `read_only` | `obj_description('private.role_capabilities'::regclass)` porta «15 a master, 13 a organizer»; `schema_migrations` porta la versione coniata; le concessioni restano **28** (15 + 13) |

**Fuori perimetro:** qualunque altra scrittura. **Reversibile:** un `COMMENT` si
riscrive con un altro `COMMENT`.

**Provata sul laboratorio** lo stesso giorno, prima di chiedere: versione
`20260923105525`, commento riletto dal catalogo con i numeri giusti.

## 2. La domanda, alla lettera — e la risposta

> «WR-05 in produzione: la migration scrive SOLO un `COMMENT ON TABLE` su
> `private.role_capabilities`: zero righe, zero privilegi, zero policy.
> Applicata sul laboratorio e riletta. Autorizzi l'applicazione in produzione,
> oggi 2026-09-23, dall'endpoint migrations, con rilettura del commento dal
> catalogo?»

Risposta del proprietario, letterale: **«Si', applica oggi»**.

## 3. Registro d'uso

| # | Passo | Eseguito (UTC) | Riletto dal catalogo (`read_only`, come `supabase_read_only_user`) | Esito |
|---|---|---|---|---|
| (a) | `POST …/database/migrations`, `role_capabilities_comment` | **11:01:43.630Z → 11:01:44.032Z** (402 ms), HTTP 200 | versione coniata **`20260923110143`**, sopra `20260922192024` | **ESEGUITO** |
| (b) | la rilettura | 11:01:44Z | `obj_description` → «28 righe: **15** a master, **13** a organizer, ZERO a staff e ZERO ad attendee (la migration del 2026-09-22 scriveva 16 e 14 …)»; concessioni **prima e dopo identiche**: master 15, organizer 13 — **28** | **ESEGUITO** |

Lo strumento che ha applicato ha letto **questo documento** prima di partire e
rifiuta con uscita 2 se `granted` non e' `yes`, se la data non e' oggi o se lo
stato e' gia' `ESAURITA`.

## 4. Chiusura

# ⚠ ESAURITA — 2026-09-23T11:01:44Z

Un passo su uno, zero righe di dati toccate, zero privilegi, zero policy.

> **Da qui in poi questo documento non autorizza piu' niente.**
