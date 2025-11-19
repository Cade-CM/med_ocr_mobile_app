import {LOCAL_OCR_API_URL} from '@config/api';
import {Medication, AdherenceRecord} from '@types';
import {StorageService} from './StorageService';

/**
 * Sync Service - Synchronizes data between local storage and backend
 */
export class SyncService {
  private static readonly API_BASE = LOCAL_OCR_API_URL + '/api';
  
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
      const response = await fetch(`${this.API_BASE}/medications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(medication),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync medication: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✓ Synced medication: ${medication.drugName} (${data.action})`);
    } catch (error) {
      console.error('Error syncing medication:', error);
      throw error;
    }
  }
  
  /**
   * Fetch all medications from backend and merge with local storage
   */
  static async syncMedicationsFromBackend(): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/medications`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch medications: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.medications) {
        const localMedications = await StorageService.getMedications();
        const localMedicationIds = new Set(localMedications.map(m => m.id));
        
        // Merge backend medications with local
        let addedCount = 0;
        for (const backendMed of data.medications) {
          if (!localMedicationIds.has(backendMed.id)) {
            // Convert date strings back to Date objects
            const medication: Medication = {
              ...backendMed,
              startDate: new Date(backendMed.startDate),
              endDate: backendMed.endDate ? new Date(backendMed.endDate) : undefined,
              reminderTimes: backendMed.reminderTimes.map((time: string) => new Date(time)),
            };
            
            await StorageService.saveMedication(medication);
            addedCount++;
          }
        }
        
        console.log(`✓ Synced ${addedCount} new medications from backend`);
      }
    } catch (error) {
      console.error('Error syncing medications from backend:', error);
      throw error;
    }
  }
  
  /**
   * Sync adherence records to backend
   */
  static async syncAdherenceToBackend(): Promise<void> {
    try {
      const records = await StorageService.getAdherenceRecords();
      
      for (const record of records) {
        await this.syncAdherenceRecordToBackend(record);
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
  static async syncAdherenceRecordToBackend(record: AdherenceRecord): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/adherence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync adherence record: ${response.statusText}`);
      }
      
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
      const response = await fetch(`${this.API_BASE}/medications/${medicationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete medication: ${response.statusText}`);
      }
      
      console.log(`✓ Deleted medication from backend: ${medicationId}`);
    } catch (error) {
      console.error('Error deleting medication from backend:', error);
      throw error;
    }
  }
  
  /**
   * Full sync - push local changes and pull remote changes
   */
  static async fullSync(): Promise<void> {
    try {
      console.log('🔄 Starting full sync...');
      
      // Push local data to backend
      await this.syncMedicationsToBackend();
      await this.syncAdherenceToBackend();
      
      // Pull remote data to local
      await this.syncMedicationsFromBackend();
      
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
      
      const response = await fetch(`${LOCAL_OCR_API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return data.status === 'healthy';
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
  static async autoSync(): Promise<void> {
    const isAvailable = await this.isBackendAvailable();
    
    if (isAvailable) {
      try {
        await this.fullSync();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    } else {
      console.log('⚠️ Backend unavailable, skipping auto-sync');
    }
  }
}
