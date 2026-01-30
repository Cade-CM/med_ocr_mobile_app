import React, {useState, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, Medication} from '@types';
import {SchedulingService} from '@services/SchedulingService';
import {MaterialIcons as Icon} from '@expo/vector-icons';
import { useAppData } from '../../context/AppDataContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper to normalize medication fields once (avoid repeated computation in render)
const normalizeMedication = (item: any) => {
  const raw = item;
  return {
    id: item.id ?? raw.medication_key ?? Math.random(),
    name: item.drugName ?? raw.drug_name ?? 'Unknown med',
    strength: item.strength ?? raw.strength ?? '',
    dosage: item.dosage ?? raw.dosage ?? raw.qty_text ?? '',
    frequency: item.frequency ?? raw.frequency ?? raw.frequency_text ?? '',
    instructions: item.instructions ?? raw.instructions ?? raw.instruction ?? '',
    rfidTagId: item.rfidTagId ?? raw.rfid_tag_id ?? '',
    quantity: item.quantity ?? raw.quantity ?? raw.qty ?? raw.qty_text ?? '',
    refills: item.refills ?? raw.refills ?? raw.refills_text ?? '',
    nextDose: SchedulingService.getNextDoseTime(item),
    raw: item, // Keep original for navigation
  };
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { medications, refreshMedications } = useAppData();
  const [refreshing, setRefreshing] = useState(false);

  // Memoize normalized medication list - only recomputes when medications change
  const medList = useMemo(() => {
    const meds = Array.isArray(medications) ? medications : [];
    return meds.map(normalizeMedication);
  }, [medications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMedications();
    setRefreshing(false);
  }, [refreshMedications]);

  const handleAddMedication = useCallback(() => {
    navigation.navigate('LabelCapture');
  }, [navigation]);

  const handleMedicationPress = useCallback((medication: any) => {
    navigation.navigate('MedicationDetails', {
      medication,
    });
  }, [navigation]);

  // Uses pre-normalized data from useMemo above
  const renderMedicationCard = ({ item }: { item: ReturnType<typeof normalizeMedication> }) => {
    return (
      <TouchableOpacity
        style={styles.medicationCard}
        onPress={() => handleMedicationPress(item.raw)}
        activeOpacity={0.7}
      >
        <View style={styles.medicationIcon}>
          <Icon name="medication" size={32} color="#007AFF" />
        </View>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>{item.name}</Text>
          {item.strength ? (
            <Text style={styles.detailText}>Strength: {item.strength}</Text>
          ) : null}
          {item.dosage ? (
            <Text style={styles.detailText}>Dosage: {item.dosage}</Text>
          ) : null}
          {item.frequency ? (
            <Text style={styles.detailText}>Frequency: {item.frequency}</Text>
          ) : null}
          {item.instructions ? (
            <Text style={styles.secondaryText}>Instructions: {item.instructions}</Text>
          ) : null}
          {item.quantity ? (
            <Text style={styles.secondaryText}>Quantity: {item.quantity}</Text>
          ) : null}
          {item.refills ? (
            <Text style={styles.secondaryText}>Refills: {item.refills}</Text>
          ) : null}
          {item.rfidTagId ? (
            <Text style={styles.rfidText}>RFID: {item.rfidTagId.substring(0, 16)}...</Text>
          ) : null}
          {item.nextDose && (
            <View style={styles.nextDoseContainer}>
              <Icon name="access-time" size={16} color="#666" />
              <Text style={styles.nextDoseText}>
                Next: {SchedulingService.formatTime(item.nextDose)}
              </Text>
            </View>
          )}
        </View>
        <Icon name="chevron-right" size={24} color="#CCC" />
      </TouchableOpacity>
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
        data={medList}
        renderItem={renderMedicationCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddMedication}>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  secondaryText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  rfidText: {
    fontSize: 12,
    color: '#34C759',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  nextDoseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextDoseText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
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
