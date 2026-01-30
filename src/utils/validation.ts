/**
 * Zod Schema Validation - Treat OCR output and API responses as untrusted input
 * 
 * All external data should be validated before use:
 * - OCR text output
 * - LLM parsed results
 * - Supabase API responses
 * - User input
 * 
 * This prevents:
 * - Injection attacks
 * - Type confusion
 * - Buffer overflows (via length limits)
 * - Malformed data corruption
 */

import { z } from 'zod';

// =============================================================================
// Common Validators
// =============================================================================

/**
 * Safe string with length limits
 * Prevents excessively long strings that could cause memory issues
 */
const safeString = (maxLength = 500) => 
  z.string().max(maxLength).trim();

/**
 * Safe text that might come from OCR
 * More permissive character set, still length-limited
 */
const ocrText = (maxLength = 1000) =>
  z.string()
    .max(maxLength)
    .transform(s => s.trim())
    .optional()
    .nullable();

/**
 * Medication name - alphanumeric with common characters
 */
const medicationName = z.string()
  .min(1, 'Medication name is required')
  .max(200, 'Medication name too long')
  .regex(
    /^[\w\s\-'.,()\/\[\]®™%]+$/,
    'Invalid characters in medication name'
  )
  .transform(s => s.trim());

/**
 * Dosage/strength - numeric with units
 */
const dosageString = z.string()
  .max(100, 'Dosage string too long')
  .regex(
    /^[\d.,\s]+(?:mg|mcg|g|ml|cc|units?|iu|meq|%)?(?:\/[\d.,\s]+(?:mg|mcg|g|ml|cc|units?|iu|meq|%)?)?$/i,
    'Invalid dosage format'
  )
  .optional()
  .nullable();

/**
 * Quantity - positive integer
 */
const quantity = z.number()
  .int('Quantity must be a whole number')
  .min(0, 'Quantity cannot be negative')
  .max(9999, 'Quantity too large')
  .optional()
  .nullable();

/**
 * Refills - 0-99
 */
const refills = z.number()
  .int()
  .min(0, 'Refills cannot be negative')
  .max(99, 'Refills value too high')
  .optional()
  .nullable();

// =============================================================================
// Medication Schemas
// =============================================================================

/**
 * Schema for medication data from OCR/LLM parsing
 * More permissive since OCR output may be imperfect
 */
export const OcrParsedMedicationSchema = z.object({
  drug_name: ocrText(200),
  strength: ocrText(100),
  route: ocrText(50),
  instruction: ocrText(500),
  frequency_text: ocrText(200),
  qty_text: ocrText(50),
  refills_text: ocrText(50),
  prescriber_name: ocrText(100),
  pharmacy_name: ocrText(100),
  pharmacy_phone: ocrText(20),
  ndc_code: ocrText(20),
  rx_number: ocrText(20),
}).partial();

/**
 * Schema for validated medication (user-confirmed or cleaned)
 */
export const ValidatedMedicationSchema = z.object({
  drug_name: medicationName,
  strength: safeString(100).optional().nullable(),
  route: z.enum(['oral', 'topical', 'injection', 'inhalation', 'other']).optional().nullable(),
  instruction: safeString(500).optional().nullable(),
  frequency_text: safeString(200).optional().nullable(),
  qty_text: safeString(50).optional().nullable(),
  refills_text: safeString(50).optional().nullable(),
});

/**
 * Schema for medication from Supabase API response
 */
export const BackendMedicationSchema = z.object({
  id: z.number().int().positive(),
  user_key: z.string().uuid(),
  medication_key: z.string().max(100).nullable(),
  drug_name: safeString(200).optional().nullable(),
  strength: safeString(100).optional().nullable(),
  route: safeString(50).optional().nullable(),
  instruction: safeString(500).optional().nullable(),
  frequency_text: safeString(200).optional().nullable(),
  qty_text: safeString(50).optional().nullable(),
  refills_text: safeString(50).optional().nullable(),
  is_active: z.boolean().optional().nullable(),
  created_at: z.string().datetime().optional().nullable(),
  updated_at: z.string().datetime().optional().nullable(),
});

/**
 * Schema for creating a new medication
 */
export const CreateMedicationSchema = z.object({
  drug_name: medicationName,
  strength: safeString(100).optional(),
  route: safeString(50).optional(),
  instruction: safeString(500).optional(),
  frequency_text: safeString(200).optional(),
  qty_text: safeString(50).optional(),
  refills_text: safeString(50).optional(),
});

// =============================================================================
// User Schemas
// =============================================================================

/**
 * Email validation
 */
const email = z.string()
  .email('Invalid email address')
  .max(254, 'Email too long')
  .transform(s => s.toLowerCase().trim());

/**
 * Password requirements
 */
const password = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Schema for signup request
 */
export const SignupRequestSchema = z.object({
  email,
  password,
  display_name: safeString(100).optional(),
  first_name: safeString(50).optional(),
  last_name: safeString(50).optional(),
});

/**
 * Schema for login request
 */
export const LoginRequestSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});

// =============================================================================
// Schedule/Event Schemas
// =============================================================================

/**
 * Schema for medication schedule
 */
export const ScheduleSchema = z.object({
  medication_id: z.number().int().positive(),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1, 'At least one day required'),
  is_active: z.boolean().default(true),
});

/**
 * Schema for adherence event
 */
export const AdherenceEventSchema = z.object({
  medication_id: z.number().int().positive(),
  scheduled_time: z.string().datetime(),
  taken_time: z.string().datetime().optional().nullable(),
  status: z.enum(['taken', 'missed', 'skipped', 'pending']),
  notes: safeString(500).optional().nullable(),
});

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate OCR parsed medication data
 * Returns validated data or null if invalid
 */
export function validateOcrResult(data: unknown): z.infer<typeof OcrParsedMedicationSchema> | null {
  try {
    return OcrParsedMedicationSchema.parse(data);
  } catch (error) {
    console.warn('OCR result validation failed:', error);
    return null;
  }
}

/**
 * Validate medication from API response
 * Returns validated data or throws
 */
export function validateBackendMedication(data: unknown): z.infer<typeof BackendMedicationSchema> {
  return BackendMedicationSchema.parse(data);
}

/**
 * Validate array of medications from API
 */
export function validateMedicationArray(data: unknown): z.infer<typeof BackendMedicationSchema>[] {
  return z.array(BackendMedicationSchema).parse(data);
}

/**
 * Safe parse - returns result object instead of throwing
 */
export function safeParse<T extends z.ZodSchema>(
  schema: T, 
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result;
}

// Export types
export type OcrParsedMedication = z.infer<typeof OcrParsedMedicationSchema>;
export type ValidatedMedication = z.infer<typeof ValidatedMedicationSchema>;
export type BackendMedication = z.infer<typeof BackendMedicationSchema>;
export type CreateMedication = z.infer<typeof CreateMedicationSchema>;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type AdherenceEvent = z.infer<typeof AdherenceEventSchema>;
