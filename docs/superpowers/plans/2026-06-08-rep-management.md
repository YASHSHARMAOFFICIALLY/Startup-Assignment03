# Rep Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a canonical rep roster with CRUD, name-alias mapping (query-time), and per-period targets to the rep-management page, and wire alias resolution into all data views.

**Architecture:** New Prisma `Rep` model stores display names, aliases, roles, status, and targets. A `buildAliasMap()` function reads all reps and returns a `Map<rawName, canonicalName>`. The `aggregate()` function and per-page grouping functions accept this map to resolve names before grouping. The rep-management page becomes a client component (like offers) with CRUD dialogs calling new API routes.

**Tech Stack:** Prisma (PostgreSQL), Next.js API routes, Zod validation, shadcn/ui Dialog/AlertDialog, existing component library.

---

### Task 1: Add Rep model to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Rep model**

Add after the `Record` model at the end of the file:

```prisma
model Rep {
  id          String   @id @default(cuid())
  displayName String
  aliases     String[]
  roles       String[] // "closer" | "phone" | "dm"
  status      String   @default("active")
  targets     Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- [ ] **Step 2: Push schema to DB**

Run: `npx prisma db push`
Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 3: Regenerate client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client"

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | grep -E "✓|Failed|Type error"`
Expected: "Compiled successfully"

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Rep model to Prisma schema"
```

---

### Task 2: Add rep CRUD operations and alias map to api-utils

**Files:**
- Modify: `lib/api-utils.ts`

- [ ] **Step 1: Add Zod schemas and Rep CRUD functions**

Add after the `zodError` function at the end of `lib/api-utils.ts`:

```ts
/* ─── Rep operations ─────────────────────────────────────────────── */

export const createRepSchema = z.object({
  displayName: z.string().min(1, "Display name is required.").max(200),
  aliases: z.array(z.string()).default([]),
  roles: z.array(z.enum(["closer", "phone", "dm"])).default([]),
  targets: z.record(z.string(), z.number()).default({}),
});

export const updateRepSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  aliases: z.array(z.string()).optional(),
  roles: z.array(z.enum(["closer", "phone", "dm"])).optional(),
  status: z.enum(["active", "archived"]).optional(),
  targets: z.record(z.string(), z.number()).optional(),
});

export type RepRow = {
  id: string;
  displayName: string;
  aliases: string[];
  roles: string[];
  status: string;
  targets: Record<string, number>;
  createdAt: string;
};

