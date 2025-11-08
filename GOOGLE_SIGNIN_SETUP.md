# Google Sign-In Setup Guide

This guide will help you set up Google Sign-In for your AgriTrade application using Supabase.

## Prerequisites

- Supabase project with Google OAuth provider configured
- Expo app with environment variables set
- Backend deployed on Render

## Step 1: Configure Google OAuth in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to **Authentication** > **Providers**
3. Find **Google** in the list and click on it
4. Enable the Google provider
5. You'll need to create OAuth credentials in Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Go to **Credentials** > **Create Credentials** > **OAuth client ID**
   - Choose **Web application** as the application type
   - Add authorized redirect URIs:
     - For Supabase: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     - For local development: `http://localhost:8081` (if using Expo web)
   - Copy the **Client ID** and **Client Secret**
6. Paste the Client ID and Client Secret into Supabase Google provider settings
7. Save the configuration

## Step 2: Configure Redirect URLs in Supabase

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Add your app's redirect URL to **Redirect URLs**:
   - For mobile: `mobile://` (or your custom scheme)
   - For development: `exp://localhost:8081` (if using Expo Go)
3. Add the same URLs to **Site URL** if needed

## Step 3: Set Environment Variables

### Mobile App (Expo)

Make sure you have these in your `.env` file or Expo environment:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (Render)

In your Render dashboard, add these environment variables:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
```

**Important**: Use the **Service Role Key** (not the anon key) for backend operations. You can find it in Supabase Dashboard > **Settings** > **API**.

## Step 4: Update App Configuration

The app configuration has been updated in `app.json` to include:
- Scheme: `mobile://` (for deep linking)
- Supabase environment variables

## Step 5: Test the Implementation

1. Start your Expo app:
   ```bash
   cd mobile
   npm start
   ```

2. Test Google Sign-In:
   - Open the login or signup screen
   - Click "Continue with Google" or "Sign up with Google"
   - You should be redirected to Google's sign-in page
   - After signing in, you'll be redirected back to the app
   - The app should authenticate and redirect you to the appropriate screen

## Troubleshooting

### Issue: "Redirect URL mismatch"

**Solution**: Make sure the redirect URL in Supabase matches exactly what's configured in your app. Check:
- Supabase Dashboard > Authentication > URL Configuration
- Your app's scheme in `app.json`
- Google Cloud Console OAuth redirect URIs

### Issue: "Invalid authentication token" on backend

**Solution**: 
- Verify that `SUPABASE_SERVICE_ROLE_KEY` is set correctly in Render
- Check that the backend can access Supabase (network/firewall issues)

### Issue: OAuth flow doesn't complete

**Solution**:
- Make sure `expo-web-browser` is installed (it should be)
- Check that the redirect URL scheme matches in both Supabase and your app
- For iOS, you may need to configure associated domains
- For Android, check that the intent filter is configured correctly

### Issue: User creation fails

**Solution**:
- Check that the database schema allows NULL passwords (for OAuth users)
- Verify that the `users` and `profiles` tables exist and are properly configured
- Check backend logs for specific error messages

## Additional Notes

- Google Sign-In users will have a randomly generated password hash (they won't use it)
- Users can sign in with Google even if they previously signed up with email/password (if same email)
- The role selection on signup screen applies to new Google Sign-In users
- Existing users can also link their Google account (future enhancement)

## Security Considerations

- Never expose the Service Role Key in the mobile app
- Always verify tokens on the backend
- Use HTTPS for all API calls
- Regularly rotate your OAuth credentials

## Next Steps

After setup, you can:
1. Test the flow end-to-end
2. Add error handling improvements
3. Add account linking (link Google to existing email accounts)
4. Add profile picture sync from Google
5. Implement sign-out functionality

