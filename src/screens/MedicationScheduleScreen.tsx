import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, Medication, UserPreferences} from '@types';
import {SchedulingService} from '@services/SchedulingService';
import {OCRService} from '@services/OCRService';
import {StorageService} from '@services/StorageService';
import {MaterialIcons as Icon} from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicationSchedule'>;

const MedicationScheduleScreen: React.FC<Props> = ({route, navigation}) => {
  const {medication, editMode} = route.params;
  
  const [preferences, setPreferences] = useState<UserPreferences>(
    SchedulingService.getDefaultPreferences(),
  );
  
  const [wakeTime, setWakeTime] = useState(preferences.wakeTime);
  const [sleepTime, setSleepTime] = useState(preferences.sleepTime);
  const [withFood, setWithFood] = useState(false);

  const timesPerDay = OCRService.parseFrequencyToTimesPerDay(medication.frequency);
  const reminderTimes = SchedulingService.generateReminderSchedule(
    medication,
    {...preferences, wakeTime, sleepTime},
    timesPerDay,
  );

  const adjustedTimes = withFood 
    ? SchedulingService.adjustForMeals(reminderTimes, preferences, true)
    : reminderTimes;

  const handleSave = async () => {
    const finalMedication: Medication = {
      ...medication,
      reminderTimes: adjustedTimes,
    };

    try {
      if (editMode) {
        // Update existing medication
        await StorageService.updateMedication(finalMedication);
        
        Alert.alert(
          'Success',
          'Medication updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home'),
            },
          ],
        );
      } else {
        // Save new medication
        await StorageService.saveMedication(finalMedication);
        
        Alert.alert(
          'Success',
          'Medication added successfully! Reminders have been scheduled.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home'),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${editMode ? 'update' : 'save'} medication. Please try again.`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {editMode ? 'Update Reminder Schedule' : 'Set Reminder Schedule'}
        </Text>
        <Text style={styles.subtitle}>
          {editMode 
            ? `Update when you'd like to be reminded to take ${medication.drugName}`
            : `Customize when you'd like to be reminded to take ${medication.drugName}`}
        </Text>

        {/* Medication Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Icon name="medication" size={24} color="#007AFF" />
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Medication</Text>
              <Text style={styles.summaryValue}>{medication.drugName}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Icon name="local-pharmacy" size={24} color="#007AFF" />
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Dosage</Text>
              <Text style={styles.summaryValue}>{medication.dosage}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Icon name="schedule" size={24} color="#007AFF" />
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Frequency</Text>
              <Text style={styles.summaryValue}>
                {medication.frequency} ({timesPerDay}x daily)
              </Text>
            </View>
          </View>
        </View>

        {/* Schedule Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Preferences</Text>
          
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Take with food</Text>
            <Switch
              value={withFood}
              onValueChange={setWithFood}
              trackColor={{false: '#D1D1D6', true: '#34C759'}}
              thumbColor="white"
            />
          </View>
        </View>

        {/* Reminder Times */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminder Times</Text>
          <Text style={styles.sectionSubtitle}>
            Based on your schedule, you'll be reminded at:
          </Text>
          
          {adjustedTimes.map((time, index) => (
            <View key={index} style={styles.timeCard}>
              <Icon name="notifications" size={24} color="#007AFF" />
              <Text style={styles.timeText}>
                {SchedulingService.formatTime(time)}
              </Text>
            </View>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Icon name="check" size={24} color="white" />
          <Text style={styles.saveButtonText}>
            {editMode ? 'Update Medication' : 'Save & Set Reminders'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryText: {
    marginLeft: 15,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#333',
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 15,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 30,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MedicationScheduleScreen;
