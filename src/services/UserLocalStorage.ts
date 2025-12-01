import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalUserProfile {
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  nickname?: string;
  age?: number;
  gender?: string;
}

const STORAGE_KEY = 'localUserProfile';

export const saveLocalUserProfile = async (profile: LocalUserProfile) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const getLocalUserProfile = async (): Promise<LocalUserProfile | null> => {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  if (data) {
    return JSON.parse(data);
  } else {
    // Fallback: create a default profile if missing
    const defaultProfile: LocalUserProfile = {
      firstName: 'CADE',
      lastName: 'MONTES',
      email: '',
      displayName: 'CADE MONTES',
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProfile));
    return defaultProfile;
  }
};

export const updateLocalUserProfile = async (updates: Partial<LocalUserProfile>) => {
  const current = await getLocalUserProfile();
  const updated = { ...current, ...updates };
  await saveLocalUserProfile(updated as LocalUserProfile);
};

// Call this when you want to sync local profile to backend
export const syncLocalUserProfile = async (user_key: string, updateUserProfile: (payload: any) => Promise<any>) => {
  const profile = await getLocalUserProfile();
  if (!profile) return;
  // Build payload for backend
  const payload: any = {
    user_key,
    first_name: profile.firstName,
    last_name: profile.lastName,
    email: profile.email,
    display_name: profile.displayName,
  };
  if (profile.nickname) payload.nickname = profile.nickname;
  if (profile.age !== undefined) payload.age = profile.age;
  if (profile.gender) payload.gender = profile.gender;
  return updateUserProfile(payload);
};
