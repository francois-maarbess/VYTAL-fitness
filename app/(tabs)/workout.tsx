import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useUser, type WorkoutIntent } from '@/context/UserContext';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api';
import { Exercise, Workout, WORKOUTS } from '@/data/mockData';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PLAN_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CATEGORY_FILTERS = ['All', 'Bodybuilding', 'Calisthenics', 'Basketball', 'Football', 'Tennis', 'Cardio', 'Mobility'];

type LibraryExercise = {
  id: number | string;
  name: string;
  category: string;
  targetMuscle: string;
  equipment: string;
  primaryMuscles?: string[];
  estimatedCaloriesPerMinute?: number;
};

type AddTarget = { day: string; replaceIndex?: number };

const INTENT_SPORTS = ['Bodybuilding', 'Basketball', 'Football', 'Tennis', 'Cardio', 'Mobility', 'Recovery'];
const INTENT_GOALS: Record<string, string[]> = {
  Bodybuilding: ['Hypertrophy', 'Strength', 'Cutting', 'Weak Point'],
  Basketball: ['Vertical Jump', 'Agility', 'Conditioning', 'In-Season Maintenance'],
  Football: ['Power', 'Acceleration', 'Change of Direction', 'Contact Prep'],
  Tennis: ['Shoulder Health', 'Rotational Power', 'Lateral Speed', 'Match Endurance'],
  Cardio: ['Zone 2', 'Intervals', 'Fat Loss', 'Endurance'],
  Mobility: ['Hips', 'Shoulders', 'Spine', 'Full-Body Reset'],
  Recovery: ['Deload', 'Pain-Free Movement', 'Sleep Support', 'Light Flush'],
};

const fallbackLibrary: LibraryExercise[] = WORKOUTS.flatMap((workout) =>
  workout.exercises.map((exercise, index) => ({
    id: `${workout.id}-${index}`,
    name: exercise.name,
    category: workout.type,
    targetMuscle: exercise.muscleGroup,
    equipment: 'Mixed',
    primaryMuscles: [exercise.muscleGroup],
    estimatedCaloriesPerMinute: 6,
  })),
);

function normalizeWorkout(day: string, workout?: Partial<Workout> | null): Workout {
  if (workout?.name && Array.isArray(workout.exercises)) {
    const type = (workout as Workout & { category?: string }).type ?? (workout as Workout & { category?: string }).category ?? 'Strength';
    return {
      id: workout.id ?? day.toLowerCase().slice(0, 3),
      name: workout.name,
      type,
      duration: workout.duration ?? Math.max(25, workout.exercises.length * 8),
      difficulty: workout.difficulty ?? 'Intermediate',
      exercises: workout.exercises,
      muscleGroups: workout.muscleGroups ?? Array.from(new Set(workout.exercises.map((e) => e.muscleGroup))),
      calories: workout.calories ?? Math.max(120, workout.exercises.length * 55),
    };
  }

  const fallback = WORKOUTS[PLAN_DAYS.indexOf(day) % WORKOUTS.length];
  return { ...fallback, id: day.toLowerCase().slice(0, 3), name: day === 'Sunday' ? 'Recovery' : fallback.name };
}

function buildSchedule(weeklySchedule: Record<string, Workout> | null): Record<string, Workout> {
  return PLAN_DAYS.reduce<Record<string, Workout>>((acc, day) => {
    acc[day] = normalizeWorkout(day, weeklySchedule?.[day]);
    return acc;
  }, {});
}

function exerciseFromLibrary(item: LibraryExercise): Exercise {
  return {
    name: item.name,
    sets: item.category === 'Cardio' || item.category === 'Mobility' ? 1 : 3,
    reps: item.category === 'Cardio' ? '20 min' : item.category === 'Mobility' ? '60s' : '8-12',
    rest: item.category === 'Cardio' ? 30 : 60,
    muscleGroup: item.targetMuscle || item.primaryMuscles?.[0] || 'Full Body',
  };
}

function recalcWorkout(workout: Workout, exercises: Exercise[]): Workout {
  const muscleGroups = Array.from(new Set(exercises.map((e) => e.muscleGroup).filter(Boolean)));
  return {
    ...workout,
    exercises,
    muscleGroups,
    duration: Math.max(exercises.length ? 12 : 0, exercises.reduce((sum, e) => sum + e.sets * 4, 0)),
    calories: Math.max(exercises.length ? 80 : 0, exercises.reduce((sum, e) => sum + e.sets * 35, 0)),
  };
}

