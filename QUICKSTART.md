# Pod 3 Dashboard - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Clone/Download This Project
```bash
cd "d:\Work downloads\Pod 3 dashboard"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Sheets API
4. Create OAuth 2.0 credentials (Web application)
5. Save your Client ID and Client Secret

### Step 4: Configure Environment
```bash
# Copy and rename the example file
copy .env.local.example .env.local

# Edit .env.local with your values:
GOOGLE_CLIENT_ID=your_id_here
GOOGLE_CLIENT_SECRET=your_secret_here
GOOGLE_SHEET_ID=your_sheet_id_here
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
```

### Step 5: Run the Dashboard
```bash
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## 📋 Pre-requisites Checklist

- [ ] Node.js 18+ installed
- [ ] Google account with access to your Leads Tracking sheet
- [ ] Google Cloud project created
- [ ] Google Sheets API enabled
- [ ] OAuth2 credentials generated
- [ ] Sheet shared with your Google account
- [ ] Sheet ID copied
- [ ] Environment variables configured

---

## 🔑 Getting Your Google Credentials

### Get Client ID & Secret:
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select project → Credentials
3. Click "Create Credentials" → "OAuth client ID"
4. Choose "Web application"
5. Add authorized origins and URIs (see README.md)
6. Copy Client ID and Secret

### Get Sheet ID:
Open your Google Sheet and copy the ID from the URL:
```
https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_SHEET_ID]/edit
```

---

## 🛠️ Common Issues

### "Unauthorized" Error
→ Make sure you've shared the Google Sheet with your account

### Port 3000 Already In Use
→ Use: `npm run dev -- -p 3001`

### CSS Not Loading
→ Run: `npm run build` then `npm run dev`

---

## 📊 Verifying It Works

1. Run `npm run dev`
2. Click "Sign in with Google"
3. Grant permissions
4. See your Pod 3 leads displayed

---

## 📚 Next Steps

1. Deploy to Vercel (see README.md)
2. Add more team members
3. Customize charts and filters
4. Export reports as needed

---

## 💡 Tips

- Use `npm run dev` for local development
- Use `npm run build && npm run start` to test production build
- Check browser console (F12) for errors
- Check `/api/leads` endpoint directly in browser

---

## 📞 Need Help?

See the comprehensive troubleshooting section in README.md
