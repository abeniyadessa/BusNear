import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  DEFAULT_ROUTE,
  DEFAULT_ALERT_SETTINGS,
  DEFAULT_MAP_SETTINGS,
  TWO_MILES_METERS,
  distanceMeters,
  calculateHeading,
  lerpAngle,
  lerp,
} from '@/constants/route';
import { BusState, BusStatus, AlertSettings, LatLng, MapSettings, PresenceState } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const FRAME_INTERVAL = 50;
const BUS_SPEED_MPS = 8;
const STOP_PAUSE_MS = 3000;
const ARRIVING_THRESHOLD_M = 200;

export type AlertCallback = (type: string, title: string, message: string) => void;

function createInitialBusState(): BusState {
  return {
    position: DEFAULT_ROUTE.waypoints[0],
    heading: 0,
    speed: 0,
    status: 'not_started' as BusStatus,
    currentStopIndex: 0,
    nextStopIndex: 0,
    eta: 0,
    lastUpdated: Date.now(),
    busId: DEFAULT_ROUTE.busId,
    routeName: DEFAULT_ROUTE.name,
    isSimulating: false,
  };
}

function getPresenceState(lastUpdated: number): PresenceState {
  const elapsed = (Date.now() - lastUpdated) / 1000;
  if (elapsed <= 10) return 'live';
  if (elapsed <= 60) return 'recent';
  return 'stale';
}

