import { BACKEND_API_URL } from "../config/api";

// User
export interface SignupRequest {
  email?: string;
  display_name?: string;
  user_key: string;
  password?: string;
  first_name?: string;
  last_name?: string;
}

export interface UserResponse {
  id: number;
  user_key: string;
  email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
}

// User Profile
export interface UserProfile {
  id: number;
  user_key: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  age?: number;
  gender?: string;
  email?: string;
  display_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Medication
export interface MedicationCreate {
  user_key: string;
  label_name?: string;
  drug_name?: string;
  strength?: string;
  route?: string;
  instruction?: string;
  frequency_text?: string;
  qty_text?: string;
  refills_text?: string;
  // add these two so MedicationReviewScreen payload typechecks
  medication_key?: string;
  id?: number | string;
}

export interface Medication {
  id: number;
  user_key: string;
  label_name?: string;
  drug_name?: string;
  strength?: string;
  route?: string;
  instruction?: string;
  frequency_text?: string;
  qty_text?: string;
  refills_text?: string;
  medication_key?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Medication Event
export interface MedEventCreate {
  user_key: string;
  medication_id: string;
  event_time?: string;
  event_type: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface MedEvent {
  id: number;
  user_key: string;
  medication_id: string;
  event_time: string;
  event_type: string;
  source?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

// API Calls

// User Endpoints
export async function signupUser(request: SignupRequest): Promise<UserResponse> {
  // Only send fields present on the signup page
  const signupPayload: Partial<SignupRequest> = {
    email: request.email,
    password: request.password,
    user_key: request.user_key,
    // display_name is omitted during signup
  };
  console.log('signupUser request body:', signupPayload);

  const res = await fetch(`${BACKEND_API_URL}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signupPayload),
  });

  const text = await res.text();
  console.log('signupUser raw response:', res.status, text);

  if (!res.ok) {
    try {
      const json = JSON.parse(text);
      throw new Error(json.detail || `Signup failed: ${res.status}`);
    } catch {
      throw new Error(`Signup failed: ${res.status} ${text}`);
    }
  }

  return JSON.parse(text);
}

export async function updateUserProfile(payload: Partial<UserProfile> & { user_key: string }): Promise<UserProfile> {
  const res = await fetch(`${BACKEND_API_URL}/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(`Update profile failed: ${res.status} ${JSON.stringify(errorBody)}`);
  }
  return res.json();
}

export async function fetchUserProfile(user_key: string): Promise<UserProfile> {
  const res = await fetch(`${BACKEND_API_URL}/api/profile?user_key=${encodeURIComponent(user_key)}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(`Fetch profile failed: ${res.status} ${JSON.stringify(errorBody)}`);
  }
  return res.json();
}

// Login endpoint
export async function loginUser(email: string, password: string): Promise<UserResponse> {
  const res = await fetch(`${BACKEND_API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(`Login failed: ${res.status} ${JSON.stringify(errorBody)}`);
  }
  return res.json();
}

// Medication Endpoints
// Delete medication by id
export async function deleteMedication(idOrKey: string | number): Promise<void> {
  const identifier = String(idOrKey); // handles number or string
  const res = await fetch(`${BACKEND_API_URL}/api/medications/${identifier}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    console.error('Delete medication failed:', res.status, errorBody);
    throw new Error(`Delete med failed: ${res.status} ${JSON.stringify(errorBody)}`);
  }
}
export async function fetchMedications(user_key: string): Promise<Medication[]> {
  const res = await fetch(`${BACKEND_API_URL}/api/medications?user_key=${encodeURIComponent(user_key)}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(`Fetch meds failed: ${res.status} ${JSON.stringify(errorBody)}`);
  }
  const meds = await res.json();
  // Map medication_key from backend response to Medication objects
  return meds.map((med: any) => ({
    ...med,
    medication_key: med.medication_key,
  }));
}


export async function createMedication(payload: MedicationCreate): Promise<Medication> {
  const res = await fetch(`${BACKEND_API_URL}/api/medications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(`Create med failed: ${res.status} ${JSON.stringify(errorBody)}`);
  }
  return res.json();
}

// Update existing medication
// Update or create medication (always POST, include id for update)
export async function updateMedication(payload: any): Promise<Medication> {
  const res = await fetch(`${BACKEND_API_URL}/api/medications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(`Update med failed: ${res.status} ${JSON.stringify(errorBody)}`);
  }
  return res.json();
}

// Medication Event Endpoints
export async function fetchMedEvents(user_key: string): Promise<MedEvent[]> {
  const res = await fetch(`${BACKEND_API_URL}/api/events?user_key=${encodeURIComponent(user_key)}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(`Fetch events failed: ${res.status} ${JSON.stringify(errorBody)}`);
  }
  return res.json();
}

export async function logMedEvent(payload: MedEventCreate): Promise<MedEvent> {
  const res = await fetch(`${BACKEND_API_URL}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(`Log event failed: ${res.status} ${JSON.stringify(errorBody)}`);
  }
  return res.json();
}
