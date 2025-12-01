# MedBuddy - Development Guide

## Running the App

### Option 1: Expo Go (UI/Layout Testing - No Google Sign-In)
Use this for quickly testing UI, layout, and non-native features on your physical device.

**Start the development server:**
```bash
npm run start:go
```

Then scan the QR code with:
- **iOS**: Camera app or Expo Go app
- **Android**: Expo Go app

**Features available:**
- ✅ Email/password authentication
- ✅ All UI and layouts
- ✅ Camera scanning
- ✅ Medication management
- ✅ Notifications
- ❌ Google Sign-In (shows "Not Available in Expo Go" message)
- ❌ Apple Sign-In

### Option 2: Development Build (Full Features with Native Modules)
Use this for testing Google Sign-In and other native features.

**Prerequisites:**
- Android: Android Studio with emulator running
- iOS: Mac with Xcode (or use EAS Build cloud service)

**Build and run:**

**Android:**
```bash
npm run android
```

**iOS (Mac only):**
```bash
npm run ios
```

**iOS (Cloud build with EAS):**
```bash
npm install -g eas-cli
eas login
eas build --profile development --platform ios
```

**Features available:**
- ✅ All features from Expo Go
- ✅ Google Sign-In (fully functional)
- ✅ Apple Sign-In (when configured)

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm start` | Default Expo start |
| `npm run start:go` | Start for Expo Go (clears cache) |
| `npm run start:dev` | Start for development build |
| `npm run android` | Build and run on Android emulator |
| `npm run android:go` | Open Expo Go on Android |
| `npm run ios` | Build and run on iOS simulator (Mac only) |
| `npm run ios:go` | Open Expo Go on iOS |

## Google Sign-In Setup

To enable Google Sign-In, you need a Web Client ID from Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select your project
3. Enable Google Sign-In API
4. Create OAuth 2.0 credentials (Web application)
5. Copy the Client ID
6. Update in:
   - `src/screens/LoginScreen.tsx` (line ~35)
   - `src/screens/SignUpScreen.tsx` (line ~35)

## Authentication Flow

### Sign Up Flow:
1. **SignUpScreen**: User enters email/password or uses Google/Apple
2. **ProfileSetupScreen**: User enters name, age, gender, nickname
3. **Home**: Main app

### Login Flow:
1. **LoginScreen**: User enters email/password or uses Google/Apple
2. If new user → **ProfileSetupScreen**
3. If existing user → **Home**

## Key Changes

### What's New:
- ✅ Complete authentication redesign (Login/SignUp separated)
- ✅ Google Sign-In integration (works in dev builds)
- ✅ Separate ProfileSetup screen for user info
- ✅ Conditional imports - works in both Expo Go and dev builds
- ✅ App rebranded to "MedBuddy"
- ✅ All button interactions fixed
- ✅ Circular social login buttons

### Files Modified:
- `App.tsx` - Added ProfileSetup route
- `src/screens/LoginScreen.tsx` - Redesigned with social auth
- `src/screens/SignUpScreen.tsx` - NEW - Matches login screen
- `src/screens/ProfileSetupScreen.tsx` - NEW - Separate profile form
- `src/types/index.ts` - Added ProfileSetup route type
- `package.json` - Added new scripts

## Troubleshooting

**"TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found"**
- You're trying to use Google Sign-In in Expo Go
- Solution: Use `npm run android` or `npm run ios` for dev build
- Or use email/password in Expo Go

**"SDK location not found" (Android)**
- Solution: Already fixed with `android/local.properties`
- If issue persists, restart VS Code

**Port 8081 in use**
- Solution: `Get-Process -Name node | Stop-Process -Force`

## Push to GitHub

Your code is now on GitHub:
```
Repository: med_ocr_mobile_app
Branch: main
Latest commit: Complete auth redesign
```
