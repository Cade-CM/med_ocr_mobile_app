import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@types';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { StorageService } from '@services/StorageService';
import { signupUser, UserResponse } from '@services/BackendService';


type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


    // Google Sign-In logic temporarily disabled due to syntax errors
    // const handleGoogleSignIn = async () => {
    //   setIsLoading(true);
    //   try {
    //     await GoogleSignin.hasPlayServices();
    //     const userInfo = await GoogleSignin.signIn();
    //     // Extract user data
    //     const user = userInfo.data?.user;
    //     if (!user) {
    //       throw new Error('No user data received');
    //     }
    //     // Save authentication info
    //     await AsyncStorage.setItem('isLoggedIn', 'true');
    //     await AsyncStorage.setItem('authMethod', 'google');
    //     // Register user with de-identified ID (will complete profile next)
    //     const userId = await StorageService.registerUser(user.email, '', '');
    //     console.log('Google Sign-In successful, user ID generated:', userId);
    //     // Navigate to profile setup to collect full name and demographics
    //     navigation.replace('ProfileSetup', { email: user.email, authMethod: 'google' });
    //   } catch (error: any) {
    //     console.error('Google Sign-In error:', error);
    //     if (error.code === statusCodes.SIGN_IN_CANCELLED) {
    //       Alert.alert('Cancelled', 'Google Sign-In was cancelled');
    //     } else if (error.code === statusCodes.IN_PROGRESS) {
    //       Alert.alert('In Progress', 'Sign-In is already in progress');
    //     } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    //       Alert.alert('Error', 'Google Play Services not available');
    //     } else {
    //       Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    //     }
    //   }
    //   setIsLoading(false);
    // };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      // Generate a de-identified user_key
      const user_key = `USR_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
      const request = { email: trimmedEmail, display_name: '', user_key };
      const user: UserResponse = await signupUser(request);
      await AsyncStorage.setItem('userPassword', password);
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('authMethod', 'email');
      await AsyncStorage.setItem('user_key', user.user_key);
      await AsyncStorage.setItem('user_id', user.id.toString());
      console.log('Sign up successful, user:', user);
      navigation.replace('ProfileSetup', { email: trimmedEmail, authMethod: 'email' });
    } catch (error) {
      console.error('Error during sign up:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement Apple Sign-In
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Coming Soon', 'Apple Sign-In will be available soon');
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      Alert.alert('Error', 'Failed to sign in with Apple');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo/Icon */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/MedBuddyLogo.png')}
              style={styles.logoImage}
            />
            <Text style={styles.title}>MedBuddy</Text>
            <Text style={styles.subtitle}>Create your account</Text>
          </View>

          {/* Sign Up Form */}
          <View style={styles.formContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              editable={!isLoading}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <MaterialIcons
                  name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.signUpButton, isLoading && styles.disabledButton]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <Text style={styles.signUpButtonText}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            {/* Divider and Social Sign-In */}
            {/* <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or sign up with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                <View style={[styles.socialCircle, styles.googleCircle]}>
                  <Text style={styles.googleText}>G</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleSignIn}
                disabled={isLoading}
              >
                <View style={[styles.socialCircle, styles.appleCircle]}>
                  <Text style={styles.googleText}>A</Text>
                </View>
              </TouchableOpacity>
            </View> */}

            {/* Toggle to Sign In */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                disabled={isLoading}
              >
                <Text style={styles.toggleLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footerText}>
            Your information is stored securely
          </Text>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  logoImage: {
    width: 80,
    height: 80,
    tintColor: '#007AFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
    paddingRight: 15,
  },
  signUpButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    minHeight: 52,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    color: '#999',
    fontSize: 14,
    marginHorizontal: 15,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  googleCircle: {
    backgroundColor: '#DB4437',
  },
  appleCircle: {
    backgroundColor: '#000000',
  },
  googleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    gap: 5,
  },
  toggleText: {
    color: '#666',
    fontSize: 14,
  },
  toggleLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 30,
  },
});

export default SignUpScreen;
