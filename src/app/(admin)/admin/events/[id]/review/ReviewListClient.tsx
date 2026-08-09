"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EVENT_TIME_ZONE } from "@/utils/datetime";
import { DOUBLE_READ_WINDOW_SECONDS } from "@/lib/door/classify";
import type { ClassifiedEntry } from "@/lib/door/classify";
import type { DoorScanCause } from "@/lib/door/outcome";
import type { UserRole } from "@/types/database";

/**
 * Two views over one night, and the difference between them is what may be
 * serialised.
 *
 * ── FIX-12, stated precisely ─────────────────────────────────────────────────
 * Offering the technical view only to a master is an **interface affordance, not
 * a security boundary**. An organizer can already read every profile through
 * `profiles_select_admin` (`20260224_rbac_migration.sql:151`), so presenting
 * this as a boundary would be a claim the database does not back — and a claim
 * the database does not back is worse than no claim, because somebody will rely
 * on it.
 *
 * What **is** enforceable: the copied text renders columns of a table that has
 * no column for a name and none for an address (`20260805120000_
 * door_scan_events.sql:28-34`), and it joins nothing. `ClassifiedEntry` has no
 * field one could be put in, and the technical view below does not receive the
 * label map at all. The export is therefore safe by construction rather than by
 * discipline — which matters, because copied text leaves the perimeter and
 * cannot be recalled.
 *
 * ── FIX-13, which is a negative requirement ──────────────────────────────────
 * This component writes nothing, anywhere. It shows **no per-member aggregate**
 * — no "this member has N conflicts", no grouping by person, no sorting by
 * person — and attaches no label to anybody. An entry that was admitted is
 * presented as admitted. Any consequence for a member is a human decision, taken
 * elsewhere and recorded as such.
 *
 * That paragraph is here because the natural next feature request is exactly the
 * thing the requirement forbids: "could we see who does this most often?" The
 * answer is no, and the reason is that a list which answers it has decided
 * something about a person without anybody choosing to.
 */

interface ReviewListClientProps {
  eventId: string;
  parties: { id: string; title: string }[];
  selectedPartyId: string | null;
  entries: ClassifiedEntry[];
  counters: Record<DoorScanCause, number>;
  unclassified: number;
  total: number;
  /** Operator id → display name. **Prose view only.** Never passed downward. */
  operatorLabels: Record<string, string>;
  role: UserRole | null;
  nightStartIso: string | null;
  nightEndIso: string | null;
  readError: string | null;
}

/** Turin, always — the same zone the night is declared in. */
const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: EVENT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function timeInTurin(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "—";
  return TIME_FORMAT.format(new Date(parsed));
}

/** Enough of an identifier to compare two rows by eye, never a person's name. */
function shortId(id: string | null): string {
  if (!id) return "unidentified";
  return id.slice(0, 8);
}

function gapPhrase(seconds: number | null): string {
  if (seconds === null) return "an unknown interval apart";
  if (seconds < 90) return `${Math.round(seconds)} seconds apart`;
  return `${Math.round(seconds / 60)} minutes apart`;
}

/**
 * What happened, in a sentence — not a code.
 *
 * A total `Record` on purpose: a ninth cause added to the union becomes a build
 * error here rather than a row that renders as nothing.
 */
const PROSE: Record<DoorScanCause, (entry: ClassifiedEntry) => string> = {
  two_devices: (e) =>
    `the same ticket was read on two devices, ${gapPhrase(e.secondsSincePrevious)}`,
  second_ticket_same_holder: () => "the same code was read twice",
  invalid_signature: () =>
    "a code this system could not honour was presented — either it carried no valid signature, or it named a ticket that no longer exists",
  not_in_cache: () =>
    "admitted while offline; the ticket was not in the list downloaded to that device",
  refunded_before_night: () =>
    "admitted; this ticket had been refunded before the night",
  wrong_night: () => "a ticket for another night was presented",
  // Neither of the two below reaches a listed row — `classifyNight` hides a
  // double read and files a refund issued after the night under accounting. They
  // are written out so the record stays total.
  double_read: () => "the same code was read twice within seconds",
  refunded_after_night: () => "refunded after the night began",
};

