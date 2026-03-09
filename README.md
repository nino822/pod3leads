# Pod 3 Leads Dashboard

A modern Next.js 14 dashboard for tracking and analyzing Pod 3 leads from Google Sheets, with OAuth2 authentication and real-time data visualization.

## Features

- 🔐 **Google OAuth2 Authentication** - Secure sign-in with Google accounts
- 📊 **Real-time Dashboard** - Live stats for weekly/monthly leads
- 📈 **Interactive Charts** - Leads per client, trends, top/low performers
- 🔍 **Advanced Filtering** - Filter by client, year, month, week
- 📥 **Data Export** - CSV download and PDF printing
- ⚡ **Performance Optimized** - Edge caching and server-side rendering
- 🎨 **Modern UI** - Tailwind CSS with Framer Motion animations

## Architecture

```
Google Sheets
    ↓
Google Sheets API (OAuth2)
    ↓
Next.js API Route (/api/leads)
    ↓
Data Transformer (Weekly/Monthly Aggregation)
    ↓
Dashboard Components
    ↓
Interactive Charts & Tables
```

## Prerequisites

Before starting, ensure you have:

- Node.js 18+ installed
- A Google Cloud project with Sheets API enabled
- A Google Sheet with the following tabs:
  - `Leads Tracking` (current year data)
  - `Leads Tracking 2025` (past year data)

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project named `pod3-leads-dashboard`
3. Enable the Google Sheets API:
   - Search for "Google Sheets API"
   - Click "Enable"

### 2. Create OAuth2 Credentials

1. In Google Cloud Console, go to **Credentials**
2. Create OAuth 2.0 Client ID:
   - Type: Web application
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://yourdomain.com/api/auth/callback/google`
3. Copy the Client ID and Client Secret

### 3. Share Google Sheet with OAuth Account

1. Open your Google Sheet
2. Share it with the Google account that will authenticate
3. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_SHEET_ID=1VIVL1rMYhYRsLZYxqgPGzX1LWpZnvpF0s3p5_eGRKKU
   NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
   NEXTAUTH_URL=http://localhost:3000
   ```

   Generate NEXTAUTH_SECRET:
   ```bash
   openssl rand -base64 32
   ```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
pod3-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts          # NextAuth configuration
│   │   └── leads/
│   │       └── route.ts          # Leads API endpoint
│   ├── dashboard/
│   │   └── page.tsx              # Main dashboard page
│   ├── layout.tsx                # Root layout with Session
│   └── page.tsx                  # Home (redirects to dashboard)
├── components/
│   ├── ClientTable.tsx           # Leads table
│   ├── Charts.tsx                # Recharts visualizations
│   ├── Filters.tsx               # Filter controls
│   ├── PodStats.tsx              # Stats cards
│   └── ExportButtons.tsx         # CSV/PDF export
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   ├── sheets.ts                 # Google Sheets API integration
│   └── transform.ts              # Data transformation logic
├── types/
│   └── next-auth.d.ts            # Auth type extensions
├── .env.local                    # Environment variables (not in git)
├── .env.local.example            # Example env variables
├── package.json
├── tsconfig.json
└── next.config.js
```

## Google Sheet Format

Your Google Sheet should have this structure:

| Client | Pod | 1/1/26 | 1/2/26 | 1/3/26 | ... |
|--------|-----|--------|--------|--------|-----|
| Client A | Pod 3 | 2 | 3 | 1 | ... |
| Client B | Pod 3 | 4 | 2 | 5 | ... |
| Client C | Pod 3 | 1 | 2 | 1 | ... |

**Important:**
- Date columns must be in `M/DD/YY` format
- Two tabs: `Leads Tracking` (current) and `Leads Tracking 2025` (past)
- Pod column should contain "Pod 3" for filtering

## API Endpoints

### GET /api/leads

Returns aggregated leads data for Pod 3.

**Response:**
```json
{
  "success": true,
  "clients": [
    {
      "client": "Client A",
      "weekly": 6,
      "monthly": 22,
      "status": "active"
    }
  ],
  "podStats": {
    "weekly": 48,
    "monthly": 180,
    "activeClients": 5
  },
  "lastUpdated": "2026-03-07T..."
}
```

