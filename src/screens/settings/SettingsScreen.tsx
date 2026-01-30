import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { signOut } from '@services/AuthService';
import { 
  isPrivacyLockEnabled, 
  setPrivacyLockEnabled, 
  isBiometricAvailable,
  getSupportedAuthTypes,
  getAuthTypeName,
} from '@services/PrivacyLockService';
import { 
  deleteAccountAndAllData, 
  getDataDeletionSummary,
  exportUserData,
} from '@services/AccountDeletionService';
import { setLlmOptIn, isLlmOptedIn } from '@components/LlmConsentModal';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [privacyLockOn, setPrivacyLockOn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [authTypeName, setAuthTypeName] = useState('Biometrics');
  const [llmOptIn, setLlmOptInState] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Load settings on mount
    const loadSettings = async () => {
      const [lockEnabled, bioAvailable, authTypes, llmEnabled] = await Promise.all([
        isPrivacyLockEnabled(),
        isBiometricAvailable(),
        getSupportedAuthTypes(),
        isLlmOptedIn(),
      ]);
      setPrivacyLockOn(lockEnabled);
      setBiometricAvailable(bioAvailable);
      setAuthTypeName(getAuthTypeName(authTypes));
      setLlmOptInState(llmEnabled);
    };
    loadSettings();
  }, []);

  const handlePrivacyLockToggle = async (value: boolean) => {
    if (value && !biometricAvailable) {
      Alert.alert(
        'Biometrics Not Available',
        'Please set up Face ID, Touch ID, or a device passcode in your device settings first.'
      );
      return;
    }
    await setPrivacyLockEnabled(value);
    setPrivacyLockOn(value);
  };

  const handleLlmOptInToggle = async (value: boolean) => {
    await setLlmOptIn(value);
    setLlmOptInState(value);
    if (!value) {
      Alert.alert('AI Assistance Disabled', 'You will be asked for consent each time you use "Improve Accuracy".');
    }
  };

  const handleClearAllMedications = async () => {
    // Remove all medications using StorageService to ensure consistency
    const meds = await import('@services/StorageService').then(m => m.StorageService.getMedications());
    for (const med of meds) {
      await import('@services/StorageService').then(m => m.StorageService.deleteMedication(String(med.id)));
    }
    alert('All medications have been cleared.');
  };

  const handleDeleteAccount = async () => {
    // First, get summary of what will be deleted
    const summary = await getDataDeletionSummary();
    
    Alert.alert(
      'Delete Account & All Data',
      `This will permanently delete:\n\n` +
      `• ${summary?.medicationCount || 0} medications\n` +
      `• ${summary?.adherenceCount || 0} adherence records\n` +
      `• ${summary?.scheduleCount || 0} schedules\n` +
      `• Your profile and account\n\n` +
      `This action cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export Data First',
          onPress: async () => {
            const data = await exportUserData();
            if (data) {
              // In production, you'd save this to a file or send via email
              Alert.alert('Data Exported', 'Your data has been prepared for export.');
            }
          },
        },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => confirmDeleteAccount(),
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Final Confirmation',
      'Type DELETE to confirm you want to permanently delete your account and all data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const result = await deleteAccountAndAllData();
            setIsDeleting(false);
            
            if (result.success) {
              Alert.alert('Account Deleted', 'Your account and all data have been deleted.', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Login' as never }],
                      })
                    );
                  },
                },
              ]);
            } else {
              Alert.alert('Deletion Incomplete', `Some errors occurred:\n${result.errors.join('\n')}`);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    const doSignOut = async () => {
      try {
        // Use centralized signOut which:
        // - Triggers auth state listener to clear in-memory state
        // - Unsubscribes from Realtime channels
        // - Clears AsyncStorage cached data
        // - Clears SecureStore tokens
        await signOut();
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' as never }],
          })
        );
      } catch (error) {
        console.error('Error signing out:', error);
        if (Platform.OS === 'web') {
          window.alert('Failed to sign out. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to sign out. Please try again.');
        }
      }
    };

    // Use window.confirm on web, Alert on native
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        doSignOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: doSignOut,
          },
        ]
      );
    }
  };

  if (isDeleting) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={{ marginTop: 16, color: '#666' }}>Deleting account...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 1. Account & Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account & Profile</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('EditProfileScreen' as never)}>
          <Icon name="person" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ChangePasswordScreen' as never)}>
          <Icon name="lock" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Change Password</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={handleSignOut}>
          <Icon name="logout" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Personal & Health Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal & Health Data</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Demographics' as never)}>
          <Icon name="badge" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Demographics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('MedicationManagement' as never)}>
          <Icon name="medication" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Medications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('CareTeam' as never)}>
          <Icon name="group" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Care Team Contacts</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Privacy & Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <View style={styles.row}>
          <Icon name="fingerprint" size={24} color="#007AFF" />
          <View style={styles.rowContent}>
            <Text style={styles.rowText}>App Lock ({authTypeName})</Text>
            <Text style={styles.rowSubtext}>Lock app when backgrounded</Text>
          </View>
          <Switch 
            value={privacyLockOn} 
            onValueChange={handlePrivacyLockToggle}
            disabled={!biometricAvailable}
          />
        </View>
        <View style={styles.row}>
          <Icon name="psychology" size={24} color="#007AFF" />
          <View style={styles.rowContent}>
            <Text style={styles.rowText}>AI Accuracy Assistance</Text>
            <Text style={styles.rowSubtext}>Skip consent prompt for LLM</Text>
          </View>
          <Switch 
            value={llmOptIn} 
            onValueChange={handleLlmOptInToggle}
          />
        </View>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('AppPermissions' as never)}>
          <Icon name="security" size={24} color="#007AFF" />
          <Text style={styles.rowText}>App Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('PrivacyPolicy' as never)}>
          <Icon name="policy" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('MedicationReminders' as never)}>
          <Icon name="notifications" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Medication Reminders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('AlertTimes' as never)}>
          <Icon name="schedule" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Alert Times / Quiet Hours</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <Icon name="email" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Email Notifications</Text>
          <Switch value={true} onValueChange={() => {}} />
        </View>
        {/* Clear All Medications Button (styled like Delete Account) */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleClearAllMedications}>
          <Icon name="delete" size={24} color="#FF3B30" />
          <Text style={[styles.rowText, { color: '#FF3B30' }]}>Clear All Medications</Text>
        </TouchableOpacity>
      </View>

      {/* 5. App Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ThemeSettings' as never)}>
          <Icon name="palette" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Theme</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('AccessibilitySettings' as never)}>
          <Icon name="accessibility" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Accessibility</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('LanguageSettings' as never)}>
          <Icon name="language" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Language</Text>
        </TouchableOpacity>
      </View>

      {/* 6. Connected Devices & Integrations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Devices & Integrations</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('DeviceManagement' as never)}>
          <Icon name="devices" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Manage Devices</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('CloudSync' as never)}>
          <Icon name="cloud" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Cloud Sync Status</Text>
        </TouchableOpacity>
      </View>

      {/* 7. Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('HelpCenter' as never)}>
          <Icon name="help" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Help Center / FAQ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ContactSupport' as never)}>
          <Icon name="support-agent" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Contact Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ReportProblem' as never)}>
          <Icon name="bug-report" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Report a Problem</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('AppTutorials' as never)}>
          <Icon name="school" size={24} color="#007AFF" />
          <Text style={styles.rowText}>App Tutorials</Text>
        </TouchableOpacity>
      </View>

      {/* 8. About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Icon name="info" size={24} color="#007AFF" />
          <Text style={styles.rowText}>App Version: 1.0.0</Text>
        </View>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('TermsOfUse' as never)}>
          <Icon name="description" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Terms of Use</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('PrivacyPolicy' as never)}>
          <Icon name="policy" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('OpenSourceLicenses' as never)}>
          <Icon name="code" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Open Source Licenses</Text>
        </TouchableOpacity>
      </View>

      {/* 9. Danger Zone */}
      <View style={[styles.section, { marginBottom: 48 }]}>
        <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>Danger Zone</Text>
        <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
          <Icon name="delete-forever" size={24} color="#FF3B30" />
          <Text style={[styles.rowText, { color: '#FF3B30' }]}>Delete Account & All Data</Text>
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
  section: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  rowContent: {
    flex: 1,
    marginLeft: 16,
  },
  rowText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  rowSubtext: {
    marginLeft: 16,
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
});

export default SettingsScreen;