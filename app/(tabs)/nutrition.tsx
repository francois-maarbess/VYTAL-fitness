import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';
import { MacroBar } from '@/components/MacroBar';
import { WaterTracker } from '@/components/WaterTracker';
import { SparkLine } from '@/components/SparkLine';
import { Meal } from '@/data/mockData';
import { getApiBaseUrl } from '@/lib/api';

interface NutritionResult {
  isValidFood: boolean;
  foodSummary: string | null;
  items: { name: string; weightGrams: number; macros: { calories: number; protein: number; carbs: number; fat: number } }[];
  macros: { calories: number; protein: number; carbs: number; fat: number };
  message: string;
}

const MEAL_ICONS: Record<Meal['mealType'], keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'nutrition-outline',
};

function MealRow({ meal, onDelete }: { meal: Meal; onDelete: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.mealRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.mealIcon, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name={MEAL_ICONS[meal.mealType]} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>{meal.name}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular', textTransform: 'capitalize' }}>
          {meal.mealType} · {meal.time}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_700Bold' }}>{meal.calories} kcal</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
          P{meal.protein} · C{meal.carbs} · F{meal.fat}
        </Text>
      </View>
      <Pressable onPress={onDelete} style={{ padding: 6 }}>
        <Ionicons name="close-circle-outline" size={20} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function NLPModal({ visible, onClose, onConfirm, getToken }: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: NutritionResult) => void;
  getToken: () => Promise<string | null>;
}) {
  const colors = useColors();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${getApiBaseUrl()}api/nutrition/analyze`, {
        method: 'POST', headers, body: JSON.stringify({ text: text.trim() }),
      });
      const data: NutritionResult = await res.json();
      if (!data.isValidFood) {
        Alert.alert('Hold up!', data.message || 'Please enter a valid food item.');
        return;
      }
      onConfirm(data);
      Alert.alert('Meal Logged! 🎯', `${data.foodSummary}\n+${data.macros.calories} kcal added.`);
      handleClose();
    } catch {
      Alert.alert('Network Error', 'Could not reach VYTAL AI. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() { setText(''); setLoading(false); onClose(); }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flash" size={18} color={colors.primary} />
              <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: 'Inter_700Bold' }}>Log Meal with AI</Text>
            </View>
            <Pressable onPress={handleClose}><Ionicons name="close" size={22} color={colors.mutedForeground} /></Pressable>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 12, lineHeight: 18 }}>
            Describe exactly what you ate — VYTAL AI calculates the macros instantly.
          </Text>
          <View style={[styles.nlpInputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <TextInput
              value={text} onChangeText={setText}
              placeholder='e.g. "500g chicken breast, 200g white rice, side salad"'
              placeholderTextColor={colors.mutedForeground}
              style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 70, textAlignVertical: 'top' }}
              multiline autoFocus
            />
          </View>
          <Pressable onPress={analyze} disabled={!text.trim() || loading}
            style={[styles.analyzeBtn, { backgroundColor: text.trim() && !loading ? colors.primary : colors.muted }]}
          >
            {loading
              ? <ActivityIndicator size="small" color="#000" />
              : <Ionicons name="flash" size={16} color={text.trim() ? '#000' : colors.mutedForeground} />
            }
            <Text style={{ color: text.trim() && !loading ? '#000' : colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 15 }}>
              {loading ? 'Analysing...' : 'Analyse with AI'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Weekly sparkline row ────────────────────────────────────────────────────

function WeeklyMacroSparklines({ data }: { data: { calories: number; protein: number; carbs: number; fat: number }[] }) {
  const colors = useColors();
  if (!data || data.length === 0) return null;

  const macros = [
    { key: 'calories' as const, label: 'Calories', color: colors.primary },
    { key: 'protein' as const, label: 'Protein', color: '#00D4FF' },
    { key: 'carbs' as const, label: 'Carbs', color: colors.secondary },
    { key: 'fat' as const, label: 'Fat', color: colors.accent },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 4 }}>Weekly Trends</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {macros.map(({ key, label, color }) => {
          const values = [...data].reverse().map(d => d[key]);
          const latest = values[values.length - 1] ?? 0;
          const prev = values[values.length - 2] ?? latest;
          const delta = latest - prev;
          return (
            <View key={key} style={{ flex: 1, minWidth: '45%', gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_500Medium' }}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Ionicons
                    name={delta > 0 ? 'trending-up-outline' : delta < 0 ? 'trending-down-outline' : 'remove-outline'}
                    size={12}
                    color={key === 'calories' ? (delta > 0 ? colors.destructive : colors.primary) : (delta > 0 ? colors.primary : colors.mutedForeground)}
                  />
                  <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
                    {delta >= 0 ? '+' : ''}{Math.round(delta)}{key === 'calories' ? '' : 'g'}
                  </Text>
                </View>
              </View>
              <SparkLine data={values.length > 1 ? values : [0, latest]} width={120} height={36} color={color} />
            </View>
          );
        })}
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
        Last {data.length} day{data.length !== 1 ? 's' : ''} of logged data
      </Text>
    </View>
  );
}

export default function NutritionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const {
    nutritionToday, updateNutrition, profile, calorieGoal, bmr,
    sleepHours, setSleepHours, sleepQuality, setSleepQuality,
    stepsToday, setStepsToday, waterMl, addWaterMl, setWaterMl,
    weeklyNutrition,
  } = useUser();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [nlpVisible, setNlpVisible] = useState(false);
  const topPad = Platform.OS === 'web' ? 60 : insets.top;

  const totals = {
    calories: meals.reduce((s, m) => s + m.calories, 0),
    protein: meals.reduce((s, m) => s + m.protein, 0),
    carbs: meals.reduce((s, m) => s + m.carbs, 0),
    fat: meals.reduce((s, m) => s + m.fat, 0),
  };
  const macroTargets = {
    protein: Math.round((calorieGoal * 0.30) / 4),
    carbs: Math.round((calorieGoal * 0.45) / 4),
    fat: Math.round((calorieGoal * 0.25) / 9),
  };

  function handleNlpConfirm(result: { foodSummary: string | null; macros: { calories: number; protein: number; carbs: number; fat: number } }) {
    const now = new Date();
    const h = now.getHours();
    const timeStr = `${h % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    const mealType: Meal['mealType'] = h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
    const meal: Meal = { id: `nlp-${Date.now()}`, name: result.foodSummary ?? 'Meal', time: timeStr, mealType, ...result.macros };
    setMeals(prev => [...prev, meal]);
    updateNutrition(result.macros);
  }

  const bioAge = profile
    ? Math.max(18, Math.min(80, (() => {
        let age = profile.age;
        if (sleepHours >= 7.5) age -= 1;
        if (sleepHours < 6) age += 2;
        if (stepsToday >= 8000) age -= 1;
        if (profile.stressLevel >= 7) age += 2;
        return age;
      })()))
    : null;

  const caloriesPct = Math.min((totals.calories / calorieGoal) * 100, 100);
  const calColor = totals.calories > calorieGoal ? colors.destructive : caloriesPct > 85 ? '#FFB800' : colors.primary;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === 'web' ? 0 : insets.bottom) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ paddingTop: topPad + 16, paddingHorizontal: 20, marginBottom: 20 }}>
        <Text style={{ color: colors.foreground, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>Nutrition</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
      </View>

      {/* Calorie ring + summary */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={[styles.calorieCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 }}>CALORIES TODAY</Text>
              <Text style={{ color: colors.foreground, fontSize: 40, fontFamily: 'Inter_700Bold', letterSpacing: -1, marginTop: 2 }}>
                {totals.calories}
                <Text style={{ color: colors.mutedForeground, fontSize: 18, fontFamily: 'Inter_400Regular', letterSpacing: 0 }}> / {calorieGoal}</Text>
              </Text>
              {profile && <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>BMR {Math.round(bmr)} kcal</Text>}
            </View>
            <View style={[styles.remainBox, { backgroundColor: `${calColor}15`, borderColor: `${calColor}33` }]}>
              <Text style={{ color: calColor, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
                {totals.calories > calorieGoal ? 'OVER' : 'LEFT'}
              </Text>
              <Text style={{ color: calColor, fontSize: 22, fontFamily: 'Inter_700Bold' }}>
                {Math.abs(calorieGoal - totals.calories)}
              </Text>
            </View>
          </View>
          <View style={[styles.bar, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: `${caloriesPct}%` as `${number}%`, backgroundColor: calColor }]} />
          </View>
          {/* Macro mini badges */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Protein', val: totals.protein, color: colors.primary },
              { label: 'Carbs', val: totals.carbs, color: colors.secondary },
              { label: 'Fat', val: totals.fat, color: colors.accent },
            ].map(m => (
              <View key={m.label} style={{ flex: 1, alignItems: 'center', backgroundColor: `${m.color}10`, borderRadius: 8, paddingVertical: 6 }}>
                <Text style={{ color: m.color, fontSize: 14, fontFamily: 'Inter_700Bold' }}>{m.val}g</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_400Regular' }}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Macronutrients */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 4 }}>Macronutrients</Text>
          <MacroBar label="Protein" current={totals.protein} target={macroTargets.protein} color={colors.primary} />
          <MacroBar label="Carbohydrates" current={totals.carbs} target={macroTargets.carbs} color={colors.secondary} />
          <MacroBar label="Fats" current={totals.fat} target={macroTargets.fat} color={colors.accent} />
        </View>
      </View>

      {/* Water Tracker */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <WaterTracker
            waterMl={waterMl}
            onAdd={addWaterMl}
            onRemove={(ml) => setWaterMl(Math.max(0, waterMl - ml))}
          />
        </View>
      </View>

      {/* Daily Inputs — sleep & steps */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 4 }}>Daily Inputs</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Sleep */}
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 }}>SLEEP (hours)</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="moon-outline" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={sleepHours > 0 ? String(sleepHours) : ''}
                  onChangeText={v => { const n = parseFloat(v); if (!isNaN(n) && n >= 0 && n <= 24) setSleepHours(n); else if (v === '' || v === '0') setSleepHours(0); }}
                  keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.mutedForeground}
                  style={{ flex: 1, color: colors.foreground, fontSize: 18, fontFamily: 'Inter_700Bold' }}
                />
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>hrs</Text>
              </View>
              {sleepHours > 0 && (
                <Text style={{ color: sleepHours >= 7 ? colors.primary : sleepHours >= 6 ? '#FFB800' : colors.destructive, fontSize: 11, fontFamily: 'Inter_500Medium' }}>
                  {sleepHours >= 8 ? 'Excellent recovery' : sleepHours >= 7 ? 'Good recovery' : sleepHours >= 6 ? 'Moderate' : 'Low — aim for 7–9h'}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                {(['poor', 'fair', 'good', 'excellent'] as const).map(q => {
                  const active = sleepQuality === q;
                  const qColor = q === 'excellent' ? colors.primary : q === 'good' ? '#00B894' : q === 'fair' ? '#FFB800' : colors.destructive;
                  return (
                    <Pressable key={q} onPress={() => setSleepQuality(active ? null : q)}
                      style={[styles.qualityChip, { backgroundColor: active ? `${qColor}20` : 'transparent', borderColor: active ? qColor : colors.border }]}
                    >
                      <Text style={{ color: active ? qColor : colors.mutedForeground, fontSize: 10, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular', textTransform: 'capitalize' }}>{q}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {/* Steps */}
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 }}>STEPS TODAY</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="footsteps-outline" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={stepsToday > 0 ? String(stepsToday) : ''}
                  onChangeText={v => { const n = parseInt(v.replace(/[^0-9]/g, ''), 10); if (!isNaN(n)) setStepsToday(n); else if (v === '') setStepsToday(0); }}
                  keyboardType="numeric" placeholder="0" placeholderTextColor={colors.mutedForeground}
                  style={{ flex: 1, color: colors.foreground, fontSize: 18, fontFamily: 'Inter_700Bold' }}
                />
              </View>
              {stepsToday > 0 && (
                <Text style={{ color: stepsToday >= 8000 ? colors.primary : '#FFB800', fontSize: 11, fontFamily: 'Inter_500Medium' }}>
                  {stepsToday >= 10000 ? '🎯 Goal reached!' : stepsToday >= 8000 ? '✓ Active' : `${(8000 - stepsToday).toLocaleString()} to goal`}
                </Text>
              )}
              {/* Step quick add */}
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[2000, 5000, 8000].map(s => (
                  <Pressable key={s} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStepsToday(s); }}
                    style={[styles.qualityChip, { backgroundColor: stepsToday === s ? `${colors.secondary}20` : 'transparent', borderColor: stepsToday === s ? colors.secondary : colors.border }]}
                  >
                    <Text style={{ color: stepsToday === s ? colors.secondary : colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_500Medium' }}>{s >= 1000 ? `${s / 1000}k` : s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Today's Meals */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontFamily: 'Inter_700Bold' }}>Today's Meals</Text>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setNlpVisible(true); }}
            style={[styles.logBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={16} color="#000" />
            <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 13 }}>Log with AI</Text>
          </Pressable>
        </View>
        <View style={{ gap: 8 }}>
          {meals.map(m => <MealRow key={m.id} meal={m} onDelete={() => setMeals(prev => prev.filter(x => x.id !== m.id))} />)}
          {meals.length === 0 && (
            <Pressable onPress={() => setNlpVisible(true)}
              style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="restaurant-outline" size={32} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 14 }}>Tap to log your first meal</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }}>AI calculates macros instantly</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Weekly Sparklines */}
      {weeklyNutrition.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <WeeklyMacroSparklines data={weeklyNutrition} />
        </View>
      )}

      {/* Bio Age */}
      {profile && bioAge !== null && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={[styles.bioCard, { backgroundColor: colors.card, borderColor: `${colors.accent}55` }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="pulse-outline" size={20} color={colors.accent} />
              <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: 'Inter_700Bold' }}>Biological Age</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 }}>ACTUAL</Text>
                <Text style={{ color: colors.foreground, fontSize: 36, fontFamily: 'Inter_700Bold', letterSpacing: -1 }}>{profile.age}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.mutedForeground} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 }}>BIOLOGICAL</Text>
                <Text style={{ color: bioAge < profile.age ? colors.primary : colors.destructive, fontSize: 36, fontFamily: 'Inter_700Bold', letterSpacing: -1 }}>{bioAge}</Text>
              </View>
              {bioAge < profile.age && (
                <View style={[styles.ageBadge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_700Bold' }}>-{profile.age - bioAge}yr</Text>
                </View>
              )}
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 }}>
              Estimated from sleep, steps, and stress. Train consistently to reduce it further.
            </Text>
          </View>
        </View>
      )}

      <NLPModal visible={nlpVisible} onClose={() => setNlpVisible(false)} onConfirm={handleNlpConfirm} getToken={getToken} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  calorieCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  remainBox: { borderRadius: 12, borderWidth: 1, padding: 10, alignItems: 'center', minWidth: 70 },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  mealIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', gap: 6, paddingVertical: 32, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  bioCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  ageBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  qualityChip: { flex: 1, paddingVertical: 5, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20 },
  nlpInputWrap: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  analyzeBtn: { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
