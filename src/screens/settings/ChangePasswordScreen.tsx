import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Platform } from 'react-native';
import { supabase } from '@config/supabase';
import { useNavigation } from '@react-navigation/native';

const MIN_PASSWORD_LENGTH = 8;

// Supabase error codes/messages for session issues
const REQUIRES_REAUTHENTICATION_PATTERNS = [
  'requires recent login',
  'session_expired',
  'reauthentication required',
  'refresh_token_not_found',
  'Invalid Refresh Token',
];

const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingNewPassword, setPendingNewPassword] = useState<string | null>(null);

  const clearPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPendingNewPassword(null);
  };

  /**
   * Check if error requires reauthentication
   */
  const requiresReauthentication = (error: any): boolean => {
    const message = (error?.message || error?.code || '').toLowerCase();
    return REQUIRES_REAUTHENTICATION_PATTERNS.some(pattern => 
      message.includes(pattern.toLowerCase())
    );
  };

  /**
   * Reauthenticate user with current password, then retry password update
   */
  const handleReauthenticate = async () => {
    if (!pendingNewPassword || !currentPassword) {
      Alert.alert('Error', 'Please enter your current password to continue.');
      return;
    }

    setIsLoading(true);
    try {
      // Get current user email
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;

      if (!email) {
        throw new Error('Unable to determine your email. Please sign out and sign in again.');
      }

      // Reauthenticate by signing in again
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect.');
      }

      // Now retry the password update
      const { error: updateError } = await supabase.auth.updateUser({
        password: pendingNewPassword,
      });

      if (updateError) {
        throw updateError;
      }

      clearPasswordFields();
      Alert.alert('Success', 'Password changed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      clearPasswordFields();
      Alert.alert('Error', e.message || 'Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate all fields are filled
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    // Validate password length
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Error', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsLoading(true);
    try {
      // Use Supabase Auth to update password securely on the server
      // Note: Supabase's updateUser doesn't require current password verification
      // If you need current password verification, re-authenticate first
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) {
        throw error;
      }

      // Clear sensitive data from state immediately after success
      clearPasswordFields();
      
      Alert.alert('Success', 'Password changed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      // Check if this is a "requires recent login" error
      if (requiresReauthentication(e)) {
        // Store the new password temporarily for retry after reauthentication
        setPendingNewPassword(newPassword);
        setNewPassword('');
        setConfirmPassword('');
        
        Alert.alert(
          'Session Expired',
          'For security, please verify your current password to continue.',
          [
            { text: 'Cancel', style: 'cancel', onPress: clearPasswordFields },
            { text: 'Continue', onPress: handleReauthenticate }
          ]
        );
      } else {
        // Clear password fields on error for security
        clearPasswordFields();
        
        const message = e.message || 'Failed to change password.';
        Alert.alert('Error', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            editable={!isLoading}
          />
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            editable={!isLoading}
          />
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.completeButton, isLoading && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.completeButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 15,
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  completeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ChangePasswordScreen;
