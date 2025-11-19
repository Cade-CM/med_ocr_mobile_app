# Android Setup Instructions

## Permissions

Add the following permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-feature android:name="android.hardware.camera.autofocus" />
```

## Camera Configuration

Add to `android/app/src/main/AndroidManifest.xml` inside the `<application>` tag:

```xml
<meta-data
    android:name="com.google.mlkit.vision.DEPENDENCIES"
    android:value="ocr" />
```

## Installation Steps

1. Open the Android project in Android Studio:
```bash
cd android
```

2. Sync Gradle files

3. Run the app:
```bash
npm run android
```

## Required SDK

- Minimum SDK: 24 (Android 7.0)
- Target SDK: 34 (Android 14)

## Build Configuration

The app uses:
- Google ML Kit for OCR
- AndroidX libraries
- React Native Vision Camera
