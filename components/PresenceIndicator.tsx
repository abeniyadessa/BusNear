import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Colors from '@/constants/colors';
import { PresenceState } from '@/types';

interface PresenceIndicatorProps {
  state: PresenceState;
  lastUpdated: number;
}

const PRESENCE_CONFIG: Record<PresenceState, { label: string; color: string; bg: string }> = {
  live: { label: 'Live', color: '#1B7A3D', bg: '#E8F8EE' },
  recent: { label: 'Recent', color: '#9A7200', bg: Colors.busYellowLight },
  stale: { label: 'Stale', color: Colors.danger, bg: '#FFEBEE' },
};

export default function PresenceIndicator({ state, lastUpdated }: PresenceIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const config = PRESENCE_CONFIG[state];

  useEffect(() => {
    if (state === 'live') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  const elapsed = Math.round((Date.now() - lastUpdated) / 1000);
  const timeText = elapsed < 5 ? 'just now' : `${elapsed}s ago`;

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <View style={styles.dotWrap}>
        {state === 'live' && (
          <Animated.View
            style={[
              styles.pulseRing,
              { backgroundColor: config.color, transform: [{ scale: pulseAnim }] },
            ]}
          />
        )}
        <View style={[styles.dot, { backgroundColor: config.color }]} />
      </View>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      <Text style={[styles.time, { color: config.color }]}>{timeText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  dotWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  time: {
    fontSize: 10,
    fontWeight: '500' as const,
    opacity: 0.7,
  },
});
