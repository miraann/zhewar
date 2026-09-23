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
  },
  android: {
    // Matches the admin panel's md-surface tone so there's no white flash
    // between the native splash and the WebView's first paint. Requires a
    // native rebuild/`cap sync` to take effect.
    backgroundColor: '#f8fafc',
  },
};

export default config;
