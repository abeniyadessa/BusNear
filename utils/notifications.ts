import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationType } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web platform, skipping push registration');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'BusNear Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFC400',
      });

      await Notifications.setNotificationChannelAsync('boarding', {
        name: 'Boarding Events',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200],
        lightColor: '#16A34A',
      });

      await Notifications.setNotificationChannelAsync('proximity', {
        name: 'Bus Proximity',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150],
        lightColor: '#FFC400',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'otnxswqmm0d7cnhl6jyc8',
    });

    console.log('[Notifications] Push token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.log('[Notifications] Error registering:', error);
    return null;
  }
}

const CHANNEL_MAP: Partial<Record<NotificationType, string>> = {
  boarded: 'boarding',
  exited: 'boarding',
  bus_nearby: 'proximity',
  bus_2mile: 'proximity',
  bus_arriving: 'proximity',
};

export async function scheduleLocalNotification(
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type, ...data },
        sound: true,
        ...(Platform.OS === 'android' ? {
          channelId: CHANNEL_MAP[type] ?? 'default',
        } : {}),
      },
      trigger: null,
    });
    console.log(`[Notifications] Local notification scheduled: ${type} - ${title}`);
  } catch (error) {
    console.log('[Notifications] Error scheduling:', error);
  }
}

export async function getBadgeCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    return await Notifications.getBadgeCountAsync();
  } catch {
    return 0;
  }
}

export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.log('[Notifications] Error setting badge:', error);
  }
}
