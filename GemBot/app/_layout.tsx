import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../lib/authContext';
import { configureRevenueCat, identifyUser, resetUser } from '../lib/purchases';

// Inner component so it can use the useAuth hook (must be inside AuthProvider)
function RootNavigator() {
  const { session, isGuest, loading } = useAuth();

  // Initialize RevenueCat once on mount
  useEffect(() => {
    configureRevenueCat();
  }, []);

  // Identify / de-identify user in RevenueCat when auth state changes
  useEffect(() => {
    if (loading) return;
    if (session?.user_id) {
      identifyUser(session.user_id).catch(console.warn);
    } else {
      resetUser().catch(console.warn);
    }
  }, [session, loading]);

  useEffect(() => {
    if (loading) return;
    if (session || isGuest) {
      router.replace('/(tabs)');
    } else {
      router.replace('/auth');
    }
  }, [session, isGuest, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F5F0' }}>
        <ActivityIndicator color="#00C896" size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="upgrade" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMMono_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F5F0' }}>
        <ActivityIndicator color="#00C896" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
