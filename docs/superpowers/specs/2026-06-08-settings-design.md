# Settings Enhancement — Design Spec

## Context

The settings page currently shows read-only profile info, sync status, and a Google Sheets guide. Two key gaps: `commissionsPaid` is hardcoded to 0 in `aggregate()`, and every page hardcodes `"last-month"` as the default period. This spec adds a Settings model with commission rate and default period, wires them into all data views.

## Prisma Model

```prisma
model Settings {
  id             String   @id @default("default")
  commissionRate Float    @default(0)
  defaultPeriod  String   @default("last-month")
  updatedAt      DateTime @updatedAt
}
```

Single-row table — id is always "default". Created on first read if missing.

## Commission Flow

- `aggregate()` gets a new optional `commissionRate?: number` param
- Replaces `commissionsPaid: 0` with `commissionsPaid: Math.round(cCash * commissionRate / 100)`
- All callers of `aggregate()` (dashboard, leaderboard) pass the rate from settings

## Default Period Flow

- Pages currently fallback to `"last-month"` when no `?period=` searchParam
- Change to use `settings.defaultPeriod` instead
- Topbar PeriodSelector also uses it as the initial selected value when no param is set
- Affected pages: dashboard, leaderboard, closer-kpis, setter-kpis, rep-management/[repId]

## API Routes

### GET /api/settings
- Returns settings row
- Creates default row if none exists (upsert pattern)
- Auth-protected

### PUT /api/settings
- Body: `{ commissionRate?: number, defaultPeriod?: string }`
- Validates: commissionRate 0-100, defaultPeriod is valid PeriodKey
- Auth-protected

## Settings Page UI

Rewrite as client component with form sections:

1. **Commission** — number input (0-100) with "%" label, current value pre-filled, save button
2. **Default Period** — dropdown with existing PERIOD_OPTIONS (excluding "custom"), save button
3. **Sync Status** — keep existing (offer count, last sync timestamp)
4. **Google Sheets Setup** — keep existing guide

## Files

- Modify: `prisma/schema.prisma` — add Settings model
- Create: `lib/settings.ts` — readSettings(), updateSettings(), Zod schema
- Create: `app/api/settings/route.ts` — GET/PUT
- Rewrite: `app/settings/page.tsx` — client component with forms
- Modify: `lib/sheet-sync.ts` — add commissionRate param to aggregate()
- Modify: `app/dashboard/page.tsx` — pass commission rate, use default period
- Modify: `app/leaderboard/page.tsx` — pass commission rate, use default period
- Modify: `app/closer-kpis/page.tsx` — use default period
- Modify: `app/setter-kpis/page.tsx` — use default period
- Modify: `app/rep-management/[repId]/page.tsx` — use default period

## Verification

1. `npx prisma db push` — creates Settings table
2. `npm run build` — type-check passes
3. Set commission to 10% — dashboard shows commissionsPaid = 10% of cash
4. Set default period to "this-month" — all pages default to this month when no param
5. Existing `?period=` searchParams still override the default
