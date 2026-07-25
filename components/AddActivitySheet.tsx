import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useWorkoutStore } from '@/stores/workoutStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SUGGESTED = [
  { name: 'Walking', dur: 30, cal: 120 },
  { name: 'Stretching', dur: 15, cal: 40 },
  { name: 'Soccer', dur: 60, cal: 400 },
  { name: 'Cycling', dur: 30, cal: 250 },
  { name: 'Swimming', dur: 30, cal: 300 },
  { name: 'Basketball', dur: 45, cal: 350 },
  { name: 'Yoga', dur: 45, cal: 150 },
  { name: 'Jump Rope', dur: 15, cal: 200 },
  { name: 'Rowing', dur: 20, cal: 200 },
  { name: 'Stair Climber', dur: 20, cal: 180 },
];

export function AddActivitySheet({ visible, onClose }: Props) {
  const colors = useColors();
  const { addCustomActivity } = useWorkoutStore();
  const [name, setName] = useState('');
  const [dur, setDur] = useState('30');
  const [cal, setCal] = useState('100');
  const translateY = useSharedValue(visible ? 0 : 400);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(translateY.value, { damping: 20, stiffness: 200 }) }],
  }));

  React.useEffect(() => {
    translateY.value = visible ? 0 : 400;
  }, [visible]);

  function handleAdd() {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addCustomActivity(
      name.trim(),
      Math.max(1, parseInt(dur, 10) || 30),
      Math.max(0, parseInt(cal, 10) || 100),
    );
    setName('');
    setDur('30');
    setCal('100');
    onClose();
  }

  function handleSuggestion(s: typeof SUGGESTED[0]) {
    setName(s.name);
    setDur(String(s.dur));
    setCal(String(s.cal));
  }

  if (!visible) return null;

  return (
    <View style={sheetStyles.overlay}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      <Animated.View style={[sheetStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }, animStyle]}>
        <View style={sheetStyles.handleRow}>
          <View style={[sheetStyles.handle, { backgroundColor: colors.mutedForeground }]} />
        </View>
        <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 4 }}>Add Activity</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 20 }}>
          Log a free-form activity or exercise
        </Text>

        <View style={[sheetStyles.input, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <TextInput value={name} onChangeText={setName} placeholder="Activity name" placeholderTextColor={colors.mutedForeground} style={{ flex: 1, color: colors.foreground, fontSize: 15, fontFamily: 'Inter_500Medium' }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 }}>DURATION (MIN)</Text>
            <View style={[sheetStyles.input, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput value={dur} onChangeText={setDur} keyboardType="numeric" placeholder="30" placeholderTextColor={colors.mutedForeground} style={{ flex: 1, color: colors.foreground, fontSize: 15, fontFamily: 'Inter_500Medium' }} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 }}>CALORIES</Text>
            <View style={[sheetStyles.input, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput value={cal} onChangeText={setCal} keyboardType="numeric" placeholder="100" placeholderTextColor={colors.mutedForeground} style={{ flex: 1, color: colors.foreground, fontSize: 15, fontFamily: 'Inter_500Medium' }} />
            </View>
          </View>
        </View>

        <View style={{ marginVertical: 16 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginBottom: 10 }}>QUICK ADD</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTED.map(s => (
              <Pressable
                key={s.name}
                onPress={() => handleSuggestion(s)}
                style={[sheetStyles.chip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}44` }]}
              >
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>{s.name}</Text>
                <Text style={{ color: colors.primary, fontSize: 10, fontFamily: 'Inter_400Regular', opacity: 0.7 }}>{s.dur}min</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleAdd}
          style={[sheetStyles.addBtn, { backgroundColor: colors.primary, opacity: name.trim() ? 1 : 0.5 }]}
          disabled={!name.trim()}
        >
          <Ionicons name="add-circle-outline" size={18} color="#000" />
          <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 15 }}>Add Activity</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const sheetStyles = {
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0,
    padding: 20,
    paddingBottom: 40,
    gap: 8,
  },
  handleRow: {
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  input: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: 'row' as const,
    gap: 4,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  addBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    height: 50,
    borderRadius: 14,
  },
};
