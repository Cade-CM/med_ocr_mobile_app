import AsyncStorage from '@react-native-async-storage/async-storage';
import {Medication, AdherenceRecord, UserPreferences, PatientStats} from '@types';
import { BACKEND_API_URL } from '@config/api';
import * as BackendService from './BackendService';

/**
 * Storage Service - Handles local data persistence
 * Backend API calls are delegated to BackendService for consistency
 */
export class StorageService {
      /**
       * Register or fetch user from backend
       * @deprecated Use BackendService.signupUser directly
       */
      static async signupUser(email: string, displayName: string, userKey: string): Promise<any> {
        return BackendService.signupUser({ email, display_name: displayName, user_key: userKey });
      }

      /**
       * Save user settings to backend
       */
      static async saveUserSettings(userKey: string, settings: any): Promise<void> {
        try {
          const response = await fetch(`${BACKEND_API_URL}/api/user_settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_key: userKey, ...settings }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Save user settings failed:', response.status, errorText);
            throw new Error(`Save user settings failed: ${response.status} ${errorText}`);
          }
        } catch (error) {
          console.error('Error saving user settings:', error);
          throw error;
        }
      }

      /**
       * Get user settings from backend
       */
      static async getUserSettings(userKey: string): Promise<any> {
        try {
          const response = await fetch(`${BACKEND_API_URL}/api/user_settings?user_key=${userKey}`);
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Get user settings failed:', response.status, errorText);
            throw new Error(`Get user settings failed: ${response.status} ${errorText}`);
          }
          return await response.json();
        } catch (error) {
          console.error('Error getting user settings:', error);
          throw error;
        }
      }

      /**
       * Save medication to backend (FastAPI contract)
       * @deprecated Use BackendService.createMedication directly
       */
      static async saveMedicationToBackend(medication: any, userKey: string): Promise<any> {
        return BackendService.createMedication({ user_key: userKey, ...medication });
      }

      /**
       * Get all medications for user from backend
       * @deprecated Use BackendService.fetchMedications directly
       */
      static async getMedicationsFromBackend(userKey: string): Promise<any[]> {
        return BackendService.fetchMedications(userKey);
      }

      /**
       * Log a medication event (adherence) to backend
       * @deprecated Use BackendService.logMedEvent directly
       */
      static async logMedEvent(event: any, userKey: string): Promise<any> {
        return BackendService.logMedEvent({ user_key: userKey, ...event });
      }

    /**
     * Save an event (sync to backend, keep last 7 days locally)
     */
    static async saveEvent(event: any): Promise<void> {
      try {
        // Sync to backend
        await BackendService.logMedEvent(event);
        // Local backup
        const events = await this.getEvents();
        const index = events.findIndex(e => e.id === event.id);
        if (index >= 0) {
          events[index] = event;
        } else {
          events.push(event);
        }
        // Keep only last 7 days locally
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const safeEvents = Array.isArray(events) ? events : [];
        const filtered = safeEvents.filter(e => new Date(e.startTime) >= sevenDaysAgo);
        await AsyncStorage.setItem('@events', JSON.stringify(filtered));
      } catch (error) {
        console.error('Error saving event:', error);
        throw error;
      }
    }

    /**
     * Get all events (last 7 days locally)
     */
    static async getEvents(): Promise<any[]> {
      try {
        const data = await AsyncStorage.getItem('@events');
        if (!data) return [];
        const events = JSON.parse(data);
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const safeEvents = Array.isArray(events) ? events : [];
        return safeEvents.filter((e: any) => new Date(e.startTime) >= sevenDaysAgo);
      } catch (error) {
        console.error('Error getting events:', error);
        return [];
      }
    }

    /**
     * Delete an event (sync to backend, update local)
     */
    static async deleteEvent(eventId: string): Promise<void> {
      try {
        // Sync to backend - Note: Backend may not have delete endpoint, handle gracefully
        try {
          await fetch(`${BACKEND_API_URL}/api/events/${eventId}`, {
            method: 'DELETE',
          });
        } catch (e) {
          console.warn('Backend delete event failed (may not be implemented):', e);
        }
        // Local update
        const events = await this.getEvents();
        const safeEvents = Array.isArray(events) ? events : [];
        const filtered = safeEvents.filter(e => e.id !== eventId);
        await AsyncStorage.setItem('@events', JSON.stringify(filtered));
      } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
      }
    }
  private static KEYS = {
    MEDICATIONS: '@medications',
    ADHERENCE_RECORDS: '@adherence_records',
    USER_PREFERENCES: '@user_preferences',
    PATIENT_NAMES: '@patient_names',
    PROFILE_DATA: '@profile_data',
    CURRENT_USER: '@current_user_id',
    USER_LOOKUP: '@user_lookup', // Maps user_id to email for login only
    LOCAL_USER_PROFILE: '@localUserProfile', // Local profile storage
  };

  /**
   * Generate a unique, de-identified user ID
   */
  static generateUserId(): string {
    return `USR_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  /**
   * Get the current logged-in user's de-identified ID
   */
  private static async getCurrentUserId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.KEYS.CURRENT_USER);
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  /**
   * Set the current user ID (de-identified)
   */
  private static async setCurrentUserId(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.CURRENT_USER, userId);
    } catch (error) {
      console.error('Error setting current user ID:', error);
    }
  }

