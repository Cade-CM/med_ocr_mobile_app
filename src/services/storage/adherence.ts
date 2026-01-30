/**
 * Adherence Storage - Adherence record and statistics operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdherenceRecord, PatientStats } from '@types';
import { STORAGE_KEYS } from './keys';
import { getCurrentUserId } from './user';
import { getMedications } from './medications';

/**
 * Get user-specific storage key
 */
async function getUserKey(baseKey: string): Promise<string> {
  const userId = await getCurrentUserId();
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Save adherence record
 */
export async function saveAdherenceRecord(record: AdherenceRecord): Promise<void> {
  try {
    const records = await getAdherenceRecords();
    const index = records.findIndex(r => r.id === record.id);
    
    if (index >= 0) {
      records[index] = record;
    } else {
      records.push(record);
    }
    
    const key = await getUserKey(STORAGE_KEYS.ADHERENCE_RECORDS);
    await AsyncStorage.setItem(key, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving adherence record:', error);
    throw error;
  }
}

/**
 * Get all adherence records
 */
export async function getAdherenceRecords(): Promise<AdherenceRecord[]> {
  try {
    const key = await getUserKey(STORAGE_KEYS.ADHERENCE_RECORDS);
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
export async function getAdherenceRecordsForMedication(
  medicationId: string,
): Promise<AdherenceRecord[]> {
  const allRecords = await getAdherenceRecords();
  const safeRecords = Array.isArray(allRecords) ? allRecords : [];
  return safeRecords.filter(r => r.medicationId === medicationId);
}

/**
 * Calculate patient statistics
 * Optimized: Single-pass calculation for streaks and counts
 */
export async function getPatientStats(): Promise<PatientStats> {
  const medications = await getMedications();
  const records = await getAdherenceRecords();
  
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
