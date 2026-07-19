// ---------------------------------------------------------------------------
// Litter Lab Pro — Web Notification Stub
// expo-notifications is not available on web. All functions are no-ops
// that return safe defaults so the app doesn't crash.
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_KEY = 'notifications_permission_granted';

// ── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  // Notifications aren't supported on web — store as not granted
  await AsyncStorage.setItem(PERMISSION_KEY, 'false');
  return false;
}

export async function hasNotificationPermissions(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(PERMISSION_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

// ── Scheduling (no-op on web) ───────────────────────────────────────────────

export async function scheduleNotification(
  _title: string,
  _body: string,
  _date: Date,
  _identifier?: string,
): Promise<string | null> {
  // No-op on web — just return null
  return null;
}

export async function cancelNotification(_identifier: string): Promise<void> {
  // No-op on web
}

// ── Notification ID storage helpers ──────────────────────────────────────────

const NOTIF_STORAGE_KEY = 'scheduled_notification_ids';

export async function storeNotificationId(
  entityKey: string,
  notificationId: string,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[entityKey] = notificationId;
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to store notification ID:', err);
  }
}

export async function getStoredNotificationId(
  entityKey: string,
): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return null;
    const map: Record<string, string> = JSON.parse(raw);
    return map[entityKey] ?? null;
  } catch {
    return null;
  }
}

export async function removeStoredNotificationId(
  entityKey: string,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return;
    const map: Record<string, string> = JSON.parse(raw);
    delete map[entityKey];
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to remove notification ID:', err);
  }
}

export async function cancelAndRemoveNotification(
  entityKey: string,
): Promise<void> {
  const notifId = await getStoredNotificationId(entityKey);
  if (notifId) {
    await cancelNotification(notifId);
    await removeStoredNotificationId(entityKey);
  }
}
