/**
 * Storage Keys - Centralized AsyncStorage key definitions
 */

export const STORAGE_KEYS = {
  MEDICATIONS: '@medications',
  ADHERENCE_RECORDS: '@adherence_records',
  USER_PREFERENCES: '@user_preferences',
  USER_SETTINGS: '@user_settings',
  PATIENT_NAMES: '@patient_names',
  PROFILE_DATA: '@profile_data',
  CURRENT_USER: '@current_user_id',
  USER_LOOKUP: '@user_lookup',
  LOCAL_USER_PROFILE: '@localUserProfile',
  EVENTS: '@events',
} as const;
