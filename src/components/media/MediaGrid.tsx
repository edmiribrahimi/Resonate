"use client";

import type { ReactNode } from "react";
import { StaggeredList, StaggeredItem } from "@/components/motion/StaggeredList";

export interface MediaGridItem {
  id: string;
  url: string;
  type: "photo" | "video";
  uploaded_by?: string;
}

interface MediaGridProps {
  items: MediaGridItem[];
  onItemClick?: (item: MediaGridItem) => void;
  actions?: (item: MediaGridItem) => ReactNode;
}

export default function MediaGrid({ items, onItemClick, actions }: MediaGridProps) {
  if (items.length === 0) return null;

  return (
    <StaggeredList className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((item) => (
        <StaggeredItem key={item.id}>
        <button
          type="button"
          className="relative aspect-square overflow-hidden rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent active:scale-95 active:opacity-80 transition-transform w-full"
          onClick={() => onItemClick?.(item)}
        >
          {item.type === "photo" ? (
            <img
              src={item.url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              {/* Play icon triangle */}
              <svg
                className="h-12 w-12 text-white/80"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}

          {/* Actions overlay */}
          {actions && (
            <div
              className="absolute top-1 right-1 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {actions(item)}
            </div>
          )}
        </button>
        </StaggeredItem>
      ))}
    </StaggeredList>
  );
}
