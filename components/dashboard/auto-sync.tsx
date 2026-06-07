"use client";

import { useEffect } from "react";

const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function AutoSync() {
  useEffect(() => {
    const sync = async () => {
      try {
        // Fetch all offers, then sync each one
        const offersRes = await fetch("/api/offers");
        if (!offersRes.ok) return;
        const offers = await offersRes.json();

        let synced = false;
        for (const offer of offers) {
          if (!offer.closerSheetUrl || !offer.phoneSetterSheetUrl || !offer.dmSetterSheetUrl) continue;
          const res = await fetch(`/api/offers/${offer.id}/sync`, { method: "POST" });
          if (res.ok) synced = true;
        }

        if (synced) {
          window.location.reload();
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
