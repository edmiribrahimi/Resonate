"use client";

import { useState } from "react";
import Link from "next/link";

interface EventCard {
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string | null;
  location_secret: boolean;
  capacity: number | null;
}

interface EventTabsProps {
  upcoming: EventCard[];
  past: EventCard[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function EventTabs({ upcoming, past }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const events = activeTab === "upcoming" ? upcoming : past;
  const isPast = activeTab === "past";

  return (
    <div>
      {/* Tab Switcher */}
      <div className="flex gap-6 px-6 mb-6 border-b border-card-border">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 text-sm font-semibold uppercase tracking-widest transition-colors ${
            activeTab === "upcoming"
              ? "text-accent border-b-2 border-accent"
              : "text-muted"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`pb-3 text-sm font-semibold uppercase tracking-widest transition-colors ${
            activeTab === "past"
              ? "text-accent border-b-2 border-accent"
              : "text-muted"
          }`}
        >
          Past
        </button>
      </div>

      {/* Event Cards */}
      <div className="px-6">
        {events.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">
            {activeTab === "upcoming"
              ? "No upcoming events -- check back soon."
              : "No past events yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((event) => (
              <Link key={event.slug} href={`/events/${event.slug}`}>
                <div
                  className={`rounded-2xl border border-card-border p-5 transition-colors hover:border-accent/50 ${
                    isPast
                      ? "bg-card/50 opacity-70 hover:opacity-100"
                      : "bg-card"
                  }`}
                >
                  <p className="mb-1 text-sm text-muted">
                    {formatDate(event.date)} · {event.time}
                  </p>
                  <h3 className="mb-2 text-xl font-semibold">{event.title}</h3>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted">
                      {event.location_secret
                        ? "\uD83D\uDD12 Secret Location"
                        : `\uD83D\uDCCD ${event.location}`}
                    </p>
                    {event.capacity && (
                      <p className="text-sm text-muted">
                        {event.capacity} capacity
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
