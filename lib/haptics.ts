import { Platform } from "react-native";
import * as HapticsNative from "expo-haptics";

const isWeb = Platform.OS === "web";

export const ImpactFeedbackStyle = HapticsNative.ImpactFeedbackStyle;
export const NotificationFeedbackType = HapticsNative.NotificationFeedbackType;

export const impactAsync = isWeb
  ? (): Promise<void> => Promise.resolve()
  : HapticsNative.impactAsync;

export const notificationAsync = isWeb
  ? (): Promise<void> => Promise.resolve()
  : HapticsNative.notificationAsync;

export const selectionAsync = isWeb
  ? (): Promise<void> => Promise.resolve()
  : HapticsNative.selectionAsync;
