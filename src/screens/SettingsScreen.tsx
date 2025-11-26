import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import {UserPreferences} from '@types';
import {StorageService} from '@services/StorageService';
import {SchedulingService} from '@services/SchedulingService';
import {MaterialIcons as Icon} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '@types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [preferences, setPreferences] = useState<UserPreferences>(
    SchedulingService.getDefaultPreferences(),
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [allProfiles, setAllProfiles] = useState<Array<{
    userId: string;
    firstName: string;
    lastName: string;
    nickname?: string;
  }>>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isDeveloper, setIsDeveloper] = useState(false);

  useEffect(() => {
    loadPreferences();
    loadUserData();
    loadAllProfiles();
    checkDeveloperMode();
  }, []);

  const loadPreferences = async () => {
    const savedPrefs = await StorageService.getUserPreferences();
    if (savedPrefs) {
      setPreferences(savedPrefs);
    }
  };

  const loadUserData = async () => {
    const profile = await StorageService.getCurrentUserProfile();
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setCurrentUserId(profile.userId || '');
    }
  };

  const loadAllProfiles = async () => {
    const profiles = await StorageService.getAllUserProfiles();
    setAllProfiles(profiles);
  };

  const checkDeveloperMode = async () => {
    try {
      const profile = await StorageService.getCurrentUserProfile();
      // Enable developer mode only for specific email
      if (profile?.email?.toLowerCase() === 'cademontes@me.com') {
        setIsDeveloper(true);
        console.log('🔧 Developer mode enabled');
      }
    } catch (error) {
      console.error('Error checking developer mode:', error);
    }
  };

  const handleSwitchProfile = (userId: string) => {
    const profile = allProfiles.find(p => p.userId === userId);
    Alert.alert(
      'Switch Profile',
      `Switch to ${profile?.firstName}'s profile?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Switch',
          onPress: async () => {
            try {
              await StorageService.switchUserProfile(userId);
              // Reload the app to show new profile's data
              navigation.getParent()?.reset({
                index: 0,
                routes: [{name: 'Home'}],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to switch profile. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    try {
      await StorageService.saveUserPreferences(preferences);
      setHasChanges(false);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.logoutUser();
              await AsyncStorage.removeItem('isLoggedIn');
              // Use the parent navigator
              navigation.getParent()?.reset({
                index: 0,
                routes: [{name: 'Login'}],
              });
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
    );
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => {
    setPreferences(prev => ({...prev, [key]: value}));
    setHasChanges(true);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your medications and adherence records. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearAllData();
            Alert.alert('Success', 'All data has been cleared.');
          },
        },
      ],
    );
  };

  const handleClearAllAccounts = () => {
    Alert.alert(
      '⚠️ DELETE ALL ACCOUNTS',
      'This will permanently delete ALL user accounts, profiles, medications, and data from this device. This action CANNOT be undone.\n\nYou will be signed out and returned to the login screen.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllUsersAndData();
              Alert.alert('All Data Deleted', 'All accounts and data have been permanently deleted.', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate to login
                    navigation.getParent()?.reset({
                      index: 0,
                      routes: [{name: 'Login'}],
                    });
                  },
                },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete all data. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="person" size={24} color="#007AFF" />
              <Text style={styles.settingText}>First Name</Text>
            </View>
            <TextInput
              style={[styles.nameInput, styles.readOnlyInput]}
              value={firstName}
              editable={false}
              placeholder="First Name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="person" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Last Name</Text>
            </View>
            <TextInput
              style={[styles.nameInput, styles.readOnlyInput]}
              value={lastName}
              editable={false}
              placeholder="Last Name"
              placeholderTextColor="#999"
            />
          </View>

          <Text style={styles.nameNote}>
            To change your name, please sign out and sign in again.
          </Text>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Icon name="logout" size={24} color="#FF3B30" />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Switcher */}
        {allProfiles.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Switch Profile</Text>
            <Text style={styles.sectionSubtitle}>
              Medications are stored separately for each profile
            </Text>
            
            {allProfiles.map((profile) => (
              <TouchableOpacity
                key={profile.userId}
                style={[
                  styles.profileRow,
                  profile.userId === currentUserId && styles.currentProfileRow,
                ]}
                onPress={() => handleSwitchProfile(profile.userId)}
                disabled={profile.userId === currentUserId}
              >
                <View style={styles.profileIcon}>
                  <Icon 
                    name="person" 
                    size={24} 
                    color={profile.userId === currentUserId ? 'white' : '#007AFF'} 
                  />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[
                    styles.profileName,
                    profile.userId === currentUserId && styles.currentProfileText,
                  ]}>
                    {profile.firstName} {profile.lastName}
                  </Text>
                  {profile.nickname && (
                    <Text style={[
                      styles.profileNickname,
                      profile.userId === currentUserId && styles.currentProfileSubtext,
                    ]}>
                      "{profile.nickname}"
                    </Text>
                  )}
                </View>
                {profile.userId === currentUserId && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="notifications" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Enable Notifications</Text>
            </View>
            <Switch
              value={preferences.notificationEnabled}
              onValueChange={(value) =>
                updatePreference('notificationEnabled', value)
              }
              trackColor={{false: '#D1D1D6', true: '#34C759'}}
              thumbColor="white"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="volume-up" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Notification Sound</Text>
            </View>
            <Switch
              value={preferences.notificationSound}
              onValueChange={(value) =>
                updatePreference('notificationSound', value)
              }
              trackColor={{false: '#D1D1D6', true: '#34C759'}}
              thumbColor="white"
              disabled={!preferences.notificationEnabled}
            />
          </View>
        </View>

        {/* RFID Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RFID Confirmation</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="nfc" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Use RFID Confirmation</Text>
            </View>
            <Switch
              value={preferences.useRFIDConfirmation || false}
              onValueChange={(value) =>
                updatePreference('useRFIDConfirmation', value)
              }
              trackColor={{false: '#D1D1D6', true: '#34C759'}}
              thumbColor="white"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Icon name="access-time" size={24} color="#4ECDC4" />
              <Text style={styles.settingText}>On-Time Window (minutes)</Text>
            </View>
            <TextInput
              style={styles.timeInput}
              value={preferences.confirmationWindowMinutes?.toString() || '30'}
              onChangeText={(text) => {
                const minutes = parseInt(text) || 30;
                updatePreference('confirmationWindowMinutes', minutes);
              }}
              placeholder="30"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>

          <Text style={styles.settingDescription}>
            When RFID is enabled, you'll need to scan your medication's RFID tag to confirm doses. 
            The on-time window determines how many minutes before/after the scheduled time counts as "on-time".
          </Text>
        </View>

        {/* Save Button */}
        {hasChanges && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Icon name="save" size={24} color="white" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        )}

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: '#FF3B30'}]}>
            Danger Zone
          </Text>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearData}>
            <Icon name="delete-forever" size={24} color="#FF3B30" />
            <Text style={styles.dangerButtonText}>Clear My Data</Text>
          </TouchableOpacity>
        </View>

        {/* Developer Tools - Only visible to developer */}
        {isDeveloper && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: '#8B0000'}]}>
              🔧 Developer Tools
            </Text>
            <Text style={styles.developerNote}>
              These tools are only visible to the developer account
            </Text>
            
            <TouchableOpacity
              style={[styles.dangerButton, {backgroundColor: '#8B0000', marginTop: 10}]}
              onPress={handleClearAllAccounts}>
              <Icon name="warning" size={24} color="white" />
              <Text style={[styles.dangerButtonText, {color: 'white'}]}>Delete All Accounts</Text>
            </TouchableOpacity>
            <Text style={styles.dangerWarning}>
              ⚠️ This will permanently delete ALL user accounts and data from this device
            </Text>
          </View>
        )}

        {/* App Info */}
        <View style={styles.infoSection}>
          <Text style={styles.appName}>MedBuddy</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            Medication adherence tracking with OCR label capture
          </Text>
        </View>
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  currentProfileRow: {
    backgroundColor: '#007AFF',
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  profileNickname: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#999',
  },
  currentProfileText: {
    color: 'white',
  },
  currentProfileSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  currentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 10,
    paddingHorizontal: 5,
  },
  timeInput: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
    minWidth: 80,
    textAlign: 'center',
  },
  nameInput: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
    minWidth: 120,
    flex: 1,
    maxWidth: 180,
  },
  readOnlyInput: {
    backgroundColor: '#E8E8E8',
    color: '#666',
  },
  nameNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  signOutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  dangerButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerWarning: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  developerNote: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
    textAlign: 'center',
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 5,
  },
  infoSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  appDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SettingsScreen;
