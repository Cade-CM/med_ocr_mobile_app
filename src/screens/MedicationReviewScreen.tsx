import React, {useState, useEffect, useMemo} from 'react';
import { useAppData } from '../context/AppDataContext';
import { FlatList } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, ParsedMedicationData} from '@types';
import { Medication } from '@types';
import {OCRService} from '@services/OCRService';
import {StorageService} from '@services/StorageService';
import {createMedication, updateMedication, MedicationCreate} from '@services/BackendService';
import {MaterialIcons as Icon} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicationReview'>;

  
const MedicationReviewScreen: React.FC<Props> = ({route, navigation}) => {
    // Get live medications and refresh from context
    const { medications, refreshMedications } = useAppData();
  const {
    imageUri = '',
    rawOcrText = '',
    parsedData: initialParsedData,
    editMode = false,
    existingMedication
  } = route.params || {};
  
  // Always use backend context medication for updates
  const backendMed = useMemo(() => {
    if (!editMode || !existingMedication) return undefined;
    return (
      medications.find(
        m =>
          m.medication_key === existingMedication.medication_key ||
          m.id === Number(existingMedication.id)
      ) || null
    );
  }, [editMode, existingMedication, medications]);
  
  const [parsedData, setParsedData] = useState<ParsedMedicationData>(() => {
    if (editMode && existingMedication) {
      // In edit mode, use existing medication data
      return {
        patientName: existingMedication.patientName,
        drugName: existingMedication.drugName,
        strength: existingMedication.strength,
        dosage: existingMedication.dosage,
        frequency: existingMedication.frequency,
        duration: existingMedication.duration,
        instructions: existingMedication.instructions,
        rxNumber: existingMedication.rxNumber,
        quantity: existingMedication.quantity,
        refills: existingMedication.refills,
        refillsBeforeDate: existingMedication.refillsBeforeDate,
        pharmacy: existingMedication.pharmacy,
        pharmacyPhone: existingMedication.pharmacyPhone,
        confidence: 100, // Manually entered/edited data
      };
    } else if (initialParsedData) {
      // Use LLM-parsed data from server if available
      console.log('MedicationReviewScreen: Using LLM-parsed data from server');
      return initialParsedData;
    } else {
      // Return empty initial state, will parse in useEffect
      return {
        confidence: 0,
      };
    }
  });

  const [patientName, setPatientName] = useState(parsedData.patientName || '');
  const [drugName, setDrugName] = useState(parsedData.drugName || '');
  const [strength, setStrength] = useState(parsedData.strength || '');
  const [dosage, setDosage] = useState(parsedData.dosage || '');
  const [frequency, setFrequency] = useState(parsedData.frequency || '');
  const [duration, setDuration] = useState(parsedData.duration || '');
  const [instructions, setInstructions] = useState(parsedData.instructions || '');
  const [rxNumber, setRxNumber] = useState(parsedData.rxNumber || '');
  const [quantity, setQuantity] = useState(parsedData.quantity || '');
  const [refills, setRefills] = useState(parsedData.refills || '');
  const [refillsBeforeDate, setRefillsBeforeDate] = useState(parsedData.refillsBeforeDate || '');
  const [pharmacy, setPharmacy] = useState(parsedData.pharmacy || '');
  const [pharmacyPhone, setPharmacyPhone] = useState(parsedData.pharmacyPhone || '');

  // Store original values for restoration on blur
  const [originalPatientName, setOriginalPatientName] = useState(parsedData.patientName || '');
  const [originalDrugName, setOriginalDrugName] = useState(parsedData.drugName || '');
  const [originalStrength, setOriginalStrength] = useState(parsedData.strength || '');
  const [originalDosage, setOriginalDosage] = useState(parsedData.dosage || '');
  const [originalFrequency, setOriginalFrequency] = useState(parsedData.frequency || '');
  const [originalDuration, setOriginalDuration] = useState(parsedData.duration || '');
  const [originalInstructions, setOriginalInstructions] = useState(parsedData.instructions || '');
  const [originalRxNumber, setOriginalRxNumber] = useState(parsedData.rxNumber || '');
  const [originalQuantity, setOriginalQuantity] = useState(parsedData.quantity || '');
  const [originalRefills, setOriginalRefills] = useState(parsedData.refills || '');
  const [originalRefillsBeforeDate, setOriginalRefillsBeforeDate] = useState(parsedData.refillsBeforeDate || '');
  const [originalPharmacy, setOriginalPharmacy] = useState(parsedData.pharmacy || '');
  const [originalPharmacyPhone, setOriginalPharmacyPhone] = useState(parsedData.pharmacyPhone || '');

  // Parse OCR text on mount (only in non-edit mode and if no parsed data provided)
  useEffect(() => {
    const parseInitialData = async () => {
      if (!editMode && !initialParsedData && rawOcrText) {
        console.log('MedicationReviewScreen: Initial parse (client-side fallback)');
        const parsed = await OCRService.parseMedicationLabel(rawOcrText || '');
        console.log('MedicationReviewScreen: Parsed data:', parsed);
        
        setParsedData(parsed);
        setPatientName(parsed.patientName || '');
        setDrugName(parsed.drugName || '');
        setStrength(parsed.strength || '');
        setDosage(parsed.dosage || '');
        setFrequency(parsed.frequency || '');
        setDuration(parsed.duration || '');
        setInstructions(parsed.instructions || '');
        setRxNumber(parsed.rxNumber || '');
        setQuantity(parsed.quantity || '');
        setRefills(parsed.refills || '');
        setRefillsBeforeDate(parsed.refillsBeforeDate || '');
        setPharmacy(parsed.pharmacy || '');
        setPharmacyPhone(parsed.pharmacyPhone || '');
        
        // Set original values
        setOriginalPatientName(parsed.patientName || '');
        setOriginalDrugName(parsed.drugName || '');
        setOriginalStrength(parsed.strength || '');
        setOriginalDosage(parsed.dosage || '');
        setOriginalFrequency(parsed.frequency || '');
        setOriginalDuration(parsed.duration || '');
        setOriginalInstructions(parsed.instructions || '');
        setOriginalRxNumber(parsed.rxNumber || '');
        setOriginalQuantity(parsed.quantity || '');
        setOriginalRefills(parsed.refills || '');
        setOriginalRefillsBeforeDate(parsed.refillsBeforeDate || '');
        setOriginalPharmacy(parsed.pharmacy || '');
        setOriginalPharmacyPhone(parsed.pharmacyPhone || '');
      }
    };
    
    parseInitialData();
  }, [editMode, rawOcrText]);

  // Format RX number with dash after 7 digits (e.g., 1234567-10613)
  const handleRxNumberChange = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Auto-format: add dash after 7 digits
    let formatted = cleaned;
    if (Array.isArray(cleaned) && cleaned.length >= 7) {
      formatted = cleaned.slice(0, 7) + '-' + cleaned.slice(7, 12);
    }
    
    setRxNumber(formatted);
  };

  // Format date as MM/DD/YY (2-digit year)
  const handleDateChange = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Auto-format: add slashes
    let formatted = cleaned;
    if (Array.isArray(cleaned) && cleaned.length >= 2) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (Array.isArray(cleaned) && cleaned.length >= 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 6);
    }
    
    setRefillsBeforeDate(formatted);
  };

  // Format phone number as (XXX) XXX-XXXX
  const handlePhoneChange = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Auto-format: add parentheses, space, and dash
    let formatted = cleaned;
    if (Array.isArray(cleaned) && cleaned.length >= 3) {
      formatted = '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3);
    }
    if (Array.isArray(cleaned) && cleaned.length >= 6) {
      formatted = '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10);
    }
    
    setPharmacyPhone(formatted);
  };

  // Handle focus - clear the field and save current value as original
  const handleFocus = (field: string, value: string, setter: (val: string) => void, originalSetter: (val: string) => void) => {
    originalSetter(value);
    setter('');
  };

  // Handle blur - restore original if empty for required fields, keep blank for optional
  const handleBlur = (currentValue: string, originalValue: string, setter: (val: string) => void, originalSetter: (val: string) => void, isRequired: boolean = false) => {
    if (currentValue.trim()) {
      // User entered something, update the original value for future edits
      originalSetter(currentValue);
    } else if (isRequired) {
      // Required field with no value - restore original
      setter(originalValue);
    }
    // Optional fields keep blank value if nothing entered
  };

  // Re-parse when rawOcrText changes (only in non-edit mode and no parsed data)
  useEffect(() => {
    const reparseData = async () => {
      if (!editMode && !initialParsedData && rawOcrText) {
        console.log('MedicationReviewScreen: Reparsing due to new OCR text');
        const newParsed = await OCRService.parseMedicationLabel(rawOcrText || '');
        console.log('MedicationReviewScreen: New parsed data:', newParsed);
        setParsedData(newParsed);
        setPatientName(newParsed.patientName || '');
        setDrugName(newParsed.drugName || '');
        setStrength(newParsed.strength || '');
        setDosage(newParsed.dosage || '');
        setFrequency(newParsed.frequency || '');
        setDuration(newParsed.duration || '');
        setInstructions(newParsed.instructions || '');
        setRxNumber(newParsed.rxNumber || '');
        setQuantity(newParsed.quantity || '');
        setRefills(newParsed.refills || '');
        setRefillsBeforeDate(newParsed.refillsBeforeDate || '');
        setPharmacy(newParsed.pharmacy || '');
        setPharmacyPhone(newParsed.pharmacyPhone || '');
        
        // Update original values too
        setOriginalPatientName(newParsed.patientName || '');
        setOriginalDrugName(newParsed.drugName || '');
        setOriginalStrength(newParsed.strength || '');
        setOriginalDosage(newParsed.dosage || '');
        setOriginalFrequency(newParsed.frequency || '');
        setOriginalDuration(newParsed.duration || '');
        setOriginalInstructions(newParsed.instructions || '');
        setOriginalRxNumber(newParsed.rxNumber || '');
        setOriginalQuantity(newParsed.quantity || '');
        setOriginalRefills(newParsed.refills || '');
        setOriginalRefillsBeforeDate(newParsed.refillsBeforeDate || '');
        setOriginalPharmacy(newParsed.pharmacy || '');
        setOriginalPharmacyPhone(newParsed.pharmacyPhone || '');
      }
    };
    
    reparseData();
  }, [rawOcrText, editMode, initialParsedData]);

  const handleContinue = async () => {
    if (!drugName.trim()) {
      Alert.alert('Required Field', 'Please enter the medication name.');
      return;
    }
    if (!dosage.trim()) {
      Alert.alert('Required Field', 'Please enter the dosage.');
      return;
    }
    if (!frequency.trim()) {
      Alert.alert('Required Field', 'Please enter the frequency.');
      return;
    }

    // Get user_key from AsyncStorage
    const user_key = await AsyncStorage.getItem('user_key');
    if (!user_key) {
      Alert.alert('Error', 'User not found. Please sign up again.');
      return;
    }

    // Prepare medication payload for backend (always include medication_key if present)
    const medPayload: MedicationCreate = {
      user_key,
      drug_name: drugName.trim(),
      strength: strength.trim() || undefined,
      route: undefined,
      instruction: instructions.trim() || undefined,
      frequency_text: frequency.trim(),
      qty_text: quantity.trim() || undefined,
      refills_text: refills.trim() || undefined,
      ...(existingMedication && existingMedication.medication_key ? { medication_key: existingMedication.medication_key } : {}),
      ...(existingMedication && existingMedication.id ? { id: existingMedication.id } : {}),
    };

    try {
      let backendMed;
      if (editMode && existingMedication && existingMedication.id) {
        // Update existing medication
        const medUpdatePayload = {
          ...medPayload,
          is_active: true,
        };
        console.log('Attempting to update medication with:', medUpdatePayload);
        backendMed = await updateMedication(medUpdatePayload);
      } else {
        // Create new medication
        console.log('Attempting to create medication with:', medPayload);
        backendMed = await createMedication(medPayload);
      }
      console.log('Medication saved in backend:', backendMed);
      // Map backend response to frontend Medication type, convert startDate to Date, and only add medication_key if type allows
      const mappedMedication: any = {
        id: String(backendMed.id),
        user_key: backendMed.user_key,
        drugName: backendMed.drug_name || '',
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        startDate: new Date(), // Use Date object
        patientName: patientName.trim() || undefined,
        strength: strength.trim() || undefined,
        duration: duration.trim() || undefined,
        instructions: instructions.trim() || undefined,
        rxNumber: rxNumber.trim() || undefined,
        quantity: quantity.trim() || undefined,
        refills: refills.trim() || undefined,
        refillsBeforeDate: refillsBeforeDate.trim() || undefined,
        pharmacy: pharmacy.trim() || undefined,
        pharmacyPhone: pharmacyPhone.trim() || undefined,
        capturedImageUri: imageUri,
        rawOcrText: rawOcrText,
        reminderTimes: [],
      };
      // Only add medication_key if present
      if (backendMed.medication_key || existingMedication?.medication_key) {
        mappedMedication.medication_key = backendMed.medication_key ?? existingMedication.medication_key;
      }
      navigation.navigate('MedicationSchedule', {
        medication: mappedMedication,
        editMode: editMode || false,
      });
      await refreshMedications();
    } catch (error) {
      console.error('Error saving medication in backend:', error);
      Alert.alert('Error', `Failed to save medication.\nID: ${editMode && existingMedication ? existingMedication.id : 'NEW'}\nPayload: ${JSON.stringify(medPayload, null, 2)}`);
    }
  };

  const confidenceColor = 
    parsedData.confidence >= 70 ? '#34C759' :
    parsedData.confidence >= 40 ? '#FF9500' : '#FF3B30';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Captured Image */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{uri: imageUri}}
              style={styles.image}
              resizeMode="contain"
            />
          ) : null}
        </View>

        {/* Confidence Score */}
        <View style={styles.confidenceContainer}>
          <Icon name="info-outline" size={20} color={confidenceColor} />
          <Text style={[styles.confidenceText, {color: confidenceColor}]}>
            Confidence: {parsedData.confidence.toFixed(0)}%
          </Text>
        </View>
        <Text style={styles.sectionTitle}>
          {editMode ? 'Edit Medication' : 'Review Extracted Information'}
        </Text>
        <Text style={styles.subtitle}>
          {editMode 
            ? 'Update the medication information' 
            : 'Please verify and edit the information below'}
        </Text>

        {/* Patient Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Patient Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={patientName}
            onChangeText={(text) => setPatientName(text.toUpperCase())}
            onFocus={() => handleFocus('patientName', patientName, setPatientName, setOriginalPatientName)}
            onBlur={() => handleBlur(patientName, originalPatientName, setPatientName, setOriginalPatientName, true)}
          />
        </View>

        {/* Drug Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Medication Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={drugName}
            onChangeText={(text) => setDrugName(text.toUpperCase())}
            onFocus={() => handleFocus('drugName', drugName, setDrugName, setOriginalDrugName)}
            onBlur={() => handleBlur(drugName, originalDrugName, setDrugName, setOriginalDrugName, true)}
            placeholder="e.g., Prednisone"
            placeholderTextColor="#999"
          />
        </View>

        {/* Strength */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Strength <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={strength}
            onChangeText={(text) => {
              // Filter to only numbers, letters, and decimal points; uppercase all letters
              const filtered = text.replace(/[^0-9a-zA-Z.]/g, '').toUpperCase();
              setStrength(filtered);
            }}
            onFocus={() => handleFocus('strength', strength, setStrength, setOriginalStrength)}
            onBlur={() => {
              // Auto-append "MG" if not already present
              let finalValue = strength.trim();
              if (finalValue && !finalValue.endsWith('MG')) {
                finalValue = finalValue + 'MG';
                setStrength(finalValue);
              }
              handleBlur(finalValue || strength, originalStrength, setStrength, setOriginalStrength, true);
            }}
            placeholder="e.g., 20MG"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        {/* Dosage */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Dosage <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={dosage}
            onChangeText={(text) => setDosage(text.toUpperCase())}
            onFocus={() => handleFocus('dosage', dosage, setDosage, setOriginalDosage)}
            onBlur={() => handleBlur(dosage, originalDosage, setDosage, setOriginalDosage, true)}
            placeholder="e.g., 1 tablet"
            placeholderTextColor="#999"
          />
        </View>

        {/* Frequency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Frequency <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={frequency}
            onChangeText={(text) => setFrequency(text.toUpperCase())}
            onFocus={() => handleFocus('frequency', frequency, setFrequency, setOriginalFrequency)}
            onBlur={() => handleBlur(frequency, originalFrequency, setFrequency, setOriginalFrequency, true)}
            placeholder="e.g., once daily"
            placeholderTextColor="#999"
          />
        </View>

        {/* Duration */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Duration
          </Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={(text) => setDuration(text.toUpperCase())}
            onFocus={() => handleFocus('duration', duration, setDuration, setOriginalDuration)}
            onBlur={() => handleBlur(duration, originalDuration, setDuration, setOriginalDuration, false)}
            placeholder="e.g., 30 days"
            placeholderTextColor="#999"
          />
        </View>

        {/* RX Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            RX Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={rxNumber}
            onChangeText={handleRxNumberChange}
            onFocus={() => handleFocus('rxNumber', rxNumber, setRxNumber, setOriginalRxNumber)}
            onBlur={() => handleBlur(rxNumber, originalRxNumber, setRxNumber, setOriginalRxNumber, true)}
            placeholder="e.g., 1234567-10613"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={13}
          />
        </View>

        {/* Quantity */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Quantity (QTY) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            onFocus={() => handleFocus('quantity', quantity, setQuantity, setOriginalQuantity)}
            onBlur={() => handleBlur(quantity, originalQuantity, setQuantity, setOriginalQuantity, true)}
            placeholder="e.g., 30"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        {/* Refills */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Refills <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={refills}
            onChangeText={setRefills}
            onFocus={() => handleFocus('refills', refills, setRefills, setOriginalRefills)}
            onBlur={() => handleBlur(refills, originalRefills, setRefills, setOriginalRefills, true)}
            placeholder="e.g., 0, 1, 3"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        {/* Refills Before Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Refills Before Date</Text>
          <TextInput
            style={styles.input}
            value={refillsBeforeDate}
            onChangeText={handleDateChange}
            onFocus={() => handleFocus('refillsBeforeDate', refillsBeforeDate, setRefillsBeforeDate, setOriginalRefillsBeforeDate)}
            onBlur={() => handleBlur(refillsBeforeDate, originalRefillsBeforeDate, setRefillsBeforeDate, setOriginalRefillsBeforeDate, false)}
            placeholder="e.g., 12/25/25"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={8}
          />
        </View>

        {/* Pharmacy */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pharmacy</Text>
          <TextInput
            style={styles.input}
            value={pharmacy}
            onChangeText={(text) => setPharmacy(text.toUpperCase())}
            onFocus={() => handleFocus('pharmacy', pharmacy, setPharmacy, setOriginalPharmacy)}
            onBlur={() => handleBlur(pharmacy, originalPharmacy, setPharmacy, setOriginalPharmacy, false)}
            placeholder="e.g., CVS Pharmacy"
            placeholderTextColor="#999"
          />
        </View>

        {/* Pharmacy Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pharmacy Phone Number</Text>
          <TextInput
            style={styles.input}
            value={pharmacyPhone}
            onChangeText={handlePhoneChange}
            onFocus={() => handleFocus('pharmacyPhone', pharmacyPhone, setPharmacyPhone, setOriginalPharmacyPhone)}
            onBlur={() => handleBlur(pharmacyPhone, originalPharmacyPhone, setPharmacyPhone, setOriginalPharmacyPhone, false)}
            placeholder="e.g., (555) 123-4567"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            maxLength={14}
          />
        </View>

        {/* Instructions */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Additional Instructions (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={instructions}
            onChangeText={(text) => setInstructions(text.toUpperCase())}
            onFocus={() => handleFocus('instructions', instructions, setInstructions, setOriginalInstructions)}
            onBlur={() => handleBlur(instructions, originalInstructions, setInstructions, setOriginalInstructions, false)}
            placeholder="e.g., Take with food"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Raw OCR Text (Collapsible) */}
        <View style={styles.rawTextContainer}>
          <Text style={styles.rawTextLabel}>Raw OCR Text:</Text>
          <Text style={styles.rawText}>{rawOcrText}</Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>
            {editMode ? 'Update Schedule' : 'Continue to Schedule'}
          </Text>
          <Icon name="arrow-forward" size={20} color="white" />
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
  imageContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rawTextContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  rawTextLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  rawText: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 30,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default MedicationReviewScreen;
