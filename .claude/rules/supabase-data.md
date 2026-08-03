---
paths:
  - "supabase/**"
  - "src/types/database.ts"
---

# Supabase & Data — Operational Gates

## Before Touching

migration, policy RLS, schema, tipi generati
-> presentare l'analisi d'impatto su: policy esistenti sulla stessa tabella,
`src/types/database.ts`, query gia' scritte, e cosa succede alle righe che
esistono gia'.

## Dove vive davvero lo schema

`supabase/schema.sql` contiene **zero** `ENABLE ROW LEVEL SECURITY` e **zero**
`CREATE POLICY`. Tutta la sicurezza a livello di riga vive nelle migration sotto
`supabase/migrations/` — sei file la abilitano, e le policy sono decine.

**Leggere solo `schema.sql` e concluderne che la RLS non c'e' e' un errore
facile e grave.** Le migration sono la fonte di verita'.

## Quality Gates

- **Gate migration in avanti**: Una migration gia' applicata in produzione non si modifica: se ne scrive un'altra. Il file con il timestamp e' un fatto storico.
- **Gate idempotenza DDL**: Le migration usano `IF NOT EXISTS` / `IF EXISTS` (convenzione gia' presente nel repo). Una migration che fallisce alla seconda esecuzione blocca un deploy in un momento scomodo.
- **Gate RLS contestuale**: Aggiungere una policy a una tabella che ne ha gia' significa **sommare** permessi: in Postgres le policy `PERMISSIVE` sono in OR. Prima di aggiungerne una, leggi quelle esistenti: la nuova puo' aprire piu' di quanto intendi.
- **Gate tabella nuova = policy nuova**: Nessuna tabella con dati non pubblici creata senza RLS abilitata e almeno una policy, nella **stessa** migration. Una tabella senza RLS e' leggibile da chiunque abbia la chiave anonima.
- **Gate tipi allineati**: Ogni cambio di schema si riflette in `src/types/database.ts` nello stesso commit. Un tipo che mente e' peggio di un tipo assente, perche' il compilatore conferma un errore.
- **Gate default sulle righe esistenti**: Aggiungere una colonna `NOT NULL` o con default a una tabella popolata cambia righe che gia' esistono. Dichiara esplicitamente cosa succede a quelle righe — soprattutto se la colonna governa un accesso o una rivelazione.
- **Gate indici sulle colonne di lookup**: Ogni colonna usata per cercare una singola riga (codici di membership, codici sconto, id di biglietto) ha un indice. Alla porta, una query lenta e' una fila.
- **Gate no dato sensibile in colonna pubblica**: Prima di aggiungere una colonna a una tabella con policy di lettura pubblica, verifica che il suo contenuto possa essere pubblico. L'indirizzo di un venue segreto in una tabella leggibile da tutti annulla `venue-secrecy.md`.

## Imperative Behaviors

- When changing an applied migration: don't — write a new one
- When writing DDL: use IF NOT EXISTS / IF EXISTS
- When adding a policy: read the existing ones first — PERMISSIVE policies are OR'd
- When creating a table with non-public data: enable RLS and add a policy in the same migration
- When changing the schema: update src/types/database.ts in the same commit
- When adding a column to a populated table: state explicitly what happens to existing rows
- When adding a lookup column: add its index
- When adding a column to a publicly-readable table: verify its content may be public
