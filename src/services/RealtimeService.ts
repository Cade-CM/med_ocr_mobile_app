/**
 * Supabase Realtime Service - Secure real-time updates
 * 
 * This replaces the FastAPI WebSocket with Supabase Realtime:
 * - Authenticated via Supabase JWT (already handled by Supabase client)
 * - Row-level security (RLS) ensures users only see their own data
 * - No custom WebSocket infrastructure needed
 * - Built-in reconnection and presence
 * 
 * SECURITY MODEL:
 * - RLS is the source of truth for authorization
 * - The user_key filter in subscriptions is a performance optimization
 * - Even without the filter, RLS would prevent cross-user data leakage
 * - Realtime is enabled only for 'medications' and 'med_events' tables
 * 
 * Prerequisites:
 * 1. Enable Realtime on the 'medications' table in Supabase Dashboard
 * 2. Ensure RLS policies are configured for the table
 */

import { supabase } from '@config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type MedicationChangeCallback = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any> | null;
  old: Record<string, any> | null;
}) => void;

let medicationsChannel: RealtimeChannel | null = null;

/**
 * Subscribe to medication changes for the current authenticated user
 * Supabase RLS ensures users only receive their own data
 */
export async function subscribeMedicationChanges(
  userKey: string,
  callback: MedicationChangeCallback
): Promise<() => void> {
  // Unsubscribe from any existing channel and await completion
  if (medicationsChannel) {
    try {
      await supabase.removeChannel(medicationsChannel);
    } catch (e) {
      console.warn('Error removing existing channel:', e);
    }
    medicationsChannel = null;
  }

  // Small delay to ensure channel cleanup completes
  await new Promise(resolve => setTimeout(resolve, 100));

  // Subscribe to medications table changes filtered by user_key
  // RLS policies should also enforce this on the server side
  medicationsChannel = supabase
    .channel('medications-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'medications',
        filter: `user_key=eq.${userKey}`,
      },
      (payload) => {
        console.log('📡 Medication change received:', payload.eventType);
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as Record<string, any> | null,
          old: payload.old as Record<string, any> | null,
        });
      }
    )
    .subscribe((status) => {
      console.log('📡 Supabase Realtime status:', status);
    });

  // Return unsubscribe function
  return async () => {
    if (medicationsChannel) {
      await supabase.removeChannel(medicationsChannel);
      medicationsChannel = null;
    }
  };
}

/**
 * Subscribe to adherence/events changes
 */
export async function subscribeEventChanges(
  userKey: string,
  callback: MedicationChangeCallback
): Promise<() => void> {
  const channel = supabase
    .channel('events-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'med_events',
        filter: `user_key=eq.${userKey}`,
      },
      (payload) => {
        console.log('📡 Event change received:', payload.eventType);
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as Record<string, any> | null,
          old: payload.old as Record<string, any> | null,
        });
      }
    )
    .subscribe();

  return async () => {
    await supabase.removeChannel(channel);
  };
}

/**
 * Check if Supabase Realtime is connected
 */
export function isRealtimeConnected(): boolean {
  return medicationsChannel?.state === 'joined';
}

/**
 * Unsubscribe from all realtime channels
 */
export async function unsubscribeAll(): Promise<void> {
  await supabase.removeAllChannels();
  medicationsChannel = null;
}
