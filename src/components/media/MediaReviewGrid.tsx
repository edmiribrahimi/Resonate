"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { updateMediaStatus } from "@/app/(public)/events/[slug]/actions";

interface MediaItem {
  id: string;
  url: string;
  type: "photo" | "video";
  file_size: number | null;
  created_at: string;
  uploader_name: string | null;
}

interface MediaReviewGridProps {
  items: MediaItem[];
}

export default function MediaReviewGrid({ items }: MediaReviewGridProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  function handleAction(mediaId: string, status: "approved" | "rejected") {
    setPendingAction(`${status}-${mediaId}`);
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateMediaStatus(mediaId, status);
        if (!result.success) {
          setError(`Failed to ${status} media.`);
        } else {
          setDismissed((prev) => new Set(prev).add(mediaId));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `Failed to ${status} media.`
        );
      } finally {
        setPendingAction(null);
      }
    });
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()} ${M[d.getMonth()]}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    } catch {
      return dateStr;
    }
  }

  const visibleItems = items.filter((item) => !dismissed.has(item.id));

  if (visibleItems.length === 0) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-8 text-center">
        <p className="text-muted">
          No pending media to review.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-card-border bg-card overflow-hidden"
          >
            {/* Thumbnail */}
            <div className="relative aspect-square bg-background">
              {item.type === "photo" ? (
                <Image
                  src={item.url}
                  alt="Pending media"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <span className="text-4xl">&#9654;</span>
                    <p className="mt-1 text-xs text-muted">Video</p>
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs text-muted mb-3">
                <span>{item.uploader_name ?? "Unknown"}</span>
                <span>&#183;</span>
                <span>{formatDate(item.created_at)}</span>
                {item.file_size && (
                  <>
                    <span>&#183;</span>
                    <span>{formatFileSize(item.file_size)}</span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAction(item.id, "approved")}
                  disabled={isPending && pendingAction === `approved-${item.id}`}
                  className="flex-1 rounded-full bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/30 transition-all active:scale-95 active:opacity-80 disabled:opacity-50"
                >
                  {pendingAction === `approved-${item.id}` ? "..." : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(item.id, "rejected")}
                  disabled={isPending && pendingAction === `rejected-${item.id}`}
                  className="flex-1 rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-all active:scale-95 active:opacity-80 disabled:opacity-50"
                >
                  {pendingAction === `rejected-${item.id}` ? "..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
