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
 * 3. **The same subject queued at two parties produces two entries.** The
 *    record key is `partyId:subjectType:subjectId`, so a double bill — one
 *    event, two parties — no longer overwrites the first admission with the
 *    second.
 * 4. **A queued entry carries whatever proof it was read with, and no more.**
 *    `token` is the signed string for a ticket and `null` where there is no
 *    signature to carry — written down rather than papered over, because the
 *    route re-verifies what it is given and cannot invent what it is not.
 *
 * A fifth, from version 4: **the upgrade callback is cumulative, and no step
 * may undo an earlier one.** Each version is its own `oldVersion <` block doing
 * only its own work, because the one-shot rebuild that served version 3 would
 * have destroyed the queue of any device hopping from 3 to 4 — rows for people
 * who paid, on a phone that is offline and cannot be audited.
 *
 * A sixth, from version 5: **this store now remembers a verdict, and a reversal.**
 * The door verdict for a night is resolved ONCE, when the night is opened, and
 * read back from `meta` afterwards — never asked again per scan, which would be
 * a round trip per person in front of a queue. And an admission reversed with
 * the radio off is no longer deleted from the queue: it is marked, so who
 * reversed it and when survive on the device. Both are read the same way: a
 * verdict that is not there is `null`, meaning *not resolved*, and never
 * *refused*.
 *
 * A seventh, from version 6: **the door has two kinds of subject, not three.**
 * The member card left the product (MEM-03), so the queue lost its third type,
 * the roster store went with it, and the version-6 step is the only step of this
 * store that opens the queue — to drop, by key, the entries of that kind a phone
 * may still be carrying. It is a break of the property version 5 states, and it
 * is written there as a break, not left to be discovered.
 *
 * Two limits that remain, unchanged and deliberate:
 * - Tickets bought after the list was downloaded are not in the cache. Offline
 *   they are admitted and flagged, never refused — refusing a valid guest
 *   happens in front of a queue.
 * - Two phones scanning the same code while both are offline both show green.
 *   The duplicate is detected on sync and reported, never silently resolved.
 */

const DB_NAME = "resonate-checkin";
const DB_VERSION = 6;

/** The `meta` key under which this install's device id lives. */
const DEVICE_ID_KEY = "deviceId";

/**
 * The `meta` key the version-4 step writes — **historical, and read by nobody.**
 *
 * It marked that this device's roster had been cached before members carried a
 * role, and the scanner used it to force one extra roster refresh. There is no
 * roster any more (MEM-03), so the reader is gone and the key means nothing.
 *
 * The constant survives for one reason and it is not nostalgia: **the version-4
 * step still writes it, and a step already shipped is never rewritten.** The
 * callback is cumulative — a device sitting at v3 tonight still runs v4 on its
 * way to v6 — so editing that step to inline a string would be a retroactive
 * change to a migration other devices have already performed. What the v6 step
 * does instead is delete the key it leaves behind: cumulative, in order, each
 * step doing only its own work.
 */
const ROSTER_PREDATES_ROLE_KEY = "rosterPredatesRole";

/**
 * The `meta` key prefix under which a resolved door verdict lives, **one key per
 * night**.
 *
 * Per party and not one shared key, because two nights are two verdicts: an
 * assignment is granted for a night (`party_assignments`), so somebody who may
 * supervise night A may not supervise night B. A single key would let the
 * verdict of the night last opened decide the night currently open, which is the
 * same class of defect `bindNightToSubject` closes on the server side
 * (`undo/route.ts:148`) — an authorisation for one night acting on another.
 */
const DOOR_AUTH_KEY_PREFIX = "doorAuth:";

function doorAuthKey(partyId: string): string {
  return `${DOOR_AUTH_KEY_PREFIX}${partyId}`;
}

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

/**
 * How a queued entry is drained — which endpoint it belongs to.
 *
 * Two members since version 6. `"membership"` was the third, and it left with
 * the endpoint it drained to (MEM-03): nobody holds a card, so no scan can
 * produce one. Narrowing the union is what makes the removal checkable —
 * `sync-manager.ts` drains through a `switch` on this type, so a branch left
 * behind is a build error rather than a case nobody reads.
 *
 * Entries of the old third type can still be **on a device**, queued before the
 * upgrade. The version-6 step below is what deals with them, by key.
 */
export type QueuedSubjectType = "ticket" | "guest";

