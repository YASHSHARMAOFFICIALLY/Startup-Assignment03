"use client";

import { useEffect } from "react";

const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function AutoSync() {
  useEffect(() => {
    const sync = async () => {
      try {
        const res = await fetch("/api/cron/sync");
        if (res.ok) {
          const data = await res.json();
          const synced = data.offers?.filter(
            (o: { status: string }) => o.status === "synced",
          );
          if (synced?.length > 0) {
            // Refresh the page to show new data
            window.location.reload();
          }
        }
      } catch {
        // Silent — auto-sync shouldn't interrupt the user
      }
    };

    const interval = setInterval(sync, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
