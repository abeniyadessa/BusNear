import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Circle, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BusStop } from '@/types';

interface RouteTimelineProps {
  stops: BusStop[];
  currentStopIndex: number;
  nextStopIndex: number;
}

export default function RouteTimeline({ stops, currentStopIndex, nextStopIndex }: RouteTimelineProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Route Stops</Text>
      {stops.map((stop, index) => {
        const isPast = index < nextStopIndex;
        const isCurrent = index === nextStopIndex;
        const isFuture = index > nextStopIndex;

        return (
          <View key={stop.id} style={styles.stopRow}>
            <View style={styles.lineColumn}>
              {index > 0 && (
                <View
                  style={[
                    styles.lineSegment,
                    styles.lineTop,
                    isPast && styles.linePast,
                    isCurrent && styles.linePast,
                  ]}
                />
              )}
              <View style={styles.iconWrap}>
                {isPast ? (
                  <CheckCircle size={18} color={Colors.success} />
                ) : isCurrent ? (
                  <MapPin size={18} color={Colors.busYellow} fill={Colors.busYellowLight} />
                ) : (
                  <Circle size={14} color={Colors.textTertiary} />
                )}
              </View>
              {index < stops.length - 1 && (
                <View
                  style={[
                    styles.lineSegment,
                    styles.lineBottom,
                    isPast && styles.linePast,
                  ]}
                />
              )}
            </View>
            <View style={[styles.stopInfo, isCurrent && styles.stopInfoCurrent]}>
              <Text
                style={[
                  styles.stopName,
                  isPast && styles.stopNamePast,
                  isCurrent && styles.stopNameCurrent,
                ]}
                numberOfLines={1}
              >
                {stop.name}
              </Text>
              <Text style={[styles.stopTime, isPast && styles.stopTimePast]}>
                {stop.scheduledTime}
              </Text>
            </View>
            {isCurrent && (
              <View style={styles.nextBadge}>
                <Text style={styles.nextBadgeText}>Next</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  lineColumn: {
    width: 32,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  lineSegment: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
  },
  lineTop: {
    marginBottom: 0,
  },
  lineBottom: {
    marginTop: 0,
  },
  linePast: {
    backgroundColor: Colors.success,
  },
  iconWrap: {
    zIndex: 1,
    backgroundColor: Colors.white,
    padding: 2,
  },
  stopInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginLeft: 4,
  },
  stopInfoCurrent: {
    backgroundColor: Colors.busYellowLight,
  },
  stopName: {
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  stopNamePast: {
    color: Colors.textTertiary,
  },
  stopNameCurrent: {
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  stopTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  stopTimePast: {
    color: Colors.textTertiary,
  },
  nextBadge: {
    backgroundColor: Colors.busYellow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
  },
  nextBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
