# VYTAL Fitness

An AI-powered fitness & longevity mobile app built with Expo (React Native), Expo Router, and Clerk authentication.

## Stack
- **Framework**: Expo SDK 54 / React Native 0.81.5
- **Navigation**: Expo Router 6 (file-based)
- **Auth**: `@clerk/clerk-expo` — session token cached via `expo-secure-store`
- **State**: TanStack React Query (server state) + React Context (`UserContext`)
- **UI**: Dark-first design system, `constants/colors.ts` → `useColors()` hook

## Running the app

**On device / simulator (recommended):**
```bash
npx expo start
```
Then scan the QR code with Expo Go or a dev build.

**Web preview (dev Clerk key required):**
The production Clerk key is restricted to `vytalfitnessapponline.online`. To use the web preview, set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` to a `pk_test_...` development key.
```bash
npm run web   # starts on port 5000
```

## Environment secrets
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (currently set to production key)

## Project structure
```
app/
  _layout.tsx          — Root layout: ClerkProvider, QueryClient, UserProvider
  auth/index.tsx       — Sign-in / sign-up / OTP verification screen
  auth/sso-callback.tsx — OAuth redirect handler
  (tabs)/              — Main app (auth-guarded): Home, Workout, Coach, Nutrition, Profile
  onboarding.tsx       — Post-signup profile setup
components/            — Shared UI components (PascalCase)
hooks/                 — Custom hooks (camelCase), always use useColors() for colors
lib/
  cache.ts             — Clerk token cache (SecureStore on native, localStorage on web)
  api.ts               — API base URL helper
constants/colors.ts    — Dark theme palette
context/UserContext.tsx — User profile state
```

## User preferences
- Always use `useColors()` from `@/hooks/useColors` — never hardcode hex values
- Every async Clerk call must have `try/catch` + `console.log("[Auth]", error)`
- Haptics on every primary action: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`
- Dark-first, always — no light mode
