import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { Workout } from '@/data/mockData';

interface Props {
  workout: Workout;
  onPress: (workout: Workout) => void;
  isToday?: boolean;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: '#00C4FF',
  Intermediate: '#FFB800',
  Advanced: '#FF4D4D',
};

export function WorkoutCard({ workout, onPress, isToday }: Props) {
  const colors = useColors();
  const diffColor = DIFFICULTY_COLOR[workout.difficulty] ?? colors.mutedForeground;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(workout);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isToday ? colors.primary : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {isToday && (
        <View style={[styles.todayBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.todayText}>TODAY</Text>
        </View>
      )}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.foreground }]}>{workout.name}</Text>
          <Text style={[styles.type, { color: colors.mutedForeground }]}>{workout.type}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{workout.duration} min</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="flame-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{workout.calories} kcal</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="barbell-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{workout.exercises.length} exercises</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.muscles}>
          {workout.muscleGroups.slice(0, 3).map((m) => (
            <View key={m} style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{m}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.diffBadge, { backgroundColor: `${diffColor}22` }]}>
          <Text style={[styles.diffText, { color: diffColor }]}>{workout.difficulty}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  todayBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: { gap: 2 },
  name: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  type: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muscles: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  diffText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
});
