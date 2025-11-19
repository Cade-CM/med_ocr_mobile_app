import React, {useState, useEffect} from 'react';
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
import {OCRService} from '@services/OCRService';
import Icon from 'react-native-vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicationReview'>;

const MedicationReviewScreen: React.FC<Props> = ({route, navigation}) => {
  const {imageUri, rawOcrText} = route.params;
  
  const [parsedData, setParsedData] = useState<ParsedMedicationData>(() => {
    return OCRService.parseMedicationLabel(rawOcrText || '');
  });

  const [drugName, setDrugName] = useState(parsedData.drugName || '');
  const [dosage, setDosage] = useState(parsedData.dosage || '');
  const [frequency, setFrequency] = useState(parsedData.frequency || '');
  const [duration, setDuration] = useState(parsedData.duration || '');
  const [instructions, setInstructions] = useState(parsedData.instructions || '');

  const handleContinue = () => {
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

    const medication = {
      id: Date.now().toString(),
      drugName: drugName.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      duration: duration.trim() || undefined,
      instructions: instructions.trim() || undefined,
      reminderTimes: [],
      startDate: new Date(),
      capturedImageUri: imageUri,
      rawOcrText,
    };

    navigation.navigate('MedicationSchedule', {medication});
  };

  const confidenceColor = 
    parsedData.confidence >= 70 ? '#34C759' :
    parsedData.confidence >= 40 ? '#FF9500' : '#FF3B30';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Captured Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{uri: imageUri}}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Confidence Score */}
        <View style={styles.confidenceContainer}>
          <Icon name="info-outline" size={20} color={confidenceColor} />
          <Text style={[styles.confidenceText, {color: confidenceColor}]}>
            Confidence: {parsedData.confidence.toFixed(0)}%
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Review Extracted Information</Text>
        <Text style={styles.subtitle}>
          Please verify and edit the information below
        </Text>

        {/* Drug Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Medication Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={drugName}
            onChangeText={setDrugName}
            placeholder="e.g., Lisinopril"
            placeholderTextColor="#999"
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
            onChangeText={setDosage}
            placeholder="e.g., 10 mg"
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
            onChangeText={setFrequency}
            placeholder="e.g., once daily"
            placeholderTextColor="#999"
          />
        </View>

        {/* Duration */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Duration (Optional)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="e.g., 30 days"
            placeholderTextColor="#999"
          />
        </View>

        {/* Instructions */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Additional Instructions (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={instructions}
            onChangeText={setInstructions}
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
          <Text style={styles.continueButtonText}>Continue to Schedule</Text>
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
