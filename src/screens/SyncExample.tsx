import React, {useEffect} from 'react';
import {View, Text, Button, StyleSheet, Alert} from 'react-native';
import {SyncService} from '@services/SyncService';

/**
 * Example component showing how to use SyncService
 * 
 * Add this to your HomeScreen, DashboardScreen, or create a new SyncScreen
 */
export default function SyncExample() {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);
  const [backendStatus, setBackendStatus] = React.useState<'online' | 'offline' | 'checking'>('checking');

  // Check backend status on mount
  useEffect(() => {
    checkBackendStatus();
  }, []);

  // Auto-sync every 5 minutes (optional)
  useEffect(() => {
    const interval = setInterval(() => {
      handleAutoSync();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const checkBackendStatus = async () => {
    setBackendStatus('checking');
    const isAvailable = await SyncService.isBackendAvailable();
    setBackendStatus(isAvailable ? 'online' : 'offline');
  };

  const handleFullSync = async () => {
    try {
      setIsSyncing(true);
      await SyncService.fullSync();
      setLastSync(new Date());
      Alert.alert('Success', 'Data synchronized successfully');
    } catch (error) {
      Alert.alert('Sync Failed', 'Could not sync data. Please check your connection.');
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoSync = async () => {
    // Silent auto-sync (no alerts)
    try {
      await SyncService.autoSync();
      setLastSync(new Date());
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  };

  const handleSyncToBackend = async () => {
    try {
      setIsSyncing(true);
      await SyncService.syncMedicationsToBackend();
      await SyncService.syncAdherenceToBackend();
      setLastSync(new Date());
      Alert.alert('Success', 'Local data pushed to backend');
    } catch (error) {
      Alert.alert('Push Failed', 'Could not push data to backend.');
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncFromBackend = async () => {
    try {
      setIsSyncing(true);
      await SyncService.syncMedicationsFromBackend();
      setLastSync(new Date());
      Alert.alert('Success', 'Remote data pulled to local storage');
    } catch (error) {
      Alert.alert('Pull Failed', 'Could not pull data from backend.');
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Data Sync</Text>
      
      {/* Backend Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Backend Status:</Text>
        <View style={[
          styles.statusIndicator,
          backendStatus === 'online' && styles.statusOnline,
          backendStatus === 'offline' && styles.statusOffline,
          backendStatus === 'checking' && styles.statusChecking,
        ]}>
          <Text style={styles.statusText}>
            {backendStatus === 'online' ? '🟢 Online' : 
             backendStatus === 'offline' ? '🔴 Offline' : 
             '🟡 Checking...'}
          </Text>
        </View>
        <Button title="Refresh" onPress={checkBackendStatus} />
      </View>

      {/* Last Sync Time */}
      {lastSync && (
        <Text style={styles.lastSync}>
          Last synced: {lastSync.toLocaleString()}
        </Text>
      )}

      {/* Sync Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title={isSyncing ? 'Syncing...' : 'Full Sync (Push & Pull)'}
          onPress={handleFullSync}
          disabled={isSyncing || backendStatus === 'offline'}
        />
        
        <Button
          title="Push to Backend"
          onPress={handleSyncToBackend}
          disabled={isSyncing || backendStatus === 'offline'}
        />
        
        <Button
          title="Pull from Backend"
          onPress={handleSyncFromBackend}
          disabled={isSyncing || backendStatus === 'offline'}
        />
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          💡 <Text style={styles.infoBold}>Full Sync:</Text> Push local changes and pull remote changes
        </Text>
        <Text style={styles.infoText}>
          📤 <Text style={styles.infoBold}>Push:</Text> Send local medications to backend
        </Text>
        <Text style={styles.infoText}>
          📥 <Text style={styles.infoBold}>Pull:</Text> Get medications from backend
        </Text>
        <Text style={styles.infoText}>
          🔄 <Text style={styles.infoBold}>Auto-sync:</Text> Runs every 5 minutes automatically
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusOnline: {
    backgroundColor: '#d4edda',
  },
  statusOffline: {
    backgroundColor: '#f8d7da',
  },
  statusChecking: {
    backgroundColor: '#fff3cd',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastSync: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 30,
  },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
  infoBold: {
    fontWeight: '600',
  },
});
