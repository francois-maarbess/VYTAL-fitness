import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useUser, stepsToCalories } from '@/context/UserContext';
import { FitScoreRing } from '@/components/FitScoreRing';
import { WeeklyChart } from '@/components/WeeklyChart';
import { StatCard } from '@/components/StatCard';
import MorningProtocolSheet from '@/components/MorningProtocolSheet';
import { WORKOUTS } from '@/data/mockData';
import { useHealthConnectSync } from '@/hooks/useHealthConnectSync';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function ReadinessBar({ score, animScore }: { score: number; animScore: Animated.Value }) {
  const colors = useColors();
  const color = score >= 70 ? colors.primary : score >= 40 ? '#FFB800' : colors.destructive;
  const label = score >= 70 ? 'Optimal' : score >= 40 ? 'Moderate' : 'Low';

  const widthInterp = animScore.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'] as string[],
  });

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Readiness Score</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AnimatedText
            style={{ color, fontSize: 22, fontFamily: 'Inter_700Bold' }}
            value={animScore}
          />
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>/100</Text>
          <View style={[styles.labelBadge, { backgroundColor: `${color}20` }]}>
            <Text style={{ color, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>{label}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.readinessBg, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.readinessFill, { backgroundColor: color, width: widthInterp }]} />
      </View>
    </View>
  );
}

