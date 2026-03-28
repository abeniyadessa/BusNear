import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Play, Square, Gauge, MapPin, Bus, LogIn, LogOut, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBusTracking } from '@/context/BusTrackingContext';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import StatusChip from '@/components/StatusChip';
import { Child, RidershipEvent } from '@/types';
import { MOCK_CHILDREN } from '@/mocks/children';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function DriverScreen() {
  const { busState, route, startSimulation, stopSimulation } = useBusTracking();
  const { addRidershipEvent, authState } = useAuth();
  const { pushNotification } = useNotifications();
  const isActive = busState.isSimulating;
  const nextStop = route.stops[busState.nextStopIndex];
  const [showRidership, setShowRidership] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<{ childName: string; action: string } | null>(null);
  const [children, setChildren] = useState<Child[]>(MOCK_CHILDREN);
  const [loadingChildren, setLoadingChildren] = useState<boolean>(false);

  // Load children from DB (filtered to those on this bus)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    setLoadingChildren(true);
    void (async () => {
      try {
        const { data } = await supabase
          .from('children')
          .select('id, first_name, last_name, grade, assigned_bus_id, assigned_route_id, avatar_color, schools(name)')
          .eq('assigned_bus_id', busState.busId);

        if (data && data.length > 0) {
          setChildren(
            data.map((c: any) => ({
              id: c.id,
              name: `${c.first_name}${c.last_name ? ' ' + c.last_name : ''}`,
              grade: c.grade ?? '',
              school: c.schools?.name ?? '',
              assignedBusId: c.assigned_bus_id ?? '',
              assignedRouteId: c.assigned_route_id ?? '',
              avatarColor: c.avatar_color,
            }))
          );
        }
      } finally {
        setLoadingChildren(false);
      }
    })();
  }, [busState.busId]);

  const handleRidershipEvent = useCallback(
    async (childId: string, childName: string, eventType: 'boarded' | 'exited') => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const event: RidershipEvent = {
        id: `rev-${Date.now()}`,
        childId,
        childName,
        busId: busState.busId,
        eventType,
        stopName: nextStop?.name ?? 'Unknown Stop',
        coordinate: busState.position,
        occurredAt: Date.now(),
      };

      // Write to Supabase
      if (isSupabaseConfigured()) {
        await supabase.from('ridership_events').insert({
          child_id: childId,
          bus_id: busState.busId,
          event_type: eventType,
          stop_name: nextStop?.name ?? '',
          latitude: busState.position.latitude,
          longitude: busState.position.longitude,
          recorded_by: authState.parentId ?? null,
        });
      }

      // Update local state (for parents listening via Realtime)
      addRidershipEvent(event);

      // Push notification to parent if they're in the linked list
      const isLinkedChild = authState.linkedChildren.some((c) => c.id === childId);
      if (isLinkedChild) {
        const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        if (eventType === 'boarded') {
          pushNotification(
            'boarded',
            `Boarded: ${busState.busId}`,
            `${childName} boarded at ${timeStr} • ${nextStop?.name ?? 'Current location'}`
          );
        } else {
          pushNotification(
            'exited',
            `Exited: ${busState.busId}`,
            `${childName} exited at ${timeStr} • ${nextStop?.name ?? 'Current location'}`
          );
        }
      }

      setLastAction({ childName, action: eventType === 'boarded' ? 'boarded' : 'exited' });
      setTimeout(() => setLastAction(null), 3000);
    },
    [busState, nextStop, addRidershipEvent, pushNotification, authState.linkedChildren]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Driver Mode',
          headerStyle: { backgroundColor: Colors.textPrimary },
          headerTintColor: Colors.white,
          headerShadowVisible: false,
          presentation: 'modal',
        }}
      />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.busInfo}>
          <View style={styles.busIconWrap}>
            <Bus size={32} color={Colors.busYellow} />
          </View>
          <Text style={styles.busId}>{busState.busId}</Text>
          <Text style={styles.routeName}>{route.name}</Text>
          <StatusChip status={busState.status} />
        </View>

        {lastAction && (
          <View style={styles.confirmationBanner}>
            <View style={[
              styles.confirmIcon,
              { backgroundColor: lastAction.action === 'boarded' ? '#E8F8EE' : '#EEF2FF' },
            ]}>
              {lastAction.action === 'boarded' ? (
                <LogIn size={16} color="#1B7A3D" />
              ) : (
                <LogOut size={16} color={Colors.info} />
              )}
            </View>
            <Text style={styles.confirmText}>
              {lastAction.childName} {lastAction.action} {busState.busId}
            </Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Gauge size={20} color={Colors.busYellow} />
            <Text style={styles.statValue}>
              {isActive ? `${Math.round(busState.speed)}` : '--'}
            </Text>
            <Text style={styles.statLabel}>km/h</Text>
          </View>
          <View style={styles.statCard}>
            <MapPin size={20} color={Colors.busYellow} />
            <Text style={styles.statValue} numberOfLines={1}>
              {isActive ? nextStop?.name ?? '—' : '--'}
            </Text>
            <Text style={styles.statLabel}>Next Stop</Text>
          </View>
        </View>

        <View style={styles.buttonArea}>
          {!isActive ? (
            <TouchableOpacity
              style={styles.startBtn}
              onPress={startSimulation}
              activeOpacity={0.85}
              testID="driver-start-btn"
            >
              <Play size={28} color={Colors.white} fill={Colors.white} />
              <Text style={styles.startBtnText}>Start Route</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.endBtn}
              onPress={stopSimulation}
              activeOpacity={0.85}
              testID="driver-end-btn"
            >
              <Square size={24} color={Colors.white} fill={Colors.white} />
              <Text style={styles.endBtnText}>End Route</Text>
            </TouchableOpacity>
          )}
        </View>

        {isActive && (
          <View style={styles.ridershipSection}>
            <TouchableOpacity
              style={styles.ridershipToggle}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowRidership(!showRidership);
              }}
              activeOpacity={0.8}
            >
              <Users size={18} color={Colors.busYellow} />
              <Text style={styles.ridershipToggleText}>
                {showRidership ? 'Hide Ridership' : 'Record Board / Exit'}
              </Text>
            </TouchableOpacity>

            {showRidership && (
              <View style={styles.ridershipList}>
                {loadingChildren ? (
                  <ActivityIndicator color={Colors.busYellow} style={{ marginTop: 16 }} />
                ) : (
                  children.map((child) => (
                    <View key={child.id} style={styles.ridershipRow}>
                      <View style={[styles.riderAvatar, { backgroundColor: child.avatarColor }]}>
                        <Text style={styles.riderAvatarText}>{child.name[0]}</Text>
                      </View>
                      <Text style={styles.riderName}>{child.name}</Text>
                      <View style={styles.riderActions}>
                        <TouchableOpacity
                          style={styles.boardBtn}
                          onPress={() => handleRidershipEvent(child.id, child.name, 'boarded')}
                          activeOpacity={0.8}
                          testID={`board-${child.id}`}
                        >
                          <LogIn size={16} color="#1B7A3D" />
                          <Text style={styles.boardBtnText}>Board</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.exitBtn}
                          onPress={() => handleRidershipEvent(child.id, child.name, 'exited')}
                          activeOpacity={0.8}
                          testID={`exit-${child.id}`}
                        >
                          <LogOut size={16} color={Colors.info} />
                          <Text style={styles.exitBtnText}>Exit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        <Text style={styles.disclaimer}>
          {isSupabaseConfigured()
            ? 'Live GPS is broadcasting to all tracking parents.'
            : 'Connect Supabase to broadcast live GPS to parents.'}
          {'\n'}Keep screen on while driving.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.textPrimary },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  busInfo: { alignItems: 'center', gap: 8, marginBottom: 28 },
  busIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,184,0,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  busId: { fontSize: 28, fontWeight: '800' as const, color: Colors.white },
  routeName: { fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  confirmationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  confirmIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 15, fontWeight: '600' as const, color: Colors.white, flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: { fontSize: 22, fontWeight: '700' as const, color: Colors.white, textAlign: 'center' },
  statLabel: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)',
    fontWeight: '500' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5,
  },
  buttonArea: { paddingVertical: 12 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: Colors.busYellow, paddingVertical: 20, borderRadius: 18,
    shadowColor: Colors.busYellow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  startBtnText: { fontSize: 20, fontWeight: '700' as const, color: Colors.white },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: Colors.danger, paddingVertical: 20, borderRadius: 18,
    shadowColor: Colors.danger, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  endBtnText: { fontSize: 20, fontWeight: '700' as const, color: Colors.white },
  ridershipSection: { marginTop: 16 },
  ridershipToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,184,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)',
  },
  ridershipToggleText: { fontSize: 15, fontWeight: '600' as const, color: Colors.busYellow },
  ridershipList: { marginTop: 12, gap: 10 },
  ridershipRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  riderAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  riderAvatarText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  riderName: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: Colors.white },
  riderActions: { flexDirection: 'row', gap: 8 },
  boardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#E8F8EE',
  },
  boardBtnText: { fontSize: 13, fontWeight: '600' as const, color: '#1B7A3D' },
  exitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#EEF2FF',
  },
  exitBtnText: { fontSize: 13, fontWeight: '600' as const, color: Colors.info },
  disclaimer: {
    fontSize: 12, color: 'rgba(255,255,255,0.25)',
    textAlign: 'center', lineHeight: 18, paddingTop: 24, paddingBottom: 24,
  },
});
