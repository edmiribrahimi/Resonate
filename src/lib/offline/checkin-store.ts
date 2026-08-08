import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
  type StoreNames,
} from "idb";
import type { DoorNotValidReason, DoorSubjectType } from "@/lib/door/outcome";

/**
 * IndexedDB store for the door.
 *
 * This is the device's own memory of a night, and it is authoritative until it
 * has been reported. Four things are true here that were not true before:
 *
 * 1. **A scan queued offline carries the token it was read from.** The scanner
 *    used to split the signed string and keep only the id, so a synced entry
 *    was indistinguishable from a hand-typed identifier. The full signed string
 *    now travels with the entry and the route re-verifies it.
 * 2. **An entry that can never succeed is recorded as failed, not retried.**
 *    It moves to `failedCheckins` and stays visible. A discarded entry and a
 *    synced one look identical to a counter, and the counter is the only
 *    observer this project has — there is no error tracking.
 * 3. **A membership code queued at two parties produces two entries.** The
 *    record key is `partyId:subjectType:subjectId`, so a double bill — one
 *    event, two parties — no longer overwrites the first admission with the
 *    second.
 * 4. **A membership QR still carries no signature**, so its proof is weaker
 *    than a ticket's: a membership entry queues with `token: null` because
 *    there is nothing to carry, not because the code was discarded. Written
 *    down rather than papered over.
 *
 * A fifth, from version 4: **the upgrade callback is cumulative, and no step
 * may undo an earlier one.** Each version is its own `oldVersion <` block doing
 * only its own work, because the one-shot rebuild that served version 3 would
 * have destroyed the queue of any device hopping from 3 to 4 — rows for people
 * who paid, on a phone that is offline and cannot be audited.
 *
 * Two limits that remain, unchanged and deliberate:
 * - Tickets bought after the list was downloaded are not in the cache. Offline
 *   they are admitted and flagged, never refused — refusing a valid guest
 *   happens in front of a queue.
 * - Two phones scanning the same code while both are offline both show green.
 *   The duplicate is detected on sync and reported, never silently resolved.
 */

const DB_NAME = "resonate-checkin";
const DB_VERSION = 4;

/** The `meta` key under which this install's device id lives. */
const DEVICE_ID_KEY = "deviceId";

/**
 * The `meta` key marking that this device's roster was cached before members
 * carried a role.
 *
 * Set by the version-4 step and cleared by the first {@link cacheMembers} that
 * actually sees a role. It exists so a device that upgrades mid-season does not
 * spend the night queueing admissions with no marker while believing it knows:
 * the scanner reads it and refreshes the roster through the call it already
 * makes.
 */
const ROSTER_PREDATES_ROLE_KEY = "rosterPredatesRole";

/**
 * How many times a queued entry may be retried before it is recorded as failed.
 *
 * Named, because a retry loop with no ceiling is the defect this replaces: eight
 * attempts spans a whole night of `online` and `visibilitychange` events without
 * spinning forever, and the ninth is an admission that the entry is not going to
 * land on its own.
 */
export const MAX_SYNC_ATTEMPTS = 8;

/** Operator label written when the only thing this device knows is that it was this device. */
export const THIS_DEVICE_LABEL = "this device";

/** How a queued entry is drained — which endpoint it belongs to. */
export type QueuedSubjectType = "ticket" | "guest" | "membership";

/** Why a queued entry can never succeed. */
export type FailureReason = DoorNotValidReason | "unexpected_response";

/** A cached attendee, keyed by party **and** subject so a night is part of its identity. */
export interface AttendeeRecord {
  /** `${partyId}:${subjectType}:${subjectId}` — always built with {@link attendeeKey}. */
  key: string;
  partyId: string;
  subjectType: DoorSubjectType;
  subjectId: string;
  name: string;
  email?: string;
  tierName?: string;
  ticketType: "purchased" | "guest_list";
  checkedIn: boolean;
  checkedInAt?: string;
  /** Who recorded the entry, so the offline `already_recorded` can say so. */
  checkedInBy?: string;
  /** A refund known at download time, so it produces the same admit-and-flag locally. */
  refundedAt?: string;
  guestListEntryId?: string;
  /** ISO of the last refresh that saw this row. Only {@link pruneParty} reads it. */
  lastSeenAt: string;
}

/** A member of the roster, resolvable offline. A membership code is genuinely global. */
export interface MemberRecord {
  membershipCode: string;
  userId: string;
  fullName: string;
  /**
   * The role the roster carried at the moment this record was cached.
   *
   * **Optional, and `undefined` means "this device does not know" — never
   * "member".** A record cached by a release before the roster carried a role
   * has none, and inventing `member` there would turn an absence of knowledge
   * into a claim. It is the same distinction `attendances.entry_role` carries as
   * NULL on the other side of the wire (plan 43-10): `unknown`, not a default.
   *
   * Typed `string` and not `UserRole`: the roster arrives from `fetch` as JSON,
   * so nothing here can guarantee the closed set. The server validates it
   * against `ROLES` on sync, and an unrecognised label writes NULL **and admits**.
   */
  role?: string;
}

