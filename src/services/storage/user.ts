/**
 * User Storage - User authentication and profile operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './keys';
import * as BackendService from '../BackendService';

/**
 * Local user profile interface
 */
export interface LocalUserProfile {
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  nickname?: string;
  age?: number;
  gender?: string;
}

/**
 * Generate a unique, de-identified user ID
 */
export function generateUserId(): string {
  return `USR_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
}

/**
 * Get the current logged-in user's de-identified ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}

/**
 * Set the current user ID (de-identified)
 */
export async function setCurrentUserId(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, userId);
  } catch (error) {
    console.error('Error setting current user ID:', error);
  }
}

/**
 * Get user ID from email (for login purposes only)
 */
export async function getUserIdFromEmail(email: string): Promise<string | null> {
  try {
    const lookupData = await AsyncStorage.getItem(STORAGE_KEYS.USER_LOOKUP);
    if (!lookupData) return null;
    
    const lookup: { [email: string]: string } = JSON.parse(lookupData);
    return lookup[email.toLowerCase()] || null;
  } catch (error) {
    console.error('Error getting user ID from email:', error);
    return null;
  }
}

/**
 * Register a new user with de-identified ID
 */
export async function registerUser(email: string, firstName: string, lastName: string): Promise<string> {
  try {
    const userId = generateUserId();
    const normalizedEmail = email.toLowerCase();
    
    // Store email-to-userId mapping (for login only)
    const lookupData = await AsyncStorage.getItem(STORAGE_KEYS.USER_LOOKUP);
    const lookup: { [email: string]: string } = lookupData ? JSON.parse(lookupData) : {};
    lookup[normalizedEmail] = userId;
    await AsyncStorage.setItem(STORAGE_KEYS.USER_LOOKUP, JSON.stringify(lookup));
    
    // Store profile data by user_id (de-identified)
    const profileKey = `${STORAGE_KEYS.PROFILE_DATA}_${userId}`;
    await AsyncStorage.setItem(profileKey, JSON.stringify({
      firstName,
      lastName,
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
    }));
    
    // Set as current user immediately after registration
    await setCurrentUserId(userId);
    
    console.log(`✅ Registered new user with de-identified ID: ${userId}`);
    return userId;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Login user and set as current (using email for lookup only)
 */
export async function loginUser(email: string): Promise<boolean> {
  try {
    const userId = await getUserIdFromEmail(email);
    if (!userId) return false;
    
    await setCurrentUserId(userId);
    console.log(`✅ User logged in with de-identified ID: ${userId}`);
    return true;
  } catch (error) {
    console.error('Error logging in user:', error);
    return false;
  }
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    console.log('✅ User logged out');
  } catch (error) {
    console.error('Error logging out user:', error);
  }
}

/**
 * Get user profile (firstName, lastName, email, etc.)
 */
export async function getUserProfile(): Promise<any | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const profileKey = `${STORAGE_KEYS.PROFILE_DATA}_${userId}`;
    const data = await AsyncStorage.getItem(profileKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Update user profile data
 */
export async function updateUserProfile(data: {
  user_key: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  age?: string;
  gender?: string;
  email?: string;
  display_name?: string;
}): Promise<void> {
  try {
    const { user_key, ...profileData } = data;
    if (!user_key) throw new Error('No user_key provided');

    // Update backend profile using BackendService
    const backendPayload = {
      user_key,
      first_name: data.firstName,
      last_name: data.lastName,
      nickname: data.nickname,
      age: data.age ? parseInt(data.age) : undefined,
      gender: data.gender,
      email: data.email,
      display_name: data.display_name || data.nickname || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
    };
    
    try {
      await BackendService.updateUserProfile(backendPayload);
    } catch (err) {
      console.error('Backend profile update failed:', err);
    }

    // Update local AsyncStorage for offline support
    const profileKey = `${STORAGE_KEYS.PROFILE_DATA}_${user_key}`;
    const existingData = await AsyncStorage.getItem(profileKey);
    const profile = existingData ? JSON.parse(existingData) : {};
    const updatedProfile = {
      ...profile,
      ...profileData,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(profileKey, JSON.stringify(updatedProfile));
    console.log(`✅ Updated profile for user_key: ${user_key}`);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Save local user profile
 */
export async function saveLocalUserProfile(profile: LocalUserProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_USER_PROFILE, JSON.stringify(profile));
}

/**
 * Get local user profile with fallback default
 */
export async function getLocalUserProfile(): Promise<LocalUserProfile | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_USER_PROFILE);
  if (data) {
    return JSON.parse(data);
  } else {
    const defaultProfile: LocalUserProfile = {
      firstName: '',
      lastName: '',
      email: '',
      displayName: '',
    };
    await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_USER_PROFILE, JSON.stringify(defaultProfile));
    return defaultProfile;
  }
}

/**
 * Update local user profile (partial update)
 */
export async function updateLocalUserProfile(updates: Partial<LocalUserProfile>): Promise<void> {
  const current = await getLocalUserProfile();
  const updated = { ...current, ...updates };
  await saveLocalUserProfile(updated as LocalUserProfile);
}

/**
 * Sync local user profile to backend
 */
export async function syncLocalUserProfile(userKey: string): Promise<any> {
  const profile = await getLocalUserProfile();
  if (!profile) return;
  const payload: any = {
    user_key: userKey,
    first_name: profile.firstName,
    last_name: profile.lastName,
    email: profile.email,
    display_name: profile.displayName,
  };
  if (profile.nickname) payload.nickname = profile.nickname;
  if (profile.age !== undefined) payload.age = profile.age;
  if (profile.gender) payload.gender = profile.gender;
  return BackendService.updateUserProfile(payload);
}
