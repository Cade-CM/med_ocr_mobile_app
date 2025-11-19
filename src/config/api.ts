/**
 * API Configuration
 */

// Local OCR API (Flask + Tesseract)
// Make sure the Flask API is running: cd api && python app.py
export const LOCAL_OCR_API_URL = 'http://192.168.1.79:5000';

// Alternative: If testing on same device (emulator), use localhost
// export const LOCAL_OCR_API_URL = 'http://localhost:5000';

/**
 * Google Cloud Vision API (Legacy/Alternative)
 * Only needed if you want to switch back to cloud-based OCR
 */
export const GOOGLE_CLOUD_VISION_API_KEY = 'YOUR_API_KEY_HERE';
