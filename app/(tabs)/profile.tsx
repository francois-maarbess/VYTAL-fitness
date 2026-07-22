import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@clerk/clerk-expo";
import { AchievementBadge } from "@/components/AchievementBadge";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { FitScoreRing } from "@/components/FitScoreRing";
import SupernovaUnlock from "@/components/SupernovaUnlock";

const PREMIUM_FEATURES = [
  "Unlimited VYTAL ai coaching",
  "Advanced body composition analysis",
  "Personalised longevity protocols",
  "Priority plan regeneration",
  "DNA-based nutrition insights",
  "Premium workout library (200+)",
];

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

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  fitScore: number;
  streak: number;
  isCurrentUser: boolean;
  rankDelta: number;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, fitScore, streak, totalWorkouts, level, xp, resetUser, readinessScore, sleepHours } = useUser();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"achievements" | "leaderboard">("achievements");
  const [achievements, setAchievements] = useState<TieredAchievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [supernovaVisible, setSupernovaVisible] = useState(false);
  const topPad = Platform.OS === "web" ? 60 : insets.top;

  const fetchAchievements = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("http://192.168.1.7:8080/api/achievements/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          totalWorkouts,
          streak,
          level,
          nutritionLogDays: Math.min(Math.floor(totalWorkouts / 2), 7),
          morningWorkouts: Math.min(Math.floor(totalWorkouts / 3), 10),
          appDays: Math.min(streak, 30),
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setAchievements(data.all);
      if (data.newlyUnlocked && data.newlyUnlocked.length > 0) {
        setSupernovaVisible(true);
      }
    } catch {
      // Use local calculation as fallback
      const local: TieredAchievement[] = [
        { id: "first-workout", name: "First Step", description: "Complete your first workout", icon: "star-outline", iconColor: "#FFD700", tier: totalWorkouts >= 50 ? "gold" : totalWorkouts >= 10 ? "silver" : totalWorkouts >= 1 ? "bronze" : null, unlocked: totalWorkouts >= 1, progress: Math.min(totalWorkouts, 50), total: 50 },
        { id: "week-streak", name: "7-Day Warrior", description: "Maintain a 7-day streak", icon: "flame-outline", iconColor: "#FF6B35", tier: streak >= 30 ? "gold" : streak >= 7 ? "silver" : streak >= 3 ? "bronze" : null, unlocked: streak >= 3, progress: Math.min(streak, 30), total: 30 },
        { id: "century", name: "Centurion", description: "Complete 100 workouts", icon: "trophy-outline", iconColor: "#C0C0C0", tier: totalWorkouts >= 100 ? "gold" : totalWorkouts >= 50 ? "silver" : totalWorkouts >= 25 ? "bronze" : null, unlocked: totalWorkouts >= 25, progress: Math.min(totalWorkouts, 100), total: 100 },
        { id: "iron", name: "Iron Will", description: "30-day streak", icon: "shield-outline", iconColor: "#7C3AED", tier: streak >= 30 ? "gold" : streak >= 14 ? "silver" : streak >= 7 ? "bronze" : null, unlocked: streak >= 7, progress: Math.min(streak, 30), total: 30 },
        { id: "nutrition-week", name: "Fuel Master", description: "Log meals for 7 days straight", icon: "restaurant-outline", iconColor: "#00C4FF", tier: sleepHours > 0 ? "bronze" : null, unlocked: sleepHours > 0, progress: sleepHours > 0 ? 1 : 0, total: 7 },
        { id: "early-bird", name: "Early Bird", description: "Complete 10 morning workouts", icon: "sunny-outline", iconColor: "#FFB800", tier: null, unlocked: false, progress: 0, total: 10 },
        { id: "level-5", name: "Level Up", description: "Reach Level 5", icon: "ribbon-outline", iconColor: "#00D4FF", tier: level >= 5 ? "gold" : level >= 3 ? "silver" : level >= 2 ? "bronze" : null, unlocked: level >= 2, progress: Math.min(level, 5), total: 5 },
        { id: "longevity", name: "Longevity Mode", description: "Use the app for 30 days", icon: "heart-outline", iconColor: "#FF4D4D", tier: streak >= 30 ? "gold" : streak >= 14 ? "silver" : streak >= 7 ? "bronze" : null, unlocked: streak >= 7, progress: Math.min(streak, 30), total: 30 },
      ];
      setAchievements(local);
    }
  }, [totalWorkouts, streak, level, sleepHours, getToken]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const token = await getToken();
      const params = new URLSearchParams({
        userName: profile?.name || "You",
        fitScore: String(fitScore),
        streak: String(streak),
      });
      const res = await fetch(`http://192.168.1.7:8080/api/leaderboard?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setLeaderboard(data.entries);
    } catch {
      setLeaderboard([]);
    }
  }, [profile, fitScore, streak, getToken]);

  useEffect(() => {
    if (activeTab === "achievements") fetchAchievements();
    if (activeTab === "leaderboard") fetchLeaderboard();
  }, [activeTab, fetchAchievements, fetchLeaderboard]);

  if (!profile) return null;

  const xpToNext = 500;
  const xpInLevel = xp % xpToNext;
  const xpPct = xpInLevel / xpToNext;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === "web" ? 0 : insets.bottom) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.profileHeader, { paddingTop: topPad + 20 }]}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}55` }]}>
            <Text style={{ color: colors.primary, fontSize: 32, fontFamily: "Inter_700Bold" }}>
              {profile.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={{ color: colors.foreground, fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.3 }}>{profile.name}</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <View style={[styles.badge, { backgroundColor: `${colors.secondary}20`, borderColor: `${colors.secondary}44` }]}>
              <Ionicons name="star-outline" size={12} color={colors.secondary} />
              <Text style={{ color: colors.secondary, fontSize: 12, fontFamily: "Inter_700Bold" }}>Level {level}</Text>
            </View>
            {profile.goals[0] && (
              <View style={[styles.badge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}33` }]}>
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{profile.goals[0]}</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}33` }]}>
              <Ionicons name="pulse-outline" size={12} color={colors.accent} />
              <Text style={{ color: colors.accent, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Readiness {readinessScore}</Text>
            </View>
          </View>
          {/* XP bar */}
          <View style={{ width: "100%", paddingHorizontal: 20, gap: 5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>Level {level}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>{xpInLevel}/{xpToNext} XP</Text>
            </View>
            <View style={[styles.xpBg, { backgroundColor: colors.border }]}>
              <View style={[styles.xpFill, { width: `${xpPct * 100}%` as `${number}%`, backgroundColor: colors.secondary }]} />
            </View>
          </View>
        </View>

        {/* FitScore */}
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <FitScoreRing score={fitScore} size={160} />
        </View>

        {/* Stats */}
        <View style={{ paddingHorizontal: 20, flexDirection: "row", gap: 10, marginBottom: 24 }}>
          {[
            { icon: "flame-outline", label: "Streak", value: `${streak}d`, color: "#FF6B35" },
            { icon: "barbell-outline", label: "Workouts", value: totalWorkouts, color: colors.primary },
            { icon: "ribbon-outline", label: "Level", value: level, color: colors.secondary },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={s.icon as any} size={18} color={s.color as string} />
              <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: "Inter_700Bold" }}>{s.value}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(["achievements", "leaderboard"] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab); }}
                style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }]}
              >
                <Text
                  style={{
                    color: activeTab === tab ? colors.primaryForeground : colors.mutedForeground,
                    fontFamily: activeTab === tab ? "Inter_700Bold" : "Inter_500Medium",
                    fontSize: 13,
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {activeTab === "achievements" && (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={styles.achieveGrid}>
              {achievements.map((a) => (
                <View key={a.id} style={{ flex: 1, minWidth: "45%" }}>
                  <AchievementBadge achievement={a} />
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === "leaderboard" && (
          <View style={{ paddingHorizontal: 20, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold" }}>Global Rankings</Text>
              <Pressable onPress={fetchLeaderboard}>
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
              </Pressable>
            </View>
            {leaderboard.length > 0 ? (
              leaderboard.map((entry) => <LeaderboardRow key={entry.rank} entry={entry} />)
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 30, gap: 8 }}>
                <Ionicons name="trophy-outline" size={36} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
                  Connect to see live rankings
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Premium card */}
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: `${colors.secondary}66` }]}>
            <View style={{ gap: 4, marginBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="flash" size={18} color={colors.secondary} />
                <Text style={{ color: colors.secondary, fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1.5 }}>VYTAL PREMIUM</Text>
              </View>
              <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: "Inter_700Bold" }}>Unlock Your Full Potential</Text>
            </View>
            {PREMIUM_FEATURES.map((f) => (
              <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular" }}>{f}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={[styles.planCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium" }}>MONTHLY</Text>
                <Text style={{ color: colors.foreground, fontSize: 22, fontFamily: "Inter_700Bold" }}>$19.99</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_400Regular" }}>per month</Text>
              </View>
              <View style={[styles.planCard, { backgroundColor: `${colors.secondary}20`, borderColor: colors.secondary }]}>
                <Text style={{ color: colors.secondary, fontSize: 10, fontFamily: "Inter_500Medium" }}>ANNUAL — BEST VALUE</Text>
                <Text style={{ color: colors.foreground, fontSize: 22, fontFamily: "Inter_700Bold" }}>$149</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_400Regular" }}>$12.42/month</Text>
              </View>
            </View>
            <Pressable
              onPress={() => Alert.alert("VYTAL Premium", "In-app purchase coming soon.")}
              style={({ pressed }) => [styles.upgradeBtn, { backgroundColor: colors.secondary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="flash" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>Upgrade to Premium</Text>
            </Pressable>
          </View>
        </View>

        {/* Reset */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Pressable
            onPress={() =>
              Alert.alert("Reset App", "This clears all data and restarts onboarding.", [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: resetUser },
              ])
            }
            style={{ alignItems: "center", paddingVertical: 12 }}
          >
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>Reset & restart onboarding</Text>
          </Pressable>
        </View>
      </ScrollView>

      <SupernovaUnlock visible={supernovaVisible} onComplete={() => setSupernovaVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { alignItems: "center", paddingBottom: 16, gap: 10 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  xpBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 3 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: "center", gap: 4 },
  tabBar: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  achieveGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  premiumCard: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  planCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  upgradeBtn: { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