export const [BusTrackingProvider, useBusTracking] = createContextHook(() => {
  const [busState, setBusState] = useState<BusState>(createInitialBusState);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [mapSettings, setMapSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS);
  const [presenceState, setPresenceState] = useState<PresenceState>('stale');
  const [pendingAlerts, setPendingAlerts] = useState<Array<{ type: string; title: string; message: string }>>([]);
  const [activeBusId, setActiveBusIdState] = useState<string | null>(null);

  const alertSettingsRef = useRef<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const lastZoneAlertRef = useRef<number>(0);
  const lastTwoMileAlertRef = useRef<number>(0);
  const lastEtaAlertsRef = useRef<Set<number>>(new Set());

  const waypointIndexRef = useRef<number>(0);
  const segmentProgressRef = useRef<number>(0);
  const headingRef = useRef<number>(0);
  const pauseUntilRef = useRef<number>(0);
  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSimulatingRef = useRef<boolean>(false);
  // Throttle GPS writes to Supabase to ~1 per second
  const lastDbWriteRef = useRef<number>(0);

  useEffect(() => {
    alertSettingsRef.current = alertSettings;
  }, [alertSettings]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (busState.isSimulating) {
        setPresenceState(getPresenceState(busState.lastUpdated));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [busState.isSimulating, busState.lastUpdated]);

  const settingsQuery = useQuery({
    queryKey: ['alertSettings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('busnear_alert_settings');
      if (stored) {
        return JSON.parse(stored) as AlertSettings;
      }
      return DEFAULT_ALERT_SETTINGS;
    },
  });

  const mapSettingsQuery = useQuery({
    queryKey: ['mapSettings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('busnear_map_settings');
      if (stored) {
        return JSON.parse(stored) as MapSettings;
      }
      return DEFAULT_MAP_SETTINGS;
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: AlertSettings) => {
      await AsyncStorage.setItem('busnear_alert_settings', JSON.stringify(settings));
      return settings;
    },
  });

  const saveMapSettingsMutation = useMutation({
    mutationFn: async (settings: MapSettings) => {
      await AsyncStorage.setItem('busnear_map_settings', JSON.stringify(settings));
      return settings;
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setAlertSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (mapSettingsQuery.data) {
      setMapSettings(mapSettingsQuery.data);
    }
  }, [mapSettingsQuery.data]);

  const updateAlertSettings = useCallback((newSettings: AlertSettings) => {
    setAlertSettings(newSettings);
    saveSettingsMutation.mutate(newSettings);
  }, [saveSettingsMutation]);

  // ─── Supabase Realtime: subscribe to live bus location ───────────────────────
  useEffect(() => {
    if (!activeBusId || !isSupabaseConfigured()) return;

    // Fetch latest location immediately
    supabase
      .from('bus_locations')
      .select('*')
      .eq('bus_id', activeBusId)
      .single()
      .then(({ data }) => {
        if (data && data.is_active) {
          setBusState({
            position: { latitude: data.latitude, longitude: data.longitude },
            heading: data.heading,
            speed: data.speed,
            status: data.status as BusStatus,
            currentStopIndex: data.waypoint_index,
            nextStopIndex: Math.min(data.waypoint_index + 1, DEFAULT_ROUTE.stops.length - 1),
            eta: data.eta_minutes,
            lastUpdated: new Date(data.updated_at).getTime(),
            busId: data.bus_id,
            routeName: DEFAULT_ROUTE.name,
            isSimulating: false,
          });
          setPresenceState(getPresenceState(new Date(data.updated_at).getTime()));
        }
      });

    // Subscribe to changes
    const channel = supabase
      .channel(`bus-location-${activeBusId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bus_locations',
          filter: `bus_id=eq.${activeBusId}`,
        },
        (payload) => {
          const d = payload.new as any;
          if (!d.is_active) return;
          const updatedAt = new Date(d.updated_at).getTime();
          setBusState({
            position: { latitude: d.latitude, longitude: d.longitude },
            heading: d.heading,
            speed: d.speed,
            status: d.status as BusStatus,
            currentStopIndex: d.waypoint_index,
            nextStopIndex: Math.min(d.waypoint_index + 1, DEFAULT_ROUTE.stops.length - 1),
            eta: d.eta_minutes,
            lastUpdated: updatedAt,
            busId: d.bus_id,
            routeName: DEFAULT_ROUTE.name,
            isSimulating: false,
          });
          setPresenceState('live');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBusId]);

  /** Called by the map screen when the active child's bus ID is known */
  const setActiveBusId = useCallback((busId: string | null) => {
    setActiveBusIdState(busId);
  }, []);

  const updateMapSettings = useCallback((newSettings: MapSettings) => {
    setMapSettings(newSettings);
    saveMapSettingsMutation.mutate(newSettings);
  }, [saveMapSettingsMutation]);

  const calculateEta = useCallback((fromWaypointIndex: number, fromProgress: number): number => {
    const waypoints = DEFAULT_ROUTE.waypoints;
    if (fromWaypointIndex >= waypoints.length - 1) return 0;

    const currentWp = waypoints[fromWaypointIndex];
    const nextWp = waypoints[fromWaypointIndex + 1];
    const currentSegmentRemaining =
      distanceMeters(currentWp, nextWp) * (1 - fromProgress);

    let totalDistance = currentSegmentRemaining;
    for (let i = fromWaypointIndex + 1; i < waypoints.length - 1; i++) {
      totalDistance += distanceMeters(waypoints[i], waypoints[i + 1]);
    }

    const stopPauses =
      DEFAULT_ROUTE.stops.filter(
        (s) => s.waypointIndex > fromWaypointIndex
      ).length * (STOP_PAUSE_MS / 1000);

    return Math.max(0, Math.round((totalDistance / BUS_SPEED_MPS + stopPauses) / 60));
  }, []);

  const consumeAlert = useCallback(() => {
    if (pendingAlerts.length > 0) {
      const alert = pendingAlerts[0];
      setPendingAlerts((prev) => prev.slice(1));
      return alert;
    }
    return null;
  }, [pendingAlerts]);

  const checkAlerts = useCallback(
    (position: LatLng, eta: number) => {
      const now = Date.now();
      const settings = alertSettingsRef.current;

      if (settings.zoneAlertEnabled) {
        const dist = distanceMeters(position, settings.homeLocation);
        if (dist <= settings.zoneRadius && now - lastZoneAlertRef.current > 60000) {
          lastZoneAlertRef.current = now;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPendingAlerts((prev) => [...prev, {
            type: 'bus_nearby',
            title: 'Bus Nearby',
            message: `${DEFAULT_ROUTE.busId} is within ${Math.round(dist)}m of your location.`,
          }]);
        }
      }

      if (settings.twoMileAlertEnabled) {
        const dist = distanceMeters(position, settings.homeLocation);
        if (dist <= TWO_MILES_METERS && now - lastTwoMileAlertRef.current > 120000) {
          lastTwoMileAlertRef.current = now;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setPendingAlerts((prev) => [...prev, {
            type: 'bus_2mile',
            title: 'Bus Within 2 Miles',
            message: `${DEFAULT_ROUTE.busId} is within 2 miles of your stop.`,
          }]);
        }
      }

      if (settings.etaAlertEnabled) {
        for (const threshold of settings.etaThresholds) {
          if (eta <= threshold && eta > 0 && !lastEtaAlertsRef.current.has(threshold)) {
            lastEtaAlertsRef.current.add(threshold);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setPendingAlerts((prev) => [...prev, {
              type: 'eta_alert',
              title: 'ETA Alert',
              message: `${DEFAULT_ROUTE.busId} is ${eta} min away.`,
            }]);
            break;
          }
        }
      }
    },
    []
  );

  const simulationTick = useCallback(() => {
    if (!isSimulatingRef.current) return;

    const now = Date.now();
    const waypoints = DEFAULT_ROUTE.waypoints;

    if (pauseUntilRef.current > now) return;

    const wpIndex = waypointIndexRef.current;
    if (wpIndex >= waypoints.length - 1) {
      isSimulatingRef.current = false;
      setBusState((prev) => ({
        ...prev,
        status: 'arrived',
        speed: 0,
        isSimulating: false,
        eta: 0,
        lastUpdated: now,
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    const currentWp = waypoints[wpIndex];
    const nextWp = waypoints[wpIndex + 1];
    const segmentDist = distanceMeters(currentWp, nextWp);
    const progressPerFrame = segmentDist > 0 ? (BUS_SPEED_MPS * (FRAME_INTERVAL / 1000)) / segmentDist : 1;

    segmentProgressRef.current += progressPerFrame;

    if (segmentProgressRef.current >= 1) {
      segmentProgressRef.current = 0;
      waypointIndexRef.current += 1;

      const newWpIndex = waypointIndexRef.current;
      const isStop = DEFAULT_ROUTE.stops.some((s) => s.waypointIndex === newWpIndex);

      if (isStop && newWpIndex < waypoints.length - 1) {
        pauseUntilRef.current = now + STOP_PAUSE_MS;
      }
    }

    const idx = waypointIndexRef.current;
    const prog = segmentProgressRef.current;

    if (idx >= waypoints.length - 1) return;

    const from = waypoints[idx];
    const to = waypoints[idx + 1];

    const newPos: LatLng = {
      latitude: lerp(from.latitude, to.latitude, prog),
      longitude: lerp(from.longitude, to.longitude, prog),
    };

    const targetHeading = calculateHeading(from, to);
    headingRef.current = lerpAngle(headingRef.current, targetHeading, 0.15);

    const eta = calculateEta(idx, prog);
    const distToHome = distanceMeters(newPos, alertSettingsRef.current.homeLocation);

    let status: BusStatus = 'on_time';
    if (distToHome <= ARRIVING_THRESHOLD_M) {
      status = 'arriving';
    }
    if (idx >= waypoints.length - 2 && prog > 0.8) {
      status = 'arrived';
    }

    const currentStopIdx = DEFAULT_ROUTE.stops.reduce((acc, stop, i) => {
      return idx >= stop.waypointIndex ? i : acc;
    }, 0);

    const nextStopIdx = Math.min(currentStopIdx + 1, DEFAULT_ROUTE.stops.length - 1);

    setBusState({
      position: newPos,
      heading: headingRef.current,
      speed: BUS_SPEED_MPS * 3.6,
      status,
      currentStopIndex: currentStopIdx,
      nextStopIndex: nextStopIdx,
      eta,
      lastUpdated: now,
      busId: DEFAULT_ROUTE.busId,
      routeName: DEFAULT_ROUTE.name,
      isSimulating: true,
    });

    // Broadcast GPS to Supabase ~1/sec (throttled from 20/sec simulation)
    if (isSupabaseConfigured() && now - lastDbWriteRef.current > 1000) {
      lastDbWriteRef.current = now;
      supabase
        .from('bus_locations')
        .upsert({
          bus_id: DEFAULT_ROUTE.busId,
          latitude: newPos.latitude,
          longitude: newPos.longitude,
          heading: headingRef.current,
          speed: BUS_SPEED_MPS * 3.6,
          status,
          waypoint_index: idx,
          eta_minutes: eta,
          is_active: true,
          updated_at: new Date(now).toISOString(),
        })
        .then(); // fire and forget
    }

    checkAlerts(newPos, eta);
  }, [calculateEta, checkAlerts]);

  useEffect(() => {
    animFrameRef.current = setInterval(() => {
      if (isSimulatingRef.current) {
        simulationTick();
      }
    }, FRAME_INTERVAL);

    return () => {
      if (animFrameRef.current) {
        clearInterval(animFrameRef.current);
      }
    };
  }, [simulationTick]);

  const startSimulation = useCallback(() => {
    console.log('[BusNear] Starting simulation');
    waypointIndexRef.current = 0;
    segmentProgressRef.current = 0;
    headingRef.current = 0;
    pauseUntilRef.current = 0;
    isSimulatingRef.current = true;
    lastEtaAlertsRef.current = new Set();
    lastZoneAlertRef.current = 0;
    lastTwoMileAlertRef.current = 0;

    setBusState({
      ...createInitialBusState(),
      status: 'on_time',
      isSimulating: true,
      eta: calculateEta(0, 0),
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [calculateEta]);

  const stopSimulation = useCallback(() => {
    console.log('[BusNear] Stopping simulation');
    isSimulatingRef.current = false;
    setBusState((prev) => ({
      ...prev,
      isSimulating: false,
      speed: 0,
      status: 'not_started',
    }));
    if (isSupabaseConfigured()) {
      supabase
        .from('bus_locations')
        .update({ is_active: false, status: 'not_started', speed: 0 })
        .eq('bus_id', DEFAULT_ROUTE.busId)
        .then();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const toggleFollow = useCallback(() => {
    setIsFollowing((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return {
    busState,
    isFollowing,
    setIsFollowing,
    toggleFollow,
    alertSettings,
    updateAlertSettings,
    mapSettings,
    updateMapSettings,
    presenceState,
    startSimulation,
    stopSimulation,
    route: DEFAULT_ROUTE,
    pendingAlerts,
    consumeAlert,
    activeBusId,
    setActiveBusId,
  };
});
