/**
 * ML Kit OCR Service - On-device text recognition using Google ML Kit
 * 
 * This service handles real-time text recognition for medication label scanning.
 * It accumulates text from multiple camera frames to build a complete scan
 * of curved bottles and damaged labels.
 * 
 * Architecture: Pure On-Device (2026 Best Practice)
 * - All OCR processing happens on-device via ML Kit
 * - Local post-processing with regex, heuristics, dictionaries
 * - Backend only receives extracted/parsed data for sync (NOT images, NOT for re-parsing)
 */

import TextRecognition, { TextRecognitionResult, TextBlock } from '@react-native-ml-kit/text-recognition';
import { ParsedMedicationData } from '@types';
import { 
  OCRQualityAssessment, 
  assessOCRQuality, 
  logOCRMetrics,
  getOCRConfig 
} from '@config/ocr';

export interface ScanProgress {
  totalTextLength: number;
  uniqueLines: number;
  confidenceScore: number;
  isComplete: boolean;
  detectedFields: string[];
}

export interface AccumulatedText {
  allText: string;
  uniqueLines: Set<string>;
  blockConfidences: number[];
  lastUpdateTime: number;
}

/**
 * Minimum requirements for a complete scan
 */
const SCAN_REQUIREMENTS = {
  MIN_UNIQUE_LINES: 5,
  MIN_TEXT_LENGTH: 100,
  MIN_CONFIDENCE: 0.6,
  STABILITY_DURATION_MS: 1500, // Text hasn't changed for this long
  MAX_SCAN_TIME_MS: 30000, // Maximum scan time before auto-complete
};

/**
 * Key medication label patterns to detect
 */
