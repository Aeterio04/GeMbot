import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Colors, FontFamily } from '../constants/theme';
import { useAuth } from '../lib/authContext';
import { authSignup, authLogin, getOAuthUrl, handleOAuthCallback } from '../lib/api';

// Required for expo-auth-session / web browser redirect handling
WebBrowser.maybeCompleteAuthSession();

type Tab = 'signin' | 'signup';

// ─── Google "G" Logo (accurate arc-segment shape) ────────────────────────────
function GoogleLogo({ size = 22 }: { size?: number }) {
  const s = size;
  const r = s / 2;          // outer radius
  const stroke = s * 0.22;  // ring thickness
  const ri = r - stroke;    // inner radius

  // We draw the G using 4 colored arc-segment wedges clipped to a donut shape.
  // Each wedge is a rotated View with overflow:hidden that shows one color sector.
  // The donut hole is punched out by an absolutely-positioned white circle on top.
  // The blue horizontal bar of the G is drawn last.

  const wedge = (rotation: number, color: string, sweep: number) => (
    <View
      style={{
        position: 'absolute', width: s, height: s,
        transform: [{ rotate: `${rotation}deg` }],
        overflow: 'hidden',
      }}
    >
      {/* Half-circle colored wedge */}
      <View
        style={{
          position: 'absolute',
          width: s, height: s / 2,
          top: 0,
          backgroundColor: color,
          borderTopLeftRadius: r,
          borderTopRightRadius: r,
        }}
      />
    </View>
  );

  return (
    <View style={{ width: s, height: s }}>
      {/* Red — top arc, roughly 130° */}
      {wedge(-15, '#EA4335', 130)}
      {/* Blue — right arc, roughly 95° */}
      {wedge(115, '#4285F4', 95)}
      {/* Green — bottom-right arc, roughly 95° */}
      {wedge(210, '#34A853', 95)}
      {/* Yellow — bottom-left arc, roughly 95° */}
      {wedge(305, '#FBBC05', 95)}

      {/* Donut hole — white circle punches out the center */}
      <View
        style={{
          position: 'absolute',
          width: ri * 2, height: ri * 2,
          borderRadius: ri,
          backgroundColor: '#fff',
          top: stroke, left: stroke,
        }}
      />

      {/* Blue horizontal bar of the G (right side) */}
      <View
        style={{
          position: 'absolute',
          width: r * 0.72,
          height: stroke * 0.85,
          backgroundColor: '#4285F4',
          top: r - (stroke * 0.85) / 2,
          right: 0,
          borderTopLeftRadius: 1,
          borderBottomLeftRadius: 1,
        }}
      />
      {/* White gap above the bar (to create the open-top of the G) */}
      <View
        style={{
          position: 'absolute',
          width: r * 0.72,
          height: stroke,
          backgroundColor: '#fff',
          top: r - stroke * 1.4,
          right: 0,
        }}
      />
    </View>
  );
}

