import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, FlatList, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';
import { WorkoutCard } from '@/components/WorkoutCard';
import { Workout, WORKOUTS } from '@/data/mockData';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Exercise Database ───────────────────────────────────────────────────────

interface ExerciseEntry {
  name: string;
  muscle: string;
  equipment: string;
  sets: string;
  reps: string;
  rest: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tip: string;
}

const EXERCISE_DB: ExerciseEntry[] = [
  // Chest
  { name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell', sets: '4', reps: '8–10', rest: '90s', difficulty: 'Intermediate', tip: 'Keep shoulder blades retracted and feet flat on floor.' },
  { name: 'Incline Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbells', sets: '3', reps: '10–12', rest: '75s', difficulty: 'Intermediate', tip: 'Set bench at 30–45°. Control the descent.' },
  { name: 'Dumbbell Fly', muscle: 'Chest', equipment: 'Dumbbells', sets: '3', reps: '12–15', rest: '60s', difficulty: 'Beginner', tip: 'Slight bend in elbows. Squeeze at the top.' },
  { name: 'Cable Crossover', muscle: 'Chest', equipment: 'Cable', sets: '3', reps: '12–15', rest: '60s', difficulty: 'Intermediate', tip: 'Lean slightly forward and cross hands at peak contraction.' },
  { name: 'Push-ups', muscle: 'Chest', equipment: 'Bodyweight', sets: '4', reps: '15–20', rest: '60s', difficulty: 'Beginner', tip: 'Keep core tight and body in a straight line.' },
  { name: 'Decline Bench Press', muscle: 'Chest', equipment: 'Barbell', sets: '3', reps: '8–10', rest: '90s', difficulty: 'Intermediate', tip: 'Targets lower chest. Use a spotter.' },
  // Back
  { name: 'Deadlift', muscle: 'Back', equipment: 'Barbell', sets: '4', reps: '5–6', rest: '120s', difficulty: 'Advanced', tip: 'Brace core, neutral spine. Push the floor away.' },
  { name: 'Pull-ups', muscle: 'Back', equipment: 'Bodyweight', sets: '4', reps: '6–8', rest: '90s', difficulty: 'Intermediate', tip: 'Full hang at bottom, chin over bar at top.' },
  { name: 'Barbell Row', muscle: 'Back', equipment: 'Barbell', sets: '4', reps: '8–10', rest: '90s', difficulty: 'Intermediate', tip: 'Hinge at hips, pull to lower chest.' },
  { name: 'Cable Row', muscle: 'Back', equipment: 'Cable', sets: '3', reps: '10–12', rest: '75s', difficulty: 'Beginner', tip: 'Keep torso upright. Drive elbows back.' },
  { name: 'Lat Pulldown', muscle: 'Back', equipment: 'Cable', sets: '3', reps: '10–12', rest: '75s', difficulty: 'Beginner', tip: 'Pull to upper chest, not behind neck.' },
  { name: 'Face Pulls', muscle: 'Back', equipment: 'Cable', sets: '3', reps: '15–20', rest: '60s', difficulty: 'Beginner', tip: 'Pull toward face, rotate hands outward at peak.' },
  { name: 'Dumbbell Row', muscle: 'Back', equipment: 'Dumbbells', sets: '3', reps: '10–12', rest: '75s', difficulty: 'Beginner', tip: 'Support with same-side knee and hand on bench.' },
  // Shoulders
  { name: 'Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', sets: '4', reps: '6–8', rest: '90s', difficulty: 'Intermediate', tip: 'Press directly overhead, slight back lean is ok.' },
  { name: 'Dumbbell Press', muscle: 'Shoulders', equipment: 'Dumbbells', sets: '3', reps: '10–12', rest: '75s', difficulty: 'Beginner', tip: 'Control the descent. Stop at ear level.' },
  { name: 'Lateral Raises', muscle: 'Shoulders', equipment: 'Dumbbells', sets: '4', reps: '12–15', rest: '60s', difficulty: 'Beginner', tip: 'Slight bend in elbow, lead with pinkies.' },
  { name: 'Front Raises', muscle: 'Shoulders', equipment: 'Dumbbells', sets: '3', reps: '12–15', rest: '60s', difficulty: 'Beginner', tip: 'Alternate arms. Control the lowering.' },
  { name: 'Arnold Press', muscle: 'Shoulders', equipment: 'Dumbbells', sets: '3', reps: '10–12', rest: '75s', difficulty: 'Intermediate', tip: 'Start palms facing you, rotate as you press.' },
  // Biceps
  { name: 'Barbell Curl', muscle: 'Biceps', equipment: 'Barbell', sets: '3', reps: '10–12', rest: '60s', difficulty: 'Beginner', tip: 'Don\'t swing. Squeeze at the top.' },
  { name: 'Hammer Curls', muscle: 'Biceps', equipment: 'Dumbbells', sets: '3', reps: '12–15', rest: '60s', difficulty: 'Beginner', tip: 'Neutral grip, alternate arms for more time under tension.' },
  { name: 'Incline Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbells', sets: '3', reps: '10–12', rest: '60s', difficulty: 'Intermediate', tip: 'Full stretch at bottom for maximum range of motion.' },
  { name: 'Cable Curl', muscle: 'Biceps', equipment: 'Cable', sets: '3', reps: '12–15', rest: '60s', difficulty: 'Beginner', tip: 'Constant tension throughout full range.' },
  // Triceps
  { name: 'Tricep Pushdown', muscle: 'Triceps', equipment: 'Cable', sets: '3', reps: '12–15', rest: '60s', difficulty: 'Beginner', tip: 'Keep elbows at sides, full extension at bottom.' },
  { name: 'Skull Crushers', muscle: 'Triceps', equipment: 'Barbell', sets: '3', reps: '10–12', rest: '60s', difficulty: 'Intermediate', tip: 'Lower to forehead slowly, press with triceps.' },
  { name: 'Overhead Tricep Extension', muscle: 'Triceps', equipment: 'Dumbbells', sets: '3', reps: '12–15', rest: '60s', difficulty: 'Beginner', tip: 'Keep upper arms perpendicular to floor.' },
  { name: 'Dips', muscle: 'Triceps', equipment: 'Bodyweight', sets: '4', reps: '10–15', rest: '75s', difficulty: 'Intermediate', tip: 'Slight forward lean for chest, upright for triceps.' },
  // Legs
  { name: 'Squat', muscle: 'Quads', equipment: 'Barbell', sets: '5', reps: '5', rest: '120s', difficulty: 'Advanced', tip: 'Depth below parallel. Knees tracking over toes.' },
  { name: 'Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Barbell', sets: '4', reps: '8–10', rest: '90s', difficulty: 'Intermediate', tip: 'Hinge at hips, feel the hamstring stretch.' },
  { name: 'Leg Press', muscle: 'Quads', equipment: 'Machine', sets: '3', reps: '12–15', rest: '90s', difficulty: 'Beginner', tip: 'Don\'t lock knees at top. Full range of motion.' },
  { name: 'Bulgarian Split Squat', muscle: 'Quads', equipment: 'Dumbbells', sets: '3', reps: '10–12', rest: '75s', difficulty: 'Advanced', tip: 'Keep front knee behind toes. Upright torso.' },
  { name: 'Leg Curl', muscle: 'Hamstrings', equipment: 'Machine', sets: '3', reps: '12–15', rest: '75s', difficulty: 'Beginner', tip: 'Slow on the way down for more hypertrophy.' },
  { name: 'Hip Thrust', muscle: 'Glutes', equipment: 'Barbell', sets: '4', reps: '12–15', rest: '75s', difficulty: 'Intermediate', tip: 'Full hip extension at top. Tuck chin.' },
  { name: 'Walking Lunges', muscle: 'Quads', equipment: 'Dumbbells', sets: '3', reps: '12 each', rest: '75s', difficulty: 'Intermediate', tip: 'Long stride, back knee almost touches floor.' },
  { name: 'Calf Raise', muscle: 'Calves', equipment: 'Machine', sets: '4', reps: '15–20', rest: '45s', difficulty: 'Beginner', tip: 'Full range — all the way up and down.' },
  // Core
  { name: 'Plank', muscle: 'Core', equipment: 'Bodyweight', sets: '3', reps: '60s hold', rest: '45s', difficulty: 'Beginner', tip: 'Squeeze glutes and abs. Don\'t let hips sag.' },
  { name: 'Cable Crunch', muscle: 'Core', equipment: 'Cable', sets: '3', reps: '15–20', rest: '45s', difficulty: 'Beginner', tip: 'Round the spine, initiate with abs not arms.' },
  { name: 'Dead Bug', muscle: 'Core', equipment: 'Bodyweight', sets: '3', reps: '10 each', rest: '45s', difficulty: 'Beginner', tip: 'Lower back pressed to floor throughout.' },
  { name: 'Hanging Leg Raise', muscle: 'Core', equipment: 'Bodyweight', sets: '3', reps: '10–15', rest: '60s', difficulty: 'Intermediate', tip: 'Control the swing. Pull knees to chest.' },
  { name: 'Russian Twists', muscle: 'Core', equipment: 'Bodyweight', sets: '3', reps: '20', rest: '45s', difficulty: 'Beginner', tip: 'Lean back slightly, feet off floor for harder version.' },
  // Cardio
  { name: 'Burpees', muscle: 'Full Body', equipment: 'Bodyweight', sets: '4', reps: '30s on / 15s off', rest: '15s', difficulty: 'Advanced', tip: 'Jump explosively. Modify by stepping instead of jumping.' },
  { name: 'Jump Rope', muscle: 'Cardio', equipment: 'Bodyweight', sets: '5', reps: '60s', rest: '30s', difficulty: 'Intermediate', tip: 'Stay on the balls of your feet. Small jumps.' },
  { name: 'Mountain Climbers', muscle: 'Full Body', equipment: 'Bodyweight', sets: '4', reps: '30s on / 15s off', rest: '15s', difficulty: 'Intermediate', tip: 'Keep hips level, drive knees to chest.' },
];

const MUSCLE_GROUPS = ['All', ...Array.from(new Set(EXERCISE_DB.map(e => e.muscle))).sort()];
const DIFFICULTY_COLORS = { Beginner: '#00B894', Intermediate: '#FFB800', Advanced: '#FF6B35' };

// ─── Exercise Library Modal ──────────────────────────────────────────────────

function ExerciseLibrary({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('All');
  const [selected, setSelected] = useState<ExerciseEntry | null>(null);

  const filtered = useMemo(() =>
    EXERCISE_DB.filter(e => {
      const matchMuscle = muscleFilter === 'All' || e.muscle === muscleFilter;
      const matchSearch = !search.trim() || e.name.toLowerCase().includes(search.toLowerCase()) || e.muscle.toLowerCase().includes(search.toLowerCase());
      return matchMuscle && matchSearch;
    }),
  [search, muscleFilter]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.libraryContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.libraryHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <View>
            <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: 'Inter_700Bold' }}>Exercise Library</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }}>{EXERCISE_DB.length} exercises</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="close" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, gap: 12 }}>
          <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              value={search} onChangeText={setSearch}
              placeholder="Search exercises, muscles..."
              placeholderTextColor={colors.mutedForeground}
              style={{ flex: 1, color: colors.foreground, fontSize: 15, fontFamily: 'Inter_400Regular' }}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Muscle filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {MUSCLE_GROUPS.map(m => (
              <Pressable key={m} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMuscleFilter(m); }}
                style={[styles.filterChip, {
                  backgroundColor: muscleFilter === m ? colors.primary : `${colors.primary}10`,
                  borderColor: muscleFilter === m ? colors.primary : `${colors.primary}30`,
                }]}
              >
                <Text style={{ color: muscleFilter === m ? '#000' : colors.mutedForeground, fontSize: 12, fontFamily: muscleFilter === m ? 'Inter_700Bold' : 'Inter_500Medium' }}>{m}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Exercise list */}
        <FlatList
          data={filtered}
          keyExtractor={e => e.name}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: ex }) => (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(ex); }}
              style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{ex.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <View style={[styles.tag, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'Inter_500Medium' }}>{ex.muscle}</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: `${colors.secondary}15` }]}>
                    <Text style={{ color: colors.secondary, fontSize: 11, fontFamily: 'Inter_500Medium' }}>{ex.equipment}</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: `${DIFFICULTY_COLORS[ex.difficulty]}20` }]}>
                    <Text style={{ color: DIFFICULTY_COLORS[ex.difficulty], fontSize: 11, fontFamily: 'Inter_500Medium' }}>{ex.difficulty}</Text>
                  </View>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{ex.sets} sets</Text>
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{ex.reps}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
              <Ionicons name="search-outline" size={36} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Inter_400Regular' }}>No exercises found</Text>
            </View>
          }
        />

        {/* Exercise detail modal */}
        {selected && (
          <View style={[StyleSheet.absoluteFill, styles.detailOverlay, { backgroundColor: `${colors.background}F5` }]}>
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ color: colors.foreground, fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 }}>{selected.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <View style={[styles.tag, { backgroundColor: `${colors.primary}20` }]}>
                      <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{selected.muscle}</Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: `${DIFFICULTY_COLORS[selected.difficulty]}20` }]}>
                      <Text style={{ color: DIFFICULTY_COLORS[selected.difficulty], fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{selected.difficulty}</Text>
                    </View>
                  </View>
                </View>
                <Pressable onPress={() => setSelected(null)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={28} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Sets', val: selected.sets, icon: 'repeat-outline' },
                  { label: 'Reps', val: selected.reps, icon: 'barbell-outline' },
                  { label: 'Rest', val: selected.rest, icon: 'timer-outline' },
                  { label: 'Equipment', val: selected.equipment, icon: 'fitness-outline' },
                ].map(s => (
                  <View key={s.label} style={{ flex: 1, alignItems: 'center', backgroundColor: `${colors.primary}10`, borderRadius: 10, paddingVertical: 10, gap: 4 }}>
                    <Ionicons name={s.icon as any} size={16} color={colors.primary} />
                    <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: 'Inter_700Bold', textAlign: 'center' }}>{s.val}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_400Regular' }}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.tipBox, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}33` }]}>
                <Ionicons name="bulb-outline" size={16} color={colors.accent} />
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 19 }}>
                  {selected.tip}
                </Text>
              </View>

              <Pressable
                onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setSelected(null); }}
                style={[styles.gotItBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 15 }}>Got it</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Live Workout Session ────────────────────────────────────────────────────

