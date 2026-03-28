import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import createContextHook from '@nkzw/create-context-hook';
import { InAppNotification, NotificationType } from '@/types';
import { registerForPushNotifications, scheduleLocalNotification, setBadgeCount } from '@/utils/notifications';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const HAPTIC_MAP: Record<NotificationType, Haptics.NotificationFeedbackType> = {
  bus_nearby: Haptics.NotificationFeedbackType.Success,
  bus_arriving: Haptics.NotificationFeedbackType.Success,
  bus_2mile: Haptics.NotificationFeedbackType.Warning,
  eta_alert: Haptics.NotificationFeedbackType.Warning,
  schedule_change: Haptics.NotificationFeedbackType.Warning,
  boarded: Haptics.NotificationFeedbackType.Success,
  exited: Haptics.NotificationFeedbackType.Success,
  arrived_stop: Haptics.NotificationFeedbackType.Success,
  arrived_school: Haptics.NotificationFeedbackType.Success,
};

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [activeBanner, setActiveBanner] = useState<InAppNotification | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const bannerAnim = useRef(new Animated.Value(-120)).current;
  const bannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { authState } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      registerForPushNotifications().then(async (token) => {
        if (token) {
          setPushToken(token);
          console.log('[NotificationContext] Push token acquired:', token);

          // Persist push token in Supabase when user is authenticated
          if (isSupabaseConfigured() && authState.parentId) {
            const platform = Platform.OS as 'ios' | 'android';
            await supabase.from('push_tokens').upsert({
              parent_id: authState.parentId,
              token,
              platform,
            });
          }
        }
      });

      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('[NotificationContext] Notification tapped:', data);
      });

      const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
        console.log('[NotificationContext] Notification received in foreground:', notification.request.content);
      });

      return () => {
        responseSubscription.remove();
        receivedSubscription.remove();
      };
    }
  }, []);

  const showBanner = useCallback((notification: InAppNotification) => {
    if (bannerTimeout.current) {
      clearTimeout(bannerTimeout.current);
    }

    setActiveBanner(notification);
    bannerAnim.setValue(-120);

    Animated.spring(bannerAnim, {
      toValue: 0,
      damping: 22,
      stiffness: 280,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    bannerTimeout.current = setTimeout(() => {
      Animated.timing(bannerAnim, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setActiveBanner(null);
      });
    }, 4000);
  }, [bannerAnim]);

  const dismissBanner = useCallback(() => {
    if (bannerTimeout.current) {
      clearTimeout(bannerTimeout.current);
    }
    Animated.timing(bannerAnim, {
      toValue: -120,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveBanner(null);
    });
  }, [bannerAnim]);

  const pushNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
  ) => {
    const notification: InAppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
    };

    console.log(`[Notification] ${type}: ${title} - ${message}`);

    setNotifications((prev) => [notification, ...prev].slice(0, 50));
    showBanner(notification);

    const hapticType = HAPTIC_MAP[type];
    if (hapticType !== undefined) {
      Haptics.notificationAsync(hapticType);
    }

    scheduleLocalNotification(type, title, message);

    const currentUnread = notifications.filter((n) => !n.read).length + 1;
    setBadgeCount(currentUnread);
  }, [showBanner, notifications]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      const unread = updated.filter((n) => !n.read).length;
      setBadgeCount(unread);
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setBadgeCount(0);
  }, []);

  // Re-register token when user signs in (token may have been acquired before auth)
  useEffect(() => {
    if (!isSupabaseConfigured() || !authState.parentId || !pushToken) return;
    const platform = Platform.OS as 'ios' | 'android';
    supabase.from('push_tokens').upsert({
      parent_id: authState.parentId,
      token: pushToken,
      platform,
    }).then();
  }, [authState.parentId, pushToken]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    activeBanner,
    bannerAnim,
    unreadCount,
    pushToken,
    pushNotification,
    dismissBanner,
    markRead,
    markAllRead,
  };
});
