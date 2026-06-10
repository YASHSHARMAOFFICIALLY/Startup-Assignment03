"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { th, td, tdNum, trHover } from "@/lib/table-styles";
import { fmtCurrency } from "@/lib/formatters";
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
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import type { RepRow } from "@/lib/api-utils";

type FormState = {
  displayName: string;
  aliases: string;
  roles: string[];
  status: string;
  targetValue: string;
  commissionRate: string;
};

const ROLES = [
  { key: "closer", label: "Closer" },
  { key: "phone", label: "Phone Setter" },
  { key: "dm", label: "DM Setter" },
] as const;

const roleBadge: Record<string, string> = {
  closer: "bg-brand-accent/15 text-brand-accent",
  phone: "bg-brand-positive/15 text-brand-positive",
  dm: "bg-brand-purple/15 text-brand-purple",
};

const roleLabel: Record<string, string> = {
  closer: "Closer",
  phone: "Phone",
  dm: "DM",
};

const emptyForm = (): FormState => ({
  displayName: "",
  aliases: "",
  roles: [],
  status: "active",
  targetValue: "",
  commissionRate: "",
});

function repToForm(rep: RepRow, currentMonth: string): FormState {
  return {
    displayName: rep.displayName,
    aliases: rep.aliases.join(", "),
    roles: rep.roles,
    status: rep.status,
    targetValue: rep.targets[currentMonth]?.toString() ?? "",
    commissionRate: rep.commissionRate != null ? rep.commissionRate.toString() : "",
  };
}

