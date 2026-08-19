import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { menuCloseInstant } from "@/utils/datetime";
import { logMoneyPathFailure } from "@/lib/failure/money-path";

/*
  Qui viveva `toSafeError`, che restringeva un valore catturato ai soli `code` e
  `message` prima di finire in un log. Il suo unico chiamante era il `catch` del
  ramo di rimborso, rimosso il 2026-08-20 con `DRK-01`: senza chiamante era
  codice morto che SEMBRAVA una protezione attiva, e su un percorso del denaro
  quello e' peggio che altrove.

  La lezione non si perde: vive in `logMoneyPathFailure`, che questo file usa
  ancora sul fallimento della cancellazione. La ragione era che il campo
  `details` di un errore PostgREST, su una violazione di vincolo, porta **la riga
  rifiutata intera**.
*/

const CRON_REFUND_OK = "cron_refund_ok";
const CRON_REFUND_DELETE_REFUSED = "cron_refund_delete_refused";
const CRON_REFUND_DELETE_SHORT = "cron_refund_delete_short";

type CronRefundOutcome =
  | typeof CRON_REFUND_OK
  | typeof CRON_REFUND_DELETE_REFUSED
  | typeof CRON_REFUND_DELETE_SHORT;

/**
 * The status each outcome answers with, as a **total** `Record` over the union.
 *
 * **What the failure statuses mean here, and why they are not a refusal.** A
 * cleanup that could not run is not a refusal of a caller — this route has one
 * caller and it is a scheduler. It is a run that **did not finish**, and the
 * platform's cron dashboard is the only place that fact becomes visible to a
 * person: it reads the 2xx / non-2xx boundary and paints the run green or red.
 * That is the whole reason the status matters, and it is the whole reason the
 * two failure outcomes are non-2xx (D-46-06). La stessa riga estendeva la regola
 * a `refundErrors > 0`, per la risposta **A** del proprietario in `46-COPY.md`:
 * quel terzo esito **non esiste piu' dal 2026-08-20**, perche' non esiste piu' un
 * rimborso che questo processo possa fallire (`DRK-01`). La decisione non e'
 * stata revocata — e' rimasta senza oggetto, che e' una cosa diversa e va detta
 * cosi', o la prossima persona cerchera' un ramo che non c'e'.
 *
 * The two failures share `500` deliberately. The dashboard reads only the
 * boundary, so a finer code would be a distinction nobody reads, while the body
 * already names the outcome and carries every count. The map stays total so the
 * next category still has to declare a status on purpose.
 *
 * **This is the whole observable channel for this route.** There is no error
 * tracking in this repository (`OBS-01`, deferred to Future), the cron runs at
 * night, and a counter inside a 200 is a log line — a place nobody looks. The
 * accepted cost is on the record with D-46-06: **if it fails often the red
 * becomes wallpaper.**
 */
const CRON_REFUND_HTTP = {
  [CRON_REFUND_OK]: 200,
  [CRON_REFUND_DELETE_REFUSED]: 500,
  [CRON_REFUND_DELETE_SHORT]: 500,
} as const satisfies Record<CronRefundOutcome, number>;

/**
 * The sentence each outcome reports with — a second total `Record`, answering a
 * different question about the same union.
 *
 * The four are **verbatim from `.planning/phases/46-silent-failures-on-the-money-path/46-COPY.md`,
 * §4**, approved in one pass on 2026-08-14. They are operator-facing: they are
 * read in the hosting dashboard by whoever watches deployments, not by a guest.
 * No sentence is composed at run time and none of them carries a count — the
 * counts travel as fields beside them, which is what keeps the wording
 * written-once. A plan that wants different words amends `46-COPY.md` and
 * re-presents it whole; it does not edit a string here.
 */
const CRON_REFUND_REPORT: Record<CronRefundOutcome, string> = {
  [CRON_REFUND_OK]:
    "The run completed: every expired order was refunded and every spent token row was deleted.",
  [CRON_REFUND_DELETE_REFUSED]:
    "The cleanup delete was refused, so spent token rows are still in the table. The refunds themselves are unaffected.",
  [CRON_REFUND_DELETE_SHORT]:
    "Fewer token rows were deleted than were asked for. The rows that remain are still in the table and are not counted as deleted.",
};

/** What the run measured. Every field is a count; none of them is an intention. */
type CronRefundCounts = {
  deleteRequested: number;
  deleted: number;
};

/**
 * One function producing the category, the log line and the response together.
 *
 * Same shape and the same reason as `refuse()` in
 * `src/app/api/media/finalize/route.ts:414-421` and `respond()` in the check-in
 * route: written as one function, the outcome, the status and the log cannot
 * drift apart at one call site. This is a cron — nobody is watching the moment
 * they do.
 *
 * The log fires on failure only. A line every night on the success path is noise
 * in the one place a real failure has to be legible. Nothing but counts, the
 * category and the approved sentence goes into it: no token id, no order id, no
 * transaction code, no provider message. A cron body is readable by anyone
 * holding the secret and gets quoted into dashboards.
 */
function respond(outcome: CronRefundOutcome, counts: CronRefundCounts) {
  const status = CRON_REFUND_HTTP[outcome];
  const report = CRON_REFUND_REPORT[outcome];
  if (status !== 200) {
    console.error(`[${outcome}] ${report}`, counts);
  }
  return NextResponse.json({ ...counts, outcome, report }, { status });
}