const MEDICATION_PATTERNS = {
  PATIENT_NAME: /^[A-Z][A-Za-z]+,?\s+[A-Z][A-Za-z]+/,
  DRUG_NAME: /[A-Za-z]+(?:mycin|cillin|pril|olol|statin|prazole|azole|ine|ide|ate|one)\b/i,
  STRENGTH: /\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%|units?|iu)/i,
  DOSAGE: /take\s+\d+\s*(?:tablet|capsule|pill|drop|ml|teaspoon)/i,
  FREQUENCY: /(?:once|twice|three times|four times|every|daily|weekly|as needed)/i,
  RX_NUMBER: /(?:rx|rx#|rxn|prescription)\s*[:#]?\s*\d+/i,
  QUANTITY: /(?:qty|quantity|#)\s*[:#]?\s*\d+/i,
  REFILLS: /(?:refill|rf|ref)\s*[:#]?\s*\d+/i,
  DATE: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
  PHONE: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
};

class MLKitOCRServiceClass {
  private accumulatedText: AccumulatedText = {
    allText: '',
    uniqueLines: new Set(),
    blockConfidences: [],
    lastUpdateTime: Date.now(),
  };

  private scanStartTime: number = 0;
  private lastTextSnapshot: string = '';
  private stableTextTime: number = 0;

  /**
   * Reset the accumulated text for a new scan session
   */
  resetAccumulation(): void {
    this.accumulatedText = {
      allText: '',
      uniqueLines: new Set(),
      blockConfidences: [],
      lastUpdateTime: Date.now(),
    };
    this.scanStartTime = Date.now();
    this.lastTextSnapshot = '';
    this.stableTextTime = 0;
  }

  /**
   * Process a single image and return recognized text
   * For use with captured photos (non-live mode)
   */
  async recognizeFromImage(imageUri: string): Promise<TextRecognitionResult> {
    try {
      const result = await TextRecognition.recognize(imageUri);
      return result;
    } catch (error) {
      console.error('ML Kit recognition error:', error);
      throw error;
    }
  }

  /**
   * Process text from a camera frame and accumulate results
   * Returns the current scan progress
   */
  processFrameText(result: TextRecognitionResult): ScanProgress {
    const now = Date.now();
    
    // Extract and clean lines from this frame
    const newLines = this.extractCleanLines(result);
    
    // Add new unique lines
    let addedNew = false;
    for (const line of newLines) {
      if (!this.accumulatedText.uniqueLines.has(line)) {
        this.accumulatedText.uniqueLines.add(line);
        addedNew = true;
      }
    }

    // Track block confidences (ML Kit doesn't provide confidence, estimate from structure)
    const confidence = this.estimateConfidence(result);
    this.accumulatedText.blockConfidences.push(confidence);

    // Update accumulated text
    this.accumulatedText.allText = Array.from(this.accumulatedText.uniqueLines).join('\n');
    this.accumulatedText.lastUpdateTime = now;

    // Check text stability
    const currentSnapshot = this.accumulatedText.allText;
    if (currentSnapshot === this.lastTextSnapshot) {
      if (this.stableTextTime === 0) {
        this.stableTextTime = now;
      }
    } else {
      this.lastTextSnapshot = currentSnapshot;
      this.stableTextTime = now;
    }

    // Detect which medication fields we've found
    const detectedFields = this.detectFields(this.accumulatedText.allText);

    // Calculate overall progress
    const progress = this.calculateProgress(detectedFields, now);

    return progress;
  }

  /**
   * Extract clean, normalized lines from recognition result
   */
  private extractCleanLines(result: TextRecognitionResult): string[] {
    const lines: string[] = [];
    
    for (const block of result.blocks) {
      for (const line of block.lines) {
        const cleanedLine = this.cleanText(line.text);
        if (cleanedLine.length >= 3) { // Minimum viable line length
          lines.push(cleanedLine);
        }
      }
    }

    return lines;
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[|_]/g, '') // Remove common OCR artifacts
      .replace(/^[-•·]\s*/, ''); // Remove bullet points
  }

  /**
   * Estimate confidence based on text structure quality
   */
  private estimateConfidence(result: TextRecognitionResult): number {
    if (result.blocks.length === 0) return 0;

    let score = 0;
    let checks = 0;

    for (const block of result.blocks) {
      // Check if text has recognizable words
      const wordCount = block.text.split(/\s+/).filter(w => w.length > 2).length;
      if (wordCount > 0) {
        score += Math.min(wordCount / 5, 1);
        checks++;
      }

      // Check for medication-related patterns
      for (const pattern of Object.values(MEDICATION_PATTERNS)) {
        if (pattern.test(block.text)) {
          score += 0.5;
          checks++;
        }
      }
    }

    return checks > 0 ? score / checks : 0;
  }

  /**
   * Detect which medication fields have been found in the text
   */
  private detectFields(text: string): string[] {
    const detected: string[] = [];

    if (MEDICATION_PATTERNS.PATIENT_NAME.test(text)) detected.push('patientName');
    if (MEDICATION_PATTERNS.DRUG_NAME.test(text)) detected.push('drugName');
    if (MEDICATION_PATTERNS.STRENGTH.test(text)) detected.push('strength');
    if (MEDICATION_PATTERNS.DOSAGE.test(text)) detected.push('dosage');
    if (MEDICATION_PATTERNS.FREQUENCY.test(text)) detected.push('frequency');
    if (MEDICATION_PATTERNS.RX_NUMBER.test(text)) detected.push('rxNumber');
    if (MEDICATION_PATTERNS.QUANTITY.test(text)) detected.push('quantity');
    if (MEDICATION_PATTERNS.REFILLS.test(text)) detected.push('refills');
    if (MEDICATION_PATTERNS.DATE.test(text)) detected.push('date');
    if (MEDICATION_PATTERNS.PHONE.test(text)) detected.push('phone');

    return detected;
  }

  /**
   * Calculate overall scan progress
   */
  private calculateProgress(detectedFields: string[], now: number): ScanProgress {
    const uniqueLines = this.accumulatedText.uniqueLines.size;
    const textLength = this.accumulatedText.allText.length;
    
    // Calculate average confidence
    const avgConfidence = this.accumulatedText.blockConfidences.length > 0
      ? this.accumulatedText.blockConfidences.reduce((a, b) => a + b, 0) / 
        this.accumulatedText.blockConfidences.length
      : 0;

    // Check completion criteria
    const meetsLineRequirement = uniqueLines >= SCAN_REQUIREMENTS.MIN_UNIQUE_LINES;
    const meetsLengthRequirement = textLength >= SCAN_REQUIREMENTS.MIN_TEXT_LENGTH;
    const meetsConfidenceRequirement = avgConfidence >= SCAN_REQUIREMENTS.MIN_CONFIDENCE;
    
    const timeSinceLastChange = now - this.stableTextTime;
    const isStable = this.stableTextTime > 0 && 
      timeSinceLastChange >= SCAN_REQUIREMENTS.STABILITY_DURATION_MS;
    
    const totalScanTime = now - this.scanStartTime;
    const hasTimedOut = totalScanTime >= SCAN_REQUIREMENTS.MAX_SCAN_TIME_MS;

    // Scan is complete if we have enough data and it's stable, or if we've timed out
    const hasMinimumData = meetsLineRequirement && meetsLengthRequirement;
    const isComplete = (hasMinimumData && isStable && meetsConfidenceRequirement) || 
                       (hasMinimumData && hasTimedOut);

    return {
      totalTextLength: textLength,
      uniqueLines,
      confidenceScore: avgConfidence,
      isComplete,
      detectedFields,
    };
  }

  /**
   * Get the final accumulated text for processing
   */
  getAccumulatedText(): string {
    return this.accumulatedText.allText;
  }

  /**
   * Get unique lines as array
   */
  getUniqueLines(): string[] {
    return Array.from(this.accumulatedText.uniqueLines);
  }

  /**
   * Force complete the scan and return current results
   */
  forceComplete(): string {
    return this.accumulatedText.allText;
  }

  /**
   * Get scan statistics
   */
  getStats(): { 
    uniqueLines: number; 
    totalChars: number; 
    scanDuration: number;
    avgConfidence: number;
  } {
    return {
      uniqueLines: this.accumulatedText.uniqueLines.size,
      totalChars: this.accumulatedText.allText.length,
      scanDuration: Date.now() - this.scanStartTime,
      avgConfidence: this.accumulatedText.blockConfidences.length > 0
        ? this.accumulatedText.blockConfidences.reduce((a, b) => a + b, 0) / 
          this.accumulatedText.blockConfidences.length
        : 0,
    };
  }

  /**
   * Assess the quality of the current OCR result
   * Used to provide feedback to users about scan quality
   */
  assessQuality(): OCRQualityAssessment {
    const text = this.getAccumulatedText();
    const stats = this.getStats();
    const detectedFields = this.detectFields(text);
    
    const assessment = assessOCRQuality(
      text,
      stats.avgConfidence,
      detectedFields,
      stats.uniqueLines
    );
    
    // Log metrics for observability (anonymized, no raw text)
    logOCRMetrics(assessment);
    
    return assessment;
  }

  /**
   * Process a single image and return quality-assessed result
   * Pure on-device processing - no API calls
   */
  async recognizeAndAssess(imageUri: string): Promise<{
    result: TextRecognitionResult;
    text: string;
    quality: OCRQualityAssessment;
  }> {
    // Reset for fresh scan
    this.resetAccumulation();
    
    // Perform OCR on-device
    const result = await this.recognizeFromImage(imageUri);
    
    // Process the result to accumulate text
    this.processFrameText(result);
    
    // Get quality assessment (for user feedback, not escalation)
    const quality = this.assessQuality();
    
    return {
      result,
      text: this.getAccumulatedText(),
      quality,
    };
  }
}

// Export singleton instance
export const MLKitOCRService = new MLKitOCRServiceClass();

// Also export the class for testing
export { MLKitOCRServiceClass };

// Re-export types for convenience
export type { OCRQualityAssessment } from '@config/ocr';
