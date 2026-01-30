/**
 * Medication Storage - Local medication CRUD operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medication } from '@types';
import { STORAGE_KEYS } from './keys';
import { getCurrentUserId } from './user';

/**
 * Get user-specific storage key
 */
async function getUserKey(baseKey: string): Promise<string> {
  const userId = await getCurrentUserId();
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Save a medication
 */
export async function saveMedication(medication: Medication): Promise<void> {
  try {
    const medications = await getMedications();
    const index = medications.findIndex(m => m.id === medication.id);
    
    if (index >= 0) {
      medications[index] = medication;
    } else {
      medications.push(medication);
    }
    
    const key = await getUserKey(STORAGE_KEYS.MEDICATIONS);
    await AsyncStorage.setItem(key, JSON.stringify(medications));
  } catch (error) {
    console.error('Error saving medication:', error);
    throw error;
  }
}

/**
 * Update an existing medication
 */
export async function updateMedication(medication: Medication): Promise<void> {
  try {
    const medications = await getMedications();
    const index = medications.findIndex(m => m.id === medication.id);
    if (index >= 0) {
      medications[index] = medication;
    } else {
      medications.push(medication);
      console.warn('Medication not found locally, adding as new:', medication);
    }
    const key = await getUserKey(STORAGE_KEYS.MEDICATIONS);
    await AsyncStorage.setItem(key, JSON.stringify(medications));
  } catch (error) {
    console.error('Error updating medication:', error);
    throw error;
  }
}

/**
 * Get all medications
 */
export async function getMedications(): Promise<Medication[]> {
  try {
    const key = await getUserKey(STORAGE_KEYS.MEDICATIONS);
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
export async function deleteMedication(medicationId: string): Promise<void> {
  try {
    const medications = await getMedications();
    const safeMeds = Array.isArray(medications) ? medications : [];
    const filtered = safeMeds.filter(m => m.id !== medicationId);
    const key = await getUserKey(STORAGE_KEYS.MEDICATIONS);
    await AsyncStorage.setItem(key, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting medication:', error);
    throw error;
  }
}

/**
 * Get a medication by ID
 */
export async function getMedicationById(medicationId: string): Promise<Medication | undefined> {
  const medications = await getMedications();
  return medications.find(m => m.id === medicationId);
}

/**
 * Get medications for a specific patient
 */
export async function getMedicationsByPatient(patientName: string): Promise<Medication[]> {
  const medications = await getMedications();
  const normalized = patientName.trim().toLowerCase();
  return medications.filter(m => 
    m.patientName?.trim().toLowerCase() === normalized
  );
}

/**
 * Get active medications only
 */
export async function getActiveMedications(): Promise<Medication[]> {
  const medications = await getMedications();
  const now = new Date();
  
  return medications.filter(m => {
    // Check isActive flag if present
    if ('isActive' in m && !m.isActive) return false;
    
    // Check date range
    if (m.endDate && m.endDate < now) return false;
    
    return true;
  });
}
