/**
 * buyer-input.ts — i due campi che un modulo d'ordine chiede, e le regole con
 * cui si leggono. Una casa sola per entrambi i moduli.
 *
 * ── Perche' questo file esiste ───────────────────────────────────────────────
 *
 * `D-50-18b` decide che il modulo a pagamento e quello gratuito chiedono **gli
 * stessi due campi** — `Full name` (un campo solo) e mail. «Gli stessi» e' una
 * proprieta' che si mantiene solo se le costanti sono le stesse: due copie di
 * `EMAIL_MAX_LENGTH` sono due verita' che divergono al primo che ne corregge
 * una. Le costanti vivevano dentro `guest-purchase-actions.ts`, che e' un file
 * di Server Action — e **da li' non si possono esportare**: un file marcato con
 * quella direttiva ammette solo esportazioni di funzioni asincrone, e ognuna
 * diventa un endpoint raggiungibile dal browser. Quindi un modulo normale.
 *
 * ── Perche' NON e' `server-only` ─────────────────────────────────────────────
 *
 * Non tocca il database, non legge un segreto e non conia niente: sono un
 * numero, una forma e due normalizzazioni. Un modulo di superficie che volesse
 * fermare un campo troppo lungo **prima** di chiamare l'azione deve poter usare
 * lo stesso numero, o il limite del browser e quello del server sarebbero due
 * numeri diversi con lo stesso nome. E' la stessa scelta, con la stessa
 * ragione, di `src/lib/failure/money-path.ts`.
 *
 * ── Cosa NON c'e' qui ────────────────────────────────────────────────────────
 *
 * **Nessuna categoria di rifiuto.** Ogni superficie dichiara le proprie nel
 * proprio file (`money-path.ts`, §2): il modulo a pagamento e quello gratuito
 * hanno cause con nomi diversi perche' hanno lettori diversi. Qui sta cio' che
 * si misura, non come si chiama il no.
 */

/** Il tetto di RFC 5321 su un indirizzo di posta, applicato prima dell'insert. */
export const EMAIL_MAX_LENGTH = 254;

/**
 * Forma minima e non negoziabile: qualcosa, una chiocciola, qualcosa, un punto,
 * qualcosa — senza spazi. **Non e' una validazione RFC** e non pretende di
 * esserlo: nessuna espressione regolare lo e', e l'unica prova che un indirizzo
 * esiste e' una mail che arriva. Serve a fermare i due casi che si vedono
 * davvero — il campo vuoto e il dominio dimenticato — prima che diventino un
 * biglietto che non raggiunge nessuno.
 */
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Quanto puo' essere lungo `Full name`, e perche' un tetto esiste.
 *
 * Il campo arriva da un modulo **pubblico e senza sessione**, e il suo valore
 * finisce in due posti che non hanno un limite loro: `user_metadata` del
 * fornitore d'identita' e `ticket_orders.buyer_name`, che e' `text`. Senza un
 * tetto qui, la lunghezza di cio' che si scrive in quei due posti la decide chi
 * compila il modulo. Centoventi caratteri tengono dentro qualunque nome vero,
 * compresi i nomi composti e quelli con piu' cognomi.
 */
export const FULL_NAME_MAX_LENGTH = 120;

/**
 * L'indirizzo, normalizzato **prima** di toccare qualunque cosa.
 *
 * Minuscolo come fa gia' `src/lib/guest-list/process-entry.ts:160`: la parte
 * locale di un indirizzo e' formalmente sensibile alle maiuscole, ma nessun
 * percorso di questo prodotto la tratta cosi' — il registro dei profili si
 * cerca con un confronto insensibile — e due convenzioni diverse sullo stesso
 * indirizzo sono due persone diverse per chi deve riconoscerlo dopo.
 */
export function normalizeBuyerEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Il nome, normalizzato: niente estremi, niente spazi doppi, niente caratteri
 * di controllo.
 *
 * I caratteri di controllo si tolgono perche' **questo valore viene letto ad
 * alta voce da una mail**: la conferma d'ordine puo' salutare per nome
 * (`D-50-18b`), e un a-capo dentro un nome e' gia' bastato una volta, in questo
 * prodotto, a rompere una cosa che sembrava funzionare (`NEXT_PUBLIC_APP_URL`
 * con un a-capo in coda, `order-confirmation.ts`). Le maiuscole **non** si
 * toccano: un nome non e' un identificativo e non si normalizza come tale.
 */
export function normalizeBuyerName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
