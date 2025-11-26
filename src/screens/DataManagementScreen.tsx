import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Data Management Screen
 * For development/testing purposes
 * Accessible via Settings > Developer Options
 */
const DataManagementScreen: React.FC = () => {
  const [keys, setKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAllKeys = async () => {
    try {
      setIsLoading(true);
      const allKeys = await AsyncStorage.getAllKeys();
      setKeys([...allKeys]);
      Alert.alert('Storage Keys', `Found ${allKeys.length} keys in storage`);
    } catch (error) {
      Alert.alert('Error', 'Failed to load keys');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      '⚠️ DELETE ALL DATA',
      'This will permanently delete ALL accounts, profiles, medications, and data. This CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const allKeys = await AsyncStorage.getAllKeys();
              console.log(`🗑️  Deleting ${allKeys.length} keys...`);
              
              await AsyncStorage.multiRemove(allKeys);
              
              const remaining = await AsyncStorage.getAllKeys();
              console.log(`✅ Deleted all data. Remaining keys: ${remaining.length}`);
              
              setKeys([]);
              Alert.alert(
                'Success',
                `All data cleared!\n\nDeleted: ${allKeys.length} keys\nRemaining: ${remaining.length} keys`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear all data');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const viewStorageDetails = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysByType: { [key: string]: string[] } = {
        'User Lookup': [],
        'Profile Data': [],
        'Medications': [],
        'Adherence Records': [],
        'Preferences': [],
        'Patient Names': [],
        'Current User': [],
        'Authentication': [],
        'Other': [],
      };

      allKeys.forEach(key => {
        if (key.includes('@user_lookup')) keysByType['User Lookup'].push(key);
        else if (key.includes('@profile_data')) keysByType['Profile Data'].push(key);
        else if (key.includes('@medications')) keysByType['Medications'].push(key);
        else if (key.includes('@adherence_records')) keysByType['Adherence Records'].push(key);
        else if (key.includes('@user_preferences')) keysByType['Preferences'].push(key);
        else if (key.includes('@patient_names')) keysByType['Patient Names'].push(key);
        else if (key.includes('@current_user_id')) keysByType['Current User'].push(key);
        else if (key.includes('userEmail') || key.includes('userPassword') || key.includes('isLoggedIn'))
          keysByType['Authentication'].push(key);
        else keysByType['Other'].push(key);
      });

      let message = `Total Keys: ${allKeys.length}\n\n`;
      Object.entries(keysByType).forEach(([type, keys]) => {
        if (keys.length > 0) {
          message += `${type}: ${keys.length}\n`;
        }
      });

      Alert.alert('Storage Details', message);
    } catch (error) {
      Alert.alert('Error', 'Failed to load storage details');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Data Management</Text>
        <Text style={styles.subtitle}>Development & Testing Tools</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Information</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={loadAllKeys}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Loading...' : 'Load All Keys'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={viewStorageDetails}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>View Storage Details</Text>
          </TouchableOpacity>

          {keys.length > 0 && (
            <View style={styles.keysList}>
              <Text style={styles.keysTitle}>Keys in Storage ({keys.length}):</Text>
              {keys.map((key, index) => (
                <Text key={index} style={styles.keyItem}>
                  {index + 1}. {key}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>⚠️ Danger Zone</Text>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={clearAllData}
            disabled={isLoading}
          >
            <Text style={styles.dangerButtonText}>
              🗑️ Delete All Data
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.warningText}>
            This will permanently delete all accounts, profiles, medications, and data.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  keysList: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  keysTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  keyItem: {
    fontSize: 12,
    color: '#666',
    paddingVertical: 3,
    fontFamily: 'monospace',
  },
  dangerSection: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  dangerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 15,
    textAlign: 'center',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default DataManagementScreen;
