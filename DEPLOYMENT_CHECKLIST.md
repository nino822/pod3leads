# Pod 3 Dashboard - Deployment Checklist

## Pre-Deployment

- [ ] All dependencies installed (`npm install`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No console errors (`npm run dev`)
- [ ] All features tested locally
- [ ] Environment variables configured (.env.local)
- [ ] Google Sheets data parsing works
- [ ] Authentication works locally

## Git Setup

- [ ] Repository created on GitHub
- [ ] All files committed
- [ ] No sensitive data in commits (.env.local in .gitignore)
- [ ] Main branch is clean and stable
- [ ] Repository is public or Vercel has access

## Google OAuth2 Setup

- [ ] Google Cloud project created
- [ ] Google Sheets API enabled
- [ ] OAuth2 credentials generated (Client ID & Secret)
- [ ] Callback URI includes your Vercel domain:
  ```
  https://[PROJECT_NAME].vercel.app/api/auth/callback/google
  ```

## Vercel Configuration

- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Environment variables added:
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_SHEET_ID`
  - [ ] `NEXTAUTH_SECRET` (new value for production)
  - [ ] `NEXTAUTH_URL` (your Vercel domain)

## Environment Variables (Exact Names)

```
GOOGLE_CLIENT_ID=<your_client_id>
GOOGLE_CLIENT_SECRET=<your_client_secret>
GOOGLE_SHEET_ID=<your_sheet_id>
NEXTAUTH_SECRET=<generate_new_one>
NEXTAUTH_URL=https://<yourproject>.vercel.app
```

### Generate NEXTAUTH_SECRET for Production

```bash
openssl rand -base64 32
```

Copy the output and paste into Vercel environment variables.

## Google Sheet Verification

- [ ] Sheet contains two tabs:
  - [ ] "Leads Tracking"
  - [ ] "Leads Tracking 2025"
- [ ] Data has correct format (dates in M/DD/YY)
- [ ] Pod column contains "Pod 3" entries
- [ ] Sheet is publicly readable or shared with auth account

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Visit https://vercel.com/new
   - Select GitHub repository
   - Leave default build settings
   - Click "Deploy"

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all 5 variables above
   - Save and redeploy

4. **Update OAuth Redirects**
   - Go to Google Cloud Console
   - Credentials → OAuth 2.0 Client ID
   - Add Authorized redirect URI:
     ```
     https://[PROJECT].vercel.app/api/auth/callback/google
     ```

5. **Test Deployment**
   - Visit your Vercel domain
   - Click "Sign in with Google"
   - Grant permissions
   - Verify data loads

## Post-Deployment

- [ ] Sign in works with Google
- [ ] Dashboard loads without errors
- [ ] Charts display correctly
- [ ] Data from Google Sheets appears
- [ ] Filters work
- [ ] Export functions work
- [ ] Mobile responsive (test on phone)
- [ ] No console errors in browser (F12)

## Performance Checks

- [ ] Page loads in <3 seconds
- [ ] Caching headers present
- [ ] API endpoint responds
- [ ] Charts render smoothly
- [ ] No memory leaks in console

## Security Checklist

- [ ] HTTPS enabled (automatic on Vercel)
- [ ] .env.local not in git
- [ ] OAuth secret is unique for production
- [ ] OAuth credentials are not hardcoded
- [ ] API endpoint requires authentication
- [ ] No sensitive data in client-side code

## Common Issues & Solutions

### Deployment Failed
- Check build logs in Vercel
- Verify all environment variables are set
- Check Node.js version (14+ required)

### "Unauthorized" After Deploy
- Verify NEXTAUTH_SECRET is set
- Check Google OAuth is configured correctly
- Verify callback URI matches exactly

### Data Not Loading
- Check GOOGLE_SHEET_ID is correct
- Verify sheet sharing/permissions
- Check API logs in Google Cloud Console

### CSS/Styling Issues
- Clear Vercel cache and redeploy
- Check tailwindcss in package.json

### Sign-In Loop
- NEXTAUTH_URL incorrect
- OAuth callback URI mismatch
- Clear browser cookies and try again

## Monitoring

- [ ] Set up Vercel Analytics
- [ ] Monitor serverless function duration
- [ ] Check API response times
- [ ] Set up error notifications

## Team Access

- [ ] Team members added to Vercel project
- [ ] Google Sheets shared with team members
- [ ] Documentation shared with team
- [ ] Support contact information shared

## Documentation

- [ ] README.md is comprehensive
- [ ] QUICKSTART.md is clear
- [ ] Environment example is filled out
- [ ] Troubleshooting covers common issues

## Maintenance

- [ ] Schedule monthly data reviews
- [ ] Update dependencies quarterly
- [ ] Monitor storage/quotas
- [ ] Plan for growth/scaling

---

## First Deployment Checklist Summary

Before your first `git push`:

```
✅ npm install
✅ npm run build (succeeds)
✅ npm run dev (works locally)
✅ Google OAuth2 setup done
✅ .env.local configured with real values
✅ All files committed (except .env.local)
✅ README.md reviewed
```

Before connecting to Vercel:

```
✅ GitHub repo created and pushed
✅ Vercel account with GitHub connected
✅ NEXTAUTH_SECRET generated (new one)
✅ All 5 env variables ready to paste
```

After Vercel deployment:

```
✅ Update Google OAuth redirect URIs
✅ Test sign-in works
✅ Verify data loads
✅ Check console for errors
```

---

## Support

If you get stuck:
1. Check the Troubleshooting sections in README.md
2. Review Vercel build logs
3. Check Google Cloud OAuth settings
4. Review NextAuth.js documentation
