import React, { useState } from 'react';
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
import { loginUser } from '@services/BackendService';
import { signInWithGoogle } from '@services/OAuthService';
import { authStyles as styles, colors } from '../../styles/authStyles';

// Google OAuth is enabled - configured in Supabase Dashboard
const GOOGLE_OAUTH_ENABLED = true;

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        // No need to store user_key - Supabase Auth session handles this
        // The session is persisted by Supabase client's SecureStore adapter
        // Non-sensitive app state can stay in AsyncStorage
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('authMethod', 'email');
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

  // Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      
      if (result.success && result.user) {
        // OAuth successful - session is already set by Supabase
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('authMethod', 'google');
        navigation.replace('Home');
      } else {
        if (result.error !== 'Sign-in cancelled') {
          Alert.alert('Sign-In Failed', result.error || 'Failed to sign in with Google');
        }
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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

            {/* Google Sign-In Button */}
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                <View style={[styles.socialCircle, styles.googleCircle]}>
                  <Text style={styles.socialIconText}>G</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Google</Text>
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