export function RepCrud({
  initialReps,
  unrecognizedNames,
  currentMonth,
  showArchived,
  lastActive,
  headline,
  periodLabel,
}: {
  initialReps: RepRow[];
  unrecognizedNames: string[];
  currentMonth: string;
  showArchived: boolean;
  lastActive: Record<string, string>;
  headline: Record<string, string>;
  periodLabel: string;
}) {
  const router = useRouter();
  const [reps, setReps] = useState(initialReps);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = new Date(currentMonth + "-01").toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );

  const refreshReps = useCallback(async () => {
    const res = await fetch("/api/reps", { cache: "no-store" });
    if (res.ok) setReps(await res.json());
  }, []);

  const openAdd = (prefillName?: string) => {
    const f = emptyForm();
    if (prefillName) {
      f.displayName = prefillName;
      f.aliases = prefillName;
    }
    setForm(f);
    setEditingId(null);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (rep: RepRow) => {
    setForm(repToForm(rep, currentMonth));
    setEditingId(rep.id);
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const aliases = form.aliases
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const targetNum = form.targetValue ? parseFloat(form.targetValue) : undefined;
    const targets = editingId
      ? { ...(reps.find((r) => r.id === editingId)?.targets ?? {}) }
      : {};
    if (targetNum !== undefined && !isNaN(targetNum)) {
      targets[currentMonth] = targetNum;
    }

    const commRate = form.commissionRate !== "" ? parseFloat(form.commissionRate) : null;

    const body = {
      displayName: form.displayName,
      aliases,
      roles: form.roles,
      ...(editingId ? { status: form.status } : {}),
      targets,
      commissionRate: commRate !== null && !isNaN(commRate) ? commRate : null,
    };

    const url = editingId ? `/api/reps/${editingId}` : "/api/reps";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Save failed.");
        setSaving(false);
        return;
      }

      toast.success(editingId ? "Rep updated." : "Rep created.");
      setDialogOpen(false);
      await refreshReps();
      router.refresh();
    } catch {
      setError("Network error.");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/reps/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Rep deleted.");
        await refreshReps();
        router.refresh();
      }
    } catch {
      /* ignore */
    }
    setDeleteId(null);
  };

  const handleArchiveToggle = async (rep: RepRow) => {
    const newStatus = rep.status === "active" ? "archived" : "active";
    await fetch(`/api/reps/${rep.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    toast.success(
      newStatus === "archived" ? "Rep archived." : "Rep restored.",
    );
    await refreshReps();
    router.refresh();
  };

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));
  };

  const visible = showArchived
    ? reps
    : reps.filter((r) => r.status === "active");
  const archivedCount = reps.filter((r) => r.status === "archived").length;

  return (
    <>
      <Toaster />

      {/* Unrecognized names banner */}
      {unrecognizedNames.length > 0 && (
        <Panel className="border-brand-accent/20 bg-brand-accent/[0.03]">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={16}
              className="text-brand-accent mt-0.5 shrink-0"
            />
            <div>
              <div className="text-sm font-medium text-brand-textPrimary mb-1">
                {unrecognizedNames.length} unrecognized name
                {unrecognizedNames.length > 1 ? "s" : ""} in synced data
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unrecognizedNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => openAdd(name)}
                    className="text-xs px-2 py-0.5 rounded-full bg-brand-elevated text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-accent/10 transition-colors cursor-pointer"
                  >
                    {name} +
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Roster table */}
      <Panel className="animate-stagger-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-brand-textPrimary">
            Roster
            <span className="ml-2 text-xs text-brand-textFaint font-normal">
              ({visible.length} reps)
            </span>
          </h2>
          <Button size="sm" onClick={() => openAdd()} className="gap-1.5">
            <Plus size={14} /> Add Rep
          </Button>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title="No reps"
            description="Add reps to manage your team roster."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th scope="col" className={th}>
                    Name
                  </th>
                  <th scope="col" className={th}>
                    Roles
                  </th>
                  <th scope="col" className={th}>
                    Aliases
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {monthLabel} Target
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {periodLabel}
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Last Active
                  </th>
                  <th scope="col" className={`${th} text-center`}>
                    Status
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((rep) => (
                  <tr key={rep.id} className={trHover}>
                    <td
                      className={`${td} font-medium text-brand-textSecondary`}
                    >
                      <Link href={`/rep-management/${rep.id}`} className="hover:text-brand-accent transition-colors">{rep.displayName}</Link>
                      {rep.commissionRate != null && (
                        <span className="ml-1.5 text-[10px] text-brand-textFaint">
                          {rep.commissionRate}% comm
                        </span>
                      )}
                    </td>
                    <td className={td}>
                      <div className="flex gap-1 flex-wrap">
                        {rep.roles.map((r) => (
                          <span
                            key={r}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleBadge[r] ?? "text-brand-textFaint"}`}
                          >
                            {roleLabel[r] ?? r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td
                      className={`${td} text-brand-textMuted text-xs max-w-[180px] truncate`}
                      title={rep.aliases.join(", ")}
                    >
                      {rep.aliases.length > 0
                        ? rep.aliases.join(", ")
                        : "\u2014"}
                    </td>
                    <td className={`${tdNum} text-right text-brand-textSecondary`}>
                      {rep.targets[currentMonth] != null
                        ? fmtCurrency(rep.targets[currentMonth])
                        : "\u2014"}
                    </td>
                    <td className={`${tdNum} text-right text-brand-textSecondary`}>
                      {headline[rep.id] ?? "\u2014"}
                    </td>
                    <td className={`${tdNum} text-right text-brand-textMuted tabular-nums`}>
                      {lastActive[rep.id]
                        ? new Date(lastActive[rep.id] + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })
                        : "\u2014"}
                    </td>
                    <td className={`${td} text-center`}>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          rep.status === "active"
                            ? "bg-brand-positive/15 text-brand-positive"
                            : "bg-brand-textFaint/15 text-brand-textFaint"
                        }`}
                      >
                        {rep.status}
                      </span>
                    </td>
                    <td className={`${td} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          icon={Pencil}
                          aria-label="Edit"
                          onClick={() => openEdit(rep)}
                        />
                        <IconButton
                          icon={
                            rep.status === "active" ? Archive : RotateCcw
                          }
                          aria-label={
                            rep.status === "active" ? "Archive" : "Restore"
                          }
                          onClick={() => handleArchiveToggle(rep)}
                        />
                        <IconButton
                          icon={Trash2}
                          aria-label="Delete"
                          onClick={() => setDeleteId(rep.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Show archived toggle */}
        {archivedCount > 0 && (
          <div className="mt-3 text-center">
            <Link
              href={
                showArchived
                  ? "/rep-management"
                  : "/rep-management?showArchived=true"
              }
              className="text-xs text-brand-textFaint hover:text-brand-textSecondary transition-colors"
            >
              {showArchived
                ? "Hide archived"
                : `Show ${archivedCount} archived`}
            </Link>
          </div>
        )}
      </Panel>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Rep" : "Add Rep"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
                placeholder="Marcus Johnson"
              />
            </div>
            <div>
              <Label htmlFor="aliases">Aliases (comma-separated)</Label>
              <Input
                id="aliases"
                value={form.aliases}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aliases: e.target.value }))
                }
                placeholder="e.g., Marcus, marcus, Marcus J"
              />
              <p className="text-[11px] text-brand-textFaint mt-1">
                Sheet names that should map to this rep.
              </p>
            </div>
            <div>
              <Label>Roles</Label>
              <div className="flex gap-2 mt-1.5">
                {ROLES.map((role) => (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => toggleRole(role.key)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      form.roles.includes(role.key)
                        ? "bg-brand-accent/15 text-brand-accent border-brand-accent/30"
                        : "text-brand-textFaint border-brand-border hover:text-brand-textSecondary"
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="target">{monthLabel} Target</Label>
              <Input
                id="target"
                type="number"
                value={form.targetValue}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetValue: e.target.value }))
                }
                placeholder="e.g., 20000"
                disabled={editingId != null && form.status === "archived"}
              />
            </div>
            <div>
              <Label htmlFor="commissionRate">Commission % (override)</Label>
              <Input
                id="commissionRate"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.commissionRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, commissionRate: e.target.value }))
                }
                placeholder="Leave blank to use global rate"
              />
              <p className="text-[11px] text-brand-textFaint mt-1">
                Overrides the global commission rate for this rep.
              </p>
            </div>
            {editingId && (
              <div>
                <Label>Status</Label>
                <div className="flex gap-2 mt-1.5">
                  {(["active", "archived"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors capitalize ${
                        form.status === s
                          ? "bg-brand-accent/15 text-brand-accent border-brand-accent/30"
                          : "text-brand-textFaint border-brand-border hover:text-brand-textSecondary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-xs text-brand-negative">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.displayName.trim()}
            >
              {saving && (
                <Loader2 size={14} className="animate-spin mr-1.5" />
              )}
              {editingId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rep?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the rep from the roster. Their synced records are
              not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
