/**
 * OCR Configuration - On-Device First Architecture
 * 
 * Best Practices for 2026:
 * - Default to on-device OCR (ML Kit on Android, Vision on iOS)
 * - Do local post-processing (regex, heuristics, dictionaries)
 * - Only send EXTRACTED TEXT to backend for sync/storage (not images, not for re-parsing)
 * 
 * Privacy by Design:
 * - Minimizes PHI exposure by keeping images on-device
 * - Reduces compliance surface area (no raw clinical photos transmitted)
 * - Backend only receives structured medication data for sync
 * 
 * When backend IS needed:
 * - Syncing medication data to cloud storage
 * - Analytics and adherence tracking
 * - Provider visibility (if applicable)
 * - NOT for OCR or parsing (that's all on-device)
 */

export interface OCRConfig {
  // ============================================================================
  // QUALITY THRESHOLDS (for user feedback, not escalation)
  // ============================================================================
  
  /** Minimum confidence score (0-1) to accept scan without warning */
  minConfidenceThreshold: number;
  
  /** Minimum unique lines required for a valid scan */
  minUniqueLines: number;
  
  /** Minimum text length required for a valid scan */
  minTextLength: number;
  
  /** Required fields that should be detected for a complete scan */
  requiredFields: string[];
  
  /** Minimum number of required fields that must be present */
  minRequiredFieldCount: number;

  // ============================================================================
  // SCAN BEHAVIOR
  // ============================================================================
  
  /** Time in ms that text must be stable before auto-completing scan */
  stabilityDurationMs: number;
  
  /** Maximum scan duration before forcing completion */
  maxScanTimeMs: number;
  
  /** Interval between frame captures in live scan mode */
  frameCaptureIntervalMs: number;

  // ============================================================================
  // DEBUG & LOGGING
  // ============================================================================
  
  /** Enable detailed logging for debugging */
  enableDebugLogging: boolean;
}

/**
 * Default OCR configuration
 * Optimized for on-device processing with quality feedback
 */
export const DEFAULT_OCR_CONFIG: OCRConfig = {
  // Quality thresholds (for user feedback)
  minConfidenceThreshold: 0.6,
  minUniqueLines: 5,
  minTextLength: 100,
  requiredFields: ['drugName', 'strength', 'dosage', 'frequency'],
  minRequiredFieldCount: 2,
  
  // Scan behavior
  stabilityDurationMs: 1500,
  maxScanTimeMs: 30000,
  frameCaptureIntervalMs: 500,
  
  // Debug
  enableDebugLogging: __DEV__,
};

/**
 * Quality assessment result from on-device OCR
 */
export interface OCRQualityAssessment {
  /** Overall confidence score (0-1) */
  confidence: number;
  
  /** Whether the scan meets quality requirements */
  isAcceptable: boolean;
  
  /** Specific issues detected */
  issues: OCRQualityIssue[];
  
  /** Fields that were successfully detected */
  detectedFields: string[];
  
  /** Fields that are missing */
  missingFields: string[];
  
  /** Recommendation for user action */
  userRecommendation: string;
}

export type OCRQualityIssue = 
  | 'low_confidence'
  | 'too_few_lines'
  | 'text_too_short'
  | 'missing_drug_name'
  | 'missing_strength'
  | 'missing_dosage'
  | 'missing_frequency'
  | 'possible_glare'
  | 'possible_blur'
  | 'curved_surface';

// Export config singleton that can be modified at runtime
let _config: OCRConfig = { ...DEFAULT_OCR_CONFIG };

/**
 * Get current OCR configuration
 */
export function getOCRConfig(): OCRConfig {
  return _config;
}

/**
 * Update OCR configuration (partial update)
 */
export function updateOCRConfig(updates: Partial<OCRConfig>): void {
  _config = { ..._config, ...updates };
}

/**
 * Reset to default configuration
 */
export function resetOCRConfig(): void {
  _config = { ...DEFAULT_OCR_CONFIG };
}

/**
 * Assess OCR quality for user feedback
 * This helps users know if they should rescan, NOT for triggering API fallback
 */
export function assessOCRQuality(
  text: string,
  confidence: number,
  detectedFields: string[],
  uniqueLines: number
): OCRQualityAssessment {
  const config = getOCRConfig();
  const issues: OCRQualityIssue[] = [];
  
  // Check confidence
  if (confidence < config.minConfidenceThreshold) {
    issues.push('low_confidence');
  }
  
  // Check line count
  if (uniqueLines < config.minUniqueLines) {
    issues.push('too_few_lines');
  }
  
  // Check text length
  if (text.length < config.minTextLength) {
    issues.push('text_too_short');
  }
  
  // Check required fields
  const missingFields: string[] = [];
  for (const field of config.requiredFields) {
    if (!detectedFields.includes(field)) {
      missingFields.push(field);
      if (field === 'drugName') issues.push('missing_drug_name');
      if (field === 'strength') issues.push('missing_strength');
      if (field === 'dosage') issues.push('missing_dosage');
      if (field === 'frequency') issues.push('missing_frequency');
    }
  }
  
  // Detect possible quality issues from text patterns
  if (/[|_]{3,}/.test(text)) {
    issues.push('possible_glare');
  }
  if (/[^\w\s]{5,}/.test(text)) {
    issues.push('possible_blur');
  }
  
  // Calculate if acceptable
  const hasEnoughFields = (config.requiredFields.length - missingFields.length) >= config.minRequiredFieldCount;
  const isAcceptable = 
    confidence >= config.minConfidenceThreshold &&
    uniqueLines >= config.minUniqueLines &&
    text.length >= config.minTextLength &&
    hasEnoughFields;
  
  // Generate user recommendation
  let userRecommendation: string;
  if (isAcceptable) {
    userRecommendation = 'Scan quality is good';
  } else if (issues.includes('possible_glare')) {
    userRecommendation = 'Try reducing glare by adjusting the angle';
  } else if (issues.includes('too_few_lines')) {
    userRecommendation = 'Move closer to capture more of the label';
  } else if (issues.includes('low_confidence')) {
    userRecommendation = 'Try improving lighting or holding steadier';
  } else if (missingFields.length > 0) {
    userRecommendation = `Missing: ${missingFields.join(', ')}. Try capturing the full label.`;
  } else {
    userRecommendation = 'Try rescanning for better results';
  }
  
  return {
    confidence,
    isAcceptable,
    issues,
    detectedFields,
    missingFields,
    userRecommendation,
  };
}

/**
 * Log OCR metrics for observability (anonymized)
 * Logs quality signals without raw images per privacy best practices
 */
export function logOCRMetrics(assessment: OCRQualityAssessment): void {
  const config = getOCRConfig();
  
  if (!config.enableDebugLogging) return;
  
  console.log('📊 OCR Quality Metrics:', {
    confidence: Math.round(assessment.confidence * 100) + '%',
    isAcceptable: assessment.isAcceptable,
    issues: assessment.issues,
    detectedFieldCount: assessment.detectedFields.length,
    missingFieldCount: assessment.missingFields.length,
  });
}
