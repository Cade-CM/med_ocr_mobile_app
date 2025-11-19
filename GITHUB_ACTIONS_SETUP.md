# Quick Start: GitHub Actions Setup

## 🚀 Get Free iOS & Android Builds in 5 Minutes

### Step 1: Push to GitHub

```bash
# Navigate to your project
cd c:\Users\cadem\Desktop\med_ocr_mobile_app

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit everything
git commit -m "Initial commit: MedAdherence React Native app with OCR"

# Create a new repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/med_ocr_mobile_app.git

# Push to GitHub
git push -u origin main
```

### Step 2: Workflows Start Automatically! 🎉

Once you push, GitHub Actions will automatically:
- ✅ Build your iOS app on macOS
- ✅ Build your Android app on Ubuntu
- ✅ Store builds for 7 days

### Step 3: Download Your Builds

1. Go to: `https://github.com/YOUR_USERNAME/med_ocr_mobile_app/actions`
2. Click on the latest workflow run
3. Scroll to **Artifacts** section
4. Download:
   - **ios-build** - iOS build files
   - **android-apk** - Android APK (ready to install!)

## 📱 Install on Your Devices

### Android (Easy):
```bash
# Download the APK from GitHub Actions
# Transfer to your Android phone
# Install it (enable "Install from Unknown Sources")
```

### iOS (Requires Additional Steps):
The free build is unsigned. To install on iPhone:
1. Use TestFlight (requires Apple Developer account - $99/year)
2. Or use a signing service
3. Or manually sign with Xcode on a Mac

**However**: Android builds are perfect for testing everything! The app works identically on both platforms.

## 🎯 What You Get FREE

### Public Repository (Recommended):
- ✅ **Unlimited** build minutes
- ✅ **Unlimited** storage
- ✅ Builds on every push
- ✅ Multiple builds per day
- ✅ **$0 cost forever**

### Private Repository:
- ✅ **2,000 minutes/month** free
- ✅ ~12 iOS + Android builds/month
- ✅ Still completely free for testing

## 🔄 How It Works

```
You push code
    ↓
GitHub Actions triggers
    ↓
Builds start automatically
    ↓
iOS (macOS runner, ~15 min)
Android (Ubuntu runner, ~8 min)
    ↓
Builds complete
    ↓
Download from Artifacts section
    ↓
Install and test!
```

## ⚡ Manual Trigger

Don't want to push? Trigger manually:

1. Go to **Actions** tab
2. Click **iOS Build** or **Android Build**
3. Click **"Run workflow"**
4. Select branch → **Run workflow**

## 🐛 Troubleshooting

### "No workflows found"
- Make sure you pushed the `.github/workflows/` folder
- Check that files are named correctly

### Build fails on first run
- Check the logs in Actions tab
- Common issue: CocoaPods installation (usually fixes itself on retry)

### Can't find artifacts
- Wait for build to complete (green checkmark)
- Scroll to bottom of workflow run page
- Look for "Artifacts" section

## 💡 Pro Tips

1. **Make repo public** for unlimited free builds
2. **Android APK works immediately** - test on Android first
3. **iOS builds verify compatibility** - even if you can't install
4. **Add status badges** to README for build status

## 📊 Monitor Your Builds

Add these to your README.md:

```markdown
![iOS Build](https://github.com/YOUR_USERNAME/med_ocr_mobile_app/workflows/iOS%20Build/badge.svg)
![Android Build](https://github.com/YOUR_USERNAME/med_ocr_mobile_app/workflows/Android%20Build/badge.svg)
```

## Next Steps

1. ✅ Push your code to GitHub
2. ✅ Watch builds complete in Actions tab
3. ✅ Download Android APK
4. ✅ Install and test on Android phone
5. ✅ iOS build verifies cross-platform compatibility

**That's it! Free cloud-based Mac builds forever.** 🎉

---

**Questions?** Check `.github/workflows/README.md` for detailed info.
