# GemBot — AI Skin & Diet Coach

GemBot is a full-stack mobile application that uses AI to help users understand the connection between their diet and skin health. Users can chat with an AI coach, purchase a Pro subscription via RevenueCat, and manage their account through a clean, emoji-free UI built in React Native / Expo.

---

## Folder Structure

```
DietGuru/
├── GemBot/                        # React Native / Expo frontend (main app)
│   ├── app/                       # Expo Router screens
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx        # Tab bar layout (Chat + Profile tabs)
│   │   │   ├── index.tsx          # Chat screen
│   │   │   └── profile.tsx        # Profile, subscription management
│   │   ├── _layout.tsx            # Root layout — fonts, auth routing, RC init
│   │   ├── auth.tsx               # Sign in / Sign up / Google OAuth / Guest
│   │   ├── index.tsx              # Entry redirect
│   │   ├── onboarding.tsx         # First-launch onboarding slides
│   │   └── upgrade.tsx            # Pro upgrade / paywall screen
│   ├── assets/                    # App icons and splash images
│   ├── constants/
│   │   └── theme.ts               # Shared color palette and font family tokens
│   ├── lib/
│   │   ├── api.ts                 # Backend API client (chat, auth, OAuth)
│   │   ├── authContext.tsx        # Auth state — session, guest mode, sign out
│   │   ├── purchases.ts           # RevenueCat SDK wrapper + log handler
│   │   └── supabase.ts            # Supabase JS client
│   ├── scripts/
│   │   └── patch-foojay.js        # postinstall patcher for node_modules fixes
│   ├── android/                   # Native Android project (Gradle)
│   │   ├── app/
│   │   │   ├── build.gradle
│   │   │   └── src/main/
│   │   │       ├── AndroidManifest.xml
│   │   │       └── java/com/anonymous/GemBot/
│   │   │           ├── MainActivity.kt
│   │   │           └── MainApplication.kt
│   │   ├── build.gradle
│   │   ├── gradle.properties      # JDK path, Gradle JVM args
│   │   ├── gradle/wrapper/
│   │   │   └── gradle-wrapper.properties   # Gradle 9.0.0
│   │   └── settings.gradle
│   ├── app.json                   # Expo app config
│   ├── babel.config.js
│   ├── eas.json                   # EAS Build config
│   ├── package.json               # Dependencies + postinstall script
│   └── tsconfig.json
│
├── backend/                       # Python / FastAPI backend
│   ├── main.py                    # App entry point, router registration
│   ├── requirements.txt           # Python dependencies
│   ├── middleware/
│   │   └── auth.py                # JWT verification middleware (Supabase tokens)
│   ├── routes/
│   │   ├── chat.py                # POST /chat — proxies to LLM service
│   │   ├── history.py             # GET /history — chat history from Supabase
│   │   └── payment.py             # POST /payments/webhook, GET /payments/status
│   └── services/
│       ├── llm.py                 # LLM API client (AI responses)
│       ├── revenuecat.py          # RevenueCat REST API + webhook verification
│       └── supabase.py            # Supabase service client (server-side)
│
├── frontend/                      # Legacy / reference frontend folder
│   ├── .env.example               # Environment variable template
│   ├── app.json
│   └── README.md
│
├── android/                       # Root-level Android project (legacy reference)
│
├── .gitignore                     # Root gitignore
├── app.json
├── package.json
├── tsconfig.json
└── README.md                      # This file
```

---

## Features

### Authentication
- Email / password sign in and sign up via Supabase Auth
- Google OAuth via Supabase (in-app browser flow with `expo-web-browser`)
- Guest mode — browse the app without an account; gated from purchasing
- Persistent sessions stored securely with `expo-secure-store`
- Auth state managed globally via React Context (`lib/authContext.tsx`)

### AI Chat
- Real-time chat interface with animated typing indicator
- Messages sent to the FastAPI backend which proxies to the configured LLM
- Inverted FlatList for natural chat scroll behaviour
- Entrance animations on each message bubble
- User avatar popout showing account info

