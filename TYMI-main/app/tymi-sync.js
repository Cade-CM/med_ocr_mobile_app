// tymi-sync.js
// Utility to fetch profile and medication data from FastAPI backend

const API_BASE = 'http://10.0.0.26:8000/api'; // Change if needed

export async function fetchProfile(user_key) {
  const res = await fetch(`${API_BASE}/profile?user_key=${encodeURIComponent(user_key)}`);
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function fetchMedications(user_key) {
  const res = await fetch(`${API_BASE}/medications?user_key=${encodeURIComponent(user_key)}`);
  if (!res.ok) throw new Error('Failed to fetch medications');
  return res.json();
}

// Helper to get user_key from localStorage or prompt
export function getUserKey() {
  let user_key = localStorage.getItem('user_key');
  if (!user_key) {
    user_key = prompt('Enter your user_key to sync data:');
    if (user_key) localStorage.setItem('user_key', user_key);
  }
  return user_key;
}
