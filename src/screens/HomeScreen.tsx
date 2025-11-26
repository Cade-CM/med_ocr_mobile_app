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
import {SchedulingService} from '@services/SchedulingService';
import {MaterialIcons as Icon} from '@expo/vector-icons';
import { useAppData } from '../context/AppDataContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const { medications, refreshMedications } = useAppData();
  const [refreshing, setRefreshing] = useState(false);

  // Always have a real array, even if something goes weird
  const medList: any[] = Array.isArray(medications) ? medications : [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshMedications();
    setRefreshing(false);
  };

  const handleAddMedication = () => {
    navigation.navigate('LabelCapture');
  };

  const handleMedicationPress = (medication: any) => {
    navigation.navigate('MedicationDetails', {
      medication,
    });
  };

  const renderMedicationCard = ({ item }: { item: any }) => {
    // Normalize fields for both backend and app-shaped objects
    const raw = item as any;
    const name = item.drugName ?? raw.drug_name ?? 'Unknown med';
    const strength = item.strength ?? raw.strength ?? '';
    const dosage = item.dosage ?? raw.dosage ?? raw.qty_text ?? '';
    const frequency = item.frequency ?? raw.frequency ?? raw.frequency_text ?? '';
    const instructions = item.instructions ?? raw.instructions ?? raw.instruction ?? '';
    const rfidTagId = item.rfidTagId ?? raw.rfid_tag_id ?? '';
    const quantity = item.quantity ?? raw.quantity ?? raw.qty ?? raw.qty_text ?? '';
    const refills = item.refills ?? raw.refills ?? raw.refills_text ?? '';
    const isActive = item.isActive ?? raw.isActive ?? raw.is_active ?? '';
    const createdAt = item.createdAt ?? raw.createdAt ?? raw.created_at ?? '';
    const updatedAt = item.updatedAt ?? raw.updatedAt ?? raw.updated_at ?? '';
    const medicationKey = item.medication_key ?? raw.medication_key ?? '';
    const userKey = item.user_key ?? raw.user_key ?? '';
    const nextDose = SchedulingService.getNextDoseTime(item);

    return (
      <TouchableOpacity
        style={styles.medicationCard}
        onPress={() => handleMedicationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.medicationIcon}>
          <Icon name="medication" size={32} color="#007AFF" />
        </View>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>{name}</Text>
          {strength ? (
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>Strength: {strength}</Text>
          ) : null}
          {dosage ? (
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>Dosage: {dosage}</Text>
          ) : null}
          {frequency ? (
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>Frequency: {frequency}</Text>
          ) : null}
          {instructions ? (
            <Text style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Instructions: {instructions}</Text>
          ) : null}
          {quantity ? (
            <Text style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Quantity: {quantity}</Text>
          ) : null}
          {refills ? (
            <Text style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Refills: {refills}</Text>
          ) : null}
          {isActive !== '' ? (
            <Text style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Active: {String(isActive)}</Text>
          ) : null}
          {createdAt ? (
            <Text style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Created: {String(createdAt)}</Text>
          ) : null}
          {updatedAt ? (
            <Text style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Updated: {String(updatedAt)}</Text>
          ) : null}
          {medicationKey ? (
            <Text style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginBottom: 2 }}>MedKey: {String(medicationKey)}</Text>
          ) : null}
          {userKey ? (
            <Text style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginBottom: 2 }}>UserKey: {String(userKey)}</Text>
          ) : null}
          {rfidTagId ? (
            <Text style={{ fontSize: 12, color: '#34C759', fontFamily: 'monospace', marginBottom: 2 }}>RFID: {rfidTagId.substring(0, 16)}...</Text>
          ) : null}
          {nextDose && (
            <View style={styles.nextDoseContainer}>
              <Icon name="access-time" size={16} color="#666" />
              <Text style={styles.nextDoseText}>
                Next: {SchedulingService.formatTime(nextDose)}
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
        keyExtractor={(item: any) => String(item.id ?? item.medication_key ?? Math.random())}
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
