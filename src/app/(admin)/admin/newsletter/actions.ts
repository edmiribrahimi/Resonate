"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { getResend } from "@/lib/email";
import { CAP } from "@/lib/capabilities/keys";
import { hasCapability } from "@/lib/capabilities/server";

function getAudienceId() {
  if (!process.env.RESEND_AUDIENCE_ID) {
    throw new Error("RESEND_AUDIENCE_ID is not configured");
  }
  return process.env.RESEND_AUDIENCE_ID;
}

/**
 * The reference conversion: one guard asking the one definition.
 *
 * ── Why the verdict does not move ────────────────────────────────────────────
 *
 * This read the injected role header and refused on `role !== "master"`. The
 * header name is deliberately not spelled here: the phase-gate census is
 * `grep -rl` over that literal, and a comment naming it would keep this file in
 * a count that exists to measure how many files still *read* it. (That has
 * already happened once — `src/types/database.ts` took the count from 46 to 47
 * in wave 5 by mentioning it in a doc comment. Recorded in the summary.)
 * `admin.access` is
 * granted to `master` and to nobody else, with `requires_approved = false`
 * (`supabase/migrations/20260807000000_capability_model.sql`, section 7) — which
 * is `role !== "master"` inverted, for every real subject. A `master` of any
 * status holds it; an `organizer` or a `member` of any status does not. The
 * eleven-persona table in `32-08-SUMMARY.md` is the same mapping, measured.
 *
 * For a **forged** header the verdict is also identical, and this is worth
 * saying because it would be easy to sell this as a security fix. It is not.
 * The middleware already deletes every one of those inbound headers and
 * re-sets them from the session (`src/lib/supabase/middleware.ts`), so the
 * header was not forgeable here either. **This conversion narrows nothing** —
 * it removes a dependency, which is what the next phase does 45 more times.
 *
 * ── What it costs ────────────────────────────────────────────────────────────
 *
 * One database round trip per render of this surface. The middleware already
 * resolved the same context on the same request, but it runs in a separate
 * execution and React's `cache()` cannot span the two — so this is a genuine
 * extra query, not a memoised read. It is paid here on purpose: newsletter is a
 * low-traffic admin surface, and paying it once is what makes "one definition,
 * three callers" an observation rather than a claim. The money surface next
 * door (`admin/finance/actions.ts`) used to hold a byte-identical copy of this
 * guard, left unconverted on purpose in that phase (D-13); it was deleted with
 * the Finance surface on 2026-08-14, so this guard now has no twin.
 *
 * A failure to resolve throws — it does not fall through to a refusal. See
 * `src/lib/capabilities/server.ts`: an empty capability set on failure would
 * refuse a master exactly the way it refuses a member, and there is no error
 * tracking in this project to tell the two apart.
 */
async function requireMaster() {
  if (!(await hasCapability(CAP.ADMIN_ACCESS))) {
    redirect("/dashboard");
  }
}

/**
 * ── Why these actions return a failure instead of throwing it ────────────────
 *
 * `src/lib/capabilities/server.ts` throws on every resolve failure, on purpose,
 * so that an infrastructure fault can never be mistaken for a refusal. That
 * contract holds *at the resolver*. It said nothing about what a caller does
 * with the throw, and three of this file's four callers swallowed it: the
 * broadcast list rendered a `capabilities.resolve_failed` as **an empty list**,
 * presented as fact, and the page rendered it as *"Newsletter not configured —
 * set RESEND_API_KEY"*, which points the operator at the wrong system entirely.
 * That is CR-01 in `32-REVIEW.md`, and it is the newsletter precedent from
 * `.planning/codebase/CONCERNS.md` recreated by the phase that cites it.
 *
 * A thrown message cannot carry the diagnosis across the wire. Next redacts the
 * message of an error thrown out of a Server Action in a production build — the
 * client receives a generic string and a digest — so `err.message.startsWith(
 * "capabilities.resolve_failed")` works in `next dev` and silently stops working
 * in the deployment where it matters. The category has to be a **value** to
 * survive, so these actions return a tagged result.
 *
 * The tag is decided by POSITION, not by parsing a message: the capability guard
 * runs in its own try, the provider call in another. Nothing depends on the text
 * of an error, which is the part a framework is free to rewrite.
 *
 * This project has **no error tracking** (`meta-gates.md`, verified 2026-08-05),
 * so a log line reaches nobody. Each failure therefore also gets a distinct,
 * rendered UI state — see `BroadcastList.tsx`, `ComposeForm.tsx` and `page.tsx`.
 * The rule the three share: a failure is never drawn as an empty result, and the
 * two causes are never collapsed into one message.
 */
export type NewsletterFailure =
  /** The permission lookup itself failed. Nothing was asked of Resend. */
  | "capabilities_unavailable"
  /** The guard passed; Resend or its configuration did not answer. */
  | "provider_unavailable";

