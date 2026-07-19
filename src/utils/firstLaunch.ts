import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'has_seen_disclaimer';

export async function checkFirstLaunch(): Promise<boolean> {
  const seen = await AsyncStorage.getItem(KEY);
  return seen !== 'true';
}

export async function markDisclaimerSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true');
}
