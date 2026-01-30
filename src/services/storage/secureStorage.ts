/**
 * Secure Storage Service - Encrypted storage for sensitive data
 * 
 * Uses expo-secure-store which leverages:
 * - iOS: Keychain Services
 * - Android: Keystore System (encrypted SharedPreferences)
 * 
 * Use this for:
 * - Auth tokens
 * - User credentials  
 * - Any PHI (medications, patient names, etc.)
 * 
 * Do NOT use AsyncStorage for sensitive data - it's unencrypted.
 */

import * as SecureStore from 'expo-secure-store';

// Secure storage keys
export const SECURE_KEYS = {
  // Auth tokens (managed by Supabase's AsyncStorageAdapter - these are legacy)
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  
  // User identifiers
  // DEPRECATED: user_key should be derived from session, not stored
  // Kept for backwards compatibility during migration - clearAuthSession still clears it
  USER_KEY: 'user_key',
  USER_ID: 'user_id',
  
  // Session state
  SESSION_DATA: 'session_data',
} as const;

/**
 * Store a value securely (encrypted)
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`SecureStore setItem error for ${key}:`, error);
    throw error;
  }
}

/**
 * Retrieve a value from secure storage
 */
export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`SecureStore getItem error for ${key}:`, error);
    return null;
  }
}

/**
 * Delete a value from secure storage
 */
export async function deleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`SecureStore deleteItem error for ${key}:`, error);
    throw error;
  }
}

/**
 * Store JSON data securely
 */
export async function setSecureJSON<T>(key: string, value: T): Promise<void> {
  await setSecureItem(key, JSON.stringify(value));
}

/**
 * Retrieve JSON data from secure storage
 */
export async function getSecureJSON<T>(key: string): Promise<T | null> {
  const value = await getSecureItem(key);
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`SecureStore JSON parse error for ${key}:`, error);
    return null;
  }
}

/**
 * Clear all secure storage (for logout)
 */
export async function clearSecureStorage(): Promise<void> {
  const allKeys = Object.values(SECURE_KEYS);
  
  for (const key of allKeys) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      // Ignore errors for keys that don't exist
    }
  }
  
  console.log('Cleared secure storage');
}

/**
 * Store auth session securely
 * @deprecated Use Supabase auth session directly. User identity should be derived 
 * from session (AuthService.getCurrentUserKey), not stored separately.
 */
export async function storeAuthSession(session: {
  accessToken: string;
  refreshToken?: string;
  userKey: string;
  userId?: string;
}): Promise<void> {
  console.warn('storeAuthSession is deprecated - user_key should be derived from session');
  await setSecureItem(SECURE_KEYS.AUTH_TOKEN, session.accessToken);
  
  if (session.refreshToken) {
    await setSecureItem(SECURE_KEYS.REFRESH_TOKEN, session.refreshToken);
  }
  
  await setSecureItem(SECURE_KEYS.USER_KEY, session.userKey);
  
  if (session.userId) {
    await setSecureItem(SECURE_KEYS.USER_ID, session.userId);
  }
}

/**
 * Get stored auth session
 * @deprecated Use Supabase auth session directly. User identity should be derived 
 * from session (AuthService.getCurrentUserKey), not from stored values.
 */
export async function getAuthSession(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  userKey: string | null;
  userId: string | null;
}> {
  return {
    accessToken: await getSecureItem(SECURE_KEYS.AUTH_TOKEN),
    refreshToken: await getSecureItem(SECURE_KEYS.REFRESH_TOKEN),
    userKey: await getSecureItem(SECURE_KEYS.USER_KEY),
    userId: await getSecureItem(SECURE_KEYS.USER_ID),
  };
}

/**
 * Clear auth session (for logout)
 * Note: This still clears USER_KEY for backwards compatibility with existing 
 * installations that may have cached values from before the security update.
 */
export async function clearAuthSession(): Promise<void> {
  await deleteSecureItem(SECURE_KEYS.AUTH_TOKEN);
  await deleteSecureItem(SECURE_KEYS.REFRESH_TOKEN);
  await deleteSecureItem(SECURE_KEYS.USER_KEY);
  await deleteSecureItem(SECURE_KEYS.USER_ID);
}
