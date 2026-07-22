import React, { useRef, useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';
import { ChatBubble } from '@/components/ChatBubble';
import { TypingIndicator } from '@/components/TypingIndicator';
import { getApiBaseUrl } from '@/lib/api';
import { Workout } from '@/data/mockData';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

let msgCounter = 0;
function uid(): string {
  msgCounter++;
  return `m-${Date.now()}-${msgCounter}`;
}

const QUICK_PROMPTS = [
  'Make me a weekly training plan',
  'What should I eat post-workout?',
  'I have a shoulder injury — what can I do?',
  'How do I improve sleep quality?',
  'Build me a home workout with no equipment',
];

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi, I'm VYTAL ai — your personal fitness and longevity coach. I know your goals, plan, and current stats. What can I help you with today?",
};

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, streak, totalWorkouts, setWeeklySchedule, nutritionToday, sleepHours, sleepQuality, stepsToday, readinessScore, tdee, bmr, setSleepHours, setStepsToday, resetNutrition, updateNutrition } = useUser();

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [planApplied, setPlanApplied] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const abortRef = useRef<AbortController | null>(null);

  const topPad = Platform.OS === 'web' ? 60 : insets.top;
  const botPad = Platform.OS === 'web' ? 16 : insets.bottom;

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    setPlanApplied(false);

    const userMsg: Message = { id: uid(), role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    const chatHistory = [
      ...messages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: trimmed },
    ];

    const userProfile = profile
      ? {
          name: profile.name, age: profile.age, weight: profile.weight, height: profile.height,
          gender: profile.gender, goals: profile.goals, injuries: profile.injuries,
          equipment: profile.equipment, activityLevel: profile.activityLevel,
          streak, totalWorkouts,
          // Live daily state
          nutritionToday, sleepHours, stepsToday, readinessScore, tdee, bmr,
          caloriesConsumed: nutritionToday.calories,
          protein: nutritionToday.protein, carbs: nutritionToday.carbs, fat: nutritionToday.fat,
          sleepQuality: sleepQuality ?? 'not rated',
        }
      : undefined;

    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${getApiBaseUrl()}api/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory, userProfile }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
      }

      const raw = await response.text();
      let fullContent = '';
      let assistantId = uid();
      let addedAssistant = false;

      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data) as { type?: string; content?: string; plan?: Record<string, unknown> };
          if (parsed.type === 'text' && parsed.content) {
            fullContent += parsed.content;
            if (!addedAssistant) {
              setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: fullContent }]);
              addedAssistant = true;
            } else {
              setMessages(prev => {
                const updated = [...prev];
                const idx = updated.findIndex(m => m.id === assistantId);
                if (idx !== -1) updated[idx] = { ...updated[idx], content: fullContent };
                return updated;
              });
            }
          } else if (parsed.type === 'workout_plan' && parsed.plan) {
            await setWeeklySchedule(parsed.plan as Record<string, Workout>);
            setPlanApplied(true);
          }
        } catch {}
      }

      // Stream ended — process write-back commands in logical order
      if (fullContent) {
        // 1. Resets first
        if (fullContent.includes('[RESET_MACROS]')) {
          await resetNutrition();
        }
        // 2. Set operations
        const sleepMatch = fullContent.match(/\[SET_SLEEP:([\d.]+)\]/);
        if (sleepMatch) await setSleepHours(parseFloat(sleepMatch[1]));
        const stepsMatch = fullContent.match(/\[SET_STEPS:(\d+)\]/);
        if (stepsMatch) await setStepsToday(parseInt(stepsMatch[1]));
        // 3. Add operations (multiple allowed)
        const addCalMatches = [...fullContent.matchAll(/\[ADD_CALORIES:(\d+)\]/g)];
        for (const m of addCalMatches) await updateNutrition({ calories: parseInt(m[1]), protein: 0, carbs: 0, fat: 0 });
        const addProtMatches = [...fullContent.matchAll(/\[ADD_PROTEIN:(\d+)\]/g)];
        for (const m of addProtMatches) await updateNutrition({ calories: 0, protein: parseInt(m[1]), carbs: 0, fat: 0 });
        const addCarbMatches = [...fullContent.matchAll(/\[ADD_CARBS:(\d+)\]/g)];
        for (const m of addCarbMatches) await updateNutrition({ calories: 0, protein: 0, carbs: parseInt(m[1]), fat: 0 });
        const addFatMatches = [...fullContent.matchAll(/\[ADD_FAT:(\d+)\]/g)];
        for (const m of addFatMatches) await updateNutrition({ calories: 0, protein: 0, carbs: 0, fat: parseInt(m[1]) });

        // Update final message with clean content
        const cleanContent = fullContent.replace(/\[(?:RESET_MACROS|SET_SLEEP:[\d.]+|SET_STEPS:\d+|ADD_CALORIES:\d+|ADD_PROTEIN:\d+|ADD_CARBS:\d+|ADD_FAT:\d+)\]/g, '').trim();
        if (addedAssistant) {
          setMessages(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(m => m.id === assistantId);
            if (idx !== -1) updated[idx] = { ...updated[idx], content: cleanContent };
            return updated;
          });
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') { setIsStreaming(false); setShowTyping(false); return; }
      setShowTyping(false);
      const msg = (err as Error)?.message ?? 'unknown error';
      console.error("[Auth] coach chat error:", msg);
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: `⚠️ ${msg}. Make sure the API server is running (npm run start:all).` }]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }

  const reversed = [...messages].reverse();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
          <Ionicons name="flash" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>VYTAL ai</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
            <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'Inter_400Regular' }}>Online — context-aware</Text>
          </View>
        </View>
        {isStreaming && (
          <Pressable onPress={() => abortRef.current?.abort()} style={{ padding: 6 }}>
            <Ionicons name="stop-circle-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Plan applied banner */}
      {planApplied && (
        <View style={[styles.planBanner, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}44` }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 }}>
            Weekly plan saved to your Workout tab
          </Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <FlatList
          data={reversed}
          keyExtractor={m => m.id}
          inverted
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={{ paddingVertical: 12 }}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* Quick prompts — tiny pills */}
        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 4 }}
            style={{ flexShrink: 0 }}
          >
            {QUICK_PROMPTS.map(p => (
              <Pressable key={p} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSend(p); }}
                style={[styles.promptChip, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}
              >
                <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'Inter_500Medium' }}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
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
            onSubmitEditing={() => { handleSend(input); inputRef.current?.focus(); }}
          />
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSend(input); inputRef.current?.focus(); }}
            disabled={!input.trim() || isStreaming}
            style={[styles.sendBtn, { backgroundColor: input.trim() && !isStreaming ? colors.primary : colors.muted, borderWidth: 1.5, borderColor: input.trim() && !isStreaming ? colors.primary : colors.border }]}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  planBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  promptChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, borderWidth: 1, flexShrink: 0 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, gap: 10, borderTopWidth: 1 },
  textInput: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: 'Inter_400Regular', maxHeight: 110 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