export default function Auth() {
  const { setSession, continueAsGuest } = useAuth();

  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');

  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (next: Tab) => {
    setError('');
    setTab(next);
    Animated.spring(slideAnim, {
      toValue: next === 'signin' ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
  };

  // ─── Email / Password Auth ───────────────────────────────────────────────
  const handleAuth = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (tab === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'signup') {
        // Register the user on the backend (Supabase under the hood)
        await authSignup(email.trim(), password);
        // Immediately sign them in to get a session token
        const loginRes = await authLogin(email.trim(), password);
        await setSession({ access_token: loginRes.access_token, user_id: loginRes.user_id, email: email.trim() });
      } else {
        const loginRes = await authLogin(email.trim(), password);
        await setSession({ access_token: loginRes.access_token, user_id: loginRes.user_id, email: email.trim() });
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Google OAuth ────────────────────────────────────────────────────────
  const handleGoogleOAuth = async () => {
    setError('');
    setOauthLoading(true);
    try {
      // 1. Ask the backend for the Supabase OAuth URL
      const oauthUrl = await getOAuthUrl('google');

      // 2. Open it in an in-app browser
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl,
        process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URL ?? ''
      );

      if (result.type !== 'success') {
        // User cancelled or failed — just do nothing
        return;
      }

      // 3. Parse the access_token from the redirect URL fragment/query
      //    Supabase returns: your-redirect-url#access_token=xxx&...
      const url = result.url;
      const fragmentOrQuery = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
      const params: Record<string, string> = {};
      if (fragmentOrQuery) {
        fragmentOrQuery.split('&').forEach((pair) => {
          const [key, value] = pair.split('=');
          if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
        });
      }

      const access_token = params['access_token'];
      if (!access_token) {
        setError('OAuth sign-in failed: no token returned. Please try again.');
        return;
      }

      // 4. Validate the token by calling the backend callback
      const callbackRes = await handleOAuthCallback(access_token);

      // 5. Persist the session and navigate
      await setSession({
        access_token: callbackRes.access_token,
        user_id: callbackRes.user_id,
        email: callbackRes.email,
      });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setOauthLoading(false);
    }
  };

  // ─── Forgot Password ─────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    // TODO: wire up a /auth/reset-password endpoint
    alert('Password reset coming soon!');
  };

  const tabPillLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '50%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoBox}>
              {/* Diamond logo mark */}
              <View style={styles.logoDiamond} />
            </View>
          </View>
          <Text style={styles.appName}>GemBot</Text>
          <Text style={styles.tagline}>Your skin. Your diet. Your AI.</Text>

          {/* Tab Toggle */}
          <View style={styles.tabContainer}>
            <Animated.View style={[styles.tabPill, { left: tabPillLeft }]} />
            <TouchableOpacity style={styles.tabItem} onPress={() => switchTab('signin')}>
              <Text style={[styles.tabText, tab === 'signin' && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => switchTab('signup')}>
              <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.fields}>
            {/* Email */}
            <View style={[styles.inputRow, emailFocused && styles.inputFocused]}>
              <View style={styles.inputIconWrap}>
                <View style={styles.emailAt} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Password */}
            <View style={[styles.inputRow, passFocused && styles.inputFocused]}>
              <View style={styles.inputIconWrap}>
                <View style={styles.lockBody} />
                <View style={styles.lockShackle} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <View style={styles.inputIconWrap}>
                  {showPassword
                    ? <View style={styles.eyeSlash} />
                    : <View style={styles.eyeOpen} />
                  }
                </View>
              </TouchableOpacity>
            </View>

            {/* Confirm Password — sign up only */}
            {tab === 'signup' && (
              <View style={[styles.inputRow, confirmFocused && styles.inputFocused]}>
                <View style={styles.inputIconWrap}>
                  <View style={styles.lockBody} />
                  <View style={styles.lockShackle} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={Colors.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                />
              </View>
            )}

            {/* Error Message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Primary CTA */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleAuth}
              disabled={loading || oauthLoading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{tab === 'signin' ? 'Sign In' : 'Sign Up'}</Text>
              }
            </TouchableOpacity>

            {/* Forgot Password */}
            {tab === 'signin' && (
              <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end' }}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google OAuth */}
            <TouchableOpacity
              style={[styles.ghostBtn, oauthLoading && { opacity: 0.7 }]}
              onPress={handleGoogleOAuth}
              disabled={loading || oauthLoading}
              activeOpacity={0.7}
            >
              {oauthLoading
                ? <ActivityIndicator color={Colors.text} size="small" />
                : (
                  <>
                    <GoogleLogo size={22} />
                    <Text style={styles.ghostText}>Continue with Google</Text>
                  </>
                )
              }
            </TouchableOpacity>

            {/* Guest */}
            <TouchableOpacity
              style={styles.ghostBtn}
              activeOpacity={0.7}
              onPress={continueAsGuest}
              disabled={loading || oauthLoading}
            >
              <View style={styles.guestIcon}>
                <View style={styles.guestHead} />
                <View style={styles.guestBody} />
              </View>
              <Text style={styles.ghostText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },

  logoWrap: { alignItems: 'center', marginTop: 36, marginBottom: 14 },
  logoBox: {
    width: 100, height: 100, borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  logoDiamond: {
    width: 40, height: 40,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
    borderRadius: 6,
  },
  appName: {
    fontFamily: FontFamily.fraunces,
    fontSize: 34, color: Colors.primary,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: FontFamily.dmSans,
    fontSize: 14, color: Colors.muted,
    textAlign: 'center', marginBottom: 32,
  },

  // Tab Toggle
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 999,
    borderWidth: 1, borderColor: Colors.border,
    padding: 4,
    marginBottom: 28,
    position: 'relative',
    height: 50,
    alignItems: 'center',
    overflow: 'hidden',
  },
  tabPill: {
    position: 'absolute',
    width: '48%', height: 40,
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabText: { fontFamily: FontFamily.dmSansMedium, fontSize: 14, color: Colors.muted },
  tabTextActive: { color: '#FFFFFF' },

  // Fields
  fields: { gap: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16, height: 54,
  },
  inputFocused: { borderColor: Colors.primary },
  inputIconWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  // Email @ icon — circle with a dot
  emailAt:      { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.muted },
  // Lock icon
  lockBody:     { width: 14, height: 10, borderRadius: 3, borderWidth: 1.5, borderColor: Colors.muted, position: 'absolute', bottom: 0 },
  lockShackle:  { width: 8, height: 7, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderWidth: 1.5, borderColor: Colors.muted, borderBottomWidth: 0, position: 'absolute', top: 0 },
  // Eye icons
  eyeOpen:      { width: 16, height: 10, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.muted },
  eyeSlash:     { width: 16, height: 1.5, backgroundColor: Colors.muted, transform: [{ rotate: '-30deg' }] },
  // Guest icon
  guestIcon:    { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  guestHead:    { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: Colors.muted, position: 'absolute', top: 0 },
  guestBody:    { width: 16, height: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1.5, borderColor: Colors.muted, borderBottomWidth: 0, position: 'absolute', bottom: 0 },
  input: {
    flex: 1,
    fontFamily: FontFamily.dmSans,
    fontSize: 15, color: Colors.text,
  },

  errorText: {
    fontFamily: FontFamily.dmSans,
    fontSize: 13, color: Colors.error, textAlign: 'center',
  },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 999, height: 54,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  primaryBtnText: {
    fontFamily: FontFamily.dmSansSemiBold,
    fontSize: 16, color: '#FFFFFF',
  },

  forgotText: {
    fontFamily: FontFamily.dmSans,
    fontSize: 14, color: Colors.accent,
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontFamily: FontFamily.dmSans, fontSize: 13, color: Colors.muted },

  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 999, height: 52, gap: 10,
  },
  ghostText: { fontFamily: FontFamily.dmSansMedium, fontSize: 15, color: Colors.text },
});