/**
 * Cron giornaliero: **pulizia**, e nient'altro.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINO AL 2026-08-19 QUESTO PROCESSO RESTITUIVA DENARO DA SOLO. NON PIU'.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Ogni notte selezionava i token comprati e non riscattati oltre la grazia, e
 * chiamava `refundTransaction` su ciascun ordine. Nessun essere umano lo
 * guardava.
 *
 * **Nessun rimborso e' automatico** (`DRK-01`, decisione del proprietario del
 * 2026-08-19): li emette un admin o un organizer, caso per caso, guardato di
 * persona. Chi non ha bevuto il suo drink **chiede**, dal piano 47-03, e chi
 * decide guarda dal piano 47-04.
 *
 * **E la ragione non e' solo di policy.** Un token puo' essere stato attivato e
 * annullato piu' volte — cioe' **bevuto** — e restare in `purchased`: e'
 * l'intero difetto che la fase 47 e' andata a chiudere, riprodotto in
 * laboratorio in `.planning/v1.6-PHASE-47-PROBE.md`. Un processo notturno non ha
 * modo di distinguerlo da un drink mai toccato, e restituiva denaro in
 * entrambi i casi.
 *
 * Cosa resta: cancellare le righe dei token spesi, quando nessuno puo' piu'
 * chiedere nulla su di loro.
 *
 * 1. Find all purchased tokens whose party grace period has ended (menu close + 1h).
 * 2. Group by order_id, do partial SumUp refunds, mark tokens as 'refunded'.
 * 3. Delete redeemed/refunded tokens 24h after menu close.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date();

  /*
    ── La pulizia, e perche' non corre piu' a 24 ore ─────────────────────────

    Cancellava i token spesi 24 ore dopo la chiusura del menu. Dal piano 47-03 la
    richiesta di rimborso ha una finestra che **di norma e' 72**, e che ogni
    serata puo' cambiare.

    Una pulizia che corre PRIMA della finestra cancella cio' che la finestra deve
    ancora poter leggere, e il modo in cui fallisce e' il peggiore: **in
    silenzio**. Chi chiede all'ora 70 riceve *«questo drink non risulta piu' fra
    i nostri»* — che e' vero, e che e' colpa nostra.

    E porterebbe via con se' `activation_count`, cioe' il dato che tutta la fase
    47 esiste per creare: senza, chi esamina una richiesta non ha piu' modo di
    sapere se quel token e' stato bevuto.

    Quindi la pulizia legge la stessa finestra della richiesta, e aspetta il
    massimo fra le due — mai il minimo.

    ── Cosa NON viene cancellato, e l'assenza e' la regola ───────────────────

    I token `purchased` non compaiono in questo filtro e non devono comparirci:
    sono esattamente le righe su cui qualcuno puo' ancora chiedere. Prima del
    2026-08-20 sparivano per un'altra strada — venivano rimborsati e diventavano
    `refunded` — e quella strada non esiste piu'.
  */
  const { data: oldTokens } = await supabase
    .from("drink_tokens")
    .select(
      "id, party_id, event_parties(date, end_time, menu_closes_at, refund_request_window_hours)"
    )
    .in("status", ["redeemed", "refunded"]);

  const tokenIdsToDelete = (oldTokens ?? [])
    .filter((token) => {
      const party = token.event_parties as unknown as {
        date: string;
        end_time: string | null;
        menu_closes_at: string | null;
        refund_request_window_hours: number | null;
      } | null;
      if (!party) return false;

      const closeTimeStr = party.menu_closes_at ?? party.end_time;
      if (!closeTimeStr || !party.date) return false;

      const closeDt = menuCloseInstant(party.date, closeTimeStr);

      // Il massimo fra la vecchia soglia e la finestra di richiesta. Il `?? 72`
      // non e' un default di comodo: la colonna e' `NOT NULL DEFAULT 72`, quindi
      // un null qui vuol dire che la lettura non l'ha portata — e in quel caso
      // si aspetta il piu' a lungo, non il meno.
      const oreFinestra = party.refund_request_window_hours ?? 72;
      const cleanupTime = new Date(
        closeDt.getTime() + Math.max(24, oreFinestra) * 60 * 60 * 1000
      );

      return now > cleanupTime;
    })
    .map((t) => t.id);

  // How many rows the cleanup **asked** to delete. Reported beside how many were
  // actually deleted, so *asked 40, deleted 40* and *asked 40, deleted 0* are two
  // different lines in a dashboard instead of the same one.
  const deleteRequested = tokenIdsToDelete.length;
  let deletedCount = 0;
  let deleteRefused = false;

  if (deleteRequested > 0) {
    // `{ count: "exact" }` is required, not decorative: without it `.delete()`
    // returns `count === null` on the **success** path too, which is what made
    // the old `?? tokenIdsToDelete.length` fallback fire essentially always and
    // report the rows that remain as deleted.
    const { count, error } = await supabase
      .from("drink_tokens")
      .delete({ count: "exact" })
      .in("id", tokenIdsToDelete);
    if (error) {
      logMoneyPathFailure("cron refund-expired-tokens cleanup delete", error);
      deleteRefused = true;
    }
    // No coalesce to the intended length. A null count is not a measurement, so
    // it is reported as zero deleted and the run goes red on the short branch.
    deletedCount = count ?? 0;
  }

  // Restano due modi di non finire, e nessuno dei due riguarda il denaro: dal
  // 2026-08-20 questo processo non ne muove piu' (`DRK-01`). Il commento che
  // stava qui ordinava «il denaro batte la pulizia» — non c'e' piu' un denaro da
  // ordinare, e lasciarlo avrebbe fatto cercare a qualcuno un ramo che non
  // esiste.
  const outcome: CronRefundOutcome = deleteRefused
    ? CRON_REFUND_DELETE_REFUSED
    : deletedCount < deleteRequested
      ? CRON_REFUND_DELETE_SHORT
      : CRON_REFUND_OK;

  return respond(outcome, {
    deleteRequested,
    deleted: deletedCount,
  });
}
