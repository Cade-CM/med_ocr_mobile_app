import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@types';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '@services/StorageService';
import { loginUser } from '@services/BackendService';
import { authStyles as styles, colors } from '../styles/authStyles';

// Conditionally import Google Sign-In only for dev builds
let GoogleSignin: any = null;
let statusCodes: any = null;
try {
  const googleSignin = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignin.GoogleSignin;
  statusCodes = googleSignin.statusCodes;
} catch (e) {
  console.log('Google Sign-In not available in Expo Go');
}

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In only if available
    if (GoogleSignin) {
      GoogleSignin.configure({
        webClientId: '954535377514-qhvgvhd911rsqfgs71a1advofu92iaso.apps.googleusercontent.com',
        offlineAccess: true,
      });
    }
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    // Validate inputs
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const userResponse = await loginUser(trimmedEmail, password);

      if (userResponse && userResponse.user_key) {
        await AsyncStorage.setItem('user_key', userResponse.user_key);
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('authMethod', 'email');
        if (userResponse.id != null) {
          await AsyncStorage.setItem('user_id', userResponse.id.toString());
        }
        navigation.replace('Home');
      } else {
        Alert.alert('Error', 'Invalid login response.');
      }
    } catch (error: any) {
      console.error('Error during login:', error);
      Alert.alert('Error', error?.message || 'Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please enter your email address to receive a password reset link.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: () => {
            if (!email.trim()) {
              Alert.alert('Error', 'Please enter your email address first');
              return;
            }
            if (!validateEmail(email)) {
              Alert.alert('Error', 'Please enter a valid email address');
              return;
            }
            // TODO: Implement password reset logic
            Alert.alert('Success', 'Password reset link sent to your email');
          },
        },
      ],
    );
  };

  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) {
      Alert.alert(
        'Not Available in Expo Go',
        'Google Sign-In requires a development build. Please use email/password for now.'
      );
      return;
    }
    
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Extract user data
      const user = userInfo.data?.user;
      if (!user) {
        throw new Error('No user data received');
      }
      
      // Check if user exists in de-identified system
      const userId = await StorageService.getUserIdFromEmail(user.email);
      
      if (userId) {
        // Existing user, login with de-identified ID
        await StorageService.loginUser(user.email);
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('authMethod', 'google');
        
        console.log('Existing Google user, navigating to home');
        navigation.replace('Home');
      } else {
        // New user, need to register and complete profile
        await StorageService.registerUser(user.email, '', '');
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('authMethod', 'google');
        
        console.log('New Google user, navigating to profile setup');
        navigation.replace('ProfileSetup', { email: user.email, authMethod: 'google' });
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow
        Alert.alert('Cancelled', 'Google Sign-In was cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Sign in is in progress
        Alert.alert('In Progress', 'Sign-In is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // Play services not available or outdated
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        // Some other error
        Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
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
              source={require('../../assets/MedBuddyLogo.png')}
              style={styles.logoImage}
            />
            <Text style={styles.title}>MedBuddy</Text>
            <Text style={styles.subtitle}>Welcome back</Text>
          </View>

          {/* Login Form */}
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
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Or Sign In With</Text>
              <View style={styles.divider} />
            </View>

            {/* Social Sign-In Buttons */}
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
                  <MaterialIcons name="apple" size={24} color="white" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Toggle to Sign Up */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}
                disabled={isLoading}
              >
                <Text style={styles.toggleLink}>Sign Up</Text>
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

export default LoginScreen;