function WorkoutSession({ workout, onFinish }: { workout: Workout; onFinish: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeWorkout } = useUser();
  const progressVal = useSharedValue(0);

  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exercise = workout.exercises[exerciseIdx];
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets, 0);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressVal.value * 100}%` as `${number}%` }));

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restRef.current) clearInterval(restRef.current);
    };
  }, []);

  useEffect(() => {
    progressVal.value = withTiming(totalSets > 0 ? completedCount / totalSets : 0, { duration: 350 });
  }, [completedCount, progressVal, totalSets]);

  useEffect(() => {
    if (!exercise) onFinish();
  }, [exercise, onFinish]);

  const finishWorkout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (restRef.current) clearInterval(restRef.current);
    const minutes = Math.max(1, Math.ceil(elapsed / 60));
    const cal = workout.duration > 0 ? Math.round(workout.calories * (minutes / workout.duration)) : workout.calories;
    completeWorkout(cal);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onFinish();
  }, [completeWorkout, elapsed, onFinish, workout.calories, workout.duration]);

  const startRest = useCallback((secs: number) => {
    setRestRemaining(secs);
    setIsResting(true);
    if (restRef.current) clearInterval(restRef.current);
    restRef.current = setInterval(() => {
      setRestRemaining(r => {
        if (r <= 1) {
          if (restRef.current) clearInterval(restRef.current);
          setIsResting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }, []);

  const handleCompleteSet = useCallback(() => {
    if (!exercise) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newCount = completedCount + 1;
    setCompletedCount(newCount);
    if (setIdx + 1 < exercise.sets) {
      setSetIdx(s => s + 1);
      startRest(exercise.rest);
    } else if (exerciseIdx + 1 < workout.exercises.length) {
      setExerciseIdx(i => i + 1);
      setSetIdx(0);
      startRest(60);
    } else {
      finishWorkout();
    }
  }, [completedCount, exercise, exerciseIdx, finishWorkout, setIdx, startRest, workout.exercises.length]);

  if (!exercise) return null;

  const topPad = Platform.OS === 'web' ? 60 : insets.top;
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <View style={[styles.session, { backgroundColor: colors.background }]}>
      <View style={[styles.sessionHeader, { paddingTop: topPad + 12 }]}>
        <Pressable
          onPress={() => Alert.alert('Exit', 'Progress will not be saved.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Exit', style: 'destructive', onPress: onFinish }])}
          style={[styles.exitBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="close" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.sessionTitleWrap}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>{workout.name}</Text>
          <Text style={{ color: colors.primary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>{fmt(elapsed)}</Text>
        </View>
        <Pressable onPress={finishWorkout} style={[styles.doneBtn, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.progressWrap}>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, progressStyle, { backgroundColor: colors.primary }]} />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {completedCount}/{totalSets} sets
        </Text>
      </View>

      <View style={styles.sessionBody}>
        <View style={styles.centerGap}>
          <View style={[styles.exerciseBadge, { backgroundColor: `${colors.secondary}20`, borderColor: `${colors.secondary}44` }]}>
            <Text style={{ color: colors.secondary, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1 }}>
              EXERCISE {exerciseIdx + 1}/{workout.exercises.length}
            </Text>
          </View>
          <Text style={{ color: colors.foreground, fontSize: 30, fontFamily: 'Inter_700Bold', textAlign: 'center' }}>{exercise.name}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{exercise.muscleGroup}</Text>
        </View>
        <View style={[styles.setCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.centerGapSmall}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 }}>SET</Text>
            <Text style={{ color: colors.foreground, fontSize: 48, fontFamily: 'Inter_700Bold' }}>
              {setIdx + 1}<Text style={{ color: colors.mutedForeground, fontSize: 24 }}>/{exercise.sets}</Text>
            </Text>
          </View>
          <View style={{ width: 1, height: 60, backgroundColor: colors.border }} />
          <View style={styles.centerGapSmall}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 }}>REPS</Text>
            <Text style={{ color: colors.primary, fontSize: 30, fontFamily: 'Inter_700Bold' }}>{exercise.reps}</Text>
          </View>
        </View>
      </View>

      {isResting ? (
        <View style={[StyleSheet.absoluteFill, styles.restOverlay, { backgroundColor: `${colors.background}EE` }]}>
          <Ionicons name="timer-outline" size={44} color={colors.secondary} />
          <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: 'Inter_600SemiBold' }}>Rest</Text>
          <Text style={{ color: colors.secondary, fontSize: 64, fontFamily: 'Inter_700Bold' }}>{restRemaining}</Text>
          <Pressable onPress={() => { if (restRef.current) clearInterval(restRef.current); setIsResting(false); }} style={[styles.skipBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>Skip Rest</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 24) + 16 }}>
          <Pressable onPress={handleCompleteSet} style={({ pressed }) => [styles.completeBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="checkmark" size={22} color={colors.primaryForeground} />
            <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 17 }}>Complete Set</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const ExerciseRow = memo(function ExerciseRow({
  exercise,
  index,
  total,
  onMove,
  onDelete,
  onSwap,
}: {
  exercise: Exercise;
  index: number;
  total: number;
  onMove: (from: number, direction: -1 | 1) => void;
  onDelete: (index: number) => void;
  onSwap: (index: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.exerciseRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.exerciseIndex}>
        <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 12 }}>{index + 1}</Text>
      </View>
      <View style={styles.exerciseMain}>
        <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 15 }} numberOfLines={1}>{exercise.name}</Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }} numberOfLines={1}>
          {exercise.sets} sets | {exercise.reps} | {exercise.muscleGroup}
        </Text>
      </View>
      <View style={styles.rowActions}>
        <Pressable disabled={index === 0} onPress={() => onMove(index, -1)} style={[styles.iconBtn, { opacity: index === 0 ? 0.35 : 1 }]}>
          <Ionicons name="chevron-up" size={16} color={colors.foreground} />
        </Pressable>
        <Pressable disabled={index === total - 1} onPress={() => onMove(index, 1)} style={[styles.iconBtn, { opacity: index === total - 1 ? 0.35 : 1 }]}>
          <Ionicons name="chevron-down" size={16} color={colors.foreground} />
        </Pressable>
        <Pressable onPress={() => onSwap(index)} style={styles.iconBtn}>
          <Ionicons name="swap-horizontal" size={16} color={colors.secondary} />
        </Pressable>
        <Pressable onPress={() => onDelete(index)} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={16} color="#FF5C7A" />
        </Pressable>
      </View>
    </View>
  );
});

const IntentChip = memo(function IntentChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withTiming(0.96, { duration: 80 }, () => {
      scale.value = withTiming(1, { duration: 120 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress, scale]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.intentChip,
          {
            backgroundColor: selected ? colors.primary : 'rgba(255,255,255,0.05)',
            borderColor: selected ? colors.primary : 'rgba(255,255,255,0.1)',
          },
        ]}
      >
        <Text style={{ color: selected ? colors.primaryForeground : colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 }} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

function PreWorkoutIntentSheet({
  sheetRef,
  value,
  onChange,
  onClose,
}: {
  sheetRef: React.RefObject<BottomSheet | null>;
  value: WorkoutIntent;
  onChange: (intent: WorkoutIntent) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const snapPoints = useMemo(() => ['48%', '72%'], []);
  const goals = INTENT_GOALS[value.sport] ?? INTENT_GOALS.Bodybuilding;
  const accent = useSharedValue(0);
  const accentStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + accent.value * 0.35,
    transform: [{ translateY: -8 * accent.value }],
  }));

  useEffect(() => {
    accent.value = withTiming(1, { duration: 260 }, () => {
      accent.value = withTiming(0, { duration: 260 });
    });
  }, [accent, value.sport, value.goal]);

  const updateSport = useCallback((sport: string) => {
    const nextGoal = INTENT_GOALS[sport]?.[0] ?? 'Performance';
    onChange({ sport, goal: nextGoal });
  }, [onChange]);

  const updateGoal = useCallback((goal: string) => {
    onChange({ ...value, goal });
  }, [onChange, value]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />}
    >
      <BottomSheetView style={styles.intentSheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.panelTitleWrap}>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 21 }}>Workout Intent</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }}>
              {value.sport} | {value.goal}
            </Text>
          </View>
          <Pressable onPress={onClose} style={[styles.sheetClose, { backgroundColor: colors.muted }]}>
            <Ionicons name="close" size={18} color={colors.foreground} />
          </Pressable>
        </View>

        <Animated.View style={[styles.intentPreview, { borderColor: `${colors.primary}44`, backgroundColor: 'rgba(255,255,255,0.05)' }, accentStyle]}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 14, flex: 1 }} numberOfLines={1}>
            {value.sport}: {value.goal}
          </Text>
        </Animated.View>

        <View style={styles.intentSection}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 }}>SPORT / CATEGORY</Text>
          <FlatList
            horizontal
            data={INTENT_SPORTS}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.intentChipRow}
            renderItem={({ item }) => (
              <IntentChip label={item} selected={item === value.sport} onPress={() => updateSport(item)} />
            )}
          />
        </View>

        <View style={styles.intentSection}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 }}>GOAL</Text>
          <View style={styles.goalGrid}>
            {goals.map((goal) => (
              <IntentChip key={goal} label={goal} selected={goal === value.goal} onPress={() => updateGoal(goal)} />
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();
          }}
          style={({ pressed }) => [styles.intentConfirm, { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 }]}
        >
          <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
          <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 14 }}>Set Intent</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}

export default function WorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { weeklySchedule, setWeeklySchedule, workoutIntent, setWorkoutIntent } = useUser();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const intentSheetRef = useRef<BottomSheet>(null);
  const searchInputRef = useRef<TextInput>(null);

  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');
  const [schedule, setSchedule] = useState<Record<string, Workout>>(() => buildSchedule(weeklySchedule));
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [results, setResults] = useState<LibraryExercise[]>(fallbackLibrary);
  const [customName, setCustomName] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const topPad = Platform.OS === 'web' ? 60 : insets.top;
  const todayName = DAY_NAMES[new Date().getDay()];
  const todayWorkout = schedule[todayName] ?? normalizeWorkout(todayName);
  const snapPoints = useMemo(() => ['58%', '88%'], []);

  useEffect(() => {
    setSchedule(buildSchedule(weeklySchedule));
  }, [weeklySchedule]);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (category !== 'All') params.set('category', category);
        params.set('limit', '60');
        const headers = await getAuthHeaders();
        const res = await fetch(`${getApiBaseUrl()}api/exercises?${params.toString()}`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { exercises?: LibraryExercise[] };
        if (alive) setResults(data.exercises?.length ? data.exercises : fallbackLibrary);
      } catch {
        if (alive) setResults(fallbackLibrary);
      } finally {
        if (alive) setIsSearching(false);
      }
    }, 220);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [category, query]);

  const persistSchedule = useCallback(async (next: Record<string, Workout>) => {
    setSchedule(next);
    await setWeeklySchedule(next);
  }, [setWeeklySchedule]);

  const updateDay = useCallback(async (day: string, updater: (workout: Workout) => Workout) => {
    const next = { ...schedule, [day]: updater(schedule[day] ?? normalizeWorkout(day)) };
    await persistSchedule(next);
  }, [persistSchedule, schedule]);

  const openAddSheet = useCallback((target: AddTarget) => {
    setAddTarget(target);
    setQuery('');
    setCustomName('');
    bottomSheetRef.current?.snapToIndex(0);
    setTimeout(() => searchInputRef.current?.focus(), 250);
  }, []);

  const closeSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    setAddTarget(null);
  }, []);

  const openIntentSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    intentSheetRef.current?.snapToIndex(0);
  }, []);

  const closeIntentSheet = useCallback(() => {
    intentSheetRef.current?.close();
  }, []);

  const addLibraryExercise = useCallback(async (item: LibraryExercise) => {
    if (!addTarget) return;
    const newExercise = exerciseFromLibrary(item);
    await updateDay(addTarget.day, (workout) => {
      const nextExercises = [...workout.exercises];
      if (typeof addTarget.replaceIndex === 'number') nextExercises[addTarget.replaceIndex] = newExercise;
      else nextExercises.push(newExercise);
      return recalcWorkout(workout, nextExercises);
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeSheet();
  }, [addTarget, closeSheet, updateDay]);

  const addCustomExercise = useCallback(async () => {
    const name = customName.trim();
    if (!name || !addTarget) return;
    await addLibraryExercise({
      id: `custom-${Date.now()}`,
      name,
      category: 'Custom',
      targetMuscle: 'Full Body',
      equipment: 'User Defined',
      primaryMuscles: ['Full Body'],
      estimatedCaloriesPerMinute: 5,
    });
  }, [addLibraryExercise, addTarget, customName]);

  const moveExercise = useCallback((day: string, index: number, direction: -1 | 1) => {
    updateDay(day, (workout) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= workout.exercises.length) return workout;
      const nextExercises = [...workout.exercises];
      [nextExercises[index], nextExercises[nextIndex]] = [nextExercises[nextIndex], nextExercises[index]];
      return recalcWorkout(workout, nextExercises);
    });
  }, [updateDay]);

  const deleteExercise = useCallback((day: string, index: number) => {
    updateDay(day, (workout) => recalcWorkout(workout, workout.exercises.filter((_, i) => i !== index)));
  }, [updateDay]);

  const startWorkout = useCallback((workout: Workout) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActiveWorkout(workout);
  }, []);

  const renderWorkoutEditor = useCallback((day: string, workout: Workout, compact = false) => (
    <View style={[styles.workoutPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleWrap}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>{day.toUpperCase()}</Text>
          <Text style={{ color: colors.foreground, fontSize: compact ? 19 : 23, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>{workout.name}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
            {workout.type} | {workout.duration} min | {workout.calories} kcal
          </Text>
        </View>
        <Pressable onPress={() => openAddSheet({ day })} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={18} color={colors.primaryForeground} />
          <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 13 }}>Add</Text>
        </Pressable>
      </View>

      {workout.exercises.length > 0 ? (
        <View style={styles.exerciseList}>
          {workout.exercises.map((exercise, index) => (
            <ExerciseRow
              key={`${exercise.name}-${index}`}
              exercise={exercise}
              index={index}
              total={workout.exercises.length}
              onMove={(from, dir) => moveExercise(day, from, dir)}
              onDelete={(idx) => deleteExercise(day, idx)}
              onSwap={(idx) => openAddSheet({ day, replaceIndex: idx })}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.emptyPlan, { borderColor: colors.border }]}>
          <Ionicons name="calendar-clear-outline" size={20} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 13 }}>No exercises yet. Add one or keep this as recovery.</Text>
        </View>
      )}

      <Pressable
        onPress={() => startWorkout(workout)}
        disabled={!workout.exercises.length}
        style={({ pressed }) => [
          styles.startBtn,
          {
            backgroundColor: workout.exercises.length ? `${colors.secondary}22` : colors.muted,
            borderColor: workout.exercises.length ? `${colors.secondary}55` : colors.border,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        <Ionicons name="play" size={16} color={workout.exercises.length ? colors.secondary : colors.mutedForeground} />
        <Text style={{ color: workout.exercises.length ? colors.secondary : colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 13 }}>Start Workout</Text>
      </Pressable>
    </View>
  ), [colors, deleteExercise, moveExercise, openAddSheet, startWorkout]);

  if (activeWorkout) return <WorkoutSession workout={activeWorkout} onFinish={() => setActiveWorkout(null)} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.fixedHeader, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <View style={styles.panelTitleWrap}>
            <Text style={{ color: colors.foreground, fontSize: 28, fontFamily: 'Inter_700Bold' }}>Workout</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_500Medium' }} numberOfLines={1}>
              {workoutIntent.sport} | {workoutIntent.goal}
            </Text>
          </View>
          <Pressable onPress={openIntentSheet} style={[styles.intentBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <Ionicons name="options-outline" size={17} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 12 }}>Intent</Text>
          </Pressable>
        </View>
        <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['today', 'week'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[styles.segmentItem, { backgroundColor: viewMode === mode ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: viewMode === mode ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 12 }}>
                {mode === 'today' ? "Today's Workout" : 'Weekly Plan'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {viewMode === 'today' ? (
        <FlatList
          data={[todayWorkout]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderWorkoutEditor(todayName, item)}
          contentContainerStyle={{ paddingTop: topPad + 126, paddingHorizontal: 16, paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={PLAN_DAYS.map((day) => ({ day, workout: schedule[day] }))}
          keyExtractor={(item) => item.day}
          renderItem={({ item }) => renderWorkoutEditor(item.day, item.workout, true)}
          contentContainerStyle={{ paddingTop: topPad + 126, paddingHorizontal: 16, paddingBottom: 120 + insets.bottom, gap: 12 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          maxToRenderPerBatch={3}
          windowSize={6}
        />
      )}

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} />}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 20 }}>
                {typeof addTarget?.replaceIndex === 'number' ? 'Swap Exercise' : 'Add Workout'}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }}>
                Search the VYTAL exercise database
              </Text>
            </View>
            <Pressable onPress={closeSheet} style={[styles.sheetClose, { backgroundColor: colors.muted }]}>
              <Ionicons name="close" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              ref={searchInputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by exercise, muscle, sport..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
          </View>

          <FlatList
            horizontal
            data={CATEGORY_FILTERS}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setCategory(item)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: category === item ? colors.primary : 'rgba(255,255,255,0.05)',
                    borderColor: category === item ? colors.primary : 'rgba(255,255,255,0.1)',
                  },
                ]}
              >
                <Text style={{ color: category === item ? colors.primaryForeground : colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 }}>{item}</Text>
              </Pressable>
            )}
          />

          <View style={[styles.customBox, { borderColor: colors.border }]}>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder='Custom entry, e.g. "1 hour Walking"'
              placeholderTextColor={colors.mutedForeground}
              style={[styles.customInput, { color: colors.foreground }]}
            />
            <Pressable onPress={addCustomExercise} disabled={!customName.trim()} style={[styles.customAdd, { backgroundColor: customName.trim() ? colors.secondary : colors.muted }]}>
              <Ionicons name="add" size={16} color={customName.trim() ? colors.background : colors.mutedForeground} />
            </Pressable>
          </View>

          <BottomSheetFlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.resultList}
            renderItem={({ item }) => (
              <Pressable onPress={() => addLibraryExercise(item)} style={[styles.resultRow, { borderColor: colors.border }]}>
                <View style={[styles.resultIcon, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="barbell-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.exerciseMain}>
                  <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 14 }} numberOfLines={1}>{item.name}</Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }} numberOfLines={1}>
                    {item.category} | {item.targetMuscle} | {item.equipment}
                  </Text>
                </View>
                <Ionicons name={isSearching ? 'sync' : 'add-circle'} size={20} color={colors.secondary} />
              </Pressable>
            )}
          />
        </BottomSheetView>
      </BottomSheet>

      <PreWorkoutIntentSheet
        sheetRef={intentSheetRef}
        value={workoutIntent}
        onChange={setWorkoutIntent}
        onClose={closeIntentSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  intentBtn: { height: 38, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  segment: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, minHeight: 46 },
  segmentItem: { flex: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  workoutPanel: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 14 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  panelTitleWrap: { flex: 1, gap: 3 },
  addBtn: { height: 38, borderRadius: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  exerciseList: { gap: 8 },
  exerciseRow: { minHeight: 64, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseIndex: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  exerciseMain: { flex: 1, gap: 3 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  emptyPlan: { minHeight: 70, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8 },
  startBtn: { height: 42, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  sheetContent: { flex: 1, paddingHorizontal: 16, gap: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  searchBox: { height: 46, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, paddingVertical: 0 },
  categoryRow: { gap: 8, paddingVertical: 2 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  customBox: { height: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 12, overflow: 'hidden' },
  customInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, paddingVertical: 0 },
  customAdd: { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  resultList: { paddingBottom: 28 },
  resultRow: { minHeight: 64, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  resultIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  intentSheet: { flex: 1, paddingHorizontal: 16, gap: 16 },
  intentPreview: { minHeight: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  intentSection: { gap: 10 },
  intentChipRow: { gap: 8, paddingRight: 16 },
  intentChip: { minHeight: 36, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 13, borderWidth: 1, justifyContent: 'center' },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intentConfirm: { height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'auto', marginBottom: 8 },
  session: { flex: 1 },
  sessionHeader: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sessionTitleWrap: { alignItems: 'center', flex: 1, paddingHorizontal: 10 },
  exitBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  doneBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  progressWrap: { paddingHorizontal: 20, marginTop: 8 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  sessionBody: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 34 },
  centerGap: { alignItems: 'center', gap: 10 },
  centerGapSmall: { alignItems: 'center', gap: 3 },
  exerciseBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  setCard: { borderRadius: 20, borderWidth: 1, paddingVertical: 24, paddingHorizontal: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  restOverlay: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  skipBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  completeBtn: { height: 58, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
