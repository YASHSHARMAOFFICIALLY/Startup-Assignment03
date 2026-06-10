"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Users,
  Phone,
  MessageSquare,
  RefreshCw,
  Database,
  Loader2,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

import type { Offer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState as SharedEmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

type FormState = {
  name: string;
  closerSheetUrl: string;
  phoneSetterSheetUrl: string;
  dmSetterSheetUrl: string;
};

const emptyForm = (): FormState => ({
  name: "",
  closerSheetUrl: "",
  phoneSetterSheetUrl: "",
  dmSetterSheetUrl: "",
});

const DASHBOARDS: {
  key: keyof Omit<FormState, "name">;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  placeholder: string;
}[] = [
  {
    key: "closerSheetUrl",
    label: "Closer Dashboard",
    icon: Users,
    iconClass: "text-brand-teal",
    placeholder: "Paste the CloserDashboard sheet URL",
  },
  {
    key: "phoneSetterSheetUrl",
    label: "Phone Setter Dashboard",
    icon: Phone,
    iconClass: "text-brand-accent",
    placeholder: "Paste the SetterDashboard sheet URL",
  },
  {
    key: "dmSetterSheetUrl",
    label: "DM Setter Dashboard",
    icon: MessageSquare,
    iconClass: "text-brand-purple",
    placeholder: "Paste the DMSetterDashboard sheet URL",
  },
];

/* ---- Helpers ---- */

function formatSynced(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortenUrl(url: string): string {
  if (!url) return "\u2014";
  try {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]{8,})/);
    return match ? `sheets/...${match[1].slice(-8)}` : url.slice(0, 40) + "...";
  } catch {
    return url.slice(0, 40) + "...";
  }
}

/* ---- Skeleton ---- */

function OfferSkeleton() {
  return (
    <Panel className="animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="h-5 w-32 rounded bg-brand-elevated" />
        <div className="flex gap-1">
          <div className="h-8 w-8 rounded bg-brand-elevated" />
          <div className="h-8 w-8 rounded bg-brand-elevated" />
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="h-4 w-48 rounded bg-brand-elevated" />
        <div className="h-4 w-44 rounded bg-brand-elevated" />
        <div className="h-4 w-40 rounded bg-brand-elevated" />
      </div>
      <div className="mt-4 pt-4 border-t border-brand-border/20 flex justify-between">
        <div className="h-3 w-28 rounded bg-brand-elevated" />
        <div className="h-7 w-20 rounded bg-brand-elevated" />
      </div>
    </Panel>
  );
}

/* ---- Card ---- */

function UrlRow({
  icon: Icon,
  iconClass,
  label,
  url,
}: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  url: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className={cn("h-4 w-4 shrink-0", iconClass)} aria-hidden="true" />
      <span className="shrink-0 text-xs font-medium text-brand-textSecondary">
        {label}
      </span>
      <span className="truncate text-xs text-brand-textMuted" title={url || undefined}>
        {shortenUrl(url)}
      </span>
    </div>
  );
}

function OfferCard({
  offer,
  onEdit,
  onDelete,
  onSync,
  syncing,
}: {
  offer: Offer;
  onEdit: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onSync: (offer: Offer) => void;
  syncing: boolean;
}) {
  return (
    <Panel>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-medium text-brand-textPrimary">
          {offer.name}
        </h3>
        <div className="flex items-center gap-0.5">
          <IconButton
            icon={Pencil}
            aria-label="Edit offer"
            onClick={() => onEdit(offer)}
            size={16}
          />
          <IconButton
            icon={Trash2}
            aria-label="Delete offer"
            onClick={() => onDelete(offer)}
            size={16}
          />
        </div>
      </div>

      {/* Three dashboard URLs */}
      <div className="mt-4 space-y-2.5">
        <UrlRow icon={Users} iconClass="text-brand-teal" label="Closer" url={offer.closerSheetUrl} />
        <UrlRow icon={Phone} iconClass="text-brand-accent" label="Phone Setter" url={offer.phoneSetterSheetUrl} />
        <UrlRow icon={MessageSquare} iconClass="text-brand-purple" label="DM Setter" url={offer.dmSetterSheetUrl} />
      </div>

      {/* Bottom row */}
      <div className="mt-4 flex items-center justify-between border-t border-brand-border/20 pt-4">
        <span className="text-xs text-brand-textMuted">
          Last synced: {formatSynced(offer.lastSynced)}
        </span>
        <button
          type="button"
          onClick={() => onSync(offer)}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-md border border-brand-teal text-brand-teal bg-transparent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-brand-teal/10 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          {syncing ? "Syncing\u2026" : "Sync Now"}
        </button>
      </div>
    </Panel>
  );
}