function toRepRow(r: { id: string; displayName: string; aliases: string[]; roles: string[]; status: string; targets: unknown; createdAt: Date }): RepRow {
  return {
    id: r.id,
    displayName: r.displayName,
    aliases: r.aliases,
    roles: r.roles,
    status: r.status,
    targets: (r.targets ?? {}) as Record<string, number>,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function readReps(status?: string): Promise<RepRow[]> {
  const where = status ? { status } : {};
  const reps = await prisma.rep.findMany({ where, orderBy: { displayName: "asc" } });
  return reps.map(toRepRow);
}

export async function createRep(data: z.infer<typeof createRepSchema>): Promise<RepRow> {
  const rep = await prisma.rep.create({ data });
  return toRepRow(rep);
}

export async function updateRep(id: string, data: z.infer<typeof updateRepSchema>): Promise<RepRow | null> {
  const existing = await prisma.rep.findUnique({ where: { id } });
  if (!existing) return null;
  const updated = await prisma.rep.update({ where: { id }, data });
  return toRepRow(updated);
}

export async function deleteRep(id: string): Promise<boolean> {
  const existing = await prisma.rep.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.rep.delete({ where: { id } });
  return true;
}

export async function checkAliasConflict(aliases: string[], excludeRepId?: string): Promise<string | null> {
  const reps = await prisma.rep.findMany({ select: { id: true, displayName: true, aliases: true } });
  for (const alias of aliases) {
    const lower = alias.toLowerCase().trim();
    if (!lower) continue;
    for (const rep of reps) {
      if (excludeRepId && rep.id === excludeRepId) continue;
      if (rep.aliases.some((a) => a.toLowerCase().trim() === lower) || rep.displayName.toLowerCase().trim() === lower) {
        return `"${alias}" is already used by ${rep.displayName}.`;
      }
    }
  }
  return null;
}

export async function buildAliasMap(): Promise<Map<string, string>> {
  const reps = await prisma.rep.findMany({ select: { displayName: true, aliases: true } });
  const map = new Map<string, string>();
  for (const rep of reps) {
    map.set(rep.displayName, rep.displayName);
    for (const alias of rep.aliases) {
      map.set(alias, rep.displayName);
    }
  }
  return map;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | grep -E "✓|Failed|Type error"`
Expected: "Compiled successfully"

- [ ] **Step 3: Commit**

```bash
git add lib/api-utils.ts
git commit -m "feat: add rep CRUD operations and buildAliasMap"
```

---

### Task 3: Wire alias map into aggregate() and page-level grouping

**Files:**
- Modify: `lib/sheet-sync.ts:306` — add `aliasMap` param to `aggregate()`
- Modify: `app/dashboard/page.tsx` — pass alias map
- Modify: `app/leaderboard/page.tsx` — pass alias map
- Modify: `app/closer-kpis/page.tsx` — resolve names before grouping
- Modify: `app/setter-kpis/page.tsx` — resolve names before grouping

- [ ] **Step 1: Add aliasMap param to aggregate()**

In `lib/sheet-sync.ts`, change the `aggregate` function signature and add a name resolver:

```ts
export function aggregate(
  records: RecordsBundle,
  from: string | null,
  to: string | null,
  label: string,
  aliasMap?: Map<string, string>,
): DashboardData {
```

Add a helper right after the function signature opens:

```ts
  const resolveName = aliasMap
    ? (name: string) => aliasMap.get(name) ?? name
    : (name: string) => name;
```

Then update the 4 leaderboard grouping loops to use `resolveName()`. The closer loop:

```ts
  for (const r of closer) {
    if (!r.name) continue;
    const name = resolveName(r.name);
    const c = closersMap.get(name) ?? { cash: 0, closed: 0, calls: 0 };
```

And `closersMap.set(name, c)` instead of `closersMap.set(r.name, c)`.

Same for the phone loop:

```ts
  for (const r of phone) {
    if (!r.name) continue;
    const name = resolveName(r.name);
    const s = settersMap.get(name) ?? { calls: 0, rev: 0 };
```

And `settersMap.set(name, s)`.

Same for the dm loop:

```ts
  for (const r of dm) {
    if (!r.name) continue;
    const name = resolveName(r.name);
    const s = settersMap.get(name) ?? { calls: 0, rev: 0 };
```

And `settersMap.set(name, s)`.

Also update `dailyTrends` — no name grouping there, so no change needed.

- [ ] **Step 2: Update dashboard to pass alias map**

In `app/dashboard/page.tsx`, add import:

```ts
import { buildAliasMap } from "@/lib/api-utils";
```

Inside the `loadDashboardData` function (or wherever aggregate is called), load the alias map and pass it:

```ts
const aliasMap = await buildAliasMap();
const data = aggregate(records, range.from, range.to, range.label, aliasMap);
```

- [ ] **Step 3: Update leaderboard to pass alias map**

In `app/leaderboard/page.tsx`, add import:

```ts
import { buildAliasMap } from "@/lib/api-utils";
```

Inside `LeaderboardPage`, before the aggregate calls:

```ts
const aliasMap = await buildAliasMap();
```

Update both aggregate calls:

```ts
const data = aggregate(records, range.from, range.to, range.label, aliasMap);
```

```ts
const prevData = aggregate(records, prev.from, prev.to, "prior", aliasMap);
```

- [ ] **Step 4: Update closer-kpis to resolve names**

In `app/closer-kpis/page.tsx`, add import:

```ts
import { buildAliasMap } from "@/lib/api-utils";
```

Inside `CloserKpisPage`, after loading records:

```ts
const aliasMap = await buildAliasMap();
```

In the `buildCloserStats` function, it takes `CloserRecord[]` and groups by `r.name`. Change the function signature to accept the alias map and resolve names:

```ts
function buildCloserStats(records: CloserRecord[], aliasMap: Map<string, string>) {
```

Inside the loop, replace `r.name` with resolved name:

```ts
  for (const r of records) {
    if (!r.name) continue;
    const name = aliasMap.get(r.name) ?? r.name;
    const cur = byRep.get(name) ?? {
```

And use `name` everywhere that currently uses `r.name` for map keys. Pass `aliasMap` at the call site.

- [ ] **Step 5: Update setter-kpis to resolve names**

Same pattern as closer-kpis. In `app/setter-kpis/page.tsx`:

```ts
import { buildAliasMap } from "@/lib/api-utils";
```

Load alias map inside `SetterKpisPage`:

```ts
const aliasMap = await buildAliasMap();
```

Update `buildPhoneStats` and `buildDmStats` to accept and use the alias map:

```ts
function buildPhoneStats(records: PhoneRecord[], aliasMap: Map<string, string>) {
```

Inside loop: `const name = aliasMap.get(r.name) ?? r.name;`

Same for `buildDmStats`. Pass `aliasMap` at both call sites.

- [ ] **Step 6: Verify build**

Run: `npm run build 2>&1 | grep -E "✓|Failed|Type error"`
Expected: "Compiled successfully"

- [ ] **Step 7: Commit**

```bash
git add lib/sheet-sync.ts app/dashboard/page.tsx app/leaderboard/page.tsx app/closer-kpis/page.tsx app/setter-kpis/page.tsx
git commit -m "feat: wire alias map into aggregate and all KPI pages"
```

---

### Task 4: Create rep API routes

**Files:**
- Create: `app/api/reps/route.ts`
- Create: `app/api/reps/[id]/route.ts`

- [ ] **Step 1: Create GET/POST /api/reps**

Create `app/api/reps/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readReps, createRep, createRepSchema, checkAliasConflict, zodError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const reps = await readReps(status);
    return NextResponse.json(reps);
  } catch {
    return NextResponse.json({ error: "Failed to read reps." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createRepSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(zodError(parsed.error), { status: 400 });

  const conflict = await checkAliasConflict(parsed.data.aliases);
  if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

  try {
    const rep = await createRep(parsed.data);
    return NextResponse.json(rep, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create rep." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create PUT/DELETE /api/reps/[id]**

Create `app/api/reps/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateRep, deleteRep, updateRepSchema, checkAliasConflict, zodError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateRepSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(zodError(parsed.error), { status: 400 });

  if (parsed.data.aliases) {
    const conflict = await checkAliasConflict(parsed.data.aliases, id);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
  }

  try {
    const rep = await updateRep(id, parsed.data);
    if (!rep) return NextResponse.json({ error: "Rep not found." }, { status: 404 });
    return NextResponse.json(rep);
  } catch {
    return NextResponse.json({ error: "Failed to update rep." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  try {
    const deleted = await deleteRep(id);
    if (!deleted) return NextResponse.json({ error: "Rep not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete rep." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | grep -E "✓|Failed|Type error"`
Expected: "Compiled successfully"

- [ ] **Step 4: Commit**

```bash
git add app/api/reps/
git commit -m "feat: add rep API routes (GET/POST/PUT/DELETE)"
```

---

### Task 5: Build rep management page with CRUD UI

**Files:**
- Rewrite: `app/rep-management/page.tsx` — server component, loads data
- Create: `app/rep-management/_components/rep-crud.tsx` — client component, CRUD dialogs + table

- [ ] **Step 1: Rewrite the server component**

Rewrite `app/rep-management/page.tsx`:

```tsx
export const dynamic = "force-dynamic";

import { readAllRecords, readReps, buildAliasMap } from "@/lib/api-utils";
import { PageHeader } from "@/components/ui/page-header";
import { RepCrud } from "./_components/rep-crud";

function getUnrecognizedNames(
  records: Awaited<ReturnType<typeof readAllRecords>>,
  aliasMap: Map<string, string>,
): string[] {
  const allNames = new Set<string>();
  for (const r of records.closer) if (r.name) allNames.add(r.name);
  for (const r of records.phone) if (r.name) allNames.add(r.name);
  for (const r of records.dm) if (r.name) allNames.add(r.name);

  const unrecognized: string[] = [];
  for (const name of allNames) {
    if (!aliasMap.has(name)) unrecognized.push(name);
  }
  return unrecognized.sort();
}

export default async function RepManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ showArchived?: string }>;
}) {
  const params = await searchParams;
  const showArchived = params.showArchived === "true";

  const [reps, records, aliasMap] = await Promise.all([
    readReps(),
    readAllRecords(),
    buildAliasMap(),
  ]);

  const unrecognized = getUnrecognizedNames(records, aliasMap);
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Rep Management"
        subtitle="Manage your team roster, aliases, and targets."
        badge={<span className="text-xs text-brand-textFaint">({reps.filter((r) => r.status === "active").length} active)</span>}
      />
      <RepCrud
        initialReps={reps}
        unrecognizedNames={unrecognized}
        currentMonth={currentMonth}
        showArchived={showArchived}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create the client CRUD component**

Create `app/rep-management/_components/rep-crud.tsx`. This is a large client component following the exact pattern from `app/offers/page.tsx` (fetch/create/update/delete with Dialog and AlertDialog). Full code:

```tsx
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, Archive, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { th, td, tdNum, trHover } from "@/lib/table-styles";
import { fmtCurrency } from "@/lib/formatters";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

type RepRow = {
  id: string;
  displayName: string;
  aliases: string[];
  roles: string[];
  status: string;
  targets: Record<string, number>;
  createdAt: string;
};

type FormState = {
  displayName: string;
  aliases: string;
  roles: string[];
  status: string;
  targetValue: string;
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
});

function repToForm(rep: RepRow, currentMonth: string): FormState {
  return {
    displayName: rep.displayName,
    aliases: rep.aliases.join(", "),
    roles: rep.roles,
    status: rep.status,
    targetValue: rep.targets[currentMonth]?.toString() ?? "",
  };
}

export function RepCrud({
  initialReps,
  unrecognizedNames,
  currentMonth,
  showArchived,
}: {
  initialReps: RepRow[];
  unrecognizedNames: string[];
  currentMonth: string;
  showArchived: boolean;
}) {
  const router = useRouter();
  const [reps, setReps] = useState(initialReps);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = new Date(currentMonth + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" });

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
      ? (reps.find((r) => r.id === editingId)?.targets ?? {})
      : {};
    if (targetNum !== undefined && !isNaN(targetNum)) {
      targets[currentMonth] = targetNum;
    }

    const body = {
      displayName: form.displayName,
      aliases,
      roles: form.roles,
      ...(editingId ? { status: form.status } : {}),
      targets,
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
    } catch { /* ignore */ }
    setDeleteId(null);
  };

  const handleArchiveToggle = async (rep: RepRow) => {
    const newStatus = rep.status === "active" ? "archived" : "active";
    await fetch(`/api/reps/${rep.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    toast.success(newStatus === "archived" ? "Rep archived." : "Rep restored.");
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

  const visible = showArchived ? reps : reps.filter((r) => r.status === "active");
  const archivedCount = reps.filter((r) => r.status === "archived").length;

  return (
    <>
      <Toaster />

      {/* Unrecognized names banner */}
      {unrecognizedNames.length > 0 && (
        <Panel className="border-brand-accent/20 bg-brand-accent/[0.03]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-brand-accent mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-brand-textPrimary mb-1">
                {unrecognizedNames.length} unrecognized name{unrecognizedNames.length > 1 ? "s" : ""} in synced data
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
            <span className="ml-2 text-xs text-brand-textFaint font-normal">({visible.length} reps)</span>
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
            <table className="w-full min-w-[700px]">
              <thead>
                <tr>
                  <th scope="col" className={th}>Name</th>
                  <th scope="col" className={th}>Roles</th>
                  <th scope="col" className={th}>Aliases</th>
                  <th scope="col" className={`${th} text-right`}>{monthLabel} Target</th>
                  <th scope="col" className={`${th} text-center`}>Status</th>
                  <th scope="col" className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((rep) => (
                  <tr key={rep.id} className={trHover}>
                    <td className={`${td} font-medium text-brand-textSecondary`}>{rep.displayName}</td>
                    <td className={td}>
                      <div className="flex gap-1 flex-wrap">
                        {rep.roles.map((r) => (
                          <span key={r} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleBadge[r] ?? "text-brand-textFaint"}`}>
                            {roleLabel[r] ?? r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={`${td} text-brand-textMuted text-xs max-w-[180px] truncate`} title={rep.aliases.join(", ")}>
                      {rep.aliases.length > 0 ? rep.aliases.join(", ") : "\u2014"}
                    </td>
                    <td className={`${tdNum} text-right text-brand-textSecondary`}>
                      {rep.targets[currentMonth] != null ? fmtCurrency(rep.targets[currentMonth]) : "\u2014"}
                    </td>
                    <td className={`${td} text-center`}>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${rep.status === "active" ? "bg-brand-positive/15 text-brand-positive" : "bg-brand-textFaint/15 text-brand-textFaint"}`}>
                        {rep.status}
                      </span>
                    </td>
                    <td className={`${td} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(rep)} />
                        <IconButton
                          icon={rep.status === "active" ? Archive : RotateCcw}
                          label={rep.status === "active" ? "Archive" : "Restore"}
                          onClick={() => handleArchiveToggle(rep)}
                        />
                        <IconButton icon={Trash2} label="Delete" onClick={() => setDeleteId(rep.id)} />
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
              href={showArchived ? "/rep-management" : "/rep-management?showArchived=true"}
              className="text-xs text-brand-textFaint hover:text-brand-textSecondary transition-colors"
            >
              {showArchived ? "Hide archived" : `Show ${archivedCount} archived`}
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
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Marcus Johnson"
              />
            </div>
            <div>
              <Label htmlFor="aliases">Aliases (comma-separated)</Label>
              <Input
                id="aliases"
                value={form.aliases}
                onChange={(e) => setForm((f) => ({ ...f, aliases: e.target.value }))}
                placeholder="e.g., Marcus, marcus, Marcus J"
              />
              <p className="text-[11px] text-brand-textFaint mt-1">Sheet names that should map to this rep.</p>
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
                onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
                placeholder="e.g., 20000"
                disabled={editingId != null && form.status === "archived"}
              />
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.displayName.trim()}>
              {saving && <Loader2 size={14} className="animate-spin mr-1.5" />}
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
              This removes the rep from the roster. Their synced records are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | grep -E "✓|Failed|Type error"`
Expected: "Compiled successfully"

- [ ] **Step 4: Commit**

```bash
git add app/rep-management/
git commit -m "feat: rebuild rep management page with CRUD, aliases, and targets"
```

---

### Task 6: Final verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: All pages compile, no type errors.

- [ ] **Step 2: Manual verification checklist**

1. Visit `/rep-management` — should show empty roster with "Add Rep" button
2. Click "Add Rep" — dialog with name, aliases, roles, target fields
3. Create a rep with aliases matching sheet names — save succeeds
4. Visit `/dashboard` — leaderboard should show canonical display names (if aliases match)
5. Visit `/leaderboard` — same alias resolution
6. Archive a rep — hidden from roster, still in leaderboard
7. Show archived toggle — reveals archived reps
8. Delete a rep — removed from roster

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address rep management integration issues"
```