export type NewsletterResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: NewsletterFailure; detail: string };

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs the guard, then the body, and reports which of the two failed.
 *
 * `unstable_rethrow` is what lets this catch anything at all: `redirect()`
 * signals itself by throwing, and a `catch` that swallowed it would turn the
 * refusal of a non-master into a rendered error instead of a redirect. It
 * re-throws Next's control-flow errors and returns for everything else.
 */
async function guarded<T>(
  action: string,
  run: () => Promise<T>
): Promise<NewsletterResult<T>> {
  try {
    await requireMaster();
  } catch (error) {
    unstable_rethrow(error);
    const detail = describe(error);
    console.error(`[newsletter.capabilities_unavailable] ${action}: ${detail}`);
    return { ok: false, failure: "capabilities_unavailable", detail };
  }

  try {
    return { ok: true, data: await run() };
  } catch (error) {
    unstable_rethrow(error);
    const detail = describe(error);
    console.error(`[newsletter.provider_unavailable] ${action}: ${detail}`);
    return { ok: false, failure: "provider_unavailable", detail };
  }
}

export async function getSubscriberStats(): Promise<
  NewsletterResult<{ total: number }>
> {
  return guarded("getSubscriberStats", async () => {
    const resend = getResend();
    const { data } = await resend.contacts.list({ audienceId: getAudienceId() });
    return { total: data?.data?.length ?? 0 };
  });
}

export async function listBroadcasts(): Promise<NewsletterResult<unknown[]>> {
  return guarded("listBroadcasts", async () => {
    const resend = getResend();
    const { data } = await resend.broadcasts.list();
    return data?.data ?? [];
  });
}

/**
 * Cosa il fornitore dice del lotto **dopo** che gli e' stato chiesto di
 * spedirlo.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * PERCHE' LA NEWSLETTER NON ENTRA NEL REGISTRO DEGLI INVII, E QUESTO E' IL
 * SOSTITUTO
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Gli altri dieci messaggi del prodotto finiscono in `email_deliveries`, la cui
 * chiave e' l'identificativo **di un messaggio** e la cui riconciliazione e'
 * `emails.get(<id>)`. **La newsletter non produce ne' l'uno ne' l'altro.**
 * Misurato sull'SDK installato il 2026-08-22: `broadcasts.create` e
 * `broadcasts.send` restituiscono l'identificativo **di un broadcast**, e
 * `Broadcast` porta uno `status` di tre valori — `draft`, `queued`, `sent` —
 * che descrive **il lotto**, non un destinatario. Su questo percorso un esito
 * per persona non esiste da chiedere.
 *
 * Forzarla dentro avrebbe richiesto di spedirla **un messaggio per iscritto**
 * invece che come broadcast. Due ragioni per non farlo, e nessuna delle due e'
 * la comodita':
 *
 *   1. Una riga per destinatario su una lista lunga e' rumore che insegna a
 *      ignorare il canale. `comms-analytics.md` chiede di marcare per
 *      destinatario **un invio transazionale**; una lista non lo e'.
 *   2. `legal-compliance.md`, gate *i dati dei soci non sono i dati del
 *      prodotto*: gli iscritti alla newsletter **non sono membri**, e
 *      moltiplicare per il loro numero cio' che conserviamo su di loro e'
 *      esattamente il «gia' che ci siamo» che quel gate vieta.
 *
 * **Quindi l'esito si osserva come volume, e non si conserva niente.** Nessuna
 * riga in nessuna tabella: si chiede al fornitore, si mostra a chi ha premuto,
 * e finisce li'.
 *
 * ── E cio' che cambia davvero e' che si CHIEDE ───────────────────────────────
 *
 * Prima, `broadcasts.send` senza `error` era il successo. E' la stessa
 * assunzione che `src/lib/email.ts` faceva sui messaggi singoli e che si e'
 * rivelata falsa: **la risposta d'invio e' una ricevuta di presa in carico, non
 * un esito.** Un broadcast rimasto `draft` dopo un invio accettato e' una
 * newsletter che nessuno ha ricevuto e che nessuno avrebbe saputo.
 */
export type BroadcastDispatch =
  /** Il fornitore l'ha preso in carico. E' l'esito normale subito dopo l'invio. */
  | "queued"
  /** Gia' partito. */
  | "sent"
  /**
   * ⚠️ Accettato e **ancora una bozza**. Nessuno l'ha ricevuto, e senza questa
   * verifica sarebbe stato indistinguibile da un invio riuscito.
   */
  | "draft"
  /**
   * Abbiamo chiesto e non abbiamo una risposta utilizzabile — la lettura e'
   * fallita, oppure lo stato e' una parola che questo codice non conosce.
   *
   * Distinto dai tre sopra e mai collassato in «riuscito»: e' il difetto del
   * form newsletter registrato in `.planning/codebase/CONCERNS.md`, *"Qualcosa
   * e' andato storto"* per qualunque causa, applicato all'esito invece che
   * all'errore.
   */
  | "unknown";

