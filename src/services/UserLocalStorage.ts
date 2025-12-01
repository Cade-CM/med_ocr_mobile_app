/**
 * @deprecated Use StorageService.getLocalUserProfile, StorageService.updateLocalUserProfile,
 * and StorageService.syncLocalUserProfile instead. This file is kept for backward compatibility.
 */

import { StorageService, LocalUserProfile } from './StorageService';

// Re-export the interface for backward compatibility
export type { LocalUserProfile };

/**
 * @deprecated Use StorageService.saveLocalUserProfile instead
 */
export const saveLocalUserProfile = async (profile: LocalUserProfile) => {
  return StorageService.saveLocalUserProfile(profile);
};

/**
 * @deprecated Use StorageService.getLocalUserProfile instead
 */
export const getLocalUserProfile = async (): Promise<LocalUserProfile | null> => {
  return StorageService.getLocalUserProfile();
};

/**
 * @deprecated Use StorageService.updateLocalUserProfile instead
 */
export const updateLocalUserProfile = async (updates: Partial<LocalUserProfile>) => {
  return StorageService.updateLocalUserProfile(updates);
};

/**
 * @deprecated Use StorageService.syncLocalUserProfile instead
 */
export const syncLocalUserProfile = async (user_key: string, _updateUserProfile?: any) => {
  // The updateUserProfile parameter is no longer needed - handled internally
  return StorageService.syncLocalUserProfile(user_key);
};
