# VYTAL Fitness — Master Agent Prompt

You are a Senior React Native (Expo) Engineer, Mobile UI/UX Designer, and AI Engineer. Your mission is to take this app from its current state to a **production-ready, deployable super-app** that users would gladly pay for.

---

## CRITICAL CONTEXT (Read This First)

### Project Location
- Root: `/home/user/VYTAL-fitness` (on Replit) or `C:\m` (on Windows dev machine)
- Frontend: Expo SDK 54, React Native 0.81.5, Expo Router 6, TypeScript, Clerk for auth
- Backend: Custom Node.js API server at `artifacts/api-server/dist/index.mjs`
- Auth: `@clerk/clerk-expo` `^2.19.31`

### Files You MUST Read Before Writing ANY Code
Read these files in order to understand the full state before touching anything:

1. `package.json` — deps, scripts
2. `app.json` — Expo config, scheme "mobile"
3. `app/_layout.tsx` — Root layout (ClerkProvider, providers stack)
4. `app/auth/index.tsx` — Auth screen (this needs the most work)
5. `app/auth/_layout.tsx` — Auth stack layout
6. `app/auth/sso-callback.tsx` — OAuth callback
7. `app/(tabs)/_layout.tsx` — Main app layout with Clerk auth guard
8. `app/onboarding.tsx` — Onboarding after sign-up
9. `constants/colors.ts` — Theme colors
10. `hooks/useColors.ts` — Color hook
11. `lib/cache.ts` — Token cache for Clerk
12. `components/OtpInput.tsx` — OTP input component
13. `.env` (if exists) — Environment variables
14. `tsconfig.json` — TypeScript config

---

## 🚨 BLOCKER #1: Auth Flow Broken (MUST FIX FIRST)

### The Bug
The sign-up → verify → sign-in flow is broken. Here's what happens:
1. User enters name + email + password, taps "Create Account"
2. Verification email arrives, user enters 6-digit code
3. Code is accepted / "already been verified" shown
4. User taps "Sign In" on the verified screen
5. **`signIn.create({ identifier: email, password })` returns "Couldn't find your account"**
6. User is stuck — cannot enter the app

### Root Cause (Investigated)
The Clerk user IS created (verification email arrives, code is consumed), but `signIn.create()` says no account exists. Possible causes:
- The `CLERK_PUBLISHABLE_KEY` in `.env` might not match the `CLERK_SECRET_KEY` in `start-api.bat`
- Clerk's development instance might have data consistency issues
- The sign-up creates a pending sign-up that gets verified but the user record isn't committed
- The Clerk instance might have email verification configured incorrectly in the dashboard

### What to Try
1. **Check the Clerk Dashboard at dashboard.clerk.com** — verify that users are actually being created after verification. If not, check email verification settings.
2. **Try `signUp.create({ emailAddress, password })` after "already verified"** — Clerk should return the existing completed sign-up with a `createdSessionId`. Use that directly with `setActive({ session: createdSessionId })`.
3. **Fallback path**: If `setActive` fails, clear all Clerk state with `useAuth().signOut()` and redirect to sign-in cleanly.
4. **Validate `.env` keys** — the publishable key in `.env` must exactly match the Clerk application. If the user changed keys midway, old users exist in one instance and new sign-ins hit another.
5. **Add console.log on every Clerk API call** with `[Auth]` prefix so errors are visible in Metro terminal.

### The Sign-Up Flow (Intended)
```
1. signUp.create({ emailAddress, password, firstName: name })
2. prepareEmailAddressVerification({ strategy: "email_code" })
3. → show OTP screen, user enters code
4. attemptEmailAddressVerification({ code })
5. if status === "complete" && createdSessionId → setActive({ session }) → router.replace("/(tabs)")
6. if error "already been verified" → success screen → user taps "Sign In"
7. signIn.create({ identifier: email, password }) → setActive({ session }) → router.replace("/(tabs)")
```

### The Sign-In Flow (Intended)
```
1. signIn.create({ identifier: email, password })
2. if status === "complete" && createdSessionId → setActive({ session }) → router.replace("/(tabs)")
```

---

## 🎨 DESIGN DIRECTIVE — "INSANE" LEVEL

### Brand Identity
- **Name**: VYTAL (always uppercase)
- **Tagline**: "AI Fitness & Longevity"
- **Vibe**: Dark, premium, energetic, cyberpunk-fitness
- **Primary**: Cyan `#00D4FF` — represents energy, technology, vitality
- **Secondary**: Blue `#0061FF` — trust, depth
- **Accent**: Purple `#7C3AED` — premium, mystical (AI features)
- **Background**: `#060A14` — deep dark blue-black
- **Card**: `#0D1526` — slightly lighter
- **Muted**: `#111B2E` — inputs, secondary surfaces
- **Border**: `#1A2740` — subtle dividers
- **Text**: White `#FFFFFF`, muted `#607090`

