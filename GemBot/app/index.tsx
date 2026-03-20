import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Route = '/onboarding' | '/auth' | '/(tabs)' | null;

export default function Index() {
  const [route, setRoute] = useState<Route>(null);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem('onboarding_seen');
        if (!seen) {
          setRoute('/onboarding');
        } else {
          setRoute('/auth');
        }
      } catch (e) {
        setRoute('/auth');
      }
    })();
  }, []);

  if (!route) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F5F0' }}>
        <ActivityIndicator color="#00C896" size="large" />
      </View>
    );
  }

  return <Redirect href={route} />;
}