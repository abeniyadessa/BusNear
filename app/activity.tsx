import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LogIn,
  LogOut,
  AlertTriangle,
  Bell,
  MapPin,
  Clock,
  Bus,
  CheckCheck,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';
import { RidershipEvent, ServiceAlert, InAppNotification, NotificationType } from '@/types';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatTime(ts);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

const NOTIF_ICON_MAP: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  bus_nearby: { icon: MapPin, color: '#1B7A3D', bg: '#E8F8EE' },
  bus_arriving: { icon: Bus, color: '#9A7200', bg: '#FFF3D0' },
  bus_2mile: { icon: MapPin, color: '#1565C0', bg: '#EEF2FF' },
  eta_alert: { icon: Clock, color: '#9A7200', bg: '#FFF3D0' },
  schedule_change: { icon: AlertTriangle, color: '#C45D00', bg: '#FFF3E0' },
  boarded: { icon: LogIn, color: '#1B7A3D', bg: '#E8F8EE' },
  exited: { icon: LogOut, color: '#1565C0', bg: '#EEF2FF' },
  arrived_stop: { icon: MapPin, color: '#1B7A3D', bg: '#E8F8EE' },
  arrived_school: { icon: MapPin, color: '#1565C0', bg: '#EEF2FF' },
};

interface TimelineItem {
  id: string;
  type: 'ridership' | 'alert' | 'notification';
  timestamp: number;
  data: RidershipEvent | ServiceAlert | InAppNotification;
}

function EventRow({ item, index }: { item: TimelineItem; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const delay = Math.min(index * 40, 200);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (item.type === 'ridership') {
    const event = item.data as RidershipEvent;
    const isBoarded = event.eventType === 'boarded';
    return (
      <Animated.View style={[styles.eventCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.eventIconWrap, { backgroundColor: isBoarded ? '#E8F8EE' : '#EEF2FF' }]}>
          {isBoarded ? <LogIn size={18} color="#1B7A3D" /> : <LogOut size={18} color="#1565C0" />}
        </View>
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>
            <Text style={styles.eventBold}>{event.childName}</Text>
            {' '}{isBoarded ? 'boarded' : 'exited'}{' '}
            <Text style={styles.eventBold}>{event.busId}</Text>
          </Text>
          <Text style={styles.eventMeta}>
            {formatTime(event.occurredAt)} • {event.stopName}
          </Text>
        </View>
        <Text style={styles.relativeTime}>{formatRelative(event.occurredAt)}</Text>
      </Animated.View>
    );
  }

  if (item.type === 'alert') {
    const alert = item.data as ServiceAlert;
    return (
      <Animated.View style={[styles.eventCard, styles.alertCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.eventIconWrap, { backgroundColor: '#FFF3E0' }]}>
          <AlertTriangle size={18} color="#C45D00" />
        </View>
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>{alert.title}</Text>
          <Text style={styles.eventMeta} numberOfLines={2}>{alert.message}</Text>
        </View>
        <Text style={styles.relativeTime}>{formatRelative(alert.createdAt)}</Text>
      </Animated.View>
    );
  }

  if (item.type === 'notification') {
    const notif = item.data as InAppNotification;
    const config = NOTIF_ICON_MAP[notif.type] ?? { icon: Bell, color: '#1565C0', bg: '#EEF2FF' };
    const IconComp = config.icon;
    return (
      <Animated.View style={[styles.eventCard, !notif.read && styles.unreadCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.eventIconWrap, { backgroundColor: config.bg }]}>
          <IconComp size={18} color={config.color} />
        </View>
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>{notif.title}</Text>
          <Text style={styles.eventMeta} numberOfLines={2}>{notif.message}</Text>
        </View>
        <Text style={styles.relativeTime}>{formatRelative(notif.timestamp)}</Text>
      </Animated.View>
    );
  }

  return null;
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { ridershipEvents, serviceAlerts, activeChild } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [refreshing, setRefreshing] = React.useState(false);

  const allItems: TimelineItem[] = React.useMemo(() => {
    const items: TimelineItem[] = [];

    ridershipEvents.forEach((e) => {
      items.push({ id: e.id, type: 'ridership', timestamp: e.occurredAt, data: e });
    });

    serviceAlerts.forEach((a) => {
      items.push({ id: a.id, type: 'alert', timestamp: a.createdAt, data: a });
    });

    notifications.forEach((n) => {
      items.push({ id: n.id, type: 'notification', timestamp: n.timestamp, data: n });
    });

    items.sort((a, b) => b.timestamp - a.timestamp);

    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [ridershipEvents, serviceAlerts, notifications]);

  const groupedByDate = React.useMemo(() => {
    const groups: { date: string; items: TimelineItem[] }[] = [];
    let currentDate = '';

    allItems.forEach((item) => {
      const dateStr = formatDate(item.timestamp);
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    });

    return groups;
  }, [allItems]);

  const handleMarkAllRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markAllRead();
  }, [markAllRead]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Activity',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                style={styles.markReadBtn}
                activeOpacity={0.7}
                testID="mark-all-read-btn"
              >
                <CheckCheck size={18} color={colors.info} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeChild && (
          <View style={[styles.childHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.childAvatar, { backgroundColor: activeChild.avatarColor }]}>
              <Text style={styles.childAvatarText}>{activeChild.name[0]}</Text>
            </View>
            <View style={styles.childHeaderInfo}>
              <Text style={[styles.childHeaderName, { color: colors.textPrimary }]}>{activeChild.name}'s Activity</Text>
              <Text style={[styles.childHeaderMeta, { color: colors.textSecondary }]}>
                {activeChild.grade} • {activeChild.school}
              </Text>
            </View>
            <View style={[styles.busChip, { backgroundColor: colors.primaryLight }]}>
              <Bus size={12} color={colors.primaryDark} />
              <Text style={[styles.busChipText, { color: colors.tagText }]}>{activeChild.assignedBusId}</Text>
            </View>
          </View>
        )}

        {unreadCount > 0 && (
          <View style={[styles.unreadBanner, { backgroundColor: isDark ? '#1E3A5F' : '#EEF2FF' }]}>
            <Bell size={16} color={colors.info} />
            <Text style={[styles.unreadBannerText, { color: colors.info }]}>
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {allItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Bell size={32} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No activity yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Events, alerts, and notifications will appear here as your child's bus runs its route.
            </Text>
          </View>
        ) : (
          groupedByDate.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>{group.date}</Text>
              {group.items.map((item, index) => (
                <EventRow key={item.id} item={item} index={index} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  childHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  childHeaderName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  childHeaderMeta: {
    fontSize: 13,
    marginTop: 1,
  },
  busChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  busChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  unreadBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  alertCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#1565C0',
  },
  eventIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  eventBold: {
    fontWeight: '700' as const,
  },
  eventMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  relativeTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
