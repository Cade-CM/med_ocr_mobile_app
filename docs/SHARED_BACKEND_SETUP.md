# Shared Backend Setup Guide

This guide explains how to share OCR data between multiple Expo apps using your existing Flask backend.

## Architecture Overview

Both Expo apps connect to the same Flask backend API:
```
[Expo App 1] ──┐
               ├──> [Flask API] ──> [Database]
[Expo App 2] ──┘
```

## Setup Steps

### 1. Backend Setup (Flask API)

Your backend is already configured at `api/app.py` with these endpoints:
- `GET /health` - Health check
- `POST /ocr` - Basic OCR processing
- `POST /ocr/detailed` - Enhanced OCR with LLM parsing
- **NEW** - Data sync endpoints (see below)

### 2. Add Data Sync Endpoints

I've added new endpoints to `api/app.py` for sharing medication data:
- `GET /api/medications` - Get all medications
- `POST /api/medications` - Create/update medication
- `DELETE /api/medications/<id>` - Delete medication
- `GET /api/medications/<id>` - Get single medication
- `GET /api/adherence` - Get adherence records
- `POST /api/adherence` - Create adherence record

### 3. Frontend Configuration

#### Option A: Same Local Network (Easiest)

Both apps connect to your computer's local IP:

**App 1 - Update `src/config/api.ts`:**
```typescript
export const LOCAL_OCR_API_URL = 'http://192.168.1.79:5000';
```

**App 2 - Update `src/config/api.ts`:**
```typescript
export const LOCAL_OCR_API_URL = 'http://192.168.1.79:5000';
```

**Requirements:**
- Both devices must be on the same WiFi network
- Flask server running: `cd api && python app.py`
- Free (no hosting costs)

#### Option B: Cloud Hosting (Recommended for Production)

Deploy your Flask API to a cloud service:

**Free Tier Options:**
1. **Render** (Recommended)
   - Free tier: 750 hours/month
   - Auto-deploy from GitHub
   - URL: `https://your-app.onrender.com`

2. **Railway**
   - $5 credit/month free
   - Easy deployment
   - URL: `https://your-app.up.railway.app`

3. **Fly.io**
   - Free tier available
   - Global edge network
   - URL: `https://your-app.fly.dev`

**After deployment, update both apps:**
```typescript
export const LOCAL_OCR_API_URL = 'https://your-app.onrender.com';
```

## Data Flow

### Scenario 1: OCR Processing
```
1. User scans prescription in App 1
2. App 1 sends image to /ocr/detailed
3. Backend processes and returns parsed data
4. App 1 saves to local storage
5. App 1 syncs to backend (/api/medications)
6. App 2 can fetch from backend (/api/medications)
```

### Scenario 2: Cross-Device Sync
```
1. App 1 creates medication locally
2. App 1 syncs to backend (/api/medications POST)
3. App 2 periodically fetches updates (/api/medications GET)
4. App 2 displays synchronized medications
```

## Database Options

### Option 1: JSON File Storage (Current - Simple)
- Stores data in `api/data/medications.json`
- Good for: Small datasets, simple setup
- Free

### Option 2: SQLite (Recommended)
- Better performance and reliability
- Already installed with Python
- Free

### Option 3: PostgreSQL (Production)
- Best for: Multiple users, large datasets
- Free tier: Supabase, Neon, ElephantSQL
- $0-25/month

## Security Considerations

### Authentication (Optional)
Add user authentication to prevent unauthorized access:

1. **Simple API Key**
   ```python
   # In app.py
   API_KEY = "your-secret-key-here"
   
   @app.before_request
   def check_api_key():
       if request.headers.get('X-API-Key') != API_KEY:
           return jsonify({'error': 'Unauthorized'}), 401
   ```

2. **JWT Tokens** (More secure)
   - Use Flask-JWT-Extended
   - User login/registration
   - Token-based authentication

### HTTPS
If deploying to cloud, all services provide free HTTPS certificates automatically.

## Cost Breakdown

### Option 1: Local Network Only
- **Cost: $0/month**
- Backend runs on your computer
- Only works when devices are on same network

### Option 2: Free Cloud Hosting
- **Cost: $0/month**
- Render free tier (with limitations)
- No custom domain
- May sleep after inactivity

### Option 3: Paid Cloud Hosting
- **Cost: $5-20/month**
- Better performance
- 24/7 uptime
- Custom domain optional ($10-15/year)

## Recommended Setup

**For Development/Testing:**
1. Use local network (Option A)
2. JSON file storage
3. No authentication needed

**For Production:**
1. Deploy to Render (free tier)
2. Upgrade to SQLite
3. Add API key authentication
4. Optional: Custom domain later

## Next Steps

1. **Test locally first** - Run Flask on your network
2. **Verify both apps connect** - Check health endpoint
3. **Test data sync** - Create medication in App 1, fetch in App 2
4. **Deploy to cloud** - When ready for production

## Deployment Guide (Render)

See `RENDER_DEPLOYMENT.md` for step-by-step cloud deployment instructions.

## Troubleshooting

### "Connection refused" error
- Check Flask is running: `python app.py`
- Verify IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Check firewall settings

### Data not syncing
- Verify API endpoints are accessible
- Check network connectivity
- Review backend logs

### "CORS" error
- Already configured in `app.py` with `flask-cors`
- If issues persist, check CORS headers

## Support

For issues or questions, check:
- `api/README.md` - Backend documentation
- `QUICK_START.md` - App setup guide
- Backend logs in terminal
