import React, { useCallback, useMemo, useState, useRef } from 'react';
import { Pressable, Text, View, FlatList } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useWorkoutStore, ExerciseInstance, CustomActivityInstance } from '@/stores/workoutStore';
import { ExerciseCard } from './ExerciseCard';
import { AddActivitySheet } from './AddActivitySheet';
import { Workout } from '@/data/mockData';

interface Props {
  workout: Workout;
  onClose: () => void;
}

function formatDuration(startedAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function ActivityItem({ activity, onRemove }: { activity: CustomActivityInstance; onRemove: (id: string) => void }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(200)}>
      <View style={[activityStyles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[activityStyles.iconWrap, { backgroundColor: `${colors.secondary}20` }]}>
          <Ionicons name="barbell-outline" size={18} color={colors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{activity.name}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{activity.durationMinutes} min · {activity.estimatedCaloriesBurned} cal</Text>
        </View>
        <Pressable onPress={() => onRemove(activity.id)} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const activityStyles = {
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};

export function TodayWorkoutView({ workout, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentPlan, endWorkout, removeCustomActivity } = useWorkoutStore();
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [timerStr, setTimerStr] = useState('0m');

  const totalCalEstimate = useMemo(() => {
    if (!currentPlan) return 0;
    const exCals = currentPlan.exercises.length * 30;
    const actCals = currentPlan.customActivities.reduce((s, a) => s + a.estimatedCaloriesBurned, 0);
    return exCals + actCals;
  }, [currentPlan]);

  const totalExercisesCompleted = useMemo(() => {
    if (!currentPlan) return 0;
    return currentPlan.exercises.filter(e => e.completedSets >= e.sets).length;
  }, [currentPlan]);

  React.useEffect(() => {
    if (!currentPlan) return;
    const id = setInterval(() => {
      setTimerStr(formatDuration(currentPlan.startedAt));
    }, 10000);
    setTimerStr(formatDuration(currentPlan.startedAt));
    return () => clearInterval(id);
  }, [currentPlan]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_500Medium' }}>{timerStr}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <Ionicons name="flame-outline" size={14} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_500Medium' }}>~{totalCalEstimate} cal</Text>
            </View>
          </View>
        </View>
        <Text style={{ color: colors.foreground, fontSize: 22, fontFamily: 'Inter_700Bold' }}>{workout.name}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {totalExercisesCompleted}/{currentPlan?.exercises.length ?? workout.exercises.length} exercises
          </Text>
          {currentPlan && currentPlan.customActivities.length > 0 && (
            <>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.mutedForeground }} />
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                +{currentPlan.customActivities.length} activities
              </Text>
            </>
          )}
        </View>
      </View>

      <Animated.FlatList
        data={currentPlan?.exercises ?? workout.exercises.map((ex, i) => ({
          id: `ex-temp-${i}-${ex.name}`,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest: ex.rest,
          muscleGroup: ex.muscleGroup,
          completedSets: 0,
        }))}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        itemLayoutAnimation={LinearTransition}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(250).delay(index * 50)}>
            <ExerciseCard exercise={item} index={index} />
          </Animated.View>
        )}
        ListFooterComponent={
          <>
            {currentPlan && currentPlan.customActivities.length > 0 && (
              <View style={{ marginTop: 16, gap: 4 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginBottom: 4 }}>
                  CUSTOM ACTIVITIES
                </Text>
                {currentPlan.customActivities.map(a => (
                  <ActivityItem key={a.id} activity={a} onRemove={removeCustomActivity} />
                ))}
              </View>
            )}
          </>
        }
      />

      <View style={{
        position: 'absolute', bottom: insets.bottom + 16, left: 16, right: 16,
        flexDirection: 'row', gap: 10,
      }}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddActivity(true); }}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            flex: 1, height: 50, borderRadius: 14,
            backgroundColor: `${colors.primary}20`, borderWidth: 1, borderColor: `${colors.primary}44`,
          }}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 14 }}>Add Activity</Text>
        </Pressable>
        <Pressable
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); endWorkout(); onClose(); }}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            paddingHorizontal: 20, height: 50, borderRadius: 14,
            backgroundColor: '#FF4D4D',
          }}
        >
          <Ionicons name="stop-outline" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 }}>End</Text>
        </Pressable>
      </View>

      <AddActivitySheet visible={showAddActivity} onClose={() => setShowAddActivity(false)} />
    </View>
  );
}