  /**
   * Get user ID from email (for login purposes only)
   */
  static async getUserIdFromEmail(email: string): Promise<string | null> {
    try {
      const lookupData = await AsyncStorage.getItem(this.KEYS.USER_LOOKUP);
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
  static async registerUser(email: string, firstName: string, lastName: string): Promise<string> {
    try {
      const userId = this.generateUserId();
      const normalizedEmail = email.toLowerCase();
      
      // Store email-to-userId mapping (for login only)
      const lookupData = await AsyncStorage.getItem(this.KEYS.USER_LOOKUP);
      const lookup: { [email: string]: string } = lookupData ? JSON.parse(lookupData) : {};
      lookup[normalizedEmail] = userId;
      await AsyncStorage.setItem(this.KEYS.USER_LOOKUP, JSON.stringify(lookup));
      
      // Store profile data by user_id (de-identified)
      const profileKey = `${this.KEYS.PROFILE_DATA}_${userId}`;
      await AsyncStorage.setItem(profileKey, JSON.stringify({
        firstName,
        lastName,
        email: normalizedEmail,
        createdAt: new Date().toISOString(),
      }));
      
      // Set as current user immediately after registration
      await this.setCurrentUserId(userId);
      
      console.log(`✅ Registered new user with de-identified ID: ${userId}`);
      return userId;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Update user profile data
   */
  static async updateUserProfile(data: {
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
      const profileKey = `${this.KEYS.PROFILE_DATA}_${user_key}`;
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
   * Login user and set as current (using email for lookup only)
   */
  static async loginUser(email: string): Promise<boolean> {
    try {
      const userId = await this.getUserIdFromEmail(email);
      if (!userId) return false;
      
      await this.setCurrentUserId(userId);
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
  static async logoutUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.CURRENT_USER);
      console.log('✅ User logged out');
    } catch (error) {
      console.error('Error logging out user:', error);
    }
  }

  /**
   * Get user-specific storage key
   */
  private static async getUserKey(baseKey: string): Promise<string> {
    const userId = await this.getCurrentUserId();
    return userId ? `${baseKey}_${userId}` : baseKey;
  }

  /**
   * Save a medication
   */
  static async saveMedication(medication: Medication): Promise<void> {
    try {
      const medications = await this.getMedications();
      const index = medications.findIndex(m => m.id === medication.id);
      
      if (index >= 0) {
        medications[index] = medication;
      } else {
        medications.push(medication);
      }
      
      const key = await this.getUserKey(this.KEYS.MEDICATIONS);
      await AsyncStorage.setItem(
        key,
        JSON.stringify(medications),
      );
    } catch (error) {
      console.error('Error saving medication:', error);
      throw error;
    }
  }

  /**
   * Update an existing medication
   */
  static async updateMedication(medication: Medication): Promise<void> {
    try {
      const medications = await this.getMedications();
      const index = medications.findIndex(m => m.id === medication.id);
      if (index >= 0) {
        medications[index] = medication;
      } else {
        // If not found, add as new medication
        medications.push(medication);
        console.warn('Medication not found locally, adding as new:', medication);
      }
      const key = await this.getUserKey(this.KEYS.MEDICATIONS);
      await AsyncStorage.setItem(
        key,
        JSON.stringify(medications),
      );
    } catch (error) {
      console.error('Error updating medication:', error);
      throw error;
    }
  }

  /**
   * Get all medications
   */
  static async getMedications(): Promise<Medication[]> {
    try {
      const key = await this.getUserKey(this.KEYS.MEDICATIONS);
      const data = await AsyncStorage.getItem(key);
      if (!data) return [];
      
      let medications: any = [];
      try {
        medications = JSON.parse(data);
      } catch (e) {
        medications = [];
      }
      if (!Array.isArray(medications)) return [];
      // Convert date strings back to Date objects
      return medications.map((med: any) => ({
        ...med,
        startDate: med.startDate ? new Date(med.startDate) : undefined,
        endDate: med.endDate ? new Date(med.endDate) : undefined,
        reminderTimes: Array.isArray(med.reminderTimes)
          ? med.reminderTimes.map((time: string) => new Date(time))
          : [],
      }));
    } catch (error) {
      console.error('Error getting medications:', error);
      return [];
    }
  }

  /**
   * Delete a medication
   */
  static async deleteMedication(medicationId: string): Promise<void> {
    try {
      const medications = await this.getMedications();
      const safeMeds = Array.isArray(medications) ? medications : [];
      const filtered = safeMeds.filter(m => m.id !== medicationId);
      const key = await this.getUserKey(this.KEYS.MEDICATIONS);
      await AsyncStorage.setItem(
        key,
        JSON.stringify(filtered),
      );
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  }

  /**
   * Save adherence record
   */
  static async saveAdherenceRecord(record: AdherenceRecord): Promise<void> {
    try {
      const records = await this.getAdherenceRecords();
      const index = records.findIndex(r => r.id === record.id);
      
      if (index >= 0) {
        records[index] = record;
      } else {
        records.push(record);
      }
      
      const key = await this.getUserKey(this.KEYS.ADHERENCE_RECORDS);
      await AsyncStorage.setItem(
        key,
        JSON.stringify(records),
      );
    } catch (error) {
      console.error('Error saving adherence record:', error);
      throw error;
    }
  }

  /**
   * Get all adherence records
   */
  static async getAdherenceRecords(): Promise<AdherenceRecord[]> {
    try {
      const key = await this.getUserKey(this.KEYS.ADHERENCE_RECORDS);
      const data = await AsyncStorage.getItem(key);
      if (!data) return [];
      
      const records = JSON.parse(data);
      return records.map((rec: any) => ({
        ...rec,
        scheduledTime: new Date(rec.scheduledTime),
        takenTime: rec.takenTime ? new Date(rec.takenTime) : undefined,
      }));
    } catch (error) {
      console.error('Error getting adherence records:', error);
      return [];
    }
  }

  /**
   * Get adherence records for a specific medication
   */
  static async getAdherenceRecordsForMedication(
    medicationId: string,
  ): Promise<AdherenceRecord[]> {
    const allRecords = await this.getAdherenceRecords();
    const safeRecords = Array.isArray(allRecords) ? allRecords : [];
    return safeRecords.filter(r => r.medicationId === medicationId);
  }

  /**
   * Save user preferences
   */
  static async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      const key = await this.getUserKey(this.KEYS.USER_PREFERENCES);
      await AsyncStorage.setItem(
        key,
        JSON.stringify(preferences),
      );
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const key = await this.getUserKey(this.KEYS.USER_PREFERENCES);
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Calculate patient statistics
   */
  static async getPatientStats(): Promise<PatientStats> {
    const medications = await this.getMedications();
    const records = await this.getAdherenceRecords();
    
    const totalRecords = Array.isArray(records) ? records.length : 0;
    const safeRecords = Array.isArray(records) ? records : [];
    const takenOnTime = safeRecords.filter(
      r => r.status === 'taken' && (r.lateness || 0) <= 15,
    ).length;
    const missed = Array.isArray(safeRecords) ? safeRecords.filter(r => r.status === 'missed').length : 0;
    
    const adherencePercentage =
      totalRecords > 0 ? (takenOnTime / totalRecords) * 100 : 0;

    // Calculate current streak
    let currentStreak = 0;
    const sortedRecords = records
      .sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());
    
    for (const record of sortedRecords) {
      if (record.status === 'taken') {
        currentStreak++;
      } else if (record.status === 'missed') {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    
    for (const record of sortedRecords) {
      if (record.status === 'taken') {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else if (record.status === 'missed') {
        tempStreak = 0;
      }
    }

    return {
      totalMedications: Array.isArray(medications) ? medications.length : 0,
      adherencePercentage,
      currentStreak,
      longestStreak,
      missedDoses: missed,
      onTimeDoses: takenOnTime,
    };
  }

  /**
   * Clear all data for current user (for testing/development)
   */
  static async clearAllData(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return;
      
      const userKeys = [
        await this.getUserKey(this.KEYS.MEDICATIONS),
        await this.getUserKey(this.KEYS.ADHERENCE_RECORDS),
        await this.getUserKey(this.KEYS.USER_PREFERENCES),
      ];
      await AsyncStorage.multiRemove(userKeys);
      console.log(`✅ Cleared all data for user ID: ${userId}`);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  /**
   * Clear ALL data including all users, profiles, and accounts
   * DANGER: This removes everything from storage
   */
  static async clearAllUsersAndData(): Promise<void> {
    try {
      console.log('🗑️  Starting complete data wipe...');
      
      // Get all keys
      const allKeys = await AsyncStorage.getAllKeys();
      console.log(`Found ${Array.isArray(allKeys) ? allKeys.length : 0} storage keys`);
      
      // Remove everything
      await AsyncStorage.multiRemove(allKeys);
      
      console.log('✅ All users, accounts, and data cleared successfully!');
      console.log(`   - Deleted ${Array.isArray(allKeys) ? allKeys.length : 0} storage keys`);
      
      // Verify
      const remainingKeys = await AsyncStorage.getAllKeys();
      if (Array.isArray(remainingKeys) && remainingKeys.length > 0) {
        console.warn(`⚠️  Warning: ${Array.isArray(remainingKeys) ? remainingKeys.length : 0} keys still remain:`, remainingKeys);
      } else {
        console.log('✓ Storage is completely clean');
      }
    } catch (error) {
      console.error('Error clearing all users and data:', error);
      throw error;
    }
  }

  /**
   * Save a patient name to local database for future reference
   * Automatically prevents duplicates and assigns unique ID (de-identified)
   */
  static async savePatientName(firstName: string, lastName: string): Promise<void> {
    try {
      const names = await this.getPatientNames();
      const normalizedFirst = firstName.toUpperCase();
      const normalizedLast = lastName.toUpperCase();
      
      // Check if name already exists (case-insensitive)
      const isDuplicate = names.some(n => 
        n.firstName.toUpperCase() === normalizedFirst && 
        n.lastName.toUpperCase() === normalizedLast
      );
      
      if (!isDuplicate) {
        // Generate de-identified unique ID (timestamp + random string)
        const uniqueId = `PT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        names.push({ 
          id: uniqueId,
          firstName: normalizedFirst, 
          lastName: normalizedLast, 
          addedDate: new Date().toISOString() 
        });
        await AsyncStorage.setItem(
          this.KEYS.PATIENT_NAMES,
          JSON.stringify(names),
        );
        console.log(`💾 Saved patient name to local database: ${normalizedFirst} ${normalizedLast} (ID: ${uniqueId})`);
      } else {
        console.log(`ℹ️ Patient name already in local database: ${normalizedFirst} ${normalizedLast}`);
      }
    } catch (error) {
      console.error('Error saving patient name:', error);
    }
  }

  /**
   * Get all saved patient names
   */
  static async getPatientNames(): Promise<Array<{id: string, firstName: string, lastName: string, addedDate: string}>> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.PATIENT_NAMES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting patient names:', error);
      return [];
    }
  }

  /**
   * Check if a patient name exists in local database
   */
  static async isKnownPatientName(firstName: string, lastName: string): Promise<boolean> {
    try {
      const names = await this.getPatientNames();
      return names.some(n => 
        n.firstName.toUpperCase() === firstName.toUpperCase() && 
        n.lastName.toUpperCase() === lastName.toUpperCase()
      );
    } catch (error) {
      console.error('Error checking patient name:', error);
      return false;
    }
  }

  /**
   * Get user profile (firstName, lastName, email, etc.)
   */
  static async getUserProfile(): Promise<any | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return null;
      const profileKey = `${this.KEYS.PROFILE_DATA}_${userId}`;
      const data = await AsyncStorage.getItem(profileKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // ============================================
  // Local User Profile Methods (migrated from UserLocalStorage)
  // ============================================

  /**
   * Save local user profile
   */
  static async saveLocalUserProfile(profile: LocalUserProfile): Promise<void> {
    await AsyncStorage.setItem(this.KEYS.LOCAL_USER_PROFILE, JSON.stringify(profile));
  }

  /**
   * Get local user profile with fallback default
   */
  static async getLocalUserProfile(): Promise<LocalUserProfile | null> {
    const data = await AsyncStorage.getItem(this.KEYS.LOCAL_USER_PROFILE);
    if (data) {
      return JSON.parse(data);
    } else {
      // Fallback: create a default profile if missing
      const defaultProfile: LocalUserProfile = {
        firstName: '',
        lastName: '',
        email: '',
        displayName: '',
      };
      await AsyncStorage.setItem(this.KEYS.LOCAL_USER_PROFILE, JSON.stringify(defaultProfile));
      return defaultProfile;
    }
  }

  /**
   * Update local user profile (partial update)
   */
  static async updateLocalUserProfile(updates: Partial<LocalUserProfile>): Promise<void> {
    const current = await this.getLocalUserProfile();
    const updated = { ...current, ...updates };
    await this.saveLocalUserProfile(updated as LocalUserProfile);
  }

  /**
   * Sync local user profile to backend
   */
  static async syncLocalUserProfile(userKey: string): Promise<any> {
    const profile = await this.getLocalUserProfile();
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
}

/**
 * Local user profile interface (previously in UserLocalStorage)
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
