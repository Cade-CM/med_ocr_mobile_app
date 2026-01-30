import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Medication, UserPreferences } from '@types';
import { MaterialIcons } from '@expo/vector-icons';
import { StorageService } from '@services/StorageService';
import * as BackendService from '@services/BackendService';

// Utility to map backend medication_key to frontend id
function mapBackendMedication(med: any): Medication {
  return {
    ...med,
    id: med.medication_key || med.id,
    drugName: med.drug_name || med.drugName,
    strength: med.strength,
    dosage: med.dosage,
    instructions: med.instructions,
    rfidTagId: med.rfid_tag_id || med.rfidTagId,
    // add other mappings as needed
  };
}
import { logMedEvent } from '@services/BackendService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NFCService } from '@services/NFCService';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicationConfirmation'>;

const MedicationConfirmationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { medicationId, scheduledTime } = route.params;
  
  const [medication, setMedication] = useState<Medication | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(true);

  useEffect(() => {
    loadData();
    checkNFCSupport();
    
    return () => {
      // Cleanup NFC on unmount
      NFCService.cancel();
    };
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Load medications from backend - no user_key needed, service uses session
      const backendMeds = await BackendService.fetchMedications();
      // Map backend meds and preserve medication_key
      const medications = backendMeds.map(med => ({
        ...mapBackendMedication(med),
        medication_key: med.medication_key // ensure medication_key is present
      }));
      const med = medications.find(m => String(m.id) === String(medicationId));
      if (!med) {
        console.warn('MedicationConfirmationScreen: Medication not found, attempting to add from backend.');
        // Attempt to add medication from backend if possible
        if (medicationId) {
          const newMed = backendMeds.find(m => String(m.id) === String(medicationId));
          if (newMed) {
            const mappedMed = mapBackendMedication(newMed);
            await StorageService.saveMedication(mappedMed);
            setMedication(mappedMed);
            Alert.alert('Info', 'Medication not found locally, but added from backend.');
          } else {
            Alert.alert('Error', 'Medication not found in backend.');
            navigation.goBack();
            return;
          }
        } else {
          Alert.alert('Error', 'Medication not found and cannot be added.');
          navigation.goBack();
          return;
        }
      }
      if (med) {
        setMedication(med);
      }
      // Load preferences
      const prefs = await StorageService.getUserPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load medication information');
    } finally {
      setIsLoading(false);
    }
  };

  const checkNFCSupport = async () => {
    const supported = await NFCService.initialize();
    setNfcSupported(supported);
    
    if (!supported) {
      console.log('⚠️ NFC not supported - will use manual confirmation only');
    }
  };

  const handleRFIDScan = async () => {
    if (!medication) return;
    
    // Check if medication has RFID tag linked
    if (!medication.rfidTagId) {
      Alert.alert(
        'No RFID Tag Linked',
        'This medication does not have an RFID tag linked. Would you like to link one now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Link Tag', onPress: () => navigation.navigate('MedicationReview', {
            imageUri: '',
            editMode: true,
            existingMedication: medication,
          })},
        ]
      );
      return;
    }
    
    setIsScanning(true);
    
    try {
      Alert.alert(
        'Scan RFID Tag',
        'Hold your device near the medication bottle tag',
        [{ text: 'Cancel', onPress: () => setIsScanning(false) }]
      );
      
      const result = await NFCService.readTagWithTimeout(10000);
      
      if (!result.success) {
        Alert.alert('Scan Failed', result.error || 'Could not read tag');
        return;
      }
      
      // Verify tag matches medication
      if (result.tagId === medication.rfidTagId) {
        await confirmMedication('rfid', result.tagId);
      } else {
        Alert.alert(
          'Wrong Medication',
          `The scanned tag doesn't match this medication.\n\nExpected: ${medication.drugName}\nScanned tag: ${result.tagId}`,
          [
            { text: 'Try Again', onPress: handleRFIDScan },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
      
    } catch (error) {
      console.error('Error scanning RFID:', error);
      Alert.alert('Error', 'Failed to scan RFID tag');
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualConfirm = async () => {
    if (!medication) return;
    
    // If RFID is required but we're doing manual, warn user
    if (preferences?.useRFIDConfirmation && medication.rfidTagId) {
      Alert.alert(
        'Confirm Manually?',
        'This medication has RFID enabled. Are you sure you want to confirm without scanning the tag?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm Anyway', onPress: () => confirmMedication('manual') },
        ]
      );
      return;
    }
    
    await confirmMedication('manual');
  };

  const confirmMedication = async (
    method: 'rfid' | 'manual',
    tagId?: string
  ) => {
    if (!medication) return;
    // Ensure medication_key is present in medication object
    const medPayload = {
      ...medication,
      medication_key: medication.medication_key
    };
    
    setIsConfirming(true);
    
    try {
      const now = new Date();
      const scheduled = new Date(scheduledTime);
      const confirmationWindow = preferences?.confirmationWindowMinutes || 30;

      // Calculate if on time (within window)
      const diffMinutes = Math.abs((now.getTime() - scheduled.getTime()) / (1000 * 60));
      const isOnTime = diffMinutes <= confirmationWindow;
      const lateness = now > scheduled ? diffMinutes : 0;

      // Create adherence record
      const record = {
        id: `adh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        medicationId: medication.id,
        scheduledTime: scheduled,
        confirmedTime: now,
        takenTime: now,
        status: 'taken' as const,
        confirmationMethod: method,
        rfidTagId: tagId,
        isOnTime,
        lateness: lateness > 0 ? Math.round(lateness) : undefined,
      };

      await StorageService.saveAdherenceRecord(record);

      // Log event to backend - no user_key needed, service uses session
      if (medPayload.medication_key) {
        const eventPayload = {
          // user_key is NOT needed - service derives from session
          medication_id: medPayload.medication_key, // Use medication_key as identifier
          event_time: now.toISOString(),
          event_type: 'taken',
          source: method,
          metadata: {
            scheduled_time: scheduled.toISOString(),
            is_on_time: isOnTime,
            lateness: lateness > 0 ? Math.round(lateness) : undefined,
            rfid_tag_id: tagId,
          },
        };
        console.log('Attempting to log med event with:', eventPayload);
        try {
          await logMedEvent(eventPayload);
        } catch (err: any) {
          // Don't block the confirmation flow for event logging failures
          console.warn('Failed to log med event:', err);
        }
      }

      // Show success message
      const methodText = method === 'rfid' ? 'RFID scan' : 'manual confirmation';
      const timeText = isOnTime ? 'on time' : `${Math.round(lateness)} minutes late`;

      Alert.alert(
        '✅ Medication Confirmed',
        `${medication.drugName} confirmed via ${methodText}.\nTaken ${timeText}.`,
        [
          {
            text: 'View History',
            onPress: () => navigation.navigate('AdherenceHistory', { medicationId: medication.id }),
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error) {
      console.error('Error confirming medication:', error);
      Alert.alert('Error', 'Failed to record medication confirmation');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Dose?',
      'Are you sure you want to skip this dose? This will be recorded in your adherence history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            if (!medication) return;
            
            try {
              const record = {
                id: `adh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                medicationId: medication.id,
                scheduledTime: new Date(scheduledTime),
                status: 'skipped' as const,
                confirmationMethod: 'skipped' as const,
              };
              
              await StorageService.saveAdherenceRecord(record);
              Alert.alert('Dose Skipped', 'This dose has been marked as skipped.');
              navigation.goBack();
            } catch (error) {
              console.error('Error skipping dose:', error);
              Alert.alert('Error', 'Failed to record skipped dose');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading medication...</Text>
      </View>
    );
  }

  if (!medication) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Medication not found</Text>
      </View>
    );
  }

  const useRFID = preferences?.useRFIDConfirmation && nfcSupported && medication.rfidTagId;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="medication" size={64} color="#007AFF" />
          <Text style={styles.title}>Time to Take Your Medication</Text>
          <Text style={styles.scheduledTime}>
            Scheduled for {new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Medication Info */}
        <View style={styles.medicationCard}>
          <Text style={styles.medicationName}>{medication.drugName}</Text>
          {medication.strength && (
            <Text style={styles.medicationDetail}>Strength: {medication.strength}</Text>
          )}
          <Text style={styles.medicationDetail}>Dosage: {medication.dosage}</Text>
          {medication.instructions && (
            <Text style={styles.instructions}>{medication.instructions}</Text>
          )}
        </View>

        {/* RFID Tag Status */}
        {medication.rfidTagId && (
          <View style={styles.rfidStatus}>
            <MaterialIcons name="nfc" size={24} color="#34C759" />
            <Text style={styles.rfidStatusText}>RFID Tag Linked</Text>
          </View>
        )}

        {/* Confirmation Buttons */}
        <View style={styles.buttonContainer}>
          {useRFID ? (
            <>
              <TouchableOpacity
                style={[styles.confirmButton, styles.rfidButton]}
                onPress={handleRFIDScan}
                disabled={isScanning || isConfirming}
              >
                {isScanning ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <MaterialIcons name="nfc" size={32} color="white" />
                    <Text style={styles.confirmButtonText}>Scan RFID Tag</Text>
                    <Text style={styles.confirmButtonSubtext}>Tap to scan medication bottle</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.orText}>or</Text>

              <TouchableOpacity
                style={[styles.confirmButton, styles.manualButton]}
                onPress={handleManualConfirm}
                disabled={isScanning || isConfirming}
              >
                <MaterialIcons name="touch-app" size={32} color="#007AFF" />
                <Text style={[styles.confirmButtonText, {color: '#007AFF'}]}>Confirm Manually</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.confirmButton, styles.manualButton, {backgroundColor: '#007AFF'}]}
              onPress={handleManualConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={32} color="white" />
                  <Text style={[styles.confirmButtonText, {color: 'white'}]}>Confirm Taken</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isScanning || isConfirming}
          >
            <Text style={styles.skipButtonText}>Skip This Dose</Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        {!nfcSupported && preferences?.useRFIDConfirmation && (
          <View style={styles.warningCard}>
            <MaterialIcons name="warning" size={24} color="#FF9500" />
            <Text style={styles.warningText}>
              NFC is not supported on this device. Please use manual confirmation.
            </Text>
          </View>
        )}

        {/* View History Link */}
        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => navigation.navigate('AdherenceHistory', { medicationId: medication.id })}
        >
          <MaterialIcons name="history" size={20} color="#007AFF" />
          <Text style={styles.historyLinkText}>View Adherence History</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    color: '#FF3B30',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    textAlign: 'center',
  },
  scheduledTime: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  medicationCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  medicationName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  medicationDetail: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  rfidStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F9F1',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  rfidStatusText: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonContainer: {
    marginTop: 10,
  },
  confirmButton: {
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rfidButton: {
    backgroundColor: '#007AFF',
  },
  manualButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  confirmButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  confirmButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  orText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginVertical: 10,
  },
  skipButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 10,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    padding: 10,
  },
  historyLinkText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default MedicationConfirmationScreen;
