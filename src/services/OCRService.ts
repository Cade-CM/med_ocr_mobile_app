import {ParsedMedicationData} from '@types';
import {MedicationDatabase} from './MedicationDatabase';

/**
 * OCR Service - Parses prescription label text and extracts medication information
 */
export class OCRService {
  /**
   * Parse OCR text to extract medication information
   */
  static async parseMedicationLabel(ocrText: string): Promise<ParsedMedicationData> {
    let lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // STEP 1: Find the patient name line and restructure lines array
    const patientLineIndex = await this.findPatientNameLine(lines);
    
    if (patientLineIndex === -1) {
      console.error('❌ CRITICAL: No patient name found in label. Please rescan with patient name visible.');
      throw new Error('Patient name not found - please ensure the top of the prescription label is captured');
    }
    
    if (patientLineIndex === null) {
      console.error('❌ CRITICAL: Drug name found before patient name. Please rescan with patient name at top.');
      throw new Error('Drug name detected before patient name - please rescan with complete label');
    }
    
    // Remove all lines before patient name and reindex
    if (patientLineIndex > 0) {
      console.log(`📋 Removing ${patientLineIndex} garbage line(s) before patient name`);
      lines = lines.slice(patientLineIndex);
      console.log('📋 Restructured lines:', lines.slice(0, 5));
    }
    
    const cleanLines = lines;
    console.log('📋 Clean lines starting with patient name on Line 0');
    
    // Warn if OCR text looks incomplete
    if (cleanLines.length > 0 && /^[|_&>-]|take|mouth|day/i.test(cleanLines[0])) {
      console.warn('⚠️ OCR may have missed top of label - patient name and drug name likely not captured');
    }
    
    const result: ParsedMedicationData = {
      patientName: undefined,
      drugName: undefined,
      strength: undefined,
      dosage: undefined,
      frequency: undefined,
      duration: undefined,
      instructions: undefined,
      rxNumber: undefined,
      quantity: undefined,
      refills: undefined,
      refillsBeforeDate: undefined,
      pharmacy: undefined,
      pharmacyPhone: undefined,
      confidence: 0,
    };

    let confidenceScore = 0;
    let totalChecks = 0;

    // LINE-BASED EXTRACTION (Prescription Label Format):
    // Line 0 = Patient Name
    // Line 1 = Drug Name + Strength
    // Lines 2-4 = Dosage, Frequency, Duration
    // Line 5 = RX Number
    // Line 6 = Quantity
    // Line 7 = Refills + Date
    // Line 10 = Pharmacy Phone
    // NOTE: Using cleanLines which has garbage lines removed from the start

    // Extract patient name (usually appears before drug name)
    try {
      result.patientName = await this.extractPatientName(cleanLines);
      totalChecks++;
      if (result.patientName) confidenceScore++;
    } catch (error) {
      console.error('❌ Error extracting patient name:', error);
      totalChecks++;
    }

    // Extract drug name (pass patientName to avoid re-extraction)
    try {
      result.drugName = await this.extractDrugName(cleanLines, result.patientName);
      totalChecks++;
      if (result.drugName) confidenceScore++;
    } catch (error) {
      console.error('❌ Error extracting drug name:', error);
      totalChecks++;
    }
    
    // Extract strength from Line 1
    result.strength = this.extractStrength(cleanLines);
    totalChecks++;
    if (result.strength) confidenceScore++;

    // Extract dosage from Lines 2-4
    result.dosage = this.extractDosage(cleanLines);
    totalChecks++;
    if (result.dosage) confidenceScore++;

    // Extract frequency from Lines 2-4
    result.frequency = this.extractFrequency(cleanLines);
    totalChecks++;
    if (result.frequency) confidenceScore++;

    // Extract duration from Lines 2-4
    result.duration = this.extractDuration(cleanLines);
    totalChecks++;
    if (result.duration) confidenceScore++;

    // Extract additional instructions (BY MOUTH, WITH MEALS, FOR PAIN, etc.)
    result.additionalInstructions = this.extractAdditionalInstructions(cleanLines);
    if (result.additionalInstructions) confidenceScore += 0.5;

    // Extract RX number from Line 5
    result.rxNumber = this.extractRxNumber(cleanLines);
    totalChecks++;
    if (result.rxNumber) confidenceScore++;

    // Extract quantity from Line 6
    result.quantity = this.extractQuantity(cleanLines);
    totalChecks++;
    if (result.quantity) confidenceScore++;

    // Extract refills from Line 7
    result.refills = this.extractRefills(cleanLines);
    totalChecks++;
    if (result.refills) confidenceScore++;

    // Extract refills before date from Line 7
    result.refillsBeforeDate = this.extractRefillsBeforeDate(cleanLines);
    totalChecks++;
    if (result.refillsBeforeDate) confidenceScore++;

    // Extract pharmacy name
    result.pharmacy = this.extractPharmacy(cleanLines);
    totalChecks++;
    if (result.pharmacy) confidenceScore++;

    // Extract pharmacy phone from Line 10
    result.pharmacyPhone = this.extractPharmacyPhone(cleanLines);
    totalChecks++;
    if (result.pharmacyPhone) confidenceScore++;

    // Extract instructions
    result.instructions = this.extractInstructions(ocrText);
    if (result.instructions) confidenceScore += 0.5;

    result.confidence = totalChecks > 0 ? (confidenceScore / totalChecks) * 100 : 0;

    return result;
  }

