"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// UUID pattern: 8-4-4-4-12 hex chars
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Ticket token: uuid.64-hex-chars (HMAC signature)
const TICKET_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/i;
// Membership QR: URL containing code=RSN-
const MEMBERSHIP_PATTERN = /code=RSN-/i;

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
  const scannerRef = useRef<HTMLDivElement>(null);

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
  }, []);

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


  return (
    <div className="min-h-dvh bg-background p-6 pb-24">
      <h1 className="mb-6 text-2xl font-bold">Check-in</h1>

      {/* Search input -- always visible */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Search attendee by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-card-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
        />
      </div>

      {/* Attendee list -- always visible */}
      {attendance.length > 0 && (
        <div className="space-y-4 mb-6">
          {attendance.map((evt) => {
            const pct = evt.totalTickets > 0
              ? Math.round((evt.checkedIn / evt.totalTickets) * 100)
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
                      {evt.checkedIn} / {evt.totalTickets} ({pct}%)
                      {evt.guestListCount > 0 && (
                        <span className="text-muted font-normal"> + {evt.guestListCount} guest list</span>
                      )}
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
                  {evt.attendees.length > 0 ? (
                    <div>
                      {evt.attendees.map((a) => (
                        <div
                          key={a.ticketId || a.guestListEntryId}
                          className="flex items-center justify-between py-3 border-b border-card-border/50 last:border-0"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-foreground">{a.name}</span>
                            {a.isGuestList && (
                              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                                Guest List
                              </span>
                            )}
                          </div>
                          {a.checkedIn ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                              {a.checkedInAt ? formatCheckinTime(a.checkedInAt) : "Checked in"}
                            </span>
                          ) : a.isGuestList && a.guestListEntryId ? (
                            <button
                              onClick={() => handleGuestCheckIn(a.guestListEntryId!)}
                              className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/30 transition-colors"
                            >
                              Check in
                            </button>
                          ) : (
                            <span className="text-xs text-muted">Not arrived</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted py-2">No attendees found</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Scanner section */}
      <div className="border-t border-card-border/50 pt-4">
        <h2 className="mb-4 text-lg font-semibold text-foreground">QR Scanner</h2>

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
    </div>
  );
}
