import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CENTER_X = SCREEN_W / 2;
const CENTER_Y = SCREEN_H / 2;

const RING_COUNT = 5;
const PARTICLE_COUNT = 16;

interface RingProps {
  anim: Animated.Value;
  index: number;
  color: string;
}

function Ring({ anim, index, color }: RingProps) {
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 3 + index * 0.8],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [1, 0.6, 0],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2.5,
        borderColor: color,
        left: CENTER_X - 30,
        top: CENTER_Y - 30,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

interface ParticleProps {
  anim: Animated.Value;
  angle: number;
  distance: number;
  color: string;
}

function Particle({ anim, angle, distance, color }: ParticleProps) {
  const rad = (angle * Math.PI) / 180;
  const tx = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(rad) * distance],
  });
  const ty = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(rad) * distance],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0.8, 0],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        left: CENTER_X - 3,
        top: CENTER_Y - 3,
        opacity,
        transform: [{ translateX: tx }, { translateY: ty }, { scale }],
      }}
    />
  );
}

export default function SupernovaUnlock({
  visible,
  onComplete,
}: {
  visible: boolean;
  onComplete: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const colors = ["#00D4FF", "#0061FF", "#7C3AED", "#00F5D4", "#4A9EFF"];

  useEffect(() => {
    if (!visible) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => onComplete(), 400);
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.backdrop} />

      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <Ring key={`ring-${i}`} anim={anim} index={i} color={colors[i % colors.length]} />
      ))}

      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (360 / PARTICLE_COUNT) * i + Math.random() * 15;
        const dist = 100 + Math.random() * 160;
        return (
          <Particle
            key={`p-${i}`}
            anim={anim}
            angle={angle}
            distance={dist}
            color={colors[i % colors.length]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
});
