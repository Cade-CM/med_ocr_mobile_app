import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '@types';
import { deleteMedication } from '@services/BackendService';
import {SchedulingService} from '@services/SchedulingService';
import {MaterialIcons as Icon} from '@expo/vector-icons';




type Props = NativeStackScreenProps<RootStackParamList, 'MedicationDetails'>;

const MedicationDetailsScreen: React.FC<Props> = ({route, navigation}) => {
  const {medication} = route.params;

  // Allow access to backend-style snake_case fields
  const raw = medication as any;

  // Normalized display fields so we handle BOTH backend rows and app-shaped meds
  const name: string = medication.drugName ?? raw.drug_name ?? 'Medication';
  const strength: string = medication.strength ?? raw.strength ?? '';
  const dosage: string = medication.dosage ?? raw.dosage ?? raw.qty_text ?? '';
  const frequency: string = medication.frequency ?? raw.frequency ?? raw.frequency_text ?? '';
  const instructions: string = medication.instructions ?? raw.instructions ?? raw.instruction ?? '';
  const rfidTagId: string = medication.rfidTagId ?? raw.rfid_tag_id ?? '';
  const quantity: string = medication.quantity ?? raw.quantity ?? raw.qty ?? raw.qty_text ?? '';
  const refills: string = medication.refills ?? raw.refills ?? raw.refills_text ?? '';
  const isActive: string = medication.isActive ?? raw.isActive ?? raw.is_active ?? '';
  const createdAt: string = medication.createdAt ?? raw.createdAt ?? raw.created_at ?? '';
  const updatedAt: string = medication.updatedAt ?? raw.updatedAt ?? raw.updated_at ?? '';
  const medicationKey: string = medication.medication_key ?? raw.medication_key ?? '';
  const userKey: string = medication.user_key ?? raw.user_key ?? '';
  // Normalize reminderTimes (it might not exist on raw backend rows)
  const reminderTimes: Date[] = Array.isArray(raw.reminderTimes)
    ? raw.reminderTimes
    : [];

  const nextDose = SchedulingService.getNextDoseTime({
    ...medication,
    reminderTimes,
  });

  const handleDeleteMedication = () => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const raw = medication as any;
              const identifier = raw.medication_key || medication.medication_key || medication.id;
              console.log('Deleting medication with identifier:', identifier);
              await deleteMedication(identifier);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting medication:', error);
              Alert.alert('Delete Error', 'Failed to delete medication.');
            }
          },
        },
      ]
    );
  };

  const handleConfirmMeds = () => {
    navigation.navigate('MedicationConfirmation', {
      medicationId: medication.id,
      scheduledTime: nextDose || new Date(),
    });
  };

  const handleEditMedication = () => {
    navigation.navigate('MedicationReview', {
      imageUri: medication.capturedImageUri || '',
      rawOcrText: medication.rawOcrText || '',
      parsedData: undefined,
      editMode: true,
      existingMedication: {
        ...medication,
        drugName: name,
        dosage,
        frequency,
        strength,
        instructions,
        rfidTagId,
        quantity,
        refills,
        isActive,
        createdAt,
        updatedAt,
        medication_key: medicationKey,
        user_key: userKey,
      },
    });
  };

  const handleEditSchedule = () => {
    navigation.navigate('MedicationSchedule', {
      medication: {
        ...medication,
        drugName: name,
        dosage,
        frequency,
        strength,
        instructions,
        rfidTagId,
        quantity,
        refills,
        isActive,
        createdAt,
        updatedAt,
        medication_key: medicationKey,
        user_key: userKey,
        reminderTimes,
      },
      editMode: true,
    });
  };

  const handleLinkRFID = () => {
    navigation.navigate('LinkRFID', {
      medication: {
        ...medication,
        drugName: name,
        dosage,
        frequency,
        strength,
        instructions,
        rfidTagId,
          // Do not pass reminderTimes if not in Medication type
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Medication Header */}
        <View style={styles.headerCard}>
          <View style={styles.iconContainer}>
            <Icon name="medication" size={48} color="#007AFF" />
          </View>
          <Text style={styles.medicationName}>{name}</Text>
          {strength ? (
            <Text style={styles.medicationStrength}>{strength}</Text>
          ) : null}
        </View>

        {/* Medication Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="local-pharmacy" size={24} color="#007AFF" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Dosage</Text>
              <Text style={styles.infoValue}>{dosage || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="schedule" size={24} color="#007AFF" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Frequency</Text>
              <Text style={styles.infoValue}>{frequency || 'Not specified'}</Text>
            </View>
          </View>

          {instructions && (
            <View style={styles.infoRow}>
              <Icon name="info-outline" size={24} color="#007AFF" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Instructions</Text>
                <Text style={styles.infoValue}>{instructions}</Text>
              </View>
            </View>
          )}

          {quantity && (
            <View style={styles.infoRow}>
              <Icon name="inventory" size={24} color="#007AFF" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Quantity</Text>
                <Text style={styles.infoValue}>{quantity}</Text>
              </View>
            </View>
          )}

          {refills && (
            <View style={styles.infoRow}>
              <Icon name="autorenew" size={24} color="#007AFF" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Refills</Text>
                <Text style={styles.infoValue}>{refills}</Text>
              </View>
            </View>
          )}

          {isActive !== '' && (
            <View style={styles.infoRow}>
              <Icon name="check-circle" size={24} color="#007AFF" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Active</Text>
                <Text style={styles.infoValue}>{String(isActive)}</Text>
              </View>
            </View>
          )}

          {createdAt && (
            <View style={styles.infoRow}>
              <Icon name="event" size={24} color="#007AFF" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>{String(createdAt)}</Text>
              </View>
            </View>
          )}

          {updatedAt && (
            <View style={styles.infoRow}>
              <Icon name="update" size={24} color="#007AFF" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Updated</Text>
                <Text style={styles.infoValue}>{String(updatedAt)}</Text>
              </View>
            </View>
          )}

          {medicationKey && (
            <View style={styles.infoRow}>
              <Icon name="vpn-key" size={24} color="#007AFF" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>MedKey</Text>
                <Text style={styles.infoValue}>{String(medicationKey)}</Text>
              </View>
            </View>
          )}

          {userKey && (
            <View style={styles.infoRow}>
              <Icon name="person" size={24} color="#007AFF" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>UserKey</Text>
                <Text style={styles.infoValue}>{String(userKey)}</Text>
              </View>
            </View>
          )}

          {nextDose && (
            <View style={styles.infoRow}>
              <Icon name="access-time" size={24} color="#34C759" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Next Dose</Text>
                <Text style={styles.infoValue}>{SchedulingService.formatTime(nextDose)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Reminder Times */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Reminder Times</Text>
          <View style={styles.timesList}>
            {reminderTimes.length === 0 ? (
              <Text style={styles.noTimesText}>No reminders set</Text>
            ) : (
              reminderTimes.map((time, index) => (
                <View key={index} style={styles.timeCard}>
                  <Icon name="notifications" size={20} color="#007AFF" />
                  <Text style={styles.timeText}>
                    {SchedulingService.formatTime(time)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* RFID Status */}
        {rfidTagId && (
          <View style={styles.rfidStatusCard}>
            <Icon name="nfc" size={24} color="#34C759" />
            <View style={styles.rfidStatusText}>
              <Text style={styles.rfidStatusLabel}>RFID Tag Linked</Text>
              <Text style={styles.rfidStatusValue}>
                {rfidTagId.substring(0, 16)}...
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#FF3B30'}]}
            onPress={handleDeleteMedication}>
            <Icon name="delete" size={24} color="white" />
            <Text style={styles.actionButtonText}>Delete Medication</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEditMedication}>
            <Icon name="edit" size={24} color="white" />
            <Text style={styles.actionButtonText}>Edit Medication</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEditSchedule}>
            <Icon name="schedule" size={24} color="white" />
            <Text style={styles.actionButtonText}>Edit Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rfidButton]}
            onPress={handleLinkRFID}>
            <Icon name="nfc" size={24} color="white" />
            <Text style={styles.actionButtonText}>
              {rfidTagId ? 'Update RFID Tag' : 'Link RFID Tag'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#FF9500'}]}
            onPress={handleConfirmMeds}>
            <Icon name="check-circle" size={24} color="white" />
            <Text style={styles.actionButtonText}>Confirm Meds</Text>
          </TouchableOpacity>
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
  headerCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  medicationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  medicationStrength: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  timesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  noTimesText: {
    fontSize: 14,
    color: '#666',
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  rfidStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  rfidStatusText: {
    marginLeft: 12,
    flex: 1,
  },
  rfidStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 4,
  },
  rfidStatusValue: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rfidButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default MedicationDetailsScreen;
