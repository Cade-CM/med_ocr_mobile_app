export interface Medication {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  reminderTimes: Date[];
  startDate: Date;
  endDate?: Date;
  capturedImageUri?: string;
  rawOcrText?: string;
}

export interface OCRResult {
  text: string;
  blocks: OCRBlock[];
}

export interface OCRBlock {
  text: string;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence?: number;
}

export interface ParsedMedicationData {
  drugName?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  confidence: number;
}

export interface ReminderSchedule {
  medicationId: string;
  times: Date[];
  frequency: string;
}

export interface AdherenceRecord {
  id: string;
  medicationId: string;
  scheduledTime: Date;
  takenTime?: Date;
  status: 'taken' | 'missed' | 'late' | 'pending';
  lateness?: number; // minutes
}

export interface UserPreferences {
  wakeTime: string; // HH:mm format
  sleepTime: string; // HH:mm format
  mealTimes?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  notificationEnabled: boolean;
  notificationSound: boolean;
}

export interface PatientStats {
  totalMedications: number;
  adherencePercentage: number;
  currentStreak: number;
  longestStreak: number;
  missedDoses: number;
  onTimeDoses: number;
}

export type RootStackParamList = {
  Home: undefined;
  LabelCapture: undefined;
  MedicationReview: { parsedData: ParsedMedicationData; imageUri: string };
  MedicationSchedule: { medication: Medication };
  Dashboard: undefined;
  Settings: undefined;
};
