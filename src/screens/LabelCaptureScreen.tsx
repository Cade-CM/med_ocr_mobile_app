import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {CameraView, CameraType, useCameraPermissions} from 'expo-camera';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '@types';
import {MaterialIcons} from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {GOOGLE_CLOUD_VISION_API_KEY, getLocalOCRApiUrl, resetApiUrlCache} from '../config/api';
import {OCRService} from '@services/OCRService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'LabelCapture'>;

const LabelCaptureScreen: React.FC<Props> = ({navigation}) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(0.3); // 3x zoom default
  const [enableTorch, setEnableTorch] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Request permissions
  if (!permission || !mediaPermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="camera-alt" size={80} color="#CCC" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          This app needs camera access to scan prescription labels
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
    // Turn off torch when switching cameras (front camera doesn't have torch)
    if (facing === 'back') {
      setEnableTorch(false);
    }
  };

  const toggleTorch = () => {
    // Only allow torch on back camera
    if (facing === 'back') {
      setEnableTorch(current => !current);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to upload images',
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const photo = result.assets[0];
      setIsProcessing(true);

      // Perform OCR on the selected image
      await processImage(photo.uri);
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to load image. Please try again.');
      setIsProcessing(false);
    }
  };

  const processImage = async (imageUri: string) => {
    try {
      let ocrText = '';
      
      // Discover the API URL automatically
      const apiUrl = await getLocalOCRApiUrl();
      
      // Read the image as base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      // Call OCR API
      console.log('=== OCR API REQUEST ===');
      console.log('URL:', `${apiUrl}/ocr/detailed`);
      console.log('Image size (base64):', base64Image.length, 'characters');
      console.log('Sending image to OCR API...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
      const startTime = Date.now();
      const response = await fetch(`${apiUrl}/ocr/detailed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('Response received in', (Date.now() - startTime) / 1000, 'seconds');
      console.log('Response status:', response.status);

      const result = await response.json();
      console.log('OCR API Response:', result);

      if (!result.success) {
        throw new Error(result.error || 'OCR processing failed');
      }

      ocrText = result.text;
      console.log('Extracted OCR Text:', ocrText);
      
      // Log line-by-line
      const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log('\n=== OCR TEXT LINES ===');
      lines.forEach((line, i) => console.log(`Line ${i}: "${line}"`));
      console.log('======================\n');

      // Use LLM-parsed data if available (from server), otherwise parse client-side
      let parsedData;
      if (result.parsed && result.method === 'LLM-enhanced') {
        console.log('✓ Using LLM-parsed data from server');
        // Convert server format to client format
        parsedData = {
          patientName: result.parsed.patientName || '',
          drugName: result.parsed.drugName || '',
          strength: result.parsed.strength || '',
          dosage: result.parsed.dosage || '',
          frequency: result.parsed.frequency || '',
          duration: result.parsed.duration || '',
          instructions: result.parsed.instructions || '',
          prescriber: result.parsed.prescriber || '',
          pharmacy: result.parsed.pharmacy || '',
          pharmacyPhone: result.parsed.pharmacyPhone || '',
          rxNumber: result.parsed.rxNumber || '',
          fillDate: result.parsed.fillDate || '',
          expirationDate: result.parsed.expirationDate || '',
          quantity: result.parsed.quantity || 0,
          refills: result.parsed.refills || 0,
          confidence: (result.parsed.confidence || 0) * 100, // Convert 0-1 to 0-100
        };
      } else {
        console.log('⚠️ LLM data not available, parsing client-side');
        parsedData = await OCRService.parseMedicationLabel(ocrText);
      }
      
      console.log('=== PARSED MEDICATION DATA ===');
      console.log('Patient Name:', parsedData.patientName || '(not found)');
      console.log('Drug Name:', parsedData.drugName || '(not found)');
      console.log('Strength:', parsedData.strength || '(not found)');
      console.log('Dosage:', parsedData.dosage || '(not found)');
      console.log('Frequency:', parsedData.frequency || '(not found)');
      console.log('Duration:', parsedData.duration || '(not found)');
      console.log('Confidence:', parsedData.confidence.toFixed(1) + '%');
      console.log('==============================\n');

      // Validate patient name with fuzzy matching
      if (parsedData.patientName) {
        const userFirstName = await AsyncStorage.getItem('userFirstName');
        const userLastName = await AsyncStorage.getItem('userLastName');
        
        if (userFirstName && userLastName) {
          const extractedName = parsedData.patientName.trim().toLowerCase();
          const expectedFirstName = userFirstName.toLowerCase();
          const expectedLastName = userLastName.toLowerCase();
          
          // Helper function for fuzzy string matching
          const fuzzyMatch = (str1: string, str2: string): number => {
            const longer = str1.length > str2.length ? str1 : str2;
            const shorter = str1.length > str2.length ? str2 : str1;
            
            if (longer.length === 0) return 1.0;
            
            const editDistance = (s1: string, s2: string): number => {
              const costs: number[] = [];
              for (let i = 0; i <= s1.length; i++) {
                let lastValue = i;
                for (let j = 0; j <= s2.length; j++) {
                  if (i === 0) {
                    costs[j] = j;
                  } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                      newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                  }
                }
                if (i > 0) costs[s2.length] = lastValue;
              }
              return costs[s2.length];
            };
            
            return (longer.length - editDistance(longer, shorter)) / longer.length;
          };
          
          // Check if first and last names are in the extracted name
          const firstNameInExtracted = extractedName.includes(expectedFirstName);
          const lastNameInExtracted = extractedName.includes(expectedLastName);
          
          // Also check fuzzy match (allow 80% similarity for OCR errors)
          const extractedParts = extractedName.split(/\s+/);
          let firstNameMatch = firstNameInExtracted;
          let lastNameMatch = lastNameInExtracted;
          
          // Check each part against expected names with fuzzy matching
          for (const part of extractedParts) {
            if (part.length < 3) continue; // Skip short words
            
            if (fuzzyMatch(part, expectedFirstName) >= 0.8) {
              firstNameMatch = true;
            }
            if (fuzzyMatch(part, expectedLastName) >= 0.8) {
              lastNameMatch = true;
            }
          }
          
          console.log(`🔍 Name validation: "${parsedData.patientName}" vs "${userFirstName} ${userLastName}"`);
          console.log(`   First name match: ${firstNameMatch}, Last name match: ${lastNameMatch}`);
          
          if (!firstNameMatch || !lastNameMatch) {
            setIsProcessing(false);
            Alert.alert(
              'Name Mismatch',
              `The patient name "${parsedData.patientName}" does not match your account name "${userFirstName} ${userLastName}".\n\nPrescriptions can only be scanned for your own account. Please try again.`,
              [{text: 'OK', style: 'default'}],
            );
            return;
          }
        }
      }

      // Check confidence
      if (parsedData.confidence < 30) {
        setIsProcessing(false);
        Alert.alert(
          'Low Confidence Scan',
          `The scan quality is low (${parsedData.confidence.toFixed(1)}% confidence). Please try again with a clearer image.`,
          [
            {text: 'Try Again', style: 'default'},
            {
              text: 'Enter Manually',
              style: 'cancel',
              onPress: () => {
                setIsProcessing(false);
                navigation.navigate('MedicationReview', {
                  imageUri,
                  rawOcrText: ocrText,
                  parsedData: parsedData,
                });
              },
            },
          ],
        );
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      setIsProcessing(false);

      // Navigate to review screen with parsed data
      navigation.navigate('MedicationReview', {
        imageUri,
        rawOcrText: ocrText,
        parsedData: parsedData,
      });
    } catch (error: any) {
      console.error('OCR Error:', error);
      
      if (error.message?.includes('Network request failed') || 
          error.message?.includes('fetch') ||
          error.name === 'AbortError') {
        console.log('Resetting API URL cache...');
        resetApiUrlCache();
      }
      
      Alert.alert(
        'OCR Failed',
        error.name === 'AbortError'
          ? 'Processing timed out. The server may be starting up. Please try again.'
          : error.message?.includes('Network request failed')
          ? 'Cannot connect to OCR API. Make sure the Flask server is running.'
          : 'Failed to process the image. Please try again.',
      );
      setIsProcessing(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      setIsProcessing(true);

      // Take the photo at full resolution
      const photo = await cameraRef.current.takePictureAsync({});

      if (!photo) {
        throw new Error('Failed to capture photo');
      }

      // Request media library permission if not already granted
      if (!mediaPermission?.granted) {
        const {status} = await requestMediaPermission();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Media library permission is needed to save photos',
          );
          setIsProcessing(false);
          return;
        }
      }

      // Save to media library
      await MediaLibrary.createAssetAsync(photo.uri);

      // Process the captured image
      await processImage(photo.uri);
    } catch (error: any) {
      setIsProcessing(false);
      console.error('Error capturing photo:', error);
      
      if (error.name === 'AbortError') {
        Alert.alert(
          'Timeout',
          'Image processing took too long. The server may be waking up from sleep. Please try again in 30 seconds.'
        );
      } else {
        Alert.alert(
          'Error', 
          'Failed to process image. Please try again.\n\n' + 
          (error.message || 'Unknown error')
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
        zoom={zoom}
        enableTorch={enableTorch}
      />
      
      {/* Camera overlay - positioned absolutely */}
      <View style={styles.overlay}>
        {/* Top instructions */}
        <View style={styles.topOverlay} />

        {/* Center frame guide */}
        <View style={styles.centerContainer}>
          <View style={styles.frameGuide}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomOverlay}>
          {/* Zoom slider */}
          <View style={styles.zoomContainer}>
            <Text style={styles.zoomLabel}>Zoom: {Math.round(zoom * 10)}x</Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.zoomButton}
                onPress={() => setZoom(Math.max(0, zoom - 0.1))}
              >
                <MaterialIcons name="remove" size={20} color="white" />
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${zoom * 100}%` }]} />
              </View>
              <TouchableOpacity
                style={styles.zoomButton}
                onPress={() => setZoom(Math.min(1, zoom + 0.1))}
              >
                <MaterialIcons name="add" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.controlsContainer}>
            {/* Upload image button */}
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={pickImage}
              disabled={isProcessing}
            >
              <MaterialIcons 
                name="photo-library" 
                size={28} 
                color={isProcessing ? '#666' : 'white'} 
              />
            </TouchableOpacity>

            {/* Flash/Torch button */}
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleTorch}
              disabled={facing !== 'back'}
            >
              <MaterialIcons 
                name={enableTorch ? "flash-on" : "flash-off"} 
                size={28} 
                color={facing === 'back' ? 'white' : '#666'} 
              />
            </TouchableOpacity>

            {/* Capture button */}
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color="#007AFF" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            {/* Flip camera button */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleCameraFacing}
            >
              <MaterialIcons name="flip-camera-ios" size={28} color="white" />
            </TouchableOpacity>

            {/* Empty space for symmetry */}
            <View style={styles.controlButton} />
          </View>

          <Text style={styles.tipText}>
            Stay far away for clear focus • Zoom in on label • Good lighting
          </Text>
        </View>
      </View>

      {/* Processing overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.processingText}>Processing image...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  frameGuide: {
    width: 300,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  zoomContainer: {
    paddingHorizontal: 30,
    marginBottom: 15,
  },
  zoomLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonInner: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  tipText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    opacity: 0.8,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
    fontWeight: '600',
  },
});

export default LabelCaptureScreen;
