import {ParsedMedicationData} from '@types';

/**
 * OCR Service - Parses prescription label text and extracts medication information
 */
export class OCRService {
  /**
   * Parse OCR text to extract medication information
   */
  static parseMedicationLabel(ocrText: string): ParsedMedicationData {
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const result: ParsedMedicationData = {
      drugName: undefined,
      dosage: undefined,
      frequency: undefined,
      duration: undefined,
      instructions: undefined,
      confidence: 0,
    };

    let confidenceScore = 0;
    let totalChecks = 0;

    // Extract drug name (usually in the first few lines, often in caps or bold)
    result.drugName = this.extractDrugName(lines);
    totalChecks++;
    if (result.drugName) confidenceScore++;

    // Extract dosage information
    result.dosage = this.extractDosage(ocrText);
    totalChecks++;
    if (result.dosage) confidenceScore++;

    // Extract frequency
    result.frequency = this.extractFrequency(ocrText);
    totalChecks++;
    if (result.frequency) confidenceScore++;

    // Extract duration
    result.duration = this.extractDuration(ocrText);
    totalChecks++;
    if (result.duration) confidenceScore++;

    // Extract instructions
    result.instructions = this.extractInstructions(ocrText);
    if (result.instructions) confidenceScore += 0.5;

    result.confidence = totalChecks > 0 ? (confidenceScore / totalChecks) * 100 : 0;

    return result;
  }

  /**
   * Extract drug name from OCR text
   */
  private static extractDrugName(lines: string[]): string | undefined {
    // Common patterns: Drug names are often the first significant text
    // and may contain words like "for" before them
    const drugPatterns = [
      /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/,  // Capitalized words at start
      /(?:Drug|Medication|Name):\s*([A-Za-z\s]+)/i,
      /^([A-Za-z]+(?:-[A-Za-z]+)?)\s+\d+\s*(?:mg|mcg|g|ml)/i,  // Name followed by dosage
    ];

    for (const line of lines.slice(0, 5)) {  // Check first 5 lines
      for (const pattern of drugPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          // Filter out common non-drug words
          if (!this.isCommonNonDrugWord(name)) {
            return name;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Extract dosage information
   */
  private static extractDosage(text: string): string | undefined {
    const dosagePatterns = [
      /(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?))/i,
      /(?:take|swallow|inject)\s+(\d+(?:\.\d+)?\s*(?:tablet|capsule|pill)s?)/i,
      /(\d+(?:\.\d+)?\s*(?:tablet|capsule|pill)s?)/i,
    ];

    for (const pattern of dosagePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract frequency information
   */
  private static extractFrequency(text: string): string | undefined {
    const frequencyPatterns = [
      /(?:take|use)\s+(\d+\s*times?\s*(?:per|a|each)\s*day)/i,
      /(\d+\s*times?\s*daily)/i,
      /(once|twice|three times|four times)\s*(?:per|a|each)?\s*day/i,
      /(every\s+\d+\s*hours?)/i,
      /(every\s+(?:morning|night|evening))/i,
      /(daily|weekly|monthly)/i,
      /(morning and evening|morning and night)/i,
      /(BID|TID|QID|QD|PRN)/i,  // Medical abbreviations
    ];

    for (const pattern of frequencyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let frequency = match[1].trim();
        
        // Normalize medical abbreviations
        frequency = this.normalizeMedicalAbbreviation(frequency);
        
        return frequency;
      }
    }

    return undefined;
  }

  /**
   * Extract duration information
   */
  private static extractDuration(text: string): string | undefined {
    const durationPatterns = [
      /(?:for|duration)\s+(\d+\s*(?:day|week|month)s?)/i,
      /(\d+\s*day\s*supply)/i,
      /(until\s+gone|until\s+finished)/i,
    ];

    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract general instructions
   */
  private static extractInstructions(text: string): string | undefined {
    const instructionPatterns = [
      /(?:take|use|apply)\s+([^.]+)/i,
      /(?:directions|instructions):\s*([^.]+)/i,
    ];

    for (const pattern of instructionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const instruction = match[1].trim();
        if (instruction.length > 10 && instruction.length < 200) {
          return instruction;
        }
      }
    }

    return undefined;
  }

  /**
   * Check if a word is commonly used but not a drug name
   */
  private static isCommonNonDrugWord(word: string): boolean {
    const commonWords = [
      'prescription', 'pharmacy', 'drug', 'medication', 'doctor',
      'patient', 'take', 'use', 'directions', 'instructions',
      'refill', 'warning', 'caution', 'label',
    ];
    return commonWords.includes(word.toLowerCase());
  }

  /**
   * Normalize medical abbreviations to readable format
   */
  private static normalizeMedicalAbbreviation(abbrev: string): string {
    const abbreviations: {[key: string]: string} = {
      'BID': 'twice daily',
      'TID': 'three times daily',
      'QID': 'four times daily',
      'QD': 'once daily',
      'PRN': 'as needed',
      'HS': 'at bedtime',
      'AC': 'before meals',
      'PC': 'after meals',
    };

    const upper = abbrev.toUpperCase();
    return abbreviations[upper] || abbrev;
  }

  /**
   * Parse frequency to number of times per day
   */
  static parseFrequencyToTimesPerDay(frequency: string): number {
    const lower = frequency.toLowerCase();
    
    if (lower.includes('once') || lower.includes('1 time') || lower.includes('qd')) {
      return 1;
    }
    if (lower.includes('twice') || lower.includes('2 times') || lower.includes('bid')) {
      return 2;
    }
    if (lower.includes('three times') || lower.includes('3 times') || lower.includes('tid')) {
      return 3;
    }
    if (lower.includes('four times') || lower.includes('4 times') || lower.includes('qid')) {
      return 4;
    }

    // Try to extract number
    const match = lower.match(/(\d+)\s*times/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }

    // Default to once daily
    return 1;
  }

  /**
   * Parse duration to days
   */
  static parseDurationToDays(duration: string): number | undefined {
    const lower = duration.toLowerCase();
    
    const dayMatch = lower.match(/(\d+)\s*days?/);
    if (dayMatch) {
      return parseInt(dayMatch[1], 10);
    }

    const weekMatch = lower.match(/(\d+)\s*weeks?/);
    if (weekMatch) {
      return parseInt(weekMatch[1], 10) * 7;
    }

    const monthMatch = lower.match(/(\d+)\s*months?/);
    if (monthMatch) {
      return parseInt(monthMatch[1], 10) * 30;
    }

    return undefined;
  }
}