/** A scan that has happened and has not yet been reported. */
export interface PendingCheckin {
  key: string;
  type: QueuedSubjectType;
  subjectId: string;
  partyId: string;
  /** The full signed string exactly as scanned. `null` for a membership code or a guest entry, which have no signature. */
  token: string | null;
  /** Device clock at the read. Evidence, not authority. */
  scannedAt: string;
  deviceId: string;
  attempts: number;
  /**
   * `blocked` means the session expired: kept, not retried, surfaced with a
   * sign-in prompt. Classified as failed the night's queue is discarded;
   * classified as retryable it spins forever. Neither is acceptable.
   */
  state: "pending" | "blocked";
  lastAttemptAt?: string;
  /**
   * The role the roster held **at the door**, for a membership entry.
   *
   * Absent on every entry queued before this release, and absent whenever the
   * roster on this device did not carry a role. Absent is sent as absent — the
   * sync omits the field entirely rather than substituting a value, and the
   * route writes NULL and admits. A queued entry is never dropped for lacking it.
   */
  entryRole?: string;
}

/** A scan that can never succeed. Never deleted — a lost entry and a synced one are indistinguishable to a counter. */
export interface FailedCheckin extends Omit<PendingCheckin, "state"> {
  reason: FailureReason;
  failedAt: string;
}

interface MetaRecord {
  key: string;
  value: string;
}

interface CheckinDB extends DBSchema {
  attendees: {
    key: string;
    value: AttendeeRecord;
    indexes: {
      "by-party": string;
      /** Answers "in the cache, but for another night" locally, as `wrong_night` instead of red. */
      "by-subject": string;
    };
  };
  members: {
    key: string; // membership_code (e.g. RSN-XXXXXXXX)
    value: MemberRecord;
  };
  pendingCheckins: {
    key: string;
    value: PendingCheckin;
  };
  failedCheckins: {
    key: string;
    value: FailedCheckin;
  };
  meta: {
    key: string;
    value: MetaRecord;
  };
}

/** The version-2 shape, kept only so the upgrade can read it with types instead of `any`. */
interface LegacyAttendee {
  ticketId: string;
  partyId: string;
  name: string;
  email?: string;
  tierName?: string;
  ticketType: "purchased" | "guest_list";
  checkedIn: boolean;
  checkedInAt?: string;
  isGuestListEntry?: boolean;
  guestListEntryId?: string;
}

interface LegacyPending {
  id: string;
  type: QueuedSubjectType;
  checkedInAt: string;
  partyId: string;
}

interface CheckinDBv2 extends DBSchema {
  attendees: {
    key: string;
    value: LegacyAttendee;
    indexes: { "by-party": string };
  };
  members: { key: string; value: MemberRecord };
  pendingCheckins: { key: string; value: LegacyPending };
}

const QUEUE_TYPE_BY_SUBJECT: Record<DoorSubjectType, QueuedSubjectType> = {
  ticket: "ticket",
  guest_list_entry: "guest",
  membership: "membership",
};

const SUBJECT_BY_QUEUE_TYPE: Record<QueuedSubjectType, DoorSubjectType> = {
  ticket: "ticket",
  guest: "guest_list_entry",
  membership: "membership",
};

/**
 * The record key, in one place.
 *
 * The party is part of the identity because a membership code is not: the same
 * member at two parties of one event is two admissions, and keying on the code
 * alone made the second destroy the first.
 */
export function attendeeKey(
  partyId: string,
  subjectType: DoorSubjectType,
  subjectId: string
): string {
  return `${partyId}:${subjectType}:${subjectId}`;
}

/**
 * A UUID for this install.
 *
 * `crypto.randomUUID` is restricted to secure contexts; `crypto.getRandomValues`
 * is not. A staff phone reaching a preview build over plain http would otherwise
 * get no id at all, and `door_scan_events.device_id` is NOT NULL — the scan
 * would be unrecordable, which is the one outcome this store exists to prevent.
 */
function newDeviceId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Rebuild a version-2 attendee row under the composite key. Lossless: `partyId` was already there. */
function rekeyAttendee(v: LegacyAttendee, upgradedAt: string): AttendeeRecord {
  const subjectType: DoorSubjectType =
    v.isGuestListEntry === true ? "guest_list_entry" : "ticket";
  const subjectId = v.guestListEntryId ?? v.ticketId;
  return {
    key: attendeeKey(v.partyId, subjectType, subjectId),
    partyId: v.partyId,
    subjectType,
    subjectId,
    name: v.name,
    email: v.email,
    tierName: v.tierName,
    ticketType: v.ticketType === "guest_list" ? "guest_list" : "purchased",
    checkedIn: v.checkedIn,
    checkedInAt: v.checkedInAt,
    guestListEntryId: v.guestListEntryId,
    lastSeenAt: upgradedAt,
  };
}

