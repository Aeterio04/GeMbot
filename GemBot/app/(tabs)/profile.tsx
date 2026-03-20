import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, AppState, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors, FontFamily } from '../../constants/theme';
import { getCustomerInfo, isProActive, restorePurchases, ENTITLEMENT_ID } from '../../lib/purchases';
import { useAuth } from '../../lib/authContext';
import type { CustomerInfo } from 'react-native-purchases';

const SETTINGS = [
  { label: 'Edit Profile' },
  { label: 'Notifications' },
  { label: 'Privacy Policy' },
  { label: 'Support' },
];

// ── Subscription Detail Modal ─────────────────────────────────────────────────
function SubscriptionModal({
  visible,
  customerInfo,
  onClose,
  onChangePlan,
}: {
  visible: boolean;
  customerInfo: CustomerInfo | null;
  onClose: () => void;
  onChangePlan: () => void;
}) {
  const entitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID];
  const allPurchases = customerInfo?.allPurchasedProductIdentifiers ?? [];

  // Derive plan label from active product identifier
  const activeProduct = entitlement?.productIdentifier ?? '';
  const getPlanLabel = (id: string) => {
    const lower = id.toLowerCase();
    if (lower.includes('lifetime')) return 'Lifetime';
    if (lower.includes('annual') || lower.includes('yearly')) return 'Yearly';
    if (lower.includes('monthly')) return 'Monthly';
    if (lower.includes('weekly')) return 'Weekly';
    return id || 'Pro';
  };

  const planLabel = getPlanLabel(activeProduct);

  const renewsDate = entitlement?.expirationDate
    ? new Date(entitlement.expirationDate).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const isLifetime = activeProduct.toLowerCase().includes('lifetime') || !renewsDate;

  const periodStart = entitlement?.latestPurchaseDate
    ? new Date(entitlement.latestPurchaseDate).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={ms.container}>
        {/* Header */}
        <View style={ms.header}>
          <Text style={ms.headerTitle}>My Subscription</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={ms.closeBtn}>
            <View style={ms.closeLine1} />
            <View style={ms.closeLine2} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={ms.scroll}>
          {/* Active plan card */}
          <View style={ms.planCard}>
            <View style={ms.planCardTop}>
              <View style={ms.activeBadge}>
                <View style={ms.activeDot} />
                <Text style={ms.activeBadgeText}>ACTIVE</Text>
              </View>
              <Text style={ms.planName}>GemBot Pro — {planLabel}</Text>
            </View>

            <View style={ms.divider} />

            <View style={ms.detailRow}>
              <Text style={ms.detailLabel}>Status</Text>
              <Text style={ms.detailValue}>Active</Text>
            </View>

            {periodStart && (
              <View style={ms.detailRow}>
                <Text style={ms.detailLabel}>Started</Text>
                <Text style={ms.detailValue}>{periodStart}</Text>
              </View>
            )}

            {isLifetime ? (
              <View style={ms.detailRow}>
                <Text style={ms.detailLabel}>Billing</Text>
                <Text style={ms.detailValue}>One-time purchase</Text>
              </View>
            ) : (
              <View style={ms.detailRow}>
                <Text style={ms.detailLabel}>Renews</Text>
                <Text style={ms.detailValue}>{renewsDate}</Text>
              </View>
            )}

            {activeProduct ? (
              <View style={ms.detailRow}>
                <Text style={ms.detailLabel}>Product ID</Text>
                <Text style={[ms.detailValue, ms.detailMono]}>{activeProduct}</Text>
              </View>
            ) : null}
          </View>

          {/* Change plan */}
          <TouchableOpacity style={ms.actionBtn} onPress={onChangePlan} activeOpacity={0.85}>
            <Text style={ms.actionBtnText}>Change Plan</Text>
          </TouchableOpacity>

          {/* Purchase history */}
          {allPurchases.length > 0 && (
            <View style={ms.historyCard}>
              <Text style={ms.historyTitle}>Purchase History</Text>
              {allPurchases.map((pid, i) => (
                <View key={pid} style={[ms.historyRow, i < allPurchases.length - 1 && ms.historyRowBorder]}>
                  <Text style={ms.historyProduct}>{getPlanLabel(pid)}</Text>
                  <Text style={ms.historyId}>{pid}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={ms.note}>
            To cancel your subscription, go to your device's subscription settings
            (App Store or Google Play).
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle:  { fontFamily: FontFamily.dmSansSemiBold, fontSize: 17, color: Colors.text },
  closeBtn:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeLine1:   { position: 'absolute', width: 16, height: 1.5, backgroundColor: Colors.muted, transform: [{ rotate: '45deg' }] },
  closeLine2:   { position: 'absolute', width: 16, height: 1.5, backgroundColor: Colors.muted, transform: [{ rotate: '-45deg' }] },

  scroll:       { padding: 20, gap: 14 },

  planCard:     { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 20 },
  planCardTop:  { marginBottom: 16 },
  activeBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  activeDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  activeBadgeText: { fontFamily: FontFamily.dmSansSemiBold, fontSize: 11, color: Colors.primary, letterSpacing: 0.8 },
  planName:     { fontFamily: FontFamily.fraunces, fontSize: 22, color: Colors.text },

  divider:      { height: 1, backgroundColor: Colors.border, marginBottom: 16 },

  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8 },
  detailLabel:  { fontFamily: FontFamily.dmSans, fontSize: 14, color: Colors.muted },
  detailValue:  { fontFamily: FontFamily.dmSansMedium, fontSize: 14, color: Colors.text, maxWidth: '60%', textAlign: 'right' },
  detailMono:   { fontFamily: FontFamily.dmMono, fontSize: 11 },

  actionBtn:    { backgroundColor: Colors.primary, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnText:{ fontFamily: FontFamily.dmSansSemiBold, fontSize: 15, color: '#fff' },

  historyCard:  { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 20 },
  historyTitle: { fontFamily: FontFamily.dmSansSemiBold, fontSize: 14, color: Colors.text, marginBottom: 12 },
  historyRow:   { paddingVertical: 10 },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  historyProduct: { fontFamily: FontFamily.dmSansMedium, fontSize: 14, color: Colors.text },
  historyId:    { fontFamily: FontFamily.dmMono, fontSize: 11, color: Colors.muted, marginTop: 2 },

  note:         { fontFamily: FontFamily.dmSans, fontSize: 12, color: Colors.muted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
});

export default function ProfileScreen() {
  const { isGuest, signOut } = useAuth();
  const [user, setUser]             = useState<any>(null);
  const [initials, setInitials]     = useState('HU');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [showManage, setShowManage] = useState(false);

  const isPro = !isGuest && customerInfo ? isProActive(customerInfo) : false;

  // Fetch Supabase user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        const parts = session.user.email.split('@')[0].split('.');
        const ini = parts.map((p: string) => p[0]?.toUpperCase() ?? '').join('').slice(0, 2);
        setInitials(ini || 'HU');
      }
    });
  }, []);

  // Refresh entitlement status whenever this screen comes into focus
  // (covers the case where user just purchased on the upgrade screen)
  useFocusEffect(
    useCallback(() => {
      if (!isGuest) refreshCustomerInfo();
    }, [isGuest])
  );

  // Also refresh when app comes back to foreground (e.g. after App Store purchase)
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && !isGuest) refreshCustomerInfo();
    });
    return () => sub.remove();
  }, [isGuest]);

  const refreshCustomerInfo = async () => {
    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch (e) {
      console.warn('Could not fetch customer info:', e);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await signOut();
    router.replace('/auth');
  };

  const handleSignIn = () => {
    router.replace('/auth');
  };

  const handleManageSubscription = () => {
    setShowManage(true);
  };

  const handleRestore = async () => {
    try {
      const info = await restorePurchases();
      setCustomerInfo(info);
      if (isProActive(info)) {
        Alert.alert('Restored', 'Your subscription has been restored.');
      } else {
        Alert.alert('Nothing to Restore', 'No active subscription was found on this account.');
      }
    } catch (e: any) {
      Alert.alert('Restore Failed', e.message ?? 'Something went wrong.');
    }
  };

  const displayName = isGuest ? 'Guest' : (user?.user_metadata?.full_name || 'Healthy User');
  const email       = isGuest ? 'Not signed in' : (user?.email || 'user@gembot.app');

  // Subscription expiry label
  const proEntitlement = customerInfo?.entitlements.active['GemBot Pro'];
  const expiresLabel = proEntitlement?.expirationDate
    ? `Renews ${new Date(proEntitlement.expirationDate).toLocaleDateString()}`
    : isPro ? 'Lifetime access' : null;

  return (
    <SafeAreaView style={styles.container}>
      <SubscriptionModal
        visible={showManage}
        customerInfo={customerInfo}
        onClose={() => setShowManage(false)}
        onChangePlan={() => {
          setShowManage(false);
          router.push('/upgrade');
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header Card ── */}
        <View style={[styles.card, styles.headerCard]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>
          <View style={[styles.pill, isPro ? styles.pillPro : styles.pillFree]}>
            {isPro && <View style={styles.pillDiamond} />}
            <Text style={[styles.pillText, isPro ? styles.pillTextPro : styles.pillTextFree]}>
              {isPro ? 'PRO' : 'FREE'}
            </Text>
          </View>
          {expiresLabel && (
            <Text style={styles.expiresLabel}>{expiresLabel}</Text>
          )}
        </View>

        {/* ── Upgrade Card (free authenticated users only) ── */}
        {!isPro && !isGuest && (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
            <Text style={styles.upgradeSubtitle}>
              Unlimited AI coaching, detailed skin-diet reports.
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/upgrade')}
            >
              <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Sign In prompt (guest users) ── */}
        {isGuest && (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeTitle}>Sign in to unlock Pro</Text>
            <Text style={styles.upgradeSubtitle}>
              Create an account to access AI coaching and purchase a subscription.
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              activeOpacity={0.85}
              onPress={handleSignIn}
            >
              <Text style={styles.upgradeBtnText}>Sign In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Manage Subscription (pro users only) ── */}
        {isPro && (
          <TouchableOpacity style={styles.manageCard} onPress={handleManageSubscription} activeOpacity={0.8}>
            <View>
              <Text style={styles.manageTitle}>Manage Subscription</Text>
              <Text style={styles.manageSubtitle}>Cancel, refund, or change your plan</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Stats Card ── */}
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>CHATS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>7</Text>
              <Text style={styles.statLabel}>DAYS ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* ── Settings Rows ── */}
        <View style={styles.card}>
          {SETTINGS.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.settingsRow, i < SETTINGS.length - 1 && styles.settingsRowBorder]}
              activeOpacity={0.6}
            >
              <Text style={styles.settingsRowText}>{row.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Restore Purchases — authenticated users only */}
          {!isGuest && (
            <TouchableOpacity
              style={[styles.settingsRow, styles.settingsRowBorder]}
              onPress={handleRestore}
              activeOpacity={0.6}
            >
              <Text style={styles.settingsRowText}>Restore Purchases</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}

          {/* Sign Out / Sign In */}
          {isGuest ? (
            <TouchableOpacity style={styles.settingsRow} onPress={handleSignIn} activeOpacity={0.6}>
              <Text style={[styles.settingsRowText, { color: Colors.primary }]}>Sign In</Text>
              <Text style={[styles.chevron, { color: Colors.primary }]}>›</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.settingsRow} onPress={handleSignOut} activeOpacity={0.6}>
              <Text style={[styles.settingsRowText, { color: Colors.error }]}>Sign Out</Text>
              <Text style={[styles.chevron, { color: Colors.error }]}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.version}>App Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { padding: 16, gap: 14, paddingBottom: 40 },

  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, padding: 20,
  },

  headerCard:   { alignItems: 'center' },
  avatar:       { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText:   { fontFamily: FontFamily.dmSansSemiBold, fontSize: 26, color: '#fff' },
  displayName:  { fontFamily: FontFamily.dmSansSemiBold, fontSize: 18, color: Colors.text, marginBottom: 4 },
  email:        { fontFamily: FontFamily.dmSans, fontSize: 14, color: Colors.muted, marginBottom: 12 },
  expiresLabel: { fontFamily: FontFamily.dmSans, fontSize: 12, color: Colors.muted, marginTop: 8 },

  pill:         { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillDiamond:  { width: 7, height: 7, backgroundColor: Colors.primary, transform: [{ rotate: '45deg' }], borderRadius: 1 },
  pillFree:     { borderColor: Colors.accent, backgroundColor: Colors.accent + '18' },
  pillPro:      { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  pillText:     { fontFamily: FontFamily.dmSansSemiBold, fontSize: 12 },
  pillTextFree: { color: Colors.accent },
  pillTextPro:  { color: Colors.primary },

  upgradeCard:     { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.accent, borderRadius: 16, padding: 20 },
  upgradeTitle:    { fontFamily: FontFamily.dmSansSemiBold, fontSize: 16, color: Colors.text, marginBottom: 6 },
  upgradeSubtitle: { fontFamily: FontFamily.dmSans, fontSize: 13, color: Colors.muted, marginBottom: 16 },
  upgradeBtn:      { backgroundColor: Colors.accent, borderRadius: 999, height: 50, alignItems: 'center', justifyContent: 'center' },
  upgradeBtnText:  { fontFamily: FontFamily.dmSansSemiBold, fontSize: 15, color: Colors.text },

  manageCard:      { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary + '40', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  manageTitle:     { fontFamily: FontFamily.dmSansSemiBold, fontSize: 15, color: Colors.text, marginBottom: 3 },
  manageSubtitle:  { fontFamily: FontFamily.dmSans, fontSize: 13, color: Colors.muted },

  statsRow:    { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem:    { alignItems: 'center' },
  statNumber:  { fontFamily: FontFamily.fraunces, fontSize: 36, color: Colors.text },
  statLabel:   { fontFamily: FontFamily.dmSansMedium, fontSize: 11, color: Colors.muted, letterSpacing: 1.2, marginTop: 2 },
  statDivider: { width: 1, height: 44, backgroundColor: Colors.border },

  settingsRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  settingsRowText:   { fontFamily: FontFamily.dmSans, fontSize: 15, color: Colors.text },
  chevron:           { fontSize: 22, color: Colors.muted },

  version: { fontFamily: FontFamily.dmSans, fontSize: 12, color: Colors.muted, textAlign: 'center' },
});
