# Medication Adherence App - Expo Version

Complete medication tracking app with **local OCR** using Flask + Tesseract.

## 🎯 Features

✅ **Label Capture** - Camera interface for scanning prescription labels  
✅ **Local OCR** - Tesseract OCR via Flask API (no cloud dependencies)  
✅ **Medication Review** - Edit and confirm OCR-extracted data  
✅ **Schedule Setup** - Set custom reminder times  
✅ **Home Dashboard** - View all medications and next doses  
✅ **Adherence Tracking** - Monitor stats and streaks  
✅ **Settings** - Customize preferences

---

## 🚀 Quick Start

### 1. Install Tesseract OCR

**Windows:**
1. Download installer: [Tesseract for Windows](https://github.com/UB-Mannheim/tesseract/wiki)
2. Run installer (use default path: `C:\Program Files\Tesseract-OCR`)
3. Verify: `tesseract --version`

### 2. Setup Flask API

```powershell
cd api
pip install -r requirements.txt
python app.py
```

API will run on `http://localhost:5000`

### 3. Start Expo App

```powershell
npm install
npm start
```

Scan QR code with Expo Go app on your phone.

---

## 📂 Project Structure

```
med_ocr_expo/
├── api/                          # Flask OCR Backend
│   ├── app.py                   # Flask server with Tesseract
│   ├── requirements.txt         # Python dependencies
│   └── README.md                # API documentation
├── src/
│   ├── screens/
│   │   ├── LabelCaptureScreen.tsx    # Camera + Local OCR
│   │   ├── MedicationReviewScreen.tsx
│   │   ├── MedicationScheduleScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/
│   │   ├── OCRService.ts        # Text parsing logic
│   │   ├── SchedulingService.ts # Reminder calculations
│   │   ├── StorageService.ts    # AsyncStorage
│   │   └── NotificationService.ts
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   └── config/
│       └── api.ts               # API configuration
├── App.tsx                      # Main navigation
└── package.json
```

---

## 🔧 Development Workflow

### Run Flask API
```powershell
cd api
python app.py
```

### Run Expo App
```powershell
npm start
```

### Testing on Physical Device

If testing on a physical device (not localhost):
1. Find your computer's IP: `ipconfig` (look for IPv4)
2. Update `src/config/api.ts`:
   ```typescript
   export const LOCAL_OCR_API_URL = 'http://192.168.1.XXX:5000';
   ```
3. Restart Expo app

---

## 📦 Key Dependencies

**React Native:**
- **expo**: ~54.0.25
- **expo-camera**: Camera with permissions
- **expo-media-library**: Save images
- **@react-navigation**: Navigation
- **expo-notifications**: Reminders
- **@react-native-async-storage**: Data storage

**Flask API:**
- **flask**: Web server
- **pytesseract**: OCR engine wrapper
- **Pillow**: Image processing
- **flask-cors**: CORS support

---

## 🔍 OCR Architecture

```
[Camera] → [Capture Image] → [Base64 Encode]
    ↓
[POST to Flask API] → [Tesseract OCR] → [Extract Text]
    ↓
[Parse Medication Info] → [Review Screen] → [Save]
```

### API Endpoints

- `GET /health` - Health check
- `POST /ocr` - Basic OCR (returns text)
- `POST /ocr/detailed` - OCR with confidence scores

---

## 🐛 Troubleshooting

### "Cannot connect to OCR API"
- Ensure Flask API is running: `cd api && python app.py`
- Check `http://localhost:5000/health` in browser
- Verify firewall isn't blocking port 5000

### "tesseract is not installed"
- Install Tesseract OCR (see Quick Start)
- Update path in `api/app.py` if needed

### Camera Not Working
- Grant camera permissions in Settings → Expo Go
- Restart Expo Go app

### QR Code Won't Scan
- Ensure phone and computer on same WiFi
- Try `npm start --tunnel` for remote access

---

## 📝 Configuration

### API URL Configuration

Edit `src/config/api.ts`:

```typescript
// For testing on same device
export const LOCAL_OCR_API_URL = 'http://localhost:5000';

// For testing on physical device
export const LOCAL_OCR_API_URL = 'http://192.168.1.XXX:5000';
```

### Tesseract Path

Edit `api/app.py`:

```python
# Update if Tesseract installed elsewhere
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

---

## 🚀 Production Deployment

### Build Standalone App

```powershell
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Deploy Flask API

Options:
1. **Local Server**: Keep running on development machine
2. **Cloud Hosting**: Deploy to Heroku, AWS, or Google Cloud
3. **Containerize**: Use Docker for easy deployment

---

## 📸 Testing Tips

1. **Good Lighting**: Use bright, even lighting for best OCR results
2. **Clear Labels**: Hold phone steady, ensure label is in focus
3. **Contrast**: High contrast labels work best (dark text on light background)
4. **Distance**: Keep label ~6-12 inches from camera

---

## 🔐 Permissions

The app requests:
- **Camera**: To capture prescription labels
- **Notifications**: For medication reminders
- **Storage**: To persist medication data

---

## 📞 Next Steps

1. ✅ **Local OCR working** with Flask + Tesseract
2. ⏳ **Test with real prescription labels**
3. ⏳ **Optimize OCR accuracy** (image preprocessing)
4. ⏳ **Deploy API** for production use
5. ⏳ **Build standalone app** with EAS

---

For detailed API documentation, see `api/README.md`.

Happy coding! 🎉
