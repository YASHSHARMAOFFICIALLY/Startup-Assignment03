# Per-Rep Profile — Design Spec

## Context

The rep management page now has a full roster with CRUD, aliases, and targets. The next step is a detail page for each rep — the "profile" view that surfaces personal KPIs, funnels, trends, objections, and reflections. Every name displayed across the app becomes a link to this profile.

## Route

`/rep-management/[repId]` — async server component with `force-dynamic`.

## Data Loading

1. Load Rep by ID from Prisma (`prisma.rep.findUnique`)
2. If not found, return 404 via `notFound()`
3. Load all records via `readAllRecords()`
4. Build alias set from rep's `displayName` + `aliases`
5. Filter records where `r.name` is in the alias set
6. Compute per-rep KPIs, funnel, rank, trends from filtered records

## Page Sections

### 1. Header
- Display name (large), role badges, status badge (if archived)
- Back link to `/rep-management`
- Target progress bar: if rep has a target for the current month, show `current / target` with a fill bar. Closers use cash, setters use calls booked.

### 2. Hero KPIs (4-5 metrics)
Role-aware — show different metrics based on rep's roles:
- **Closer:** Cash, Revenue, Deals Closed, Close Rate, Avg Deal
- **Phone:** Booked, Shows, Set Rate, Show Rate, Dials/Hr
- **DM:** Booked, Live Calls, Book Rate, Show Rate, Revenue

If a rep has multiple roles, show the primary role's KPIs (first role in the array).

### 3. Personal Funnel
Reuse `FunnelBar` component with this rep's data:
- Closer: Total Calls -> Live -> Offers -> Closed
- Phone: Dials -> Pickups -> Q Convos -> Booked -> Shows
- DM: Convos -> Follow-Ups -> Booked -> Live Calls

### 4. Rank + Rank-Change
Show current rank position: "#2 of 5 closers by cash"
Compute rank-change vs prior period using `aggregate()` + `priorRange()`.
Reuse `RankChange`-style display (green up arrow, red down, dash for unchanged).

### 5. Trend Sparklines
Client sub-component (Recharts needs browser). Show 2 cumulative daily sparklines:
- Closers: cash trend + deals trend
- Setters: booked trend + revenue trend

Build daily cumulative arrays from the filtered records, same pattern as `dailyTrends()` in sheet-sync.ts.

### 6. Objections + Reflections
Reuse `ObjectionPanel` component, passing this rep's filtered records.

## Name Linking

### New helper: `buildNameToRepIdMap()`
In `lib/api-utils.ts`:
```ts
async function buildNameToRepIdMap(): Promise<Map<string, string>>
```
Returns `Map<rawSheetName, repId>`. Built from all reps' displayName + aliases.

### Pages to update
Add name links on these pages (wrap name `<td>` in `<Link>`):
- `app/closer-kpis/page.tsx` — rep name column
- `app/setter-kpis/page.tsx` — rep name column (phone + DM tables)
- `app/leaderboard/page.tsx` — rep name column (closers + setters tables + podium)
- `app/rep-management/_components/rep-crud.tsx` — roster name column

Names without a matching repId (not in roster) render as plain text.

## Files

- Create: `app/rep-management/[repId]/page.tsx` — server component
- Create: `app/rep-management/[repId]/_components/rep-trends.tsx` — client component for sparklines
- Modify: `lib/api-utils.ts` — add `buildNameToRepIdMap()`
- Modify: `app/closer-kpis/page.tsx` — name links
- Modify: `app/setter-kpis/page.tsx` — name links
- Modify: `app/leaderboard/page.tsx` — name links
- Modify: `app/rep-management/_components/rep-crud.tsx` — name links

## Verification

1. `npm run build` — type-check passes
2. Visit `/rep-management/[repId]` for a rep with synced data — all sections render
3. Visit for a rep with no matching records — shows empty states
4. Click a name on closer-kpis/setter-kpis/leaderboard — navigates to profile
5. Names not in roster — render as plain text, no broken links
