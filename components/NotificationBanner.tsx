import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Bus, LogIn, LogOut, MapPin, Clock, AlertTriangle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useNotifications } from '@/context/NotificationContext';
import { NotificationType } from '@/types';

const ICON_MAP: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  bus_nearby: { icon: MapPin, color: '#1B7A3D', bg: '#E8F8EE' },
  bus_arriving: { icon: Bus, color: Colors.busYellowDark, bg: Colors.busYellowLight },
  bus_2mile: { icon: MapPin, color: Colors.info, bg: '#EEF2FF' },
  eta_alert: { icon: Clock, color: '#9A7200', bg: Colors.busYellowLight },
  schedule_change: { icon: AlertTriangle, color: '#C45D00', bg: '#FFF3E0' },
  boarded: { icon: LogIn, color: '#1B7A3D', bg: '#E8F8EE' },
  exited: { icon: LogOut, color: Colors.info, bg: '#EEF2FF' },
  arrived_stop: { icon: MapPin, color: '#1B7A3D', bg: '#E8F8EE' },
  arrived_school: { icon: MapPin, color: Colors.info, bg: '#EEF2FF' },
};

export default function NotificationBanner() {
  const insets = useSafeAreaInsets();
  const { activeBanner, bannerAnim, dismissBanner } = useNotifications();

  if (!activeBanner) return null;

  const config = ICON_MAP[activeBanner.type] ?? { icon: Bell, color: Colors.info, bg: '#EEF2FF' };
  const IconComponent = config.icon;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: bannerAnim }],
          paddingTop: Platform.OS === 'web' ? 12 : insets.top + 4,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.inner}
        activeOpacity={0.9}
        onPress={dismissBanner}
        testID="notification-banner"
      >
        <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
          <IconComponent size={18} color={config.color} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>{activeBanner.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{activeBanner.message}</Text>
        </View>
        <View style={styles.timePill}>
          <Text style={styles.timeText}>now</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  message: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
});
