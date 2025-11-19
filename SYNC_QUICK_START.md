# Quick Start: Shared Backend Setup

This guide gets you up and running with shared data between your Expo apps in 5 minutes.

## What You Get

✅ Both Expo apps access the same medication data  
✅ OCR results sync automatically  
✅ Works on local network (free) or cloud (optional)  
✅ JSON export format for easy web integration  

## Option 1: Local Network Setup (Fastest - 5 minutes)

### Step 1: Start Backend

```bash
cd api
python app.py
```

You should see:
```
Medication OCR API Server (OPTIMIZED + DATA SYNC)
Running on: http://localhost:5000
```

### Step 2: Get Your Computer's IP Address

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your WiFi adapter (e.g., 192.168.1.79)
```

**Mac/Linux:**
```bash
ifconfig | grep "inet "
# Look for your local IP (e.g., 192.168.1.79)
```

### Step 3: Update Both Apps

In **both** Expo apps, update `src/config/api.ts`:

```typescript
export const LOCAL_OCR_API_URL = 'http://192.168.1.79:5000'; // Your IP here
```

### Step 4: Test It

**In App 1:**
1. Scan a prescription label
2. Save the medication
3. Data is stored locally AND synced to backend

**In App 2:**
1. Open the app
2. Pull sync or wait for auto-sync (5 minutes)
3. You should see the medication from App 1!

**Done!** Both apps now share the same backend. 🎉

---

## Option 2: Cloud Deployment (Production - 30 minutes)

### Why Cloud?

- Access from anywhere (not just local network)
- 24/7 availability
- Free tier available (Render, Railway, Fly.io)

### Quick Deploy to Render (Free)

See detailed guide: [`api/RENDER_DEPLOYMENT.md`](api/RENDER_DEPLOYMENT.md)

**TL;DR:**
1. Push code to GitHub
2. Connect GitHub to Render
3. Deploy (auto-configured)
4. Get URL: `https://your-app.onrender.com`
5. Update both apps with new URL

---

## Using the Sync Service

### Automatic Sync (Recommended)

Add to your `HomeScreen.tsx` or `DashboardScreen.tsx`:

```typescript
import {SyncService} from '@services/SyncService';

// Auto-sync every 5 minutes
useEffect(() => {
  const interval = setInterval(() => {
    SyncService.autoSync();
  }, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, []);
```

### Manual Sync

```typescript
import {SyncService} from '@services/SyncService';

// Full sync (push local + pull remote)
await SyncService.fullSync();

// Push local data to backend
await SyncService.syncMedicationsToBackend();

// Pull remote data to local
await SyncService.syncMedicationsFromBackend();

// Check if backend is online
const isOnline = await SyncService.isBackendAvailable();
```

### UI Component

See complete example: [`src/screens/SyncExample.tsx`](src/screens/SyncExample.tsx)

Add sync UI to your app:
- Backend status indicator
- Manual sync buttons
- Last sync timestamp
- Auto-sync every 5 minutes

---

## Data Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   App 1     │────────▶│ Flask Backend│◀────────│   App 2     │
│ (Phone 1)   │  POST   │  (Your PC/   │  GET    │ (Phone 2)   │
│             │  /api/  │   Cloud)     │  /api/  │             │
└─────────────┘  meds   └──────────────┘  meds   └─────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ medications.json │
                    │ adherence.json   │
                    └──────────────────┘
```

---

## API Endpoints Reference

### Health Check
```bash
GET /health
```

### OCR Processing
```bash
POST /ocr               # Basic OCR
POST /ocr/detailed      # Enhanced OCR with LLM
```

### Medication Management
```bash
GET  /api/medications           # Get all medications
POST /api/medications           # Create/update medication
GET  /api/medications/<id>      # Get single medication
DELETE /api/medications/<id>    # Delete medication
```

### Adherence Tracking
```bash
GET  /api/adherence             # Get all adherence records
POST /api/adherence             # Create adherence record
```

---

## Troubleshooting

### "Cannot connect to backend"

**Fix 1:** Check Flask is running
```bash
cd api
python app.py
```

**Fix 2:** Verify IP address is correct
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig | grep "inet "
```

**Fix 3:** Check both devices on same WiFi network

**Fix 4:** Check firewall settings (allow port 5000)

### "Data not syncing"

**Fix 1:** Check backend status in app

**Fix 2:** Manually trigger sync:
```typescript
await SyncService.fullSync();
```

**Fix 3:** Check backend logs for errors

### "CORS error"

Already handled in `app.py` with `flask-cors`. If still seeing:
- Restart Flask server
- Clear app cache
- Check URL in `api.ts` is correct

---

## File Format (JSON)

Medications are stored as JSON:

```json
{
  "id": "med_123",
  "drugName": "DOXYCYCLINE",
  "strength": "100MG",
  "dosage": "1 TABLET",
  "frequency": "TWICE DAILY",
  "patientName": "JOHN DOE",
  "rxNumber": "1234567-890",
  "pharmacy": "WALGREENS",
  "startDate": "2025-01-15T00:00:00.000Z",
  "reminderTimes": ["2025-01-15T08:00:00.000Z", "2025-01-15T20:00:00.000Z"],
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

---

## Cost Summary

| Option | Cost | Pros | Cons |
|--------|------|------|------|
| Local Network | **$0** | Free, fast, private | Same WiFi required |
| Render (Free) | **$0** | Access anywhere | Sleeps after 15min |
| Render (Paid) | **$7/mo** | Always on, fast | Monthly cost |
| Railway | **$5/mo** | Good free tier | Credit usage |
| Custom Domain | **$10-15/yr** | Professional URL | Optional, not needed |

**Recommendation:** Start with local network, deploy to Render free tier when needed.

---

## Next Steps

1. ✅ Set up local backend (5 min)
2. ✅ Test sync between apps
3. ✅ Add auto-sync to your screens
4. ⏳ Deploy to cloud (optional)
5. ⏳ Add custom domain (optional)

## Full Documentation

- [`SHARED_BACKEND_SETUP.md`](SHARED_BACKEND_SETUP.md) - Complete setup guide
- [`api/RENDER_DEPLOYMENT.md`](api/RENDER_DEPLOYMENT.md) - Cloud deployment
- [`src/services/SyncService.ts`](src/services/SyncService.ts) - Sync API reference
- [`src/screens/SyncExample.tsx`](src/screens/SyncExample.tsx) - UI example

## Questions?

Check existing documentation or create an issue in your repository.
