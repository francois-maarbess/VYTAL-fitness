import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BottomSheet, {
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const MIN_HOURS = 0;
const MAX_HOURS = 12;
const STEP = 0.5;

const HOUR_LABELS = [
  "0h", "", "2h", "", "4h", "", "6h", "",
  "8h", "", "10h", "", "12h",
];

export default function MorningProtocolSheet({
  visible,
  onComplete,
  onSkip,
}: {
  visible: boolean;
  onComplete: (hours: number) => void;
  onSkip: () => void;
}) {
  const colors = useColors();
  const sheetRef = useRef<BottomSheet>(null);
  const [hours, setHours] = useState(7.5);
  const [trackWidth, setTrackWidth] = useState(0);
  const lastTickRef = useRef(hours);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      animatingRef.current = false;
      setHours(7.5);
      lastTickRef.current = 7.5;
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const ratio = (hours - MIN_HOURS) / (MAX_HOURS - MIN_HOURS);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gesture) => {
          if (trackWidth <= 0 || animatingRef.current) return;
          const rawRatio = Math.max(0, Math.min(1, gesture.moveX / trackWidth));
          const rawValue = MIN_HOURS + rawRatio * (MAX_HOURS - MIN_HOURS);
          const stepped = Math.round(rawValue / STEP) * STEP;
          const clamped = Math.max(MIN_HOURS, Math.min(MAX_HOURS, stepped));
          if (clamped !== lastTickRef.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            lastTickRef.current = clamped;
          }
          setHours(clamped);
        },
      }),
    [trackWidth],
  );

  const handleLog = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    sheetRef.current?.close();
    setTimeout(() => onComplete(hours), 400);
  }, [hours, onComplete]);

  const handleSkip = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    sheetRef.current?.close();
    setTimeout(() => onSkip(), 400);
  }, [onSkip]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={["55%"]}
        enablePanDownToClose={false}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground, width: 40 }}
        backgroundStyle={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Morning Protocol
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Log your recovery to calculate today's readiness.
          </Text>

          <View style={[styles.sleepSection, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <View style={styles.sleepHeader}>
              <Ionicons name="moon-outline" size={18} color={colors.primary} />
              <Text style={[styles.sleepLabel, { color: colors.foreground }]}>
                Sleep Duration
              </Text>
              <View style={[styles.sleepValueBadge, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}33` }]}>
                <Text style={[styles.sleepValue, { color: colors.primary }]}>{hours}h</Text>
              </View>
            </View>

            <View
              style={styles.trackContainer}
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            >
              <View style={[styles.trackBg, { backgroundColor: colors.border }]} />
              <View
                style={[
                  styles.trackFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${ratio * 100}%` as `${number}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.thumb,
                  {
                    backgroundColor: colors.primary,
                    left: `${ratio * 100}%` as `${number}%`,
                    marginLeft: -14,
                  },
                ]}
                {...panResponder.panHandlers}
              />
            </View>

            <View style={styles.tickLabels}>
              {HOUR_LABELS.map((label, i) => (
                <Text
                  key={i}
                  style={[
                    styles.tickText,
                    {
                      color:
                        i * 1 <= hours
                          ? colors.primary
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {label}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.helpRow}>
            <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
              Drag the slider to set your sleep. 7–9h is optimal.
            </Text>
          </View>

          <Pressable onPress={handleLog} style={[styles.logBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="flash" size={18} color={colors.primaryForeground} />
            <Text style={[styles.logBtnText, { color: colors.primaryForeground }]}>
              Log Recovery
            </Text>
          </Pressable>

          <Pressable onPress={handleSkip} style={[styles.skipBtn, { borderColor: colors.border }]}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
              Skip — I'll log later
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
    lineHeight: 18,
  },
  sleepSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  sleepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sleepLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  sleepValueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  sleepValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  trackContainer: {
    height: 36,
    justifyContent: "center",
    position: "relative",
  },
  trackBg: {
    height: 6,
    borderRadius: 3,
  },
  trackFill: {
    position: "absolute",
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    bottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tickLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  tickText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    width: 28,
    textAlign: "center",
  },
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    marginBottom: 20,
  },
  helpText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  logBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  logBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  skipBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
