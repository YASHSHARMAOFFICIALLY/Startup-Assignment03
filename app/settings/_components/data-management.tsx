"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const EXPORTS = [
  { type: "closer", label: "Closer records" },
  { type: "phone", label: "Phone setter records" },
  { type: "dm", label: "DM setter records" },
];

export function DataManagement() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/data/clear", { method: "POST" });
      if (res.ok) {
        const { deleted } = await res.json();
        toast.success(`Cleared ${deleted} records.`);
        router.refresh();
      } else {
        toast.error("Failed to clear records.");
      }
    } catch {
      toast.error("Network error.");
    }
    setClearing(false);
    setConfirmOpen(false);
  };

  return (
    <Panel className="animate-stagger-5">
      <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
        Data Management
      </h2>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-brand-textMuted mb-2">
            Export all synced records as CSV.
          </p>
          <div className="flex flex-wrap gap-2">
            {EXPORTS.map((e) => (
              <a
                key={e.type}
                href={`/api/export?type=${e.type}`}
                className="inline-flex items-center gap-1.5 text-xs text-brand-textMuted border border-brand-border rounded-md px-3 py-1.5 hover:bg-white/[0.04] hover:text-brand-textPrimary transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none"
              >
                <Download size={12} />
                <span>{e.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-brand-border/40">
          <h3 className="text-xs font-medium uppercase tracking-wider text-brand-negative mb-2">
            Danger zone
          </h3>
          <p className="text-sm text-brand-textMuted mb-3">
            Permanently delete all synced records for every offer.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-brand-negative/40 text-brand-negative hover:bg-brand-negative/10 hover:text-brand-negative"
            onClick={() => setConfirmOpen(true)}
          >
            Clear all data
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all synced data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all synced records for every offer.
              Offers and reps are kept. Sheet data will be re-imported on
              the next sync unless auto-sync is turned off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleClear();
              }}
              disabled={clearing}
            >
              {clearing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "Clear all data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}
