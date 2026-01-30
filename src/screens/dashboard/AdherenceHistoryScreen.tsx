import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Medication, AdherenceRecord } from '@types';
import { MaterialIcons } from '@expo/vector-icons';
import { StorageService } from '@services/StorageService';

type Props = NativeStackScreenProps<RootStackParamList, 'AdherenceHistory'>;

const AdherenceHistoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { medicationId } = route.params;
  
  const [medication, setMedication] = useState<Medication | null>(null);
  const [records, setRecords] = useState<AdherenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    taken: 0,
    missed: 0,
    skipped: 0,
    onTime: 0,
    late: 0,
    adherencePercentage: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load medication
      const medications = await StorageService.getMedications();
      const med = medications.find(m => m.id === medicationId);
      
      if (!med) {
        Alert.alert('Error', 'Medication not found');
        navigation.goBack();
        return;
      }
      
      setMedication(med);
      
      // Load adherence records
      const allRecords = await StorageService.getAdherenceRecords();
      const medRecords = allRecords
        .filter(r => Array.isArray(r) ? r.medicationId === medicationId : false)
        .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
      
      setRecords(medRecords);
      calculateStats(medRecords);
      
    } catch (error) {
      console.error('Error loading adherence data:', error);
      Alert.alert('Error', 'Failed to load adherence history');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (records: AdherenceRecord[]) => {
    const total = Array.isArray(records) ? records.length : 0;
    const safeRecords = Array.isArray(records) ? records : [];
    const taken = Array.isArray(safeRecords) ? safeRecords.filter(r => r.status === 'taken').length : 0;
    const missed = Array.isArray(safeRecords) ? safeRecords.filter(r => r.status === 'missed').length : 0;
    const skipped = Array.isArray(safeRecords) ? safeRecords.filter(r => r.status === 'skipped').length : 0;
    const onTime = Array.isArray(safeRecords) ? safeRecords.filter(r => r.isOnTime === true).length : 0;
    const late = Array.isArray(records) ? records.filter(r => r.status === 'taken' && r.isOnTime === false).length : 0;
    const adherencePercentage = total > 0 ? Math.round((taken / total) * 100) : 0;
    
    // Calculate current streak
    let streak = 0;
    for (let i = 0; i < (Array.isArray(records) ? records.length : 0); i++) {
      if (records[i].status === 'taken') {
        streak++;
      } else {
        break;
      }
    }
    
    setStats({
      total,
      taken,
      missed,
      skipped,
      onTime,
      late,
      adherencePercentage,
      currentStreak: streak,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return { name: 'check-circle', color: '#34C759' };
      case 'missed':
        return { name: 'cancel', color: '#FF3B30' };
      case 'skipped':
        return { name: 'remove-circle', color: '#FF9500' };
      case 'pending':
        return { name: 'schedule', color: '#999' };
      default:
        return { name: 'help', color: '#999' };
    }
  };

  const getConfirmationIcon = (method?: string) => {
    switch (method) {
      case 'rfid':
        return { name: 'nfc', color: '#007AFF' };
      case 'manual':
        return { name: 'touch-app', color: '#007AFF' };
      case 'skipped':
        return { name: 'remove-circle-outline', color: '#FF9500' };
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  if (!medication) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Medication not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.medicationName}>{medication.drugName}</Text>
          {medication.strength && (
            <Text style={styles.medicationStrength}>{medication.strength}</Text>
          )}
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.primaryStatCard]}>
            <Text style={styles.primaryStatValue}>{stats.adherencePercentage}%</Text>
            <Text style={styles.primaryStatLabel}>Adherence Rate</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialIcons name="check-circle" size={24} color="#34C759" />
              <Text style={styles.statValue}>{stats.taken}</Text>
              <Text style={styles.statLabel}>Taken</Text>
            </View>

            <View style={styles.statCard}>
              <MaterialIcons name="local-fire-department" size={24} color="#FF9500" />
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>

            <View style={styles.statCard}>
              <MaterialIcons name="schedule" size={24} color="#34C759" />
              <Text style={styles.statValue}>{stats.onTime}</Text>
              <Text style={styles.statLabel}>On Time</Text>
            </View>

            <View style={styles.statCard}>
              <MaterialIcons name="cancel" size={24} color="#FF3B30" />
              <Text style={styles.statValue}>{stats.missed}</Text>
              <Text style={styles.statLabel}>Missed</Text>
            </View>
          </View>
        </View>

        {/* History List */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>History ({Array.isArray(records) ? records.length : 0} records)</Text>
          
          {(Array.isArray(records) ? records.length : 0) === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="history" size={64} color="#CCC" />
              <Text style={styles.emptyStateText}>No adherence records yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Your medication confirmations will appear here
              </Text>
            </View>
          ) : (
            records.map((record) => {
              const statusIcon = getStatusIcon(record.status);
              const confirmIcon = getConfirmationIcon(record.confirmationMethod);
              
              return (
                <View key={record.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={styles.recordStatus}>
                      <MaterialIcons 
                        name={statusIcon.name as any} 
                        size={24} 
                        color={statusIcon.color} 
                      />
                      <Text style={[styles.recordStatusText, { color: statusIcon.color }]}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Text>
                    </View>
                    
                    {record.isOnTime && record.status === 'taken' && (
                      <View style={styles.onTimeBadge}>
                        <Text style={styles.onTimeBadgeText}>On Time</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.recordDetails}>
                    <View style={styles.recordRow}>
                      <MaterialIcons name="event" size={16} color="#666" />
                      <Text style={styles.recordText}>
                        {formatDate(record.scheduledTime)} at {formatTime(record.scheduledTime)}
                      </Text>
                    </View>

                    {record.confirmedTime && (
                      <View style={styles.recordRow}>
                        <MaterialIcons name="check" size={16} color="#666" />
                        <Text style={styles.recordText}>
                          Confirmed at {formatTime(record.confirmedTime)}
                        </Text>
                      </View>
                    )}

                    {record.lateness && record.lateness > 0 && (
                      <View style={styles.recordRow}>
                        <MaterialIcons name="access-time" size={16} color="#FF9500" />
                        <Text style={[styles.recordText, { color: '#FF9500' }]}>
                          {record.lateness} minutes late
                        </Text>
                      </View>
                    )}

                    {confirmIcon && (
                      <View style={styles.recordRow}>
                        <MaterialIcons 
                          name={confirmIcon.name as any} 
                          size={16} 
                          color={confirmIcon.color} 
                        />
                        <Text style={styles.recordText}>
                          {record.confirmationMethod === 'rfid' ? 'RFID Scan' : 'Manual Confirmation'}
                        </Text>
                      </View>
                    )}

                    {record.notes && (
                      <Text style={styles.recordNotes}>{record.notes}</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Export Button */}
        {(Array.isArray(records) ? records.length : 0) > 0 && (
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => Alert.alert('Export', 'Export feature coming soon')}
          >
            <MaterialIcons name="file-download" size={20} color="#007AFF" />
            <Text style={styles.exportButtonText}>Export History</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    color: '#FF3B30',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  medicationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  medicationStrength: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statsContainer: {
    marginBottom: 30,
  },
  primaryStatCard: {
    alignItems: 'center',
    paddingVertical: 25,
    marginBottom: 15,
  },
  primaryStatValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#34C759',
  },
  primaryStatLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  historySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 5,
    textAlign: 'center',
  },
  recordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recordStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  onTimeBadge: {
    backgroundColor: '#E8F9F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onTimeBadgeText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  recordDetails: {
    gap: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordText: {
    fontSize: 14,
    color: '#666',
  },
  recordNotes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
    padding: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  exportButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AdherenceHistoryScreen;
