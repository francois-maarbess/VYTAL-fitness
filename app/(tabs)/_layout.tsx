import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const insets = useSafeAreaInsets();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: isWeb ? 0 : insets.bottom,
          height: isWeb ? 60 : 60 + insets.bottom,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={22} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="figure.strengthtraining.traditional" tintColor={color} size={22} />
            ) : (
              <Feather name="activity" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'VYTAL ai',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="sparkles" tintColor={color} size={22} />
            ) : (
              <Feather name="zap" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="leaf" tintColor={color} size={22} />
            ) : (
              <Feather name="heart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={22} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
