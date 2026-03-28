import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Bus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BusStatus } from '@/types';

interface BusMarkerProps {
  heading: number;
  status: BusStatus;
}

export default function BusMarker({ heading, status }: BusMarkerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const isArriving = status === 'arriving';

  useEffect(() => {
    if (isArriving) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 2.2,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0);
    }
  }, [isArriving, pulseAnim, pulseOpacity]);

  return (
    <View style={styles.container}>
      {isArriving && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseOpacity,
            },
          ]}
        />
      )}
      <View style={[styles.directionArrow, { transform: [{ rotate: `${heading}deg` }] }]}>
        <View style={styles.arrowTip} />
      </View>
      <View style={styles.busCircle}>
        <Bus size={20} color={Colors.white} strokeWidth={2.5} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.busYellow,
  },
  directionArrow: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  arrowTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.busYellowDark,
    marginTop: -4,
  },
  busCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.busYellow,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 3,
    borderColor: Colors.white,
  },
});
