// The one import in this file, and the direction is inverted on purpose. The
// door's contract is shared by three places at once — the wire, the client and
// the `door_scan_events` table — so it is defined once in `@/lib/door/outcome`,
// which imports nothing, and is read from here. Re-declaring the literals would
// mean a divergence between the table and the response could survive until a
// night; importing them makes it a `npm run build` error, which in a repository
// with no test runner is the only automatic gate there is.
import type {
  DoorSubjectType,
  DoorScanOutcomeKind,
  DoorScanCause,
  DoorScanSource,
} from "@/lib/door/outcome";
// The second import, same inverted direction and the same reason. The nine
// capability keys are shared by a policy body, a catalogue row and every
// TypeScript caller, so they are defined once in `@/lib/capabilities/keys`,
// which imports nothing, and are read from here.
import type { CapabilityKey } from "@/lib/capabilities/keys";
// La quinta importazione, stessa direzione invertita e stessa ragione. Il
// vocabolario chiuso delle categorie di messaggio e quello degli esiti di
// consegna sono condivisi da un `CHECK` in SQL, dal mittente, dal cron di
// riconciliazione e dalla superficie admin, quindi vivono una volta sola in
// `@/lib/email-delivery/categories`, che non importa niente, e si leggono da
// qui.
import type {
  DeliveryOutcome,
  EmailCategory,
} from "@/lib/email-delivery/categories";
// The third import, same inverted direction. The register's two vocabularies are
// shared by a SQL `CHECK`, a stored procedure's arguments and every TypeScript
// caller, so they are defined once in `@/lib/account/acts`, which imports
// nothing, and are read from here.
import type { AccountAct, AccountActorKind } from "@/lib/account/acts";
// The fourth import, same inverted direction and the same reason as the three
// above. The authored section's two vocabularies are shared by a SQL `CHECK`
// and every TypeScript caller, so they are defined once in
// `@/lib/production/sections/vocabulary` and are read from here.
//
// On 2026-10-14 this block lost two imports from the production calendar's
// modules and most of this one's names: the calendar, Location and the visual
// archive left the code with their pages (CUT-01, D-53-02, D-53-04), and their
// vocabularies left with them. What remains is what the manifesto reads.
import type {
  SectionKind,
  SectionState,
} from "@/lib/production/sections/vocabulary";

// `staff` is the fourth role (phase 43, D-01), and the measured consequence of
// adding it here is the opposite of what a reader expects: **this widening
// produces no new build errors.** Seventeen of the twenty-one sites that
// enumerate a role write `role as UserRole` on a value read from the database,
// and a cast tells the compiler to stop checking — so the switches, the
// filters and the badge maps that now need a fourth branch are invisible to
// `npm run build`. The only compile-detectable site is `updateMemberRole`'s
// parameter type (`src/app/(admin)/admin/members/actions.ts:113-115`), widened
// deliberately by plan 43-09.
//
// The list to walk is `43-RESEARCH.md` § G.1; plan 43-14 walks its interface
// half. Do not read a green build as evidence that the four-role model is
// wired — it is evidence of the casts.
export type UserRole = "master" | "organizer" | "staff" | "attendee";
// ── Il quarto valore si chiamava `member` fino alla fase 51 (D-51-06) ────────
//
// E' cambiato il nome, non l'insieme: i ruoli restano quattro e il quarto e'
// sempre quello di chi partecipa — compra un biglietto o e' invitato. Non
// `guest`, che alla porta e nella coda offline nomina gia' l'invitato in lista;
// non `buyer`, falso per chi entra da guest list senza pagare.
//
// **Questo tipo e' uno specchio, e uno specchio ha due facce.** Il vincolo
// `profiles_role_check` dichiara accanto a se' di rispecchiare `UserRole`
// (`20260808000500_staff_role.sql:79-94`): o i due si muovono insieme, o il
// database rifiuta con `23514` cio' che il compilatore ha accettato. La faccia
// SQL e' gia' passata — migration
// `20260922120000_role_attendee_and_capability_keys` (piano 51-08), applicata
// al laboratorio e in coda per la produzione col piano 51-13, e il verso del
// deploy e' **codice prima, migration subito dopo**.
//
// E vale qui l'avvertimento scritto sopra per `staff`: i siti che scrivono
// `role as UserRole` su un valore letto dal database non producono alcun errore
// di build. Un verde non prova che il nome nuovo sia arrivato ovunque — prova
// che i cast sono ancora al loro posto.
// ── L'unione dei tre valori dello stato stava qui (fase 50, D-50-01) ─────────
//
// `"pending" | "approved" | "rejected"`, accanto ai quattro ruoli come se i due
// assi fossero pari. **Non lo sono piu': ne resta uno solo.** Il tipo e' caduto
// per ultimo nella fase, e non e' un dettaglio d'ordine: era letto da tutta
// l'onda precedente, e toglierlo prima avrebbe reso rosso ogni build intermedio
// — in un repository dove il compilatore e' l'unico controllo automatico che
// esiste.
//
// ── Due tipi di serata, dal 2026-10-13 (fase 52.4, D-52.4-01) ───────────────
//
// Specchio del CHECK `event_parties_access_type_check` della migration
// `20261013150000_mixed_tiers_entry_until.sql`, che accetta solo
// `'free_public', 'paid'`. Il terzo valore — la serata su RSVP — e' uscito quel
// giorno: il gratuito e' ora un tier a 0 € su una serata con biglietti, e le
// righe storiche di quel tipo sono state migrate a `paid` dalla stessa
// migration. Il letterale non sta piu' in `src/` nemmeno in un commento.
export type AccessType = "free_public" | "paid";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  // Qui stava anche il codice socio (fase 51, D-51-02), e non e' uscito perche'
  // dava fastidio: e' una credenziale che nessuna porta verifica piu'. Le due
  // superfici che la mostravano e la rotta che la confrontava sono cadute coi
  // piani 51-04 e 51-05; la colonna cade col piano 51-12. **Il suo nome non si
  // ricopia qui**, per la ragione che `roles.ts` scrive accanto alla propria
  // rimozione: una prosa che lo nomina tiene rosso il grep che prova la
  // cancellazione.
  //
  // Qui stavano tre campi, e sono usciti insieme alle tre colonne che
  // descrivevano (fase 50): lo stato di approvazione (D-50-01) e le due del
  // referral — chi ha invitato e per quale via si e' entrati (D-50-01, REG-03).
  //
  // **Un'interfaccia che descrive colonne che non esistono e' peggio di
  // un'interfaccia assente**, perche' nessun client di questo repository e'
  // parametrizzato con un generico `Database`: il compilatore non confronta
  // questi campi con lo schema, quindi una riga di troppo qui non e' un errore,
  // e' un invito a scrivere una `select` che il database rifiuta con `42703`.
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  venue_secret: boolean;
  lineup: string[];
  cover_image: string | null;
  is_published: boolean;
  early_access_until: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * The catalogue of formats and of series — phase 36, plan 06 (FMT-01, FMT-05),
 * mirroring `supabase/migrations/20260810120000_formats_and_series.sql` §1 and §2.
 *
 * ── The honest limit, stated again here because this is where it will bite ────
 *
 * **None of the four Supabase clients is parameterised with `Database`**
 * (`src/lib/supabase/client.ts:4`, `server.ts:7`, `middleware.ts:211`,
 * `service.ts:4`), and this file declares no `Database` type at all. So the two
 * interfaces below are DOCUMENTATION AND NOT ENFORCEMENT: a `.select()` naming
 * `format_di` compiles, runs, and returns `undefined` — on a surface, with
 * nothing logged, in a repository with no error tracking (`meta-gates.md`).
 *
 * The sentence is not new — `AccountActRow` and `EventMediaRow` each carry
 * their own copy, for their own columns (a third copy left with the interface
 * of the dropped `attendances` table on 2026-09-23). It is repeated here
 * because it is the reason **every later plan in this
 * phase verifies its queries by RUNNING them and not by compiling them**, and a
 * reader who arrives at `Format` from the migration rather than from one of
 * those three would otherwise not meet it. It is recorded in
 * `.planning/STATE.md` as well.
 *
 * `supabase-data.md`, gate *tipi allineati*, is still a hard requirement. It
 * just buys less than it looks like it does.
 */
