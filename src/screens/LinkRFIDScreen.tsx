import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '@types';
import {NFCService} from '@services/NFCService';
import {StorageService} from '@services/StorageService';
import {MaterialIcons as Icon} from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'LinkRFID'>;

const LinkRFIDScreen: React.FC<Props> = ({route, navigation}) => {
  const {medication} = route.params;
  
  const [rfidTagId, setRfidTagId] = useState<string>(medication.rfidTagId || '');
  const [requiresRFIDConfirmation, setRequiresRFIDConfirmation] = useState<boolean>(
    medication.requiresRFIDConfirmation || false
  );
  const [isLinkingTag, setIsLinkingTag] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);

  useEffect(() => {
    const checkNFC = async () => {
      try {
        await NFCService.initialize();
        const supported = await NFCService.isEnabled();
        setNfcSupported(supported);
      } catch (error) {
        console.log('NFC not available:', error);
        setNfcSupported(false);
      }
    };
    checkNFC();
  }, []);

  const handleLinkRFIDTag = async () => {
    if (!nfcSupported) {
      Alert.alert(
        'NFC Not Available',
        'Your device does not support NFC or it is disabled. Please enable NFC in your device settings.',
        [{text: 'OK'}]
      );
      return;
    }

    setIsLinkingTag(true);
    try {
      const result = await NFCService.readTagWithTimeout(10000);
      
      if (result.success && result.tagId) {
        setRfidTagId(result.tagId);
        Alert.alert(
          'RFID Tag Linked',
          `Tag ${result.tagId.substring(0, 8)}... has been linked to this medication.`,
          [{text: 'OK'}]
        );
      } else {
        Alert.alert(
          'Scan Failed',
          result.error || 'Could not read RFID tag. Please try again.',
          [{text: 'OK'}]
        );
      }
    } catch (error) {
      console.error('Error linking RFID tag:', error);
      Alert.alert(
        'Error',
        'Failed to read RFID tag. Please ensure NFC is enabled and try again.',
        [{text: 'OK'}]
      );
    } finally {
      setIsLinkingTag(false);
    }
  };

  const handleRemoveRFIDTag = () => {
    Alert.alert(
      'Remove RFID Tag',
      'Are you sure you want to unlink this RFID tag from the medication?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setRfidTagId('');
            setRequiresRFIDConfirmation(false);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    const updatedMedication = {
      ...medication,
      rfidTagId: rfidTagId || undefined,
      requiresRFIDConfirmation: requiresRFIDConfirmation,
      // Always preserve medication_key and id if present
      ...(medication.medication_key ? { medication_key: medication.medication_key } : {}),
      ...(medication.id ? { id: medication.id } : {}),
    };

    try {
      await StorageService.updateMedication(updatedMedication);
      Alert.alert(
        'Success',
        'RFID settings saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{name: 'Home'}],
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save RFID settings. Please try again.');
    }
  };

  const handleSkip = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Home'}],
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Link RFID Tag</Text>
        <Text style={styles.subtitle}>
          Link an RFID tag to {medication.drugName} for quick and secure dose confirmation
        </Text>

        {/* Medication Summary */}
        <View style={styles.medicationCard}>
          <Icon name="medication" size={32} color="#007AFF" />
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{medication.drugName}</Text>
            <Text style={styles.medicationDosage}>{medication.dosage}</Text>
          </View>
        </View>

        {/* RFID Section */}
        <View style={styles.section}>
          {rfidTagId ? (
            <View>
              <View style={styles.rfidTagLinked}>
                <Icon name="nfc" size={24} color="#34C759" />
                <View style={styles.rfidTagInfo}>
                  <Text style={styles.rfidTagLabel}>RFID Tag Linked</Text>
                  <Text style={styles.rfidTagId}>
                    {rfidTagId.substring(0, 16)}...
                  </Text>
                </View>
              </View>
              
              <View style={styles.rfidCheckboxContainer}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setRequiresRFIDConfirmation(!requiresRFIDConfirmation)}
                >
                  <View style={[styles.checkbox, requiresRFIDConfirmation && styles.checkboxChecked]}>
                    {requiresRFIDConfirmation && (
                      <Icon name="check" size={16} color="white" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Require RFID confirmation for this medication</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.removeTagButton}
                onPress={handleRemoveRFIDTag}
              >
                <Icon name="close" size={20} color="#FF3B30" />
                <Text style={styles.removeTagButtonText}>Remove RFID Tag</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.instructionsCard}>
                <Icon name="info-outline" size={24} color="#007AFF" />
                <Text style={styles.instructionsText}>
                  Hold your phone near the RFID tag on your medication bottle to link it
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.linkTagButton, (!nfcSupported || isLinkingTag) && styles.linkTagButtonDisabled]}
                onPress={handleLinkRFIDTag}
                disabled={!nfcSupported || isLinkingTag}
              >
                {isLinkingTag ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.linkTagButtonText}>Scanning...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="nfc" size={32} color="white" />
                    <Text style={styles.linkTagButtonText}>Scan RFID Tag</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {!nfcSupported && (
                <View style={styles.warningCard}>
                  <Icon name="warning" size={20} color="#FF9500" />
                  <Text style={styles.warningText}>
                    NFC is not available on this device. You can skip this step and use manual confirmation.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.saveButton, !rfidTagId && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!rfidTagId}
        >
          <Icon name="check" size={24} color="white" />
          <Text style={styles.saveButtonText}>Save & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for Now</Text>
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
    lineHeight: 20,
  },
  medicationCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  medicationInfo: {
    marginLeft: 15,
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  linkTagButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  linkTagButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  linkTagButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  rfidTagLinked: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  rfidTagInfo: {
    marginLeft: 12,
    flex: 1,
  },
  rfidTagLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 4,
  },
  rfidTagId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  rfidCheckboxContainer: {
    marginBottom: 15,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  removeTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: 'white',
  },
  removeTagButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  skipButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
    marginBottom: 30,
  },
  skipButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LinkRFIDScreen;
