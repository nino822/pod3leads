# Migration from API Key to OAuth2

## Overview

This dashboard has been upgraded from service account API keys to **Google OAuth2 authentication**. This provides better security, user authentication, and compliance with Google's recommended practices.

## Key Changes

### Before (API Key Approach)
```typescript
// Old: Used service account JSON with private key
const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  undefined,
  process.env.GOOGLE_PRIVATE_KEY,
  ["https://www.googleapis.com/auth/spreadsheets.readonly"]
);
```

### After (OAuth2 Approach)
```typescript
// New: Uses user's Google account via OAuth2
const oauth2Client = new google.auth.OAuth2();
oauth2Client.setCredentials({
  access_token: session.accessToken,
  refresh_token: session.refreshToken,
});
```

## Benefits

| Feature | API Key | OAuth2 |
|---------|---------|--------|
| User Authentication | ❌ None | ✅ Google Sign-In |
| Security | ⚠️ Shared key | ✅ User tokens |
| Token Expiry | ❌ No | ✅ Auto-refresh |
| Multiple Users | ❌ Single account | ✅ Multiple accounts |
| Compliance | ⚠️ Less secure | ✅ Industry standard |
| Audit Trail | ❌ No | ✅ Per-user logs |

## What You Need to Do

### 1. Set Up Google Cloud OAuth2
Follow the setup instructions in README.md to get:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 2. Remove Old Service Account
You can keep or remove these (used as fallback):
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

### 3. Users Must Sign In
Each user now signs in with their Google account instead of sharing credentials.

### 4. Grant Sheet Access
Share the Google Sheet with each user's Google account.

## Architecture Changes

### API Route Security
```typescript
// Now checks user authentication
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  // Fetch with user's credentials
}
```

### Environment Variables

**Old (.env):**
```
GOOGLE_CLIENT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
```

**New (.env.local):**
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
```

## Session Management

The dashboard now uses NextAuth.js to manage:
- Google authentication
- Token storage (secure, httpOnly cookies)
- Token refresh (automatic)
- Session validation

## Data Privacy

- No credentials stored in code
- User tokens encrypted in session
- Each user has their own access scope
- Audit trail via Google's API logs

## Fallback Mechanism

For backward compatibility, if OAuth2 fails, the app tries service account credentials (if configured):

```typescript
try {
  // Try OAuth2 first
  data = await fetchSheetWithOAuth(session, range);
} catch (error) {
  // Fallback to service account
  data = await fetchSheetWithServiceAccount(range);
}
```

## Multi-User Support

OAuth2 enables multiple users with different sheets:

```typescript
// Each user sees only their authorized sheets
const sheets = google.sheets({
  version: "v4",
  auth: oauth2Client  // User-specific auth
});
```

## Troubleshooting Migration

### Users Getting "Unauthorized"
- Verify sheet is shared with their Google account
- Check OAuth credentials are correct
- Clear browser cookies and sign in again

### Sheet Not Accessible
- Check sheet sharing (must be "Viewer" or "Editor")
- Verify sheet ID is correct
- Test with `/api/leads` endpoint

### Token Expiration Issues
- NextAuth handles refresh automatically
- Users might need to sign in again after 14 days
- Check browser console for auth errors

## Rollback (If Needed)

To revert to service account approach:
1. Remove OAuth2 variables
2. Use `fetchSheetWithServiceAccount()` directly
3. Remove NextAuth configuration

## Questions?

See:
- README.md - Full documentation
- lib/auth.ts - NextAuth configuration
- lib/sheets.ts - Both auth methods
- app/api/auth/[...nextauth]/route.ts - Auth endpoint
