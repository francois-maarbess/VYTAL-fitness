import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSignIn, useSignUp, useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import OtpInput from "@/components/OtpInput";

type AuthMode = "signIn" | "signUp" | "forgotPassword" | "forgotPasswordOtp" | "forgotPasswordNew";

function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message ?? "";
  console.log("[Auth] Clerk raw error:", msg);
  if (msg.toLowerCase().includes("already exists") && msg.toLowerCase().includes("email")) return "An account with this email already exists. Try signing in.";
  if (
    msg.toLowerCase().includes("couldn't find") ||
    msg.toLowerCase().includes("could not find") ||
    msg.toLowerCase().includes("does not exist") ||
    msg.toLowerCase().includes("is incorrect")
  ) return "No account found with that email/password";
  if (msg.toLowerCase().includes("incorrect password")) return "Incorrect password. Try again";
  if (msg.toLowerCase().includes("invalid") && msg.toLowerCase().includes("code")) return "Invalid code. Please try again";
  if (msg.toLowerCase().includes("expired")) return "Code expired. Request a new one";
  if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("rate_limited")) return "Too many attempts. Please wait";
  if (msg.toLowerCase().includes("is not valid")) return "Please enter a valid email address";
  if (msg.toLowerCase().includes("password") && msg.toLowerCase().includes("pwned")) return "That password is too common. Choose a stronger one";
  if (msg.toLowerCase().includes("minimum") && msg.toLowerCase().includes("character")) return "Password must be at least 8 characters";
  return msg || "Something went wrong. Please try again";
}

