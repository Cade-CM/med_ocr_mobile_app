import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

// Adjust this to match your types
export type Medication = {
  id: number;
  user_key: string;
  medication_key: string;
  drug_name?: string | null;
  strength?: string | null;
  route?: string | null;
  instruction?: string | null;
  frequency_text?: string | null;
  qty_text?: string | null;
  refills_text?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AppDataContextValue = {
  medications: Medication[];
  setMedications: (meds: Medication[]) => void;
  refreshMedications: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

// TODO: set this from your config
const API_BASE_URL = "http://10.0.0.26:8000";
const WS_URL = "ws://10.0.0.26:8000/ws/updates";

import AsyncStorage from '@react-native-async-storage/async-storage';

async function getCurrentUserKey(): Promise<string> {
  const key = await AsyncStorage.getItem('user_key');
  if (!key) throw new Error('No user_key found');
  return key;
}

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [userKey, setUserKey] = useState<string | null>(null);

  // On startup, load userKey
  useEffect(() => {
    let isMounted = true;
    getCurrentUserKey()
      .then(key => {
        if (isMounted) setUserKey(key);
      })
      .catch(err => {
        console.warn("Failed to load userKey", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshMedications = useCallback(async () => {
    if (!userKey) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/medications?user_key=${encodeURIComponent(userKey)}`
      );
      if (!res.ok) {
        console.warn("Failed to fetch medications", res.status);
        return;
      }
      const data: Medication[] = await res.json();
      setMedications(data);
    } catch (err) {
      console.warn("Error fetching medications", err);
    }
  }, [userKey]);

  // Initial load when userKey becomes available
  useEffect(() => {
    if (userKey) {
      refreshMedications();
    }
  }, [userKey, refreshMedications]);

  // WebSocket live sync
  useEffect(() => {
    if (!userKey) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("WS connected");
      // optional hello / ping
      ws.send("hello");
    };

    ws.onmessage = event => {
      try {
        const msg = JSON.parse(event.data);
        // Our backend trigger sends { table, operation, id, user_key }
        if (msg.table === "medications" && msg.user_key === userKey) {
          console.log("Medication change notification", msg);
          // For now, simplest approach: refetch the medications list
          refreshMedications();
        }
        // Later, if you add triggers for other tables, handle them here
      } catch (err) {
        console.warn("Bad WS message", err, event.data);
      }
    };

    ws.onerror = err => {
      console.warn("WS error", err);
    };

    ws.onclose = () => {
      console.log("WS closed");
    };

    return () => {
      ws.close();
    };
  }, [userKey, refreshMedications]);

  const value: AppDataContextValue = {
    medications,
    setMedications,
    refreshMedications,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }
  return ctx;
}
