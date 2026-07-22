import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: string;
}

export function MacroBar({ label, current, target, unit = 'g', color }: Props) {
  const colors = useColors();
  const pct = target > 0 ? Math.min(current / target, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.mutedForeground }]}>
          <Text style={{ color: color, fontFamily: 'Inter_600SemiBold' }}>{current}</Text>
          {' / '}{target}{unit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct * 100}%` as `${number}%`,
              backgroundColor: color,
              shadowColor: color,
              shadowOpacity: 0.5,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  value: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
