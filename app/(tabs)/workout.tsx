import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';
import { WorkoutCard } from '@/components/WorkoutCard';
import { Workout, WORKOUTS } from '@/data/mockData';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Workout Session ────────────────────────────────────────────────────────

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      <View style={[styles.sessionHeader, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => Alert.alert('Exit', 'Progress will not be saved.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Exit', style: 'destructive', onPress: onFinish }])}
          style={[styles.exitBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="close" size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{workout.name}</Text>
          <Text style={{ color: colors.primary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>{fmt(elapsed)}</Text>
        </View>
        <Pressable onPress={() => Alert.alert('Finish Workout', 'Complete this session?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Finish', onPress: finishWorkout }])}
          style={[styles.doneBtn, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}
        >
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>Done</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, progressStyle, { backgroundColor: colors.primary }]} />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {completedCount}/{totalSets} sets
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 36 }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={[styles.exerciseBadge, { backgroundColor: `${colors.secondary}20`, borderColor: `${colors.secondary}44` }]}>
            <Text style={{ color: colors.secondary, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1 }}>
              EXERCISE {exerciseIdx + 1}/{workout.exercises.length}
            </Text>
          </View>
          <Text style={{ color: colors.foreground, fontSize: 30, fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: -0.5 }}>{exercise.name}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{exercise.muscleGroup}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.setCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ alignItems: 'center', gap: 3 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 }}>SET</Text>
              <Text style={{ color: colors.foreground, fontSize: 48, fontFamily: 'Inter_700Bold', letterSpacing: -2 }}>
                {setIdx + 1}<Text style={{ color: colors.mutedForeground, fontSize: 24 }}>/{exercise.sets}</Text>
              </Text>
            </View>
            <View style={{ width: 1, height: 60, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center', gap: 3 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 }}>REPS</Text>
              <Text style={{ color: colors.primary, fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -1 }}>{exercise.reps}</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {workout.exercises.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i < exerciseIdx ? colors.primary : i === exerciseIdx ? colors.secondary : colors.border }]} />
          ))}
        </View>
      </View>

      {isResting && (
        <View style={[StyleSheet.absoluteFill, styles.restOverlay, { backgroundColor: `${colors.background}EE` }]}>
          <Ionicons name="timer-outline" size={44} color={colors.secondary} />
          <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: 'Inter_600SemiBold' }}>Rest</Text>
          <Text style={{ color: colors.secondary, fontSize: 64, fontFamily: 'Inter_700Bold', letterSpacing: -2 }}>{restRemaining}</Text>
          <Pressable onPress={() => { if (restRef.current) clearInterval(restRef.current); setIsResting(false); }}
            style={[styles.skipBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>Skip Rest</Text>
          </Pressable>
        </View>
      )}

      {!isResting && (
        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 24) + 16 }}>
          <Pressable onPress={handleCompleteSet}
            style={({ pressed }) => [styles.completeBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="checkmark" size={22} color={colors.primaryForeground} />
            <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 17 }}>Complete Set</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Browse ─────────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { weeklySchedule } = useUser();
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const topPad = Platform.OS === 'web' ? 60 : insets.top;
  const todayIdx = new Date().getDay();
  const todayName = DAY_NAMES[todayIdx];

  const handleStart = useCallback((w: Workout) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActiveWorkout(w);
  }, []);

  if (activeWorkout) return <WorkoutSession workout={activeWorkout} onFinish={() => setActiveWorkout(null)} />;

  // Merge AI schedule into workout list if available
  const aiTodayWorkout = weeklySchedule?.[todayName] as Workout | undefined;
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
        contentContainerStyle={{ paddingTop: topPad + 60, paddingHorizontal: 20, paddingBottom: 100 + (Platform.OS === 'web' ? 0 : insets.bottom), gap: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isToday = weeklySchedule
            ? (item as any)._day === todayName
            : displayList.indexOf(item) === todayIdx % WORKOUTS.length;
          return <WorkoutCard workout={item} onPress={handleStart} isToday={isToday} />;
        }}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
              {weeklySchedule ? 'Your AI Plan' : 'Workouts'}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
              {weeklySchedule
                ? 'Generated by VYTAL ai — tap to begin'
                : 'Ask VYTAL ai to build a personalised weekly plan'}
            </Text>
            {!weeklySchedule && (
              <Pressable onPress={() => router.push('/(tabs)/coach')}
                style={[styles.aiBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}33` }]}
              >
                <Ionicons name="flash" size={15} color={colors.primary} />
                <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                  Ask VYTAL ai to build my plan
                </Text>
              </Pressable>
            )}
            {weeklySchedule && (
              <Pressable onPress={() => router.push('/(tabs)/coach')}
                style={[styles.aiBtn, { backgroundColor: `${colors.secondary}15`, borderColor: `${colors.secondary}33` }]}
              >
                <Ionicons name="refresh-outline" size={15} color={colors.secondary} />
                <Text style={{ color: colors.secondary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                  Regenerate plan with VYTAL ai
                </Text>
              </Pressable>
            )}
          </View>
        }
      />
      <View style={[styles.headerBar, { paddingTop: topPad, backgroundColor: colors.background }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  session: { flex: 1 },
  sessionHeader: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  exitBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  doneBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  exerciseBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  setCard: { borderRadius: 20, borderWidth: 1, paddingVertical: 24, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', gap: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  restOverlay: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  skipBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  completeBtn: { height: 58, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
});