function WorkoutSession({ workout, onFinish }: { workout: Workout; onFinish: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeWorkout } = useUser();

  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const exercise = workout.exercises[exerciseIdx];
  if (!exercise) { onFinish(); return null; }

  const totalSets = workout.exercises.reduce((s, e) => s + e.sets, 0);
  const progressVal = useSharedValue(0);
  useEffect(() => { progressVal.value = withTiming(totalSets > 0 ? completedCount / totalSets : 0, { duration: 400 }); }, [completedCount]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressVal.value * 100}%` as `${number}%` }));

  function fmt(s: number) { return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`; }

  function startRest(secs: number) {
    setRestRemaining(secs); setIsResting(true);
    restRef.current = setInterval(() => {
      setRestRemaining(r => {
        if (r <= 1) { if (restRef.current) clearInterval(restRef.current); setIsResting(false); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); return 0; }
        return r - 1;
      });
    }, 1000);
  }

  function handleCompleteSet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (restRef.current) clearInterval(restRef.current);
    const newCount = completedCount + 1;
    setCompletedCount(newCount);
    if (setIdx + 1 < exercise.sets) { setSetIdx(s => s + 1); startRest(exercise.rest); }
    else if (exerciseIdx + 1 < workout.exercises.length) { setExerciseIdx(i => i + 1); setSetIdx(0); startRest(60); }
    else finishWorkout();
  }

  function finishWorkout() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (restRef.current) clearInterval(restRef.current);
    const cal = Math.round(workout.calories * (Math.ceil(elapsed / 60) / workout.duration));
    completeWorkout(cal);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onFinish();
  }

  const topPad = Platform.OS === 'web' ? 60 : insets.top;

  return (
    <View style={[styles.session, { backgroundColor: colors.background }]}>
      <View style={[styles.sessionHeader, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => Alert.alert('Exit', 'Progress will not be saved.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Exit', style: 'destructive', onPress: onFinish }])}
          style={[styles.exitBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="close" size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_500Medium' }}>{workout.name}</Text>
          <Text style={{ color: colors.primary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>{fmt(elapsed)}</Text>
        </View>
        <Pressable onPress={() => Alert.alert('Finish Workout', 'Complete this session?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Finish', onPress: finishWorkout }])}
          style={[styles.doneBtn, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}
        >
          <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 13 }}>Done</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, progressStyle, { backgroundColor: colors.primary }]} />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {completedCount}/{totalSets} sets · Exercise {exerciseIdx + 1}/{workout.exercises.length}
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 32 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={[styles.muscleBadge, { backgroundColor: `${colors.secondary}20`, borderColor: `${colors.secondary}44` }]}>
            <Text style={{ color: colors.secondary, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1 }}>
              {exercise.muscleGroup.toUpperCase()}
            </Text>
          </View>
          <Text style={{ color: colors.foreground, fontSize: 32, fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: -0.5 }}>{exercise.name}</Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <View style={[styles.setCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.5 }}>SET</Text>
              <Text style={{ color: colors.foreground, fontSize: 52, fontFamily: 'Inter_700Bold', letterSpacing: -2 }}>
                {setIdx + 1}<Text style={{ color: colors.mutedForeground, fontSize: 28 }}>/{exercise.sets}</Text>
              </Text>
            </View>
            <View style={{ width: 1, height: 60, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.5 }}>REPS</Text>
              <Text style={{ color: colors.primary, fontSize: 36, fontFamily: 'Inter_700Bold', letterSpacing: -1 }}>{exercise.reps}</Text>
            </View>
          </View>
        </View>

        {/* Exercise dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
          {workout.exercises.map((_, i) => (
            <View key={i} style={{
              width: i === exerciseIdx ? 20 : 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: i < exerciseIdx ? colors.primary : i === exerciseIdx ? colors.secondary : colors.border,
            }} />
          ))}
        </View>
      </View>

      {/* Rest overlay */}
      {isResting && (
        <View style={[StyleSheet.absoluteFill, styles.restOverlay, { backgroundColor: `${colors.background}F0` }]}>
          <View style={[styles.restCard, { backgroundColor: colors.card, borderColor: `${colors.secondary}55` }]}>
            <Ionicons name="timer-outline" size={40} color={colors.secondary} />
            <Text style={{ color: colors.foreground, fontSize: 18, fontFamily: 'Inter_600SemiBold' }}>Rest</Text>
            <Text style={{ color: colors.secondary, fontSize: 72, fontFamily: 'Inter_700Bold', letterSpacing: -3 }}>{restRemaining}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }}>seconds</Text>
            <Pressable onPress={() => { if (restRef.current) clearInterval(restRef.current); setIsResting(false); }}
              style={[styles.skipBtn, { backgroundColor: `${colors.secondary}20`, borderColor: `${colors.secondary}44` }]}
            >
              <Text style={{ color: colors.secondary, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Skip Rest →</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!isResting && (
        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 24) + 16 }}>
          <Pressable onPress={handleCompleteSet}
            style={({ pressed }) => [styles.completeBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="checkmark" size={24} color="#000" />
            <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 17 }}>Complete Set</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Workout Browse ──────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { weeklySchedule } = useUser();
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const topPad = Platform.OS === 'web' ? 60 : insets.top;
  const todayIdx = new Date().getDay();
  const todayName = DAY_NAMES[todayIdx];

  const handleStart = useCallback((w: Workout) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActiveWorkout(w);
  }, []);

  if (activeWorkout) return <WorkoutSession workout={activeWorkout} onFinish={() => setActiveWorkout(null)} />;

  const displayList: Workout[] = weeklySchedule
    ? Object.entries(weeklySchedule)
        .filter(([, w]) => w && w.name && w.exercises)
        .map(([day, w], i) => ({ ...w, id: w.id ?? `ai-${i}`, _day: day } as Workout & { _day: string }))
    : WORKOUTS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayList}
        keyExtractor={w => w.id}
        contentContainerStyle={{ paddingTop: topPad + 70, paddingHorizontal: 20, paddingBottom: 100 + (Platform.OS === 'web' ? 0 : insets.bottom), gap: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isToday = weeklySchedule
            ? (item as any)._day === todayName
            : displayList.indexOf(item) === todayIdx % WORKOUTS.length;
          return <WorkoutCard workout={item} onPress={handleStart} isToday={isToday} />;
        }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 6 }}>
            <Text style={{ color: colors.foreground, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
              {weeklySchedule ? 'Your AI Plan' : 'Workouts'}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
              {weeklySchedule ? 'Generated by VYTAL ai — tap to begin' : 'Ask VYTAL ai to build a personalised weekly plan'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {!weeklySchedule ? (
                <Pressable onPress={() => router.push('/(tabs)/coach')}
                  style={[styles.aiBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}33` }]}
                >
                  <Ionicons name="flash" size={15} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Build my AI plan</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => router.push('/(tabs)/coach')}
                  style={[styles.aiBtn, { backgroundColor: `${colors.secondary}15`, borderColor: `${colors.secondary}33` }]}
                >
                  <Ionicons name="refresh-outline" size={15} color={colors.secondary} />
                  <Text style={{ color: colors.secondary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Regenerate plan</Text>
                </Pressable>
              )}
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLibraryVisible(true); }}
                style={[styles.aiBtn, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}33` }]}
              >
                <Ionicons name="library-outline" size={15} color={colors.accent} />
                <Text style={{ color: colors.accent, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Exercise Library</Text>
              </Pressable>
            </View>
          </View>
        }
      />
      <View style={[styles.headerBar, { paddingTop: topPad, backgroundColor: colors.background }]} />
      <ExerciseLibrary visible={libraryVisible} onClose={() => setLibraryVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  session: { flex: 1 },
  sessionHeader: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', borderBottomWidth: 1 },
  exitBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  doneBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  muscleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  setCard: { borderRadius: 24, borderWidth: 1, paddingVertical: 28, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', gap: 32 },
  restOverlay: { alignItems: 'center', justifyContent: 'center' },
  restCard: { borderRadius: 24, borderWidth: 1, padding: 32, alignItems: 'center', gap: 8, width: '80%' },
  skipBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  completeBtn: { height: 60, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  // Library
  libraryContainer: { flex: 1 },
  libraryHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  detailOverlay: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  detailCard: { borderRadius: 24, borderWidth: 1, padding: 24, width: '100%', gap: 0 },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginVertical: 12 },
  gotItBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
