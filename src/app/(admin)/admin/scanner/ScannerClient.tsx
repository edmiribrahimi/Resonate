"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// UUID pattern: 8-4-4-4-12 hex chars
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Ticket token: uuid.64-hex-chars (HMAC signature)
const TICKET_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/i;
// Membership QR: URL containing code=RSN-
const MEMBERSHIP_PATTERN = /code=RSN-/i;

type FilterTab = "all" | "not_arrived" | "checked_in";

interface Attendee {
  ticketId: string | null;
  guestListEntryId: string | null;
  name: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  isGuestList: boolean;
  hasEmail: boolean;
}

interface AttendanceEvent {
  partyId: string;
  partyTitle: string;
  eventTitle: string;
  date: string;
  time: string;
  totalTickets: number;
  guestListCount: number;
  checkedIn: number;
  recentCheckins: { name: string; time: string }[];
  attendees: Attendee[];
}

export default function ScannerClient() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState<AttendanceEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("not_arrived");
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchAttendance = useCallback(async (search?: string) => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/tickets/attendance${params}`);
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.events ?? []);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Debounced search: triggers on searchQuery change (also handles initial load when searchQuery is "")
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttendance(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchAttendance]);

  // Refresh attendance after each successful scan
  useEffect(() => {
    if (status === "success") {
      fetchAttendance(searchQuery || undefined);
    }
  }, [status, fetchAttendance, searchQuery]);

  useEffect(() => {
    if (!showScanner) return;

    let scanner: unknown;

    async function initScanner() {
      const { Html5QrcodeScanner } = await import("html5-qrcode");
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      (scanner as { render: (onSuccess: (text: string) => void, onError: () => void) => void }).render(
        (decodedText: string) => {
          setResult(decodedText);
          handleVerify(decodedText);
        },
        () => {}
      );
    }

    initScanner();

    return () => {
      if (scanner) {
        (scanner as { clear: () => Promise<void> }).clear().catch(() => {});
      }
    };
  }, [showScanner]);

  const handleVerify = async (code: string) => {
    try {
      if (TICKET_TOKEN_PATTERN.test(code)) {
        const res = await fetch("/api/tickets/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: code }),
        });
        const data = await res.json();

        if (data.valid) {
          setStatus("success");
          const details = [data.member_name, data.party_title || data.event_title]
            .filter(Boolean)
            .join(" — ");
          setMessage(`✓ Check-in OK — ${details}`);
        } else if (data.status === "already_checked_in") {
          setStatus("error");
          setMessage(`✗ Already checked in — ${data.member_name}`);
        } else if (data.status === "not_found") {
          setStatus("error");
          setMessage("✗ Ticket not found");
        } else if (data.status === "invalid_signature") {
          setStatus("error");
          setMessage("✗ Invalid ticket signature");
        } else {
          setStatus("error");
          setMessage("✗ Check-in failed");
        }
      } else if (MEMBERSHIP_PATTERN.test(code) || UUID_PATTERN.test(code)) {
        const url = MEMBERSHIP_PATTERN.test(code)
          ? code
          : `/api/membership/verify?code=${encodeURIComponent(code)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.valid) {
          setStatus("success");
          setMessage(`✓ ${data.member_name} — Attendance recorded`);
        } else {
          setStatus("error");
          setMessage("✗ Invalid membership");
        }
      } else {
        setStatus("error");
        setMessage("✗ QR code not recognized");
      }
    } catch {
      setStatus("error");
      setMessage("Connection error");
    }
  };

  const handleGuestCheckIn = async (guestListEntryId: string) => {
    try {
      const res = await fetch("/api/tickets/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestListEntryId }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("Check-in OK -- guest list");
        fetchAttendance(searchQuery || undefined);
      } else if (res.status === 409) {
        setStatus("error");
        setMessage("Already checked in");
      } else {
        setStatus("error");
        setMessage("Check-in failed");
      }
    } catch {
      setStatus("error");
      setMessage("Connection error");
    }
  };

  const resetScanner = () => {
    setResult(null);
    setStatus("idle");
    setMessage("");
  };

  function formatCheckinTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Compute filtered attendees per event
  const filteredAttendance = useMemo(() => {
    return attendance.map((evt) => {
      let filtered = evt.attendees;
      if (activeFilter === "not_arrived") {
        filtered = filtered.filter((a) => !a.checkedIn);
      } else if (activeFilter === "checked_in") {
        filtered = filtered.filter((a) => a.checkedIn);
      }
      return { ...evt, filteredAttendees: filtered };
    });
  }, [attendance, activeFilter]);

  // Global counts across all events
  const totalAttendees = attendance.reduce(
    (sum, evt) => sum + evt.attendees.length,
    0
  );
  const totalCheckedIn = attendance.reduce(
    (sum, evt) => sum + evt.attendees.filter((a) => a.checkedIn).length,
    0
  );
  const totalNotArrived = totalAttendees - totalCheckedIn;

  const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalAttendees },
    { key: "not_arrived", label: "Not Arrived", count: totalNotArrived },
    { key: "checked_in", label: "Checked In", count: totalCheckedIn },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* Sticky header with search and filters */}
      <div className="sticky top-0 z-10 bg-background px-6 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Check-in</h1>
          <button
            onClick={() => setShowScanner((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              showScanner
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-muted hover:text-foreground"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
            </svg>
            QR Scan
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-card py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-xl bg-card p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeFilter === tab.key
                  ? "bg-accent/20 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}{" "}
              <span className="opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6">
        {/* QR Scanner - collapsible */}
        {showScanner && (
          <div className="mb-4 rounded-xl border border-card-border bg-card p-4">
            {!result ? (
              <div ref={scannerRef}>
                <div id="qr-reader" className="overflow-hidden rounded-2xl" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div
                  className={`w-full rounded-2xl border p-8 text-center ${
                    status === "success"
                      ? "border-green-500/30 bg-green-500/10"
                      : status === "error"
                      ? "border-accent/30 bg-accent/10"
                      : "border-card-border bg-card"
                  }`}
                >
                  <p className="text-xl font-semibold">{message || "Verifying..."}</p>
                </div>

                <button
                  onClick={resetScanner}
                  className="w-full rounded-full bg-accent py-3 font-medium text-white hover:bg-accent-hover active:scale-95 active:opacity-80 transition-transform"
                >
                  Scan another QR
                </button>
              </div>
            )}
          </div>
        )}

        {/* Attendee list */}
        {filteredAttendance.length > 0 && (
          <div className="space-y-4">
            {filteredAttendance.map((evt) => {
              const totalForParty = evt.attendees.length;
              const checkedInForParty = evt.attendees.filter((a) => a.checkedIn).length;
              const pct = totalForParty > 0
                ? Math.round((checkedInForParty / totalForParty) * 100)
                : 0;

              return (
                <div
                  key={evt.partyId}
                  className="rounded-xl border border-card-border bg-card p-4 space-y-3"
                >
                  {/* Party header */}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {evt.eventTitle}
                    </p>
                    <p className="text-xs text-muted">
                      {evt.partyTitle !== evt.eventTitle && <>{evt.partyTitle} &middot; </>}{evt.date} &middot; {evt.time?.slice(0, 5)}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted">Checked in</span>
                      <span className="text-xs font-semibold text-foreground">
                        {checkedInForParty} / {totalForParty}{evt.guestListCount > 0 && (
                          <span className="text-purple-400 font-normal"> (+{evt.guestListCount} guest list)</span>
                        )} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-card-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Attendee list */}
                  <div>
                    {evt.filteredAttendees.length > 0 ? (
                      <div>
                        {evt.filteredAttendees.map((a) => (
                          <div
                            key={a.ticketId || a.guestListEntryId}
                            className="flex items-center justify-between py-3 border-b border-card-border/50 last:border-0"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="text-sm text-foreground truncate">{a.name}</span>
                              {a.isGuestList && (
                                <span className="shrink-0 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                                  Guest List
                                </span>
                              )}
                            </div>
                            {a.checkedIn ? (
                              <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-green-500">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                                {a.checkedInAt ? formatCheckinTime(a.checkedInAt) : "Checked in"}
                              </span>
                            ) : a.isGuestList && a.guestListEntryId ? (
                              <button
                                onClick={() => handleGuestCheckIn(a.guestListEntryId!)}
                                className="shrink-0 rounded-full bg-accent/20 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/30 active:scale-95 transition-all"
                              >
                                Check in
                              </button>
                            ) : (
                              <span className="shrink-0 text-xs text-muted">Not arrived</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted py-2">
                        {activeFilter === "not_arrived"
                          ? "Everyone has arrived!"
                          : activeFilter === "checked_in"
                            ? "No one checked in yet"
                            : "No attendees found"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
