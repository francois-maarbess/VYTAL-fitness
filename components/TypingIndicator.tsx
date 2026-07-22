import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

function Dot({ delay }: { delay: number }) {
  const colors = useColors();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 350 }), withTiming(0.3, { duration: 350 })),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.dot, style, { backgroundColor: colors.primary }]} />
  );
}

export function TypingIndicator() {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Dot delay={0} />
      <Dot delay={200} />
      <Dot delay={400} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginLeft: 54,
    marginBottom: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