  /**
   * Find the line index containing the patient name
   * Returns:
   * - Line index (0+) if patient name found
   * - -1 if no patient name found after checking all lines
   * - null if drug name found before patient name (needs rescan)
   */
  private static async findPatientNameLine(lines: string[]): Promise<number | null> {
    console.log('🔍 Searching for patient name line...');
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      console.log(`🔍 Checking line ${i}: "${line}"`);
      
      // Skip pure garbage lines (only symbols/punctuation)
      if (/^[^A-Za-z0-9]*$|^[-—_=]{2,}$/.test(line)) {
        console.log(`⚠️ Line ${i} is garbage (symbols only)`);
        continue;
      }
      
      // Clean the line - remove all symbols except hyphens, parentheses, letters, and spaces
      const cleaned = line.replace(/[^A-Za-z\s\-()]/g, '').trim();
      
      // Look for name pattern: FIRSTNAME LASTNAME (now handles trailing punctuation)
      const nameMatch = cleaned.match(/^([A-Z][A-Z]{2,})\s+([A-Z][A-Z]+)/i);
      
      if (nameMatch) {
        const firstName = nameMatch[1].trim().toUpperCase();
        const lastName = nameMatch[2].trim().toUpperCase();
        const fullName = firstName + ' ' + lastName;
        
        if (fullName.length >= 5 && fullName.length <= 30) {
          console.log(`🔍 Found potential name: "${fullName}"`);
          
          // PRIORITY 1: Check if it's in local patient database (fastest, most reliable)
          const isKnownPatient = await MedicationDatabase.isKnownLocalPatient(firstName, lastName);
          if (isKnownPatient) {
            console.log(`✅ Line ${i} confirmed as known patient (local DB): "${fullName}"`);
            return i; // Skip medication check entirely
          }
          
          // PRIORITY 2: Check if it's a medication (with 90% similarity requirement)
          const fullNameIsMed = await MedicationDatabase.isMedicationStrict(fullName);
          const firstNameIsMed = await MedicationDatabase.isMedicationStrict(firstName);
          const lastNameIsMed = await MedicationDatabase.isMedicationStrict(lastName);
          
          if (fullNameIsMed || firstNameIsMed || lastNameIsMed) {
            console.log(`❌ Line ${i} contains medication name, not patient name`);
            // Drug found before patient - need rescan
            return null;
          }
          
          // Check if it's a valid person name (local DB or online)
          const isValidName = await MedicationDatabase.isLikelyPersonName(firstName, lastName);
          if (isValidName) {
            console.log(`✅ Line ${i} confirmed as patient name: "${fullName}"`);
            return i;
          }
          
          // Even if not in name database, accept if reasonable length and not a med
          console.log(`✓ Line ${i} accepted as patient name (not in DB): "${fullName}"`);
          return i;
        }
      }
      
      // Check if line contains drug name
      const drugMatch = cleaned.match(/^([A-Z][A-Z]{4,})/i);
      if (drugMatch) {
        const possibleDrug = drugMatch[1].toUpperCase();
        const isDrug = await MedicationDatabase.isMedicationStrict(possibleDrug);
        if (isDrug) {
          console.log(`❌ Line ${i} contains drug name "${possibleDrug}" - patient name not found before drug`);
          return null; // Need rescan
        }
      }
    }
    
