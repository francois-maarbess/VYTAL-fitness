import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSignIn, useSignUp, useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import OtpInput from "@/components/OtpInput";

type AuthMode = "signIn" | "signUp";

function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message ?? "";
  console.log("[Auth] Clerk raw error:", msg);
  if (msg.toLowerCase().includes("already exists") && msg.toLowerCase().includes("email")) return "An account with this email already exists. Try signing in.";
  if (msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("is incorrect")) return "No account found with that email/password";
  if (msg.toLowerCase().includes("incorrect password")) return "Incorrect password. Try again";
  if (msg.toLowerCase().includes("invalid") && msg.toLowerCase().includes("code")) return "Invalid code. Please try again";
  if (msg.toLowerCase().includes("expired")) return "Code expired. Request a new one";
  if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("rate_limited")) return "Too many attempts. Please wait";
  if (msg.toLowerCase().includes("is not valid")) return "Please enter a valid email address";
  return msg || "Something went wrong. Please try again";
}

function TabSwitcher({ mode, onSwitch }: { mode: AuthMode; onSwitch: (m: AuthMode) => void }) {
  const activeStyle = (tab: AuthMode) => ({
    backgroundColor: mode === tab ? "#00D4FF" : "transparent",
    borderRadius: 10,
  });

  return (
    <View style={switcherStyles.container}>
      <Pressable onPress={() => onSwitch("signIn")} style={[switcherStyles.tab, activeStyle("signIn")]}>
        <Text style={[switcherStyles.tabText, { color: mode === "signIn" ? "#000" : "#fff", opacity: mode === "signIn" ? 1 : 0.5 }]}>Sign In</Text>
      </Pressable>
      <Pressable onPress={() => onSwitch("signUp")} style={[switcherStyles.tab, activeStyle("signUp")]}>
        <Text style={[switcherStyles.tabText, { color: mode === "signUp" ? "#000" : "#fff", opacity: mode === "signUp" ? 1 : 0.5 }]}>Create Account</Text>
      </Pressable>
    </View>
  );
}

