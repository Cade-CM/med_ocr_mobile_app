# 🚀 Quick Start Guide - Test on iPhone NOW

## Step 1: Install Expo Go on iPhone
1. Open **App Store** on your iPhone
2. Search for **"Expo Go"**
3. Install the app (it's free)

---

## Step 2: Start the Development Server
Open PowerShell and run:

```powershell
cd C:\Users\cadem\Desktop\med_ocr_expo
npm start
```

You'll see:
- A QR code in the terminal
- Development server running
- Metro bundler output

---

## Step 3: Connect Your iPhone

### Option A: Scan QR Code (Same WiFi)
1. Open **Camera app** on iPhone
2. Point at the QR code in terminal
3. Tap the notification that appears
4. App opens in Expo Go automatically! ✨

### Option B: Use Tunnel (Different Networks)
If QR code doesn't work:

```powershell
npm start --tunnel
```

Then scan the new QR code.

---

## Step 4: Test the App

Once loaded in Expo Go:

1. ✅ **Navigate** between screens using tabs
2. ✅ **Tap "+" button** → Opens camera
3. ✅ **Grant camera permission**
4. ✅ **Take photo** of any text
5. ✅ **Review screen** shows simulated OCR data
6. ✅ **Set reminders** and save medication

---

## 🔄 Making Changes

1. **Edit any file** in src/ folder
2. **Shake your iPhone**
3. **Tap "Reload"** in menu
4. **See changes instantly**

Or: Tap **"r"** in terminal to reload all devices

---

## �� Troubleshooting

### QR Code Won't Scan
- ✅ Ensure iPhone and PC on **same WiFi**
- ✅ Try: `npm start --tunnel`
- ✅ Type **"w"** in terminal → Opens web interface with QR

### App Won't Load
```powershell
# Clear cache and restart
npm start -- --clear
```

### Camera Permission Denied
- Open iPhone **Settings** → **Expo Go** → Enable Camera

---

## ✨ What You'll See

### Home Screen
- List of medications (empty at first)
- Bottom tabs: Medications | Dashboard | Settings
- Floating "+" button to add medication

### Label Capture Screen
- Live camera view
- Blue frame guide overlay
- Flash toggle button
- Capture button (large blue circle)

### Review Screen
- Editable fields (drug name, dosage, frequency)
- Captured image preview
- Confidence score indicator
- Save button

### Schedule Screen
- Time pickers for reminders
- "Take with food" toggle
- Visual reminder time cards

---

## 🎯 Testing Checklist

- [ ] App loads in Expo Go
- [ ] Bottom tabs work (Home, Dashboard, Settings)
- [ ] Camera opens when tapping "+"
- [ ] Camera permission granted
- [ ] Photo capture works
- [ ] Navigation to review screen works
- [ ] Can edit medication fields
- [ ] Save button navigates back
- [ ] Dashboard shows stats
- [ ] Settings load user preferences

---

## 📊 Expected Behavior

**OCR Text**: Currently **simulated** (returns dummy data)
- Real OCR will be added later
- For now, testing UI/UX flow

**Notifications**: May not work in Expo Go
- Full support requires standalone build
- Use for UI testing only

**Data Storage**: Works via AsyncStorage
- Persists between app reloads
- Cleared when you uninstall Expo Go

---

## 🆘 Need Help?

### Terminal Commands
- **"r"** = Reload app on all devices
- **"m"** = Toggle menu
- **"c"** = Clear console
- **"q"** = Quit server

### Expo Go App Menu (Shake Phone)
- **Reload** = Refresh app with latest code
- **Go Home** = Return to Expo Go projects list
- **Enable Fast Refresh** = Auto-reload on code changes

---

## 🎉 You're Ready!

Run `npm start` and scan the QR code to begin testing! 

The app works identically to the native version but runs instantly on your iPhone without any build process.
