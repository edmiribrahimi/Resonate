import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { refundTransaction, getCheckout } from "@/lib/sumup";
import { menuCloseInstant } from "@/utils/datetime";
import { logMoneyPathFailure, type SafeError } from "@/lib/failure/money-path";

/**
 * A caught value narrowed to the only two fields anything on this path may log.
 *
 * A `catch` binds `unknown`, and logging that value whole prints whatever the
 * thrower attached — for a PostgREST error that includes `details`, which on a
 * constraint violation is **the whole rejected row**. `SafeError` is
 * the guard, and this function is the only way an unknown reaches it: `code` and
 * `message` are copied when they are strings, and everything else is dropped
 * rather than stringified.
 */
function toSafeError(err: unknown): SafeError {
  if (typeof err !== "object" || err === null) {
    return { code: null, message: typeof err === "string" ? err : null };
  }
  const { code, message } = err as { code?: unknown; message?: unknown };
  return {
    code: typeof code === "string" ? code : null,
    message: typeof message === "string" ? message : null,
  };
}

/**
 * What a run of this cron can have been.
 *
 * Four constants, a union built from `typeof` over them, and **two** total
 * `Record`s below — the construction stated once in `src/lib/failure/money-path.ts`
 * and already carried by `src/lib/door/outcome.ts:278-302` and
 * `src/app/api/media/finalize/route.ts:236-254`. A fifth outcome added later
 * without a status or without a sentence is an `npm run build` error rather than
 * a run that reports as nothing, and in a repository with no test runner that
 * build is the only automatic gate there is.
 *
 * This vocabulary is **this route's own**. A cron-report category and a bar-screen
 * category have different readers, different remedies and different lifetimes;
 * merging them would produce a union where most of every `Record` is unreachable
 * padding, which is how a totality check stops meaning anything.
 *
 * This is the **first converted cron in this repository**, so it is written for
 * the next one to copy.
 */
const CRON_REFUND_OK = "cron_refund_ok";
const CRON_REFUND_DELETE_REFUSED = "cron_refund_delete_refused";
const CRON_REFUND_DELETE_SHORT = "cron_refund_delete_short";
const CRON_REFUND_REFUNDS_FAILED = "cron_refund_refunds_failed";

type CronRefundOutcome =
  | typeof CRON_REFUND_OK
  | typeof CRON_REFUND_DELETE_REFUSED
  | typeof CRON_REFUND_DELETE_SHORT
  | typeof CRON_REFUND_REFUNDS_FAILED;

