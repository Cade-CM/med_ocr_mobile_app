# iOS Setup Instructions

## Camera Permissions

Add the following to your `ios/MedAdherenceApp/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to scan prescription labels</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to save scanned prescriptions</string>
```

## Installation Steps

1. Install CocoaPods dependencies:
```bash
cd ios
pod install
cd ..
```

2. Open the workspace in Xcode:
```bash
open ios/MedAdherenceApp.xcworkspace
```

3. Select your development team in Xcode project settings

4. Run the app:
```bash
npm run ios
```

## Required Capabilities

- Camera
- Push Notifications (for medication reminders)

## Minimum iOS Version

iOS 13.0 or higher
