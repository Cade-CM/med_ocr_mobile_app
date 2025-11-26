# NFC Development Build Guide

## ⚠️ Important: NFC Requires Development Build

The `react-native-nfc-manager` package requires native modules that are **NOT available in Expo Go**. You must create a development build to use NFC features.

## Quick Start

### Option 1: Local Development Build (Recommended for Testing)

#### For Android:
```bash
# Build and install development client on connected Android device/emulator
npx expo run:android
```

#### For iOS:
```bash
# Build and install development client on connected iOS device/simulator
npx expo run:ios
```

**Note**: You need:
- Android: Android Studio installed, device in developer mode
- iOS: Xcode installed, Mac required

---

### Option 2: EAS Build (Cloud Build - Easier Setup)

#### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

#### 2. Login to Expo
```bash
eas login
```

#### 3. Build Development Client

**For Android:**
```bash
eas build --profile development --platform android
```

**For iOS:**
```bash
eas build --profile development --platform ios
```

#### 4. Install the Build
- Download the `.apk` (Android) or `.ipa` (iOS) from the EAS build page
- Install on your physical device
- **NFC requires a physical device** - simulators/emulators don't support NFC hardware

#### 5. Start Development Server
```bash
npm run start:dev
```

Then scan the QR code with your development build app.

---

## ✅ Configuration Already Complete

The following has been configured in your project:

### app.json - NFC Permissions
- ✅ Android: `android.permission.NFC` added
- ✅ iOS: `NFCReaderUsageDescription` added
- ✅ iOS: NFC entitlements for NDEF and TAG formats

### package.json
- ✅ `expo-dev-client` installed
- ✅ `react-native-nfc-manager` installed
- ✅ Scripts configured: `start:dev`, `android`, `ios`

### eas.json
- ✅ Development build profile configured

---

## 🎯 Recommended Workflow

1. **For initial NFC testing**: Use local builds (`npx expo run:android`)
   - Faster iteration
   - Direct install to device

2. **For distribution/testing on multiple devices**: Use EAS Build
   - Cloud-based, no local setup needed
   - Shareable builds via URL

---

## 📱 Testing NFC Features

### Android Requirements:
- Physical Android device with NFC chip
- NFC enabled in device settings
- Android 5.0+ (API level 21+)

### iOS Requirements:
- Physical iOS device (iPhone 7 or later)
- iOS 11.0+
- NFC capability (all iPhones since iPhone 7 have NFC)

### Test Workflow:
1. Build development client
2. Install on physical device
3. Enable NFC in device settings
4. Open MedBuddy app
5. Navigate to Medication Review → Link RFID Tag
6. Tap device to NFC tag to link
7. Set medication schedule
8. Test confirmation flow with RFID scan

---

## 🔧 Troubleshooting

### "Native module doesn't exist" Error
- **Cause**: Running in Expo Go
- **Solution**: Build and use development client (see above)

### NFC Not Available
- **Check**: Device has NFC hardware
- **Check**: NFC enabled in device settings (Settings → Connections → NFC)
- **Check**: App has NFC permissions

### Build Failures
```bash
# Clear cache and rebuild
npx expo prebuild --clean
npx expo run:android
```

---

## 📚 Additional Resources

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [react-native-nfc-manager Setup](https://github.com/revtel/react-native-nfc-manager)

---

## 🚀 Next Steps After Build

Once you have the development build installed:

1. ✅ Test RFID tag linking in MedicationReviewScreen
2. ✅ Test RFID confirmation in MedicationConfirmationScreen
3. ✅ Verify adherence tracking in AdherenceHistoryScreen
4. ✅ Toggle RFID settings in SettingsScreen
5. ✅ Test manual confirmation fallback

All RFID features are fully implemented and ready to test!
