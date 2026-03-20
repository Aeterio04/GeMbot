import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
} from 'react-native-purchases';

// ── Constants ────────────────────────────────────────────────────────────────

export const ENTITLEMENT_ID = 'GemBot Pro';

// Product identifiers as configured in App Store Connect / Google Play Console
export const PRODUCT_IDS = {
  monthly:  process.env.EXPO_PUBLIC_REVENUECAT_MONTHLY_PRODUCT_ID  ?? 'monthly',
  yearly:   process.env.EXPO_PUBLIC_REVENUECAT_YEARLY_PRODUCT_ID   ?? 'yearly',
  lifetime: process.env.EXPO_PUBLIC_REVENUECAT_LIFETIME_PRODUCT_ID ?? 'lifetime',
};

// ── Initialization ───────────────────────────────────────────────────────────

// Patterns from RC's native layer that are test-environment noise, not real errors.
// The 'test_store' error is a SerializationException thrown when RC tries to
// deserialize sandbox purchases — it's harmless but spammy in dev.
const SUPPRESSED_LOG_PATTERNS = [
  'test_store',
  'does not contain element with name',
  'Error deserializing subscription information',
  'The input is not a SubscriptionInfo',
  'SerializationException',
];

function isSuppressedLog(message: string): boolean {
  return SUPPRESSED_LOG_PATTERNS.some(p => message.includes(p));
}

/**
 * Call once at app startup (before any purchase calls).
 * Pass the logged-in user's ID so RevenueCat can link purchases to your backend.
 */
export function configureRevenueCat(appUserId?: string) {
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

  // In dev, install a custom log handler that silences known test-env noise
  // while still forwarding everything else to the console.
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.setLogHandler((logLevel, message) => {
      if (isSuppressedLog(message)) return; // drop silently
      // Forward non-suppressed logs at the appropriate level
      switch (logLevel) {
        case LOG_LEVEL.ERROR:   console.error('[RC]', message); break;
        case LOG_LEVEL.WARN:    console.warn('[RC]', message);  break;
        default:                console.log('[RC]', message);   break;
      }
    });
  }

  Purchases.configure({
    apiKey,
    appUserID: appUserId ?? null, // null = anonymous until identified
  });
}

/**
 * Identify a logged-in user. Call after login / session restore.
 * RevenueCat will merge any anonymous purchases made before login.
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

/**
 * Reset to anonymous on sign-out.
 */
export async function resetUser(): Promise<CustomerInfo> {
  return Purchases.logOut();
}

// ── Entitlement helpers ──────────────────────────────────────────────────────

/**
 * Returns true if the user has an active "GemBot Pro" entitlement.
 */
export function isProActive(customerInfo: CustomerInfo): boolean {
  return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
}

/**
 * Fetch fresh CustomerInfo from RevenueCat.
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

// ── Offerings ────────────────────────────────────────────────────────────────

/**
 * Fetch the current offering from RevenueCat.
 * Returns null if no offering is configured.
 */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

// ── Restore ──────────────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