/** Why a queued entry can never succeed. */
export type FailureReason = DoorNotValidReason | "unexpected_response";

/**
 * The door verdict for ONE night, as the server resolved it, cached on the
 * device.
 *
 * The four fields are the payload of `doorAuth` on `/api/tickets/attendance`
 * (`attendance/route.ts:118-127`), carried across unchanged: this store keeps
 * what the server said, it does not derive a second opinion from it.
 *
 * **`validUntil` is a courtesy of the interface, never a boundary**, and the
 * sentence is repeated here rather than assumed to have been read in
 * `require-operator.ts:153-166`: the boundary is the server's own clock inside
 * the SQL resolver. This device may use `validUntil` to decide **what it draws**
 * and nothing else. `null` means the server declared no end — no expiry is
 * invented from it.
 *
 * `resolvedAt` is the **server's** clock at resolution, and it is here so the
 * device can measure the drift of its own clock instead of trusting it. Same
 * lexicon as `scannedAt` below: a device clock is evidence, never authority.
 * *(The route this line used to cite as the other half of that lexicon leaves
 * the product in this phase — MEM-03 — and a citation of an address nobody can
 * call is dated documentation, so the property is stated on its own.)*
 */
export interface CachedDoorAuth {
  mayScan: boolean;
  maySupervise: boolean;
  validUntil: string | null;
  resolvedAt: string;
}

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