### Design Principles
1. **Dark-first, always** — never use light mode. The app lives in the gym, at night, on dark screens.
2. **Glassmorphism** — blur backs, translucent tabs, frosted cards
3. **Motion** — every state transition has a purpose (spring animations, staggered entrance)
4. **Data density** — show metrics without clutter. Sparklines, progress rings, compact cards
5. **Haptic feedback** — every press, every completion, every milestone gets `expo-haptics`
6. **Sound** — optional sound effects for workout start/end, milestone achievements

---

## 📋 COMPLETE FEATURE AUDIT & BUILD LIST

### Phase 1: Auth & Onboarding (Fix + Polish)
- [ ] **Fix the Clerk auth bug** — non-negotiable, this blocks everything
- [ ] **Add "forgot password" flow** — `signIn.create({ strategy: "reset_password_email_code", identifier: email })`
- [ ] **Bio-auth** — After first login, store a session token in `expo-secure-store` and offer fingerprint/FaceID unlock on relaunch
- [ ] **Onboarding flow** — `app/onboarding.tsx` currently collects name/email/body stats/goals but NEVER signs the user into Clerk. After onboarding completes, redirect back to sign-in. Fix this to create the Clerk user during onboarding OR require sign-up before onboarding.
- [ ] **Animated transitions between auth screens** — Fade, slide, or scale transitions using Reanimated
- [ ] **OTP auto-read SMS** — On Android/iOS, use `textContentType="oneTimeCode"` (already done) + intercept SMS with `expo-sms` for auto-fill

### Phase 2: Home Dashboard (`app/(tabs)/index.tsx`)
- [ ] **Today's Summary Card** — glassmorphic card showing: daily steps, calories burned, active minutes, next workout
- [ ] **Fit Score Ring** — animated ring (0-100) based on weekly consistency, steps, sleep, recovery
- [ ] **Quick-Start Workout** — 3 most recent/favorite workouts as tappable cards
- [ ] **AI Coach Tip** — dynamic tip from the AI coach based on user's recent activity
- [ ] **Streak display** — 🔥 day streak counter with calendar sparkline
- [ ] **Morning Protocol** — if before noon, show a "Morning Protocol" card (hydration, stretch, supplements)

### Phase 3: Workout Tracking (`app/(tabs)/workout.tsx`)
- [ ] **Live workout mode** — timer, set tracker, rest timer with countdown
- [ ] **Exercise library** — searchable/filterable with demo GIFs (from `expo-image` or Lottie)
- [ ] **Progress charts** — weight lifted over time, reps, volume per exercise
- [ ] **AI form check** — upload video, AI analyzes form (integration with external API)
- [ ] **Workout templates** — save, share, import workout plans

### Phase 4: AI Coach (`app/(tabs)/coach.tsx`)
- [ ] **Chat interface** — persistent conversation with AI coach (powered by Groq API)
- [ ] **Context-aware suggestions** — coach knows user's goals, recent workouts, injuries
- [ ] **Workout generation** — "Generate a 45-min push workout" → AI creates structured workout
- [ ] **Meal plan generation** — "Create a 2000-calorie meal plan for muscle gain"
- [ ] **Voice input** — tap mic, speak your question, get voice response (expo-av)

### Phase 5: Nutrition (`app/(tabs)/nutrition.tsx`)
- [ ] **Macro tracker** — daily protein/carbs/fat rings with remaining grams
- [ ] **Meal logger** — search USDA database, log meals, see daily totals
- [ ] **Water tracker** — tap to add 250ml, animated fill ring
- [ ] **AI meal photo** — snap a photo, AI identifies food and estimates macros (Groq vision API)
- [ ] **Weekly nutrition report** — sparkline charts for each macro across 7 days

### Phase 6: Profile & Social (`app/(tabs)/profile.tsx`)
- [ ] **Body stats tracker** — weight, body fat, measurements over time with charts
- [ ] **Achievements/badges** — gamified milestones (7-day streak, first workout, etc.)
- [ ] **Leaderboard** — weekly steps/volume competition with friends
- [ ] **Sync Apple Health / Google Fit** — steps, workouts, sleep, weight auto-import
- [ ] **Subscription management** — (if monetized) manage plan, billing history

### Phase 7: AI Personalization (Advanced)
- [ ] **Recovery score** — based on sleep, HRV, previous day intensity → recommend rest/active/workout
- [ ] **Adaptive workout difficulty** — AI adjusts weights/sets/reps based on last session's performance
- [ ] **Injury prevention** — exercises flagged based on user's listed injuries, alternative suggested
- [ ] **Deload week detection** — after 4-6 weeks of progressive overload, suggest deload
- [ ] **Supplement reminders** — time-based push notifications

