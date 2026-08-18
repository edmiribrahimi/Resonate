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
  // `undoCheckInLocally` — the function that DELETES the queue entry — is
  // deliberately not imported any more. It still exists in the store, and the
  // offline branch below calls `markUndoneLocally` instead: deleting makes the
  // admission never have happened, marking keeps who reversed it and when.
  markUndoneLocally,
  cacheDoorAuth,
  readDoorAuth,
  getDeviceId,
  getPendingCount,
  getFailedCount,
  getBlockedCount,
  getUndoneLocallyCount,
  getFailedCheckins,
  rosterPredatesRole,
  THIS_DEVICE_LABEL,
  type CachedDoorAuth,
  type FailedCheckin,
  type MergeResult,
} from "@/lib/offline/checkin-store";
import {
  syncPendingCheckins,
  setupSyncListeners,
  retryBlockedAfterSignIn,
} from "@/lib/offline/sync-manager";
import {
  isDoorOutcome,
  DOOR_SUPERVISION_REQUIRED,
  DOOR_SUPERVISION_REQUIRED_ERROR,
} from "@/lib/door/outcome";
// The house browser factory, imported at module top and called INSIDE the effect
// that needs it — the convention `MediaUpload.tsx:61` and `EventForm.tsx:463`
// already follow. It wraps `createBrowserClient`, which caches a module-level
// singleton, so every call returns the same client (D-38-16).
import { createClient } from "@/lib/supabase/client";
import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
} from "@supabase/supabase-js";
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
  // The one member of the union no live scan can produce: the check-in route
  // answers it only for a report arriving from the drain (plan 35-12). The
  // sentence exists because the `Record` is total, and a total `Record` with a
  // hole would be a member silently falling to UNRECOGNISED_REASON_MESSAGE. If
  // it ever does reach this screen, it is not about the person in front of it —
  // it is about this device's authorisation for that night.
  no_assignment_at_scan:
    "This device had no door assignment for that night — recorded, not admitted",
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

/**
 * Every distinct way a response can fail to be an outcome, told apart.
 *
 * ── The body is a parameter now, and that is the whole of the fix ────────────
 *
 * This function used to take the HTTP status alone, so it chose a headline
 * **before** anything read the body. The limit was measured and written down
 * where the value is minted, `require-operator.ts:104-110`, waiting for this
 * plan: two different `403`s reached this line and produced one sentence, so a
 * device could not tell *"this account may never work the door"* from *"this
 * account may work this door but may not reverse an admission on it"*.
 *
 * The distinction is made on a **value decided by position** — `status` in the
 * envelope — and never by reading the prose in `error`. Next redacts the message
 * of an error thrown in a production build (CR-01), which is exactly why the
 * category travels as its own field.
 *
 * A `403` **without** that value keeps the sentence it has always had. Nobody
 * who is refused today is told something different.
 */
