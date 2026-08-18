---
phase: 42-scanner-conversion
document: ambiente di laboratorio per il door pass
created: 2026-08-18
status: allestito e misurato fedele; nessuna procedura eseguita
---

# Il laboratorio della porta

> **Cosa c'e' qui:** come e' fatto l'ambiente usa-e-getta, che cosa e' stato
> misurato per dire che e' fedele, che cosa permette di eseguire e **che cosa non
> permettera' mai**.
>
> **Cosa NON c'e' qui:** il ref del progetto, le chiavi e la password degli
> account di prova. Stanno in `.env.lab.local` e `.env.lab.seed.json`, che
> `.gitignore` copre alla riga 34 (`.env*`). Questo repository e' pubblico.

## Perche' esiste

Nove delle dieci procedure di `42-PROCEDURES.md` e le sezioni §1…§8 di
`39-DOOR-PASS.md` chiedono la stessa cosa: **una serata, un account con
`door.operate` per quella serata, e un codice valido da scansionare.**

In produzione quelle righe non esistono — zero serate future pubblicate, zero
biglietti — e crearle sarebbe **P6**, una scrittura in produzione, che ha bisogno
di un'autorizzazione fresca del proprietario. Il precedente e' registrato:
uno script di verifica ha cancellato **63 righe su sette tabelle**, e questo
progetto non ha PITR.

Lo stesso ambiente serve anche alle 88 voci `human_needed` sparse su dodici
verifiche di fase, che sono tutte della stessa specie: *nessuno strumento di
questo repository puo' autenticarsi come un ruolo.* In un ambiente usa-e-getta
gli account li creiamo noi, quindi quel muro cade.

## Com'e' costruito

| | |
|---|---|
| Progetto | secondo progetto Supabase nella stessa organizzazione, regione `eu-west-1`, piano free |
| Schema | `supabase/schema.sql` seguito dalle 67 migration, applicate dall'endpoint migrations della Management API |
| Credenziali | `.env.lab.local` — ignorato da git |
| Semina e rimozione | `scripts/seed-lab-door.mjs` |

### Il bootstrap non e' pulito, e la ragione e' un fatto sul repo

**Questo repository non ha un percorso funzionante per creare un database da
zero.** Misurato il 2026-08-18 provandolo:

1. Partendo dalle sole migration, la prima fallisce: `relation "public.profiles"
   does not exist`. Le tabelle base nascono in `schema.sql`.
2. Partendo da `schema.sql`, fallisce anche quello: alla riga 490
   `discount_codes.party_id` **referenzia `event_parties`**, che nasce nella
   migration `20260225150000_party_architecture.sql`. Un riferimento in avanti.
3. Applicando `schema.sql` e poi le migration, **cinque migration collidono**
   perche' `schema.sql` e' l'istantanea di uno stato successivo e ha gia' i loro
   oggetti.

Il percorso che ha funzionato, e che e' quello da rifare:

1. `schema.sql` **senza** la chiave esterna della riga 490;
2. le 67 migration, tollerando **solo** gli errori di oggetto duplicato e
   registrandone ognuno — cinque saltate;
3. la chiave esterna della riga 490, rimessa;
4. le **due colonne** e la **funzione** che la migration saltata dei codici
   sconto avrebbe portato: `tickets.discount_code_id`,
   `pending_purchases.discount_code_id`, e l'overload di `reserve_ticket` con
   `p_discount_code_id`.

Il punto 4 non e' stato dedotto dalla procedura: **la procedura sembrava
riuscita.** Lo ha trovato il confronto dei cataloghi contro la produzione, che e'
la ragione per cui quel confronto esiste.

### La prova che il laboratorio e' fedele

Non e' che il bootstrap sia andato a buon fine — quello descrive cio' che e'
stato fatto. E' che i **cataloghi concordano con la produzione**, che descrive
cio' che c'e'. Nove confronti, tutti in sola lettura su entrambi i progetti,
2026-08-18:

| Catalogo | Produzione | Laboratorio | |
|---|---|---|---|
| tabelle | 37 | 37 | identici |
| colonne | 446 | 446 | identici |
| policy RLS | 93 | 93 | identici |
| tabelle con RLS attiva | 37 | 37 | identici |
| trigger | 15 | 15 | identici |
| funzioni, **per firma** | 32 | 32 | identici |
| vincoli | 234 | 234 | identici |
| indici | 125 | 125 | identici |
| etichette enum | 46 | 46 | identici |

