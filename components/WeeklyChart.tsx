import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Props {
  data: number[];
  maxValue?: number;
}

export function WeeklyChart({ data, maxValue = 5 }: Props) {
  const colors = useColors();
  const todayIdx = new Date().getDay();
  const adjusted = todayIdx === 0 ? 6 : todayIdx - 1;

  return (
    <View style={styles.container}>
      {data.map((val, i) => {
        const isToday = i === adjusted;
        const fillRatio = maxValue > 0 ? Math.min(val / maxValue, 1) : 0;
        const barHeight = Math.max(fillRatio * 48, 4);
        const isActive = val > 0;

        return (
          <View key={i} style={styles.col}>
            <View style={[styles.barBg, { height: 52 }]}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: isToday
                      ? colors.primary
                      : isActive
                      ? colors.secondary
                      : colors.border,
                    shadowColor: isToday ? colors.primary : 'transparent',
                    shadowOpacity: isToday ? 0.6 : 0,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isToday ? colors.primary : colors.mutedForeground,
                  fontFamily: isToday ? 'Inter_600SemiBold' : 'Inter_400Regular',
                },
              ]}
            >
              {DAYS[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingVertical: 4,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barBg: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
  },
});
