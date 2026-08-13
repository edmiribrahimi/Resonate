"use client";

import { useEffect, useState, useTransition } from "react";
import { listBroadcasts, deleteBroadcast } from "./actions";
import FailureNotice, { type NoticeKind } from "./FailureNotice";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

interface Broadcast {
  id: string;
  name: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
}

interface Failure {
  kind: NoticeKind;
  detail?: string;
}

/**
 * CR-01, at the site where it was worst.
 *
 * This read `.catch(() => setBroadcasts([]))`. A `capabilities.resolve_failed`
 * — the database unable to say who is asking — therefore rendered as
 * **"No broadcasts yet."**, and a master had no way to tell that from a
 * database that answered. `meta-gates.md` is binding here: with no error
 * tracking in this project, a failure that matters needs an effect a human
 * meets, and a blank list is the opposite of one.
 *
 * So the three failure states are kept apart and rendered — never as an empty
 * list, which is a claim about the data and not about the request.
 *
 * ── Converted by plan 41.1-06 ────────────────────────────────────────────────
 *
 * **This is a list, not a table.** `verify-tables.mjs`'s `REMAINING` does not
 * name it and no `<table>` element exists here, so its structure is left alone
 * and only its class strings, its two controls and its two states are
 * converted. Adopting `DataTable` would have been a rewrite dressed as a
 * conversion.
 *
 * ── The status mark loses its hue, and that is the primitive's decision ──────
 *
 * The incumbent drew `sent` in green and `draft` in amber, from the raw palette
 * — G1's subject, and two colour families this design system does not name.
 * The replacement is `Badge`, which has exactly **two** tones and, in its own
 * words, *"does not grade an outcome, and there is deliberately no tone per
 * outcome"*: `emphasis` means *look here first*, not *this one went well*. So
 * both marks are `neutral` and the **word inside them is the channel** — which
 * is §10's rule that colour is never the only one, arrived at from the other
 * side. A reader loses a hue and loses no information; the alternative was to
 * settle in CSS a per-outcome palette the contract declines to have.
 *
 * ── The delete control was drawing on the accent, which is a reserved token ──
 *
 * It was a ~16px text control in `--accent`. §5.1 reserves the accent for four
 * things — the primary button fill, the active navigation entry, a link inside
 * prose, and the lineup pills — and a destructive row control is none of them.
 * It becomes a `ghost` button at the small rung: 44px, the shared focus ring,
 * and a recessed ink that does not compete with the row it sits in. **No
 * confirmation was added**: there is none today, adding one is a behavioural
 * change, and §11's destructive-confirmation rule governs the three that exist
 * rather than manufacturing a fourth.
 *
 * No query changed, no column added, no capability check touched, no action
 * payload altered.
 */
export default function BroadcastList({ refreshKey }: { refreshKey: number }) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<Failure | null>(null);
  const [deleteFailure, setDeleteFailure] = useState<Failure | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLoading(true);
    listBroadcasts()
      .then((result) => {
        if (result.ok) {
          setBroadcasts(result.data as Broadcast[]);
          setLoadFailure(null);
          return;
        }
        // An empty list is what the UI must NOT show here.
        setBroadcasts([]);
        setLoadFailure({ kind: result.failure, detail: result.detail });
      })
      .catch((err) => {
        setBroadcasts([]);
        setLoadFailure({
          kind: "transport_unavailable",
          detail: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = (id: string) => {
    setDeleteFailure(null);
    startTransition(async () => {
      try {
        const result = await deleteBroadcast(id);
        if (!result.ok) {
          // Was a `console.error` in the BROWSER console, with no UI change at
          // all: the row stayed, the operator assumed it had gone.
          setDeleteFailure({ kind: result.failure, detail: result.detail });
          return;
        }
        setBroadcasts((prev) => prev.filter((b) => b.id !== id));
      } catch (err) {
        setDeleteFailure({
          kind: "transport_unavailable",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-muted">Loading broadcasts...</p>
      </Card>
    );
  }

  if (loadFailure) {
    return <FailureNotice kind={loadFailure.kind} detail={loadFailure.detail} />;
  }

  if (broadcasts.length === 0) {
    /*
      §8.11's empty-state contract: a heading and one sentence naming the next
      step. The incumbent was a bare "No broadcasts yet." — which §11 bans by
      name in its `No data` / `Nothing here` row, and which is exactly the shape
      this file's own docblock complains about upstream, where an EMPTY list was
      standing in for a failed request. Here the emptiness is real, and saying
      so is the whole job.

      The block's own vertical padding is NOT written, and that divergence has a
      precedent rather than a preference behind it: `DataTable.tsx:476-487` uses
      the card shell's own padding instead of the contract's larger one,
      "because a caller cannot override a primitive's padding by appending a
      second padding utility". Two padding utilities on one element resolve by
      Tailwind's emission order, not by the order they are written in.
    */
    return (
      <Card className="text-center">
        <p className="text-base font-semibold text-ink">No broadcasts yet</p>
        <p className="mt-1 text-sm text-muted">
          Write one above and send it, and it will be listed here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {deleteFailure && (
        <FailureNotice kind={deleteFailure.kind} detail={deleteFailure.detail} />
      )}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line p-4">
          {/*
            §7.3's one string, written out rather than imported, for the same
            reason `formats/page.tsx:179-183` writes it out: the component
            carries the section heading's own bottom margin, and this heading
            sits alone inside a bar that already spaces it. Appending a second
            margin utility would resolve by Tailwind's emission order rather
            than by the order it is written in. D-41-11 is explicit that a
            surface writing the string is equally converted.
          */}
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
            Broadcast History
          </h2>
        </div>
        <div className="divide-y divide-line">
          {broadcasts.map((broadcast) => (
            <div
              key={broadcast.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {broadcast.name || "Untitled"}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  <Badge>{broadcast.status}</Badge>
                  <span>
                    {(() => { const d = new Date(broadcast.created_at); const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`; })()}
                  </span>
                </div>
              </div>
              {broadcast.status === "draft" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-3"
                  onClick={() => handleDelete(broadcast.id)}
                  disabled={isPending}
                >
                  Delete
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
