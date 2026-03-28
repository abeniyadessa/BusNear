import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Rect, Path, Defs, LinearGradient, RadialGradient, Stop, ClipPath, Ellipse } from 'react-native-svg';
import { BusStatus } from '@/types';

interface BusMarkerProps {
  heading: number;
  status: BusStatus;
}

// ─── SVG bus (pure top-down, no fake depth in SVG — perspective transform handles 3D) ───
function BusSVG({ status }: { status: BusStatus }) {
  const delayed = status === 'delayed';
  const C1 = delayed ? '#FF9966' : '#FFE066';   // roof highlight
  const C2 = delayed ? '#FF6B35' : '#FFC400';   // roof mid
  const C3 = delayed ? '#CC4A1A' : '#C47E00';   // roof shadow edge

  return (
    <Svg width={36} height={56} viewBox="0 0 36 56">
      <Defs>
        {/* Roof — radial, sunlight from top-left */}
        <RadialGradient id="roof" cx="40%" cy="25%" rx="65%" ry="55%">
          <Stop offset="0%"   stopColor={C1} stopOpacity="1" />
          <Stop offset="50%"  stopColor={C2} stopOpacity="1" />
          <Stop offset="100%" stopColor={C3} stopOpacity="1" />
        </RadialGradient>

        {/* Glass */}
        <LinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor="#3A6EA8" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#0D2B50" stopOpacity="1"   />
        </LinearGradient>

        {/* Clip to bus shape */}
        <ClipPath id="body">
          <Rect x="2" y="2" width="32" height="52" rx="6" />
        </ClipPath>
      </Defs>

      {/* ── Body ── */}
      <Rect x="2" y="2" width="32" height="52" rx="6" fill="url(#roof)" />

      {/* ── Windshield (front) ── */}
      <Rect x="4" y="3" width="28" height="10" rx="3" fill="url(#glass)" clipPath="url(#body)" />
      {/* glare */}
      <Rect x="5" y="4" width="8" height="2.5" rx="1" fill="white" opacity="0.22" clipPath="url(#body)" />

      {/* ── Roof center line (single subtle ridge) ── */}
      <Rect x="17" y="14" width="2" height="28" rx="1" fill="rgba(0,0,0,0.08)" clipPath="url(#body)" />

      {/* ── Rear window ── */}
      <Rect x="4" y="43" width="28" height="9" rx="3" fill="url(#glass)" clipPath="url(#body)" />
      {/* glare */}
      <Rect x="5" y="44" width="7" height="2" rx="1" fill="white" opacity="0.15" clipPath="url(#body)" />

      {/* ── Right-edge shadow (subtle depth on sides) ── */}
      <Rect x="30" y="2" width="4" height="52" rx="0" fill="rgba(0,0,0,0.09)" clipPath="url(#body)" />
      <Rect x="2"  y="2" width="4" height="52" rx="0" fill="rgba(255,255,255,0.06)" clipPath="url(#body)" />

      {/* ── Bottom edge shadow ── */}
      <Rect x="2" y="48" width="32" height="6" rx="0" fill="rgba(0,0,0,0.07)" clipPath="url(#body)" />

      {/* ── Headlights ── */}
      <Rect x="3"  y="3" width="5" height="3" rx="1.5" fill="#FFFBE6" opacity="0.95" />
      <Rect x="28" y="3" width="5" height="3" rx="1.5" fill="#FFFBE6" opacity="0.95" />

      {/* ── Tail lights ── */}
      <Rect x="3"  y="51" width="5" height="3" rx="1.5" fill="#FF3B30" opacity="0.9" />
      <Rect x="28" y="51" width="5" height="3" rx="1.5" fill="#FF3B30" opacity="0.9" />

      {/* ── Direction arrow ── */}
      <Path d="M18 -4 L13 2 L23 2 Z" fill="#0B3C5D" opacity="0.7" />
    </Svg>
  );
}

export default function BusMarker({ heading, status }: BusMarkerProps) {
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const breathe      = useRef(new Animated.Value(1)).current;
  const isArriving   = status === 'arriving' || status === 'arrived';

  // Idle breathe
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.06, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Arrival pulse
  useEffect(() => {
    if (isArriving) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseScale,   { toValue: 2.6, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseScale,   { toValue: 1,    duration: 0, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.5,  duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
    pulseScale.setValue(1);
    pulseOpacity.setValue(0);
  }, [isArriving]);

  // The magic: perspective + rotateX gives the 3D "see the side as it turns" effect.
  // rotateX tilts the bus so the front face is visible. As rotateZ (heading) changes,
  // whichever face is now at the "front" of the tilt naturally becomes visible —
  // exactly like a real 3D object rotating on a flat surface.
  const rad = (heading * Math.PI) / 180;

  // Slightly elongate shadow in direction of travel for a grounded feel
  const shadowScaleX = 0.55 + Math.abs(Math.sin(rad)) * 0.15;
  const shadowScaleY = 0.30 + Math.abs(Math.cos(rad)) * 0.08;

  return (
    <View style={styles.outer}>
      {/* ── Soft ground shadow (flat, no perspective) ── */}
      <Animated.View
        style={[
          styles.shadow,
          {
            transform: [
              { rotate: `${heading}deg` },
              { scaleX: shadowScaleX },
              { scaleY: shadowScaleY },
            ],
          },
        ]}
      />

      {/* ── Arrival pulse ── */}
      <Animated.View
        style={[
          styles.pulse,
          { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
        ]}
      />

      {/* ── Bus — perspective gives the 3D rotation feel ── */}
      <Animated.View
        style={{
          transform: [
            { perspective: 260 },
            { rotateX: '22deg' },          // tilt forward — reveals face as bus turns
            { rotateZ: `${heading}deg` },  // heading on map
            { scale: breathe },
          ],
        }}
      >
        <BusSVG status={status} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.22)',
    // Blur-like effect via layering handled by opacity
    bottom: 4,
  },
  pulse: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#22C55E',
  },
});
