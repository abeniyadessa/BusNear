import React, { useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navigation, Settings, Layers, LogIn, LogOut, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBusTracking } from '@/context/BusTrackingContext';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';
import StatusChip from '@/components/StatusChip';
import PresenceIndicator from '@/components/PresenceIndicator';
import ChildSelector from '@/components/ChildSelector';
import RouteTimeline from '@/components/RouteTimeline';
import EventsFeed from '@/components/EventsFeed';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 180;
const HALF_HEIGHT = 440;

interface BottomSheetProps {
  onSettingsPress: () => void;
  onMapSettingsPress: () => void;
  onActivityPress: () => void;
}

function formatEventTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function BottomSheet({ onSettingsPress, onMapSettingsPress, onActivityPress }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { busState, route, isFollowing, toggleFollow, presenceState, startSimulation, stopSimulation } =
    useBusTracking();
  const { activeChild, authState, setActiveChild, ridershipEvents, serviceAlerts, lastEvent, boardingState } = useAuth();
  const { unreadCount } = useNotifications();
  const { colors, isDark } = useTheme();

  const expandedHeight = SCREEN_HEIGHT - 120;
  const snapPoints = useMemo(
    () => [
      SCREEN_HEIGHT - COLLAPSED_HEIGHT - insets.bottom,
      SCREEN_HEIGHT - HALF_HEIGHT - insets.bottom,
      120,
    ],
    [insets.bottom]
  );

  const translateY = useRef(new Animated.Value(snapPoints[0])).current;
  const lastSnap = useRef(snapPoints[0]);
  const dragStartY = useRef(0);

  const snapTo = useCallback(
    (toValue: number) => {
      lastSnap.current = toValue;
      Animated.spring(translateY, {
        toValue,
        damping: 28,
        stiffness: 300,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    },
    [translateY]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
        onPanResponderGrant: () => {
          dragStartY.current = lastSnap.current;
          translateY.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          const newY = dragStartY.current + g.dy;
          const clampedY = Math.max(snapPoints[2], Math.min(snapPoints[0], newY));
          translateY.setValue(clampedY);
        },
        onPanResponderRelease: (_, g) => {
          const currentY = dragStartY.current + g.dy;
          const velocity = g.vy;

          let closest = snapPoints[0];
          let minDist = Infinity;

          for (const sp of snapPoints) {
            const dist = Math.abs(currentY - sp);
            if (dist < minDist) {
              minDist = dist;
              closest = sp;
            }
          }

          if (Math.abs(velocity) > 0.5) {
            if (velocity > 0) {
              const lower = snapPoints.filter((sp) => sp > currentY);
              closest = lower.length > 0 ? lower[0] : snapPoints[snapPoints.length - 1];
            } else {
              const upper = snapPoints.filter((sp) => sp < currentY);
              closest =
                upper.length > 0 ? upper[upper.length - 1] : snapPoints[0];
            }
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          snapTo(closest);
        },
      }),
    [snapPoints, snapTo, translateY]
  );

  const nextStop = route.stops[busState.nextStopIndex];
  const isActive = busState.isSimulating;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + 8,
          transform: [{ translateY }],
          backgroundColor: colors.surface,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handleArea}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </View>

      {authState.linkedChildren.length > 1 && (
        <ChildSelector
          children={authState.linkedChildren}
          activeChildId={authState.activeChildId}
          onSelect={setActiveChild}
        />
      )}

      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.busId, { color: colors.textPrimary }]}>{busState.busId}</Text>
          <Text style={[styles.routeArrow, { color: colors.textTertiary }]}> → </Text>
          <Text style={[styles.destination, { color: colors.textSecondary }]} numberOfLines={1}>
            {route.stops[route.stops.length - 1].name}
          </Text>
        </View>
        <View style={styles.statusRow}>
          {isActive && (
            <PresenceIndicator state={presenceState} lastUpdated={busState.lastUpdated} />
          )}
          <StatusChip status={busState.status} />
        </View>
      </View>

      {isActive ? (
        <View style={styles.etaRow}>
          <Text style={[styles.etaNumber, { color: colors.textPrimary }]}>{busState.eta}</Text>
          <Text style={[styles.etaUnit, { color: colors.textSecondary }]}> min away</Text>
          <View style={[styles.etaDivider, { backgroundColor: colors.border }]} />
          <Text style={[styles.nextStopText, { color: colors.textSecondary }]}>
            Next: {nextStop?.name ?? '—'}
          </Text>
        </View>
      ) : (
        <View style={styles.etaRow}>
          <Text style={[styles.etaPlaceholder, { color: colors.textTertiary }]}>
            {busState.status === 'arrived' ? 'Bus has arrived!' : 'Tap Start to begin tracking'}
          </Text>
        </View>
      )}

      {lastEvent && (
        <View style={[
          styles.lastEventBanner,
          { backgroundColor: lastEvent.eventType === 'boarded' ? (isDark ? '#1A3D2A' : '#E8F8EE') : (isDark ? '#1E3A5F' : '#EEF2FF') },
        ]}>
          <View style={[
            styles.lastEventIcon,
            { backgroundColor: lastEvent.eventType === 'boarded' ? (isDark ? '#225A38' : '#D0F0DB') : (isDark ? '#2A4A6F' : '#DEE8FF') },
          ]}>
            {lastEvent.eventType === 'boarded' ? (
              <LogIn size={14} color={isDark ? '#4ADE80' : '#1B7A3D'} />
            ) : (
              <LogOut size={14} color={colors.info} />
            )}
          </View>
          <Text style={[
            styles.lastEventText,
            { color: lastEvent.eventType === 'boarded' ? (isDark ? '#4ADE80' : '#1B7A3D') : colors.info },
          ]}>
            Last: {lastEvent.childName} {lastEvent.eventType} at {formatEventTime(lastEvent.occurredAt)}
          </Text>
        </View>
      )}

      <View style={[styles.actionRow, { borderBottomColor: colors.borderLight }]}>
        {!isActive ? (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.busYellow }]}
            onPress={startSimulation}
            activeOpacity={0.8}
            testID="start-simulation-btn"
          >
            <Text style={[styles.startButtonText, { color: colors.onPrimary }]}>Start Simulation</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
                isFollowing && { backgroundColor: colors.info, borderColor: colors.info },
              ]}
              onPress={toggleFollow}
              activeOpacity={0.8}
              testID="follow-bus-btn"
            >
              <Navigation
                size={16}
                color={isFollowing ? '#FFFFFF' : colors.info}
                fill={isFollowing ? '#FFFFFF' : 'transparent'}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: colors.info },
                  isFollowing && { color: '#FFFFFF' },
                ]}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}
              onPress={onMapSettingsPress}
              activeOpacity={0.8}
              testID="map-settings-btn"
            >
              <Layers size={16} color={colors.info} />
              <Text style={[styles.actionBtnText, { color: colors.info }]}>Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}
              onPress={onActivityPress}
              activeOpacity={0.8}
              testID="activity-btn"
            >
              <Bell size={16} color={colors.info} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
              <Text style={[styles.actionBtnText, { color: colors.info }]}>Activity</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isDark ? '#3D1A1A' : '#FFF0F0', borderColor: isDark ? '#5A2A2A' : '#FFD6D6' }]}
              onPress={stopSimulation}
              activeOpacity={0.8}
              testID="stop-simulation-btn"
            >
              <Text style={[styles.stopBtnText, { color: colors.danger }]}>Stop</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {!isActive && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={onSettingsPress}
            activeOpacity={0.8}
          >
            <Settings size={16} color={colors.info} />
            <Text style={[styles.quickBtnText, { color: colors.info }]}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={onActivityPress}
            activeOpacity={0.8}
          >
            <Bell size={16} color={colors.info} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
            <Text style={[styles.quickBtnText, { color: colors.info }]}>Activity</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        <RouteTimeline
          stops={route.stops}
          currentStopIndex={busState.currentStopIndex}
          nextStopIndex={busState.nextStopIndex}
        />

        <EventsFeed
          ridershipEvents={ridershipEvents}
          serviceAlerts={serviceAlerts}
        />

        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    paddingHorizontal: 20,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  busId: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  routeArrow: {
    fontSize: 15,
  },
  destination: {
    fontSize: 15,
    flex: 1,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  etaNumber: {
    fontSize: 32,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'],
  },
  etaUnit: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  etaDivider: {
    width: 1,
    height: 18,
    marginHorizontal: 12,
  },
  nextStopText: {
    fontSize: 14,
    flex: 1,
  },
  etaPlaceholder: {
    fontSize: 16,
  },
  lastEventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  lastEventIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastEventText: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  startButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  stopBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: 8,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
});
