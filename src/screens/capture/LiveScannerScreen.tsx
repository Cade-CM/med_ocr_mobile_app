import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@types';
import { MaterialIcons } from '@expo/vector-icons';
import { MLKitOCRService, ScanProgress } from '@services/MLKitOCRService';
import { OCRService } from '@services/OCRService';
import * as FileSystem from 'expo-file-system/legacy';

// Dynamically import camera modules - they crash in Expo Go
let Camera: any = null;
let useCameraDevice: any = () => null;
let useCameraPermission: any = () => ({ hasPermission: false, requestPermission: async () => false });
let TextRecognition: any = null;
let CAMERA_AVAILABLE = false;

try {
  const visionCamera = require('react-native-vision-camera');
  Camera = visionCamera.Camera;
  useCameraDevice = visionCamera.useCameraDevice;
  useCameraPermission = visionCamera.useCameraPermission;
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
  CAMERA_AVAILABLE = true;
} catch (error) {
  console.log('Camera modules not available (Expo Go mode):', error);
  CAMERA_AVAILABLE = false;
}

type Props = NativeStackScreenProps<RootStackParamList, 'LiveScanner'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LiveScannerScreen: React.FC<Props> = ({ navigation }) => {
  // Check if camera is available (not in Expo Go)
  if (!CAMERA_AVAILABLE) {
    return (
      <View style={styles.expoGoFallback}>
        <MaterialIcons name="camera-alt" size={80} color="#666" />
        <Text style={styles.expoGoTitle}>Camera Not Available</Text>
        <Text style={styles.expoGoMessage}>
          The live scanner requires a development build.{'\n\n'}
          Expo Go doesn't support react-native-vision-camera.
        </Text>
        <TouchableOpacity
          style={styles.expoGoButton}
          onPress={() => navigation.navigate('MedicationReview', {
            imageUri: '',
            rawOcrText: '',
            parsedData: undefined,
            editMode: false,
          })}
        >
          <MaterialIcons name="edit" size={20} color="white" />
          <Text style={styles.expoGoButtonText}>Enter Manually Instead</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.expoGoBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.expoGoBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera setup
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enableTorch, setEnableTorch] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState(0);
  const [detectedText, setDetectedText] = useState('');

  // Animation for scanning indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Scanning interval ref
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  // Pulse animation for scanning indicator
  useEffect(() => {
    if (isScanning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      const scanLine = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      scanLine.start();

      return () => {
        pulse.stop();
        scanLine.stop();
      };
    }
  }, [isScanning, pulseAnim, scanLineAnim]);

  // Request permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  /**
   * Capture a frame and process with ML Kit
   */
  const captureAndProcessFrame = useCallback(async () => {
    if (!cameraRef.current || !isScanning || isProcessing) return;

    try {
      // Take a snapshot for OCR processing
      const photo = await cameraRef.current.takePhoto({
        flash: enableTorch ? 'on' : 'off',
        enableShutterSound: false,
      });

      if (!isMountedRef.current) return;

      // Process with ML Kit
      const imagePath = Platform.OS === 'ios' 
        ? photo.path 
        : `file://${photo.path}`;
      
      const result = await TextRecognition.recognize(imagePath);
      
      if (!isMountedRef.current) return;

      // Update frame count
      setCapturedFrames(prev => prev + 1);

      // Process and accumulate text
      const progress = MLKitOCRService.processFrameText(result);
      setScanProgress(progress);

      // Update detected text preview (last few lines)
      const lines = MLKitOCRService.getUniqueLines();
      const previewText = lines.slice(-5).join('\n');
      setDetectedText(previewText);

      // Check if scan is complete
      if (progress.isComplete) {
        await handleScanComplete();
      }

      // Clean up temp file
      try {
        await FileSystem.deleteAsync(imagePath, { idempotent: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    } catch (error) {
      console.log('Frame capture error (non-critical):', error);
    }
  }, [isScanning, isProcessing, enableTorch]);

  /**
   * Start the live scanning session
   */
  const startScanning = useCallback(() => {
    MLKitOCRService.resetAccumulation();
    setIsScanning(true);
    setCapturedFrames(0);
    setScanProgress(null);
    setDetectedText('');

    // Capture frames at regular intervals
    scanIntervalRef.current = setInterval(() => {
      captureAndProcessFrame();
    }, 500); // Capture every 500ms for smoother scanning
  }, [captureAndProcessFrame]);

  /**
   * Stop scanning and process results
   */
  const stopScanning = useCallback(async () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  }, []);

  /**
   * Handle completed scan - Pure on-device processing
   * Live scanning continues until enough text is captured, then parses locally
   */
  const handleScanComplete = async () => {
    stopScanning();
    setIsProcessing(true);

    try {
      const accumulatedText = MLKitOCRService.getAccumulatedText();
      const stats = MLKitOCRService.getStats();
      
      console.log('=== LIVE SCAN COMPLETE ===');
      console.log('Unique lines:', stats.uniqueLines);
      console.log('Total chars:', stats.totalChars);
      console.log('Scan duration:', (stats.scanDuration / 1000).toFixed(1), 'seconds');
      console.log('Avg confidence:', (stats.avgConfidence * 100).toFixed(1) + '%');
      console.log('==========================');

      // Assess quality for user feedback
      const quality = MLKitOCRService.assessQuality();
      
      console.log('Quality Assessment:', {
        isAcceptable: quality.isAcceptable,
        confidence: Math.round(quality.confidence * 100) + '%',
        detectedFields: quality.detectedFields,
      });

      // Parse on-device using local heuristics
      console.log('📱 Parsing on-device...');
      const parsedData = await OCRService.parseMedicationLabel(accumulatedText);

      console.log('=== PARSED MEDICATION DATA ===');
      console.log('Patient Name:', parsedData.patientName || '(not found)');
      console.log('Drug Name:', parsedData.drugName || '(not found)');
      console.log('Strength:', parsedData.strength || '(not found)');
      console.log('Confidence:', parsedData.confidence.toFixed(1) + '%');
      console.log('==============================');

      // Navigate to review screen
      navigation.replace('MedicationReview', {
        imageUri: '', // No single image in live scan mode
        rawOcrText: accumulatedText,
        parsedData: parsedData,
      });
    } catch (error: any) {
      console.error('Processing error:', error);
      Alert.alert(
        'Processing Error',
        'Failed to process scanned text. Please try again.',
        [{ text: 'OK', onPress: () => setIsProcessing(false) }]
      );
    }
  };

  /**
   * Manual complete button
   */
  const handleManualComplete = async () => {
    if (scanProgress && scanProgress.uniqueLines >= 3) {
      await handleScanComplete();
    } else {
      Alert.alert(
        'Not Enough Text',
        'Please continue scanning to capture more of the label.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Toggle torch/flashlight
   */
  const toggleTorch = () => {
    setEnableTorch(prev => !prev);
  };

  // Permission not granted
  if (!hasPermission) {
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

  // No camera device
  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  // Calculate progress percentage
  const progressPercentage = scanProgress
    ? Math.min(
        100,
        Math.round(
          (scanProgress.uniqueLines / 8) * 50 + // Lines contribute 50%
          (scanProgress.detectedFields.length / 6) * 50 // Fields contribute 50%
        )
      )
    : 0;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        torch={enableTorch ? 'on' : 'off'}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Live Label Scanner</Text>
          <TouchableOpacity style={styles.torchButton} onPress={toggleTorch}>
            <MaterialIcons 
              name={enableTorch ? 'flash-on' : 'flash-off'} 
              size={28} 
              color={enableTorch ? '#FFD700' : 'white'} 
            />
          </TouchableOpacity>
        </View>

        {/* Scan frame */}
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Animated scan line */}
            {isScanning && (
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 180],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}
          </View>

          {/* Instructions */}
          <Text style={styles.instructionText}>
            {isScanning
              ? 'Slowly rotate the bottle to capture all text'
              : 'Position the label in the frame and tap Start'}
          </Text>
        </View>

        {/* Progress section */}
        {isScanning && scanProgress && (
          <View style={styles.progressContainer}>
            {/* Progress bar */}
            <View style={styles.progressBarBackground}>
              <View 
                style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} 
              />
            </View>
            <Text style={styles.progressText}>
              {progressPercentage}% • {scanProgress.uniqueLines} lines captured
            </Text>

            {/* Detected fields */}
            <View style={styles.fieldsContainer}>
              {['drugName', 'strength', 'dosage', 'frequency', 'rxNumber', 'refills'].map(field => (
                <View
                  key={field}
                  style={[
                    styles.fieldBadge,
                    scanProgress.detectedFields.includes(field) && styles.fieldBadgeActive,
                  ]}
                >
                  <MaterialIcons
                    name={scanProgress.detectedFields.includes(field) ? 'check-circle' : 'radio-button-unchecked'}
                    size={14}
                    color={scanProgress.detectedFields.includes(field) ? '#4CAF50' : '#888'}
                  />
                  <Text
                    style={[
                      styles.fieldBadgeText,
                      scanProgress.detectedFields.includes(field) && styles.fieldBadgeTextActive,
                    ]}
                  >
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </Text>
                </View>
              ))}
            </View>

            {/* Live text preview */}
            {detectedText.length > 0 && (
              <View style={styles.textPreview}>
                <Text style={styles.textPreviewLabel}>Detected:</Text>
                <Text style={styles.textPreviewContent} numberOfLines={3}>
                  {detectedText}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          {!isScanning ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startScanning}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <MaterialIcons name="center-focus-strong" size={32} color="white" />
              </Animated.View>
              <Text style={styles.startButtonText}>Start Scanning</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.scanningControls}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={stopScanning}
              >
                <MaterialIcons name="close" size={24} color="white" />
                <Text style={styles.controlButtonText}>Cancel</Text>
              </TouchableOpacity>

              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.scanningText}>
                  Scanning... ({capturedFrames} frames)
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.completeButton,
                  (scanProgress?.uniqueLines ?? 0) < 3 && styles.completeButtonDisabled,
                ]}
                onPress={handleManualComplete}
                disabled={(scanProgress?.uniqueLines ?? 0) < 3}
              >
                <MaterialIcons name="check" size={24} color="white" />
                <Text style={styles.controlButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tip text */}
          <Text style={styles.tipText}>
            {isScanning
              ? 'Keep the bottle steady • Good lighting helps'
              : 'Tip: Rotate bottle slowly for best results on curved labels'}
          </Text>
        </View>
      </View>

      {/* Processing overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.processingText}>Processing scanned text...</Text>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingBottom: 15,
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  torchButton: {
    padding: 8,
  },
  scanFrameContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scanFrame: {
    width: 300,
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 30,
  },
  progressContainer: {
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 15,
    marginHorizontal: 10,
    borderRadius: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    color: 'white',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  fieldsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  fieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 4,
  },
  fieldBadgeActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  fieldBadgeText: {
    color: '#888',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  fieldBadgeTextActive: {
    color: '#4CAF50',
  },
  textPreview: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  textPreviewLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  textPreviewContent: {
    color: 'white',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bottomControls: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingTop: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 30,
    gap: 12,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  scanningControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    borderRadius: 12,
    minWidth: 70,
  },
  completeButton: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    minWidth: 70,
  },
  completeButtonDisabled: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  scanningIndicator: {
    alignItems: 'center',
    gap: 8,
  },
  scanningText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  tipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 15,
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
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
    fontWeight: '600',
  },
  // Expo Go fallback styles
  expoGoFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 30,
  },
  expoGoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
  },
  expoGoMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  expoGoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 10,
    gap: 10,
  },
  expoGoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  expoGoBackButton: {
    marginTop: 15,
    padding: 10,
  },
  expoGoBackText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default LiveScannerScreen;
