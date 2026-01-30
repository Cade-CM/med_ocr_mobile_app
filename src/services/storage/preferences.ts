/**
 * Preferences Storage - User preferences and settings operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences } from '@types';
import { STORAGE_KEYS } from './keys';
import { getCurrentUserId } from './user';

/**
 * User settings interface (app-level, not personal preferences)
 */
export interface UserSettings {
  autoSync: boolean;
  syncInterval: number;
  offlineMode: boolean;
  debugMode: boolean;
}

/**
 * Get user-specific storage key
 */
async function getUserKey(baseKey: string): Promise<string> {
  const userId = await getCurrentUserId();
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Default user preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  wakeTime: '07:00',
  sleepTime: '22:00',
  notificationEnabled: true,
  notificationSound: true,
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  theme: 'auto',
};

/**
 * Default user settings
 */
const DEFAULT_SETTINGS: UserSettings = {
  autoSync: true,
  syncInterval: 30,
  offlineMode: false,
  debugMode: false,
};

/**
 * Save user preferences
 */
export async function saveUserPreferences(preferences: UserPreferences): Promise<void> {
  try {
    const key = await getUserKey(STORAGE_KEYS.USER_PREFERENCES);
    await AsyncStorage.setItem(key, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
    throw error;
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const key = await getUserKey(STORAGE_KEYS.USER_PREFERENCES);
    const data = await AsyncStorage.getItem(key);
    if (!data) return DEFAULT_PREFERENCES;
    
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update specific user preferences
 */
export async function updateUserPreferences(
  updates: Partial<UserPreferences>,
): Promise<void> {
  const current = await getUserPreferences();
  const updated = { ...current, ...updates };
  await saveUserPreferences(updated);
}

/**
 * Save user settings
 */
export async function saveUserSettings(settings: UserSettings): Promise<void> {
  try {
    const key = await getUserKey(STORAGE_KEYS.USER_SETTINGS);
    await AsyncStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving user settings:', error);
    throw error;
  }
}

/**
 * Get user settings
 */
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const key = await getUserKey(STORAGE_KEYS.USER_SETTINGS);
    const data = await AsyncStorage.getItem(key);
    if (!data) return DEFAULT_SETTINGS;
    
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    console.error('Error getting user settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update specific user settings
 */
export async function updateUserSettings(
  updates: Partial<UserSettings>,
): Promise<void> {
  const current = await getUserSettings();
  const updated = { ...current, ...updates };
  await saveUserSettings(updated);
}

/**
 * Reset preferences to defaults
 */
export async function resetUserPreferences(): Promise<void> {
  await saveUserPreferences(DEFAULT_PREFERENCES);
}

/**
 * Reset settings to defaults
 */
export async function resetUserSettings(): Promise<void> {
  await saveUserSettings(DEFAULT_SETTINGS);
}