### Phase 8: Reliability & Production Readiness
- [ ] **Offline mode** — cache workout data, nutrition logs, user profile. Queue writes for when connectivity returns.
- [ ] **Push notifications** — `expo-notifications`: workout reminders, streak at risk, new AI insight
- [ ] **Error boundaries** — every route has an ErrorBoundary. Catch all crashes, show friendly fallback.
- [ ] **Loading skeletons** — shimmer placeholders for every data-driven view
- [ ] **API retry with exponential backoff** — all API calls retry 3x with 1s/2s/4s delay
- [ ] **Network status indicator** — banner when offline, reconnection toast
- [ ] **Deep linking** — handle `vytal://workout/123`, `vytal://coach`, etc.
- [ ] **Performance** — `React.memo`, `useMemo`, `useCallback` on list items. FlatList with `getItemLayout`. Images cached with `expo-image`.
- [ ] **Analytics** — screen views, events (workout started, meal logged) — fire-and-forget, never block UI

---

## 📐 ARCHITECTURE RULES

### Routing (Expo Router)
- `app/(tabs)` — main app (auth required)
- `app/auth/` — auth stack (no auth required)
- `app/onboarding.tsx` — post-auth onboarding (auth required, single-run)

The auth guard is in `app/(tabs)/_layout.tsx`:
```ts
const { isLoaded, isSignedIn } = useAuth();
if (!isLoaded) return <Loading />;
if (!isSignedIn) return <Redirect href="/auth" />;
```

### Clerk Provider (in `app/_layout.tsx`)
```tsx
<ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
```

### Theming
Use `useColors()` from `@/hooks/useColors` — always returns dark palette. Never hardcode colors.

### New Components Go In
```
components/
├── OtpInput.tsx        ← exists
├── WorkoutCard.tsx      ← exists
├── StatCard.tsx         ← exists
├── FitScoreRing.tsx     ← exists
├── MacroBar.tsx         ← exists
├── ChatBubble.tsx       ← exists
└── [new components]    ← add here with PascalCase
```

### New Hooks Go In
```
hooks/
├── useColors.ts         ← exists
├── useHealthConnectSync.ts ← exists
└── [new hooks]         ← add here with camelCase
```

### State Management
- **Server state**: `@tanstack/react-query` (already set up in root layout)
- **Client state**: React `useState`/`useReducer` for local, `UserContext` for user profile
- **Persistent storage**: `expo-secure-store` for tokens, `@react-native-async-storage/async-storage` for preferences
- **Auth state**: Clerk handles session, token, user state. Don't duplicate.

---

## ⚠️ NON-NEGOTIABLES

1. **Every async Clerk call must be `try/catch` + `console.log("[Auth]", error)`** — we MUST see errors in Metro terminal
2. **No `!` non-null assertions** — use proper loading state checks (`isLoaded` from Clerk hooks)
3. **Every component must handle the loading + error state** — no blank screens
4. **All user-facing errors must be friendly** — no raw "Couldn't find your account", instead "No account found with that email/password"
5. **Haptics on every primary action** — `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` on auth, workouts, achievements
6. **All lists use FlatList** — never `map()` inside ScrollView for data arrays
7. **Colors always from `useColors()`** — never hardcode `#hex` values
8. **Every new file must be added to `tsconfig.json` includes** if needed

---

## 🚀 DEPLOYMENT CHECKLIST (End Goal)

- [ ] Clerk production instance configured (not the shared `moved-minnow-39` test instance)
- [ ] Clerk email templates customized with VYTAL branding
- [ ] `.env` with production keys on Replit
- [ ] API server deployed (Render / Railway / Fly.io)
- [ ] `app.json` updated with production scheme and URLs
- [ ] Deep linking configured for custom URL scheme `vytal://`
- [ ] Push notification credentials (FCM for Android, APNS for iOS)
- [ ] App icon, splash screen, adaptive icon
- [ ] EAS Build configured for OTA updates
- [ ] Test Flight / Play Console internal testing
- [ ] Privacy policy + terms of service (Clerk requires them for production)

---

## FINAL INSTRUCTION

Do NOT rewrite the entire app. **Fix the auth bug first** — that's the #1 blocker keeping the user out of their own app. Get them logged in. Then systematically go through the phases above, one feature at a time. Each feature should:
1. Work perfectly (no crashes, no edge-case hangs)
2. Look premium (glassmorphism, animations, haptics)
3. Handle errors gracefully (catch, log, show user-friendly message)
4. Perform well (memoize, virtualize lists, lazy-load images)

When you fix the auth bug, `console.log` the raw Clerk error AND the `signUp` object state so we know exactly what's happening server-side.

Start. Build. Make it insane.
