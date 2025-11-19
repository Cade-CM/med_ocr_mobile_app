# Project Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MedAdherence Mobile App                      │
│                   (React Native + TypeScript)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Screens    │     │   Services   │     │    Types     │
│              │     │              │     │              │
│ - Home       │────▶│ - OCR        │     │ - Medication │
│ - Capture    │     │ - Scheduling │     │ - User Prefs │
│ - Review     │     │ - Storage    │     │ - Adherence  │
│ - Schedule   │     │ - Notification│    │ - Stats      │
│ - Dashboard  │     │              │     │              │
│ - Settings   │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
        │                     │
        │                     ▼
        │            ┌──────────────┐
        │            │  Device APIs │
        │            │              │
        └───────────▶│ - Camera     │
                     │ - Storage    │
                     │ - Notifs     │
                     └──────────────┘
```

## Component Flow: Label Capture (Focus Area)

```
┌────────────────────────────────────────────────────────────────┐
│                     User Journey                                │
└────────────────────────────────────────────────────────────────┘

1. HOME SCREEN
   │
   │ [User taps + button]
   ▼
2. LABEL CAPTURE SCREEN
   │
   ├─▶ Camera Preview (react-native-vision-camera)
   │   └─▶ Frame Guide Overlay
   │   └─▶ Flash Toggle
   │   └─▶ Capture Button
   │
   │ [User captures photo]
   ▼
3. OCR PROCESSING
   │
   ├─▶ vision-camera-ocr (ML Kit/Tesseract)
   │   └─▶ Text Detection
   │   └─▶ Extract Raw Text
   │
   ├─▶ OCRService.parseMedicationLabel()
   │   ├─▶ Extract Drug Name
   │   ├─▶ Extract Dosage (mg, tablets, etc.)
   │   ├─▶ Extract Frequency (once daily, BID, etc.)
   │   ├─▶ Extract Duration (30 days, etc.)
   │   └─▶ Calculate Confidence Score
   │
   ▼
4. MEDICATION REVIEW SCREEN
   │
   ├─▶ Display Captured Image
   ├─▶ Show Extracted Data (editable)
   │   ├─▶ Drug Name *
   │   ├─▶ Dosage *
   │   ├─▶ Frequency *
   │   ├─▶ Duration (optional)
   │   └─▶ Instructions (optional)
   ├─▶ Confidence Indicator
   └─▶ Raw OCR Text (for reference)
   │
   │ [User reviews/edits and continues]
   ▼
5. MEDICATION SCHEDULE SCREEN
   │
   ├─▶ SchedulingService.generateReminderSchedule()
   │   ├─▶ Parse frequency to times per day
   │   ├─▶ Apply user preferences (wake/sleep)
   │   ├─▶ Adjust for meal times (if needed)
   │   └─▶ Generate reminder time array
   │
   ├─▶ Display Medication Summary
   ├─▶ Show Generated Reminder Times
   └─▶ User Preferences (with food, etc.)
   │
   │ [User saves medication]
   ▼
6. SAVE & SCHEDULE
   │
   ├─▶ StorageService.saveMedication()
   │   └─▶ AsyncStorage (local persistence)
   │
   ├─▶ NotificationService.scheduleNotifications()
   │   └─▶ Create daily repeating notifications
   │
   └─▶ Navigate back to HOME SCREEN
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                               │
└─────────────────────────────────────────────────────────────────┘

USER INPUT                    SERVICES                    STORAGE
─────────────────────────────────────────────────────────────────

Camera Image        ─▶    OCRService           ─▶   (temporary)
                          │
                          ├─ Text Recognition
                          ├─ Pattern Matching
                          └─ Data Extraction
                                │
                                ▼
Edited Data         ─▶    Medication Object
                                │
                                ▼
User Preferences    ─▶    SchedulingService   ─▶   Reminder Times
                          │
                          ├─ Calculate intervals
                          ├─ Apply preferences
                          └─ Generate schedule
                                │
                                ▼
