import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

const WATER_GOAL_ML = 2500;
const QUICK_ADD = [250, 500, 750];

interface Props {
  waterMl: number;
  onAdd: (ml: number) => void;
  onRemove: (ml: number) => void;
}

export function WaterTracker({ waterMl, onAdd, onRemove }: Props) {
  const colors = useColors();
  const pct = Math.min(waterMl / WATER_GOAL_ML, 1);
  const fillAnim = useRef(new Animated.Value(pct)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: pct,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  function handleAdd(ml: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Pulse animation
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    onAdd(ml);
  }

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const waterColor = pct >= 1 ? colors.primary : pct >= 0.6 ? '#0090CC' : '#0061FF';
  const remaining = Math.max(0, WATER_GOAL_ML - waterMl);
  const glasses = Math.round(waterMl / 250);

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="water" size={18} color={waterColor} />
          <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: 'Inter_700Bold' }}>Hydration</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {waterMl > 0 && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRemove(250); }}
              style={[styles.minusBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="remove" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
          <View style={[styles.badge, { backgroundColor: `${waterColor}20`, borderColor: `${waterColor}44` }]}>
            <Text style={{ color: waterColor, fontSize: 12, fontFamily: 'Inter_700Bold' }}>
              {pct >= 1 ? '🎯 Goal!' : `${remaining}ml left`}
            </Text>
          </View>
        </View>
      </View>

      {/* Main fill visual */}
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        {/* Bottle visual */}
        <Animated.View style={[styles.bottleWrap, { transform: [{ scale: pulseAnim }] }]}>
          <View style={[styles.bottle, { borderColor: `${waterColor}55`, backgroundColor: colors.muted }]}>
            {/* Fill */}
            <Animated.View
              style={[
                styles.bottleFill,
                { height: fillHeight, backgroundColor: waterColor, opacity: 0.85 },
              ]}
            />
            {/* Wave overlay */}
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' }}>
                {Math.round(pct * 100)}%
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                {(waterMl / 1000).toFixed(1)}L
              </Text>
            </View>
          </View>
          {/* Bottle cap */}
          <View style={[styles.bottleCap, { backgroundColor: `${waterColor}55` }]} />
        </Animated.View>

        {/* Stats */}
        <View style={{ flex: 1, gap: 10 }}>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_500Medium' }}>Progress</Text>
              <Text style={{ color: waterColor, fontSize: 11, fontFamily: 'Inter_700Bold' }}>
                {waterMl}ml / {WATER_GOAL_ML}ml
              </Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: waterColor,
                    width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  },
                ]}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={[styles.statPill, { backgroundColor: colors.muted }]}>
              <Ionicons name="wine-outline" size={12} color={colors.mutedForeground} />
              <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{glasses}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_400Regular' }}>glasses</Text>
            </View>
          </View>
          {/* Quick-add buttons */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {QUICK_ADD.map((ml) => (
              <Pressable
                key={ml}
                onPress={() => handleAdd(ml)}
                style={({ pressed }) => [
                  styles.addBtn,
                  {
                    backgroundColor: pressed ? `${waterColor}33` : `${waterColor}18`,
                    borderColor: `${waterColor}44`,
                  },
                ]}
              >
                <Text style={{ color: waterColor, fontSize: 12, fontFamily: 'Inter_700Bold' }}>+{ml >= 1000 ? `${ml / 1000}L` : `${ml}`}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  bottleWrap: { alignItems: 'center', gap: 0 },
  bottleCap: { width: 24, height: 8, borderRadius: 4, marginBottom: -2, zIndex: 1 },
  bottle: {
    width: 64,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bottleFill: { width: '100%', borderRadius: 12 },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  addBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  minusBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
