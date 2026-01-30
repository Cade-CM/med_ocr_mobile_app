# OAuth Setup Guide

This guide explains how to enable Google and Apple OAuth sign-in for MedBuddy.

## Prerequisites

1. Supabase project with Authentication enabled
2. Expo development build (OAuth doesn't work in Expo Go)
3. Developer accounts for Google Cloud and/or Apple Developer

---

## Step 1: Install Required Packages

```bash
npx expo install expo-auth-session expo-crypto expo-web-browser
```

---

## Step 2: Update app.json

Add the required configuration:

```json
{
  "expo": {
    "scheme": "medbuddy",
    "ios": {
      "bundleIdentifier": "com.yourcompany.medbuddy",
      "usesAppleSignIn": true
    },
    "android": {
      "package": "com.yourcompany.medbuddy"
    }
  }
}
```

---

## Step 3: Configure Google OAuth

### 3.1 Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**
5. Configure the OAuth consent screen if prompted
6. Create credentials for **Web application**:
   - Name: `MedBuddy Supabase`
   - Authorized redirect URIs: 
     - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

7. Copy the **Client ID** and **Client Secret**

### 3.2 Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** and enable it
5. Paste your **Client ID** and **Client Secret**
6. Save

---

## Step 4: Configure Apple OAuth (iOS only)

### 4.1 Apple Developer Console

1. Go to [Apple Developer](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create an **App ID** with "Sign in with Apple" capability
4. Create a **Services ID**:
   - Enable "Sign in with Apple"
   - Configure domains and return URLs:
     - Domain: `YOUR_PROJECT_REF.supabase.co`
     - Return URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
5. Create a **Key** for Sign in with Apple:
   - Enable "Sign in with Apple"
   - Download the `.p8` key file
   - Note the **Key ID**

### 4.2 Supabase Dashboard

1. Go to **Authentication** → **Providers**
2. Find **Apple** and enable it
3. Enter:
   - **Client ID**: Your Services ID (e.g., `com.yourcompany.medbuddy.auth`)
   - **Secret Key**: Contents of the `.p8` file
   - **Key ID**: From Apple Developer
   - **Team ID**: Your Apple Developer Team ID
4. Save

---

## Step 5: Enable OAuth in Code

Once providers are configured, update `LoginScreen.tsx`:

```typescript
// Change this from false to true
const OAUTH_ENABLED = true;
```

---

## Step 6: Create Development Build

OAuth requires a development build (not Expo Go):

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Create development build
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

---

## Testing OAuth

### Test Checklist

1. [ ] Google Sign-In works on Android
2. [ ] Google Sign-In works on iOS
3. [ ] Apple Sign-In works on iOS
4. [ ] New users are created in Supabase Auth
5. [ ] Existing users can sign in
6. [ ] Session persists after app restart
7. [ ] Sign out works correctly
8. [ ] Two-user contamination test passes (see SECURITY_INVARIANTS.md)

### Common Issues

| Issue | Solution |
|-------|----------|
| "redirect_uri_mismatch" | Check redirect URI matches exactly in all consoles |
| "invalid_client" | Verify Client ID/Secret are correct |
| Apple "invalid_request" | Check Services ID and domain configuration |
| Session not persisting | Ensure SecureStore adapter is configured in supabase.ts |

---

## Security Notes

- OAuth sessions use the same Supabase Auth system as email/password
- `user_key === auth.uid()` for RLS compatibility
- No parallel identity system (unlike the deprecated StorageService)
- Tokens are stored in SecureStore, not AsyncStorage

---

## Files Modified

- `src/services/OAuthService.ts` - OAuth implementation
- `src/screens/auth/LoginScreen.tsx` - UI integration
- `app.json` - Scheme and bundle ID configuration