function TabSwitcher({ mode, onSwitch }: { mode: "signIn" | "signUp"; onSwitch: (m: "signIn" | "signUp") => void }) {
  const colors = useColors();
  return (
    <View style={switcherStyles.container}>
      {(["signIn", "signUp"] as const).map((tab) => (
        <Pressable key={tab} onPress={() => onSwitch(tab)}
          style={[switcherStyles.tab, mode === tab && { backgroundColor: colors.primary, borderRadius: 10 }]}
        >
          <Text style={[switcherStyles.tabText, { color: mode === tab ? "#000" : "#fff", opacity: mode === tab ? 1 : 0.5 }]}>
            {tab === "signIn" ? "Sign In" : "Create Account"}
          </Text>
        </Pressable>
      ))}
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
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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
        redirectUrl: `${Platform.select({ web: window.location.origin, default: "mobile" })}/auth/sso-callback`,
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
        console.log("[Auth] signIn.create status:", result.status, "sessionId:", result.createdSessionId);
        if (result.status === "complete" && result.createdSessionId && setSignInActive) {
          await setSignInActive({ session: result.createdSessionId });
          router.replace("/(tabs)");
        }
      } else {
        const username = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "") + Math.random().toString(36).slice(2, 6);
        await signUp!.create({ emailAddress: email, password, firstName: name, username });
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
      console.log("[Auth] verify result:", result.status, "sessionId:", result.createdSessionId, "missingFields:", signUp?.missingFields);
      if (result.status === "complete" && result.createdSessionId && setSignUpActive) {
        await setSignUpActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
        return;
      }
      // missing_requirements means Clerk accepted the code but needs more data
      if (result.status === "missing_requirements") {
        console.log("[Auth] missing_requirements — fields needed:", signUp?.missingFields);
        const missing = signUp?.missingFields ?? [];
        // Strategy: try to reload the existing sign-up, then attempt to complete it
        const fallbackUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "") + Math.random().toString(36).slice(2, 6);
        for (const attempt of [
          () => signUp!.update({ username: fallbackUsername }),
          () => signUp!.create({ emailAddress: email, password, username: fallbackUsername }),
          () => signUp!.create({ emailAddress: email, password, firstName: name, username: fallbackUsername }),
        ]) {
          try {
            const res = await attempt();
            console.log("[Auth] attempt status:", res.status, "sessionId:", res.createdSessionId, "missingFields:", signUp?.missingFields);
            if (res.status === "complete" && res.createdSessionId && setSignUpActive) {
              await setSignUpActive({ session: res.createdSessionId });
              router.replace("/(tabs)");
              return;
            }
          } catch (e) {
            console.log("[Auth] attempt failed:", (e as Error)?.message);
          }
        }
        // Still stuck — show the verified screen and try sign-in as last resort
        setVerified(true);
        setError("");
        return;
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      console.log("[Auth] verify error:", msg);
      if (msg.toLowerCase().includes("already been verified")) {
        console.log("[Auth] already verified — attempting signIn for:", email);
        try {
          const signInResult = await signIn!.create({ identifier: email, password });
          console.log("[Auth] post-verify signIn status:", signInResult.status, "sessionId:", signInResult.createdSessionId);
          if (signInResult.status === "complete" && signInResult.createdSessionId && setSignInActive) {
            await setSignInActive({ session: signInResult.createdSessionId });
            router.replace("/(tabs)");
            return;
          }
        } catch (signInErr) {
          console.log("[Auth] post-verify signIn failed:", (signInErr as Error)?.message);
        }
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
        console.log("[Auth] using signUp cached session:", signUp.createdSessionId);
        await setSignUpActive({ session: signUp.createdSessionId });
        router.replace("/(tabs)");
        return;
      }
    } catch (err) {
      console.log("[Auth] cached session failed:", (err as Error)?.message);
    }
    // Try: recreate sign-up to finalize it (Clerk requires username)
    try {
      const fallbackUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "") + Math.random().toString(36).slice(2, 6);
      const refreshed = await signUp!.create({ emailAddress: email, password, firstName: name, username: fallbackUsername });
      console.log("[Auth] signUp.create result:", refreshed.status, "sessionId:", refreshed.createdSessionId, "missingFields:", signUp?.missingFields);
      if (refreshed.status === "complete" && refreshed.createdSessionId && setSignUpActive) {
        await setSignUpActive({ session: refreshed.createdSessionId });
        router.replace("/(tabs)");
        return;
      }
      if (refreshed.status === "missing_requirements") {
        const updated = await signUp!.update({ username: fallbackUsername });
        console.log("[Auth] signUp.update result:", updated.status, "sessionId:", updated.createdSessionId);
        if (updated.status === "complete" && updated.createdSessionId && setSignUpActive) {
          await setSignUpActive({ session: updated.createdSessionId });
          router.replace("/(tabs)");
          return;
        }
      }
    } catch (err) {
      console.log("[Auth] signUp.create failed:", (err as Error)?.message);
    }
    // Last resort: sign in
    try {
      console.log("[Auth] signIn.create for verified user:", email);
      const result = await signIn!.create({ identifier: email, password });
      console.log("[Auth] signIn result status:", result.status, "sessionId:", result.createdSessionId);
      if (result.status === "complete" && result.createdSessionId && setSignInActive) {
        await setSignInActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
        return;
      }
    } catch (err) {
      console.log("[Auth] handleVerifiedSignIn error:", (err as Error)?.message);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Forgot Password ────────────────────────────────────────────────────────

  async function handleForgotSendCode() {
    if (!email.trim()) { setError("Enter your email first"); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError("");
    try {
      await signIn!.create({ strategy: "reset_password_email_code", identifier: email });
      console.log("[Auth] reset password email sent to:", email);
      setMode("forgotPasswordOtp");
      setCode("");
      startResendTimer();
    } catch (err) {
      console.log("[Auth] forgotPassword error:", (err as Error)?.message);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotVerifyCode() {
    if (code.length !== 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError("");
    try {
      const result = await signIn!.attemptFirstFactor({ strategy: "reset_password_email_code", code });
      console.log("[Auth] forgotPassword verify status:", result.status);
      if (result.status === "needs_new_password") {
        setMode("forgotPasswordNew");
      } else {
        setError("Unexpected response. Please try again.");
      }
    } catch (err) {
      console.log("[Auth] forgotPassword verify error:", (err as Error)?.message);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSetNewPassword() {
    if (!newPassword.trim() || newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError("");
    try {
      const result = await signIn!.resetPassword({ password: newPassword });
      console.log("[Auth] resetPassword status:", result.status, "sessionId:", result.createdSessionId);
      if (result.status === "complete" && result.createdSessionId && setSignInActive) {
        await setSignInActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.log("[Auth] resetPassword error:", (err as Error)?.message);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Verified screen ────────────────────────────────────────────────────────

  if (pendingVerification && verified) {
    return (
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={[styles.logoCircle, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="checkmark-circle" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Email verified</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Your account is ready. Sign in to continue.
            </Text>
          </View>
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          <Pressable onPress={handleVerifiedSignIn} disabled={loading}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.5 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.primaryBtnText, { color: "#000" }]}>Sign In</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── OTP verification screen ────────────────────────────────────────────────

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={[styles.logoCircle, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="mail-unread-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              We sent a 6-digit code to{"\n"}{email}
            </Text>
          </View>
          <OtpInput value={code} onChange={setCode} onComplete={(c) => { setCode(c); handleVerify(); }} />
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          <Pressable onPress={handleVerify} disabled={loading || code.length !== 6}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading || code.length !== 6 ? 0.5 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.primaryBtnText, { color: "#000" }]}>Verify Email</Text>}
          </Pressable>
          <Pressable onPress={handleResend} disabled={resendTimer > 0} style={styles.resendBtn}>
            <Text style={[styles.resendText, { color: resendTimer > 0 ? colors.mutedForeground : colors.primary }]}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
            </Text>
          </Pressable>
          <Pressable onPress={() => { setPendingVerification(false); setMode("signIn"); setError(""); setVerified(false); }}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>← Back to sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Forgot Password — Step 1: enter email ──────────────────────────────────

  if (mode === "forgotPassword") {
    return (
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={[styles.logoCircle, { backgroundColor: `${colors.accent}20` }]}>
              <Ionicons name="key-outline" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Enter your email and we'll send a reset code
            </Text>
          </View>
          <View style={{ gap: 12 }}>
            <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                value={email} onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                autoCapitalize="none" keyboardType="email-address" autoFocus
              />
            </View>
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <Pressable onPress={handleForgotSendCode} disabled={loading || !email.trim()}
              style={[styles.primaryBtn, { backgroundColor: colors.accent, opacity: loading || !email.trim() ? 0.5 : 1 }]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryBtnText, { color: "#fff" }]}>Send Reset Code</Text>}
            </Pressable>
          </View>
          <Pressable onPress={() => { setMode("signIn"); setError(""); }}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>← Back to sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Forgot Password — Step 2: enter OTP ────────────────────────────────────

  if (mode === "forgotPasswordOtp") {
    return (
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={[styles.logoCircle, { backgroundColor: `${colors.accent}20` }]}>
              <Ionicons name="shield-checkmark-outline" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Enter Reset Code</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Sent to {email}
            </Text>
          </View>
          <OtpInput value={code} onChange={setCode} onComplete={(c) => { setCode(c); handleForgotVerifyCode(); }} />
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          <Pressable onPress={handleForgotVerifyCode} disabled={loading || code.length !== 6}
            style={[styles.primaryBtn, { backgroundColor: colors.accent, opacity: loading || code.length !== 6 ? 0.5 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryBtnText, { color: "#fff" }]}>Continue</Text>}
          </Pressable>
          <Pressable onPress={() => { setMode("forgotPassword"); setError(""); setCode(""); }}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>← Change email</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Forgot Password — Step 3: new password ─────────────────────────────────

  if (mode === "forgotPasswordNew") {
    return (
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={[styles.logoCircle, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="lock-open-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>New Password</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Choose a strong password (min 8 characters)
            </Text>
          </View>
          <View style={{ gap: 12 }}>
            <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                value={newPassword} onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                secureTextEntry={!showNewPassword} autoCapitalize="none" autoFocus
              />
              <Pressable onPress={() => setShowNewPassword(!showNewPassword)} style={styles.inputIconRight}>
                <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {/* Strength indicator */}
            {newPassword.length > 0 && (
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1,2,3,4].map(i => {
                    const strength = newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword) ? 4
                      : newPassword.length >= 10 && /[A-Z]/.test(newPassword) ? 3
                      : newPassword.length >= 8 ? 2 : 1;
                    const bar = i <= strength;
                    const color = strength === 4 ? colors.primary : strength === 3 ? '#00B894' : strength === 2 ? '#FFB800' : colors.destructive;
                    return <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: bar ? color : colors.border }} />;
                  })}
                </View>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                  {newPassword.length >= 12 && /[^A-Za-z0-9]/.test(newPassword) ? 'Strong password' : newPassword.length >= 8 ? 'Good — add symbols & uppercase for stronger' : 'Too short'}
                </Text>
              </View>
            )}
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <Pressable onPress={handleForgotSetNewPassword} disabled={loading || newPassword.length < 8}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading || newPassword.length < 8 ? 0.5 : 1 }]}
            >
              {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.primaryBtnText, { color: "#000" }]}>Set New Password</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Main sign in / sign up ──────────────────────────────────────────────────

  const isSignIn = mode === "signIn";

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { backgroundColor: `${colors.primary}15`, borderWidth: 1, borderColor: `${colors.primary}33` }]}>
            <Ionicons name="flash" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>VYTAL</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>AI Fitness & Longevity</Text>
        </View>

        <TabSwitcher mode={isSignIn ? "signIn" : "signUp"} onSwitch={(m) => { setMode(m); setError(""); }} />

        <View style={[styles.form, { marginTop: 24 }]}>
          {!isSignIn && (
            <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput value={name} onChangeText={setName} placeholder="Full Name"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                autoCapitalize="words" autoComplete="name"
              />
            </View>
          )}

          <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput value={email} onChangeText={setEmail} placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email"
            />
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput value={password} onChangeText={setPassword} placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              secureTextEntry={!showPassword} autoCapitalize="none"
              autoComplete={isSignIn ? "password" : "new-password"}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.inputIconRight}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {isSignIn && (
            <Pressable onPress={() => { setMode("forgotPassword"); setError(""); }} style={{ alignSelf: "flex-end" }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_500Medium" }}>Forgot password?</Text>
            </Pressable>
          )}

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

          <Pressable
            onPress={handleEmailAuth}
            disabled={loading || !email.trim() || !password.trim() || (!isSignIn && !name.trim())}
            style={[styles.primaryBtn, {
              backgroundColor: colors.primary,
              opacity: loading || !email.trim() || !password.trim() || (!isSignIn && !name.trim()) ? 0.5 : 1,
            }]}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={[styles.primaryBtnText, { color: "#000" }]}>{isSignIn ? "Sign In" : "Create Account"}</Text>
            }
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
  brand: { alignItems: "center", marginBottom: 32, gap: 6 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  form: { gap: 12 },
  inputWrapper: { height: 52, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  inputIconRight: { marginLeft: 10, padding: 2 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  primaryBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  socialBtn: { height: 52, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  socialBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  switchText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 16 },
  error: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  resendBtn: { alignItems: "center", marginTop: 4 },
  resendText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
