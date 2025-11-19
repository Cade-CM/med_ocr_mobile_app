# MedAdherence - Medication Adherence Tracking App

A React Native mobile application that helps patients track medication adherence using OCR (Optical Character Recognition) to scan prescription labels. The app features automated medication scheduling, reminder notifications, and adherence analytics.

## 🎯 Key Features

### Label Capture (OCR) - Primary Focus
- **Camera Integration**: Uses device camera to capture prescription labels
- **OCR Technology**: Extracts medication information using vision-camera-ocr
- **Smart Parsing**: Automatically extracts:
  - Drug name
  - Dosage
  - Frequency
  - Duration
  - Special instructions
- **Manual Review**: Users can verify and edit extracted information

### Medication Management
- Add medications by scanning prescription labels
- View all active medications
- Track multiple medications simultaneously
- Delete medications when treatment ends

### Smart Scheduling
- **Automated Reminders**: Generates personalized reminder schedules
- **User Preferences**: Customizes timing based on:
  - Wake/sleep schedule
  - Meal times
  - Medication frequency
- **Flexible Timing**: Adapts to different dosing frequencies (once, twice, multiple times daily)

### Patient Dashboard
- **Adherence Metrics**: Track your adherence percentage
- **Streak Tracking**: Build and maintain adherence streaks
- **Visual Analytics**: See your progress at a glance
- **Motivational Features**: Get encouragement based on your performance

### Notification System
- Push notifications for medication reminders
- Snooze functionality (15-minute intervals)
- Quick actions: "Mark as Taken" directly from notification
- Daily repeating reminders

## 📱 Technology Stack

- **Framework**: React Native 0.73.2
- **Language**: TypeScript
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **Camera**: react-native-vision-camera
- **OCR**: vision-camera-ocr
- **Notifications**: @notifee/react-native
- **Storage**: @react-native-async-storage/async-storage
- **Date Handling**: date-fns
- **Icons**: react-native-vector-icons

## 📋 Project Structure

```
med_ocr_mobile_app/
├── src/
│   ├── App.tsx                 # Main app component with navigation
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   ├── screens/
│   │   ├── HomeScreen.tsx             # Medication list view
│   │   ├── LabelCaptureScreen.tsx     # Camera + OCR capture
│   │   ├── MedicationReviewScreen.tsx # Review extracted data
│   │   ├── MedicationScheduleScreen.tsx # Set reminder schedule
│   │   ├── DashboardScreen.tsx        # Adherence statistics
│   │   └── SettingsScreen.tsx         # User preferences
│   └── services/
│       ├── OCRService.ts              # OCR text parsing logic
│       ├── SchedulingService.ts       # Reminder scheduling
│       ├── StorageService.ts          # Local data persistence
│       └── NotificationService.ts     # Push notifications
├── package.json
├── tsconfig.json
├── babel.config.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- React Native development environment set up
- For iOS: Xcode and CocoaPods
- For Android: Android Studio and SDK

### Installation

1. **Clone the repository**
   ```bash
   cd med_ocr_mobile_app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **iOS specific setup**
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Android specific setup**
   
   Add camera and notification permissions to `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
   ```

### Running the App

**Start Metro Bundler**
```bash
npm start
```

**Run on iOS**
```bash
npm run ios
```

**Run on Android**
```bash
npm run android
```

## 🎨 App Flow

1. **Scan Prescription**: User taps "+" button and scans prescription label
2. **OCR Processing**: App extracts medication details using OCR
3. **Review & Edit**: User verifies/edits the extracted information
4. **Set Schedule**: App generates personalized reminder times
5. **Receive Reminders**: User gets notifications at scheduled times
6. **Track Progress**: Dashboard shows adherence metrics and streaks

## 📊 Components Overview

### 3.1 Label Capture (Camera + OCR)
**Purpose**: Scan prescription labels and extract medication information

**Technologies**:
- `react-native-vision-camera`: Camera interface
- `vision-camera-ocr`: Text recognition
- Computer vision and ML for text extraction

**Features**:
- Real-time camera preview
- Flash toggle
- Frame guide for optimal positioning
- High-quality image capture
- Error handling for failed scans

### OCR Service (Medication Data Parser)
**Purpose**: Parse OCR text and extract structured data

**Parsing Capabilities**:
- Drug name detection (capitalized words, patterns)
- Dosage extraction (mg, mcg, tablets, etc.)
- Frequency parsing (once daily, BID, TID, etc.)
- Duration detection (30 days, 2 weeks, etc.)
- Instruction extraction
- Medical abbreviation normalization

**Confidence Scoring**: Calculates confidence based on successfully extracted fields

### Medication Scheduling Engine
**Purpose**: Generate personalized reminder schedules

**Features**:
- Frequency-based scheduling (1x, 2x, 3x+ daily)
- User preference integration (wake/sleep times)
- Meal-based timing (for medications taken with food)
- Even distribution across waking hours
- Next dose calculation
- Lateness detection

## 🔧 Configuration

### User Preferences (Settings Screen)
- **Wake Time**: Default 07:00
- **Sleep Time**: Default 22:00
- **Meal Times**: Breakfast (08:00), Lunch (12:00), Dinner (18:00)
- **Notifications**: Enabled by default
- **Notification Sound**: Enabled by default

### Notification Settings
- **Channel**: "Medication Reminders"
- **Importance**: High (Android)
- **Repeat**: Daily
- **Actions**: Mark as Taken, Snooze 15 min

## 💾 Data Storage

All data is stored locally using AsyncStorage:
- **Medications**: Drug info, schedules, images
- **Adherence Records**: Taken/missed doses, timestamps
- **User Preferences**: Schedule and notification settings

## 📈 Future Enhancements

### Planned Features
- **Cloud Sync**: Backend integration for multi-device sync
- **Clinician Dashboard**: Web portal for healthcare providers
- **RFID Integration**: Tag-based medication tracking
- **Advanced Analytics**: Trend analysis and reporting
- **EHR Integration**: Connect with health systems
- **Data Encryption**: HIPAA-compliant security

### Improvements
- Improved OCR accuracy with custom ML models
- Barcode/QR code scanning for medication lookup
- Voice reminders
- Medication interaction warnings
- Refill reminders
- Family/caregiver sharing

## 🧪 Testing

```bash
npm test
```

## 📝 Design Specifications Addressed

- ✅ **Ease of Use**: Simple scan-and-go workflow
- ✅ **Compatible with Multiple Medications**: Track unlimited medications
- ✅ **Reminder Functionality**: Automated, personalized reminders
- ✅ **Patient Engagement/Motivation**: Streaks, analytics, visual feedback
- ✅ **Feasibility**: Uses existing mobile technology
- ✅ **Multi-Verification**: OCR + manual review

## 🤝 Contributing

This is a capstone project focused on medication adherence improvement through technology.

### Disciplines Involved
- Mobile App Development
- Computer Vision (OCR)
- UI/UX Design
- Data Science
- Healthcare Informatics

## 📄 License

This project is part of a senior design/capstone project.

## 🙏 Acknowledgments

- React Native community
- vision-camera-ocr library developers
- Healthcare informatics research

## 📞 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ for improving medication adherence and patient outcomes**
