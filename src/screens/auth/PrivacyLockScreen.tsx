/**
 * Privacy Lock Screen - Biometric/passcode gate for app access
 * 
 * Shown when:
 * - App starts with privacy lock enabled
 * - App returns from background
 * - Idle timeout exceeded
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  unlockApp,
  isAppLocked,
  getSupportedAuthTypes,
  getAuthTypeName,
} from '@services/PrivacyLockService';

interface PrivacyLockScreenProps {
  onUnlock: () => void;
}

export const PrivacyLockScreen: React.FC<PrivacyLockScreenProps> = ({ onUnlock }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authTypeName, setAuthTypeName] = useState('Biometrics');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get auth type name for display
    getSupportedAuthTypes().then(types => {
      setAuthTypeName(getAuthTypeName(types));
    });
    
    // Auto-prompt on mount
    handleUnlock();
  }, []);

  const handleUnlock = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    setError(null);
    
    try {
      const success = await unlockApp();
      if (success) {
        onUnlock();
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      setError('Authentication error. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* App Logo/Icon */}
      <View style={styles.logoContainer}>
        <MaterialIcons name="medication" size={80} color="#2196F3" />
        <Text style={styles.appName}>MedOCR</Text>
      </View>

      {/* Lock icon */}
      <View style={styles.lockIconContainer}>
        <MaterialIcons name="lock" size={48} color="#666" />
      </View>

      {/* Message */}
      <Text style={styles.message}>
        App Locked
      </Text>
      <Text style={styles.subMessage}>
        Authenticate to access your medications
      </Text>

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={20} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Unlock button */}
      <TouchableOpacity
        style={styles.unlockButton}
        onPress={handleUnlock}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialIcons 
              name={authTypeName.includes('Face') ? 'face' : 'fingerprint'} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.unlockButtonText}>
              Unlock with {authTypeName}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Security note */}
      <Text style={styles.securityNote}>
        Your medication data is protected
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  message: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 12,
    minWidth: 250,
    justifyContent: 'center',
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  securityNote: {
    position: 'absolute',
    bottom: 48,
    fontSize: 14,
    color: '#999',
  },
});

export default PrivacyLockScreen;
