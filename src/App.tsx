import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from './screens/HomeScreen';
import LabelCaptureScreen from './screens/LabelCaptureScreen';
import MedicationReviewScreen from './screens/MedicationReviewScreen';
import MedicationScheduleScreen from './screens/MedicationScheduleScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';

import {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else {
            iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{title: 'Medications'}}
      />
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{title: 'Dashboard'}}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="LabelCapture"
            component={LabelCaptureScreen}
            options={{
              title: 'Scan Prescription Label',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="MedicationReview"
            component={MedicationReviewScreen}
            options={{
              title: 'Review Medication',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="MedicationSchedule"
            component={MedicationScheduleScreen}
            options={{
              title: 'Set Schedule',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
