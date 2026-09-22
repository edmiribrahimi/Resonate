/**
 * The register's vocabulary, named once.
 *
 * This module is the source. It imports nothing — not even `@/types/database`,
 * which imports *from here* — for the same reason `@/lib/door/outcome` and
 * `@/lib/capabilities/keys` import nothing: a file that is the source of a
 * literal cannot depend on a file that consumes it without making the direction
 * of truth ambiguous.
 *
 * ── The two sides are edited in ONE commit ───────────────────────────────────
 *
 * Both unions below are mirrored by SQL `CHECK` constraints on
 * `public.account_acts`
 * (`supabase/migrations/20260808002000_membership_register.sql`, section 2 —
 * and, for `AccountAct`, the CURRENT constraint is the one re-declared by
 * `supabase/migrations/20260809002000_assignment_acts.sql`, section 1, which
 * dropped the seven-value form and added the nine-value one).
 * They were written once here and copied there. **Editing either side means
 * editing both, in the same commit.**
 *
 * ── IL RINOMINO DELLA FASE 51 NON HA ROTTO LO SPECCHIO ───────────────────────
 *
 * Il registro, questo modulo e i due tipi portavano il nome del vecchio
 * modello — quello in cui un account era una tessera — e la fase 51 li ha
 * portati tutti su `account` (D-51-08). **I nomi vecchi non si scrivono qui**,
 * nemmeno per spiegare il passaggio: una ricerca per nome deve trovare i
 * lettori veri, non la nota che ne racconta l'uscita.
 *
 * Cambia **il nome**, non l'insieme: il `CHECK` che specchia i dieci valori
 * qui sotto cambia la **tabella** su cui vive — `ALTER TABLE … RENAME TO
 * account_acts`, piano 51-12 — e **non cambia un solo letterale**. Scritto
 * perche' la regola dell'unico commit qui sopra non venga letta come violata:
 * un commit che rinomina non e' un commit che modifica un insieme.
 *
 * Chi invece trovasse il codice e lo schema in disaccordo sui NOMI sta
 * guardando una finestra dichiarata: **il codice prima (piano 51-11), la
 * migration dopo (piano 51-12)**, e finche' dura la creazione di un account
 * fallisce perche' chiama una funzione che ancora non si chiama cosi'. In
 * produzione i due passi stanno dentro un solo atto autorizzato, uno dopo
 * l'altro (piano 51-13).
 *
 * Why that rule is stated rather than assumed: a divergence between the table
 * and the code does not fail loudly. Adding `'suspended'` here and not there
 * produces a value TypeScript accepts everywhere and the database refuses with a
 * `23514` — at the moment somebody performs the act, not at build time. Adding
 * it there and not here produces the opposite: a row the register holds and no
 * reader in this repository can name, which survives until somebody opens the
 * history looking for an act that, as far as the code is concerned, never
 * landed.
 *
 * The mirror is real but ASYMMETRIC, exactly as `outcome.ts:16-21` describes its
 * own: `npm run build` catches the TypeScript half, the `CHECK` catches the SQL
 * half, and nothing at all compares the two. No Supabase client in this
 * repository is parameterised with `Database`
 * (`src/lib/supabase/client.ts:4`, `server.ts:7`, `middleware.ts:15`,
 * `service.ts:4`), so the `.rpc("record_account_act", …)` call that writes
 * these values is untyped end to end.
 */

/**
 * What was done to an account's role or status, or to what it may do on one
 * night.
 *
 * **Dieci valori**, mirrored by the `act` CHECK on `public.account_acts`
 * (widened from seven by
 * `supabase/migrations/20260809002000_assignment_acts.sql`, section 1, and da
 * nove a dieci da `20260921120000_drop_status_and_referral.sql`).
 *
 * ── `deleted`, e i quattro che restano nel vocabolario senza avere un autore ─
 *
 * `deleted` e' l'atto della fase 50 (D-50-16): togliere l'accesso a qualcuno
 * significa cancellare il suo account, e una cancellazione lascia la sua riga.
 * E' l'unico atto il cui soggetto **non esiste piu'** quando lo si legge:
 * `account_acts.subject_id` va a `NULL` per costruzione
 * (`ON DELETE SET NULL`), e cio' che resta a nominarlo e' `subject_label` —
 * mai un indirizzo e mai un nome.
 *
 * **Cosa porta `subject_label` dipende da quando la riga e' stata scritta**, e
 * la pagina del registro lo mostra e basta: le righe storiche portano il codice
 * socio gia' emesso, le righe nuove le **prime 8 cifre dell'identificativo del
 * soggetto** (D-51-15, scritto dalla funzione SQL nella stessa migration che
 * toglie la colonna — piano 51-12). Nessuna riga si riscrive: il registro e'
 * append-only, e due etichette diverse su due stagioni diverse sono la storia,
 * non un'incoerenza.
 *
 * `approved`, `rejected`, `deactivated` e `reactivated` **restano nell'unione e
 * nessuno li scrive piu'**: l'asse dello stato che muovevano e' uscito dallo
 * schema con la stessa migration (D-50-01). Non si tolgono perche' le righe
 * storiche li portano, e il registro e' append-only: un'unione che non sapesse
 * nominare una riga esistente renderebbe illeggibile la storia che il registro
 * esiste per conservare. Sono valori da LEGGERE, non piu' da scrivere.
 *
 * `rejected` and `deactivated` are two values and not one although they are the
 * SAME write today — `{status: 'rejected', role: 'member'}` — because they are
 * performed for two different reasons: one refuses an application, the other
 * withdraws an access that had been granted. A register that cannot tell them
 * apart cannot be read a season later, which is the only thing it is for.
 *
 * `assigned` and `unassigned` LANDED with phase 35, and they are the two acts
 * of the per-night assignment — read as *Assigned to a night* and *Assignment
 * revoked*. They are the only two values that carry `party_id`.
 *
 * An assignment moves neither the role nor the status axis, and a reader should
 * expect to see that as `role_before === role_after` and
 * `status_before === status_after` — **not** as nulls. Measured against a
 * container: `public.record_account_act` computes the after-values as
 * `coalesce(argument, before)`, so passing null for both axes writes the
 * subject's current role and status on each side rather than leaving the
 * columns empty. The useful consequence is that the `assigned` act preserves
 * the role its holder held at the grant — the one fact
 * `party_assignments.assignee_role` is nulled out of when the assignment is
 * revoked.
 *
 * They are also the only two written by a function other than
 * `public.record_account_act` directly: `public.record_party_assignment_act`
 * delegates to it, in the same transaction as the row it is recording, so a
 * mutation cannot succeed while its record fails.
 *
 * A door override still does NOT enter here: it stays in `door_scan_events`.
 * D-18 was REWRITTEN rather than widened when the two values above arrived, and
 * the criterion is in
 * `COMMENT ON COLUMN public.account_acts.party_id` — **admitting a person is
 * not granting a power.** An override admits; an assignment grants.
 */
export type AccountAct =
  | "created"
  | "approved"
  | "rejected"
  | "promoted"
  | "demoted"
  | "deactivated"
  | "reactivated"
  | "assigned"
  | "unassigned"
  | "deleted";

/**
 * Who performed the act — D-22.
 *
 * `'system'` exists because D-16's reconciliation-driven demotion has no human
 * author, and the alternative to naming that fact is a nullable actor, which is
 * the unattributed act D-11 forbids. The table refuses both dishonest
 * combinations: a `'user'` act with no actor, and a `'system'` act that carries
 * one.
 */
export type AccountActorKind = "user" | "system";