function AnimatedText({ style, value }: { style: any; value: Animated.Value }) {
  const [display, setDisplay] = useState('0');
  const listener = useRef<string | null>(null);

  useEffect(() => {
    const id = value.addListener(({ value: v }) => {
      setDisplay(Math.round(v).toString());
    });
    return () => value.removeListener(id);
  }, [value]);

  return <Animated.Text style={style}>{display}</Animated.Text>;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    profile, isLoading, fitScore, streak, totalWorkouts,
    weeklyActivity, nutritionToday, calorieGoal, tdee, bmr,
    readinessScore, sleepHours, sleepQuality, stepsToday, workoutCaloriesToday,
    showMorningProtocol, completeMorningProtocol, skipMorningProtocol,
  } = useUser();

  useHealthConnectSync();

  const animScore = useRef(new Animated.Value(readinessScore)).current;
  const [blurIntensity, setBlurIntensity] = useState(0);
  const [showBlur, setShowBlur] = useState(false);

  // Trigger readiness animation after protocol completes
  const [prevReadiness, setPrevReadiness] = useState(readinessScore);
  const [readinessAnimating, setReadinessAnimating] = useState(false);

  useEffect(() => {
    if (readinessAnimating && readinessScore !== prevReadiness) {
      animScore.setValue(prevReadiness);
      Animated.timing(animScore, {
        toValue: readinessScore,
        duration: 800,
        useNativeDriver: false,
      }).start(() => setReadinessAnimating(false));
    }
  }, [readinessScore, readinessAnimating]);

  // Show blur when morning protocol is active
  useEffect(() => {
    if (showMorningProtocol) {
      setShowBlur(true);
      Animated.timing(new Animated.Value(0), {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
      setBlurIntensity(40);
    }
  }, [showMorningProtocol]);

  const handleMorningComplete = useCallback((hours: number) => {
    setPrevReadiness(readinessScore);
    setReadinessAnimating(true);
    Animated.timing(new Animated.Value(1), {
      toValue: 0,
      duration: 400,
      useNativeDriver: false,
    }).start(() => {
      setBlurIntensity(0);
      setShowBlur(false);
    });
    completeMorningProtocol(hours, null);
  }, [readinessScore, completeMorningProtocol]);

  const handleMorningSkip = useCallback(() => {
    Animated.timing(new Animated.Value(1), {
      toValue: 0,
      duration: 400,
      useNativeDriver: false,
    }).start(() => {
      setBlurIntensity(0);
      setShowBlur(false);
    });
    skipMorningProtocol();
  }, [skipMorningProtocol]);

  useEffect(() => {
    if (!isLoading && (!profile || !profile.onboardingComplete)) {
      router.replace('/onboarding');
    }
  }, [isLoading, profile]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="flash" size={40} color={colors.primary} />
      </View>
    );
  }
  if (!profile?.onboardingComplete) return null;

  const now = new Date();
  const todayWorkout = WORKOUTS[now.getDay() % WORKOUTS.length];
  const topPad = Platform.OS === 'web' ? 60 : insets.top;
  const stepsCal = stepsToCalories(stepsToday, profile.weight);
  const totalBurned = stepsCal + workoutCaloriesToday;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === 'web' ? 0 : insets.bottom) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greet()}, {profile.name.split(' ')[0]}</Text>
            <Text style={[styles.date, { color: colors.foreground }]}>
              {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/profile')}
            style={[styles.avatarBtn, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}
          >
            <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 16 }}>
              {profile.name.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        {/* FitScore */}
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <FitScoreRing score={fitScore} maxScore={1000} size={200} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 10 }}>
            TDEE {tdee} kcal/day
          </Text>
        </View>

        {/* Stats */}
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 10 }}>
          <StatCard icon="flame-outline" iconColor="#FF6B35" value={streak} label="Day Streak" />
          <StatCard icon="barbell-outline" iconColor={colors.primary} value={totalWorkouts} label="Workouts" />
          <StatCard icon="footsteps-outline" iconColor={colors.secondary} value={stepsToday.toLocaleString()} label="Steps" />
        </View>

        {/* Readiness */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ReadinessBar score={readinessScore} animScore={animScore} />
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="moon-outline" size={14} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{sleepHours}h sleep{sleepQuality ? ` (${sleepQuality})` : ''}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="footsteps-outline" size={14} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{stepsToday.toLocaleString()} steps</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/nutrition')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>Update</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Today's workout */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Session</Text>
          <View style={[styles.workoutBanner, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={[styles.accentStripe, { backgroundColor: colors.primary }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: colors.foreground, fontSize: 18, fontFamily: 'Inter_700Bold' }}>{todayWorkout.name}</Text>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                {[
                  { icon: 'time-outline', text: `${todayWorkout.duration} min` },
                  { icon: 'barbell-outline', text: `${todayWorkout.exercises.length} exercises` },
                  { icon: 'flame-outline', text: `${todayWorkout.calories} kcal` },
                ].map(m => (
                  <View key={m.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={m.icon as any} size={13} color={colors.mutedForeground} />
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{m.text}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(tabs)/workout'); }}
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="play" size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </View>

        {/* TDEE Burn tracker */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Calories Burned</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={{ color: colors.foreground, fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -1 }}>{totalBurned}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>kcal burned today</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>BMR: {Math.round(bmr)} kcal</Text>
                <Text style={{ color: colors.secondary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>Steps: {stepsCal} kcal</Text>
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>Workout: {workoutCaloriesToday} kcal</Text>
              </View>
            </View>
            <View style={[styles.burnBg, { backgroundColor: colors.border }]}>
              <View style={[styles.burnFill, { width: `${Math.min((totalBurned / (tdee || 2200)) * 100, 100)}%` as `${number}%`, backgroundColor: colors.secondary }]} />
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
              {Math.max(0, (tdee || 2200) - totalBurned)} kcal remaining to hit TDEE goal
            </Text>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weekly Activity</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              {weeklyActivity.filter(d => d > 0).length}/7 days
            </Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <WeeklyChart data={weeklyActivity} />
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>Quick Actions</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Ask VYTAL ai', icon: 'chatbubble-ellipses-outline', color: colors.primary, route: '/(tabs)/coach' },
              { label: 'Log Meal', icon: 'add-circle-outline', color: colors.secondary, route: '/(tabs)/nutrition' },
              { label: 'Leaderboard', icon: 'trophy-outline', color: colors.accent, route: '/(tabs)/profile' },
            ].map(a => (
              <Pressable key={a.label} onPress={() => router.push(a.route as any)}
                style={[styles.quickAction, { backgroundColor: `${a.color}15`, borderColor: `${a.color}30` }]}
              >
                <Ionicons name={a.icon as any} size={22} color={a.color} />
                <Text style={{ color: a.color, fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'center' }}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Morning Protocol overlay */}
      {showBlur && (
        <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <MorningProtocolSheet
        visible={showMorningProtocol}
        onComplete={handleMorningComplete}
        onSkip={handleMorningSkip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  date: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  avatarBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  workoutBanner: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  accentStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  startBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  quickAction: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  readinessBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  readinessFill: { height: '100%', borderRadius: 4 },
  labelBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  burnBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  burnFill: { height: '100%', borderRadius: 3 },
});
