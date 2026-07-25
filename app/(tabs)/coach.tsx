import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { TodayWorkoutModification, useUser } from '@/context/UserContext';
import { ChatBubble } from '@/components/ChatBubble';
import { TypingIndicator } from '@/components/TypingIndicator';
import { getApiBaseUrl } from '@/lib/api';
import { Workout, WORKOUTS } from '@/data/mockData';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const MessageRow = memo(({ item }: { item: Message }) => <ChatBubble message={item} />);

let msgCounter = 0;
function uid(): string {
  msgCounter++;
  return `m-${Date.now()}-${msgCounter}`;
}

const QUICK_PROMPTS = [
  'Weekly plan',
  'Post-workout meal',
  'Shoulder-safe session',
  'Improve sleep',
  'No-equipment workout',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'I am VYTAL ai, your performance coach. Tell me the target: strength, fat loss, conditioning, mobility, or recovery.',
};

const COMMAND_PATTERN = /\[(?:RESET_MACROS|SET_SLEEP:[\d.]+|SET_STEPS:\d+|ADD_CALORIES:\d+|ADD_PROTEIN:\d+|ADD_CARBS:\d+|ADD_FAT:\d+)\]/g;

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const {
    profile,
    streak,
    totalWorkouts,
    weeklySchedule,
    workoutIntent,
    setWeeklySchedule,
    modifyTodaysWorkout,
    nutritionToday,
    sleepHours,
    sleepQuality,
    stepsToday,
    readinessScore,
    tdee,
    bmr,
    setSleepHours,
    setStepsToday,
    resetNutrition,
    updateNutrition,
  } = useUser();

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [planApplied, setPlanApplied] = useState(false);
  const [workoutModified, setWorkoutModified] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const abortRef = useRef<AbortController | null>(null);

  const topPad = Platform.OS === 'web' ? 60 : insets.top;
  const botPad = Platform.OS === 'web' ? 16 : insets.bottom;
  const reversed = useMemo(() => [...messages].reverse(), [messages]);

  const applyCommands = useCallback(async (fullContent: string) => {
    if (fullContent.includes('[RESET_MACROS]')) await resetNutrition();

    const sleepMatch = fullContent.match(/\[SET_SLEEP:([\d.]+)\]/);
    if (sleepMatch) await setSleepHours(parseFloat(sleepMatch[1]));

    const stepsMatch = fullContent.match(/\[SET_STEPS:(\d+)\]/);
    if (stepsMatch) await setStepsToday(parseInt(stepsMatch[1], 10));

    for (const m of fullContent.matchAll(/\[ADD_CALORIES:(\d+)\]/g)) {
      await updateNutrition({ calories: parseInt(m[1], 10), protein: 0, carbs: 0, fat: 0 });
    }
    for (const m of fullContent.matchAll(/\[ADD_PROTEIN:(\d+)\]/g)) {
      await updateNutrition({ calories: 0, protein: parseInt(m[1], 10), carbs: 0, fat: 0 });
    }
    for (const m of fullContent.matchAll(/\[ADD_CARBS:(\d+)\]/g)) {
      await updateNutrition({ calories: 0, protein: 0, carbs: parseInt(m[1], 10), fat: 0 });
    }
    for (const m of fullContent.matchAll(/\[ADD_FAT:(\d+)\]/g)) {
      await updateNutrition({ calories: 0, protein: 0, carbs: 0, fat: parseInt(m[1], 10) });
    }
  }, [resetNutrition, setSleepHours, setStepsToday, updateNutrition]);

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setInput('');
    setPlanApplied(false);
    setWorkoutModified(false);

    const userMsg: Message = { id: uid(), role: 'user', content: trimmed };
    const historySnapshot = [...messages.filter(m => m.id !== 'welcome'), userMsg];
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    const userProfile = profile
      ? {
          name: profile.name,
          age: profile.age,
          weight: profile.weight,
          height: profile.height,
          gender: profile.gender,
          goals: profile.goals,
          injuries: profile.injuries,
          equipment: profile.equipment,
          activityLevel: profile.activityLevel,
          streak,
          totalWorkouts,
          nutritionToday,
          sleepHours,
          stepsToday,
          readinessScore,
          tdee,
          bmr,
          caloriesConsumed: nutritionToday.calories,
          protein: nutritionToday.protein,
          carbs: nutritionToday.carbs,
          fat: nutritionToday.fat,
          sleepQuality: sleepQuality ?? 'not rated',
        }
      : undefined;
    const todayName = DAY_NAMES[new Date().getDay()];
    const todayWorkout = weeklySchedule?.[todayName] ?? WORKOUTS[new Date().getDay() % WORKOUTS.length];

    abortRef.current = new AbortController();

    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}api/coach/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: historySnapshot.map(m => ({ role: m.role, content: m.content })),
          userProfile,
          workoutIntent,
          todayWorkout,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const raw = await response.text();
      let fullContent = '';
      const assistantId = uid();
      let addedAssistant = false;

      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data) as {
            type?: string;
            content?: string;
            plan?: Record<string, Workout>;
            modification?: TodayWorkoutModification;
          };
          if (parsed.type === 'text' && parsed.content) {
            fullContent += parsed.content;
            const cleanContent = fullContent.replace(COMMAND_PATTERN, '').trim();
            setMessages(prev => {
              if (!addedAssistant) {
                addedAssistant = true;
                return [...prev, { id: assistantId, role: 'assistant', content: cleanContent }];
              }
              return prev.map(m => (m.id === assistantId ? { ...m, content: cleanContent } : m));
            });
          } else if (parsed.type === 'workout_plan' && parsed.plan) {
            await setWeeklySchedule(parsed.plan);
            setPlanApplied(true);
          } else if (parsed.type === 'workout_modification' && parsed.modification) {
            await modifyTodaysWorkout(parsed.modification);
            setWorkoutModified(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch {}
      }

      if (fullContent) await applyCommands(fullContent);
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: 'Connection issue. Check your network and retry.' }]);
      }
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [applyCommands, bmr, getToken, isStreaming, messages, modifyTodaysWorkout, nutritionToday, profile, readinessScore, setWeeklySchedule, sleepHours, sleepQuality, stepsToday, streak, tdee, totalWorkouts, weeklySchedule, workoutIntent]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
          <Ionicons name="flash" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>VYTAL ai</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
            <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'Inter_400Regular' }}>Performance coach</Text>
          </View>
        </View>
        {isStreaming && (
          <Pressable onPress={() => abortRef.current?.abort()} style={styles.stopButton}>
            <Ionicons name="stop-circle-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {planApplied && (
        <View style={[styles.planBanner, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 }}>
            Weekly plan saved to Workout
          </Text>
        </View>
      )}

      {workoutModified && (
        <View style={[styles.planBanner, { backgroundColor: `${colors.secondary}20`, borderColor: `${colors.secondary}44` }]}>
          <Ionicons name="sparkles" size={16} color={colors.secondary} />
          <Text style={{ color: colors.secondary, fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 }}>
            Today's workout updated
          </Text>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <FlatList
          data={reversed}
          keyExtractor={m => m.id}
          inverted
          renderItem={({ item }) => <MessageRow item={item} />}
          contentContainerStyle={styles.messageList}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS !== 'web'}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={7}
        />

        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptRow} style={styles.promptScroller}>
            {QUICK_PROMPTS.map(p => (
              <Pressable
                key={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleSend(p);
                }}
                style={({ pressed }) => [
                  styles.promptChip,
                  {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderColor: pressed ? `${colors.primary}77` : 'rgba(255,255,255,0.1)',
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { borderTopColor: colors.border, paddingBottom: Math.max(botPad, 16) }]}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about training, nutrition, recovery..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              handleSend(input);
              inputRef.current?.focus();
            }}
          />
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleSend(input);
              inputRef.current?.focus();
            }}
            disabled={!input.trim() || isStreaming}
            style={[
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !isStreaming ? colors.primary : colors.muted,
                borderColor: input.trim() && !isStreaming ? colors.primary : colors.border,
              },
            ]}
          >
            <Ionicons name="arrow-up" size={22} color={input.trim() && !isStreaming ? colors.primaryForeground : colors.mutedForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  stopButton: { padding: 6 },
  planBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  messageList: { paddingVertical: 12 },
  promptScroller: { flexShrink: 0, maxHeight: 48 },
  promptRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8, alignItems: 'center' },
  promptChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, flexShrink: 0, minHeight: 34, justifyContent: 'center' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, gap: 10, borderTopWidth: 1 },
  textInput: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: 'Inter_400Regular', maxHeight: 110 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
