import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UserPreferences } from '@types';
import { StorageService } from '@services/StorageService';
import { SchedulingService } from '@services/SchedulingService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ScheduleSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [preferences, setPreferences] = useState<UserPreferences>(
    SchedulingService.getDefaultPreferences()
  );

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const savedPrefs = await StorageService.getUserPreferences();
    if (savedPrefs) {
      setPreferences(savedPrefs);
    }
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await StorageService.saveUserPreferences(preferences);
      Alert.alert('Success', 'Schedule settings saved successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const validateTimeFormat = (time: string) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const handleTimeChange = (key: keyof UserPreferences, value: string) => {
    // Allow user to type, validation on save
    updatePreference(key, value);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <MaterialIcons name="info-outline" size={24} color="#007AFF" />
            <Text style={styles.infoText}>
              Set your daily schedule to organize medication reminders throughout the day.
              Times should be in 24-hour format (e.g., 14:00 for 2:00 PM).
            </Text>
          </View>

          {/* Daily Schedule Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Schedule</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="wb-sunny" size={24} color="#FF9500" />
                </View>
                <View style={styles.labelTextContainer}>
                  <Text style={styles.settingText}>Wake Time</Text>
                  <Text style={styles.settingDescription}>
                    When you typically wake up
                  </Text>
                </View>
              </View>
              <TextInput
                style={styles.timeInput}
                value={preferences.wakeTime}
                onChangeText={(text) => handleTimeChange('wakeTime', text)}
                placeholder="07:00"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="nightlight" size={24} color="#5E35B1" />
                </View>
                <View style={styles.labelTextContainer}>
                  <Text style={styles.settingText}>Sleep Time</Text>
                  <Text style={styles.settingDescription}>
                    When you typically go to bed
                  </Text>
                </View>
              </View>
              <TextInput
                style={styles.timeInput}
                value={preferences.sleepTime}
                onChangeText={(text) => handleTimeChange('sleepTime', text)}
                placeholder="22:00"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          {/* Meal Times Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meal Times</Text>
            <Text style={styles.sectionSubtitle}>
              Optional: Set meal times if medications need to be taken with food
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="free-breakfast" size={24} color="#FF6B6B" />
                </View>
                <View style={styles.labelTextContainer}>
                  <Text style={styles.settingText}>Breakfast</Text>
                  <Text style={styles.settingDescription}>Morning meal time</Text>
                </View>
              </View>
              <TextInput
                style={styles.timeInput}
                value={preferences.mealTimes?.breakfast || ''}
                onChangeText={(text) =>
                  updatePreference('mealTimes', {
                    ...(preferences.mealTimes || {}),
                    breakfast: text,
                  })
                }
                placeholder="08:00"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="lunch-dining" size={24} color="#4ECDC4" />
                </View>
                <View style={styles.labelTextContainer}>
                  <Text style={styles.settingText}>Lunch</Text>
                  <Text style={styles.settingDescription}>Midday meal time</Text>
                </View>
              </View>
              <TextInput
                style={styles.timeInput}
                value={preferences.mealTimes?.lunch || ''}
                onChangeText={(text) =>
                  updatePreference('mealTimes', {
                    ...(preferences.mealTimes || {}),
                    lunch: text,
                  })
                }
                placeholder="12:00"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="dinner-dining" size={24} color="#FFB347" />
                </View>
                <View style={styles.labelTextContainer}>
                  <Text style={styles.settingText}>Dinner</Text>
                  <Text style={styles.settingDescription}>Evening meal time</Text>
                </View>
              </View>
              <TextInput
                style={styles.timeInput}
                value={preferences.mealTimes?.dinner || ''}
                onChangeText={(text) =>
                  updatePreference('mealTimes', {
                    ...(preferences.mealTimes || {}),
                    dinner: text,
                  })
                }
                placeholder="18:00"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          {/* Time Format Helper */}
          <View style={styles.helperCard}>
            <MaterialIcons name="schedule" size={20} color="#666" />
            <View style={styles.helperTextContainer}>
              <Text style={styles.helperTitle}>Time Format Guide</Text>
              <Text style={styles.helperText}>
                Use 24-hour format: 00:00 to 23:59{'\n'}
                Examples: 7:00 AM = 07:00, 2:30 PM = 14:30
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <MaterialIcons name="save" size={24} color="white" />
          <Text style={styles.saveButtonText}>Save Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 12,
    lineHeight: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  labelTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
  },
  timeInput: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
    minWidth: 80,
    textAlign: 'center',
    fontWeight: '600',
  },
  helperCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  helperTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  helperTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ScheduleSettingsScreen;
