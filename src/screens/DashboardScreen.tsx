import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {PatientStats} from '@types';
import {StorageService} from '@services/StorageService';
import {MaterialIcons as Icon} from '@expo/vector-icons';

const {width} = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<PatientStats>({
    totalMedications: 0,
    adherencePercentage: 0,
    currentStreak: 0,
    longestStreak: 0,
    missedDoses: 0,
    onTimeDoses: 0,
  });
  // Move all safe array guards to the top of the component
  // If missedDoses is a number, use it directly. If it's an array, use its length. Otherwise, fallback to 0.
  let safeMissedDoses = 0;
  if (Array.isArray(stats?.missedDoses)) {
    safeMissedDoses = stats.missedDoses.length;
  } else if (typeof stats?.missedDoses === 'number') {
    safeMissedDoses = stats.missedDoses;
  }
  const safeRecords = Array.isArray(stats?.records) ? stats.records : [];
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    const patientStats = await StorageService.getPatientStats();
    setStats(patientStats);
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const getAdherenceColor = (percentage: number) => {
    if (percentage >= 80) return '#34C759';
    if (percentage >= 60) return '#FF9500';
    return '#FF3B30';
  };

  const adherenceColor = getAdherenceColor(stats.adherencePercentage);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>
          Track your medication adherence journey
        </Text>

        {/* Adherence Circle */}
        <View style={styles.adherenceCircleContainer}>
          <View
            style={[styles.adherenceCircle, {borderColor: adherenceColor}]}
          >
            <Text style={[styles.adherencePercentage, {color: adherenceColor}]}>
              {stats.adherencePercentage.toFixed(0)}%
            </Text>
            <Text style={styles.adherenceLabel}>Adherence</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="medication" size={30} color="#007AFF" />
            <Text style={styles.statValue}>{stats.totalMedications}</Text>
            <Text style={styles.statLabel}>Active Medications</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="local-fire-department" size={30} color="#FF9500" />
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="emoji-events" size={30} color="#FFD700" />
            <Text style={styles.statValue}>{stats.longestStreak}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="check-circle" size={30} color="#34C759" />
            <Text style={styles.statValue}>{stats.onTimeDoses}</Text>
            <Text style={styles.statLabel}>On-Time Doses</Text>
          </View>
        </View>

        {/* Missed Doses */}
        {safeMissedDoses > 0 && (
          <View style={styles.warningCard}>
            <Icon name="warning" size={24} color="#FF9500" />
            <View style={styles.warningText}>
              <Text style={styles.warningTitle}>Missed Doses</Text>
              <Text style={styles.warningDescription}>
                You've missed {safeMissedDoses} doses. Try setting additional
                reminders to improve adherence.
              </Text>
            </View>
          </View>
        )}

        {/* Motivation Card */}
        {stats.currentStreak >= 7 && (
          <View style={styles.motivationCard}>
            <Icon name="celebration" size={40} color="#007AFF" />
            <Text style={styles.motivationTitle}>Amazing Job! 🎉</Text>
            <Text style={styles.motivationText}>
              You've maintained a {stats.currentStreak}-day streak! Keep up the
              great work!
            </Text>
          </View>
        )}

        {stats.currentStreak === 0 && stats.totalMedications > 0 && (
          <View style={styles.motivationCard}>
            <Icon name="track-changes" size={40} color="#007AFF" />
            <Text style={styles.motivationTitle}>Start Your Journey</Text>
            <Text style={styles.motivationText}>
              Take your medications on time today to start building your
              adherence streak!
            </Text>
          </View>
        )}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  adherenceCircleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  adherenceCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  adherencePercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  adherenceLabel: {
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  warningDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  motivationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 25,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  motivationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  motivationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default DashboardScreen;
