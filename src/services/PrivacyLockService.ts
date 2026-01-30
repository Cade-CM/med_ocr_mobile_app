/**
 * Privacy Lock Service - Biometric/passcode protection for sensitive app data
 * 
 * Implements "app locks when backgrounded" pattern for PHI protection.
 * Uses expo-local-authentication for biometric/device passcode verification.
 * 
 * Security features:
 * - Lock app when backgrounded
 * - Lock after idle timeout
 * - Require biometric or device passcode to unlock
 * - Protect against shoulder surfing and unlocked phone scenarios
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, AppStateStatus } from 'react-native';
import { getSecureItem, setSecureItem } from './storage/secureStorage';

// Settings keys
const PRIVACY_LOCK_ENABLED_KEY = 'privacy_lock_enabled';
const IDLE_TIMEOUT_KEY = 'idle_timeout_minutes';

// Default idle timeout (5 minutes)
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

// State
let isLocked = false;
let lastActiveTime = Date.now();
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let idleCheckInterval: NodeJS.Timeout | null = null;

/**
 * Check if device supports biometric authentication
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  } catch (error) {
    console.warn('Error checking biometric availability:', error);
    return false;
  }
}

/**
 * Get supported authentication types
 */
export async function getSupportedAuthTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
  try {
    return await LocalAuthentication.supportedAuthenticationTypesAsync();
  } catch (error) {
    console.warn('Error getting auth types:', error);
    return [];
  }
}

/**
 * Get human-readable name for auth type
 */
export function getAuthTypeName(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Touch ID / Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'Device Passcode';
}

/**
 * Check if privacy lock is enabled
 */
export async function isPrivacyLockEnabled(): Promise<boolean> {
  const enabled = await getSecureItem(PRIVACY_LOCK_ENABLED_KEY);
  return enabled === 'true';
}

/**
 * Enable or disable privacy lock
 */
export async function setPrivacyLockEnabled(enabled: boolean): Promise<void> {
  await setSecureItem(PRIVACY_LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
  
  if (enabled) {
    startPrivacyLockMonitoring();
  } else {
    stopPrivacyLockMonitoring();
    isLocked = false;
  }
}

/**
 * Get idle timeout in minutes
 */
export async function getIdleTimeoutMinutes(): Promise<number> {
  const timeout = await getSecureItem(IDLE_TIMEOUT_KEY);
  return timeout ? parseInt(timeout, 10) : 5;
}

/**
 * Set idle timeout in minutes
 */
export async function setIdleTimeoutMinutes(minutes: number): Promise<void> {
  await setSecureItem(IDLE_TIMEOUT_KEY, minutes.toString());
}

/**
 * Check if app is currently locked
 */
export function isAppLocked(): boolean {
  return isLocked;
}

/**
 * Lock the app manually
 */
export function lockApp(): void {
  isLocked = true;
}

/**
 * Attempt to unlock the app with biometrics/passcode
 * Returns true if successfully authenticated
 */
export async function unlockApp(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock MedOCR - Authenticate to access your medications',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false, // Allow device passcode as fallback
    });

    if (result.success) {
      isLocked = false;
      lastActiveTime = Date.now();
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Authentication error:', error);
    return false;
  }
}

/**
 * Record user activity (resets idle timer)
 */
export function recordActivity(): void {
  lastActiveTime = Date.now();
}

/**
 * Handle app state changes (background/foreground)
 */
function handleAppStateChange(nextAppState: AppStateStatus): void {
  if (nextAppState === 'background' || nextAppState === 'inactive') {
    // Lock when app goes to background
    isLocked = true;
  } else if (nextAppState === 'active') {
    // Don't auto-unlock - require authentication
    recordActivity();
  }
}

/**
 * Check for idle timeout
 */
async function checkIdleTimeout(): Promise<void> {
  if (!await isPrivacyLockEnabled()) return;
  if (isLocked) return;

  const timeoutMinutes = await getIdleTimeoutMinutes();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  
  if (Date.now() - lastActiveTime > timeoutMs) {
    isLocked = true;
  }
}

/**
 * Start monitoring for app state changes and idle timeout
 */
export function startPrivacyLockMonitoring(): void {
  // Stop any existing monitoring
  stopPrivacyLockMonitoring();
  
  // Monitor app state
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  
  // Check idle timeout every minute
  idleCheckInterval = setInterval(checkIdleTimeout, 60 * 1000);
  
  // Initialize last active time
  lastActiveTime = Date.now();
}

/**
 * Stop monitoring
 */
export function stopPrivacyLockMonitoring(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
}

/**
 * Initialize privacy lock on app start
 * Should be called from App.tsx
 */
export async function initializePrivacyLock(): Promise<void> {
  const enabled = await isPrivacyLockEnabled();
  if (enabled) {
    isLocked = true; // Start locked
    startPrivacyLockMonitoring();
  }
}
