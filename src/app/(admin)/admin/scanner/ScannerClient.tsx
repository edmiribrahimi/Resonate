"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ScanFlash, { type ScanFlashType } from "@/components/scanner/ScanFlash";
import {
  vibrateSuccess,
  vibrateError,
  vibrateAlreadyRecorded,
} from "@/utils/haptics";
import {
  attendeeKey,
  mergeAttendees,
  cacheMembers,
  findAttendee,
  findBySubject,
  findMember,
  checkInLocally,
  checkInMemberLocally,
  markCheckedInLocally,
  undoCheckInLocally,
  getDeviceId,
  getPendingCount,
  getFailedCount,
  getBlockedCount,
  THIS_DEVICE_LABEL,
  type MergeResult,
} from "@/lib/offline/checkin-store";
import {
  syncPendingCheckins,
  setupSyncListeners,
} from "@/lib/offline/sync-manager";
import { isDoorOutcome } from "@/lib/door/outcome";
import type {
  DoorFlag,
  DoorNotValidReason,
  DoorSubjectType,
} from "@/lib/door/outcome";

// UUID pattern: 8-4-4-4-12 hex chars
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Ticket token: uuid.64-hex-chars (HMAC signature)
const TICKET_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/i;
// Membership QR: URL containing code=RSN-
const MEMBERSHIP_PATTERN = /code=RSN-/i;
// Bare membership code: RSN-XXXXXX
const BARE_MEMBERSHIP_PATTERN = /^RSN-[A-Z0-9]{6,10}$/i;

/**
 * The four refusals, one sentence each — never a shared "Invalid".
 *
 * `meta-gates.md` forbids a handler that collapses distinct causes into one
 * message, and this project already has the recorded precedent: the newsletter
 * form's single "Qualcosa e' andato storto". At the door the sentence on the
 * screen is the only observer that exists — there is **no error tracking
 * anywhere in this repository** — so a shared word here is a night nobody can
 * debug, and a member of staff sent to fix the wrong thing.
 */
const NOT_VALID_MESSAGE: Record<DoorNotValidReason, string> = {
  invalid_signature: "This code was not issued by us",
  unknown_code: "No ticket or member matches this code",
  wrong_night: "This code is for another night",
  no_party_selected: "Choose the party first — a scan needs a night",
};

/** A reason from a bundle this one does not know. Its own sentence, not one of the four. */
const UNRECOGNISED_REASON_MESSAGE = "This code could not be validated";

/**
 * An admission that is not ordinary. Both read as *admitted, and someone should
 * look at this afterwards* — never as a refusal.
 */
const FLAG_MESSAGE: Record<DoorFlag, string> = {
  refunded_before_night: "Refunded before tonight — admitted, flagged for review",
  not_in_cache: "Not in the list on this device — admitted, flagged for review",
};

/** Every distinct way a response can fail to be an outcome, told apart. */
function serverFaultMessage(status: number): string {
  if (status === 401) return "Session expired — sign in again to keep scanning";
  if (status === 403) return "This account is not allowed to check people in";
  if (status === 503) return "The scan was not written to the record — scan again";
  if (status >= 500) return "The server could not complete this scan";
  return `The server answered in a way this app does not understand (HTTP ${status})`;
}

