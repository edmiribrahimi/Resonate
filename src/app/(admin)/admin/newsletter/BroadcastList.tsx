"use client";

import { useEffect, useState, useTransition } from "react";
import { listBroadcasts, deleteBroadcast } from "./actions";
import FailureNotice, { type NoticeKind } from "./FailureNotice";

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
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <p className="text-sm text-muted">Loading broadcasts...</p>
      </div>
    );
  }

  if (loadFailure) {
    return <FailureNotice kind={loadFailure.kind} detail={loadFailure.detail} />;
  }

  if (broadcasts.length === 0) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <p className="text-sm text-muted">No broadcasts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deleteFailure && (
        <FailureNotice kind={deleteFailure.kind} detail={deleteFailure.detail} />
      )}
      <div className="rounded-2xl border border-card-border bg-card overflow-hidden">
        <div className="p-4 border-b border-card-border">
          <h2 className="text-lg font-bold">Broadcast History</h2>
        </div>
        <div className="divide-y divide-card-border">
          {broadcasts.map((broadcast) => (
            <div
              key={broadcast.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {broadcast.name || "Untitled"}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      broadcast.status === "sent"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {broadcast.status}
                  </span>
                  <span>
                    {(() => { const d = new Date(broadcast.created_at); const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`; })()}
                  </span>
                </div>
              </div>
              {broadcast.status === "draft" && (
                <button
                  onClick={() => handleDelete(broadcast.id)}
                  disabled={isPending}
                  className="ml-3 text-xs text-accent hover:text-accent-hover disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
