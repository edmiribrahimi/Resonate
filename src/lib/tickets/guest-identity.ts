import "server-only";

import { redactDbError } from "@/lib/errors/redact";
import type { getServiceClient } from "@/lib/supabase/service";

/**
 * guest-identity.ts — l'identita' di chi ha comprato senza account, risolta dal
 * server **dopo** che il denaro e' stato verificato.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * PERCHE' QUI E NON ALL'AVVIO DEL CHECKOUT
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * `49-CONTEXT.md` lo fissa come decisione: **nessun account nasce senza un
 * pagamento verificato dietro**. Creare l'identita' quando qualcuno apre un
 * checkout significherebbe coniare un conto per ogni carrello abbandonato — e
 * ogni conto nuovo porta con se' un `membership_code`, che in questo prodotto
 * **e' una credenziale della porta** e ammette senza leggere ne' ruolo ne' stato
 * (`access-gating.md`, gate *la porta ha due credenziali*). Un account fantasma
 * non e' una riga in piu' in una tabella: e' una chiave d'ingresso in piu' al
 * mondo.
 *
 * L'unico chiamante previsto e' quindi il webhook dei pagamenti, **dopo** aver
 * interrogato il fornitore con una GET (mai il corpo del messaggio).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * IL CLIENT DI SERVIZIO, GIUSTIFICATO — `access-gating.md`, gate *service role*
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Questo modulo riceve un client che **bypassa ogni policy RLS** e lo usa per
 * chiamare `auth.admin.createUser`. La giustificazione va scritta, non
 * sottintesa:
 *
 *   1. **Perche' serve.** Creare un'identita' e' un'operazione di
 *      amministrazione: non esiste percorso non privilegiato che la faccia, e
 *      l'alternativa — far registrare la persona prima di pagare — e' esattamente
 *      la strada che questa fase esiste per togliere.
 *   2. **Qual e' l'input non fidato.** Un solo valore: **l'indirizzo di posta**.
 *      Nient'altro entra da fuori — nessun ruolo, nessuno stato, nessun
 *      identificativo scelto da chi compra.
 *   3. **Cosa gli si fa prima che tocchi `createUser`.** Si taglia agli estremi
 *      e si porta a minuscolo; si verifica che sia rimasto qualcosa; si
 *      **neutralizzano i metacaratteri di `LIKE`** prima del confronto (vedi
 *      sotto, e' il punto che pesa di piu'); si conferma in JavaScript che la
 *      riga trovata abbia **esattamente** quell'indirizzo. Nessuna query e'
 *      costruita per concatenazione: ogni valore viaggia come parametro del
 *      client.
 *   4. **Quale strada NON apre.** Questo modulo non e' un endpoint e non e'
 *      esportato da un file di Server Action — un file marcato in quel modo
 *      pubblica **ogni** esportazione come rotta raggiungibile dal browser, e
 *      una funzione che dato un indirizzo conia un'identita' sarebbe fra le
 *      peggiori che questo prodotto possa esporre. E' la stessa scelta, con la
 *      stessa ragione, di `src/lib/auth/password-set-link.ts:44-49`.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * PERCHE' IL CONFRONTO NON E' UN `ilike` NUDO
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * `src/lib/guest-list/process-entry.ts:166` cerca il profilo con
 * `.ilike("email", emailLower)`, e quel valore finisce in un **pattern**, non in
 * un confronto. In un pattern `_` vale *un carattere qualunque* e `%` vale
 * *qualunque cosa* — e il trattino basso **e' un carattere legale e comunissimo**
 * nella parte locale di un indirizzo.
 *
 * Su quella strada, `m_rio@esempio.it` corrisponde a `mario@esempio.it`. Le due
 * conseguenze, su un percorso dove il denaro e' gia' stato incassato:
 *
 *   - **una corrispondenza sola ma sbagliata** attacca l'ordine di chi ha pagato
 *     all'identita' di un'altra persona, e la porta a `approved` — cioe' emette
 *     i biglietti sotto il nome di qualcun altro;
 *   - **piu' corrispondenze** fanno fallire la lettura, e il fallimento avviene
 *     **dopo l'incasso**: soldi presi, nessun biglietto.
 *
 * Qui i metacaratteri si neutralizzano prima (`escapeLikePattern`) e la riga
 * tornata si riconferma in JavaScript con un confronto di uguaglianza. Due reti,
 * perche' la prima dipende da come il livello REST interpreta il pattern e la
 * seconda no.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * COSA QUESTO MODULO NON FA
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * **Non decide l'ammissione, e non scrive niente su `profiles`.** Non esegue
 * nessun aggiornamento di quella tabella: la legge e basta. Chi porta un profilo
 * ad `approved` e' il webhook, ed e' scritto li' da prima di questa fase
 * (`src/app/api/webhooks/sumup/route.ts`) — *il pagamento decide l'ammissione*.
 *
 * Tenere separate le due cose e' il **gate dei due assi** (`CLAUDE.md`, principio
 * 8) applicato al codice invece che allo schermo: il ruolo e lo stato sono
 * dimensioni indipendenti, e un modulo che crea un'identita' non e' il posto in
 * cui si decide chi entra.
 *
 * **Non solleva.** Chi chiama e' su un percorso di denaro e deve poter
 * **registrare** cosa e' andato storto invece di trovarsi un'eccezione a meta'
 * di una sequenza in cui l'incasso e' gia' avvenuto.
 */