/** Come si dice a un essere umano che ha appena premuto «invia». */
export interface BroadcastDispatchReport {
  id: string;
  dispatch: BroadcastDispatch;
  /**
   * Quanti iscritti c'erano nella lista al momento dell'invio, se si e' potuto
   * contare. **E' il volume**, ed e' l'unica misura che questo percorso puo'
   * onestamente dare: non esiste un per-destinatario da mostrare.
   *
   * `null` significa *non si e' potuto contare*, mai zero. Un lotto partito
   * verso «0 iscritti» e uno partito verso un numero ignoto sono due cose
   * diverse, e la prima sarebbe una bugia rassicurante.
   */
  audienceSize: number | null;
  /** La parola grezza del fornitore, per chi deve andare a fondo. */
  providerStatus: string | null;
}

export async function createAndSendBroadcast(
  subject: string,
  htmlContent: string
): Promise<NewsletterResult<BroadcastDispatchReport>> {
  return guarded("createAndSendBroadcast", async () => {
    const resend = getResend();
    const fromAddress =
      process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>";

    // Il volume, PRIMA dell'invio: e' la lista a cui il lotto sta per andare, e
    // dopo la partenza non e' piu' la stessa domanda. Solo il conteggio esce da
    // qui — nessun indirizzo, nessun nome: `comms-analytics.md`, gate *PII*.
    let audienceSize: number | null = null;
    try {
      const { data: contacts, error: contactsError } = await resend.contacts.list({
        audienceId: getAudienceId(),
      });
      // Un conteggio fallito non ferma un invio. Ma non diventa nemmeno zero:
      // resta `null`, che si legge *non lo sappiamo*.
      if (!contactsError) audienceSize = contacts?.data?.length ?? null;
      else
        console.error(
          `[newsletter.audience_count_failed] ${contactsError.message}`
        );
    } catch (err) {
      console.error(
        `[newsletter.audience_count_threw] ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    const { data: broadcast, error: createError } = await resend.broadcasts.create({
      audienceId: getAudienceId(),
      from: fromAddress,
      subject,
      html: htmlContent,
    });

    if (createError || !broadcast) {
      throw new Error(
        `Failed to create broadcast: ${createError?.message ?? "Unknown error"}`
      );
    }

    const { error: sendError } = await resend.broadcasts.send(broadcast.id);

    if (sendError) {
      throw new Error(`Failed to send broadcast: ${sendError.message}`);
    }

    // ── L'esito si CHIEDE — la stessa disciplina del denaro, sulla posta ───────
    //
    // `ticketing-payments.md`: *verifica SEMPRE con una GET, mai fidarsi del
    // corpo del webhook*. Qui l'annuncio e' la risposta di `broadcasts.send`, e
    // l'assenza di `error` in quella risposta dice che la richiesta e' stata
    // presa — non che il lotto sia partito.
    //
    // Una lettura fallita **non lancia**: il lotto potrebbe benissimo essere
    // partito, e trasformare un dubbio in un errore direbbe a chi ha premuto di
    // rimandare una newsletter che magari e' gia' uscita — cioe' il doppio
    // invio, che `comms-analytics.md` chiama incidente quando finisce al
    // pubblico sbagliato. Torna `unknown`, che si legge *vai a guardare*.
    let dispatch: BroadcastDispatch = "unknown";
    let providerStatus: string | null = null;

    try {
      const { data: settled, error: getError } = await resend.broadcasts.get(
        broadcast.id
      );
      if (getError) {
        console.error(
          `[newsletter.dispatch_unreadable] broadcast ${broadcast.id}: ${getError.message}`
        );
      } else {
        // Letto come STRINGA e classificato qui, per la stessa ragione misurata
        // in `src/lib/email-delivery/categories.ts`: l'unione di tipi dell'SDK
        // descrive una versione precedente dell'API del fornitore, e un ramo
        // scritto sul suo tipo non compilerebbe il giorno in cui ne aggiunge
        // uno. La parola grezza viaggia accanto al verdetto.
        providerStatus = (settled?.status as string | undefined) ?? null;
        dispatch =
          providerStatus === "queued"
            ? "queued"
            : providerStatus === "sent"
              ? "sent"
              : providerStatus === "draft"
                ? "draft"
                : "unknown";
      }
    } catch (err) {
      console.error(
        `[newsletter.dispatch_threw] broadcast ${broadcast.id}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    return { id: broadcast.id, dispatch, audienceSize, providerStatus };
  });
}

export async function deleteBroadcast(
  broadcastId: string
): Promise<NewsletterResult<{ success: true }>> {
  return guarded("deleteBroadcast", async () => {
    const resend = getResend();
    const { error } = await resend.broadcasts.remove(broadcastId);
    if (error) {
      throw new Error(`Failed to delete broadcast: ${error.message}`);
    }
    return { success: true as const };
  });
}
