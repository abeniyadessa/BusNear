import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Rect,
  Path,
  Ellipse,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  ClipPath,
} from 'react-native-svg';
import { BusStatus } from '@/types';

interface BusMarkerProps {
  heading: number;
  status: BusStatus;
}

// Canvas & bus dimensions
const C  = 52;          // canvas size
const BW = 22;          // bus width
const BH = 40;          // bus height
const BX = (C - BW) / 2;
const BY = (C - BH) / 2;
const R  = 4;           // corner radius

function BusSVG({ status }: { status: BusStatus }) {
  const isDelayed  = status === 'delayed';

  const roofTop    = isDelayed ? '#FF9966' : '#FFE066';
  const roofMid    = isDelayed ? '#FF6B35' : '#FFC400';
  const roofEdge   = isDelayed ? '#CC4A1A' : '#D4991A';
  const shadowOff  = 3; // shadow offset px → gives "floating above ground" feel

  return (
    <Svg width={C} height={C} viewBox={`0 0 ${C} ${C}`}>
      <Defs>
        {/* Roof surface — radial gradient, bright center like sunlight hitting the top */}
        <RadialGradient id="roof" cx="45%" cy="30%" rx="60%" ry="55%">
          <Stop offset="0%"   stopColor={roofTop}  stopOpacity="1" />
          <Stop offset="55%"  stopColor={roofMid}  stopOpacity="1" />
          <Stop offset="100%" stopColor={roofEdge} stopOpacity="1" />
        </RadialGradient>

        {/* Window glass */}
        <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%"   stopColor="#2A5F9E" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#0D2B50" stopOpacity="1"   />
        </LinearGradient>

        {/* Bus clip */}
        <ClipPath id="clip">
          <Rect x={BX} y={BY} width={BW} height={BH} rx={R} />
        </ClipPath>
      </Defs>

      {/* ── Drop shadow (offset → looks 3D / floating) ── */}
      <Rect
        x={BX + shadowOff}
        y={BY + shadowOff}
        width={BW}
        height={BH}
        rx={R + 1}
        fill="rgba(0,0,0,0.22)"
      />

      {/* ── Bus body ── */}
      <Rect
        x={BX} y={BY}
        width={BW} height={BH}
        rx={R}
        fill="url(#roof)"
      />

      {/* ── Windshield (front, top) ── */}
      <Rect
        x={BX + 2} y={BY + 1}
        width={BW - 4} height={8}
        rx={2}
        fill="url(#glass)"
        clipPath="url(#clip)"
      />
      {/* windshield glare */}
      <Rect
        x={BX + 3} y={BY + 2}
        width={6} height={2}
        rx={1}
        fill="white"
        opacity={0.25}
        clipPath="url(#clip)"
      />

      {/* ── Roof panel lines (suggests roof structure from above) ── */}
      <Rect x={BX + 4} y={BY + 11} width={BW - 8} height={0.8} rx={0.4} fill="rgba(0,0,0,0.12)" clipPath="url(#clip)" />
      <Rect x={BX + 4} y={BY + 18} width={BW - 8} height={0.8} rx={0.4} fill="rgba(0,0,0,0.12)" clipPath="url(#clip)" />
      <Rect x={BX + 4} y={BY + 25} width={BW - 8} height={0.8} rx={0.4} fill="rgba(0,0,0,0.12)" clipPath="url(#clip)" />

      {/* ── Rear window ── */}
      <Rect
        x={BX + 2} y={BY + BH - 9}
        width={BW - 4} height={7}
        rx={2}
        fill="url(#glass)"
        clipPath="url(#clip)"
      />
      {/* rear glare */}
      <Rect
        x={BX + 3} y={BY + BH - 8}
        width={5} height={1.5}
        rx={0.5}
        fill="white"
        opacity={0.18}
        clipPath="url(#clip)"
      />

      {/* ── Left edge shadow (right side of bus gets less light) ── */}
      <Rect
        x={BX + BW - 3} y={BY}
        width={3} height={BH}
        rx={0}
        fill="rgba(0,0,0,0.10)"
        clipPath="url(#clip)"
      />
      <Rect
        x={BX} y={BY + BH - 3}
        width={BW} height={3}
        rx={0}
        fill="rgba(0,0,0,0.08)"
        clipPath="url(#clip)"
      />

      {/* ── Headlights ── */}
      <Rect x={BX + 1} y={BY + 2}   width={3.5} height={2} rx={1} fill="#FFFBE6" opacity={0.95} />
      <Rect x={BX + BW - 4.5} y={BY + 2} width={3.5} height={2} rx={1} fill="#FFFBE6" opacity={0.95} />

      {/* ── Tail lights ── */}
      <Rect x={BX + 1} y={BY + BH - 4}   width={3.5} height={2.5} rx={1} fill="#FF3B30" opacity={0.9} />
      <Rect x={BX + BW - 4.5} y={BY + BH - 4} width={3.5} height={2.5} rx={1} fill="#FF3B30" opacity={0.9} />

      {/* ── Direction arrow — clean teardrop above front ── */}
      <Path
        d={`M${C / 2} ${BY - 7} L${C / 2 - 4} ${BY - 1} L${C / 2 + 4} ${BY - 1} Z`}
        fill="#0B3C5D"
        opacity={0.75}
      />
    </Svg>
  );
}

export default function BusMarker({ heading, status }: BusMarkerProps) {
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const breathe      = useRef(new Animated.Value(1)).current;
  const isArriving   = status === 'arriving' || status === 'arrived';

  // Subtle idle breathe (like Uber)
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.05, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Arrival pulse ring
  useEffect(() => {
    if (isArriving) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseScale,   { toValue: 2.4, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseScale,   { toValue: 1,    duration: 0, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseScale.setValue(1);
      pulseOpacity.setValue(0);
    }
  }, [isArriving]);

  return (
    <View style={[styles.wrap, { transform: [{ rotate: `${heading}deg` }] }]}>
      <Animated.View style={[styles.pulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
      <Animated.View style={{ transform: [{ scale: breathe }] }}>
        <BusSVG status={status} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: C + 16,
    height: C + 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E',
  },
});
