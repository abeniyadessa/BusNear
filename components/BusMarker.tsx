import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Rect,
  Path,
  Circle,
  Ellipse,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
  ClipPath,
} from 'react-native-svg';
import { BusStatus } from '@/types';

interface BusMarkerProps {
  heading: number;
  status: BusStatus;
}

const CANVAS = 56;
const BUS_W  = 26;
const BUS_H  = 46;
const BUS_X  = (CANVAS - BUS_W) / 2;   // 15
const BUS_Y  = (CANVAS - BUS_H) / 2;   // 5

function BusSVG({ status }: { status: BusStatus }) {
  const isDelayed  = status === 'delayed';
  const isArriving = status === 'arriving' || status === 'arrived';

  const bodyColor  = isDelayed ? '#FF6B35' : '#FFC400';
  const bodyDark   = isDelayed ? '#D4521A' : '#E5A500';
  const bodyLight  = isDelayed ? '#FF9966' : '#FFD84D';
  const glowColor  = isArriving ? '#22C55E' : isDelayed ? '#FF6B35' : '#FFC400';

  return (
    <Svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
      <Defs>
        {/* Main body gradient — light center, darker edges (roundness illusion) */}
        <RadialGradient id="bodyR" cx="50%" cy="38%" rx="55%" ry="50%">
          <Stop offset="0%"   stopColor={bodyLight} stopOpacity="1" />
          <Stop offset="60%"  stopColor={bodyColor}  stopOpacity="1" />
          <Stop offset="100%" stopColor={bodyDark}   stopOpacity="1" />
        </RadialGradient>

        {/* Windshield glass */}
        <LinearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor="#1E3A5F" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#0B2440" stopOpacity="1"    />
        </LinearGradient>

        {/* Window glass */}
        <LinearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor="#2D5A8E" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#1A3A60" stopOpacity="1"   />
        </LinearGradient>

        {/* Ground shadow */}
        <RadialGradient id="shadowR" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%"   stopColor="#000000" stopOpacity="0.28" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0"    />
        </RadialGradient>

        {/* Glow for arriving/status */}
        <RadialGradient id="glowR" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%"   stopColor={glowColor} stopOpacity="0.35" />
          <Stop offset="100%" stopColor={glowColor} stopOpacity="0"    />
        </RadialGradient>

        {/* Body clip — rounded rect shape */}
        <ClipPath id="busClip">
          <Rect
            x={BUS_X} y={BUS_Y}
            width={BUS_W} height={BUS_H}
            rx={6} ry={6}
          />
        </ClipPath>
      </Defs>

      {/* ── Ground shadow ── */}
      <Ellipse
        cx={CANVAS / 2 + 2}
        cy={BUS_Y + BUS_H - 2}
        rx={BUS_W / 2 + 2}
        ry={5}
        fill="url(#shadowR)"
      />

      {/* ── Status glow ring ── */}
      {(isArriving || isDelayed) && (
        <Ellipse
          cx={CANVAS / 2}
          cy={CANVAS / 2}
          rx={BUS_W / 2 + 8}
          ry={BUS_H / 2 + 8}
          fill="url(#glowR)"
        />
      )}

      {/* ── White outline / border (contrast against map) ── */}
      <Rect
        x={BUS_X - 1.5} y={BUS_Y - 1.5}
        width={BUS_W + 3} height={BUS_H + 3}
        rx={7} ry={7}
        fill="white"
        opacity={0.92}
      />

      {/* ── Bus body ── */}
      <Rect
        x={BUS_X} y={BUS_Y}
        width={BUS_W} height={BUS_H}
        rx={6} ry={6}
        fill="url(#bodyR)"
      />

      {/* ── Black safety stripe (school bus style) ── */}
      <Rect
        x={BUS_X} y={BUS_Y + 14}
        width={BUS_W} height={2.5}
        fill="#0B1929"
        opacity={0.35}
      />
      <Rect
        x={BUS_X} y={BUS_Y + BUS_H - 14}
        width={BUS_W} height={2.5}
        fill="#0B1929"
        opacity={0.35}
      />

      {/* ── Windshield (front, top) ── */}
      <Path
        d={`
          M${BUS_X + 4} ${BUS_Y + 3}
          L${BUS_X + BUS_W - 4} ${BUS_Y + 3}
          L${BUS_X + BUS_W - 2} ${BUS_Y + 10}
          L${BUS_X + 2} ${BUS_Y + 10}
          Z
        `}
        fill="url(#windGrad)"
        clipPath="url(#busClip)"
      />

      {/* Windshield shine */}
      <Path
        d={`
          M${BUS_X + 5} ${BUS_Y + 4}
          L${BUS_X + 13} ${BUS_Y + 4}
          L${BUS_X + 12} ${BUS_Y + 9}
          L${BUS_X + 4.5} ${BUS_Y + 9}
          Z
        `}
        fill="white"
        opacity={0.12}
        clipPath="url(#busClip)"
      />

      {/* ── Side windows (left column) ── */}
      {[13, 20, 27].map((yOff, i) => (
        <Rect
          key={`wl${i}`}
          x={BUS_X + 1.5}
          y={BUS_Y + yOff}
          width={8}
          height={5.5}
          rx={1.2}
          fill="url(#winGrad)"
          clipPath="url(#busClip)"
        />
      ))}

      {/* ── Side windows (right column) ── */}
      {[13, 20, 27].map((yOff, i) => (
        <Rect
          key={`wr${i}`}
          x={BUS_X + BUS_W - 9.5}
          y={BUS_Y + yOff}
          width={8}
          height={5.5}
          rx={1.2}
          fill="url(#winGrad)"
          clipPath="url(#busClip)"
        />
      ))}

      {/* Window shine highlights */}
      {[13, 20, 27].map((yOff, i) => (
        <Rect
          key={`wsl${i}`}
          x={BUS_X + 2}
          y={BUS_Y + yOff + 0.5}
          width={3}
          height={1.5}
          rx={0.5}
          fill="white"
          opacity={0.3}
          clipPath="url(#busClip)"
        />
      ))}
      {[13, 20, 27].map((yOff, i) => (
        <Rect
          key={`wsr${i}`}
          x={BUS_X + BUS_W - 9}
          y={BUS_Y + yOff + 0.5}
          width={3}
          height={1.5}
          rx={0.5}
          fill="white"
          opacity={0.3}
          clipPath="url(#busClip)"
        />
      ))}

      {/* ── Rear window ── */}
      <Path
        d={`
          M${BUS_X + 3} ${BUS_Y + BUS_H - 10}
          L${BUS_X + BUS_W - 3} ${BUS_Y + BUS_H - 10}
          L${BUS_X + BUS_W - 2} ${BUS_Y + BUS_H - 3}
          L${BUS_X + 2} ${BUS_Y + BUS_H - 3}
          Z
        `}
        fill="url(#winGrad)"
        clipPath="url(#busClip)"
      />
      {/* Rear window shine */}
      <Rect
        x={BUS_X + 4}
        y={BUS_Y + BUS_H - 9}
        width={5}
        height={1.5}
        rx={0.5}
        fill="white"
        opacity={0.2}
        clipPath="url(#busClip)"
      />

      {/* ── Headlights ── */}
      <Rect
        x={BUS_X + 2} y={BUS_Y + 1}
        width={5} height={2.5}
        rx={1.2}
        fill="#FFF9C4"
        opacity={0.95}
      />
      <Rect
        x={BUS_X + BUS_W - 7} y={BUS_Y + 1}
        width={5} height={2.5}
        rx={1.2}
        fill="#FFF9C4"
        opacity={0.95}
      />

      {/* ── Tail lights ── */}
      <Rect
        x={BUS_X + 2} y={BUS_Y + BUS_H - 3}
        width={4} height={2}
        rx={1}
        fill="#FF3B30"
        opacity={0.85}
      />
      <Rect
        x={BUS_X + BUS_W - 6} y={BUS_Y + BUS_H - 3}
        width={4} height={2}
        rx={1}
        fill="#FF3B30"
        opacity={0.85}
      />

      {/* ── Wheel arches (subtle bumps on sides) ── */}
      {/* Front-left */}
      <Ellipse cx={BUS_X - 0.5} cy={BUS_Y + 10} rx={2.5} ry={3.5} fill="#1A1A2E" opacity={0.55} />
      {/* Rear-left */}
      <Ellipse cx={BUS_X - 0.5} cy={BUS_Y + BUS_H - 10} rx={2.5} ry={3.5} fill="#1A1A2E" opacity={0.55} />
      {/* Front-right */}
      <Ellipse cx={BUS_X + BUS_W + 0.5} cy={BUS_Y + 10} rx={2.5} ry={3.5} fill="#1A1A2E" opacity={0.55} />
      {/* Rear-right */}
      <Ellipse cx={BUS_X + BUS_W + 0.5} cy={BUS_Y + BUS_H - 10} rx={2.5} ry={3.5} fill="#1A1A2E" opacity={0.55} />

      {/* ── Body surface sheen (simulates light from top-left) ── */}
      <Rect
        x={BUS_X} y={BUS_Y}
        width={BUS_W / 2} height={BUS_H}
        rx={6} ry={6}
        fill="white"
        opacity={0.05}
        clipPath="url(#busClip)"
      />

      {/* ── Direction indicator chevron ── */}
      <Path
        d={`M${CANVAS / 2} ${BUS_Y - 6} L${CANVAS / 2 - 4} ${BUS_Y - 1} L${CANVAS / 2 + 4} ${BUS_Y - 1} Z`}
        fill="#0B3C5D"
        opacity={0.8}
      />
    </Svg>
  );
}

export default function BusMarker({ heading, status }: BusMarkerProps) {
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const breatheScale = useRef(new Animated.Value(1)).current;
  const isArriving   = status === 'arriving';

  // Idle breathe — subtle scale pulse like Uber
  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheScale, { toValue: 1.04, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breatheScale, { toValue: 1,    duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, []);

  // Arrival pulse ring
  useEffect(() => {
    if (isArriving) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseScale,   { toValue: 2.2, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseScale,   { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseScale.setValue(1);
      pulseOpacity.setValue(0);
    }
  }, [isArriving]);

  return (
    <View style={[styles.container, { transform: [{ rotate: `${heading}deg` }] }]}>
      {/* Arrival pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
        ]}
      />
      {/* Subtle idle breathe */}
      <Animated.View style={{ transform: [{ scale: breatheScale }] }}>
        <BusSVG status={status} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CANVAS,
    height: CANVAS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22C55E',
  },
});