const switcherStyles = StyleSheet.create({
  container: { flexDirection: "row", backgroundColor: "#111B2E", borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

export default function AuthScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<AuthMode>("signUp");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startResendTimer = () => {
    setResendTimer(60);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  async function handleOAuth(strategy: "apple" | "google") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const startFlow = strategy === "apple" ? startAppleOAuth : startGoogleOAuth;
    try {
      const { createdSessionId, setActive } = await startFlow({
        redirectUrl: `${Platform.select({ web: window.location.origin, default: "vytal" })}/auth/sso-callback`,
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function handleEmailAuth() {
    if (!email.trim() || !password.trim()) return;
    if (mode === "signUp" && !name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError("");

    try {
      if (mode === "signIn") {
        const result = await signIn!.create({ identifier: email, password });
        if (result.status === "complete" && result.createdSessionId && setSignInActive) {
          await setSignInActive({ session: result.createdSessionId });
          router.replace("/(tabs)");
        }
      } else {
        await signUp!.create({ emailAddress: email, password, firstName: name });
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        setPendingVerification(true);
        startResendTimer();
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");

    try {
      const result = await signUp!.attemptEmailAddressVerification({ code });
      if (result.status === "complete" && result.createdSessionId && setSignUpActive) {
        await setSignUpActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      console.log("[Auth] verify error:", msg);
      if (msg.toLowerCase().includes("already been verified")) {
        setVerified(true);
        setError("");
        return;
      }
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    setLoading(true);
    setError("");
    try {
      await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
      startResendTimer();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifiedSignIn() {
    setLoading(true);
    setError("");
    try {
      if (signUp?.createdSessionId && setSignUpActive) {
        console.log("[Auth] using cached session:", signUp.createdSessionId);
        await setSignUpActive({ session: signUp.createdSessionId });
        router.replace("/(tabs)");
        return;
      }
    } catch (err) {
      console.log("[Auth] cached session failed:", (err as Error)?.message);
    }
    try {
      const result = await signUp!.create({ emailAddress: email, password, firstName: name });
      const sessionId = result.createdSessionId ?? signUp?.createdSessionId;
      if (sessionId && setSignUpActive) {
        console.log("[Auth] using session from signUp.create:", sessionId);
        await setSignUpActive({ session: sessionId });
        router.replace("/(tabs)");
        return;
      }
      console.log("[Auth] signUp.create returned status:", result.status);
    } catch (err) {
      console.log("[Auth] signUp.create failed:", (err as Error)?.message);
    }
    try {
      const result = await signIn!.create({ identifier: email, password });
      if (result.status === "complete" && result.createdSessionId && setSignInActive) {
        await setSignInActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
        return;
      }
    } catch (err) {
      console.log("[Auth] signIn.create failed:", (err as Error)?.message);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  if (pendingVerification) {
    if (verified) {
      return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding">
          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <View style={[styles.logoCircle, { backgroundColor: colors.muted }]}>
                <Ionicons name="checkmark-circle" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>Email verified</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Your account is ready. Sign in to continue.
              </Text>
            </View>

            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

            <Pressable
              onPress={handleVerifiedSignIn}
              disabled={loading}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.5 : 1 }]}
            >
              {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Sign In</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    return (
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding">
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={[styles.logoCircle, { backgroundColor: colors.muted }]}>
              <Ionicons name="flash" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              We sent a 6-digit code to{"\n"}{email}
            </Text>
          </View>

          <OtpInput value={code} onChange={setCode} onComplete={(c) => { setCode(c); handleVerify(); }} />

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

          <Pressable
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading || code.length !== 6 ? 0.5 : 1 }]}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Verify Email</Text>}
          </Pressable>

          <Pressable onPress={handleResend} disabled={resendTimer > 0} style={styles.resendBtn}>
            <Text style={[styles.resendText, { color: resendTimer > 0 ? colors.mutedForeground : colors.primary }]}>
              {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
            </Text>
          </Pressable>

          <Pressable onPress={() => { setPendingVerification(false); setMode("signIn"); setError(""); setVerified(false); }}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Back to sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding">
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { backgroundColor: colors.muted }]}>
            <Ionicons name="flash" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>VYTAL</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>AI Fitness & Longevity</Text>
        </View>

        <TabSwitcher mode={mode} onSwitch={(m) => { setMode(m); setError(""); }} />

        <View style={[styles.form, { marginTop: 24 }]}>
          {mode === "signUp" && (
            <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          )}

          <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={mode === "signUp" ? "new-password" : "password"}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.inputIconRight}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

          <Pressable
            onPress={handleEmailAuth}
            disabled={loading || !email.trim() || !password.trim() || (mode === "signUp" && !name.trim())}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading || !email.trim() || !password.trim() || (mode === "signUp" && !name.trim()) ? 0.5 : 1 }]}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>{mode === "signIn" ? "Sign In" : "Create Account"}</Text>}
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable onPress={() => handleOAuth("apple")} style={[styles.socialBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="logo-apple" size={20} color={colors.foreground} />
            <Text style={[styles.socialBtnText, { color: colors.foreground }]}>Continue with Apple</Text>
          </Pressable>
          <Pressable onPress={() => handleOAuth("google")} style={[styles.socialBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="logo-google" size={20} color={colors.foreground} />
            <Text style={[styles.socialBtnText, { color: colors.foreground }]}>Continue with Google</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  brand: { alignItems: "center", marginBottom: 32 },
  logoCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "center" },
  form: { gap: 12 },
  inputWrapper: { height: 50, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  inputIconRight: { marginLeft: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  primaryBtn: { height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  socialBtn: { height: 50, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  socialBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  switchText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 16 },
  error: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  resendBtn: { alignItems: "center", marginTop: 4 },
  resendText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
