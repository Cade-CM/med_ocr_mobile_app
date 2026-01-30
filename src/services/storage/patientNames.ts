/**
 * Patient Names Storage - Known patient name tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './keys';
import { getCurrentUserId } from './user';

/**
 * Patient name entry
 */
export interface PatientNameEntry {
  name: string;
  addedAt: Date;
  medicationCount: number;
}

/**
 * Get user-specific storage key
 */
async function getUserKey(baseKey: string): Promise<string> {
  const userId = await getCurrentUserId();
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Save a patient name to known names list
 */
export async function savePatientName(name: string): Promise<void> {
  try {
    const names = await getPatientNames();
    const normalized = name.trim().toLowerCase();
    
    const existing = names.find(
      n => n.name.toLowerCase() === normalized
    );
    
    if (existing) {
      existing.medicationCount++;
    } else {
      names.push({
        name: name.trim(),
        addedAt: new Date(),
        medicationCount: 1,
      });
    }
    
    const key = await getUserKey(STORAGE_KEYS.PATIENT_NAMES);
    await AsyncStorage.setItem(key, JSON.stringify(names));
  } catch (error) {
    console.error('Error saving patient name:', error);
    throw error;
  }
}

/**
 * Get all known patient names
 */
export async function getPatientNames(): Promise<PatientNameEntry[]> {
  try {
    const key = await getUserKey(STORAGE_KEYS.PATIENT_NAMES);
    const data = await AsyncStorage.getItem(key);
    if (!data) return [];
    
    const names = JSON.parse(data);
    return names.map((entry: any) => ({
      ...entry,
      addedAt: new Date(entry.addedAt),
    }));
  } catch (error) {
    console.error('Error getting patient names:', error);
    return [];
  }
}

/**
 * Check if a name is a known patient name
 */
export async function isKnownPatientName(name: string): Promise<boolean> {
  const names = await getPatientNames();
  const normalized = name.trim().toLowerCase();
  return names.some(n => n.name.toLowerCase() === normalized);
}

/**
 * Remove a patient name from known names
 */
export async function removePatientName(name: string): Promise<void> {
  try {
    const names = await getPatientNames();
    const normalized = name.trim().toLowerCase();
    const filtered = names.filter(
      n => n.name.toLowerCase() !== normalized
    );
    
    const key = await getUserKey(STORAGE_KEYS.PATIENT_NAMES);
    await AsyncStorage.setItem(key, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing patient name:', error);
    throw error;
  }
}

/**
 * Get patient names sorted by medication count (most used first)
 */
export async function getPatientNamesByUsage(): Promise<PatientNameEntry[]> {
  const names = await getPatientNames();
  return names.sort((a, b) => b.medicationCount - a.medicationCount);
}
