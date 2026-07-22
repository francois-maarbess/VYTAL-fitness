import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useUser, UserProfile } from '@/context/UserContext';
import { getApiBaseUrl } from '@/lib/api';

const GOALS = ['Lose Weight', 'Build Muscle', 'Improve Endurance', 'Boost Energy', 'Longevity', 'Stress Relief'];
const INJURIES = ['None', 'Lower Back', 'Knee Issues', 'Shoulder Issues', 'Hip Problems', 'Wrist Pain'];
const EQUIPMENT = ['Full Gym', 'Dumbbells Only', 'Barbell & Rack', 'Resistance Bands', 'No Equipment'];
const ACTIVITY_LEVELS: { key: UserProfile['activityLevel']; label: string; desc: string }[] = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
  { key: 'light', label: 'Lightly Active', desc: '1–3 days/week' },
  { key: 'moderate', label: 'Moderately Active', desc: '3–5 days/week' },
  { key: 'active', label: 'Very Active', desc: '6–7 days/week' },
  { key: 'very_active', label: 'Athlete', desc: 'Twice per day' },
];

const TOTAL_STEPS = 6;

function ProgressDots({ step }: { step: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === step ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i <= step ? colors.primary : colors.border,
          }}
        />
      ))}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={[styles.chip, { backgroundColor: selected ? `${colors.primary}20` : colors.card, borderColor: selected ? colors.primary : colors.border }]}
    >
      {selected && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
      <Text style={{ color: selected ? colors.primary : colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

function FieldInput({ label, value, unit, onChangeText, keyboardType = 'numeric' }: {
  label: string; value: string; unit: string; onChangeText: (v: string) => void; keyboardType?: 'numeric' | 'default';
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 }}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType as any}
          style={{ flex: 1, color: colors.foreground, fontSize: 18, fontFamily: 'Inter_600SemiBold' }}
          placeholderTextColor={colors.mutedForeground}
          placeholder="0"
        />
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 14 }}>{unit}</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, setProfile, setPlan } = useUser();

  const [mode, setMode] = useState<'welcome' | 'signin' | 'signup'>('welcome');
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<UserProfile['gender']>('male');
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>('moderate');
  const [goals, setGoals] = useState<string[]>([]);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genDots, setGenDots] = useState('');
  const dotsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad = Platform.OS === 'web' ? 60 : insets.top;
  const botPad = Math.max(insets.bottom, 16) + 70;

  useEffect(() => {
    if (mode === 'signup' && step === TOTAL_STEPS - 1) {
      dotsRef.current = setInterval(() => setGenDots(d => d.length >= 3 ? '' : d + '.'), 400);
      return () => { if (dotsRef.current) clearInterval(dotsRef.current); };
    }
  }, [mode, step]);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);
  }

  async function handleCreateAccount() {
    setGenerating(true);
    const p: UserProfile = {
      name: name.trim() || 'Athlete',
      age: parseInt(age) || 25,
      weight: parseFloat(weight) || 70,
      height: parseFloat(height) || 175,
      gender,
      goals: goals.length ? goals : ['Build Muscle'],
      injuries: injuries.filter(i => i !== 'None'),
      equipment: equipment.length ? equipment : ['Full Gym'],
      stressLevel: 5,
      activityLevel,
      onboardingComplete: true,
    };
    await setProfile(p);
    try {
      const res = await fetch(`${getApiBaseUrl()}api/coach/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p }),
      });
      if (res.ok) { const plan = await res.json(); await setPlan(plan); }
    } catch {}
    setGenerating(false);
    router.replace('/(tabs)');
  }

  function handleSignIn() {
    if (profile?.onboardingComplete) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('No Account Found', 'Please create an account first.');
      setMode('welcome');
    }
  }

  function canProceed() {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return age.length > 0 && weight.length > 0 && height.length > 0;
    if (step === 2) return goals.length > 0;
    if (step === 3) return injuries.length > 0;
    if (step === 4) return equipment.length > 0;
    return true;
  }

  function advance() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!canProceed()) {
      const hints: Record<number, string> = {
        0: 'Please enter your name to continue.',
        1: 'Please fill in your age, weight, and height.',
        2: 'Select at least one goal.',
        3: 'Select at least one option.',
        4: 'Select your equipment access.',
      };
      Alert.alert('Required', hints[step] ?? 'Complete this step first.');
      return;
    }
    if (step < TOTAL_STEPS - 2) {
      setStep(s => s + 1);
    } else {
      setStep(TOTAL_STEPS - 1);
      handleCreateAccount();
    }
  }

  // ─── Welcome ───────────────────────────────────────────────────────────────
  if (mode === 'welcome') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 40 }}>
          <View style={{ alignItems: 'center', gap: 16 }}>
            <View style={[styles.logoWrap, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}33` }]}>
              <Ionicons name="flash" size={52} color={colors.primary} />
            </View>
            <Text style={{ color: colors.foreground, fontSize: 34, fontFamily: 'Inter_700Bold', letterSpacing: -1 }}>VYTAL</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24 }}>
              AI-powered fitness and longevity. Built around you.
            </Text>
          </View>
          <View style={{ width: '100%', gap: 12 }}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setMode('signup'); setStep(0); }}
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 16 }}>Create Account</Text>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSignIn(); }}
              style={({ pressed }) => [styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>Sign In</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ paddingBottom: Math.max(insets.bottom, 24), alignItems: 'center' }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
            By continuing you agree to our Terms & Privacy Policy
          </Text>
        </View>
      </View>
    );
  }

  // ─── Sign-up steps ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding">
      {/* Top nav */}
      <View style={{ paddingTop: topPad + 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 12 }}>
        <Pressable onPress={() => step === 0 ? setMode('welcome') : setStep(s => s - 1)}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <ProgressDots step={step} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: botPad }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step 0 — Name & gender */}
        {step === 0 && (
          <Animated.View entering={FadeIn} style={{ gap: 28, paddingTop: 24 }}>
            <View style={{ gap: 8 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Create your account</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Let's start with the basics.</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                value={name} onChangeText={setName} autoFocus
                placeholder="Enter your name" placeholderTextColor={colors.mutedForeground}
                style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
                placeholder="you@example.com" placeholderTextColor={colors.mutedForeground}
                style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>
            <View style={{ gap: 10 }}>
              <Text style={styles.label}>BIOLOGICAL SEX</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['male', 'female', 'other'] as const).map(g => (
                  <Pressable key={g} onPress={() => setGender(g)}
                    style={[styles.genderBtn, { backgroundColor: gender === g ? `${colors.primary}20` : colors.card, borderColor: gender === g ? colors.primary : colors.border, flex: 1 }]}
                  >
                    <Text style={{ color: gender === g ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 13, textTransform: 'capitalize' }}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Step 1 — Body stats */}
        {step === 1 && (
          <Animated.View entering={FadeIn} style={{ gap: 28, paddingTop: 24 }}>
            <View style={{ gap: 8 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Body metrics</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Used to calculate your personalised calorie and macro targets.</Text>
            </View>
            <FieldInput label="AGE" value={age} unit="yrs" onChangeText={setAge} />
            <FieldInput label="BODY WEIGHT" value={weight} unit="kg" onChangeText={setWeight} />
            <FieldInput label="HEIGHT" value={height} unit="cm" onChangeText={setHeight} />
            <View style={{ gap: 10 }}>
              <Text style={styles.label}>ACTIVITY LEVEL</Text>
              {ACTIVITY_LEVELS.map(al => (
                <Pressable key={al.key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActivityLevel(al.key); }}
                  style={[styles.activityRow, { backgroundColor: activityLevel === al.key ? `${colors.primary}15` : colors.card, borderColor: activityLevel === al.key ? colors.primary : colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: activityLevel === al.key ? colors.primary : colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>{al.label}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{al.desc}</Text>
                  </View>
                  {activityLevel === al.key && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Step 2 — Goals */}
        {step === 2 && (
          <Animated.View entering={FadeIn} style={{ gap: 28, paddingTop: 24 }}>
            <View style={{ gap: 8 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Your goals</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Select all that apply. VYTAL ai will prioritise these.</Text>
            </View>
            <View style={styles.chipGrid}>{GOALS.map(g => <Chip key={g} label={g} selected={goals.includes(g)} onPress={() => toggle(goals, g, setGoals)} />)}</View>
          </Animated.View>
        )}

        {/* Step 3 — Injuries */}
        {step === 3 && (
          <Animated.View entering={FadeIn} style={{ gap: 28, paddingTop: 24 }}>
            <View style={{ gap: 8 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Injuries & limitations</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>We'll modify exercises to keep you safe.</Text>
            </View>
            <View style={styles.chipGrid}>{INJURIES.map(i => <Chip key={i} label={i} selected={injuries.includes(i)} onPress={() => toggle(injuries, i, setInjuries)} />)}</View>
          </Animated.View>
        )}

        {/* Step 4 — Equipment */}
        {step === 4 && (
          <Animated.View entering={FadeIn} style={{ gap: 28, paddingTop: 24 }}>
            <View style={{ gap: 8 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Equipment access</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your workouts will be built around what you have.</Text>
            </View>
            <View style={styles.chipGrid}>{EQUIPMENT.map(e => <Chip key={e} label={e} selected={equipment.includes(e)} onPress={() => toggle(equipment, e, setEquipment)} />)}</View>
          </Animated.View>
        )}

        {/* Step 5 — Generating */}
        {step === TOTAL_STEPS - 1 && (
          <Animated.View entering={FadeIn} style={{ alignItems: 'center', gap: 28, paddingTop: 60 }}>
            <View style={[styles.logoWrap, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}33`, width: 110, height: 110, borderRadius: 36 }]}>
              <Ionicons name="flash" size={52} color={colors.primary} />
            </View>
            <View style={{ gap: 10, alignItems: 'center' }}>
              <Text style={[styles.title, { color: colors.foreground, textAlign: 'center' }]}>
                {generating ? `Building your plan${genDots}` : 'Account ready'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: 'center' }]}>
                {generating ? 'VYTAL ai is personalising your experience' : 'Welcome to VYTAL Fitness.'}
              </Text>
            </View>
            {!generating && (
              <Pressable onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.replace('/(tabs)'); }}
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, width: '100%' }]}
              >
                <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 16 }}>Start Training</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
              </Pressable>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* CTA button */}
      {step < TOTAL_STEPS - 1 && (
        <View style={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 64 }}>
          <Pressable onPress={advance}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: canProceed() ? colors.primary : colors.muted, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={{ color: canProceed() ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 16 }}>
              {step === TOTAL_STEPS - 2 ? 'Create Account' : 'Continue'}
            </Text>
            {canProceed() && <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  label: { color: '#607090', fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  logoWrap: { width: 100, height: 100, borderRadius: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  textInput: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Inter_500Medium' },
  inputRow: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  primaryBtn: { height: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryBtn: { height: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  genderBtn: { height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  activityRow: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