**Requirements:**
- User must be authenticated via OAuth2
- Returns 401 if not authenticated

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/pod3-dashboard.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Click "Import"

### 3. Add Environment Variables

In Vercel project settings, add:

```
GOOGLE_CLIENT_ID = your_client_id
GOOGLE_CLIENT_SECRET = your_client_secret
GOOGLE_SHEET_ID = 1VIVL1rMYhYRsLZYxqgPGzX1LWpZnvpF0s3p5_eGRKKU
NEXTAUTH_SECRET = generate_new_value
NEXTAUTH_URL = https://your-project.vercel.app
```

### 4. Update Google OAuth Redirects

In Google Cloud Console, add to Authorized redirect URIs:
```
https://your-project.vercel.app/api/auth/callback/google
```

### 5. Deploy

Vercel will automatically deploy from the main branch.

## Features Breakdown

### Authentication
- Users sign in with their Google account
- OAuth2 tokens are securely stored in NextAuth session
- Automatic token refresh for expired sessions

### Data Fetching
- Server-side API route with caching (10 min default)
- Uses OAuth2 access token from session
- Fallback to service account if configured
- Error handling and user messaging

### Data Transformation
- Parses daily lead values from spreadsheet
- Aggregates into weekly and monthly totals
- Marks paused clients
- Sorts active clients first

### Dashboard
- Stats cards showing current week/month/clients
- Interactive filters (year, client, month, week)
- Animated table with sorting
- Multiple chart types (bar, line)
- Export to CSV and print to PDF

## Paused Clients

Clients in the `PAUSED_CLIENTS` array in `lib/transform.ts` are:
- Displayed at the bottom of tables
- Marked with gray styling
- Excluded from some calculations

To modify, edit:
```typescript
const PAUSED_CLIENTS = ["Client A", "Client B", "Client C"];
```

## Performance Optimization

- **Server-side rendering:** Data fetched on server
- **Edge caching:** 10-minute cache via Vercel
- **Code splitting:** Dynamic component imports
- **Image optimization:** Next.js Image component
- **Minimal bundle:** Only required libraries

## Troubleshooting

### "Unauthorized" Error
- Check Google OAuth credentials are correct
- Verify sheet is shared with your Google account
- Ensure `GOOGLE_SHEET_ID` matches your sheet

### Charts Not Showing
- Check browser console for errors
- Verify data is being fetched (`/api/leads`)
- Ensure clients have monthly data

### Vercel Deployment Failed
- Check environment variables are set
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Review build logs in Vercel dashboard

### Sheet Data Not Updating
- Check caching headers (revalidate: 600)
- Manually refresh in dashboard
- For immediate updates, reduce cache time

## Future Enhancements

- [ ] Multi-pod support (switch between pods)
- [ ] Real-time Slack notifications
- [ ] Leaderboard view
- [ ] Date range picker
- [ ] Email reports
- [ ] Database for historical tracking
- [ ] Admin panel for configuration

## Technology Stack

- **Framework:** Next.js 16.1.6 (App Router), React 19.2.4, TypeScript 5
- **Styling & Animations:** Tailwind CSS 3.3.0, Framer Motion 12.35.1
- **Data Visualization:** Recharts 2.15.4
- **Authentication:** NextAuth.js 4.24.0 with Google OAuth2
- **Database:** Prisma 5.0.0 (SQLite)
- **APIs:** Google Sheets API v4, Nodemailer 7.0.13 (for email invites)
- **Export/Import:** XLSX 0.18.5, html2canvas 1.4.1, jsPDF 2.5.2, PapaParse 5.4.1
- **Date Handling:** date-fns 2.30.0
- **Deployment:** Vercel
- **Data Source:** Google Sheets (OAuth2 + Service Account fallback)

## License

MIT License - feel free to use and modify!

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Google Sheets API documentation
3. Check NextAuth.js documentation
4. Review browser console for errors
#   p o d 3 l e a d s  
 