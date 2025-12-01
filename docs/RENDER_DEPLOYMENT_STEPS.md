# Render Deployment - Step by Step Guide

Follow these exact steps to deploy your Flask backend to Render's free tier.

## Prerequisites

- [ ] GitHub account
- [ ] Render account (sign up at https://render.com)
- [ ] Git installed locally

## Step 1: Push Code to GitHub

### 1.1 Initialize Git (if not already done)

```powershell
cd C:\Users\cadem\Desktop\med_ocr_expo
git init
```

### 1.2 Create .gitignore

Create `.gitignore` in the root directory:

```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.so
*.dylib
*.egg-info/
dist/
build/
*.log
.env
.venv
venv/
data/*.json
node_modules/
.expo/
.expo-shared/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
```

### 1.3 Commit and Push

```powershell
git add .
git commit -m "Add shared backend with data sync"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/med-ocr-expo.git
git push -u origin main
```

**Important:** Replace `YOUR_USERNAME` with your actual GitHub username.

If you need to create a new GitHub repository:
1. Go to https://github.com/new
2. Name it `med-ocr-expo`
3. Click "Create repository"
4. Use the commands above

## Step 2: Deploy to Render

### 2.1 Sign Up / Log In

1. Go to https://dashboard.render.com
2. Sign up with GitHub (recommended) or email

### 2.2 Create New Web Service

1. Click **"New +"** button (top right)
2. Select **"Web Service"**
3. Click **"Connect account"** and authorize GitHub

### 2.3 Select Repository

1. Find and select `med-ocr-expo` repository
2. Click **"Connect"**

### 2.4 Configure Service

Fill in these **exact** settings:

**Basic Info:**
- **Name:** `med-ocr-api` (or your preferred name)
- **Region:** Oregon (US West) - or closest to you
- **Branch:** `main`
- **Root Directory:** `api`

**Build & Deploy:**
- **Runtime:** `Python 3`
- **Build Command:**
  ```bash
  pip install --upgrade pip && pip install -r requirements.txt && apt-get update && apt-get install -y tesseract-ocr libgl1-mesa-glx libglib2.0-0
  ```

- **Start Command:**
  ```bash
  gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app
  ```

**Instance Type:**
- **Plan:** `Free` (0.1 CPU, 512 MB RAM)

**Advanced Settings (optional):**
- **Auto-Deploy:** `Yes` (recommended)
- **Health Check Path:** `/health`

### 2.5 Environment Variables

Click **"Advanced"** and add these environment variables:

| Key | Value |
|-----|-------|
| `PYTHON_VERSION` | `3.11.0` |
| `PRODUCTION_MODE` | `true` |

### 2.6 Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. Watch the logs for any errors

## Step 3: Verify Deployment

### 3.1 Check Deployment Status

Look for these messages in the logs:
```
==> Installing dependencies
==> Build successful
==> Starting service
Your service is live 🎉
```

### 3.2 Get Your URL

Once deployed, you'll see your service URL:
```
https://med-ocr-api-xxxx.onrender.com
```

### 3.3 Test the API

Open your browser or use curl:

```powershell
# Test health endpoint
curl https://med-ocr-api-xxxx.onrender.com/health

# Or open in browser:
https://med-ocr-api-xxxx.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "OCR API is running",
  "llm_enabled": false,
  "production_mode": true,
  "data_sync": true
}
```

## Step 4: Update Your Expo Apps

### 4.1 Update API Configuration

In **both** Expo apps, update `src/config/api.ts`:

```typescript
// Replace with your actual Render URL
export const LOCAL_OCR_API_URL = 'https://med-ocr-api-xxxx.onrender.com';
```

### 4.2 Test from App

1. Restart both Expo apps
2. Try scanning a prescription label
3. Check if data syncs between apps

## Step 5: Monitor Your Service

### 5.1 View Logs

- Dashboard: https://dashboard.render.com
- Select your service
- Click **"Logs"** tab
- View real-time logs

### 5.2 Check Metrics

- Click **"Metrics"** tab
- Monitor CPU, Memory, Response time

## Troubleshooting

### Issue: Build Failed

**Symptom:** Red "Build failed" message

**Solutions:**
1. Check build logs for specific error
2. Verify `requirements.txt` is correct
3. Ensure `api` directory has `app.py`
4. Try manual build command:
   ```bash
   pip install -r requirements.txt
   ```

### Issue: Application Failed to Respond

**Symptom:** Service deployed but health check fails

**Solutions:**
1. Check start command is correct:
   ```bash
   gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app
   ```
2. Verify port binding uses `$PORT` environment variable
3. Check logs for Python errors

### Issue: Tesseract Not Found

**Symptom:** Error: `tesseract is not installed or it's not in your PATH`

**Solutions:**
1. Add to build command:
   ```bash
   apt-get update && apt-get install -y tesseract-ocr
   ```
2. Verify in `app.py`:
   ```python
   if sys.platform != 'win32':
       pytesseract.pytesseract.tesseract_cmd = 'tesseract'
   ```

### Issue: Service Sleeps After 15 Minutes

**This is normal on the free tier!**

**What happens:**
- After 15 minutes of no requests, service goes to sleep
- Next request takes ~30 seconds to wake up
- All subsequent requests are fast

**Solutions:**
1. **Accept it** - Free tier limitation
2. **Keep-alive service** (free):
   - Sign up at https://uptimerobot.com
   - Add monitor for your health endpoint
   - Ping every 14 minutes
3. **Upgrade to paid** - $7/month for always-on

### Issue: CORS Errors

**Symptom:** `Access-Control-Allow-Origin` errors in browser

**Solutions:**
1. Already configured in `app.py` with `flask-cors`
2. If still seeing errors, check CORS is enabled:
   ```python
   from flask_cors import CORS
   CORS(app)
   ```

## Free Tier Limitations

| Feature | Free Tier | Paid Tier ($7/mo) |
|---------|-----------|-------------------|
| **Hours/month** | 750 | Unlimited |
| **Sleep time** | After 15 min | Never |
| **RAM** | 512 MB | 512 MB - 8 GB |
| **CPU** | 0.1 CPU | 0.5 - 4 CPU |
| **Bandwidth** | 100 GB | 100 GB+ |
| **Build time** | 15 min | 20 min |

**Free tier is perfect for:**
- Development/testing
- Low-traffic personal apps
- Proof of concept

**Upgrade when:**
- You need 24/7 uptime
- High traffic (100+ requests/day)
- Multiple users

## Next Steps

- [ ] Deploy successful
- [ ] Health check passes
- [ ] Update both Expo apps with new URL
- [ ] Test data sync between apps
- [ ] Set up Uptime Robot (optional)
- [ ] Add custom domain (optional, $10-15/year)

## Useful Commands

### View Live Logs
```powershell
# From Render dashboard
# Click service → Logs tab
```

### Redeploy Service
```powershell
# Push to GitHub
git add .
git commit -m "Update backend"
git push

# Render auto-deploys (if enabled)
```

### Manual Deploy
```powershell
# From Render dashboard
# Click "Manual Deploy" → "Deploy latest commit"
```

## Support

- **Render Docs:** https://render.com/docs
- **Community:** https://community.render.com
- **Status:** https://status.render.com

## Your Deployment Info

Fill this out after deployment:

- **Service Name:** `____________________`
- **URL:** `https://______________________.onrender.com`
- **Region:** `____________________`
- **Deployed:** `____________________` (date)

**Congratulations!** Your backend is now live on Render. 🎉
