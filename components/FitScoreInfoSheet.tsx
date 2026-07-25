import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

const CYAN = '#00F0FF';
const DARK = '#070A12';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function FitScoreInfoSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const translateY = useSharedValue(visible ? 0 : 600);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(translateY.value, { damping: 22, stiffness: 200 }) }],
  }));

  React.useEffect(() => {
    translateY.value = visible ? 0 : 600;
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={sheetStyles.overlay}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      <Animated.View style={[sheetStyles.sheet, { backgroundColor: colors.card }, animStyle]}>
        <View style={sheetStyles.handleRow}>
          <View style={[sheetStyles.handle, { backgroundColor: colors.mutedForeground }]} />
        </View>

        <Text style={{ color: CYAN, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
          The Road to 1,000
        </Text>

        <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20, marginTop: 4 }}>
          Your weekly metric for athletic output, recovery, and habit discipline.
        </Text>

        <View style={[sheetStyles.banner, { backgroundColor: `${CYAN}18`, borderColor: `${CYAN}44` }]}>
          <Text style={{ color: CYAN, fontSize: 15, fontFamily: 'Inter_700Bold', lineHeight: 22 }}>
            🎯 Goal: 1,000 Pts / Week = Peak Consistency & Discipline.
          </Text>
        </View>

        <View style={{ gap: 12, marginTop: 4 }}>
          {[
            { icon: '🏋️', title: 'Workouts & Sports', desc: 'Earn points for gym sessions, basketball, walking, running, or cycling.' },
            { icon: '😴', title: 'Optimal Recovery', desc: 'Earn points for hitting your daily sleep quality and water targets.' },
            { icon: '🔥', title: 'Streak Multipliers', desc: 'Daily active streaks multiply your total score gains.' },
          ].map(pillar => (
            <View key={pillar.title} style={[sheetStyles.pillar, { backgroundColor: `${CYAN}08`, borderColor: `${CYAN}22` }]}>
              <Text style={{ fontSize: 20 }}>{pillar.icon}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{pillar.title}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 }}>{pillar.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); }}
          style={sheetStyles.cta}
        >
          <Text style={{ color: DARK, fontFamily: 'Inter_700Bold', fontSize: 16 }}>Got It</Text>
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
    zIndex: 300,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 18, 0.8)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  handleRow: {
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  banner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  pillar: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cta: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: CYAN,
    marginTop: 4,
  },
};