/** A scan that has happened and has not yet been reported. */
export interface PendingCheckin {
  key: string;
  type: QueuedSubjectType;
  subjectId: string;
  partyId: string;
  /** The full signed string exactly as scanned. `null` for a guest-list entry, which has no signature. */
  token: string | null;
  /** Device clock at the read. Evidence, not authority. */
  scannedAt: string;
  deviceId: string;
  attempts: number;
  /**
   * `blocked` means the session expired: kept, not retried, surfaced with a
   * sign-in prompt. Classified as failed the night's queue is discarded;
   * classified as retryable it spins forever. Neither is acceptable.
   *
   * `undone` is the third of the same kind: the admission was **reversed at the
   * door with the radio off**, so it must not be reported as an admission, and
   * it must not disappear either. Both drain readers filter by an exact value —
   * {@link getPendingCheckins} takes `"pending"`, {@link getBlockedCheckins}
   * takes `"blocked"` — so an `undone` entry is excluded from the drain **by
   * construction** rather than by a check somebody could forget to write. It is
   * counted by {@link getUndoneLocallyCount} so that "excluded" never means
   * "invisible".
   */
  state: "pending" | "blocked" | "undone";
  lastAttemptAt?: string;
  /**
   * ── The admission was reversed on this device, with the radio off ──────────
   *
   * The three fields are {@link https://developer.mozilla.org/ | the shape}
   * `LocallyUndoneMarker` declares in `sync-manager.ts:318-325`, which wrote the
   * contract from the consumer's side on purpose. They are re-declared
   * structurally here instead of imported: `sync-manager.ts` imports this
   * module, and importing it back would be a cycle.
   *
   * **Why the entry is marked and not deleted.** Deleting it — what this file
   * did until now, `undoCheckInLocally` below — means the night's record shows
   * an evening in which the admission never happened at all: nobody ever sees
   * that somebody was admitted and then taken back out, and
   * `checkin-offline.md` calls the undo *«il percorso piu' semplice per far
   * rientrare qualcuno»* and requires it to be recorded with who and when. The
   * marker keeps who and when on the device even while no endpoint has accepted
   * them yet.
   */
  undoneLocally?: true;
  /** Device clock at the reversal. Evidence, not authority — as `scannedAt` is. */
  undoneAt?: string;
  /** Who reversed it, so the record can say. Never a bare "somebody". */
  undoneBy?: string;
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
  /**
   * ── Historical: created by the version-3 step, destroyed by the version-6 one ─
   *
   * The roster of member codes, resolvable offline. Nothing in the product reads
   * or writes it any more — the reader, the writer and the endpoint that filled
   * it all left with MEM-03 — and the version-6 step deletes the store outright.
   *
   * It stays **declared** for exactly one reason: the version-3 step creates it,
   * and a step that has already run on devices is never rewritten (see the
   * cumulative discipline in this file's docblock). Both the step that creates it
   * and the step that destroys it have to be able to name it, and `idb` types
   * both calls against this interface. A device that installs the app today
   * creates the store in v3 and loses it in v6, inside one `versionchange`.
   *
   * The value shape is the key and nothing else: no name, no role, no code
   * beyond the key itself. Whatever a device is still holding in there is read
   * by nobody before it is dropped.
   */
  members: {
    key: string;
    value: { membershipCode: string };
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

/**
 * The queue type that left in version 6, spelled **once**.
 *
 * The step that drops those entries and the history that declares they can exist
 * read the same constant, so the two cannot drift apart into a step looking for a
 * string nothing writes.
 */
const HISTORICAL_MEMBERSHIP_QUEUE_TYPE = "membership";

/**
 * The queue union as versions 2 to 5 wrote it — three members.
 *
 * Declared because it is **true of data on devices**: a phone that has not
 * opened the app since the last night can be holding rows of the third kind, and
 * a type that denied it would make the step that has to find them unwritable.
 */
type LegacyQueuedSubjectType =
  | QueuedSubjectType
  | typeof HISTORICAL_MEMBERSHIP_QUEUE_TYPE;

interface LegacyPending {
  id: string;
  type: LegacyQueuedSubjectType;
  checkedInAt: string;
  partyId: string;
}

interface CheckinDBv2 extends DBSchema {
  attendees: {
    key: string;
    value: LegacyAttendee;
    indexes: { "by-party": string };
  };
  pendingCheckins: { key: string; value: LegacyPending };
}

/**
 * The subject kinds the door can still queue.
 *
 * `DoorSubjectType` keeps three members on purpose (D-51-13): `'membership'`
 * stays **readable** in `door_scan_events` and in its SQL `CHECK`, because the
 * door's register of verdicts is not rewritten. What it is not any more is
 * **writable** — no scan produces one — and this is where that distinction is
 * expressed, rather than by a map with a member nothing can reach.
 */
type QueueableSubjectType = Exclude<DoorSubjectType, "membership">;

const QUEUE_TYPE_BY_SUBJECT: Record<QueueableSubjectType, QueuedSubjectType> = {
  ticket: "ticket",
  guest_list_entry: "guest",
};

/**
 * Keyed over the **legacy** union, not the current one: the only caller is the
 * version-3 rekey, which reads rows written before version 6 and must be able to
 * resolve all three of them. A lookup that returned `undefined` here would build
 * a record key with the word `undefined` in it.
 */
const SUBJECT_BY_QUEUE_TYPE: Record<LegacyQueuedSubjectType, DoorSubjectType> = {
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
    // The legacy type is carried across **as it was read**, including the third
    // kind the current union no longer names. The cast is the honest shape of
    // that: the copy step does not get to decide anything about a row, it copies
    // it, and rewriting a kind here would be a decision taken where the whole
    // point is not to lose one. The version-6 step below runs after this one in
    // the same `versionchange` and is where the decision happens, by key.
    type: v.type as QueuedSubjectType,
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

      if (oldVersion < 5) {
        // ── Version 5: a step that migrates nothing, and touches NO QUEUE ────
        //
        // Say the important half first, in full words, because it is the whole
        // property this step was written to have: **this step does not touch the
        // queue store.** It does not read it, it does not rewrite a row of
        // it, and it does not delete or re-create the store. A device arriving
        // here can be carrying a NON-EMPTY queue — admissions for people who
        // paid, taken at 01:40, on a phone that is offline right now and cannot
        // be audited — and a schema upgrade that strands them is a presence lost
        // with nobody to notice. `checkin-offline.md`, gate *coda durevole*.
        //
        // It can afford to do nothing structural for the same reason version 4
        // could: everything version 5 adds is either a **new `meta` key** in a
        // store that already exists (the per-night door verdict,
        // {@link DOOR_AUTH_KEY_PREFIX}) or **optional fields** on records in a
        // store that already exists (`undoneLocally` / `undoneAt` / `undoneBy`,
        // and the third `state`). IndexedDB holds records without a schema, so
        // an existing queue entry with no marker is a valid queue entry and one
        // written after this release simply carries fields more.
        //
        // The version number is still bumped, deliberately: the shape a reader
        // of this store may find has changed, and the version is the only
        // versioned marker of that. It is also what makes the queue-survival
        // proof a thing a person can perform — see `35-HUMAN-UAT.md`, which
        // requires it be exercised on a real device with a scan already queued.
        // That proof is NOT inherited from the version-4 one: an upgrade that
        // stranded nothing last time is not an upgrade that strands nothing this
        // time, and no test runner in this repository can tell the difference.
        //
        // The rule from the steps above holds here too and is repeated rather
        // than assumed: **only `idb` promises are awaited inside this
        // callback.** One await on anything else would let the `versionchange`
        // transaction close mid-migration.
        //
        // Nothing is written. A device with no cached verdict reads `null` from
        // {@link readDoorAuth}, and `null` means *not resolved* — never
        // *refused*. Seeding a placeholder here would be exactly the collapse
        // this plan exists to prevent, one store earlier.
        //
        // ── A CONSTRAINT ON THIS COMMENT, and it is not pedantry ─────────────
        // The queue store is named "the queue store" above and never by its
        // identifier, because the assertion for this step is a grep: the body of
        // this block must not contain that identifier. Spelling it out to
        // explain the property would break the check that measures the property,
        // and this repository has the incident twice already (plan 35-07 on a
        // `catch`, plan 35-11 on a call site). The rule that came out of both:
        // rewrite the prose, never weaken the check. Anyone tempted to "fix" the
        // wording here is about to disable the only thing standing between a
        // schema bump and a lost queue.
      }

      if (oldVersion < 6) {
        // ── Version 6: the ONE step of this store that TOUCHES THE QUEUE ─────
        //
        // Say that first, because every step before this one was written to be
        // able to say the opposite. Version 5 states the property in full — *it
        // does not read the queue store, it does not rewrite a row of it, it
        // does not delete or re-create it* — and this step **breaks that
        // property deliberately**, on a decision (D-51-11), not by oversight.
        // A reader arriving here after reading version 5 has to be told which of
        // the two it is, or the next person to touch this file will "repair" a
        // step that is doing exactly what it was asked to do.
        //
        // What it breaks it for: MEM-03 removes the member card, and with it the
        // third queue type. A phone can arrive at this upgrade carrying entries
        // of that kind — scanned with the radio off, never drained — and there
        // is no endpoint left for them to drain to. They are dropped here, in
        // silence on screen and with **one line in the console**: D-51-11 is the
        // owner's decision that no surface is raised for them, and
        // `meta-gates.md` is the floor under it — a category and a count, never a
        // generic message, so the one observer this project has can tell this
        // apart from anything else.
        //
        // What it does NOT break, and these are the rules the earlier steps set:
        //
        //  1. **Only entries of the removed kind are touched, and by key.** The
        //     `ticket` and `guest` rows are not read to be written back and not
        //     re-keyed: they are left where they are. A step that rewrote the
        //     whole queue to drop a third of it would be the wrong verb — and
        //     the wrong direction of failure, since deleting by key can only
        //     ever find too little, never too much (`ai-engineering.md`).
        //  2. **The store is destroyed after the queue work is finished**, never
        //     before — the copy-before-delete order the version-3 step wrote
        //     down, applied to a step that has nothing to copy.
        //  3. **Only `idb` promises are awaited in here.** One await on anything
        //     else lets the `versionchange` transaction close mid-migration, and
        //     there is no test runner in this repository that could catch it.
        //     `console.warn` is not an await, which is why it can be emitted
        //     from inside without weakening this.
        //
        // ── AND A NOTE ON THE COMMENT ABOVE ──────────────────────────────────
        // The version-5 block is forbidden from naming `pendingCheckins`,
        // because the assertion that it leaves the queue alone is a grep for
        // that identifier inside its body. **This block names it, and that is
        // correct**: this step really does open it. The two facts live three
        // lines apart on purpose, so nobody reads the identifier here and
        // concludes the rule was broken by distraction.
        const pendingStore = tx.objectStore("pendingCheckins");
        const failedStore = tx.objectStore("failedCheckins");

        // Counted while scrolling, the shape the house already used for a merge:
        // one pass, one number, and no second read of a store this step has
        // already changed — a count taken with the thing that caused the change
        // is an echo, not a measurement (`ai-engineering.md`).
        let dropped = 0;

        for (const entry of await pendingStore.getAll()) {
          // The cast is the truth of the data against the truth of the type: the
          // union no longer names this kind, and a device can still be holding
          // it. Comparing through `string` says so out loud instead of widening
          // the union back.
          if ((entry.type as string) !== HISTORICAL_MEMBERSHIP_QUEUE_TYPE) continue;
          await pendingStore.delete(entry.key);
          dropped++;
        }

        // The failed list too: it is never emptied by design — a lost entry and
        // a synced one look identical to a counter — but an entry whose endpoint
        // no longer exists can only ever be a line nobody can act on.
        for (const entry of await failedStore.getAll()) {
          if ((entry.type as string) !== HISTORICAL_MEMBERSHIP_QUEUE_TYPE) continue;
          await failedStore.delete(entry.key);
          dropped++;
        }

        // The marker the version-4 step wrote, now that nothing reads it. Left
        // behind it would be a `meta` key claiming something about a roster that
        // no longer exists.
        await tx.objectStore("meta").delete(ROSTER_PREDATES_ROLE_KEY);

        // Strictly last of the structural work, and only once the queue is done.
        if (db.objectStoreNames.contains("members")) {
          db.deleteObjectStore("members");
        }

        // One line, one category, one count — covering both stores above. No
        // identifier of any person is in it: the key of a dropped entry carried
        // a member code, and a code in a console log is a credential in a
        // screenshot (T-51-09).
        if (dropped > 0) {
          console.warn("checkin-store:v6_dropped_membership_entries", {
            count: dropped,
          });
        }
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

/**
 * A label, only when there is one — and **the empty string is not one**.
 *
 * This is the SERVER'S rule, restated on the device on purpose
 * (`attendance/route.ts` → `namedOrNull`). `handle_new_user` writes
 * `full_name = coalesce(..., '')`, so an identity minted behind a guest
 * checkout carries `''` and not `NULL`, and a `??` chain walks straight past
 * it. Two different rules online and offline are two screens that contradict
 * each other in front of a queue — which is the one thing the door cannot
 * afford — so the rule is one rule, written twice rather than imported: this
 * module is the client half of the wire and shares no runtime with the route.
 */
function labelOrNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The last resort, when this device knows a subject's id and nothing else.
 *
 * Reached on exactly one path: a ticket **bought after this device downloaded
 * the list**, admitted and flagged offline (`ScannerClient.tsx:2210-2237`).
 * With guest purchase that path stops being rare, so the record it leaves
 * behind has to be readable — `"Unknown"`, which is what this used to write,
 * makes every such row identical to every other.
 *
 * The tail of the id names nobody and is always available. Same four
 * characters, same case, as the server's own last resort.
 */
function fallbackLabel(subjectType: DoorSubjectType, subjectId: string): string {
  const tail = subjectId.slice(-4);
  return subjectType === "guest_list_entry" ? `Guest ${tail}` : `Ticket ${tail}`;
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
      // A blank from the payload never overwrites a label this device already
      // holds. The direction matters: a refresh may add what the server knows,
      // never subtract what the phone knows — the same monotone rule the
      // check-in flag above is defended by.
      name:
        labelOrNull(row.name) ??
        labelOrNull(local?.name) ??
        fallbackLabel(subject.type, subject.id),
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
  subjectType: QueueableSubjectType,
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
    // Same rule as the merge above, and as the server's: the empty string is an
    // absence, not a label. A record written here with a blank name is a line
    // the door cannot resolve from the line under it.
    name:
      labelOrNull(local?.name) ??
      labelOrNull(opts.name) ??
      fallbackLabel(subjectType, subjectId),
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

/** What a local reversal was actually able to do. Two facts, never one boolean. */
export interface LocalUndoResult {
  /**
   * There was a cached attendee row, and it no longer says checked in.
   *
   * `false` is **not** a failure on its own: an admission can be queued without
   * a cached attendee row behind it, in which case there is nothing to revert
   * and nothing went wrong. The field a caller should branch on is
   * {@link reversalHeld}.
   */
  reverted: boolean;
  /**
   * There WAS a queue entry, and it now carries the reversal instead of being
   * deleted.
   *
   * `false` means the admission is not in this device's queue — it was already
   * reported, so the record on the server still says the person came in and
   * **nothing on this device will ever say otherwise**. The caller must say that
   * out loud: it is the difference between "reversed" and "reversed here only",
   * and collapsing the two is the silent failure `meta-gates.md` forbids.
   */
  reversalHeld: boolean;
}

/**
 * Reverse a local admission and **mark** its queue entry instead of deleting it.
 *
 * The counterpart of {@link undoCheckInLocally}, which deletes. Both exist, and
 * which one a caller reaches for is the decision: deleting makes the admission
 * never have happened, marking keeps who reversed it and when.
 *
 * **One transaction over both stores, and that is a change from the delete
 * path.** That one reverted the attendee first and dropped the queue entry
 * second, deliberately, so a throw between them left the admission still due to
 * be reported — the recoverable failure rather than the silent one. A single
 * `readwrite` transaction over both stores is strictly better than choosing an
 * order: either both happen or neither does, and the caller is told which.
 *
 * `undoneBy` is a label this device holds, never an authorisation. The verdict
 * that decides whether this function may be called at all is read from the
 * cached `doorAuth` by the caller — a store cannot authorise, it can only
 * remember what the server said.
 */
export async function markUndoneLocally(
  key: string,
  undoneBy: string
): Promise<LocalUndoResult> {
  const db = await getDB();
  const now = new Date().toISOString();

  const tx = db.transaction(["attendees", "pendingCheckins"], "readwrite");
  const attendees = tx.objectStore("attendees");
  const pending = tx.objectStore("pendingCheckins");

  const attendee = await attendees.get(key);
  if (attendee) {
    attendee.checkedIn = false;
    attendee.checkedInAt = undefined;
    attendee.checkedInBy = undefined;
    await attendees.put(attendee);
  }

  const entry = await pending.get(key);
  if (entry) {
    await pending.put({
      ...entry,
      state: "undone",
      undoneLocally: true,
      undoneAt: now,
      undoneBy,
    });
  }

  await tx.done;
  return { reverted: attendee !== undefined, reversalHeld: entry !== undefined };
}

/**
 * How many reversals this device is holding and nobody has accepted yet.
 *
 * A number, on the one screen a member of staff is looking at, because there is
 * no error tracking in this project and an entry excluded from the drain with
 * nothing rendering it would be an entry that does not exist. The counter is the
 * observer.
 */
export async function getUndoneLocallyCount(): Promise<number> {
  const db = await getDB();
  const all = await db.getAll("pendingCheckins");
  return all.filter((e) => e.state === "undone").length;
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
 * Remember the door verdict the server resolved for ONE night.
 *
 * Called once, from the fetch the scanner already makes when a night is opened.
 * It is not called from a scan path, and that is the requirement rather than a
 * habit: asking for the verdict per scan is a round trip per person, on a phone,
 * on a weak signal, in front of a queue.
 *
 * One `readwrite` transaction, the shape {@link getDeviceId} uses and for the
 * same reason: two tabs open at once serialise on the overlapping scope instead
 * of writing two verdicts that disagree.
 *
 * Stored as JSON in the `value` string the `meta` store already holds. The
 * alternative — widening `MetaRecord.value` to a union — would change the type of
 * a store two other keys already use, for one caller.
 */
export async function cacheDoorAuth(
  partyId: string,
  verdict: CachedDoorAuth
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("meta", "readwrite");
  await tx.store.put({
    key: doorAuthKey(partyId),
    value: JSON.stringify(verdict),
  });
  await tx.done;
}

/**
 * The verdict this device holds for a night, **or `null`**.
 *
 * ── `null` is NOT `false`, and the return type is what keeps them apart ──────
 *
 * `null` means *this device has not been told*. It does not mean refused. The
 * two are different facts and a caller that collapses them has written a refusal
 * wearing the costume of an answer — the property `require-operator.ts:136-141`
 * states for the server side of the same question, and the reason its fourth
 * arm exists at all. Returning `CachedDoorAuth | null` rather than a bare
 * boolean is the whole point: a caller cannot read `maySupervise` off a `null`
 * by accident, it has to decide what an unanswered question means.
 *
 * A value that is present but not the shape written by {@link cacheDoorAuth} —
 * a half-written record, a key from a future release — also reads as `null`.
 * Same direction, deliberately: a payload this code cannot vouch for has not
 * told us anything, and pretending otherwise would let a malformed string decide
 * a supervision question.
 */
export async function readDoorAuth(
  partyId: string
): Promise<CachedDoorAuth | null> {
  const db = await getDB();
  const row = await db.get("meta", doorAuthKey(partyId));
  if (!row?.value) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(row.value);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const v = parsed as Record<string, unknown>;
  // Checked field by field rather than cast. Every one of these arrived as JSON,
  // so nothing here is type-checked by anything but these four lines.
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