export interface Format {
  id: string;
  /**
   * The address: `/events?format=<slug>` (D-36-15). It travels inside a link
   * somebody may have sent to somebody else, so changing it breaks that link.
   */
  slug: string;
  /**
   * The string a visitor reads, stored verbatim — `re:sonate` with a normal e,
   * `SunSet` / `RamaDub` / `MotionLab` in CamelCase. No surface derives it from
   * the slug or from the code: FMT-05 says the label comes from the data.
   */
  name: string;
  /** Internal (`RSNT`, `SNST`, `RMDB`, `MTNLB`). Never a public surface alone. */
  code: string;
  /**
   * The identification colour, `#RRGGBB`, constrained by
   * `formats_color_hex_check`. In the data and not in a component (D-36-12), so
   * changing one needs no deploy — and because Tailwind cannot generate a class
   * from a runtime value, it reaches the DOM through an inline `style`.
   */
  color: string;
  /**
   * *A person has decided this may be seen.* NOT the same question as
   * `retired_at`, which says *no new night may be assigned to this* (D-36-17).
   * The public read policy `formats_select_listed` asks this column.
   */
  listed: boolean;
  /** Retirement is not deletion (D-36-10). `null` means active. */
  retired_at: string | null;
  /** Display order only. Freely rewritable — unlike `EventParty.number`. */
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One numbered run of one format. The SERIES carries the counter, never the
 * format: a format that visits several venues has one series per venue and the
 * progressivo restarts inside each (D-36-07).
 *
 * `name` is **the one string in this phase that publishes** — it may contain a
 * venue, which is why `public.party_series` is readable only through a
 * published night (`venue-acquisition.md`, gate *uno spazio non acquisito non
 * si nomina*; migration §4b).
 */
export interface PartySeries {
  id: string;
  format_id: string;
  /** The public name, verbatim. Same spelling rules as `Format.name`. */
  name: string;
  /** Internal (`BZ`, `MR`, `PRLN`, `RSNT`, `SNST`). Never public alone. */
  code: string;
  /** `null` means active. */
  retired_at: string | null;
  /**
   * The water level: the highest progressivo this series has ever handed out.
   * **Not** the count of its nights and **not** `max(number)` — the trigger
   * `event_parties_bump_series_watermark` raises it with `GREATEST`, so a
   * deleted night cannot lower it and a number already on a poster is never
   * proposed twice (`meta-gates.md`, monotone guard 3).
   */
  highest_assigned: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventParty {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  end_time: string | null;
  menu_closes_at: string | null;
  venue_text: string | null;
  access_type: AccessType;
  capacity: number | null;
  venue_id: string | null;
  lineup: string[];
  venue_secret: boolean;
  venue_secret_hint: string | null;
  venue_reveal_hours: number | null;
  /**
   * WHEN this night's address was let out BY HAND, or NULL if it never was.
   * `20260810160000_manual_venue_reveal.sql` §2, applied to production
   * 2026-08-10 as version `20260810210214`.
   *
   * ── IT IS NOT `venue_reveal_email_sent` UNDER A NEW NAME ────────────────────
   *
   * The two answer different questions, and the migration carries this same
   * sentence as a `COMMENT` so neither copy can drift alone.
   * `venue_reveal_email_sent` says **the mails have gone out** — a one-way
   * switch that NO branch of `public.record_venue_reveal_act` touches. This
   * column says **the page is open**, and the `re_hidden` act (D-37-22, master
   * only) sets it back to NULL.
   *
   * That asymmetry is the point, not an oversight: a night can return to secret
   * ON THE PAGE while the mails stay sent, which is the only honest pair of
   * states once an address has left. Lowering the mail flag instead would send
   * the cron to post the address a second time.
   *
   * NULL is the right value for every row that existed before this column —
   * none of them was revealed by hand, because there was no way to do it. The
   * column is nullable with no `DEFAULT` (`supabase-data.md`, gate *default
   * sulle righe esistenti*), and zero rows carried a value at the moment it was
   * added.
   *
   * The scheduled path never writes here: `src/app/api/cron/venue-reveal/`
   * marks `venue_reveal_email_sent` and nothing else. So a NULL means *nobody
   * pressed the button*, never *this night was not revealed*.
   *
   * NOTE, and it will bite the next reader: this interface does NOT declare
   * `venue_reveal_on_purchase` or `venue_reveal_email_sent`, both of which exist
   * on the table. That gap predates this column and is recorded in
   * `deferred-items.md`; do not read their absence here as their absence there.
   */
  venue_revealed_at: string | null;
  /**
   * WHAT THIS NIGHT IS, and WHICH RUN of it. Both `NOT NULL` after
   * `20260810120000_formats_and_series.sql` §9 — FMT-01: a night cannot be
   * saved without saying what format it is. Neither carries a database default,
   * deliberately: a constant default would write the same format onto every
   * night that any path forgot to set (§3).
   *
   * They cannot contradict each other. `event_parties_series_format_fk` points
   * at `party_series (id, format_id)`, so a night whose format disagrees with
   * the format of its own series is **not writable** — there is nothing to
   * reconcile because the contradiction cannot be stored.
   */
  format_id: string;
  series_id: string;
  /**
   * The progressivo of this night inside its series.
   *
   * **NULLABLE ON PURPOSE, and the plan for this file said otherwise.** The
   * migration sets `NOT NULL` on `format_id` and `series_id` only (§9); §9a
   * argues `number` at length and the column carries the same sentence as a
   * `COMMENT`. A night that is an ACT of another night — the first act of a
   * double bill — carries that night's format and that night's series and **no
   * number of its own**, because the code and the number COMPOSE a sigla and an
   * act has no sigla. One such row exists in production today.
   *
   * Typing this `number` would be a type that lies, and a type that lies is
   * worse than no type: the compiler would confirm an assumption the database
   * refuses. Do not tighten it here, and do not tighten the column.
   *
   * Uniqueness still holds: `event_parties_format_series_number_unique` refuses
   * two nights sharing the triple, and in Postgres two `NULL`s are DISTINCT —
   * so two numberless acts are not a duplicate. That is the correct reading and
   * not a hole.
   */
  number: number | null;
  /**
   * Quanti biglietti puo' contenere **un ordine** su questa serata —
   * `20260905120000_ticket_orders.sql` §6, `NOT NULL DEFAULT 6`.
   *
   * **PER ORDINE E NON PER PERSONA**, e la distinzione va letta: sei ordini da
   * sei sono trentasei biglietti, e nulla lo impedisce. E' il perimetro
   * dichiarato di BUY-02, non un difetto — ma un perimetro non dichiarato e'
   * indistinguibile da un buco, e «tetto» si legge come «limite per persona» se
   * nessuno scrive il contrario.
   *
   * `NOT NULL` con default e non nullabile con un `coalesce` nel codice: e' la
   * forma di `refund_request_window_hours`, non quella di `venue_reveal_hours`,
   * il cui `coalesce(..., 25)` vive in due posti. Una casa sola per il numero.
   *
   * Il tetto e' autoritativo dentro `public.reserve_ticket_order`, dentro la
   * transazione. La UI e l'azione lo controllano in modo **consultivo**: due
   * richieste in volo passano un controllo di UI e non passano quello della RPC.
   */
  max_tickets_per_order: number;
  /** Chi vende i biglietti quando non siamo noi; valorizzato = serata venduta altrove. Migration 20261013120000. */
  external_tickets_seller: string | null;
  /** Link unico dell'evento dal venditore, https; NULL = «Tickets soon». */
  external_tickets_url: string | null;
  /** Testo del bottone in uscita; NULL = «Get tickets». */
  external_tickets_label: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RSVP {
  id: string;
  event_id: string;
  party_id: string;
  user_id: string;
  reminder_sent: boolean;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

// ── An interface describing a table that no longer exists came out here ──────
//
// `public.attendances` was dropped by
// `20260922180000_drop_membership_code_and_rename_acts.sql` (phase 51, D-51-14),
// read back from production as `to_regclass → null`. Its interface survived
// that commit with zero importers, and since no Supabase client in this
// repository is parameterised with `Database`, a type for a table that is not
// there is an invitation to write a query that compiles and answers `42P01` at
// run time (phase 51 review, WR-08). Removed on 2026-09-23. The lexicon it
// carried — *entry_role is what the entry WAS, taken at the door* — lives on in
// `door_scan_events`, which is where a presence is recorded now.

// ── `EventMediaRow` and its alias `EventMedia` stood here ─────────────────────
//
// Removed on 2026-10-02 with the event gallery (DBT-13, D-52.1-17): their
// readers — the gallery, the night's media page, the upload actions — left in
// the same commit. The table `public.event_media` and the `event-media` bucket
// still exist in the database until the schema is closed after the deploy
// (plan 52.1-25); a type for a table no code reads is an invitation to write a
// query against it — the same reason the `attendances` interface left above (WR-08).

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export interface TicketTier {
  id: string;
  event_id: string;
  party_id: string | null;
  name: string;
  /**
   * Cosa include il livello (`20260924100000_tier_description.sql`). Copy
   * pubblica, letta prima dell'acquisto: mai un posto (venue-secrecy).
   */
  description: string | null;
  price: number;
  quantity: number | null;
  /**
   * Posizione nella lista della serata (`party_id`; nullo = Event Pass
   * dell'evento), decisa da chi la gestisce (DBT-18, D-52.1-23,
   * `20261001120000_tier_sort_order.sql`). Si cambia solo con la RPC
   * `reorder_ticket_tiers(p_event_id, p_party_id, p_tier_ids) -> integer`,
   * che salva la lista intera o rifiuta (`reorder.stale_list`,
   * `reorder.partial`). I lettori ordinano per `sort_order, price, created_at`.
   */
  sort_order: number;
  show_remaining: boolean;
  /** Esaurito a mano: vince su quantita', date e conteggi. Migration 20261013120000. */
  sold_out: boolean;
  /**
   * Ora limite d'ingresso del tier, ora di Torino `HH:MM:SS` come la
   * restituisce Postgres (`time`). Un'ora < 12 cade la mattina dopo la data
   * della serata. NULL = nessun limite. L'istante si calcola SOLO con
   * `entryUntilInstant` di `src/utils/datetime.ts`, mai a mano.
   * Migration 20261013150000 (fase 52.4, D-52.4-05).
   */
  entry_until: string | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountCode {
  id: string;
  party_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_amount: number;
  max_uses: number | null;
  is_active: boolean;
  /** Omaggio mostrato alla porta (es. «1 chupito»); obbligatorio se discount_amount = 0. Migration 20261005120000. */
  benefit: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountCodeTier {
  discount_code_id: string;
  tier_id: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  party_id: string | null;
  tier_id: string | null;
  user_id: string;
  sumup_checkout_id: string | null;
  sumup_transaction_code: string | null;
  amount_paid: number;
  ticket_type: 'purchased' | 'guest_list';
  discount_code_id: string | null;
  reminder_sent: boolean;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  /**
   * L'ordine da cui questo biglietto e' nato — `20260905120000_ticket_orders.sql`
   * §4 — o `null` se e' nato dal percorso con sessione, che non conosce questa
   * colonna.
   *
   * **Non e' solo un puntatore: e' il discrimine di due indici unici.** I due
   * indici parziali `tickets_party_user_unique` e
   * `tickets_event_user_master_unique` sono stati ricreati con
   * `AND order_id IS NULL`, quindi vincolano il percorso vecchio e non il nuovo.
   * Un biglietto con `order_id` valorizzato puo' condividere `(party_id,
   * user_id)` con altri cinque; uno con `order_id` nullo no. Chi scrive qui
   * direttamente sta scegliendo quale delle due regole si applica.
   *
   * `ON DELETE SET NULL` e non `CASCADE`: cancellare un ordine non cancella i
   * biglietti pagati.
   */
  order_id: string | null;
  /**
   * Come questo biglietto si distingue dagli altri dello stesso ordine — la
   * forma e' `«2 di 6»`.
   *
   * **NON E' UN NOME, e non deve diventarlo.** D-49-03: il biglietto e' al
   * portatore, ed e' il caso progettato — «sei e' un gruppo di amici con un solo
   * pagante» significa che cinque biglietti su sei stanno in mano a qualcun
   * altro. Un nome sullo schermo dello staff produce uno di due danni: si
   * rifiuta un ospite valido davanti a una fila, oppure lo staff impara a
   * ignorare il campo e il campo diventa teatro.
   */
  holder_label: string | null;
  /**
   * Come questo biglietto e' stato acquisito.
   *
   * `null` significa **«scritto prima che questa colonna esistesse»**, mai
   * «acquisto ordinario». Nessun default e nessun backfill, per la ragione che
   * `20260808003000_attendances_entry_role.sql` scrive per esteso: l'unico
   * valore disponibile a un backfill sarebbe una supposizione di oggi scritta
   * dentro un fatto di ieri, e in un rapporto si leggerebbe come misurata.
   */
  issued_via: string | null;
}

/**
 * Un ordine di biglietti — `public.ticket_orders`, migration
 * `20260905120000_ticket_orders.sql`.
 *
 * **Un checkout SumUp, N biglietti.** La tabella esiste perche'
 * `tickets.sumup_checkout_id text UNIQUE` impediva a un solo pagamento di
 * produrre piu' di un biglietto, e quell'unicita' non era decorativa: era
 * l'idempotenza del pagamento. Qui non si allenta, si SPOSTA — su una tabella
 * che ha davvero un checkout solo. Stessa forma di {@link DrinkOrder}, che gira
 * gia' in produzione.
 */
export interface TicketOrder {
  id: string;
  event_id: string;
  party_id: string | null;
  tier_id: string;
  /**
   * **Nullabile apposta.** L'identita' dell'acquirente nasce al webhook, dopo la
   * verifica dell'incasso via GET: fra l'avvio del checkout e l'incasso
   * verificato l'ordine esiste e non ha proprietario. Dichiararlo non nullabile
   * costringerebbe a coniare un conto per ogni carrello abbandonato.
   */
  user_id: string | null;
  buyer_email: string;
  /**
   * Il nome raccolto dal modulo (D-50-18b), e sta **sull'ordine** per la stessa
   * ragione per cui {@link TicketOrder.user_id} e' nullabile: sul percorso
   * pagato l'account nasce al webhook, ore dopo il modulo. Senza una casa qui
   * il nome non arriverebbe mai a `profiles.full_name`, e il campo sul modulo
   * sarebbe teatro.
   *
   * **Il nome va all'account, MAI sul biglietto.** `holder_label` resta un
   * progressivo dentro l'ordine, il biglietto resta al portatore (D-49-03) e lo
   * schermo dello staff alla porta non mostra nomi.
   *
   * `null` significa «raccolto prima che questa colonna esistesse», mai
   * «anonimo»: nessun default, nessun riempimento.
   */
  buyer_name: string | null;
  /**
   * Quanti biglietti emette questo ordine. Il tetto e'
   * {@link EventParty.max_tickets_per_order}, applicato in modo autoritativo
   * dentro `public.reserve_ticket_order` — non da chi chiama.
   */
  quantity: number;
  /**
   * **`NULL` significa ordine a totale zero** — l'RSVP di una serata
   * su RSVP (tipo uscito il 2026-10-13, fase 52.4), o la prenotazione di un tier
   * a 0 €, che nessuno paga (REG-06, D-50-19). Mai «checkout perso»:
   * l'ordine pagato scrive questo campo prima di ogni altra cosa, all'apertura
   * del checkout.
   *
   * **E l'idempotenza del pagamento non si e' indebolita di un grado.**
   * `20260921120100_free_order.sql` ha sostituito il vincolo `UNIQUE NOT NULL`
   * con un indice unico **parziale** — `ticket_orders_sumup_checkout_id_key`,
   * `WHERE sumup_checkout_id IS NOT NULL` — che sulle righe che un checkout ce
   * l'hanno e' **esattamente lo stesso vincolo**: due consegne dello stesso
   * webhook continuano a scontrarsi nel database, non nel codice.
   *
   * **Non metterci un valore sintetico.** Un `free-<uuid>` supererebbe il
   * `continue` di `src/app/api/cron/reconcile-refunds/route.ts:105` e
   * manderebbe una richiesta a SumUp ogni giorno, per ogni biglietto gratuito
   * mai emesso, per un checkout che non esiste.
   */
  sumup_checkout_id: string | null;
  sumup_transaction_code: string | null;
  total_amount: number;
  discount_code_id: string | null;
  status: "pending" | "completed" | "failed" | "expired";
  error_message: string | null;
  /**
   * Perche' l'ordine si e' chiuso senza incasso — `20260930120000_ticket_orders_cart.sql`.
   * `never_attempted`: nessun pagamento tentato; `declined`: il fornitore ha
   * registrato un tentativo fallito. Una colonna propria invece di un terzo
   * significato dentro {@link TicketOrder.error_message}.
   *
   * `null` su un ordine `expired` significa «chiuso prima della colonna», mai
   * «causa assente».
   */
  closed_reason: "never_attempted" | "declined" | null;
  /** La parola del fornitore sulla chiusura (`FAILED`, `CANCELLED`), al massimo 64 caratteri. */
  closed_detail: string | null;
  /**
   * Quante volte il checkout e' stato riaperto. `NOT NULL DEFAULT 0`:
   * l'eccezione dichiarata alla regola «nessun default», perche' zero riprese
   * sulle righe nate prima della ripresa e' vero.
   */
  checkout_attempt: number;
  /** L'id del fornitore della mail di ripresa programmata (una sola per ordine). */
  resume_email_id: string | null;
  /**
   * Stato della mail di ripresa. `canceled` e' il percorso normale di un ordine
   * pagato in tempo. `null` = interruttore spento o ordine nato prima della
   * colonna.
   */
  resume_email_state:
    | "scheduled"
    | "canceled"
    | "sent"
    | "cancel_failed"
    | "skipped"
    | null;
  /** `null` = ordine nato prima della colonna, mai «sconosciuto» (quello e' `unknown`). */
  device: "mobile" | "desktop" | "unknown" | null;
  /** `null` = prima della colonna o non ancora pagato, mai «sconosciuto» (quello e' `other`). */
  payment_method: "apple_pay" | "google_pay" | "card" | "other" | null;
  /**
   * Da dove arriva chi compra — `20261001120300_order_entry_source.sql` §1.
   * Ridotto dal parametro `utm_source` del link d'ingresso; il grezzo non si
   * salva. `direct` = nessun parametro, `other` = non riconosciuto, `null` =
   * ordine nato prima della colonna, mai «sconosciuto».
   */
  entry_source: "instagram" | "newsletter" | "flyer" | "direct" | "other" | null;
  /**
   * Il passo in cui ci si ferma — §2. `not_opened` all'insert, `opened` dal
   * segnale firmato del modulo di pagamento (l'API di SumUp non lo sa).
   * `null` = ordine nato prima della colonna.
   */
  checkout_form: "not_opened" | "opened" | null;
  created_at: string;
  updated_at: string;
}

/**
 * Una riga del registro degli invii — `public.email_deliveries`, migration
 * `20260822130000_email_delivery_ledger.sql`.
 *
 * `category` e `outcome` NON sono ridichiarati qui come stringhe libere: sono
 * importati da `@/lib/email-delivery/categories`, che non importa niente, per la
 * stessa ragione invertita delle quattro importazioni in testa a questo file. Il
 * `CHECK` in migration e' invisibile a `tsc`, quindi una seconda copia delle
 * parole sarebbe una seconda verita' che nessuno confronta.
 *
 * **`recipient` non esiste, ed e' una decisione.** L'indirizzo del destinatario
 * non si conserva: e' gia' su `profiles` e si risolve da `user_id`. Vedi la
 * migration, sezione «cosa non c'e' qui dentro».
 */
export interface EmailDelivery {
  id: string;
  /** L'identificativo del fornitore: una presa in carico, non una consegna. */
  provider_message_id: string;
  category: EmailCategory;
  user_id: string | null;
  ticket_id: string | null;
  /**
   * La serata a cui l'invio appartiene, per i messaggi che ne hanno una.
   *
   * Esiste perche' `ticket_id` non basta ad attribuire una rivelazione del
   * venue: chi la riceve puo' non avere **nessun** biglietto (una prenotazione)
   * o averne **due** (quello della serata e quello di evento). Non porta
   * contenuto — vedi `20260822180000_email_ledger_night_paths.sql`.
   */
  party_id: string | null;
  outcome: DeliveryOutcome;
  /** La parola grezza del fornitore. Puo' valere `suppressed`, che l'unione di tipi dell'SDK 6.9.2 non contiene. */
  provider_last_event: string | null;
  check_attempts: number;
  checked_at: string | null;
  check_failure: string | null;
  created_at: string;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  instagram_url: string | null;
  soundcloud_url: string | null;
  spotify_url: string | null;
  website_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  address: string | null;
  google_maps_url: string | null;
  photo_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketRefund {
  id: string;
  /**
   * Nullable since 2026-08-05: the foreign key is now ON DELETE SET NULL, so
   * this goes to NULL when the refunded ticket is deleted. The correction is
   * the point of the change, not a side effect — read `refunded_ticket_id`
   * for which ticket it was.
   */
  ticket_id: string | null;
  requested_by: string;
  processed_by: string | null;
  reason: string | null;
  admin_note: string | null;
  amount: number;
  status: "pending" | "approved" | "rejected";
  sumup_status: "pending" | "completed" | "failed" | null;
  type: "user_request" | "admin_initiated";
  created_at: string;
  processed_at: string | null;
  // The refund's evidence. Deliberately not foreign keys in SQL, so that they
  // survive the ticket they name. On a row written before 2026-08-05 these are
  // NULL and mean *unknown*, never *none* — the tickets were already gone.
  refunded_ticket_id: string | null;
  refunded_party_id: string | null;
  refunded_event_id: string | null;
  refunded_at: string | null;
  /**
   * L'ordine del biglietto rimborsato — `20260930120100_ticket_refunds_order_notice.sql`.
   * Senza FK, scritto prima della cancellazione del biglietto. `null` su un
   * rimborso storico significa *sconosciuto*, non *nessuno*.
   */
  refunded_order_id: string | null;
  /**
   * L'id del fornitore della mail `ticket_refunded` che ha avvisato il
   * titolare. Il registro delle consegne non puo' dirlo da solo: il suo
   * `ticket_id` e' `ON DELETE CASCADE`. `null` su un rimborso storico =
   * sconosciuto.
   */
  notified_email_id: string | null;
}

export interface PendingPurchase {
  id: string;
  event_id: string;
  party_id: string | null;
  tier_id: string;
  user_id: string;
  sumup_checkout_id: string;
  status: "pending" | "completed" | "failed" | "expired";
  discount_code_id: string | null;
  ticket_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrinkItem {
  id: string;
  event_id: string;
  party_id: string | null;
  name: string;
  price: number;
  sort_order: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DrinkOrder {
  id: string;
  event_id: string;
  party_id: string | null;
  user_id: string | null;
  sumup_checkout_id: string;
  total_amount: number;
  status: "pending" | "completed" | "failed" | "expired";
  items: DrinkOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface DrinkOrderItem {
  drink_item_id: string;
  drink_name: string;
  price: number;
  quantity: number;
}

export type DrinkTokenStatus = "purchased" | "active" | "redeemed" | "refunded";

export interface DrinkToken {
  id: string;
  order_id: string;
  event_id: string;
  party_id: string | null;
  user_id: string | null;
  drink_item_id: string | null;
  drink_name: string;
  price: number;
  token: string;
  status: DrinkTokenStatus;
  /**
   * Quando il token e' stato attivato **l'ultima volta**.
   *
   * NON significa «e' attivo adesso»: dal 2026-08-19 (fase 47, `DRK-04`)
   * sopravvive all'annullamento. Per sapere se un token e' attivo si legge
   * `status`, che e' l'unica fonte che lo dice.
   */
  activated_at: string | null;
  /**
   * Quante volte questo token e' stato attivato, in tutta la sua vita.
   *
   * `null` = riga creata **prima** che si contasse: nessun dato. `0` = mai
   * attivato, **e lo sappiamo**. La distinzione decide chi puo' essere
   * rimborsato automaticamente (`DRK-05`): trattare un `null` come «mai
   * attivato» rimborserebbe da solo proprio i token su cui non sappiamo nulla.
   *
   * Non decresce: annullare non disfa un'attivazione, la chiude.
   */
  activation_count: number | null;
  redeemed_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

export type GuestListStatus = 'pending' | 'invited' | 'registered' | 'ticket_issued' | 'checked_in' | 'already_has_ticket' | 'failed';

export interface GuestListEntry {
  id: string;
  event_id: string;
  party_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  added_by: string;
  status: GuestListStatus;
  profile_id: string | null;
  ticket_id: string | null;
  error_message: string | null;
  // NULL means *not recorded*, including on a row already at 'checked_in':
  // the moment and the operator had nowhere to be written before 2026-08-05.
  // Read `status` for whether the guest was checked in.
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A single read at the door, and its outcome. Append-only.
 *
 * FIX-13: the subject is a ticket, an entry or a membership — never a person.
 * FIX-12: there is no field here holding a member's name or their address,
 * because the table has no such column; the copyable technical view renders
 * these fields straight and therefore cannot export personal data.
 * FIX-04a: `cause` is NULL on every row the scanner writes. Classification is
 * applied afterwards, over these rows, never at the phone.
 */
export interface DoorScanEvent {
  id: string;
  party_id: string;
  event_id: string;
  subject_type: DoorSubjectType;
  ticket_id: string | null;
  guest_entry_id: string | null;
  subject_user_id: string | null;
  outcome: DoorScanOutcomeKind;
  cause: DoorScanCause | null;
  scanned_at: string;
  recorded_at: string;
  operator_id: string;
  device_id: string;
  source: DoorScanSource;
  token_fingerprint: string | null;
  /** A reversal is a further event, not an erasure of the admission. */
  is_undo: boolean;
}

/**
 * One act on an account's role or status. Append-only.
 *
 * ── This interface protects NOTHING, and that has to be said here ────────────
 *
 * **No Supabase client in this repository is parameterised with `Database`**
 * (`src/lib/supabase/client.ts:4`, `server.ts:7`, `middleware.ts:15`,
 * `service.ts:4`), and this file declares no `Database` type at all. So the
 * column names below are checked by nothing at any call site: a `select` naming
 * `subject_lable` compiles, runs, and returns `undefined`. A reader who finds a
 * typed interface next to a table will assume the queries are being held to it,
 * and they are not — the interface documents the shape and satisfies
 * `supabase-data.md`'s gate *tipi allineati* in the same commit as the DDL.
 *
 * ── What IS enforced, on each side separately ────────────────────────────────
 *
 * `act` and `actor_kind` are the two unions of `@/lib/account/acts`, imported
 * rather than re-declared, and mirrored by SQL `CHECK` constraints on
 * `public.account_acts`. `npm run build` holds the TypeScript half; the
 * database refuses a row that disagrees with the SQL half. Nothing compares the
 * two, which is why that module states the one-commit rule.
 *
 * `role_before` / `role_after` / `status_before` / `status_after` are plain
 * `string`, deliberately, and NOT the current role union: they are evidence of
 * what was true then. Typing them to the current enumerations would make the
 * history of a retired role unrepresentable, and the migration refuses the same
 * thing on the SQL side by giving them no CHECK.
 *
 * ── I DUE CAMPI DELLO STATO RESTANO, E NON SONO UN RESIDUO (fase 50) ─────────
 *
 * La fase 50 ha tolto dal prodotto l'asse dell'approvazione: la colonna, il
 * tipo, i cancelli. **`status_before` e `status_after` non escono con loro**, e
 * la migration che li ha creati dice perche', in una frase che vale la pena
 * rileggere prima di cancellarli: *«una etichetta di stato memorizzata e' PROVA
 * DI CIO' CHE ERA VERO ALLORA, non un puntatore a cio' che e' vero adesso»*
 * (`20260808002000:224-243`).
 *
 * Le righe storiche che dicono `approved` o `rejected` **restano leggibili**, e
 * devono restarlo: il registro e' `append-only`, e la sua ragione di esistere e'
 * che una decisione presa su una persona si possa rileggere anni dopo. Dalle
 * righe nuove i due campi arrivano nulli — `record_account_act` accetta e
 * ignora il parametro, per non cambiare firma durante la finestra di deploy.
 *
 * **Chi fra sei mesi cerchera' residui di quell'asse li trovera' qui: sono
 * storia, non debito.**
 *
 * `subject_label` non e' MAI un indirizzo e non e' MAI un nome — questo
 * repository e' pubblico e una riga di registro finisce in un artefatto. Cosa
 * porta, invece, dipende da QUANDO la riga e' stata scritta: le righe storiche
 * portano il codice socio che la colonna `profiles.membership_code` emetteva,
 * le righe nuove le **prime 8 cifre di `subject_id`** (D-51-15), scritte dalla
 * funzione SQL nella stessa migration che toglie quella colonna e rinomina la
 * tabella (piano 51-12). Due etichette su due stagioni sono la storia di un
 * registro append-only, non un'incoerenza da sanare: nessuna riga si riscrive.
 */
export interface AccountActRow {
  id: string;
  act: AccountAct;
  /** NULL once the account is deleted. The act outlives its subject. */
  subject_id: string | null;
  /** L'etichetta durevole del soggetto, denormalizzata perche' la riga gli sopravviva. */
  subject_label: string;
  /** NULL for a `system` act, and only then — the table refuses the other three combinations. */
  actor_id: string | null;
  actor_kind: AccountActorKind;
  /**
   * `string | null` because the COLUMNS are nullable, not because any writer
   * produces a null: `public.record_account_act` computes all four itself and
   * **no act has ever left one empty** (measured against a container —
   * `deferred-items.md`, voce 6, still open and out of phase).
   *
   * So read *"this act did not move that axis"* as **`before === after`**, never
   * as a NULL. The NULL semantics documented at
   * `20260808002000_membership_register.sql:244-246` describes an intention the
   * writer never carried out; a reader who waits for a null waits for a value
   * that does not come. See {@link AccountActRow.party_id} for the case where
   * this matters most.
   */
  role_before: string | null;
  role_after: string | null;
  status_before: string | null;
  status_after: string | null;
  /** The server clock. A device clock is evidence, never authority. */
  at: string;
  /**
   * Which night the act was about. Phase 35 writes it, for the acts `'assigned'`
   * and `'unassigned'`; NULL on every act that is about the account itself.
   *
   * ── The four register columns on those two acts, MEASURED ──────────────────
   *
   * **They do NOT stay NULL, and the difference is the whole point.**
   * `public.record_account_act` computes the after-values itself, as
   * `coalesce(argument, before)`
   * (`20260808002000_membership_register.sql:459-460`), so an assignment act —
   * which passes NULL for both axes precisely so the writer skips its
   * `public.profiles` write — comes out with all four columns **non-null and
   * equal**: `role_before === role_after` and `status_before === status_after`.
   *
   * **`before === after` is how this register says an act did not move that
   * axis**, and for an assignment that is the true statement told in the shape
   * the writer actually produces. It is NOT the NULL that
   * `20260808002000_membership_register.sql:244-246` documents and that no
   * writer has ever produced — an open, out-of-phase debt
   * (`.planning/phases/35-per-night-assignments/deferred-items.md`, voce 6),
   * which names as its first reader exactly the surface that renders this
   * register.
   *
   * Where the measurement lives, so this comment is a citation and not a claim:
   * `supabase/migrations/20260809002000_assignment_acts.sql:423-430` — *«on an
   * assignment act all four come out NON-NULL and equal … Measured against a
   * container; the opposite was written here first, and was wrong»* — and
   * `src/lib/account/acts.ts:103-112`, which draws the useful consequence: the
   * `assigned` act preserves the role its holder carried at the grant, the one
   * fact `party_assignments.assignee_role` is nulled out of when the assignment
   * is retired.
   *
   * This paragraph said the opposite until 2026-08-09 (WR-08). `supabase-data.md`,
   * gate *tipi allineati*: a type that lies is worse than a type that is absent.
   * No compiler reads a doc comment — the reader does, and the reader would have
   * concluded «that axis was touched» from a value that means the opposite.
   */
  party_id: string | null;
  /** Optional context, never a person's name or an address. */
  note: string | null;
}

/**
 * The act vocabulary of `public.venue_reveal_acts` — **THREE human acts, and
 * not two.** Read from the live `CHECK`, which is the authority:
 * `act IN ('revealed', 'completed', 're_hidden')`.
 *
 * The plan for this file said two, `'revealed'` and `'re_hidden'`, and the plan
 * was wrong — `'completed'` is D-37-20's *send it to the N who are missing*. It
 * sets nothing on the night, and it is recorded ANYWAY, because it mails the
 * address to N more people and is therefore exactly as attributable as the
 * first act. A two-value vocabulary would make the second, third and fourth
 * send invisible while each of them is a publication.
 *
 *   `revealed`  — the address was let out for the first time. The only act that
 *                 sets {@link EventParty.venue_revealed_at}.
 *   `completed` — the remainder went out. Sets nothing on the night.
 *   `re_hidden` — D-37-22, master only. Clears `event_parties.venue_revealed_at`
 *                 so the page goes back to secret, and touches
 *                 `venue_reveal_email_sent` not at all: the mails do not come
 *                 back, and pretending they might is the one thing this act
 *                 must not do.
 *
 * ── WHERE THIS TYPE SHOULD EVENTUALLY LIVE, and what NOT to do ───────────────
 *
 * Three vocabularies in this file are imported from modules that import nothing
 * — the door's outcome, the capability keys, the register's acts — precisely so
 * that a `CHECK`, a stored procedure and every caller cannot disagree. This one
 * belongs in the reveal module that plan 37-10 will create, on the same
 * inverted-import pattern. It is declared here because that module does not
 * exist yet and a type that is absent is worse than a type in the wrong file.
 *
 * **The next reader MOVES it and re-exports; nobody re-declares it.** A second
 * copy of these three literals is exactly the drift the other three imports
 * exist to prevent.
 */
export type VenueRevealAct = "revealed" | "completed" | "re_hidden";

/**
 * A row of `public.venue_reveal_acts` — phase 37's append-only trace of an
 * address becoming public (`20260810160000_manual_venue_reveal.sql` §3).
 *
 * ── Append-only by the ABSENCE of a write path ───────────────────────────────
 *
 * RLS is enabled and there is exactly ONE policy, a `SELECT` for `staff.manage`.
 * There is no `INSERT`, no `UPDATE` and no `DELETE` policy, so no session can
 * write or erase a row: the only writer is
 * `public.record_venue_reveal_act(p_party_id uuid, p_act text, p_actor_id uuid,
 * p_actor_name text, p_recipients_intended integer) RETURNS jsonb`, which is
 * `SECURITY DEFINER`, has `EXECUTE` revoked from `public`, `anon` and
 * `authenticated`, and granted to `service_role` alone. The omission of the
 * three write policies is deliberate and is what makes D-37-22 honest: a night
 * can go back to secret, and the record that it was once revealed cannot be
 * removed by anyone.
 *
 * ── This table holds no address, and that is structural ──────────────────────
 *
 * The subject of every row here is an address becoming public. Recording that
 * address alongside the act would file the act together with the thing it
 * released, in a row that outlives the night and can reach a screenshot. So the
 * venue's name and where it is are simply not columns — and the rule is kept by
 * the only writer, which composes {@link VenueRevealActRow.party_label} itself
 * from the event's title and the night's date, rather than by each caller
 * remembering it.
 *
 * ── The honest limit, the same one the other row types carry ─────────────────
 *
 * None of the four Supabase clients is parameterised with a generated schema,
 * so this interface DOCUMENTS the shape and does not make any query against it
 * type-checked. `npm run build` cannot tell you a column name is right.
 *
 * The refusal vocabulary of the writer — it returns typed refusals as VALUES
 * rather than raising, because on a constraint violation PostgREST hands back
 * the entire failing row and the failing row here is a night, carrying the
 * address — is NOT declared here. It is the contract of the server action, and
 * it belongs to plan 37-10's module next to {@link VenueRevealAct}.
 */
export interface VenueRevealActRow {
  id: string;
  /**
   * The night. `ON DELETE SET NULL`, deliberately NOT `CASCADE`: sixteen
   * constraints already cascade from `public.event_parties`, and this trace does
   * not become one of them. Deleting a night must not delete the proof that its
   * address was made public — that proof is worth most exactly where the row it
   * names has gone.
   */
  party_id: string | null;
  /**
   * Which night it WAS, denormalised so a row whose `party_id` has gone to NULL
   * still says what it was about. The event's title and the night's date, and
   * nothing else — never the venue's name.
   */
  party_label: string;
  act: VenueRevealAct;
  /** Who did it. `ON DELETE SET NULL`: someone who later leaves does not un-perform their acts. */
  actor_id: string | null;
  /**
   * The person's full name, and the divergence from `AccountActRow` is
   * deliberate (D-37-18). There the subject is a person being JUDGED and the
   * label names the row without naming them; here the subject is a person who ACTED on a
   * staff surface, and accountability is the whole point — *revealed by
   * ORG-0042* answers nobody's question at 19:00 on a Friday.
   *
   * **The divergence is authorised in the database and stops there.** That name
   * does not enter a PLAN, a SUMMARY, a VERIFICATION or anything else under
   * `.planning/`, which is tracked and public. Artefacts name ROLES.
   */
  actor_name: string;
  /**
   * How many people this act meant to reach — the number the confirmation shows
   * (D-37-16) and the one reported back afterwards (D-37-12). Recipients after
   * de-duplication by email, never tickets plus rsvps, which double-counts
   * anybody holding both.
   */
  recipients_intended: number;
  /** The server clock. A device clock is evidence, never authority. */
  at: string;
}

/**
 * A row of `public.party_assignments` — phase 35's per-night assignment
 * (`supabase/migrations/20260809000000_party_assignments.sql`).
 *
 * ── What this table is, in one sentence ──────────────────────────────────────
 *
 * One capability, granted to one account, for one night, by somebody, until a
 * stated instant — and, if it was taken away, when and by whom. **A revocation
 * updates this row; it never deletes it.**
 *
 * ── The honest limit, the same one `AccountActRow` carries ────────────────
 *
 * None of the four Supabase clients is parameterised, so this interface
 * DOCUMENTS the shape and does not make a query against it type-checked. The
 * database refuses a row that disagrees with the five named constraints in that
 * migration; `npm run build` cannot tell you that it agrees.
 *
 * No personal data. The type carries no name, no address and no membership code:
 * an assignment is about a ROLE at a door, and this repository is public.
 */
export interface PartyAssignmentRow {
  id: string;
  /** The night. `ON DELETE CASCADE`: an assignment to a night that no longer exists cannot be resolved. */
  party_id: string;
  /** Who holds it. */
  user_id: string;
  /** One of the four assignable keys — never the whole capability catalogue. */
  capability: string;
  /**
   * The role the holder carried when it was granted.
   *
   * **`null` means RETIRED** — revoked *or* expired — never *we do not know*.
   * The nullability is the mechanism, not a gap in the data: the composite
   * foreign key `(user_id, assignee_role) → public.profiles (id, role)` is
   * `MATCH SIMPLE`, so it is not enforced once this column is null — which is
   * what frees the holder's role from a row that is no longer about anything.
   * Read it as *this row constrains nobody any more*.
   *
   * It said *«null means REVOKED»* until 2026-08-09, and that was the whole of
   * CR-02: expiry released nothing, so an assignment that ended three weeks ago
   * and that nobody revoked blocked every role write on its holder for ever —
   * including `deactivateMember`, the urgent one.
   * `20260809007000_expired_assignments_release_role.sql` gives expiry the same
   * effect, and {@link PartyAssignmentRow.expired_at} says which of the two
   * happened.
   */
  assignee_role: "master" | "organizer" | "staff" | null;
  /** Who granted it. Never equal to `user_id` — the database refuses that with `23514`. */
  assigned_by: string;
  /** The server clock at the grant. */
  granted_at: string;
  /**
   * When it stops. Computed AT THE GRANT from the night, **never sent by a
   * client**: a device clock is evidence, never authority, and a boundary chosen
   * by the caller is a permission window chosen by whoever is being checked.
   */
  ends_at: string;
  /**
   * **`null` means LIVE.**
   *
   * A revocation is an update of this column and of `revoked_by`, paired by
   * `party_assignments_revocation_paired` — **never a `DELETE`**. The offline
   * drain has to be able to ask *"was this live at `scannedAt`?"* after the
   * revocation, because a phone that was at the door at 01:40 syncs at 03:00 and
   * the answer must be about 01:40.
   */
  revoked_at: string | null;
  /** Who revoked it. `null` while live, and `null` again if that account is later deleted. */
  revoked_by: string | null;
  /**
   * When the row was RETIRED because its night was already over — CR-02.
   *
   * **Not a revocation, and deliberately not written as one.** `revoked_at`
   * stays `null`, so the offline drain can still ask *"was this live at
   * `scannedAt`?"* about 01:40 at 03:00, which is the whole of ASSIGN-03. What
   * the stamp does is release {@link PartyAssignmentRow.assignee_role}, so the
   * composite key stops refusing every role write on the holder.
   *
   * **There is no `expired_by`, and its absence is the statement.** Nobody
   * performs an expiry: time passes. Attributing it to a person would be false
   * and attributing it to `'system'` would put a non-act into the member
   * register, so the record of the expiry is this column and nothing else.
   *
   * `party_assignments_expiry_not_before_end` refuses a value earlier than
   * `ends_at`, which is what keeps *"a LIVE assignment blocks a demotion"* true:
   * the release cannot be back-dated into a way of unlocking one.
   */
  expired_at: string | null;
}

/** The four roles a credit may carry, mirrored by `party_credits_credit_check`. */
export type PartyCredit = "dj" | "photographer" | "host" | "visual";

/**
 * A row of `public.party_credits` — phase 35's public credit
 * (`supabase/migrations/20260809003000_party_credits.sql`).
 *
 * ── What this table is, in one sentence ──────────────────────────────────────
 *
 * One artist, credited in one role, on one night, recorded by somebody. It is an
 * ATTRIBUTION and nothing else.
 *
 * ── THE FIELD THAT IS NOT HERE, and why that is the guarantee ────────────────
 *
 * **This type has no account field, and it must never acquire one.** Not
 * `user_id`, not `profile_id`, not `auth_user_id`, not an optional one "for
 * later". A person can be credited on a night WITHOUT HAVING AN ACCOUNT — that
 * is ASSIGN-06 — and a credit grants access to nothing.
 *
 * A credit that TRIED to carry an account **would not compile**: there is no
 * field to put it in, and `npm run build` is this repository's type gate. That
 * is half of the automatic coverage ASSIGN-06 can have. The other half is
 * structural on the database side — the table has no such column either, so the
 * join somebody would write in good faith,
 * `join public.party_credits pc on pc.user_id = auth.uid()`, does not parse.
 * Adding either side takes a migration or an edit to this interface: a visible,
 * dated decision, never an autocomplete.
 *
 * `created_by` is NOT that field. It is the account that INSERTED the row, in
 * exactly the sense `public.artists.created_by` already uses
 * (`20260226100000_artist_profiles.sql:12`) — never who the artist is.
 *
 * ── The honest limit, the same one `PartyAssignmentRow` carries ──────────────
 *
 * None of the four Supabase clients is parameterised, so this interface
 * DOCUMENTS the shape and does not make a query against it type-checked. The
 * database refuses a row that disagrees with the two named constraints in that
 * migration; `npm run build` cannot tell you that it agrees.
 *
 * No personal data, and this is not a formality on this table. A credit is about
 * a night, and a night that has not been announced is material
 * (`sound-manifesto.md`, gate *la line-up e' materiale, non manifesto*). This
 * repository is PUBLIC: no artist name, no date and no venue belongs in this
 * file — only the shape of the row that holds them.
 */
export interface PartyCreditRow {
  id: string;
  /** The night. `ON DELETE CASCADE`: a credit on a night that no longer exists is about nothing. */
  party_id: string;
  /**
   * Which catalogue row is credited — a RELATION, never a name repeated here.
   * `ON DELETE RESTRICT`: detach the credit before deleting the artist.
   */
  artist_id: string;
  /** In which role. Mirrored by a SQL `CHECK`; nothing compares the two halves. */
  credit: PartyCredit;
  /** Display order only. It carries no meaning about seniority or fee. */
  sort_order: number;
  /**
   * Who RECORDED the row — never who the artist is. `null` once that account is
   * deleted, which costs attribution and disarms nothing.
   */
  created_by: string | null;
  /** The server clock. A device clock is evidence, never authority. */
  created_at: string;
}

/**
 * A row of `public.livecuts` — phase 52.3's LiveCut
 * (`supabase/migrations/20261004120000_livecuts.sql`, MUS-07, MUS-08).
 *
 * ── What this table is, in one sentence ──────────────────────────────────────
 *
 * The recorded mix of ONE slot of the timetable of a night that already
 * happened, hosted on SoundCloud. One per slot, not one per dj: a b2b is one
 * `LiveCutRow` with two `LiveCutArtistRow`s.
 *
 * ── Why no Podcast fits here by construction ─────────────────────────────────
 *
 * `party_id` is NOT NULL and `part_number` is a timetable position. A mix sent by
 * a candidate dj has neither a night nor a slot, so no Podcast fits here by
 * construction — it will get its own table and its own type when it exists.
 *
 * ── The fields that are not here ─────────────────────────────────────────────
 *
 * No title and no description. The title is COMPUTED (D-52.3-03,
 * `src/lib/livecuts/title.ts`); a free-text field would be a public exit no
 * predicate watches, and the first place a secret venue's address would land.
 *
 * ── `soundcloud_track_id` is a `number` ──────────────────────────────────────
 *
 * The column is `bigint`. Today's SoundCloud ids sit well below 2^53, so a JS
 * `number` holds them without loss; the widget consumes them as a string
 * (`String(id)`). If ids ever approach 2^53 this becomes a `string`, in a new
 * migration and an edit here — never a silent truncation.
 *
 * ── The honest limit, the same one `PartyCreditRow` carries ──────────────────
 *
 * None of the four Supabase clients is parameterised, so this interface
 * DOCUMENTS the shape and does not make a query against it type-checked. The
 * database refuses a row that disagrees with the seven named constraints in that
 * migration; `npm run build` cannot tell you that it agrees.
 *
 * This repository is PUBLIC: no artist name, no date and no venue belongs in
 * this file — only the shape of the row that holds them.
 */
export interface LiveCutRow {
  id: string;
  /** The night. NOT NULL (MUS-08). `ON DELETE CASCADE`, like `party_credits`. */
  party_id: string;
  /** PTn — the slot's position in the timetable. Order by this, never by time. */
  part_number: number;
  /** `time` as Postgres returns it, `HH:MM:SS`. Denormalised from the timetable. */
  slot_start: string;
  /** May be EARLIER than `slot_start`: the slot crosses midnight (22:00 → 06:00). */
  slot_end: string;
  /** Exact host `soundcloud.com`, two path segments, no query (SQL `CHECK`). */
  soundcloud_url: string;
  /** From the admin oEmbed. `bigint` in SQL, see the docblock above. */
  soundcloud_track_id: number;
  /** Optional copy, exact host `www.mixcloud.com` (SQL `CHECK`). */
  mixcloud_url: string | null;
  /** `> 0` and `< 86400`. */
  duration_seconds: number;
  /** Public URL written ONLY by `/api/media/finalize-cover`, under `livecuts/<uuid>.jpg`. */
  cover_url: string | null;
  /** `null` = draft, invisible without `staff.manage`. Publishing requires `cover_url`. */
  published_at: string | null;
  /** Amplitude peaks 0..255 from our own recording (`smallint[]`, 2..2000, plan 52.3-22); `null` = no waveform. */
  waveform_peaks: number[] | null;
  /** Who WROTE the row — never who plays. `null` once that account is deleted. */
  created_by: string | null;
  created_at: string;
  /** Written by the action on every UPDATE; no trigger. */
  updated_at: string;
}

/**
 * A row of `public.livecut_artists` — who plays in a LiveCut's slot, by
 * RELATION to `public.artists`, never a name repeated here. Two rows on the same
 * `livecut_id` are a b2b. Exactly as public as its parent LiveCut (the RLS reads
 * the same condition through the parent). Same honest limit as `LiveCutRow`:
 * none of the four Supabase clients is parameterised, so this DOCUMENTS the shape.
 */
export interface LiveCutArtistRow {
  /** `ON DELETE CASCADE` from the LiveCut. */
  livecut_id: string;
  /** `ON DELETE RESTRICT`: detach before deleting the artist. */
  artist_id: string;
  /** Order of the names in the computed title. Display only. */
  sort_order: number;
}

/**
 * The two `private` tables, and the payload of the one exposed function.
 *
 * ── The honest limit of these three declarations ─────────────────────────────
 *
 * This file has no `Database` type and no `Functions` map, and none of the four
 * Supabase clients is parameterised (`src/lib/supabase/client.ts:4`,
 * `server.ts:7`, `middleware.ts:15`, `service.ts:4`). So the interfaces below
 * **document** the shapes and do **not** make `supabase.rpc("my_access_context")`
 * type-checked: a misspelled function name is still a runtime error, an unknown
 * capability key still resolves to `false`, and a caller that casts the RPC
 * result to `AccessContext` is asserting, not proving. `npm run build` cannot
 * tell you that the database agrees.
 *
 * Neither table is reachable over the API — PostgREST serves
 * `public,graphql_public` only — so `Capability` and `RoleCapability` describe
 * rows no client will ever receive. They are here so that a script or a
 * migration reader has one place to check the shape against, and so the
 * `supabase-data.md` gate *tipi allineati* is satisfied in the same commit as
 * the DDL.
 */
export interface Capability {
  key: CapabilityKey;
  description: string;
}

export interface RoleCapability {
  role: UserRole;
  capability: CapabilityKey;
  // ── Il secondo asse di una concessione non esiste piu' (fase 50, D-50-01) ──
  //
  // Qui stava un booleano per concessione: l'incoerenza ereditata, portata come
  // dato — falso riproduceva le 34 policy che ignoravano lo stato, vero le
  // quattro di `artists`/`venues` che pretendevano l'approvazione. La colonna
  // che lo teneva e' uscita da `private.role_capabilities` nella stessa
  // migration che ha tolto `profiles.status`, e il ramo che la leggeva e'
  // uscito da `has_capability`.
  //
  // **Una chiave adesso si tiene o non si tiene.** Le quattro policy che
  // chiedevano l'approvazione sono state riscritte sul solo ruolo, e la portata
  // non si e' mossa: il `CHECK` *role-implies-approved* rendeva ogni organizer e
  // ogni master approvato per regola di database.
}

/**
 * What `public.my_access_context()` returns. Exactly one row, always.
 *
 * `user_id` is the caller's own `auth.uid()` — the `sub` of the JWT Postgres
 * already verified to authenticate the request. It was added by
 * `supabase/migrations/20260808000000_access_context_user_id.sql` so that the
 * ten sites deciding `events.created_by === <me>` can stop reading an
 * attacker-supplied identity header. It is null only for a caller with no
 * session, which the `REVOKE … FROM anon` makes unreachable through the granted
 * path — so a null here on a signed-in caller means the migration has not been
 * applied, and every consumer refuses on it rather than guessing.
 *
 * `role` is null when the subject has no profile row — which is also the case
 * in which `capabilities` is empty.
 *
 * **No new caller may branch on `role`.** It survives in this payload for
 * exactly two client components — `AppNav` and `StaffNav`. The sentence that
 * stood here said both *take `role` as a prop*, and
 * that has not been true of either for a while: `StaffNav` has taken
 * serialisable capability keys since plan 34-04, and `AppNav` takes them as
 * of plan 39-03 (D-39-06), where the Check-in entry started being drawn on
 * `door.operate`. Both are still `"use client"` and still cannot import the
 * data-access layer, so a Server Component parent still resolves and passes
 * down — that part was and remains the reason this field exists here.
 *
 * What keeps `role` in the payload today is narrower: four of `AppNav`'s five
 * entries are governed by no capability at all, so the nav still needs to know
 * who is signed in. Removing this field therefore waits on a capability that
 * governs those entries, not on a conversion that has already happened. Every
 * new decision asks `capabilities`.
 *
 * ── Il secondo campo e' uscito (fase 50, D-50-01) ────────────────────────────
 *
 * Accanto a `role` stava l'approvazione, e la funzione di database **non la
 * mette piu' nel payload**: la fase 50 ha ridefinito entrambi i sovraccarichi
 * di `my_access_context` nella stessa transazione del `DROP COLUMN`. Lasciarla
 * dichiarata qui avrebbe descritto una chiave che non arriva, e il consumatore
 * l'avrebbe mappata a `null` per tutti — un valore che si legge come «non
 * approvato» invece che come «la domanda non esiste piu'».
 *
 * (The file count previously written here was wrong — it read 46: the measured count
 * of files reading the injected role/status headers is **44**, and phase 33 takes
 * it to **0**. See the supersession note in
 * `20260808000000_access_context_user_id.sql`.)
 */
export interface AccessContext {
  capabilities: CapabilityKey[];
  user_id: string | null;
  role: UserRole | null;
}

// ── The production calendar, Location and the visual archive stood here ──────
//
// Removed on 2026-10-14 with their pages (CUT-01, D-53-02, D-53-04): the row
// types of the seven calendar tables, of Location's two tables and of the
// archive's one left in the same change as every page, action and cron that
// read them, together with the venue-word column of the series above. The
// tables themselves still exist in the database until the schema is closed
// after the deploy (plan 53-07) — the same order the gallery followed: the code
// that stops reading leaves first, the migration follows. A type for a table no
// code reads is an invitation to write a query against it (WR-08).
//
// What stays is the manifesto, the one authored section left (D-53-04).
//
// ⚠ **No Supabase client in this repository is parameterised with `Database`.**
// A green `npm run build` proves that the code consuming the two declarations
// below type-checks against the declarations; it proves nothing whatever about
// whether a column is spelled the way the applied migration spells it. Every
// name was read out of `20260817120200_production_sections.sql` by hand, and the
// vocabularies are imported from `@/lib/production/sections/vocabulary` rather
// than restated here.

/**
 * One rule of one authored section, and how settled its content is.
 *
 * ⚠ **Three states, and the middle one is the reason the table is shaped like
 * this.** The domain names two opposite errors: inventing where a rule already
 * exists, and answering *not decided* where a coordinate has been declared. A
 * two-state model can only defend against one of them, and folding the middle
 * state makes an unwritten-but-constrained format read as FREE — which is how a
 * format gets written by whoever is under deadline.
 *
 * **The explicit negatives live in `body`, not in a field of their own.** A
 * separate one would invite a surface that renders the positives and drops them,
 * which is the exact failure the exclusions were written to prevent.
 */
export interface ProductionSection {
  id: string;
  section: SectionKind;
  /**
   * Null means the rule belongs to the whole brand rather than to one format —
   * the spelling, the grid-safe square, the order of publication. Filing those
   * per format would be four places for one rule to diverge.
   */
  format_id: string | null;
  title: string;
  /**
   * ⚠ **No default in the database, and the absence is the decision.** A default
   * of *written* fills the void; a default of *not decided* answers for a
   * coordinate that has been declared. The author says which.
   */
  state: SectionState;
  body: string | null;
  /**
   * What is missing. Required by the database **only** in the not-decided state:
   * forcing it on the middle state would push the author into inventing a gap.
   */
  missing: string | null;
  /**
   * Whose call it is. A **role**, never a person — this project's artefacts name
   * roles, and a decision attributed to a name ages badly the moment somebody
   * leaves.
   */
  decision_owner: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Something that has not been decided, and whose call it is.
 *
 * ⚠ **It warns; it never blocks.** Nothing in this table refuses a piece of
 * work, and nothing may be added that does: a block that fires under deadline is
 * a block somebody routes around — and a routed-around block also teaches people
 * to route around the next one.
 *
 * `section` is free text rather than a `SectionKind` on purpose: the register
 * was written to span every production section, while that union names only the
 * ones that hold authored prose — since 2026-10-14 the manifesto alone (D-53-04).
 * Rows filed under a section that has left keep their text: a closed question
 * is a record, not a reference.
 */
export interface ProductionOpenQuestion {
  id: string;
  question: string;
  /** Not null. A question with no owner is the state this register abolishes. */
  decision_owner: string;
  section: string | null;
  format_id: string | null;
  opened_at: string;
  /**
   * ⚠ **Both or neither**, enforced in the database. A closing date with no
   * resolution loses the thing the register was keeping; a resolution with no
   * date leaves the question looking open to everybody reading the list.
   */
  closed_at: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}
