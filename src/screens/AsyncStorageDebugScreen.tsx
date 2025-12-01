import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AsyncStorageDebugScreen: React.FC = () => {
  const [storage, setStorage] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  const loadStorage = async () => {
    setLoading(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const entries = await AsyncStorage.multiGet(keys);
      const data: { [key: string]: string } = {};
      entries.forEach(([key, value]) => {
        data[key] = value || '';
      });
      setStorage(data);
    } catch (e) {
      setStorage({ error: 'Failed to load AsyncStorage' });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStorage();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AsyncStorage Debug</Text>
      <Button title="Refresh" onPress={loadStorage} />
      {loading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : (
        Object.keys(storage).map((key) => (
          <View key={key} style={styles.item}>
            <Text style={styles.key}>{key}</Text>
            <Text style={styles.value}>{storage[key]}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  loading: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  item: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  key: {
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  value: {
    color: '#333',
    fontSize: 15,
  },
});

export default AsyncStorageDebugScreen;
