"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function AutoSync() {
  const router = useRouter();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

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
          router.refresh();
        }
      } catch {
        // Silent — auto-sync shouldn't interrupt the user
      }
    };

    const start = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (res.ok) {
          const settings = await res.json();
          if (settings.autoSyncMode === "off") return;
        }
      } catch {
        // Settings unreadable — fall through and poll as before
      }
      if (!cancelled) interval = setInterval(sync, SYNC_INTERVAL_MS);
    };
    start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [router]);

  return null;
}
