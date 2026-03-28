import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, {
  Rect,
  Path,
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
  Ellipse,
} from 'react-native-svg';
import { BusStatus } from '@/types';

interface BusMarkerProps {
  heading: number;
  status: BusStatus;
}

// ── Palette ──────────────────────────────────────────────────────────────────
const Y1 = '#FFD233'; // roof highlight
const Y2 = '#FFC400'; // body face
const Y3 = '#D4991A'; // right depth side
const Y4 = '#B07A0D'; // bottom depth side
const NAVY = '#0B3C5D';
const WIN = '#1E3A5F';
const WIN_SHINE = 'rgba(255,255,255,0.25)';
const WHITE = '#FFFFFF';
const WHEEL = '#1A1A2E';
const WHEEL_RIM = '#4A5568';

// ── The 3-D bus SVG (64×64 canvas, bus facing "up" = direction of travel) ────
function Bus3D({ color = Y2 }: { color?: string }) {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64">
      <Defs>
        {/* Body face gradient */}
        <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Y1} stopOpacity="1" />
          <Stop offset="1" stopColor={color} stopOpacity="1" />
        </LinearGradient>
        {/* Roof gradient */}
        <LinearGradient id="roofGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={Y1} stopOpacity="1" />
          <Stop offset="1" stopColor={Y2} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* ── Ground shadow ── */}
      <Ellipse cx="33" cy="56" rx="18" ry="4" fill="rgba(0,0,0,0.18)" />

      {/* ── Right-side depth panel (gives the bus thickness) ── */}
      {/* Bottom face */}
      <Path
        d="M16 44 L48 44 L52 48 L12 48 Z"
        fill={Y4}
      />
      {/* Right face */}
      <Path
        d="M48 20 L52 16 L52 48 L48 44 Z"
        fill={Y3}
      />

      {/* ── Main bus body face ── */}
      <Rect
        x="16" y="20"
        width="32" height="24"
        rx="2"
        fill="url(#bodyGrad)"
      />

      {/* ── Roof (top face, isometric parallelogram) ── */}
      <Path
        d="M16 20 L20 14 L52 14 L48 20 Z"
        fill="url(#roofGrad)"
      />
      {/* Roof right edge */}
      <Path
        d="M48 20 L52 14 L52 16 L48 22 Z"
        fill={Y3}
      />

      {/* ── Front bumper (bottom of body face) ── */}
      <Rect
        x="16" y="40"
        width="32" height="4"
        rx="1"
        fill={NAVY}
        opacity={0.7}
      />

      {/* ── Windows (3 side windows) ── */}
      <Rect x="19" y="23" width="7" height="7" rx="1" fill={WIN} />
      <Rect x="29" y="23" width="7" height="7" rx="1" fill={WIN} />
      <Rect x="39" y="23" width="7" height="7" rx="1" fill={WIN} />

      {/* Window shine */}
      <Rect x="19" y="23" width="3" height="2" rx="0.5" fill={WIN_SHINE} />
      <Rect x="29" y="23" width="3" height="2" rx="0.5" fill={WIN_SHINE} />
      <Rect x="39" y="23" width="3" height="2" rx="0.5" fill={WIN_SHINE} />

      {/* ── Windshield / front face ── */}
      <Rect x="16" y="32" width="12" height="7" rx="1" fill={WIN} opacity={0.9} />
      <Rect x="16" y="32" width="5" height="2" rx="0.5" fill={WIN_SHINE} />

      {/* ── "SCHOOL BUS" stripe ── */}
      <Rect x="16" y="31" width="32" height="1.5" fill={NAVY} opacity={0.25} />

      {/* ── Wheels ── */}
      {/* Front-left */}
      <Circle cx="20" cy="44" r="4.5" fill={WHEEL} />
      <Circle cx="20" cy="44" r="2.2" fill={WHEEL_RIM} />
      <Circle cx="20" cy="44" r="1" fill={WHEEL} />
      {/* Front-right */}
      <Circle cx="44" cy="44" r="4.5" fill={WHEEL} />
      <Circle cx="44" cy="44" r="2.2" fill={WHEEL_RIM} />
      <Circle cx="44" cy="44" r="1" fill={WHEEL} />

      {/* Right-side wheels (3D offset) */}
      <Circle cx="48" cy="46" r="3.5" fill={WHEEL} opacity={0.7} />
      <Circle cx="48" cy="46" r="1.6" fill={WHEEL_RIM} opacity={0.7} />

      {/* ── Headlights ── */}
      <Rect x="17" y="43" width="4" height="2" rx="1" fill="#FFE566" opacity={0.9} />
      <Rect x="43" y="43" width="4" height="2" rx="1" fill="#FFE566" opacity={0.9} />

      {/* ── Direction chevron (points up = forward) ── */}
      <Path
        d="M28 11 L32 6 L36 11 L32 9 Z"
        fill={NAVY}
        opacity={0.85}
      />
    </Svg>
  );
}

// ── Marker wrapper with pulse + heading rotation ──────────────────────────────
export default function BusMarker({ heading, status }: BusMarkerProps) {
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const isArriving   = status === 'arriving';

  useEffect(() => {
    if (isArriving) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim,    { toValue: 2.4, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0,   duration: 1000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim,    { toValue: 1,   duration: 0,    useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.5, duration: 0,    useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0);
    }
  }, [isArriving]);

  const busColor = status === 'delayed' ? '#FF6B35' : Y2;

  return (
    <View style={[styles.container, { transform: [{ rotate: `${heading}deg` }] }]}>
      {/* Pulse ring when arriving */}
      {isArriving && (
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
          ]}
        />
      )}
      <Bus3D color={busColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Y2,
  },
});
