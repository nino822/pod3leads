# Setup Instructions for User Management

## Initial Setup

1. **Add DATABASE_URL to .env.local**
   ```bash
   echo 'DATABASE_URL="file:./dev.db"' >> .env.local
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize the database**
   ```bash
   npm run db:push
   ```

## First Time User Setup

Since we've added invite-only access, you need to manually add yourself as the first user:

1. **Start Prisma Studio**
   ```bash
   npm run db:studio
   ```

2. **Add your email to the Invite table**
   - Click on "Invite" model
   - Click "Add record"
   - Fill in:
     - `email`: your Google account email
     - `name`: your name
     - `invitedBy`: (leave empty for now, we'll handle this)
   - Click "Save 1 change"

3. **Sign in to the dashboard**
   - Go to http://localhost:3001/dashboard
   - Click "Sign in with Google"
   - Use the email you just invited

4. **Set your display name**
   - Click on your profile (top right)
   - Click "Settings"
   - Enter your display name
   - Click "Save"

## Inviting Other Users

1. Go to Settings (Profile → Settings)
2. In the "Invite Users" section:
   - Enter the user's email address
   - Enter their name
   - Click "Add Invite"
3. The invited user can now sign in with that Google account

## Features

### Display Name
- Set a custom display name instead of showing your email
- Appears in the welcome message and profile dropdown

### Profile Dropdown
- Click your avatar/name in the top right
- Access Settings
- Sign Out

### Invite Management
- Invite users by email and name
- View all invited users
- Remove invites if needed

### Session Duration
- Sessions last 24 hours
- Won't be logged out unless you click Sign Out
- Refresh the page anytime without losing session

## Database Management

### View database contents
```bash
npm run db:studio
```

### Reset database (WARNING: deletes all data)
```bash
# Delete the database file
Remove-Item -Path "prisma\dev.db" -Force
# Recreate database
npm run db:push
```

### Update database schema
After modifying `prisma/schema.prisma`:
```bash
npm run db:push
```

## Troubleshooting

### "User not authorized" error
- Make sure your email is in the Invite table
- Check that you're signing in with the correct Google account

### Database errors
- Make sure DATABASE_URL is in your .env.local file
- Run `npm run db:push` to create/update the database

### Session expires too quickly
- Sessions are set to 24 hours
- If you're still experiencing issues, check browser cookies are enabled