/** Rebuild a version-2 queue entry under the composite key. `type` and `partyId` were already there. */
function rekeyPending(v: LegacyPending, deviceId: string): PendingCheckin {
  const subjectType = SUBJECT_BY_QUEUE_TYPE[v.type];
  return {
    key: attendeeKey(v.partyId, subjectType, v.id),
    type: v.type,
    subjectId: v.id,
    partyId: v.partyId,
    // An entry queued before this release genuinely has no token. Carrying that
    // fact honestly is the point — a fabricated token would fail verification
    // and turn a real admission into a forgery.
    token: null,
    scannedAt: v.checkedInAt,
    deviceId,
    attempts: 0,
    state: "pending",
  };
}

type UpgradeTx = IDBPTransaction<
  CheckinDB,
  StoreNames<CheckinDB>[],
  "versionchange"
>;

/** Read the version-2 stores through the upgrade transaction, typed as what they actually hold. */
function legacyStores(tx: UpgradeTx) {
  return tx as unknown as IDBPTransaction<
    CheckinDBv2,
    ("attendees" | "pendingCheckins")[],
    "versionchange"
  >;
}

let dbPromise: Promise<IDBPDatabase<CheckinDB>> | null = null;

function getDB(): Promise<IDBPDatabase<CheckinDB>> {
  // The promise is cached, not the resolved handle: two callers racing on the
  // first scan of the night would otherwise both open a connection.
  if (dbPromise) return dbPromise;

  dbPromise = openDB<CheckinDB>(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      // ── Why the shape of this callback changed ───────────────────────────
      // Until version 4 this callback was a single one-shot rebuild guarded by
      // an early return from "anything at or above 3", and a second version
      // could not be expressed inside it: every path through the body destroys
      // and re-creates the attendee and queue stores, so a v3 → v4 hop would
      // have run that destruction again — on a device holding queued
      // admissions for people who paid, offline right now and impossible to
      // audit. `checkin-offline.md`: an upgrade that strands a queued scan is
      // unacceptable.
      //
      // So the callback is now **cumulative steps**, each guarded by its own
      // `oldVersion` comparison and each doing only its own work. A device at
      // v2 runs both steps in order; a device at v3 runs only the second.

      if (oldVersion < 3) {
        // ── The route taken for the rekey, stated because a reader needs to know
        // the copy happened before the delete ───────────────────────────────
        // IndexedDB cannot change a store's `keyPath` in place, and it cannot
        // hold two stores under one name. So:
        //   1. READ every legacy row into memory — this is the copy;
        //   2. only then `deleteObjectStore` the legacy stores;
        //   3. re-create them under the SAME final names with `keyPath: "key"`;
        //   4. write the rekeyed rows back.
        // Never `deleteObjectStore` before the copy: those rows are attendance
        // records for people who paid, and some of them are on a device that is
        // offline right now and cannot be audited. If any step throws, the whole
        // `versionchange` transaction aborts and rolls back as a unit (W3C
        // IndexedDB: an aborted transaction undoes every change it made), so the
        // version-2 stores survive intact.
        //
        // Only `idb` promises are awaited in here — `getAll`, `get`, `put`. One
        // await on anything else would let the transaction close mid-migration,
        // and there is no test runner in this repository that could catch it.

        const legacy = legacyStores(tx);
        const upgradedAt = new Date().toISOString();

        // ── 1. Copy: read everything out, before any store is destroyed ────
        const hadMeta = db.objectStoreNames.contains("meta");
        const hadAttendees = db.objectStoreNames.contains("attendees");
        const hadPending = db.objectStoreNames.contains("pendingCheckins");

        const legacyAttendees: LegacyAttendee[] = hadAttendees
          ? await legacy.objectStore("attendees").getAll()
          : [];
        const legacyPending: LegacyPending[] = hadPending
          ? await legacy.objectStore("pendingCheckins").getAll()
          : [];
        const carriedDeviceId = hadMeta
          ? (await tx.objectStore("meta").get(DEVICE_ID_KEY))?.value
          : undefined;

        // ── 2. Delete, strictly after the copy above ───────────────────────
        if (hadAttendees) db.deleteObjectStore("attendees");
        if (hadPending) db.deleteObjectStore("pendingCheckins");

        // ── 3. Re-create under the final names, with the composite key ─────
        const attendees = db.createObjectStore("attendees", { keyPath: "key" });
        attendees.createIndex("by-party", "partyId");
        attendees.createIndex("by-subject", "subjectId");
        db.createObjectStore("pendingCheckins", { keyPath: "key" });
        if (!db.objectStoreNames.contains("failedCheckins")) {
          db.createObjectStore("failedCheckins", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("members")) {
          db.createObjectStore("members", { keyPath: "membershipCode" });
        }
        if (!hadMeta) {
          db.createObjectStore("meta", { keyPath: "key" });
        }

        // ── 4. Write the rekeyed rows back ─────────────────────────────────
        const deviceId = carriedDeviceId ?? newDeviceId();
        await tx
          .objectStore("meta")
          .put({ key: DEVICE_ID_KEY, value: deviceId });

        const attendeeStore = tx.objectStore("attendees");
        for (const row of legacyAttendees) {
          await attendeeStore.put(rekeyAttendee(row, upgradedAt));
        }

        const pendingStore = tx.objectStore("pendingCheckins");
        for (const entry of legacyPending) {
          await pendingStore.put(rekeyPending(entry, deviceId));
        }
      }

      if (oldVersion < 4) {
        // ── Version 4: a step that migrates nothing, on purpose ────────────
        // A reader will expect a migration to migrate, so here is what this
        // one does **not** do: it creates no object store, it destroys none,
        // and it rewrites no row. Nothing is stranded because nothing is
        // touched — which is the whole property this step was written to have.
        //
        // It can afford that because `role` is an **optional** field on records
        // in a store that already exists, and IndexedDB holds records without a
        // schema: an existing member row without a role is a valid member row,
        // and one written after this release simply carries a field more. No
        // structural change is required and none is made.
        //
        // The version number is still bumped, deliberately (D-17): it is the
        // only versioned marker that the roster's shape changed, and it is what
        // gives the flag below a moment to be written exactly once per device.
        //
        // The rule from the step above holds here too and is repeated rather
        // than assumed: **only `idb` promises are awaited inside this
        // callback**. One await on anything else would let the `versionchange`
        // transaction close mid-migration, and there is no test runner in this
        // repository that could catch it.
        //
        // On a database created from nothing this flag is also written, and it
        // is not wrong: an empty roster carries no role either, so the sentence
        // "no member cached on this device carries a role" is true in both
        // cases, and the consequence is identical — one roster refresh that was
        // going to happen anyway.
        await tx.objectStore("meta").put({
          key: ROSTER_PREDATES_ROLE_KEY,
          value: "true",
        });
      }
    },
  });

  return dbPromise;
}

