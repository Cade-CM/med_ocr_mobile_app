/**
 * API Configuration
 */

import * as Network from 'expo-network';

let cachedApiUrl: string | null = null;

/**
 * Automatically discovers the local Flask API server on the network
 * Tries common local network IPs and caches the result
 */
export async function getLocalOCRApiUrl(): Promise<string> {
  // Return cached URL if available
  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  try {
    // Get the device's current IP address
    const ipAddress = await Network.getIpAddressAsync();
    console.log(`📱 Device IP address: ${ipAddress}`);
    
    if (ipAddress) {
      // Extract the network prefix (e.g., "192.168.1" or "10.0.0")
      const networkPrefix = ipAddress.split('.').slice(0, 3).join('.');
      console.log(`🔍 Searching for Flask server on network: ${networkPrefix}.x`);
      
      // Try common host machine IPs on the same network
      const potentialHosts = [
        `${networkPrefix}.214`,  // Your current IP pattern
        `${networkPrefix}.1`,    // Common router/gateway
        `${networkPrefix}.100`,  // Common static IP range
        `${networkPrefix}.254`,  // Another common gateway
        `${networkPrefix}.2`,    // Common secondary IP
      ];

      // Test each potential host
      for (const host of potentialHosts) {
        const testUrl = `http://${host}:5000`;
        console.log(`  Testing: ${testUrl}`);
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
          
          const response = await fetch(`${testUrl}/health`, {
            method: 'GET',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            console.log(`✓ Found Flask API server at: ${testUrl}`);
            cachedApiUrl = testUrl;
            return testUrl;
          }
        } catch (error) {
          // Server not found at this IP, continue to next
          console.log(`  ✗ Not found at ${host}`);
          continue;
        }
      }
    }
  } catch (error) {
    console.error('Error detecting local API:', error);
  }

  // Fallback to hardcoded IP if discovery fails
  const fallbackUrl = 'http://10.0.0.214:5000';
  console.log(`⚠ API discovery failed, using fallback: ${fallbackUrl}`);
  cachedApiUrl = fallbackUrl;
  return fallbackUrl;
}

/**
 * Clear the cached API URL (call this if connection fails to force re-discovery)
 */
export function resetApiUrlCache(): void {
  cachedApiUrl = null;
}

/**
 * Legacy export for backward compatibility
 * Note: This is now async, so prefer using getLocalOCRApiUrl() directly
 */
export const LOCAL_OCR_API_URL = 'http://10.0.0.214:5000'; // Fallback only

/**
 * Google Cloud Vision API (Legacy/Alternative)
 * Only needed if you want to switch back to cloud-based OCR
 */
export const GOOGLE_CLOUD_VISION_API_KEY = 'YOUR_API_KEY_HERE';

