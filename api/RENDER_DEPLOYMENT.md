# Deploy to Render (Free Tier)

This guide shows how to deploy your Flask backend to Render for free, making it accessible from anywhere.

## Prerequisites

- GitHub account
- Render account (free) - https://render.com

## Step 1: Prepare Your Backend for Deployment

### 1.1 Create `requirements.txt`

Your existing `api/requirements.txt` should include all dependencies:

```txt
flask==3.0.0
flask-cors==4.0.0
pillow==10.1.0
opencv-python-headless==4.8.1.78
pytesseract==0.3.10
numpy==1.26.2
requests==2.31.0
```

### 1.2 Create `render.yaml` (optional but recommended)

Create `api/render.yaml`:

```yaml
services:
  - type: web
    name: med-ocr-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: PRODUCTION_MODE
        value: true
```

### 1.3 Add Gunicorn

Update `api/requirements.txt` to include:

```txt
gunicorn==21.2.0
```

### 1.4 Create startup script

Create `api/start.sh`:

```bash
#!/bin/bash
# Install Tesseract OCR
apt-get update && apt-get install -y tesseract-ocr

# Start the app
gunicorn -w 4 -b 0.0.0.0:$PORT app:app
```

Make it executable:
```bash
chmod +x api/start.sh
```

## Step 2: Push to GitHub

```bash
# Navigate to your project
cd med_ocr_expo

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Render deployment"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/med-ocr-expo.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Render

### 3.1 Create New Web Service

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select `med-ocr-expo` repo

### 3.2 Configure Service

**Basic Settings:**
- Name: `med-ocr-api`
- Region: Choose closest to you
- Branch: `main`
- Root Directory: `api`
- Environment: `Python 3`
- Build Command: `pip install -r requirements.txt && apt-get update && apt-get install -y tesseract-ocr`
- Start Command: `gunicorn -w 4 -b 0.0.0.0:$PORT app:app`

**Environment Variables:**
- Add: `PRODUCTION_MODE` = `true`
- Add: `PYTHON_VERSION` = `3.11.0`

**Instance Type:**
- Select: `Free` (0.1 CPU, 512 MB RAM)

### 3.3 Deploy

1. Click "Create Web Service"
2. Wait 5-10 minutes for deployment
3. Your API will be available at: `https://med-ocr-api-xxxx.onrender.com`

## Step 4: Update Expo Apps

Update `src/config/api.ts` in both apps:

```typescript
// Replace with your Render URL
export const LOCAL_OCR_API_URL = 'https://med-ocr-api-xxxx.onrender.com';
```

## Step 5: Test Deployment

```bash
# Test health endpoint
curl https://med-ocr-api-xxxx.onrender.com/health

# Expected response:
{
  "status": "healthy",
  "message": "OCR API is running",
  "llm_enabled": false,
  "production_mode": true,
  "data_sync": true
}
```

## Troubleshooting

### Issue: "Application failed to respond"

**Solution:** Check build logs for errors
- Ensure all dependencies in `requirements.txt`
- Verify Tesseract installation in build command

### Issue: "Build failed"

**Solution:** Check Python version compatibility
- Use Python 3.11 (set in environment variables)
- Update incompatible packages

### Issue: OCR not working

**Solution:** Ensure Tesseract is installed
- Add to build command: `apt-get update && apt-get install -y tesseract-ocr`
- Verify path in code: `pytesseract.pytesseract.tesseract_cmd = 'tesseract'` (don't hardcode Windows path)

### Issue: Service sleeps after 15 minutes of inactivity (Free tier)

**Solution:** Options:
1. **Accept it** - First request after sleep takes ~30 seconds to wake up
2. **Keep-alive ping** - Add cron job to ping `/health` every 14 minutes
3. **Upgrade to paid** - $7/month for always-on service

### Keep-Alive Solution (Free)

Use a free service like Uptime Robot:
1. Create account: https://uptimerobot.com
2. Add new monitor
3. URL: `https://med-ocr-api-xxxx.onrender.com/health`
4. Interval: 14 minutes

## Cost Breakdown

### Free Tier (Render)
- **Cost:** $0/month
- **Limits:**
  - 750 hours/month (enough for 1 service)
  - Sleeps after 15 min inactivity
  - 512 MB RAM
  - 0.1 CPU
- **Good for:** Development, testing, low-traffic apps

### Paid Tier (Render)
- **Cost:** $7/month
- **Benefits:**
  - Always on (no sleep)
  - 512 MB RAM
  - 0.5 CPU
  - Better performance
- **Good for:** Production apps with regular usage

## Alternative: Railway ($5 credit/month)

Railway provides $5 free credit monthly:

1. Go to https://railway.app
2. Connect GitHub repo
3. Deploy from `api` directory
4. Add environment variables
5. Your URL: `https://med-ocr-api.railway.app`

**Pros:** More generous free tier, better performance
**Cons:** Credit runs out faster with heavy usage

## Alternative: Fly.io (Free tier)

Fly.io offers free tier:

1. Install Fly CLI: `https://fly.io/docs/hands-on/install-flyctl/`
2. Login: `fly auth login`
3. Create app: `fly launch --dockerfile api/Dockerfile`
4. Deploy: `fly deploy`

**Pros:** Global edge network, better performance
**Cons:** More complex setup

## Environment Variables for Production

Add these to Render dashboard:

```
PRODUCTION_MODE=true
FLASK_ENV=production
CORS_ORIGINS=*
MAX_CONTENT_LENGTH=10485760
```

## Custom Domain (Optional)

If you buy a domain ($10-15/year):

1. Add custom domain in Render dashboard
2. Update DNS records with your domain provider
3. Render provides free SSL certificate

## Monitoring

Render provides:
- Automatic logs
- Metrics dashboard
- Health checks
- Email alerts

Access at: https://dashboard.render.com/web/YOUR_SERVICE/logs

## Next Steps

After deployment:
1. Test all API endpoints
2. Update both Expo apps with new URL
3. Test data sync between apps
4. Monitor logs for errors
5. Set up Uptime Robot for keep-alive (optional)

## Support

- Render Docs: https://render.com/docs
- Community Forum: https://community.render.com
- GitHub Issues: Report bugs in your repo
