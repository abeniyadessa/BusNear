import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Child } from '@/types';

interface ChildSelectorProps {
  children: Child[];
  activeChildId: string | null;
  onSelect: (childId: string) => void;
}

export default function ChildSelector({ children, activeChildId, onSelect }: ChildSelectorProps) {
  if (children.length <= 1) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {children.map((child) => {
          const isActive = child.id === activeChildId;
          return (
            <TouchableOpacity
              key={child.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(child.id);
              }}
              activeOpacity={0.8}
              testID={`child-chip-${child.id}`}
            >
              <View style={[styles.avatar, { backgroundColor: child.avatarColor }]}>
                <Text style={styles.avatarText}>{child.name[0]}</Text>
              </View>
              <Text style={[styles.name, isActive && styles.nameActive]}>{child.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  scroll: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingRight: 14,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.busYellowLight,
    borderColor: Colors.busYellow,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  name: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  nameActive: {
    color: '#9A7200',
  },
});