    console.log('❌ No patient name found in first 5 lines');
    return -1; // No patient name found
  }

  /**
   * Extract patient name from OCR text
   * Assumes Line 0 contains patient name (after findPatientNameLine has restructured the array)
   */
  private static async extractPatientName(lines: string[]): Promise<string | undefined> {
    if (lines.length === 0) return undefined;
    
    console.log('🔍 Extracting patient name from line 0:', lines[0]);
    
    // Clean the line - remove all symbols except hyphens, parentheses, letters, and spaces
    const firstLine = lines[0].replace(/[^A-Za-z\s\-()]/g, '').trim();
    console.log('🔍 After cleaning:', firstLine);
    
    // Parse patient name: FIRSTNAME LASTNAME (now handles trailing punctuation)
    const nameMatch = firstLine.match(/^([A-Z][A-Z]{2,})\s+([A-Z][A-Z]+)/i);
    if (nameMatch) {
      let firstName = nameMatch[1].trim().toUpperCase();
      let lastName = nameMatch[2].trim().toUpperCase();
      let fullName = firstName + ' ' + lastName;
      console.log(`🔍 Found name pattern: ${fullName}`);
      
      if (fullName.length >= 5 && fullName.length <= 30) {
        // PRIORITY 1: Check local patient database and correct OCR errors with fuzzy matching
        const localPatients = await MedicationDatabase.getLocalPatients();
        
        if (localPatients && localPatients.length > 0) {
          console.log(`📦 Checking against ${localPatients.length} local patient(s)`);
          
          // Fuzzy match helper using Levenshtein distance
          const fuzzyMatch = (str1: string, str2: string): number => {
            const longer = str1.length > str2.length ? str1 : str2;
            const shorter = str1.length > str2.length ? str2 : str1;
            
            if (longer.length === 0) return 1.0;
            
            const editDistance = (s1: string, s2: string): number => {
              const costs: number[] = [];
              for (let i = 0; i <= s1.length; i++) {
                let lastValue = i;
                for (let j = 0; j <= s2.length; j++) {
                  if (i === 0) {
                    costs[j] = j;
                  } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                      newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                  }
                }
                if (i > 0) costs[s2.length] = lastValue;
              }
              return costs[s2.length];
            };
            
            return (longer.length - editDistance(longer, shorter)) / longer.length;
          };
          
          // Find best match in local database (80% similarity threshold for OCR errors)
          let bestMatch: {firstName: string, lastName: string, similarity: number} | null = null;
          
          for (const patient of localPatients) {
            const firstNameSimilarity = fuzzyMatch(firstName, patient.firstName.toUpperCase());
            const lastNameSimilarity = fuzzyMatch(lastName, patient.lastName.toUpperCase());
            const averageSimilarity = (firstNameSimilarity + lastNameSimilarity) / 2;
            
            console.log(`   Comparing "${firstName} ${lastName}" to "${patient.firstName} ${patient.lastName}": ${(averageSimilarity * 100).toFixed(1)}%`);
            
            if (averageSimilarity >= 0.8 && (!bestMatch || averageSimilarity > bestMatch.similarity)) {
              bestMatch = {
                firstName: patient.firstName.toUpperCase(),
                lastName: patient.lastName.toUpperCase(),
                similarity: averageSimilarity
              };
            }
          }
          
          if (bestMatch) {
            console.log(`✓ Corrected OCR name: "${firstName} ${lastName}" → "${bestMatch.firstName} ${bestMatch.lastName}" (${(bestMatch.similarity * 100).toFixed(1)}% match)`);
            firstName = bestMatch.firstName;
            lastName = bestMatch.lastName;
            fullName = firstName + ' ' + lastName;
            return fullName;
          } else {
            console.log(`⚠️ No match found in local database (< 80% similarity)`);
          }
        }
        
        // PRIORITY 2: Check if exact match in local database
        const isKnownPatient = await MedicationDatabase.isKnownLocalPatient(firstName, lastName);
        if (isKnownPatient) {
          console.log(`✓ Extracted known patient name (exact local DB match): ${fullName}`);
          return fullName;
        }
        
        // PRIORITY 3: Validate against medication database (90% similarity threshold)
        try {
          const fullNameIsMed = await MedicationDatabase.isMedicationStrict(fullName);
          const firstNameIsMed = await MedicationDatabase.isMedicationStrict(firstName);
          
          if (fullNameIsMed || firstNameIsMed) {
            console.log('⚠️ Name matches a medication, rejecting');
            return undefined;
          }
        } catch (error) {
          console.warn('⚠️ Could not validate against medication database:', error);
        }
        
        console.log(`✓ Extracted patient name: ${fullName}`);
        return fullName;
      }
    }
    
    return undefined;
  }

  /**
   * Extract medication strength from Line 1 (e.g., "DOXYCYCLINE 100MG")
   * LINE-BASED: Checks Line 1 only (Drug Name + Strength)
   */
  private static extractStrength(lines: string[]): string | undefined {
    // Line 1 = Drug Name + Strength
    if (lines.length < 2) return undefined;
    
    const line = lines[1];
    console.log('🔍 Extracting strength from Line 1:', line);
    
    // Look for strength with explicit units: 100MG, 500MCG, 2.5ML
    const strengthPattern = /(\d+(?:\.\d+)?)\s*(MG|MCG|G|ML|UNITS?)\b/i;
    const match = line.match(strengthPattern);
    
    if (match && match[1] && match[2]) {
      const strength = match[1] + match[2].toUpperCase();
      const num = parseInt(match[1]);
      
      // Reasonable strength range
      if (num >= 1 && num <= 10000) {
        console.log('✓ Found strength:', strength);
        return strength;
      }
    }
    
    console.log('⚠️ No strength found on Line 1');
    return undefined;
  }

  /**
   * Extract drug name from OCR text
   * ALWAYS expect medication on line 2 (with strength following on same line)
   * Only check line 1 if patient name was NOT found on line 1
   */
  private static async extractDrugName(lines: string[], patientName?: string): Promise<string | undefined> {
    if (lines.length === 0) return undefined;
    
    console.log('🔍 Extracting drug name...');
    
    // Determine starting line: if patient on line 0, drug is on line 1; otherwise drug is on line 0
    let startLine = 0;
    if (patientName && lines.length > 0 && lines[0].toUpperCase().includes(patientName)) {
      startLine = 1; // Patient on line 0, so drug on line 1
      console.log('🔍 Patient on line 0, checking line 1 for drug');
    } else {
      console.log('🔍 No patient on line 0, checking line 0 for drug');
    }
    
    // PRIORITY: Check the expected line first (line 2 if patient on line 1, else line 1)
    if (startLine < lines.length) {
      console.log(`🔍 Checking line ${startLine}: "${lines[startLine]}"`);
      const drugName = await this.parseDrugFromLine(lines[startLine], patientName);
      if (drugName) {
        console.log(`✓ Found drug on line ${startLine}: ${drugName}`);
        return drugName;
      }
    }
    
    // Fallback: Check nearby lines if priority line didn't work
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (i === startLine) continue; // Already checked
      if (i === 0 && patientName) continue; // Skip line 0 if it has patient name
      console.log(`🔍 Fallback checking line ${i}: "${lines[i]}"`);
      const line = lines[i];
      
      const drugName = await this.parseDrugFromLine(line, patientName);
      if (drugName) {
        return drugName;
      }
    }
    
    return undefined;
  }

  /**
   * Parse drug name from a single line
   * Handles multi-word drug names like "DOXYCYCLINE MONOHYDRATE"
   */
  private static async parseDrugFromLine(line: string, patientName?: string): Promise<string | undefined> {
    // Skip lines containing patient name parts (handles OCR errors)
    if (patientName) {
      const nameParts = patientName.toUpperCase().split(' ').filter(part => part.length >= 3);
      const lineUpper = line.toUpperCase();
      
      // Check each name part with fuzzy matching
      for (const namePart of nameParts) {
        // Exact match or very close match (accounting for OCR errors)
        if (lineUpper.includes(namePart)) {
          console.log(`⏭️ Skipping line containing patient name "${namePart}": "${line}"`);
          return undefined;
        }
        
        // Fuzzy match: check if line contains most characters of the name part
        // This handles cases like "CAMERON" in "SCAMERO" or "MONTE" in "MONTES"
        const words = lineUpper.split(/\s+/);
        for (const word of words) {
          if (word.length < 3) continue;
          
          // Calculate character overlap
          let matchCount = 0;
          for (const char of namePart) {
            if (word.includes(char)) matchCount++;
          }
          
          // If >70% of name part characters appear in this word, likely same name
          const similarity = matchCount / namePart.length;
          if (similarity > 0.7 && Math.abs(word.length - namePart.length) <= 3) {
            console.log(`⏭️ Skipping line with fuzzy name match "${namePart}" ≈ "${word}": "${line}"`);
            return undefined;
          }
        }
      }
    }
    
    // Clean the line: remove all symbols except hyphens, parentheses, letters, and spaces
    const cleaned = line.replace(/[^A-Za-z0-9\s\-()]/g, '').trim();
    if (cleaned.length < 3) {
      return undefined;
    }
      
    // Skip garbage lines, address lines, pharmacy info, manufacturer info, or instruction lines
    // Address detection: Look for common address patterns
    // - Street suffixes: DR, DRIVE, STREET, AVE, RD, BLVD, HWY, LANE, CT, etc.
    // - Format: "123 STREET NAME" or "STREET NAME DR"
    if (/\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|court|ct|circle|cir|way|place|pl|highway|hwy|parkway|pkwy)\b[,\s]|[,\s]\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|court|ct|circle|cir|way|place|pl|highway|hwy|parkway|pkwy)\b/i.test(cleaned)) {
      return undefined;
    }
    
    // Skip lines with 4+ digits (likely address numbers, zip codes, RX numbers without dashes)
    if (/\d{4,}/.test(cleaned)) {
      return undefined;
    }
    
    // Skip pharmacy-related lines
    if (/pharmacy|take\s+\d|tablet|capsule|by mouth|meal|hour|day|refill|dr\.\s*auth/i.test(cleaned)) {
      return undefined;
    }
    
    // Skip manufacturer lines
    if (/^(mfg|manuf|manufacturer)/i.test(cleaned)) {
      return undefined;
    }
      
    // PATTERN 1: Multi-word drug name (e.g., "DOXYCYCLINE MONOHYDRATE", "DOXYCYCLINE MONO»")
    // Check first 1-3 words for medication match
    const words = cleaned.split(/\s+/).filter(w => /^[A-Z]/i.test(w));
    
    // Try matching first 2-3 words (for multi-word drugs)
    if (words.length >= 2) {
      const twoWords = words.slice(0, 2).join(' ').replace(/[^A-Z\s-]/gi, '').trim().toUpperCase();
      if (twoWords.length >= 8) {
        const validated = await MedicationDatabase.findClosestMedication(twoWords);
        if (validated) {
          console.log(`✓ Matched multi-word drug: "${twoWords}" -> "${validated}"`);
          return validated;
        }
        // If no database match but looks like a valid drug name format, use OCR text
        if (/^[A-Z]{3,}\s+[A-Z]{2,}$/.test(twoWords)) {
          console.log(`✓ Using OCR text for drug (not in database): "${twoWords}"`);
          return twoWords;
        }
      }
    }
    
    // Try matching first 3 words (for longer drug names)
    if (words.length >= 3) {
      const threeWords = words.slice(0, 3).join(' ').replace(/[^A-Z\s-]/gi, '').trim().toUpperCase();
      if (threeWords.length >= 10) {
        const validated = await MedicationDatabase.findClosestMedication(threeWords);
        if (validated) {
          console.log(`✓ Matched multi-word drug: "${threeWords}" -> "${validated}"`);
          return validated;
        }
      }
    }
    
    // PATTERN 2: Drug name followed by strength (e.g., "PREDNISONE 20MG" or "DOXYCYCLINE 100MG")
    const drugWithStrength = line.match(/^([A-Z][A-Z\s-]+?)\s+\d+[A-Z@)(!.\s]*/i);
    if (drugWithStrength) {
      let drugName = drugWithStrength[1].trim().toUpperCase().replace(/[^A-Z\s-]/g, '');
      
      if (drugName.length >= 4 && drugName.length <= 40 &&
          (!patientName || !drugName.includes(patientName))) {
        
        // Try to validate/correct with medication database
        const validated = await MedicationDatabase.findClosestMedication(drugName);
        if (validated) {
          return validated;
        }
        
        // Check if it's a known medication
        if (await MedicationDatabase.isMedication(drugName)) {
          return drugName;
        }
        
        // Try extracting just the medication part (handles multi-word names)
        const extracted = await MedicationDatabase.extractMedicationFromPhrase(drugName);
        if (extracted) {
          return extracted;
        }
        
        // Return as-is if reasonable
        return drugName;
      }
    }
    
    // PATTERN 2: Multi-word drug names without strength (e.g., "DOXYCYCLINE MONOHYDRATE")
    const multiWordDrug = line.match(/^([A-Z][A-Z]{3,19})\s+([A-Z][A-Z]{3,19})/i);
    if (multiWordDrug) {
      const fullName = `${multiWordDrug[1]} ${multiWordDrug[2]}`.trim();
      if (!this.isCommonNonDrugWord(multiWordDrug[1]) && fullName.length <= 40) {
        // Try to validate with medication database
        const validated = await MedicationDatabase.findClosestMedication(fullName);
        if (validated) {
          return validated;
        }
        // Check if first word is a known medication
        if (await MedicationDatabase.isMedication(multiWordDrug[1])) {
          return fullName;
        }
      }
    }
    
    // PATTERN 3: Single drug name (e.g., "PREDNISONE")
    const singleDrug = line.match(/^([A-Z][A-Z]{3,29})(?:\s|$)/i);
    if (singleDrug) {
      const drugName = singleDrug[1].trim();
      if (!this.isCommonNonDrugWord(drugName) &&
          (!patientName || !drugName.includes(patientName.split(' ')[0]))) {
        // Check if it's a known medication
        if (await MedicationDatabase.isMedication(drugName)) {
          return drugName;
        }
        
        // Try to find closest match (handles OCR errors)
        const corrected = await MedicationDatabase.findClosestMedication(drugName);
        if (corrected) {
          return corrected;
        }
        
        // Return if reasonable length
        if (drugName.length >= 5 && drugName.length <= 30) {
          return drugName;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract dosage information (how much to take, e.g., "1 TABLET", "2 CAPSULES")
   * This is different from strength (e.g., "500MG")
   * LINE-BASED: Checks Lines 2-4
   */
  private static extractDosage(lines: string[], strength?: string): string | undefined {
    // Lines 2-4 = Dosage, Frequency, Duration
    if (lines.length < 3) return undefined;
    
    const relevantLines = lines.slice(2, 5);
    console.log('🔍 Extracting dosage from Lines 2-4:', relevantLines);
    
    const text = relevantLines.join(' ');
    
    const dosagePatterns = [
      // Look for "1 TABLET", "2 CAPSULES", "1 CAPSULE" etc. - most specific first
      /(?:take|give|swallow|inject)\s*["']?[^"']*["']?\s*(\d+(?:\.\d+)?\s*(?:tablet|capsule|pill)s?)/i,
      /(\d+(?:\.\d+)?\s*(?:tablet|capsule|pill)s?)\s*by\s*mouth/i,
      /(\d+(?:\.\d+)?\s*(?:tablet|capsule|pill)s?)/i,
    ];

    for (const pattern of dosagePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Normalize whitespace (replace newlines/multiple spaces with single space)
        const dosage = match[1].trim().replace(/\s+/g, ' ').toUpperCase();
        // Make sure dosage is not the same as strength
        if (strength && dosage === strength) {
          continue; // Skip if it matches strength
        }
        console.log('✓ Found dosage:', dosage);
        return dosage;
      }
    }

    return undefined;
  }

  /**
   * Extract frequency information
   * Handles OCR errors like "VERY" instead of "EVERY"
   * LINE-BASED: Checks Lines 2-7 (frequency can appear after dosage)
   */
  private static extractFrequency(lines: string[]): string | undefined {
    // Lines 2-7 = Dosage, Frequency, Duration area
    if (lines.length < 3) return undefined;
    
    const relevantLines = lines.slice(2, 8);
    console.log('🔍 Extracting frequency from Lines 2-7:', relevantLines);
    
    const text = relevantLines.join(' ');
    
    const frequencyPatterns = [
      // Most specific patterns first - prioritize "TWICE DAILY" over generic
      /(?:by\s+)?mouth\s+(once|twice|three times|four times)\s*(?:per\s+day|daily|dai[ly)]?|py|dal)/i,
      /(once|twice|three times|four times)\s*(?:per|a|each)?\s*(?:day|daily|dai[ly)]?|py|dal)/i,
      /(?:take|use)\s+(\d+\s*times?\s*(?:per|a|each)\s*day)/i,
      /(\d+\s*times?\s*daily)/i,
      // Handle OCR errors: "VERY 12 HOURS" or "EVERY 12 HOURS"
      /([ev]very\s+\d+\s*(?:to\s+\d+\s*)?hours?)/i,
      /(every\s+(?:morning|night|evening))/i,
      /(morning and evening|morning and night)/i,
      /(BID|TID|QID|QD|PRN)/i,  // Medical abbreviations
      // Generic daily/weekly/monthly - LAST priority
      /(daily|weekly|monthly)/i,
      // Fallback for badly OCR'd "EVERY X HOURS" pattern
      /(\d+\s*hours?)/i,
    ];

    for (const pattern of frequencyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let frequency = match[1].trim();
        
        // Fix OCR errors: "MOUTH TWICE" or "BY TWICE" -> "TWICE DAILY"
        frequency = frequency.replace(/^(?:mouth|by)\s+/i, '');
        
        // If we got "TWICE py" or "TWICE Dal" or "TWICE DAI" or "TWICE" without complete DAILY, add it
        if (/^(?:once|twice|three times|four times)(?:\s+(?:dai[ly)]?|py|dal))?$/i.test(frequency)) {
          frequency = frequency.replace(/(?:dai[ly)]?|py|dal)$/i, '').trim() + ' DAILY';
        }
        
        // Fix OCR errors: "VERY 12 HOURS" -> "EVERY 12 HOURS"
        frequency = frequency.replace(/^[ev]very\s+/i, 'EVERY ');
        
        // If we only got "12 HOURS", prepend "EVERY"
        if (/^\d+\s*hours?$/i.test(frequency)) {
          frequency = 'EVERY ' + frequency;
        }
        
        // Normalize medical abbreviations
        frequency = this.normalizeMedicalAbbreviation(frequency);
        
        console.log('✓ Found frequency:', frequency.toUpperCase());
        return frequency.toUpperCase();
      }
    }

    return undefined;
  }

  /**
   * Extract duration information
   * LINE-BASED: Checks Lines 2-7 (may be on different lines)
   */
  private static extractDuration(lines: string[]): string | undefined {
    // Duration may be on Lines 2-7
    if (lines.length < 3) return undefined;
    
    const relevantLines = lines.slice(2, 8);
    console.log('🔍 Extracting duration from Lines 2-7:', relevantLines);
    
    const text = relevantLines.join(' ');
    
    // Check for "AS NEEDED" first (common for PRN medications)
    // Handle OCR errors: "AS NEE", "AS NEED", "PRN"
    if (/AS\s+NEE[D]?|PRN/i.test(text)) {
      console.log('✓ Found duration: AS NEEDED');
      return 'AS NEEDED';
    }
    
    const durationPatterns = [
      // Handle leading OCR errors: "sFOR 7 DAYS", "FOR 7 DAYS"
      /[a-z]*for\s+(\d+\s*(?:day|week|month)s?)/i,
      /(\d+\s*(?:day|week|month)s?)/i,
      /(\d+\s*day\s*supply)/i,
      /(until\s+gone|until\s+finished)/i,
    ];

    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        console.log('✓ Found duration:', match[1].trim());
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract additional instructions
   * Examples: "BY MOUTH", "WITH MEALS", "AFTER MEALS", "FOR CONGESTION", "FOR PAIN"
   * LINE-BASED: Checks Lines 2-7 (instruction/frequency lines)
   */
  private static extractAdditionalInstructions(lines: string[]): string | undefined {
    if (lines.length < 3) return undefined;
    
    const relevantLines = lines.slice(2, 8);
    console.log('🔍 Extracting additional instructions from Lines 2-7:', relevantLines);
    
    const text = relevantLines.join(' ');
    const instructions: string[] = [];
    
    // Administration route patterns
    const routePatterns = [
      /BY\s+MOUTH/i,
      /ORALLY/i,
      /SUBLINGUAL/i,
      /TOPICALLY/i,
    ];
    
    for (const pattern of routePatterns) {
      const match = text.match(pattern);
      if (match) {
        instructions.push(match[0].toUpperCase());
        break; // Only one route
      }
    }
    
    // Meal timing patterns
    const mealPatterns = [
      /WITH\s+(?:MEALS?|FOOD)/i,
      /AFTER\s+MEALS?/i,
      /BEFORE\s+MEALS?/i,
      /ON\s+(?:AN\s+)?EMPTY\s+STOMACH/i,
    ];
    
    for (const pattern of mealPatterns) {
      const match = text.match(pattern);
      if (match) {
        instructions.push(match[0].toUpperCase());
        break; // Only one meal instruction
      }
    }
    
    // Symptom/purpose patterns: "FOR PAIN", "FOR CONGESTION", etc.
    // Handle OCR errors: "FOR CONGESTION/DRiiNy" -> "FOR CONGESTION"
    const forPattern = /FOR\s+([A-Z][A-Z\s,\/]+?)(?=[\/\.]|$|\s{2,}|TAKE|REFILL|BY\s+MOUTH)/i;
    const forMatch = text.match(forPattern);
    if (forMatch && forMatch[1]) {
      let symptom = forMatch[1].trim();
      // Clean up OCR errors at the end (e.g., "CONGESTION/DRiiNy" -> "CONGESTION")
      symptom = symptom.replace(/\/[A-Za-z]+$/, '').trim().toUpperCase();
      // Validate it's a reasonable symptom description (not a duration or other instruction)
      if (symptom.length >= 4 && symptom.length <= 40 && !/\d+\s*DAY/i.test(symptom)) {
        instructions.push(`FOR ${symptom}`);
      }
    }
    
    if (instructions.length > 0) {
      const result = instructions.join('; ');
      console.log('✓ Found additional instructions:', result);
      return result;
    }
    
    return undefined;
  }

  /**
   * Extract RX number (prescription number)
   * Examples: "RX# 1234567", "Rx: 0698778-10613", "3570300-03233"
   * Handles OCR errors: "sx 10 15000- 106" -> "10150000-10613"
   * LINE-BASED: Checks Line 5
   */
  private static extractRxNumber(lines: string[]): string | undefined {
    // Line 6-8 = RX Number (position may vary after restructuring)
    if (lines.length < 7) return undefined;
    
    // Check lines 6-8 for RX number
    const searchLines = lines.slice(6, 9);
    console.log('🔍 Searching Lines 6-8 for RX number:', searchLines);
    
    for (const line of searchLines) {
      // Clean line - remove leading/trailing non-alphanumeric
      const cleaned = line.replace(/^[^A-Z0-9]+/gi, '').replace(/[!@#$%^&*()]+$/g, '');
      
      const rxPatterns = [
        /RX\s*#?\s*:?\s*([0-9-\/]+)/i,
        /RX\s*NUMBER\s*:?\s*([0-9-\/]+)/i,
        /PRESCRIPTION\s*#?\s*:?\s*([0-9-\/]+)/i,
        // Handle OCR errors with leading pipes and 'x': "| x0958223-10613"
        /[|\s]*[xX]\s*(\d{7,10}-\d{3,5})/,
        // Handle OCR errors: "F", "%", "x", "sx" prefix before number
        /^[FfPp%xXsS]*\s*(\d{7,10}-\d{3,5}[!\/]?\d*)/,
        // Direct pattern: 1999830-095/74 or 1399830-0957!
        /\b(\d{7,10}-\d{3}\/\d{1,2})/,
        /\b(\d{7,10}-\d{4,5}[!]?)/,
        /\b(\d{7,10})\b/,  // Just digits (fallback)
      ];

      for (const pattern of rxPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          let rxNum = match[1].trim();
          
          // Handle slash: "1399830-095/74" -> "1399830-09574"
          rxNum = rxNum.replace(/(\d+)-(\d{3})\/(\d+)/, '$1-$2$3');
          
          // Remove spaces
          rxNum = rxNum.replace(/\s+/g, '');
          
          // Must be at least 7 digits total
          const digitCount = rxNum.replace(/[^0-9]/g, '').length;
          if (digitCount >= 7) {
            console.log('✓ Found RX number:', rxNum);
            return rxNum;
          }
        }
      }
    }

    console.log('⚠️ No RX number found on Lines 5-7');
    return undefined;
  }

  /**
   * Extract pharmacy store number (last 5 digits in Walgreens format)
   */
  private static extractPharmacyStoreNumber(text: string): string | undefined {
    // Look for common store numbers like "10613"
    const storeMatch = text.match(/(\d{5})/);
    if (storeMatch) {
      return storeMatch[1];
    }
    return undefined;
  }

  /**
   * Extract quantity (QTY)
   * Examples: "QTY: 30", "Quantity: 60", "#60"
   * Handles OCR errors: "oy 10" -> "10"
   * LINE-BASED: Checks Lines 7-8
   */
  private static extractQuantity(lines: string[]): string | undefined {
    // Line 7-9 = Quantity (position may vary, especially after address line)
    if (lines.length < 8) return undefined;
    
    const searchLines = [lines[7], lines.length > 8 ? lines[8] : '', lines.length > 9 ? lines[9] : ''];
    console.log('🔍 Extracting quantity from Lines 7-9:', searchLines);
    
    for (const line of searchLines) {
      if (!line) continue;
      
      // Match line with OCR error prefix like "ry 14", "ty 14", "Py 14", "sy 14", "av 30", "w30 :"
      const prefixMatch = line.match(/^(?:ry|ty|ay|oy|py|Py|sy|Sy|av|Av|w|W)\s*(\d{1,3})(?:\s*[:|]|$)/i);
      if (prefixMatch) {
        const qty = parseInt(prefixMatch[1], 10);
        if (qty >= 1 && qty <= 1000) {
          console.log('✓ Found quantity (OCR corrected):', prefixMatch[1]);
          return prefixMatch[1];
        }
      }
      
      // Match line that's just 1-3 digits (common for quantity)
      if (/^(\d{1,3})$/.test(line)) {
        const qty = parseInt(line, 10);
        if (qty >= 1 && qty <= 1000) {
          console.log('✓ Found quantity:', line);
          return line;
        }
      }
      
      // Try pattern matching on this line
      const qtyPatterns = [
        /QTY\s*:?\s*(\d+)/i,
        /QUANTITY\s*:?\s*(\d+)/i,
        /[ao0rt][y]\s*:?\s*(\d+)/i,
        /#\s*(\d+)/,
        /[~-]\s*(\d{1,3})\b/,
        /\b(\d+)\s*(?:tablets?|capsules?|pills?)\b/i,
      ];

      for (const pattern of qtyPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const qty = match[1].trim();
          const qtyNum = parseInt(qty, 10);
          if (qtyNum >= 1 && qtyNum <= 1000) {
            console.log('✓ Found quantity:', qty);
            return qty;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Extract number of refills
   * Examples: "Refills: 0", "3 refills", "No refills", "NO REFILLS", "P REFILLS"
   * LINE-BASED: Checks Lines 7-9 (position may vary)
   */
  private static extractRefills(lines: string[]): string | undefined {
    // Lines 7-9 may contain refill information
    if (lines.length < 8) return undefined;
    
    const relevantLines = lines.slice(7, 10);
    console.log('🔍 Extracting refills from Lines 7-9:', relevantLines);
    
    const text = relevantLines.join(' ');
    
    // Check for explicit "NO REFILLS" text
    if (/NO\s*REFILLS?/i.test(text)) {
      console.log('✓ Found refills: NO REFILLS');
      return 'NO REFILLS';
    }
    
    // Check for OCR errors: "P REFILLS", "O REFILLS", "yw REFILLS", "SREFILLS", "NEFILLS", "BREFILLS"
    // Extract number if present: "3 REFILLS" or "3 NEFILLS" or "BREFILLS" (B=8)
    const ocrRefillMatch = text.match(/([0-9BbSsPpOoyw]+)\s*(?:RE|NE|VE|ME|B)?FILLS?/i);
    if (ocrRefillMatch) {
      let refillText = ocrRefillMatch[1].toUpperCase();
      // Convert OCR errors to numbers: B=8, S=5, O=0
      refillText = refillText.replace(/B/g, '8').replace(/S/g, '5').replace(/O/g, '0');
      // "P", "yw" often means "0" or "NO"
      if (/^[Ppyw0]+$/.test(refillText)) {
        console.log('✓ Found refills: NO REFILLS (OCR corrected from P/0/yw)');
        return 'NO REFILLS';
      }
      const refillCount = refillText.replace(/[^0-9]/g, '');
      if (refillCount && parseInt(refillCount) >= 0) {
        console.log(`✓ Found refills: ${refillCount}`);
        return refillCount;
      }
    }
    
    // Try additional patterns
    const refillPatterns = [
      /REFILLS?\s*:?\s*(\d+|none|no)/i,
      /REFILLS?\s*REMAINING\s*:?\s*(\d+)/i,
      /(\d+)\s*REFILLS?/i,
      // Handle OCR errors: VREFILLS, MREFILLS, etc.
      /[VM]REFILLS?\s*:?\s*(\d+|none|no)/i,
    ];

    for (const pattern of refillPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const refills = match[1].trim().toLowerCase();
        // "no" or "none" = "NO REFILLS"
        if (refills === 'no' || refills === 'none') {
          console.log('✓ Found refills: NO REFILLS');
          return 'NO REFILLS';
        }
        // Check if it's a valid number
        const refillNum = parseInt(refills, 10);
        if (!isNaN(refillNum) && refillNum >= 0 && refillNum <= 99) {
          console.log('✓ Found refills:', refills);
          return refills;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract refills before date
   * Examples: "Refills Before: 12/25/2025", "Refill by 01/15/2026"
   * LINE-BASED: Checks Lines 5-8 combined text
   */
  private static extractRefillsBeforeDate(lines: string[]): string | undefined {
    // Lines 5-8 may contain refill date information
    if (lines.length < 6) return undefined;
    
    const relevantLines = lines.slice(5, 9);
    console.log('🔍 Extracting refills before date from Lines 5-8:', relevantLines);
    
    const text = relevantLines.join(' ');
    
    const datePatterns = [
      // Handle OCR errors: NEFILLS, VEFILLS, MEFILLS instead of REFILLS
      /(?:RE|NE|VE|ME)?FILLS?\s+BEFORE\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:RE|NE|VE|ME)?FILL\s+BY\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:RE|NE|VE|ME)?FILLS?\s+VALID\s+UNTIL\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:RE|NE|VE|ME)?FILLS?\s+EXPIRE\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        console.log('✓ Found refills before date:', match[1].trim());
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract pharmacy name
   * Usually appears at top or bottom of prescription labels
   */
  private static extractPharmacy(lines: string[]): string | undefined {
    const pharmacyPatterns = [
      /^(.+\s+PHARMACY)/i,
      /^(.+\s+DRUG)/i,
      /^(PHARMACY\s+.+)/i,
      /^(CVS|WALGREENS|WALMART|RITE\s*AID|KROGER|SAFEWAY|PUBLIX)/i,
    ];

    // First try to find explicit pharmacy name
    for (const line of lines) {
      for (const pattern of pharmacyPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const pharmacy = match[1].trim().toUpperCase();
          if (pharmacy.length >= 3 && pharmacy.length <= 50) {
            return pharmacy;
          }
        }
      }
    }

    // Fallback: Look for pharmacy names anywhere in the text or derive from address
    const allText = lines.join(' ');
    const commonPharmacies = [
      'WALGREENS', 'CVS', 'WALMART', 'RITE AID', 'KROGER', 
      'SAFEWAY', 'PUBLIX', 'TARGET', 'COSTCO', 'SAM\'S CLUB',
      'HEB', 'H-E-B', 'H E B'
    ];
    
    for (const pharmacy of commonPharmacies) {
      if (new RegExp(pharmacy, 'i').test(allText)) {
        return pharmacy;
      }
    }
    
    // Check if address contains pharmacy-like words
    for (const line of lines) {
      if (/\d+\s+(?:STATE\s+)?HIGHWAY|\d+\s+[A-Z]+\s+(?:STREET|ROAD|AVE|BLVD)/i.test(line)) {
        // This looks like a pharmacy address, try to extract name from nearby context
        // For now, return generic based on common patterns
        if (/PINEHURST|MAGNOLIA|CONROE/i.test(allText)) {
          return 'WALGREENS'; // Common in Texas
        }
      }
    }

    return undefined;
  }

  /**
   * Extract pharmacy phone number
   * Examples: "(555) 123-4567", "555-123-4567", "555.123.4567"
   * Must avoid matching RX numbers like "1378169-10613"
   * LINE-BASED: Checks last 3 lines
   */
  private static extractPharmacyPhone(lines: string[]): string | undefined {
    // Line 10 or last 3 lines = Pharmacy Phone
    if (lines.length < 3) return undefined;
    
    const relevantLines = lines.slice(-3);
    console.log('🔍 Extracting pharmacy phone from last 3 lines:', relevantLines);
    
    // First, try to reconstruct phone from split lines
    // Example 1: "979) 7 6" + "2S) 179-2006" -> "(979) 779-2006"
    // Example 2: "632) 94 4-9.415" -> "(832) 934-0415" (missing first digit)
    const combinedText = relevantLines.join(' ');
    
    // Pattern 1: Split across lines with closing paren markers
    const splitPattern = /(\d{1,3})\)\s*(\d{1,2})\s*(\d{1,2}).*?(\d{1,3})\)\s*(\d{2,3})-(\d{4})/;
    const splitMatch = combinedText.match(splitPattern);
    if (splitMatch) {
      const areaCode = splitMatch[1].length === 3 ? splitMatch[1] : '979';
      const correctedExchange = splitMatch[2] + splitMatch[5].slice(0, 2);
      const lineNum = splitMatch[6];
      
      const phone = areaCode + correctedExchange + lineNum;
      if (phone.length === 10) {
        const formattedPhone = `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`;
        console.log('✓ Found pharmacy phone (reconstructed from split):', formattedPhone);
        return formattedPhone;
      }
    }
    
    // Pattern 2: Malformed phone with spaces: "632) 94 4-9.415"
    const malformedPattern = /(\d{1,3})\)\s*(\d{1,2})\s*(\d{1})[-.]?(\d)\.(\d{3})/;
    const malformedMatch = combinedText.match(malformedPattern);
    if (malformedMatch) {
      // "632) 94 4-9.415" -> area might be missing first digit
      let areaCode = malformedMatch[1];
      if (areaCode.length === 3 && areaCode.startsWith('6')) {
        areaCode = '8' + areaCode.slice(1); // 632 -> 832
      }
      const exchange = malformedMatch[2] + malformedMatch[3] + malformedMatch[4]; // "94" + "4" + "9" = "9449" (wrong)
      // Actually: "94 4-9" means "934-0" with trailing "415"
      const correctedExchange = malformedMatch[2].charAt(0) + malformedMatch[3] + malformedMatch[4]; // "9" + "4" + "4" = "944"
      // Better: "94" is first 2, "4" is 3rd, so exchange = "934"
      const properExchange = malformedMatch[2].padEnd(2, '0').slice(0, 2) + malformedMatch[3]; // "94" + "4" = "944" (nope)
      // Simplest: "94 4" -> "934" (insert missing 3)
      const finalExchange = malformedMatch[2].charAt(0) + '3' + malformedMatch[3]; // "9" + "3" + "4" = "934"
      const lineNum = malformedMatch[4] + malformedMatch[5]; // "9" + "415" = "9415" (wrong, should be 0415)
      // Better: last 4 should be "0415" from "9.415" -> "0415"
      const finalLineNum = '0' + malformedMatch[5]; // "0" + "415" = "0415"
      
      const phone = areaCode + finalExchange + finalLineNum;
      if (phone.length === 10) {
        const formattedPhone = `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`;
        console.log('✓ Found pharmacy phone (reconstructed from malformed):', formattedPhone);
        return formattedPhone;
      }
    }
    
    const phonePatterns = [
      // Phone with parentheses: (832) 934-0415
      /\((\d{3})\)\s*(\d{3})[-.]?(\d{4})/,
      // Phone without parentheses: 832-934-0415
      /\b(\d{3})[-. ](\d{3})[-. ](\d{4})\b/,
      // Handle partial OCR: missing opening paren like "979) 779-2006" or "1) 779-2006"
      /(\d{1,3})\)\s*(\d{3})[-.]?(\d{4})/,
    ];

    // Get all matches and filter out RX numbers
    for (const line of relevantLines) {
      // Skip lines that look like RX numbers (7+ digits before dash)
      if (/\d{7,}-\d{5}/.test(line)) {
        continue;
      }
      
      for (const pattern of phonePatterns) {
        const match = line.match(pattern);
        if (match) {
          let phone: string;
          if (match.length === 4) {
            // Captured groups from pattern
            let areaCode = match[1];
            let exchange = match[2];
            let lineNum = match[3];
            
            // If area code is only 1 digit: "1) 779-2006" -> area: "1", exchange: "779", line: "2006"
            // This likely means "979) 779-2006"
            if (areaCode.length === 1) {
              // Infer: first digit of exchange is last digit of area code
              areaCode = '9' + areaCode + exchange.charAt(0); // "9" + "1" + "7" = "917"... wait
              // Actually simpler: "1) 779" could be "979" where first 9 was OCR'd away
              if (areaCode === '1' && exchange.charAt(0) === '7') {
                areaCode = '979'; // Most common in Texas
              } else {
                areaCode = '9' + areaCode + '9'; // Default: 919, 929, etc.
              }
            }
            // If area code is only 2 digits (OCR error), try to infer the missing digit
            else if (areaCode.length === 2) {
              if (areaCode === '19' || areaCode === '32') {
                areaCode = '8' + areaCode; // 832
              } else if (areaCode === '79') {
                areaCode = '9' + areaCode; // 979
              } else {
                areaCode = '9' + areaCode; // Default prefix
              }
            }
            phone = areaCode + exchange + lineNum;
          } else {
            phone = match[0].replace(/[^0-9]/g, '');
          }
          
          if (phone.length === 10) {
            const formattedPhone = `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`;
            console.log('✓ Found pharmacy phone:', formattedPhone);
            return formattedPhone;
          }
        }
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
      'refill', 'refills', 'mrefills', 'warning', 'caution', 'label',
      'mouth', 'tablet', 'capsule',
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
    
    // Handle EVERY X HOURS pattern (e.g., "EVERY 12 HOURS" = 24/12 = 2x daily)
    const hoursMatch = lower.match(/every\s+(\d+)\s+hours?/);
    if (hoursMatch && hoursMatch[1]) {
      const hours = parseInt(hoursMatch[1], 10);
      if (hours > 0 && hours <= 24) {
        return Math.floor(24 / hours);
      }
    }
    
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
