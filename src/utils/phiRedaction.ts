/**
 * PHI Redaction Utility - Sanitize sensitive data before logging
 * 
 * CRITICAL SECURITY RULE:
 * Never log raw OCR text, medication names, dosages, patient names, or RX numbers.
 * 
 * Use this utility to redact PHI before:
 * - console.log/warn/error statements
 * - Analytics events
 * - Crash reporting (Sentry, Crashlytics, etc.)
 * 
 * Redaction patterns:
 * - Digits → [REDACTED_NUM]
 * - Names (capitalized words) → [REDACTED]
 * - RX/prescription numbers → [RX_REDACTED]
 * - Common medication patterns → [MED_REDACTED]
 */

// Common medication suffixes to detect drug names
const MEDICATION_SUFFIXES = [
  'azole', 'pril', 'sartan', 'statin', 'olol', 'pine', 'pam', 'lam',
  'prazole', 'tidine', 'mab', 'nib', 'vir', 'cillin', 'mycin', 'floxacin',
  'cycline', 'dronate', 'parin', 'profen', 'triptan', 'setron', 'caine',
  'barb', 'done', 'morph', 'codone', 'gesic', 'phylline', 'terol', 'onide',
  'asone', 'olone', 'predni', 'methasone', 'cortisone'
];

// RX number patterns
const RX_PATTERNS = [
  /\b(?:rx|rx#|rx\s*#|prescription|rx\s*no\.?|rx\s*number)\s*[:.]?\s*\d+/gi,
  /\b\d{6,12}\b/g, // Long numeric sequences (potential RX numbers)
];

// DEA number pattern (2 letters + 7 digits)
const DEA_PATTERN = /\b[A-Z]{2}\d{7}\b/gi;

// NPI pattern (10 digits)
const NPI_PATTERN = /\b\d{10}\b/g;

// Phone number patterns
const PHONE_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/g,
];

// Date patterns (could reveal dispensing dates)
const DATE_PATTERNS = [
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}/gi,
];

// Dosage patterns
const DOSAGE_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|cc|units?|iu|meq)\b/gi,
  /\b\d+(?:\.\d+)?(?:mg|mcg|g|ml)\b/gi,
];

/**
 * Redact all PHI from a string for safe logging
 */
export function redactPHI(text: string): string {
  if (!text || typeof text !== 'string') {
    return '[EMPTY]';
  }

  let redacted = text;

  // Redact RX numbers first (most specific)
  for (const pattern of RX_PATTERNS) {
    redacted = redacted.replace(pattern, '[RX_REDACTED]');
  }

  // Redact DEA numbers
  redacted = redacted.replace(DEA_PATTERN, '[DEA_REDACTED]');

  // Redact NPIs (after RX to avoid double-redaction)
  redacted = redacted.replace(NPI_PATTERN, '[NPI_REDACTED]');

  // Redact phone numbers
  for (const pattern of PHONE_PATTERNS) {
    redacted = redacted.replace(pattern, '[PHONE_REDACTED]');
  }

  // Redact dates
  for (const pattern of DATE_PATTERNS) {
    redacted = redacted.replace(pattern, '[DATE_REDACTED]');
  }

  // Redact dosages
  for (const pattern of DOSAGE_PATTERNS) {
    redacted = redacted.replace(pattern, '[DOSE_REDACTED]');
  }

  // Redact medication names (words ending in common suffixes)
  const medicationPattern = new RegExp(
    `\\b\\w*(?:${MEDICATION_SUFFIXES.join('|')})\\b`,
    'gi'
  );
  redacted = redacted.replace(medicationPattern, '[MED_REDACTED]');

  // Redact remaining multi-digit numbers (potential identifiers)
  redacted = redacted.replace(/\b\d{3,}\b/g, '[NUM_REDACTED]');

  // Redact potential names (capitalized words that look like names)
  // Be careful not to redact too aggressively
  redacted = redacted.replace(
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
    '[NAME_REDACTED]'
  );

  return redacted;
}

/**
 * Create a safe logger that automatically redacts PHI
 */
export const safeLog = {
  info: (message: string, ...args: unknown[]) => {
    console.log(redactPHI(message), ...args.map(arg => 
      typeof arg === 'string' ? redactPHI(arg) : '[OBJECT]'
    ));
  },
  
  warn: (message: string, ...args: unknown[]) => {
    console.warn(redactPHI(message), ...args.map(arg => 
      typeof arg === 'string' ? redactPHI(arg) : '[OBJECT]'
    ));
  },
  
  error: (message: string, ...args: unknown[]) => {
    console.error(redactPHI(message), ...args.map(arg => 
      typeof arg === 'string' ? redactPHI(arg) : '[OBJECT]'
    ));
  },
  
  debug: (message: string, ...args: unknown[]) => {
    if (__DEV__) {
      console.log('[DEBUG]', redactPHI(message), ...args.map(arg => 
        typeof arg === 'string' ? redactPHI(arg) : '[OBJECT]'
      ));
    }
  },
};

/**
 * Redact an object's string values for safe logging
 * Useful for logging API responses or medication objects
 */
export function redactObject<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Check if this is a sensitive field
      const sensitiveKeys = [
        'name', 'drug_name', 'medication', 'patient', 'doctor', 'prescriber',
        'address', 'phone', 'npi', 'dea', 'rx', 'prescription',
        'dosage', 'strength', 'instruction', 'directions', 'sig',
        'raw_text', 'ocr_text', 'label_text'
      ];
      
      const isSensitive = sensitiveKeys.some(k => 
        key.toLowerCase().includes(k.toLowerCase())
      );
      
      redacted[key] = isSensitive ? '[REDACTED]' : value;
    } else if (typeof value === 'number') {
      // Redact numbers in sensitive fields
      const numericSensitive = ['npi', 'dea', 'rx', 'phone', 'qty', 'quantity', 'refill'];
      const isSensitive = numericSensitive.some(k => 
        key.toLowerCase().includes(k.toLowerCase())
      );
      redacted[key] = isSensitive ? '[NUM_REDACTED]' : value;
    } else if (value === null || value === undefined) {
      redacted[key] = value;
    } else if (Array.isArray(value)) {
      redacted[key] = '[ARRAY]';
    } else if (typeof value === 'object') {
      redacted[key] = '[OBJECT]';
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Prepare data for analytics/crash reporting
 * Returns only safe, non-PHI metadata
 */
export function prepareForAnalytics(data: {
  eventType: string;
  medicationCount?: number;
  hasError?: boolean;
  errorType?: string;
  screenName?: string;
}): Record<string, unknown> {
  // Only include non-PHI fields
  return {
    eventType: data.eventType,
    medicationCount: data.medicationCount,
    hasError: data.hasError,
    errorType: data.errorType,
    screenName: data.screenName,
    timestamp: new Date().toISOString(),
    // Never include: medication names, dosages, patient info, raw text
  };
}