/**
 * This install's device id, stable across reloads.
 *
 * `door_scan_events.device_id` is NOT NULL and the `two_devices` classification
 * is impossible without it. A second browser profile is a second install and
 * does not reproduce the same id — the door runbook already says so.
 */
export async function getDeviceId(): Promise<string> {
  const db = await getDB();
  // One read-write transaction, so two tabs opening at once cannot each
  // generate an id and disagree: IndexedDB serialises overlapping scopes.
  const tx = db.transaction("meta", "readwrite");
  const existing = await tx.store.get(DEVICE_ID_KEY);
  if (existing?.value) {
    await tx.done;
    return existing.value;
  }
  const generated = newDeviceId();
  await tx.store.put({ key: DEVICE_ID_KEY, value: generated });
  await tx.done;
  return generated;
}

/**
 * A row of the attendance payload.
 *
 * `subjectType` / `subjectId` are optional because the payload gains them in
 * plan 31-06; until then they are derived from the legacy `isGuestList` +
 * `ticketId` / `guestListEntryId` pair, which carries the same information.
 */
export interface AttendeeRow {
  subjectType?: DoorSubjectType;
  subjectId?: string | null;
  ticketId?: string | null;
  guestListEntryId?: string | null;
  name: string;
  email?: string;
  tierName?: string | null;
  ticketType?: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
  checkedInBy?: string | null;
  refundedAt?: string | null;
  isGuestList?: boolean;
}

/** Why a refresh declined to apply a payload. */
export type MergeRefusalReason = "empty_payload" | "payload_smaller_than_cache";

/**
 * The result of a refresh — a **value**, not an exception and not a log line.
 *
 * There is no error tracking in this project, so the person holding the phone is
 * the only observer there is. A refusal that nothing renders is a refusal nobody
 * knows about.
 */
export type MergeResult =
  | { applied: true; merged: number }
  | {
      applied: false;
      reason: MergeRefusalReason;
      /** How many rows the device already held for this party. */
      cached: number;
      /** How many the payload offered. */
      received: number;
    };

