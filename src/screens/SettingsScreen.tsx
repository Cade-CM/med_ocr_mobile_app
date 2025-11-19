import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import {UserPreferences} from '@types';
import {StorageService} from '@services/StorageService';
import {SchedulingService} from '@services/SchedulingService';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SettingsScreen: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(
    SchedulingService.getDefaultPreferences(),
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const savedPrefs = await StorageService.getUserPreferences();
    if (savedPrefs) {
      setPreferences(savedPrefs);
    }
  };

  const handleSave = async () => {
    try {
      await StorageService.saveUserPreferences(preferences);
      setHasChanges(false);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => {
    setPreferences(prev => ({...prev, [key]: value}));
    setHasChanges(true);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your medications and adherence records. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearAllData();
            Alert.alert('Success', 'All data has been cleared.');
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Schedule Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Schedule</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="wb-sunny" size={24} color="#FF9500" />
              <Text style={styles.settingText}>Wake Time</Text>
            </View>
            <TextInput
              style={styles.timeInput}
              value={preferences.wakeTime}
              onChangeText={(text) => updatePreference('wakeTime', text)}
              placeholder="07:00"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="nightlight" size={24} color="#5E35B1" />
              <Text style={styles.settingText}>Sleep Time</Text>
            </View>
            <TextInput
              style={styles.timeInput}
              value={preferences.sleepTime}
              onChangeText={(text) => updatePreference('sleepTime', text)}
              placeholder="22:00"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Meal Times */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meal Times (Optional)</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="free-breakfast" size={24} color="#FF6B6B" />
              <Text style={styles.settingText}>Breakfast</Text>
            </View>
            <TextInput
              style={styles.timeInput}
              value={preferences.mealTimes?.breakfast || ''}
              onChangeText={(text) =>
                updatePreference('mealTimes', {
                  ...preferences.mealTimes,
                  breakfast: text,
                })
              }
              placeholder="08:00"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="lunch-dining" size={24} color="#4ECDC4" />
              <Text style={styles.settingText}>Lunch</Text>
            </View>
            <TextInput
              style={styles.timeInput}
              value={preferences.mealTimes?.lunch || ''}
              onChangeText={(text) =>
                updatePreference('mealTimes', {
                  ...preferences.mealTimes,
                  lunch: text,
                })
              }
              placeholder="12:00"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="dinner-dining" size={24} color="#FFB347" />
              <Text style={styles.settingText}>Dinner</Text>
            </View>
            <TextInput
              style={styles.timeInput}
              value={preferences.mealTimes?.dinner || ''}
              onChangeText={(text) =>
                updatePreference('mealTimes', {
                  ...preferences.mealTimes,
                  dinner: text,
                })
              }
              placeholder="18:00"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="notifications" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Enable Notifications</Text>
            </View>
            <Switch
              value={preferences.notificationEnabled}
              onValueChange={(value) =>
                updatePreference('notificationEnabled', value)
              }
              trackColor={{false: '#D1D1D6', true: '#34C759'}}
              thumbColor="white"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="volume-up" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Notification Sound</Text>
            </View>
            <Switch
              value={preferences.notificationSound}
              onValueChange={(value) =>
                updatePreference('notificationSound', value)
              }
              trackColor={{false: '#D1D1D6', true: '#34C759'}}
              thumbColor="white"
              disabled={!preferences.notificationEnabled}
            />
          </View>
        </View>

        {/* Save Button */}
        {hasChanges && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Icon name="save" size={24} color="white" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        )}

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: '#FF3B30'}]}>
            Danger Zone
          </Text>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearData}>
            <Icon name="delete-forever" size={24} color="#FF3B30" />
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.infoSection}>
          <Text style={styles.appName}>MedAdherence</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            Medication adherence tracking with OCR label capture
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  timeInput: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
    minWidth: 80,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  dangerButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  appDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SettingsScreen;
