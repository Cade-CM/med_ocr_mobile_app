import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MedicationDB } from '../services/MedicationLocalDB';
import { MaterialIcons as Icon } from '@expo/vector-icons';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleClearAllMedications = async () => {
    // Remove all medications using StorageService to ensure consistency
    const meds = await import('../services/StorageService').then(m => m.StorageService.getMedications());
    for (const med of meds) {
      await import('../services/StorageService').then(m => m.StorageService.deleteMedication(String(med.id)));
    }
    alert('All medications have been cleared.');
  };

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
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('DeleteAccount' as never)}>
          <Icon name="delete" size={24} color="#FF3B30" />
          <Text style={[styles.rowText, { color: '#FF3B30' }]}>Delete Account</Text>
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
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('AppPermissions' as never)}>
          <Icon name="security" size={24} color="#007AFF" />
          <Text style={styles.rowText}>App Permissions</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <Icon name="analytics" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Data Sharing & Analytics</Text>
          <Switch value={true} onValueChange={() => {}} />
        </View>
        <View style={styles.row}>
          <Icon name="fingerprint" size={24} color="#007AFF" />
          <Text style={styles.rowText}>Biometric Login</Text>
          <Switch value={false} onValueChange={() => {}} />
        </View>
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
  rowText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
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