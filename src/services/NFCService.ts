// Try to import NFC manager, but handle gracefully if not available (Expo Go)
let NfcManager: any = null;
let NfcTech: any = null;
let Ndef: any = null;
let NfcEvents: any = null;

try {
  const nfcModule = require('react-native-nfc-manager');
  NfcManager = nfcModule.default || nfcModule;
  NfcTech = nfcModule.NfcTech;
  Ndef = nfcModule.Ndef;
  NfcEvents = nfcModule.NfcEvents;
} catch (error) {
  console.log('⚠️ NFC module not available (running in Expo Go)');
}

/**
 * NFC Service - Handles RFID/NFC tag operations
 * Gracefully handles when NFC is unavailable (e.g., in Expo Go)
 */
export class NFCService {
  private static isInitialized = false;
  private static isAvailable = true;

  /**
   * Initialize NFC Manager
   */
  static async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return this.isAvailable;

      // Check if NFC module exists (won't in Expo Go)
      if (!NfcManager || typeof NfcManager.isSupported !== 'function') {
        console.log('⚠️ NFC not available (requires development build)');
        this.isAvailable = false;
        this.isInitialized = true;
        return false;
      }

      const supported = await NfcManager.isSupported();
      if (!supported) {
        console.log('⚠️ NFC not supported on this device');
        this.isAvailable = false;
        this.isInitialized = true;
        return false;
      }

      await NfcManager.start();
      this.isInitialized = true;
      this.isAvailable = true;
      console.log('✅ NFC Manager initialized');
      return true;
    } catch (error) {
      console.error('Error initializing NFC:', error);
      this.isAvailable = false;
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Check if NFC is enabled on device
   */
  static async isEnabled(): Promise<boolean> {
    try {
      const initialized = await this.initialize();
      if (!initialized || !this.isAvailable) {
        return false;
      }
      return await NfcManager.isEnabled();
    } catch (error) {
      console.error('Error checking NFC status:', error);
      return false;
    }
  }

  /**
   * Read RFID tag ID
   */
  static async readTag(): Promise<string | null> {
    try {
      // Ensure NFC is initialized
      const initialized = await this.initialize();
      if (!initialized || !this.isAvailable) {
        console.log('⚠️ NFC not available');
        return null;
      }

      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Get tag information
      const tag = await NfcManager.getTag();
      
      if (!tag || !tag.id) {
        console.log('⚠️ No tag ID found');
        return null;
      }

      // Convert tag ID to hex string (handle both string and number[] types)
      const tagId = typeof tag.id === 'string' 
        ? tag.id 
        : this.byteArrayToHexString(tag.id as number[]);
      console.log('✅ Tag read successfully:', tagId);

      return tagId;
    } catch (error) {
      console.error('Error reading NFC tag:', error);
      return null;
    } finally {
      // Cancel technology request
      await NfcManager.cancelTechnologyRequest();
    }
  }

  /**
   * Read tag with timeout and retry logic
   */
  static async readTagWithTimeout(timeoutMs: number = 10000): Promise<{
    success: boolean;
    tagId?: string;
    error?: string;
  }> {
    try {
      // Ensure NFC is initialized
      const initialized = await this.initialize();
      if (!initialized || !this.isAvailable) {
        return { success: false, error: 'NFC not available (requires development build)' };
      }

      const enabled = await this.isEnabled();
      if (!enabled) {
        return { success: false, error: 'NFC is disabled. Please enable it in settings.' };
      }

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      });

      // Read tag with timeout
      const tagId = await Promise.race([
        this.readTag(),
        timeoutPromise,
      ]);

      if (!tagId) {
        return { success: false, error: 'No tag detected' };
      }

      return { success: true, tagId };
    } catch (error: any) {
      if (error.message === 'Timeout') {
        return { success: false, error: 'Tag reading timed out. Please try again.' };
      }
      console.error('Error reading tag with timeout:', error);
      return { success: false, error: 'Failed to read tag' };
    } finally {
      if (this.isAvailable) {
        await NfcManager.cancelTechnologyRequest();
      }
    }
  }

  /**
   * Write data to NFC tag (optional feature)
   */
  static async writeTag(medicationId: string, medicationName: string): Promise<boolean> {
    try {
      const initialized = await this.initialize();
      if (!initialized || !this.isAvailable) {
        console.log('⚠️ NFC not available for writing');
        return false;
      }

      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Create NDEF message with medication info
      const bytes = Ndef.encodeMessage([
        Ndef.textRecord(`MED:${medicationId}`),
        Ndef.textRecord(medicationName),
      ]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('✅ Tag written successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error writing NFC tag:', error);
      return false;
    } finally {
      if (this.isAvailable) {
        await NfcManager.cancelTechnologyRequest();
      }
    }
  }

  /**
   * Cancel any ongoing NFC operation
   */
  static async cancel(): Promise<void> {
    try {
      if (this.isAvailable) {
        await NfcManager.cancelTechnologyRequest();
      }
    } catch (error) {
      console.error('Error canceling NFC request:', error);
    }
  }

  /**
   * Clean up NFC manager
   */
  static async cleanup(): Promise<void> {
    try {
      if (this.isAvailable) {
        await NfcManager.cancelTechnologyRequest();
        await NfcManager.unregisterTagEvent();
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('Error cleaning up NFC:', error);
    }
  }

  /**
   * Convert byte array to hex string
   */
  private static byteArrayToHexString(bytes: number[]): string {
    return bytes
      .map(byte => {
        const hex = (byte & 0xFF).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join(':')
      .toUpperCase();
  }

  /**
   * Parse tag data to extract medication ID (if written)
   */
  static parseTagData(tag: any): string | null {
    try {
      if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
        return null;
      }

      const firstRecord = tag.ndefMessage[0];
      if (!firstRecord) return null;

      const text = Ndef.text.decodePayload(firstRecord.payload);
      
      // Check if it's our medication tag format
      if (text.startsWith('MED:')) {
        return text.substring(4); // Remove 'MED:' prefix
      }

      return null;
    } catch (error) {
      console.error('Error parsing tag data:', error);
      return null;
    }
  }

  /**
   * Register background tag detection (for notifications)
   */
  static async registerTagEvent(
    callback: (tag: any) => void
  ): Promise<void> {
    try {
      await this.initialize();
      await NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: any) => {
        console.log('📱 Tag detected:', tag);
        callback(tag);
      });
    } catch (error) {
      console.error('Error registering tag event:', error);
    }
  }

  /**
   * Unregister background tag detection
   */
  static async unregisterTagEvent(): Promise<void> {
    try {
      await NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    } catch (error) {
      console.error('Error unregistering tag event:', error);
    }
  }
}
