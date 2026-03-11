"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ScanFlash from "@/components/scanner/ScanFlash";
import { vibrateSuccess, vibrateError } from "@/utils/haptics";
import {
  cacheAttendees,
  findAttendee,
  checkInLocally,
  markCheckedInLocally,
  getPendingCount,
} from "@/lib/offline/checkin-store";
import {
  syncPendingCheckins,
  setupSyncListeners,
} from "@/lib/offline/sync-manager";

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
  ticketType: string;
  tierName: string | null;
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
  attendees: Attendee[];
}

interface ScanRecord {
  id: string;
  type: "ticket" | "membership" | "guest";
  name: string;
  ticketType?: string;
  status: "success" | "error";
  reason?: string;
  timestamp: number;
  undone?: boolean;
  canUndo: boolean;
}

export default function ScannerClient() {
  // Party selection state
  const [parties, setParties] = useState<AttendanceEvent[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [loadingParties, setLoadingParties] = useState(true);

  // Scanner & attendee state (scoped to selected party)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState<AttendanceEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("not_arrived");
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Flash overlay state
  const [flash, setFlash] = useState<{
    type: "success" | "error";
    title: string;
    subtitle?: string;
  } | null>(null);
  const scannerInstanceRef = useRef<unknown>(null);
  const isProcessingRef = useRef(false);

  // Scan history state
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);

  // Online/offline state
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Track online/offline status + pending count
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Setup sync listeners (online event, visibility change)
    const cleanupSync = setupSyncListeners();

    // Update pending count periodically
    const updatePending = async () => {
      try {
        const count = await getPendingCount();
        setPendingCount(count);
      } catch {
        // IndexedDB not available
      }
    };
    updatePending();
    const interval = setInterval(updatePending, 5000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      cleanupSync();
      clearInterval(interval);
    };
  }, []);

  // Fetch all parties for party selector
  const fetchParties = useCallback(async () => {
    try {
      setLoadingParties(true);
      const res = await fetch("/api/tickets/attendance");
      if (res.ok) {
        const data = await res.json();
        setParties(data.events ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingParties(false);
    }
  }, []);

  // Fetch attendees for selected party + cache in IndexedDB for offline use
  const fetchAttendance = useCallback(
    async (search?: string) => {
      if (!selectedPartyId) return;
      try {
        const params = new URLSearchParams();
        params.set("partyId", selectedPartyId);
        if (search) params.set("search", search);
        const res = await fetch(`/api/tickets/attendance?${params}`);
        if (res.ok) {
          const data = await res.json();
          const events = data.events ?? [];
          const eventData = events[0] ?? null;
          setAttendance(eventData);

          // Cache attendees in IndexedDB for offline (only full list, not search-filtered)
          if (eventData && !search) {
            cacheAttendees(selectedPartyId, eventData.attendees).catch(() => {});
          }

          // Piggyback sync on successful fetch
          syncPendingCheckins().then(async () => {
            const count = await getPendingCount();
            setPendingCount(count);
          }).catch(() => {});
        }
      } catch {
        // silently fail — offline mode will use cached data
      }
    },
    [selectedPartyId]
  );

  // Initial party load
  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  // Fetch attendance when party selected or search changes
  useEffect(() => {
    if (!selectedPartyId) return;
    const timer = setTimeout(() => {
      fetchAttendance(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedPartyId, searchQuery, fetchAttendance]);

  // Refresh attendance after successful scan
  useEffect(() => {
    if (status === "success" && selectedPartyId) {
      fetchAttendance(searchQuery || undefined);
    }
  }, [status, fetchAttendance, searchQuery, selectedPartyId]);

  // QR Scanner setup — headless Html5Qrcode for full control
  useEffect(() => {
    if (!showScanner) return;

    let qrcode: { stop: () => Promise<void>; pause: (pauseVideo?: boolean) => void; resume: () => void } | null = null;

    async function initScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");
      const instance = new Html5Qrcode("qr-reader");
      qrcode = instance as unknown as typeof qrcode;
      scannerInstanceRef.current = qrcode;

      await instance.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 280, height: 280 } },
        (decodedText: string) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          // Pause decoding (keep camera stream alive)
          qrcode?.pause(true);
          handleVerify(decodedText);
        },
        () => {} // ignore scan errors
      );
    }

    initScanner().catch(() => {});

    return () => {
      scannerInstanceRef.current = null;
      if (qrcode) {
        qrcode.stop().catch(() => {});
      }
    };
  }, [showScanner]);

  const showFlash = useCallback(
    (type: "success" | "error", title: string, subtitle?: string) => {
      if (type === "success") {
        vibrateSuccess();
        setStatus("success");
      } else {
        vibrateError();
        setStatus("error");
      }
      setFlash({ type, title, subtitle });
    },
    []
  );

  const dismissFlash = useCallback(() => {
    setFlash(null);
    isProcessingRef.current = false;
    // Resume scanner decoding
    const scanner = scannerInstanceRef.current as { resume: () => void } | null;
    if (scanner) {
      try { scanner.resume(); } catch { /* ignore if already running */ }
    }
  }, []);

  const addScanRecord = useCallback((record: ScanRecord) => {
    setScanHistory((prev) => [record, ...prev].slice(0, 5));
  }, []);

  const handleUndoCheckIn = useCallback(
    async (record: ScanRecord) => {
      if (!record.canUndo || record.undone) return;

      const confirmMsg = `Undo check-in for ${record.name}?`;
      if (!window.confirm(confirmMsg)) return;

      try {
        const body: { ticketId?: string; guestListEntryId?: string } =
          record.type === "guest"
            ? { guestListEntryId: record.id }
            : { ticketId: record.id };

        const res = await fetch("/api/tickets/checkin/undo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          setScanHistory((prev) =>
            prev.map((s) =>
              s === record ? { ...s, undone: true, canUndo: false } : s
            )
          );
          vibrateError();
          showFlash("error", "Check-in undone", record.name);
          fetchAttendance(searchQuery || undefined);
        }
      } catch {
        // silently fail
      }
    },
    [showFlash, fetchAttendance, searchQuery]
  );

  const handleVerify = async (code: string) => {
    try {
      if (TICKET_TOKEN_PATTERN.test(code)) {
        const ticketIdFromQR = code.split(".")[0];

        // Offline flow: check IndexedDB cache
        if (!navigator.onLine) {
          try {
            const attendee = await findAttendee(ticketIdFromQR);
            if (attendee && !attendee.checkedIn) {
              // Found and not checked in — check in locally
              await checkInLocally(ticketIdFromQR);
              const subtitle = [
                attendee.tierName,
                attendee.ticketType === "guest_list" ? "Guest List" : null,
                "Offline",
              ].filter(Boolean).join(" · ") || "Offline";
              showFlash("success", attendee.name, subtitle);
              addScanRecord({
                id: ticketIdFromQR,
                type: attendee.ticketType === "guest_list" ? "guest" : "ticket",
                name: attendee.name,
                ticketType: attendee.tierName || undefined,
                status: "success",
                timestamp: Date.now(),
                canUndo: true,
              });
              // Update pending count
              getPendingCount().then(setPendingCount).catch(() => {});
            } else if (attendee && attendee.checkedIn) {
              const time = attendee.checkedInAt
                ? `at ${formatCheckinTime(attendee.checkedInAt)}`
                : "";
              showFlash("error", "Already checked in", `${attendee.name}${time ? ` ${time}` : ""}`);
              addScanRecord({
                id: ticketIdFromQR,
                type: "ticket",
                name: attendee.name,
                status: "error",
                reason: "Already checked in",
                timestamp: Date.now(),
                canUndo: false,
              });
            } else {
              showFlash("error", "Ticket not found (offline)");
              addScanRecord({
                id: ticketIdFromQR,
                type: "ticket",
                name: "Unknown",
                status: "error",
                reason: "Not in cache",
                timestamp: Date.now(),
                canUndo: false,
              });
            }
          } catch {
            showFlash("error", "Offline check-in error");
          }
          return;
        }

        // Online flow: POST to /api/tickets/checkin
        const res = await fetch("/api/tickets/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: code, partyId: selectedPartyId }),
        });
        const data = await res.json();

        if (data.valid) {
          const subtitle = [data.tier_name, data.ticket_type === "guest_list" ? "Guest List" : null]
            .filter(Boolean)
            .join(" · ") || undefined;
          showFlash("success", data.member_name, subtitle);
          addScanRecord({
            id: ticketIdFromQR,
            type: data.ticket_type === "guest_list" ? "guest" : "ticket",
            name: data.member_name,
            ticketType: data.tier_name || undefined,
            status: "success",
            timestamp: Date.now(),
            canUndo: true,
          });
          // Update IndexedDB cache (without adding to pending queue — already synced online)
          markCheckedInLocally(ticketIdFromQR).catch(() => {});
        } else if (data.status === "wrong_event") {
          showFlash(
            "error",
            `Ticket for ${data.party_title || data.event_title}`,
            data.member_name
          );
          addScanRecord({
            id: ticketIdFromQR,
            type: "ticket",
            name: data.member_name || "Unknown",
            status: "error",
            reason: `Wrong event: ${data.party_title || data.event_title}`,
            timestamp: Date.now(),
            canUndo: false,
          });
        } else if (data.status === "already_checked_in") {
          const time = data.checked_in_at
            ? `Checked in at ${formatCheckinTime(data.checked_in_at)}`
            : undefined;
          showFlash("error", "Already checked in", `${data.member_name}${time ? ` · ${time}` : ""}`);
          addScanRecord({
            id: ticketIdFromQR,
            type: "ticket",
            name: data.member_name || "Unknown",
            status: "error",
            reason: "Already checked in",
            timestamp: Date.now(),
            canUndo: false,
          });
        } else if (data.status === "not_found") {
          showFlash("error", "Ticket not found");
          addScanRecord({
            id: ticketIdFromQR,
            type: "ticket",
            name: "Unknown",
            status: "error",
            reason: "Not found",
            timestamp: Date.now(),
            canUndo: false,
          });
        } else if (data.status === "invalid_signature") {
          showFlash("error", "Invalid QR code");
          addScanRecord({
            id: code,
            type: "ticket",
            name: "Unknown",
            status: "error",
            reason: "Invalid QR",
            timestamp: Date.now(),
            canUndo: false,
          });
        } else {
          showFlash("error", "Check-in failed");
          addScanRecord({
            id: code,
            type: "ticket",
            name: "Unknown",
            status: "error",
            reason: "Check-in failed",
            timestamp: Date.now(),
            canUndo: false,
          });
        }
      } else if (MEMBERSHIP_PATTERN.test(code) || UUID_PATTERN.test(code)) {
        const url = MEMBERSHIP_PATTERN.test(code)
          ? code
          : `/api/membership/verify?code=${encodeURIComponent(code)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.valid) {
          showFlash("success", data.member_name, "Member");
          addScanRecord({
            id: code,
            type: "membership",
            name: data.member_name,
            status: "success",
            timestamp: Date.now(),
            canUndo: false,
          });
        } else {
          showFlash("error", "Member not found");
          addScanRecord({
            id: code,
            type: "membership",
            name: "Unknown",
            status: "error",
            reason: "Member not found",
            timestamp: Date.now(),
            canUndo: false,
          });
        }
      } else {
        showFlash("error", "QR code not recognized");
        addScanRecord({
          id: code,
          type: "ticket",
          name: "Unknown",
          status: "error",
          reason: "QR not recognized",
          timestamp: Date.now(),
          canUndo: false,
        });
      }
    } catch {
      // Network error — try offline fallback for ticket tokens
      if (TICKET_TOKEN_PATTERN.test(code)) {
        const ticketIdFromQR = code.split(".")[0];
        try {
          const attendee = await findAttendee(ticketIdFromQR);
          if (attendee && !attendee.checkedIn) {
            await checkInLocally(ticketIdFromQR);
            showFlash("success", attendee.name, "Offline");
            addScanRecord({
              id: ticketIdFromQR,
              type: "ticket",
              name: attendee.name,
              status: "success",
              timestamp: Date.now(),
              canUndo: true,
            });
            getPendingCount().then(setPendingCount).catch(() => {});
            return;
          }
        } catch {
          // IndexedDB also failed
        }
      }
      showFlash("error", "Connection error");
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
        const data = await res.json();
        setStatus("success");
        setMessage(`${data.name || "Guest"} -- Guest List`);
        addScanRecord({
          id: guestListEntryId,
          type: "guest",
          name: data.name || "Guest",
          ticketType: "Guest List",
          status: "success",
          timestamp: Date.now(),
          canUndo: true,
        });
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

  const handleChangeParty = () => {
    setSelectedPartyId(null);
    setAttendance(null);
    setSearchQuery("");
    setActiveFilter("not_arrived");
    setShowScanner(false);
    setFlash(null);
    setStatus("idle");
    setScanHistory([]);
    isProcessingRef.current = false;
    // Sync any pending check-ins before switching party
    syncPendingCheckins().then(async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    }).catch(() => {});
    fetchParties();
  };

  function formatCheckinTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatScanTime(ts: number) {
    return new Date(ts).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatPartyDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const M = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${WD[d.getDay()]} ${d.getDate()} ${M[d.getMonth()]}`;
  }

  // Compute filtered attendees
  const filteredAttendees = useMemo(() => {
    if (!attendance) return [];
    let filtered = attendance.attendees;
    if (activeFilter === "not_arrived") {
      filtered = filtered.filter((a) => !a.checkedIn);
    } else if (activeFilter === "checked_in") {
      filtered = filtered.filter((a) => a.checkedIn);
    }
    return filtered;
  }, [attendance, activeFilter]);

  // Counts for selected party
  const totalAttendees = attendance?.attendees.length ?? 0;
  const totalCheckedIn =
    attendance?.attendees.filter((a) => a.checkedIn).length ?? 0;
  const totalNotArrived = totalAttendees - totalCheckedIn;

  const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalAttendees },
    { key: "not_arrived", label: "Not Arrived", count: totalNotArrived },
    { key: "checked_in", label: "Checked In", count: totalCheckedIn },
  ];

  // ── Party Selector Screen ──
  if (!selectedPartyId) {
    return (
      <div className="min-h-dvh bg-background pb-24">
        <div className="px-6 pt-6 pb-3">
          <h1 className="text-2xl font-bold mb-1">Check-in</h1>
          <p className="text-sm text-muted">Select a party to start</p>
        </div>

        <div className="px-6 space-y-3">
          {loadingParties ? (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-card-border bg-card p-4 animate-pulse"
                >
                  <div className="h-4 w-40 bg-card-border/50 rounded mb-2" />
                  <div className="h-3 w-28 bg-card-border/50 rounded mb-3" />
                  <div className="h-2 bg-card-border/50 rounded-full" />
                </div>
              ))}
            </>
          ) : parties.length === 0 ? (
            <div className="rounded-xl border border-card-border bg-card p-8 text-center">
              <p className="text-muted text-sm">
                No upcoming events to check in
              </p>
            </div>
          ) : (
            parties.map((party) => {
              const total = party.attendees.length;
              const checked = party.attendees.filter(
                (a) => a.checkedIn
              ).length;
              const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

              return (
                <button
                  key={party.partyId}
                  onClick={() => setSelectedPartyId(party.partyId)}
                  className="w-full text-left rounded-xl border border-card-border bg-card p-4 hover:border-accent/50 active:scale-[0.98] transition-all"
                >
                  <p className="text-sm font-medium text-foreground">
                    {party.eventTitle}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {party.partyTitle !== party.eventTitle && (
                      <>{party.partyTitle} &middot; </>
                    )}
                    {formatPartyDate(party.date)} &middot;{" "}
                    {party.time?.slice(0, 5)}
                  </p>

                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted">
                        {checked} / {total}
                        {party.guestListCount > 0 && (
                          <span className="text-purple-400">
                            {" "}
                            (+{party.guestListCount} guest list)
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-semibold text-foreground">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-card-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ── Scanner View (party selected) ──
  const selectedParty = parties.find((p) => p.partyId === selectedPartyId);

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* Sticky header with party info, search, and filters */}
      <div className="sticky top-0 z-10 bg-background px-6 pt-6 pb-3">
        {/* Party header + actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleChangeParty}
                className="shrink-0 text-muted hover:text-foreground transition-colors"
                aria-label="Change party"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5 8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold truncate">
                    {selectedParty?.partyTitle || "Check-in"}
                  </h1>
                  {/* Online/Offline status indicator */}
                  {isOnline ? (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Online
                    </span>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-medium text-yellow-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                      Offline{pendingCount > 0 ? ` (${pendingCount})` : ""}
                    </span>
                  )}
                </div>
                {selectedParty &&
                  selectedParty.partyTitle !== selectedParty.eventTitle && (
                    <p className="text-xs text-muted truncate">
                      {selectedParty.eventTitle}
                    </p>
                  )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowScanner((v) => !v)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              showScanner
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-muted hover:text-foreground"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z"
              />
            </svg>
            QR Scan
          </button>
        </div>

        {/* Progress bar for selected party */}
        {attendance && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">Checked in</span>
              <span className="text-xs font-semibold text-foreground">
                {totalCheckedIn} / {totalAttendees}
                {(attendance.guestListCount ?? 0) > 0 && (
                  <span className="text-purple-400 font-normal">
                    {" "}
                    (+{attendance.guestListCount} guest list)
                  </span>
                )}
                {totalAttendees > 0 && (
                  <span className="text-muted font-normal">
                    {" "}
                    ({Math.round((totalCheckedIn / totalAttendees) * 100)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 rounded-full bg-card-border overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${totalAttendees > 0 ? Math.round((totalCheckedIn / totalAttendees) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
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
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
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
        {/* QR Scanner - collapsible, continuous camera */}
        {showScanner && (
          <div className="mb-4 rounded-xl border border-card-border bg-card p-4">
            <div ref={scannerRef}>
              <div id="qr-reader" className="overflow-hidden rounded-2xl" />
            </div>
          </div>
        )}

        {/* Flash overlay -- renders above everything */}
        {flash && (
          <ScanFlash
            type={flash.type}
            title={flash.title}
            subtitle={flash.subtitle}
            onDismiss={dismissFlash}
          />
        )}

        {/* Scan history */}
        {scanHistory.length > 0 && (
          <div className="mb-4 space-y-1">
            <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-2">
              Recent scans
            </p>
            {scanHistory.map((record, i) => {
              const isUndone = record.undone;
              const isSuccess = record.status === "success" && !isUndone;
              const isError = record.status === "error";
              const canTap = isSuccess && record.canUndo;

              return (
                <button
                  key={`${record.id}-${record.timestamp}-${i}`}
                  onClick={() => canTap && handleUndoCheckIn(record)}
                  disabled={!canTap}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                    canTap
                      ? "hover:bg-card-border/30 active:scale-[0.98]"
                      : ""
                  } ${isUndone ? "opacity-50" : ""}`}
                >
                  {/* Status icon */}
                  <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full">
                    {isUndone ? (
                      <svg
                        className="h-4 w-4 text-muted"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                        />
                      </svg>
                    ) : isSuccess ? (
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                    ) : isError ? (
                      <svg
                        className="h-4 w-4 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    ) : null}
                  </span>

                  {/* Name + type */}
                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-sm truncate block ${
                        isUndone
                          ? "text-muted line-through"
                          : "text-foreground"
                      }`}
                    >
                      {record.name}
                    </span>
                    {(record.ticketType || record.reason) && (
                      <span className="text-[10px] text-muted truncate block">
                        {isError
                          ? record.reason
                          : isUndone
                            ? "Undone"
                            : record.ticketType}
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  <span className="shrink-0 text-[10px] text-muted tabular-nums">
                    {formatScanTime(record.timestamp)}
                  </span>

                  {/* Undo hint for tappable items */}
                  {canTap && (
                    <svg
                      className="shrink-0 h-3.5 w-3.5 text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Attendee list for selected party */}
        {attendance && (
          <div className="rounded-xl border border-card-border bg-card p-4">
            <div>
              {filteredAttendees.length > 0 ? (
                <div>
                  {filteredAttendees.map((a) => (
                    <div
                      key={a.ticketId || a.guestListEntryId}
                      className="flex items-center justify-between py-3 border-b border-card-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-sm text-foreground truncate">
                          {a.name}
                        </span>
                        {a.isGuestList && (
                          <span className="shrink-0 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                            Guest List
                          </span>
                        )}
                        {a.tierName && !a.isGuestList && (
                          <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                            {a.tierName}
                          </span>
                        )}
                      </div>
                      {a.checkedIn ? (
                        <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-green-500">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m4.5 12.75 6 6 9-13.5"
                            />
                          </svg>
                          {a.checkedInAt
                            ? formatCheckinTime(a.checkedInAt)
                            : "Checked in"}
                        </span>
                      ) : a.isGuestList && a.guestListEntryId ? (
                        <button
                          onClick={() =>
                            handleGuestCheckIn(a.guestListEntryId!)
                          }
                          className="shrink-0 rounded-full bg-accent/20 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/30 active:scale-95 transition-all"
                        >
                          Check in
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs text-muted">
                          Not arrived
                        </span>
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
        )}
      </div>
    </div>
  );
}
