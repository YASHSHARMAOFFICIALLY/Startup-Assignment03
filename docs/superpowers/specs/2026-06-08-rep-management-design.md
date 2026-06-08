# Rep Management — Design Spec

## Context

The rep-management page is currently read-only — it extracts unique rep names from synced records and displays them in a table. There's no canonical roster, no way to merge duplicate names from messy sheet input, and no targets/quotas. This spec adds CRUD, alias mapping, and per-period targets.

## Prisma Model

```prisma
model Rep {
  id          String   @id @default(cuid())
  displayName String
  aliases     String[]
  roles       String[] // "closer" | "phone" | "dm"
  status      String   @default("active") // "active" | "archived"
  targets     Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- `aliases`: raw sheet names that map to this rep (e.g., `["lucio", "Lucio R", "Lucio Rodriguez"]`)
- `roles`: which record types this rep appears in
- `targets`: `Record<string, number>` — keys are `YYYY-MM`, values are target numbers (cash for closers, calls-set for setters)
- `status`: "active" reps appear by default; "archived" reps are hidden from roster but their historical data still appears in KPI pages and leaderboards

## Alias Resolution (Query-Time)

New function in `lib/api-utils.ts`:

```ts
async function buildAliasMap(): Promise<Map<string, string>>
```

- Reads all Reps (active + archived) from DB
- Returns `Map<rawSheetName, canonicalDisplayName>`
- Each alias entry maps to the rep's `displayName`
- The rep's `displayName` itself is also in the map (identity mapping)

`aggregate()` in `lib/sheet-sync.ts` gets a new optional parameter:

```ts
function aggregate(records, from, to, label, aliasMap?: Map<string, string>)
```

- If `aliasMap` is provided, every `r.name` is resolved through it before grouping
- Unrecognized names (not in any alias list) pass through unchanged
- All pages that call `aggregate()` or group by name pass the alias map

## API Routes

### GET /api/reps
- Returns all reps, optionally filtered by `?status=active`
- Default: returns active reps only

### POST /api/reps
- Body: `{ displayName, aliases?, roles?, targets? }`
- Validates: displayName required, non-empty
- Validates: no alias conflicts (alias not already claimed by another rep)
- Returns created rep

### PUT /api/reps/[id]
- Body: partial update of any field
- Same alias conflict validation
- Returns updated rep

### DELETE /api/reps/[id]
- Hard delete (rep is just metadata, not linked to records)
- Returns 404 if not found

## Page UI (`/rep-management`)

Server component with client sub-component for CRUD dialogs.

### Sections (top to bottom)

1. **Unrecognized names banner** — if synced records contain names not in any rep's alias list, show amber warning: "X unrecognized names in synced data" with a list. Each name has an "Add as rep" action that pre-fills the add dialog.

2. **Roster table** — columns: Name, Roles (badges), Status, Current Month Target, Records (count from synced data). "Add Rep" button in header. Each row has Edit and Archive/Restore actions.

3. **Show archived toggle** — text link below table to show/hide archived reps (via `?showArchived=true` searchParam).

### Add/Edit Dialog

Reuses existing Dialog pattern from offers page. Fields:
- Display Name (text input, required)
- Aliases (comma-separated text input, shows "e.g., Lucio, lucio, Lucio R")
- Roles (checkboxes: Closer, Phone Setter, DM Setter)
- Status (active/archived toggle, edit only)
- Target for current month (number input with label showing month name)

### Archive Behavior

- Archived reps: hidden from roster by default, toggle to show
- Archived reps still appear in leaderboards, KPI pages, and aggregation
- Archived reps cannot have new targets set (UI disables target field)

## Files Modified

- `prisma/schema.prisma` — add Rep model
- `lib/api-utils.ts` — add `buildAliasMap()`, `readReps()`, `createRep()`, `updateRep()`, `deleteRep()`
- `lib/sheet-sync.ts` — add optional `aliasMap` param to `aggregate()`, apply in name grouping
- `app/api/reps/route.ts` — new: GET/POST
- `app/api/reps/[id]/route.ts` — new: PUT/DELETE
- `app/rep-management/page.tsx` — full rewrite: server component with data loading
- `app/rep-management/_components/rep-crud.tsx` — new: client component for CRUD dialogs + table interactions
- `app/dashboard/page.tsx` — pass alias map to aggregate()
- `app/leaderboard/page.tsx` — pass alias map to aggregate()
- `app/closer-kpis/page.tsx` — apply alias map to record names
- `app/setter-kpis/page.tsx` — apply alias map to record names

## Verification

1. `npx prisma db push` — creates Rep table
2. `npm run build` — type-check passes
3. Manual: create a rep with aliases, sync data, verify names merge in dashboard/leaderboard/KPI pages
4. Manual: archive a rep, verify hidden from roster but visible in leaderboards
5. Manual: set a monthly target, verify it displays in the roster table