function formatClock(iso: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * FIX-04a, in one function: the door states a **fact** — who recorded the entry
 * and when — and never a verdict.
 *
 * No word here names a cause. Whether a repeat read was a double read, two
 * devices or a second ticket for the same holder is classified afterwards, over
 * `door_scan_events`, never on a phone held in front of the person it would be a
 * verdict about (src/lib/door/outcome.ts:23-31). If a future edit adds a cause
 * word to this string, that requirement has been broken.
 *
 * An absent moment or an absent operator is said out loud rather than filled in:
 * a blank where a fact is promised is the same silent failure in a smaller box.
 */
function recordedFact(
  at: string | null | undefined,
  operatorLabel: string | null | undefined
): string {
  const clock = at && at.trim() !== "" ? formatClock(at) : null;
  const when = clock ? `Recorded at ${clock}` : "Recorded earlier (time not on record)";
  const label = operatorLabel && operatorLabel.trim() !== "" ? operatorLabel.trim() : null;
  return label ? `${when} by ${label}` : `${when} (operator not on record)`;
}

/**
 * The ticket id inside a scanned token, for the **cache lookup only**.
 *
 * The signature is not discarded: the whole scanned string travels to
 * `checkInLocally` as the token (FIX-10, checkin-store.ts:101-102) and the route
 * re-verifies it on sync. This only derives the id the composite cache key
 * needs. The previous version cut the token at the call site and kept only the
 * left half, which is why a queued admission used to be indistinguishable from
 * a hand-typed identifier. Cut at the **last** dot, as `verifyTicketToken` does.
 */
function ticketIdFromToken(token: string): string {
  const cut = token.lastIndexOf(".");
  return cut === -1 ? token : token.slice(0, cut);
}

/**
 * Readers for a response body.
 *
 * `isDoorOutcome` is deliberately narrow — it checks the discriminant and stops
 * (src/lib/door/outcome.ts:153-163) — so every other field is unverified data.
 * Reading them off the raw body rather than off the narrowed type keeps that
 * honest: `/api/membership/verify` really can answer `at: null` and `by: null`
 * where the union promises strings.
 */
function readString(body: unknown, key: string): string | null {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function readSubjectLabel(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const subject = (body as { subject?: unknown }).subject;
  return readString(subject, "label");
}

function readOperatorLabel(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const by = (body as { by?: unknown }).by;
  return readString(by, "operatorLabel");
}

function readFlags(body: unknown): DoorFlag[] {
  if (typeof body !== "object" || body === null) return [];
  const flags = (body as { flags?: unknown }).flags;
  if (!Array.isArray(flags)) return [];
  return flags.filter(
    (f): f is DoorFlag =>
      typeof f === "string" &&
      Object.prototype.hasOwnProperty.call(FLAG_MESSAGE, f)
  );
}

function flagSentence(flags: DoorFlag[]): string {
  return flags.map((f) => FLAG_MESSAGE[f]).join(" · ");
}

function notValidSentence(body: unknown): string {
  const reason = readString(body, "reason");
  return reason !== null &&
    Object.prototype.hasOwnProperty.call(NOT_VALID_MESSAGE, reason)
    ? NOT_VALID_MESSAGE[reason as DoorNotValidReason]
    : UNRECOGNISED_REASON_MESSAGE;
}

/** Why a refresh was declined, in plain words, one sentence per reason. */
function mergeRefusalSentence(
  refusal: Extract<MergeResult, { applied: false }>
): string {
  switch (refusal.reason) {
    case "empty_payload":
      return `The attendee list was NOT refreshed: the server returned an empty list while this device holds ${refusal.cached}. The list on this device was kept.`;
    case "payload_smaller_than_cache":
      return `The attendee list was NOT refreshed: the server returned ${refusal.received} people while this device holds ${refusal.cached} and still has entries to report. The list on this device was kept.`;
  }
}

type FilterTab = "all" | "not_arrived" | "checked_in";

/**
 * A line that stays on the screen until the next successful refresh.
 *
 * Not a toast. The person holding the phone may be looking at a queue rather
 * than at the screen, and with no error tracking anywhere in this project that
 * screen is the only observer a failed refresh has.
 */
interface CacheNotice {
  key: string;
  tone: "warn" | "error";
  text: string;
}

/** What the queue looks like right now, and whether it could be read at all. */
interface QueueCounts {
  pending: number;
  failed: number;
  blocked: number;
  /** IndexedDB did not answer. Zero and "unknown" are opposite facts. */
  unreadable: boolean;
}

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

/** Per-party diagnostics from `/api/tickets/attendance` (plan 31-06). Optional: an older API does not send them. */
interface AttendanceDiagnostics {
  refundCollisions: number;
  duplicateRefundRows: number;
  refundEvidenceUnavailable: boolean;
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
  diagnostics?: AttendanceDiagnostics;
  attendees: Attendee[];
}

interface ScanRecord {
  id: string;
  type: "ticket" | "membership" | "guest";
  name: string;
  ticketType?: string;
  /**
   * The same three states the flash shows, so the history and the screen never
   * disagree about what happened. `already_recorded` also covers a flagged
   * admission — amber means *admitted, look at this afterwards*, and `canUndo`
   * carries whether there is anything to reverse, which is a separate question.
   */
  status: ScanFlashType;
  reason?: string;
  timestamp: number;
  undone?: boolean;
  canUndo: boolean;
  /** For a local reversal while the radio is off: `partyId:subjectType:subjectId`. */
  localKey?: string;
}

export default function ScannerClient() {
  // Party selection state
  const [parties, setParties] = useState<AttendanceEvent[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [loadingParties, setLoadingParties] = useState(true);

  // Scanner & attendee state (scoped to selected party)
  const [status, setStatus] = useState<"idle" | ScanFlashType>("idle");
  const [attendance, setAttendance] = useState<AttendanceEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("not_arrived");
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Flash overlay state
  const [flash, setFlash] = useState<{
    type: ScanFlashType;
    title: string;
    subtitle?: string;
  } | null>(null);
  const scannerInstanceRef = useRef<unknown>(null);
  const isProcessingRef = useRef(false);

  // Scan history state
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);

  // Torch state
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Online/offline state
  const [isOnline, setIsOnline] = useState(true);

  // The queue, in three numbers plus "could not be read at all"
  const [queue, setQueue] = useState<QueueCounts>({
    pending: 0,
    failed: 0,
    blocked: 0,
    unreadable: false,
  });
  // What the last refresh could not do. Persistent, never a toast.
  const [cacheNotices, setCacheNotices] = useState<CacheNotice[]>([]);

  /**
   * This install's id, resolved once and held.
   *
   * `door_scan_events.device_id` is NOT NULL and the `two_devices`
   * classification is impossible without it, so it travels with every scan and
   * every undo. Read once into a ref rather than per scan: `getDeviceId()` opens
   * IndexedDB, and the door cannot wait on that between two people.
   */
  const deviceIdRef = useRef<string | null>(null);

  const refreshQueueCounts = useCallback(async () => {
    try {
      const [pending, failed, blocked] = await Promise.all([
        getPendingCount(),
        getFailedCount(),
        getBlockedCount(),
      ]);
      setQueue({ pending, failed, blocked, unreadable: false });
    } catch (error) {
      // Zero and "unknown" are opposite facts. Rendering 0 for an unreadable
      // store tells the operator the queue is empty, which is the silent
      // failure this whole plan exists to remove.
      console.error("scanner:queue_counts_unavailable", error);
      setQueue((prev) => ({ ...prev, unreadable: true }));
    }
  }, []);

  // Track online/offline status + the queue counters
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Setup sync listeners (online event, visibility change)
    const cleanupSync = setupSyncListeners();

    getDeviceId()
      .then((id) => {
        deviceIdRef.current = id;
      })
      .catch((error) => {
        // Not fatal — the routes fall back to "unknown". The cost is real and
        // is stated here rather than discovered later: rows written by this
        // device can then never be classified `two_devices`.
        console.error("scanner:device_id_unavailable", error);
      });

    // The counters already refreshed on a 5 s interval regardless of
    // connectivity; only the rendering was gated on being offline.
    refreshQueueCounts();
    const interval = setInterval(refreshQueueCounts, 5000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      cleanupSync();
      clearInterval(interval);
    };
  }, [refreshQueueCounts]);

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

      let res: Response;
      try {
        const params = new URLSearchParams();
        params.set("partyId", selectedPartyId);
        if (search) params.set("search", search);
        res = await fetch(`/api/tickets/attendance?${params}`);
      } catch (error) {
        // Being offline is not a fault — the cached list is what the door runs
        // on, and the Offline pill already says so. Being online and unable to
        // reach the server is a different fact and gets its own line.
        if (navigator.onLine) {
          console.error("scanner:attendance_unreachable", error);
          setCacheNotices([
            {
              key: "reach",
              tone: "warn",
              text: "The server could not be reached to refresh the list. The list already on this device is being used.",
            },
          ]);
        }
        return;
      }

      if (!res.ok) {
        // Plan 31-06 turned an unreadable attendee list into a 500 where it used
        // to be an empty list at HTTP 200. Those are opposite facts — "nobody is
        // on tonight" against "the list could not be read" — and this is the
        // only place either becomes visible to the person at the door.
        let detail: string | null = null;
        try {
          detail = readString(await res.json(), "error");
        } catch {
          detail = null;
        }
        console.error("scanner:attendance_failed", { status: res.status, detail });
        setCacheNotices([
          {
            key: "list",
            tone: "error",
            text: detail
              ? `The attendee list was NOT refreshed: ${detail}. The list already on this device is being used.`
              : `The attendee list was NOT refreshed (HTTP ${res.status}). The list already on this device is being used.`,
          },
        ]);
        return;
      }

      const notices: CacheNotice[] = [];
      let eventData: AttendanceEvent | null = null;
      try {
        const data = await res.json();
        const events: AttendanceEvent[] = data.events ?? [];
        eventData = events[0] ?? null;
        setAttendance(eventData);
      } catch (error) {
        console.error("scanner:attendance_unparseable", error);
        setCacheNotices([
          {
            key: "list",
            tone: "error",
            text: "The attendee list came back in a shape this app does not understand. The list already on this device is being used.",
          },
        ]);
        return;
      }

      // Plan 31-06's per-party diagnostics. They were returned in the body and
      // nothing rendered them; a number nobody reads is not observability.
      const diagnostics = eventData?.diagnostics;
      if (diagnostics) {
        if (diagnostics.refundEvidenceUnavailable) {
          notices.push({
            key: "refund-evidence",
            tone: "warn",
            text: "Refund evidence could not be read for this party: a ticket refunded before tonight will be admitted, but it will not be flagged at the door.",
          });
        }
        if (diagnostics.refundCollisions > 0) {
          notices.push({
            key: "refund-collisions",
            tone: "warn",
            text: `${diagnostics.refundCollisions} refund(s) name a ticket that is still live — that refund did not complete. The live ticket is being used.`,
          });
        }
        if (diagnostics.duplicateRefundRows > 0) {
          notices.push({
            key: "refund-duplicates",
            tone: "warn",
            text: `${diagnostics.duplicateRefundRows} ticket(s) carry more than one approved refund; the earliest moment is the one being used.`,
          });
        }
      }

      // Cache attendees in IndexedDB for offline (only full list, not search-filtered)
      if (eventData && !search) {
        // FIX-06 becomes observable here. `mergeAttendees` returns its refusal
        // as a **value** (checkin-store.ts:429-438); this call site used to drop
        // it, so the guard protected the cache and said nothing to the person
        // holding the phone.
        try {
          const result = await mergeAttendees(selectedPartyId, eventData.attendees);
          if (!result.applied) {
            notices.push({
              key: "merge",
              tone: "error",
              text: mergeRefusalSentence(result),
            });
          }
        } catch (error) {
          console.error("scanner:merge_failed", error);
          notices.push({
            key: "merge",
            tone: "error",
            text: "This device could not update its offline list. Scanning continues from what it already holds.",
          });
        }

        // `cacheMembers` is **not** fire-and-forget any more, and that is a
        // decision with a reason: its failure does have a consequence for a
        // scan. Offline, an unknown membership code is refused (see
        // `membershipOffline`), so a stale roster turns a member who joined
        // recently into a red screen in front of a queue. A failure that can
        // produce a false refusal has to reach the person who can work around
        // it.
        try {
          const membersRes = await fetch("/api/membership/list");
          if (!membersRes.ok) {
            throw new Error(`HTTP ${membersRes.status}`);
          }
          const membersBody = await membersRes.json();
          if (!Array.isArray(membersBody?.members)) {
            throw new Error("no members array in payload");
          }
          await cacheMembers(membersBody.members);
        } catch (error) {
          console.error("scanner:member_roster_failed", error);
          notices.push({
            key: "members",
            tone: "error",
            text: "The member list on this device was NOT refreshed. With the radio off, a member who joined recently may not be recognised — check them in from the list rather than refusing them.",
          });
        }
      }

      setCacheNotices(notices);

      // Piggyback sync on a successful fetch
      try {
        await syncPendingCheckins();
      } catch (error) {
        // The drain reports its own buckets and never throws by design; if it
        // does, the queue is untouched and the counters below still say so.
        console.error("scanner:sync_failed", error);
      }
      await refreshQueueCounts();
    },
    [selectedPartyId, refreshQueueCounts]
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

  // Refresh attendance after a scan that changed, or revealed, the record.
  // `already_recorded` is included: the server knows something this device's
  // list does not, and the list is what the operator reads next.
  useEffect(() => {
    if ((status === "success" || status === "already_recorded") && selectedPartyId) {
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

      // Detect torch capability from the video track
      try {
        const videoEl = document.querySelector("#qr-reader video") as HTMLVideoElement | null;
        const stream = videoEl?.srcObject as MediaStream | null;
        const track = stream?.getVideoTracks()[0];
        if (track) {
          videoTrackRef.current = track;
          const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
          if (caps?.torch) {
            setTorchAvailable(true);
          }
        }
      } catch {
        // torch detection failed — ignore
      }
    }

    initScanner().catch(() => {});

    return () => {
      scannerInstanceRef.current = null;
      videoTrackRef.current = null;
      setTorchOn(false);
      setTorchAvailable(false);
      if (qrcode) {
        qrcode.stop().catch(() => {});
      }
    };
  }, [showScanner]);

  /**
   * The flash and the haptic, fired together and **before** any network
   * confirmation (`checkin-offline.md`, gate *feedback immediato*): the operator
   * has a queue in front of them and does not wait for a round trip.
   *
   * Three patterns for three states — one long pulse, a long-then-short pair, a
   * short-short burst (`src/utils/haptics.ts`). It is the channel that works
   * when the phone is not being looked at, and the channel that does nothing at
   * all on iOS, which is why colour and icon carry the same distinction.
   */
  const showFlash = useCallback(
    (type: ScanFlashType, title: string, subtitle?: string) => {
      if (type === "success") {
        vibrateSuccess();
      } else if (type === "already_recorded") {
        vibrateAlreadyRecorded();
      } else {
        vibrateError();
      }
      setStatus(type);
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

  const toggleTorch = useCallback(async () => {
    const track = videoTrackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      // torch toggle failed
    }
  }, [torchOn]);

  const addScanRecord = useCallback((record: ScanRecord) => {
    setScanHistory((prev) => [record, ...prev].slice(0, 5));
  }, []);

  const markRecordUndone = useCallback((record: ScanRecord) => {
    setScanHistory((prev) =>
      prev.map((s) => (s === record ? { ...s, undone: true, canUndo: false } : s))
    );
  }, []);

  const handleUndoCheckIn = useCallback(
    async (record: ScanRecord) => {
      if (!record.canUndo || record.undone) return;

      const confirmMsg = `Undo check-in for ${record.name}?`;
      if (!window.confirm(confirmMsg)) return;

      // With the radio off the reversal cannot reach the server, and the entry
      // it would reverse is still sitting in the queue. Dropping the queue entry
      // locally is the whole of the undo in that case: leaving it there means
      // the admission is reported on the next drain and the reversal a member of
      // staff performed at the door never happened. `checkin-offline.md` calls
      // the undo *«il percorso piu' semplice per far rientrare qualcuno»* — an
      // undo that silently does nothing is worse than one that refuses out loud.
      if (!navigator.onLine) {
        if (!record.localKey) {
          showFlash(
            "error",
            "This entry cannot be undone offline",
            "It was recorded on the server. Undo it once the signal is back."
          );
          return;
        }
        try {
          await undoCheckInLocally(record.localKey);
          markRecordUndone(record);
          showFlash("error", "Undone on this device", `${record.name} — not reported`);
          await refreshQueueCounts();
        } catch (error) {
          console.error("scanner:local_undo_failed", { key: record.localKey, error });
          showFlash(
            "error",
            "The reversal could not be written to this device",
            "The check-in still stands — try again"
          );
        }
        return;
      }

      try {
        const body: {
          ticketId?: string;
          guestListEntryId?: string;
          attendanceId?: string;
          partyId?: string;
          deviceId?: string;
        } =
          record.type === "guest"
            ? { guestListEntryId: record.id }
            : record.type === "membership"
              ? { attendanceId: record.id }
              : { ticketId: record.id };

        // `door_scan_events.party_id` is NOT NULL and an Event Pass carries no
        // party of its own (`party_id IS NULL` is a real, sold product), so the
        // reversal must name the night it happened at — the undo route requires
        // it and answers 400 without it (undo/route.ts:138-155). `deviceId`
        // travels for the same reason it travels with a scan: without it the row
        // can never be classified `two_devices`.
        if (selectedPartyId) body.partyId = selectedPartyId;
        if (deviceIdRef.current) body.deviceId = deviceIdRef.current;

        const res = await fetch("/api/tickets/checkin/undo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          markRecordUndone(record);
          // Red on purpose, and it is not a refusal of the code: at the door it
          // means *this person is no longer admitted*, which is the fact the
          // operator has just created.
          showFlash("error", "Check-in undone", record.name);
          fetchAttendance(searchQuery || undefined);
          return;
        }

        // A failed undo used to be swallowed whole: the row stayed checked in,
        // the history said nothing, and the operator had no way to know.
        let detail: string | null = null;
        try {
          detail = readString(await res.json(), "error");
        } catch {
          detail = null;
        }
        console.error("scanner:undo_failed", { status: res.status, detail });
        showFlash(
          "error",
          "The check-in was NOT undone",
          detail ?? serverFaultMessage(res.status)
        );
      } catch (error) {
        console.error("scanner:undo_unreachable", error);
        showFlash(
          "error",
          "The check-in was NOT undone",
          "The server could not be reached — the check-in still stands"
        );
      }
    },
    [
      showFlash,
      fetchAttendance,
      searchQuery,
      selectedPartyId,
      markRecordUndone,
      refreshQueueCounts,
    ]
  );

  // ── The door's three answers ───────────────────────────────────────────────
  //
  // One vocabulary for both paths. Online the answer is the route's `DoorOutcome`
  // body; offline it is derived from this device's cache. Which path produced it
  // changes the evidence that was available, never the three things a member of
  // staff can be told — that is the whole of FIX-04, and it is why the two blocks
  // below resolve through the same three names.

  /** A refusal: one of the four reasons, one sentence each, red. */
  function refuse(
    reason: DoorNotValidReason,
    recordId: string,
    type: ScanRecord["type"] = "ticket",
    subtitle?: string
  ) {
    showFlash("error", NOT_VALID_MESSAGE[reason], subtitle);
    addScanRecord({
      id: recordId,
      type,
      name: "Unknown",
      status: "error",
      reason: NOT_VALID_MESSAGE[reason],
      timestamp: Date.now(),
      canUndo: false,
    });
  }

  /**
   * The server answered, and its answer was not one of the three outcomes.
   *
   * Deliberately **not** the one shared connection message this replaces: a
   * 500, a 503, an expired session and a dead radio are four different facts,
   * and the single catch they used to share made all four read the same. Named
   * by shape rather than by string on purpose — the assertion for this fix is a
   * grep over the whole file, so quoting the old wording here would break it,
   * exactly as it did once in plan 31-07. The status is classified in the same
   * order the sync manager uses (sync-manager.ts:122-175), so the screen and the
   * queue never disagree about what a response meant.
   */
  function reportServerFault(
    status: number,
    body: unknown,
    recordId: string,
    type: ScanRecord["type"]
  ) {
    const message = serverFaultMessage(status);
    const detail = readString(body, "error");
    console.error("scanner:unexpected_response", { status, detail, type });
    showFlash("error", message, detail ?? undefined);
    addScanRecord({
      id: recordId,
      type,
      name: "Unknown",
      status: "error",
      reason: message,
      timestamp: Date.now(),
      canUndo: false,
    });
  }

  /** The IndexedDB read or write itself failed. Its own sentence — the cache is not the network. */
  function reportStoreFault(recordId: string, type: ScanRecord["type"], error: unknown) {
    console.error("scanner:store_failure", { type, error });
    showFlash(
      "error",
      "This device could not read its own list",
      "Check the person in from the list on screen"
    );
    addScanRecord({
      id: recordId,
      type,
      name: "Unknown",
      status: "error",
      reason: "This device could not read its own list",
      timestamp: Date.now(),
      canUndo: false,
    });
  }

  /**
   * A scanned ticket, with the radio on.
   *
   * Returns `"network_failed"` when the request never reached a server — the one
   * cause that may fall through to the cache, and the only thing the old catch
   * was actually written for.
   */
  async function ticketOnline(
    code: string,
    partyId: string
  ): Promise<"handled" | "network_failed"> {
    const ticketId = ticketIdFromToken(code);

    let res: Response;
    try {
      res = await fetch("/api/tickets/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: code,
          partyId,
          // Without it the row is written as `device_id: "unknown"` and can
          // never be classified `two_devices` (checkin/route.ts:251-256).
          deviceId: deviceIdRef.current ?? undefined,
          source: "online",
        }),
      });
    } catch {
      return "network_failed";
    }

    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }

    // Transport first, in the same order as the drain's classifier: an expired
    // session and a failed write are facts about the server, not verdicts about
    // the code that was scanned.
    if (res.status === 401 || res.status === 403 || res.status >= 500) {
      reportServerFault(res.status, parsed, ticketId, "ticket");
      return "handled";
    }

    if (!isDoorOutcome(parsed)) {
      reportServerFault(res.status, parsed, ticketId, "ticket");
      return "handled";
    }

    switch (parsed.outcome) {
      case "recorded": {
        const flags = readFlags(parsed);
        const flagged = flags.length > 0;
        const label = readSubjectLabel(parsed) ?? readString(parsed, "member_name");
        const tier = readString(parsed, "tier_name");
        const isGuestList = readString(parsed, "ticket_type") === "guest_list";
        const subtitle = flagged
          ? flagSentence(flags)
          : [tier, isGuestList ? "Guest List" : null].filter(Boolean).join(" · ") ||
            undefined;

        // Amber for a flagged admission: the person is admitted either way, and
        // the colour says *look at this afterwards*, never *stop*.
        showFlash(
          flagged ? "already_recorded" : "success",
          label ?? (flagged ? "Admitted" : "Ticket holder"),
          subtitle
        );
        addScanRecord({
          id: ticketId,
          type: isGuestList ? "guest" : "ticket",
          name: label ?? "Admitted",
          ticketType: tier ?? undefined,
          status: flagged ? "already_recorded" : "success",
          reason: flagged ? flagSentence(flags) : undefined,
          timestamp: Date.now(),
          canUndo: true,
        });

        // The cache follows the server, without queueing anything: the entry is
        // already on the record. A failure here costs a later amber flag instead
        // of a later amber flag — no admission and no refusal turns on it — so it
        // is logged under its own category rather than put on the screen.
        markCheckedInLocally(partyId, "ticket", ticketId, {
          at: readString(parsed, "at") ?? undefined,
        }).catch((error) => {
          console.error("scanner:cache_mark_failed", { ticketId, partyId, error });
        });
        return "handled";
      }

      case "already_recorded": {
        // FIX-04a: the holder's label, then the fact — a time and an operator.
        // No cause word: this screen is read in front of the person it would be
        // a verdict about.
        const label =
          readSubjectLabel(parsed) ?? readString(parsed, "member_name") ?? "Ticket holder";
        const fact = recordedFact(readString(parsed, "at"), readOperatorLabel(parsed));
        showFlash("already_recorded", label, fact);
        addScanRecord({
          id: ticketId,
          type: "ticket",
          name: label,
          status: "already_recorded",
          reason: fact,
          timestamp: Date.now(),
          canUndo: false,
        });
        return "handled";
      }

      case "not_valid": {
        const sentence = notValidSentence(parsed);
        const holder = readString(parsed, "member_name");
        const night = readString(parsed, "party_title") ?? readString(parsed, "event_title");
        showFlash(
          "error",
          sentence,
          readString(parsed, "reason") === "wrong_night" && night
            ? `That code belongs to ${night}`
            : (holder ?? undefined)
        );
        addScanRecord({
          id: ticketId,
          type: "ticket",
          name: holder ?? "Unknown",
          status: "error",
          reason: sentence,
          timestamp: Date.now(),
          canUndo: false,
        });
        return "handled";
      }
    }
  }

  /**
   * A scanned ticket, from this device's own memory of the night.
   *
   * The same three outcomes, derived locally. The signature cannot be checked
   * here — `TICKET_SIGNING_SECRET` is server-side only and shipping it to a
   * staff phone would make every phone a ticket forge — so `not_valid` is
   * locally reachable only for a string that is not shaped like one of our
   * codes, for a code cached under a different night, and for no party selected.
   */
  async function ticketOffline(code: string, partyId: string) {
    const ticketId = ticketIdFromToken(code);

    try {
      const cached = await findAttendee(partyId, "ticket", ticketId);

      if (cached) {
        if (cached.checkedIn) {
          const fact = recordedFact(cached.checkedInAt, cached.checkedInBy);
          showFlash("already_recorded", cached.name, fact);
          addScanRecord({
            id: ticketId,
            type: cached.ticketType === "guest_list" ? "guest" : "ticket",
            name: cached.name,
            status: "already_recorded",
            reason: fact,
            timestamp: Date.now(),
            canUndo: false,
          });
          return;
        }

        await checkInLocally(partyId, "ticket", ticketId, {
          // FIX-10: the full signed string, exactly as scanned. The id above was
          // derived for the lookup; nothing here discards the signature.
          token: code,
          name: cached.name,
        });

        // A refund known at download time produces the same admit-and-flag
        // locally as the server produces online (FIX-09).
        const flagged = Boolean(cached.refundedAt);
        const subtitle = flagged
          ? `${FLAG_MESSAGE.refunded_before_night} · Offline`
          : [
              cached.tierName,
              cached.ticketType === "guest_list" ? "Guest List" : null,
              "Offline",
            ]
              .filter(Boolean)
              .join(" · ");

        showFlash(flagged ? "already_recorded" : "success", cached.name, subtitle);
        addScanRecord({
          id: ticketId,
          type: cached.ticketType === "guest_list" ? "guest" : "ticket",
          name: cached.name,
          ticketType: cached.tierName || undefined,
          status: flagged ? "already_recorded" : "success",
          reason: flagged ? FLAG_MESSAGE.refunded_before_night : undefined,
          timestamp: Date.now(),
          canUndo: true,
          localKey: attendeeKey(partyId, "ticket" satisfies DoorSubjectType, ticketId),
        });
        await refreshQueueCounts();
        return;
      }

      // In the cache, but under another night. Opposite of "not in the cache at
      // all", and the only reason the `by-subject` index exists.
      const elsewhere = await findBySubject(ticketId);
      if (elsewhere.length > 0) {
        refuse("wrong_night", ticketId);
        return;
      }

      // ── The branch that looks like a hole and is a decision ─────────────────
      //
      // Offline, a well-formed but uncached token is **admitted and flagged**,
      // never refused. Refusing here refuses a valid guest whose ticket was
      // bought after this device downloaded the list — a false refusal, in front
      // of a queue, on data they cannot argue with, and the door's asymmetry says
      // that is the worse of the two errors by a wide margin.
      //
      // The forgery window is real and bounded, and it is accepted rather than
      // hidden (T-31-11-01): it needs a `uuid.64-hex` string to get this far, the
      // entry is flagged on this screen immediately, and the moment the signal
      // returns the route re-verifies the HMAC and the scan lands in the night's
      // review list as `invalid_signature`. The alternative is shipping the
      // signing secret to every staff phone, which would turn each one into a
      // ticket forge.
      await checkInLocally(partyId, "ticket", ticketId, { token: code });
      showFlash("already_recorded", "Admitted", `${FLAG_MESSAGE.not_in_cache} · Offline`);
      addScanRecord({
        id: ticketId,
        type: "ticket",
        name: "Not in tonight's list",
        status: "already_recorded",
        reason: FLAG_MESSAGE.not_in_cache,
        timestamp: Date.now(),
        canUndo: true,
        localKey: attendeeKey(partyId, "ticket" satisfies DoorSubjectType, ticketId),
      });
      await refreshQueueCounts();
    } catch (error) {
      reportStoreFault(ticketId, "ticket", error);
    }
  }

  /** A membership code, with the radio on. */
  async function membershipOnline(
    membershipCode: string,
    partyId: string
  ): Promise<"handled" | "network_failed"> {
    let res: Response;
    try {
      res = await fetch("/api/membership/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: membershipCode,
          partyId,
          deviceId: deviceIdRef.current ?? undefined,
          source: "online",
        }),
      });
    } catch {
      return "network_failed";
    }

    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }

    if (res.status === 401 || res.status === 403 || res.status >= 500) {
      reportServerFault(res.status, parsed, membershipCode, "membership");
      return "handled";
    }

    if (!isDoorOutcome(parsed)) {
      reportServerFault(res.status, parsed, membershipCode, "membership");
      return "handled";
    }

    // This route's `subject` carries no label; the display name is the legacy
    // `member_name`, which is additive for one release.
    const memberName = readString(parsed, "member_name") ?? "Member";

    switch (parsed.outcome) {
      case "recorded": {
        showFlash("success", memberName, "Member");
        addScanRecord({
          // The undo addresses the attendance row, not the member.
          id: readString(parsed, "attendance_id") ?? membershipCode,
          type: "membership",
          name: memberName,
          status: "success",
          timestamp: Date.now(),
          canUndo: readString(parsed, "attendance_id") !== null,
        });
        return "handled";
      }

      case "already_recorded": {
        const fact = recordedFact(readString(parsed, "at"), readOperatorLabel(parsed));
        showFlash("already_recorded", memberName, fact);
        addScanRecord({
          id: membershipCode,
          type: "membership",
          name: memberName,
          status: "already_recorded",
          reason: fact,
          timestamp: Date.now(),
          canUndo: false,
        });
        return "handled";
      }

      case "not_valid": {
        const sentence = notValidSentence(parsed);
        showFlash("error", sentence);
        addScanRecord({
          id: membershipCode,
          type: "membership",
          name: "Unknown",
          status: "error",
          reason: sentence,
          timestamp: Date.now(),
          canUndo: false,
        });
        return "handled";
      }
    }
  }

  /**
   * A membership code, from the roster this device downloaded.
   *
   * **A code the roster does not know is refused here, and a ticket in the same
   * position is admitted.** The two are not inconsistent. A ticket token is
   * HMAC-signed, so an uncached one still had to be a `uuid.64-hex` string and
   * the server re-checks the signature on sync — a bounded window. A membership
   * QR carries no signature at all (checkin-store.ts:29-32) and the code space
   * is generated with `Math.random()` (`src/utils/qr.ts:49`, open defect QR-01),
   * so admitting an unknown one offline would be an unbounded hole rather than a
   * bounded one, with nothing on the far side able to catch it.
   *
   * The cost is a real false refusal for a member who joined after the roster was
   * downloaded — which is why a failed roster refresh is now a banner on this
   * screen, and why the door runbook's answer is to check that person in from
   * the list rather than to re-scan.
   */
  async function membershipOffline(membershipCode: string, partyId: string) {
    try {
      const member = await findMember(membershipCode);
      if (!member) {
        refuse(
          "unknown_code",
          membershipCode,
          "membership",
          "Not in the member list on this device — check them in from the list instead"
        );
        return;
      }

      const result = await checkInMemberLocally(partyId, membershipCode);
      if (result.alreadyRecorded) {
        const fact = recordedFact(result.at, THIS_DEVICE_LABEL);
        showFlash("already_recorded", member.fullName, fact);
        addScanRecord({
          id: membershipCode,
          type: "membership",
          name: member.fullName,
          status: "already_recorded",
          reason: fact,
          timestamp: Date.now(),
          canUndo: false,
        });
        return;
      }

      showFlash("success", member.fullName, "Member · Offline");
      addScanRecord({
        id: membershipCode,
        type: "membership",
        name: member.fullName,
        status: "success",
        timestamp: Date.now(),
        canUndo: true,
        localKey: result.key,
      });
      await refreshQueueCounts();
    } catch (error) {
      reportStoreFault(membershipCode, "membership", error);
    }
  }

  /** The membership code inside a QR URL, or the bare code. */
  function extractMembershipCode(code: string): string {
    if (!MEMBERSHIP_PATTERN.test(code)) return code;
    try {
      return new URL(code).searchParams.get("code") || code;
    } catch {
      return code;
    }
  }

  const handleVerify = async (code: string) => {
    try {
      // A scan without a party has no meaning: the record key is party-scoped and
      // a presence filed against the wrong night corrupts two nights' data
      // (`checkin-offline.md`, gate *identita' del party*).
      if (!selectedPartyId) {
        refuse("no_party_selected", code);
        return;
      }

      if (TICKET_TOKEN_PATTERN.test(code)) {
        if (!navigator.onLine) {
          await ticketOffline(code, selectedPartyId);
          return;
        }
        const result = await ticketOnline(code, selectedPartyId);
        // The request never reached a server. This — and only this — is what the
        // old single catch existed for, and it is the only cause that may fall
        // through to the cache.
        if (result === "network_failed") {
          await ticketOffline(code, selectedPartyId);
        }
        return;
      }

      if (MEMBERSHIP_PATTERN.test(code) || BARE_MEMBERSHIP_PATTERN.test(code)) {
        const membershipCode = extractMembershipCode(code);
        if (!navigator.onLine) {
          await membershipOffline(membershipCode, selectedPartyId);
          return;
        }
        const result = await membershipOnline(membershipCode, selectedPartyId);
        if (result === "network_failed") {
          await membershipOffline(membershipCode, selectedPartyId);
        }
        return;
      }

      // Not shaped like anything this door issues. Local, and safe to refuse:
      // no valid holder can land here.
      refuse("unknown_code", code);
    } catch (error) {
      // The genuine last resort. Every branch above handles its own failures
      // with its own sentence, so anything arriving here is a cause this plan
      // did not foresee — and it must not read like one that was. It also has to
      // show *something*: the scanner is paused until a flash is dismissed, so a
      // silent throw here would freeze the camera with a queue in front of it.
      console.error("scanner:unexpected", error);
      showFlash(
        "error",
        "The scanner hit an unexpected failure",
        "Scan again — nothing was recorded"
      );
    }
  };

  /**
   * The *Check in* button beside a guest-list name. Online only — it has no
   * offline branch and never had one.
   *
   * Every outcome now reaches the screen. It used to write into a `message`
   * state that **nothing rendered**: a 409, a 500 and a dead radio all set a
   * string nobody could see, which is the newsletter form's defect
   * (`meta-gates.md`) reproduced in a second place.
   */
  const handleGuestCheckIn = async (guestListEntryId: string) => {
    try {
      const res = await fetch("/api/tickets/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestListEntryId }),
      });

      let parsed: unknown = null;
      try {
        parsed = await res.json();
      } catch {
        parsed = null;
      }

      if (res.ok) {
        const name = readString(parsed, "name") ?? "Guest";
        showFlash("success", name, "Guest List");
        addScanRecord({
          id: guestListEntryId,
          type: "guest",
          name,
          ticketType: "Guest List",
          status: "success",
          timestamp: Date.now(),
          canUndo: true,
        });
        fetchAttendance(searchQuery || undefined);
        return;
      }

      // This route already answers the contract on its conflict (plan 31-06):
      // 409 with `outcome: "already_recorded"`, `at` and `by`.
      if (res.status === 409) {
        const name = readString(parsed, "name") ?? "Guest";
        const fact = recordedFact(readString(parsed, "at"), readOperatorLabel(parsed));
        showFlash("already_recorded", name, fact);
        addScanRecord({
          id: guestListEntryId,
          type: "guest",
          name,
          status: "already_recorded",
          reason: fact,
          timestamp: Date.now(),
          canUndo: false,
        });
        return;
      }

      reportServerFault(res.status, parsed, guestListEntryId, "guest");
    } catch (error) {
      // The one place this string survives, and the only cause it now covers:
      // the request never reached a server.
      console.error("scanner:guest_checkin_unreachable", error);
      showFlash("error", "Connection error", "The guest was not checked in");
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
    setCacheNotices([]);
    isProcessingRef.current = false;
    // Sync any pending check-ins before switching party
    syncPendingCheckins()
      .catch((error) => {
        console.error("scanner:sync_failed", error);
      })
      .finally(() => {
        refreshQueueCounts();
      });
    fetchParties();
  };

  function formatCheckinTime(iso: string) {
    return formatClock(iso) ?? "--:--";
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
                      Offline{queue.pending > 0 ? ` (${queue.pending})` : ""}
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
            {/* Torch toggle — only shown when camera supports it */}
            {torchAvailable && (
              <button
                onClick={toggleTorch}
                className={`mt-3 w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium transition-colors ${
                  torchOn
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-card-border/30 text-muted hover:text-foreground"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                {torchOn ? "Torch On" : "Torch Off"}
              </button>
            )}
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
              // The same amber as the flash: admitted-and-flagged, or already
              // recorded. Never red, because neither is a refusal.
              const isFlagged = record.status === "already_recorded" && !isUndone;
              const isError = record.status === "error";
              // A flagged admission is still an admission, so it stays undoable.
              // The old `isSuccess && canUndo` would have taken that away from
              // exactly the entries most likely to need it.
              const canTap = record.canUndo && !isUndone;

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
                    ) : isFlagged ? (
                      <svg
                        className="h-4 w-4 text-amber-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
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
                        {isUndone
                          ? "Undone"
                          : (record.reason ?? record.ticketType)}
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