function resolveSubject(
  row: AttendeeRow
): { type: DoorSubjectType; id: string } | null {
  if (row.subjectType && row.subjectId) {
    return { type: row.subjectType, id: row.subjectId };
  }
  if (row.isGuestList === true || (!row.ticketId && row.guestListEntryId)) {
    return row.guestListEntryId
      ? { type: "guest_list_entry", id: row.guestListEntryId }
      : null;
  }
  return row.ticketId ? { type: "ticket", id: row.ticketId } : null;
}

/**
 * Apply a server payload to the cache by merging — never by clearing.
 *
 * A refresh may add what the server knows. It may never remove what the device
 * knows and has not yet reported: a member checked in offline sits in the queue
 * with `checkedIn: true` that the server has not heard about, and writing the
 * server's `false` over it puts a person who is standing inside back on the
 * *Not arrived* list. That is the same family as the monotone guards in
 * `meta-gates.md`.
 *
 * Rows absent from the payload are left alone. Pruning is {@link pruneParty}, a
 * deliberate call, never a side effect of a refresh.
 */
export async function mergeAttendees(
  partyId: string,
  rows: AttendeeRow[]
): Promise<MergeResult> {
  const db = await getDB();
  const cached = await db.countFromIndex("attendees", "by-party", partyId);
  // Everything unreported, blocked entries included: a blocked entry is local
  // knowledge the server has not heard either.
  const unreported = await db.count("pendingCheckins");

  // The plausibility guard. A payload can be a day old with `navigator.onLine`
  // true — the service worker answers `/api/*` from cache after its network
  // timeout — and at the door "not in the list" and "not on the list" are
  // indistinguishable. A shrunken cache is a false refusal waiting to happen.
  if (rows.length === 0 && cached > 0) {
    return { applied: false, reason: "empty_payload", cached, received: 0 };
  }
  if (unreported > 0 && rows.length < cached) {
    return {
      applied: false,
      reason: "payload_smaller_than_cache",
      cached,
      received: rows.length,
    };
  }

  const now = new Date().toISOString();
  const tx = db.transaction(["attendees", "pendingCheckins"], "readwrite");
  const attendees = tx.objectStore("attendees");
  const pending = tx.objectStore("pendingCheckins");
  let merged = 0;

  for (const row of rows) {
    const subject = resolveSubject(row);
    if (!subject) continue;

    const key = attendeeKey(partyId, subject.type, subject.id);
    const local = await attendees.get(key);
    const hasUnreportedEntry = (await pending.get(key)) !== undefined;

    // The monotone rule: local-true with a matching queue entry wins over a
    // server "not arrived". Anything else and the refresh subtracts an
    // admission that has not yet been reported.
    const localWins =
      local && local.checkedIn === true && hasUnreportedEntry ? local : null;

    await attendees.put({
      ...local,
      key,
      partyId,
      subjectType: subject.type,
      subjectId: subject.id,
      name: row.name,
      email: row.email ?? local?.email,
      tierName: row.tierName ?? local?.tierName,
      ticketType: row.ticketType === "guest_list" ? "guest_list" : "purchased",
      guestListEntryId: row.guestListEntryId ?? local?.guestListEntryId,
      checkedIn: localWins ? true : row.checkedIn,
      checkedInAt: localWins
        ? localWins.checkedInAt
        : (row.checkedInAt ?? undefined),
      checkedInBy: localWins
        ? (localWins.checkedInBy ?? THIS_DEVICE_LABEL)
        : (row.checkedInBy ?? undefined),
      refundedAt: row.refundedAt ?? undefined,
      lastSeenAt: now,
    });
    merged++;
  }

  await tx.done;
  return { applied: true, merged };
}

/**
 * Drop cached rows for a party that no refresh has seen since `olderThanIso`.
 *
 * A row with an unreported queue entry is never dropped, whatever its age.
 * Both timestamps are UTC ISO strings produced by `toISOString()`, so the
 * lexicographic comparison is a chronological one.
 */
export async function pruneParty(
  partyId: string,
  olderThanIso: string
): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(["attendees", "pendingCheckins"], "readwrite");
  const attendees = tx.objectStore("attendees");
  const pending = tx.objectStore("pendingCheckins");
  const rows = await attendees.index("by-party").getAll(partyId);
  let pruned = 0;

  for (const row of rows) {
    if (row.lastSeenAt >= olderThanIso) continue;
    if ((await pending.get(row.key)) !== undefined) continue;
    await attendees.delete(row.key);
    pruned++;
  }

  await tx.done;
  return pruned;
}

/** Look up one cached attendee, by party and subject. */
export async function findAttendee(
  partyId: string,
  subjectType: DoorSubjectType,
  subjectId: string
): Promise<AttendeeRecord | undefined> {
  const db = await getDB();
  return db.get("attendees", attendeeKey(partyId, subjectType, subjectId));
}

/**
 * Every cached row for a subject, across parties.
 *
 * This is what separates *not in the cache at all* from *in the cache under
 * another night* — opposite outcomes. The first admits and flags; the second is
 * `wrong_night`.
 */
