// ---------------------------------------------------------------------------
// Litter Lab Pro — Notification Scheduling Utility
// All scheduling is local; no push tokens or cloud services required.
// ---------------------------------------------------------------------------

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

const PERMISSION_KEY = 'notifications_permission_granted';

// ── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    const granted = status === 'granted';
    await AsyncStorage.setItem(PERMISSION_KEY, granted ? 'true' : 'false');
    return granted;
  } catch {
    return false;
  }
}

export async function hasNotificationPermissions(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(PERMISSION_KEY);
    if (stored === 'true') return true;

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ── Scheduling ───────────────────────────────────────────────────────────────

export async function scheduleNotification(
  title: string,
  body: string,
  date: Date,
  identifier?: string,
): Promise<string | null> {
  try {
    const granted = await hasNotificationPermissions();
    if (!granted) return null;

    const id = await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
    return id;
  } catch (err) {
    console.error('Failed to schedule notification:', err);
    return null;
  }
}

export async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (err) {
    console.error('Failed to cancel notification:', err);
  }
}

// ── Notification ID storage helpers ──────────────────────────────────────────

const NOTIF_STORAGE_KEY = 'scheduled_notification_ids';

/**
 * Store a mapping from entity key to notification identifier.
 * Entity key format: "heat_{id}", "breeding_{id}", "milestone_{id}"
 */
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
