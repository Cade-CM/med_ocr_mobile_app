/**
 * Utilities Storage - Data clearing and maintenance operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './keys';

/**
 * Clear all data for a specific user
 */
export async function clearUserData(userId: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const userKeys = allKeys.filter(key => key.endsWith(`_${userId}`));
    
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
    }
    
    console.log(`Cleared ${userKeys.length} keys for user ${userId}`);
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
}

/**
 * Clear all application data (nuclear option)
 */
export async function clearAllData(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter to only our app's keys (those starting with our prefix)
    const appKeys = allKeys.filter(key => 
      Object.values(STORAGE_KEYS).some(prefix => 
        key === prefix || key.startsWith(`${prefix}_`)
      )
    );
    
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
    }
    
    console.log(`Cleared ${appKeys.length} application keys`);
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw error;
  }
}

/**
 * Clear all users and all data (complete reset)
 */
export async function clearAllUsersAndData(): Promise<void> {
  try {
    await AsyncStorage.clear();
    console.log('Cleared all AsyncStorage data');
  } catch (error) {
    console.error('Error clearing all users and data:', error);
    throw error;
  }
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  totalKeys: number;
  appKeys: number;
  estimatedSize: number;
}> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    
    const appKeys = allKeys.filter(key => 
      Object.values(STORAGE_KEYS).some(prefix => 
        key === prefix || key.startsWith(`${prefix}_`)
      )
    );
    
    // Estimate size by fetching all values
    let estimatedSize = 0;
    for (const key of appKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        estimatedSize += key.length + value.length;
      }
    }
    
    return {
      totalKeys: allKeys.length,
      appKeys: appKeys.length,
      estimatedSize,
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalKeys: 0,
      appKeys: 0,
      estimatedSize: 0,
    };
  }
}

/**
 * Export all user data for backup
 */
export async function exportUserData(userId: string): Promise<Record<string, any>> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const userKeys = allKeys.filter(key => key.endsWith(`_${userId}`));
    
    const pairs = await AsyncStorage.multiGet(userKeys);
    const data: Record<string, any> = {};
    
    for (const [key, value] of pairs) {
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
}

/**
 * Import user data from backup
 */
export async function importUserData(
  userId: string,
  data: Record<string, any>,
): Promise<void> {
  try {
    const pairs: [string, string][] = Object.entries(data).map(
      ([key, value]) => [key, JSON.stringify(value)]
    );
    
    if (pairs.length > 0) {
      await AsyncStorage.multiSet(pairs);
    }
    
    console.log(`Imported ${pairs.length} keys for user ${userId}`);
  } catch (error) {
    console.error('Error importing user data:', error);
    throw error;
  }
}
