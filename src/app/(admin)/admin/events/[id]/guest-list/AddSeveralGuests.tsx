"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Select, Textarea } from "@/components/ui/Input";
import type { GuestListEntry } from "@/types/database";
import { addGuest } from "./actions";
import { parseGuestLines, type UnparsedReason } from "./parse-guest-lines";

/**
 * «Add several» — a pasted guest list, read before it is saved (DBT-20,
 * D-52.1-25).
 *
 * ── A convenience of entry, NOT a new way in ─────────────────────────────────
 *
 * A guest-list entry is an entry into a night that was not paid for
 * (`ticketing-payments.md`, gate *guest list*), and every lane that adds one is
 * an exception to the gating mechanism that has to be counted and attributed
 * (`community-membership.md`, gate *nessuna corsia grigia*). So this box adds
 * **no server action**: each line goes through the very same `addGuest` the
 * single form above calls, one at a time — the same guard
 * (`assertStaffManage` + `assertMayManageEvent`) re-run for every line, the
 * same `added_by` written from the server's session, the same invitation mail,
 * the same count. A batch action was rejected on purpose: fifteen lines × up to
 * ~2 s each (the 500 ms wait in `processGuestEntry`) in one request, and a
 * different shape for the guard.
 *
 * ── Nothing it did not understand is saved ───────────────────────────────────
 *
 * The preview is computed entirely in the browser, from the pasted text and the
 * `entries` the page already loaded:
 *
 *   - a line that is not understood (two emails, no name, an email `addGuest`
 *     would refuse) is shown with its reason and **cannot be selected**;
 *   - an email already on this event's list — or earlier in the paste — is
 *     excluded: the unique index `(event_id, LOWER(email))` would refuse it
 *     anyway, and the preview says so first;
 *   - a same NAME (no constraint in the database) is flagged and left
 *     **unselected by default**, with a box to include it — two people can
 *     share a name, and the owner is the one who knows.
 *
 * ── Zero silent failures ─────────────────────────────────────────────────────
 *
 * Each `{ error }` from the server is recorded for ITS line, word for word. A
 * throw (the network) is recorded as «no response from the server» for the
 * line it happened on and STOPS the loop, saying how many were never tried —
 * never one message for the whole list (`meta-gates.md`). `router.refresh()`
 * runs once, at the end. Nothing here logs a name or an address.
 *
 * ── The invitation email, declared rather than changed ───────────────────────
 *
 * `processGuestEntry` sends the invitation without awaiting it (today's
 * behaviour for a single guest, assumption A8 of the research). The import
 * inherits it unchanged and says so under the box: a guest stays on the list
 * even if their email does not go out. The preview also says how many
 * invitations will leave, because they share the daily sending quota with
 * order confirmations.
 */

interface AddSeveralGuestsProps {
  eventId: string;
  parties: { id: string; title: string }[];
  entries: GuestListEntry[];
}

type Verdict =
  | { kind: "add" }
  | { kind: "same_name_list" }
  | { kind: "same_name_paste"; firstLine: number }
  | { kind: "email_on_list" }
  | { kind: "email_in_paste"; firstLine: number }
  | { kind: "unparsed"; reason: UnparsedReason };

type Outcome =
  | { kind: "added" }
  | { kind: "rejected"; message: string }
  | { kind: "no_response" }
  | { kind: "not_attempted" };

interface PreviewRow {
  line: number;
  raw: string;
  fullName: string | null;
  email: string | null;
  verdict: Verdict;
}

const UNPARSED_TEXT: Record<UnparsedReason, string> = {
  two_emails: "not understood: two emails",
  name_missing: "not understood: name missing",
  bad_email: "not understood: email not valid",
};

/** Same normalisation `addGuest` applies to a name, plus case. */
function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function verdictText(v: Verdict): string {
  switch (v.kind) {
    case "add":
      return "will be added";
    case "same_name_list":
      return "same name already on the list";
    case "same_name_paste":
      return `same name as line ${v.firstLine}`;
    case "email_on_list":
      return "already on the list (email)";
    case "email_in_paste":
      return `same email as line ${v.firstLine}`;
    case "unparsed":
      return UNPARSED_TEXT[v.reason];
  }
}

function isSelectableVerdict(v: Verdict): boolean {
  return (
    v.kind === "add" ||
    v.kind === "same_name_list" ||
    v.kind === "same_name_paste"
  );
}

function outcomeText(o: Outcome): string {
  switch (o.kind) {
    case "added":
      return "added";
    case "rejected":
      return `refused by the server: ${o.message}`;
    case "no_response":
      return "no response from the server — not known whether it was saved";
    case "not_attempted":
      return "not tried — the import stopped before this line";
  }
}