/**
 * Le cause per cui un'identita' non esiste, tenute distinte.
 *
 * `meta-gates.md`, zero fallimenti silenziosi: questo progetto **non ha error
 * tracking**, quindi una causa collassata sopra un'altra e' una diagnosi che
 * nessuno fara' mai. Il precedente registrato e' il form della newsletter, che
 * dice *«Qualcosa e' andato storto»* per la rete assente, la chiave mancante e
 * l'indirizzo gia' iscritto.
 *
 * Le quattro non si riparano nello stesso posto, ed e' la ragione per cui sono
 * quattro:
 */
export type GuestIdentityFailure =
  /**
   * L'ordine non porta un indirizzo utilizzabile. Si ripara **a monte**, dove
   * l'ordine e' stato scritto: qui non c'e' niente da cercare.
   *
   * Il piano ne prevedeva tre; questa e' la quarta, aggiunta perche' l'unica
   * alternativa era farla passare per `create_failed` — cioe' raccontare un
   * dato mancante come un rifiuto del fornitore d'identita', che manderebbe chi
   * indaga a guardare il posto sbagliato.
   */
  | "email_missing"
  /** La lettura di `profiles` non e' riuscita. E' l'infrastruttura, non un «no». */
  | "lookup_failed"
  /** Il fornitore d'identita' ha rifiutato la creazione. */
  | "create_failed"
  /**
   * Il conto esiste, ma il profilo non e' comparso entro l'attesa.
   *
   * **E' lo stato peggiore dei quattro** e va saputo: resta un'identita' in
   * `auth.users` senza la sua riga in `public.profiles`. Non e' riparabile da
   * qui — il profilo lo scrive un trigger — ed e' esattamente cio' che l'ordine
   * portato a `failed` con questa causa deve far arrivare a un essere umano.
   */
  | "profile_not_written";

export type GuestIdentityResult =
  | {
      ok: true;
      /** L'identificativo in `auth.users`, che e' anche quello di `profiles`. */
      userId: string;
      /**
       * Se questa chiamata ha coniato l'identita' o ne ha trovata una.
       *
       * Serve a chi chiama per due ragioni: e' cio' che distingue un acquirente
       * nuovo da uno che torna, e — su una seconda consegna dello stesso
       * messaggio — un `created: true` inatteso sarebbe il segnale che la
       * biforcazione non ha funzionato.
       */
      created: boolean;
    }
  | { ok: false; reason: GuestIdentityFailure; detail: string };

/**
 * Quante volte rileggere `profiles` aspettando che il trigger abbia scritto.
 *
 * `process-entry.ts:287-289` risolve lo stesso problema **dormendo 500 ms e
 * sperando**. Qui si guarda la riga: un'attesa fissa e' insieme troppo lunga nel
 * caso normale e troppo corta in quello lento, e soprattutto **non si accorge**
 * di aver fallito. Sei tentativi con attese crescenti coprono ~2,1 secondi
 * totali, e l'ultimo che non trova nulla e' un fatto misurato, non un timeout
 * assunto.
 */
