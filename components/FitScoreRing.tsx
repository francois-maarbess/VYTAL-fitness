import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  score: number;
  maxScore?: number;
  size?: number;
}

export function FitScoreRing({ score, maxScore = 1000, size = 180 }: Props) {
  const colors = useColors();
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(score / maxScore, 1), {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, maxScore]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const label = score >= 900 ? 'ELITE' : score >= 700 ? 'STRONG' : score >= 500 ? 'ACTIVE' : 'RISING';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Glow effect layer */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth + 6}
          fill="none"
          opacity={0.12}
          strokeDasharray={`${circumference * Math.min(score / maxScore, 1)} ${circumference}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: colors.foreground, fontSize: 42, fontFamily: 'Inter_700Bold', letterSpacing: -1 }}>
          {score.toLocaleString()}
        </Text>
        <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 3 }}>
          {label}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
          FitScore
        </Text>
      </View>
    </View>
  );
}