function serverFaultMessage(status: number, body?: unknown): string {
  if (status === 401) return "Session expired — sign in again to keep scanning";
  if (status === 403) {
    return readString(body, "status") === DOOR_SUPERVISION_REQUIRED
      ? DOOR_SUPERVISION_REQUIRED_ERROR
      : "This account is not allowed to check people in";
  }
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

/** Why an entry could never be recorded, in words a member of staff can act on. */
const FAILURE_REASON_MESSAGE: Record<string, string> = {
  invalid_signature: "the code was not issued by us",
  unknown_code: "nothing matched this code",
  wrong_night: "the code was for another night",
  no_party_selected: "no party was selected when it was scanned",
  unexpected_response: "the server never accepted it",
};

function failureSentence(reason: string): string {
  return FAILURE_REASON_MESSAGE[reason] ?? `it failed as "${reason}"`;
}

/**
 * How a failed entry is described on screen.
 *
 * The store's record key is `partyId:subjectType:subjectId`, and for a
 * membership entry that subject id **is the membership code** — a credential.
 * Rendering the raw key would put it on a screen and in a screenshot, so this
 * shows the kind, the moment it was scanned, and a short id only where the id
 * is not itself a way in (T-31-11-04). No email and no membership code appears.
 */
function failedEntryLabel(entry: FailedCheckin): string {
  const kind =
    entry.type === "membership"
      ? "Membership"
      : entry.type === "guest"
        ? "Guest list"
        : "Ticket";
  const when = formatClock(entry.scannedAt);
  const shortId =
    entry.type === "membership" ? null : entry.subjectId.slice(0, 8);
  return [kind, shortId, when ? `scanned ${when}` : null]
    .filter(Boolean)
    .join(" · ");
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

/**
 * How old the list is, in the words a person reads at arm's length in the dark.
 *
 * Seconds below a minute, whole minutes above it. D-38-09's threshold is five
 * minutes, so anything finer than a second is decorative and anything coarser
 * than a minute stops being an answer.
 *
 * **No clamp at zero, and that is the decision.** The caller measures with
 * `performance.now()`, which is monotonic, so this cannot go negative. If it
 * ever did, `updated -3s ago` is a fault a human can see and report; clamping
 * would print `updated 0s ago` instead — a claim that the list is fresh. Of the
 * two ways to be wrong, only one of them lies in the direction of a door
 * trusting a list it should not.
 */
function formatListAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `updated ${seconds}s ago`;
  return `updated ${Math.floor(seconds / 60)}m ago`;
}

/**
 * What the staleness band says — an age, and at most one transport fact.
 *
 * **It never names a permission** (D-38-04). `channelLive` being false covers an
 * expired token, a join rate limit and a Realtime restart exactly as readily as
 * a refused join; the four are indistinguishable from this device, so the door
 * reports what it can observe — that it is not receiving live updates — and does
 * not guess at why. One place decides who the operator is, and it is not here.
 */
function stalenessBandText(channelIsLive: boolean, ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  const age =
    minutes < 1
      ? "less than a minute old"
      : `${minutes} minute${minutes === 1 ? "" : "s"} old`;
  return channelIsLive
    ? `This list is ${age} — tap to reload.`
    : `This device is not receiving live updates. The list is ${age} — tap to reload.`;
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
  /**
   * Reversals taken with the radio off that no endpoint has accepted yet.
   *
   * Its own number, beside the other three, because an entry excluded from the
   * drain and rendered nowhere is an entry that does not exist. There is no error
   * tracking in this project; this counter is the observer.
   */
  undone: number;
  /** IndexedDB did not answer. Zero and "unknown" are opposite facts. */
  unreadable: boolean;
}

/**
 * How far apart the two clocks were when the verdict was resolved, in ms.
 *
 * Positive means this device is BEHIND the server. It is measured once, at the
 * only moment both clocks are comparable — the response — and it is **shown,
 * never acted on**: `resolvedAt` exists so a phone can measure its own drift
 * instead of trusting itself (`require-operator.ts:153-166`). Nothing branches
 * on this number.
 */
const CLOCK_DRIFT_WORTH_SAYING_MS = 5 * 60 * 1000;

/**
 * How long a burst of reasons to reload is allowed to collapse into one fetch.
 *
 * A rush at the door produces one `door_scan_events` row per scan and the
 * ticket `UPDATE` fires its own trigger, so several signals arrive for one
 * list. Collapsing them costs a fraction of a second of freshness and saves a
 * fetch per person in the queue.
 *
 * **This number is assumption `A3`, not a measurement** (`38-RESEARCH.md`
 * § Assumptions Log). What would settle it is counting `scanner:reload` lines
 * over a night. Changing it is therefore a decision with a number written down,
 * never a tweak.
 */
const RELOAD_COALESCE_MS = 500;

/**
 * How long the list may go without a successful fetch before the parachute opens.
 *
 * **Re-armed, never periodic.** The timer is cleared and restarted on every
 * successful fetch, so a door with a queue in front of it never runs it at all —
 * the list already reloads after every scan. That is the honest meaning of
 * "parachute" and the whole answer to whether this is polling under another
 * name: on a busy night it fires zero times.
 *
 * **This number is assumption `A2`, not a measurement** (`38-RESEARCH.md`
 * § Assumptions Log). What would settle it is counting `scanner:reload` lines
 * carrying `reason: "safety"` over a night. Changing it is a decision with a
 * number written down.
 */
const SAFETY_RELOAD_MS = 5 * 60_000;

/**
 * How often the displayed age of the list is recomputed.
 *
 * Five seconds and not one. D-38-09's threshold is five **minutes**, so
 * second-level precision is decorative — `updated 10s ago` and `updated 12s ago`
 * read the same to somebody holding a phone at a door — while a 5 s tick is six
 * times cheaper than a 1 s tick over a night that runs 22:00 → 06:00 on a
 * battery.
 *
 * The interval exists only to force a re-render; the age itself is computed in
 * the render body from `lastFetchAtRef`, so what is shown is always the value at
 * paint time and never a value cached one tick ago.
 */
const FRESHNESS_TICK_MS = 5_000;

/**
 * The connectivity pill's colour, in one place because a gate reads it.
 *
 * `scripts/verify-scan-legibility.mjs` measures the third scan state against
 * this pill, and written inline the pill gave it nothing stable to read: its
 * tint was one occurrence among many of the same utility in this file, and a
 * gate that guesses prints a green over a measurement it never made. The
 * identifier and the `offlineDot` key are a contract with that gate
 * (`42-03-FINDINGS.md` §1); the utilities are spelled out in full because
 * Tailwind never emits a class name composed at runtime; both branches read
 * from here so one pill has one source of truth.
 *
 * Offline carries the warning semantic. Its legality is the pill's own word:
 * that semantic is also a format's identification colour, so the standing rule
 * is that anything wearing it carries text, and this one carries *Offline*.
 * Online stays on the raw acceptance vocabulary — the semantic set holds no
 * colour for *this one passed*, and phase 40 declined to invent one — which is
 * a declared derogation, not an omission.
 */
const CONNECTIVITY_PILL = {
  onlineWash: "bg-green-500/15 text-green-500",
  onlineDot: "bg-green-500",
  offlineWash: "bg-sem-warn/15 text-sem-warn",
  offlineDot: "bg-sem-warn",
} as const;

/** Read `doorAuth` off an attendance body, field by field. Anything else is `null`. */
function readDoorAuthPayload(body: unknown): CachedDoorAuth | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = (body as { doorAuth?: unknown }).doorAuth;
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  // `null` here is **absent**, which the route sends deliberately on the one
  // branch where there is no single verdict to report (attendance/route.ts:496-500).
  // Absent is not a refusal, and this function must not manufacture one.
  if (typeof v.mayScan !== "boolean") return null;
  if (typeof v.maySupervise !== "boolean") return null;
  if (typeof v.resolvedAt !== "string") return null;
  if (v.validUntil !== null && typeof v.validUntil !== "string") return null;
  return {
    mayScan: v.mayScan,
    maySupervise: v.maySupervise,
    validUntil: v.validUntil,
    resolvedAt: v.resolvedAt,
  };
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
   * admission — it means *admitted, look at this afterwards*, and `canUndo`
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

  /**
   * ── LIVE-01: whether the door is listening to the night now open ────────────
   *
   * A **transport** fact and nothing else: this device currently holds a joined
   * channel for this night. It is written from exactly two places — the
   * subscribe status callback and the heartbeat — and it is read only to decide
   * what is displayed (the band belongs to plan 38-06). No verdict, no refusal
   * and no admission reads it: that is LIVE-02, and it is enforced by the
   * structural extraction the plan runs over the five resolution paths.
   *
   * `false` therefore means "not listening", never "you may not". D-38-04.
   */
  const [channelLive, setChannelLive] = useState(false);
  /**
   * Whether the channel has been out of `SUBSCRIBED` since it last joined.
   *
   * Re-entering `SUBSCRIBED` after having left it **is** a reconnection, and the
   * channel does not replay what happened while it was down — so the list has to
   * be reloaded in full, not resumed. LIVE-03.
   */
  const hadDroppedRef = useRef(false);
  /**
   * ── D-38-06: a rebuild counter, and why the rebuild is not hand-rolled ──────
   *
   * `resubscribe` bumps this, the channel effect below lists it in its
   * dependency array, and React's own cleanup then does exactly the three steps
   * in exactly the right order: `removeChannel`, `setAuth()`, `channel(...)
   * .subscribe(...)`. One construction site for the channel, therefore, instead
   * of two that can drift — and a drift *there* is the silent failure this whole
   * phase exists to refuse.
   *
   * Why tear down at all instead of trusting the library: it does auto-rejoin,
   * with a 1 s / 2 s / 5 s / 10 s backoff. But on resume the access token may
   * still be the expired one — auth-js stops its refresh ticker while the
   * document is hidden and the JWT lives 3600 s — and a rejoin with an expired
   * token fails, backs off and retries. It converges, through a sequence of
   * failures, during the thirty seconds when a queue is forming. Rebuilding
   * after an explicit `setAuth()` converges in one step.
   *
   * And **no second backoff of our own**: two competing retry loops are a join
   * storm, and this project's `max_joins_per_second` is 100. The only retry in
   * the system is the library's.
   */
  const [channelEpoch, setChannelEpoch] = useState(0);
  const resubscribe = useCallback(() => {
    setChannelEpoch((epoch) => epoch + 1);
  }, []);

  // The queue, in four numbers plus "could not be read at all"
  const [queue, setQueue] = useState<QueueCounts>({
    pending: 0,
    failed: 0,
    blocked: 0,
    undone: 0,
    unreadable: false,
  });

  /**
   * ── ASSIGN-08: the verdict is resolved ONCE, when a night is opened ─────────
   *
   * `null` means **this device has not been told** — never *refused*. Every
   * branch below that reads it has to decide what an unanswered question means,
   * and none of them may quietly answer it.
   *
   * **The anti-pattern this state exists to forbid, written down so the next
   * edit meets it first: never ask for the authorisation on a scan path.** One
   * round trip per person, on a phone, on a weak signal, in front of a queue, is
   * the cost — and it buys nothing an assignment resolved at the door does not
   * already answer. The criterion is observable and it is a step of
   * `35-HUMAN-UAT.md`: N consecutive scans produce N check-in calls and **zero**
   * authorisation calls.
   */
  const [doorAuth, setDoorAuth] = useState<CachedDoorAuth | null>(null);

  /**
   * The distance between this device's clock and the server's, measured once at
   * resolution and rendered when it is large. It decides nothing.
   */
  const [clockDriftMs, setClockDriftMs] = useState<number | null>(null);

  /**
   * The operator asked for the tools back after the night's declared end.
   *
   * The escape hatch is what keeps `validUntil` a courtesy instead of a boundary
   * — see the comment on the banner it belongs to.
   */
  const [scanPastEnd, setScanPastEnd] = useState(false);

  /** A coarse clock, only so the "night is over" line can appear on its own. */
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  // What the last refresh could not do. Persistent, never a toast.
  const [cacheNotices, setCacheNotices] = useState<CacheNotice[]>([]);

  // The list behind the "could not be recorded" chip. A number with no way to
  // see what it counts is a number nobody trusts, and FIX-08 is about the count
  // meaning something.
  const [failedEntries, setFailedEntries] = useState<FailedCheckin[] | null>(null);
  const [blockedResult, setBlockedResult] = useState<string | null>(null);

  /** The camera did not start. Its own line, because it is not a cache problem. */
  const [cameraFault, setCameraFault] = useState<string | null>(null);

  /**
   * This install's id, resolved once and held.
   *
   * `door_scan_events.device_id` is NOT NULL and the `two_devices`
   * classification is impossible without it, so it travels with every scan and
   * every undo. Read once into a ref rather than per scan: `getDeviceId()` opens
   * IndexedDB, and the door cannot wait on that between two people.
   */
  const deviceIdRef = useRef<string | null>(null);

  /**
   * Whether the roster on this device was cached before members carried a role.
   *
   * Set by the version-4 upgrade, read once on open, and held in a ref so it can
   * be consulted inside `fetchAttendance` without adding a dependency to it.
   *
   * **It is not a reason to refuse anybody and is never shown as one.** All it
   * does is make the roster refresh this screen already performs run on a
   * search-filtered fetch too, until one refresh has come back carrying roles —
   * so a device that upgrades mid-season does not spend the night queueing
   * admissions with no marker while believing it knows.
   *
   * Defaults to `false`, which is the behaviour this screen had before this
   * plan: if the flag cannot be read, nothing is forced and nothing is lost.
   */
  const rosterPredatesRoleRef = useRef(false);

  const refreshQueueCounts = useCallback(async () => {
    try {
      const [pending, failed, blocked, undone] = await Promise.all([
        getPendingCount(),
        getFailedCount(),
        getBlockedCount(),
        getUndoneLocallyCount(),
      ]);
      setQueue({ pending, failed, blocked, undone, unreadable: false });
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

    /**
     * ── D-38-06 / LIVE-03: the app came back, however it came back ────────────
     *
     * The door's phone goes into a pocket and the screen sleeps. The channel
     * dies there — auto-refresh is stopped while the document is hidden, the
     * token expires, and Realtime disconnects a client that presents no fresh
     * JWT — and **`online` never fires, because the network never went away**.
     * Listening only to `online` would leave the commonest death undetected.
     *
     * So the wake signal is assembled by hand from three events, and they are
     * treated as **one** deliberately: the correct behaviour is identical for
     * all three, and a device-specific branch is a branch nobody can test.
     * Safari and iOS Safari implement neither `freeze` nor `resume`, so the
     * Page Lifecycle API is not an option here. `window.focus` is left out on
     * purpose: in a standalone PWA it fires alongside `visibilitychange` and
     * buys nothing but a listener the next reader has to reason about.
     *
     * `visibilitychange` is the third of the three and it lives in the effect
     * that already owns it (the parachute, further down), so there is exactly
     * one listener for that event and exactly one foreground reload.
     *
     * **Step three is the one that matters.** The reload is unconditional and
     * is never chained to the subscription's outcome: the list is correct after
     * `requestReload` whether or not the resubscribe succeeded. That is the
     * property the door needs, and it is why these handlers do not wait for
     * `SUBSCRIBED` before asking for the list.
     */
    const goOnline = () => {
      setIsOnline(true);
      resubscribe();
      requestReloadRef.current?.("online");
    };
    const goOffline = () => setIsOnline(false);
    // The bfcache restore, where `visibilitychange` may not fire at all.
    const onPageShow = () => {
      resubscribe();
      requestReloadRef.current?.("pageshow");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("pageshow", onPageShow);

    /**
     * ── The socket that died without saying so ────────────────────────────────
     *
     * The heartbeat runs every 25 s and a missed reply already forces a close
     * and a reconnect, so a silently dead socket is noticed in about 50 s
     * without any code of ours. That is what makes the 5-minute reload a
     * parachute rather than the primary mechanism.
     *
     * This callback drives the **display** and one explicit reconnect, and
     * nothing else. It only ever lowers `channelLive`: a live socket is not the
     * same claim as "this device is joined to this night's channel", and after a
     * refused join the socket keeps answering `ok` every 25 s. Raising the flag
     * on a heartbeat would paint the door green while it hears nothing — the
     * exact deception this phase is built to refuse. `SUBSCRIBED` is the only
     * signal that proves the claim, so `SUBSCRIBED` is the only writer that
     * raises it.
     */
    const supabase = createClient();
    supabase.realtime.onHeartbeat((status) => {
      if (status === "disconnected" || status === "timeout") {
        setChannelLive(false);
        // The documented remedy for a silent drop.
        supabase.realtime.connect();
      }
    });

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

    rosterPredatesRole()
      .then((predates) => {
        rosterPredatesRoleRef.current = predates;
      })
      .catch((error) => {
        // Its own category, and no banner. The consequence of not knowing is
        // that the roster refresh keeps the behaviour it had before this plan —
        // it still runs on every unfiltered fetch — so nothing at the door
        // changes and nobody is refused. Showing a line about a marker the
        // operator cannot act on, while people wait, would be noise on the one
        // screen that must stay readable.
        console.error("scanner:roster_role_flag_unreadable", error);
      });

    // The counters already refreshed on a 5 s interval regardless of
    // connectivity; only the rendering was gated on being offline.
    refreshQueueCounts();
    const interval = setInterval(refreshQueueCounts, 5000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("pageshow", onPageShow);
      // `onHeartbeat` returns `void` — it assigns a single callback slot on the
      // client (`RealtimeClient.js:401-403`), so there is no disposer to call.
      // Overwriting it with a no-op is the teardown, said out loud rather than
      // left for the next reader to wonder about: without it the callback above
      // would outlive this surface and go on writing state for a door that is
      // no longer on screen.
      supabase.realtime.onHeartbeat(() => {});
      cleanupSync();
      clearInterval(interval);
    };
  }, [refreshQueueCounts, resubscribe]);

  /**
   * The verdict for the night just opened, from the cache, before the network is
   * asked anything.
   *
   * It runs on `selectedPartyId` alone — not on the search box, not on a scan.
   * With the radio off this is the ONLY way the verdict arrives, which is the
   * case the whole cache exists for: the fetch below never answers and every one
   * of its failure branches returns early.
   *
   * A read that throws leaves `doorAuth` at `null`, and `null` is *not resolved*.
   * That is deliberate and it is the direction of the plan's declared asymmetry
   * inversion: on an **undo**, an unanswered question refuses. On a **scan** it
   * changes nothing at all — no branch of a scan path reads this state.
   */
  useEffect(() => {
    // Cleared FIRST, on every change of night, and this line is the whole of the
    // per-night discipline on the device: a verdict left over from the night
    // last opened would decide the night now open. That is the same defect
    // `bindNightToSubject` closes on the server (`undo/route.ts:148`) — an
    // authorisation for one night acting on another — and here it would be
    // invisible, because the screen looks identical either way.
    setDoorAuth(null);
    setClockDriftMs(null);
    setScanPastEnd(false);

    if (!selectedPartyId) return;

    let cancelled = false;
    readDoorAuth(selectedPartyId)
      .then((cached) => {
        // Only when nothing fresher has arrived. The fetch below is debounced by
        // 300 ms so this normally wins the race, but "normally" is not a
        // guarantee and a stale verdict must never overwrite a live one.
        if (!cancelled) setDoorAuth((current) => current ?? cached);
      })
      .catch((error) => {
        // Its own category. No banner: the consequence is that the undo asks for
        // signal, and nothing at the door refuses anybody because of it.
        console.error("scanner:door_auth_unreadable", error);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartyId]);

  /**
   * ── LIVE-01 / D-38-05: one channel, and it belongs to the night now open ────
   *
   * The shape is the per-night effect directly above, on purpose: the state
   * cleared first, an early return when no night is open, a `cancelled` flag
   * guarding the one `await`. What it adds has no precedent in this product —
   * verified while planning, there was **zero** use of `.channel(`,
   * `removeChannel` or `realtime.` anywhere under `src/` before this line.
   *
   * **It is fire-and-forget, and that is what makes LIVE-02 structural rather
   * than careful.** Nothing waits for `SUBSCRIBED` before a scan is allowed, the
   * camera effect further down does not depend on this one, and the status
   * callback writes exactly one piece of state. With the socket refused,
   * dropped, or never opened at all, every verdict still comes out of the local
   * cache at the same speed.
   *
   * `requestReloadRef` is declared further down, beside `fetchAttendance`, and
   * the message handler reaches the reload through it rather than calling
   * `requestReload` directly. That is not indirection for its own sake: a direct
   * call would carry `searchQuery` into this dependency array, and a keystroke
   * in the search box would then tear down and rebuild the WebSocket.
   */
  useEffect(() => {
    // Cleared FIRST, on every change of night, for the same reason the effect
    // above clears `doorAuth` first: "this device is listening" is a claim about
    // the night now open, and one left over from the night last opened would
    // describe a channel that no longer exists.
    setChannelLive(false);

    // A channel with no night listens for nothing. D-38-05.
    if (!selectedPartyId) return;

    // The `@supabase/ssr` singleton — never a second client, and never per-call
    // `realtime` options. The browser factory caches one client, so a second
    // caller's options are silently ignored; and with refresh-token rotation on
    // and a 10 s reuse window, two clients racing a refresh can end in a failed
    // refresh and a signed-out phone, at the door. D-38-16.
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    (async () => {
      // Documented as required before joining a private channel. 2.97.0 also
      // calls it itself when the socket opens — but not on the resume path,
      // where the socket is already open and that line does not run again.
      await supabase.realtime.setAuth();
      if (cancelled) return;

      channel = supabase
        // ── Two details on this call, and BOTH fail silently ─────────────────
        //
        // `private: true` must match the fourth argument of `realtime.send` in
        // the migration. A public broadcast reaches only public channels and a
        // private one only private channels: mismatch them and this channel
        // joins, reports `SUBSCRIBED`, no band ever appears — because the
        // channel really *is* live — and the list only ever changes every five
        // minutes, on the safety reload. It is the most deceptive failure in
        // this phase, no automated check catches it, and the two-device door
        // procedure is what does.
        //
        // `.toLowerCase()` because topic matching is a byte-exact string
        // comparison and Postgres renders `uuid::text` lowercase, while an id
        // arriving from an API response or a URL may not be. The policy's regex
        // is deliberately case-sensitive `[0-9a-f]`, so a mismatch is refused
        // loudly at join time instead of silently at delivery time.
        .channel(`door:${selectedPartyId.toLowerCase()}`, {
          config: { private: true },
        })
        .on("broadcast", { event: "attendance_changed" }, () => {
          // The handler calls the one entry point and does nothing else — it
          // never fetches, never merges, never renders. D-38-02 / LIVE-02.
          // The payload is deliberately not read: the database sends `{}` plus
          // the id `realtime.send` adds, and there is no field to trust.
          requestReloadRef.current?.("channel");
        })
        // ── D-38-04: what this callback may do, and what it may never do ─────
        //
        // It may write `setChannelLive` and log one categorised line. It may
        // NOT touch `doorAuth`, may not call `cacheDoorAuth`, and may not
        // produce any sentence about the operator's permission.
        //
        // `CHANNEL_ERROR` carries `Unauthorized` for a join the policy refused —
        // and the same code for an expired JWT, a rate limit and a Realtime
        // restart. The client cannot tell them apart, so the door does not
        // guess. One place decides who is holding the phone, it runs when the
        // night is opened, and it is not this one.
        .subscribe((status) => {
          switch (status) {
            case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
              setChannelLive(true);
              if (hadDroppedRef.current) {
                // A gap, not a pause: nothing that happened while this channel
                // was down is replayed to it. LIVE-03.
                hadDroppedRef.current = false;
                requestReloadRef.current?.("resubscribed");
              }
              break;
            case REALTIME_SUBSCRIBE_STATES.CLOSED:
            case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
            case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
              setChannelLive(false);
              hadDroppedRef.current = true;
              // One category, carrying the state that produced it, in this
              // file's own `scanner:<snake_case>` convention. Never a collapsed
              // generic line — `meta-gates.md`, zero silent failures.
              console.warn("scanner:channel_not_listening", { status });
              break;
            default: {
              // Exhaustiveness, and the only thing a green build proves about
              // this block: the union has four members in realtime-js 2.97.0,
              // and if a future version adds a fifth this assignment stops
              // compiling instead of falling through in silence.
              const unhandled: never = status;
              console.warn("scanner:channel_not_listening", {
                status: unhandled,
              });
              break;
            }
          }
        });
    })();

    return () => {
      cancelled = true;
      // Every listener and every timer torn down in the cleanup that armed it,
      // and a channel is both. Leaving one joined for a night no longer open
      // would keep reloading a list nobody is looking at.
      if (channel) void supabase.removeChannel(channel);
    };
    // `channelEpoch` is the resume signal's rebuild, and it is the only thing in
    // here besides the night. `searchQuery` is deliberately absent: a keystroke
    // in the search box must never tear down and rebuild a WebSocket.
  }, [selectedPartyId, channelEpoch]);

  /**
   * A 30-second tick, and ONLY while the server declared an end for this night.
   *
   * When `validUntil` is `null` no interval is created and nothing is watched:
   * an absent end is not an end at midnight, and no expiry is invented from it.
   */
  useEffect(() => {
    if (!doorAuth?.validUntil) return;
    setNowMs(Date.now());
    const tick = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, [doorAuth?.validUntil]);

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

  /**
   * When the list was last refreshed **successfully**, as a monotonic count of
   * elapsed time on this device.
   *
   * `performance.now()` and not `Date.now()`, for the reason already written at
   * the clock-drift measurement above: the device clock is **evidence, never
   * authority**. `Date.now()` can step backwards on an NTP correction — which
   * happens exactly when the network returns, the worst possible moment — and
   * would print a negative age. This measures what is actually being claimed:
   * elapsed time here since the last successful fetch.
   *
   * `null` means **never refreshed on this device**, which is not the same fact
   * as "refreshed a long time ago". The only branch this number may ever drive
   * is whether a band is shown. No verdict, no refusal and no admission reads it.
   */
  const lastFetchAtRef = useRef<number | null>(null);
  /** The safety reload's timeout. Foreground only — see the effect that owns it. */
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * The current `requestReload`, reachable from code declared above it.
   *
   * `requestReload` calls `fetchAttendance`, so it has to be declared after it —
   * and the safety timer has to be armed from **inside** `fetchAttendance`, at
   * the one point that knows a fetch actually succeeded. This ref is the one-way
   * link that keeps that order honest.
   *
   * It also keeps `armSafetyTimer` and the visibility listener free of
   * `searchQuery` in their dependency arrays. That is not tidiness: without it
   * every keystroke in the search box would tear down the listener and clear the
   * parachute, and a fetch that then failed would leave it unarmed — precisely
   * the case the parachute exists for.
   */
  const requestReloadRef = useRef<((reason: string) => void) | null>(null);

  /**
   * Clear the safety timeout and start a new one. Called from exactly two
   * places: after a successful fetch, and when the document becomes visible.
   */
  const armSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      safetyTimerRef.current = null;
      requestReloadRef.current?.("safety");
    }, SAFETY_RELOAD_MS);
  }, []);

  /**
   * Bumped once per **successful** fetch, right where the age is recorded.
   *
   * `lastFetchAtRef` is a ref, so writing it re-renders nothing and no effect can
   * depend on it. This counter is the render-visible shadow of that write, and it
   * exists for one reason: it is the only signal that arrives strictly **after**
   * `lastFetchAtRef.current` has been set. Keying the tick on `attendance`
   * instead would not work — `setAttendance` runs several `await`s earlier in the
   * same function, so on the first fetch of a night the effect would re-run while
   * the ref was still `null`, early-return, and never arm at all.
   */
  const [freshnessEpoch, setFreshnessEpoch] = useState(0);
  /** A pulse with no value of its own: it exists to force a re-render. */
  const [, setAgeTick] = useState(0);
  /**
   * Whether the document is being looked at, written by the one
   * `visibilitychange` listener this file has (see the effect that owns it).
   */
  const [docVisible, setDocVisible] = useState(true);

  /**
   * The freshness tick — the shape of the 30 s ticker above, with its guards.
   *
   * Two early returns, and each is a decision rather than a nicety:
   *
   * - **no successful fetch yet** → no interval is created at all. There is no
   *   age before the first fetch, and an interval that ticks a number nothing
   *   renders is a battery cost with no reader.
   * - **document hidden** → cleared, and not re-armed until it comes back. On
   *   the device this door runs on the point is moot (an iOS home-screen PWA is
   *   suspended, not throttled), but on Android it is a timer burning battery to
   *   repaint a screen in somebody's pocket.
   *
   * The immediate first computation the 30 s ticker performs happens here by
   * construction: the age is derived in the render body, so the render that
   * re-ran this effect already carries the current value and the interval only
   * supplies the pulses after it.
   */
  useEffect(() => {
    if (lastFetchAtRef.current === null) return;
    if (!docVisible) return;
    const tick = setInterval(
      () => setAgeTick((n) => n + 1),
      FRESHNESS_TICK_MS
    );
    return () => clearInterval(tick);
  }, [freshnessEpoch, docVisible]);

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
      let verdict: CachedDoorAuth | null = null;
      try {
        const data = await res.json();
        const events: AttendanceEvent[] = data.events ?? [];
        eventData = events[0] ?? null;
        setAttendance(eventData);

        // ── ASSIGN-08. THE one moment the verdict is asked for ───────────────
        //
        // Read off the response the scanner already makes when a night is
        // opened. No second call is opened for it and none may be added: this
        // request is the natural hook precisely because it is the one that
        // happens before the radio goes off.
        //
        // Absent is left absent. The route omits `doorAuth` on the one branch
        // where there is no single verdict to report, and nothing here turns an
        // omission into `mayScan: false`.
        verdict = readDoorAuthPayload(data);
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

      if (verdict) {
        setDoorAuth(verdict);

        // The drift, measured at the only moment both clocks are comparable, and
        // measured to be SHOWN. Nothing branches on it. Any use of the device
        // clock to decide a refusal is the alarm signal of this plan — the
        // lexicon is `checkin-store.ts`: evidence, never authority.
        const serverMs = Date.parse(verdict.resolvedAt);
        setClockDriftMs(Number.isNaN(serverMs) ? null : Date.now() - serverMs);

        // Written to the cache so the NEXT open, with the radio off, has it.
        // Failing to write is not a refusal of anything: the verdict is already
        // in state for this session, and the next open falls back to `null`,
        // which means unresolved.
        try {
          await cacheDoorAuth(selectedPartyId, verdict);
        } catch (error) {
          console.error("scanner:door_auth_uncacheable", error);
        }
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
      }

      // The roster refresh, through the call it has always used — one fetch
      // site, not a second one. What changed is only **when** it is allowed to
      // run: a device whose roster predates the role field refreshes on a
      // search-filtered fetch too, instead of waiting for the next unfiltered
      // one. Until that refresh lands, every membership admission this device
      // queues carries no marker, and the marker cannot be reconstructed later —
      // it is what the roster said at the door, and only the door was there.
      //
      // Nothing here can refuse anybody: the outcome of this block is a cache
      // and, on failure, the banner that already existed.
      if (eventData && (!search || rosterPredatesRoleRef.current)) {
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

        // Re-read rather than assume. `cacheMembers` clears the flag only when
        // the payload actually carried a role, so a roster served by a
        // deployment older than the field leaves it set — and the ref has to say
        // the same thing the store says, or the next fetch would stop forcing a
        // refresh the device still needs. Deliberately outside the try above: a
        // failure to read the flag is not a failure to refresh the roster, and
        // must not raise the banner that says it was.
        if (rosterPredatesRoleRef.current) {
          try {
            rosterPredatesRoleRef.current = await rosterPredatesRole();
          } catch (error) {
            console.error("scanner:roster_role_flag_unreadable", error);
          }
        }
      }

      setCacheNotices(notices);

      // ── The age of the list, recorded HERE and nowhere else ────────────────
      //
      // The placement is the design, not a detail. Every failure branch of this
      // function returns early above this line, so a fetch that failed and
      // surfaced a notice does **not** count as fresh and the age keeps climbing
      // — which is what makes the band appear when it should.
      //
      // Monotonic, on this device. See the ref's own comment for why this is not
      // `Date.now()`, and for the line it must not cross: this number is shown,
      // and the only branch it may ever drive is whether a band is shown.
      lastFetchAtRef.current = performance.now();
      // The render-visible shadow of the line above, bumped immediately after it
      // and nowhere else. It restarts the freshness tick from this moment — so
      // the displayed age is in phase with the fetch that produced it — and it is
      // what arms the tick for the first time on the first successful fetch of a
      // night.
      setFreshnessEpoch((n) => n + 1);
      // One place records freshness and one place re-arms the parachute, and
      // they are the same place — so the scan-triggered reload, the manual tap
      // and every future trigger re-arm through the same success, with no
      // special case for any of them.
      armSafetyTimer();

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
    [selectedPartyId, refreshQueueCounts, armSafetyTimer]
  );

  /**
   * A reload that arrived while a verdict was being produced, waiting to be
   * drained. Never a queue: several deferred reasons still mean one stale list.
   */
  const pendingReloadRef = useRef(false);
  /** The coalescing timeout, so a burst of reasons produces one fetch. */
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * ── LIVE-02 / D-38-02: the ONE way to ask for the attendee list to reload ───
   *
   * Every reason — a message on the channel, a reconnection, the safety timer, a
   * tap by the operator — comes through here, and here calls the fetch site the
   * scanner already has. There is deliberately **no second fetch site**: a second
   * one would be a second place where a `mergeAttendees` refusal can be dropped
   * without reaching the person holding the phone, which is exactly the defect
   * FIX-06 closed (`fetchAttendance`, the merge block above).
   *
   * This function never fetches, never merges, never reads or writes `doorAuth`,
   * and never renders a sentence. It defers, it coalesces, it delegates.
   */
  const requestReload = useCallback(
    (reason: string) => {
      // ── D-38-08 / LIVE-02. A verdict is being produced right now: it waits ──
      //
      // The reason is **not** React rendering. `mergeAttendees` opens a
      // `readwrite` transaction on the same IndexedDB object store the offline
      // verdict reads, and IndexedDB serialises `readwrite` transactions on a
      // store — so an unguarded merge really can put itself between a scan and
      // its answer, in front of a queue, while looking in review like two
      // ordinary `await`s. The lock is taken in the camera decode callback and
      // released in `dismissFlash`, which is where this is drained.
      if (isProcessingRef.current) {
        pendingReloadRef.current = true;
        return;
      }

      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(() => {
        reloadTimerRef.current = null;
        // Its own category, so a reload is attributable to the reason that asked
        // for it. `meta-gates.md`: no path collapses into a generic line.
        console.info("scanner:reload", { reason });
        // ── D-38-22, accepted rather than fixed ──────────────────────────────
        //
        // A reload while a search is active refreshes what is on screen and
        // **deliberately does not merge into the offline cache**: `fetchAttendance`
        // skips the merge when `search` is set, and the cache catches up on the
        // next unfiltered fetch.
        //
        // Turning this into a merge of a filtered list would feed `mergeAttendees`
        // a shrinking payload, which it refuses as a typed value — so the "fix"
        // produces a refusal notice at a door, not a fresher cache.
        fetchAttendance(searchQuery || undefined);
      }, RELOAD_COALESCE_MS);
    },
    [fetchAttendance, searchQuery]
  );

  /** Keep the one-way link current. Written in an effect, never during render. */
  useEffect(() => {
    requestReloadRef.current = requestReload;
  }, [requestReload]);

  /**
   * ── LIVE-04: the parachute, and it only opens in the foreground ────────────
   *
   * Three reasons, in order of weight.
   *
   * 1. On the device this is built for the timer **cannot** run at all: an iOS
   *    home-screen PWA is *suspended*, not throttled, so its timers stop. Code
   *    written for the hidden case is code written for a case that does not
   *    occur at this door.
   * 2. The resume path forces a full reload anyway, and a reload at the moment
   *    the eye arrives is strictly better than one that happened four minutes
   *    before it did.
   * 3. On Android/Chrome a background timer would burn battery and data
   *    refreshing a screen nobody is reading — on a phone that has to survive
   *    22:00 → 06:00.
   *
   * **`visibilitychange` goes on `document`, never on `window`.** The house
   * precedent is `setupSyncListeners` in `sync-manager.ts`, and the reason is
   * that before Safari 14 the event did not bubble — on `window` it would
   * silently never fire on the device that matters.
   *
   * **On the "two schedulers" rule.** `sync-manager.ts` states that it takes two
   * triggers and deliberately **no timer**, because a parallel trigger set is two
   * schedulers fighting over one queue. This timer is a third trigger on a
   * **different subject** — the attendee list, not the sync queue — so it is not
   * the contradiction it looks like. Said out loud, because the next reader will
   * arrive at that file's docblock and ask.
   */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        // Hidden: clear and do NOT re-arm. The freshness tick is cleared by its
        // own effect, through this flag — one listener on this event in the whole
        // file, not two racing on the same signal.
        setDocVisible(false);
        if (safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
        }
        return;
      }
      // Visible: the third of the three resume signals (see the listener block
      // above for why they are three and why they are treated as one). Rebuild
      // the channel, then a full reload now, then the parachute back up. The
      // reload is unconditional — it does not wait for the channel to come
      // back, and the age is then ~0, so the band correctly does not appear.
      //
      // The freshness tick restarts here too, and deliberately not by waiting
      // for the reload to succeed: if that reload fails, the age must keep
      // climbing on screen rather than freeze at whatever it read when the
      // screen went dark.
      setDocVisible(true);
      resubscribe();
      requestReloadRef.current?.("foreground");
      armSafetyTimer();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, [armSafetyTimer, resubscribe]);

  /**
   * The coalescing timeout, torn down — on unmount, and on every change of night.
   *
   * `S4` of this file's own patterns: every timer is cleared in the same cleanup
   * that armed it. Keying it on `selectedPartyId` rather than on nothing is the
   * per-night discipline the `doorAuth` effect above already states — a reload
   * armed for the night last opened would land on the night now open and repaint
   * its list with the previous one's.
   */
  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };
  }, [selectedPartyId]);

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

    // A camera that never starts used to fail into nothing: a blank box, no
    // sentence, and a member of staff at the door with no idea whether to wait
    // or to switch to the list. A denied permission and a camera already held by
    // another app are the two common causes, and both are recoverable — but only
    // by someone who has been told.
    initScanner().catch((error) => {
      console.error("scanner:camera_unavailable", error);
      setCameraFault(
        "The camera did not start. Check the camera permission for this site, close any other app using it, or check people in from the list below."
      );
    });

    return () => {
      scannerInstanceRef.current = null;
      videoTrackRef.current = null;
      setTorchOn(false);
      setTorchAvailable(false);
      setCameraFault(null);
      if (qrcode) {
        // Teardown only. A failure here has no consequence for a scan or a
        // record, so it is logged under its own category and not put on screen.
        qrcode.stop().catch((error) => {
          console.error("scanner:camera_stop_failed", error);
        });
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
    // The verdict is out, so the reload that waited for it may go. Drained
    // unconditionally and on purpose: this may cost one extra GET when the scan's
    // own reload was going to fire anyway, and that is the correct side to err
    // on — a duplicated fetch costs one request, a dropped one leaves a stale
    // list at a door, which is the whole subject of this phase.
    if (pendingReloadRef.current) {
      pendingReloadRef.current = false;
      requestReload("deferred");
    }
    // Resume scanner decoding
    const scanner = scannerInstanceRef.current as { resume: () => void } | null;
    if (scanner) {
      try { scanner.resume(); } catch { /* ignore if already running */ }
    }
  }, [requestReload]);

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

  /** Open, or close, the list of entries that could never be recorded. */
  const toggleFailedEntries = useCallback(async () => {
    if (failedEntries !== null) {
      setFailedEntries(null);
      return;
    }
    try {
      setFailedEntries(await getFailedCheckins());
    } catch (error) {
      console.error("scanner:failed_list_unavailable", error);
      setFailedEntries([]);
      setQueue((prev) => ({ ...prev, unreadable: true }));
    }
  }, [failedEntries]);

  /**
   * Put the held entries back in the queue and drain.
   *
   * A staff session expiring at 02:00 turns every queued entry into a 401.
   * Blocked entries are deliberately never retried (sync-manager.ts:128-131), so
   * without this they would wait for a timer that does not exist: this is the
   * one action that gets the night's queue moving again, and the chip is the
   * only place it is offered.
   */
  const handleRetryBlocked = useCallback(async () => {
    setBlockedResult("Retrying…");
    try {
      const counters = await retryBlockedAfterSignIn();
      await refreshQueueCounts();
      setBlockedResult(
        `Released ${counters.unblocked} · recorded ${counters.synced} · still waiting ${counters.retried} · could not be recorded ${counters.failed} · still held ${counters.blocked}`
      );
    } catch (error) {
      console.error("scanner:retry_blocked_failed", error);
      setBlockedResult("The retry could not run on this device — nothing changed");
    }
  }, [refreshQueueCounts]);

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

      // ── T-3. With the radio off, an undo is still a supervisory act ─────────
      //
      // What this branch used to be, so the change is legible: it performed a
      // purely local reversal, deleted the queue entry, wrote no record and
      // **asked nobody**. Its comment was right about why it must exist — *an
      // undo that silently does nothing is worse than one that refuses out
      // loud* — and wrong about what that licenses. A supervision rule that
      // lives only in `/api/tickets/checkin/undo` is a rule you step around by
      // turning the radio off. So the branch stays, and it decides **from the
      // verdict this device was given when the night was opened**.
      //
      // ── THE DOOR'S ASYMMETRY IS INVERTED HERE, DELIBERATELY ────────────────
      //
      // It is written out because it contradicts the general rule and somebody
      // will otherwise "correct" it. At the door, refusing a valid guest is
      // worse than admitting a duplicate, so an uncertain **scan** admits: the
      // false refusal happens in front of a queue. An **undo** is not an
      // admission. Refusing one sends nobody away — it leaves a person recorded
      // as having come in, which is the **recoverable** direction, correctable
      // by anybody with signal. Allowing an unauthorised one silently removes a
      // presence from the night's record, and `checkin-offline.md` calls the
      // undo *«il percorso piu' semplice per far rientrare qualcuno»*. So on the
      // third outcome — the question was never answered — this **refuses**.
      //
      // Three outcomes, and none of them is silent: there is no error tracking
      // in this repository, so the flash on this screen is the only observer
      // that exists (`meta-gates.md`).
      if (!navigator.onLine) {
        // 3 · The verdict was never resolved. Its own outcome, never folded into
        // the refusal above it, on the precedent of `DOOR_UNRESOLVED_STATUS`
        // (`require-operator.ts:185-192`): the sentence says nothing about
        // permission, because the point of this arm is that permission is
        // unknown. `null` is not `false`, and `readDoorAuth` returns a type that
        // keeps the two apart precisely so this branch has to exist.
        if (doorAuth === null) {
          console.warn("scanner:undo_verdict_unresolved", {
            partyId: selectedPartyId,
          });
          showFlash(
            "error",
            "This device has not been told who may undo tonight",
            "This is not a refusal of the account — the question was never answered. Get signal, reopen the night, then try again."
          );
          return;
        }

        // 2 · Answered, and the answer is no. Refused OUT LOUD, with the same
        // sentence the server sends on the online path, so the two paths cannot
        // drift into saying different things about one rule.
        if (!doorAuth.maySupervise) {
          console.warn("scanner:undo_refused_supervision", {
            partyId: selectedPartyId,
          });
          showFlash(
            "error",
            "This check-in was NOT undone",
            DOOR_SUPERVISION_REQUIRED_ERROR
          );
          return;
        }

        if (!record.localKey) {
          showFlash(
            "error",
            "This entry cannot be undone offline",
            "It was recorded on the server. Undo it once the signal is back."
          );
          return;
        }

        // 1 · Permitted. The reversal is **marked** on the queue entry rather
        // than deleting it: deleted, the night's record shows an evening in
        // which the admission never happened at all, and who reversed it and
        // when are gone with it.
        try {
          const result = await markUndoneLocally(
            record.localKey,
            deviceIdRef.current ?? THIS_DEVICE_LABEL
          );
          markRecordUndone(record);
          await refreshQueueCounts();

          // Two different facts, told apart rather than sharing one sentence.
          // `reversalHeld: false` means the admission is no longer in this
          // device's queue — it was already reported — so the record on the
          // server still says the person came in and nothing here will change
          // that. Saying "undone" flat would be the silent failure.
          showFlash(
            "error",
            "Undone on this device",
            result.reversalHeld
              ? `${record.name} — held here, not yet reported`
              : `${record.name} — the server already has the entry, undo it again with signal`
          );
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
        //
        // The body is parsed and then **kept**, not reduced to its `error`
        // string on the spot: `serverFaultMessage` needs the `status` field
        // beside it to tell a supervision `403` from a generic one, and reading
        // the category off a value rather than off prose is the rule (CR-01).
        let failureBody: unknown = null;
        try {
          failureBody = await res.json();
        } catch {
          failureBody = null;
        }
        const detail = readString(failureBody, "error");
        console.error("scanner:undo_failed", {
          status: res.status,
          category: readString(failureBody, "status"),
          detail,
        });
        showFlash(
          "error",
          "The check-in was NOT undone",
          detail ?? serverFaultMessage(res.status, failureBody)
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
      // The verdict is a dependency of the decision, not of the render: without
      // it this callback would close over the verdict of the night it was
      // created under, which for a device that switched nights is the wrong
      // night's answer to a per-night question.
      doorAuth,
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
    const message = serverFaultMessage(status, body);
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

      // The role travels with the entry from the moment the scan is taken, so
      // what reaches `attendances.entry_role` is what the roster said **at the
      // door** and not what the profile says hours later on sync. `member.role`
      // is `undefined` on a device whose roster predates the field: the
      // admission queues exactly the same, without a marker, and the door sees
      // no difference — this line changes what is recorded, never who gets in.
      const result = await checkInMemberLocally(
        partyId,
        membershipCode,
        member.role
      );
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
    // The age is a claim about **this** list, so it does not survive the list.
    // Without this, the first paint of the next night would carry the previous
    // night's timestamp — `setAttendance` runs several `await`s before the age is
    // recorded, so there is a real window in which the row would say how fresh a
    // list nobody is looking at any more happens to be.
    lastFetchAtRef.current = null;
    setSearchQuery("");
    setActiveFilter("not_arrived");
    setShowScanner(false);
    setFlash(null);
    setStatus("idle");
    setScanHistory([]);
    setCacheNotices([]);
    setFailedEntries(null);
    setBlockedResult(null);
    isProcessingRef.current = false;
    // The second release point of the scan lock, and the one that does **not**
    // drain. A reset is the operator abandoning the current scan and leaving the
    // night; the effect keyed on `selectedPartyId` fetches for whatever is
    // opened next, so draining here would be a second fetch for the same list.
    pendingReloadRef.current = false;
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

  // ── How old this list is, computed at paint time ────────────────────────────
  //
  // Read from the ref rather than from state so what appears is the age **now**,
  // not the age at the last tick — and derived rather than stored, so there is
  // exactly one expression in this file that can answer "how fresh is it".
  //
  // `null` means **not refreshed on this device for this night**, which is not
  // the same fact as "refreshed a long time ago": before the first successful
  // fetch nothing is rendered, because `updated 0s ago` would be a claim.
  //
  // The line this must not cross is already written on `lastFetchAtRef`: this
  // number is shown, and the only branch it may ever drive is whether the
  // staleness band appears. No verdict, no refusal and no admission reads it.
  const listAgeMs =
    lastFetchAtRef.current === null
      ? null
      : performance.now() - lastFetchAtRef.current;
  const listAgeLabel = listAgeMs === null ? null : formatListAge(listAgeMs);

  // ── D-38-09: when the list cannot be trusted. Derived, never stored ─────────
  //
  // Two ways to be stale, and the second is why `channelLive` exists at all:
  //
  // - **the channel is not live** — nothing will tell this device that the list
  //   changed, so it is as old as its last fetch and will stay that way;
  // - **the age is past `SAFETY_RELOAD_MS`** — five minutes is the threshold
  //   because it is the point at which the parachute has **itself** already
  //   failed. Before that, silence is accurate, and a screen that cried wolf
  //   every time a night was opened would be a screen nobody reads by 01:00.
  //
  // `listAgeMs !== null` is the third clause and it is deliberate: before the
  // first successful fetch of a night there is nothing to say about freshness,
  // and the failure that matters there already has a voice — the three early
  // returns of `fetchAttendance` each raise their own notice, and with the radio
  // off the Offline pill is already saying so.
  const listIsStale =
    listAgeMs !== null && (!channelLive || listAgeMs > SAFETY_RELOAD_MS);

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
                          <span className="text-sem-info">
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

  /**
   * ── `validUntil` decides WHAT IS DRAWN, and nothing else ────────────────────
   *
   * The night's declared end has passed, so the scanning tools collapse behind a
   * line that says so. Three properties of this, each deliberate:
   *
   *   1. **It deletes nothing.** Not one queued scan, not one cached attendee.
   *      A night that is over is a night whose entries still have to be
   *      reported, and an interface that tidied them away would be discarding
   *      presences at exactly the hour nobody is watching.
   *   2. **It is not a boundary.** The boundary is `now() < pa.ends_at` on the
   *      server's clock inside the SQL resolver. This is a phone's clock, and a
   *      phone's clock is evidence. That is why the line carries a way back: one
   *      tap restores the tools for the session. A device twenty minutes fast
   *      must not cost an admission — refusing a valid guest happens in front of
   *      a queue, and it is the worse of the two errors.
   *   3. **`null` hides nothing.** No declared end means no expiry is invented.
   *      `validUntil` is `null` for more than one reason (the night declares no
   *      `end_time`, the row is not visible to this reader, the read did not
   *      answer) and all of them mean the same thing here: keep working.
   */
  const nightEndsAtMs = doorAuth?.validUntil
    ? Date.parse(doorAuth.validUntil)
    : NaN;
  const nightIsOver =
    !Number.isNaN(nightEndsAtMs) && nowMs > nightEndsAtMs && !scanPastEnd;
  const nightEndedClock = doorAuth?.validUntil
    ? formatClock(doorAuth.validUntil)
    : null;

  /** A drift worth saying out loud. Shown, never acted on. */
  const driftMinutes =
    clockDriftMs !== null && Math.abs(clockDriftMs) >= CLOCK_DRIFT_WORTH_SAYING_MS
      ? Math.round(clockDriftMs / 60000)
      : null;

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
                  {/* Online/Offline status indicator — connectivity, and only
                      connectivity. The queue count used to live inside this
                      ternary and is now below, outside it.

                      What stood here was wrong, and is kept visible because it
                      was believed: that this pill's `yellow-500` was "precisely
                      why the third scan state is amber and not yellow — the two
                      must not read as one signal in a dark room". It asserted
                      the defect's absence instead of measuring it. Measured
                      2026-08-18 by scripts/verify-scan-legibility.mjs, amber sat
                      4.5 from this pill in deuteranopia against a threshold of
                      10; the third state is now the completion semantic
                      (ScanFlash.tsx) and the gate measures the pair every run.
                      Which tint each branch wears is not written here: it lives
                      in CONNECTIVITY_PILL, and the gate reads it there. */}
                  {isOnline ? (
                    <span className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${CONNECTIVITY_PILL.onlineWash}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${CONNECTIVITY_PILL.onlineDot}`} />
                      Online
                    </span>
                  ) : (
                    <span className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${CONNECTIVITY_PILL.offlineWash}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${CONNECTIVITY_PILL.offlineDot} animate-pulse`} />
                      Offline
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
          {/* Hidden once the night's declared end has passed — a courtesy of the
              interface, restored in one tap by the line below. See the paragraph
              on `nightIsOver`. */}
          {!nightIsOver && (
          <button
            onClick={() => setShowScanner((v) => !v)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              showScanner
                ? "bg-accent text-ground"
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
          )}
        </div>

        {/* The night is over, said once, with a way back that costs one tap. */}
        {nightIsOver && (
          <div className="mb-3 rounded-lg border border-sem-warn/30 bg-sem-warn/10 px-3 py-2">
            <p className="text-[11px] leading-snug text-sem-warn">
              This night is over
              {nightEndedClock ? ` — it ended at ${nightEndedClock}` : ""}.
              Nothing has been removed: anything still waiting to be reported is
              still here.
            </p>
            <button
              onClick={() => setScanPastEnd(true)}
              className="mt-1.5 rounded-full bg-sem-warn/20 px-2.5 py-1 text-[10px] font-medium text-sem-warn active:scale-95 transition-transform"
            >
              Scan anyway
            </button>
          </div>
        )}

        {/* The drift between this device's clock and the server's, shown because
            it explains an odd-looking end time — and never used to decide one. */}
        {driftMinutes !== null && (
          <div className="mb-3 rounded-lg border border-card-border bg-card px-3 py-2">
            <p className="text-[11px] leading-snug text-muted">
              This device&apos;s clock is {Math.abs(driftMinutes)} min{" "}
              {driftMinutes > 0 ? "behind" : "ahead of"} the server. Times shown
              on this screen come from this clock; nothing is refused because of
              it.
            </p>
          </div>
        )}

        {/*
          The queue, rendered OUTSIDE the Online/Offline ternary above.

          This is the whole of FIX-08's surface. The pending count used to be
          rendered only inside the offline branch of that pill — invisible while
          the device was online, which is exactly when a stuck queue matters and
          exactly when it can be drained. Classifying the queue without fixing
          this left the number meaning something that nobody could see, and with
          no error tracking anywhere in this project the person holding the phone
          is the only observer a failed sync has.
        */}
        {(queue.unreadable ||
          queue.pending > 0 ||
          queue.failed > 0 ||
          queue.blocked > 0 ||
          queue.undone > 0) && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {queue.pending > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-sem-warn/15 px-2 py-0.5 text-[10px] font-medium text-sem-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-sem-warn animate-pulse" />
                Pending ({queue.pending})
              </span>
            )}
            {queue.failed > 0 && (
              <button
                onClick={toggleFailedEntries}
                className="flex items-center gap-1 rounded-full bg-sem-crit/15 px-2 py-0.5 text-[10px] font-medium text-sem-crit active:scale-95 transition-transform"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-sem-crit" />
                Could not be recorded ({queue.failed})
              </button>
            )}
            {queue.blocked > 0 && (
              <button
                onClick={handleRetryBlocked}
                className="flex items-center gap-1 rounded-full bg-sem-warn/15 px-2 py-0.5 text-[10px] font-medium text-sem-warn active:scale-95 transition-transform"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-sem-warn animate-pulse" />
                Sign in again to record {queue.blocked}{" "}
                {queue.blocked === 1 ? "entry" : "entries"}
              </button>
            )}
            {/* Reversals taken with the radio off. They are held on this device
                and NOT drained — the drain would otherwise report the admission
                they reverse — so they are counted here, which is the only place
                anybody would see them. The sentence says what is true and does
                not promise a report that no endpoint accepts yet; see the
                cross-plan note in `35-13-SUMMARY.md`. */}
            {queue.undone > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-sem-warn/15 px-2 py-0.5 text-[10px] font-medium text-sem-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-sem-warn" />
                Undone at the door, held on this device ({queue.undone})
              </span>
            )}
            {queue.unreadable && (
              <span className="flex items-center gap-1 rounded-full bg-sem-crit/15 px-2 py-0.5 text-[10px] font-medium text-sem-crit">
                <span className="h-1.5 w-1.5 rounded-full bg-sem-crit" />
                This device cannot read its own queue
              </span>
            )}
          </div>
        )}

        {blockedResult && (
          <p className="mb-3 text-[10px] text-muted">{blockedResult}</p>
        )}

        {/* What the failed count actually counts. A number with no way to see
            behind it is a number nobody trusts. No email and no membership code
            is rendered here — see `failedEntryLabel`. */}
        {failedEntries !== null && (
          <div className="mb-3 rounded-xl border border-sem-crit/30 bg-sem-crit/5 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-sem-crit mb-2">
              Could not be recorded
            </p>
            {failedEntries.length === 0 ? (
              <p className="text-[11px] text-muted">
                Nothing to show — the list could not be read, or it is empty.
              </p>
            ) : (
              <ul className="space-y-1">
                {failedEntries.map((entry) => (
                  <li key={entry.key} className="text-[11px] text-muted">
                    <span className="text-foreground">
                      {failedEntryLabel(entry)}
                    </span>{" "}
                    — {failureSentence(entry.reason)}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] text-muted">
              These stay on this device. Sort them out from the attendee list, or
              in the night&apos;s review.
            </p>
          </div>
        )}

        {/*
          Progress bar for selected party — and, since D-38-10, the freshness
          display and the manual reload.

          It is a real `<button>`, not a click handler on a `<div>`. A `<div>` is
          not reachable by keyboard, is not announced as an action, and takes no
          focus ring — and the focus ring is what tells somebody in a dark room,
          holding the phone in one hand, that they hit the thing they aimed at.
          `w-full` and `py-2.5` are this file's own size for a one-handed target
          (the torch toggle below).

          Nothing was added to the busiest screen in the product: the row already
          existed and is where staff already look. What it gained is a number and
          a purpose.

          The `aria-label` ends by naming what tapping **does**, because the
          visible text says how old the list is and that is a different sentence.
          It repeats the counts first for one reason: an `aria-label` on a button
          **replaces** everything inside it for a screen reader, so a label that
          named only the action would make the one screen carrying the counts the
          one place a screen reader cannot read them.
        */}
        {attendance && (
          <button
            type="button"
            onClick={() => requestReload("manual")}
            aria-label={`Checked in ${totalCheckedIn} of ${totalAttendees}${
              listAgeLabel ? `, ${listAgeLabel}` : ""
            }. Reload the attendee list now.`}
            className="mb-3 w-full text-left rounded-lg px-2 py-2.5 transition-colors hover:bg-card-border/20 active:bg-card-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">
                Checked in
                {listAgeLabel && <span className="ml-2">· {listAgeLabel}</span>}
              </span>
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
          </button>
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
        {/*
          What the last refresh could not do — above the scanner, and NOT a
          toast.

          The person holding the phone may be looking at a queue rather than at
          the screen, so a message that disappears on its own is a message that
          was never delivered. Each line stays until a refresh succeeds and
          replaces the whole set. `mergeAttendees` refuses a payload that would
          shrink the cache and returns that refusal as a value
          (checkin-store.ts:429-438); this is where the value becomes something a
          human sees, which is the difference between FIX-06 being implemented
          and FIX-06 being done.
        */}
        {cameraFault && (
          <div
            className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-400"
            role="status"
            aria-live="polite"
          >
            {cameraFault}
          </div>
        )}

        {/*
          ── F2 / D-38-19: the band is DERIVED state, and it is not in the array ──

          It belongs to the family below — same container semantics, same two
          tone class sets, same "stays until it is no longer true" behaviour, and
          just as deliberately not a toast. It does **not** belong to that
          family's storage, and the distinction is the whole point.

          `setCacheNotices` replaces its array **wholesale** on every fetch,
          including on each of the three early-return failure branches of
          `fetchAttendance` (unreachable, non-ok, unparseable). A band pushed
          into that array would therefore be erased by a **failed** refresh —
          which is precisely the moment it is the only thing telling anyone that
          the list cannot be trusted. It would vanish exactly when it mattered,
          and would look correct in review.

          So: computed at render from `channelLive` and the age, rendered here as
          its own element, and `setCacheNotices` stays the single writer of its
          own array. If you are here to "simplify" this into the notices array,
          this paragraph is the reason not to.

          Two absences that are also decisions:

          - **Nothing at all while healthy.** Not an empty container, not a green
            tick. The door's screen is the busiest in the product and every
            element proposed for it has to justify itself against that; a badge
            that says "fine" 99% of the night is how the 1% stops being read.
          - **The band never names a permission** (D-38-04). It reports a
            transport fact and an age, and nothing else. See `stalenessBandText`
            for why the four causes behind that fact are not distinguishable
            from here — and why guessing between them would put a second verdict
            about the operator on a screen that already has one.
        */}
        {listIsStale && listAgeMs !== null && (
          <div className="mb-4" role="status" aria-live="polite">
            <button
              type="button"
              onClick={() => requestReload("band")}
              className={`w-full rounded-xl border px-3 py-2.5 text-left text-xs leading-relaxed transition-colors ${
                channelLive
                  ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-500 active:bg-yellow-500/20"
                  : "border-red-500/40 bg-red-500/10 text-red-400 active:bg-red-500/20"
              }`}
            >
              {stalenessBandText(channelLive, listAgeMs)}
            </button>
          </div>
        )}

        {cacheNotices.length > 0 && (
          <div className="mb-4 space-y-2" role="status" aria-live="polite">
            {cacheNotices.map((notice) => (
              <div
                key={notice.key}
                className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${
                  notice.tone === "error"
                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                    : "border-yellow-500/40 bg-yellow-500/10 text-yellow-500"
                }`}
              >
                {notice.text}
              </div>
            ))}
          </div>
        )}

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
              // The same third state as the flash: admitted-and-flagged, or
              // already recorded. Never the refusal, because neither is one.
              // Named by state and not by hue: the hue lives in one lookup, and
              // a comment that spells it goes stale the day the lookup moves.
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
                        className="h-4 w-4 text-sem-done"
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
                        className="h-4 w-4 text-red-600"
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
