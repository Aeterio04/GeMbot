import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Dimensions, SafeAreaView,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontFamily } from '../constants/theme';

const { width } = Dimensions.get('window');

// ── Slide illustration icons (pure shapes, no emoji) ─────────────────────────
function IconPlate({ color }: { color: string }) {
  // Circle plate with fork/knife lines
  return (
    <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 2, height: 32, backgroundColor: color, borderRadius: 1, position: 'absolute', left: 22 }} />
        <View style={{ width: 2, height: 32, backgroundColor: color, borderRadius: 1, position: 'absolute', right: 22 }} />
        <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: color }} />
      </View>
    </View>
  );
}

function IconChat({ color }: { color: string }) {
  return (
    <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 64, height: 48, borderRadius: 12, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <View style={{ width: 36, height: 2, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 28, height: 2, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 32, height: 2, backgroundColor: color, borderRadius: 1 }} />
      </View>
      <View style={{ width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 0, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color, marginTop: -2, marginLeft: -40 }} />
    </View>
  );
}

function IconChart({ color }: { color: string }) {
  return (
    <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 52 }}>
        <View style={{ width: 14, height: 24, backgroundColor: color, borderRadius: 3, opacity: 0.5 }} />
        <View style={{ width: 14, height: 40, backgroundColor: color, borderRadius: 3, opacity: 0.75 }} />
        <View style={{ width: 14, height: 52, backgroundColor: color, borderRadius: 3 }} />
        <View style={{ width: 14, height: 32, backgroundColor: color, borderRadius: 3, opacity: 0.65 }} />
      </View>
    </View>
  );
}

function IconStar({ color }: { color: string }) {
  // Diamond shape as "transform" icon
  return (
    <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 44, height: 44, backgroundColor: color, transform: [{ rotate: '45deg' }], borderRadius: 6 }} />
      <View style={{ position: 'absolute', width: 22, height: 22, backgroundColor: color, opacity: 0.4, transform: [{ rotate: '45deg' }], borderRadius: 3 }} />
    </View>
  );
}

const SLIDE_ICONS = [IconPlate, IconChat, IconChart, IconStar];

const SLIDES = [
  {
    id: '1',
    headline: 'Your Skin Starts\nin the Kitchen',
    subtitle: 'What you eat shows up on your face. GemBot helps you connect the dots between diet and glow.',
  },
  {
    id: '2',
    headline: 'Ask Anything,\nAnytime',
    subtitle: 'From acne triggers to glow foods — get science-backed answers about your skin-diet connection.',
  },
  {
    id: '3',
    headline: 'Track What\nMatters',
    subtitle: 'Your personalized skin-diet journal, powered by AI and built around your unique biology.',
  },
  {
    id: '4',
    headline: 'Ready to\nTransform?',
    subtitle: 'Join thousands using GemBot to eat their way to better, clearer, healthier skin.',
  },
];

const finishOnboarding = async () => {
  await AsyncStorage.setItem('onboarding_seen', 'true');
  router.replace('/auth');
};

export default function Onboarding() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const dotWidths = SLIDES.map(() => useRef(new Animated.Value(8)).current);

  const animateDots = (index: number) => {
    SLIDES.forEach((_, i) => {
      Animated.spring(dotWidths[i], {
        toValue: i === index ? 24 : 8,
        useNativeDriver: false,
      }).start();
    });
  };

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== activeIndex) {
      setActiveIndex(index);
      animateDots(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const next = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
      animateDots(next);
    } else {
      finishOnboarding();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={finishOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const Icon = SLIDE_ICONS[index];
          return (
            <View style={styles.slide}>
              <View style={styles.illustrationBox}>
                <Icon color={Colors.primary} />
              </View>
              <Text style={styles.headline}>{item.headline}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          );
        }}
      />

      {/* Progress Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { width: dotWidths[i] }, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.buttonText}>
          {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingBottom: 48,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  skipText: {
    fontFamily: FontFamily.dmSans,
    fontSize: 14,
    color: Colors.muted,
  },
  slide: {
    width,
    paddingHorizontal: 32,
    alignItems: 'center',
    paddingTop: 32,
  },
  illustrationBox: {
    width: 200,
    height: 200,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  emoji: { fontSize: 0 }, // unused — kept for reference only
  headline: {
    fontFamily: FontFamily.fraunces,
    fontSize: 38,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 46,
    marginBottom: 20,
  },
  subtitle: {
    fontFamily: FontFamily.dmSans,
    fontSize: 16,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 64,
    paddingVertical: 18,
    borderRadius: 999,
  },
  buttonText: {
    fontFamily: FontFamily.dmSansSemiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
