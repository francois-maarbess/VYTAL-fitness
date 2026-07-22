import { useSignUp, useSignIn } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function SSOCallback() {
  const { isLoaded: isSignUpLoaded, setActive: setSignUpActive } = useSignUp();
  const { isLoaded: isSignInLoaded, setActive: setSignInActive } = useSignIn();
  const params = useLocalSearchParams<Record<string, string>>();
  const router = useRouter();

  useEffect(() => {
    if (!isSignUpLoaded || !isSignInLoaded) return;

    const handleSSOCallback = async () => {
      try {
        if (params.type === "signup") {
          const result = await setSignUpActive({ session: params.session });
          if (result) router.replace("/(tabs)");
        } else {
          const result = await setSignInActive({ session: params.session });
          if (result) router.replace("/(tabs)");
        }
      } catch {
        router.replace("/auth");
      }
    };

    handleSSOCallback();
  }, [isSignUpLoaded, isSignInLoaded]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0A0A0B" }}>
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  );
}
