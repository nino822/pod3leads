# Pod 3 Leads Dashboard

Dashboard for tracking Pod 3 client leads from Google Sheets with Google OAuth, invite-only access, weekly/monthly analytics, and export tools.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- NextAuth.js (Google OAuth)
- Prisma ORM
- Tailwind CSS + Framer Motion
- Recharts
- Google Sheets API
- Nodemailer (invite emails)

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
DATABASE_URL=file:./dev.db

# Optional Sheets service-account fallback
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=

# Required for invite email sending
GMAIL_USER=
GMAIL_APP_PASSWORD=

# Optional: disable in production by default
ALLOW_FIRST_USER_BOOTSTRAP=false
```

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
- `GMAIL_USER` (if using invite emails)
- `GMAIL_APP_PASSWORD` (if using invite emails)
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