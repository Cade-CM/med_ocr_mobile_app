import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { signupUser, UserResponse } from '@services/BackendService';
import { supabase } from '@config/supabase';
import { authStyles as styles } from '../../styles/authStyles';


type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);


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
      if (!email.trim()) {
        Alert.alert('Missing Email', 'Please enter your email address.');
        return;
      }
      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /\S+@\S+\.\S+/;
      if (!emailRegex.test(trimmedEmail)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
      if (!password) {
        Alert.alert('Missing Password', 'Please enter a password.');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Weak Password', 'Password should be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.');
        return;
      }
      setIsLoading(true);
      setTimeoutError(false);
      try {
        // Note: user_key is set by Supabase Auth (uses auth.uid() UUID)
        const request = {
          email: trimmedEmail,
          display_name: '',
          password,
          first_name: '',
          last_name: ''
        };
        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => {
          setTimeoutError(true);
          reject(new Error('Request timed out. Please check your internet connection and try again.'));
        }, 10000));
        const user: UserResponse = await Promise.race([signupUser(request), timeoutPromise]);
        console.log('Sign up successful, user:', user);
        
        // Check if we have an active session (email confirmation may be required)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Session active - proceed to profile setup
          await AsyncStorage.setItem('isLoggedIn', 'true');
          await AsyncStorage.setItem('authMethod', 'email');
          navigation.replace('ProfileSetup', { email: trimmedEmail, authMethod: 'email' });
        } else {
          // No session - email confirmation likely required
          const message = 'Account created! Please check your email to confirm your account, then sign in.';
          if (Platform.OS === 'web') {
            window.alert(message);
          } else {
            Alert.alert('Check Your Email', message);
          }
          navigation.replace('Login');
        }
      } catch (error: any) {
        console.error('Error during sign up:', error);
        let message = 'Failed to create account. Please try again.';
        if (timeoutError) {
          message = 'Sign-up request timed out. Please check your internet connection and try again.';
        } else if (error?.message) {
          message = error.message;
        }
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Error', message);
        }
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
              source={require('../../../assets/MedBuddyLogo.png')}
              style={styles.logoImage}
            />
            <Text style={styles.title}>MedBuddy</Text>
            <Text style={styles.subtitle}>Create your account</Text>
          </View>

          {/* Show loading spinner if signing up */}
          {isLoading && (
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={{ marginTop: 8 }}>Creating account...</Text>
            </View>
          )}

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
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            {/* Divider and Social Sign-In - Currently disabled */}
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
                  <Text style={styles.socialIconText}>G</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleSignIn}
                disabled={isLoading}
              >
                <View style={[styles.socialCircle, styles.appleCircle]}>
                  <Text style={styles.socialIconText}>A</Text>
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

export default SignUpScreen;
