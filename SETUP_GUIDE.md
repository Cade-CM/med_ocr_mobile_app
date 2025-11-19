# Setup and Installation Guide

## Quick Start

This React Native app focuses on the **Label Capture** component using OCR technology to scan prescription labels and extract medication information.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18 or higher
- **npm** or **yarn**: Package manager
- **React Native CLI**: `npm install -g react-native-cli`
- **Git**: For version control

### For iOS Development
- **macOS**: Required for iOS development
- **Xcode**: Latest version from the App Store
- **CocoaPods**: `sudo gem install cocoapods`
- **iOS Simulator**: Included with Xcode

### For Android Development
- **Android Studio**: Latest version
- **Android SDK**: API Level 24 or higher
- **Java Development Kit (JDK)**: Version 11 or higher
- **Android Emulator**: Set up through Android Studio

## Installation Steps

### 1. Navigate to Project Directory

```bash
cd c:\Users\cadem\Desktop\med_ocr_mobile_app
```

### 2. Install Node Dependencies

```bash
npm install
```

This will install all required packages including:
- React Native and React
- Navigation libraries
- Camera and OCR libraries
- Notification system
- Storage utilities

### 3. iOS Setup (Mac Only)

#### Install CocoaPods Dependencies

```bash
cd ios
pod install
cd ..
```

#### Configure Permissions

The app needs camera access. This is already configured in the code, but ensure your `Info.plist` includes:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan prescription labels</string>
```

### 4. Android Setup

#### Configure Permissions

Ensure `android/app/src/main/AndroidManifest.xml` includes:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

#### Sync Gradle

Open Android Studio and sync Gradle files, or run:

```bash
cd android
./gradlew clean
cd ..
```

## Running the App

### Start Metro Bundler

In one terminal window:

```bash
npm start
```

### Run on iOS

In another terminal window:

```bash
npm run ios
```

Or to run on a specific device:

```bash
npm run ios -- --simulator="iPhone 15 Pro"
```

### Run on Android

```bash
npm run android
```

Or to run on a specific device:

```bash
npm run android -- --deviceId=<device_id>
```

## App Usage

### 1. Add Your First Medication

1. Open the app
2. Tap the **+** (Add) button on the Home screen
3. The camera will open

### 2. Scan a Prescription Label

1. Position the prescription label within the blue frame guide
2. Ensure good lighting for best OCR results
3. Tap the **camera button** to capture
4. Wait for OCR processing (2-5 seconds)

### 3. Review Extracted Information

1. The app will display extracted medication details:
   - Drug Name
   - Dosage
   - Frequency
   - Duration
   - Instructions
2. **Verify accuracy** - OCR may not be 100% accurate
3. **Edit any fields** as needed
4. Tap **Continue to Schedule**

### 4. Set Reminder Schedule

1. Review the generated reminder times
2. Adjust settings:
   - Wake/sleep times
   - Whether to take with food
3. Tap **Save & Set Reminders**

### 5. Track Your Progress

- **Home Screen**: View all your medications and next dose times
- **Dashboard**: See adherence percentage, streaks, and statistics
- **Settings**: Customize your schedule and notification preferences

## Troubleshooting

### Common Issues

#### Camera Not Working

- **iOS**: Check that camera permissions are granted in Settings > Privacy > Camera
- **Android**: Ensure permissions are granted in App Settings

#### OCR Not Detecting Text

- Ensure good lighting
- Hold the camera steady
- Make sure the label text is clearly visible
- Try capturing from different angles
- Clean the camera lens

#### Notifications Not Appearing

- **iOS**: Check Settings > Notifications > MedAdherence
- **Android**: Check App Notifications settings
- Ensure "Do Not Disturb" mode is off

#### Build Errors

**iOS Pod Install Fails**:
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Android Gradle Issues**:
```bash
cd android
./gradlew clean
./gradlew build
cd ..
```

**Metro Bundler Issues**:
```bash
npm start -- --reset-cache
```

## Key Features Walkthrough

### Label Capture (OCR)

The app uses **computer vision** to scan prescription labels:

1. **Camera Interface**: Real-time preview with frame guide
2. **Image Capture**: High-quality photo of the label
3. **OCR Processing**: Extracts text using ML Kit/Tesseract
4. **Smart Parsing**: Identifies drug name, dosage, frequency, etc.
5. **Confidence Scoring**: Shows how confident the OCR is

### Medication Parser

The OCR service intelligently parses medication information:

- **Drug Names**: Identifies capitalized medication names
- **Dosages**: Recognizes patterns like "10 mg", "2 tablets"
- **Frequency**: Understands "once daily", "BID", "twice daily"
- **Duration**: Extracts "30 days", "2 weeks", etc.
- **Medical Abbreviations**: Converts BID→twice daily, TID→three times daily

### Smart Scheduling

The app generates personalized reminders:

- **Once Daily**: Schedules at wake time or breakfast
- **Twice Daily**: Morning and evening doses
- **Multiple Times**: Evenly distributed throughout the day
- **Meal Integration**: Aligns with meal times when needed
- **User Preferences**: Respects your wake/sleep schedule

## Development Tips

### Folder Structure

- `src/screens/`: All app screens (Home, Dashboard, Settings, etc.)
- `src/services/`: Business logic (OCR, Scheduling, Storage, Notifications)
- `src/types/`: TypeScript type definitions
- `src/components/`: Reusable UI components (if added)

### Key Services

- **OCRService**: Parses prescription label text
- **SchedulingService**: Generates reminder times
- **StorageService**: Local data persistence
- **NotificationService**: Push notification management

### Testing OCR

For testing without physical prescriptions, you can:
1. Print sample prescription labels
2. Display labels on another screen
3. Use mock data in the review screen

## Next Steps

### Planned Enhancements

1. **Cloud Sync**: Backend API for multi-device access
2. **Clinician Dashboard**: Web portal for healthcare providers
3. **Advanced Analytics**: Trend analysis and reports
4. **RFID Integration**: Tag-based medication tracking
5. **Improved OCR**: Custom ML models for better accuracy

### Contributing

To add new features:

1. Create feature branch
2. Implement changes
3. Test thoroughly
4. Update documentation
5. Submit pull request

## Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Vision Camera](https://react-native-vision-camera.com/)
- [Notifee](https://notifee.app/)

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the README.md for detailed documentation
- Check existing issues in the repository

## License

This is a capstone/senior design project for medication adherence tracking.

---

**Ready to build!** Run `npm start` and then `npm run ios` or `npm run android` to launch the app.
