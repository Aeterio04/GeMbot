# GemBot / DietGuru — AI Skin & Diet Coach

[![React Native](https://img.shields.io/badge/React%20Native-0.83.2-61DAFB.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2055-black.svg)](https://expo.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.11+-009688.svg)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E.svg)](https://supabase.com/)
[![RevenueCat](https://img.shields.io/badge/RevenueCat-In--App%20Purchases-F2545B.svg)](https://www.revenuecat.com/)
[![Groq](https://img.shields.io/badge/LLM-Groq%20Llama%203.3%2070B-purple.svg)](https://groq.com/)

**GemBot (DietGuru)** is a full-stack, cross-platform mobile application that empowers users to explore the direct connection between nutrition, gut health, lifestyle, and skin wellness. Users can converse in real time with an empathetic AI coach, purchase Pro subscriptions via RevenueCat, and manage their personalized chat history with Supabase authentication.

The UI is built with a custom shape-based design system in React Native / Expo (zero emoji dependencies, custom typography with Fraunces & DM Sans).

---

## Table of Contents

1. [Architecture & Data Flow](#-architecture--data-flow)
2. [Project Structure](#-project-structure)
3. [Prerequisites](#-prerequisites)
4. [Step-by-Step Restoration & Setup Guide](#-step-by-step-restoration--setup-guide)
   - [Step 1: Clone Repository](#step-1-clone-repository)
   - [Step 2: Supabase Database & Auth Setup](#step-2-supabase-database--auth-setup)
   - [Step 3: Backend Setup (FastAPI)](#step-3-backend-setup-fastapi)
   - [Step 4: Frontend Setup (Expo / React Native)](#step-4-frontend-setup-expo--react-native)
   - [Step 5: RevenueCat In-App Purchases Setup](#step-5-revenuecat-in-app-purchases-setup)
5. [Environment Variables Reference](#-environment-variables-reference)
   - [Root / Backend `.env`](#root--backend-env)
   - [Frontend `GemBot/.env`](#frontend-gembotenv)
6. [Running the Application](#-running-the-application)
   - [Running Backend](#running-backend)
   - [Running Mobile App](#running-mobile-app)
   - [Building Android Native APK / Dev Client](#building-android-native-apk--dev-client)
7. [Testing & Verification](#-testing--verification)
8. [Troubleshooting & Known Patches](#-troubleshooting--known-patches)

---

## 🏗 Architecture & Data Flow

```
                      [ GemBot Mobile App ]
                   (React Native / Expo SDK 55)
                     /           |           \
                    /            |            \
        Supabase Auth       In-App Chat      RevenueCat SDK
       (Google OAuth &      (Secure JWT)    (Google Play Store /
       Email / Guest)            |           App Store Billing)
              |                  v                   |
              |         [ FastAPI Backend ]          |
              |       (Python 3.11 / Uvicorn)        |
              |          /       |        \          |
              |         /        |         \         |
              v        v         v          v        v
        +-----------+    +-------------+   +---------------+
        | Supabase  |    |  Groq LLM   |   |  RevenueCat   |
        | Postgres  |    | (Llama 3.3  |   | REST Webhooks |
        |  Database |    |  70B / Free)|   |  & Validation |
        +-----------+    +-------------+   +---------------+
              ^                                    |
              +--- (Webhook updates subscriptions)-+
```

---

## 📁 Project Structure

```
DietGuru/
├── GemBot/                        # Primary React Native / Expo mobile application
│   ├── app/                       # Expo Router file-based screens
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx        # Tab navigation layout (Chat & Profile)
│   │   │   ├── index.tsx          # Real-time chat interface with AI Coach
│   │   │   └── profile.tsx        # User profile & subscription management
│   │   ├── _layout.tsx            # Root layout: font loading, auth router, RC init
│   │   ├── auth.tsx               # Sign in / Sign up / Google OAuth / Guest mode
│   │   ├── index.tsx              # Splash / auth entry redirect
│   │   ├── onboarding.tsx         # First-time user onboarding slides
│   │   └── upgrade.tsx            # Pro subscription paywall modal
│   ├── assets/                    # App icons, splash images, shape graphics
│   ├── constants/
│   │   └── theme.ts               # Color palette and typography tokens
│   ├── lib/
│   │   ├── api.ts                 # Backend HTTP client (chat, history, payments)
│   │   ├── authContext.tsx        # Global auth session provider
│   │   ├── purchases.ts           # RevenueCat wrapper & sandbox log silencer
│   │   └── supabase.ts            # Supabase JS mobile client
│   ├── scripts/
│   │   └── patch-foojay.js        # Postinstall patcher for Gradle 9 & RN 0.73+
│   ├── android/                   # Native Android Gradle project (SDK 36, Gradle 9)
│   ├── .env.example               # Frontend environment template
│   ├── app.json                   # Expo application metadata
│   ├── package.json               # Frontend dependencies & postinstall hooks
│   └── tsconfig.json              # TypeScript configuration
│
├── backend/                       # Python / FastAPI server
│   ├── main.py                    # Server entry point & router mounting
│   ├── requirements.txt           # Python backend dependencies
│   ├── testing.py                 # Backend integration test suite
│   ├── middleware/
│   │   └── auth.py                # Supabase JWT bearer token validation
│   ├── routes/
│   │   ├── chat.py                # POST /chat: LLM proxy with context injection
│   │   ├── history.py             # GET/DELETE /history: User chat messages
│   │   └── payment.py             # Webhook receiver & subscription status
│   └── services/
│       ├── llm.py                 # Groq (Llama 3.3) & Gemini 1.5 Flash client
│       ├── revenuecat.py          # HMAC webhook signature & REST entitlement verification
│       └── supabase.py            # Server-side Supabase client (service-role)
│
├── frontend/                      # Legacy reference prototype
├── .env.example                   # Backend & project-wide environment template
├── package.json                   # Root workspace package manifest
└── README.md                      # Complete project documentation
```

---

## 💻 Prerequisites

Ensure the following tools are installed on your workstation:

1. **Node.js**: `v18.x` or `v20.x` LTS (`node -v`).
2. **Python**: `3.11` or newer (`python --version`).
3. **Android Studio**:
   - Android SDK 36 (Android 14/15) installed via SDK Manager.
   - Android SDK Build-Tools and Platform-Tools (`adb`).
   - JDK 21 (bundled JBR in Android Studio).
4. **Supabase Account**: Free project created on [supabase.com](https://supabase.com).
5. **RevenueCat Account**: Free project created on [revenuecat.com](https://www.revenuecat.com).
6. **Groq Cloud API Key**: Free key from [console.groq.com](https://console.groq.com).

---

## 🚀 Step-by-Step Restoration & Setup Guide

### Step 1: Clone Repository

```bash
git clone https://github.com/Aeterio04/GeMbot.git DietGuru
cd DietGuru
```

---

### Step 2: Supabase Database & Auth Setup

1. Log in to [Supabase](https://supabase.com) and create a new project.
2. In the **SQL Editor**, run the following schema migration to create the required tables and security policies:

```sql
-- 1. Create messages table for chat history
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own messages"
    ON public.messages
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Create subscriptions table for payment status tracking
CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'inactive',
    order_id TEXT,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role bypass is automatic for backend server-side operations
```

3. In **Authentication -> URL Configuration**:
   - Add Redirect URL: `gembot://oauth/callback`

---

### Step 3: Backend Setup (FastAPI)

1. Create and activate a Python virtual environment:

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install backend Python dependencies:
```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

3. Configure Backend Environment:
```bash
cp .env.example .env
```
Fill in `.env` with your Supabase credentials, Groq API key, and RevenueCat keys (see [Environment Variables Reference](#-environment-variables-reference)).

4. Start the FastAPI server:
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Test health check at: `http://localhost:8000/health`.

---

### Step 4: Frontend Setup (Expo / React Native)

1. Navigate to the `GemBot` directory and install JavaScript dependencies:
```bash
cd GemBot
npm install
```
> [!NOTE]
> The `npm install` command automatically runs `node scripts/patch-foojay.js` via the `postinstall` lifecycle hook. This automatically applies compatibility patches for Gradle 9 and React Native 0.73+ to `@react-native/gradle-plugin` and `react-native-purchases-ui`.

2. Configure Frontend Environment:
```bash
cp .env.example .env
```
Open `GemBot/.env` and update:
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key.
- `EXPO_PUBLIC_API_URL`:
  - If using Android Emulator: `http://10.0.2.2:8000`
  - If using physical phone: `http://<your-local-ip>:8000` or your active HTTPS tunnel URL (`https://xxxx.ngrok-free.app`).

3. Start the Expo development server:
```bash
npx expo start
```

---

### Step 5: RevenueCat In-App Purchases Setup

1. In the **RevenueCat Dashboard**:
   - Create a project named `GemBot`.
   - Add an Android App (Google Play Store) with package name: `com.anonymous.GemBot` (from `app.json`).
   - Create Products: `weekly`, `monthly`, `yearly`, `lifetime`.
   - Create an Offering named `default` containing packages mapped to these products.
2. Under **Integrations -> Webhooks**:
   - Add Webhook URL: `https://<your-backend-domain>/payments/webhook`
   - Set Authorization Header value and set it as `REVENUECAT_WEBHOOK_SECRET` in your backend `.env`.

---

## 🔑 Environment Variables Reference

### Root / Backend `.env`

Placed at project root (`.env`) or inside `backend/.env`:

| Variable | Description | Where to Find |
|---|---|---|
| `SUPABASE_URL` | Supabase project API URL | Supabase Dashboard -> Settings -> API |
| `SUPABASE_KEY` | Public anon key for client verification | Supabase Dashboard -> Settings -> API |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service role key (bypasses RLS for webhooks) | Supabase Dashboard -> Settings -> API |
| `SUPABASE_CONNECTION_STRING` | Direct PostgreSQL connection URI | Supabase Dashboard -> Settings -> Database |
| `GROQ_API_KEY` | Groq inference API key (Llama 3.3 70B) | [console.groq.com](https://console.groq.com) |
| `GEMINI_API_KEY` | Optional fallback Gemini key | [aistudio.google.com](https://aistudio.google.com) |
| `SYSTEM_PROMPT` | Custom persona instruction for the skin/diet coach | Configurable string |
| `REVENUECAT_API_KEY` | RevenueCat Secret API Key | RevenueCat -> Project Settings -> API Keys |
| `REVENUECAT_WEBHOOK_SECRET` | Secret used to verify HMAC SHA-256 signatures | RevenueCat -> Integrations -> Webhooks |
| `SENTRY_DSN` | Sentry error reporting DSN | [sentry.io](https://sentry.io) |
| `APP_ENV` | `development` or `production` | Manual setting |

### Frontend `GemBot/.env`

Placed inside `GemBot/.env`:

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `EXPO_PUBLIC_API_URL` | Backend URL (`http://10.0.2.2:8000` for Android emulator, or ngrok URL) |
| `EXPO_PUBLIC_OAUTH_REDIRECT_URL` | `gembot://oauth/callback` |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | Public SDK key (`goog_...` for Android, `appl_...` for iOS) |
| `EXPO_PUBLIC_REVENUECAT_MONTHLY_PRODUCT_ID`| Identifier for monthly subscription |
| `EXPO_PUBLIC_REVENUECAT_YEARLY_PRODUCT_ID` | Identifier for yearly subscription |
| `EXPO_PUBLIC_REVENUECAT_LIFETIME_PRODUCT_ID`| Identifier for lifetime access |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN for frontend crash reports |

---

## 🏃 Running the Application

### Running Backend
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Running Mobile App
```bash
cd GemBot
npx expo start
```
Press `a` in the terminal to launch on a running Android emulator, or scan the QR code with the Expo Go app.

### Building Android Native APK / Dev Client

To compile and launch the full native Android build with native dependencies (`react-native-purchases`, `react-native-reanimated`):

```bash
cd GemBot
npx expo run:android
```

Or build an installable APK using EAS:
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

---

## 🧪 Testing & Verification

1. **Verify Backend APIs:**
   ```bash
   # Health check
   curl http://localhost:8000/health
   # Response: {"status":"ok"}

   # Run automated integration test suite
   python backend/testing.py
   ```

2. **Verify Mobile App Authentication:**
   - Launch app -> choose "Guest mode" to verify fallback exploration.
   - Sign up with an email -> verify user row appears in Supabase `auth.users`.

3. **Verify Chat Pipeline:**
   - Send a message in the chat screen ("What diet helps reduce inflammatory acne?").
   - Confirm typing indicator animates, message persists to Supabase `messages` table, and AI response streams back.

---

## 🛠 Troubleshooting & Known Patches

### 1. `IBM_SEMERU` Enum Error on Gradle 9
- **Cause:** React Native's default Foojay toolchain resolver in `@react-native/gradle-plugin` has a bug with Gradle 9.
- **Fix:** Handled automatically by `GemBot/scripts/patch-foojay.js` during `npm install`.

### 2. Android Emulator Cannot Reach `http://localhost:8000`
- **Cause:** Inside the Android emulator, `localhost` refers to the Android device itself.
- **Fix:** Set `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000` in `GemBot/.env`.

### 3. RevenueCat Sandbox / Test Store Warning Noise
- **Behavior:** The RevenueCat SDK emits warnings in sandbox mode when test stores are detected.
- **Fix:** A custom log handler is pre-installed in `GemBot/lib/purchases.ts` that filters out harmless sandbox deserialization warnings in development.

---

## 👥 License

Licensed under the [MIT License](LICENSE).
