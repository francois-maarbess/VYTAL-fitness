import React, { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useWorkoutStore, ExerciseInstance } from '@/stores/workoutStore';
import { Exercise } from '@/data/mockData';

const EXERCISE_DB: { name: string; muscleGroup: string }[] = [
  { name: 'Bench Press', muscleGroup: 'Chest' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest' },
  { name: 'Dumbbell Fly', muscleGroup: 'Chest' },
  { name: 'Cable Crossover', muscleGroup: 'Chest' },
  { name: 'Push-ups', muscleGroup: 'Chest' },
  { name: 'Decline Bench Press', muscleGroup: 'Chest' },
  { name: 'Deadlift', muscleGroup: 'Back' },
  { name: 'Pull-ups', muscleGroup: 'Back' },
  { name: 'Barbell Row', muscleGroup: 'Back' },
  { name: 'Cable Row', muscleGroup: 'Back' },
  { name: 'Lat Pulldown', muscleGroup: 'Back' },
  { name: 'Face Pulls', muscleGroup: 'Back' },
  { name: 'Dumbbell Row', muscleGroup: 'Back' },
  { name: 'Overhead Press', muscleGroup: 'Shoulders' },
  { name: 'Dumbbell Press', muscleGroup: 'Shoulders' },
  { name: 'Lateral Raises', muscleGroup: 'Shoulders' },
  { name: 'Front Raises', muscleGroup: 'Shoulders' },
  { name: 'Arnold Press', muscleGroup: 'Shoulders' },
  { name: 'Barbell Curl', muscleGroup: 'Biceps' },
  { name: 'Hammer Curls', muscleGroup: 'Biceps' },
  { name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps' },
  { name: 'Cable Curl', muscleGroup: 'Biceps' },
  { name: 'Tricep Pushdown', muscleGroup: 'Triceps' },
  { name: 'Skull Crushers', muscleGroup: 'Triceps' },
  { name: 'Overhead Tricep Extension', muscleGroup: 'Triceps' },
  { name: 'Dips', muscleGroup: 'Triceps' },
  { name: 'Squat', muscleGroup: 'Quads' },
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings' },
  { name: 'Leg Press', muscleGroup: 'Quads' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Quads' },
  { name: 'Leg Curl', muscleGroup: 'Hamstrings' },
  { name: 'Hip Thrust', muscleGroup: 'Glutes' },
  { name: 'Walking Lunges', muscleGroup: 'Quads' },
  { name: 'Calf Raise', muscleGroup: 'Calves' },
  { name: 'Plank', muscleGroup: 'Core' },
  { name: 'Cable Crunch', muscleGroup: 'Core' },
  { name: 'Dead Bug', muscleGroup: 'Core' },
  { name: 'Hanging Leg Raise', muscleGroup: 'Core' },
  { name: 'Russian Twists', muscleGroup: 'Core' },
  { name: 'Burpees', muscleGroup: 'Full Body' },
  { name: 'Jump Rope', muscleGroup: 'Cardio' },
  { name: 'Mountain Climbers', muscleGroup: 'Full Body' },
];

interface Props {
  exercise: ExerciseInstance;
  index: number;
}

export function ExerciseCard({ exercise, index }: Props) {
  const colors = useColors();
  const { updateExercise, removeExercise, swapExercise } = useWorkoutStore();
  const swipeableRef = useRef<Swipeable>(null);
  const [editing, setEditing] = useState(false);
  const [swapSearch, setSwapSearch] = useState('');
  const [swapVisible, setSwapVisible] = useState(false);
  const [editSets, setEditSets] = useState(String(exercise.sets));
  const [editReps, setEditReps] = useState(exercise.reps);
  const [editRest, setEditRest] = useState(String(exercise.rest));
  const scale = useSharedValue(1);

  const progress = exercise.sets > 0 ? exercise.completedSets / exercise.sets : 0;
  const isComplete = exercise.completedSets >= exercise.sets;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.98);
  }

  function handlePressOut() {
    scale.value = withSpring(1);
  }

  function handleSaveEdit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateExercise(exercise.id, {
      sets: Math.max(1, parseInt(editSets, 10) || exercise.sets),
      reps: editReps || exercise.reps,
      rest: Math.max(0, parseInt(editRest, 10) || exercise.rest),
    });
    setEditing(false);
  }

  function handleSwap(exName: string) {
    const found = EXERCISE_DB.find(e => e.name === exName);
    if (found) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      swapExercise(exercise.id, { name: found.name, sets: 3, reps: '10-12', rest: 60, muscleGroup: found.muscleGroup });
      setSwapVisible(false);
      setSwapSearch('');
      swipeableRef.current?.close();
    }
  }

  function handleDelete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    removeExercise(exercise.id);
    swipeableRef.current?.close();
  }

  const swapFiltered = swapSearch.trim()
    ? EXERCISE_DB.filter(e => e.name.toLowerCase().includes(swapSearch.toLowerCase()))
    : EXERCISE_DB;

  const renderRightActions = () => (
    <View style={{ flexDirection: 'row' }}>
      <RectButton
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditing(true); swipeableRef.current?.close(); }}
        style={{ backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center', width: 72, gap: 2 }}
      >
        <Ionicons name="pencil-outline" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>Edit</Text>
      </RectButton>
      <RectButton
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSwapVisible(true); }}
        style={{ backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', width: 72, gap: 2 }}
      >
        <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>Swap</Text>
      </RectButton>
      <RectButton
        onPress={handleDelete}
        style={{ backgroundColor: '#FF4D4D', justifyContent: 'center', alignItems: 'center', width: 72, gap: 2 }}
      >
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>Delete</Text>
      </RectButton>
    </View>
  );

  return (
    <>
      <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false} friction={2}>
        <Animated.View style={[animatedStyle]}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[cardStyles.card, { backgroundColor: colors.card, borderColor: isComplete ? colors.primary : colors.border, opacity: isComplete ? 0.7 : 1 }]}
          >
            <View style={cardStyles.topRow}>
              <View style={[cardStyles.indexBadge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_700Bold' }}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>{exercise.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{exercise.muscleGroup}</Text>
                  <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.mutedForeground }} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{exercise.sets} sets</Text>
                  <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.mutedForeground }} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{exercise.reps} reps</Text>
                </View>
              </View>
              <View style={cardStyles.swipeHint}>
                <Ionicons name="chevron-back" size={14} color={colors.mutedForeground} />
              </View>
            </View>
            <View style={cardStyles.progressRow}>
              <View style={[cardStyles.progressBg, { backgroundColor: colors.border }]}>
                <View style={[cardStyles.progressFill, { width: `${progress * 100}%` as `${number}%`, backgroundColor: isComplete ? colors.primary : colors.secondary }]} />
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_500Medium', minWidth: 40, textAlign: 'right' }}>
                {exercise.completedSets}/{exercise.sets}
              </Text>
            </View>
            {isComplete && (
              <View style={[cardStyles.completeBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>Complete</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Swipeable>

      {editing && (
        <View style={[cardStyles.editOverlay, { backgroundColor: `${colors.background}F5` }]}>
          <View style={[cardStyles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: 'Inter_700Bold' }}>{exercise.name}</Text>
              <Pressable onPress={() => setEditing(false)}><Ionicons name="close" size={22} color={colors.mutedForeground} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { label: 'Sets', val: editSets, set: setEditSets, suffix: '' },
                { label: 'Reps', val: editReps, set: setEditReps, suffix: '' },
                { label: 'Rest', val: editRest, set: setEditRest, suffix: 's' },
              ].map(f => (
                <View key={f.label} style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 }}>{f.label}</Text>
                  <View style={[cardStyles.editInput, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <TextInput value={f.val} onChangeText={f.set} keyboardType="default" style={{ color: colors.foreground, fontSize: 16, fontFamily: 'Inter_700Bold' }} />
                    <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{f.suffix}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable onPress={handleSaveEdit}
              style={[cardStyles.saveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 15 }}>Save</Text>
            </Pressable>
          </View>
        </View>
      )}

      {swapVisible && (
        <View style={[cardStyles.editOverlay, { backgroundColor: `${colors.background}F5` }]}>
          <View style={[cardStyles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: 'Inter_700Bold' }}>Swap Exercise</Text>
              <Pressable onPress={() => { setSwapVisible(false); setSwapSearch(''); }}><Ionicons name="close" size={22} color={colors.mutedForeground} /></Pressable>
            </View>
            <View style={[cardStyles.editInput, { backgroundColor: colors.muted, borderColor: colors.border, marginBottom: 12 }]}>
              <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
              <TextInput value={swapSearch} onChangeText={setSwapSearch} placeholder="Search exercises..." placeholderTextColor={colors.mutedForeground} style={{ flex: 1, color: colors.foreground, fontSize: 14, fontFamily: 'Inter_400Regular' }} />
            </View>
            <Animated.FlatList
              data={swapFiltered}
              keyExtractor={e => e.name}
              style={{ maxHeight: 240 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSwap(item.name)}
                  style={[cardStyles.swapItem, { borderBottomColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_500Medium' }}>{item.name}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{item.muscleGroup}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      )}
    </>
  );
}

const cardStyles = {
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  swipeHint: {
    padding: 4,
  },
  progressRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%' as const,
    borderRadius: 2,
  },
  completeBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
  },
  editOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 24,
    zIndex: 100,
  },
  editCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    width: '100%' as const,
    gap: 14,
  },
  editInput: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  swapItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
};
