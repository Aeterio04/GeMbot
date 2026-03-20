# GemBot — Frontend Setup

## Install
```bash
npx create-expo-app GemBot --template blank-typescript
cd GemBot

npx expo install expo-router expo-font expo-secure-store \
  react-native-safe-area-context react-native-screens \
  react-native-gesture-handler react-native-reanimated \
  @react-native-async-storage/async-storage

npx expo install @expo-google-fonts/fraunces \
  @expo-google-fonts/dm-sans \
  @expo-google-fonts/dm-mono

npm install @supabase/supabase-js
```

## Folder Structure
```
GemBot/
├── app.json
├── babel.config.js          ← reanimated plugin MUST be last
├── .env                     ← copy from .env.example, fill values
├── constants/
│   └── theme.ts             ← all colors + font names
├── lib/
│   ├── supabase.ts          ← supabase client (SecureStore adapter)
│   └── api.ts               ← all backend fetch calls
└── app/
    ├── _layout.tsx          ← fonts, auth guard, routing
    ├── index.tsx            ← fallback redirect
    ├── onboarding.tsx       ← 4-slide swipeable intro
    ├── auth.tsx             ← sign in / sign up
    └── (tabs)/
        ├── _layout.tsx      ← custom bottom tab bar
        ├── index.tsx        ← chat screen
        └── profile.tsx      ← profile screen
```

## Starting dev
```bash
cp .env.example .env
# Fill in your Supabase + ngrok values

npx expo start
```

## Every new dev session (ngrok URL changes)
```bash
ngrok http 8000
# Copy new https URL → update EXPO_PUBLIC_API_URL in .env
# Restart expo
```

## TODO: Wire RevenueCat
1. `npm install react-native-purchases`
2. In `app/_layout.tsx`, init: `Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_KEY })`
3. In `profile.tsx`, replace `useIsPro()` with real entitlement check
4. In `profile.tsx` Upgrade button, trigger RevenueCat paywall
