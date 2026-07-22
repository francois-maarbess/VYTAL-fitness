import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

const PIN_LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
};

export default function OtpInput({ value, onChange, onComplete }: OtpInputProps) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);

  const shake = () => {
    shakeX.value = withRepeat(withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(0, { duration: 50 })), 1);
  };

  const shakeAnim = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, PIN_LENGTH);
    onChange(cleaned);
    if (cleaned.length === PIN_LENGTH) {
      onComplete?.(cleaned);
    }
  };

  const handleKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }) => {
    if (nativeEvent.key === "Backspace" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const boxes: string[] = [];
  for (let i = 0; i < PIN_LENGTH; i++) {
    boxes.push(value[i] ?? "");
  }

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <Animated.View style={[styles.row, shakeAnim]}>
        {boxes.map((digit, i) => (
          <View
            key={i}
            style={[
              styles.box,
              {
                backgroundColor: colors.muted,
                borderColor: i === value.length && value.length < PIN_LENGTH ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.digit, { color: colors.foreground }]}>{digit}</Text>
          </View>
        ))}
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onKeyPress={handleKeyPress}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={PIN_LENGTH}
        style={styles.hiddenInput}
        autoFocus
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, justifyContent: "center" },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
});
