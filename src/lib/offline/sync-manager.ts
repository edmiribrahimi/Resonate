import { getPendingCheckins, markSynced } from "./checkin-store";

let isSyncing = false;

/**
 * Sync all pending offline check-ins to the server.
 * Skips if already syncing or offline.
 * Returns the number of successfully synced check-ins.
 */
export async function syncPendingCheckins(): Promise<number> {
  if (!navigator.onLine || isSyncing) return 0;

  isSyncing = true;
  let synced = 0;

  try {
    const pending = await getPendingCheckins();

    for (const checkin of pending) {
      try {
        if (checkin.type === "ticket") {
          // For ticket check-ins, we need the full token (ticketId.hmac).
          // Since we only store the ticketId offline, we POST with just the ticketId
          // and rely on the idempotent check-in endpoint accepting re-check-ins
          // from the same user.
          const res = await fetch("/api/tickets/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticketId: checkin.id,
              partyId: checkin.partyId,
              offlineSync: true,
            }),
          });

          if (res.ok || res.status === 409) {
            // 409 = already checked in, which is fine for idempotent sync
            await markSynced(checkin.id);
            synced++;
          }
        } else if (checkin.type === "membership") {
          // Membership check-in: POST to membership verify with code + partyId
          const res = await fetch("/api/membership/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: checkin.id,
              partyId: checkin.partyId,
            }),
          });

          if (res.ok) {
            await markSynced(checkin.id);
            synced++;
          }
        } else {
          // Guest list check-in
          const res = await fetch("/api/tickets/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guestListEntryId: checkin.id }),
          });

          if (res.ok || res.status === 409) {
            await markSynced(checkin.id);
            synced++;
          }
        }
      } catch {
        // Network error — keep in queue for next sync attempt
      }
    }
  } finally {
    isSyncing = false;
  }

  return synced;
}

/**
 * Set up automatic sync triggers:
 * 1. When device comes back online
 * 2. When app returns to foreground (visibility change)
 *
 * Call this once on mount. Returns a cleanup function.
 */
export function setupSyncListeners(): () => void {
  const onOnline = () => {
    syncPendingCheckins();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      syncPendingCheckins();
    }
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
