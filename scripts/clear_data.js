/**
 * Clear All Data Script
 * Run this with: node clear_data.js
 * 
 * This script clears ALL user data from AsyncStorage including:
 * - All user accounts and profiles
 * - All medications
 * - All adherence records
 * - All user preferences
 * - Authentication data
 * - User lookup tables
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function clearAllData() {
  try {
    console.log('🗑️  Starting data clear process...\n');
    
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`Found ${allKeys.length} storage keys:\n`);
    
    // Group keys by type for better visibility
    const keysByType = {
      user_lookup: [],
      profile_data: [],
      medications: [],
      adherence_records: [],
      user_prefs: [],
      patient_names: [],
      current_user: [],
      auth: [],
      other: []
    };
    
    allKeys.forEach(key => {
      if (key.includes('@user_lookup')) keysByType.user_lookup.push(key);
      else if (key.includes('@profile_data')) keysByType.profile_data.push(key);
      else if (key.includes('@medications')) keysByType.medications.push(key);
      else if (key.includes('@adherence_records')) keysByType.adherence_records.push(key);
      else if (key.includes('@user_preferences')) keysByType.user_prefs.push(key);
      else if (key.includes('@patient_names')) keysByType.patient_names.push(key);
      else if (key.includes('@current_user_id')) keysByType.current_user.push(key);
      else if (key.includes('userEmail') || key.includes('userPassword') || key.includes('isLoggedIn')) keysByType.auth.push(key);
      else keysByType.other.push(key);
    });
    
    // Display what will be deleted
    console.log('📋 Keys to be deleted:\n');
    Object.entries(keysByType).forEach(([type, keys]) => {
      if (keys.length > 0) {
        console.log(`  ${type}: ${keys.length} key(s)`);
        keys.forEach(key => console.log(`    - ${key}`));
      }
    });
    
    console.log('\n🔥 Deleting all data...');
    
    // Clear all keys
    await AsyncStorage.multiRemove(allKeys);
    
    console.log('\n✅ All data cleared successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Total keys deleted: ${allKeys.length}`);
    console.log(`  - User accounts removed: ${keysByType.profile_data.length}`);
    console.log(`  - Medication records deleted: ${keysByType.medications.length}`);
    console.log(`  - Adherence records deleted: ${keysByType.adherence_records.length}`);
    
    // Verify
    const remainingKeys = await AsyncStorage.getAllKeys();
    console.log(`\n✓ Verification: ${remainingKeys.length} keys remaining`);
    
    if (remainingKeys.length > 0) {
      console.log('\n⚠️  Some keys still exist:');
      remainingKeys.forEach(key => console.log(`    - ${key}`));
    } else {
      console.log('\n🎉 Storage is completely clean!');
    }
    
  } catch (error) {
    console.error('\n❌ Error clearing data:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  clearAllData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { clearAllData };
