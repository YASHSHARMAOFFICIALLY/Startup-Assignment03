# Sales.io OS

Sales.io OS is a private Next.js dashboard for tracking sales-team performance from Google Sheets. It supports offer-level sheet connections, manual and cron sync, closer/setter KPIs, leaderboards, rep aliases, rep profiles, and workspace settings.

## Stack

- Next.js 15 App Router
- React 18
- Prisma with PostgreSQL
- NextAuth credentials auth, with optional Google OAuth
- Tailwind CSS

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in required values:

```bash
cp .env.example .env.local
```

Required:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Optional:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `CRON_SECRET`
- `NEXT_PUBLIC_USER_NAME`
- `NEXT_PUBLIC_USER_AVATAR`

3. Prepare the database:

```bash
npm run db:push
```

4. Create the first admin user either through the login page signup flow or with:

```bash
ADMIN_EMAIL=you@company.com ADMIN_PASSWORD=securepass123 ADMIN_NAME="Your Name" npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Google Sheets

Each offer needs three public Google Sheets URLs. The sheets must be shared as `Anyone with the link can view`.

Required tab names:

- `Tally_Closer_Raw`
- `Tally_PhoneSetter_Raw`
- `Tally_DMSetter_Raw`

The app reads the configured tabs, stores normalized records in Postgres, and aggregates dashboards from the stored records.

## Sync

- Manual sync is available from the Offers page.
- Browser auto-sync runs from the dashboard and is rate-limited server-side.
- `/api/cron/sync` can be called by Vercel Cron and requires `Authorization: Bearer $CRON_SECRET`.

## Delivery Checks

Run these before shipping:

```bash
npm run build
npx tsc --noEmit
npm run lint
```

Current expected status: all pass.
