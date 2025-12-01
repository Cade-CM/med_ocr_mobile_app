import { BACKEND_API_URL } from '@config/api';
import { Medication, AdherenceRecord } from '@types';
import { StorageService } from './StorageService';
import * as BackendService from './BackendService';

/**
 * Sync Service - Synchronizes data between local storage and backend
 * Uses BackendService for API calls to avoid duplication
 */
export class SyncService {
  
  /**
   * Sync all medications to backend
   */
  static async syncMedicationsToBackend(): Promise<void> {
    try {
      const medications = await StorageService.getMedications();
      
      for (const med of medications) {
        await this.syncMedicationToBackend(med);
      }
      
      console.log(`✓ Synced ${medications.length} medications to backend`);
    } catch (error) {
      console.error('Error syncing medications to backend:', error);
      throw error;
    }
  }
  
  /**
   * Sync a single medication to backend
   */
  static async syncMedicationToBackend(medication: Medication): Promise<void> {
    try {
      await BackendService.createMedication({
        user_key: medication.user_key,
        drug_name: medication.drugName,
        strength: medication.strength,
        instruction: medication.instructions,
        frequency_text: medication.frequency,
        qty_text: medication.quantity,
        refills_text: medication.refills,
      });
      console.log(`✓ Synced medication: ${medication.drugName}`);
    } catch (error) {
      console.error('Error syncing medication:', error);
      throw error;
    }
  }
  
  /**
   * Fetch all medications from backend and merge with local storage
   */
  static async syncMedicationsFromBackend(userKey: string): Promise<void> {
    try {
      const backendMeds = await BackendService.fetchMedications(userKey);
      const localMedications = await StorageService.getMedications();
      const localMedicationIds = new Set(localMedications.map(m => m.id));
      
      // Merge backend medications with local
      let addedCount = 0;
      for (const backendMed of backendMeds) {
        const medId = backendMed.medication_key || String(backendMed.id);
        if (!localMedicationIds.has(medId)) {
          // Convert backend format to local format
          const medication: Medication = {
            id: medId,
            user_key: backendMed.user_key,
            password: '', // Required by type but not used
            drugName: backendMed.drug_name || '',
            strength: backendMed.strength,
            dosage: backendMed.strength || '',
            frequency: backendMed.frequency_text || '',
            instructions: backendMed.instruction,
            quantity: backendMed.qty_text,
            refills: backendMed.refills_text,
            reminderTimes: [],
            startDate: new Date(),
          };
          
          await StorageService.saveMedication(medication);
          addedCount++;
        }
      }
      
      console.log(`✓ Synced ${addedCount} new medications from backend`);
    } catch (error) {
      console.error('Error syncing medications from backend:', error);
      throw error;
    }
  }
  
  /**
   * Sync adherence records to backend
   */
  static async syncAdherenceToBackend(userKey: string): Promise<void> {
    try {
      const records = await StorageService.getAdherenceRecords();
      
      for (const record of records) {
        await this.syncAdherenceRecordToBackend(record, userKey);
      }
      
      console.log(`✓ Synced ${records.length} adherence records to backend`);
    } catch (error) {
      console.error('Error syncing adherence to backend:', error);
      throw error;
    }
  }
  
  /**
   * Sync a single adherence record to backend
   */
  static async syncAdherenceRecordToBackend(record: AdherenceRecord, userKey: string): Promise<void> {
    try {
      await BackendService.logMedEvent({
        user_key: userKey,
        medication_id: record.medicationId,
        event_type: record.status,
        event_time: record.takenTime?.toISOString() || record.scheduledTime.toISOString(),
        source: record.confirmationMethod || 'app',
      });
      console.log(`✓ Synced adherence record: ${record.id}`);
    } catch (error) {
      console.error('Error syncing adherence record:', error);
      throw error;
    }
  }
  
  /**
   * Delete medication from backend
   */
  static async deleteMedicationFromBackend(medicationId: string): Promise<void> {
    try {
      await BackendService.deleteMedication(medicationId);
      console.log(`✓ Deleted medication from backend: ${medicationId}`);
    } catch (error) {
      console.error('Error deleting medication from backend:', error);
      throw error;
    }
  }
  
  /**
   * Full sync - push local changes and pull remote changes
   */
  static async fullSync(userKey: string): Promise<void> {
    try {
      console.log('🔄 Starting full sync...');
      
      // Push local data to backend
      await this.syncMedicationsToBackend();
      await this.syncAdherenceToBackend(userKey);
      
      // Pull remote data to local
      await this.syncMedicationsFromBackend(userKey);
      
      console.log('✅ Full sync completed');
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Check if backend is available
   */
  static async isBackendAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${BACKEND_API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return data.status === 'healthy' || data.status === 'ok';
      }
      
      return false;
    } catch (error) {
      console.warn('Backend not available:', error);
      return false;
    }
  }
  
  /**
   * Auto-sync - Call this periodically (e.g., every 5 minutes)
   */
  static async autoSync(userKey: string): Promise<void> {
    const isAvailable = await this.isBackendAvailable();
    
    if (isAvailable) {
      try {
        await this.fullSync(userKey);
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    } else {
      console.log('⚠️ Backend unavailable, skipping auto-sync');
    }
  }
}
