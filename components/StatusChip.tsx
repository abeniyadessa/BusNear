import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { BusStatus } from '@/types';

interface StatusChipProps {
  status: BusStatus;
  compact?: boolean;
}

const STATUS_CONFIG: Record<BusStatus, { label: string; bg: string; text: string }> = {
  not_started: { label: 'Not Started', bg: Colors.borderLight, text: Colors.textSecondary },
  on_time: { label: 'On Time', bg: '#E8F8EE', text: '#1B7A3D' },
  delayed: { label: 'Delayed', bg: '#FFF3E0', text: '#C45D00' },
  arriving: { label: 'Arriving', bg: Colors.busYellowLight, text: '#9A7200' },
  arrived: { label: 'Arrived', bg: '#E8F8EE', text: '#1B7A3D' },
  offline: { label: 'Offline', bg: '#FFEBEE', text: Colors.danger },
};

export default function StatusChip({ status, compact = false }: StatusChipProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }, compact && styles.chipCompact]}>
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text style={[styles.label, { color: config.text }, compact && styles.labelCompact]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  chipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  labelCompact: {
    fontSize: 11,
  },
});
