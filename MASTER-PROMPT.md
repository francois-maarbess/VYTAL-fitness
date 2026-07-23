# VYTAL Fitness — Insane Mode Agent Prompt

You are a Senior React Native (Expo) Engineer, UI/UX Perfectionist, and AI Integrator. Your single mission: make this app so premium, so polished, so insanely good that users would pay $20/mo without hesitation. Every pixel, every animation, every error state, every loading state must be flawless.

---

## CURRENT STATE (What Works)

- **Auth**: Clerk production instance (`VYTAL fitness`). Sign-up/sign-in/forgot-password/OAuth all work. Production keys are `pk_live_` / `sk_live_`.
- **Backend**: Deployed on Render at `https://vytal-api-3y1t.onrender.com`. Node.js API server with Groq AI, PostgreSQL (Supabase), Clerk webhooks.
- **Frontend**: Expo SDK 54, RN 0.81.5, Expo Router 6, TypeScript. Dark theme only.
- **Home**: FitScore ring, AI insight tips, readiness bar, weekly chart, today's workout, quick actions.
- **Coach**: Chat with AI, SSE streaming, context-aware (knows user's stats), plan writing to workout tab.
- **Workout**: Browse workouts, live session with circular rest timer, set tracking, celebration summary.
- **Nutrition**: AI meal logging via NLP modal, macro bars, water tracker, daily inputs (sleep/steps), bio age.
- **Profile**: Achievements, leaderboard, weight tracker, premium card.
- **Onboarding**: 6-step flow after sign-up.

## ENVIRONMENT

- Root: `C:\m` (Windows dev) or `/home/user/VYTAL-fitness` (Replit)
- `.env` has `EXPO_PUBLIC_API_URL=https://vytal-api-3y1t.onrender.com` and production Clerk keys
- `start-api.bat` runs the API server locally for testing (uses absolute path to `C:\developer2\AI-Fitness-Coach\artifacts\api-server\dist\index.mjs`)
- `render.yaml` at root deploys `api-server/` to Render
- All env vars on Render: `GROQ_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, `DIRECT_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `USDA_API_KEY` (currently `DEMO_KEY`)

---

## YOUR JOB

Go through EVERY screen and fix everything. Here's what I know is wrong + what I suspect is wrong:

### 🚨 CRITICAL FIXES

1. **GROQ API KEY**: Exposed in previous chat — must be rotated at console.groq.com. New key needs to be set on Render dashboard.
2. **USDA API KEY**: Currently `DEMO_KEY` (10 req/min). User needs to get a real key from https://fdc.nal.usda.gov/api-key-signup.html and update Render env.
3. **Render free-tier sleep**: After 15 min idle, service sleeps → 30s cold start on first request. Either upgrade to $7/mo Starter or implement a keep-alive ping.
4. **Coach AI nutrition endpoint**: Coach writes `[ADD_PROTEIN:35]` commands back to UserContext, but the coach route doesn't validate or limit these. If Groq hallucinates a bad write-back command, it corrupts user data.
5. **Nutrition NLP modal**: On error, falls back to a local algorithm (not in the code — the fallback IS in the code). If the API is unreachable, it just shows "Network Error". Should also have offline fallback.

### 🎨 UI/UX PERFECTION — Every Screen

**Auth (`app/auth/index.tsx`):**
- Username is auto-generated from email. The generated code `email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "")` is in 4 places. Extract to a helper.
- No loading skeleton for the initial auth screen mount.
- OAuth buttons could have loading state per-button (not global).
- The tab switcher (Sign In / Create Account) uses `Pressable` without haptic feedback on tab switch.

**Home (`app/(tabs)/index.tsx`):**
- `getCoachTip` function returns `{ tip, icon, color }` but `color` is no longer used in the JSX (was changed to `colors.primary`). Remove dead `color` field.
- The "VYTAL AI INSIGHT" tip card lacks a dismiss animation.
- MorningProtocolSheet uses `@gorhom/bottom-sheet` — verify it works on all screen sizes.
- FitScore ring — is the animation smooth? Does it animate on mount?
- No pull-to-refresh.

**Coach (`app/(tabs)/coach.tsx`):**
- SSE parsing uses `response.text()` then splits by `\n`. This breaks if a chunk contains partial lines. Should use a proper SSE parser or at least buffer partial lines.
- No message loading skeletons (shimmer for the AI response).
- When streaming, the typing indicator uses `TypingIndicator` component but the welcome message is always shown first.
- No retry button on failed messages.
- No message timestamps.
- No copy-to-clipboard on long-press messages.
- Quick prompts could be personalized based on user's recent activity.

**Workout (`app/(tabs)/workout.tsx`):**
- `ExerciseLibrary` details modal has a "Got it" button that does nothing except close. Should add the exercise to current workout or allow customizing sets/reps.
- No rest timer sound when rest ends (beep/vibrate).
- The celebration summary shows `Workout Complete!` — could share to social media or save as screenshot.
- Exercise dots at bottom are tiny — hard to tap to navigate.
- No "skip exercise" option.
- No history of completed workouts.

**Nutrition (`app/(tabs)/nutrition.tsx`):**
- NLP modal says "Analyse with AI" (UK spelling — inconsistent with "Analyze" in error messages).
- Meals are stored in local state (`useState`) — lost on app restart. Should persist to AsyncStorage or API.
- Bio age calculation is in the component (lines 226-235). Should be in a helper/hook.
- Water tracker increments by 250ml — allow custom amount.
- No camera/Gallery option for meal photo (Groq vision API).

**Profile (`app/(tabs)/profile.tsx`):**
- Achievements and leaderboard fetch from API with local mock fallback. The fetch doesn't show a loading skeleton.
- No edit profile screen.
- No "delete account" option.
- Premium card shows "VYTAL Supernova" but no actual payment integration.

### 🏗 ARCHITECTURE & PERFORMANCE

1. **`context/UserContext.tsx`**: 401 lines. This is a god context. It stores profile, nutrition, sleep, steps, water, weight, weekly data, morning protocol, achievements, and more. Consider splitting into smaller contexts or using Zustand/Jotai.
2. **No proper error boundary per screen**: Only one `ErrorBoundary` component exists but it's not wrapped around individual routes.
3. **`lib/api.ts`**: `getApiBaseUrl()` returns env var with fallback to hardcoded IP. On the emulator, this works. On a physical device, the Render URL should be used. Verify this is working.
4. **`lib/authenticatedFetch.ts`**: Exists but isn't used by coach or nutrition. Coach was recently fixed to send auth header manually.
5. **Reanimated worklets**: The workout timer, rest timer, and progress bar use `useSharedValue` + `useAnimatedStyle`. Verify all worklet functions have `'worklet'` directive if needed.
6. **No bundle splitting**: The entire app loads in one JS bundle. With Expo Router, routes could be lazy-loaded.
7. **`react-native-health-connect`**: Package not in `package.json`. Health Connect sync is dead code.

### 🔒 SECURITY & PRODUCTION READINESS

1. **Rate limiting**: None on the API. Malicious user could spam `/api/coach/chat` and drain Groq quota + Render bandwidth.
2. **Clerk webhook secret**: `whsec_placeholder` in start-api.bat. Must be a real secret from Clerk Dashboard → Webhooks.
3. **`start-api.bat`**: Contains plaintext secrets (DB password, Groq key, Clerk keys). This file is gitignored but exists on the dev machine. Ensure proper file permissions.
4. **`.env` on Render**: The Render dashboard stores secrets in plaintext (in the UI). Anyone with Render dashboard access sees all secrets.
5. **No input sanitization on chat input**: User sends raw text to the API which sends it to Groq. Potential prompt injection.
6. **Groq API key exposed in chat history**: Already mentioned. Must rotate.

### 📱 WHAT PREMIUM USERS EXPECT

- **Haptics**: Every press, every state change, every completion.
- **Sound**: Workout start chime, rest end beep, achievement unlock jingle, message sent whoosh.
- **Animations**: Screen transitions, card entrance, score rings, progress bars, rest countdown.
- **Loading states**: Shimmer skeletons for every data view. Not spinners — skeleton placeholders.
- **Empty states**: Illustrations + helpful text when no data. Not blank screens.
- **Error states**: Friendly illustration + retry button + "Contact support" link.
- **Offline**: Cache last-known data. Show stale data with a "Last synced X min ago" badge.
- **Haptics**: `expo-haptics` on: auth tab switch, login, OTP verify, workout complete set, rest end, meal log, achievement unlock, leaderboard rank change.

---

## YOUR PROCESS

1. **Read every file** in order: `package.json` → `app/_layout.tsx` → `context/UserContext.tsx` → `app/(tabs)/` each screen → `components/` each component.
2. **Prioritize by impact**: Visual polish first (users see it immediately) → error/loading states → performance → security.
3. **Every change**: `git commit` with descriptive message. Push to `origin master`.
4. **Never introduce new dependencies** unless absolutely necessary. The app already has `expo-linear-gradient`, `expo-blur`, `react-native-reanimated`, `react-native-svg`, `expo-haptics` — use these.
5. **Test on emulator** after every 2-3 changes. Verify it compiles (`npx tsc --noEmit`).
6. **If stuck on something** (Clerk API behavior, render deploy issue, etc.), write the problem + attempted fixes to `BLOCKERS.md` and move on.

## FINAL OUTPUT

After you've made every improvement, output a `LAUNCH-READY.md` with:
1. What changed
2. What's still needed (if anything)
3. The exact steps to deploy to app stores
4. Estimated monthly costs at 100/1000/10000 users
5. What the user must do manually (Clerk dashboard, USDA key, Groq key rotation, etc.)

Build. Polish. Make it insane.
