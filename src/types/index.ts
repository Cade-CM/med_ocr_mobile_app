/**
 * Type definitions for the Medication Adherence App
 */

/**
 * Medication record
 */
export interface Medication {
  id: string;
  patientName?: string;
  drugName: string;
  strength?: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  additionalInstructions?: string;
  rxNumber?: string;
  quantity?: string;
  refills?: string;
  refillsBeforeDate?: string;
  pharmacy?: string;
  pharmacyPhone?: string;
  reminderTimes: Date[];
  startDate: Date;
  endDate?: Date;
  capturedImageUri?: string;
  rawOcrText?: string;
}

/**
 * Parsed data from OCR
 */
export interface ParsedMedicationData {
  patientName?: string;
  drugName?: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  additionalInstructions?: string;
  rxNumber?: string;
  quantity?: string;
  refills?: string;
  refillsBeforeDate?: string;
  pharmacy?: string;
  pharmacyPhone?: string;
  confidence: number;
}

/**
 * Adherence tracking record
 */
export interface AdherenceRecord {
  id: string;
  medicationId: string;
  scheduledTime: Date;
  takenTime?: Date;
  status: 'taken' | 'missed' | 'skipped' | 'pending';
  lateness?: number; // in minutes
  notes?: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  wakeTime: string;
  sleepTime: string;
  mealTimes?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  notificationEnabled: boolean;
  notificationSound: boolean;
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  reminderAdvanceMinutes?: number;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
}

/**
 * Reminder schedule interface
 */
export interface ReminderSchedule {
  times: Date[];
  frequency: string;
}

/**
 * Patient statistics
 */
export interface PatientStats {
  totalMedications: number;
  adherencePercentage: number;
  currentStreak: number;
  longestStreak: number;
  missedDoses: number;
  onTimeDoses: number;
}

/**
 * Navigation stack parameter list
 */
export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ProfileSetup: {
    email: string;
    authMethod: 'email' | 'google' | 'apple';
  };
  Home: undefined;
  HomeTab: undefined;
  DashboardTab: undefined;
  SettingsTab: undefined;
  LabelCapture: undefined;
  MedicationReview: {
    imageUri: string;
    rawOcrText?: string;
    parsedData?: ParsedMedicationData;
    editMode?: boolean;
    existingMedication?: Medication;
  };
  MedicationSchedule: {
    medication: Omit<Medication, 'reminderTimes'>;
    editMode?: boolean;
  };
};
