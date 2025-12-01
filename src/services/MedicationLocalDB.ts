import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local medication type for offline storage
 * Simplified version compatible with the main Medication type from @types
 */
export type LocalMedication = {
  id: string;
  drugName: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  quantity?: string;
  refills?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  medicationKey?: string;
  userKey?: string;
  rfidTagId?: string;
  pendingSync?: boolean;
};

// Re-export for backward compatibility
export type Medication = LocalMedication;

const MEDICATIONS_KEY = 'medications';

export const MedicationDB = {
  async getAll(): Promise<Medication[]> {
    const json = await AsyncStorage.getItem(MEDICATIONS_KEY);
    return json ? JSON.parse(json) : [];
  },
  async saveAll(meds: Medication[]): Promise<void> {
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(meds));
  },
  async add(med: Medication): Promise<void> {
    const meds = await MedicationDB.getAll();
    meds.push(med);
    await MedicationDB.saveAll(meds);
  },
  async update(id: string, updates: Partial<Medication>): Promise<void> {
    const meds = await MedicationDB.getAll();
    const idx = meds.findIndex(m => m.id === id);
    if (idx !== -1) {
      meds[idx] = { ...meds[idx], ...updates };
      console.log('MedicationLocalDB.update: Updated medication:', meds[idx]);
      await MedicationDB.saveAll(meds);
    } else {
      // If not found, add as new medication
      const newMed = { id, ...updates } as Medication;
      console.warn('MedicationLocalDB.update: Medication not found, adding new:', newMed);
      await MedicationDB.add(newMed);
    }
  },
  async remove(id: string): Promise<void> {
    const meds = await MedicationDB.getAll();
    const filtered = meds.filter(m => m.id !== id);
    await MedicationDB.saveAll(filtered);
  },
  async markPendingSync(id: string): Promise<void> {
    await MedicationDB.update(id, { pendingSync: true });
  },
  async clearPendingSync(id: string): Promise<void> {
    await MedicationDB.update(id, { pendingSync: false });
  },
};