Save Action         ─▶    StorageService      ─▶   AsyncStorage
                          │                         │
                          │                         ├─ Medications
                          │                         ├─ Adherence Records
                          │                         └─ User Preferences
                          │
                          ▼
                    NotificationService     ─▶   System Notifications
                          │
                          ├─ Create triggers
                          ├─ Set repeating
                          └─ Handle actions
```

## Screen Navigation Structure

```
┌──────────────────────────────────────────────────────────────┐
│                      App Navigation                           │
└──────────────────────────────────────────────────────────────┘

Root Stack Navigator
│
├─ Main Tabs (Bottom Tab Navigator)
│  │
│  ├─ Home Tab
│  │  └─ HomeScreen
│  │     ├─ Medication List
│  │     ├─ Next Dose Indicators
│  │     └─ FAB (Add Button) ──▶ Navigate to LabelCapture
│  │
│  ├─ Dashboard Tab
│  │  └─ DashboardScreen
│  │     ├─ Adherence Circle
│  │     ├─ Stats Grid
│  │     ├─ Streak Counter
│  │     └─ Motivational Cards
│  │
│  └─ Settings Tab
│     └─ SettingsScreen
│        ├─ Schedule Preferences
│        ├─ Notification Settings
│        └─ Data Management
│
├─ LabelCaptureScreen (Modal/Stack)
│  └─ Camera + OCR Interface
│     └─ Navigate to ──▶ MedicationReviewScreen
│
├─ MedicationReviewScreen (Stack)
│  └─ Review/Edit OCR Data
│     └─ Navigate to ──▶ MedicationScheduleScreen
│
└─ MedicationScheduleScreen (Stack)
   └─ Set Reminder Schedule
      └─ Navigate back to ──▶ HomeScreen
```

## Service Dependencies

```
┌──────────────────────────────────────────────────────────────┐
│                    Service Layer                              │
└──────────────────────────────────────────────────────────────┘

OCRService (Independent)
├─ Input: Raw text string
├─ Output: ParsedMedicationData
└─ Methods:
   ├─ parseMedicationLabel()
   ├─ extractDrugName()
   ├─ extractDosage()
   ├─ extractFrequency()
   └─ parseFrequencyToTimesPerDay()

SchedulingService (Depends on: OCRService)
├─ Input: Medication + UserPreferences
├─ Output: Date[] (reminder times)
└─ Methods:
   ├─ generateReminderSchedule()
   ├─ adjustForMeals()
   ├─ getNextDoseTime()
   └─ formatTime()

StorageService (Independent)
├─ Input: Medications, Records, Preferences
├─ Output: Async operations
└─ Methods:
   ├─ saveMedication()
   ├─ getMedications()
   ├─ saveAdherenceRecord()
   └─ getPatientStats()

NotificationService (Depends on: SchedulingService)
├─ Input: Medication with reminder times
├─ Output: Scheduled notifications
└─ Methods:
   ├─ scheduleNotifications()
   ├─ cancelNotifications()
   └─ displayNotification()
```

## OCR Processing Pipeline (Detailed)

```
┌──────────────────────────────────────────────────────────────┐
│              Label Capture OCR Pipeline                       │
└──────────────────────────────────────────────────────────────┘

STEP 1: IMAGE CAPTURE
│
├─ Camera Setup
│  ├─ Device: back camera
│  ├─ Quality: high
│  └─ Flash: optional
│
├─ Frame Guide Overlay
│  └─ Position assistance
│
└─ Capture Photo
   └─ Save to temporary file

STEP 2: OCR PROCESSING
│
├─ vision-camera-ocr
│  ├─ ML Kit (Android)
│  └─ Vision (iOS)
│
├─ Text Detection
│  ├─ Identify text blocks
│  ├─ Extract bounding boxes
│  └─ Confidence per block
│
└─ Raw Text Output
   └─ Unstructured string

