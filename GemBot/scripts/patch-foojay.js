/**
 * Patches node_modules after npm install to fix two known issues:
 *
 * 1. foojay-resolver-convention 0.5.0 → 1.0.0
 *    @react-native/gradle-plugin ships foojay 0.5.0 which references
 *    JvmVendorSpec.IBM_SEMERU, removed in Gradle 9. Version 1.0.0 fixes this.
 *
 * 2. react-native-purchases-ui currentActivity reference
 *    RNPaywallsModule.kt and RNCustomerCenterModule.kt use bare `currentActivity`
 *    which was removed from ReactContextBaseJavaModule in RN 0.73+.
 *    Must be accessed via reactApplicationContext.currentActivity instead.
 */
const fs = require('fs');
const path = require('path');

function patchFile(relPath, patches, label) {
  const abs = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(abs)) {
    console.log(`[postinstall] SKIP (not found): ${label}`);
    return;
  }
  let content = fs.readFileSync(abs, 'utf8');
  let changed = false;
  for (const [find, replace] of patches) {
    const next = content.replace(find, replace);
    if (next !== content) { content = next; changed = true; }
  }
  if (changed) {
    fs.writeFileSync(abs, content, 'utf8');
    console.log(`[postinstall] Patched: ${label}`);
  } else {
    console.log(`[postinstall] Already patched: ${label}`);
  }
}

// ── 1. foojay ────────────────────────────────────────────────────────────────
patchFile(
  'node_modules/@react-native/gradle-plugin/settings.gradle.kts',
  [[
    /id\("org\.gradle\.toolchains\.foojay-resolver-convention"\)\.version\("[^"]+"\)/,
    'id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0")'
  ]],
  'foojay-resolver-convention → 1.0.0'
);

// ── 2. RNPaywallsModule.kt ───────────────────────────────────────────────────
// The `when (val currentActivity = currentActivity)` pattern uses bare
// `currentActivity` (inherited property removed in RN 0.73+).
// Fix: use `reactApplicationContext.currentActivity` with a clean local var name.
patchFile(
  'node_modules/react-native-purchases-ui/android/src/main/java/com/revenuecat/purchases/react/ui/RNPaywallsModule.kt',
  [
    [
      /when \(val currentActivity = currentActivity\)/,
      'when (val activity = reactApplicationContext.currentActivity)'
    ],
    [
      /is FragmentActivity -> currentActivity\b/,
      'is FragmentActivity -> activity'
    ],
  ],
  'RNPaywallsModule.kt currentActivity'
);

// ── 3. RNCustomerCenterModule.kt ─────────────────────────────────────────────
// Uses bare `currentActivity?.let { ... }` — replace with reactApplicationContext accessor.
patchFile(
  'node_modules/react-native-purchases-ui/android/src/main/java/com/revenuecat/purchases/react/ui/RNCustomerCenterModule.kt',
  [[
    /(?<!\.)currentActivity\?\.let/g,
    'reactApplicationContext.currentActivity?.let'
  ]],
  'RNCustomerCenterModule.kt currentActivity'
);
