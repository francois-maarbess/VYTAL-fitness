import { useSignUp, useSignIn } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function SSOCallback() {
  const colors = useColors();
  const { isLoaded: isSignUpLoaded, setActive: setSignUpActive } = useSignUp();
  const { isLoaded: isSignInLoaded, setActive: setSignInActive } = useSignIn();
  const params = useLocalSearchParams<Record<string, string>>();
  const router = useRouter();

  useEffect(() => {
    if (!isSignUpLoaded || !isSignInLoaded) return;

    const handleSSOCallback = async () => {
      try {
        if (params.type === "signup") {
          await setSignUpActive({ session: params.session });
          router.replace("/(tabs)");
        } else {
          await setSignInActive({ session: params.session });
          router.replace("/(tabs)");
        }
      } catch {
        router.replace("/auth");
      }
    };

    handleSSOCallback();
  }, [isSignUpLoaded, isSignInLoaded]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  );
}
