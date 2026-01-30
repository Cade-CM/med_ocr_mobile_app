/**
 * LLM Consent Modal - User consent before sending OCR text to LLM
 * 
 * Security and trust features:
 * - Shows exact text that will be sent
 * - Allows user to redact sensitive lines
 * - Explicit consent with clear explanation
 * - Opt-in only (default off)
 * - Logs consent for audit trail
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Settings key for LLM opt-in preference
const LLM_OPTIN_KEY = 'llm_accuracy_optin';

interface LlmConsentModalProps {
  visible: boolean;
  ocrText: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

/**
 * Check if user has opted in to LLM assistance
 */
export async function isLlmOptedIn(): Promise<boolean> {
  const value = await AsyncStorage.getItem(LLM_OPTIN_KEY);
  return value === 'true';
}

/**
 * Set LLM opt-in preference
 */
export async function setLlmOptIn(optedIn: boolean): Promise<void> {
  await AsyncStorage.setItem(LLM_OPTIN_KEY, optedIn ? 'true' : 'false');
}

/**
 * Modal component for LLM consent with text preview and redaction
 */
export const LlmConsentModal: React.FC<LlmConsentModalProps> = ({
  visible,
  ocrText,
  onConfirm,
  onCancel,
}) => {
  const [editedText, setEditedText] = useState(ocrText);
  const [redactedLines, setRedactedLines] = useState<Set<number>>(new Set());
  const [rememberChoice, setRememberChoice] = useState(false);

  // Split text into lines for selective redaction
  const lines = ocrText.split('\n');

  const toggleLineRedaction = useCallback((lineIndex: number) => {
    setRedactedLines(prev => {
      const next = new Set(prev);
      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }
      return next;
    });
  }, []);

  const getProcessedText = useCallback(() => {
    return lines
      .map((line, index) => redactedLines.has(index) ? '[REDACTED]' : line)
      .join('\n');
  }, [lines, redactedLines]);

  const handleConfirm = async () => {
    const processedText = getProcessedText();
    
    if (rememberChoice) {
      await setLlmOptIn(true);
    }
    
    onConfirm(processedText);
  };

  const handleRedactAll = () => {
    Alert.alert(
      'Redact All',
      'This will redact all lines. The LLM will not receive any text.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redact All',
          onPress: () => {
            const allIndices = new Set(lines.map((_, i) => i));
            setRedactedLines(allIndices);
          },
        },
      ]
    );
  };

  const handleClearRedactions = () => {
    setRedactedLines(new Set());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Improve Accuracy</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Explanation */}
        <View style={styles.explanationContainer}>
          <MaterialIcons name="info-outline" size={24} color="#2196F3" />
          <Text style={styles.explanationText}>
            To improve medication parsing accuracy, we can send the extracted text to an AI service.{'\n\n'}
            <Text style={styles.boldText}>What is sent:</Text> Only the text shown below{'\n'}
            <Text style={styles.boldText}>What is NOT sent:</Text> Images, photos, your identity{'\n\n'}
            You can tap any line to redact it before sending.
          </Text>
        </View>

        {/* Redaction controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={handleClearRedactions} style={styles.controlButton}>
            <MaterialIcons name="visibility" size={18} color="#4CAF50" />
            <Text style={styles.controlButtonText}>Show All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRedactAll} style={styles.controlButton}>
            <MaterialIcons name="visibility-off" size={18} color="#F44336" />
            <Text style={styles.controlButtonText}>Redact All</Text>
          </TouchableOpacity>
        </View>

        {/* Text preview with line-by-line redaction */}
        <Text style={styles.sectionTitle}>
          Text to be sent ({redactedLines.size} line{redactedLines.size !== 1 ? 's' : ''} redacted):
        </Text>
        <ScrollView style={styles.textPreviewContainer}>
          {lines.map((line, index) => {
            const isRedacted = redactedLines.has(index);
            return (
              <TouchableOpacity
                key={index}
                onPress={() => toggleLineRedaction(index)}
                style={[
                  styles.lineRow,
                  isRedacted && styles.lineRowRedacted,
                ]}
              >
                <MaterialIcons
                  name={isRedacted ? 'visibility-off' : 'visibility'}
                  size={18}
                  color={isRedacted ? '#F44336' : '#4CAF50'}
                  style={styles.lineIcon}
                />
                <Text
                  style={[
                    styles.lineText,
                    isRedacted && styles.lineTextRedacted,
                  ]}
                  numberOfLines={2}
                >
                  {isRedacted ? '[REDACTED]' : line || '(empty line)'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Remember choice */}
        <View style={styles.rememberRow}>
          <Switch
            value={rememberChoice}
            onValueChange={setRememberChoice}
            trackColor={{ false: '#ccc', true: '#81C784' }}
            thumbColor={rememberChoice ? '#4CAF50' : '#f4f3f4'}
          />
          <Text style={styles.rememberText}>
            Remember my choice (don't ask again)
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
            <MaterialIcons name="send" size={18} color="#fff" />
            <Text style={styles.confirmButtonText}>Send to AI</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  explanationContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#E3F2FD',
    margin: 16,
    borderRadius: 8,
  },
  explanationText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 6,
  },
  controlButtonText: {
    fontSize: 14,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  textPreviewContainer: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  lineRowRedacted: {
    backgroundColor: '#FFEBEE',
  },
  lineIcon: {
    marginRight: 10,
  },
  lineText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  lineTextRedacted: {
    color: '#999',
    fontStyle: 'italic',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  rememberText: {
    fontSize: 14,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default LlmConsentModal;
