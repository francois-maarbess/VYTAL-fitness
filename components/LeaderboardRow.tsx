import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface LeaderboardEntry {
  rank: number;
  userId?: string;
  name: string;
  avatar: string;
  fitScore: number;
  streak: number;
  isCurrentUser: boolean;
  rankDelta?: number;
}

interface Props {
  entry: LeaderboardEntry;
}

const RANK_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

export function LeaderboardRow({ entry }: Props) {
  const colors = useColors();
  const rankColor = RANK_COLORS[entry.rank] ?? colors.mutedForeground;
  const isCurrent = entry.isCurrentUser;

  const glow = useSharedValue(0.3);

  useEffect(() => {
    if (!isCurrent) return;
    glow.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [isCurrent]);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: isCurrent
      ? `rgba(0, 212, 255, ${glow.value})`
      : colors.border,
    shadowColor: isCurrent ? "#00D4FF" : "transparent",
    shadowOpacity: glow.value * 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: isCurrent ? 4 : 0,
  }));

  const rankDelta = entry.rankDelta ?? 0;
  const deltaIcon = rankDelta > 0 ? "arrow-up" : rankDelta < 0 ? "arrow-down" : "remove";
  const deltaColor = rankDelta > 0 ? "#22C55E" : rankDelta < 0 ? "#EF4444" : colors.mutedForeground;

  return (
    <Animated.View
      style={[
        styles.row,
        {
          backgroundColor: isCurrent ? `${colors.primary}12` : colors.card,
        },
        glowStyle,
      ]}
    >
      <View style={{ position: "relative" }}>
        <Text style={[styles.rank, { color: rankColor, fontFamily: "Inter_700Bold" }]}>
          {entry.rank <= 3 ? ["1st", "2nd", "3rd"][entry.rank - 1] : `#${entry.rank}`}
        </Text>
        {isCurrent && (
          <View style={[styles.currentDot, { backgroundColor: colors.primary }]} />
        )}
      </View>

      <View
        style={[
          styles.avatar,
          {
            backgroundColor: isCurrent ? `${colors.primary}33` : colors.muted,
            borderColor: isCurrent ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.avatarText,
            { color: isCurrent ? colors.primary : colors.foreground },
          ]}
        >
          {entry.avatar}
        </Text>
      </View>

      <View style={styles.info}>
        <Text
          style={[
            styles.name,
            { color: isCurrent ? colors.primary : colors.foreground },
          ]}
        >
          {entry.name}
          {isCurrent ? "  (You)" : ""}
        </Text>
        <Text style={[styles.streak, { color: colors.mutedForeground }]}>
          {entry.streak} day streak
        </Text>
      </View>

      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text
          style={[
            styles.score,
            { color: isCurrent ? colors.primary : colors.foreground },
          ]}
        >
          {entry.fitScore.toLocaleString()}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Ionicons name={deltaIcon as any} size={11} color={deltaColor} />
          <Text style={{ color: deltaColor, fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
            {rankDelta !== 0 ? Math.abs(rankDelta) : "—"}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  rank: {
    width: 34,
    fontSize: 12,
    textAlign: "center",
  },
  currentDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  streak: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  score: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
