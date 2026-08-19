/**
 * redact.ts — come si scrive un errore del database in un log, e cosa non ci va.
 *
 * ── Il fatto misurato ────────────────────────────────────────────────────────
 *
 * Il piano `43-01` ha sondato una violazione di CHECK attraverso il client JS e
 * ha osservato che `error.details` contiene **la riga per intero**:
 *
 *     Failing row contains (<uuid>, <indirizzo>, <full_name>, <membership_code>, …)
 *
 * `membership_code` **e' l'unica credenziale d'ingresso** — il roster della
 * porta non filtra ne' per ruolo ne' per stato (`api/membership/list`). Un
 * codice finito in un log e' una credenziale fuori dalla porta.
 *
 * ── Perche' un helper e non una regola a memoria ─────────────────────────────
 *
 * `console.error("<categoria>", error)` passa l'oggetto INTERO, quindi `details`
 * con esso, e il runtime lo serializza. La regola «logga solo `code` e
 * `message`» era gia' scritta in tre file e rispettata in tre file: era una
 * convenzione, e una convenzione si dimentica al quarto sito. Qui e' una
 * funzione, e chi legge la chiamata vede che c'e' qualcosa da redigere.
 *
 * ── Cosa passa, e perche' proprio quei due campi ─────────────────────────────
 *
 *   - `code`   — su cui si fa branching (`23514` per un CHECK violato). E' un
 *                identificatore di errore, non un dato di nessuno.
 *   - `message`— porta il **nome del constraint**, che e' innocuo e serve alla
 *                diagnosi.
 *
 * NON passano `details` (la riga), `hint` (che puo' citare valori) e nemmeno
 * l'oggetto: un domani qualcuno gli aggiunge un campo, e l'aggiunta arriverebbe
 * nei log senza che nessuno l'abbia decisa.
 *
 * ── Il limite, detto invece che sottinteso ───────────────────────────────────
 *
 * Questo repository non ha error tracking (`meta-gates.md`, verificato
 * 2026-08-05): questi log **non raggiungono nessuno da soli**. Redigerli non
 * rende osservabile un fallimento — impedisce solo che, quando qualcuno andra' a
 * guardarli, ci trovi dentro le credenziali dei membri.
 */

/** La forma minima di un errore PostgREST/Postgres, senza dipendere dai tipi del client. */
type ErroreDelDatabase = {
  code?: string | null;
  message?: string | null;
};

/**
 * Una riga di log sicura per un errore che puo' venire dal database.
 *
 * Accetta `unknown` di proposito: la stessa chiamata serve sia dove l'errore e'
 * un oggetto PostgREST destrutturato, sia dove e' un `Error` lanciato — e la
 * seconda forma non deve costringere chi scrive a ricordarsi quale delle due ha
 * in mano.
 */
export function redactDbError(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as ErroreDelDatabase;
    const code = typeof e.code === "string" && e.code ? e.code : null;
    const message = typeof e.message === "string" && e.message ? e.message : null;
    if (code || message) {
      return `code=${code ?? "none"} message=${message ?? "none"}`;
    }
    // Un oggetto che non ha ne' `code` ne' `message` NON viene serializzato: e'
    // esattamente il caso in cui non si sa cosa contenga.
    return "code=none message=none (oggetto senza codice ne' messaggio, non serializzato)";
  }
  if (typeof error === "string") return `message=${error}`;
  return "code=none message=none";
}
