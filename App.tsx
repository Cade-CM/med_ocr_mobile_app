import React, { useState, useEffect } from 'react';
import { AppDataProvider } from './src/context/AppDataContext';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from './src/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, TouchableOpacity, Text } from 'react-native';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import LabelCaptureScreen from './src/screens/LabelCaptureScreen';
import MedicationReviewScreen from './src/screens/MedicationReviewScreen';
import MedicationScheduleScreen from './src/screens/MedicationScheduleScreen';
import MedicationDetailsScreen from './src/screens/MedicationDetailsScreen';
import LinkRFIDScreen from './src/screens/LinkRFIDScreen';
import ScheduleCalendarScreen from './src/screens/ScheduleCalendarScreen';
import ScheduleSettingsScreen from './src/screens/ScheduleSettingsScreen';
import MedicationConfirmationScreen from './src/screens/MedicationConfirmationScreen';
import AdherenceHistoryScreen from './src/screens/AdherenceHistoryScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

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
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const loginStatus = await AsyncStorage.getItem('isLoggedIn');
      setIsLoggedIn(loginStatus === 'true');
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
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
        </Stack.Navigator>
      </NavigationContainer>
    </AppDataProvider>
  );
}
