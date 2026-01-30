import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { supabase } from '@config/supabase';
import { 
  getCurrentUserKey, 
  onAuthStateChange,
  initializeAuthListener 
} from '@services/AuthService';
import { subscribeMedicationChanges, unsubscribeAll } from '@services/RealtimeService';

/**
 * Backend medication format - matches Supabase/API response schema.
 * Different from the frontend Medication type in @types which uses camelCase.
 */
export type BackendMedication = {
  id: number;
  user_key: string;
  medication_key: string | null;
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
  medications: BackendMedication[];
  setMedications: (meds: BackendMedication[]) => void;
  refreshMedications: () => Promise<void>;
  userKey: string | null;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [medications, setMedications] = useState<BackendMedication[]>([]);
  const [userKey, setUserKey] = useState<string | null>(null);
  const unsubscribeRealtimeRef = useRef<(() => void) | null>(null);
  const authListenerInitializedRef = useRef(false);

  // Initialize auth listener once and derive userKey from session
  useEffect(() => {
    if (authListenerInitializedRef.current) return;
    authListenerInitializedRef.current = true;

    // Get initial userKey from session first
    getCurrentUserKey()
      .then(key => {
        if (key) {
          setUserKey(key);
        }
      })
      .catch(err => {
        console.warn("No authenticated user on startup", err);
      });

    // Initialize the global auth listener
    const unsubscribeAuthListener = initializeAuthListener();

    // Subscribe to auth state changes for this context
    const unsubscribeAuthState = onAuthStateChange(async (event, session) => {
      console.log('📱 AppDataContext: Auth state changed:', event);

      if (event === 'SIGNED_OUT') {
        // Clear all state on logout
        setUserKey(null);
        setMedications([]);
        
        // Unsubscribe from realtime
        if (unsubscribeRealtimeRef.current) {
          unsubscribeRealtimeRef.current();
          unsubscribeRealtimeRef.current = null;
        }
      } else if (event === 'SIGNED_IN' && session?.user?.id) {
        // Clear previous user state before setting new userKey
        setMedications([]);
        if (unsubscribeRealtimeRef.current) {
          unsubscribeRealtimeRef.current();
          unsubscribeRealtimeRef.current = null;
        }
        // Set new user key from session
        setUserKey(session.user.id);
      }
    });

    return () => {
      unsubscribeAuthListener();
      unsubscribeAuthState();
    };
  }, []);

  // NOTE: Initial userKey fetch is now handled in the auth listener useEffect above
  // This prevents race conditions between initial fetch and auth state changes

  const refreshMedications = useCallback(async () => {
    if (!userKey) return;
    try {
      // Fetch medications directly from Supabase
      // RLS ensures we only get our own medications
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Failed to fetch medications", error);
        return;
      }
      
      setMedications(data || []);
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

  // Supabase Realtime subscription for live updates
  // Resubscribes when userKey changes (e.g., after login)
  useEffect(() => {
    if (!userKey) return;

    let isMounted = true;

    const setupRealtime = async () => {
      // Unsubscribe from any existing subscription first
      if (unsubscribeRealtimeRef.current) {
        unsubscribeRealtimeRef.current();
        unsubscribeRealtimeRef.current = null;
      }

      try {
        const unsubscribe = await subscribeMedicationChanges(userKey, (payload) => {
          console.log("📡 Medication change:", payload.eventType);
          if (isMounted) {
            refreshMedications();
          }
        });
        
        if (isMounted) {
          unsubscribeRealtimeRef.current = unsubscribe;
        } else {
          unsubscribe();
        }
      } catch (err) {
        console.warn("Error setting up realtime subscription", err);
      }
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (unsubscribeRealtimeRef.current) {
        unsubscribeRealtimeRef.current();
        unsubscribeRealtimeRef.current = null;
      }
    };
  }, [userKey, refreshMedications]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AppDataContextValue>(() => ({
    medications,
    setMedications,
    refreshMedications,
    userKey,
  }), [medications, refreshMedications, userKey]);

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