> **Il confronto per firma non e' pedanteria.** Confrontando i soli *nomi* delle
> funzioni il risultato era «identici» con 32 contro 31: la produzione ha un
> **overload** di `reserve_ticket` che il laboratorio non aveva. Un confronto per
> nome avrebbe certificato fedele un ambiente in cui il percorso del denaro
> risolveva a una funzione diversa.

## Che cosa permette, e che cosa no

**Diventano eseguibili in laboratorio** — con due telefoni e un browser, senza
toccare la produzione:

- `39-DOOR-PASS.md` §1 (gli indirizzi, i codici di risposta, la voce di
  navigazione), §3 (canale mai stabilito), §4 (canale caduto), §5 (Slow 3G), §6
  (due dispositivi), §7 (chi non e' assegnato non sente nulla)
- `42-PROCEDURES.md` righe 1h, 1i, 2d, 3o, 3p, 3q, 3r, 3s
- Le voci `human_needed` delle fasi 34, 35, 37, 43 che chiedono soltanto una
  sessione di ruolo

**Restano fuori dalla portata di qualunque ambiente:**

- **§8, la stanza buia.** Luminosita' minima, una mano sola, camera ferma,
  modalita' aereo, lancio dall'icona. Non c'e' niente da leggere: c'e' da
  guardare uno schermo al buio.
- **§2, la tasca.** Sessantacinque minuti, telefono vero, in tasca.
- **La riga 3m.** Non e' questione di ambiente: e' permanentemente non
  eseguibile, perche' lo scanner non convertito che doveva misurare non esiste
  piu' (`DEF-42-04`).
- **Il service worker della produzione.** Il laboratorio ha la sua origine,
  quindi le sue cache. Misura il *comportamento* delle regole `NetworkFirst`
  24h/32 voci, non lo stato caldo della cache di produzione.

## La sessione di ruolo, misurata

E' la cosa che il laboratorio esiste per rendere possibile, ed e' stata
esercitata il 2026-08-18 con login veri contro la chiave anonima:

| account | login | `event_parties` | `party_assignments` | `tickets` |
|---|---|---|---|---|
| staff assegnato alla porta | OK | 1 | **1** | 0 |
| membro approvato con biglietto | OK | 1 | 0 | **1** |
| membro in attesa | OK | 1 | 0 | 0 |
| master | OK | 1 | 1 | 1 |
| **anonimo, senza sessione** | — | — | **0** | — |

Ognuno vede il proprio e nient'altro; l'anonimo non vede le assegnazioni. E'
il confine che dodici documenti di verifica dichiarano non misurabile.

## Le regole della rimozione, che qui sono codice

`scripts/seed-lab-door.mjs` porta le quattro regole dell'incidente:

1. la chiave primaria si **cattura alla creazione** e finisce su disco prima del
   passo successivo;
2. la rimozione avviene **per chiave primaria**, mai per titolo o etichetta;
3. l'insieme delle cascate si **enumera da `pg_constraint`** — `--cascade` lo
   stampa senza cancellare niente: **98 vincoli, 33 tabelle raggiungibili**;
4. la conferma si chiede a una **fonte diversa**: si cancella via SQL e si
   riconta via PostgREST.

E una quinta, che vale prima di tutte: lo script **si rifiuta di partire** se il
ref e' quello di produzione, e il rifiuto e' la prima riga eseguita. Provato
puntandocelo: exit 2, nessuna lettura, nessuna scrittura.

`--reset` esiste e cancella tutto con selettori larghi. E' ammissibile **solo
qui**, e solo perche' quel rifiuto rende impossibile puntarlo altrove: e'
l'ambiente a essere usa-e-getta, non il metodo.

## Quanto costa tenerlo

Un progetto Supabase in piu' sul piano free. Se resta inattivo viene sospeso, e
un ripristino lo rimette in piedi con i suoi dati. **Quando non serve piu' va
cancellato**: e' un ambiente che contiene account con password note, e un
ambiente dimenticato e' una superficie che nessuno guarda.