/** Reads the paste against the list already loaded. Pure, client-side. */
function buildPreview(text: string, entries: GuestListEntry[]): PreviewRow[] {
  const listEmails = new Set(
    entries
      .map((e) => e.email?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e))
  );
  const listNames = new Set(
    entries.map((e) => nameKey(`${e.first_name} ${e.last_name}`))
  );
  const pasteEmails = new Map<string, number>();
  const pasteNames = new Map<string, number>();
  const rows: PreviewRow[] = [];

  for (const parsed of parseGuestLines(text)) {
    if (parsed.kind === "blank") continue;
    if (parsed.kind === "unparsed") {
      rows.push({
        line: parsed.line,
        raw: parsed.raw,
        fullName: null,
        email: null,
        verdict: { kind: "unparsed", reason: parsed.reason },
      });
      continue;
    }

    const key = nameKey(parsed.fullName);
    let verdict: Verdict;
    if (parsed.email && listEmails.has(parsed.email)) {
      verdict = { kind: "email_on_list" };
    } else if (parsed.email && pasteEmails.has(parsed.email)) {
      verdict = {
        kind: "email_in_paste",
        firstLine: pasteEmails.get(parsed.email) as number,
      };
    } else if (listNames.has(key)) {
      verdict = { kind: "same_name_list" };
    } else if (pasteNames.has(key)) {
      verdict = {
        kind: "same_name_paste",
        firstLine: pasteNames.get(key) as number,
      };
    } else {
      verdict = { kind: "add" };
    }

    if (parsed.email && !pasteEmails.has(parsed.email)) {
      pasteEmails.set(parsed.email, parsed.line);
    }
    if (!pasteNames.has(key)) pasteNames.set(key, parsed.line);

    rows.push({
      line: parsed.line,
      raw: parsed.raw,
      fullName: parsed.fullName,
      email: parsed.email,
      verdict,
    });
  }

  return rows;
}

