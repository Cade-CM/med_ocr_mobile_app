# Quick Reference Guide

## Essential Commands

### Installation
```bash
npm install                 # Install all dependencies
cd ios && pod install      # iOS dependencies (Mac only)
```

### Running the App
```bash
npm start                  # Start Metro bundler
npm run ios               # Run on iOS simulator/device
npm run android           # Run on Android emulator/device
```

### Development
```bash
npm run lint              # Check code style
npm test                  # Run tests
npm start -- --reset-cache # Clear Metro cache
```

### Troubleshooting
```bash
# iOS
cd ios && pod deintegrate && pod install && cd ..

# Android
cd android && ./gradlew clean && cd ..

# Metro
rm -rf node_modules && npm install
npm start -- --reset-cache
```

## Project File Structure

```
med_ocr_mobile_app/
├── src/
│   ├── App.tsx                          # Main app entry
│   ├── types/index.ts                   # TypeScript types
│   ├── screens/
│   │   ├── LabelCaptureScreen.tsx      # 📸 OCR Camera
│   │   ├── MedicationReviewScreen.tsx  # ✏️ Review extracted data
│   │   ├── MedicationScheduleScreen.tsx# ⏰ Set reminders
│   │   ├── HomeScreen.tsx              # 🏠 Medication list
│   │   ├── DashboardScreen.tsx         # 📊 Statistics
│   │   └── SettingsScreen.tsx          # ⚙️ Preferences
│   └── services/
│       ├── OCRService.ts               # 🔍 Text parsing
│       ├── SchedulingService.ts        # 📅 Reminder generation
│       ├── StorageService.ts           # 💾 Data persistence
│       └── NotificationService.ts      # 🔔 Push notifications
├── package.json
├── tsconfig.json
├── babel.config.js
└── README.md
```

## Key Features by Screen

### LabelCaptureScreen
- Camera interface with frame guide
- Flash toggle
- Capture button
- OCR processing
- Error handling

### MedicationReviewScreen
- Display captured image
- Show extracted fields (editable):
  - Drug name *
  - Dosage *
  - Frequency *
  - Duration
  - Instructions
- Confidence indicator
- Raw OCR text view

### MedicationScheduleScreen
- Medication summary
- Generated reminder times
- User preferences:
  - Take with food toggle
- Save and schedule button

### HomeScreen
- Medication list with cards
- Next dose indicators
- Delete medications
- FAB to add new medication

### DashboardScreen
- Adherence percentage circle
- Current streak counter
- Statistics grid:
  - Total medications
  - Longest streak
  - On-time doses
- Motivational cards

### SettingsScreen
- Daily schedule (wake/sleep)
- Meal times (optional)
- Notification toggles
- Clear data option

## Important Services

### OCRService
```typescript
// Parse prescription label text
OCRService.parseMedicationLabel(text: string)
  → ParsedMedicationData

// Convert frequency to number
OCRService.parseFrequencyToTimesPerDay(frequency: string)
  → number
```

### SchedulingService
```typescript
// Generate reminder schedule
SchedulingService.generateReminderSchedule(
  medication: Medication,
  preferences: UserPreferences,
  timesPerDay: number
) → Date[]

// Get next dose time
SchedulingService.getNextDoseTime(medication: Medication)
  → Date | null
```

### StorageService
```typescript
// Save medication
await StorageService.saveMedication(medication: Medication)

// Get all medications
await StorageService.getMedications()
  → Medication[]

// Get statistics
await StorageService.getPatientStats()
  → PatientStats
```

### NotificationService
```typescript
// Schedule notifications
await NotificationService.scheduleNotifications(medication: Medication)

// Cancel notifications
await NotificationService.cancelNotifications(medicationId: string)
```

## Data Types

### Medication
```typescript
{
  id: string
  drugName: string
  dosage: string
  frequency: string
  duration?: string
  instructions?: string
  reminderTimes: Date[]
  startDate: Date
  endDate?: Date
  capturedImageUri?: string
  rawOcrText?: string
}
```

### UserPreferences
```typescript
{
  wakeTime: string              // "07:00"
  sleepTime: string             // "22:00"
  mealTimes?: {
    breakfast?: string          // "08:00"
    lunch?: string              // "12:00"
    dinner?: string             // "18:00"
  }
  notificationEnabled: boolean
  notificationSound: boolean
}
```

### ParsedMedicationData
```typescript
{
  drugName?: string
  dosage?: string
  frequency?: string
  duration?: string
  instructions?: string
  confidence: number            // 0-100
}
```

## Common OCR Patterns

### Drug Names
- Usually first few lines
- Capitalized words
- Example: "Lisinopril", "Metformin HCL"

### Dosage
- Pattern: `\d+ (mg|mcg|tablets|ml)`
- Examples: "10 mg", "2 tablets", "5 ml"

### Frequency
- Patterns:
  - "once daily", "twice daily"
  - "BID" (twice daily)
  - "TID" (three times daily)
  - "QID" (four times daily)
  - "2 times per day"

### Duration
- Patterns:
  - "30 days", "2 weeks", "1 month"
  - "30 day supply"
  - "until gone"

## Notification Actions

### From Notification
- **Mark as Taken**: Records dose taken
- **Snooze 15 min**: Delays reminder

### Notification Frequency
- Daily repeating
- Based on reminder times
- Respects user preferences

## Testing Tips

### Without Physical Prescriptions
1. Print sample labels
2. Display on another screen
3. Use clear, readable fonts
4. Ensure good lighting

### Sample Prescription Format
```
LISINOPRIL
10 MG TABLETS

Take 1 tablet by mouth once daily

Qty: 30
Refills: 3
```

## Permissions Required

### iOS
- Camera access
- Notifications

### Android
- Camera
- Post notifications
- Vibrate

## Performance Tips

1. **OCR Processing**: Takes 2-5 seconds
2. **Image Quality**: Better lighting = better results
3. **Camera Stability**: Hold steady while capturing
4. **Storage**: All data stored locally (no internet required)

## Build & Deploy

### iOS (requires Mac)
```bash
cd ios
pod install
cd ..
npm run ios
```

### Android
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Support & Documentation

- **Full Documentation**: See README.md
- **Setup Guide**: See SETUP_GUIDE.md
- **Architecture**: See ARCHITECTURE.md

## Contact

For issues or questions, create an issue in the repository.

---

**Quick Start**: `npm install` → `npm start` → `npm run ios` or `npm run android`