export async function findBySubject(
  subjectId: string
): Promise<AttendeeRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("attendees", "by-subject", subjectId);
}

/** What the door learned from a local check-in. */
export interface LocalCheckinResult {
  key: string;
  attendee: AttendeeRecord;
  /** `false` when the code was not in the downloaded list — admitted and flagged, never refused. */
  wasCached: boolean;
  /** `true` when this device had already recorded this subject at this party. */
  alreadyRecorded: boolean;
  /** ISO of the **first** local record, not of this read. */
  at: string;
}

/**
 * Record an admission on this device and queue it for reporting.
 *
 * `token` is the full signed string exactly as scanned — the caller does not
 * split it. It is `null` only where there is genuinely no signature to carry.
 */
export async function checkInLocally(
  partyId: string,
  subjectType: DoorSubjectType,
  subjectId: string,
  opts: { token: string | null; name?: string }
): Promise<LocalCheckinResult> {
  const db = await getDB();
  // Resolved before the transaction opens: `getDeviceId` runs its own, and
  // awaiting it inside this one would close this one.
  const deviceId = await getDeviceId();

  const key = attendeeKey(partyId, subjectType, subjectId);
  const now = new Date().toISOString();

  const tx = db.transaction(["attendees", "pendingCheckins"], "readwrite");
  const attendees = tx.objectStore("attendees");
  const pending = tx.objectStore("pendingCheckins");

  const local = await attendees.get(key);
  const queued = await pending.get(key);

  const wasCached = local !== undefined;
  const alreadyRecorded = local?.checkedIn === true || queued !== undefined;
  const at = queued?.scannedAt ?? local?.checkedInAt ?? now;

  const record: AttendeeRecord = {
    ...local,
    key,
    partyId,
    subjectType,
    subjectId,
    name: local?.name ?? opts.name ?? "Unknown",
    ticketType:
      local?.ticketType ??
      (subjectType === "guest_list_entry" ? "guest_list" : "purchased"),
    checkedIn: true,
    checkedInAt: at,
    checkedInBy: local?.checkedInBy ?? THIS_DEVICE_LABEL,
    guestListEntryId:
      local?.guestListEntryId ??
      (subjectType === "guest_list_entry" ? subjectId : undefined),
    lastSeenAt: now,
  };
  await attendees.put(record);

  // The first queued entry is the one that gets reported. A second read of the
  // same subject at the same party must not overwrite it: that would move
  // `scannedAt` forward and erase when the person actually came in.
  if (!queued) {
    await pending.put({
      key,
      type: QUEUE_TYPE_BY_SUBJECT[subjectType],
      subjectId,
      partyId,
      token: opts.token,
      scannedAt: now,
      deviceId,
      attempts: 0,
      state: "pending",
    });
  }

  await tx.done;
  return { key, attendee: record, wasCached, alreadyRecorded, at };
}

/** What the door learned from a local membership check-in. */
export interface LocalMemberCheckinResult {
  key: string;
  alreadyRecorded: boolean;
  at: string;
}

/**
 * Queue a membership admission.
 *
 * The composite key is the change that makes the same member at two parties on
 * one device produce two entries instead of one overwriting the other.
 * `token` is `null` because a membership QR is a plain URL — there is no
 * signature to carry, and that is a weaker proof than a ticket's.
 *
 * `entryRole` is what the roster on this device said **at the moment of the
 * scan**, and it is optional in the strong sense: a device whose roster has no
 * role queues the admission all the same, with the field absent. It is a label,
 * never a permission — nothing here reads it to decide anything, and the door's
 * verdict is taken before it is written.
 *
 * When an entry for this key is already queued, the existing one is kept whole,
 * role included: the marker belongs to the first admission, the one that took a
 * place. It is the same rule the route applies on its duplicate branch.
 */
export async function checkInMemberLocally(
  partyId: string,
  membershipCode: string,
  entryRole?: string
): Promise<LocalMemberCheckinResult> {
  const db = await getDB();
  const deviceId = await getDeviceId();

  const key = attendeeKey(partyId, "membership", membershipCode);
  const now = new Date().toISOString();

  const tx = db.transaction("pendingCheckins", "readwrite");
  const queued = await tx.store.get(key);
  if (!queued) {
    await tx.store.put({
      key,
      type: "membership",
      subjectId: membershipCode,
      partyId,
      token: null,
      scannedAt: now,
      deviceId,
      attempts: 0,
      state: "pending",
      // Absent stays absent. A placeholder would be a value the report cannot
      // tell apart from a real one.
      ...(entryRole ? { entryRole } : {}),
    });
  }
  await tx.done;

  return {
    key,
    alreadyRecorded: queued !== undefined,
    at: queued?.scannedAt ?? now,
  };
}

