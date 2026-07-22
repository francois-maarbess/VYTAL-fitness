import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  value: string | number;
  label: string;
}

export function StatCard({ icon, iconColor, value, label }: Props) {
  const colors = useColors();
  const ic = iconColor ?? colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={ic} />
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
