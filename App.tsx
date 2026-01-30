import React, { useState, useEffect } from 'react';
import { AppDataProvider } from './src/context/AppDataContext';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from './src/types';
import { TouchableOpacity, Text } from 'react-native';
import { supabase } from './src/config/supabase';

// Screens - Auth
import SplashScreen from './src/screens/auth/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import ProfileSetupScreen from './src/screens/auth/ProfileSetupScreen';

// Screens - Medications
import HomeScreen from './src/screens/medications/HomeScreen';
import MedicationReviewScreen from './src/screens/medications/MedicationReviewScreen';
import MedicationScheduleScreen from './src/screens/medications/MedicationScheduleScreen';
import MedicationDetailsScreen from './src/screens/medications/MedicationDetailsScreen';
import MedicationConfirmationScreen from './src/screens/medications/MedicationConfirmationScreen';
import LinkRFIDScreen from './src/screens/medications/LinkRFIDScreen';

// Screens - Capture
import LabelCaptureScreen from './src/screens/capture/LabelCaptureScreen';
import LiveScannerScreen from './src/screens/capture/LiveScannerScreen';

// Screens - Schedule
import ScheduleCalendarScreen from './src/screens/schedule/ScheduleCalendarScreen';
import ScheduleSettingsScreen from './src/screens/schedule/ScheduleSettingsScreen';

// Screens - Dashboard
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import AdherenceHistoryScreen from './src/screens/dashboard/AdherenceHistoryScreen';

// Screens - Settings
import SettingsScreen from './src/screens/settings/SettingsScreen';
import EditProfileScreen from './src/screens/settings/EditProfileScreen';
import ChangePasswordScreen from './src/screens/settings/ChangePasswordScreen';

// Screens - Debug
import AsyncStorageDebugScreen from './src/screens/debug/AsyncStorageDebugScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Tab navigator param list - only tab-specific routes
type TabParamList = {
  HomeTab: undefined;
  ScheduleCalendar: undefined;
  DashboardTab: undefined;
  SettingsTab: undefined;
};
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Medications',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="medication" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScheduleCalendar"
        component={ScheduleCalendarScreen}
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-today" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      // Use Supabase session as single source of truth, not AsyncStorage flag
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(session !== null && session.user !== null);
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsSessionLoading(false);
    }
  };

  // Handle splash screen finish
  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Show splash screen while either:
  // 1. The animated splash is still showing, OR
  // 2. We're still checking the session
  // This prevents any flash of the wrong screen
  if (showSplash || isSessionLoading) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <AppDataProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={isLoggedIn ? 'Home' : 'Login'}>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LabelCapture"
            component={LabelCaptureScreen}
            options={({ navigation }) => ({
              title: 'Scan Prescription Label',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => {
                    console.log('Manual Entry button pressed');
                    navigation.navigate('MedicationReview', {
                      imageUri: '',
                      rawOcrText: '',
                      parsedData: undefined,
                      editMode: false,
                    });
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15, padding: 5 }}
                >
                  <MaterialIcons name="edit" size={20} color="white" style={{ marginRight: 5 }} />
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Manual</Text>
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen
            name="LiveScanner"
            component={LiveScannerScreen}
            options={{
              headerShown: false, // Full screen camera experience
            }}
          />
          <Stack.Screen
            name="MedicationReview"
            component={MedicationReviewScreen}
            options={{
              title: 'Review Medication',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
            }}
          />
          <Stack.Screen
            name="MedicationSchedule"
            component={MedicationScheduleScreen}
            options={{
              title: 'Set Reminders',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
            }}
          />
          <Stack.Screen
            name="MedicationDetails"
            component={MedicationDetailsScreen}
            options={{
              title: 'Medication Details',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
            }}
          />
          <Stack.Screen
            name="LinkRFID"
            component={LinkRFIDScreen}
            options={{
              title: 'Link RFID Tag',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
            }}
          />
          <Stack.Screen
            name="ScheduleSettings"
            component={ScheduleSettingsScreen}
            options={{
              title: 'Schedule Settings',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
            }}
          />
          <Stack.Screen
            name="MedicationConfirmation"
            component={MedicationConfirmationScreen}
            options={{
              title: 'Confirm Medication',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
            }}
          />
          <Stack.Screen
            name="AdherenceHistory"
            component={AdherenceHistoryScreen}
            options={{
              title: 'Adherence History',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
            }}
          />
          <Stack.Screen
            name="EditProfileScreen"
            component={EditProfileScreen}
            options={{
              title: 'Edit Profile',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
            }}
          />
          <Stack.Screen
            name="ChangePasswordScreen"
            component={ChangePasswordScreen}
            options={{
              title: 'Change Password',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
            }}
          />
          <Stack.Screen
            name="AsyncStorageDebugScreen"
            component={AsyncStorageDebugScreen}
            options={{
              title: 'AsyncStorage Debug',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: 'white',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AppDataProvider>
  );
}
