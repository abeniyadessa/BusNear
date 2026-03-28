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
import { Navigation, Settings, Layers, LogIn, LogOut, Bell, ChevronUp, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useBusTracking } from '@/context/BusTrackingContext';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';
import PresenceIndicator from '@/components/PresenceIndicator';
import ChildSelector from '@/components/ChildSelector';
import RouteTimeline from '@/components/RouteTimeline';
import EventsFeed from '@/components/EventsFeed';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED  = 200;
const HALF       = 460;

interface BottomSheetProps {
  onSettingsPress: () => void;
  onMapSettingsPress: () => void;
  onActivityPress: () => void;
}

function pad(n: number) { return n.toString().padStart(2, '0'); }
function fmtTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function BottomSheet({ onSettingsPress, onMapSettingsPress, onActivityPress }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { busState, route, isFollowing, toggleFollow, presenceState, startSimulation, stopSimulation } = useBusTracking();
  const { activeChild, authState, setActiveChild, ridershipEvents, serviceAlerts, lastEvent } = useAuth();
  const { unreadCount } = useNotifications();
  const { colors, isDark } = useTheme();

  const expandedSnap = 100;
  const snapPoints = useMemo(() => [
    SCREEN_HEIGHT - COLLAPSED - insets.bottom,
    SCREEN_HEIGHT - HALF - insets.bottom,
    expandedSnap,
  ], [insets.bottom]);

  const translateY = useRef(new Animated.Value(snapPoints[0])).current;
  const lastSnap   = useRef(snapPoints[0]);

  const snapTo = useCallback((toValue: number) => {
    lastSnap.current = toValue;
    Animated.spring(translateY, { toValue, damping: 30, stiffness: 280, mass: 0.9, useNativeDriver: true }).start();
  }, [translateY]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderGrant: () => { translateY.stopAnimation(); },
    onPanResponderMove: (_, g) => {
      const next = lastSnap.current + g.dy;
      translateY.setValue(Math.max(snapPoints[2], Math.min(snapPoints[0], next)));
    },
    onPanResponderRelease: (_, g) => {
      const current  = lastSnap.current + g.dy;
      const velocity = g.vy;
      let target = snapPoints.reduce((a, b) => Math.abs(b - current) < Math.abs(a - current) ? b : a);
      if (Math.abs(velocity) > 0.5) {
        target = velocity > 0
          ? snapPoints.filter(s => s > current)[0] ?? snapPoints[snapPoints.length - 1]
          : snapPoints.filter(s => s < current).slice(-1)[0] ?? snapPoints[0];
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      snapTo(target);
    },
  }), [snapPoints, snapTo, translateY]);

  const nextStop = route.stops[busState.nextStopIndex];
  const isActive = busState.isSimulating;

  const statusColor = busState.status === 'arriving' ? '#16A34A'
                    : busState.status === 'arrived'   ? '#16A34A'
                    : busState.status === 'delayed'    ? '#DC2626'
                    : colors.busYellow;

  const etaGlow = busState.status === 'arriving' ? '#16A34A'
                : busState.status === 'delayed'   ? '#DC2626'
                : colors.busYellow;

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          transform: [{ translateY }],
          backgroundColor: isDark ? '#1A2236' : '#FFFFFF',
          paddingBottom: insets.bottom + 8,
          shadowColor: isDark ? '#000' : '#0A1628',
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Handle */}
      <View style={styles.handleArea}>
        <View style={[styles.handle, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
      </View>

      {/* Child selector */}
      {authState.linkedChildren.length > 1 && (
        <ChildSelector
          children={authState.linkedChildren}
          activeChildId={authState.activeChildId}
          onSelect={setActiveChild}
        />
      )}

      {/* Header: bus ID + route + presence */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.busIdBadge, { backgroundColor: isDark ? 'rgba(255,196,0,0.15)' : 'rgba(255,196,0,0.12)' }]}>
            <Text style={[styles.busIdText, { color: colors.busYellowDark }]}>{busState.busId}</Text>
          </View>
          <View style={styles.routeInfo}>
            <Text style={[styles.routeTo, { color: colors.textSecondary }]} numberOfLines={1}>
              → {route.stops[route.stops.length - 1].name}
            </Text>
            {isActive && (
              <View style={styles.presenceWrap}>
                <PresenceIndicator state={presenceState} lastUpdated={busState.lastUpdated} />
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}
          onPress={onSettingsPress}
          activeOpacity={0.7}
        >
          <Settings size={17} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ETA hero */}
      {isActive ? (
        <View style={styles.etaHero}>
          <View style={styles.etaMain}>
            <Text style={[styles.etaNumber, { color: statusColor }]}>{busState.eta}</Text>
            <View style={styles.etaRight}>
              <Text style={[styles.etaMinLabel, { color: colors.textSecondary }]}>min{'\n'}away</Text>
            </View>
          </View>
          <View style={[styles.etaDivider, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]} />
          <View style={styles.nextStopRow}>
            <MapPin size={13} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.nextStopLabel, { color: colors.textTertiary }]}>Next stop</Text>
            <Text style={[styles.nextStopName, { color: colors.textPrimary }]} numberOfLines={1}>
              {nextStop?.name ?? '—'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.etaHero}>
          <Text style={[styles.noTrackingText, { color: colors.textTertiary }]}>
            {busState.status === 'arrived' ? 'Bus has arrived' : 'Not currently tracking'}
          </Text>
        </View>
      )}

      {/* Last event banner */}
      {lastEvent && (
        <View style={[
          styles.eventBanner,
          {
            backgroundColor: lastEvent.eventType === 'boarded'
              ? (isDark ? 'rgba(22,163,74,0.12)' : '#F0FDF4')
              : (isDark ? 'rgba(96,165,250,0.1)' : '#EFF6FF'),
            borderColor: lastEvent.eventType === 'boarded'
              ? (isDark ? 'rgba(22,163,74,0.25)' : '#BBF7D0')
              : (isDark ? 'rgba(96,165,250,0.2)' : '#BFDBFE'),
          },
        ]}>
          <View style={[
            styles.eventBannerDot,
            { backgroundColor: lastEvent.eventType === 'boarded' ? '#16A34A' : '#3B82F6' },
          ]} />
          <Text style={[styles.eventBannerText, { color: colors.textSecondary }]}>
            {lastEvent.childName}{' '}
            <Text style={{ color: lastEvent.eventType === 'boarded' ? '#16A34A' : '#3B82F6', fontWeight: '700' as const }}>
              {lastEvent.eventType}
            </Text>
            {' '}at {fmtTime(lastEvent.occurredAt)}
          </Text>
        </View>
      )}

      {/* Action row */}
      <View style={styles.actionRow}>
        {!isActive ? (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.busYellow, shadowColor: colors.busYellow }]}
            onPress={startSimulation}
            activeOpacity={0.85}
            testID="start-simulation-btn"
          >
            <Text style={[styles.startBtnText, { color: '#0B3C5D' }]}>Start Simulation</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.actionChip,
                { backgroundColor: isFollowing ? colors.info : (isDark ? '#1E293B' : '#F1F5F9') },
                isFollowing && { shadowColor: colors.info },
              ]}
              onPress={toggleFollow}
              activeOpacity={0.8}
              testID="follow-bus-btn"
            >
              <Navigation size={14} color={isFollowing ? '#FFF' : colors.info} fill={isFollowing ? '#FFF' : 'none'} strokeWidth={2.5} />
              <Text style={[styles.chipText, { color: isFollowing ? '#FFF' : colors.info }]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={onMapSettingsPress}
              activeOpacity={0.8}
              testID="map-settings-btn"
            >
              <Layers size={14} color={colors.info} strokeWidth={2} />
              <Text style={[styles.chipText, { color: colors.info }]}>Layers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={onActivityPress}
              activeOpacity={0.8}
              testID="activity-btn"
            >
              <Bell size={14} color={colors.info} strokeWidth={2} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
              <Text style={[styles.chipText, { color: colors.info }]}>Activity</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionChip, {
                backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FFF1F2',
                borderColor: isDark ? 'rgba(239,68,68,0.25)' : '#FECDD3',
                borderWidth: 1,
              }]}
              onPress={stopSimulation}
              activeOpacity={0.8}
              testID="stop-simulation-btn"
            >
              <Text style={[styles.chipText, { color: colors.danger }]}>Stop</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {!isActive && (
        <View style={[styles.idleActions, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <TouchableOpacity
            style={[styles.idleBtn, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
            onPress={onActivityPress}
            activeOpacity={0.8}
          >
            <Bell size={15} color={colors.info} strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
            <Text style={[styles.idleBtnText, { color: colors.info }]}>Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.idleBtn, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
            onPress={onMapSettingsPress}
            activeOpacity={0.8}
          >
            <Layers size={15} color={colors.info} strokeWidth={2} />
            <Text style={[styles.idleBtnText, { color: colors.info }]}>Map Layers</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scrollable detail */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <RouteTimeline
          stops={route.stops}
          currentStopIndex={busState.currentStopIndex}
          nextStopIndex={busState.nextStopIndex}
        />
        <EventsFeed ridershipEvents={ridershipEvents} serviceAlerts={serviceAlerts} />
        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: SCREEN_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
    paddingHorizontal: 20,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  busIdBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  busIdText: {
    fontSize: 15,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  routeInfo: {
    flex: 1,
    gap: 2,
  },
  routeTo: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  presenceWrap: {
    marginTop: 1,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ETA
  etaHero: {
    marginBottom: 12,
  },
  etaMain: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 10,
  },
  etaNumber: {
    fontSize: 56,
    fontWeight: '800' as const,
    lineHeight: 60,
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  etaRight: {
    marginBottom: 8,
  },
  etaMinLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 19,
  },
  etaDivider: {
    height: 1,
    marginBottom: 10,
  },
  nextStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nextStopLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  nextStopName: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  noTrackingText: {
    fontSize: 15,
    paddingVertical: 8,
  },

  // Event banner
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  eventBannerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  eventBannerText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  startBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0A1628',
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: 6,
    backgroundColor: '#DC2626',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: '#FFF',
  },

  // Idle
  idleActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  idleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
  },
  idleBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },

  scroll: {
    flex: 1,
  },
});
