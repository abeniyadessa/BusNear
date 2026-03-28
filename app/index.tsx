import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { useRouter, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import Colors from '@/constants/colors';
import { MAP_INITIAL_REGION } from '@/constants/route';
import { useBusTracking } from '@/context/BusTrackingContext';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';
import BusMarker from '@/components/BusMarker';
import BottomSheet from '@/components/BottomSheet';
import MapSettingsSheet from '@/components/MapSettingsSheet';
import NotificationBanner from '@/components/NotificationBanner';
import { Bus, MapPin } from 'lucide-react-native';
import { NotificationType } from '@/types';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let Circle: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  Circle = Maps.Circle;
  PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
}

function projectCoord(
  lat: number,
  lng: number,
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
  width: number,
  height: number
) {
  const x = ((lng - (region.longitude - region.longitudeDelta / 2)) / region.longitudeDelta) * width;
  const y = ((region.latitude + region.latitudeDelta / 2 - lat) / region.latitudeDelta) * height;
  return { x, y };
}

function WebMapFallback() {
  const { busState, route, alertSettings, mapSettings } = useBusTracking();
  const { colors, isDark } = useTheme();

  const mapWidth = 400;
  const mapHeight = 500;

  const region = MAP_INITIAL_REGION;

  const routePath = useMemo(() => {
    return route.waypoints.map((wp) => projectCoord(wp.latitude, wp.longitude, region, mapWidth, mapHeight));
  }, [route.waypoints]);

  const stopPositions = useMemo(() => {
    return route.stops.map((stop) => ({
      ...stop,
      pos: projectCoord(stop.coordinate.latitude, stop.coordinate.longitude, region, mapWidth, mapHeight),
    }));
  }, [route.stops]);

  const homePos = useMemo(
    () => projectCoord(alertSettings.homeLocation.latitude, alertSettings.homeLocation.longitude, region, mapWidth, mapHeight),
    [alertSettings.homeLocation]
  );

  const busPos = useMemo(
    () => projectCoord(busState.position.latitude, busState.position.longitude, region, mapWidth, mapHeight),
    [busState.position]
  );

  const svgPath = useMemo(() => {
    if (routePath.length === 0) return '';
    return routePath.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  }, [routePath]);

  return (
    <View style={[webStyles.mapContainer, { backgroundColor: isDark ? '#1A2332' : '#E8EFF5' }]}>
      <View style={[webStyles.mapTileBackground, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
        <View style={webStyles.gridOverlay}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`h-${i}`} style={[webStyles.gridLineH, { top: `${(i + 1) * 12.5}%` as any, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`v-${i}`} style={[webStyles.gridLineV, { left: `${(i + 1) * 16.6}%` as any, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]} />
          ))}
        </View>

        <Svg width={mapWidth} height={mapHeight} style={{ position: 'absolute' as any, top: 0, left: 0 }}>
          {mapSettings.showRouteLine && (
            <>
              <Path d={svgPath} stroke={colors.routeLineFaded} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d={svgPath} stroke={colors.routeLine} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {mapSettings.showAlertZone && alertSettings.zoneAlertEnabled && (
            <SvgCircle
              cx={homePos.x}
              cy={homePos.y}
              r={alertSettings.zoneRadius / (region.latitudeDelta * 111000) * mapHeight}
              stroke="rgba(255,184,0,0.4)"
              fill="rgba(255,184,0,0.08)"
              strokeWidth="1.5"
            />
          )}
        </Svg>

        {mapSettings.showStopMarkers && stopPositions.map((stop, index) => {
          const isPast = index < busState.nextStopIndex;
          const isNext = index === busState.nextStopIndex;
          return (
            <View
              key={stop.id}
              style={[
                webStyles.stopMarker,
                { left: stop.pos.x - 5, top: stop.pos.y - 5, borderColor: colors.routeLine },
                isPast && { backgroundColor: colors.success, borderColor: colors.success },
                isNext && { width: 14, height: 14, borderRadius: 7, left: stop.pos.x - 7, top: stop.pos.y - 7, backgroundColor: colors.busYellow, borderColor: colors.busYellowDark, borderWidth: 2.5 },
              ]}
            />
          );
        })}

        <View style={[webStyles.homeMarker, { left: homePos.x - 7, top: homePos.y - 7, backgroundColor: colors.info, borderColor: isDark ? colors.surface : '#FFFFFF' }]} />

        {busState.isSimulating && (
          <View style={[webStyles.busMarkerWrap, { left: busPos.x - 22, top: busPos.y - 22 }]}>
            <View style={[webStyles.busCircle, { backgroundColor: colors.busYellow, borderColor: isDark ? colors.surface : '#FFFFFF' }]}>
              <Bus size={16} color={isDark ? colors.onPrimary : '#FFFFFF'} strokeWidth={2.5} />
            </View>
          </View>
        )}

        <View style={[webStyles.mapLabel, { backgroundColor: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)' }]}>
          <MapPin size={12} color={colors.textTertiary} />
          <Text style={[webStyles.mapLabelText, { color: colors.textTertiary }]}>Sunnyvale, CA</Text>
        </View>
      </View>
    </View>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const { busState, route, isFollowing, alertSettings, mapSettings, updateMapSettings, pendingAlerts, consumeAlert, setActiveBusId } = useBusTracking();
  const { authState, isLoading, activeChild } = useAuth();
  const { pushNotification } = useNotifications();
  const { colors, isDark } = useTheme();
  const [mapSettingsVisible, setMapSettingsVisible] = useState<boolean>(false);
  const rootNavigation = useNavigationContainerRef();
  const [isNavigationReady, setIsNavigationReady] = useState<boolean>(false);

  useEffect(() => {
    if (rootNavigation?.isReady()) {
      setIsNavigationReady(true);
    }
    const unsubscribe = rootNavigation?.addListener?.('state', () => {
      if (rootNavigation?.isReady()) {
        setIsNavigationReady(true);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [rootNavigation]);

  useEffect(() => {
    if (!isNavigationReady || isLoading) return;
    // Only redirect when clearly unauthenticated (step='welcome') or explicitly not auth'd
    // Avoid redirecting during transitional steps (enter_id, enter_otp, home_address, success)
    const isUnauthenticated = !authState.isAuthenticated && authState.step === 'welcome';
    if (isUnauthenticated) {
      try {
        router.replace('/onboarding' as never);
      } catch (e) {
        // Navigation container not ready yet, state change will re-trigger
      }
    }
  }, [authState.step, authState.isAuthenticated, isNavigationReady, isLoading]);

  // Subscribe to live GPS for the active child's bus
  useEffect(() => {
    if (activeChild?.assignedBusId) {
      setActiveBusId(activeChild.assignedBusId);
    }
    return () => setActiveBusId(null);
  }, [activeChild?.assignedBusId]);

  useEffect(() => {
    if (pendingAlerts.length > 0) {
      const alert = consumeAlert();
      if (alert) {
        pushNotification(alert.type as NotificationType, alert.title, alert.message);
      }
    }
  }, [pendingAlerts.length, consumeAlert, pushNotification]);

  const animateToPosition = useCallback(() => {
    if (!mapRef.current || !isFollowing || !busState.isSimulating) return;

    mapRef.current.animateCamera(
      {
        center: busState.position,
        pitch: mapSettings.follow3D ? 45 : 0,
        heading: mapSettings.follow3D ? busState.heading : 0,
        zoom: 16,
      },
      { duration: 800 }
    );
  }, [busState.position, busState.heading, isFollowing, busState.isSimulating, mapSettings.follow3D]);

  useEffect(() => {
    if (isFollowing && busState.isSimulating) {
      const timeout = setTimeout(animateToPosition, 100);
      return () => clearTimeout(timeout);
    }
  }, [busState.position.latitude, busState.position.longitude, isFollowing, busState.isSimulating]);

  const handleSettingsPress = useCallback(() => {
    router.push('/settings' as never);
  }, [router]);

  const handleActivityPress = useCallback(() => {
    router.push('/activity' as never);
  }, [router]);

  const handleMapSettingsPress = useCallback(() => {
    setMapSettingsVisible(true);
  }, []);

  const isWeb = Platform.OS === 'web';

  const shouldShowMap = authState.isAuthenticated || authState.step === 'authenticated';

  if (!shouldShowMap) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isWeb ? (
        <WebMapFallback />
      ) : MapView ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={MAP_INITIAL_REGION}
          provider={PROVIDER_DEFAULT}
          showsUserLocation={false}
          showsCompass={false}
          showsScale={false}
          rotateEnabled={true}
          pitchEnabled={true}
          mapPadding={{ top: 0, right: 0, bottom: 300, left: 0 }}
          testID="map-view"
        >
          {mapSettings.showRouteLine && (
            <>
              <Polyline
                coordinates={route.waypoints}
                strokeColor={colors.routeLineFaded}
                strokeWidth={6}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                coordinates={route.waypoints}
                strokeColor={colors.routeLine}
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}

          {mapSettings.showStopMarkers && route.stops.map((stop, index) => {
            const isPast = index < busState.nextStopIndex;
            const isNext = index === busState.nextStopIndex;
            return (
              <Marker
                key={stop.id}
                coordinate={stop.coordinate}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View
                  style={[
                    styles.stopDot,
                    isPast && styles.stopDotPast,
                    isNext && styles.stopDotNext,
                  ]}
                />
              </Marker>
            );
          })}

          {mapSettings.showAlertZone && alertSettings.zoneAlertEnabled && (
            <Circle
              center={alertSettings.homeLocation}
              radius={alertSettings.zoneRadius}
              strokeColor="rgba(255,184,0,0.4)"
              fillColor="rgba(255,184,0,0.08)"
              strokeWidth={1.5}
            />
          )}

          <Marker
            coordinate={alertSettings.homeLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.homeDot} />
          </Marker>

          {busState.isSimulating && (
            <Marker
              coordinate={busState.position}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={true}
              flat={true}
            >
              <BusMarker heading={busState.heading} status={busState.status} />
            </Marker>
          )}
        </MapView>
      ) : null}

      <BottomSheet
        onSettingsPress={handleSettingsPress}
        onMapSettingsPress={handleMapSettingsPress}
        onActivityPress={handleActivityPress}
      />

      <MapSettingsSheet
        visible={mapSettingsVisible}
        onClose={() => setMapSettingsVisible(false)}
        settings={mapSettings}
        onUpdate={updateMapSettings}
      />

      <NotificationBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    flex: 1,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.routeLine,
  },
  stopDotPast: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  stopDotNext: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.busYellow,
    borderColor: Colors.busYellowDark,
    borderWidth: 2.5,
  },
  homeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.info,
    borderWidth: 2.5,
    borderColor: Colors.white,
    shadowColor: Colors.info,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
});

const webStyles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  mapTileBackground: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  stopMarker: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  homeMarker: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  busMarkerWrap: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  mapLabel: {
    position: 'absolute',
    bottom: 310,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapLabelText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
});
