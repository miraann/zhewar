// Bridge to the APK's BackgroundReliabilityPlugin (capacitor-admin), which
// checks and fixes the battery settings that stop pushes from reaching a
// swiped-away app. APKs built before the plugin existed don't have it, so
// every helper returns null / does nothing there.

export interface BackgroundStatus {
  ignoringBatteryOptimizations: boolean;
  backgroundRestricted:         boolean;
  manufacturer:                 string;
  aggressiveOem:                boolean;
}

interface BackgroundReliabilityPlugin {
  getStatus(): Promise<BackgroundStatus>;
  requestIgnoreBatteryOptimizations(): Promise<BackgroundStatus>;
  openAutostartSettings(): Promise<void>;
  openAppSettings(): Promise<void>;
}

const BATTERY_PROMPTED_KEY = 'battery_whitelist_prompted';

// Wrapped in an object because a Capacitor plugin proxy answers every
// property — including `then` — so resolving a promise with it directly
// would call a non-existent native `then` method.
let loaded: Promise<{ plugin: BackgroundReliabilityPlugin } | null> | null = null;

export function isBackgroundReliable(s: BackgroundStatus): boolean {
  return s.ignoringBatteryOptimizations && !s.backgroundRestricted;
}

async function load() {
  loaded ??= import('@capacitor/core').then(({ Capacitor, registerPlugin }) =>
    Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('BackgroundReliability')
      ? { plugin: registerPlugin<BackgroundReliabilityPlugin>('BackgroundReliability') }
      : null,
  );
  return (await loaded)?.plugin ?? null;
}

// null outside the app, or in an APK that predates the plugin
export async function getBackgroundStatus(): Promise<BackgroundStatus | null> {
  const plugin = await load();
  return plugin ? plugin.getStatus() : null;
}

export async function requestIgnoreBatteryOptimizations(): Promise<BackgroundStatus | null> {
  const plugin = await load();
  return plugin ? plugin.requestIgnoreBatteryOptimizations() : null;
}

export async function openAutostartSettings(): Promise<void> {
  await (await load())?.openAutostartSettings();
}

export async function openAppSettings(): Promise<void> {
  await (await load())?.openAppSettings();
}

// Shows the system "always run in background?" dialog once per install,
// right after push is set up; later changes go through the Settings card.
export async function promptBatteryWhitelistOnce(): Promise<void> {
  if (localStorage.getItem(BATTERY_PROMPTED_KEY)) return;
  const status = await getBackgroundStatus();
  if (!status || status.ignoringBatteryOptimizations) return;
  localStorage.setItem(BATTERY_PROMPTED_KEY, '1');
  await requestIgnoreBatteryOptimizations();
}
