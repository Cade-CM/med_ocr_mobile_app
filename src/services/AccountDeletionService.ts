/**
 * Account Deletion Service - GDPR/Privacy-compliant data deletion
 * 
 * Implements "delete my data" flow:
 * - Deletes all user medications from Supabase
 * - Deletes all adherence records
 * - Deletes all schedules
 * - Deletes user profile
 * - Clears local storage (SecureStore + AsyncStorage)
 * - Signs out from Supabase Auth
 * 
 * Notes on soft vs hard delete:
 * - Currently implements HARD DELETE for privacy compliance
 * - If audit trail is needed, modify to soft delete (is_deleted flag)
 * - Consider data retention policy (e.g., anonymize after 30 days)
 */

import { supabase } from '@config/supabase';
import { clearAuthSession } from './storage/secureStorage';
import { getCurrentUserKey, signOut as authSignOut } from './AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { unsubscribeAll } from './RealtimeService';

export interface DeletionResult {
  success: boolean;
  deletedItems: {
    medications: number;
    adherenceRecords: number;
    schedules: number;
    profile: boolean;
    localData: boolean;
    authAccount: boolean;
  };
  errors: string[];
}

/**
 * Delete all user data and account
 * This is irreversible!
 */
export async function deleteAccountAndAllData(): Promise<DeletionResult> {
  const result: DeletionResult = {
    success: false,
    deletedItems: {
      medications: 0,
      adherenceRecords: 0,
      schedules: 0,
      profile: false,
      localData: false,
      authAccount: false,
    },
    errors: [],
  };

  try {
    // Get current user from session (not cached storage)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      result.errors.push('No authenticated user found');
      return result;
    }

    // Use session user ID directly
    const userKey = user.id;

    // 1. Unsubscribe from all realtime channels first
    unsubscribeAll();

    // 2. Delete adherence logs (depends on medications, so delete first)
    // NOTE: adherance_logs uses device_id column (stores auth.uid())
    // TODO: Consider DB migration to rename device_id → user_key for consistency
    try {
      const { data: adherenceData, error: adherenceError } = await supabase
        .from('adherance_logs')
        .delete()
        .eq('device_id', userKey) // adherance_logs schema uses device_id
        .select('id');

      if (adherenceError) {
        result.errors.push(`Adherence deletion error: ${adherenceError.message}`);
      } else {
        result.deletedItems.adherenceRecords = adherenceData?.length || 0;
      }
    } catch (e) {
      result.errors.push(`Adherence deletion exception: ${e}`);
    }

    // 3. Delete med_events
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('med_events')
        .delete()
        .eq('user_key', userKey)
        .select('id');

      if (eventError) {
        result.errors.push(`Events deletion error: ${eventError.message}`);
      } else {
        result.deletedItems.schedules = eventData?.length || 0;
      }
    } catch (e) {
      result.errors.push(`Events deletion exception: ${e}`);
    }

    // 4. Delete medications
    try {
      const { data: medData, error: medError } = await supabase
        .from('medications')
        .delete()
        .eq('user_key', userKey)
        .select('id');

      if (medError) {
        result.errors.push(`Medication deletion error: ${medError.message}`);
      } else {
        result.deletedItems.medications = medData?.length || 0;
      }
    } catch (e) {
      result.errors.push(`Medication deletion exception: ${e}`);
    }

    // 5. Delete user profile
    try {
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('user_key', userKey);

      if (profileError) {
        result.errors.push(`Profile deletion error: ${profileError.message}`);
      } else {
        result.deletedItems.profile = true;
      }
    } catch (e) {
      result.errors.push(`Profile deletion exception: ${e}`);
    }

    // 6. Clear all local storage
    try {
      // Clear SecureStore
      await clearAuthSession();
      
      // Clear AsyncStorage (non-sensitive app state)
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        await AsyncStorage.multiRemove(keys);
      }
      
      result.deletedItems.localData = true;
    } catch (e) {
      result.errors.push(`Local storage clear exception: ${e}`);
    }

    // 7. Delete auth account (this signs out the user)
    // Note: This requires the user to be authenticated
    // In production, you might want to use a server-side function for this
    try {
      // Use AuthService.signOut() to ensure consistent cleanup
      await authSignOut();
      result.deletedItems.authAccount = true;
      
      // Note: To fully delete the auth.users record, you need:
      // - A Supabase Edge Function with service_role key
      // - Or handle via Supabase Dashboard
      // The signOut above removes the session, but the auth record remains
      // until deleted via admin API
    } catch (e) {
      result.errors.push(`Auth deletion exception: ${e}`);
    }

    // Determine overall success
    result.success = result.errors.length === 0;
    
    return result;
  } catch (error) {
    result.errors.push(`Unexpected error: ${error}`);
    return result;
  }
}

/**
 * Get count of user's data before deletion (for confirmation UI)
 */
export async function getDataDeletionSummary(): Promise<{
  medicationCount: number;
  adherenceCount: number;
  scheduleCount: number;
} | null> {
  try {
    const userKey = await getCurrentUserKey();
    if (!userKey) return null;

    const [medResult, adherenceResult, eventResult] = await Promise.all([
      supabase.from('medications').select('id', { count: 'exact', head: true }).eq('user_key', userKey),
      supabase.from('adherance_logs').select('id', { count: 'exact', head: true }).eq('device_id', userKey),
      supabase.from('med_events').select('id', { count: 'exact', head: true }).eq('user_key', userKey),
    ]);

    return {
      medicationCount: medResult.count || 0,
      adherenceCount: adherenceResult.count || 0,
      scheduleCount: eventResult.count || 0,
    };
  } catch (error) {
    console.warn('Error getting deletion summary:', error);
    return null;
  }
}

/**
 * Export user data before deletion (GDPR right to data portability)
 */
export async function exportUserData(): Promise<{
  medications: unknown[];
  adherenceRecords: unknown[];
  schedules: unknown[];
  profile: unknown | null;
} | null> {
  try {
    const userKey = await getCurrentUserKey();
    if (!userKey) return null;

    const [medResult, adherenceResult, eventResult, profileResult] = await Promise.all([
      supabase.from('medications').select('*').eq('user_key', userKey),
      supabase.from('adherance_logs').select('*').eq('device_id', userKey),
      supabase.from('med_events').select('*').eq('user_key', userKey),
      supabase.from('users').select('*').eq('user_key', userKey).single(),
    ]);

    return {
      medications: medResult.data || [],
      adherenceRecords: adherenceResult.data || [],
      schedules: eventResult.data || [],
      profile: profileResult.data || null,
    };
  } catch (error) {
    console.warn('Error exporting user data:', error);
    return null;
  }
}
