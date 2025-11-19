import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, Medication} from '@types';
import {StorageService} from '@services/StorageService';
import {SchedulingService} from '@services/SchedulingService';
import Icon from 'react-native-vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadMedications = async () => {
    const meds = await StorageService.getMedications();
    setMedications(meds);
  };

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedications();
    setRefreshing(false);
  };

  const handleAddMedication = () => {
    navigation.navigate('LabelCapture');
  };

  const handleDeleteMedication = (medication: Medication) => {
    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete ${medication.drugName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteMedication(medication.id);
            loadMedications();
          },
        },
      ],
    );
  };

  const renderMedicationCard = ({item}: {item: Medication}) => {
    const nextDose = SchedulingService.getNextDoseTime(item);
    
    return (
      <View style={styles.medicationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.medicationIcon}>
            <Icon name="medication" size={30} color="#007AFF" />
          </View>
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{item.drugName}</Text>
            <Text style={styles.medicationDosage}>{item.dosage}</Text>
            <Text style={styles.medicationFrequency}>{item.frequency}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteMedication(item)}
            style={styles.deleteButton}>
            <Icon name="delete-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        
        {nextDose && (
          <View style={styles.nextDoseContainer}>
            <Icon name="access-time" size={18} color="#666" />
            <Text style={styles.nextDoseText}>
              Next dose: {SchedulingService.formatTime(nextDose)}
            </Text>
          </View>
        )}

        <View style={styles.reminderTimesContainer}>
          <Text style={styles.reminderTimesLabel}>Daily reminders:</Text>
          <Text style={styles.reminderTimesText}>
            {SchedulingService.formatTimeList(item.reminderTimes)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="medication" size={80} color="#CCC" />
      <Text style={styles.emptyStateTitle}>No Medications Added</Text>
      <Text style={styles.emptyStateText}>
        Tap the button below to scan your first prescription label
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={medications}
        renderItem={renderMedicationCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddMedication}>
        <Icon name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    padding: 15,
    paddingBottom: 80,
  },
  medicationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  medicationFrequency: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 5,
  },
  nextDoseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  nextDoseText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '600',
  },
  reminderTimesContainer: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
  },
  reminderTimesLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  reminderTimesText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});

export default HomeScreen;
