/**
 * Type definitions for the Medication Adherence App
 */

/**
 * Medication record
 */
export interface Medication {
  id: string;
  user_key: string;
  password: string; // Adding password field to match backend contract
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
  rfidTagId?: string; // RFID tag linked to this medication
  requiresRFIDConfirmation?: boolean; // Whether RFID scan is required
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
  confirmedTime?: Date; // When user confirmed they took it
  status: 'taken' | 'missed' | 'skipped' | 'pending';
  confirmationMethod?: 'rfid' | 'manual' | 'skipped'; // How it was confirmed
  rfidTagId?: string; // RFID tag scanned for confirmation
  isOnTime?: boolean; // Within acceptable time window
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
  useRFIDConfirmation?: boolean; // Enable RFID confirmation mode
  confirmationWindowMinutes?: number; // Time window for "on-time" (default: 30)
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
  MedicationDetails: {
    medication: Medication;
  };
  LinkRFID: {
    medication: Medication;
  };
  ScheduleCalendar: undefined;
  ScheduleSettings: undefined;
  MedicationConfirmation: {
    medicationId: string;
    scheduledTime: Date;
  };
  AdherenceHistory: {
    medicationId: string;
  };
};
