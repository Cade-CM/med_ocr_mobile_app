import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import * as BackendService from '@services/BackendService';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    // Fetch profile from backend (RLS ensures we get current user's data)
    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const profile = await BackendService.fetchUserProfile();
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setEmail(profile.email || '');
        setNickname(profile.nickname || '');
        setAge(profile.age?.toString() || '');
        setGender(profile.gender || '');
      } catch (error) {
        console.error('Error loading profile:', error);
        // Don't show error alert - user may be new with no profile yet
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Save to backend via BackendService (RLS ensures correct user)
      await BackendService.updateUserProfile({
        first_name: firstName,
        last_name: lastName,
        email: email,
        nickname: nickname || undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        display_name: `${firstName} ${lastName}`.trim(),
      });
      
      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    } catch (e: any) {
      console.error('Error saving profile:', e);
      Alert.alert('Error', e.message || 'Failed to save profile.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            {/* You can add your logo here if desired */}
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>Update your personal information</Text>
          </View>
          <View style={styles.formContainer}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              editable={!isLoading}
            />
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              editable={!isLoading}
            />
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />
            <Text style={styles.label}>Nickname (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your nickname"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              editable={!isLoading}
            />
            <Text style={styles.label}>Age *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your age"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              returnKeyType="done"
              editable={!isLoading}
            />
            <Text style={styles.label}>Gender *</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'Male' && styles.genderButtonSelected]}
                onPress={() => setGender('Male')}
                disabled={isLoading}
              >
                <Text style={[styles.genderButtonText, gender === 'Male' && styles.genderButtonTextSelected]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'Female' && styles.genderButtonSelected]}
                onPress={() => setGender('Female')}
                disabled={isLoading}
              >
                <Text style={[styles.genderButtonText, gender === 'Female' && styles.genderButtonTextSelected]}>Female</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'Other' && styles.genderButtonSelected]}
                onPress={() => setGender('Other')}
                disabled={isLoading}
              >
                <Text style={[styles.genderButtonText, gender === 'Other' && styles.genderButtonTextSelected]}>Other</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.completeButton, isLoading && styles.disabledButton]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.completeButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    color: '#666',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  genderButtonSelected: {
    backgroundColor: '#007BFF',
    borderColor: '#007BFF',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#333',
  },
  genderButtonTextSelected: {
    color: 'white',
  },
  completeButton: {
    backgroundColor: '#007BFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#A5C8FF',
  },
});

export default EditProfileScreen;
