"use client";

import { useEffect, useState, useTransition } from "react";
import { listBroadcasts, deleteBroadcast } from "./actions";

interface Broadcast {
  id: string;
  name: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
}

export default function BroadcastList({ refreshKey }: { refreshKey: number }) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLoading(true);
    listBroadcasts()
      .then((data) => setBroadcasts(data as Broadcast[]))
      .catch(() => setBroadcasts([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteBroadcast(id);
        setBroadcasts((prev) => prev.filter((b) => b.id !== id));
      } catch (err) {
        console.error("Failed to delete broadcast", err);
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

  if (broadcasts.length === 0) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <p className="text-sm text-muted">No broadcasts yet.</p>
      </div>
    );
  }

  return (
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
  );
}
