/**
 * Events Storage - Medication event tracking operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './keys';
import { getCurrentUserId } from './user';

/**
 * Medication event interface
 */
export interface MedicationEvent {
  id: string;
  medicationId: string;
  eventType: 'taken' | 'missed' | 'skipped' | 'reminder' | 'refill';
  timestamp: Date;
  notes?: string;
  confirmedBy?: 'rfid' | 'manual';
}

/**
 * Get user-specific storage key
 */
async function getUserKey(baseKey: string): Promise<string> {
  const userId = await getCurrentUserId();
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Save medication event
 */
export async function saveEvent(event: MedicationEvent): Promise<void> {
  try {
    const events = await getEvents();
    events.push(event);
    const key = await getUserKey(STORAGE_KEYS.EVENTS);
    await AsyncStorage.setItem(key, JSON.stringify(events));
  } catch (error) {
    console.error('Error saving event:', error);
    throw error;
  }
}

/**
 * Get all medication events
 */
export async function getEvents(): Promise<MedicationEvent[]> {
  try {
    const key = await getUserKey(STORAGE_KEYS.EVENTS);
    const data = await AsyncStorage.getItem(key);
    if (!data) return [];
    
    const events = JSON.parse(data);
    return events.map((evt: any) => ({
      ...evt,
      timestamp: new Date(evt.timestamp),
    }));
  } catch (error) {
    console.error('Error getting events:', error);
    return [];
  }
}

/**
 * Delete a medication event by ID
 */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    const events = await getEvents();
    const filtered = events.filter(e => e.id !== eventId);
    const key = await getUserKey(STORAGE_KEYS.EVENTS);
    await AsyncStorage.setItem(key, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

/**
 * Get events for a specific medication
 */
export async function getEventsForMedication(
  medicationId: string,
): Promise<MedicationEvent[]> {
  const allEvents = await getEvents();
  return allEvents.filter(e => e.medicationId === medicationId);
}

/**
 * Get events within a date range
 */
export async function getEventsByDateRange(
  startDate: Date,
  endDate: Date,
): Promise<MedicationEvent[]> {
  const allEvents = await getEvents();
  return allEvents.filter(
    e => e.timestamp >= startDate && e.timestamp <= endDate
  );
}
