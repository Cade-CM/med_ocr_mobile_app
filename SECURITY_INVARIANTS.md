# Security Invariants Checklist

This document defines the security invariants that MUST be maintained across all code changes.
Violating these invariants can cause authentication bypass, data leakage, or cross-user contamination.

---

## Core Security Invariants

### 1. Auth Routing Must Use Supabase Session

**Invariant:** App navigation and auth state MUST be derived from `supabase.auth.getSession()` and `onAuthStateChange()`, never from AsyncStorage flags.

**Why:** AsyncStorage flags like `isLoggedIn` can become stale and don't reflect actual session validity.

**Correct:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
const isLoggedIn = session !== null && session.user !== null;
```

**WRONG:**
```typescript
const isLoggedIn = await AsyncStorage.getItem('isLoggedIn') === 'true'; // NEVER DO THIS
```

---

### 2. Never Persist Passwords or User Keys in AsyncStorage/SecureStore

**Invariant:** Passwords MUST never be stored locally. User identity (user_key) MUST be derived from the active session, not cached.

**Why:** 
- Passwords in local storage are a security breach waiting to happen
- Cached user_key can drift from actual session identity, breaking RLS

**Correct:**
```typescript
const userKey = await AuthService.getCurrentUserKey(); // Derived from session
```

**WRONG:**
```typescript
await AsyncStorage.setItem('user_key', userKey); // NEVER CACHE THIS
await AsyncStorage.setItem('password', password); // ABSOLUTELY NEVER
```

---

### 3. All Database Writes Must Derive Identity via `requireUserKey()`

**Invariant:** INSERT/UPDATE operations MUST derive `user_key` from `requireUserKey()` internally, never accept it from UI/payload.

**Why:** RLS policies use `auth.uid()`. If client-provided user_key differs, RLS will reject the operation or data becomes orphaned.

**Correct:**
```typescript
export async function createMedication(payload: MedicationCreate) {
  const userKey = await requireUserKey(); // ALWAYS derive from session
  await supabase.from('medications').insert({ user_key: userKey, ...payload });
}
```

**WRONG:**
```typescript
export async function createMedication(payload: { user_key: string, ... }) {
  await supabase.from('medications').insert(payload); // NEVER trust client user_key
}
```

---

### 4. Logout Must Use `AuthService.signOut()`

**Invariant:** Sign-out MUST go through `AuthService.signOut()` to ensure complete cleanup.

**Why:** The centralized signOut:
- Clears Supabase session
- Triggers `onAuthStateChange` listeners
- Unsubscribes from Realtime channels
- Clears AsyncStorage cached data

**Correct:**
```typescript
import { signOut } from '@services/AuthService';
await signOut();
```

**WRONG:**
```typescript
await supabase.auth.signOut(); // Missing cleanup steps!
await AsyncStorage.clear(); // Doesn't trigger listeners!
```

---

### 5. Realtime Unsubscribe Must Be Awaited Before Resubscribe

**Invariant:** When switching users or resubscribing to channels, the previous channel MUST be fully removed before creating a new one.

**Why:** Without awaiting, race conditions can cause:
- Duplicate channel subscriptions
- Events from old channel updating new user's state
- Brief flash of previous user's data

**Correct:**
```typescript
if (existingChannel) {
  await supabase.removeChannel(existingChannel);
  existingChannel = null;
}
// Small delay to ensure cleanup
await new Promise(resolve => setTimeout(resolve, 100));
// Now safe to create new channel
```

---

## Two-User Contamination Test Checklist

Run this manual test after ANY changes to auth, storage, or data fetching:

### Setup
- [ ] Have two test accounts ready (User A and User B)
- [ ] Clear app data/reinstall before testing

### User A Session
1. [ ] Login as User A
2. [ ] Create a medication (verify it appears in list)
3. [ ] Create a med_event (log a dose)
4. [ ] Edit profile (set name, etc.)
5. [ ] Verify Realtime updates work (medication list updates without refresh)

### Sign Out
6. [ ] Sign out via Settings → Sign Out (NOT by clearing app data)
7. [ ] Verify navigation resets to Login screen
8. [ ] **CRITICAL**: Verify medication list is NOT visible (should show login, not empty list)

### User B Session
9. [ ] Login as User B (different account)
10. [ ] **CRITICAL**: Verify User A's medications do NOT appear (even briefly)
11. [ ] **CRITICAL**: Verify Edit Profile shows empty or User B's data, NOT User A's
12. [ ] Create medication as User B (verify it appears)
13. [ ] Verify only User B's data is visible

### Cross-User Attack Test
14. [ ] As User B, attempt to log event for User A's medication_id (if you know it)
15. [ ] **Expected**: RLS should reject with permission error
16. [ ] Verify no crash, graceful error handling

### Return to User A
17. [ ] Logout User B, login User A again
18. [ ] Verify only User A's medications appear (not User B's)
19. [ ] Verify User A's profile data is restored

### Rapid Logout/Login Test
20. [ ] Login as User A
21. [ ] Immediately sign out
22. [ ] Immediately sign in as User B
23. [ ] **CRITICAL**: Verify no flash of User A's data
24. [ ] Verify User B's data loads correctly

---

## Files to Review for Security

When making changes to these files, extra scrutiny is required:

| File | Security Concern |
|------|------------------|
| `App.tsx` | Auth routing logic |
| `AuthService.ts` | Session management, signOut cleanup |
| `BackendService.ts` | user_key derivation in CRUD ops |
| `RealtimeService.ts` | Channel subscription/unsubscription |
| `AppDataContext.tsx` | Auth state handling, data clearing |
| `StorageService.ts` | Legacy identity (deprecated, must throw) |
| `LoginScreen.tsx` | No parallel identity systems |
| `SettingsScreen.tsx` | Logout flow |

---

## RLS Policy Reference

All user-scoped tables have RLS enabled with this pattern:

```sql
-- SELECT: Users can only read their own data
CREATE POLICY "Users can view own data" ON table_name
  FOR SELECT USING (user_key = auth.uid());

-- INSERT: user_key must match authenticated user
CREATE POLICY "Users can insert own data" ON table_name
  FOR INSERT WITH CHECK (user_key = auth.uid());

-- UPDATE: Users can only update their own data
CREATE POLICY "Users can update own data" ON table_name
  FOR UPDATE USING (user_key = auth.uid()) WITH CHECK (user_key = auth.uid());

-- DELETE: Users can only delete their own data
CREATE POLICY "Users can delete own data" ON table_name
  FOR DELETE USING (user_key = auth.uid());
```

**Key Insight:** Client-side `.eq('user_key', ...)` filters are for PERFORMANCE, not security. RLS is the source of truth.

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-29 | Initial security invariants documented | Security Audit |