/**
 * The status each outcome answers with, as a **total** `Record` over the union.
 *
 * **What the failure statuses mean here, and why they are not a refusal.** A
 * cleanup that could not run is not a refusal of a caller — this route has one
 * caller and it is a scheduler. It is a run that **did not finish**, and the
 * platform's cron dashboard is the only place that fact becomes visible to a
 * person: it reads the 2xx / non-2xx boundary and paints the run green or red.
 * That is the whole reason the status matters, and it is the whole reason the
 * three failure outcomes are non-2xx (D-46-06, extended to `refundErrors > 0` by
 * the owner's answer **A** recorded in `46-COPY.md`).
 *
 * The three failures share `500` deliberately. The dashboard reads only the
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
  [CRON_REFUND_REFUNDS_FAILED]: 500,
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
  [CRON_REFUND_REFUNDS_FAILED]:
    "One or more refunds could not be issued. That is money that should have gone back and has not — each failure is logged on its own line and needs a refund by hand.",
};

/** What the run measured. Every field is a count; none of them is an intention. */
type CronRefundCounts = {
  refunded: number;
  refundErrors: number;
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
 * Daily cron: refund expired unclaimed drink tokens and clean up old ones.
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

  // ── Step 1: Find expired unclaimed tokens ──────────────────────────────
  const { data: purchasedTokens } = await supabase
    .from("drink_tokens")
    .select(
      "id, order_id, price, party_id, event_parties(date, end_time, menu_closes_at)"
    )
    .eq("status", "purchased");

  const tokensToRefund = (purchasedTokens ?? []).filter((token) => {
    const party = token.event_parties as unknown as {
      date: string;
      end_time: string | null;
      menu_closes_at: string | null;
    } | null;
    if (!party) return false;

    const closeTimeStr = party.menu_closes_at ?? party.end_time;
    if (!closeTimeStr || !party.date) return false;

    const closeDt = menuCloseInstant(party.date, closeTimeStr);
    const graceEnd = new Date(closeDt.getTime() + 60 * 60 * 1000);

    return now > graceEnd;
  });

  // ── Step 2: Group by order_id and refund ───────────────────────────────
  const orderGroups = new Map<
    string,
    { id: string; price: number }[]
  >();
  for (const token of tokensToRefund) {
    const list = orderGroups.get(token.order_id) ?? [];
    list.push({ id: token.id, price: Number(token.price) });
    orderGroups.set(token.order_id, list);
  }

  let refundedCount = 0;
  let refundErrors = 0;

  for (const [orderId, tokens] of orderGroups) {
    try {
      // Get order's transaction code
      const { data: order } = await supabase
        .from("drink_orders")
        .select("sumup_checkout_id, sumup_transaction_code")
        .eq("id", orderId)
        .single();

      if (!order) continue;

      let txCode = order.sumup_transaction_code;

      // Fallback: fetch transaction code from SumUp checkout API
      if (!txCode && order.sumup_checkout_id) {
        try {
          const checkout = await getCheckout(order.sumup_checkout_id);
          txCode = checkout.transactions?.[0]?.transaction_code ?? null;
          if (txCode) {
            await supabase
              .from("drink_orders")
              .update({ sumup_transaction_code: txCode })
              .eq("id", orderId);
          }
        } catch {
          // checkout retrieval failed
        }
      }

      if (!txCode) {
        console.error(`No transaction code for order ${orderId}, skipping refund`);
        refundErrors++;
        continue;
      }

      const refundAmount = tokens.reduce((sum, t) => sum + t.price, 0);

      // Round to 2 decimal places for SumUp
      const roundedAmount = Math.round(refundAmount * 100) / 100;

      await refundTransaction(txCode, roundedAmount);

      // Mark tokens as refunded
      const tokenIds = tokens.map((t) => t.id);
      await supabase
        .from("drink_tokens")
        .update({
          status: "refunded",
          refunded_at: now.toISOString(),
        })
        .in("id", tokenIds);

      // Track refunded amount on the order (survives token cleanup)
      const { data: existingOrder } = await supabase
        .from("drink_orders")
        .select("refunded_amount")
        .eq("id", orderId)
        .single();
      const prevRefunded = Number(existingOrder?.refunded_amount ?? 0);
      await supabase
        .from("drink_orders")
        .update({ refunded_amount: prevRefunded + roundedAmount })
        .eq("id", orderId);

      refundedCount += tokens.length;
    } catch (err) {
      // The `orderId` stays in the scope string — it is the thing that made this
      // line useful — but the caught value no longer travels whole.
      logMoneyPathFailure(
        `cron refund-expired-tokens refund order=${orderId}`,
        toSafeError(err)
      );
      refundErrors++;
    }
  }

  // ── Step 3: Cleanup old tokens (24h after menu close) ──────────────────
  const { data: oldTokens } = await supabase
    .from("drink_tokens")
    .select(
      "id, party_id, event_parties(date, end_time, menu_closes_at)"
    )
    .in("status", ["redeemed", "refunded"]);

  const tokenIdsToDelete = (oldTokens ?? [])
    .filter((token) => {
      const party = token.event_parties as unknown as {
        date: string;
        end_time: string | null;
        menu_closes_at: string | null;
      } | null;
      if (!party) return false;

      const closeTimeStr = party.menu_closes_at ?? party.end_time;
      if (!closeTimeStr || !party.date) return false;

      const closeDt = menuCloseInstant(party.date, closeTimeStr);
      const cleanupTime = new Date(
        closeDt.getTime() + 24 * 60 * 60 * 1000
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

  // Money outranks cleanup, so a failed refund names the outcome even when the
  // delete also failed. Nothing is hidden by the ordering: every count is in the
  // body either way, and the delete's own failure has already been logged. The
  // ordering decides which sentence leads, not which facts are reported.
  const outcome: CronRefundOutcome =
    refundErrors > 0
      ? CRON_REFUND_REFUNDS_FAILED
      : deleteRefused
        ? CRON_REFUND_DELETE_REFUSED
        : deletedCount < deleteRequested
          ? CRON_REFUND_DELETE_SHORT
          : CRON_REFUND_OK;

  return respond(outcome, {
    refunded: refundedCount,
    refundErrors,
    deleteRequested,
    deleted: deletedCount,
  });
}
