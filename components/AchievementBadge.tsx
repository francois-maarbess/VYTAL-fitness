import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface TieredAchievement {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tier: "bronze" | "silver" | "gold" | null;
  unlocked: boolean;
  progress: number;
  total: number;
}

interface Props {
  achievement: TieredAchievement;
}

const TIER_META: Record<string, { label: string; borderColor: string; bgTint: string }> = {
  bronze: { label: "BRONZE", borderColor: "#CD7F32", bgTint: "#CD7F3222" },
  silver: { label: "SILVER", borderColor: "#C0C0C0", bgTint: "#C0C0C022" },
  gold: { label: "GOLD", borderColor: "#FFD700", bgTint: "#FFD70022" },
};

export function AchievementBadge({ achievement }: Props) {
  const colors = useColors();
  const pct = achievement.total > 0 ? achievement.progress / achievement.total : 0;
  const tierInfo = achievement.tier ? TIER_META[achievement.tier] : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: achievement.unlocked && tierInfo ? tierInfo.borderColor : colors.border,
          opacity: achievement.unlocked ? 1 : 0.55,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: tierInfo ? tierInfo.bgTint : `${achievement.iconColor}22`,
            borderColor: tierInfo ? tierInfo.borderColor : `${achievement.iconColor}44`,
          },
        ]}
      >
        <Ionicons
          name={achievement.icon}
          size={22}
          color={achievement.unlocked ? achievement.iconColor : colors.mutedForeground}
        />
      </View>

      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
        {achievement.name}
      </Text>

      <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {achievement.description}
      </Text>

      {tierInfo && (
        <View style={[styles.tierBadge, { backgroundColor: tierInfo.bgTint, borderColor: tierInfo.borderColor }]}>
          <Text style={[styles.tierText, { color: tierInfo.borderColor }]}>{tierInfo.label}</Text>
        </View>
      )}

      {!achievement.unlocked && (
        <View style={styles.progressRow}>
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${pct * 100}%` as `${number}%`, backgroundColor: achievement.iconColor },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            {achievement.progress}/{achievement.total}
          </Text>
        </View>
      )}

      {achievement.unlocked && tierInfo && (
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text style={[styles.unlockedText, { color: tierInfo.borderColor }]}>UNLOCKED</Text>
          {achievement.tier === "gold" && (
            <Text style={{ fontSize: 16 }}>🏆</Text>
          )}
          {achievement.tier === "silver" && (
            <Text style={{ fontSize: 14 }}>🥈</Text>
          )}
          {achievement.tier === "bronze" && (
            <Text style={{ fontSize: 14 }}>🥉</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    alignItems: "center",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  desc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 15,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  progressRow: {
    width: "100%",
    gap: 4,
    alignItems: "center",
  },
  progressBg: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  unlockedText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
