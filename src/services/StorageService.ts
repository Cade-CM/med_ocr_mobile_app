import AsyncStorage from '@react-native-async-storage/async-storage';
import {Medication, AdherenceRecord, UserPreferences, PatientStats} from '@types';
import * as BackendService from './BackendService';

/**
 * Storage Service - Handles local data persistence with AsyncStorage
 * Backend sync is handled via BackendService (Supabase)
 * 
 * ============================================================================
 * ⚠️ DEPRECATED IDENTITY SYSTEM WARNING
 * ============================================================================
 * 
 * The legacy identity methods (registerUser, loginUser, getUserIdFromEmail, etc.)
 * that used @current_user_id and @user_lookup are DEPRECATED and will throw errors.
 * 
 * WHY: These methods created a parallel identity system separate from Supabase Auth,
 * causing "identity drift" where the local USR_xxx ID diverged from the Supabase
 * auth.uid(). This broke RLS policies and caused data visibility issues.
 * 
 * USE INSTEAD:
 * - For user identity: AuthService.getCurrentUserKey() 
 * - For login/signup: BackendService.loginUser() / signupUser()
 * - For profile updates: BackendService.updateUserProfile()
 * 
 * See SECURITY_INVARIANTS.md for the complete security model.
 * ============================================================================
 */
export class StorageService {
  private static KEYS = {
    MEDICATIONS: '@medications',
    ADHERENCE_RECORDS: '@adherence_records',
    USER_PREFERENCES: '@user_preferences',
    PATIENT_NAMES: '@patient_names',
    PROFILE_DATA: '@profile_data',
    // ⚠️ DEPRECATED - These keys are part of the legacy identity system
    // They should no longer be read or written. See header comment.
    /** @deprecated Use Supabase Auth via AuthService instead */
    CURRENT_USER: '@current_user_id',
    /** @deprecated Use Supabase Auth via AuthService instead */
    USER_LOOKUP: '@user_lookup',
    LOCAL_USER_PROFILE: '@localUserProfile',
  };

  /**
   * @deprecated Legacy identity system removed. Use Supabase Auth via AuthService.
   * @throws Error Always throws - this method should not be used.
   */
  static generateUserId(): string {
    throw new Error(
      'Legacy identity system removed. Use Supabase Auth via AuthService/BackendService. ' +
      'User identity is derived from supabase.auth.getSession().'
    );
  }

  /**
   * @deprecated Legacy identity system removed. Use AuthService.getCurrentUserKey() instead.
   * @throws Error Always throws - this method should not be used.
   */
  private static async getCurrentUserId(): Promise<string | null> {
    throw new Error(
      'Legacy identity system removed. Use AuthService.getCurrentUserKey() instead. ' +
      'This prevents identity drift between local storage and Supabase Auth.'
    );
  }

  /**
   * @deprecated Legacy identity system removed. User identity managed by Supabase Auth.
   * @throws Error Always throws - this method should not be used.
   */
  private static async setCurrentUserId(userId: string): Promise<void> {
    throw new Error(
      'Legacy identity system removed. User identity is managed by Supabase Auth session. ' +
      'Do not manually set user IDs.'
    );
  }

  /**
   * @deprecated Legacy identity system removed. Use BackendService.loginUser() instead.
   * @throws Error Always throws - this method should not be used.
   */
  static async getUserIdFromEmail(email: string): Promise<string | null> {
    throw new Error(
      'Legacy identity system removed. Use BackendService.loginUser() for authentication. ' +
      'The @user_lookup AsyncStorage key is no longer used.'
    );
  }

  /**
   * @deprecated Legacy identity system removed. Use BackendService.signupUser() instead.
   * @throws Error Always throws - this method should not be used.
   */
  static async registerUser(email: string, firstName: string, lastName: string): Promise<string> {
    throw new Error(
      'Legacy identity system removed. Use BackendService.signupUser() for registration. ' +
      'This uses Supabase Auth with proper bcrypt password hashing and RLS-compatible user IDs.'
    );
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
   * @deprecated Legacy identity system removed. Use BackendService.loginUser() instead.
   * @throws Error Always throws - this method should not be used.
   */
  static async loginUser(email: string): Promise<boolean> {
    throw new Error(
      'Legacy identity system removed. Use BackendService.loginUser(email, password) for authentication. ' +
      'This properly authenticates via Supabase Auth and establishes a secure session.'
    );
  }

  /**
   * @deprecated Legacy identity system removed. Use AuthService.signOut() instead.
   * @throws Error Always throws - this method should not be used.
   */
  static async logoutUser(): Promise<void> {
    throw new Error(
      'Legacy identity system removed. Use AuthService.signOut() for logout. ' +
      'This properly clears the Supabase session and triggers auth state cleanup.'
    );
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
   * Optimized: Single-pass calculation for streaks and counts
   */
  static async getPatientStats(): Promise<PatientStats> {
    const medications = await this.getMedications();
    const records = await this.getAdherenceRecords();
    
    const totalRecords = records.length;
    if (totalRecords === 0) {
      return {
        totalMedications: medications.length,
        adherencePercentage: 0,
        currentStreak: 0,
        longestStreak: 0,
        missedDoses: 0,
        onTimeDoses: 0,
      };
    }

    // Sort once, then single-pass for all stats
    const sortedRecords = records
      .sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());
    
    let takenOnTime = 0;
    let missed = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let foundFirstMissed = false;

    for (const record of sortedRecords) {
      // Count stats
      if (record.status === 'taken' && (record.lateness || 0) <= 15) {
        takenOnTime++;
      }
      if (record.status === 'missed') {
        missed++;
      }
      
      // Calculate streaks
      if (record.status === 'taken') {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
        if (!foundFirstMissed) {
          currentStreak++;
        }
      } else if (record.status === 'missed') {
        tempStreak = 0;
        foundFirstMissed = true;
      }
    }

    return {
      totalMedications: medications.length,
      adherencePercentage: (takenOnTime / totalRecords) * 100,
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
