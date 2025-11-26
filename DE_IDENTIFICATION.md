# Data De-Identification System

## Overview
MedBuddy implements a comprehensive de-identification system to protect patient privacy and comply with data protection regulations (HIPAA, GDPR).

## How It Works

### 1. User ID Generation
When a user creates an account, the system generates a **unique, random, de-identified ID**:

```
Format: USR_<timestamp>_<random12chars>
Example: USR_1764042094705_kfc84sw16xyz
```

This ID is:
- **Unique**: Globally unique across all users
- **Random**: Cannot be reverse-engineered to identify the user
- **Permanent**: Never changes for the lifetime of the account
- **De-identified**: Contains no personal information

### 2. Data Storage Architecture

#### Email → User ID Lookup (Login Only)
```json
{
  "@user_lookup": {
    "user@email.com": "USR_1764042094705_kfc84sw16xyz"
  }
}
```
- **Purpose**: Enable login with email
- **Scope**: Only used during authentication
- **Access**: Never exposed in medication or health data

#### Profile Data (Separated by User ID)
```json
{
  "@profile_data_USR_1764042094705_kfc84sw16xyz": {
    "firstName": "John",
    "lastName": "Doe",
    "nickname": "Johnny",
    "age": "30",
    "gender": "Male",
    "email": "user@email.com",
    "createdAt": "2025-11-24T10:30:00Z"
  }
}
```

#### Medication Data (De-identified Keys)
```json
{
  "@medications_USR_1764042094705_kfc84sw16xyz": [
    {
      "id": "med_abc123",
      "drugName": "Medication Name",
      "dosage": "10mg",
      ...
    }
  ]
}
```

#### Adherence Records (De-identified Keys)
```json
{
  "@adherence_records_USR_1764042094705_kfc84sw16xyz": [
    {
      "id": "adh_xyz789",
      "medicationId": "med_abc123",
      "status": "taken",
      ...
    }
  ]
}
```

### 3. Current User Tracking
```json
{
  "@current_user_id": "USR_1764042094705_kfc84sw16xyz"
}
```

Only the de-identified user ID is stored - never email or name.

## Privacy Guarantees

### ✅ What IS De-identified:
1. **All medication data** - Stored with user ID, not email or name
2. **All adherence records** - Linked to user ID only
3. **All preferences** - Stored with user ID
4. **Current session** - Only tracks user ID

### ✅ What IS Protected:
1. **Profile data** - Stored separately from health data
2. **Email addresses** - Only in lookup table, not in medication data
3. **Names** - Only in profile data, not in medication records
4. **Age/Gender** - Only in profile data, not in medication records

### ✅ Separation of Concerns:
```
Login/Authentication Layer (PII)
    ↓ Uses email to get user_id
De-identification Layer
    ↓ All operations use user_id only
Health Data Layer (De-identified)
    ↓ Medications, adherence, etc.
```

## Example Flow

### User Registration:
1. User enters: `email@example.com`, `password`, `John`, `Doe`
2. System generates: `USR_1764042094705_kfc84sw16xyz`
3. System stores:
   - `@user_lookup`: `{"email@example.com": "USR_1764042094705_kfc84sw16xyz"}`
   - `@profile_data_USR_1764042094705_kfc84sw16xyz`: `{firstName: "John", lastName: "Doe"...}`
   - `@current_user_id`: `USR_1764042094705_kfc84sw16xyz`

### Adding Medication:
1. User scans prescription
2. System reads: `@current_user_id` → `USR_1764042094705_kfc84sw16xyz`
3. System saves medication to: `@medications_USR_1764042094705_kfc84sw16xyz`
4. **No email or name in medication data**

### Viewing Medications:
1. System reads: `@current_user_id` → `USR_1764042094705_kfc84sw16xyz`
2. System retrieves: `@medications_USR_1764042094705_kfc84sw16xyz`
3. System displays medications
4. **Profile info retrieved separately if needed for display**

## Compliance

### HIPAA Compliance:
- ✅ PHI (Protected Health Information) separated from identifiers
- ✅ Medication data cannot be linked to individual without lookup table
- ✅ Minimum necessary principle: only user ID used in health data

### GDPR Compliance:
- ✅ Data minimization: only necessary identifiers stored
- ✅ Pseudonymization: user ID replaces direct identifiers
- ✅ Right to erasure: can delete all data by user ID

## API Reference

### StorageService Methods (De-identified)

#### User Management:
```typescript
// Generate new de-identified user ID
StorageService.generateUserId(): string

// Register new user (returns de-identified ID)
StorageService.registerUser(email, firstName, lastName): Promise<string>

// Login (uses email to get user ID internally)
StorageService.loginUser(email): Promise<boolean>

// Logout (clears current user ID)
StorageService.logoutUser(): Promise<void>
```

#### Profile Management:
```typescript
// Update profile (uses current user ID internally)
StorageService.updateUserProfile(data): Promise<void>

// Get profile (uses user ID)
StorageService.getUserProfile(userId?): Promise<Profile | null>

// Get current user profile
StorageService.getCurrentUserProfile(): Promise<Profile | null>
```

#### Health Data (Automatically Uses User ID):
```typescript
// All methods automatically scope to current user ID
StorageService.saveMedication(medication): Promise<void>
StorageService.getMedications(): Promise<Medication[]>
StorageService.saveAdherenceRecord(record): Promise<void>
StorageService.getAdherenceRecords(): Promise<AdherenceRecord[]>
```

## Migration from Old System

### Old System (Not De-identified):
```
@medications_user@email.com
userFirstName: "John"
userLastName: "Doe"
```

### New System (De-identified):
```
@medications_USR_1764042094705_kfc84sw16xyz
@profile_data_USR_1764042094705_kfc84sw16xyz: {firstName: "John"...}
```

## Security Notes

1. **User ID is NOT encryption** - It's pseudonymization for privacy
2. **Lookup table is protected** - Never exposed in API responses
3. **Profile separation** - Health data never contains PII directly
4. **Audit trail** - All data changes tracked by user ID, not email

## Best Practices

### DO:
- ✅ Use `StorageService.getCurrentUserId()` for all health data operations
- ✅ Store profile info separately from health data
- ✅ Log actions with user ID, not email or name
- ✅ Clear current user ID on logout

### DON'T:
- ❌ Store email or name in medication/adherence records
- ❌ Use email as a key for health data
- ❌ Expose user ID in user-facing interfaces
- ❌ Log PII (email/name) with health data

## Verification

To verify de-identification is working:

1. Add medication for User A
2. Check AsyncStorage:
   - Key should be: `@medications_USR_...` (not email)
   - Value should NOT contain name or email
3. Switch to User B
4. Medications should be completely separate
5. No cross-contamination of data

## Questions?

Contact the development team for clarification on de-identification practices.
