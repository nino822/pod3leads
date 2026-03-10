# Pod 3 Leads Dashboard

Dashboard for tracking Pod 3 client leads from Google Sheets with Google OAuth, invite-only access, weekly/monthly analytics, and export tools.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- NextAuth.js (Google OAuth)
- Prisma ORM
- Tailwind CSS + Framer Motion
- Recharts
- Google Sheets API
- Resend API (primary emails) + Nodemailer Gmail fallback

## Features

- Google sign-in and invite-only access
- Weekly and monthly leads analytics
- Week-level graph mode (W1-W52/53)
- Status filters and monthly/weekly views
- Team performance and at-risk accounts
- CSV, Excel, PNG, PDF exports

## Local Setup

### Prerequisites

- Node.js 18+
- Google Cloud project with Sheets API enabled
- Google OAuth client

### Install

```bash
npm install
```

### Environment

Create `.env.local` from `.env.local.example` and fill values:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SHEET_ID=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@POOLER_HOST:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://USER:PASSWORD@DB_HOST:5432/postgres?sslmode=require

# Optional Sheets service-account fallback
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=

# Preferred email provider
RESEND_API_KEY=
# Optional (defaults to onboarding@resend.dev)
RESEND_FROM_EMAIL=

# Optional Gmail fallback provider
GMAIL_USER=
GMAIL_APP_PASSWORD=

# Optional: force display sender name/email in inbox
EMAIL_FROM_NAME=Pod 3 Dashboard
EMAIL_FROM_EMAIL=

# Optional: disable in production by default
ALLOW_FIRST_USER_BOOTSTRAP=false
```

PostgreSQL note:

- Set `DATABASE_URL` to a pooled/session connection string (PgBouncer) for runtime.
- Set `DIRECT_URL` to the direct database connection for Prisma migrations.
- Include `pgbouncer=true` in pooled URLs to avoid prepared statement collisions.

### Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deployment (Vercel)

Set these environment variables in Vercel:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_SHEET_ID`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your production URL)
- `DATABASE_URL` (hosted DB for production)
- `RESEND_API_KEY` (recommended)
- `RESEND_FROM_EMAIL` (recommended)
- `GMAIL_USER` (optional fallback)
- `GMAIL_APP_PASSWORD` (optional fallback)
- `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` (optional fallback)
- `ALLOW_FIRST_USER_BOOTSTRAP=false` (recommended)

Update Google OAuth redirect URI:

`https://your-domain/api/auth/callback/google`

## Security Notes

- Never commit `.env.local`.
- Use placeholders only in `.env.local.example`.
- Rotate any credential that was ever committed to git history.
- For production on Vercel, use hosted Postgres instead of SQLite file storage.

## License

MIT