### Subscriptions — RevenueCat
- RevenueCat SDK (`react-native-purchases`) integrated for iOS and Android
- Plans: Weekly, Monthly ($9.99), Yearly ($79.99), Lifetime ($99.99)
- Live offerings fetched from RevenueCat; static fallback if unavailable
- `BEST VALUE` badge on Yearly plan
- Guest users are gated — shown a sign-in prompt instead of the paywall
- Custom in-app subscription management modal (replaces RC Customer Center):
  - Shows active plan, start date, renewal date or "One-time purchase"
  - Full purchase history
  - Change Plan button navigates to the upgrade screen
- RevenueCat log handler installed to silently suppress `test_store` / sandbox deserialization noise in development
- User identified in RevenueCat on login; reset to anonymous on sign-out

### Backend — Payments
- `POST /payments/webhook` — verifies RevenueCat webhook HMAC signature, processes subscription events, writes entitlement state to Supabase
- `GET /payments/status` — queries RevenueCat REST API directly for a user's current entitlement status

### UI / Design
- No emojis anywhere — all icons are pure React Native `View` shapes
- Custom shape-based tab bar icons (speech bubble, person silhouette)
- Google "G" logo rendered with arc-segment `View` shapes (no image assets)
- Onboarding slides with purpose-built shape illustrations
- Consistent design system via `constants/theme.ts` (colors + font tokens)
- Fonts: Fraunces (headings), DM Sans (body), DM Mono (code/IDs)

### Android Build Configuration
- Gradle 9.0.0
- JDK 21 via Android Studio's bundled JBR (`org.gradle.java.home` in `gradle.properties`)
- `postinstall` script (`scripts/patch-foojay.js`) automatically patches two known `node_modules` issues after every `npm install`:
  1. `@react-native/gradle-plugin` — upgrades `foojay-resolver-convention` from `0.5.0` → `1.0.0` (fixes `IBM_SEMERU` enum error on Gradle 9)
  2. `react-native-purchases-ui` — patches `RNPaywallsModule.kt` and `RNCustomerCenterModule.kt` to use `reactApplicationContext.currentActivity` instead of the removed bare `currentActivity` property (RN 0.73+)

---

## Environment Variables

### Frontend — `GemBot/.env`
```
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_CONNECTION_STRING=
EXPO_PUBLIC_OAUTH_REDIRECT_URL=
EXPO_PUBLIC_REVENUECAT_API_KEY=
EXPO_PUBLIC_REVENUECAT_MONTHLY_PRODUCT_ID=monthly
EXPO_PUBLIC_REVENUECAT_YEARLY_PRODUCT_ID=yearly
EXPO_PUBLIC_REVENUECAT_LIFETIME_PRODUCT_ID=lifetime
EXPO_PUBLIC_SENTRY_DSN=
```

### Backend — `.env`
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REVENUECAT_API_KEY=
REVENUECAT_WEBHOOK_SECRET=
LLM_API_KEY=
```

---

## Running the App

### Prerequisites
- Node.js 18+
- Android Studio with SDK 36 and a JBR (JDK 21) installation
- Android device or emulator connected (`adb devices` to verify)
- Python 3.11+ for the backend

### Frontend
```bash
cd GemBot
npm install          # also runs postinstall patches automatically
npx expo run:android
```

> First build takes a few minutes as Gradle downloads dependencies. Subsequent builds are fast.

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `expo` ~55 | App framework |
| `expo-router` ~55 | File-based navigation |
| `react-native-purchases` ^8.12 | RevenueCat SDK |
| `react-native-purchases-ui` ^8.12 | RevenueCat UI components |
| `@supabase/supabase-js` ^2 | Auth + database client |
| `expo-secure-store` | Encrypted session storage |
| `expo-web-browser` | OAuth in-app browser |
| `fastapi` | Backend API framework |
| `httpx` | Async HTTP client for RC REST API |
