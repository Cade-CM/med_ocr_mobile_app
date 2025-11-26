import AsyncStorage from '@react-native-async-storage/async-storage';
import {Medication, AdherenceRecord, UserPreferences, PatientStats} from '@types';

/**
 * Storage Service - Handles local data persistence
 */
export class StorageService {
      /**
       * Register or fetch user from backend
       */
      static async signupUser(email: string, displayName: string, userKey: string): Promise<any> {
        try {
          const response = await fetch('http://10.0.0.26:8000/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, display_name: displayName, user_key: userKey }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Signup failed:', response.status, errorText);
            throw new Error(`Signup failed: ${response.status} ${errorText}`);
          }
          return await response.json();
        } catch (error) {
          console.error('Error signing up user:', error);
          throw error;
        }
      }

      /**
       * Save user settings to backend
       */
      static async saveUserSettings(userKey: string, settings: any): Promise<void> {
        try {
          const response = await fetch('http://10.0.0.26:8000/api/user_settings', {
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
          const response = await fetch(`http://10.0.0.26:8000/api/user_settings?user_key=${userKey}`);
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
       */
      static async saveMedicationToBackend(medication: any, userKey: string): Promise<any> {
        try {
          // Only send medication_key if it exists
          const payload: any = {
            user_key: userKey,
            ...medication,
          };
          if (medication.medication_key) {
            payload.medication_key = medication.medication_key;
          }
          const response = await fetch('http://10.0.0.26:8000/api/medications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Save medication failed:', response.status, errorText);
            throw new Error(`Save medication failed: ${response.status} ${errorText}`);
          }
          return await response.json();
        } catch (error) {
          console.error('Error saving medication to backend:', error);
          throw error;
        }
      }

      /**
       * Get all medications for user from backend
       */
      static async getMedicationsFromBackend(userKey: string): Promise<any[]> {
        try {
          const response = await fetch(`http://10.0.0.26:8000/api/medications?user_key=${userKey}`);
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Get medications failed:', response.status, errorText);
            throw new Error(`Get medications failed: ${response.status} ${errorText}`);
          }
          return await response.json();
        } catch (error) {
          console.error('Error getting medications from backend:', error);
          throw error;
        }
      }

      /**
       * Log a medication event (adherence) to backend
       */
      static async logMedEvent(event: any, userKey: string): Promise<any> {
        try {
          const response = await fetch('http://10.0.0.26:8000/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_key: userKey, ...event }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Log med event failed:', response.status, errorText);
            throw new Error(`Log med event failed: ${response.status} ${errorText}`);
          }
          return await response.json();
        } catch (error) {
          console.error('Error logging med event:', error);
          throw error;
        }
      }
    /**
     * Save an event (sync to backend, keep last 7 days locally)
     */
    static async saveEvent(event: any): Promise<void> {
      try {
        // Sync to backend
        await fetch('http://10.0.0.26:8000/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
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
        // Sync to backend
        await fetch(`http://10.0.0.26:8000/api/events/${eventId}`, {
          method: 'DELETE',
        });
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
    CURRENT_USER: '@current_user_id',
    USER_LOOKUP: '@user_lookup', // Maps user_id to email for login only
    PROFILE_DATA: '@profile_data', // Stores profile info by user_id
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

      // Update backend profile
      // Assuming backend expects display_name, email, etc.
      // You may need to adjust this payload to match backend contract
      const backendPayload: any = {
        user_key,
        display_name: data.display_name || data.nickname || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: data.email,
        // Add other fields as needed
      };
      // Call backend API to update profile
      try {
        await import('./BackendService').then(({ updateUserProfile }) => updateUserProfile({
          user_key,
          first_name: data.firstName,
          last_name: data.lastName,
          nickname: data.nickname,
          age: data.age ? parseInt(data.age) : undefined,
          gender: data.gender,
          email: data.email,
          display_name: backendPayload.display_name,
        }));
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
   * Get user profile data by user ID
   */
  static async getUserProfile(userId?: string): Promise<any | null> {
    try {
      const id = userId || await this.getCurrentUserId();
      if (!id) return null;
      
      const profileKey = `${this.KEYS.PROFILE_DATA}_${id}`;
      const data = await AsyncStorage.getItem(profileKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
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
        const key = await this.getUserKey(this.KEYS.MEDICATIONS);
        await AsyncStorage.setItem(
          key,
          JSON.stringify(medications),
        );
      } else {
        throw new Error('Medication not found');
      }
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
      
      const medications = JSON.parse(data);
      // Convert date strings back to Date objects
      return medications.map((med: any) => ({
        ...med,
        startDate: new Date(med.startDate),
        endDate: med.endDate ? new Date(med.endDate) : undefined,
        reminderTimes: med.reminderTimes.map((time: string) => new Date(time)),
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
   * Get all user profiles in the system
   */
  static async getAllUserProfiles(): Promise<Array<{
    userId: string;
    firstName: string;
    lastName: string;
    nickname?: string;
    age?: string;
    gender?: string;
  }>> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const profiles = [];
      
      // Find all profile data keys
      for (const key of allKeys) {
        if (key.startsWith(`${this.KEYS.PROFILE_DATA}_`)) {
          const userId = key.replace(`${this.KEYS.PROFILE_DATA}_`, '');
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const profile = JSON.parse(data);
            profiles.push({
              userId,
              firstName: profile.firstName,
              lastName: profile.lastName,
              nickname: profile.nickname,
              age: profile.age,
              gender: profile.gender,
            });
          }
        }
      }
      
      return profiles;
    } catch (error) {
      console.error('Error getting all user profiles:', error);
      return [];
    }
  }

  /**
   * Switch to a different user profile
   */
  static async switchUserProfile(userId: string): Promise<void> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }
      
      // Set as current user
      await this.setCurrentUserId(userId);
      
      console.log(`✅ Switched to user profile: ${profile.firstName} ${profile.lastName} (ID: ${userId})`);
    } catch (error) {
      console.error('Error switching user profile:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUserProfile(): Promise<{
    userId: string;
    firstName: string;
    lastName: string;
    nickname?: string;
    age?: string;
    gender?: string;
    email?: string;
  } | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return null;
      
      const profile = await this.getUserProfile(userId);
      if (!profile) return null;
      
      return {
        userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        nickname: profile.nickname,
        age: profile.age,
        gender: profile.gender,
        email: profile.email, // Only exposed in profile view
      };
    } catch (error) {
      console.error('Error getting current user profile:', error);
      return null;
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
}
