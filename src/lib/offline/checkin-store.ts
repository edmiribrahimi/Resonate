import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * IndexedDB schema for offline check-in support.
 *
 * Known limitations:
 * - Tickets purchased while the device is offline won't appear until next sync
 * - Multi-device: two staff scanning same ticket offline = both see green; duplicate resolved on sync
 * - Membership QR offline: only verifiable if member data has been pre-cached
 */

interface CheckinDB extends DBSchema {
  attendees: {
    key: string; // ticketId or guestListEntryId
    value: {
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
    };
    indexes: {
      "by-party": string;
    };
  };
  members: {
    key: string; // membership_code (e.g. RSN-XXXXXXXX)
    value: {
      membershipCode: string;
      userId: string;
      fullName: string;
    };
  };
  pendingCheckins: {
    key: string; // ticketId, guestListEntryId, or membership_code
    value: {
      id: string;
      type: "ticket" | "guest" | "membership";
      checkedInAt: string;
      partyId: string;
    };
  };
}

const DB_NAME = "resonate-checkin";
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<CheckinDB> | null = null;

async function getDB(): Promise<IDBPDatabase<CheckinDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<CheckinDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Attendees store with party index
      if (!db.objectStoreNames.contains("attendees")) {
        const store = db.createObjectStore("attendees", {
          keyPath: "ticketId",
        });
        store.createIndex("by-party", "partyId");
      }

      // Members store for offline membership verification
      if (!db.objectStoreNames.contains("members")) {
        db.createObjectStore("members", { keyPath: "membershipCode" });
      }

      // Pending check-ins queue
      if (!db.objectStoreNames.contains("pendingCheckins")) {
        db.createObjectStore("pendingCheckins", { keyPath: "id" });
      }
    },
  });

  return dbInstance;
}

/** Bulk-write attendees for a party into IndexedDB. Clears previous data for the party first. */
export async function cacheAttendees(
  partyId: string,
  attendees: Array<{
    ticketId: string | null;
    guestListEntryId: string | null;
    name: string;
    email?: string;
    tierName: string | null;
    ticketType: string;
    checkedIn: boolean;
    checkedInAt: string | null;
    isGuestList: boolean;
  }>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("attendees", "readwrite");

  // Clear existing data for this party
  const index = tx.store.index("by-party");
  let cursor = await index.openCursor(partyId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  // Insert all attendees
  for (const a of attendees) {
    // Use ticketId or guestListEntryId as key
    const key = a.ticketId || a.guestListEntryId;
    if (!key) continue;

    await tx.store.put({
      ticketId: key,
      partyId,
      name: a.name,
      email: a.email,
      tierName: a.tierName ?? undefined,
      ticketType: a.ticketType === "guest_list" ? "guest_list" : "purchased",
      checkedIn: a.checkedIn,
      checkedInAt: a.checkedInAt ?? undefined,
      isGuestListEntry: a.isGuestList,
      guestListEntryId: a.guestListEntryId ?? undefined,
    });
  }

  await tx.done;
}

/** Update the local cache to mark an attendee as checked in (without adding to pending queue).
 * Use this after a successful online check-in to keep the local cache in sync. */
export async function markCheckedInLocally(ticketId: string): Promise<void> {
  const db = await getDB();
  const attendee = await db.get("attendees", ticketId);
  if (!attendee) return;
  attendee.checkedIn = true;
  attendee.checkedInAt = new Date().toISOString();
  await db.put("attendees", attendee);
}

/** Look up an attendee by ticketId (also matches guestListEntryId stored as ticketId key). */
export async function findAttendee(
  ticketId: string
): Promise<CheckinDB["attendees"]["value"] | undefined> {
  const db = await getDB();
  return db.get("attendees", ticketId);
}

/** Mark an attendee as checked in locally and add to the pending sync queue. */
export async function checkInLocally(
  ticketId: string
): Promise<CheckinDB["attendees"]["value"] | null> {
  const db = await getDB();
  const attendee = await db.get("attendees", ticketId);
  if (!attendee) return null;

  const now = new Date().toISOString();

  // Update attendee record
  attendee.checkedIn = true;
  attendee.checkedInAt = now;
  await db.put("attendees", attendee);

  // Add to pending check-ins queue
  await db.put("pendingCheckins", {
    id: ticketId,
    type: attendee.isGuestListEntry ? "guest" : "ticket",
    checkedInAt: now,
    partyId: attendee.partyId,
  });

  return attendee;
}

/** Revert a local check-in and remove from the pending sync queue. */
export async function undoCheckInLocally(
  ticketId: string
): Promise<void> {
  const db = await getDB();
  const attendee = await db.get("attendees", ticketId);
  if (attendee) {
    attendee.checkedIn = false;
    attendee.checkedInAt = undefined;
    await db.put("attendees", attendee);
  }

  // Remove from pending queue
  await db.delete("pendingCheckins", ticketId);
}

/** Get all pending (unsynced) check-ins. */
export async function getPendingCheckins(): Promise<
  CheckinDB["pendingCheckins"]["value"][]
> {
  const db = await getDB();
  return db.getAll("pendingCheckins");
}

/** Remove a check-in from the pending queue after successful sync. */
export async function markSynced(ticketId: string): Promise<void> {
  const db = await getDB();
  await db.delete("pendingCheckins", ticketId);
}

/** Get the count of pending check-ins. */
export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count("pendingCheckins");
}

/** Clear all cached attendees for a specific party. */
export async function clearPartyCache(partyId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("attendees", "readwrite");
  const index = tx.store.index("by-party");
  let cursor = await index.openCursor(partyId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

/** Cache all members for offline membership verification. */
export async function cacheMembers(
  members: Array<{ id: string; full_name: string; membership_code: string }>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("members", "readwrite");
  await tx.store.clear();
  for (const m of members) {
    await tx.store.put({
      membershipCode: m.membership_code,
      userId: m.id,
      fullName: m.full_name,
    });
  }
  await tx.done;
}

/** Look up a member by membership_code in offline cache. */
export async function findMember(
  membershipCode: string
): Promise<CheckinDB["members"]["value"] | undefined> {
  const db = await getDB();
  return db.get("members", membershipCode);
}

/** Queue a membership check-in for later sync. */
export async function checkInMemberLocally(
  membershipCode: string,
  partyId: string
): Promise<void> {
  const db = await getDB();
  await db.put("pendingCheckins", {
    id: membershipCode,
    type: "membership",
    checkedInAt: new Date().toISOString(),
    partyId,
  });
}