/**
 * Mark a cached attendee as checked in **without** queueing anything.
 *
 * For the online path, where the server has already recorded the entry.
 */
export async function markCheckedInLocally(
  partyId: string,
  subjectType: DoorSubjectType,
  subjectId: string,
  opts?: { at?: string; by?: string }
): Promise<void> {
  const db = await getDB();
  const key = attendeeKey(partyId, subjectType, subjectId);
  const attendee = await db.get("attendees", key);
  if (!attendee) return;
  attendee.checkedIn = true;
  attendee.checkedInAt = opts?.at ?? new Date().toISOString();
  attendee.checkedInBy = opts?.by ?? attendee.checkedInBy;
  await db.put("attendees", attendee);
}

/** Revert a local admission and drop its queue entry. */
export async function undoCheckInLocally(key: string): Promise<void> {
  const db = await getDB();
  const attendee = await db.get("attendees", key);
  if (attendee) {
    attendee.checkedIn = false;
    attendee.checkedInAt = undefined;
    attendee.checkedInBy = undefined;
    await db.put("attendees", attendee);
  }
  // Second, deliberately: if this throws, the entry still syncs and the server
  // records the admission — the recoverable failure, not the silent one.
  await db.delete("pendingCheckins", key);
}

/** Queue entries eligible for a drain attempt. Blocked entries are excluded — they wait for a sign-in. */
export async function getPendingCheckins(): Promise<PendingCheckin[]> {
  const db = await getDB();
  const all = await db.getAll("pendingCheckins");
  return all.filter((e) => e.state === "pending");
}

/** Queue entries held back by an expired session. */
export async function getBlockedCheckins(): Promise<PendingCheckin[]> {
  const db = await getDB();
  const all = await db.getAll("pendingCheckins");
  return all.filter((e) => e.state === "blocked");
}

/** How many scans are waiting to be reported. */
export async function getPendingCount(): Promise<number> {
  return (await getPendingCheckins()).length;
}

/** How many scans are waiting for a sign-in. */
export async function getBlockedCount(): Promise<number> {
  return (await getBlockedCheckins()).length;
}

/** Scans that could not be recorded. Kept, and countable. */
export async function getFailedCheckins(): Promise<FailedCheckin[]> {
  const db = await getDB();
  return db.getAll("failedCheckins");
}

/** How many scans could not be recorded. */
export async function getFailedCount(): Promise<number> {
  const db = await getDB();
  return db.count("failedCheckins");
}

/**
 * Drop a queue entry after the server has confirmed the outcome was persisted.
 *
 * The only path that removes an entry without keeping a record of it, and the
 * caller must have confirmation — not merely a response.
 */
export async function markSynced(key: string): Promise<void> {
  const db = await getDB();
  await db.delete("pendingCheckins", key);
}

function toFailed(
  entry: PendingCheckin,
  reason: FailureReason,
  failedAt: string,
  attempts: number = entry.attempts
): FailedCheckin {
  return {
    key: entry.key,
    type: entry.type,
    subjectId: entry.subjectId,
    partyId: entry.partyId,
    token: entry.token,
    scannedAt: entry.scannedAt,
    deviceId: entry.deviceId,
    attempts,
    lastAttemptAt: entry.lastAttemptAt,
    reason,
    failedAt,
  };
}

/**
 * Move an entry that can never succeed out of the queue and into the failed
 * list. It is moved, never deleted: a discarded entry and a synced one look
 * identical to a counter.
 *
 * Returns `false` when there was no such entry, so a caller can tell "recorded
 * as failed" from "nothing there" instead of assuming.
 */
export async function markFailed(
  key: string,
  reason: FailureReason
): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction(["pendingCheckins", "failedCheckins"], "readwrite");
  const pending = tx.objectStore("pendingCheckins");
  const entry = await pending.get(key);
  if (!entry) {
    await tx.done;
    return false;
  }
  const failedAt = new Date().toISOString();
  await tx.objectStore("failedCheckins").put(toFailed(entry, reason, failedAt));
  await pending.delete(key);
  await tx.done;
  return true;
}

/**
 * Hold an entry back because the session expired.
 *
 * The entry stays in the queue and stops being retried. A staff session
 * expiring at 02:00 turns every queued entry into a 401: recorded as failed the
 * night's queue is discarded, retried it spins forever. Blocked is the third
 * answer — kept, not retried, and surfaced with a sign-in prompt.
 */
export async function markBlocked(key: string): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction("pendingCheckins", "readwrite");
  const entry = await tx.store.get(key);
  if (!entry) {
    await tx.done;
    return false;
  }
  await tx.store.put({ ...entry, state: "blocked" });
  await tx.done;
  return true;
}

