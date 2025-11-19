import AsyncStorage from '@react-native-async-storage/async-storage';
import {Medication, AdherenceRecord, UserPreferences, PatientStats} from '@types';

/**
 * Storage Service - Handles local data persistence
 */
export class StorageService {
  private static KEYS = {
    MEDICATIONS: '@medications',
    ADHERENCE_RECORDS: '@adherence_records',
    USER_PREFERENCES: '@user_preferences',
    PATIENT_NAMES: '@patient_names',
  };

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
      
      await AsyncStorage.setItem(
        this.KEYS.MEDICATIONS,
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
        await AsyncStorage.setItem(
          this.KEYS.MEDICATIONS,
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
      const data = await AsyncStorage.getItem(this.KEYS.MEDICATIONS);
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
      const filtered = medications.filter(m => m.id !== medicationId);
      await AsyncStorage.setItem(
        this.KEYS.MEDICATIONS,
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
      
      await AsyncStorage.setItem(
        this.KEYS.ADHERENCE_RECORDS,
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
      const data = await AsyncStorage.getItem(this.KEYS.ADHERENCE_RECORDS);
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
    return allRecords.filter(r => r.medicationId === medicationId);
  }

  /**
   * Save user preferences
   */
  static async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.KEYS.USER_PREFERENCES,
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
      const data = await AsyncStorage.getItem(this.KEYS.USER_PREFERENCES);
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
    
    const totalRecords = records.length;
    const takenOnTime = records.filter(
      r => r.status === 'taken' && (r.lateness || 0) <= 15,
    ).length;
    const missed = records.filter(r => r.status === 'missed').length;
    
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
      totalMedications: medications.length,
      adherencePercentage,
      currentStreak,
      longestStreak,
      missedDoses: missed,
      onTimeDoses: takenOnTime,
    };
  }

  /**
   * Clear all data (for testing/development)
   */
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.KEYS.MEDICATIONS,
        this.KEYS.ADHERENCE_RECORDS,
        this.KEYS.USER_PREFERENCES,
        this.KEYS.PATIENT_NAMES,
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
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
}