export default function AddSeveralGuests({
  eventId,
  parties,
  entries,
}: AddSeveralGuestsProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const [text, setText] = useState("");
  const [partyId, setPartyId] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<"preview" | "saving" | "done">("preview");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [outcomes, setOutcomes] = useState<Map<number, Outcome>>(new Map());

  const selectable = useMemo(
    () => (rows ?? []).filter((r) => isSelectableVerdict(r.verdict)),
    [rows]
  );
  const toSave = useMemo(
    () => (rows ?? []).filter((r) => selected.has(r.line)),
    [rows, selected]
  );
  const emailCount = toSave.filter((r) => r.email).length;
  const locked = phase !== "preview";

  function handlePreview() {
    const next = buildPreview(text, entries);
    setRows(next);
    setSelected(
      new Set(next.filter((r) => r.verdict.kind === "add").map((r) => r.line))
    );
    setOutcomes(new Map());
    setPhase("preview");
  }

  function handleTextChange(value: string) {
    setText(value);
    // A preview of a text that has since changed would save what nobody saw.
    if (rows && phase === "preview") setRows(null);
  }

  function handleReset() {
    setText("");
    setRows(null);
    setSelected(new Set());
    setOutcomes(new Map());
    setProgress({ done: 0, total: 0 });
    setPhase("preview");
  }

  async function handleSave() {
    if (toSave.length === 0) return;
    const queue = [...toSave];
    const recorded = new Map<number, Outcome>();
    setPhase("saving");
    setProgress({ done: 0, total: queue.length });

    for (let i = 0; i < queue.length; i++) {
      const row = queue[i];
      try {
        // The same action, the same arguments, as the single form above.
        const result = await addGuest(eventId, {
          full_name: row.fullName ?? "",
          email: row.email ?? undefined,
          party_id: partyId || undefined,
        });
        if ("error" in result && result.error) {
          recorded.set(row.line, { kind: "rejected", message: result.error });
        } else {
          recorded.set(row.line, { kind: "added" });
        }
      } catch {
        recorded.set(row.line, { kind: "no_response" });
        for (const rest of queue.slice(i + 1)) {
          recorded.set(rest.line, { kind: "not_attempted" });
        }
        setOutcomes(new Map(recorded));
        setProgress({ done: i + 1, total: queue.length });
        break;
      }
      setOutcomes(new Map(recorded));
      setProgress({ done: i + 1, total: queue.length });
    }

    setPhase("done");
    startTransition(() => {
      router.refresh();
    });
  }

  /** What a row says once the import has run, or what it will do before. */
  function statusOf(row: PreviewRow): string {
    const outcome = outcomes.get(row.line);
    if (outcome) return outcomeText(outcome);
    if (phase === "done") {
      if (isSelectableVerdict(row.verdict)) return "skipped: not selected";
      return `skipped: ${verdictText(row.verdict)}`;
    }
    if (isSelectableVerdict(row.verdict) && !selected.has(row.line)) {
      return `${verdictText(row.verdict)} — not selected`;
    }
    return verdictText(row.verdict);
  }

  const columns: DataColumn<PreviewRow>[] = [
    {
      key: "name",
      header: "Name read",
      card: "title",
      cell: (row) => row.fullName ?? row.raw,
    },
    {
      key: "line",
      header: "Line",
      card: "mark",
      figure: true,
      cell: (row) => <Badge>{row.line}</Badge>,
    },
    {
      key: "email",
      header: "Email read",
      cell: (row) => row.email ?? "—",
    },
    {
      key: "status",
      header: "Outcome",
      cell: (row) => statusOf(row),
    },
  ];

  const addedCount = [...outcomes.values()].filter(
    (o) => o.kind === "added"
  ).length;
  const skippedCount = (rows?.length ?? 0) - addedCount;
  const notAttempted = [...outcomes.values()].filter(
    (o) => o.kind === "not_attempted"
  ).length;

  return (
    <Card>
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-ink">Add several</h2>

        {parties.length > 0 && (
          <Select
            id="several-party"
            label="Party"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            disabled={locked}
          >
            <option value="">All Parties</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.title}
              </option>
            ))}
          </Select>
        )}

        <Textarea
          id="several-lines"
          label="One guest per line — Name Surname, email (optional)"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={6}
          disabled={locked}
          placeholder={"Name Surname, name@example.com\nName Surname"}
          hint="Invitations are sent in the background once each guest is saved: a guest stays on the list even if their email does not go out."
        />

        {phase === "preview" && (
          <Button
            type="button"
            variant="secondary"
            onClick={handlePreview}
            disabled={!text.trim()}
            className="w-full"
          >
            Preview
          </Button>
        )}

        {rows && (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => String(row.line)}
            caption="Pasted guest list, line by line: the name and email read from each line, and what will happen to it"
            empty={
              <p className="text-sm text-muted">
                Every line was blank — nothing to add.
              </p>
            }
            selection={{
              isSelectable: (row) =>
                !locked && isSelectableVerdict(row.verdict),
              isSelected: (row) => selected.has(row.line),
              onToggleRow: (row) =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(row.line)) next.delete(row.line);
                  else next.add(row.line);
                  return next;
                }),
              allSelected:
                selectable.length > 0 &&
                selectable.every((r) => selected.has(r.line)),
              onToggleAll: () =>
                setSelected((prev) =>
                  selectable.every((r) => prev.has(r.line))
                    ? new Set()
                    : new Set(selectable.map((r) => r.line))
                ),
              rowLabel: (row) =>
                `Include line ${row.line}${row.fullName ? `, ${row.fullName}` : ""}`,
              allLabel: "Include every line that can be added",
              idPrefix: "several-include",
            }}
          />
        )}

        {rows && phase === "preview" && rows.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-ink">
              {toSave.length} {toSave.length === 1 ? "guest" : "guests"} will
              be added · {emailCount} invitation{" "}
              {emailCount === 1 ? "email" : "emails"} will be sent
            </p>
            <p className="text-xs text-muted">
              Invitation emails share the daily sending limit with order
              confirmations.
            </p>
            <Button
              type="button"
              onClick={handleSave}
              disabled={toSave.length === 0}
              className="w-full"
            >
              Add {toSave.length} {toSave.length === 1 ? "guest" : "guests"}
            </Button>
          </div>
        )}

        {phase === "saving" && (
          <p className="text-sm text-ink" role="status" aria-live="polite">
            Adding… {progress.done} / {progress.total}
          </p>
        )}

        {phase === "done" && rows && (
          <div className="space-y-2" role="status" aria-live="polite">
            <p className="text-sm font-semibold text-ink">
              Added {addedCount} · Skipped {skippedCount}
            </p>
            {notAttempted > 0 && (
              <p className="text-xs text-sem-crit">
                The import stopped: {notAttempted}{" "}
                {notAttempted === 1 ? "line was" : "lines were"} not tried.
                Check the list before pasting them again.
              </p>
            )}
            <p className="text-xs text-muted">
              The reason for each skipped line is in its Outcome above.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={isRefreshing}
              className="w-full"
            >
              Paste another list
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
