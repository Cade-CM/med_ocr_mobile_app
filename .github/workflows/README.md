# GitHub Actions CI/CD Setup Guide

## Overview

This project includes GitHub Actions workflows for automated building of iOS and Android apps on every push.

## Workflows Included

### 1. iOS Build (`.github/workflows/ios-build.yml`)
- Builds iOS app on macOS runner
- Runs on every push to main/master/develop branches
- Can be manually triggered from GitHub Actions tab
- Uploads build artifacts for 7 days

### 2. Android Build (`.github/workflows/android-build.yml`)
- Builds Android APK on Ubuntu runner
- Runs on every push to main/master/develop branches
- Can be manually triggered from GitHub Actions tab
- Uploads APK file for 7 days

## Setup Instructions

### Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: MedAdherence app with OCR"

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/med_ocr_mobile_app.git

# Push to GitHub
git push -u origin main
```

### Step 2: Enable GitHub Actions

1. Go to your repository on GitHub
2. Click on the **Actions** tab
3. GitHub will automatically detect the workflow files
4. Workflows will run automatically on next push

### Step 3: Manual Trigger (Optional)

You can manually trigger builds:

1. Go to **Actions** tab
2. Select **iOS Build** or **Android Build**
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

## Viewing Build Results

### When Build Completes:

1. Go to **Actions** tab in your GitHub repo
2. Click on the latest workflow run
3. Scroll down to **Artifacts** section
4. Download:
   - `ios-build` - iOS build files
   - `android-apk` - Android APK file

## Build Status Badge (Optional)

Add to your README.md:

```markdown
![iOS Build](https://github.com/YOUR_USERNAME/med_ocr_mobile_app/workflows/iOS%20Build/badge.svg)
![Android Build](https://github.com/YOUR_USERNAME/med_ocr_mobile_app/workflows/Android%20Build/badge.svg)
```

## Free Tier Limits

### Public Repository:
- ✅ **Unlimited** build minutes
- ✅ **Unlimited** storage
- ✅ **Completely FREE**

### Private Repository:
- ✅ **2,000** minutes/month FREE
- ✅ **500 MB** storage FREE
- ℹ️ macOS runners use **10x** minutes (20 min build = 200 minutes used)

## Build Times (Approximate)

- **iOS Build**: 10-15 minutes
- **Android Build**: 5-10 minutes

## Troubleshooting

### Build Fails with "No workspace found"

The iOS workspace is created by CocoaPods. Make sure:
- `ios/Podfile` exists
- Workflow runs `pod install` before building

### Build Fails with Code Signing Error

The workflow uses `CODE_SIGNING_ALLOWED=NO` for building without certificates. This creates an unsigned build for testing purposes.

### Android Build Fails

Ensure:
- `android/gradlew` has execute permissions
- Add to `.gitattributes`: `*.gradle text eol=lf`

## Advanced: TestFlight Deployment

To automatically deploy to TestFlight, you'll need:

1. **App Store Connect API Key**
2. **Provisioning Profile**
3. **Distribution Certificate**

Add these as GitHub Secrets and update the workflow. (Let me know if you want this setup)

## Workflow Features

### Automatic Triggers:
- ✅ Every push to main/master/develop
- ✅ Every pull request
- ✅ Manual trigger from UI

### Build Artifacts:
- ✅ Retained for 7 days
- ✅ Downloadable from Actions tab
- ✅ Separate for iOS and Android

### Optimizations:
- ✅ Caches npm dependencies
- ✅ Uses `npm ci` for faster, reliable installs
- ✅ Parallel iOS and Android builds

## Cost Breakdown (Private Repos)

If your repo is **private**:

| Build Type | Time | Minutes Used | Cost |
|------------|------|--------------|------|
| iOS | 15 min | 150 min (10x multiplier) | $0 (within 2,000 free) |
| Android | 8 min | 8 min (1x multiplier) | $0 (within 2,000 free) |

**You can do ~12 iOS builds/month for FREE on private repos**

## Next Steps

1. **Push your code to GitHub**
2. **Workflows start automatically**
3. **Check Actions tab for build status**
4. **Download builds from Artifacts**
5. **Install on your devices for testing**

## Installing Built Apps

### iOS:
- Unsigned builds cannot be installed directly
- For signed builds, use TestFlight or direct install via Xcode
- Or use a signing service like AppCenter

### Android:
- Download APK from Artifacts
- Transfer to Android device
- Enable "Install from Unknown Sources"
- Install the APK

## Questions?

Check the workflow logs in the Actions tab for detailed build information.

---

**Free iOS and Android builds on every push!** 🎉