const PROFILE_READ_ATTEMPTS = 6;

/** Le attese fra un tentativo e il successivo, in millisecondi. */
const PROFILE_READ_BACKOFF_MS = [100, 200, 300, 500, 1000];

/** Quante righe si leggono prima di rinunciare a cercare la corrispondenza esatta. */
const LOOKUP_ROW_BUDGET = 10;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Neutralizza i metacaratteri di `LIKE` in un valore che finira' in un pattern.
 *
 * `\` per primo, o le sequenze introdotte dopo verrebbero neutralizzate a loro
 * volta. `*` e' incluso perche' il livello REST lo traduce in `%` prima che
 * Postgres veda il pattern: non e' un metacarattere di SQL, ma su questa strada
 * si comporta come tale.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_*]/g, (ch) => `\\${ch}`);
}

/**
 * Trova o conia l'identita' di chi ha comprato, dato il suo indirizzo.
 *
 * ── La biforcazione non e' un ornamento ──────────────────────────────────────
 *
 * `auth.admin.createUser` su un indirizzo gia' registrato **fallisce**, e su
 * questo percorso quel fallimento avverrebbe **dopo un incasso**. Cercare prima
 * non e' un'ottimizzazione: e' cio' che impedisce che il caso piu' comune —
 * qualcuno che compra una seconda volta — diventi un pagamento senza biglietti.
 *
 * ── Ed e' anche la guardia contro due consegne simultanee ────────────────────
 *
 * La consegna at-least-once e' la norma, non l'eccezione. Due messaggi dello
 * stesso checkout in volo insieme possono **entrambi** non trovare il profilo e
 * **entrambi** chiamare `createUser`: una delle due vince, l'altra riceve
 * «indirizzo gia' registrato». Per questo il ramo di fallimento **rilegge**
 * invece di arrendersi — cosi' la perdente trova l'identita' della vincente e
 * l'esito e' lo stesso di una consegna sola. L'idempotenza dell'ordine sta nello
 * schema (`ticket_orders.sumup_checkout_id` unico) e dentro la RPC; questa e' la
 * stessa proprieta' sull'identita'.
 */
export async function resolveGuestIdentity(
  serviceClient: ReturnType<typeof getServiceClient>,
  email: string
): Promise<GuestIdentityResult> {
  const fail = (
    reason: GuestIdentityFailure,
    detail: string
  ): GuestIdentityResult => {
    console.error(`[tickets.guest_identity_${reason}] ${detail}`);
    return { ok: false, reason, detail };
  };

  // ── 1. La normalizzazione, come `process-entry.ts:160` ─────────────────────
  //
  // Minuscolo perche' e' cosi' che gli indirizzi sono confrontati altrove in
  // questo prodotto, e due convenzioni diverse sullo stesso dato producono due
  // account per la stessa persona.
  const emailLower = (email ?? "").trim().toLowerCase();
  if (!emailLower) {
    return fail("email_missing", "indirizzo assente o vuoto sull'ordine");
  }

  // ── 2. Il lookup preventivo ────────────────────────────────────────────────
  const found = await lookupProfileByEmail(serviceClient, emailLower);
  if (found.state === "error") {
    return fail("lookup_failed", found.detail);
  }
  if (found.state === "found") {
    return { ok: true, userId: found.userId, created: false };
  }

  // ── 3. L'identita' si conia ────────────────────────────────────────────────
  //
  // Nessuna password: l'API la accetta assente, e chiederne una a chi sta
  // comprando sarebbe il modulo di registrazione che questa fase esiste per
  // togliere. La via di rientro e' il link di scelta password nella mail
  // dell'ordine (`D-49-04`, punto 4 delle decisioni del proprietario).
  //
  // `email_confirm: true` come il percorso della guest list: non c'e' nessun
  // indirizzo da confermare con una seconda mail — **il pagamento e' gia' la
  // prova che quell'indirizzo appartiene a chi lo ha usato**, ed e' verificato
  // dal fornitore prima che questa funzione venga chiamata.
  const { data: authUser, error: createError } =
    await serviceClient.auth.admin.createUser({
      email: emailLower,
      email_confirm: true,
    });

  if (createError || !authUser?.user?.id) {
    // Il caso della corsa, e quello del profilo mai scritto: il conto puo'
    // esistere gia' anche se il lookup non lo ha visto. Si rilegge una volta
    // prima di dichiarare il fallimento — una rilettura costa una query, un
    // fallimento qui costa un pagamento senza biglietti.
    const retry = await lookupProfileByEmail(serviceClient, emailLower);
    if (retry.state === "found") {
      return { ok: true, userId: retry.userId, created: false };
    }
    return fail(
      "create_failed",
      createError
        ? `${createError.message}${createError.status ? ` status=${createError.status}` : ""}`
        : "createUser non ha restituito un identificativo"
    );
  }

  const userId = authUser.user.id;

  // ── 4. Si aspetta la riga, invece di dormire e sperare ─────────────────────
  //
  // Il profilo lo scrive il trigger `handle_new_user` sull'INSERT in
  // `auth.users`. Non e' istantaneo rispetto al ritorno dell'API, e la riga
  // serve **subito**: la RPC che emette i biglietti pretende un portatore, e
  // ogni superficie che mostra chi ha comprato legge di li'.
  for (let attempt = 0; attempt < PROFILE_READ_ATTEMPTS; attempt += 1) {
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      // Non si esce: una lettura fallita non e' «la riga non c'e'», e su questo
      // percorso arrendersi al primo intoppo di rete significa lasciare senza
      // biglietti qualcuno che ha pagato. La causa resta scritta.
      console.error(
        `[tickets.guest_identity_profile_read_failed] user=${userId} attempt=${attempt + 1} ${redactDbError(profileError)}`
      );
    } else if (profile) {
      return { ok: true, userId, created: true };
    }

    const backoff = PROFILE_READ_BACKOFF_MS[attempt];
    if (backoff !== undefined) await wait(backoff);
  }

  return fail(
    "profile_not_written",
    `conto ${userId} creato, ma nessun profilo dopo ${PROFILE_READ_ATTEMPTS} letture — ` +
      "resta un'identita' senza profilo, va guardata a mano"
  );
}

type LookupOutcome =
  | { state: "found"; userId: string }
  | { state: "absent" }
  | { state: "error"; detail: string };

/**
 * Cerca il profilo di un indirizzo gia' normalizzato.
 *
 * Due reti sovrapposte, e la seconda esiste perche' la prima dipende da come il
 * livello REST interpreta un pattern:
 *
 *   1. i metacaratteri sono neutralizzati prima di comporre il pattern;
 *   2. la riga tornata si riconferma con un confronto di **uguaglianza** in
 *      JavaScript.
 *
 * Nessun `maybeSingle` su questa lettura: quel metodo trasforma «due righe» in
 * un errore, cioe' in un `lookup_failed` — che su questo percorso significa un
 * ordine a `failed` per qualcuno che ha gia' pagato. Si chiedono poche righe e
 * si sceglie quella giusta.
 */
async function lookupProfileByEmail(
  serviceClient: ReturnType<typeof getServiceClient>,
  emailLower: string
): Promise<LookupOutcome> {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id, email")
    .ilike("email", escapeLikePattern(emailLower))
    .limit(LOOKUP_ROW_BUDGET);

  if (error) {
    return { state: "error", detail: redactDbError(error) };
  }

  const exact = (data ?? []).find(
    (row: { id: string; email: string | null }) =>
      (row.email ?? "").trim().toLowerCase() === emailLower
  );

  if (exact) return { state: "found", userId: exact.id };

  if ((data ?? []).length > 0) {
    // Righe tornate ma nessuna uguale: la seconda rete ha lavorato. E' un fatto
    // che va scritto, perche' significa che la prima ha lasciato passare
    // qualcosa e qualcuno dovra' guardarci.
    console.error(
      `[tickets.guest_identity_lookup_inexact] ${(data ?? []).length} righe non corrispondenti per un indirizzo normalizzato`
    );
  }

  return { state: "absent" };
}
