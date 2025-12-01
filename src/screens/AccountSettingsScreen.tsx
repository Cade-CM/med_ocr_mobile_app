import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { StorageService } from '@services/StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AccountSettingsScreen: React.FC = () => {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    displayName: '',
    nickname: '',
    age: '',
    gender: '',
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      const localProfile = await StorageService.getLocalUserProfile();
      if (localProfile) {
        setProfile({
          ...localProfile,
          age: localProfile.age ? localProfile.age.toString() : '',
        });
      }
    })();
  }, []);

  const handleChange = (key: string, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveLocal = async () => {
    const saveProfile = {
      ...profile,
      age: profile.age ? parseInt(profile.age) : undefined,
    };
    await StorageService.updateLocalUserProfile(saveProfile);
    Alert.alert('Saved', 'Profile saved locally.');
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const user_key = await AsyncStorage.getItem('user_key');
      if (!user_key) throw new Error('No user_key found');
      await StorageService.syncLocalUserProfile(user_key);
      Alert.alert('Synced', 'Profile updated on server.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to sync profile.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Settings</Text>
      <TextInput style={styles.input} placeholder="First Name" value={profile.firstName} onChangeText={v => handleChange('firstName', v)} />
      <TextInput style={styles.input} placeholder="Last Name" value={profile.lastName} onChangeText={v => handleChange('lastName', v)} />
      <TextInput style={styles.input} placeholder="Email" value={profile.email} onChangeText={v => handleChange('email', v)} keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Display Name" value={profile.displayName} onChangeText={v => handleChange('displayName', v)} />
      <TextInput style={styles.input} placeholder="Nickname" value={profile.nickname} onChangeText={v => handleChange('nickname', v)} />
      <TextInput style={styles.input} placeholder="Age" value={profile.age} onChangeText={v => handleChange('age', v)} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Gender" value={profile.gender} onChangeText={v => handleChange('gender', v)} />
      <View style={styles.buttonRow}>
        <Button title="Save Locally" onPress={handleSaveLocal} />
        <Button title={isSyncing ? 'Syncing...' : 'Sync to Server'} onPress={handleSync} disabled={isSyncing} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});

export default AccountSettingsScreen;
