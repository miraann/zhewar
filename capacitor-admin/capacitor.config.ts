import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zhewar.admin',
  appName: 'ژێوار عزیز ئەدمین',
  webDir: 'www',
  server: {
    // Loads the live admin dashboard — no separate web build needed
    url: 'https://zhewar.shop/admin/dashboard',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // Capacitor 8 manages the system bars itself. The app still opts out of
    // edge-to-edge (styles.xml, targetSdk 35), so its inset handling has
    // nothing to do, and 'DARK' keeps the light bar icons the app has always
    // shown on the theme's dark status bar.
    SystemBars: {
      insetsHandling: 'disable',
      style: 'DARK',
    },
  },
  android: {
    // Matches the admin panel's md-surface tone so there's no white flash
    // between the native splash and the WebView's first paint. Requires a
    // native rebuild/`cap sync` to take effect.
    backgroundColor: '#f8fafc',
  },
};

export default config;
