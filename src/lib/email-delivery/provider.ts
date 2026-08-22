import { Resend } from "resend";

/**
 * provider.ts — il client del fornitore, in un modulo che non importa nulla di
 * nostro.
 *
 * ── Perche' e' stato estratto da `email.ts` ──────────────────────────────────
 *
 * Per rompere un ciclo, e il ciclo era reale: `email.ts` registra ogni invio
 * chiamando `ledger.ts`, e `ledger.ts` chiede al fornitore l'esito di quegli
 * invii — quindi gli serve lo stesso client. Lasciandolo dov'era, i due moduli
 * si sarebbero importati a vicenda.
 *
 * ESM tollera i cicli, e questo e' precisamente il problema: **funziona finche'
 * funziona.** Un ciclo si rompe il giorno in cui qualcuno sposta
 * un'inizializzazione dentro il corpo di un modulo invece che dentro una
 * funzione, e si rompe come `undefined is not a function` a runtime, su un
 * percorso che spedisce biglietti, in un progetto senza error tracking. Un file
 * che non importa niente di nostro non ha quel giorno.
 *
 * `getResend` resta **ri-esportata da `@/lib/email`**: i tre moduli che gia' la
 * importano di li' — il cron dei promemoria, le azioni newsletter e la
 * rivelazione del venue — non cambiano una riga.
 */

// Lazy initialization to avoid build-time errors when env vars are missing
let _resend: Resend | null = null;

export function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