/** What each cause asks of the person reading. Never a verdict on a guest. */
const NOTE: Partial<Record<DoorScanCause, string>> = {
  two_devices: "Worth a look: two people may have entered on one ticket.",
  second_ticket_same_holder: "No action beyond making the entry count add up.",
  invalid_signature: "The door was told at the time, when the network allowed.",
};

const COUNTER_LABEL: Record<DoorScanCause, string> = {
  double_read: "reads within seconds",
  second_ticket_same_holder: "same code read twice",
  two_devices: "read on two devices",
  invalid_signature: "codes this system could not honour",
  not_in_cache: "admitted from a device that had not downloaded the ticket",
  wrong_night: "tickets for another night",
  refunded_before_night: "admitted after a refund made before the night",
  refunded_after_night: "refunded after the night began (accounting)",
};

/**
 * The technical view.
 *
 * Its props are `entries` and nothing else: it does not receive `operatorLabels`
 * and therefore cannot render, copy or leak a name. That is the whole of FIX-12
 * on this surface, expressed as a function signature rather than as a rule
 * somebody has to remember.
 */
function TechnicalView({ entries }: { entries: ClassifiedEntry[] }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  const COLUMNS = [
    "id",
    "subject_type",
    "subject_id",
    "cause",
    "scanned_at",
    "recorded_at",
    "operator_id",
    "device_id",
    "source",
  ];

  const rowValues = (entry: ClassifiedEntry) => [
    entry.id,
    entry.subjectType,
    entry.subjectId ?? "",
    entry.cause ?? "",
    entry.scannedAt,
    entry.recordedAt,
    entry.operatorId,
    entry.deviceId,
    entry.source,
  ];

  const asTsv = [
    COLUMNS.join("\t"),
    ...entries.map((entry) => rowValues(entry).join("\t")),
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asTsv);
      setCopied("done");
    } catch {
      // Distinct from "nothing to copy": a clipboard denied by the browser and
      // an empty night must not look the same.
      setCopied("failed");
    }
  };

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Technical detail
        </h2>
        <button
          type="button"
          onClick={copy}
          className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-border/30 transition-colors"
        >
          {copied === "done"
            ? "Copied"
            : copied === "failed"
              ? "Copy blocked by the browser"
              : "Copy as TSV"}
        </button>
      </div>

      <p className="mt-1 text-xs text-muted">
        Identifiers only — these are the columns of the night&apos;s record, joined
        to nothing. It can be pasted into a diagnostic tool without carrying
        anybody&apos;s personal data out with it.
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-card-border">
        <table className="min-w-full text-left text-[11px]">
          <thead className="text-muted">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-card-border">
                {rowValues(entry).map((value, index) => (
                  <td
                    key={COLUMNS[index]}
                    className="whitespace-nowrap px-3 py-2 text-foreground"
                  >
                    {value || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ReviewListClient({
  eventId,
  parties,
  selectedPartyId,
  entries,
  counters,
  unclassified,
  total,
  operatorLabels,
  role,
  nightEndIso,
  readError,
}: ReviewListClientProps) {
  const router = useRouter();

  const nightEnd = nightEndIso ? Date.parse(nightEndIso) : NaN;
  const landedAfterTheNight = (entry: ClassifiedEntry) => {
    if (Number.isNaN(nightEnd)) return false;
    const recorded = Date.parse(entry.recordedAt);
    return !Number.isNaN(recorded) && recorded > nightEnd;
  };

  const doubleReads = counters.double_read;
  const otherCounters = (
    Object.entries(counters) as [DoorScanCause, number][]
  ).filter(([cause, count]) => cause !== "double_read" && count > 0);

  return (
    <div>
      {parties.length > 1 && (
        <div className="mb-5">
          <label
            htmlFor="review-party"
            className="block text-xs font-medium text-muted"
          >
            Night
          </label>
          <select
            id="review-party"
            value={selectedPartyId ?? ""}
            // The collapsed address (D-34-03). This control is the one that
            // exercises the per-night gate: changing the night rewrites
            // `?party=`, and the page re-asks `party.manage` about whatever
            // this produces. `typedRoutes` refused the prior literal the moment
            // the page left the organizer tree — which is D-34-14 working, and
            // the reason the 308 is emitted by the middleware rather than
            // declared in `next.config`.
            onChange={(e) =>
              router.push(
                `/admin/events/${eventId}/review?party=${e.target.value}`
              )
            }
            className="mt-1 w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm text-foreground"
          >
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {parties.length === 0 && (
        <p className="text-sm text-muted">
          This event has no parties yet, so there is no night to review.
        </p>
      )}

      {/*
        A read that failed must never look like a quiet night. On this surface an
        empty list is the *designed* state, so the two would otherwise be
        indistinguishable — the worst possible confusion here, and the reason
        this block is loud while the empty state below is not.
      */}
      {readError && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-400">
            The night&apos;s record could not be read
          </p>
          <p className="mt-1 text-xs text-red-400/80">{readError}</p>
        </div>
      )}

      {/*
        The designed empty state, not a fallback. A normal night has no conflicts
        and this must read as *nothing happened*, never as *nothing loaded*. No
        badge, no alert colour, no call to action — FIX-11 says this list raises
        no notification and asks for nothing.
      */}
      {!readError && parties.length > 0 && entries.length === 0 && (
        <div className="rounded-xl border border-card-border bg-card p-5">
          <p className="text-sm font-medium text-foreground">
            Nothing needed attention on this night.
          </p>
          <p className="mt-1 text-sm text-muted">
            {total === 0
              ? "No scans were recorded."
              : `${total} scan${total === 1 ? "" : "s"} recorded, all of them ordinary.`}
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-card-border bg-card p-4"
            >
              <p className="text-sm text-foreground">
                At {timeInTurin(entry.scannedAt)},{" "}
                {entry.cause ? PROSE[entry.cause](entry) : "a scan was recorded"}
                {" — "}
                {entry.subjectType === "ticket"
                  ? `ticket ${shortId(entry.subjectId)}`
                  : entry.subjectType === "guest_list_entry"
                    ? `guest-list entry ${shortId(entry.subjectId)}`
                    : `membership ${shortId(entry.subjectId)}`}
                .
              </p>

              <p className="mt-1 text-xs text-muted">
                Read by {operatorLabels[entry.operatorId] || "an unnamed operator"}
                {entry.source === "offline_sync" ? ", synced from offline" : ""}
                {landedAfterTheNight(entry)
                  ? `, recorded at ${timeInTurin(entry.recordedAt)} — after the night had ended`
                  : ""}
                .
                {entry.cause && NOTE[entry.cause] ? ` ${NOTE[entry.cause]}` : ""}
              </p>

              {entry.undoneAt && (
                <p className="mt-1 text-xs text-muted">
                  This entry was reversed at {timeInTurin(entry.undoneAt)}.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {(doubleReads > 0 || otherCounters.length > 0) && (
        <section className="mt-6 rounded-xl border border-card-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Counted for this night
          </h2>

          {doubleReads > 0 && (
            <div className="mt-2">
              <p className="text-sm text-foreground">
                {doubleReads} read{doubleReads === 1 ? " was" : "s were"} the same
                code within seconds and {doubleReads === 1 ? "is" : "are"} not
                listed.
              </p>
              <p className="mt-1 text-xs text-muted">
                A rising number here means the scanner&apos;s feedback was not
                visible at the door — a defect to correct in the phone and the
                lighting, rather than one to filter away. It says nothing about
                any guest: nobody enters twice from one door in{" "}
                {DOUBLE_READ_WINDOW_SECONDS} seconds.
              </p>
            </div>
          )}

          {otherCounters.length > 0 && (
            <ul className="mt-3 space-y-1">
              {otherCounters.map(([cause, count]) => (
                <li key={cause} className="text-xs text-muted">
                  {count} — {COUNTER_LABEL[cause]}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-xs text-muted">
            {total} scan{total === 1 ? "" : "s"} in all, of which {unclassified}{" "}
            {unclassified === 1 ? "was" : "were"} an ordinary admission or a
            reversal.
          </p>
        </section>
      )}

      {role === "master" && entries.length > 0 && (
        <TechnicalView entries={entries} />
      )}
    </div>
  );
}
