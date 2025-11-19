# 🚀 Render Free Tier Deployment - Quick Checklist

## ✅ Pre-Deployment (5 minutes)

Files are ready! Here's what was prepared:

- [x] `api/requirements.txt` - Updated with gunicorn
- [x] `api/render.yaml` - Render configuration
- [x] `api/app.py` - Fixed Tesseract path for Linux
- [x] `.gitignore` - Ignore data files
- [x] Documentation - Complete deployment guide

## 📝 Deployment Steps

### Step 1: Push to GitHub (2 minutes)

```powershell
cd C:\Users\cadem\Desktop\med_ocr_expo

# Initialize git (if not already)
git init

# Add all files
git add .
git commit -m "Add shared backend with Render deployment config"

# Create GitHub repo at: https://github.com/new
# Then connect and push:
git remote add origin https://github.com/YOUR_USERNAME/med-ocr-expo.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render (3 minutes)

1. **Go to:** https://dashboard.render.com/select-repo
2. **Connect GitHub:** Authorize Render to access your repos
3. **Select repo:** `med-ocr-expo`
4. **Configure:**
   - Name: `med-ocr-api`
   - Root Directory: `api`
   - Runtime: `Python 3`
   - Build Command: 
     ```
     pip install --upgrade pip && pip install -r requirements.txt && apt-get update && apt-get install -y tesseract-ocr libgl1-mesa-glx libglib2.0-0
     ```
   - Start Command:
     ```
     gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app
     ```
   - Instance Type: **Free**

5. **Add Environment Variables:**
   - `PYTHON_VERSION` = `3.11.0`
   - `PRODUCTION_MODE` = `true`

6. **Click:** "Create Web Service"

### Step 3: Get Your URL (1 minute)

Wait for deployment (5-10 minutes), then:

1. Copy your URL: `https://med-ocr-api-xxxx.onrender.com`
2. Test: Open `https://med-ocr-api-xxxx.onrender.com/health`

Expected response:
```json
{
  "status": "healthy",
  "llm_enabled": false,
  "production_mode": true,
  "data_sync": true
}
```

### Step 4: Update Your Apps (2 minutes)

In **both** Expo apps, edit `src/config/api.ts`:

```typescript
export const LOCAL_OCR_API_URL = 'https://med-ocr-api-xxxx.onrender.com';
```

Replace `xxxx` with your actual Render subdomain.

## 🎉 That's It!

Your backend is now live and accessible from anywhere.

## ⚠️ Free Tier Notes

**Service Sleeps:**
- After 15 minutes of no requests, service goes to sleep
- First request after sleep takes ~30 seconds to wake up
- All subsequent requests are fast

**Keep-Alive (Optional):**
- Use https://uptimerobot.com (free)
- Ping your `/health` endpoint every 14 minutes
- Keeps service awake 24/7

## 📊 Monitor Your Service

**View Logs:**
https://dashboard.render.com → Your Service → Logs

**Check Metrics:**
https://dashboard.render.com → Your Service → Metrics

## 🐛 Troubleshooting

**Build fails?**
- Check logs for specific error
- Verify `requirements.txt` has all dependencies

**Service doesn't respond?**
- Check start command is correct
- Verify port uses `$PORT` variable

**Tesseract errors?**
- Build command includes `apt-get install -y tesseract-ocr`

## 📚 Full Documentation

- `RENDER_DEPLOYMENT_STEPS.md` - Detailed step-by-step guide
- `api/RENDER_DEPLOYMENT.md` - Original deployment docs
- `SHARED_BACKEND_SETUP.md` - Backend architecture

## 💰 Upgrade Options

**When to upgrade to paid ($7/month)?**
- Need 24/7 uptime
- High traffic (100+ requests/day)
- Multiple simultaneous users

## ✅ Post-Deployment Checklist

- [ ] Backend deployed successfully
- [ ] Health endpoint returns 200 OK
- [ ] Both Expo apps updated with new URL
- [ ] Test OCR from App 1
- [ ] Verify sync works in App 2
- [ ] (Optional) Set up Uptime Robot

**Your deployment URL:**
```
https://___________________.onrender.com
```

**Deployed on:** _________________ (date)

---

**Need help?** See `RENDER_DEPLOYMENT_STEPS.md` for detailed troubleshooting.
