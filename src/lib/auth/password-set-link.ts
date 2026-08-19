import "server-only";

/**
 * password-set-link.ts — l'UNICO posto che costruisce il link con cui una
 * persona invitata sceglie la sua password.
 *
 * ── Il difetto che questo file esiste per chiudere ───────────────────────────
 *
 * Misurato il 2026-08-19 in laboratorio, ricostruendo il link esattamente come
 * lo costruiva il prodotto: **l'invito non faceva entrare nessuno.**
 *
 * `auth.admin.generateLink()` restituisce un `action_link` che punta a
 * `/auth/v1/verify`. Seguirlo produce un `303` verso il `redirect_to` con la
 * sessione **NEL FRAMMENTO** — `#access_token=…&refresh_token=…` — perche' un
 * link generato dal server e' un flusso *implicito*. Il frammento **non viaggia
 * verso il server**: `src/app/api/auth/callback/route.ts` legge solo `?code`,
 * non lo trova, e rimanda a `/login?error=auth`.
 *
 * Il risultato per chi riceve l'invito: nessuna sessione, `/set-password` senza
 * campi — **e il token e' bruciato**, perche' `verify` lo consuma comunque. Il
 * secondo clic sullo stesso link non funziona nemmeno in teoria.
 *
 * **E non si ripara aggiungendo una sfida PKCE a chi genera il link**: misurato,
 * `generateLink` **ignora** `code_challenge` e produce un link implicito
 * comunque, con o senza. La riparazione deve stare dal lato del browser.
 *
 * ── Cosa fa invece questo file ───────────────────────────────────────────────
 *
 * Usa `properties.hashed_token`, che `generateLink` restituisce accanto
 * all'`action_link`, e costruisce un indirizzo **nostro**:
 *
 *     {APP_URL}/set-password?token_hash=<hashed_token>&type=recovery
 *
 * `/set-password` e' una pagina client: chiama `verifyOtp({ token_hash, type })`,
 * che scambia il token per una sessione **sul posto**. Nessun frammento, nessun
 * `?code`, nessun passaggio dal callback — e il token viene consumato **nella
 * stessa pagina che ha il campo della password**, invece che una tappa prima.
 *
 * ── Perche' `recovery` e non `invite` ────────────────────────────────────────
 *
 * `invite` CREA un utente (qui l'utente esiste gia') e non permette di impostare
 * una password; `recovery` pretende un utente esistente e lo permette.
 *
 * ── Perche' e' un modulo e non un'esportazione di `actions.ts` ───────────────
 *
 * Un file marcato `"use server"` pubblica OGNI esportazione come endpoint. Una
 * funzione che, dato un indirizzo, restituisce un link capace di impostare una
 * password sarebbe l'endpoint peggiore che questo prodotto possa avere. Modulo
 * semplice, `server-only`, e nessuna delle due chiamanti diventa una porta.
 */

/** La pagina — e la sola — dove in questo prodotto si sceglie una password. */
export const PASSWORD_SET_PATH = "/set-password";

type ServiceAuthAdmin = {
  generateLink: (params: {
    type: "recovery";
    email: string;
    options?: { redirectTo?: string };
  }) => Promise<{
    data: { properties?: { hashed_token?: string | null } | null } | null;
    error: { code?: string | null; status?: number | null; message?: string } | null;
  }>;
};

export type PasswordSetLink =
  | { ok: true; url: string }
  | { ok: false; reason: "generate_failed" | "no_hashed_token"; detail: string };

/**
 * Costruisce il link. **Non spedisce niente** e non registra l'indirizzo: chi
 * chiama decide cosa farne, e questo file non deve comparire in nessun log con
 * una mail accanto.
 *
 * `appUrl` viene passato invece che letto qui, perche' le due chiamanti lo
 * risolvono gia' e con ripieghi diversi; una terza lettura di
 * `NEXT_PUBLIC_APP_URL` sarebbe una terza definizione di «dove vive questo
 * prodotto». *(Precedente registrato: quella variabile ha gia' rotto il webhook
 * dei pagamenti per un a-capo in coda.)*
 */
export async function buildPasswordSetLink(
  admin: ServiceAuthAdmin,
  email: string,
  appUrl: string
): Promise<PasswordSetLink> {
  const { data, error } = await admin.generateLink({
    type: "recovery",
    email,
    // Passato comunque: se un giorno qualcuno tornasse a usare `action_link`,
    // un `redirect_to` assente lo manderebbe alla Site URL del progetto, che e'
    // esattamente il difetto del percorso della guest list.
    options: { redirectTo: `${appUrl.replace(/\/+$/, "")}${PASSWORD_SET_PATH}` },
  });

  if (error) {
    return {
      ok: false,
      reason: "generate_failed",
      detail: error.code ?? String(error.status ?? "unknown"),
    };
  }

  const hashed = data?.properties?.hashed_token;
  if (!hashed) {
    // Non e' un dettaglio: senza `hashed_token` non esiste link, e mandare
    // comunque qualcosa — la pagina di accesso, per esempio — significa
    // mandare una persona davanti a una password che non ha mai scelto.
    return { ok: false, reason: "no_hashed_token", detail: "generateLink returned no hashed_token" };
  }

  const base = appUrl.replace(/\/+$/, "");
  return {
    ok: true,
    url: `${base}${PASSWORD_SET_PATH}?token_hash=${encodeURIComponent(hashed)}&type=recovery`,
  };
}