STEP 3: TEXT PARSING (OCRService)
│
├─ Split into lines
├─ Clean whitespace
│
├─ Pattern Matching
│  │
│  ├─ Drug Name Detection
│  │  ├─ Capitalized words pattern
│  │  ├─ First few lines priority
│  │  └─ Filter common non-drug words
│  │
│  ├─ Dosage Extraction
│  │  ├─ Regex: \d+ (mg|mcg|ml|tablets)
│  │  ├─ Multiple patterns
│  │  └─ First match wins
│  │
│  ├─ Frequency Parsing
│  │  ├─ "once daily", "twice daily"
│  │  ├─ Medical abbreviations (BID, TID)
│  │  ├─ "\d+ times per day"
│  │  └─ Normalize to readable format
│  │
│  └─ Duration Detection
│     ├─ "\d+ days/weeks/months"
│     ├─ "30 day supply"
│     └─ "until gone"
│
└─ Confidence Calculation
   ├─ Score per field extracted
   ├─ Average confidence
   └─ 0-100% scale

STEP 4: OUTPUT
│
└─ ParsedMedicationData
   ├─ drugName: string
   ├─ dosage: string
   ├─ frequency: string
   ├─ duration: string
   ├─ instructions: string
   └─ confidence: number
```

## Technology Stack Details

```
┌──────────────────────────────────────────────────────────────┐
│                   Technology Stack                            │
└──────────────────────────────────────────────────────────────┘

FRONTEND FRAMEWORK
└─ React Native 0.73.2
   ├─ Cross-platform (iOS + Android)
   ├─ Native performance
   └─ Large ecosystem

LANGUAGE
└─ TypeScript
   ├─ Type safety
   ├─ Better IDE support
   └─ Fewer runtime errors

NAVIGATION
├─ @react-navigation/native
├─ @react-navigation/native-stack (Main screens)
└─ @react-navigation/bottom-tabs (Dashboard)

CAMERA & OCR
├─ react-native-vision-camera
│  ├─ Modern camera API
│  ├─ Frame processing
│  └─ High performance
│
└─ vision-camera-ocr
   ├─ ML Kit (Android)
   ├─ Vision Framework (iOS)
   └─ On-device processing

NOTIFICATIONS
└─ @notifee/react-native
   ├─ Local notifications
   ├─ Scheduled triggers
   ├─ Action buttons
   └─ Daily repeats

STORAGE
└─ @react-native-async-storage/async-storage
   ├─ Key-value storage
   ├─ Async operations
   └─ Encrypted on device

UI COMPONENTS
├─ React Native built-in components
└─ react-native-vector-icons
   └─ Material Icons

UTILITIES
├─ date-fns (Date manipulation)
└─ react-native-permissions
```

## Future Architecture (Planned)

```
┌──────────────────────────────────────────────────────────────┐
│              Future Cloud-Enabled Architecture                │
└──────────────────────────────────────────────────────────────┘

MOBILE APP                    BACKEND API                WEB PORTAL
────────────────────────────────────────────────────────────────

React Native      ◄──▶    REST/GraphQL API    ◄──▶    React Web
   │                          │                          │
   ├─ Label Capture          ├─ Authentication          ├─ Clinician
   ├─ Local Storage          ├─ Data Sync                  Dashboard
   ├─ Notifications          ├─ Analytics               ├─ Patient
   └─ Offline Mode           ├─ Encryption                 Reports
                             └─ HIPAA Compliance        └─ EHR Integration

                     ┌──────────────────┐
                     │  Cloud Database  │
                     │   (PostgreSQL)   │
                     └──────────────────┘
                              │
                     ┌────────┴────────┐
                     │                 │
              ┌──────▼──────┐   ┌─────▼─────┐
              │  Medication  │   │ Adherence │
              │    Data      │   │  Records  │
              └──────────────┘   └───────────┘
```

---

**This architecture prioritizes the Label Capture (OCR) component while providing a complete medication adherence tracking solution.**
