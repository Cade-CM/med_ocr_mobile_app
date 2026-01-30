/**
 * Storage Module - Barrel export for all storage operations
 * 
 * This provides a clean public API for all storage functionality.
 * Import from '@services/storage' instead of individual modules.
 */

// Storage key constants
export { STORAGE_KEYS } from './keys';

// User/Auth operations
export {
  LocalUserProfile,
  generateUserId,
  getCurrentUserId,
  setCurrentUserId,
  getUserIdFromEmail,
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  saveLocalUserProfile,
  getLocalUserProfile,
  updateLocalUserProfile,
  syncLocalUserProfile,
} from './user';

// Medication operations
export {
  saveMedication,
  updateMedication,
  getMedications,
  deleteMedication,
  getMedicationById,
  getMedicationsByPatient,
  getActiveMedications,
} from './medications';

// Adherence operations
export {
  saveAdherenceRecord,
  getAdherenceRecords,
  getAdherenceRecordsForMedication,
  getPatientStats,
} from './adherence';

// Event operations
export {
  MedicationEvent,
  saveEvent,
  getEvents,
  deleteEvent,
  getEventsForMedication,
  getEventsByDateRange,
} from './events';

// Preferences/Settings operations
export {
  UserSettings,
  saveUserPreferences,
  getUserPreferences,
  updateUserPreferences,
  saveUserSettings,
  getUserSettings,
  updateUserSettings,
  resetUserPreferences,
  resetUserSettings,
} from './preferences';

// Patient names operations
export {
  PatientNameEntry,
  savePatientName,
  getPatientNames,
  isKnownPatientName,
  removePatientName,
  getPatientNamesByUsage,
} from './patientNames';

// Secure storage operations (for sensitive data like tokens, PHI)
export {
  SECURE_KEYS,
  setSecureItem,
  getSecureItem,
  deleteSecureItem,
  setSecureJSON,
  getSecureJSON,
  clearSecureStorage,
  storeAuthSession,
  getAuthSession,
  clearAuthSession,
} from './secureStorage';

// Utility operations
export {
  clearUserData,
  clearAllData,
  clearAllUsersAndData,
  getStorageStats,
  exportUserData,
  importUserData,
} from './utilities';

/**
 * StorageService class - Backward compatible wrapper
 * 
 * This class provides the same API as the original StorageService
 * for backward compatibility. New code should import functions directly.
 * 
 * @deprecated Use individual function imports instead
 */
import * as user from './user';
import * as medications from './medications';
import * as adherence from './adherence';
import * as events from './events';
import * as preferences from './preferences';
import * as patientNames from './patientNames';
import * as utilities from './utilities';

export const StorageService = {
  // User operations
  generateUserId: user.generateUserId,
  getCurrentUserId: user.getCurrentUserId,
  setCurrentUserId: user.setCurrentUserId,
  getUserIdFromEmail: user.getUserIdFromEmail,
  registerUser: user.registerUser,
  loginUser: user.loginUser,
  logoutUser: user.logoutUser,
  getUserProfile: user.getUserProfile,
  updateUserProfile: user.updateUserProfile,
  saveLocalUserProfile: user.saveLocalUserProfile,
  getLocalUserProfile: user.getLocalUserProfile,
  updateLocalUserProfile: user.updateLocalUserProfile,
  syncLocalUserProfile: user.syncLocalUserProfile,

  // Medication operations
  saveMedication: medications.saveMedication,
  updateMedication: medications.updateMedication,
  getMedications: medications.getMedications,
  deleteMedication: medications.deleteMedication,
  getMedicationById: medications.getMedicationById,
  getMedicationsByPatient: medications.getMedicationsByPatient,
  getActiveMedications: medications.getActiveMedications,

  // Adherence operations
  saveAdherenceRecord: adherence.saveAdherenceRecord,
  getAdherenceRecords: adherence.getAdherenceRecords,
  getAdherenceRecordsForMedication: adherence.getAdherenceRecordsForMedication,
  getPatientStats: adherence.getPatientStats,

  // Event operations
  saveEvent: events.saveEvent,
  getEvents: events.getEvents,
  deleteEvent: events.deleteEvent,
  getEventsForMedication: events.getEventsForMedication,
  getEventsByDateRange: events.getEventsByDateRange,

  // Preferences operations
  saveUserPreferences: preferences.saveUserPreferences,
  getUserPreferences: preferences.getUserPreferences,
  updateUserPreferences: preferences.updateUserPreferences,
  saveUserSettings: preferences.saveUserSettings,
  getUserSettings: preferences.getUserSettings,
  updateUserSettings: preferences.updateUserSettings,
  resetUserPreferences: preferences.resetUserPreferences,
  resetUserSettings: preferences.resetUserSettings,

  // Patient names operations
  savePatientName: patientNames.savePatientName,
  getPatientNames: patientNames.getPatientNames,
  isKnownPatientName: patientNames.isKnownPatientName,
  removePatientName: patientNames.removePatientName,
  getPatientNamesByUsage: patientNames.getPatientNamesByUsage,

  // Utility operations
  clearUserData: utilities.clearUserData,
  clearAllData: utilities.clearAllData,
  clearAllUsersAndData: utilities.clearAllUsersAndData,
  getStorageStats: utilities.getStorageStats,
  exportUserData: utilities.exportUserData,
  importUserData: utilities.importUserData,
};