/* ---- Page ---- */

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const loadOffers = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch("/api/offers", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load offers.");
      const data = (await res.json()) as Offer[];
      setOffers(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load offers.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffers(true);
  }, [loadOffers]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (offer: Offer) => {
    setEditing(offer);
    setForm({
      name: offer.name,
      closerSheetUrl: offer.closerSheetUrl,
      phoneSetterSheetUrl: offer.phoneSetterSheetUrl,
      dmSetterSheetUrl: offer.dmSetterSheetUrl,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Offer name is required.");
      return;
    }
    setSaving(true);
    const body = {
      name: form.name.trim(),
      closerSheetUrl: form.closerSheetUrl.trim(),
      phoneSetterSheetUrl: form.phoneSetterSheetUrl.trim(),
      dmSetterSheetUrl: form.dmSetterSheetUrl.trim(),
    };
    try {
      const res = editing
        ? await fetch(`/api/offers/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/offers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) throw new Error("Failed to save offer.");
      toast.success("Offer saved.");
      setDialogOpen(false);
      await loadOffers(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save offer.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (offer: Offer) => {
    try {
      const res = await fetch(`/api/offers/${offer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete offer.");
      toast.success("Offer deleted.");
      await loadOffers(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete offer.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSync = async (offer: Offer) => {
    setSyncingId(offer.id);
    try {
      const res = await fetch(`/api/offers/${offer.id}/sync`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to sync offer.");
      }
      const j = await res.json().catch(() => null);
      const counts = j?.counts;
      toast.success(
        counts
          ? `Synced — ${counts.closer} closer, ${counts.phone} phone, ${counts.dm} DM rows.`
          : "Dashboard synced.",
      );
      await loadOffers(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to sync offer.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Offers" subtitle="Manage your Google Sheets connections." />
        <Button
          onClick={openAdd}
          className="bg-brand-teal text-black hover:bg-brand-teal/90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Offer
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <OfferSkeleton />
          <OfferSkeleton />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : offers.length === 0 ? (
        <SharedEmptyState
          icon={Database}
          title="No offers yet"
          description="Add your first offer to connect your Google Sheets tracker."
          action={
            <Button
              onClick={openAdd}
              className="bg-brand-teal text-black hover:bg-brand-teal/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Offer
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onEdit={openEdit}
              onDelete={(o) => setDeleteTarget(o)}
              onSync={handleSync}
              syncing={syncingId === offer.id}
            />
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="border-brand-border bg-brand-bg sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Offer" : "Add Offer"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="offer-name" className="text-brand-textMuted">
                Offer Name
              </Label>
              <Input
                id="offer-name"
                placeholder="e.g. Universal Attraction"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            {DASHBOARDS.map(({ key, label, icon: Icon, iconClass, placeholder }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="text-brand-textMuted">
                  {label} URL
                </Label>
                <div className="relative">
                  <Icon
                    className={cn(
                      "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                      iconClass,
                    )}
                    aria-hidden="true"
                  />
                  <Input
                    id={key}
                    type="url"
                    autoComplete="url"
                    className="pl-9"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                  />
                </div>
              </div>
            ))}

            <p className="text-xs leading-relaxed text-brand-textMuted">
              The OS will automatically read data from the Tally_Closer_Raw,
              Tally_PhoneSetter_Raw, and Tally_DMSetter_Raw tabs in each sheet.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-teal text-black hover:bg-brand-teal/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="border-brand-border bg-brand-bg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete offer</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {deleteTarget?.name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