/** Return every blocked entry to the queue, after a successful sign-in. */
export async function unblockAll(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction("pendingCheckins", "readwrite");
  const all = await tx.store.getAll();
  let unblocked = 0;
  for (const entry of all) {
    if (entry.state !== "blocked") continue;
    await tx.store.put({ ...entry, state: "pending" });
    unblocked++;
  }
  await tx.done;
  return unblocked;
}

/** What became of an entry after a failed attempt. */
export type BumpResult =
  | { state: "pending"; attempts: number }
  | { state: "failed"; attempts: number; reason: FailureReason }
  | { state: "missing" };

/**
 * Count one failed attempt against an entry, and record it as failed once the
 * cap is passed. The cap is {@link MAX_SYNC_ATTEMPTS} — a decision, not a magic
 * number.
 */
export async function bumpAttempts(key: string): Promise<BumpResult> {
  const db = await getDB();
  const tx = db.transaction(["pendingCheckins", "failedCheckins"], "readwrite");
  const pending = tx.objectStore("pendingCheckins");
  const entry = await pending.get(key);
  if (!entry) {
    await tx.done;
    return { state: "missing" };
  }

  const attempts = entry.attempts + 1;
  const at = new Date().toISOString();

  if (attempts > MAX_SYNC_ATTEMPTS) {
    await tx
      .objectStore("failedCheckins")
      .put(toFailed(entry, "unexpected_response", at, attempts));
    await pending.delete(key);
    await tx.done;
    return { state: "failed", attempts, reason: "unexpected_response" };
  }

  await pending.put({ ...entry, attempts, lastAttemptAt: at });
  await tx.done;
  return { state: "pending", attempts };
}

/**
 * Merge the member roster.
 *
 * It does not clear: the roster is the device's only way to resolve a
 * membership code offline, and emptying it during a refresh is the same defect
 * as emptying the attendee cache, in a different store. That property is
 * unchanged here, and this plan did not weaken it.
 *
 * **The parameter type is load-bearing.** This function writes the record field
 * by field, so a field the type does not name is a field that is silently
 * dropped — and because the roster arrives from `fetch` as JSON, TypeScript
 * raises nothing when that happens. Before this plan `role` was exactly that:
 * present in the payload since plan 43-10, discarded here without a trace, and
 * a green build said nothing. Anything added to the roster payload from now on
 * has to be added in **both** places or it does not reach the device.
 */
export async function cacheMembers(
  members: Array<{
    id: string;
    full_name: string;
    membership_code: string;
    /** Optional on the wire: an older deployment does not send it. */
    role?: string;
  }>
): Promise<number> {
  const db = await getDB();
  // `meta` joins the scope so the flag below is cleared in the same transaction
  // that made it false. Two transactions could leave the roster refreshed and
  // the flag still set, which would cost one extra refresh — harmless, but the
  // single transaction costs nothing and cannot disagree with itself.
  const tx = db.transaction(["members", "meta"], "readwrite");
  const store = tx.objectStore("members");
  let merged = 0;
  let sawRole = false;
  for (const m of members) {
    const role = typeof m.role === "string" && m.role.length > 0 ? m.role : undefined;
    if (role) sawRole = true;
    await store.put({
      membershipCode: m.membership_code,
      userId: m.id,
      fullName: m.full_name,
      // Written only when the payload carried one. An absent role is left
      // absent rather than stored as an empty string: `undefined` here means
      // "this device does not know", and "" would be a value that looks like an
      // answer.
      ...(role ? { role } : {}),
    });
    merged++;
  }
  // Cleared only when a role was actually seen. A roster served by a deployment
  // that predates plan 43-10 carries none, and clearing the flag on it would
  // declare the device up to date on the strength of a refresh that changed
  // nothing.
  if (sawRole) {
    await tx.objectStore("meta").delete(ROSTER_PREDATES_ROLE_KEY);
  }
  await tx.done;
  return merged;
}

/**
 * Whether this device's roster was cached before members carried a role.
 *
 * Read by the scanner on open. `true` is not a reason to refuse anybody and is
 * never rendered as one: it only means the next roster refresh matters more
 * than usual, because until it happens every membership admission queues with
 * no marker.
 *
 * A device that cannot answer the question is treated as **not** predating —
 * the caller then behaves exactly as it did before this plan, which is the
 * conservative direction here: the roster refresh it already performs still
 * runs.
 */
export async function rosterPredatesRole(): Promise<boolean> {
  const db = await getDB();
  const flag = await db.get("meta", ROSTER_PREDATES_ROLE_KEY);
  return flag?.value === "true";
}

/** Look up a member by membership code in the offline roster. */
export async function findMember(
  membershipCode: string
): Promise<MemberRecord | undefined> {
  const db = await getDB();
  return db.get("members", membershipCode);
}
