"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// UUID pattern: 8-4-4-4-12 hex chars
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Ticket token: uuid.64-hex-chars (HMAC signature)
const TICKET_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/i;
// Membership QR: URL containing code=RSN-
const MEMBERSHIP_PATTERN = /code=RSN-/i;

interface AttendanceEvent {
  partyId: string;
  partyTitle: string;
  eventTitle: string;
  time: string;
  totalTickets: number;
  checkedIn: number;
  recentCheckins: { name: string; time: string }[];
}

export default function ScannerPage() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState<AttendanceEvent[]>([]);
  const [showAttendance, setShowAttendance] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets/attendance");
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.events ?? []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Refresh attendance after each successful scan
  useEffect(() => {
    if (status === "success") {
      fetchAttendance();
    }
  }, [status, fetchAttendance]);

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

  const resetScanner = () => {
    setResult(null);
    setStatus("idle");
    setMessage("");
  };

  function formatCheckinTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatTime(time: string) {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  }

  return (
    <div className="min-h-dvh bg-background p-6 pb-24">
      <h1 className="mb-6 text-2xl font-bold">QR Scanner</h1>

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

      {/* Attendance section */}
      {attendance.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowAttendance(!showAttendance)}
            className="flex w-full items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3 active:scale-[0.98] active:opacity-80 transition-transform"
          >
            <span className="text-sm font-semibold text-foreground">
              Today&apos;s Attendance
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-accent">
                {attendance.reduce((sum, e) => sum + e.checkedIn, 0)} / {attendance.reduce((sum, e) => sum + e.totalTickets, 0)}
              </span>
              <svg
                className={`h-4 w-4 text-muted transition-transform ${showAttendance ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </button>

          {showAttendance && (
            <div className="mt-3 space-y-3">
              {attendance.map((evt) => {
                const pct = evt.totalTickets > 0
                  ? Math.round((evt.checkedIn / evt.totalTickets) * 100)
                  : 0;

                return (
                  <div
                    key={evt.partyId}
                    className="rounded-xl border border-card-border bg-card p-4 space-y-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {evt.eventTitle}
                      </p>
                      <p className="text-xs text-muted">
                        {evt.partyTitle} &middot; {formatTime(evt.time)}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted">Checked in</span>
                        <span className="text-xs font-semibold text-foreground">
                          {evt.checkedIn} / {evt.totalTickets} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-card-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Recent check-ins */}
                    {evt.recentCheckins.length > 0 && (
                      <div>
                        <p className="text-xs text-muted mb-1">Recent</p>
                        <div className="space-y-1">
                          {evt.recentCheckins.map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-foreground">{c.name}</span>
                              <span className="text-muted">{formatCheckinTime(c.time)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={fetchAttendance}
                className="w-full rounded-full border border-card-border py-2 text-xs font-medium text-muted hover:text-foreground transition-colors active:scale-95 active:opacity-80"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
