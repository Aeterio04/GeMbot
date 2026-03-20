import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView, ActivityIndicator, Alert, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Colors, FontFamily } from '../constants/theme';
import {
  getCurrentOffering,
  restorePurchases,
  isProActive,
  ENTITLEMENT_ID,
} from '../lib/purchases';
import { useAuth } from '../lib/authContext';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import Purchases from 'react-native-purchases';

// ── Static plan definitions (fallback when RC offerings unavailable) ─────────
const STATIC_PLANS = [
  { id: 'weekly',   label: 'Weekly',   price: '$2.99',  period: '/ week',     badge: null },
  { id: 'monthly',  label: 'Monthly',  price: '$9.99',  period: '/ month',    badge: null },
  { id: 'yearly',   label: 'Yearly',   price: '$79.99', period: '/ year',     badge: 'BEST VALUE' },
  { id: 'lifetime', label: 'Lifetime', price: '$99.99', period: 'one-time',   badge: null },
];

// ── Icon components (pure RN, no emoji) ─────────────────────────────────────
function IconInfinity({ color }: { color: string }) {
  return (
    <View style={[iconStyles.box, { borderColor: color }]}>
      <Text style={[iconStyles.symbol, { color }]}>∞</Text>
    </View>
  );
}
function IconImage({ color }: { color: string }) {
  return (
    <View style={[iconStyles.box, { borderColor: color }]}>
      <View style={[iconStyles.imgOuter, { borderColor: color }]}>
        <View style={[iconStyles.imgDot, { backgroundColor: color }]} />
        <View style={[iconStyles.imgMountain, { borderBottomColor: color }]} />
      </View>
    </View>
  );
}
function IconBolt({ color }: { color: string }) {
  return (
    <View style={[iconStyles.box, { borderColor: color }]}>
      <Text style={[iconStyles.symbol, { color }]}>↯</Text>
    </View>
  );
}
function IconLeaf({ color }: { color: string }) {
  return (
    <View style={[iconStyles.box, { borderColor: color }]}>
      <View style={[iconStyles.leaf, { borderColor: color }]} />
    </View>
  );
}

const iconStyles = StyleSheet.create({
  box:        { width: 36, height: 36, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  symbol:     { fontSize: 18, fontWeight: '600', lineHeight: 22 },
  imgOuter:   { width: 20, height: 16, borderWidth: 1.5, borderRadius: 2, overflow: 'hidden', alignItems: 'flex-start', justifyContent: 'flex-end' },
  imgDot:     { width: 5, height: 5, borderRadius: 3, position: 'absolute', top: 3, left: 3 },
  imgMountain:{ width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', position: 'absolute', bottom: 0, left: 2 },
  leaf:       { width: 18, height: 18, borderRadius: 2, borderTopRightRadius: 12, borderWidth: 1.5, transform: [{ rotate: '45deg' }] },
});

const FEATURES = [
  { Icon: IconInfinity, text: 'Unlimited AI Skin & Diet Coaching' },
  { Icon: IconImage,    text: 'Detailed Image Analysis Reports' },
  { Icon: IconBolt,     text: 'Faster Response Times' },
  { Icon: IconLeaf,     text: 'Customized Meal Plans' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function getPlanId(pkg: PurchasesPackage): string {
  const id = pkg.identifier.toLowerCase();
  if (id.includes('lifetime')) return 'lifetime';
  if (id.includes('yearly') || id.includes('annual')) return 'yearly';
  if (id.includes('monthly')) return 'monthly';
  if (id.includes('weekly')) return 'weekly';
  return id;
}

function getPlanLabel(pkg: PurchasesPackage): string {
  const id = getPlanId(pkg);
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function getPlanPeriod(pkg: PurchasesPackage): string {
  const id = getPlanId(pkg);
  if (id === 'lifetime') return 'one-time';
  if (id === 'yearly')   return '/ year';
  if (id === 'monthly')  return '/ month';
  if (id === 'weekly')   return '/ week';
  return '';
}

function isBestValue(pkg: PurchasesPackage): boolean {
  return getPlanId(pkg) === 'yearly';
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function UpgradeScreen() {
  const { isGuest } = useAuth();
  const [offering, setOffering]     = useState<PurchasesOffering | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [selectedStatic, setSelectedStatic] = useState<string>('yearly');
  const [loading, setLoading]       = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [useStatic, setUseStatic]   = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    // Guests must sign in before purchasing
    if (isGuest) {
      setLoading(false);
      return;
    }

    // Try RC native paywall first
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        router.back();
        return;
      }
    } catch { /* fall through */ }

    // Load RC offerings
    try {
      const current = await getCurrentOffering();
      if (current?.availablePackages.length) {
        setOffering(current);
        const preferred =
          current.availablePackages.find(p => getPlanId(p) === 'yearly') ??
          current.availablePackages.find(p => getPlanId(p) === 'monthly') ??
          current.availablePackages[0];
        setSelectedPkg(preferred ?? null);
      } else {
        setUseStatic(true);
      }
    } catch {
      setUseStatic(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (isGuest) {
      Alert.alert(
        'Sign In Required',
        'You need an account to purchase a subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.replace('/auth') },
        ]
      );
      return;
    }
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPkg);
      if (isProActive(customerInfo)) {
        Alert.alert('Subscription Active', 'You now have access to GemBot Pro.');
        router.back();
      }
    } catch (error: any) {
      // Swallow silently: user cancellation, sandbox/test enum errors,
      // and any RC configuration errors that aren't actionable for the user.
      if (error.userCancelled) return;
      const msg: string = error.message ?? '';
      const isSandboxOrEnumError =
        msg.includes('enum') ||
        msg.includes('ENUM') ||
        msg.includes('storefront') ||
        msg.includes('StoreKit') ||
        msg.includes('sandbox') ||
        msg.includes('test') ||
        msg.includes('configuration') ||
        (typeof error.code === 'number' && error.code < 0);
      if (!isSandboxOrEnumError) {
        Alert.alert('Purchase Failed', msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      const info = await restorePurchases();
      if (isProActive(info)) {
        Alert.alert('Restored', 'Your subscription has been restored.');
        router.back();
      } else {
        Alert.alert('Nothing to Restore', 'No active subscription was found on this account.');
      }
    } catch (e: any) {
      // Swallow sandbox/enum errors silently
      const msg: string = e.message ?? '';
      const isSandboxOrEnumError =
        msg.includes('enum') || msg.includes('ENUM') ||
        msg.includes('sandbox') || msg.includes('test') ||
        msg.includes('configuration');
      if (!isSandboxOrEnumError) {
        Alert.alert('Restore Failed', msg || 'Something went wrong.');
      }
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  // ── Guest gate ─────────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Pressable style={s.closeBtn} onPress={() => router.back()} hitSlop={8}>
            <View style={s.closeLine1} />
            <View style={s.closeLine2} />
          </Pressable>
        </View>
        <View style={s.guestGate}>
          <View style={s.heroIconWrap}>
            <View style={s.diamondOuter}><View style={s.diamondInner} /></View>
          </View>
          <Text style={s.title}>GemBot Pro</Text>
          <Text style={s.subtitle}>Sign in to unlock Pro features and manage your subscription.</Text>
          <TouchableOpacity style={[s.ctaBtn, { marginTop: 32 }]} onPress={() => router.replace('/auth')} activeOpacity={0.85}>
            <Text style={s.ctaText}>Sign In / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ctaLabel = useStatic
    ? `Get ${STATIC_PLANS.find(p => p.id === selectedStatic)?.label ?? 'Pro'}`
    : selectedPkg ? `Get ${getPlanLabel(selectedPkg)}` : 'Select a Plan';

  return (
    <SafeAreaView style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable style={s.closeBtn} onPress={() => router.back()} hitSlop={8}>
          <View style={s.closeLine1} />
          <View style={s.closeLine2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          {/* Diamond icon — pure shapes */}
          <View style={s.heroIconWrap}>
            <View style={s.diamondOuter}>
              <View style={s.diamondInner} />
            </View>
          </View>
          <Text style={s.title}>GemBot Pro</Text>
          <Text style={s.subtitle}>
            Personalized AI coaching for your skin and diet — powered by advanced analysis.
          </Text>
        </View>

        {/* ── Divider ── */}
        <View style={s.divider} />

        {/* ── Features ── */}
        <View style={s.featureList}>
          {FEATURES.map(({ Icon, text }, i) => (
            <View key={i} style={s.featureRow}>
              <Icon color={Colors.primary} />
              <Text style={s.featureText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={s.divider} />

        {/* ── Plans ── */}
        <Text style={s.sectionLabel}>Choose a plan</Text>

        <View style={s.planList}>
          {useStatic
            ? STATIC_PLANS.map(plan => (
                <Pressable
                  key={plan.id}
                  style={[s.planCard, selectedStatic === plan.id && s.planCardActive]}
                  onPress={() => setSelectedStatic(plan.id)}
                >
                  <View style={[s.radio, selectedStatic === plan.id && s.radioActive]}>
                    {selectedStatic === plan.id && <View style={s.radioDot} />}
                  </View>
                  <View style={s.planBody}>
                    <View style={s.planRow}>
                      <Text style={s.planName}>{plan.label}</Text>
                      {plan.badge && (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>{plan.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.planPrice}>
                      {plan.price}
                      <Text style={s.planPeriod}>  {plan.period}</Text>
                    </Text>
                  </View>
                </Pressable>
              ))
            : offering!.availablePackages.map(pkg => (
                <Pressable
                  key={pkg.identifier}
                  style={[s.planCard, selectedPkg?.identifier === pkg.identifier && s.planCardActive]}
                  onPress={() => setSelectedPkg(pkg)}
                >
                  <View style={[s.radio, selectedPkg?.identifier === pkg.identifier && s.radioActive]}>
                    {selectedPkg?.identifier === pkg.identifier && <View style={s.radioDot} />}
                  </View>
                  <View style={s.planBody}>
                    <View style={s.planRow}>
                      <Text style={s.planName}>{getPlanLabel(pkg)}</Text>
                      {isBestValue(pkg) && (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>BEST VALUE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.planPrice}>
                      {pkg.product.priceString}
                      <Text style={s.planPeriod}>  {getPlanPeriod(pkg)}</Text>
                    </Text>
                    {pkg.product.introPrice && (
                      <Text style={s.introNote}>
                        Intro offer: {pkg.product.introPrice.priceString}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))
          }
        </View>

      </ScrollView>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.ctaBtn, (purchasing || (!selectedPkg && !useStatic)) && s.ctaBtnDisabled]}
          activeOpacity={0.85}
          onPress={handlePurchase}
          disabled={purchasing || (!selectedPkg && !useStatic)}
        >
          {purchasing
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.ctaText}>{ctaLabel}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.restoreBtn} onPress={handleRestore}>
          <Text style={s.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          Subscriptions renew automatically. Cancel anytime in your account settings.
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>

    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  guestGate:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  // Header
  header:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, alignItems: 'flex-end' },
  closeBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  closeLine1: { position: 'absolute', width: 14, height: 1.5, backgroundColor: Colors.muted, transform: [{ rotate: '45deg' }] },
  closeLine2: { position: 'absolute', width: 14, height: 1.5, backgroundColor: Colors.muted, transform: [{ rotate: '-45deg' }] },

  scroll:     { paddingHorizontal: 24, paddingBottom: 32 },

  // Hero
  hero:           { alignItems: 'center', paddingTop: 16, paddingBottom: 28 },
  heroIconWrap:   { width: 64, height: 64, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  diamondOuter:   { width: 28, height: 28, backgroundColor: Colors.primary, transform: [{ rotate: '45deg' }], borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  diamondInner:   { width: 14, height: 14, backgroundColor: Colors.primary + '60', borderRadius: 2 },
  title:          { fontFamily: FontFamily.fraunces, fontSize: 26, color: Colors.text, textAlign: 'center', marginBottom: 10 },
  subtitle:       { fontFamily: FontFamily.dmSans, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },

  divider:    { height: 1, backgroundColor: Colors.border, marginVertical: 20 },

  // Features
  featureList:  { gap: 16, paddingHorizontal: 4 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureText:  { fontFamily: FontFamily.dmSansMedium, fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },

  // Plans
  sectionLabel: { fontFamily: FontFamily.dmSansSemiBold, fontSize: 12, color: Colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
  planList:     { gap: 10 },
  planCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16, gap: 14 },
  planCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '06' },
  radio:        { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive:  { borderColor: Colors.primary },
  radioDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  planBody:     { flex: 1 },
  planRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  planName:     { fontFamily: FontFamily.dmSansSemiBold, fontSize: 15, color: Colors.text },
  badge:        { backgroundColor: Colors.primary, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  badgeText:    { fontFamily: FontFamily.dmSansSemiBold, fontSize: 9, color: '#fff', letterSpacing: 0.5 },
  planPrice:    { fontFamily: FontFamily.fraunces, fontSize: 20, color: Colors.text },
  planPeriod:   { fontFamily: FontFamily.dmSans, fontSize: 13, color: Colors.muted },
  introNote:    { fontFamily: FontFamily.dmSans, fontSize: 11, color: Colors.primary, marginTop: 3 },

  // Footer
  footer:       { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  ctaBtn:       { backgroundColor: Colors.primary, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ctaBtnDisabled: { opacity: 0.45 },
  ctaText:      { fontFamily: FontFamily.dmSansSemiBold, fontSize: 16, color: '#fff', letterSpacing: 0.2 },
  restoreBtn:   { alignItems: 'center', marginBottom: 14 },
  restoreText:  { fontFamily: FontFamily.dmSansMedium, fontSize: 13, color: Colors.muted },
  disclaimer:   { fontFamily: FontFamily.dmSans, fontSize: 10, color: Colors.muted, textAlign: 'center', lineHeight: 15 },
});
